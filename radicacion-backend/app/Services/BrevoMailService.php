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
    private const COLOR_DANGER       = '#DC2626'; // rojo — anulado / conflicto
    private const COLOR_FONDO_BODY   = '#F1F5F9';
    private const COLOR_TEXTO        = '#1E293B';
    private const COLOR_TEXTO_MUTED  = '#64748B';
    private const COLOR_BORDE        = '#CBD5E1';

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
        ?string $responsable = null,
        ?int $radicadoId = null
    ): bool {
        if (empty($this->apiKey) || empty($destinatarioEmail)) {
            return false;
        }

        $ficha = $this->campo('Fecha de radicación', $fechaRadicacion)
            .$this->campo('Tipo de correspondencia', $tipoCorrespondencia, true)
            .$this->campo('Dependencia destino', $dependenciaDestino)
            .($responsable ? $this->campo('Responsable de la respuesta', $responsable, true) : '')
            .($fechaLimite ? $this->campo('Plazo de respuesta', $fechaLimite, false, self::COLOR_ALERTA) : '');

        // Sin botón: este correo va al remitente (ciudadano/empresa/funcionario
        // externo), que no tiene cuenta en VUR — un link a /radicados/{id}
        // solo lo mandaría a la pantalla de login sin forma de entrar.
        $contenido = $this->saludo($destinatarioNombre)
            ."<p style='margin:0 0 4px'>Le confirmamos que su correspondencia fue registrada exitosamente en el sistema, bajo el siguiente número de radicado:</p>"
            .$this->insignia($numeroRadicado, self::COLOR_ACENTO)
            ."<table style='width:100%;border-collapse:collapse;border:1px solid ".self::COLOR_BORDE.";border-radius:10px;overflow:hidden'>{$ficha}</table>"
            ."<p style='margin:20px 0 0'>Le sugerimos conservar este número, ya que será su referencia para cualquier consulta posterior sobre el trámite.</p>"
            .$this->firma();

        $html = $this->plantillaBase('Correspondencia radicada', self::COLOR_ACENTO, $contenido);

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
        string $asunto,
        ?int $radicadoId = null
    ): bool {
        if (empty($this->apiKey) || empty($emailDestino)) {
            return false;
        }

        $ficha = $this->campo('Remitente', $remitente)
            .$this->campo('Tipo de correspondencia', $tipoCorrespondencia, true)
            .$this->campo('Asunto', $asunto ?: '—');

        $contenido = $this->saludo($nombreDestino)
            ."<p style='margin:0 0 4px'>Se le asignó como responsable de dar trámite a la siguiente correspondencia:</p>"
            .$this->insignia($numeroRadicado, self::COLOR_ACENTO)
            ."<table style='width:100%;border-collapse:collapse;border:1px solid ".self::COLOR_BORDE.";border-radius:10px;overflow:hidden'>{$ficha}</table>"
            ."<p style='margin:20px 0 0'>Le agradecemos revisar el radicado en el sistema y gestionar la respuesta dentro del plazo establecido.</p>"
            .$this->boton('Ver radicado asignado', $this->urlRadicado($radicadoId))
            .$this->firma();

        $html = $this->plantillaBase('Correspondencia asignada', self::COLOR_ACENTO, $contenido);

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

        $ficha = $this->campo('Usuario', $email)
            .$this->campo('Contraseña temporal', "<strong style='font-size:16px;letter-spacing:0.5px'>{$password}</strong>", true);

        $contenido = $this->saludo($nombre)
            ."<p style='margin:0 0 4px'>Se ha creado una cuenta a su nombre en el Sistema de Radicación de Correspondencia. A continuación encontrará sus credenciales de acceso:</p>"
            ."<table style='width:100%;border-collapse:collapse;border:1px solid ".self::COLOR_BORDE.";border-radius:10px;overflow:hidden;margin:16px 0'>{$ficha}</table>"
            ."<p style='background:#fef3c7;color:#92400e;padding:14px 16px;border-radius:8px;margin:0 0 4px'>
                Por seguridad, el sistema le solicitará <strong>cambiar esta contraseña</strong> al iniciar sesión por primera vez.
              </p>"
            .$this->boton('Ingresar al sistema', $this->urlFrontend())
            ."<p style='color:".self::COLOR_TEXTO_MUTED.";font-size:12px;margin:20px 0 0'>Si usted no esperaba este correo, por favor contacte al administrador del sistema.</p>"
            .$this->firma();

        $html = $this->plantillaBase('Acceso al sistema', self::COLOR_ACENTO, $contenido);

        return $this->enviar($email, $nombre, 'Su cuenta fue creada en el Sistema de Radicación', $html);
    }

    // Límite propio para el adjunto del PDF de respuesta — Brevo acepta
    // hasta 10MB por email (contenido + adjuntos combinados); dejamos
    // margen para el HTML del mensaje. El PDF sigue subiéndose igual
    // (hasta 20MB, ver RadicadoController) y queda disponible desde el
    // sistema — el adjunto por correo es una comodidad adicional, no la
    // única vía de acceso.
    private const MAX_ADJUNTO_BYTES = 9 * 1024 * 1024;

    /**
     * Avisa que ya hay una respuesta (PDF de salida) disponible para un
     * radicado. Se usa tanto para el operador que lo radicó (tiene cuenta en
     * VUR) como para el remitente (ciudadano/empresa/funcionario externo,
     * sin cuenta) — mismo mensaje, distinto destinatario. Si se provee el
     * contenido del PDF de respuesta, se adjunta directamente al correo.
     *
     * @param bool $incluirBotonVerSistema Solo debe ir en true para
     *   destinatarios con cuenta en VUR (el operador) — para el remitente,
     *   el link a /radicados/{id} solo lo llevaría a la pantalla de login
     *   sin forma de entrar.
     */
    public function enviarRespuestaDisponible(
        string $email,
        string $nombre,
        string $numeroRadicado,
        string $fechaRespuesta,
        ?int $radicadoId = null,
        ?string $pdfContenido = null,
        ?string $pdfNombreArchivo = null,
        bool $incluirBotonVerSistema = true
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $ficha = $this->campo('Fecha de respuesta', $fechaRespuesta);

        $hayAdjunto = $pdfContenido !== null && strlen($pdfContenido) <= self::MAX_ADJUNTO_BYTES;
        if ($pdfContenido !== null && !$hayAdjunto) {
            Log::warning('BrevoMailService: PDF de respuesta excede el límite de adjunto, se envía solo el enlace', [
                'numeroRadicado' => $numeroRadicado,
                'bytes'          => strlen($pdfContenido),
            ]);
        }

        $textoDocumento = match (true) {
            $hayAdjunto && $incluirBotonVerSistema  => 'Encontrará el documento de respuesta adjunto a este correo. También puede consultarlo e imprimirlo ingresando al sistema.',
            $hayAdjunto && !$incluirBotonVerSistema => 'Encontrará el documento de respuesta adjunto a este correo.',
            default                                 => 'Puede consultar e imprimir el documento de respuesta ingresando al sistema.',
        };

        $contenido = $this->saludo($nombre)
            ."<p style='margin:0 0 4px'>Nos permitimos informarle que ya se encuentra disponible la respuesta al siguiente radicado:</p>"
            .$this->insignia($numeroRadicado, self::COLOR_EXITO)
            ."<table style='width:100%;border-collapse:collapse;border:1px solid ".self::COLOR_BORDE.";border-radius:10px;overflow:hidden'>{$ficha}</table>"
            ."<p style='margin:20px 0 0'>{$textoDocumento}</p>"
            .($incluirBotonVerSistema ? $this->boton('Ver respuesta', $this->urlRadicado($radicadoId)) : '')
            .$this->firma();

        $html = $this->plantillaBase('Respuesta disponible', self::COLOR_EXITO, $contenido);

        $adjuntos = $hayAdjunto
            ? [['content' => base64_encode($pdfContenido), 'name' => $pdfNombreArchivo ?? "Radicado-{$numeroRadicado}-respuesta.pdf"]]
            : [];

        return $this->enviar($email, $nombre, "Radicado {$numeroRadicado} — Respuesta disponible", $html, $adjuntos);
    }

    /**
     * Recordatorio de que un radicado vence mañana y aún no tiene respuesta.
     */
    public function enviarRecordatorioVencimiento(
        string $email,
        string $nombre,
        string $numeroRadicado,
        string $fechaLimite,
        ?int $radicadoId = null
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $ficha = $this->campo('Fecha límite', "<strong>{$fechaLimite}</strong>", false, self::COLOR_ALERTA);

        $contenido = $this->saludo($nombre)
            ."<p style='margin:0 0 4px'>Le recordamos que el siguiente radicado bajo su responsabilidad vence <strong>mañana</strong> y aún no registra respuesta:</p>"
            .$this->insignia($numeroRadicado, self::COLOR_ALERTA)
            ."<table style='width:100%;border-collapse:collapse;border:1px solid ".self::COLOR_BORDE.";border-radius:10px;overflow:hidden'>{$ficha}</table>"
            ."<p style='margin:20px 0 0'>Le sugerimos gestionar la respuesta a la brevedad para dar cumplimiento a los términos establecidos.</p>"
            .$this->boton('Gestionar radicado', $this->urlRadicado($radicadoId))
            .$this->firma();

        $html = $this->plantillaBase('Radicado próximo a vencer', self::COLOR_ALERTA, $contenido);

        return $this->enviar($email, $nombre, "Radicado {$numeroRadicado} — Vence mañana", $html);
    }

    /**
     * Notifica al remitente de un radicado que su estado cambió — pensado
     * sobre todo para ANULADO (el único cambio manual explícito que existe
     * hoy) y para cambios de estado reportados por integraciones externas
     * (p. ej. CDR). No se usa para RESPONDIDO cuando la respuesta se adjunta
     * desde VUR: ese caso tiene su propio correo (enviarRespuestaDisponible).
     */
    public function enviarCambioEstado(
        string $email,
        string $nombre,
        string $numeroRadicado,
        string $estadoCodigo,
        string $estadoDescripcion,
        ?string $observacion = null,
        ?int $radicadoId = null
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $esAnulado = $estadoCodigo === 'ANULADO';
        $color     = $esAnulado ? self::COLOR_DANGER : self::COLOR_ACENTO;
        $titulo    = $esAnulado ? 'Radicado anulado' : 'Actualización de su radicado';

        $introHtml = $esAnulado
            ? 'Le informamos que el siguiente radicado fue <strong>anulado</strong> por la entidad:'
            : 'Le informamos que el siguiente radicado tuvo una actualización en su estado de trámite:';

        $ficha = $this->campo('Estado actual', "<strong>{$estadoDescripcion}</strong>", false, $color)
            .($observacion ? $this->campo('Observación', $observacion, true) : '');

        // Sin botón: este correo siempre va al remitente (ciudadano/empresa/
        // funcionario externo), que no tiene cuenta en VUR.
        $contenido = $this->saludo($nombre)
            ."<p style='margin:0 0 4px'>{$introHtml}</p>"
            .$this->insignia($numeroRadicado, $color)
            ."<table style='width:100%;border-collapse:collapse;border:1px solid ".self::COLOR_BORDE.";border-radius:10px;overflow:hidden'>{$ficha}</table>"
            .$this->firma();

        $html = $this->plantillaBase($titulo, $color, $contenido);

        return $this->enviar($email, $nombre, "Radicado {$numeroRadicado} — {$estadoDescripcion}", $html);
    }

    /**
     * Alerta a un ADMIN de que CDR rechazó como duplicado (409) el reenvío
     * de un radicado que VUR le mandaba por primera vez — casi siempre un
     * choque de numeración con datos viejos/de prueba en CDR, no un envío
     * repetido real. Ver NotificacionService::notificarConflictoCdr().
     */
    public function alertarConflictoCdr(
        string $email,
        string $nombre,
        string $numeroRadicado,
        ?int $radicadoId = null
    ): bool {
        if (empty($this->apiKey) || empty($email)) {
            return false;
        }

        $contenido = $this->saludo($nombre)
            ."<p style='margin:0 0 4px'>Al enviar el siguiente radicado a CDR, el sistema externo respondió que ya tenía ese número registrado:</p>"
            .$this->insignia($numeroRadicado, self::COLOR_DANGER)
            ."<p style='background:#fee2e2;color:#991b1b;padding:14px 16px;border-radius:8px;margin:16px 0'>
                Esto normalmente indica un <strong>choque de numeración</strong> entre VUR y CDR — por ejemplo, datos de prueba antiguos ocupando ese número en CDR — y no un reenvío inofensivo. Es probable que los datos de este radicado <strong>no hayan quedado registrados en CDR</strong>.
              </p>"
            ."<p style='margin:0 0 4px'>Se recomienda verificar en CDR qué información está asociada a ese número y coordinar con el equipo correspondiente la resolución del choque.</p>"
            .$this->boton('Ver radicado en VUR', $this->urlRadicado($radicadoId))
            .$this->firma();

        $html = $this->plantillaBase('Conflicto de numeración con CDR', self::COLOR_DANGER, $contenido);

        return $this->enviar($email, $nombre, "Radicado {$numeroRadicado} — CDR reportó choque de numeración", $html);
    }

    // ── Bloques reutilizables de la plantilla ──────────────────────────

    private function saludo(string $nombre): string
    {
        return "<p style='margin:0 0 16px'>Cordial saludo, <strong>{$nombre}</strong>.</p>";
    }

    private function firma(): string
    {
        return "<p style='margin:28px 0 0;color:".self::COLOR_TEXTO."'>
            Atentamente,<br>
            <strong>Sistema de Radicación de Correspondencia</strong><br>
            Alcaldía de Monterrey Casanare
          </p>";
    }

    /** Insignia centrada con el número de radicado, en el color del contexto. */
    private function insignia(string $numeroRadicado, string $color): string
    {
        return "<div style='text-align:center;margin:6px 0 20px'>
            <span style='display:inline-block;background:{$color}1a;color:{$color};border:1px solid {$color}55;padding:9px 20px;border-radius:999px;font-weight:700;font-size:18px;letter-spacing:0.4px'>{$numeroRadicado}</span>
          </div>";
    }

    /** Fila de una ficha de datos (label + valor), con acento de color opcional. */
    private function campo(string $etiqueta, string $valor, bool $alterno = false, ?string $colorValor = null): string
    {
        $bg    = $alterno ? 'background:#eef2f7;' : 'background:#ffffff;';
        $color = $colorValor ? "color:{$colorValor};" : 'color:'.self::COLOR_TEXTO.';';

        return "<tr style='{$bg}'>
            <td style='padding:11px 16px;font-weight:600;color:".self::COLOR_TEXTO.";width:40%;border-bottom:1px solid #eef2f7'>{$etiqueta}</td>
            <td style='padding:11px 16px;{$color}border-bottom:1px solid #eef2f7'>{$valor}</td>
          </tr>";
    }

    /** Botón de llamada a la acción, siempre con el mismo tratamiento visual. */
    private function boton(string $texto, string $url): string
    {
        return "<p style='margin:26px 0 4px;text-align:left'>
            <a href='{$url}' style='display:inline-block;background:".self::COLOR_FONDO_HEADER.";color:".self::COLOR_ACENTO.";padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px'>{$texto} →</a>
          </p>";
    }

    private function urlFrontend(): string
    {
        return rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
    }

    private function urlRadicado(?int $radicadoId): string
    {
        return $radicadoId
            ? $this->urlFrontend()."/radicados/{$radicadoId}"
            : $this->urlFrontend();
    }

    // ── Plantilla compartida ────────────────────────────────────────
    // Header con logo institucional + colores del sistema de diseño (ver
    // CLAUDE.md "Institutional Design System") — todos los correos deben
    // pasar por acá para que el header/pie sea idéntico en todos. Cada
    // método solo arma el contenido específico del cuerpo.
    private function plantillaBase(string $tituloEncabezado, string $colorAcento, string $contenidoHtml): string
    {
        $urlLogo = rtrim(config('app.url'), '/').'/images/alcaldia-logo.jpg';

        return "
        <div style='font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff'>
          <div style='background:".self::COLOR_FONDO_HEADER.";padding:28px 24px;text-align:center'>
            <img src='{$urlLogo}' alt='Alcaldía de Monterrey Casanare' width='60' height='60' style='width:60px;height:60px;border-radius:50%;border:2px solid {$colorAcento};margin-bottom:14px'>
            <p style='color:#ffffff;margin:0;font-size:13px;letter-spacing:1px;text-transform:uppercase;opacity:0.8'>Alcaldía de Monterrey Casanare</p>
            <h1 style='color:#ffffff;margin:6px 0 0;font-size:21px;font-weight:700'>{$tituloEncabezado}</h1>
          </div>
          <div style='padding:28px 26px;background:#ffffff;color:".self::COLOR_TEXTO."'>
            {$contenidoHtml}
          </div>
          <div style='padding:18px 26px;background:".self::COLOR_FONDO_BODY.";border-top:1px solid ".self::COLOR_BORDE."'>
            <p style='color:".self::COLOR_TEXTO_MUTED.";font-size:12px;margin:0;line-height:1.6'>
              Este es un mensaje generado automáticamente por el Sistema de Radicación de Correspondencia; por favor no responda directamente a este correo.<br>
              <strong style='color:".self::COLOR_TEXTO.";'>Alcaldía de Monterrey Casanare</strong> · Desarrollado por NexGovIA
            </p>
          </div>
        </div>";
    }

    /**
     * @param array<int, array{content: string, name: string}> $adjuntos Cada
     *   'content' ya debe venir en base64 — ver enviarRespuestaDisponible().
     */
    private function enviar(string $email, string $nombre, string $asunto, string $html, array $adjuntos = []): bool
    {
        try {
            $payload = [
                'sender'     => ['name' => $this->fromName, 'email' => $this->fromEmail],
                'to'         => [['email' => $email, 'name' => $nombre]],
                'subject'    => $asunto,
                'htmlContent'=> $html,
            ];
            if (!empty($adjuntos)) {
                $payload['attachment'] = $adjuntos;
            }

            $response = Http::withHeaders([
                'api-key'      => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/smtp/email", $payload);

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
