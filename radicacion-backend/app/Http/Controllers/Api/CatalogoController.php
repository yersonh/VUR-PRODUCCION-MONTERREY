<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuxTip;
use App\Models\Dependencia;
use App\Models\EstadoCorrespondencia;
use App\Models\MedioIngreso;
use App\Models\TipoAnexo;
use App\Models\TipoCorrespondencia;
use App\Models\TipoIdentificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogoController extends Controller
{
    public function dependencias(): JsonResponse
    {
        $data = Dependencia::activo()->orderBy('descripcion')->get();
        return response()->json($data);
    }

    public function tiposCorrespondencia(): JsonResponse
    {
        $data = TipoCorrespondencia::activo()->orderBy('descripcion')->get();
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
        return response()->json(['data' => TipoIdentificacion::orderBy('descripcion')->get()]);
    }

    public function estados(): JsonResponse
    {
        return response()->json(['data' => EstadoCorrespondencia::orderBy('orden')->get()]);
    }
}
