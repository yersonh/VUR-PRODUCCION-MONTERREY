<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('radicado_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('radicado_id')->constrained('radicados')->cascadeOnDelete();
            $table->enum('tipo', ['ENTRADA', 'SALIDA', 'ANEXO']);
            $table->string('nombre_original', 255);
            $table->string('ruta_almacenamiento', 500);
            $table->unsignedBigInteger('tamanio_bytes');
            $table->string('mime_type', 60)->default('application/pdf');
            $table->foreignId('subido_por')->constrained('users');
            $table->timestamps();

            $table->index(['radicado_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('radicado_documentos');
    }
};
