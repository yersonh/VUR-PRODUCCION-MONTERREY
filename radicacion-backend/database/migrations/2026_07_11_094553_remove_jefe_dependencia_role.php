<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')->where('nombre', 'JEFE_DEPENDENCIA')->delete();
    }

    public function down(): void
    {
        DB::table('roles')->insert([
            'nombre'      => 'JEFE_DEPENDENCIA',
            'descripcion' => 'Jefe de dependencia',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }
};
