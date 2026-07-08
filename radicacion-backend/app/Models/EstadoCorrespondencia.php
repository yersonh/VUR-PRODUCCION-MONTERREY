<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EstadoCorrespondencia extends Model
{
    protected $table = 'estados_correspondencia';

    protected $fillable = ['codigo', 'descripcion', 'color_hex', 'orden', 'es_terminal'];

    protected $casts = [
        'es_terminal' => 'boolean',
        'orden'       => 'integer',
    ];
}
