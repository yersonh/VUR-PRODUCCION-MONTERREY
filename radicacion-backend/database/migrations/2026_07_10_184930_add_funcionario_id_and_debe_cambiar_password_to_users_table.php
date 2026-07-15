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
        Schema::table('users', function (Blueprint $table) {
            // Id del funcionario en el Core (sin FK local). Único: un
            // funcionario tiene como máximo una cuenta de acceso en VUR.
            $table->unsignedBigInteger('funcionario_id')->nullable()->unique()->after('dependencia_id');
            // true mientras el usuario siga usando la contraseña aleatoria
            // asignada al crear/restablecer la cuenta.
            $table->boolean('debe_cambiar_password')->default(true)->after('activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['funcionario_id', 'debe_cambiar_password']);
        });
    }
};
