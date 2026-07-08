<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuxTip extends Model
{
    protected $fillable = ['tipo_correspondencia_id', 'descripcion', 'zona', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }

    public function tipoCorrespondencia(): BelongsTo
    {
        return $this->belongsTo(TipoCorrespondencia::class);
    }
}
