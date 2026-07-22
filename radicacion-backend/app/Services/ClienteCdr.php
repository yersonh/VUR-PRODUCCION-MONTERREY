<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

// ── Cliente CDR (Certificado de Residencia Digital) ──────────────────
// Comunicación peer-to-peer directa con CDR (no pasa por el Core): envío
// de solicitudes de Carta de Residencia radicadas en VUR.
class ClienteCdr
{
    protected string $baseUrl;
    protected string $token;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.cdr.url'), '/');
        $this->token = config('services.cdr.token');
    }

    // Envía un recibido a CDR (POST /v1/recibidos-vur). Un 409 significa que
    // CDR ya tenía este radicado_vur registrado (reintento del Job tras un
    // fallo transitorio) — se trata como éxito idempotente, no como error.
    public function enviarRecibido(array $datos, string $rutaPdfAbsoluta, string $nombreArchivo): array
    {
        $response = Http::withToken($this->token)
            ->acceptJson()
            ->timeout(20)
            ->attach('pdf', file_get_contents($rutaPdfAbsoluta), $nombreArchivo)
            ->post("{$this->baseUrl}/v1/recibidos-vur", $datos);

        if ($response->status() === 409) {
            // WARNING (no INFO): esto no es un reintento inofensivo del Job —
            // es la primera vez que VUR manda este radicado_vur y CDR ya dice
            // tenerlo, lo cual normalmente delata un choque de numeración
            // entre los dos sistemas. Se trata como éxito idempotente para no
            // romper la respuesta al usuario, pero el caller debe avisar a
            // un humano (ver EnviarSolicitudResidenciaACdr).
            Log::warning('CDR ya tenía registrado este radicado_vur, se omite reenvío — posible choque de numeración, revisar del lado de CDR', [
                'radicado_vur' => $datos['radicado_vur'] ?? null,
            ]);

            return ['ya_existe' => true];
        }

        if ($response->failed()) {
            Log::error('CDR API error en POST recibidos-vur', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new Exception("Error al enviar solicitud a CDR: HTTP {$response->status()}");
        }

        return $response->json();
    }

    /**
     * Registra en CDR una Solicitud Carta de Residencia radicada
     * directamente en VUR (correo/ventanilla presencial, sin pasar por el
     * formulario público de CDR), para obtener un código de seguimiento
     * SP-######## real y consultable en el portal de CDR — igual al que ya
     * recibe el ciudadano que usa el formulario web.
     *
     * Llamada síncrona (JSON, sin archivo) desde RadicadoService::crear(),
     * ANTES de enviar el correo de confirmación de radicado — por eso
     * necesita ser rápida y best-effort: timeout corto y cualquier fallo se
     * traga (log + null) para no demorar ni bloquear la radicación si CDR
     * está caído. No confundir con enviarRecibido(), que sí es la que manda
     * el PDF completo (esa sigue siendo asíncrona, sin cambios).
     *
     * @param  array<string, mixed>  $datos
     * @return array{referencia_cdr: int, codigo_seguimiento_cdr: string}|null
     */
    public function registrarSolicitudResidencia(array $datos): ?array
    {
        try {
            $response = Http::withToken($this->token)
                ->acceptJson()
                ->timeout(5)
                ->post("{$this->baseUrl}/v1/solicitudes-publicas/registrar-desde-vur", $datos);
        } catch (\Throwable $e) {
            Log::warning('No se pudo registrar en CDR el código de seguimiento de una Carta de Residencia radicada en VUR (conexión)', [
                'radicado_vur' => $datos['radicado_vur'] ?? null,
                'exception' => $e->getMessage(),
            ]);

            return null;
        }

        if ($response->failed()) {
            Log::warning('No se pudo registrar en CDR el código de seguimiento de una Carta de Residencia radicada en VUR (HTTP)', [
                'radicado_vur' => $datos['radicado_vur'] ?? null,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        return $response->json('data');
    }
}
