<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Personal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonalAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->string('q');

        $data = Personal::with('dependencia')
            ->when($q->isNotEmpty(), fn ($query) =>
                $query->where(function ($q2) use ($q) {
                    $q2->where('nombres', 'ilike', "%{$q}%")
                       ->orWhere('apellidos', 'ilike', "%{$q}%")
                       ->orWhere('cedula', 'ilike', "%{$q}%")
                       ->orWhereRaw("(nombres || ' ' || apellidos) ilike ?", ["%{$q}%"]);
                })
            )
            ->when($request->filled('dependencia_id'), fn ($query) =>
                $query->where('dependencia_id', $request->integer('dependencia_id'))
            )
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($data);
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
            'activo'         => ['boolean'],
        ], [
            'cedula.regex' => 'La cédula debe tener solo dígitos (6-10 caracteres).',
        ]);

        $ultimo  = Personal::max('id') ?? 0;
        $data['codigo'] = 'PER' . str_pad($ultimo + 1, 6, '0', STR_PAD_LEFT);

        $personal = Personal::create($data);
        return response()->json($personal->load('dependencia'), 201);
    }

    public function update(Request $request, Personal $personal): JsonResponse
    {
        $data = $request->validate([
            'cedula'         => ['required', 'string', 'regex:/^\d{6,10}$/', "unique:personal,cedula,{$personal->id}"],
            'nombres'        => ['required', 'string', 'min:2', 'max:80'],
            'apellidos'      => ['required', 'string', 'min:2', 'max:80'],
            'cargo'          => ['nullable', 'string', 'max:100'],
            'email'          => ['nullable', 'email', 'max:100'],
            'telefono'       => ['nullable', 'string', 'max:20'],
            'dependencia_id' => ['required', 'exists:dependencias,id'],
            'activo'         => ['boolean'],
        ], [
            'cedula.regex' => 'La cédula debe tener solo dígitos (6-10 caracteres).',
        ]);

        $personal->update($data);
        return response()->json($personal->fresh('dependencia'));
    }

    public function toggleActivo(Personal $personal): JsonResponse
    {
        $personal->update(['activo' => ! $personal->activo]);
        return response()->json($personal->fresh('dependencia'));
    }
}
