<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

// Usuario "de sistema" usado como operador_id de los radicados que llegan
// del intake público de CDR (POST /solicitudes-carta-residencia). Nunca
// inicia sesión — solo existe para satisfacer el FK NOT NULL
// radicados.operador_id. Contraseña aleatoria descartada de inmediato.
return new class extends Migration
{
    public function up(): void
    {
        $operRole = Role::where('nombre', 'OPERADOR')->first();

        User::firstOrCreate(
            ['email' => config('services.cdr.operador_email', 'sistema.cdr@monterrey.gov.co')],
            [
                'name'                  => 'Sistema CDR (integración automática)',
                'password'              => Hash::make(Str::random(40)),
                'role_id'               => $operRole?->id,
                'activo'                => true,
                'debe_cambiar_password' => false,
            ]
        );
    }

    public function down(): void
    {
        User::where('email', config('services.cdr.operador_email', 'sistema.cdr@monterrey.gov.co'))->delete();
    }
};
