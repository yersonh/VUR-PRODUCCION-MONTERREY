<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guard idempotente: agrega la columna sólo si no existe todavía.
        // Necesario porque la migración anterior puede haberse marcado como
        // ejecutada sin que la columna quedara en la BD (deploy parcial en Railway).
        if (Schema::hasColumn('radicados', 'anexos_descripcion') &&
            !Schema::hasColumn('radicados', 'anexos')) {
            Schema::table('radicados', function (Blueprint $table) {
                $table->renameColumn('anexos_descripcion', 'anexos');
            });
        } elseif (!Schema::hasColumn('radicados', 'anexos')) {
            Schema::table('radicados', function (Blueprint $table) {
                $table->json('anexos')->nullable()->after('cantidad_anexos');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('radicados', 'anexos')) {
            Schema::table('radicados', function (Blueprint $table) {
                $table->dropColumn('anexos');
            });
        }
    }
};
