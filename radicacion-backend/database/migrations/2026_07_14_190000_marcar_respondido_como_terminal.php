<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Un radicado RESPONDIDO ya cumplió su ciclo — no debe poder anularse ni
// cambiar de estado manualmente después de eso (mismo criterio que ya
// aplicaba a CERRADO/ANULADO vía es_terminal). Antes de esto, RESPONDIDO
// quedaba fuera de la lista de estados terminales y el botón "Anular"
// seguía disponible en el detalle del radicado.
return new class extends Migration
{
    public function up(): void
    {
        DB::table('estados_correspondencia')
            ->where('codigo', 'RESPONDIDO')
            ->update(['es_terminal' => true]);
    }

    public function down(): void
    {
        DB::table('estados_correspondencia')
            ->where('codigo', 'RESPONDIDO')
            ->update(['es_terminal' => false]);
    }
};
