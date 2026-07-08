<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Puente local entre 'radicados.tercero_id' (estable) y el registro real en
// el Core ('empresas' o 'ciudadanos', según 'categoria'). No guarda datos de
// negocio (nit, nombres, etc.) — esos viven en el Core.
class Tercero extends Model
{
    protected $fillable = ['codigo', 'categoria', 'core_id'];

    public function contactos(): HasMany
    {
        return $this->hasMany(TerceroContacto::class, 'empresa_id', 'core_id')
            ->where('activo', true);
    }
}
