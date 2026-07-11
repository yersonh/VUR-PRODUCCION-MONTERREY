<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tercero;
use App\Models\TipoCorrespondencia;
use App\Models\User;
use App\Services\ClienteCore;
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
        private RadicadoService $service,
        private ClienteCore     $core,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pdf_solicitud'          => ['required', 'file', 'mimes:pdf', 'max:20480'],
            'soporte'                => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:20480'],
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

        $ciudadano = $this->core->buscarCiudadanoPorIdentificacion($tipoIdentificacion['id'], $data['numero_identificacion']);
        if (!$ciudadano) {
            $ciudadano = $this->core->crearCiudadano([
                'tipo_identificacion_id' => $tipoIdentificacion['id'],
                'numero_identificacion'  => $data['numero_identificacion'],
                'nombres'                => $nombres,
                'apellidos'              => $apellidos,
                'telefono'               => $data['celular'],
                'email'                  => $data['correo'],
                'direccion'              => $data['direccion'],
            ]);
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

        $anexos = [];
        if ($request->hasFile('soporte')) {
            $anexos[] = [
                'descripcion' => 'Soporte de acreditación (CDR)',
                'archivo'     => $request->file('soporte'),
            ];
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
                'anexos'                   => $anexos,
            ],
            operadorId: $operador->id,
            pdfEntrada: $request->file('pdf_solicitud'),
            pdfSalida: null,
        );

        return response()->json([
            'radicado_vur' => $radicado->numero_radicado,
        ], 201);
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
}
