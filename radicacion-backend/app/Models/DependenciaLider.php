<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// dependencia_id y funcionario_id son ids planos del Core Institucional
// (sin FK local) — ver comentario en la migración create_dependencia_lideres_table.
class DependenciaLider extends Model
{
    // Sin esto, Laravel adivina "dependencia_liders" (pluralización en
    // inglés) en vez del nombre real de la tabla (español).
    protected $table = 'dependencia_lideres';

    protected $fillable = ['dependencia_id', 'funcionario_id'];
}
