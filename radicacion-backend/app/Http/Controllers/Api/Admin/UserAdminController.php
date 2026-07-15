<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\BrevoMailService;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserAdminController extends Controller
{
    public function __construct(
        private ClienteCore $core,
        private BrevoMailService $mailer,
    ) {}

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
            'role_id'        => ['required', 'exists:roles,id'],
            'dependencia_id' => ['nullable', 'integer', Rule::in($this->idsDependenciasCore())],
            'funcionario_id' => ['nullable', 'integer', 'unique:users,funcionario_id'],
            'activo'         => ['boolean'],
        ]);

        if (! empty($data['funcionario_id'])) {
            $this->validarFuncionarioExiste($data['funcionario_id']);
        }

        $password = Str::password(12);
        $data['password']               = Hash::make($password);
        $data['debe_cambiar_password']  = true;
        $data['email_verified_at']      = null;

        $user = User::create($data);
        $this->mailer->enviarCredencialesUsuario($user->email, $user->name, $password);

        return response()->json($this->aFila($user->load('role')), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', "unique:users,email,{$user->id}"],
            'role_id'        => ['required', 'exists:roles,id'],
            'dependencia_id' => ['nullable', 'integer', Rule::in($this->idsDependenciasCore())],
            'funcionario_id' => ['nullable', 'integer', "unique:users,funcionario_id,{$user->id}"],
            'activo'         => ['boolean'],
        ]);

        if (! empty($data['funcionario_id']) && $data['funcionario_id'] !== $user->funcionario_id) {
            $this->validarFuncionarioExiste($data['funcionario_id']);
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

    public function resetPassword(User $user): JsonResponse
    {
        $password = Str::password(12);
        $user->update([
            'password'              => Hash::make($password),
            'debe_cambiar_password' => true,
            'email_verified_at'     => null,
        ]);

        $this->mailer->enviarCredencialesUsuario($user->email, $user->name, $password);

        return response()->json($this->aFila($user->fresh('role')));
    }

    private function validarFuncionarioExiste(int $funcionarioId): void
    {
        try {
            $this->core->funcionario($funcionarioId);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'funcionario_id' => 'El funcionario indicado no existe en el Core.',
            ]);
        }
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
            'id'                     => $user->id,
            'name'                   => $user->name,
            'email'                  => $user->email,
            'role_id'                => $user->role_id,
            'role'                   => $user->role,
            'dependencia_id'         => $user->dependencia_id,
            'dependencia'            => $dependencia ? [
                'id'          => $dependencia['id'],
                'descripcion' => $dependencia['nombre'],
            ] : null,
            'funcionario_id'         => $user->funcionario_id,
            'funcionario_nombre'     => $this->nombreFuncionario($user->funcionario_id),
            'debe_cambiar_password'  => $user->debe_cambiar_password,
            'activo'                 => $user->activo,
        ];
    }

    private function nombreFuncionario(?int $funcionarioId): ?string
    {
        if (!$funcionarioId) {
            return null;
        }

        try {
            $funcionario = $this->core->funcionario($funcionarioId);
        } catch (\Throwable $e) {
            return null;
        }

        $persona = $funcionario['persona'] ?? [];
        $nombre  = trim(($persona['nombres'] ?? '').' '.($persona['apellidos'] ?? ''));
        $cargo   = $funcionario['cargo'] ?? null;

        return $nombre !== '' ? ($cargo ? "{$nombre} — {$cargo}" : $nombre) : null;
    }
}
