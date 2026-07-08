<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('codigo_usuario', 20)->unique()->nullable()->after('name');
            $table->foreignId('role_id')->constrained('roles')->after('email');
            $table->foreignId('dependencia_id')->nullable()->constrained('dependencias')->after('role_id');
            $table->boolean('activo')->default(true)->after('dependencia_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['dependencia_id']);
            $table->dropColumn(['codigo_usuario', 'role_id', 'dependencia_id', 'activo']);
        });
    }
};
