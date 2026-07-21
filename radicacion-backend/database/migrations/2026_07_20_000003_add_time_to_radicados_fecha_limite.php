<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "Fecha límite" (plazo de respuesta) pasa de date a timestamp para
// conservar la hora exacta de radicación al sumar los días hábiles — hasta
// ahora quedaba siempre a medianoche sin importar a qué hora se radicó.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->timestamp('fecha_limite')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->date('fecha_limite')->nullable()->change();
        });
    }
};
