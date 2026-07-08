<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private ClienteCore $core) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->activo) {
            Auth::logout();
            return response()->json(['message' => 'Usuario inactivo. Contacte al administrador.'], 403);
        }

        // Revocar tokens anteriores del mismo dispositivo
        $user->tokens()->where('name', 'web')->delete();

        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'user'    => $this->formatUser($user),
            'token'   => $token,
            'message' => 'Sesión iniciada correctamente',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('role');

        return response()->json(['user' => $this->formatUser($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

    private function formatUser(User $user): array
    {
        return [
            'id'              => $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'role'            => $user->role ? [
                'id'          => $user->role->id,
                'nombre'      => $user->role->nombre,
                'descripcion' => $user->role->descripcion,
            ] : null,
            'dependencia'     => $this->dependenciaInfo($user->dependencia_id),
        ];
    }

    private function dependenciaInfo(?int $id): ?array
    {
        if (!$id) {
            return null;
        }

        $dependencia = collect($this->core->dependencias())->firstWhere('id', $id);
        if (!$dependencia) {
            return null;
        }

        return [
            'id'          => $dependencia['id'],
            'descripcion' => $dependencia['nombre'],
        ];
    }
}
