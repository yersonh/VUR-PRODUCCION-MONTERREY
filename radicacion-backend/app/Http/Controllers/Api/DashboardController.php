<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EstadoCorrespondencia;
use App\Models\Radicado;
use App\Services\ClienteCore;
use App\Services\RadicadoService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

// Panel de KPIs del día a día para ADMIN/OPERADOR (ver middleware
// 'no-funcionario' en routes/api.php) — distinto de Reportes (admin-only,
// analítica histórica con filtros de rango). Acá todo es "ahora mismo":
// lo radicado hoy, lo que está por vencer, carga activa por dependencia y
// los últimos movimientos.
class DashboardController extends Controller
{
    // Ventana de "próximos a vencer" — suficientemente corta para que sea
    // accionable hoy/mañana sin inundar el panel con todo lo pendiente.
    private const DIAS_PROXIMOS_A_VENCER = 3;

    public function __construct(
        private ClienteCore $core,
        private RadicadoService $service,
    ) {}

    // ── GET /dashboard/resumen ──────────────────────────────────────
    public function resumen(): JsonResponse
    {
        $idsNoTerminal = EstadoCorrespondencia::where('es_terminal', false)->pluck('id');

        return response()->json([
            'radicados_hoy'      => $this->radicadosHoy(),
            'plazos'             => $this->plazos($idsNoTerminal),
            'por_dependencia'    => $this->porDependenciaActivos($idsNoTerminal),
            'actividad_reciente' => $this->actividadReciente(),
        ]);
    }

    private function radicadosHoy(): array
    {
        $query = Radicado::whereDate('fecha_radicacion', Carbon::today());

        return [
            'total'      => (clone $query)->count(),
            'por_estado' => $this->porEstado(clone $query),
        ];
    }

    private function porEstado(Builder $query): array
    {
        $conteos = $query
            ->selectRaw('estado_id, count(*) as total')
            ->groupBy('estado_id')
            ->pluck('total', 'estado_id');

        $estados = EstadoCorrespondencia::whereIn('id', $conteos->keys())->get()->keyBy('id');

        return $conteos->map(fn ($total, $id) => [
            'estado_id'   => $id,
            'codigo'      => $estados[$id]->codigo ?? null,
            'descripcion' => $estados[$id]->descripcion ?? 'Desconocido',
            'color_hex'   => $estados[$id]->color_hex ?? '#94A3B8',
            'total'       => $total,
        ])->values()->all();
    }

    private function plazos(Collection $idsNoTerminal): array
    {
        $ahora = Carbon::now();
        $limite = $ahora->copy()->addDays(self::DIAS_PROXIMOS_A_VENCER);

        $base = fn () => Radicado::whereIn('estado_id', $idsNoTerminal)->whereNotNull('fecha_limite');

        $vencidos = (clone $base())->where('fecha_limite', '<', $ahora);
        $proximos = (clone $base())->whereBetween('fecha_limite', [$ahora, $limite]);

        return [
            'vencidos_total' => (clone $vencidos)->count(),
            'proximos_total' => (clone $proximos)->count(),
            'vencidos'       => (clone $vencidos)->orderBy('fecha_limite')->limit(5)->get()
                ->map(fn (Radicado $r) => $this->itemRadicado($r))->all(),
            'proximos'       => (clone $proximos)->orderBy('fecha_limite')->limit(5)->get()
                ->map(fn (Radicado $r) => $this->itemRadicado($r))->all(),
        ];
    }

    private function porDependenciaActivos(Collection $idsNoTerminal): array
    {
        $conteos = Radicado::whereIn('estado_id', $idsNoTerminal)
            ->selectRaw('dependencia_destino_id, count(*) as total')
            ->groupBy('dependencia_destino_id')
            ->orderByDesc('total')
            ->limit(10)
            ->pluck('total', 'dependencia_destino_id');

        $dependencias = collect($this->core->dependencias())->keyBy('id');

        return $conteos->map(fn ($total, $id) => [
            'dependencia_id' => $id,
            'nombre'         => $id !== null && $id !== ''
                ? ($dependencias[$id]['nombre'] ?? "Dependencia #{$id}")
                : 'Sin dependencia',
            'total'          => $total,
        ])->values()->all();
    }

    private function actividadReciente(): array
    {
        return Radicado::with(['estado', 'tipoCorrespondencia'])
            // orderBy('id') en vez de 'created_at': mismo orden (id es serial
            // autoincremental) pero usa el índice de la llave primaria — no
            // hay índice sobre created_at y esta consulta corre en cada carga
            // del dashboard.
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn (Radicado $r) => $this->itemRadicado($r))
            ->all();
    }

    private function itemRadicado(Radicado $r): array
    {
        return [
            'id'                   => $r->id,
            'numero_radicado'      => $r->numero_radicado,
            'remitente'            => $this->service->nombreRemitente($r),
            'tipo_correspondencia' => $r->tipoCorrespondencia?->descripcion,
            'estado'               => [
                'codigo'      => $r->estado?->codigo,
                'descripcion' => $r->estado?->descripcion,
                'color_hex'   => $r->estado?->color_hex,
            ],
            'fecha_radicacion' => $r->fecha_radicacion?->toDateString(),
            'fecha_limite'     => $r->fecha_limite?->toIso8601String(),
        ];
    }
}
