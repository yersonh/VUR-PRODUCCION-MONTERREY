<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password',
        'role_id', 'dependencia_id', 'activo', 'foto_path',
        'funcionario_id', 'debe_cambiar_password',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at'      => 'datetime',
            'password'               => 'hashed',
            'activo'                 => 'boolean',
            'debe_cambiar_password'  => 'boolean',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    // 'dependencia_id' y 'funcionario_id' ya no son relaciones Eloquent:
    // apuntan a recursos del Core (sin FK local). Se resuelven vía
    // ClienteCore donde se necesiten mostrar (ver AuthController/
    // UserAdminController).

    public function isAdmin(): bool
    {
        return $this->role?->nombre === 'ADMIN';
    }

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
