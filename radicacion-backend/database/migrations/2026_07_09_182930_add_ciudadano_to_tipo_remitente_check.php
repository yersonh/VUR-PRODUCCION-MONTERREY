<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // El CHECK constraint quedó desincronizado con la validación de Laravel:
    // RadicadoController ya acepta 'tipo_remitente' => 'CIUDADANO' (remitente
    // externo natural, distinto de TERCERO_NIT/empresa), pero la migración
    // que quitó PACIENTE del constraint dejó solo ('FUNCIONARIO', 'TERCERO_NIT').
    public function up(): void
    {
        DB::statement('ALTER TABLE radicados DROP CONSTRAINT IF EXISTS radicados_tipo_remitente_check');
        DB::statement("ALTER TABLE radicados ADD CONSTRAINT radicados_tipo_remitente_check CHECK (tipo_remitente IN ('FUNCIONARIO', 'TERCERO_NIT', 'CIUDADANO'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE radicados DROP CONSTRAINT IF EXISTS radicados_tipo_remitente_check');
        DB::statement("ALTER TABLE radicados ADD CONSTRAINT radicados_tipo_remitente_check CHECK (tipo_remitente IN ('FUNCIONARIO', 'TERCERO_NIT'))");
    }
};
