<?php

namespace App\Services;

use App\Models\Notificacion;
use App\Models\Radicado;
use App\Models\User;

class NotificacionService
{
    public function __construct(private BrevoMailService $brevo) {}

    /**
     * Notifica sobre un nuevo radicado. Si hay un funcionario responsable
     * específico con cuenta vinculada (funcionario_id), se le notifica solo
     * a él/ella; si no, se notifica a toda la dependencia destino (fallback).
     */
    public function notificarNuevoRadicado(Radicado $radicado, int $operadorId): void
    {
        if (!$radicado->dependencia_destino_id) {
            return;
        }

        if ($radicado->personal_destino_id) {
            $responsable = User::where('funcionario_id', $radicado->personal_destino_id)
                ->where('activo', true)
                ->first();

            if ($responsable) {
                if ($responsable->id !== $operadorId) {
                    Notificacion::create([
                        'user_id'     => $responsable->id,
                        'tipo'        => 'RADICADO_NUEVO',
                        'titulo'      => 'Nuevo radicado asignado',
                        'mensaje'     => "Se te asignó el radicado {$radicado->numeroRadicado} con asunto: {$radicado->tipoCorrespondencia?->descripcion}."
                            .($radicado->fecha_limite ? " Tienes hasta el {$radicado->fecha_limite->format('d/m/Y')} para responder." : ''),
                        'radicado_id' => $radicado->id,
                    ]);
                }
                return;
            }
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
     * Notifica a ADMIN que CDR rechazó como duplicado el reenvío de un
     * radicado que VUR estaba enviando por primera vez (ver
     * ClienteCdr::enviarRecibido() y EnviarSolicitudResidenciaACdr). Un 409
     * en ese punto es señal de que CDR ya tenía ese radicado_vur registrado
     * con datos distintos a los de este radicado — normalmente por un
     * choque de numeración entre los dos sistemas — y hay que revisar del
     * lado de CDR qué quedó guardado ahí, porque los datos de este radicado
     * nunca se registraron en CDR.
     */
    public function notificarConflictoCdr(Radicado $radicado): void
    {
        $admins = User::whereHas('role', fn ($q) => $q->where('nombre', 'ADMIN'))
            ->where('activo', true)
            ->get();

        foreach ($admins as $admin) {
            Notificacion::create([
                'user_id'     => $admin->id,
                'tipo'        => 'CDR_CONFLICTO',
                'titulo'      => 'CDR rechazó el radicado como duplicado',
                'mensaje'     => "CDR reportó que ya tenía registrado el radicado {$radicado->numeroRadicado} al intentar enviárselo. Revisa en CDR qué hay guardado bajo ese número — es probable un choque de numeración y los datos de este radicado no quedaron registrados allá.",
                'radicado_id' => $radicado->id,
            ]);

            if ($admin->email) {
                $this->brevo->alertarConflictoCdr(
                    email:          $admin->email,
                    nombre:         $admin->name,
                    numeroRadicado: $radicado->numeroRadicado,
                    radicadoId:     $radicado->id,
                );
            }
        }
    }

    /**
     * Notifica sobre el cambio de estado de un radicado: al operador que lo
     * radicó (si no fue quien ejecutó el cambio) y al responsable de la
     * dependencia/funcionario destino. Cuando el ejecutor es el mismo
     * operador_id — el caso típico de los radicados de intake automático de
     * CDR, donde "quien radicó" y "quien reporta el cambio de estado" son el
     * mismo usuario de sistema — no queda nadie a quien avisar con lo
     * anterior, así que se avisa también a OPERADOR/ADMIN para que el
     * cambio no pase desapercibido.
     */
    public function notificarCambioEstado(Radicado $radicado, int $ejecutorId): void
    {
        $destinatarios = collect();

        if ($radicado->operador_id && $radicado->operador_id !== $ejecutorId) {
            $destinatarios->push($radicado->operador_id);
        }

        if ($radicado->personal_destino_id) {
            $responsable = User::where('funcionario_id', $radicado->personal_destino_id)
                ->where('activo', true)
                ->first();
            if ($responsable) {
                $destinatarios->push($responsable->id);
            }
        } elseif ($radicado->dependencia_destino_id) {
            $destinatarios = $destinatarios->merge(
                User::where('dependencia_id', $radicado->dependencia_destino_id)
                    ->where('activo', true)
                    ->pluck('id')
            );
        }

        if ($radicado->operador_id && $radicado->operador_id === $ejecutorId) {
            $destinatarios = $destinatarios->merge(
                User::whereHas('role', fn ($q) => $q->whereIn('nombre', ['OPERADOR', 'ADMIN']))
                    ->where('activo', true)
                    ->pluck('id')
            );
        }

        $destinatarios = $destinatarios->filter(fn ($id) => $id !== $ejecutorId)->unique();

        foreach ($destinatarios as $userId) {
            Notificacion::create([
                'user_id'     => $userId,
                'tipo'        => 'ESTADO_CAMBIADO',
                'titulo'      => 'Cambio de estado en radicado',
                'mensaje'     => "El radicado {$radicado->numeroRadicado} cambió a estado \"{$radicado->estado?->descripcion}\".",
                'radicado_id' => $radicado->id,
            ]);
        }
    }

    /**
     * Notifica que ya se adjuntó la respuesta (PDF de salida) de un radicado:
     * al operador que lo radicó, al responsable de la dependencia/funcionario
     * destino, y si el remitente fue un funcionario interno con cuenta VUR
     * vinculada, también a él/ella. Cuando el ejecutor es el mismo
     * operador_id — el caso de las respuestas que llegan por el webhook de
     * CDR (ver SolicitudCartaResidenciaController::actualizarEstado), donde
     * "quien radicó" y "quien adjunta la respuesta" son el mismo usuario de
     * sistema — no queda nadie a quien avisar con lo anterior, así que se
     * avisa también a OPERADOR/ADMIN para que la respuesta no pase
     * desapercibida (ver mismo patrón en notificarCambioEstado()).
     */
    public function notificarRespuestaCargada(Radicado $radicado, int $ejecutorId): void
    {
        // Remitente interno (funcionario con cuenta VUR): mensaje personalizado.
        if ($radicado->tipo_remitente === 'FUNCIONARIO' && $radicado->funcionario_id) {
            $userRemitente = User::where('funcionario_id', $radicado->funcionario_id)
                ->where('activo', true)
                ->where('id', '!=', $ejecutorId)
                ->first();

            if ($userRemitente) {
                Notificacion::create([
                    'user_id'     => $userRemitente->id,
                    'tipo'        => 'RESPUESTA_CARGADA',
                    'titulo'      => 'Tu solicitud fue respondida',
                    'mensaje'     => "El radicado {$radicado->numeroRadicado} que enviaste ya tiene respuesta disponible.",
                    'radicado_id' => $radicado->id,
                ]);
            }
        }

        // Personal interno que debe enterarse de que ya se respondió:
        // operador que radicó la entrada + responsable de la dependencia
        // destino. Si el ejecutor es el mismo operador_id — caso de las
        // respuestas que llegan por el webhook de CDR — no queda nadie de
        // este grupo a quien avisar, así que se cae a OPERADOR/ADMIN.
        $destinatarios = collect();

        if ($radicado->operador_id && $radicado->operador_id !== $ejecutorId) {
            $destinatarios->push($radicado->operador_id);
        }

        if ($radicado->personal_destino_id) {
            $responsable = User::where('funcionario_id', $radicado->personal_destino_id)
                ->where('activo', true)
                ->first();
            if ($responsable) {
                $destinatarios->push($responsable->id);
            }
        }

        if ($radicado->operador_id && $radicado->operador_id === $ejecutorId) {
            $destinatarios = $destinatarios->merge(
                User::whereHas('role', fn ($q) => $q->whereIn('nombre', ['OPERADOR', 'ADMIN']))
                    ->where('activo', true)
                    ->pluck('id')
            );
        }

        $destinatarios = $destinatarios->filter(fn ($id) => $id !== $ejecutorId)->unique();

        foreach ($destinatarios as $userId) {
            Notificacion::create([
                'user_id'     => $userId,
                'tipo'        => 'RESPUESTA_CARGADA',
                'titulo'      => 'Respuesta cargada',
                'mensaje'     => "Se adjuntó la respuesta al radicado {$radicado->numeroRadicado}.",
                'radicado_id' => $radicado->id,
            ]);
        }
    }

    /**
     * Notifica (in-app + correo) sobre radicados próximos a vencer, tanto al
     * operador que radicó la entrada como al funcionario responsable de
     * darle respuesta (si tiene cuenta vinculada). Pensado para llamarse
     * diariamente desde el comando `radicados:notificar-vencimientos`.
     */
    public function notificarVencimientosProximos(): void
    {
        $manana = now()->addDay()->toDateString();

        $radicados = Radicado::whereDate('fecha_limite', $manana)
            ->whereHas('estado', fn ($q) => $q->where('es_terminal', false))
            ->with(['operador', 'tipoCorrespondencia', 'estado'])
            ->get();

        foreach ($radicados as $radicado) {
            $destinatarios = collect([$radicado->operador_id]);

            if ($radicado->personal_destino_id) {
                $responsable = User::where('funcionario_id', $radicado->personal_destino_id)->first();
                if ($responsable) {
                    $destinatarios->push($responsable->id);
                }
            }

            foreach ($destinatarios->filter()->unique() as $userId) {
                $yaNotificado = Notificacion::where('user_id', $userId)
                    ->where('radicado_id', $radicado->id)
                    ->where('tipo', 'VENCIMIENTO')
                    ->whereDate('created_at', today())
                    ->exists();

                if ($yaNotificado) {
                    continue;
                }

                Notificacion::create([
                    'user_id'     => $userId,
                    'tipo'        => 'VENCIMIENTO',
                    'titulo'      => 'Radicado vence mañana',
                    'mensaje'     => "El radicado {$radicado->numeroRadicado} vence mañana y aún está en estado \"{$radicado->estado?->descripcion}\".",
                    'radicado_id' => $radicado->id,
                ]);

                $usuario = User::find($userId);
                if ($usuario?->email) {
                    $this->brevo->enviarRecordatorioVencimiento(
                        email:          $usuario->email,
                        nombre:         $usuario->name,
                        numeroRadicado: $radicado->numeroRadicado,
                        fechaLimite:    $radicado->fecha_limite->format('d/m/Y'),
                        radicadoId:     $radicado->id,
                    );
                }
            }
        }
    }
}
