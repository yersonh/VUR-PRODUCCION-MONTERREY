<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrevoMailService
{
    private string $apiKey;
    private string $fromEmail;
    private string $fromName;
    private string $baseUrl = 'https://api.brevo.com/v3';

    public function __construct()
    {
        $this->apiKey    = config('services.brevo.api_key') ?? '';
        $this->fromEmail = config('services.brevo.from_email') ?? '';
        $this->fromName  = config('services.brevo.from_name') ?? 'Sistema de Radicación';
    }

    /**
     * Envía correo de confirmación al radicar un documento.
     */
    public function enviarConfirmacionRadicado(
        string $destinatarioEmail,
        string $destinatarioNombre,
        string $numeroRadicado,
        string $fechaRadicacion,
        string $tipoCorrespondencia,
        string $dependenciaDestino,
        ?string $fechaLimite = null
    ): bool {
        if (empty($this->apiKey) || empty($destinatarioEmail)) {
            return false;
        }

        $asunto = "Radicado {$numeroRadicado} — Confirmación de ingreso";

        $html = $this->plantillaConfirmacion(
            $destinatarioNombre,
            $numeroRadicado,
            $fechaRadicacion,
            $tipoCorrespondencia,
            $dependenciaDestino,
            $fechaLimite
        );

        return $this->enviar($destinatarioEmail, $destinatarioNombre, $asunto, $html);
    }

    /**
     * Envía notificación a la dependencia destino.
     */
    public function notificarDependenciaDestino(
        string $emailDestino,
        string $nombreDestino,
        string $numeroRadicado,
        string $remitente,
        string $tipoCorrespondencia,
        string $asunto
    ): bool {
        if (empty($this->apiKey) || empty($emailDestino)) {
            return false;
        }

        $subject = "Nueva correspondencia asignada — Radicado {$numeroRadicado}";

        $html = "
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
          <div style='background:#1B3A6E;padding:20px;text-align:center'>
            <h2 style='color:white;margin:0'>Nueva Correspondencia Asignada</h2>
          </div>
          <div style='padding:24px;background:#f8fafc'>
            <p>Estimado(a) <strong>{$nombreDestino}</strong>,</p>
            <p>Se le ha asignado la siguiente correspondencia para trámite:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0'>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Radicado</td><td style='padding:8px 12px'><strong>{$numeroRadicado}</strong></td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Remitente</td><td style='padding:8px 12px'>{$remitente}</td></tr>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Tipo</td><td style='padding:8px 12px'>{$tipoCorrespondencia}</td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Asunto</td><td style='padding:8px 12px'>{$asunto}</td></tr>
            </table>
            <p style='color:#64748b;font-size:12px'>Alcaldía de Monterrey Casanare — Sistema de Radicación</p>
          </div>
        </div>";

        return $this->enviar($emailDestino, $nombreDestino, $subject, $html);
    }

    private function plantillaConfirmacion(
        string $nombre,
        string $nro,
        string $fecha,
        string $tipo,
        string $destino,
        ?string $fechaLimite
    ): string {
        $limiteHtml = $fechaLimite
            ? "<tr style='background:#fef3c7'><td style='padding:8px 12px;font-weight:bold'>Fecha límite respuesta</td><td style='padding:8px 12px;color:#b45309'><strong>{$fechaLimite}</strong></td></tr>"
            : '';

        return "
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
          <div style='background:#1B3A6E;padding:20px;text-align:center'>
            <h2 style='color:white;margin:0'>✓ Correspondencia Radicada</h2>
            <p style='color:#93c5fd;margin:8px 0 0'>Alcaldía de Monterrey Casanare</p>
          </div>
          <div style='padding:24px;background:#f8fafc'>
            <p>Estimado(a) <strong>{$nombre}</strong>,</p>
            <p>Su correspondencia ha sido radicada exitosamente con los siguientes datos:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0'>
              <tr style='background:#dbeafe'><td style='padding:8px 12px;font-weight:bold'>Número de Radicado</td><td style='padding:8px 12px'><strong style='font-size:18px;color:#1B3A6E'>{$nro}</strong></td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Fecha de radicación</td><td style='padding:8px 12px'>{$fecha}</td></tr>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Tipo de correspondencia</td><td style='padding:8px 12px'>{$tipo}</td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Dependencia destino</td><td style='padding:8px 12px'>{$destino}</td></tr>
              {$limiteHtml}
            </table>
            <p style='color:#64748b;font-size:12px;margin-top:24px'>
              Este es un mensaje automático. Por favor conserve el número de radicado para futuras consultas.<br>
              <strong>Sistema de Radicación de Correspondencia — NexGovIA</strong>
            </p>
          </div>
        </div>";
    }

    private function enviar(string $email, string $nombre, string $asunto, string $html): bool
    {
        try {
            $response = Http::withHeaders([
                'api-key'      => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/smtp/email", [
                'sender'     => ['name' => $this->fromName, 'email' => $this->fromEmail],
                'to'         => [['email' => $email, 'name' => $nombre]],
                'subject'    => $asunto,
                'htmlContent'=> $html,
            ]);

            if (! $response->successful()) {
                Log::error('BrevoMailService: error', ['status' => $response->status(), 'body' => $response->body()]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('BrevoMailService: excepción', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
