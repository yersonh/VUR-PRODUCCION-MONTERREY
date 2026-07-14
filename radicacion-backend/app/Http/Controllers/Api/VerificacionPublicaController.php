<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RadicadoDocumento;
use Illuminate\Http\JsonResponse;

/**
 * Consulta pública (sin sesión) del documento de respuesta (SALIDA) de un
 * radicado, a partir del código de verificación estampado en su QR — ver
 * RadicadoService::adjuntarPdf() / codigoVerificacionUnico(). Mismo patrón
 * que la consulta pública de certificados de CDR (ConsultaPublicaController).
 */
class VerificacionPublicaController extends Controller
{
    public function verificar(string $codigo): JsonResponse
    {
        $documento = RadicadoDocumento::with('radicado.tipoCorrespondencia', 'radicado.estado')
            ->where('tipo', 'SALIDA')
            ->where('codigo_verificacion', strtoupper($codigo))
            ->first();

        if (!$documento || !$documento->radicado) {
            return response()->json([
                'valido' => false,
                'message' => 'No existe ningún documento de respuesta con ese código de verificación.',
            ], 404);
        }

        $radicado = $documento->radicado;

        return response()->json([
            'valido' => true,
            'documento' => [
                'codigo_verificacion' => $documento->codigo_verificacion,
                'radicado' => $radicado->numero_radicado,
                'tipo_correspondencia' => $radicado->tipoCorrespondencia?->descripcion,
                'estado' => $radicado->estado?->descripcion,
                'fecha_respuesta' => $documento->created_at?->toDateString(),
            ],
        ]);
    }
}
