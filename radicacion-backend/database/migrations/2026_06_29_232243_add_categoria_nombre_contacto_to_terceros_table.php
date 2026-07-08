<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terceros', function (Blueprint $table) {
            $table->string('categoria', 20)->nullable()->after('codigo');         // EMPRESA | CIUDADANO
            $table->string('nombre_contacto', 100)->nullable()->after('nombres'); // responsable en empresa
        });

        // Backfill: derivar categoria de tipo_identificacion existente
        DB::statement("
            UPDATE terceros
            SET categoria = CASE
                WHEN tipo_identificacion_id IN (
                    SELECT id FROM tipos_identificacion WHERE upper(codigo) = 'NIT'
                ) THEN 'EMPRESA'
                ELSE 'CIUDADANO'
            END
        ");
    }

    public function down(): void
    {
        Schema::table('terceros', function (Blueprint $table) {
            $table->dropColumn(['categoria', 'nombre_contacto']);
        });
    }
};
