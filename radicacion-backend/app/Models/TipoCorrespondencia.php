<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoCorrespondencia extends Model
{
    protected $table = 'tipos_correspondencia';

    protected $fillable = ['descripcion', 'max_dias', 'activo', 'dependencia_destino_id'];

    protected $casts = [
        'activo'                 => 'boolean',
        'max_dias'               => 'integer',
        'dependencia_destino_id' => 'integer',
    ];

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
