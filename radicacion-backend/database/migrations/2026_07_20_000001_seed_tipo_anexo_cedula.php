<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Garantiza que exista un TipoAnexo "Cédula de Ciudadanía" con id fijo, usado
// por el flujo de Solicitud Carta de Residencia (tipo_correspondencia_id=90,
// ver 2026_07_12_000001_seed_tipo_correspondencia_carta_residencia.php) para
// exigir ese anexo obligatoriamente y para la validación IA del número de
// documento (config('services.cdr.tipo_anexo_cedula_id')).
return new class extends Migration
{
    private const ID = 100;

    public function up(): void
    {
        DB::table('tipos_anexo')->updateOrInsert(
            ['id' => self::ID],
            [
                'descripcion' => 'Cédula de Ciudadanía',
                'created_at'  => now(),
                'updated_at'  => now(),
            ]
        );

        DB::statement("SELECT setval('tipos_anexo_id_seq', (SELECT GREATEST(MAX(id), 1) FROM tipos_anexo))");
    }

    public function down(): void
    {
        DB::table('tipos_anexo')->where('id', self::ID)->delete();
    }
};
