<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tercero;
use App\Models\TerceroContacto;
use App\Models\TipoIdentificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerceroController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q         = $request->string('q');
        $nroExacto = $request->string('nro_exacto');
        $categoria = $request->string('categoria'); // 'NIT' → EMPRESA | 'PERSONA' → CIUDADANO

        $query = Tercero::with(['tipoIdentificacion', 'contactos'])
            ->activo()
            ->when($categoria->toString() === 'NIT',    fn ($q2) => $q2->where('categoria', 'EMPRESA'))
            ->when($categoria->toString() === 'PERSONA', fn ($q2) => $q2->where('categoria', 'CIUDADANO'))
            ->when($nroExacto->isNotEmpty(), fn ($q2) =>
                $q2->where('nro_identificacion', $nroExacto->toString())
            )
            ->when($nroExacto->isEmpty() && $q->isNotEmpty(), fn ($q2) =>
                $q2->where(function ($q3) use ($q) {
                    $q3->where('nro_identificacion', 'ilike', "%{$q}%")
                       ->orWhere('razon_social', 'ilike', "%{$q}%")
                       ->orWhere('nombres', 'ilike', "%{$q}%")
                       ->orWhere('primer_apellido', 'ilike', "%{$q}%");
                })
            )
            ->orderByRaw("COALESCE(razon_social, nombres)")
            ->limit(50)
            ->get();

        return response()->json($query->map(fn (Tercero $t) => [
            'id'          => $t->id,
            'codigo'      => $t->codigo,
            'categoria'   => $t->categoria,
            'nit'         => $t->nro_identificacion,
            'razon_social'=> $t->nombre_completo,   // display name (razon_social o nombres+apellidos)
            'municipio'   => $t->municipio,
            'email'       => $t->email,
            'contactos'   => $t->contactos->map(fn (TerceroContacto $c) => [
                'id'             => $c->id,
                'nombre_completo'=> $c->nombre_completo,
                'cargo'          => $c->cargo,
                'email'          => $c->email,
            ]),
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tipo_identificacion_id' => ['required', 'exists:tipos_identificacion,id'],
            'nro_identificacion'     => ['required', 'string', 'max:20'],
            // EMPRESA: razon_social requerido; CIUDADANO: nombres requerido
            'razon_social'           => ['nullable', 'string', 'max:150'],
            'nombres'                => ['nullable', 'string', 'max:80'],
            'primer_apellido'        => ['nullable', 'string', 'max:60'],
            'segundo_apellido'       => ['nullable', 'string', 'max:60'],
            'direccion'              => ['nullable', 'string', 'max:120'],
            'municipio'              => ['nullable', 'string', 'max:80'],
            'telefono'               => ['nullable', 'string', 'max:20'],
            'email'                  => ['nullable', 'email', 'max:100'],
            // Contacto inicial para empresas (se guarda en tercero_contactos)
            'nombre_contacto'        => ['nullable', 'string', 'max:80'],
            'apellido_contacto'      => ['nullable', 'string', 'max:60'],
            'cargo_contacto'         => ['nullable', 'string', 'max:100'],
            'email_contacto'         => ['nullable', 'email', 'max:100'],
        ]);

        $tipoId    = TipoIdentificacion::find($data['tipo_identificacion_id']);
        $categoria = strtoupper($tipoId?->codigo ?? '') === 'NIT' ? 'EMPRESA' : 'CIUDADANO';

        $ultimo = Tercero::max('id') ?? 0;
        $codigo = 'TER' . str_pad($ultimo + 1, 6, '0', STR_PAD_LEFT);

        $tercero = Tercero::create([
            'codigo'                => $codigo,
            'categoria'             => $categoria,
            'tipo_identificacion_id'=> $data['tipo_identificacion_id'],
            'nro_identificacion'    => $data['nro_identificacion'],
            'razon_social'          => $categoria === 'EMPRESA' ? ($data['razon_social'] ?? null) : null,
            'nombres'               => $categoria === 'CIUDADANO' ? ($data['nombres'] ?? null) : null,
            'primer_apellido'       => $categoria === 'CIUDADANO' ? ($data['primer_apellido'] ?? null) : null,
            'segundo_apellido'      => $categoria === 'CIUDADANO' ? ($data['segundo_apellido'] ?? null) : null,
            'direccion'             => $data['direccion'] ?? null,
            'municipio'             => $data['municipio'] ?? null,
            'telefono'              => $data['telefono'] ?? null,
            'email'                 => $data['email'] ?? null,
        ]);

        // Crear contacto inicial si se proporcionó (solo para empresas)
        $contactoCreado = null;
        if ($categoria === 'EMPRESA' && !empty($data['nombre_contacto'])) {
            $contactoCreado = TerceroContacto::create([
                'tercero_id'      => $tercero->id,
                'nombres'         => $data['nombre_contacto'],
                'primer_apellido' => $data['apellido_contacto'] ?? null,
                'cargo'           => $data['cargo_contacto'] ?? null,
                'email'           => $data['email_contacto'] ?? null,
            ]);
        }

        return response()->json([
            'id'           => $tercero->id,
            'codigo'       => $tercero->codigo,
            'categoria'    => $tercero->categoria,
            'nro_identificacion' => $tercero->nro_identificacion,
            'razon_social' => $tercero->nombre_completo,
            'municipio'    => $tercero->municipio,
            'email'        => $tercero->email,
            'contacto'     => $contactoCreado ? [
                'id'             => $contactoCreado->id,
                'nombre_completo'=> $contactoCreado->nombre_completo,
                'cargo'          => $contactoCreado->cargo,
            ] : null,
        ], 201);
    }

    // GET /terceros/{tercero}/contactos?q=
    public function contactos(Request $request, Tercero $tercero): JsonResponse
    {
        $q = $request->string('q');

        $contactos = $tercero->contactos()
            ->when($q->isNotEmpty(), fn ($query) =>
                $query->where('nombres', 'ilike', "%{$q}%")
                      ->orWhere('primer_apellido', 'ilike', "%{$q}%")
            )
            ->orderBy('nombres')
            ->get();

        return response()->json($contactos->map(fn (TerceroContacto $c) => [
            'id'             => $c->id,
            'nombre_completo'=> $c->nombre_completo,
            'cargo'          => $c->cargo,
            'email'          => $c->email,
            'telefono'       => $c->telefono,
        ]));
    }

    // POST /terceros/{tercero}/contactos
    public function storeContacto(Request $request, Tercero $tercero): JsonResponse
    {
        $data = $request->validate([
            'nombres'         => ['required', 'string', 'max:80'],
            'primer_apellido' => ['nullable', 'string', 'max:60'],
            'segundo_apellido'=> ['nullable', 'string', 'max:60'],
            'cargo'           => ['nullable', 'string', 'max:100'],
            'email'           => ['nullable', 'email', 'max:100'],
            'telefono'        => ['nullable', 'string', 'max:20'],
        ]);

        $contacto = TerceroContacto::create(array_merge($data, ['tercero_id' => $tercero->id]));

        return response()->json([
            'id'             => $contacto->id,
            'nombre_completo'=> $contacto->nombre_completo,
            'cargo'          => $contacto->cargo,
            'email'          => $contacto->email,
        ], 201);
    }
}
