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

    // Colores institucionales — deben coincidir con la tabla "Institutional
    // Design System" documentada en CLAUDE.md (misma paleta que usa el
    // frontend). No inventar tonos nuevos por fuera de estos.
    private const COLOR_FONDO_HEADER = '#0B1220';
    private const COLOR_ACENTO       = '#C8A800'; // dorado — acción neutra/informativa
    private const COLOR_EXITO        = '#1F8C6F'; // teal — respuesta disponible
    private const COLOR_ALERTA       = '#b45309'; // ámbar — vencimiento próximo
    private const COLOR_DANGER       = '#DC2626'; // rojo — anulado
    private const COLOR_FONDO_BODY   = '#F1F5F9';
    private const COLOR_TEXTO_MUTED  = '#64748B';

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
        ?string $fechaLimite = null,
        ?string $responsable = null
    ): bool {
        if (empty($this->apiKey) || empty($destinatarioEmail)) {
            return false;
        }

        $limiteHtml = $fechaLimite
            ? "<tr style='background:#fef3c7'><td style='padding:8px 12px;font-weight:bold'>Fecha límite respuesta</td><td style='padding:8px 12px;color:#b45309'><strong>{$fechaLimite}</strong></td></tr>"
            : '';

        $responsableHtml = $responsable
            ? "<tr><td style='padding:8px 12px;font-weight:bold'>Responsable de tu respuesta</td><td style='padding:8px 12px'>{$responsable}</td></tr>"
            : '';

        $contenido = "
            <p>Estimado(a) <strong>{$destinatarioNombre}</strong>,</p>
            <p>Su correspondencia ha sido radicada exitosamente con los siguientes datos:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0'>
              <tr style='background:#dbeafe'><td style='padding:8px 12px;font-weight:bold'>Número de Radicado</td><td style='padding:8px 12px'><strong style='font-size:18px;color:".self::COLOR_FONDO_HEADER."'>{$numeroRadicado}</strong></td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Fecha de radicación</td><td style='padding:8px 12px'>{$fechaRadicacion}</td></tr>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Tipo de correspondencia</td><td style='padding:8px 12px'>{$tipoCorrespondencia}</td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Dependencia destino</td><td style='padding:8px 12px'>{$dependenciaDestino}</td></tr>
              {$responsableHtml}
              {$limiteHtml}
            </table>
            <p>Por favor conserve el número de radicado para futuras consultas.</p>";

        $html = $this->plantillaBase('✓ Correspondencia Radicada', self::COLOR_ACENTO, $contenido);

        return $this->enviar($destinatarioEmail, $destinatarioNombre, "Radicado {$numeroRadicado} — Confirmación de ingreso", $html);
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

        $contenido = "
            <p>Estimado(a) <strong>{$nombreDestino}</strong>,</p>
            <p>Se le ha asignado la siguiente correspondencia para trámite:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0'>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Radicado</td><td style='padding:8px 12px'><strong>{$numeroRadicado}</strong></td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Remitente</td><td style='padding:8px 12px'>{$remitente}</td></tr>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Tipo</td><td style='padding:8px 12px'>{$tipoCorrespondencia}</td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Asunto</td><td style='padding:8px 12px'>{$asunto}</td></tr>
            </table>";

        $html = $this->plantillaBase('Nueva Correspondencia Asignada', self::COLOR_ACENTO, $contenido);

        return $this->enviar($emailDestino, $nombreDestino, "Nueva correspondencia asignada — Radicado {$numeroRadicado}", $html);
    }

    /**
     * Envía las credenciales de acceso (contraseña temporal) a un usuario
     * recién creado o al que se le restableció la contraseña.
     */
    public function enviarCredencialesUsuario(
        string $email,
        string $nombre,
        string $password
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $urlLogin = env('FRONTEND_URL', 'http://localhost:5173');

        $contenido = "
            <p>Estimado(a) <strong>{$nombre}</strong>,</p>
            <p>Se ha creado una cuenta de acceso a tu nombre en el Sistema de Radicación de Correspondencia. Estas son tus credenciales de ingreso:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0'>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Correo</td><td style='padding:8px 12px'>{$email}</td></tr>
              <tr><td style='padding:8px 12px;font-weight:bold'>Contraseña temporal</td><td style='padding:8px 12px'><strong style='font-size:16px'>{$password}</strong></td></tr>
            </table>
            <p style='background:#fef3c7;color:#b45309;padding:12px;border-radius:8px'>
              Por seguridad, el sistema te pedirá <strong>cambiar esta contraseña</strong> la primera vez que inicies sesión.
            </p>
            <p><a href='{$urlLogin}' style='display:inline-block;background:".self::COLOR_FONDO_HEADER.";color:".self::COLOR_ACENTO.";padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold'>Ir al sistema</a></p>
            <p style='font-size:12px'>Si no esperabas este correo, contacta al administrador del sistema.</p>";

        $html = $this->plantillaBase('Acceso al Sistema de Radicación', self::COLOR_ACENTO, $contenido);

        return $this->enviar($email, $nombre, 'Tu cuenta fue creada en el Sistema de Radicación', $html);
    }

    /**
     * Avisa que ya hay una respuesta (PDF de salida) disponible para un
     * radicado. Se usa tanto para el operador que lo radicó como para el
     * remitente — mismo mensaje, distinto destinatario.
     */
    public function enviarRespuestaDisponible(
        string $email,
        string $nombre,
        string $numeroRadicado,
        string $fechaRespuesta
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $contenido = "
            <p>Estimado(a) <strong>{$nombre}</strong>,</p>
            <p>Ya se adjuntó la respuesta al radicado <strong style='font-size:16px;color:".self::COLOR_EXITO."'>{$numeroRadicado}</strong>.</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0'>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Fecha de respuesta</td><td style='padding:8px 12px'>{$fechaRespuesta}</td></tr>
            </table>";

        $html = $this->plantillaBase('Respuesta Disponible', self::COLOR_EXITO, $contenido);

        return $this->enviar($email, $nombre, "Radicado {$numeroRadicado} — Respuesta disponible", $html);
    }

    /**
     * Recordatorio de que un radicado vence mañana y aún no tiene respuesta.
     */
    public function enviarRecordatorioVencimiento(
        string $email,
        string $nombre,
        string $numeroRadicado,
        string $fechaLimite
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $contenido = "
            <p>Estimado(a) <strong>{$nombre}</strong>,</p>
            <p>El radicado <strong style='font-size:16px;color:".self::COLOR_ALERTA."'>{$numeroRadicado}</strong> vence mañana (<strong>{$fechaLimite}</strong>) y aún no tiene respuesta registrada.</p>";

        $html = $this->plantillaBase('⚠ Radicado por vencer', self::COLOR_ALERTA, $contenido);

        return $this->enviar($email, $nombre, "Radicado {$numeroRadicado} — Vence mañana", $html);
    }

    /**
     * Notifica al remitente de un radicado que su estado cambió — pensado
     * sobre todo para ANULADO (el único cambio manual explícito que existe
     * hoy), pero sirve para cualquier transición de estado que se le quiera
     * comunicar. No se usa para RESPONDIDO: ese caso ya tiene su propio
     * correo más específico (enviarRespuestaDisponible).
     */
    public function enviarCambioEstado(
        string $email,
        string $nombre,
        string $numeroRadicado,
        string $estadoCodigo,
        string $estadoDescripcion,
        ?string $observacion = null
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $esAnulado = $estadoCodigo === 'ANULADO';
        $color     = $esAnulado ? self::COLOR_DANGER : self::COLOR_ACENTO;
        $titulo    = $esAnulado ? 'Radicado Anulado' : 'Cambio de Estado';

        $observacionHtml = $observacion
            ? "<tr><td style='padding:8px 12px;font-weight:bold'>Observación</td><td style='padding:8px 12px'>{$observacion}</td></tr>"
            : '';

        $contenido = "
            <p>Estimado(a) <strong>{$nombre}</strong>,</p>
            <p>El radicado <strong style='font-size:16px;color:{$color}'>{$numeroRadicado}</strong> cambió de estado.</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0'>
              <tr style='background:#e2e8f0'><td style='padding:8px 12px;font-weight:bold'>Nuevo estado</td><td style='padding:8px 12px'><strong>{$estadoDescripcion}</strong></td></tr>
              {$observacionHtml}
            </table>";

        $html = $this->plantillaBase($titulo, $color, $contenido);

        return $this->enviar($email, $nombre, "Radicado {$numeroRadicado} — {$estadoDescripcion}", $html);
    }

    // ── Plantilla compartida ────────────────────────────────────────
    // Header con logo institucional + colores del sistema de diseño (ver
    // CLAUDE.md "Institutional Design System") — todos los correos deben
    // pasar por acá para que el header sea idéntico en todos. Cada método
    // solo arma el contenido específico del cuerpo.
    private function plantillaBase(string $tituloEncabezado, string $colorAcento, string $contenidoHtml): string
    {
        $urlLogo = rtrim(config('app.url'), '/').'/images/alcaldia-logo.jpg';

        return "
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
          <div style='background:".self::COLOR_FONDO_HEADER.";padding:24px 20px;text-align:center'>
            <img src='{$urlLogo}' alt='Alcaldía de Monterrey Casanare' width='64' height='64' style='width:64px;height:64px;border-radius:50%;border:2px solid {$colorAcento};margin-bottom:14px'>
            <h2 style='color:white;margin:0'>{$tituloEncabezado}</h2>
            <p style='color:{$colorAcento};margin:8px 0 0'>Alcaldía de Monterrey Casanare</p>
          </div>
          <div style='padding:24px;background:".self::COLOR_FONDO_BODY."'>
            {$contenidoHtml}
            <p style='color:".self::COLOR_TEXTO_MUTED.";font-size:12px;margin-top:24px'>
              Este es un mensaje automático.<br>
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
