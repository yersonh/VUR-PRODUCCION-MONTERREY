<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedioIngreso;
use App\Models\Radicado;
use App\Models\Tercero;
use App\Models\TipoCorrespondencia;
use App\Models\User;
use App\Services\ClienteCore;
use App\Services\PdfStorageService;
use App\Services\RadicadoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// ── Intake público de CDR (Certificado de Residencia Digital) ─────────────
// Recibe, sin sesión de usuario, las solicitudes de Carta de Residencia que
// un ciudadano diligenció en CDR (/solicitud-publica). Autenticado por
// EnsureCdrServiceToken (token compartido con ClienteCdr, dirección
// contraria de la misma integración peer-to-peer). Crea el Radicado
// correspondiente de forma síncrona; el reenvío a CDR con el radicado ya
// asignado ocurre automáticamente dentro de RadicadoService::crear() vía
// EnviarSolicitudResidenciaACdr, sin necesitar código adicional aquí.
class SolicitudCartaResidenciaController extends Controller
{
    public function __construct(
        private RadicadoService   $service,
        private ClienteCore       $core,
        private PdfStorageService $pdfStorage,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pdf_solicitud'          => ['required', 'file', 'mimes:pdf', 'max:20480'],
            'soporte'                => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:20480'],
            'documento_identidad'    => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:20480'],
            'nombre_completo'        => ['required', 'string', 'max:150'],
            'tipo_documento'         => ['required', 'string', 'max:10'],
            'numero_identificacion'  => ['required', 'string', 'max:20'],
            'direccion'              => ['required', 'string', 'max:120'],
            'correo'                 => ['required', 'email', 'max:100'],
            'celular'                => ['required', 'string', 'max:20'],
            'barrio_vereda_sector'   => ['required', 'string', 'max:100'],
            'motivo'                 => ['nullable', 'string', 'max:300'],
            'tipo_certificado'       => ['required', 'in:general,estudios'],
            'medio_acreditacion'     => ['required', 'in:electoral,sisben,jac,especial'],
            'referencia_cdr'         => ['required', 'integer'],
        ]);

        $tipoCorrespondencia = TipoCorrespondencia::find(config('services.cdr.tipo_correspondencia_residencia_id'));
        if (!$tipoCorrespondencia) {
            Log::error('solicitudes-carta-residencia: VUR_TIPO_CORRESPONDENCIA_RESIDENCIA_ID no corresponde a un TipoCorrespondencia existente.');
            return response()->json(['message' => 'El sistema VUR no tiene configurado el tipo de correspondencia para Carta de Residencia.'], 500);
        }
        if (!$tipoCorrespondencia->dependencia_destino_id) {
            Log::error('solicitudes-carta-residencia: el TipoCorrespondencia de Carta de Residencia no tiene dependencia_destino_id configurada.');
            return response()->json(['message' => 'El sistema VUR no tiene configurada la dependencia destino para Carta de Residencia.'], 500);
        }

        $tipoIdentificacion = collect($this->core->tiposIdentificacion())
            ->first(fn (array $t) => strtoupper($t['codigo'] ?? '') === strtoupper($data['tipo_documento']));
        if (!$tipoIdentificacion) {
            return response()->json(['message' => "tipo_documento '{$data['tipo_documento']}' no existe en el catálogo del Core."], 422);
        }

        [$nombres, $apellidos] = $this->partirNombre($data['nombre_completo']);

        $datosCiudadano = [
            'tipo_identificacion_id' => $tipoIdentificacion['id'],
            'numero_identificacion'  => $data['numero_identificacion'],
            'nombres'                => $nombres,
            'apellidos'              => $apellidos,
            'telefono'               => $data['celular'],
            'email'                  => $data['correo'],
            'direccion'              => $data['direccion'],
        ];

        $ciudadano = $this->core->buscarCiudadanoPorIdentificacion($tipoIdentificacion['id'], $data['numero_identificacion']);
        if (!$ciudadano) {
            $ciudadano = $this->core->crearCiudadano($datosCiudadano);
        } elseif ($this->datosCiudadanoDifieren($ciudadano, $datosCiudadano)) {
            // El ciudadano ya existía en el Core pero con datos distintos a
            // los que acaba de escribir en el formulario de CDR (ej. cambió
            // de correo o teléfono) — se actualiza para que el resto del
            // sistema (empezando por el correo de confirmación de este mismo
            // radicado) use el dato fresco. Best-effort: si el Core no
            // soporta esta ruta, se sigue con el registro viejo sin romper
            // la radicación.
            try {
                $ciudadano = $this->core->actualizarCiudadano($ciudadano['id'], $datosCiudadano);
            } catch (\Throwable $e) {
                Log::warning("No se pudo actualizar ciudadano {$ciudadano['id']} en el Core desde intake CDR: {$e->getMessage()}");
            }
        }

        $tercero = Tercero::firstOrCreate(
            ['categoria' => 'CIUDADANO', 'core_id' => $ciudadano['id']],
            ['codigo' => 'TER'.str_pad((string) ((Tercero::max('id') ?? 0) + 1), 6, '0', STR_PAD_LEFT)]
        );

        $operador = User::where('email', config('services.cdr.operador_email'))->first();
        if (!$operador) {
            Log::error('solicitudes-carta-residencia: usuario de sistema CDR no existe. Ejecutar migraciones pendientes.');
            return response()->json(['message' => 'El sistema VUR no tiene configurado el usuario de sistema para este intake.'], 500);
        }

        $observaciones = trim(implode(' | ', array_filter([
            $data['motivo'] ?? null,
            "Barrio/vereda/sector: {$data['barrio_vereda_sector']}",
            'Tipo certificado: '.($data['tipo_certificado'] === 'estudios' ? 'Para estudios' : 'General'),
            'Medio de acreditación: '.match ($data['medio_acreditacion']) {
                'electoral' => 'Certificado electoral',
                'sisben'    => 'SISBEN',
                'jac'       => 'Junta de Acción Comunal',
                default     => 'Caso especial',
            },
            "Referencia CDR: {$data['referencia_cdr']}",
        ])));

        // 'documento_identidad' y 'soporte' se guardan ambos como anexos del
        // radicado (RadicadoDocumento tipo ANEXO) — 'radicado_documentos.tipo'
        // es un enum de Postgres fijo (ENTRADA/SALIDA/ANEXO), así que no se
        // agrega un valor nuevo solo para distinguirlos; la 'descripcion' de
        // cada anexo ya deja claro cuál es cuál.
        $anexos = [];
        if ($request->hasFile('documento_identidad')) {
            $anexos[] = [
                'descripcion' => 'Documento de identidad (CDR)',
                'archivo'     => $request->file('documento_identidad'),
            ];
        }
        if ($request->hasFile('soporte')) {
            $anexos[] = [
                'descripcion' => 'Soporte de acreditación (CDR)',
                'archivo'     => $request->file('soporte'),
            ];
        }

        // Documento Físico: el "documento" es el certificado/solicitud que
        // llega en pdf_solicitud (no los anexos). Es un trámite 100%
        // electrónico e instantáneo, así que fecha_documento y fecha_entrega
        // son el mismo día que la radicación. folios/folios_de se llenan
        // ambos con el conteo de páginas del PDF (no hay concepto de entrega
        // parcial acá, así que "de" es el mismo total).
        $paginas = $this->pdfStorage->contarPaginas($request->file('pdf_solicitud')->getRealPath());
        $medioIngresoWeb = MedioIngreso::where('descripcion', 'Web')->first();
        if (!$medioIngresoWeb) {
            Log::warning('solicitudes-carta-residencia: no existe un MedioIngreso con descripción "Web" — medio_ingreso_id quedará sin llenar.');
        }

        $radicado = $this->service->crear(
            datos: [
                'manejo'                  => 'RESOLUTIVO',
                'procedencia'              => 'EXTERNO',
                'tipo_remitente'           => 'CIUDADANO',
                'tercero_id'               => $tercero->id,
                'tipo_correspondencia_id'  => $tipoCorrespondencia->id,
                'dependencia_destino_id'   => $tipoCorrespondencia->dependencia_destino_id,
                'observaciones'            => $observaciones,
                'referencia_cdr'           => (string) $data['referencia_cdr'],
                'anexos'                   => $anexos,
                'folios'                   => $paginas,
                'folios_de'                => $paginas,
                'medio_ingreso_id'         => $medioIngresoWeb?->id,
                'fecha_documento'          => now()->toDateString(),
                'fecha_entrega'            => now()->toDateTimeString(),
            ],
            operadorId: $operador->id,
            pdfEntrada: $request->file('pdf_solicitud'),
            pdfSalida: null,
            // Este intake ya trae todos los campos estructurados y validados
            // del formulario de CDR — no hace falta que Gemini los "adivine"
            // del PDF, así que nos ahorramos esa llamada a la API.
            analizarIa: false,
        );

        return response()->json([
            'radicado_vur' => $radicado->numero_radicado,
        ], 201);
    }

    // ── PATCH /solicitudes-carta-residencia/{radicadoVur}/estado ──────
    // CDR nos avisa que cambió el estado de un trámite que le enviamos (ver
    // EnviarSolicitudResidenciaACdr). Solo acepta los 3 estados que CDR
    // puede empujar desde su propio flujo — RADICADO es siempre el inicial
    // y ANULADO queda reservado para la acción manual de un ADMIN (ver
    // RadicadoController::anular), así que este endpoint no los expone.
    private const ESTADOS_PERMITIDOS_CDR = ['EN_TRAMITE', 'RESPONDIDO', 'CERRADO'];

    public function actualizarEstado(Request $request, string $radicadoVur): JsonResponse
    {
        $data = $request->validate([
            'estado' => ['required', 'string', 'in:'.implode(',', self::ESTADOS_PERMITIDOS_CDR)],
            // Cuando CDR pasa a RESPONDIDO, adjunta el PDF del certificado
            // firmado como la respuesta a la entrada que nosotros mismos le
            // radicamos — se guarda igual que cuando un operador de VUR
            // adjunta la respuesta a mano (ver adjuntarPdfSalida()).
            'documento_respuesta' => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        [$año, $nro] = explode('-', $radicadoVur);

        $radicado = Radicado::with('estado')
            ->where('año_radicado', (int) $año)
            ->where('nro_radicado', (int) $nro)
            ->where('tipo_correspondencia_id', config('services.cdr.tipo_correspondencia_residencia_id'))
            ->first();

        if (!$radicado) {
            return response()->json(['message' => "No existe un radicado de Carta de Residencia con número {$radicadoVur}."], 404);
        }

        if ($radicado->estado?->es_terminal) {
            return response()->json(['message' => 'El radicado está en estado terminal y no puede modificarse.'], 422);
        }

        $operador = User::where('email', config('services.cdr.operador_email'))->first();
        if (!$operador) {
            Log::error('solicitudes-carta-residencia/estado: usuario de sistema CDR no existe. Ejecutar migraciones pendientes.');
            return response()->json(['message' => 'El sistema VUR no tiene configurado el usuario de sistema para este intake.'], 500);
        }

        // adjuntarPdfSalida() ya hace todo lo que necesitamos para RESPONDIDO
        // con documento: guarda el PDF como SALIDA, transiciona el estado y
        // dispara sus propias notificaciones (más específicas que el aviso
        // genérico de cambiarEstado()) — por eso no se llama a cambiarEstado()
        // aparte en este caso, se duplicaría la notificación.
        //
        // estamparQr: false — este certificado ya viene firmado y con su
        // propio QR de verificación generado por CDR; estampar el QR de VUR
        // encima duplicaba el QR en el documento final entregado al ciudadano.
        if ($data['estado'] === 'RESPONDIDO' && $request->hasFile('documento_respuesta')) {
            $this->service->adjuntarPdfSalida($radicado, $request->file('documento_respuesta'), $operador->id, estamparQr: false);
        } else {
            $this->service->cambiarEstado(
                radicado:     $radicado,
                codigoEstado: $data['estado'],
                observacion:  "Cambio de estado reportado por CDR.",
                usuarioId:    $operador->id,
            );
        }

        return response()->json(['message' => 'Estado actualizado correctamente.']);
    }

    // Divide "nombre_completo" en nombres/apellidos porque el Core exige
    // ambos campos por separado y CDR solo manda uno combinado. Heurística
    // simple (última palabra = primer apellido) porque no hay forma
    // confiable de saber dónde termina el nombre sin pedirle el dato a CDR.
    private function partirNombre(string $nombreCompleto): array
    {
        $partes = preg_split('/\s+/', trim($nombreCompleto));
        if (count($partes) < 2) {
            return [$nombreCompleto, ''];
        }

        $apellidos = array_pop($partes);
        return [implode(' ', $partes), $apellidos];
    }

    // Compara los campos de contacto/nombre entre lo que ya tiene el Core y
    // lo que acaba de llegar en la solicitud — solo interesa detectar
    // cambios en estos, no en identidad (tipo/numero_identificacion, que es
    // la clave con la que se buscó y nunca cambia aquí).
    private function datosCiudadanoDifieren(array $ciudadanoCore, array $datosNuevos): bool
    {
        foreach (['nombres', 'apellidos', 'telefono', 'email', 'direccion'] as $campo) {
            if (trim((string) ($ciudadanoCore[$campo] ?? '')) !== trim((string) ($datosNuevos[$campo] ?? ''))) {
                return true;
            }
        }

        return false;
    }
}
