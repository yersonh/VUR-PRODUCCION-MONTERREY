<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 30)->unique();
            $table->string('descripcion', 120)->nullable();
            $table->timestamps();
        });

        DB::table('roles')->insert([
            ['nombre' => 'ADMIN',             'descripcion' => 'Administrador del sistema'],
            ['nombre' => 'OPERADOR',          'descripcion' => 'Operador de radicación'],
            ['nombre' => 'FUNCIONARIO',       'descripcion' => 'Funcionario consulta'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
