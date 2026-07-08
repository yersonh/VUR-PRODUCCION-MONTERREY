<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('cedula', 20)->unique();
            $table->string('nombres', 80);
            $table->string('apellidos', 80);
            $table->string('cargo', 100)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->foreignId('dependencia_id')->constrained('dependencias');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal');
    }
};
