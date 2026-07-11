<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CiudadanoAdminController extends Controller
{
    protected ClienteCore $core;

    public function __construct(ClienteCore $core)
    {
        $this->core = $core;
    }

    public function index(Request $request): JsonResponse
    {
        $resultado = $this->core->ciudadanos([
            'page'     => $request->integer('page', 1),
            'per_page' => $request->integer('per_page', 20),
        ]);

        $data = collect($resultado['data'] ?? [])->map(fn (array $c) => $this->aFila($c));

        // NOTA: igual que en PersonalAdminController — el Core no soporta
        // búsqueda de texto en /ciudadanos, solo filtra por
        // tipo_identificacion_id + numero_identificacion juntos. El filtro
        // 'q' aquí solo aplica sobre la página ya traída, no el dataset
        // completo.
        $q = $request->string('q')->toString();
        if ($q !== '') {
            $data = $data->filter(function (array $c) use ($q) {
                $texto = mb_strtolower($c['nombres'].' '.$c['apellidos'].' '.$c['numero_identificacion']);
                return str_contains($texto, mb_strtolower($q));
            })->values();
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
        $ciudadano = $this->core->crearCiudadano($this->validado($request));

        return response()->json($this->aFila($ciudadano), 201);
    }

    // El Core sí expone PUT /ciudadanos/{id} (agregado 2026-07-11) — a
    // diferencia de /empresas, que todavía no lo tiene.
    public function update(Request $request, int $ciudadano): JsonResponse
    {
        $actualizado = $this->core->actualizarCiudadano($ciudadano, $this->validado($request));

        return response()->json($this->aFila($actualizado));
    }

    private function validado(Request $request): array
    {
        return $request->validate([
            'tipo_identificacion_id' => ['required', 'integer'],
            'numero_identificacion'  => ['required', 'string', 'max:20'],
            'nombres'                => ['required', 'string', 'max:100'],
            'apellidos'              => ['required', 'string', 'max:100'],
            'telefono'               => ['nullable', 'string', 'max:20'],
            'email'                  => ['nullable', 'email', 'max:150'],
            'direccion'              => ['nullable', 'string', 'max:250'],
            'municipio'              => ['nullable', 'string', 'max:150'],
        ]);
    }

    private function aFila(array $c): array
    {
        $tipo = !empty($c['tipo_identificacion_id'])
            ? $this->core->tipoIdentificacion($c['tipo_identificacion_id'])
            : null;

        return [
            'id'                     => $c['id'],
            'codigo'                 => 'CIU'.str_pad((string) $c['id'], 6, '0', STR_PAD_LEFT),
            'tipo_identificacion_id' => $c['tipo_identificacion_id'] ?? null,
            'tipo_identificacion'    => $tipo,
            'numero_identificacion'  => $c['numero_identificacion'] ?? '',
            'nombres'                => $c['nombres'] ?? '',
            'apellidos'              => $c['apellidos'] ?? '',
            'telefono'               => $c['telefono'] ?? null,
            'email'                  => $c['email'] ?? null,
            'direccion'              => $c['direccion'] ?? null,
            'municipio'              => $c['municipio'] ?? null,
            'activo'                 => $c['activo'] ?? true,
        ];
    }
}
