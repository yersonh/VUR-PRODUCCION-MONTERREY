<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Personal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q           = $request->string('q');
        $dependencia = $request->integer('dependencia_id');

        $rows = Personal::with('dependencia')
            ->activo()
            ->when($q->isNotEmpty(), fn ($query) =>
                $query->where(function ($q2) use ($q) {
                    $q2->where('cedula', 'ilike', "%{$q}%")
                       ->orWhere('nombres', 'ilike', "%{$q}%")
                       ->orWhere('apellidos', 'ilike', "%{$q}%")
                       // Búsqueda por nombre completo concatenado (para cuando la IA envía el nombre completo)
                       ->orWhereRaw("(nombres || ' ' || apellidos) ilike ?", ["%{$q}%"]);
                })
            )
            ->when($dependencia > 0, fn ($query) =>
                $query->where('dependencia_id', $dependencia)
            )
            ->orderBy('apellidos')
            ->limit(50)
            ->get();

        return response()->json($rows->map(fn (Personal $p) => [
            'id'              => $p->id,
            'cedula'          => $p->cedula,
            'nombre_completo' => $p->nombre_completo,
            'cargo'           => $p->cargo,
            'dependencia_id'  => $p->dependencia_id,
            'email'           => $p->email,
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cedula'         => ['required', 'string', 'regex:/^\d{6,10}$/', 'unique:personal,cedula'],
            'nombres'        => ['required', 'string', 'min:2', 'max:80'],
            'apellidos'      => ['required', 'string', 'min:2', 'max:80'],
            'cargo'          => ['nullable', 'string', 'max:100'],
            'email'          => ['nullable', 'email', 'max:100'],
            'telefono'       => ['nullable', 'string', 'max:20'],
            'dependencia_id' => ['required', 'exists:dependencias,id'],
        ], [
            'cedula.regex' => 'La cédula debe tener solo dígitos (6-10 caracteres).',
        ]);

        $ultimo         = Personal::max('id') ?? 0;
        $data['codigo'] = 'PER' . str_pad($ultimo + 1, 6, '0', STR_PAD_LEFT);
        $data['activo'] = true;

        $personal = Personal::create($data);
        return response()->json($personal->load('dependencia'), 201);
    }
}
