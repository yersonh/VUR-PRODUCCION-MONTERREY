<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Dependencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DependenciaAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->string('q');

        $data = Dependencia::when($q->isNotEmpty(), fn ($query) =>
                $query->where('descripcion', 'ilike', "%{$q}%")
            )
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:120'],
            'activo'      => ['boolean'],
        ]);

        $dep = Dependencia::create($data);
        return response()->json($dep, 201);
    }

    public function update(Request $request, Dependencia $dependencia): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:120'],
            'activo'      => ['boolean'],
        ]);

        $dependencia->update($data);
        return response()->json($dependencia);
    }

    public function toggleActivo(Dependencia $dependencia): JsonResponse
    {
        $dependencia->update(['activo' => ! $dependencia->activo]);
        return response()->json($dependencia);
    }
}
