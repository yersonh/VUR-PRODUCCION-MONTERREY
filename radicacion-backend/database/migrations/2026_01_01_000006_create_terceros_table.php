<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terceros', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->foreignId('tipo_identificacion_id')->constrained('tipos_identificacion');
            $table->string('nro_identificacion', 20);
            $table->string('nombres', 80);
            $table->string('primer_apellido', 60);
            $table->string('segundo_apellido', 60)->nullable();
            $table->string('direccion', 120)->nullable();
            $table->string('municipio', 80)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->foreignId('dependencia_id')->nullable()->constrained('dependencias');
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['tipo_identificacion_id', 'nro_identificacion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terceros');
    }
};
