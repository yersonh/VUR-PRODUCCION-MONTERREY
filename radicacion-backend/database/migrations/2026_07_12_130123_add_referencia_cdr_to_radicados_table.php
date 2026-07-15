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
        Schema::table('radicados', function (Blueprint $table) {
            // ID de la solicitud pública en CDR que originó este radicado
            // (ver SolicitudCartaResidenciaController::store()). Estructurado
            // aparte de 'observaciones' para que EnviarSolicitudResidenciaACdr
            // pueda mandarlo de vuelta a CDR como campo explícito sin
            // depender de parsear texto libre.
            $table->string('referencia_cdr', 50)->nullable()->after('observaciones');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropColumn('referencia_cdr');
        });
    }
};
