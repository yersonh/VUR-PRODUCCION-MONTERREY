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
        Schema::table('radicado_documentos', function (Blueprint $table) {
            // Código corto y aleatorio (no adivinable, a diferencia del
            // numero_radicado que es secuencial) para la consulta pública del
            // documento de SALIDA — se genera al estampar el QR sobre el PDF
            // (ver RadicadoService::adjuntarPdf()). Nulo en ENTRADA/ANEXO,
            // que no se estampan ni se consultan públicamente.
            $table->string('codigo_verificacion', 20)->nullable()->unique()->after('tipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('radicado_documentos', function (Blueprint $table) {
            $table->dropColumn('codigo_verificacion');
        });
    }
};
