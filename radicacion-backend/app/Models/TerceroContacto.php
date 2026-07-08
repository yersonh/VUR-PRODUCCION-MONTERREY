<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TerceroContacto extends Model
{
    protected $fillable = [
        'tercero_id', 'nombres', 'primer_apellido', 'segundo_apellido',
        'cargo', 'email', 'telefono', 'activo',
    ];

    protected $casts = ['activo' => 'boolean'];

    public function tercero(): BelongsTo
    {
        return $this->belongsTo(Tercero::class);
    }

    public function getNombreCompletoAttribute(): string
    {
        return trim("{$this->nombres} {$this->primer_apellido} {$this->segundo_apellido}");
    }
}
