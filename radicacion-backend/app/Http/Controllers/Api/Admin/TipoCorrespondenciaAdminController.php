<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TipoCorrespondencia;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TipoCorrespondenciaAdminController extends Controller
{
    public function __construct(private ClienteCore $core)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $q = $request->string('q');

        $data = TipoCorrespondencia::when($q->isNotEmpty(), fn ($query) =>
                $query->where('descripcion', 'ilike', "%{$q}%")
            )
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        $data->through(fn (TipoCorrespondencia $tc) => [
            ...$tc->toArray(),
            'dependencia_destino_descripcion' => $this->dependenciaDescripcion($tc->dependencia_destino_id),
        ]);

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion'             => ['required', 'string', 'max:100'],
            'max_dias'                => ['required', 'integer', 'min:0', 'max:365'],
            'activo'                  => ['boolean'],
            'dependencia_destino_id'  => ['required', 'integer', Rule::in($this->idsDependenciasCore())],
        ]);

        return response()->json(TipoCorrespondencia::create($data), 201);
    }

    public function update(Request $request, TipoCorrespondencia $tipoCorrespondencia): JsonResponse
    {
        $data = $request->validate([
            'descripcion'             => ['required', 'string', 'max:100'],
            'max_dias'                => ['required', 'integer', 'min:0', 'max:365'],
            'activo'                  => ['boolean'],
            'dependencia_destino_id'  => ['required', 'integer', Rule::in($this->idsDependenciasCore())],
        ]);

        $tipoCorrespondencia->update($data);
        return response()->json($tipoCorrespondencia);
    }

    public function toggleActivo(TipoCorrespondencia $tipoCorrespondencia): JsonResponse
    {
        $tipoCorrespondencia->update(['activo' => ! $tipoCorrespondencia->activo]);
        return response()->json($tipoCorrespondencia);
    }

    private function idsDependenciasCore(): array
    {
        return collect($this->core->dependencias())->pluck('id')->all();
    }

    private function dependenciaDescripcion(?int $id): ?string
    {
        if (!$id) {
            return null;
        }

        return collect($this->core->dependencias())->firstWhere('id', $id)['nombre'] ?? null;
    }
}
