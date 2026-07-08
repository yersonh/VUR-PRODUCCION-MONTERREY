<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->string('q');

        $data = User::with('role', 'dependencia')
            ->when($q->isNotEmpty(), fn ($query) =>
                $query->where('name', 'ilike', "%{$q}%")
                      ->orWhere('email', 'ilike', "%{$q}%")
            )
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($data);
    }

    public function roles(): JsonResponse
    {
        return response()->json(Role::orderBy('nombre')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'unique:users,email'],
            'password'       => ['required', 'string', 'min:8'],
            'role_id'        => ['required', 'exists:roles,id'],
            'dependencia_id' => ['nullable', 'exists:dependencias,id'],
            'activo'         => ['boolean'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);

        return response()->json($user->load('role', 'dependencia'), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', "unique:users,email,{$user->id}"],
            'password'       => ['nullable', 'string', 'min:8'],
            'role_id'        => ['required', 'exists:roles,id'],
            'dependencia_id' => ['nullable', 'exists:dependencias,id'],
            'activo'         => ['boolean'],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);
        return response()->json($user->fresh(['role', 'dependencia']));
    }

    public function toggleActivo(User $user): JsonResponse
    {
        // No se puede desactivar el propio usuario
        if ($user->id === request()->user()->id) {
            return response()->json(['message' => 'No puedes desactivar tu propio usuario.'], 422);
        }

        $user->update(['activo' => ! $user->activo]);
        return response()->json($user->fresh(['role', 'dependencia']));
    }
}
