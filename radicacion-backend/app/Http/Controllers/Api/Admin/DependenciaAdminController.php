<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DependenciaLider;
use App\Services\ClienteCore;
use App\Services\RadicadoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class DependenciaAdminController extends Controller
{
    protected ClienteCore $core;

    public function __construct(ClienteCore $core, private RadicadoService $service)
    {
        $this->core = $core;
    }

    public function index(Request $request): JsonResponse
    {
        // GET /dependencias del Core no está paginado (array plano completo),
        // así que la búsqueda y paginación se hacen aquí sobre el dataset
        // entero, no solo sobre una página — esto sí es correcto (a diferencia
        // de /admin/personal, que pagina desde el Core y solo puede filtrar
        // la página ya traída).
        $q = $request->string('q')->toString();

        $todas = collect($this->core->dependencias())
            ->when($q !== '', fn (Collection $c) => $c->filter(
                fn (array $d) => str_contains(mb_strtolower($d['nombre']), mb_strtolower($q))
            ))
            ->sortByDesc('id')
            ->values();

        $perPage = $request->integer('per_page', 20);
        $page    = $request->integer('page', 1);

        $pagina = $todas->slice(($page - 1) * $perPage, $perPage)->values();

        $lideres = DependenciaLider::whereIn('dependencia_id', $pagina->pluck('id'))
            ->get()
            ->keyBy('dependencia_id');

        return response()->json([
            'data'         => $pagina->map(fn (array $d) => $this->aFila($d, $lideres->get($d['id']))),
            'current_page' => $page,
            'last_page'    => (int) max(1, ceil($todas->count() / $perPage)),
            'total'        => $todas->count(),
            'per_page'     => $perPage,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:120'],
            'activo'      => ['boolean'],
        ]);

        // NOTA: el Core no acepta 'activo' al crear una dependencia (no está
        // documentado en el body de POST /dependencias), así que no se envía.
        $dependencia = $this->core->crearDependencia([
            'nombre' => $data['descripcion'],
        ]);

        return response()->json($this->aFila($dependencia), 201);
    }

    public function update(Request $request, int $dependencia): JsonResponse
    {
        // El Core documenta explícitamente que /dependencias "No tiene update".
        // No se inventa ese endpoint.
        return response()->json([
            'message' => 'Editar dependencias no está soportado: el Core no expone un endpoint de actualización.',
        ], 501);
    }

    public function toggleActivo(int $dependencia): JsonResponse
    {
        // Tampoco hay endpoint documentado para activar/desactivar dependencias.
        return response()->json([
            'message' => 'Activar/desactivar dependencias no está soportado: el Core no expone un endpoint para esto.',
        ], 501);
    }

    private function aFila(array $dependencia, ?DependenciaLider $lider = null): array
    {
        $liderInfo = $lider ? $this->service->funcionarioInfo($lider->funcionario_id) : null;

        return [
            'id'           => $dependencia['id'],
            'descripcion'  => $dependencia['nombre'],
            'activo'       => $dependencia['activo'] ?? true,
            'lider_id'     => $lider?->funcionario_id,
            'lider_nombre' => $liderInfo['nombre_completo'] ?? null,
        ];
    }
}
