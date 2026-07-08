<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoAnexo extends Model
{
    protected $table = 'tipos_anexo';

    protected $fillable = ['descripcion'];
}
