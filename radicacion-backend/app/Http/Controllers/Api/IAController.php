<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IAController extends Controller
{
    public function __construct(private GeminiService $gemini) {}

    public function analizarPdf(Request $request): JsonResponse
    {
        // GeminiService reintenta hasta 5 veces con esperas de hasta 30s entre
        // cada una (además del timeout de 60s por intento vía Guzzle). El
        // límite por defecto de PHP (30s) mataba el proceso a medias antes de
        // terminar de responder, lo que el navegador reportaba como error de
        // CORS (la respuesta abortada nunca llevaba las cabeceras CORS).
        set_time_limit(180);

        $request->validate([
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $file = $request->file('pdf');

        $resultado = $this->gemini->analizarPdf($file->getRealPath(), $file->getClientOriginalName());

        if (! is_array($resultado)) {
            return response()->json([
                'message' => $resultado ?? 'No se pudo analizar el PDF con IA',
                'campos'  => null,
            ], 422);
        }

        return response()->json(['campos' => $resultado]);
    }

    // Lee el número de cédula desde el anexo de cédula subido en el flujo de
    // Solicitud Carta de Residencia, para validarlo contra el ciudadano.
    public function analizarCedulaAnexo(Request $request): JsonResponse
    {
        set_time_limit(180);

        $request->validate([
            'archivo' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:20480'],
        ]);

        $file     = $request->file('archivo');
        $mimeType = $file->getMimeType() ?: 'application/pdf';

        $resultado = $this->gemini->extraerNumeroIdentificacion($file->getRealPath(), $file->getClientOriginalName(), $mimeType);

        if (! is_array($resultado)) {
            return response()->json([
                'message'           => $resultado ?? 'No se pudo analizar el documento con IA',
                'nro_identificacion' => null,
            ], 422);
        }

        return response()->json(['nro_identificacion' => $resultado['nro_identificacion'] ?? null]);
    }
}
