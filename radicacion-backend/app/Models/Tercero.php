<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tercero extends Model
{
    protected $fillable = [
        'codigo', 'categoria', 'tipo_identificacion_id', 'nro_identificacion',
        'razon_social', 'nombres', 'primer_apellido', 'segundo_apellido',
        'direccion', 'municipio', 'telefono', 'email',
        'dependencia_id', 'activo',
    ];

    protected $casts = ['activo' => 'boolean'];

    public function tipoIdentificacion(): BelongsTo
    {
        return $this->belongsTo(TipoIdentificacion::class);
    }

    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    public function contactos(): HasMany
    {
        return $this->hasMany(TerceroContacto::class)->where('activo', true);
    }

    /**
     * Nombre para mostrar: razon_social para EMPRESA, nombres+apellidos para CIUDADANO.
     */
    public function getNombreCompletoAttribute(): string
    {
        if ($this->categoria === 'EMPRESA') {
            return $this->attributes['razon_social'] ?? '';
        }
        return trim("{$this->nombres} {$this->primer_apellido} {$this->segundo_apellido}");
    }

    public function scopeActivo($query): void
    {
        $query->where('activo', true);
    }
}
