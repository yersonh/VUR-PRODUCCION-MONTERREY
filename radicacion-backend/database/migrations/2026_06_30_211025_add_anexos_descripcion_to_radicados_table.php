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
            // Lista de objetos {descripcion, tipo_id} por radicado; reemplaza tipo_anexo_id + otro_anexo
            $table->json('anexos')->nullable()->after('cantidad_anexos');
        });
    }

    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropColumn('anexos');
        });
    }
};
