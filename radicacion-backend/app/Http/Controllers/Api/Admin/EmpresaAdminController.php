<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Solo crear + listar: el Core no expone un endpoint para editar empresas
// (no hay 'actualizarEmpresa' en ClienteCore, a diferencia de
// CiudadanoAdminController). No se ofrece un botón de editar que sabemos
// que va a fallar — cuando el Core agregue PUT /empresas/{id}, replicar el
// mismo patrón que ya tiene CiudadanoAdminController::update().
class EmpresaAdminController extends Controller
{
    protected ClienteCore $core;

    public function __construct(ClienteCore $core)
    {
        $this->core = $core;
    }

    public function index(Request $request): JsonResponse
    {
        $resultado = $this->core->empresas([
            'page'     => $request->integer('page', 1),
            'per_page' => $request->integer('per_page', 20),
        ]);

        $data = collect($resultado['data'] ?? [])->map(fn (array $e) => $this->aFila($e));

        // NOTA: igual que en TerceroController — el Core solo filtra
        // /empresas por 'nit' exacto, sin búsqueda de texto. El filtro 'q'
        // aquí solo aplica sobre la página ya traída.
        $q = $request->string('q')->toString();
        if ($q !== '') {
            $data = $data->filter(fn (array $e) =>
                str_contains(mb_strtolower($e['nit'].' '.$e['razon_social']), mb_strtolower($q))
            )->values();
        }

        return response()->json([
            'data'         => $data,
            'current_page' => $resultado['current_page'] ?? 1,
            'last_page'    => $resultado['last_page'] ?? 1,
            'total'        => $resultado['total'] ?? $data->count(),
            'per_page'     => $resultado['per_page'] ?? $request->integer('per_page', 20),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nit'          => ['required', 'string', 'max:20'],
            'razon_social' => ['required', 'string', 'max:150'],
            'direccion'    => ['nullable', 'string', 'max:250'],
            'municipio'    => ['nullable', 'string', 'max:150'],
            'telefono'     => ['nullable', 'string', 'max:20'],
            'email'        => ['nullable', 'email', 'max:150'],
        ]);

        $empresa = $this->core->crearEmpresa($data);

        return response()->json($this->aFila($empresa), 201);
    }

    private function aFila(array $e): array
    {
        return [
            'id'           => $e['id'],
            'codigo'       => 'EMP'.str_pad((string) $e['id'], 6, '0', STR_PAD_LEFT),
            'nit'          => $e['nit'] ?? '',
            'razon_social' => $e['razon_social'] ?? '',
            'direccion'    => $e['direccion'] ?? null,
            'municipio'    => $e['municipio'] ?? null,
            'telefono'     => $e['telefono'] ?? null,
            'email'        => $e['email'] ?? null,
            'activo'       => $e['activo'] ?? true,
        ];
    }
}
