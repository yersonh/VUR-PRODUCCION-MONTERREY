<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Radicado;
use App\Services\BrevoMailService;
use App\Services\ClienteCore;
use App\Services\RadicadoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class RadicadoController extends Controller
{
    public function __construct(
        private RadicadoService  $service,
        private BrevoMailService $brevo,
        private ClienteCore      $core,
    ) {}

    // ── GET /radicados/siguiente-numero ───────────────────────────
    public function siguienteNumero(): JsonResponse
    {
        $siguiente = $this->service->siguienteNumero();
        $año       = now()->year;
        return response()->json([
            'nro'    => $siguiente,
            'numero' => $año . '-' . str_pad($siguiente, 6, '0', STR_PAD_LEFT),
        ]);
    }

    // ── GET /radicados ─────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->integer('per_page', 20), 100);

        $query = Radicado::with([
            'tercero', 'tipoCorrespondencia',
            'medioIngreso', 'estado', 'operador', 'documentos',
        ])
        ->when($request->filled('nro_radicado'), function ($q) use ($request) {
            $val = $request->string('nro_radicado')->toString();
            // Soporta formato AAAA-NNNNNN o solo el número
            if (str_contains($val, '-')) {
                [$año, $nro] = explode('-', $val, 2);
                $q->where('año_radicado', (int) $año)
                  ->where('nro_radicado', (int) $nro);
            } else {
                $q->where('nro_radicado', (int) $val);
            }
        })
        ->when($request->filled('estado'), fn ($q) =>
            $q->whereHas('estado', fn ($q2) =>
                $q2->where('codigo', $request->string('estado'))
            )
        )
        ->when($request->filled('fecha_desde'), fn ($q) =>
            $q->where('fecha_radicacion', '>=', $request->string('fecha_desde'))
        )
        ->when($request->filled('fecha_hasta'), fn ($q) =>
            $q->where('fecha_radicacion', '<=', $request->string('fecha_hasta'))
        )
        // NOTA: antes esto también buscaba por nombre/cédula del tercero y del
        // funcionario remitente (whereHas sobre columnas que vivían en las
        // tablas locales 'terceros'/'personal'). Esos datos ahora viven en el
        // Core, que no expone búsqueda de texto, así que el filtro por
        // 'remitente' se redujo a lo que sigue siendo una columna local real.
        ->when($request->filled('remitente'), fn ($q) =>
            $q->where('nombre_persona_empresa', 'ilike', '%'.$request->string('remitente').'%')
        )
        ->when($request->filled('tipo_correspondencia_id'), fn ($q) =>
            $q->where('tipo_correspondencia_id', $request->integer('tipo_correspondencia_id'))
        )
        ->when($request->filled('dependencia_destino_id'), fn ($q) =>
            $q->where('dependencia_destino_id', $request->integer('dependencia_destino_id'))
        )
        ->orderBy('nro_radicado', 'desc');

        $paginated = $query->paginate($perPage);

        $items = $paginated->getCollection()->map(fn (Radicado $r) => [
            'id'                              => $r->id,
            'nro_radicado'                    => $r->nro_radicado,
            'año_radicado'                    => $r->año_radicado,
            'fecha_radicacion'                => $r->fecha_radicacion?->toDateString(),
            'hora_radicacion'                 => $r->hora_radicacion,
            'manejo'                          => $r->manejo,
            'procedencia'                     => $r->procedencia,
            'remitente_display'               => $this->service->nombreRemitente($r),
            'tipo_correspondencia_descripcion'=> $r->tipoCorrespondencia?->descripcion,
            'dependencia_destino_descripcion' => $this->service->dependenciaInfo($r->dependencia_destino_id)['descripcion'] ?? null,
            'aux_descripcion'                 => $r->aux_descripcion,
            'nombre_persona_empresa'          => $r->nombre_persona_empresa,
            'estado_codigo'                   => $r->estado?->codigo,
            'estado_descripcion'              => $r->estado?->descripcion,
            'operador_nombre'                 => $r->operador?->name,
            'tiene_pdf_entrada'               => $r->documentos->where('tipo', 'ENTRADA')->isNotEmpty(),
            'tiene_pdf_salida'                => $r->documentos->where('tipo', 'SALIDA')->isNotEmpty(),
        ]);

        // Forma plana (current_page/last_page/total/per_page al mismo nivel que
        // 'data'), igual que el resto de endpoints paginados del sistema — el
        // frontend usa el mismo parsePaginated() en todos. Antes iba anidado
        // bajo 'meta', lo que dejaba esos campos en undefined en el cliente
        // (de ahí el "NaN-NaN de 0" y el warning de key en la paginación).
        return response()->json([
            'data'         => $items,
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'total'        => $paginated->total(),
            'per_page'     => $paginated->perPage(),
        ]);
    }

    // ── GET /radicados/{id} ────────────────────────────────────────
    public function show(int $id): JsonResponse
    {
        $radicado = Radicado::with($this->service->relaciones())->findOrFail($id);
        return response()->json(['data' => $this->formatDetalle($radicado)]);
    }

    // ── POST /radicados ────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->reglasValidacion());

        $radicado = $this->service->crear(
            datos: $data,
            operadorId: $request->user()->id,
            pdfEntrada: $request->file('pdf_entrada'),
            pdfSalida:  $request->file('pdf_salida'),
        );

        // Notificar remitente si tiene email
        $emailRemitente = $this->service->emailRemitente($radicado);
        if ($emailRemitente) {
            $this->brevo->enviarConfirmacionRadicado(
                destinatarioEmail:     $emailRemitente,
                destinatarioNombre:    $this->service->nombreRemitente($radicado),
                numeroRadicado:        $radicado->numero_radicado,
                fechaRadicacion:       $radicado->fecha_radicacion->format('d/m/Y'),
                tipoCorrespondencia:   $radicado->tipoCorrespondencia?->descripcion ?? '',
                dependenciaDestino:    $this->service->dependenciaInfo($radicado->dependencia_destino_id)['descripcion'] ?? '',
                fechaLimite:           $radicado->fecha_limite?->format('d/m/Y'),
            );
        }

        return response()->json([
            'data'            => $this->formatDetalle($radicado),
            'numero_radicado' => $radicado->numero_radicado,
            'message'         => "Radicado {$radicado->numero_radicado} creado exitosamente",
        ], 201);
    }

    // ── PUT /radicados/{id} — solo actualizar PDF salida ──────────
    public function update(Request $request, int $id): JsonResponse
    {
        $radicado = Radicado::findOrFail($id);

        if ($request->hasFile('pdf_salida')) {
            $request->validate([
                'pdf_salida' => ['file', 'mimes:pdf', 'max:20480'],
            ]);

            $radicado = $this->service->adjuntarPdfSalida(
                $radicado,
                $request->file('pdf_salida'),
                $request->user()->id,
            );
        }

        return response()->json(['data' => $this->formatDetalle($radicado)]);
    }

    // ── POST /radicados/{id}/anexos — agregar anexos después de creado ──
    public function agregarAnexos(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'anexos'               => ['required', 'array', 'min:1', 'max:20'],
            'anexos.*.descripcion' => ['required', 'string', 'max:150'],
            'anexos.*.tipo_id'     => ['nullable', 'integer', 'exists:tipos_anexo,id'],
            'anexos.*.archivo'     => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $radicado    = Radicado::findOrFail($id);
        $actualizado = $this->service->agregarAnexos($radicado, $data['anexos'], $request->user()->id);

        return response()->json(['data' => $this->formatDetalle($actualizado)]);
    }

    // ── DELETE /radicados/{id}/anexos/{documentoId} ────────────────
    public function eliminarAnexo(int $id, int $documentoId): JsonResponse
    {
        $radicado    = Radicado::findOrFail($id);
        $actualizado = $this->service->eliminarAnexo($radicado, $documentoId);

        return response()->json(['data' => $this->formatDetalle($actualizado)]);
    }

    // ── PATCH /radicados/{id}/estado ──────────────────────────────
    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'estado'      => ['required', 'string', 'exists:estados_correspondencia,codigo'],
            'observacion' => ['nullable', 'string', 'max:300'],
        ]);

        $radicado = Radicado::with('estado')->findOrFail($id);

        // Validar que el estado actual no sea terminal
        if ($radicado->estado?->es_terminal) {
            return response()->json(['message' => 'El radicado está en estado terminal y no puede modificarse.'], 422);
        }

        $actualizado = $this->service->cambiarEstado(
            radicado:     $radicado,
            codigoEstado: $request->string('estado')->toString(),
            observacion:  $request->string('observacion', '')->toString(),
            usuarioId:    $request->user()->id,
        );

        return response()->json(['data' => $this->formatDetalle($actualizado)]);
    }

    // ── PATCH /radicados/{id}/anular ──────────────────────────────
    public function anular(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'motivo' => ['required', 'string', 'max:300'],
        ]);

        // Solo ADMIN puede anular
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Sin permisos para anular radicados.'], 403);
        }

        $radicado = Radicado::with('estado')->findOrFail($id);

        if ($radicado->estado?->es_terminal) {
            return response()->json(['message' => 'El radicado ya está en estado terminal.'], 422);
        }

        $this->service->cambiarEstado(
            radicado:     $radicado,
            codigoEstado: 'ANULADO',
            observacion:  $request->string('motivo')->toString(),
            usuarioId:    $request->user()->id,
        );

        return response()->json(['message' => 'Radicado anulado correctamente']);
    }

    // ── GET /radicados/{id}/pdf/{tipo} ────────────────────────────
    public function descargarPdf(int $id, string $tipo): mixed
    {
        $tipoUpper = strtoupper($tipo);
        abort_unless(in_array($tipoUpper, ['ENTRADA', 'SALIDA']), 404);

        $radicado  = Radicado::with('documentos')->findOrFail($id);
        $documento = $radicado->documentos->where('tipo', $tipoUpper)->first();

        abort_unless($documento, 404, 'PDF no encontrado');

        $ruta = $documento->ruta_almacenamiento;
        abort_unless(Storage::disk('local')->exists($ruta), 404, 'Archivo no encontrado en disco');

        return response()->file(
            Storage::disk('local')->path($ruta),
            [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => "inline; filename=\"{$documento->nombre_original}\"",
            ]
        );
    }

    // ── GET /radicados/{id}/documentos/{documentoId} — descarga genérica
    //     (usada para anexos individuales; ENTRADA/SALIDA siguen usando
    //     descargarPdf() de arriba porque el frontend ya lo consume así)
    public function descargarDocumento(int $id, int $documentoId): mixed
    {
        $radicado  = Radicado::with('documentos')->findOrFail($id);
        $documento = $radicado->documentos->firstWhere('id', $documentoId);

        abort_unless($documento, 404, 'Documento no encontrado');

        $ruta = $documento->ruta_almacenamiento;
        abort_unless(Storage::disk('local')->exists($ruta), 404, 'Archivo no encontrado en disco');

        return response()->file(
            Storage::disk('local')->path($ruta),
            [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => "inline; filename=\"{$documento->nombre_original}\"",
            ]
        );
    }

    // ── Helpers ────────────────────────────────────────────────────
    private function reglasValidacion(): array
    {
        return [
            'manejo'                  => ['required', 'in:INFORMATIVO,RESOLUTIVO'],
            'procedencia'             => ['required', 'in:EXTERNO,INTERNO'],
            'tipo_remitente'          => ['required', 'in:FUNCIONARIO,TERCERO_NIT,CIUDADANO'],
            'tercero_id'              => ['nullable', 'integer', 'exists:terceros,id'],
            // 'funcionario_id'/'personal_destino_id' referencian funcionarios del
            // Core (sin FK local). Validar su existencia ahí en cada submit
            // implicaría una llamada HTTP extra por campo; se deja solo el tipo
            // y se degrada con gracia (null) al mostrarlo si el id no existe.
            'funcionario_id'          => ['nullable', 'integer'],
            'dependencia_remitente_id'=> ['nullable', 'integer', Rule::in($this->idsDependenciasCore())],
            'nombre_persona_empresa'  => ['nullable', 'string', 'max:100'],
            'tipo_correspondencia_id' => ['required', 'integer', 'exists:tipos_correspondencia,id'],
            'aux_tip_id'              => ['nullable', 'integer', 'exists:aux_tips,id'],
            'aux_descripcion'         => ['nullable', 'string', 'max:100'],
            'tipo_destino'            => ['required', 'in:INTERNO,TERCERO_NIT,CIUDADANO'],
            'dependencia_destino_id'  => ['required_if:tipo_destino,INTERNO', 'nullable', 'integer', Rule::in($this->idsDependenciasCore())],
            'personal_destino_id'     => ['nullable', 'integer'],
            'tercero_destino_id'      => ['required_if:tipo_destino,TERCERO_NIT,CIUDADANO', 'nullable', 'integer', 'exists:terceros,id'],
            'nombre_persona_destino'  => ['nullable', 'string', 'max:100'],
            'folios'                  => ['nullable', 'integer', 'min:1'],
            'folios_de'               => ['nullable', 'integer', 'min:1'],
            'cantidad_anexos'         => ['nullable', 'integer', 'min:0'],
            'tipo_anexo_id'           => ['nullable', 'integer', 'exists:tipos_anexo,id'],
            'otro_anexo'              => ['nullable', 'string', 'max:60'],
            'anexos'                  => ['nullable', 'array', 'max:20'],
            'anexos.*.descripcion'    => ['required_with:anexos', 'string', 'max:150'],
            'anexos.*.tipo_id'        => ['nullable', 'integer', 'exists:tipos_anexo,id'],
            'anexos.*.archivo'        => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
            'nro_factura'             => ['nullable', 'string', 'max:30'],
            'valor_factura'           => ['nullable', 'numeric', 'min:0'],
            'fecha_documento'         => ['nullable', 'date'],
            'fecha_entrega'           => ['nullable', 'date'],
            'medio_ingreso_id'        => ['nullable', 'integer', 'exists:medios_ingreso,id'],
            'nro_guia'                => ['nullable', 'string', 'max:30'],
            'observaciones'           => ['nullable', 'string', 'max:5700'],
            'pdf_entrada'             => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
            'pdf_salida'              => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
        ];
    }

    private function idsDependenciasCore(): array
    {
        return collect($this->core->dependencias())->pluck('id')->all();
    }

    private function formatDetalle(Radicado $r): array
    {
        return [
            'id'                   => $r->id,
            'nro_radicado'         => $r->nro_radicado,
            'año_radicado'         => $r->año_radicado,
            'numero_radicado'      => $r->numero_radicado,
            'manejo'               => $r->manejo,
            'procedencia'          => $r->procedencia,
            'fecha_radicacion'     => $r->fecha_radicacion?->toDateString(),
            'hora_radicacion'      => $r->hora_radicacion,
            'tipo_remitente'       => $r->tipo_remitente,
            'tercero'              => $this->service->terceroInfo($r->tercero),
            'funcionario'          => $this->service->funcionarioInfo($r->funcionario_id),
            'dependencia_remitente'=> $this->service->dependenciaInfo($r->dependencia_remitente_id),
            'nombre_persona_empresa'=> $r->nombre_persona_empresa,
            'tipo_correspondencia' => $r->tipoCorrespondencia,
            'aux_tip'              => $r->auxTip,
            'aux_descripcion'      => $r->aux_descripcion,
            'fecha_limite'         => $r->fecha_limite?->toDateString(),
            'tipo_destino'         => $r->tipo_destino,
            'dependencia_destino'  => $this->service->dependenciaInfo($r->dependencia_destino_id),
            'personal_destino'     => $this->service->funcionarioInfo($r->personal_destino_id),
            'tercero_destino'      => $this->service->terceroInfo($r->terceroDestino),
            'nombre_persona_destino' => $r->nombre_persona_destino,
            'folios'               => $r->folios,
            'folios_de'            => $r->folios_de,
            'cantidad_anexos'      => $r->cantidad_anexos,
            'tipo_anexo'           => $r->tipoAnexo,
            'otro_anexo'           => $r->otro_anexo,
            'anexos'               => $r->anexos ?? [],
            'nro_factura'          => $r->nro_factura,
            'valor_factura'        => $r->valor_factura,
            'fecha_documento'      => $r->fecha_documento?->toDateString(),
            'fecha_entrega'        => $r->fecha_entrega?->toDateString(),
            'medio_ingreso'        => $r->medioIngreso,
            'nro_guia'             => $r->nro_guia,
            'observaciones'        => $r->observaciones,
            'ia_procesado'         => $r->ia_procesado,
            'ia_campos_sugeridos'  => $r->ia_campos_sugeridos,
            'estado'               => $r->estado,
            'operador'             => $r->operador ? ['id' => $r->operador->id, 'name' => $r->operador->name] : null,
            'documentos'           => $r->documentos,
            'actuaciones'          => $r->actuaciones->map(fn ($a) => [
                'id'              => $a->id,
                'descripcion'     => $a->descripcion,
                'estado_anterior' => $a->estadoAnterior,
                'estado_nuevo'    => $a->estadoNuevo,
                'usuario'         => ['id' => $a->usuario->id, 'name' => $a->usuario->name],
                'created_at'      => $a->created_at->toIso8601String(),
            ]),
            'created_at'           => $r->created_at->toIso8601String(),
        ];
    }
}
