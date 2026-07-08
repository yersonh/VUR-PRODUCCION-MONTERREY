<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('radicado_actuaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('radicado_id')->constrained('radicados')->cascadeOnDelete();
            $table->text('descripcion');
            $table->foreignId('estado_anterior_id')->nullable()->constrained('estados_correspondencia');
            $table->foreignId('estado_nuevo_id')->constrained('estados_correspondencia');
            $table->foreignId('usuario_id')->constrained('users');
            $table->timestamps();

            $table->index('radicado_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('radicado_actuaciones');
    }
};
