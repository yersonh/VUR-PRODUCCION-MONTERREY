<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dependencia extends Model
{
    protected $fillable = ['descripcion', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function personal(): HasMany
    {
        return $this->hasMany(Personal::class);
    }

    public function radicadosDestino(): HasMany
    {
        return $this->hasMany(Radicado::class, 'dependencia_destino_id');
    }

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
