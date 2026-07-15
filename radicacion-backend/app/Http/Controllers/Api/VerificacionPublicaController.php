<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RadicadoDocumento;
use App\Services\PdfStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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

    /**
     * Descarga pública del PDF de respuesta (ya estampado con su QR) por
     * código de verificación — mismo patrón que
     * ConsultaPublicaController::descargar() en CDR.
     */
    public function descargar(string $codigo, PdfStorageService $pdfStorage): BinaryFileResponse
    {
        $documento = RadicadoDocumento::with('radicado')
            ->where('tipo', 'SALIDA')
            ->where('codigo_verificacion', strtoupper($codigo))
            ->firstOrFail();

        abort_unless($pdfStorage->existe($documento->ruta_almacenamiento), 404);

        return Response::download(
            $pdfStorage->rutaAbsoluta($documento->ruta_almacenamiento),
            "Respuesta_{$documento->radicado->numero_radicado}.pdf",
        );
    }
}
