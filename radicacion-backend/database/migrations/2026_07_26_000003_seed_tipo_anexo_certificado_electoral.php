<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Garantiza que exista un TipoAnexo "Certificado Electoral" con id fijo,
// usado por el flujo de Solicitud Carta de Residencia (tipo_correspondencia_id=90)
// cuando el operador elige "Certificado Electoral" como medio de
// acreditación (ver medio_acreditacion en 2026_07_26_000002). A diferencia
// del anexo de cédula, este NO es obligatorio para radicar — si no se
// adjunta, CDR notifica a Secretaría para que gestione la subsanación en
// vez de bloquear el radicado (ver RecibidoVurService::procesarAutomaticamente
// en el repo CDR).
return new class extends Migration
{
    private const ID = 101;

    public function up(): void
    {
        DB::table('tipos_anexo')->updateOrInsert(
            ['id' => self::ID],
            [
                'descripcion' => 'Certificado Electoral',
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
