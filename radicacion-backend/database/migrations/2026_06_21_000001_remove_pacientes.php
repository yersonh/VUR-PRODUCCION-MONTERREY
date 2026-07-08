<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('radicados', 'paciente_id')) {
            Schema::table('radicados', function (Blueprint $table) {
                $table->dropForeign(['paciente_id']);
                $table->dropColumn('paciente_id');
            });
        }

        // Actualizar el CHECK constraint del enum para excluir PACIENTE (solo aplica a Postgres)
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE radicados DROP CONSTRAINT IF EXISTS radicados_tipo_remitente_check");
            DB::statement("ALTER TABLE radicados ADD CONSTRAINT radicados_tipo_remitente_check CHECK (tipo_remitente IN ('FUNCIONARIO', 'TERCERO_NIT'))");
        }

        Schema::dropIfExists('pacientes');
    }

    public function down(): void
    {
        Schema::create('pacientes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_historia', 30)->unique();
            $table->foreignId('tipo_identificacion_id')->constrained('tipos_identificacion');
            $table->string('nro_identificacion', 20)->unique();
            $table->string('nombres', 80);
            $table->string('primer_apellido', 60);
            $table->string('segundo_apellido', 60)->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::table('radicados', function (Blueprint $table) {
            $table->foreignId('paciente_id')->nullable()->constrained('pacientes');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE radicados DROP CONSTRAINT IF EXISTS radicados_tipo_remitente_check");
            DB::statement("ALTER TABLE radicados ADD CONSTRAINT radicados_tipo_remitente_check CHECK (tipo_remitente IN ('PACIENTE', 'FUNCIONARIO', 'TERCERO_NIT'))");
        }
    }
};
