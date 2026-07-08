<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('radicados', function (Blueprint $table) {
            $table->id();

            // Número único global (NO reinicia por año)
            $table->unsignedInteger('nro_radicado')->unique();
            $table->unsignedSmallInteger('año_radicado');

            // Clasificación
            $table->enum('manejo', ['INFORMATIVO', 'RESOLUTIVO'])->default('RESOLUTIVO');
            $table->enum('procedencia', ['EXTERNO', 'INTERNO'])->default('EXTERNO');
            $table->date('fecha_radicacion');
            $table->time('hora_radicacion');

            // Remitente
            $table->enum('tipo_remitente', ['PACIENTE', 'FUNCIONARIO', 'TERCERO_NIT']);
            $table->foreignId('tercero_id')->nullable()->constrained('terceros');
            $table->foreignId('paciente_id')->nullable()->constrained('pacientes');
            $table->unsignedBigInteger('funcionario_id')->nullable();
            $table->unsignedBigInteger('dependencia_remitente_id')->nullable();
            $table->string('nombre_persona_empresa', 100)->nullable();

            // Tipo correspondencia
            $table->foreignId('tipo_correspondencia_id')->constrained('tipos_correspondencia');
            $table->foreignId('aux_tip_id')->nullable()->constrained('aux_tips');
            $table->string('aux_descripcion', 100)->nullable();
            $table->date('fecha_limite')->nullable();

            // Destino
            $table->unsignedBigInteger('dependencia_destino_id');
            $table->unsignedBigInteger('personal_destino_id')->nullable();

            // Físico / Anexos
            $table->unsignedSmallInteger('folios')->nullable();
            $table->unsignedSmallInteger('folios_de')->nullable();
            $table->unsignedSmallInteger('cantidad_anexos')->nullable();
            $table->foreignId('tipo_anexo_id')->nullable()->constrained('tipos_anexo');
            $table->string('otro_anexo', 60)->nullable();

            // Factura / Medio
            $table->string('nro_factura', 30)->nullable();
            $table->decimal('valor_factura', 18, 2)->nullable();
            $table->date('fecha_documento')->nullable();
            $table->date('fecha_entrega')->nullable();
            $table->foreignId('medio_ingreso_id')->nullable()->constrained('medios_ingreso');
            $table->string('nro_guia', 30)->nullable();

            // Texto libre
            $table->text('observaciones')->nullable();

            // IA
            $table->boolean('ia_procesado')->default(false);
            $table->jsonb('ia_campos_sugeridos')->nullable();

            // Estado y operador
            $table->foreignId('estado_id')->constrained('estados_correspondencia');
            $table->foreignId('operador_id')->constrained('users');

            $table->timestamps();
            $table->softDeletes();

            // Índices para búsquedas frecuentes
            $table->index(['año_radicado', 'nro_radicado']);
            $table->index('fecha_radicacion');
            $table->index('estado_id');
            $table->index('dependencia_destino_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('radicados');
    }
};
