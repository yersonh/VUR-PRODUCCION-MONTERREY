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
