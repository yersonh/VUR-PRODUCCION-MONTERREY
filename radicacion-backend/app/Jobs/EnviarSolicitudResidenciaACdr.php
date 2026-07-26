<?php

namespace App\Jobs;

use App\Models\Radicado;
use App\Services\ClienteCdr;
use App\Services\NotificacionService;
use App\Services\PdfStorageService;
use App\Services\RadicadoService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

// Envía a CDR (peer-to-peer, no pasa por el Core) el PDF de entrada y los
// datos del remitente de un radicado de tipo "Solicitud Carta De
// Residencia". Se despacha desde RadicadoService::crear() con
// ->afterCommit() para no enviar nada si la transacción falla.
class EnviarSolicitudResidenciaACdr implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $backoff = 30;

    public function __construct(private int $radicadoId) {}

    public function handle(ClienteCdr $cdr, RadicadoService $service, PdfStorageService $pdfStorage, NotificacionService $notificacion): void
    {
        $radicado = Radicado::with(['documentos', 'tercero'])->find($this->radicadoId);

        if (!$radicado) {
            Log::warning("EnviarSolicitudResidenciaACdr: radicado {$this->radicadoId} ya no existe, se omite.");
            return;
        }

        $documentoEntrada = $radicado->documentos->firstWhere('tipo', 'ENTRADA');

        if (!$documentoEntrada) {
            Log::warning("Radicado {$radicado->numero_radicado} no tiene PDF de entrada, no se envía a CDR.");
            return;
        }

        $remitente = $service->terceroInfo($radicado->tercero);

        // Certificado Electoral es el único medio con soporte opcional en
        // VUR (SISBEN/JAC no se adjuntan aquí, igual que en el formulario
        // público de CDR) — si el operador lo agregó como anexo, se busca su
        // documento para enviarlo junto con el recibido. Si no está, se
        // manda sin soporte: CDR se encarga de pedir la subsanación (ver
        // RecibidoVurService::procesarAutomaticamente en el repo CDR).
        $rutaSoporteAbsoluta = null;
        $nombreSoporte = null;
        if ($radicado->medio_acreditacion === 'electoral') {
            $tipoAnexoElectoralId = (int) config('services.cdr.tipo_anexo_certificado_electoral_id');
            $anexoElectoral = collect($radicado->anexos ?? [])
                ->first(fn (array $a) => (int) ($a['tipo_id'] ?? 0) === $tipoAnexoElectoralId && $a['documento_id']);

            if ($anexoElectoral) {
                $documentoElectoral = $radicado->documentos->firstWhere('id', $anexoElectoral['documento_id']);
                if ($documentoElectoral) {
                    $rutaSoporteAbsoluta = $pdfStorage->rutaAbsoluta($documentoElectoral->ruta_almacenamiento);
                    $nombreSoporte = $documentoElectoral->nombre_original;
                }
            }
        }

        try {
            $resultado = $cdr->enviarRecibido(
                datos: [
                    'radicado_vur'          => $radicado->numero_radicado,
                    'referencia_cdr'        => $radicado->referencia_cdr,
                    'nombre_completo'       => $remitente['nombre_completo'] ?? $radicado->nombre_persona_empresa,
                    'numero_identificacion' => $remitente['nro_identificacion'] ?? null,
                    'correo'                => $remitente['email'] ?? null,
                    'celular'               => $remitente['telefono'] ?? null,
                    'direccion'             => $remitente['direccion'] ?? null,
                    'tipo_documento'        => $remitente['tipo_documento'] ?? null,
                    'motivo'                => $radicado->observaciones,
                    'medio_acreditacion'    => $radicado->medio_acreditacion,
                ],
                rutaPdfAbsoluta: $pdfStorage->rutaAbsoluta($documentoEntrada->ruta_almacenamiento),
                nombreArchivo: $documentoEntrada->nombre_original,
                rutaSoporteAbsoluta: $rutaSoporteAbsoluta,
                nombreSoporte: $nombreSoporte,
            );

            // 409: CDR ya tenía este radicado_vur registrado — casi siempre
            // un choque de numeración entre los dos sistemas, no un reenvío
            // inofensivo. El log ya queda en WARNING, pero eso se pierde
            // fácil; se avisa también dentro del sistema para que un ADMIN
            // lo note y revise del lado de CDR.
            if ($resultado['ya_existe'] ?? false) {
                $notificacion->notificarConflictoCdr($radicado);
            }
        } catch (\Throwable $e) {
            // Con un worker de cola real (Redis/database), dejar que la
            // excepción se propague es lo correcto: el worker la atrapa y
            // reintenta según $tries/$backoff sin afectar a nadie más.
            // Pero con QUEUE_CONNECTION=sync (típico en desarrollo local sin
            // Redis) este Job corre dentro del mismo request HTTP que crea
            // el radicado, y una excepción sin atrapar aquí tumbaba esa
            // respuesta con 500 aunque el radicado ya se hubiera guardado.
            // CDR es un envío best-effort (igual que el análisis con IA):
            // nunca debe verse como un fallo de cara al usuario que radica.
            if (config('queue.default') === 'sync') {
                Log::error("EnviarSolicitudResidenciaACdr: fallo enviando radicado {$this->radicadoId} a CDR (cola sync, no se reintenta): {$e->getMessage()}");
                return;
            }

            throw $e;
        }
    }
}
