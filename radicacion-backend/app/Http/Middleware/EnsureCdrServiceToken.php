<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Autenticación de servicio a servicio para el endpoint público de intake de
// CDR (POST /solicitudes-carta-residencia). Simétrica a ClienteCdr: usa el
// mismo secreto compartido (services.cdr.token / CDR_API_TOKEN) que VUR ya
// usa para autenticarse contra CDR en la dirección saliente.
class EnsureCdrServiceToken
{
    public function handle(Request $request, Closure $next): mixed
    {
        $token = config('services.cdr.token');

        if (!$token || $request->bearerToken() !== $token) {
            Log::warning('Intento de acceso a solicitudes-carta-residencia con token inválido', [
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'No autorizado.'], 401);
        }

        return $next($request);
    }
}
