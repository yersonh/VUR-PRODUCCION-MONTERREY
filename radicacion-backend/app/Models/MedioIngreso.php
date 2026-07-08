<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedioIngreso extends Model
{
    protected $table = 'medios_ingreso';

    protected $fillable = ['descripcion'];
}
