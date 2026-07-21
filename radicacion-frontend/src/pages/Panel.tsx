import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  InboxArrowDownIcon, ExclamationTriangleIcon, ClockIcon,
  BuildingOffice2Icon, ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { EstadoBadge } from '@/components/ui/EstadoBadge'
import { dashboardService, type DashboardResumen, type DashboardItemRadicado } from '@/services/dashboardService'
import type { EstadoRadicado } from '@/types'
import { cn } from '@/lib/utils'

function KpiCard({ icono, label, valor, sub, tono }: {
  icono: React.ReactNode; label: string; valor: React.ReactNode; sub?: string
  tono: 'oro' | 'rojo' | 'ambar' | 'teal'
}) {
  const tonos: Record<string, string> = {
    oro:   'bg-[#C8A800]/10 text-[#8a7300]',
    rojo:  'bg-red-50 text-red-600',
    ambar: 'bg-amber-50 text-amber-600',
    teal:  'bg-[#1F8C6F]/10 text-[#1F8C6F]',
  }
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', tonos[tono])}>
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#0B1220] leading-tight">{valor}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Panel_({ titulo, icono, children, accion }: {
  titulo: string; icono?: React.ReactNode; children: React.ReactNode; accion?: React.ReactNode
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#0B1220] flex items-center gap-1.5">
          {icono}{titulo}
        </h3>
        {accion}
      </div>
      {children}
    </div>
  )
}

function FilaRadicado({ item, destacarPlazo }: { item: DashboardItemRadicado; destacarPlazo?: boolean }) {
  return (
    <Link
      to={`/radicados/${item.id}`}
      className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-mono font-semibold text-[#0B1220]">{item.numero_radicado}</p>
        <p className="text-xs text-slate-500 truncate max-w-[220px]">{item.remitente || '—'}</p>
      </div>
      <div className="text-right shrink-0">
        {item.estado.codigo && <EstadoBadge estado={item.estado.codigo as EstadoRadicado} size="sm" />}
        {destacarPlazo && item.fecha_limite && (
          <p className="text-[10px] text-slate-400 mt-1">
            {new Date(item.fecha_limite).toLocaleDateString('es-CO')}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function Panel() {
  const [datos, setDatos] = useState<DashboardResumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  const cargar = () => {
    setCargando(true)
    setError(false)
    dashboardService.resumen()
      .then(setDatos)
      .catch(() => setError(true))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  return (
    <AppLayout subtitle="Dashboard">
      <div className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-300">Resumen de correspondencia — {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button
            type="button"
            onClick={cargar}
            title="Actualizar"
            className="p-2 border border-white/20 text-slate-200 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowPathIcon className={cn('w-4 h-4', cargando && 'animate-spin')} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
            No se pudo cargar el dashboard. Intenta actualizar.
          </div>
        )}

        {datos && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                icono={<InboxArrowDownIcon className="w-5 h-5" />}
                label="Radicados hoy"
                valor={datos.radicados_hoy.total}
                tono="oro"
              />
              <KpiCard
                icono={<ExclamationTriangleIcon className="w-5 h-5" />}
                label="Vencidos"
                valor={datos.plazos.vencidos_total}
                sub="Fuera de plazo, sin cerrar"
                tono="rojo"
              />
              <KpiCard
                icono={<ClockIcon className="w-5 h-5" />}
                label="Por vencer"
                valor={datos.plazos.proximos_total}
                sub="Próximos 3 días"
                tono="ambar"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Radicados de hoy por estado */}
              <Panel_ titulo="Radicados de hoy por estado">
                {datos.radicados_hoy.por_estado.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Aún no hay radicados hoy.</p>
                ) : (
                  <div className="space-y-2">
                    {datos.radicados_hoy.por_estado.map(e => (
                      <div key={e.estado_id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color_hex }} />
                          {e.descripcion}
                        </span>
                        <span className="font-semibold text-[#0B1220]">{e.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel_>

              {/* Carga por dependencia */}
              <Panel_ titulo="Carga activa por dependencia" icono={<BuildingOffice2Icon className="w-4 h-4 text-slate-400" />}>
                {datos.por_dependencia.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Sin radicados activos.</p>
                ) : (
                  <div className="space-y-2">
                    {datos.por_dependencia.map(d => {
                      const max = datos.por_dependencia[0]?.total || 1
                      return (
                        <div key={String(d.dependencia_id)}>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-slate-600 truncate">{d.nombre}</span>
                            <span className="font-semibold text-[#0B1220] shrink-0 ml-2">{d.total}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#C8A800] rounded-full" style={{ width: `${(d.total / max) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel_>

              {/* Vencidos */}
              <Panel_ titulo={`Vencidos (${datos.plazos.vencidos_total})`} icono={<ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}>
                {datos.plazos.vencidos.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Sin radicados vencidos.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {datos.plazos.vencidos.map(item => <FilaRadicado key={item.id} item={item} destacarPlazo />)}
                  </div>
                )}
              </Panel_>

              {/* Próximos a vencer */}
              <Panel_ titulo={`Próximos a vencer (${datos.plazos.proximos_total})`} icono={<ClockIcon className="w-4 h-4 text-amber-500" />}>
                {datos.plazos.proximos.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Nada por vencer en los próximos días.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {datos.plazos.proximos.map(item => <FilaRadicado key={item.id} item={item} destacarPlazo />)}
                  </div>
                )}
              </Panel_>
            </div>

            {/* Actividad reciente */}
            <Panel_ titulo="Actividad reciente">
              {datos.actividad_reciente.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Sin movimientos todavía.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {datos.actividad_reciente.map(item => <FilaRadicado key={item.id} item={item} />)}
                </div>
              )}
            </Panel_>
          </>
        )}
      </div>
    </AppLayout>
  )
}
