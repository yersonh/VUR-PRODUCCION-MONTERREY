<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Tipos de Correspondencia
        Schema::create('tipos_correspondencia', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('descripcion', 100);
            $table->unsignedSmallInteger('max_dias')->default(15);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // Aux Tips (asuntos/temas)
        Schema::create('aux_tips', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('descripcion', 100);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // Tipos de Anexo
        Schema::create('tipos_anexo', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('descripcion', 60);
            $table->timestamps();
        });

        DB::table('tipos_anexo')->insert([
            ['codigo' => 'FOLIO',   'descripcion' => 'Folios'],
            ['codigo' => 'CD',      'descripcion' => 'CD / DVD'],
            ['codigo' => 'LIBRO',   'descripcion' => 'Libro'],
            ['codigo' => 'SOBRE',   'descripcion' => 'Sobre sellado'],
            ['codigo' => 'MUESTRA', 'descripcion' => 'Muestra / Objeto'],
            ['codigo' => 'OTRO',    'descripcion' => 'Otro'],
        ]);

        // Medios de Ingreso
        Schema::create('medios_ingreso', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('descripcion', 60);
            $table->timestamps();
        });

        DB::table('medios_ingreso')->insert([
            ['codigo' => 'VENTANILLA',    'descripcion' => 'Ventanilla presencial'],
            ['codigo' => 'EMAIL',         'descripcion' => 'Correo electrónico'],
            ['codigo' => 'MENSAJERIA',    'descripcion' => 'Mensajería / Transportador'],
            ['codigo' => 'FAX',           'descripcion' => 'Fax'],
            ['codigo' => 'TRANSFERENCIA', 'descripcion' => 'Transferencia electrónica'],
        ]);

        // Estados de Correspondencia
        Schema::create('estados_correspondencia', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('descripcion', 60);
            $table->string('color_hex', 7)->default('#64748B');
            $table->unsignedTinyInteger('orden')->default(0);
            $table->boolean('es_terminal')->default(false);
            $table->timestamps();
        });

        DB::table('estados_correspondencia')->insert([
            ['codigo' => 'RADICADO',   'descripcion' => 'Radicado',   'color_hex' => '#2563EB', 'orden' => 1, 'es_terminal' => false],
            ['codigo' => 'EN_TRAMITE', 'descripcion' => 'En Trámite', 'color_hex' => '#D97706', 'orden' => 2, 'es_terminal' => false],
            ['codigo' => 'RESPONDIDO', 'descripcion' => 'Respondido', 'color_hex' => '#16A34A', 'orden' => 3, 'es_terminal' => false],
            ['codigo' => 'CERRADO',    'descripcion' => 'Cerrado',    'color_hex' => '#475569', 'orden' => 4, 'es_terminal' => true],
            ['codigo' => 'ANULADO',    'descripcion' => 'Anulado',    'color_hex' => '#DC2626', 'orden' => 5, 'es_terminal' => true],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('estados_correspondencia');
        Schema::dropIfExists('medios_ingreso');
        Schema::dropIfExists('tipos_anexo');
        Schema::dropIfExists('aux_tips');
        Schema::dropIfExists('tipos_correspondencia');
    }
};
