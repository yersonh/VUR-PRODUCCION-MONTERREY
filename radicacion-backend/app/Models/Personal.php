<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Personal extends Model
{
    protected $table = 'personal';

    protected $fillable = [
        'codigo', 'cedula', 'nombres', 'apellidos',
        'cargo', 'email', 'telefono', 'dependencia_id', 'activo',
    ];

    protected $casts = ['activo' => 'boolean'];

    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    public function getNombreCompletoAttribute(): string
    {
        return trim("{$this->nombres} {$this->apellidos}");
    }

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
