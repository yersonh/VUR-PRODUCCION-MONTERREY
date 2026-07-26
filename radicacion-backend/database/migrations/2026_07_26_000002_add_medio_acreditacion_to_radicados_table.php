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
            // Carta de Residencia — es el mismo concepto que el ciudadano
            // elige en el formulario público de CDR (electoral/sisben/jac),
            // necesario para que CDR pueda enrutar el trámite al mismo flujo
            // de validación (IA electoral / Funcionario SISBEN / Presidente
            // JAC) sin importar si el radicado se hizo en VUR o en CDR.
            $table->string('medio_acreditacion', 20)->nullable()->after('barrio_vereda_sector');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropColumn('medio_acreditacion');
        });
    }
};
