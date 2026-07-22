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
            // Código con el que el ciudadano consulta su trámite en el portal
            // público de CDR (formato SP-########, ver
            // SolicitudCartaResidenciaController::store()). Estructurado aparte
            // de 'referencia_cdr' (el id numérico interno de CDR) porque este sí
            // se muestra al ciudadano, en el correo de confirmación de radicado.
            $table->string('codigo_seguimiento_cdr', 20)->nullable()->after('referencia_cdr');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropColumn('codigo_seguimiento_cdr');
        });
    }
};
