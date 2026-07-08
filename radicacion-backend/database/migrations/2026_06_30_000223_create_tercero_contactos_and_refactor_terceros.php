<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Agregar razon_social a terceros (columna separada para nombre de empresa)
        Schema::table('terceros', function (Blueprint $table) {
            $table->string('razon_social', 150)->nullable()->after('codigo');
        });

        // 2. Backfill: mover nombre de empresa de `nombres` a `razon_social` para registros EMPRESA
        DB::statement("UPDATE terceros SET razon_social = nombres WHERE categoria = 'EMPRESA'");

        // 3. Hacer `nombres` nullable antes de vaciarlo (en Postgres es NOT NULL por defecto)
        Schema::table('terceros', function (Blueprint $table) {
            $table->string('nombres', 80)->nullable()->change();
        });

        // 4. Limpiar campo `nombres` en registros EMPRESA (ya movido a razon_social)
        DB::statement("UPDATE terceros SET nombres = NULL WHERE categoria = 'EMPRESA'");

        // 5. Crear tabla de contactos por empresa
        Schema::create('tercero_contactos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tercero_id')->constrained('terceros')->cascadeOnDelete();
            $table->string('nombres', 80);
            $table->string('primer_apellido', 60)->nullable();
            $table->string('segundo_apellido', 60)->nullable();
            $table->string('cargo', 100)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // 6. Migrar nombre_contacto existente de terceros → tercero_contactos
        //    Compatible con SQLite (datetime('now')) y PostgreSQL (NOW())
        $isPostgres = DB::getDriverName() === 'pgsql';
        $now = $isPostgres ? 'NOW()' : "datetime('now')";
        $true = $isPostgres ? 'true' : '1';

        DB::statement("
            INSERT INTO tercero_contactos (tercero_id, nombres, activo, created_at, updated_at)
            SELECT id, nombre_contacto, {$true}, {$now}, {$now}
            FROM terceros
            WHERE categoria = 'EMPRESA'
              AND nombre_contacto IS NOT NULL
              AND trim(nombre_contacto) != ''
        ");

        // 7. Eliminar columna nombre_contacto de terceros (ya migrada a tercero_contactos)
        Schema::table('terceros', function (Blueprint $table) {
            $table->dropColumn('nombre_contacto');
        });
    }

    public function down(): void
    {
        Schema::table('terceros', function (Blueprint $table) {
            $table->string('nombre_contacto', 100)->nullable()->after('nombres');
        });

        // Revertir nombre de empresa de razon_social → nombres
        DB::statement("UPDATE terceros SET nombres = razon_social WHERE categoria = 'EMPRESA'");

        // Volver nombres a NOT NULL
        Schema::table('terceros', function (Blueprint $table) {
            $table->string('nombres', 80)->nullable(false)->change();
        });

        Schema::dropIfExists('tercero_contactos');

        Schema::table('terceros', function (Blueprint $table) {
            $table->dropColumn('razon_social');
        });
    }
};
