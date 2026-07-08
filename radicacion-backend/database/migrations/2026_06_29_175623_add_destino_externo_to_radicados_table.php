<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->string('tipo_destino', 20)->default('INTERNO')->after('personal_destino_id');
            $table->foreignId('tercero_destino_id')->nullable()->after('tipo_destino')
                ->constrained('terceros')->nullOnDelete();
            $table->string('nombre_persona_destino', 100)->nullable()->after('tercero_destino_id');
        });

        Schema::table('radicados', function (Blueprint $table) {
            $table->foreignId('dependencia_destino_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tercero_destino_id');
            $table->dropColumn(['tipo_destino', 'nombre_persona_destino']);
        });

        Schema::table('radicados', function (Blueprint $table) {
            $table->foreignId('dependencia_destino_id')->nullable(false)->change();
        });
    }
};
