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
}
