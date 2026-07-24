<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ManualController extends Controller
{
    private const ARCHIVO_POR_ROL = [
        'ADMIN'       => 'admin.pdf',
        'OPERADOR'    => 'operador.pdf',
        'FUNCIONARIO' => 'funcionario.pdf',
    ];

    // ── GET /manuales/mio — manual de usuario del rol autenticado ──
    public function descargarMio(Request $request): mixed
    {
        $rol     = $request->user()->role->nombre;
        $archivo = self::ARCHIVO_POR_ROL[$rol] ?? null;

        abort_unless($archivo, 404, 'No hay manual de usuario para este rol');

        $ruta = "manuales/{$archivo}";
        abort_unless(Storage::disk('local')->exists($ruta), 404, 'Manual no encontrado en disco');

        return response()->file(
            Storage::disk('local')->path($ruta),
            [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'inline; filename="Manual de Usuario.pdf"',
            ]
        );
    }
}
