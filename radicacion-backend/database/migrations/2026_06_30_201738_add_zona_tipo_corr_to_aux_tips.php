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
        Schema::table('aux_tips', function (Blueprint $table) {
            $table->foreignId('tipo_correspondencia_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('tipos_correspondencia')
                  ->nullOnDelete();
            $table->string('zona', 10)->nullable()->after('descripcion');
        });
    }

    public function down(): void
    {
        Schema::table('aux_tips', function (Blueprint $table) {
            $table->dropForeign(['tipo_correspondencia_id']);
            $table->dropColumn(['tipo_correspondencia_id', 'zona']);
        });
    }
};
