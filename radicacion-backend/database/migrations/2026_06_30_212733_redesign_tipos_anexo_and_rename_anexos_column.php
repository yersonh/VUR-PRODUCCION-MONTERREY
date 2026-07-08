<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reemplazar catálogo de tipos de anexo (formato físico → contenido documental)
        DB::table('tipos_anexo')->delete();
        DB::table('tipos_anexo')->insert([
            ['descripcion' => 'Oficio / Comunicación'],
            ['descripcion' => 'Factura / Soporte de pago'],
            ['descripcion' => 'Resolución / Decreto'],
            ['descripcion' => 'Contrato / Convenio'],
            ['descripcion' => 'Certificado / Constancia'],
            ['descripcion' => 'Informe / Concepto técnico'],
            ['descripcion' => 'Solicitud / Formulario'],
            ['descripcion' => 'Evidencia / Fotografía'],
            ['descripcion' => 'Plano / Mapa / Diseño'],
            ['descripcion' => 'Otro documento'],
        ]);
    }

    public function down(): void
    {
        DB::table('tipos_anexo')->delete();
        DB::table('tipos_anexo')->insert([
            ['descripcion' => 'Folios'],
            ['descripcion' => 'CD / DVD'],
            ['descripcion' => 'Libro'],
            ['descripcion' => 'Sobre sellado'],
            ['descripcion' => 'Muestra / Objeto'],
            ['descripcion' => 'Otro'],
        ]);
    }
};
