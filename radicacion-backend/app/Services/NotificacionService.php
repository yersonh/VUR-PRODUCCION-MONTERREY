<?php

namespace App\Services;

use App\Models\Notificacion;
use App\Models\Radicado;
use App\Models\User;

class NotificacionService
{
    /**
     * Notifica a los usuarios de la dependencia destino sobre un nuevo radicado.
     */
    public function notificarNuevoRadicado(Radicado $radicado, int $operadorId): void
    {
        if (!$radicado->dependencia_destino_id) {
            return;
        }

        $usuarios = User::where('dependencia_id', $radicado->dependencia_destino_id)
            ->where('activo', true)
            ->where('id', '!=', $operadorId)
            ->get();

        foreach ($usuarios as $usuario) {
            Notificacion::create([
                'user_id'     => $usuario->id,
                'tipo'        => 'RADICADO_NUEVO',
                'titulo'      => 'Nuevo radicado recibido',
                'mensaje'     => "Se radicó el documento {$radicado->numeroRadicado} con asunto: {$radicado->tipoCorrespondencia?->descripcion}.",
                'radicado_id' => $radicado->id,
            ]);
        }
    }

    /**
     * Notifica sobre una solicitud recibida del intake automático de CDR.
     * A diferencia de notificarNuevoRadicado() (que solo avisa a la
     * dependencia destino), aquí nadie la radicó a mano — así que se avisa
     * también a quienes normalmente procesan/triage toda la correspondencia
     * entrante (rol OPERADOR) y a ADMIN, para que no quede desapercibida.
     */
    public function notificarSolicitudCdr(Radicado $radicado, int $operadorId): void
    {
        $usuarios = User::whereHas('role', fn ($q) => $q->whereIn('nombre', ['OPERADOR', 'ADMIN']))
            ->where('activo', true)
            ->where('id', '!=', $operadorId)
            ->get();

        foreach ($usuarios as $usuario) {
            Notificacion::create([
                'user_id'     => $usuario->id,
                'tipo'        => 'RADICADO_NUEVO',
                'titulo'      => 'Nueva solicitud recibida de CDR',
                'mensaje'     => "Llegó automáticamente la solicitud de Carta de Residencia {$radicado->numeroRadicado} desde CDR.",
                'radicado_id' => $radicado->id,
            ]);
        }
    }

    /**
     * Notifica al operador del radicado cuando cambia de estado.
     */
    public function notificarCambioEstado(Radicado $radicado, int $ejecutorId): void
    {
        if (!$radicado->operador_id || $radicado->operador_id === $ejecutorId) {
            return;
        }

        Notificacion::create([
            'user_id'     => $radicado->operador_id,
            'tipo'        => 'ESTADO_CAMBIADO',
            'titulo'      => 'Cambio de estado en radicado',
            'mensaje'     => "El radicado {$radicado->numeroRadicado} cambió a estado \"{$radicado->estado?->descripcion}\".",
            'radicado_id' => $radicado->id,
        ]);
    }

    /**
     * Notifica a los operadores sobre radicados próximos a vencer (llamar desde comando artisan).
     */
    public function notificarVencimientosProximos(): void
    {
        $manana = now()->addDay()->toDateString();

        $radicados = Radicado::whereDate('fecha_limite', $manana)
            ->whereHas('estado', fn($q) => $q->where('es_terminal', false))
            ->with(['operador', 'tipoCorrespondencia', 'estado'])
            ->get();

        foreach ($radicados as $radicado) {
            if (!$radicado->operador_id) continue;

            $yaNotificado = Notificacion::where('user_id', $radicado->operador_id)
                ->where('radicado_id', $radicado->id)
                ->where('tipo', 'VENCIMIENTO')
                ->whereDate('created_at', today())
                ->exists();

            if ($yaNotificado) continue;

            Notificacion::create([
                'user_id'     => $radicado->operador_id,
                'tipo'        => 'VENCIMIENTO',
                'titulo'      => 'Radicado vence mañana',
                'mensaje'     => "El radicado {$radicado->numeroRadicado} vence mañana y aún está en estado \"{$radicado->estado?->descripcion}\".",
                'radicado_id' => $radicado->id,
            ]);
        }
    }
}
