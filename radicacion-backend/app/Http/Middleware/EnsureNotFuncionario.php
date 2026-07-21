<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

// Para endpoints de ADMIN/OPERADOR (ej. Dashboard) que un FUNCIONARIO no debe
// ver — FUNCIONARIO tiene su propia vista acotada ("Mis Radicados").
class EnsureNotFuncionario
{
    public function handle(Request $request, Closure $next): mixed
    {
        if ($request->user()?->role?->nombre === 'FUNCIONARIO') {
            return response()->json(['message' => 'Acceso restringido.'], 403);
        }

        return $next($request);
    }
}
