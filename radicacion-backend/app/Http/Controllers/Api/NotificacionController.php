<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notificaciones = Notificacion::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(fn($n) => [
                'id'          => $n->id,
                'tipo'        => $n->tipo,
                'titulo'      => $n->titulo,
                'mensaje'     => $n->mensaje,
                'radicado_id' => $n->radicado_id,
                'leida'       => $n->leida,
                'created_at'  => $n->created_at,
            ]);

        return response()->json($notificaciones);
    }

    public function noLeidas(Request $request): JsonResponse
    {
        $count = Notificacion::where('user_id', $request->user()->id)
            ->whereNull('leida_at')
            ->count();

        return response()->json(['count' => $count]);
    }

    public function marcarLeida(Request $request, int $id): JsonResponse
    {
        $notificacion = Notificacion::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notificacion->update(['leida_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function marcarTodasLeidas(Request $request): JsonResponse
    {
        Notificacion::where('user_id', $request->user()->id)
            ->whereNull('leida_at')
            ->update(['leida_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
