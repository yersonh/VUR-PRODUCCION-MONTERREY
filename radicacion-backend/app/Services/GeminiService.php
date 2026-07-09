<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key') ?? '';
        $this->model  = config('services.gemini.model', 'gemini-2.5-flash');
    }

    /**
     * Analiza un PDF y extrae campos del formulario de radicación.
     * Sube el archivo a la Gemini File API (soporta documentos grandes/escaneados
     * sin el límite de ~20MB que aplica al envío inline en base64) y lo referencia
     * por file_uri. Retorna un array con los campos detectados o null/string si falla.
     */
    public function analizarPdf(string $filePath, string $displayName = 'documento.pdf'): array|string|null
    {
        if (empty($this->apiKey)) {
            Log::warning('GeminiService: GEMINI_API_KEY no configurado');
            return 'GEMINI_API_KEY no está configurada en el servidor.';
        }

        try {
            $fileUri = $this->subirArchivo($filePath, $displayName);
        } catch (\Throwable $e) {
            Log::error('GeminiService: fallo al subir PDF a File API', ['error' => $e->getMessage()]);
            return 'No se pudo subir el PDF a Gemini: '.$e->getMessage();
        }

        $prompt = <<<PROMPT
Eres un asistente OCR especializado en correspondencia oficial colombiana.
El documento puede ser un PDF escaneado (imagen). Usa visión para leer el texto visible.
Si un campo no es legible o no aparece, devuelve null para ese campo.

Extrae estos campos:
- nombre_remitente: nombre completo de quien firma o envía el documento
- nro_identificacion_remitente: número de cédula, NIT u otro documento de identidad del remitente
- tipo_documento: CC, NIT, CE o PP según corresponda al remitente
- asunto: asunto o referencia del documento, máximo 100 caracteres
- fecha_documento: fecha del documento en formato YYYY-MM-DD
- nombre_persona_empresa: nombre de la entidad/empresa/institución remitente (distinto al nombre personal)
- observaciones: resumen del contenido en máximo 200 caracteres
- medio_probable: VENTANILLA, EMAIL o MENSAJERIA según cómo llegó el documento
- tiene_folios: número de páginas que tiene el documento según lo que indica el remitente (busca frases como "X folios", "X hojas", "X páginas"). Si no se menciona explícitamente, cuenta las páginas visibles del PDF y usa ese número.
- total_folios: número total de hojas del expediente completo si el documento hace referencia a un total distinto (ej: "folio 3 de 10" → total_folios=10). Si no hay indicación de total, devuelve null.
- tiene_anexos: true si el documento menciona anexos, adjuntos o documentos adicionales que acompañan el escrito. false si explícitamente dice "sin anexos". null si no se menciona el tema.
- descripcion_anexos: cuando tiene_anexos es true, array de strings con la descripción de cada anexo mencionado (ej: ["Oficio solicitud", "Factura expedida por Enerca", "Pantallazo de correo"]). Máximo 10 ítems, cada uno máximo 150 caracteres. null si tiene_anexos no es true.
- confianza: número entre 0 y 1 según qué tan legible es el documento
- tipo_remitente_sugerido: clasifica al remitente como exactamente uno de estos tres valores:
    "FUNCIONARIO" si el remitente pertenece a la Alcaldía de Monterrey Casanare. Señales: aparece junto a un cargo público (cualquier título como Alcalde, Secretario, Director, Jefe, Coordinador, Profesional, Técnico, Auxiliar, etc.) y una dependencia municipal (cualquier secretaría, oficina, despacho, unidad o área de la alcaldía). No importa el cargo exacto ni el nombre de la dependencia — si el documento lo sitúa dentro de la estructura de la Alcaldía, es FUNCIONARIO.
    "EMPRESA" si el remitente es una entidad externa, empresa, institución u organismo con NIT o membrete propio distinto a la Alcaldía de Monterrey Casanare (puede ser otra alcaldía, gobernación, empresa privada, entidad nacional, etc.).
    "CIUDADANO" si el remitente es una persona natural externa, sin cargo institucional ni dependencia municipal ni NIT empresarial — un particular enviando una petición, queja o recurso.
    Si no se puede determinar con certeza, devuelve null.
- dependencia_remitente: nombre de la dependencia del remitente cuando tipo_remitente_sugerido es "FUNCIONARIO" (cualquier secretaría, oficina o área mencionada junto a su nombre). null en los demás casos.
- cargo_remitente: cargo o título del remitente cuando tipo_remitente_sugerido es "FUNCIONARIO" (ej: "Secretario de Despacho", "Alcalde Municipal", "Jefe de Oficina", "Director"). Extraer solo el cargo, sin incluir la dependencia. null en los demás casos.
- tipo_destinatario: clasifica a quién va dirigido el documento (a quién está dirigida la correspondencia, no quién la firma) como exactamente uno de estos tres valores:
    "INTERNO" si va dirigido a un funcionario o dependencia de la Alcaldía de Monterrey Casanare (aparece cargo público + dependencia municipal en el destinatario).
    "EMPRESA" si va dirigido a una entidad externa (empresa, ONG, organismo, otra alcaldía o gobernación) distinta a la Alcaldía de Monterrey Casanare.
    "CIUDADANO" si va dirigido a una persona natural externa sin cargo institucional.
    Si el documento no tiene destinatario explícito o no se puede determinar, devuelve null.
- nombre_destinatario: nombre completo de la persona a quien va dirigido el documento. null si no aparece.
- dependencia_destino: nombre de la secretaría, oficina o área a la que va dirigido el documento, solo si tipo_destinatario es "INTERNO". null en los demás casos.
- nombre_empresa_destino: nombre de la entidad o empresa destino, solo si tipo_destinatario es "EMPRESA". null en los demás casos.
- cargo_destinatario: cargo del destinatario si aparece (ej: "Secretario de Despacho", "Licenciado"). null si no aparece.
- es_solicitud_residencia: true si el documento es una solicitud de carta/constancia de residencia (el remitente pide que se le expida una carta certificando que reside en el municipio, usualmente para un trámite, postulación laboral o similar). false en cualquier otro caso.
    Si es_solicitud_residencia es true y el documento está dirigido de forma genérica a "la Alcaldía de Monterrey Casanare" / "Alcaldía Municipal" sin nombrar una secretaría, oficina o dependencia específica, usa dependencia_destino = "Despacho del Alcalde" (solo el Alcalde despacha esas solicitudes; NO apliques esta regla para otros tipos de documento — si no es solicitud de residencia y no hay dependencia específica mencionada, deja dependencia_destino en null).
PROMPT;

        $payload = [
            'contents' => [[
                'parts' => [
                    ['text' => $prompt],
                    ['file_data' => ['mime_type' => 'application/pdf', 'file_uri' => $fileUri]],
                ],
            ]],
            'generationConfig' => [
                'temperature'      => 0.1,
                // 2048 se quedaba corto: gemini-2.5-flash gasta parte del
                // presupuesto de tokens en "thinking" interno antes de
                // generar el JSON, y con ~20 campos pedidos el JSON salía
                // cortado a la mitad (json_decode fallaba silenciosamente).
                // thinkingBudget=0 desactiva ese thinking para dejarle todo
                // el presupuesto a la respuesta real.
                'maxOutputTokens'  => 4096,
                'thinkingConfig'   => ['thinkingBudget' => 0],
                'responseMimeType' => 'application/json',
            ],
        ];

        $url     = "{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}";
        $intentos = 5;

        for ($i = 1; $i <= $intentos; $i++) {
            try {
                $response = Http::timeout(60)->post($url, $payload);

                // 503 / 429 con retry-after → esperar y reintentar
                if (in_array($response->status(), [503, 429])) {
                    $retryAfter = (int) ($response->header('Retry-After') ?: ($i * 5));
                    Log::warning("GeminiService: {$response->status()} intento {$i}/{$intentos}, esperando {$retryAfter}s");
                    if ($i < $intentos) {
                        sleep(min($retryAfter, 30));
                        continue;
                    }
                    return 'Gemini API sobrecargada. Intenta en unos segundos.';
                }

                if (! $response->successful()) {
                    $msg = $response->json('error.message') ?? $response->body();
                    Log::error('GeminiService: error', ['status' => $response->status(), 'msg' => $msg]);
                    return "Error de Gemini API ({$response->status()}): {$msg}";
                }

                $text         = $response->json('candidates.0.content.parts.0.text', '');
                $finishReason = $response->json('candidates.0.finishReason');
                $data         = $this->parseJson($text);

                if (! is_array($data)) {
                    Log::error('GeminiService: respuesta no es JSON', [
                        'finishReason' => $finishReason,
                        'raw'          => substr($text, 0, 500),
                    ]);
                    return $finishReason === 'MAX_TOKENS'
                        ? 'Gemini cortó la respuesta por límite de tokens.'
                        : 'Gemini no devolvió un JSON válido.';
                }

                return $data;

            } catch (ConnectionException $e) {
                Log::error("GeminiService: timeout intento {$i}", ['error' => $e->getMessage()]);
                if ($i < $intentos) { sleep(3); continue; }
                return 'Timeout al conectar con Gemini API.';
            }
        }

        return 'Gemini API no disponible tras varios intentos.';
    }

    /**
     * Sube un archivo a la Gemini File API mediante resumable upload
     * y retorna su file_uri para referenciarlo en generateContent.
     */
    private function subirArchivo(string $filePath, string $displayName): string
    {
        $bytes    = filesize($filePath);
        $mimeType = 'application/pdf';

        $startResp = Http::withHeaders([
            'X-Goog-Upload-Protocol'             => 'resumable',
            'X-Goog-Upload-Command'              => 'start',
            'X-Goog-Upload-Header-Content-Length' => (string) $bytes,
            'X-Goog-Upload-Header-Content-Type'  => $mimeType,
            'Content-Type'                        => 'application/json',
        ])->post("https://generativelanguage.googleapis.com/upload/v1beta/files?key={$this->apiKey}", [
            'file' => ['display_name' => $displayName],
        ]);

        if (! $startResp->successful()) {
            throw new \RuntimeException("inicio de subida falló ({$startResp->status()}): {$startResp->body()}");
        }

        $uploadUrl = $startResp->header('x-goog-upload-url');
        if (! $uploadUrl) {
            throw new \RuntimeException('Gemini no devolvió URL de subida.');
        }

        $uploadResp = Http::withHeaders([
            'X-Goog-Upload-Offset'  => '0',
            'X-Goog-Upload-Command' => 'upload, finalize',
        ])->withBody(file_get_contents($filePath), $mimeType)->post($uploadUrl);

        if (! $uploadResp->successful()) {
            throw new \RuntimeException("subida de archivo falló ({$uploadResp->status()}): {$uploadResp->body()}");
        }

        $fileUri = $uploadResp->json('file.uri');
        if (! $fileUri) {
            throw new \RuntimeException('respuesta de subida sin URI de archivo.');
        }

        return $fileUri;
    }

    private function parseJson(string $text): ?array
    {
        // Intento 1: texto plano ya es JSON
        $data = json_decode(trim($text), true);
        if (is_array($data)) return $data;

        // Intento 2: quitar markdown code fences
        $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($text));
        $clean = preg_replace('/\s*```$/i', '', $clean);
        $data  = json_decode(trim($clean), true);
        if (is_array($data)) return $data;

        // Intento 3: extraer primer bloque { ... } del texto
        if (preg_match('/\{.*\}/s', $text, $m)) {
            $data = json_decode($m[0], true);
            if (is_array($data)) return $data;
        }

        return null;
    }
}
