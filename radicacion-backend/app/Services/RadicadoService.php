<?php

namespace App\Services;

use App\Models\EstadoCorrespondencia;
use App\Models\Radicado;
use App\Models\RadicadoActuacion;
use App\Models\RadicadoDocumento;
use App\Models\TipoCorrespondencia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RadicadoService
{
    public function __construct(
        private PdfStorageService    $pdfStorage,
        private GeminiService        $gemini,
        private BrevoMailService     $brevo,
        private NotificacionService  $notificacion,
    ) {}

    /**
     * Genera el siguiente número de radicado global (no reinicia por año).
     * Usa un lock de base de datos para evitar duplicados bajo concurrencia.
     */
    public function siguienteNumero(): int
    {
        $año = now()->year;
        return (Radicado::where('año_radicado', $año)->max('nro_radicado') ?? 0) + 1;
    }

    private function siguienteNumeroConLock(): int
    {
        $año = now()->year;
        // Advisory lock de PostgreSQL: serializa la generación del número sin
        // bloquear filas (FOR UPDATE falla con agregados en PG).
        // El lock se libera automáticamente al finalizar la transacción.
        DB::select('SELECT pg_advisory_xact_lock(42)');
        $max = Radicado::where('año_radicado', $año)->max('nro_radicado') ?? 0;
        return (int) $max + 1;
    }

    /**
     * Crea un nuevo radicado con su PDF de entrada y opcionalmente PDF de salida.
     * Retorna el Radicado creado con todas sus relaciones cargadas.
     */
    public function crear(array $datos, int $operadorId, ?UploadedFile $pdfEntrada, ?UploadedFile $pdfSalida): Radicado
    {
        return DB::transaction(function () use ($datos, $operadorId, $pdfEntrada, $pdfSalida) {
            $nro  = $this->siguienteNumeroConLock();
            $año  = now()->year;
            $hoy  = Carbon::now();

            // Calcular fecha límite
            $tipoCorr = TipoCorrespondencia::findOrFail($datos['tipo_correspondencia_id']);
            $fechaLimite = $tipoCorr->max_dias > 0
                ? $hoy->copy()->addWeekdays($tipoCorr->max_dias)->toDateString()
                : null;

            // Estado inicial
            $estadoInicial = EstadoCorrespondencia::where('codigo', 'RADICADO')->firstOrFail();

            $radicado = Radicado::create(array_merge($datos, [
                'nro_radicado'    => $nro,
                'año_radicado'    => $año,
                'fecha_radicacion'=> $hoy->toDateString(),
                'hora_radicacion' => $hoy->toTimeString('minute'),
                'fecha_limite'    => $fechaLimite,
                'estado_id'       => $estadoInicial->id,
                'operador_id'     => $operadorId,
                'ia_procesado'    => false,
            ]));

            // Guardar PDFs
            if ($pdfEntrada) {
                $this->adjuntarPdf($radicado, $pdfEntrada, 'ENTRADA', $operadorId);
            }
            if ($pdfSalida) {
                $this->adjuntarPdf($radicado, $pdfSalida, 'SALIDA', $operadorId);
            }

            // Actuación inicial
            RadicadoActuacion::create([
                'radicado_id'       => $radicado->id,
                'descripcion'       => 'Radicado ingresado al sistema',
                'estado_anterior_id'=> null,
                'estado_nuevo_id'   => $estadoInicial->id,
                'usuario_id'        => $operadorId,
            ]);

            // Analizar PDF con IA si existe
            if ($pdfEntrada) {
                $this->procesarIaAsync($radicado, $pdfEntrada);
            }

            // Notificar a la dependencia destino (sistema interno)
            $this->notificacion->notificarNuevoRadicado($radicado, $operadorId);

            // Correo de confirmación al remitente si tiene email
            $emailRemitente = $radicado->tercero?->email ?? null;
            $nombreRemitente = $radicado->remitenteDisplay;

            if ($emailRemitente) {
                $this->brevo->enviarConfirmacionRadicado(
                    destinatarioEmail:      $emailRemitente,
                    destinatarioNombre:     $nombreRemitente,
                    numeroRadicado:         $radicado->numeroRadicado,
                    fechaRadicacion:        $radicado->fecha_radicacion,
                    tipoCorrespondencia:    $radicado->tipoCorrespondencia?->descripcion ?? '',
                    dependenciaDestino:     $radicado->dependenciaDestino?->descripcion ?? '',
                    fechaLimite:            $radicado->fecha_limite,
                );
            }

            return $radicado->load($this->relaciones());
        });
    }

    /**
     * Cambia el estado de un radicado y registra la actuación.
     */
    public function cambiarEstado(Radicado $radicado, string $codigoEstado, string $observacion, int $usuarioId): Radicado
    {
        $estadoAnterior = $radicado->estado;
        $estadoNuevo    = EstadoCorrespondencia::where('codigo', $codigoEstado)->firstOrFail();

        DB::transaction(function () use ($radicado, $estadoAnterior, $estadoNuevo, $observacion, $usuarioId) {
            $radicado->update(['estado_id' => $estadoNuevo->id]);

            RadicadoActuacion::create([
                'radicado_id'       => $radicado->id,
                'descripcion'       => $observacion ?: "Cambio de estado a {$estadoNuevo->descripcion}",
                'estado_anterior_id'=> $estadoAnterior->id,
                'estado_nuevo_id'   => $estadoNuevo->id,
                'usuario_id'        => $usuarioId,
            ]);
        });

        $radicado->load('estado');
        $this->notificacion->notificarCambioEstado($radicado, $usuarioId);

        return $radicado->fresh($this->relaciones());
    }

    /**
     * Adjunta un PDF al radicado (para agregar PDF de salida posterior).
     */
    public function adjuntarPdfSalida(Radicado $radicado, UploadedFile $file, int $usuarioId): Radicado
    {
        DB::transaction(function () use ($radicado, $file, $usuarioId) {
            // Eliminar PDF salida anterior si existe
            $anterior = $radicado->documentos()->where('tipo', 'SALIDA')->first();
            if ($anterior) {
                $this->pdfStorage->eliminar($anterior->ruta_almacenamiento);
                $anterior->delete();
            }
            $this->adjuntarPdf($radicado, $file, 'SALIDA', $usuarioId);
        });

        return $radicado->fresh($this->relaciones());
    }

    // ── Privados ────────────────────────────────────────────────────

    private function adjuntarPdf(Radicado $radicado, UploadedFile $file, string $tipo, int $subidoPor): RadicadoDocumento
    {
        $ruta = $this->pdfStorage->guardar($file, $radicado->año_radicado, $radicado->nro_radicado, $tipo);

        return RadicadoDocumento::create([
            'radicado_id'          => $radicado->id,
            'tipo'                 => $tipo,
            'nombre_original'      => $file->getClientOriginalName(),
            'ruta_almacenamiento'  => $ruta,
            'tamanio_bytes'        => $file->getSize(),
            'mime_type'            => $file->getMimeType() ?? 'application/pdf',
            'subido_por'           => $subidoPor,
        ]);
    }

    private function procesarIaAsync(Radicado $radicado, UploadedFile $pdfEntrada): void
    {
        try {
            $campos  = $this->gemini->analizarPdf($pdfEntrada->getRealPath(), $pdfEntrada->getClientOriginalName());

            if ($campos) {
                $radicado->update([
                    'ia_procesado'        => true,
                    'ia_campos_sugeridos' => $campos,
                ]);
            }
        } catch (\Throwable) {
            // IA es opcional — no bloquea el radicado
        }
    }

    public function relaciones(): array
    {
        return [
            'tercero.tipoIdentificacion',
            'funcionario.dependencia',
            'dependenciaRemitente',
            'tipoCorrespondencia',
            'auxTip',
            'dependenciaDestino',
            'personalDestino',
            'terceroDestino.tipoIdentificacion',
            'tipoAnexo',
            'medioIngreso',
            'estado',
            'operador.role',
            'documentos',
            'actuaciones.estadoAnterior',
            'actuaciones.estadoNuevo',
            'actuaciones.usuario',
        ];
    }
}
