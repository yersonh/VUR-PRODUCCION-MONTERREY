<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tipo', 50);        // RADICADO_NUEVO | ESTADO_CAMBIADO | VENCIMIENTO
            $table->string('titulo', 150);
            $table->text('mensaje');
            $table->foreignId('radicado_id')->nullable()->constrained('radicados')->nullOnDelete();
            $table->timestamp('leida_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'leida_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones');
    }
};
