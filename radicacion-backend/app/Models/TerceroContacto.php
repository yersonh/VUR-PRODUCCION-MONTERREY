<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Contacto/responsable de una empresa para efectos de correspondencia.
// Es dato exclusivo de VUR: el Core no tiene este concepto. 'empresa_id'
// referencia directamente el id de la empresa en el Core (sin FK local).
class TerceroContacto extends Model
{
    protected $fillable = [
        'empresa_id', 'nombres', 'primer_apellido', 'segundo_apellido',
        'cargo', 'email', 'telefono', 'activo',
    ];

    protected $casts = ['activo' => 'boolean'];

    public function getNombreCompletoAttribute(): string
    {
        return trim("{$this->nombres} {$this->primer_apellido} {$this->segundo_apellido}");
    }
}
