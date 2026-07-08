<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TipoCorrespondencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TipoCorrespondenciaAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->string('q');

        $data = TipoCorrespondencia::when($q->isNotEmpty(), fn ($query) =>
                $query->where('descripcion', 'ilike', "%{$q}%")
            )
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:100'],
            'max_dias'    => ['required', 'integer', 'min:0', 'max:365'],
            'activo'      => ['boolean'],
        ]);

        return response()->json(TipoCorrespondencia::create($data), 201);
    }

    public function update(Request $request, TipoCorrespondencia $tipoCorrespondencia): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:100'],
            'max_dias'    => ['required', 'integer', 'min:0', 'max:365'],
            'activo'      => ['boolean'],
        ]);

        $tipoCorrespondencia->update($data);
        return response()->json($tipoCorrespondencia);
    }

    public function toggleActivo(TipoCorrespondencia $tipoCorrespondencia): JsonResponse
    {
        $tipoCorrespondencia->update(['activo' => ! $tipoCorrespondencia->activo]);
        return response()->json($tipoCorrespondencia);
    }
}
