<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop FK temporal para poder borrar sin violar constraint
        Schema::table('radicados', function (Blueprint $table) {
            $table->dropForeign(['tipo_correspondencia_id']);
        });

        DB::table('tipos_correspondencia')->delete();

        DB::table('tipos_correspondencia')->insert([
            ['descripcion' => 'SOLICITUD DE PERMISO',                'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'LICENCIA DE EXHUMACION',              'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'LICENCIA DE INHUMACION',              'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'CERTIFICADO NOMENCLATURA',            'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'CERTIFICACION USO DE SUELOS',         'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'CESION DE BIENES INMUEBLES',          'max_dias' => 45,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'INSCRIPCION Y ELABORACION CARNET',    'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'ACCION DE TUTELA',                    'max_dias' => 0,   'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'DERECHO DE PETICION',                 'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD DE INFORMACION',            'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'INVITACION',                          'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'LICENCIA DE PARCELACION',             'max_dias' => 45,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD MANTENIMIENTO',             'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD SERVICIOS',                 'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD PRESTAMO MATERIALES',       'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD ALUMBRADO',                 'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD COLABORACION',              'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD',                           'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'DESPACHO COMISORIO',                  'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD CONCILIACION',              'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'DENUNCIAS',                           'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'DISPOSICION DE MENORES',              'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'ADJUDICACION APOYO JURIDICO',         'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUDES ENTES DE CONTROL',        'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD CUPO ADULTO MAYOR',         'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD AFILIACION',                'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'REVISION PROTOCOLO BIOSEGURIDAD',     'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'REPORTE DIAGNOSTICO',                 'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD ACUERDO DE PAGO',           'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD CANCELACION',               'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD INSCRIPCION',               'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD INFORMACION',               'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'PRESENTACION DECLARACION',            'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'PRESENTACION INFORMACION',            'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD PRESCRIPCION',              'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'RESPUESTA A EMPLAZAMIENTO',           'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'RECURSO DE RECONSIDERACION',          'max_dias' => 360, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD ACTUALIZACION',             'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD CERTIFICADO',               'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'POSTULACION CONVOCATORIA',            'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'PROYECTO MEJORAMIENTO',               'max_dias' => 30,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'RECURSO DE APELACION',                'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD DE REUNION',                'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'OFICIO DE INTERVENTORIA',             'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'RECURSO DE REPOSICION',               'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD PERMISO PARA TRABAJAR',     'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD CIERRE DE ESTABLECIMIENTO', 'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD DE AUTORIZACION',           'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'ENTREGA DE HOJA DE VIDA',             'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD DE REPUESTOS',              'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'COMUNICACION DE LA REPUBLICA',        'max_dias' => 0,   'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD CERTIFICACION',             'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD PRORROGA',                  'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'REMISION SRD HERMANOS',               'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD REVISION CERTIFICADO',      'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD COMISORIO',                 'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD CONCILIACION EXTRAJUDICIAL','max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'ESTAMPILLAS',                         'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'INCUMPLIMIENTO DE FALLO',             'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'RESPUESTA RESOLUCION',                'max_dias' => 0,   'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'INFORMACION',                         'max_dias' => 0,   'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'REQUERIMIENTO LISTADO',               'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'CONSTRUCCION SIN LICENCIA',           'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD MANTENIMIENTO INMUEBLE',    'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'DISPOSICION MENORES',                 'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'CONCILIACION CUOTA ALIMENTARIA',      'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'INVITACION A CONVOCATORIA',           'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'INVESTIGACION DE PATRIMONIO',         'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'PROCESO ELECCIONES',                  'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD TARJETAS OPERACION',        'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'ADJUDICACION APOYO JURIDICO',         'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'DISPOSICION ORDEN CORRECCIONAL',      'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'CANCELACION ICA',                     'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'NOTIFICACION ACTUACION',              'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'DENUNCIA VIOLENCIA INTRAFAMILIAR',    'max_dias' => 10,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'NOTIFICACION DE DECLARACION',         'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'RECONOCIMIENTO DE LEY',               'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'SOLICITUD PARA GARANTIZAR',           'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'PAGO DE SERVICIOS',                   'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['descripcion' => 'QUEJA',                               'max_dias' => 15,  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Hacer la columna nullable (puede ser NOT NULL en producción)
        Schema::table('radicados', function (Blueprint $table) {
            $table->unsignedBigInteger('tipo_correspondencia_id')->nullable()->change();
        });

        // Nullificar referencias huérfanas (IDs de tipos viejos que ya no existen)
        $nuevosIds = DB::table('tipos_correspondencia')->pluck('id');
        DB::table('radicados')
            ->whereNotNull('tipo_correspondencia_id')
            ->whereNotIn('tipo_correspondencia_id', $nuevosIds)
            ->update(['tipo_correspondencia_id' => null]);

        // Re-agregar FK con nullOnDelete para no romper radicados existentes
        Schema::table('radicados', function (Blueprint $table) {
            $table->foreign('tipo_correspondencia_id')
                  ->references('id')->on('tipos_correspondencia')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        // No reversible — no podemos restaurar los datos originales
    }
};
