<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserAdminController extends Controller
{
    public function __construct(private ClienteCore $core) {}

    public function index(Request $request): JsonResponse
    {
        $q = $request->string('q');

        $paginado = User::with('role')
            ->when($q->isNotEmpty(), fn ($query) =>
                $query->where('name', 'ilike', "%{$q}%")
                      ->orWhere('email', 'ilike', "%{$q}%")
            )
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        $paginado->getCollection()->transform(fn (User $u) => $this->aFila($u));

        return response()->json($paginado);
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
            'dependencia_id' => ['nullable', 'integer', Rule::in($this->idsDependenciasCore())],
            'activo'         => ['boolean'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);

        return response()->json($this->aFila($user->load('role')), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', "unique:users,email,{$user->id}"],
            'password'       => ['nullable', 'string', 'min:8'],
            'role_id'        => ['required', 'exists:roles,id'],
            'dependencia_id' => ['nullable', 'integer', Rule::in($this->idsDependenciasCore())],
            'activo'         => ['boolean'],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);
        return response()->json($this->aFila($user->fresh('role')));
    }

    public function toggleActivo(User $user): JsonResponse
    {
        // No se puede desactivar el propio usuario
        if ($user->id === request()->user()->id) {
            return response()->json(['message' => 'No puedes desactivar tu propio usuario.'], 422);
        }

        $user->update(['activo' => ! $user->activo]);
        return response()->json($this->aFila($user->fresh('role')));
    }

    private function idsDependenciasCore(): array
    {
        return collect($this->core->dependencias())->pluck('id')->all();
    }

    private function aFila(User $user): array
    {
        $dependencia = $user->dependencia_id
            ? collect($this->core->dependencias())->firstWhere('id', $user->dependencia_id)
            : null;

        return [
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'role_id'        => $user->role_id,
            'role'           => $user->role,
            'dependencia_id' => $user->dependencia_id,
            'dependencia'    => $dependencia ? [
                'id'          => $dependencia['id'],
                'descripcion' => $dependencia['nombre'],
            ] : null,
            'activo'         => $user->activo,
        ];
    }
}
