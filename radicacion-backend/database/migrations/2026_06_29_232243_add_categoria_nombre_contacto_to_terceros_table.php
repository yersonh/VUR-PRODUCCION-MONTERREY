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

        // NOTA: El backfill original derivaba 'categoria' consultando la tabla local
        // tipos_identificacion, que ya no existe (ahora vive en el Core, vía API).
        // Se deja 'categoria' en NULL por defecto; debe asignarse desde la aplicación
        // (por ejemplo, al crear o sincronizar un tercero, consultando el Core API
        // para saber si el tipo de identificación corresponde a NIT o no).
    }

    public function down(): void
    {
        Schema::table('terceros', function (Blueprint $table) {
            $table->dropColumn(['categoria', 'nombre_contacto']);
        });
    }
};
