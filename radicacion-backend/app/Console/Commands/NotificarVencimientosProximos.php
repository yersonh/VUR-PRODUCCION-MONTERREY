<?php

namespace App\Console\Commands;

use App\Services\NotificacionService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('radicados:notificar-vencimientos')]
#[Description('Notifica al operador y al funcionario responsable de los radicados que vencen mañana')]
class NotificarVencimientosProximos extends Command
{
    public function handle(NotificacionService $notificacion): int
    {
        $notificacion->notificarVencimientosProximos();
        $this->info('Notificaciones de vencimiento enviadas.');

        return self::SUCCESS;
    }
}
