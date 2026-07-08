<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_identificacion', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 10)->unique();
            $table->string('descripcion', 60);
            $table->timestamps();
        });

        DB::table('tipos_identificacion')->insert([
            ['codigo' => 'CC',  'descripcion' => 'Cédula de Ciudadanía'],
            ['codigo' => 'CE',  'descripcion' => 'Cédula de Extranjería'],
            ['codigo' => 'NIT', 'descripcion' => 'NIT'],
            ['codigo' => 'PP',  'descripcion' => 'Pasaporte'],
            ['codigo' => 'TI',  'descripcion' => 'Tarjeta de Identidad'],
            ['codigo' => 'RC',  'descripcion' => 'Registro Civil'],
            ['codigo' => 'CN',  'descripcion' => 'Número de Identificación Personal'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_identificacion');
    }
};
