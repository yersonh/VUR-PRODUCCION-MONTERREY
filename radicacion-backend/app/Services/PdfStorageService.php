<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class PdfStorageService
{
    // Ruta base en Railway Volume: /app/storage/app/private/radicados/{año}/{nro}/
    public function guardar(UploadedFile $file, int $año, int $nro, string $tipo): string
    {
        $nroPadded = str_pad($nro, 6, '0', STR_PAD_LEFT);
        $directorio = "radicados/{$año}/{$nroPadded}";
        $nombreArchivo = strtolower($tipo) . '_' . time() . '.pdf';

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
}
