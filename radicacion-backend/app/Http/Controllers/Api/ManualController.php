<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ManualController extends Controller
{
    private const ARCHIVO_POR_ROL = [
        'ADMIN'       => 'admin.pdf',
        'OPERADOR'    => 'operador.pdf',
        'FUNCIONARIO' => 'funcionario.pdf',
    ];

    // ── GET /manuales/mio — manual de usuario del rol autenticado ──
    //
    // Los PDF viven en resources/manuales/ (no en storage/) a propósito:
    // storage/app/private está tanto en .dockerignore como montado como
    // volumen persistente en producción (docker-compose vur_storage), así
    // que cualquier archivo puesto ahí nunca llega a la imagen ni sobrevive
    // un rebuild. resources/ sí viaja con el código en cada build.
    public function descargarMio(Request $request): mixed
    {
        $rol     = $request->user()->role->nombre;
        $archivo = self::ARCHIVO_POR_ROL[$rol] ?? null;

        abort_unless($archivo, 404, 'No hay manual de usuario para este rol');

        $ruta = resource_path("manuales/{$archivo}");
        abort_unless(is_file($ruta), 404, 'Manual no encontrado en disco');

        return response()->file(
            $ruta,
            [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'inline; filename="Manual de Usuario.pdf"',
            ]
        );
    }
}
