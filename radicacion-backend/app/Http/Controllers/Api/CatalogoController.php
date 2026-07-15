<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuxTip;
use App\Models\EstadoCorrespondencia;
use App\Models\MedioIngreso;
use App\Models\TipoAnexo;
use App\Models\TipoCorrespondencia;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogoController extends Controller
{
    protected ClienteCore $core;

    public function __construct(ClienteCore $core)
    {
        $this->core = $core;
    }

    public function dependencias(): JsonResponse
    {
        $data = collect($this->core->dependencias())
            ->where('activo', true)
            ->sortBy('nombre')
            ->values()
            ->map(fn (array $d) => [
                'id'          => $d['id'],
                'descripcion' => $d['nombre'],
                'activo'      => $d['activo'],
            ]);

        return response()->json($data);
    }

    public function tiposCorrespondencia(): JsonResponse
    {
        $dependencias = collect($this->core->dependencias())->keyBy('id');

        $data = TipoCorrespondencia::activo()->orderBy('descripcion')->get()
            ->map(fn (TipoCorrespondencia $tc) => [
                ...$tc->toArray(),
                'dependencia_destino_descripcion' => $dependencias->get($tc->dependencia_destino_id)['nombre'] ?? null,
            ]);

        return response()->json($data);
    }

    public function auxTips(Request $request): JsonResponse
    {
        $query = AuxTip::activo()->orderBy('descripcion');
        if ($request->filled('tipo_correspondencia_id')) {
            $query->where('tipo_correspondencia_id', $request->integer('tipo_correspondencia_id'));
        }
        return response()->json($query->get());
    }

    public function tiposAnexo(): JsonResponse
    {
        return response()->json(['data' => TipoAnexo::orderBy('descripcion')->get()]);
    }

    public function mediosIngreso(): JsonResponse
    {
        return response()->json(['data' => MedioIngreso::orderBy('descripcion')->get()]);
    }

    public function tiposIdentificacion(): JsonResponse
    {
        $data = collect($this->core->tiposIdentificacion())
            ->sortBy('descripcion')
            ->values();

        return response()->json(['data' => $data]);
    }

    public function estados(): JsonResponse
    {
        return response()->json(['data' => EstadoCorrespondencia::orderBy('orden')->get()]);
    }
}
