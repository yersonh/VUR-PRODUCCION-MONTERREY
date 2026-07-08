<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacion extends Model
{
    protected $table = 'notificaciones';

    protected $fillable = [
        'user_id',
        'tipo',
        'titulo',
        'mensaje',
        'radicado_id',
        'leida_at',
    ];

    protected $casts = [
        'leida_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function radicado(): BelongsTo
    {
        return $this->belongsTo(Radicado::class);
    }

    public function getLeidaAttribute(): bool
    {
        return $this->leida_at !== null;
    }
}
