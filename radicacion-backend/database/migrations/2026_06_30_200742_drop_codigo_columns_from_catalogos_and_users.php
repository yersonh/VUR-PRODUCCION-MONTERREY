<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropUnique('dependencias_codigo_unique');
            $table->dropColumn('codigo');
        });

        Schema::table('tipos_correspondencia', function (Blueprint $table) {
            $table->dropUnique('tipos_correspondencia_codigo_unique');
            $table->dropColumn('codigo');
        });

        Schema::table('aux_tips', function (Blueprint $table) {
            $table->dropUnique('aux_tips_codigo_unique');
            $table->dropColumn('codigo');
        });

        Schema::table('tipos_anexo', function (Blueprint $table) {
            $table->dropUnique('tipos_anexo_codigo_unique');
            $table->dropColumn('codigo');
        });

        Schema::table('medios_ingreso', function (Blueprint $table) {
            $table->dropUnique('medios_ingreso_codigo_unique');
            $table->dropColumn('codigo');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_codigo_usuario_unique');
            $table->dropColumn('codigo_usuario');
        });
    }

    public function down(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->string('codigo', 10)->nullable()->after('id');
        });

        Schema::table('tipos_correspondencia', function (Blueprint $table) {
            $table->string('codigo', 20)->nullable()->after('id');
        });

        Schema::table('aux_tips', function (Blueprint $table) {
            $table->string('codigo', 20)->nullable()->after('id');
        });

        Schema::table('tipos_anexo', function (Blueprint $table) {
            $table->string('codigo', 20)->nullable()->after('id');
        });

        Schema::table('medios_ingreso', function (Blueprint $table) {
            $table->string('codigo', 20)->nullable()->after('id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('codigo_usuario', 20)->nullable()->after('name');
        });
    }
};
