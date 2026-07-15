import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon,
  DocumentArrowDownIcon, ArrowPathIcon,
  ChevronLeftIcon, ChevronRightIcon,
  DocumentCheckIcon, DocumentIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

import { AppLayout } from '@/components/layout/AppLayout'
import { EstadoBadge } from '@/components/ui/EstadoBadge'
import { useCatalogoStore } from '@/store/catalogoStore'
import { useAuthStore } from '@/store/authStore'
import { formatNumeroRadicado } from '@/lib/utils'
import radicadoService, { type RadicadoListItem, type RadicadoFiltros } from '@/services/radicadoService'
import type { EstadoRadicado } from '@/types'
import { cn } from '@/lib/utils'

const ESTADOS: { value: EstadoRadicado | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'RADICADO',   label: 'Radicado' },
  { value: 'EN_TRAMITE', label: 'En Trámite' },
  { value: 'RESPONDIDO', label: 'Respondido' },
  { value: 'CERRADO',    label: 'Cerrado' },
  { value: 'ANULADO',    label: 'Anulado' },
]

const PER_PAGE_OPTIONS = [10, 20, 50]

const TABS: { value: 'todos' | 'cdr'; label: string }[] = [
  { value: 'todos', label: 'Todos los radicados' },
  { value: 'cdr',   label: 'Solicitudes CDR' },
]

// Cada cuánto se refresca el contador de solicitudes CDR pendientes (mismo
// intervalo que la campanita de notificaciones, ver NotificacionesPanel).
const POLL_INTERVAL_CDR = 30_000

const FILTROS_INIT: RadicadoFiltros = {
  page: 1,
  per_page: 20,
  nro_radicado: '',
  estado: '',
  fecha_desde: '',
  fecha_hasta: '',
  remitente: '',
}

// ── Skeleton row ───────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-slate-200 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ── Badge procedencia ──────────────────────────────────────────────
function ProcedenciaBadge({ valor }: { valor: 'EXTERNO' | 'INTERNO' }) {
  return (
    <span className={cn(
      'text-[10px] px-1.5 py-0.5 rounded font-semibold border',
      valor === 'EXTERNO'
        ? 'bg-purple-50 text-purple-700 border-purple-200'
        : 'bg-teal-50 text-teal-700 border-teal-200',
    )}>
      {valor === 'EXTERNO' ? 'EXT' : 'INT'}
    </span>
  )
}

export default function RadicadoListado() {
  const { dependencias, tiposCorrespondencia } = useCatalogoStore()
  const user = useAuthStore(s => s.user)
  const esFuncionario = user?.role?.nombre === 'FUNCIONARIO'

  // Un FUNCIONARIO solo ve lo que le corresponde responder — el filtro
  // 'asignados_a_mi' queda forzado y no se le ofrece la opción de quitarlo.
  const filtrosBase: RadicadoFiltros = esFuncionario
    ? { ...FILTROS_INIT, asignados_a_mi: true }
    : FILTROS_INIT

  const [filtros, setFiltros] = useState<RadicadoFiltros>(filtrosBase)
  const [filtrosAplicados, setFiltrosAplicados] = useState<RadicadoFiltros>(filtrosBase)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filas, setFilas] = useState<RadicadoListItem[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 })
  const [cargando, setCargando] = useState(false)
  const [cdrPendientes, setCdrPendientes] = useState(0)

  const cargar = useCallback(async (f: RadicadoFiltros) => {
    setCargando(true)
    try {
      const resp = await radicadoService.listar(f)
      setFilas(resp.data ?? [])
      if (resp.meta) setMeta(resp.meta)
    } catch {
      toast.error('Error al cargar los radicados')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(filtrosAplicados)
  }, [filtrosAplicados, cargar])

  // Contador de solicitudes CDR aún no atendidas (estado inicial RADICADO),
  // para el badge del tab "Solicitudes CDR" — independiente del tab activo.
  useEffect(() => {
    if (esFuncionario) return
    let cancelado = false
    const fetchPendientes = async () => {
      try {
        const resp = await radicadoService.listar({ solo_cdr: true, estado: 'RADICADO', per_page: 1 })
        if (!cancelado) setCdrPendientes(resp.meta?.total ?? 0)
      } catch { /* silencioso */ }
    }
    fetchPendientes()
    const id = setInterval(fetchPendientes, POLL_INTERVAL_CDR)
    return () => { cancelado = true; clearInterval(id) }
  }, [esFuncionario])

  const aplicarFiltros = () => {
    const nuevo = { ...filtros, page: 1 }
    setFiltrosAplicados(nuevo)
  }

  const limpiarFiltros = () => {
    setFiltros(filtrosBase)
    setFiltrosAplicados(filtrosBase)
  }

  const cambiarPagina = (pagina: number) => {
    const nuevo = { ...filtrosAplicados, page: pagina }
    setFiltrosAplicados(nuevo)
  }

  const cambiarPerPage = (perPage: number) => {
    const nuevo = { ...filtrosAplicados, per_page: perPage, page: 1 }
    setFiltros(prev => ({ ...prev, per_page: perPage }))
    setFiltrosAplicados(nuevo)
  }

  const setFiltro = <K extends keyof RadicadoFiltros>(key: K, value: RadicadoFiltros[K]) => {
    setFiltros(prev => ({ ...prev, [key]: value }))
  }

  const tabActivo: 'todos' | 'cdr' = filtrosAplicados.solo_cdr ? 'cdr' : 'todos'

  const cambiarTab = (tab: 'todos' | 'cdr') => {
    const nuevo = { ...filtros, solo_cdr: tab === 'cdr' ? true : undefined, page: 1 }
    setFiltros(nuevo)
    setFiltrosAplicados(nuevo)
  }

  const hayFiltrosActivos = Boolean(
    filtrosAplicados.nro_radicado || filtrosAplicados.estado ||
    filtrosAplicados.fecha_desde || filtrosAplicados.fecha_hasta ||
    filtrosAplicados.remitente || filtrosAplicados.tipo_correspondencia_id ||
    filtrosAplicados.dependencia_destino_id
  )

  const formatFecha = (fecha: string) => {
    try { return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es }) }
    catch { return fecha }
  }

  // Paginación — páginas visibles
  const paginasVisibles = (): (number | '...')[] => {
    const { current_page: cur, last_page: last } = meta
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (cur > 3) pages.push('...')
    for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) pages.push(i)
    if (cur < last - 2) pages.push('...')
    pages.push(last)
    return pages
  }

  return (
    <AppLayout subtitle={esFuncionario ? 'Mis Radicados' : 'Consultar Radicados'}>
      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto w-full">

        {/* ── Encabezado ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{esFuncionario ? 'Mis Radicados' : 'Radicados'}</h1>
            <p className="text-sm text-slate-300">
              {cargando ? 'Cargando...' : `${(meta.total ?? 0).toLocaleString()} registro${(meta.total ?? 0) !== 1 ? 's' : ''} encontrado${(meta.total ?? 0) !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cargar(filtrosAplicados)}
              disabled={cargando}
              title="Recargar"
              className="p-2 border border-white/20 rounded-xl text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={cn('w-4 h-4', cargando && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={() => setMostrarFiltros(v => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                mostrarFiltros || hayFiltrosActivos
                  ? 'bg-[#C8A800] text-[#0B1220] border-[#C8A800]'
                  : 'border-white/20 text-slate-200 hover:bg-white/10',
              )}
            >
              <FunnelIcon className="w-4 h-4" />
              Filtros
              {hayFiltrosActivos && (
                <span className="w-4 h-4 rounded-full bg-[#C8A800] text-[#0B1220] text-[9px] font-bold flex items-center justify-center">
                  •
                </span>
              )}
            </button>
            {!esFuncionario && (
              <Link
                to="/radicados/nuevo"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Nuevo Radicado
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        {!esFuncionario && (
          <div className="flex items-center gap-1 border-b border-white/10">
            {TABS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => cambiarTab(t.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  tabActivo === t.value
                    ? 'border-[#C8A800] text-[#C8A800]'
                    : 'border-transparent text-slate-300 hover:text-white',
                )}
              >
                {t.label}
                {t.value === 'cdr' && cdrPendientes > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {cdrPendientes > 99 ? '99+' : cdrPendientes}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Barra de búsqueda rápida ───────────────────────────── */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filtros.nro_radicado ?? ''}
              onChange={e => setFiltro('nro_radicado', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
              placeholder="Buscar por número (ej: 2026-000123)..."
              maxLength={15}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
            />
          </div>
          <select
            value={filtros.estado ?? ''}
            onChange={e => { setFiltro('estado', e.target.value as EstadoRadicado | ''); aplicarFiltros() }}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
          >
            {ESTADOS.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={aplicarFiltros}
            className="px-4 py-2 bg-[#C8A800] hover:bg-[#0B1220] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Buscar
          </button>
        </div>

        {/* ── Filtros avanzados ──────────────────────────────────── */}
        {mostrarFiltros && (
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Fecha desde</span>
                <input
                  type="date"
                  value={filtros.fecha_desde ?? ''}
                  onChange={e => setFiltro('fecha_desde', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Fecha hasta</span>
                <input
                  type="date"
                  value={filtros.fecha_hasta ?? ''}
                  onChange={e => setFiltro('fecha_hasta', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Remitente</span>
                <input
                  type="text"
                  value={filtros.remitente ?? ''}
                  onChange={e => setFiltro('remitente', e.target.value)}
                  placeholder="Nombre o NIT..."
                  maxLength={60}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Tipo correspondencia</span>
                <select
                  value={filtros.tipo_correspondencia_id ?? ''}
                  onChange={e => setFiltro('tipo_correspondencia_id', e.target.value ? Number(e.target.value) : undefined)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                >
                  <option value="">Todos</option>
                  {tiposCorrespondencia.map(t => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Dependencia destino</span>
                <select
                  value={filtros.dependencia_destino_id ?? ''}
                  onChange={e => setFiltro('dependencia_destino_id', e.target.value ? Number(e.target.value) : undefined)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                >
                  <option value="">Todas</option>
                  {dependencias.map(d => (
                    <option key={d.id} value={d.id}>{d.descripcion}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={aplicarFiltros}
                className="px-4 py-2 bg-[#C8A800] hover:bg-[#0B1220] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Aplicar filtros
              </button>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-500">Exportar:</span>
                <button
                  type="button"
                  title="Exportar Excel"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50 rounded-lg text-xs font-medium transition-colors"
                >
                  <DocumentArrowDownIcon className="w-3.5 h-3.5" /> Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabla ─────────────────────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0B1220] text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                    Nro. Radicado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Remitente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Tipo Correspondencia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Dependencia Destino
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                    PDFs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  Array.from({ length: filtrosAplicados.per_page ?? 10 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <MagnifyingGlassIcon className="w-10 h-10" />
                        <p className="font-medium">No se encontraron radicados</p>
                        {hayFiltrosActivos && (
                          <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="text-sm text-[#C8A800] hover:underline"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filas.map((fila, idx) => (
                    <tr
                      key={fila.id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-blue-50/40 transition-colors',
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                      )}
                    >
                      {/* Número radicado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ProcedenciaBadge valor={fila.procedencia} />
                          <span className="font-mono font-bold text-[#0B1220] text-sm">
                            {formatNumeroRadicado(fila.nro_radicado, fila.año_radicado)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fila.hora_radicacion}</p>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-700">{formatFecha(fila.fecha_radicacion)}</span>
                      </td>

                      {/* Remitente */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-slate-800 font-medium truncate" title={fila.remitente_display}>
                          {fila.remitente_display}
                        </p>
                        {fila.nombre_persona_empresa && (
                          <p className="text-[11px] text-slate-400 truncate" title={fila.nombre_persona_empresa}>
                            {fila.nombre_persona_empresa}
                          </p>
                        )}
                      </td>

                      {/* Tipo correspondencia */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-slate-700 truncate" title={fila.tipo_correspondencia_descripcion}>
                          {fila.tipo_correspondencia_descripcion}
                        </p>
                        {fila.aux_descripcion && (
                          <div className="relative group/aux mt-0.5">
                            <p className="text-[11px] text-slate-400 truncate cursor-default">
                              {fila.aux_descripcion}
                            </p>
                            <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden w-max max-w-xs rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover/aux:block">
                              {fila.aux_descripcion}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Dependencia destino */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-slate-700 truncate" title={fila.dependencia_destino_descripcion}>
                          {fila.dependencia_destino_descripcion}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {fila.operador_nombre}
                        </p>
                      </td>

                      {/* PDFs */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <span title={fila.tiene_pdf_entrada ? 'PDF Entrada' : 'Sin PDF entrada'}>
                            {fila.tiene_pdf_entrada
                              ? <DocumentCheckIcon className="w-4 h-4 text-green-500" />
                              : <DocumentIcon className="w-4 h-4 text-slate-300" />
                            }
                          </span>
                          <span title={fila.tiene_pdf_salida ? 'PDF Salida' : 'Sin PDF salida'}>
                            {fila.tiene_pdf_salida
                              ? <DocumentCheckIcon className="w-4 h-4 text-blue-500" />
                              : <DocumentIcon className="w-4 h-4 text-slate-300" />
                            }
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <EstadoBadge estado={fila.estado_codigo} />
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/radicados/${fila.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#C8A800] border border-[#C8A800]/30 rounded-lg hover:bg-[#C8A800] hover:text-white transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginación ──────────────────────────────────────── */}
          {!cargando && filas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              {/* Info + per page */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Mostrando {((meta.current_page - 1) * meta.per_page) + 1}
                  –{Math.min(meta.current_page * meta.per_page, meta.total ?? 0)} de {(meta.total ?? 0).toLocaleString()}
                </span>
                <select
                  value={meta.per_page}
                  onChange={e => cambiarPerPage(Number(e.target.value))}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none"
                >
                  {PER_PAGE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} por página</option>
                  ))}
                </select>
              </div>

              {/* Páginas */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cambiarPagina(meta.current_page - 1)}
                  disabled={meta.current_page === 1}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>

                {paginasVisibles().map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="px-2 text-slate-400 text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => cambiarPagina(p as number)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                        p === meta.current_page
                          ? 'bg-[#0B1220] text-white'
                          : 'border border-slate-300 text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => cambiarPagina(meta.current_page + 1)}
                  disabled={meta.current_page === meta.last_page}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
