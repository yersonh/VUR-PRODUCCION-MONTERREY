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
            Log::info('CDR ya tenía registrado este radicado_vur, se omite reenvío', [
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
}
