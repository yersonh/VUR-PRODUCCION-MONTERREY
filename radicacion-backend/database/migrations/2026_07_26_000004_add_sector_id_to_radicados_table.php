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
            // Id del sector (tabla "sectores" en el Core de CDR, sin FK local
            // — mismo criterio que dependencia_destino_id/funcionario_id)
            // que identifica al Presidente JAC exacto que debe certificar.
            // Solo se captura (y se exige en el frontend) cuando
            // medio_acreditacion=jac — sin esto, CDR no puede notificar al
            // presidente puntual del sector y cae al aviso genérico a
            // Secretaría (ver SolicitudService::notificarNuevaSolicitud en
            // el repo CDR).
            $table->unsignedBigInteger('sector_id')->nullable()->after('medio_acreditacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropColumn('sector_id');
        });
    }
};
