<?php

namespace App\Services;

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

/**
 * Utilidad genérica: string -> PNG de QR. No sabe nada de radicados ni de
 * PDFs, solo genera la imagen (igual patrón que CDR usa para el QR del
 * certificado, ver certificado-residencia-api/app/Services/QrService.php).
 */
class QrService
{
    /**
     * Genera un código QR y devuelve los bytes PNG (para estampar sobre un PDF).
     */
    public function png(string $contenido, int $size = 220): string
    {
        $qr = new QrCode(data: $contenido, size: $size, margin: 4);

        return (new PngWriter())->write($qr)->getString();
    }
}
