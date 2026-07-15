<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: 'api',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // CORS — debe ir antes de auth
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Alias de middlewares personalizados
        $middleware->alias([
            'admin'       => \App\Http\Middleware\EnsureAdmin::class,
            'password.ok' => \App\Http\Middleware\EnsureNoDebePasswordChange::class,
            'cdr.token'   => \App\Http\Middleware\EnsureCdrServiceToken::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Requiere que `php artisan schedule:work` (dev) o un cron real
        // (`* * * * * php artisan schedule:run`, producción) esté corriendo.
        $schedule->command('radicados:notificar-vencimientos')->dailyAt('07:00');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
