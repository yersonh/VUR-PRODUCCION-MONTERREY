<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Las dependencias son datos del Core Institucional (VUR no tiene tabla
// propia `dependencias`, ver ClienteCore::dependencias()), así que el
// "líder" de cada una se guarda acá como una relación local por id plano —
// mismo patrón que `personal_destino_id`/`dependencia_destino_id` en
// `radicados`: sin FK, resuelto después contra el Core.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dependencia_lideres', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dependencia_id')->unique();
            $table->unsignedBigInteger('funcionario_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dependencia_lideres');
    }
};
