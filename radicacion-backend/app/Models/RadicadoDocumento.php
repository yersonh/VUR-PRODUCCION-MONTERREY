<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RadicadoDocumento extends Model
{
    protected $fillable = [
        'radicado_id', 'tipo', 'nombre_original',
        'ruta_almacenamiento', 'tamanio_bytes', 'mime_type', 'subido_por',
    ];

    protected $casts = ['tamanio_bytes' => 'integer'];

    public function radicado(): BelongsTo
    {
        return $this->belongsTo(Radicado::class);
    }

    public function subidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subido_por');
    }
}
