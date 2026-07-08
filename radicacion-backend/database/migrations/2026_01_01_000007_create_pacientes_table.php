<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pacientes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_historia', 30)->unique();
            $table->foreignId('tipo_identificacion_id')->constrained('tipos_identificacion');
            $table->string('nro_identificacion', 20)->unique();
            $table->string('nombres', 80);
            $table->string('primer_apellido', 60);
            $table->string('segundo_apellido', 60)->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pacientes');
    }
};
