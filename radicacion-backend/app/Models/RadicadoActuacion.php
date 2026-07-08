<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RadicadoActuacion extends Model
{
    protected $table = 'radicado_actuaciones';

    protected $fillable = [
        'radicado_id', 'descripcion',
        'estado_anterior_id', 'estado_nuevo_id', 'usuario_id',
    ];

    public function radicado(): BelongsTo    { return $this->belongsTo(Radicado::class); }
    public function estadoAnterior(): BelongsTo { return $this->belongsTo(EstadoCorrespondencia::class, 'estado_anterior_id'); }
    public function estadoNuevo(): BelongsTo    { return $this->belongsTo(EstadoCorrespondencia::class, 'estado_nuevo_id'); }
    public function usuario(): BelongsTo        { return $this->belongsTo(User::class, 'usuario_id'); }
}
