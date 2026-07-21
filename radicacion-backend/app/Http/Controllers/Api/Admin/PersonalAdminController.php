<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DependenciaLider;
use App\Models\User;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonalAdminController extends Controller
{
    // ASUNCIÓN: el campo "cédula" del formulario de Personal en VUR siempre
    // corresponde a Cédula de Ciudadanía (id=1 en tipos-identificacion del
    // Core). El formulario actual no captura tipo_identificacion_id.
    private const TIPO_IDENTIFICACION_CEDULA_CIUDADANIA = 1;

    protected ClienteCore $core;

    public function __construct(ClienteCore $core)
    {
        $this->core = $core;
    }

    public function index(Request $request): JsonResponse
    {
        $resultado = $this->core->funcionarios([
            'page'     => $request->integer('page', 1),
            'per_page' => $request->integer('per_page', 20),
        ]);

        $idsPagina = collect($resultado['data'] ?? [])->pluck('id')->all();
        $idsConUsuario = User::whereIn('funcionario_id', $idsPagina)->pluck('funcionario_id')->all();
        $idsLideres = DependenciaLider::whereIn('funcionario_id', $idsPagina)->pluck('funcionario_id')->all();

        $data = collect($resultado['data'] ?? [])->map(fn (array $f) => $this->aFila(
            $f,
            in_array($f['id'], $idsConUsuario),
            in_array($f['id'], $idsLideres),
        ));

        // NOTA: GET /funcionarios del Core solo documenta el filtro 'persona_id'.
        // No hay búsqueda por texto (q) ni filtro por dependencia_id soportados
        // por el Core, así que se aplican aquí solo sobre la página ya traída
        // (no sobre el dataset completo). Es una limitación real hasta que el
        // Core exponga esos filtros del lado del servidor.
        $q = $request->string('q')->toString();
        if ($q !== '') {
            $data = $data->filter(function (array $f) use ($q) {
                $texto = mb_strtolower($f['nombres'].' '.$f['apellidos'].' '.$f['cedula']);
                return str_contains($texto, mb_strtolower($q));
            })->values();
        }

        if ($request->filled('dependencia_id')) {
            $depId = $request->integer('dependencia_id');
            $data = $data->filter(fn (array $f) => $f['dependencia_id'] === $depId)->values();
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
            'cedula'         => ['required', 'string', 'regex:/^\d{6,10}$/'],
            'nombres'        => ['required', 'string', 'min:2', 'max:80'],
            'apellidos'      => ['required', 'string', 'min:2', 'max:80'],
            'cargo'          => ['nullable', 'string', 'max:100'],
            'email'          => ['nullable', 'email', 'max:100'],
            'telefono'       => ['nullable', 'string', 'max:20'],
            'dependencia_id' => ['required', 'integer'],
        ], [
            'cedula.regex' => 'La cédula debe tener solo dígitos (6-10 caracteres).',
        ]);

        $datosPersona = [
            'tipo_identificacion_id' => self::TIPO_IDENTIFICACION_CEDULA_CIUDADANIA,
            'numero_identificacion'  => $data['cedula'],
            'nombres'                => $data['nombres'],
            'apellidos'              => $data['apellidos'],
            'email'                  => $data['email'] ?? null,
            'telefono'               => $data['telefono'] ?? null,
        ];

        $funcionario = $this->core->crearFuncionarioConPersona($datosPersona, [
            'dependencia_id' => $data['dependencia_id'],
            'cargo'          => $data['cargo'] ?? '',
        ]);

        $funcionario['persona']     ??= $datosPersona;
        $funcionario['dependencia'] ??= collect($this->core->dependencias())->firstWhere('id', $data['dependencia_id']);

        return response()->json($this->aFila($funcionario, false, $this->esLiderDeSuDependencia($funcionario)), 201);
    }

    public function update(Request $request, int $personal): JsonResponse
    {
        $data = $request->validate([
            'cedula'         => ['required', 'string', 'regex:/^\d{6,10}$/'],
            'nombres'        => ['required', 'string', 'min:2', 'max:80'],
            'apellidos'      => ['required', 'string', 'min:2', 'max:80'],
            'cargo'          => ['nullable', 'string', 'max:100'],
            'email'          => ['nullable', 'email', 'max:100'],
            'telefono'       => ['nullable', 'string', 'max:20'],
            'dependencia_id' => ['required', 'integer'],
        ], [
            'cedula.regex' => 'La cédula debe tener solo dígitos (6-10 caracteres).',
        ]);

        $actual    = $this->core->funcionario($personal);
        $personaId = $actual['persona_id'];

        $this->core->actualizarPersona($personaId, [
            'tipo_identificacion_id' => self::TIPO_IDENTIFICACION_CEDULA_CIUDADANIA,
            'numero_identificacion'  => $data['cedula'],
            'nombres'                => $data['nombres'],
            'apellidos'              => $data['apellidos'],
            'email'                  => $data['email'] ?? null,
            'telefono'               => $data['telefono'] ?? null,
        ]);

        $funcionario = $this->core->actualizarFuncionario($personal, [
            'dependencia_id' => $data['dependencia_id'],
            'cargo'          => $data['cargo'] ?? '',
        ]);

        $funcionario['persona']     = $this->core->persona($personaId);
        $funcionario['dependencia'] = collect($this->core->dependencias())->firstWhere('id', $data['dependencia_id']);

        $idsConUsuario = User::where('funcionario_id', $personal)->exists();

        return response()->json($this->aFila($funcionario, $idsConUsuario, $this->esLiderDeSuDependencia($funcionario)));
    }

    private function esLiderDeSuDependencia(array $funcionario): bool
    {
        return DependenciaLider::where('dependencia_id', $funcionario['dependencia_id'])
            ->where('funcionario_id', $funcionario['id'])
            ->exists();
    }

    public function toggleActivo(int $personal): JsonResponse
    {
        // El Core NO documenta un endpoint para desactivar/activar funcionarios
        // ("no tiene endpoint de destroy/desactivar directo"). No se inventa
        // ese contrato: se responde explícitamente que no está soportado.
        return response()->json([
            'message' => 'Activar/desactivar funcionarios no está soportado: el Core no expone un endpoint para esto.',
        ], 501);
    }

    private function aFila(array $funcionario, bool $tieneUsuario = false, bool $esLider = false): array
    {
        $persona     = $funcionario['persona'] ?? [];
        $dependencia = $funcionario['dependencia'] ?? null;

        return [
            'id'             => $funcionario['id'],
            'codigo'         => 'PER'.str_pad((string) $funcionario['id'], 6, '0', STR_PAD_LEFT),
            'cedula'         => $persona['numero_identificacion'] ?? '',
            'nombres'        => $persona['nombres'] ?? '',
            'apellidos'      => $persona['apellidos'] ?? '',
            'cargo'          => $funcionario['cargo'] ?? null,
            'email'          => $persona['email'] ?? null,
            'telefono'       => $persona['telefono'] ?? null,
            'dependencia_id' => $funcionario['dependencia_id'],
            'dependencia'    => $dependencia ? [
                'id'          => $dependencia['id'],
                'descripcion' => $dependencia['nombre'],
                'activo'      => $dependencia['activo'] ?? true,
            ] : null,
            'es_lider'       => $esLider,
            'activo'         => $funcionario['activo'] ?? true,
            'tiene_usuario'  => $tieneUsuario,
        ];
    }
}
