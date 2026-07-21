<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "Fecha Entrega" (mostrada como "Fecha de Ingreso" en PlazoTimeline) pasa de
// date a timestamp para poder capturar la hora — hasta ahora siempre quedaba
// a medianoche sin importar la hora real de ingreso del documento.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->timestamp('fecha_entrega')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->date('fecha_entrega')->nullable()->change();
        });
    }
};
