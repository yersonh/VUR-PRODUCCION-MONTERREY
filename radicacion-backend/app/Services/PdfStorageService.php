<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
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
}
