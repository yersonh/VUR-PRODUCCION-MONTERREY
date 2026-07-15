<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EstadoCorrespondencia;
use App\Models\MedioIngreso;
use App\Models\Radicado;
use App\Models\TipoCorrespondencia;
use App\Models\User;
use App\Services\ClienteCore;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class ReportesAdminController extends Controller
{
    public function __construct(private ClienteCore $core)
    {
    }

    // ── GET /admin/reportes ─────────────────────────────────────────
    // Panel único: KPIs + serie de tiempo + desgloses + cumplimiento SLA,
    // todo calculado sobre el mismo rango de fechas/filtros. Se devuelve
    // todo junto (en vez de un endpoint por gráfica) porque el dashboard
    // los pinta todos a la vez y así se evita ida-y-vuelta múltiple.
    public function index(Request $request): JsonResponse
    {
        [$desde, $hasta] = $this->rango($request);

        $base = fn () => $this->conFiltros($request);

        $idsNoTerminal = EstadoCorrespondencia::where('es_terminal', false)->pluck('id');

        return response()->json([
            'filtros' => [
                'fecha_desde' => $desde->toDateString(),
                'fecha_hasta' => $hasta->toDateString(),
            ],
            'kpis'             => $this->kpis($base(), $idsNoTerminal),
            'serie_tiempo'     => $this->serieTiempo($base()),
            'por_estado'       => $this->porEstado($base()),
            'por_tipo'         => $this->porTipo($base(), $idsNoTerminal),
            'por_dependencia'  => $this->porDependencia($base()),
            'por_operador'     => $this->porOperador($base()),
            'por_funcionario'  => $this->porFuncionario($base()),
            'por_medio_ingreso'=> $this->porMedioIngreso($base()),
            'por_procedencia'  => $this->porColumnaSimple($base(), 'procedencia'),
            'por_manejo'       => $this->porColumnaSimple($base(), 'manejo'),
            'sla'              => $this->sla($base()),
        ]);
    }

    // ── GET /admin/reportes/export ──────────────────────────────────
    // CSV del listado detallado de radicados que cumplen los mismos
    // filtros del dashboard (fechas + estado/tipo/dependencia/operador).
    public function export(Request $request): Response
    {
        $radicados = $this->conFiltros($request)
            ->with(['tipoCorrespondencia', 'estado', 'operador', 'medioIngreso'])
            ->orderBy('fecha_radicacion')
            ->get();

        $dependencias = collect($this->core->dependencias())->keyBy('id');

        $filas = [];
        $filas[] = ['Número', 'Fecha radicación', 'Tipo correspondencia', 'Remitente', 'Dependencia destino', 'Estado', 'Fecha límite', 'Operador', 'Medio ingreso'];

        foreach ($radicados as $r) {
            $filas[] = [
                $r->numero_radicado,
                optional($r->fecha_radicacion)->toDateString(),
                $r->tipoCorrespondencia?->descripcion,
                $r->nombre_persona_empresa,
                $dependencias->get($r->dependencia_destino_id)['nombre'] ?? $r->dependencia_destino_id,
                $r->estado?->descripcion,
                optional($r->fecha_limite)->toDateString(),
                $r->operador?->name,
                $r->medioIngreso?->descripcion,
            ];
        }

        $csv = implode("\n", array_map(
            fn (array $fila) => implode(',', array_map(fn ($v) => '"'.str_replace('"', '""', (string) $v).'"', $fila)),
            $filas
        ));

        return response(
            "\xEF\xBB\xBF".$csv, // BOM UTF-8 para que Excel abra tildes bien
            200,
            [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="reporte-radicados.csv"',
            ]
        );
    }

    // ── Filtros comunes ──────────────────────────────────────────────

    /** @return array{0: Carbon, 1: Carbon} */
    private function rango(Request $request): array
    {
        $hasta = $request->filled('fecha_hasta')
            ? Carbon::parse($request->string('fecha_hasta')->toString())
            : Carbon::today();

        $desde = $request->filled('fecha_desde')
            ? Carbon::parse($request->string('fecha_desde')->toString())
            : $hasta->copy()->subDays(89);

        return [$desde, $hasta];
    }

    private function conFiltros(Request $request): Builder
    {
        [$desde, $hasta] = $this->rango($request);

        return Radicado::query()
            ->whereBetween('fecha_radicacion', [$desde->toDateString(), $hasta->toDateString()])
            ->when($request->filled('estado_id'), fn ($q) => $q->where('estado_id', $request->integer('estado_id')))
            ->when($request->filled('tipo_correspondencia_id'), fn ($q) => $q->where('tipo_correspondencia_id', $request->integer('tipo_correspondencia_id')))
            ->when($request->filled('dependencia_destino_id'), fn ($q) => $q->where('dependencia_destino_id', $request->integer('dependencia_destino_id')))
            ->when($request->filled('operador_id'), fn ($q) => $q->where('operador_id', $request->integer('operador_id')));
    }

    // ── Bloques del reporte ───────────────────────────────────────────

    private function kpis(Builder $query, Collection $idsNoTerminal): array
    {
        $total = (clone $query)->count();

        $vencidos = (clone $query)
            ->whereNotNull('fecha_limite')
            ->where('fecha_limite', '<', Carbon::today())
            ->whereIn('estado_id', $idsNoTerminal)
            ->count();

        $ciclo = $this->tiemposCiclo($query);

        return [
            'total'                    => $total,
            'vencidos'                 => $vencidos,
            'promedio_dias_respuesta'  => $ciclo['promedio_dias'],
            'radicados_respondidos'    => $ciclo['cantidad'],
        ];
    }

    // Serie diaria dentro del rango — agrupada en PHP (portable entre
    // sqlite/postgres, sin funciones de fecha específicas del motor).
    private function serieTiempo(Builder $query): array
    {
        $fechas = (clone $query)->pluck('fecha_radicacion')
            ->map(fn ($f) => Carbon::parse($f)->toDateString());

        $conteo = $fechas->countBy()->sortKeys();

        return $conteo->map(fn ($total, $fecha) => ['fecha' => $fecha, 'total' => $total])->values()->all();
    }

    private function porEstado(Builder $query): array
    {
        $conteos = (clone $query)
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

    private function porTipo(Builder $query, Collection $idsNoTerminal): array
    {
        $totales = (clone $query)
            ->selectRaw('tipo_correspondencia_id, count(*) as total')
            ->groupBy('tipo_correspondencia_id')
            ->pluck('total', 'tipo_correspondencia_id');

        $vencidos = (clone $query)
            ->whereNotNull('fecha_limite')
            ->where('fecha_limite', '<', Carbon::today())
            ->whereIn('estado_id', $idsNoTerminal)
            ->selectRaw('tipo_correspondencia_id, count(*) as total')
            ->groupBy('tipo_correspondencia_id')
            ->pluck('total', 'tipo_correspondencia_id');

        $tipos = TipoCorrespondencia::whereIn('id', $totales->keys())->get()->keyBy('id');

        return $totales->map(function ($total, $id) use ($vencidos, $tipos) {
            $venc = $vencidos[$id] ?? 0;
            return [
                'tipo_correspondencia_id' => $id,
                'descripcion'             => $tipos[$id]->descripcion ?? 'Desconocido',
                'max_dias'                => $tipos[$id]->max_dias ?? null,
                'total'                   => $total,
                'vencidos'                => $venc,
                'cumplimiento_pct'        => $total > 0 ? round((($total - $venc) / $total) * 100, 1) : 100.0,
            ];
        })->values()->all();
    }

    private function porDependencia(Builder $query): array
    {
        $conteos = (clone $query)
            ->selectRaw('dependencia_destino_id, count(*) as total')
            ->groupBy('dependencia_destino_id')
            ->orderByDesc('total')
            ->pluck('total', 'dependencia_destino_id');

        $dependencias = collect($this->core->dependencias())->keyBy('id');

        return $conteos->map(fn ($total, $id) => [
            'dependencia_id' => $id,
            'nombre'         => $id !== '' ? ($dependencias[$id]['nombre'] ?? "Dependencia #{$id}") : 'Sin dependencia',
            'total'          => $total,
        ])->values()->all();
    }

    private function porOperador(Builder $query): array
    {
        $conteos = (clone $query)
            ->selectRaw('operador_id, count(*) as total')
            ->groupBy('operador_id')
            ->orderByDesc('total')
            ->pluck('total', 'operador_id');

        $usuarios = User::whereIn('id', $conteos->keys())->get()->keyBy('id');

        return $conteos->map(fn ($total, $id) => [
            'operador_id' => $id,
            'nombre'      => $usuarios[$id]->name ?? "Usuario #{$id}",
            'total'       => $total,
        ])->values()->all();
    }

    // Top 10 funcionarios destino por carga. Los nombres viven en el Core
    // (sin listado masivo por ids), así que se resuelven uno a uno — solo
    // para el top 10, no para todo el conjunto agrupado.
    private function porFuncionario(Builder $query): array
    {
        $conteos = (clone $query)
            ->whereNotNull('personal_destino_id')
            ->selectRaw('personal_destino_id, count(*) as total')
            ->groupBy('personal_destino_id')
            ->orderByDesc('total')
            ->limit(10)
            ->pluck('total', 'personal_destino_id');

        return $conteos->map(function ($total, $id) {
            $nombre = "Funcionario #{$id}";
            try {
                $funcionario = $this->core->funcionario((int) $id);
                $persona = $funcionario['persona'] ?? null;
                if ($persona) {
                    $nombre = trim(($persona['nombres'] ?? '').' '.($persona['apellidos'] ?? ''));
                }
            } catch (\Throwable) {
                // Core no disponible o id ya no existe — se deja el fallback.
            }

            return ['funcionario_id' => $id, 'nombre' => $nombre, 'total' => $total];
        })->values()->all();
    }

    private function porMedioIngreso(Builder $query): array
    {
        $conteos = (clone $query)
            ->whereNotNull('medio_ingreso_id')
            ->selectRaw('medio_ingreso_id, count(*) as total')
            ->groupBy('medio_ingreso_id')
            ->pluck('total', 'medio_ingreso_id');

        $medios = MedioIngreso::whereIn('id', $conteos->keys())->get()->keyBy('id');

        return $conteos->map(fn ($total, $id) => [
            'medio_ingreso_id' => $id,
            'descripcion'      => $medios[$id]->descripcion ?? "Medio #{$id}",
            'total'            => $total,
        ])->values()->all();
    }

    private function porColumnaSimple(Builder $query, string $columna): array
    {
        return (clone $query)
            ->selectRaw("{$columna} as valor, count(*) as total")
            ->groupBy($columna)
            ->get()
            ->map(fn ($fila) => ['valor' => $fila->valor, 'total' => $fila->total])
            ->all();
    }

    // Cumplimiento de SLA: mide si la RESPUESTA llegó dentro del plazo
    // (fecha_limite) — no si el radicado "ya no está abierto". Por eso el %
    // se calcula ÚNICAMENTE sobre radicados que llegaron a RESPONDIDO (la
    // única evidencia real de que se contestó):
    //   - respondidos_a_tiempo / respondidos_fuera_plazo: el denominador de
    //     cumplimiento_pct es SOLO estos dos, nunca el total de radicados.
    //   - cerrados_sin_respuesta (estado CERRADO) y anulados (ANULADO)
    //     quedan fuera del cálculo: ninguno implica que se haya respondido,
    //     así que no pueden contar como "cumplido a tiempo".
    //   - pendientes_en_plazo / pendientes_vencidos: radicados que TODAVÍA
    //     no tienen respuesta (RADICADO/EN_TRAMITE); "vencido" aquí siempre
    //     significa "sigue sin responder y ya pasó la fecha límite", nunca
    //     "se respondió tarde" (eso es "fuera de plazo").
    private function sla(Builder $query): array
    {
        $idRespondido = EstadoCorrespondencia::where('codigo', 'RESPONDIDO')->value('id');
        $idCerrado    = EstadoCorrespondencia::where('codigo', 'CERRADO')->value('id');
        $idAnulado    = EstadoCorrespondencia::where('codigo', 'ANULADO')->value('id');

        $respondidos = (clone $query)
            ->where('estado_id', $idRespondido)
            ->whereNotNull('fecha_limite')
            ->with(['actuaciones' => fn ($q) => $q->where('estado_nuevo_id', $idRespondido)->orderBy('created_at')])
            ->get(['id', 'fecha_limite', 'updated_at']);

        $aTiempo = 0;
        $fueraPlazo = 0;

        foreach ($respondidos as $r) {
            // Preferimos la fecha real de la actuación que lo pasó a
            // RESPONDIDO; si no quedó registrada, updated_at es la mejor
            // aproximación disponible (no dejamos el radicado sin contar).
            $fechaRespuesta = optional($r->actuaciones->first())->created_at ?? $r->updated_at;
            if ($fechaRespuesta->toDateString() <= $r->fecha_limite->toDateString()) {
                $aTiempo++;
            } else {
                $fueraPlazo++;
            }
        }

        $totalRespondidos = $aTiempo + $fueraPlazo;

        $cerradosSinRespuesta = (clone $query)->where('estado_id', $idCerrado)->count();
        $anulados             = (clone $query)->where('estado_id', $idAnulado)->count();

        $pendientesBase = (clone $query)
            ->whereNotNull('fecha_limite')
            ->whereNotIn('estado_id', array_values(array_filter([$idRespondido, $idCerrado, $idAnulado])));

        $pendientesVencidos = (clone $pendientesBase)->where('fecha_limite', '<', Carbon::today())->count();
        $pendientesEnPlazo  = (clone $pendientesBase)->where('fecha_limite', '>=', Carbon::today())->count();

        return [
            'respondidos_a_tiempo'    => $aTiempo,
            'respondidos_fuera_plazo' => $fueraPlazo,
            'total_respondidos'       => $totalRespondidos,
            'cerrados_sin_respuesta'  => $cerradosSinRespuesta,
            'anulados'                => $anulados,
            'pendientes_en_plazo'     => $pendientesEnPlazo,
            'pendientes_vencidos'     => $pendientesVencidos,
            'cumplimiento_pct'        => $totalRespondidos > 0 ? round(($aTiempo / $totalRespondidos) * 100, 1) : null,
            'promedio_dias'           => $this->tiemposCiclo($query)['promedio_dias'],
        ];
    }

    // Promedio de días entre fecha_radicacion y el momento real en que el
    // radicado pasó a RESPONDIDO (única fuente de "ya se contestó").
    private function tiemposCiclo(Builder $query): array
    {
        $idRespondido = EstadoCorrespondencia::where('codigo', 'RESPONDIDO')->value('id');

        $respondidos = (clone $query)
            ->where('estado_id', $idRespondido)
            ->with(['actuaciones' => fn ($q) => $q->where('estado_nuevo_id', $idRespondido)->orderBy('created_at')])
            ->get(['id', 'fecha_radicacion', 'updated_at']);

        $dias = $respondidos
            ->map(function ($r) {
                $fechaRespuesta = optional($r->actuaciones->first())->created_at ?? $r->updated_at;
                return $r->fecha_radicacion->diffInDays($fechaRespuesta);
            });

        return [
            'cantidad'       => $dias->count(),
            'promedio_dias'  => $dias->count() > 0 ? round($dias->avg(), 1) : null,
        ];
    }
}
