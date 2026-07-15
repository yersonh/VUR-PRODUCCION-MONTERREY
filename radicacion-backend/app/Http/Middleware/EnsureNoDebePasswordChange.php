<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureNoDebePasswordChange
{
    public function handle(Request $request, Closure $next): mixed
    {
        if ($request->user()?->debe_cambiar_password) {
            return response()->json([
                'message' => 'Debe cambiar su contraseña antes de continuar.',
                'debe_cambiar_password' => true,
            ], 403);
        }

        return $next($request);
    }
}
