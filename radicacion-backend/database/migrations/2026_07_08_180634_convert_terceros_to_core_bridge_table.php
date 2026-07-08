<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 'terceros' pasa de guardar los datos completos de ciudadanos/empresas
        // a ser solo un puente local: {id local estable, categoria, core_id}.
        // Los datos reales (nit/razon_social/nombres/etc.) ahora viven en el
        // Core (/ciudadanos, /empresas). radicados.tercero_id sigue apuntando
        // a este id local, así no hace falta tocar esa tabla otra vez.
        Schema::table('terceros', function (Blueprint $table) {
            $table->dropColumn([
                'tipo_identificacion_id',
                'nro_identificacion',
                'razon_social',
                'nombres',
                'primer_apellido',
                'segundo_apellido',
                'direccion',
                'municipio',
                'telefono',
                'email',
                'activo',
            ]);
            $table->unsignedBigInteger('core_id')->after('categoria');
        });

        Schema::table('terceros', function (Blueprint $table) {
            $table->unique(['categoria', 'core_id']);
        });

        // 'tercero_contactos' (solo aplica a EMPRESA) pasa a referenciar
        // directamente el id de la empresa en el Core, en vez del id local
        // de 'terceros' — así el contacto queda ligado a la empresa real del
        // Core sin depender de que exista una fila puente para ella primero.
        Schema::table('tercero_contactos', function (Blueprint $table) {
            $table->dropForeign(['tercero_id']);
            $table->dropColumn('tercero_id');
            $table->unsignedBigInteger('empresa_id')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('tercero_contactos', function (Blueprint $table) {
            $table->dropColumn('empresa_id');
            $table->foreignId('tercero_id')->nullable()->constrained('terceros')->cascadeOnDelete();
        });

        Schema::table('terceros', function (Blueprint $table) {
            $table->dropUnique(['categoria', 'core_id']);
            $table->dropColumn('core_id');
            $table->unsignedBigInteger('tipo_identificacion_id')->nullable();
            $table->string('nro_identificacion', 20)->nullable();
            $table->string('razon_social', 150)->nullable();
            $table->string('nombres', 80)->nullable();
            $table->string('primer_apellido', 60)->nullable();
            $table->string('segundo_apellido', 60)->nullable();
            $table->string('direccion', 120)->nullable();
            $table->string('municipio', 80)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->boolean('activo')->default(true);
        });
    }
};
