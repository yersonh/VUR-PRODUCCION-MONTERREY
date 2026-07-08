<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuxTip;
use App\Models\MedioIngreso;
use App\Models\TipoAnexo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogoAdminController extends Controller
{
    // ── Aux Tips ───────────────────────────────────────────────────
    public function auxTipsIndex(Request $request): JsonResponse
    {
        $q = $request->string('q');
        return response()->json(
            AuxTip::when($q->isNotEmpty(), fn ($query) =>
                $query->where('descripcion', 'ilike', "%{$q}%")
            )->orderByDesc('id')->paginate(20)
        );
    }

    public function auxTipsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion'            => ['required', 'string', 'max:100'],
            'tipo_correspondencia_id'=> ['nullable', 'integer', 'exists:tipos_correspondencia,id'],
            'zona'                   => ['nullable', 'string', 'in:URBANO,RURAL'],
            'activo'                 => ['boolean'],
        ]);
        return response()->json(AuxTip::create($data), 201);
    }

    public function auxTipsUpdate(Request $request, AuxTip $auxTip): JsonResponse
    {
        $data = $request->validate([
            'descripcion'            => ['required', 'string', 'max:100'],
            'tipo_correspondencia_id'=> ['nullable', 'integer', 'exists:tipos_correspondencia,id'],
            'zona'                   => ['nullable', 'string', 'in:URBANO,RURAL'],
            'activo'                 => ['boolean'],
        ]);
        $auxTip->update($data);
        return response()->json($auxTip);
    }

    public function auxTipsToggle(AuxTip $auxTip): JsonResponse
    {
        $auxTip->update(['activo' => ! $auxTip->activo]);
        return response()->json($auxTip);
    }

    // ── Tipos Anexo ────────────────────────────────────────────────
    public function tiposAnexoIndex(Request $request): JsonResponse
    {
        $q = $request->string('q');
        return response()->json(
            TipoAnexo::when($q->isNotEmpty(), fn ($query) =>
                $query->where('descripcion', 'ilike', "%{$q}%")
            )->orderByDesc('id')->paginate(20)
        );
    }

    public function tiposAnexoStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:60'],
        ]);
        return response()->json(TipoAnexo::create($data), 201);
    }

    public function tiposAnexoUpdate(Request $request, TipoAnexo $tipoAnexo): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:60'],
        ]);
        $tipoAnexo->update($data);
        return response()->json($tipoAnexo);
    }

    // ── Medios Ingreso ─────────────────────────────────────────────
    public function mediosIngresoIndex(Request $request): JsonResponse
    {
        $q = $request->string('q');
        return response()->json(
            MedioIngreso::when($q->isNotEmpty(), fn ($query) =>
                $query->where('descripcion', 'ilike', "%{$q}%")
            )->orderByDesc('id')->paginate(20)
        );
    }

    public function mediosIngresoStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:60'],
        ]);
        return response()->json(MedioIngreso::create($data), 201);
    }

    public function mediosIngresoUpdate(Request $request, MedioIngreso $medioIngreso): JsonResponse
    {
        $data = $request->validate([
            'descripcion' => ['required', 'string', 'max:60'],
        ]);
        $medioIngreso->update($data);
        return response()->json($medioIngreso);
    }
}
