<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonalController extends Controller
{
    // ASUNCIÓN: igual que en PersonalAdminController, el campo "cédula" de
    // VUR se asume Cédula de Ciudadanía (id=1 en tipos-identificacion del Core).
    private const TIPO_IDENTIFICACION_CEDULA_CIUDADANIA = 1;

    protected ClienteCore $core;

    public function __construct(ClienteCore $core)
    {
        $this->core = $core;
    }

    public function index(Request $request): JsonResponse
    {
        $q           = $request->string('q')->toString();
        $dependencia = $request->integer('dependencia_id');

        // NOTA: GET /funcionarios del Core solo documenta el filtro
        // 'persona_id'. No hay búsqueda por texto ni filtro por dependencia_id
        // soportados por el Core, así que se piden 50 (el límite que ya usaba
        // este endpoint) y se filtra aquí sobre esa página — no sobre todo
        // el dataset. Es la misma limitación que en /admin/personal.
        $resultado = $this->core->funcionarios(['page' => 1, 'per_page' => 50]);

        $rows = collect($resultado['data'] ?? [])->map(fn (array $f) => $this->aFila($f));

        if ($q !== '') {
            $rows = $rows->filter(function (array $f) use ($q) {
                $texto = mb_strtolower($f['cedula'].' '.$f['nombre_completo']);
                return str_contains($texto, mb_strtolower($q));
            })->values();
        }

        if ($dependencia > 0) {
            $rows = $rows->filter(fn (array $f) => $f['dependencia_id'] === $dependencia)->values();
        }

        return response()->json($rows->sortBy('nombre_completo')->values());
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

        $funcionario['persona'] ??= $datosPersona;

        return response()->json($this->aFila($funcionario), 201);
    }

    private function aFila(array $funcionario): array
    {
        $persona = $funcionario['persona'] ?? [];

        return [
            'id'              => $funcionario['id'],
            'cedula'          => $persona['numero_identificacion'] ?? '',
            'nombre_completo' => trim(($persona['nombres'] ?? '').' '.($persona['apellidos'] ?? '')),
            'cargo'           => $funcionario['cargo'] ?? null,
            'dependencia_id'  => $funcionario['dependencia_id'],
            'email'           => $persona['email'] ?? null,
        ];
    }
}
