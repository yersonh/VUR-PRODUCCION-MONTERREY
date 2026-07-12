<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Garantiza que el TipoCorrespondencia usado por el intake de CDR
// (SolicitudCartaResidenciaController, config('services.cdr.tipo_correspondencia_residencia_id'),
// por defecto id=90) exista con dependencia_destino_id apuntando a Despacho
// del Alcalde (id=1 en el Core). Sin esto, cualquier reset de BD (incluida
// 2026_06_30_201626_reseed_tipos_correspondencia, que borra y reinserta
// tipos_correspondencia sin esta fila) deja el endpoint respondiendo 500
// ("no tiene configurada la dependencia destino").
//
// Se fuerza el id=90 explícitamente (no basta con firstOrCreate por
// descripción) porque el config lee ese id fijo, no busca por texto.
return new class extends Migration
{
    private const ID = 90;
    private const DEPENDENCIA_DESPACHO_ALCALDE = 1;

    public function up(): void
    {
        DB::table('tipos_correspondencia')->updateOrInsert(
            ['id' => self::ID],
            [
                'descripcion'             => 'Solicitud Carta De Residencia',
                'max_dias'                => 15,
                'activo'                  => true,
                'dependencia_destino_id'  => self::DEPENDENCIA_DESPACHO_ALCALDE,
                'created_at'              => now(),
                'updated_at'              => now(),
            ]
        );

        // Insertar con id explícito no avanza la secuencia de Postgres —
        // sin esto, el próximo INSERT sin id explícito podría chocar con 90.
        DB::statement("SELECT setval('tipos_correspondencia_id_seq', (SELECT GREATEST(MAX(id), 1) FROM tipos_correspondencia))");
    }

    public function down(): void
    {
        // No reversible — mismo criterio que 2026_06_30_201626_reseed_tipos_correspondencia.
    }
};
