<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tipos_correspondencia', function (Blueprint $table) {
            // Id de la dependencia (Core Institucional) a la que se enruta por
            // defecto todo radicado de este tipo. Sin FK local: apunta a un
            // recurso externo, igual que dependencia_destino_id en radicados.
            $table->unsignedBigInteger('dependencia_destino_id')->nullable()->after('max_dias');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tipos_correspondencia', function (Blueprint $table) {
            $table->dropColumn('dependencia_destino_id');
        });
    }
};
