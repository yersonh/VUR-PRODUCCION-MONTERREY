<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tercero;
use App\Models\TerceroContacto;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TerceroController extends Controller
{
    protected ClienteCore $core;

    public function __construct(ClienteCore $core)
    {
        $this->core = $core;
    }

    public function index(Request $request): JsonResponse
    {
        $q         = $request->string('q')->toString();
        $nroExacto = $request->string('nro_exacto')->toString();
        $categoria = $request->string('categoria')->toString(); // 'NIT' | 'PERSONA' | ''

        $filas = collect();

        if ($categoria !== 'PERSONA') {
            $filas = $filas->merge($this->buscarEmpresas($q, $nroExacto));
        }
        if ($categoria !== 'NIT') {
            $filas = $filas->merge($this->buscarCiudadanos($q, $nroExacto));
        }

        return response()->json($filas->values());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tipo_identificacion_id' => ['required', 'integer'],
            'nro_identificacion'     => ['required', 'string', 'max:20'],
            'razon_social'           => ['nullable', 'string', 'max:150'],
            'nombres'                => ['nullable', 'string', 'max:80'],
            'primer_apellido'        => ['nullable', 'string', 'max:60'],
            'segundo_apellido'       => ['nullable', 'string', 'max:60'],
            'direccion'              => ['nullable', 'string', 'max:120'],
            'municipio'              => ['nullable', 'string', 'max:80'],
            'telefono'               => ['nullable', 'string', 'max:20'],
            'email'                  => ['nullable', 'email', 'max:100'],
            'nombre_contacto'        => ['nullable', 'string', 'max:80'],
            'apellido_contacto'      => ['nullable', 'string', 'max:60'],
            'cargo_contacto'         => ['nullable', 'string', 'max:100'],
            'email_contacto'         => ['nullable', 'email', 'max:100'],
        ]);

        $tipo      = collect($this->core->tiposIdentificacion())->firstWhere('id', $data['tipo_identificacion_id']);
        $categoria = strtoupper($tipo['codigo'] ?? '') === 'NIT' ? 'EMPRESA' : 'CIUDADANO';

        return $categoria === 'EMPRESA'
            ? $this->crearEmpresa($data)
            : $this->crearCiudadano($data);
    }

    // GET /terceros/{tercero}/contactos?q=  (solo aplica a EMPRESA)
    public function contactos(Request $request, Tercero $tercero): JsonResponse
    {
        if ($tercero->categoria !== 'EMPRESA') {
            return response()->json([]);
        }

        $q = $request->string('q');

        $contactos = TerceroContacto::where('empresa_id', $tercero->core_id)
            ->where('activo', true)
            ->when($q->isNotEmpty(), fn ($query) =>
                $query->where('nombres', 'ilike', "%{$q}%")
                      ->orWhere('primer_apellido', 'ilike', "%{$q}%")
            )
            ->orderBy('nombres')
            ->get();

        return response()->json($contactos->map(fn (TerceroContacto $c) => [
            'id'              => $c->id,
            'nombre_completo' => $c->nombre_completo,
            'cargo'           => $c->cargo,
            'email'           => $c->email,
            'telefono'        => $c->telefono,
        ]));
    }

    // POST /terceros/{tercero}/contactos  (solo aplica a EMPRESA)
    public function storeContacto(Request $request, Tercero $tercero): JsonResponse
    {
        $data = $request->validate([
            'nombres'          => ['required', 'string', 'max:80'],
            'primer_apellido'  => ['nullable', 'string', 'max:60'],
            'segundo_apellido' => ['nullable', 'string', 'max:60'],
            'cargo'            => ['nullable', 'string', 'max:100'],
            'email'            => ['nullable', 'email', 'max:100'],
            'telefono'         => ['nullable', 'string', 'max:20'],
        ]);

        $contacto = TerceroContacto::create([
            ...$data,
            'empresa_id' => $tercero->core_id,
        ]);

        return response()->json([
            'id'              => $contacto->id,
            'nombre_completo' => $contacto->nombre_completo,
            'cargo'           => $contacto->cargo,
            'email'           => $contacto->email,
        ], 201);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private function buscarEmpresas(string $q, string $nroExacto): Collection
    {
        if ($nroExacto !== '') {
            $empresa = $this->core->buscarEmpresaPorNit($nroExacto);
            $lista   = $empresa ? [$empresa] : [];
        } else {
            // NOTA: GET /empresas del Core solo documenta el filtro 'nit'. No
            // hay búsqueda por texto, así que se filtra aquí sobre los
            // primeros 50 resultados que trae el Core, no sobre todo el
            // dataset (misma limitación que en /admin/personal).
            $resultado = $this->core->empresas(['page' => 1, 'per_page' => 50]);
            $lista     = $resultado['data'] ?? [];

            if ($q !== '') {
                $lista = collect($lista)->filter(fn (array $e) =>
                    str_contains(mb_strtolower($e['nit'].' '.$e['razon_social']), mb_strtolower($q))
                )->values()->all();
            }
        }

        return collect($lista)->map(fn (array $e) => $this->filaEmpresa($e));
    }

    private function buscarCiudadanos(string $q, string $nroExacto): Collection
    {
        // NOTA: GET /ciudadanos del Core solo filtra por tipo_identificacion_id
        // + numero_identificacion juntos, y VUR no siempre conoce el tipo acá
        // (p.ej. cuando la IA solo detecta un número). Se trae una página y se
        // filtra aquí — misma limitación que en /admin/personal.
        $resultado = $this->core->ciudadanos(['page' => 1, 'per_page' => 50]);
        $lista     = $resultado['data'] ?? [];

        if ($nroExacto !== '') {
            $lista = collect($lista)->filter(fn (array $c) => $c['numero_identificacion'] === $nroExacto)->values()->all();
        } elseif ($q !== '') {
            $lista = collect($lista)->filter(function (array $c) use ($q) {
                $texto = mb_strtolower($c['numero_identificacion'].' '.$c['nombres'].' '.$c['apellidos']);
                return str_contains($texto, mb_strtolower($q));
            })->values()->all();
        }

        return collect($lista)->map(fn (array $c) => $this->filaCiudadano($c));
    }

    private function crearEmpresa(array $data): JsonResponse
    {
        $empresa = $this->core->crearEmpresa([
            'nit'          => $data['nro_identificacion'],
            'razon_social' => $data['razon_social'] ?? '',
            'direccion'    => $data['direccion'] ?? null,
            'municipio'    => $data['municipio'] ?? null,
            'telefono'     => $data['telefono'] ?? null,
            'email'        => $data['email'] ?? null,
        ]);

        $tercero = $this->bridge('EMPRESA', $empresa['id']);

        $contactoCreado = null;
        if (!empty($data['nombre_contacto'])) {
            $contactoCreado = TerceroContacto::create([
                'empresa_id'      => $empresa['id'],
                'nombres'         => $data['nombre_contacto'],
                'primer_apellido' => $data['apellido_contacto'] ?? null,
                'cargo'           => $data['cargo_contacto'] ?? null,
                'email'           => $data['email_contacto'] ?? null,
            ]);
        }

        return response()->json([
            'id'                 => $tercero->id,
            'codigo'             => $tercero->codigo,
            'categoria'          => 'EMPRESA',
            'nro_identificacion' => $empresa['nit'],
            'razon_social'       => $empresa['razon_social'],
            'municipio'          => $empresa['municipio'] ?? null,
            'email'              => $empresa['email'] ?? null,
            'contacto'           => $contactoCreado ? [
                'id'              => $contactoCreado->id,
                'nombre_completo' => $contactoCreado->nombre_completo,
                'cargo'           => $contactoCreado->cargo,
            ] : null,
        ], 201);
    }

    private function crearCiudadano(array $data): JsonResponse
    {
        // NOTA: el Core exige 'apellidos' (requerido). El formulario de VUR
        // permite dejar primer_apellido/segundo_apellido en blanco, así que
        // si ambos vienen vacíos, el Core devolverá un error de validación
        // (no se inventa un valor de relleno).
        $ciudadano = $this->core->crearCiudadano([
            'tipo_identificacion_id' => $data['tipo_identificacion_id'],
            'numero_identificacion'  => $data['nro_identificacion'],
            'nombres'                => $data['nombres'] ?? '',
            'apellidos'              => trim(($data['primer_apellido'] ?? '').' '.($data['segundo_apellido'] ?? '')),
            'telefono'               => $data['telefono'] ?? null,
            'email'                  => $data['email'] ?? null,
            'direccion'              => $data['direccion'] ?? null,
            'municipio'              => $data['municipio'] ?? null,
        ]);

        $tercero = $this->bridge('CIUDADANO', $ciudadano['id']);

        return response()->json([
            'id'                 => $tercero->id,
            'codigo'             => $tercero->codigo,
            'categoria'          => 'CIUDADANO',
            'nro_identificacion' => $ciudadano['numero_identificacion'],
            'razon_social'       => trim(($ciudadano['nombres'] ?? '').' '.($ciudadano['apellidos'] ?? '')),
            'municipio'          => $ciudadano['municipio'] ?? null,
            'email'              => $ciudadano['email'] ?? null,
            'contacto'           => null,
        ], 201);
    }

    private function filaEmpresa(array $empresa): array
    {
        $tercero = $this->bridge('EMPRESA', $empresa['id']);

        return [
            'id'           => $tercero->id,
            'codigo'       => $tercero->codigo,
            'categoria'    => 'EMPRESA',
            'nit'          => $empresa['nit'],
            'razon_social' => $empresa['razon_social'],
            'municipio'    => $empresa['municipio'] ?? null,
            'email'        => $empresa['email'] ?? null,
            'contactos'    => TerceroContacto::where('empresa_id', $empresa['id'])
                ->where('activo', true)
                ->get()
                ->map(fn (TerceroContacto $c) => [
                    'id'              => $c->id,
                    'nombre_completo' => $c->nombre_completo,
                    'cargo'           => $c->cargo,
                    'email'           => $c->email,
                ]),
        ];
    }

    private function filaCiudadano(array $ciudadano): array
    {
        $tercero = $this->bridge('CIUDADANO', $ciudadano['id']);

        return [
            'id'           => $tercero->id,
            'codigo'       => $tercero->codigo,
            'categoria'    => 'CIUDADANO',
            'nit'          => $ciudadano['numero_identificacion'],
            'razon_social' => trim(($ciudadano['nombres'] ?? '').' '.($ciudadano['apellidos'] ?? '')),
            'municipio'    => $ciudadano['municipio'] ?? null,
            'email'        => $ciudadano['email'] ?? null,
            'contactos'    => [],
        ];
    }

    // Encuentra o crea la fila puente local {categoria, core_id} → id estable
    // que 'radicados.tercero_id' puede referenciar.
    private function bridge(string $categoria, int $coreId): Tercero
    {
        return Tercero::firstOrCreate(
            ['categoria' => $categoria, 'core_id' => $coreId],
            ['codigo' => 'TER'.str_pad((string) ((Tercero::max('id') ?? 0) + 1), 6, '0', STR_PAD_LEFT)]
        );
    }
}
