<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ClienteCore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
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

    public function cambiarPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password_actual' => ['required', 'string'],
            'password_nueva'  => [
                'required', 'string', 'confirmed', 'different:password_actual',
                Password::min(8)->mixedCase()->numbers(),
            ],
        ], [
            'password_nueva.different' => 'La nueva contraseña debe ser diferente a la actual.',
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($data['password_actual'], $user->password)) {
            throw ValidationException::withMessages([
                'password_actual' => ['La contraseña actual no es correcta.'],
            ]);
        }

        $user->update([
            'password'               => Hash::make($data['password_nueva']),
            'debe_cambiar_password'  => false,
            'email_verified_at'      => now(),
        ]);

        return response()->json(['user' => $this->formatUser($user->load('role'))]);
    }

    public function subirFoto(Request $request): JsonResponse
    {
        $request->validate([
            'foto' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $this->eliminarArchivoFoto($user);

        $extension = $request->file('foto')->extension();
        $ruta = $request->file('foto')->storeAs(
            'fotos_perfil',
            "{$user->id}_" . time() . ".{$extension}",
            'local',
        );

        $user->foto_path = $ruta;
        $user->save();

        return response()->json(['user' => $this->formatUser($user->load('role'))]);
    }

    public function eliminarFoto(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->eliminarArchivoFoto($user);
        $user->foto_path = null;
        $user->save();

        return response()->json(['user' => $this->formatUser($user->load('role'))]);
    }

    public function foto(Request $request): Response|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (!$user->foto_path || !Storage::disk('local')->exists($user->foto_path)) {
            return response()->json(['message' => 'No hay foto de perfil'], 404);
        }

        return response(Storage::disk('local')->get($user->foto_path))
            ->header('Content-Type', Storage::disk('local')->mimeType($user->foto_path));
    }

    private function eliminarArchivoFoto(User $user): void
    {
        if ($user->foto_path && Storage::disk('local')->exists($user->foto_path)) {
            Storage::disk('local')->delete($user->foto_path);
        }
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
            'cargo'           => $this->cargoFuncionario($user->funcionario_id),
            'tiene_foto'      => (bool) $user->foto_path && Storage::disk('local')->exists($user->foto_path),
            'debe_cambiar_password' => $user->debe_cambiar_password,
        ];
    }

    private function cargoFuncionario(?int $funcionarioId): ?string
    {
        if (!$funcionarioId) {
            return null;
        }

        try {
            $funcionario = $this->core->funcionario($funcionarioId);
        } catch (\Throwable $e) {
            return null;
        }

        return $funcionario['cargo'] ?? null;
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
