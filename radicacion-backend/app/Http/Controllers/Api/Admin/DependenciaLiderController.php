<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DependenciaLider;
use App\Services\ClienteCore;
use App\Services\RadicadoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DependenciaLiderController extends Controller
{
    public function __construct(
        private ClienteCore $core,
        private RadicadoService $service,
    ) {}

    // ── PUT /admin/dependencias/{dependencia}/lider ────────────────
    public function asignar(Request $request, int $dependencia): JsonResponse
    {
        $data = $request->validate([
            'funcionario_id' => ['required', 'integer'],
            'forzar'         => ['boolean'],
        ]);

        $funcionario = $this->core->funcionario($data['funcionario_id']);

        if ((int) ($funcionario['dependencia_id'] ?? 0) !== $dependencia) {
            return response()->json([
                'message' => 'El funcionario seleccionado no pertenece a esta dependencia.',
            ], 422);
        }

        $existente = DependenciaLider::where('dependencia_id', $dependencia)->first();

        if ($existente && $existente->funcionario_id !== $data['funcionario_id'] && !($data['forzar'] ?? false)) {
            return response()->json([
                'message'      => 'Esta dependencia ya tiene un líder asignado.',
                'lider_actual' => $this->service->funcionarioInfo($existente->funcionario_id),
            ], 409);
        }

        DependenciaLider::updateOrCreate(
            ['dependencia_id' => $dependencia],
            ['funcionario_id' => $data['funcionario_id']],
        );

        return response()->json([
            'dependencia_id' => $dependencia,
            'lider'          => $this->service->funcionarioInfo($data['funcionario_id']),
        ]);
    }

    // ── DELETE /admin/dependencias/{dependencia}/lider ──────────────
    public function quitar(int $dependencia): JsonResponse
    {
        DependenciaLider::where('dependencia_id', $dependencia)->delete();

        return response()->json(['dependencia_id' => $dependencia, 'lider' => null]);
    }
}
