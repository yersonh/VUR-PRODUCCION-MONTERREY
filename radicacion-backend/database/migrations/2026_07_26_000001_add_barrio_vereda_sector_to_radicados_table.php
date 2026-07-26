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
            // Solo se captura (y se exige en el frontend) para Solicitud
            // Carta de Residencia — es el dato que CDR necesita para poder
            // auto-formalizar el trámite en una Solicitud interna e imprimirlo
            // en el certificado ("...dirección, sector {barrio_vereda_sector}.",
            // ver certificado.blade.php en el repo CDR). Antes de esta columna,
            // VUR nunca capturaba este dato y por eso CDR no podía formalizar
            // sin intervención manual (ver ClienteCdr::registrarSolicitudResidencia
            // y RecibidoVurService::procesarAutomaticamente en el repo CDR).
            $table->string('barrio_vereda_sector', 255)->nullable()->after('codigo_seguimiento_cdr');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropColumn('barrio_vereda_sector');
        });
    }
};
