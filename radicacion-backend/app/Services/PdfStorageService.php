<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;
use Smalot\PdfParser\Parser;

class PdfStorageService
{
    // Ruta base en Railway Volume: /app/storage/app/private/radicados/{año}/{nro}/
    public function guardar(UploadedFile $file, int $año, int $nro, string $tipo): string
    {
        $nroPadded = str_pad($nro, 6, '0', STR_PAD_LEFT);
        $directorio = "radicados/{$año}/{$nroPadded}";
        // uniqid() evita choques cuando se suben varios anexos en el mismo
        // segundo (ENTRADA/SALIDA son únicos por radicado, pero ANEXO no).
        $nombreArchivo = strtolower($tipo) . '_' . time() . '_' . uniqid() . '.pdf';

        // Almacena en disk 'local' (apunta a storage/app)
        // En Railway, el volume está montado en /app/storage
        $ruta = $file->storeAs($directorio, $nombreArchivo, 'local');

        return $ruta;
    }

    public function rutaAbsoluta(string $ruta): string
    {
        return Storage::disk('local')->path($ruta);
    }

    public function existe(string $ruta): bool
    {
        return Storage::disk('local')->exists($ruta);
    }

    public function eliminar(string $ruta): void
    {
        if ($this->existe($ruta)) {
            Storage::disk('local')->delete($ruta);
        }
    }

    public function contenido(string $ruta): string
    {
        return Storage::disk('local')->get($ruta) ?? '';
    }

    // Cuenta las páginas de un PDF a partir de su ruta absoluta en disco
    // (ej. $file->getRealPath() de un UploadedFile, antes de guardarlo).
    // Best-effort: un PDF corrupto o con estructura rara no debe tumbar la
    // radicación, solo se deja el dato sin llenar.
    public function contarPaginas(string $rutaAbsoluta): ?int
    {
        try {
            $pdf = (new Parser())->parseFile($rutaAbsoluta);
            return count($pdf->getPages());
        } catch (\Throwable $e) {
            Log::warning("No se pudo contar páginas del PDF ({$rutaAbsoluta}): {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Estampa un QR en la esquina superior derecha de la PRIMERA página de un
     * PDF (a partir de su ruta absoluta) y devuelve la ruta absoluta de un
     * archivo temporal nuevo con el resultado — el original no se toca. El
     * documento puede ser un escaneo (imagen sin texto real) o texto: a FPDI
     * no le importa, importa la página como está y dibuja el QR encima, sin
     * re-renderizar ni re-interpretar el contenido.
     *
     * El llamador es responsable de mover/guardar el archivo resultante y de
     * borrar el temporal cuando termine.
     */
    public function estamparQr(string $rutaAbsolutaOriginal, string $qrPng): string
    {
        $qrTemp = tempnam(sys_get_temp_dir(), 'qr_').'.png';
        file_put_contents($qrTemp, $qrPng);

        try {
            $pdf = new Fpdi();
            $totalPaginas = $pdf->setSourceFile($rutaAbsolutaOriginal);

            // 22mm de lado, 8mm de margen desde el borde — tamaño de sello
            // que no debería tapar el contenido normal de una carta oficial
            // en carta/A4.
            $ladoQr = 22;
            $margen = 8;

            for ($pagina = 1; $pagina <= $totalPaginas; $pagina++) {
                $idPlantilla = $pdf->importPage($pagina);
                $tamano = $pdf->getTemplateSize($idPlantilla);

                $pdf->AddPage($tamano['orientation'], [$tamano['width'], $tamano['height']]);
                $pdf->useTemplate($idPlantilla);

                // El QR solo va en la primera página — es la única que se
                // verifica, no tiene sentido repetirlo en anexos de varias páginas.
                if ($pagina === 1) {
                    $x = $tamano['width'] - $ladoQr - $margen;
                    $pdf->Image($qrTemp, $x, $margen, $ladoQr, $ladoQr, 'PNG');
                }
            }

            $rutaSalida = tempnam(sys_get_temp_dir(), 'pdf_estampado_').'.pdf';
            $pdf->Output('F', $rutaSalida);

            return $rutaSalida;
        } finally {
            @unlink($qrTemp);
        }
    }
}
