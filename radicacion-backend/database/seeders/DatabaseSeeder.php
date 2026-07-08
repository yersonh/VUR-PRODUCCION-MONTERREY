<?php

namespace Database\Seeders;

use App\Models\AuxTip;
use App\Models\Dependencia;
use App\Models\Role;
use App\Models\TipoCorrespondencia;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Dependencias
        $dependencias = [
            'ADMIN',
            'Despacho del alcalde',
            'Oficina de Control Interno',
            'Oficina Asesora de Planeación',
            'Oficina Asesora de jurídica',
            'Secretaria General',
            'Secretaria de Infraestructura',
            'Secretaría de Desarrollo Social',
            'Secretaría de Hacienda',
            'Secretaría de Desarrollo Económico y Medio ambiente',
            'Secretaria De Gobierno Seguridad Y Convivencia',
            'Secretaría de Educación, Cultura y Turismo',
        ];

        foreach ($dependencias as $descripcion) {
            Dependencia::firstOrCreate(
                ['descripcion' => $descripcion],
                ['activo' => true]
            );
        }

        // Aux Tips
        $auxTips = [
            'DESPACHO DEL ALCALDE',
            'OFICINA DE CONTROL INTERNO',
            'OFICINA ASESORA DE PLANEACION',
            'OFICINA ASESORA JURIDICA',
            'SECRETARIA GENERAL',
            'SECRETARIA DE GOBIERNO',
            'COMISARIA DE FAMILIA',
            'SECRETARIA DESARROLLO SOCIAL',
            'SECRETARIA DE INFRAESTRUCTURA',
            'SECRETARIA DE HACIENDA',
            'SECRETARIA DE EDUCACION CULTURA Y TURISMO',
            'SECRETARIA DE EDUCACION',
            'SOLICITUD DE BOVEDA',
            'SOLICITUD CERTIFICADO DE CONTABILIDAD',
            'INFORMACION DE NEGLIGENCIA',
        ];

        foreach ($auxTips as $descripcion) {
            AuxTip::firstOrCreate(
                ['descripcion' => $descripcion],
                ['activo' => true]
            );
        }

        $despacho = Dependencia::where('descripcion', 'ADMIN')->first();

        // Tipos de Correspondencia
        $tipos = [
            ['descripcion' => 'SOLICITUD',                           'max_dias' => 15],
            ['descripcion' => 'DESPACHO COMISORIO',                  'max_dias' => 15],
            ['descripcion' => 'SOLICITUD CONCILIACION',              'max_dias' => 15],
            ['descripcion' => 'DENUNCIAS',                           'max_dias' => 15],
            ['descripcion' => 'DISPOSICION DE MENOR',                'max_dias' => 15],
            ['descripcion' => 'ADJUDICACION APOYO JURIDICO',         'max_dias' => 15],
            ['descripcion' => 'SOLICITUDES ENTES DE CONTROL',        'max_dias' => 10],
            ['descripcion' => 'SOLICITUD CUPO ADULTO MAYOR',         'max_dias' => 15],
            ['descripcion' => 'SOLICITUD AFILIACION',                'max_dias' => 15],
            ['descripcion' => 'REVISION PROTOCOLO',                  'max_dias' => 15],
            ['descripcion' => 'REPORTE DIAGNOSTICO',                 'max_dias' => 15],
            ['descripcion' => 'SOLICITUD ACUERDO DE PAGO',           'max_dias' => 10],
            ['descripcion' => 'SOLICITUD CANCELACION',               'max_dias' => 10],
            ['descripcion' => 'SOLICITUD INSCRIPCION',               'max_dias' => 10],
            ['descripcion' => 'SOLICITUD INFORMACION',               'max_dias' => 10],
            ['descripcion' => 'PRESENTACION DECLARACION',            'max_dias' => 15],
            ['descripcion' => 'PRESENTACION INFORMACION',            'max_dias' => 15],
            ['descripcion' => 'SOLICITUD PRESCRIPCION',              'max_dias' => 15],
            ['descripcion' => 'RESPUESTA A EMPLAZAMIENTO',           'max_dias' => 15],
            ['descripcion' => 'RECURSO DE RECONSIDERACION',          'max_dias' => 360],
            ['descripcion' => 'SOLICITUD ACTUALIZACION',             'max_dias' => 15],
            ['descripcion' => 'SOLICITUD CERTIFICADO',               'max_dias' => 10],
            ['descripcion' => 'POSTULACION CONVOCATORIA',            'max_dias' => 15],
            ['descripcion' => 'PROYECTO MEJORAMIENTO',               'max_dias' => 30],
            ['descripcion' => 'RECURSO DE APELACION',                'max_dias' => 10],
            ['descripcion' => 'SOLICITUD DE REUNION',                'max_dias' => 15],
            ['descripcion' => 'OFICIO DE INTERVENTORIA',             'max_dias' => 15],
            ['descripcion' => 'RECURSO DE REPOSICION',               'max_dias' => 15],
            ['descripcion' => 'SOLICITUD PERMISO',                   'max_dias' => 15],
            ['descripcion' => 'SOLICITUD CIERRE DE ESTABLECIMIENTO', 'max_dias' => 15],
            ['descripcion' => 'SOLICITUD DE AUTORIZACION',           'max_dias' => 15],
            ['descripcion' => 'ENTREGA DE HOJA DE VIDA',             'max_dias' => 15],
            ['descripcion' => 'SOLICITUD DE REPUESTOS',              'max_dias' => 15],
            ['descripcion' => 'COMUNICACION DE LA REPUBLICA',        'max_dias' => 0],
            ['descripcion' => 'SOLICITUD CERTIFICACION',             'max_dias' => 15],
            ['descripcion' => 'SOLICITUD PRORROGA',                  'max_dias' => 15],
            ['descripcion' => 'REMISION SRD HERMANO MUNICIPIO',      'max_dias' => 15],
            ['descripcion' => 'SOLIC REVISION CERTIFICACION',        'max_dias' => 15],
            ['descripcion' => 'SOLICITUD COMISORIO',                 'max_dias' => 15],
            ['descripcion' => 'SOLIC CONCILIACION EXTRAJUDICIAL',    'max_dias' => 15],
            ['descripcion' => 'ESTAMPILLAS',                         'max_dias' => 15],
            ['descripcion' => 'INCUMPLIMIENTO DE FALLO',             'max_dias' => 15],
            ['descripcion' => 'RESPUESTA RESOLUCION',                'max_dias' => 0],
            ['descripcion' => 'INFORMACION',                         'max_dias' => 0],
            ['descripcion' => 'REQUERIMIENTO LISTADO',               'max_dias' => 15],
            ['descripcion' => 'CONSTRUCCION SIN LICENCIA',           'max_dias' => 15],
            ['descripcion' => 'SOLICITUD MANTENIMIENTO',             'max_dias' => 15],
            ['descripcion' => 'DISPOSICION MENORES',                 'max_dias' => 10],
            ['descripcion' => 'CONCILIACION CUOTA ALIMENTARIA',      'max_dias' => 15],
            ['descripcion' => 'INVITACION A CONVOCATORIA',           'max_dias' => 15],
            ['descripcion' => 'INVESTIGACION DE PATERNIDAD',         'max_dias' => 10],
            ['descripcion' => 'PROCESO ELECCIONES',                  'max_dias' => 15],
            ['descripcion' => 'SOLICITUD TARJETAS DE OPERACION',     'max_dias' => 15],
            ['descripcion' => 'DISPOSICION ORDEN CORRECCIONAL',      'max_dias' => 15],
            ['descripcion' => 'CANCELACION ICA',                     'max_dias' => 15],
            ['descripcion' => 'NOTIFICACION ACTUACION',              'max_dias' => 10],
            ['descripcion' => 'DENUNCIA VIOLENCIA INTRAFAMILIAR',    'max_dias' => 10],
            ['descripcion' => 'NOTIFICACION DE DECLARACION',         'max_dias' => 15],
            ['descripcion' => 'RECONOCIMIENTO DE MEJORAS',           'max_dias' => 15],
            ['descripcion' => 'SOLICITUD PARA GARANTIZAR',           'max_dias' => 15],
            ['descripcion' => 'PAGO DE SERVICIOS',                   'max_dias' => 15],
            ['descripcion' => 'QUEJA',                               'max_dias' => 15],
        ];

        foreach ($tipos as $tipo) {
            TipoCorrespondencia::firstOrCreate(
                ['descripcion' => $tipo['descripcion']],
                ['max_dias' => $tipo['max_dias'], 'activo' => true]
            );
        }

        // Usuario ADMIN
        $adminRole    = Role::where('nombre', 'ADMIN')->first();
        $operRole     = Role::where('nombre', 'OPERADOR')->first();

        User::firstOrCreate(
            ['email' => 'admin@monterrey.gov.co'],
            [
                'name'           => 'Administrador Sistema',
                'password'       => Hash::make('Admin2026*'),
                'role_id'        => $adminRole?->id,
                'dependencia_id' => $despacho->id,
                'activo'         => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'operador@monterrey.gov.co'],
            [
                'name'           => 'Operador Radicación',
                'password'       => Hash::make('Operador2026*'),
                'role_id'        => $operRole?->id,
                'dependencia_id' => $despacho->id,
                'activo'         => true,
            ]
        );

        $this->command->info('✓ Seed completado');
        $this->command->table(
            ['Usuario', 'Contraseña', 'Rol'],
            [
                ['admin@monterrey.gov.co',    'Admin2026*',    'ADMIN'],
                ['operador@monterrey.gov.co', 'Operador2026*', 'OPERADOR'],
            ]
        );
    }
}
