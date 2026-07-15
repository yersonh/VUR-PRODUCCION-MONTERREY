import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ChartBarIcon, ArrowDownTrayIcon, ClockIcon, ExclamationTriangleIcon,
  CheckCircleIcon, DocumentTextIcon, XCircleIcon,
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { AppLayout } from '@/components/layout/AppLayout'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { reportesAdmin, type ReporteData, type ReporteFiltros } from '@/services/reportesService'
import { useCatalogoStore } from '@/store/catalogoStore'
import { cn } from '@/lib/utils'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler)

const hoy = () => new Date().toISOString().slice(0, 10)
const haceDias = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function KpiCard({ icono, label, valor, sub, tono }: { icono: React.ReactNode; label: string; valor: string; sub?: string; tono: 'azul' | 'rojo' | 'verde' | 'ambar' }) {
  const tonos = {
    azul:  'bg-blue-50 text-blue-700 border-blue-200',
    rojo:  'bg-red-50 text-red-700 border-red-200',
    verde: 'bg-green-50 text-green-700 border-green-200',
    ambar: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div className={cn('rounded-2xl border p-4 flex items-center gap-3', tonos[tono])}>
      <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">{icono}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70 truncate">{label}</p>
        <p className="text-xl font-bold leading-tight">{valor}</p>
        {sub && <p className="text-[10px] opacity-60 leading-tight mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{titulo}</h3>
      {children}
    </div>
  )
}

function TablaResumen({ filas, columnas }: { filas: (string | number)[][]; columnas: string[] }) {
  if (filas.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">Sin datos en el rango seleccionado</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
            {columnas.map(c => <th key={c} className="pb-2 pr-4 font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              {fila.map((v, j) => <td key={j} className="py-2 pr-4 text-slate-700">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportesAdmin() {
  const estadosCorrespondencia = useCatalogoStore(s => s.estadosCorrespondencia)
  const tiposCorrespondencia = useCatalogoStore(s => s.tiposCorrespondencia)
  const dependencias = useCatalogoStore(s => s.dependencias)

  const [filtros, setFiltros] = useState<ReporteFiltros>({ fecha_desde: haceDias(89), fecha_hasta: hoy() })
  const [datos, setDatos] = useState<ReporteData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)

  const cargar = useCallback(async (f: ReporteFiltros) => {
    setCargando(true)
    try {
      const res = await reportesAdmin.obtener(f)
      setDatos(res)
    } catch {
      toast.error('Error al cargar el reporte')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar(filtros) }, [filtros, cargar])

  const exportar = async () => {
    setExportando(true)
    try {
      await reportesAdmin.exportarCsv(filtros)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  const setFiltro = (k: keyof ReporteFiltros, v: string) => {
    setFiltros(f => ({ ...f, [k]: v === '' ? undefined : (k.endsWith('_id') ? Number(v) : v) }))
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }}
        className="p-6 w-full space-y-5"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6 text-[#C8A800]" />
            <h1 className="text-lg font-bold text-slate-800">Reportes</h1>
          </div>
          <button
            type="button"
            onClick={exportar}
            disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B1220] hover:bg-[#060911] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-desde">Desde</label>
            <input id="rp-desde" type="date" value={filtros.fecha_desde ?? ''} onChange={e => setFiltro('fecha_desde', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-hasta">Hasta</label>
            <input id="rp-hasta" type="date" value={filtros.fecha_hasta ?? ''} onChange={e => setFiltro('fecha_hasta', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-estado">Estado</label>
            <select id="rp-estado" value={filtros.estado_id ?? ''} onChange={e => setFiltro('estado_id', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]">
              <option value="">Todos</option>
              {estadosCorrespondencia.map(e => <option key={e.id} value={e.id}>{e.descripcion}</option>)}
            </select>
          </div>
          <div className="w-56">
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-tipo">Tipo correspondencia</label>
            <SearchableSelect
              id="rp-tipo"
              value={filtros.tipo_correspondencia_id}
              onChange={v => setFiltro('tipo_correspondencia_id', v)}
              options={tiposCorrespondencia.map(t => ({ value: t.id, label: t.descripcion }))}
              placeholder="Buscar tipo..."
              allLabel="Todos"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-dep">Dependencia destino</label>
            <select id="rp-dep" value={filtros.dependencia_destino_id ?? ''} onChange={e => setFiltro('dependencia_destino_id', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]">
              <option value="">Todas</option>
              {dependencias.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
            </select>
          </div>
        </div>

        {cargando && !datos ? (
          <div className="py-24 text-center text-slate-400 text-sm">Cargando reporte...</div>
        ) : datos && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <KpiCard icono={<DocumentTextIcon className="w-5 h-5" />} label="Total radicados" valor={String(datos.kpis.total)} tono="azul" />
              <KpiCard icono={<ClockIcon className="w-5 h-5" />} label="En trámite" valor={String(datos.por_estado.find(e => e.codigo === 'EN_TRAMITE')?.total ?? 0)} tono="ambar" />
              <KpiCard icono={<ExclamationTriangleIcon className="w-5 h-5" />} label="Vencidos" valor={String(datos.kpis.vencidos)} sub="Sin responder y ya pasó el plazo" tono="rojo" />
              <KpiCard icono={<XCircleIcon className="w-5 h-5" />} label="Anulados" valor={String(datos.sla.anulados)} tono="rojo" />
              <KpiCard icono={<ClockIcon className="w-5 h-5" />} label="Prom. días de respuesta" valor={datos.kpis.promedio_dias_respuesta != null ? `${datos.kpis.promedio_dias_respuesta} días` : '—'} tono="ambar" />
              <KpiCard
                icono={<CheckCircleIcon className="w-5 h-5" />}
                label="Cumplimiento SLA (de los respondidos)"
                valor={datos.sla.cumplimiento_pct != null ? `${datos.sla.cumplimiento_pct}%` : 'Sin respuestas aún'}
                sub={`${datos.sla.respondidos_a_tiempo} de ${datos.sla.total_respondidos} respondidos a tiempo — de ${datos.kpis.total} radicados, solo ${datos.sla.total_respondidos} tienen respuesta`}
                tono="verde"
              />
            </div>

            {/* Serie de tiempo */}
            <Panel titulo="Radicados por día">
              {datos.serie_tiempo.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Sin datos en el rango seleccionado</p>
              ) : (
                <Line
                  data={{
                    labels: datos.serie_tiempo.map(p => p.fecha),
                    datasets: [{
                      label: 'Radicados',
                      data: datos.serie_tiempo.map(p => p.total),
                      borderColor: '#C8A800',
                      backgroundColor: 'rgba(200,168,0,0.15)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 2,
                    }],
                  }}
                  options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }}
                  height={90}
                />
              )}
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Por estado */}
              <Panel titulo="Por estado">
                {datos.por_estado.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Sin datos</p>
                ) : (
                  <div className="max-w-xs mx-auto">
                    <Doughnut
                      data={{
                        labels: datos.por_estado.map(e => e.descripcion),
                        datasets: [{
                          data: datos.por_estado.map(e => e.total),
                          backgroundColor: datos.por_estado.map(e => e.color_hex),
                        }],
                      }}
                      options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }}
                    />
                  </div>
                )}
              </Panel>

              {/* Por tipo de correspondencia (con cumplimiento) */}
              <Panel titulo="Por tipo de correspondencia">
                <TablaResumen
                  columnas={['Tipo', 'Total', 'Vencidos', 'Cumplimiento']}
                  filas={datos.por_tipo.map(t => [t.descripcion, t.total, t.vencidos, `${t.cumplimiento_pct}%`])}
                />
              </Panel>

              {/* Por dependencia */}
              <Panel titulo="Carga por dependencia destino">
                {datos.por_dependencia.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Sin datos</p>
                ) : (
                  <Bar
                    data={{
                      labels: datos.por_dependencia.slice(0, 10).map(d => d.nombre),
                      datasets: [{ label: 'Radicados', data: datos.por_dependencia.slice(0, 10).map(d => d.total), backgroundColor: '#1F8C6F' }],
                    }}
                    options={{ indexAxis: 'y' as const, responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }}
                  />
                )}
              </Panel>

              {/* Por operador */}
              <Panel titulo="Radicados por operador">
                <TablaResumen
                  columnas={['Operador', 'Total']}
                  filas={datos.por_operador.map(o => [o.nombre, o.total])}
                />
              </Panel>

              {/* Por funcionario destino (top 10) */}
              <Panel titulo="Top 10 funcionarios destino">
                <TablaResumen
                  columnas={['Funcionario', 'Total']}
                  filas={datos.por_funcionario.map(f => [f.nombre, f.total])}
                />
              </Panel>

              {/* Por medio de ingreso */}
              <Panel titulo="Por medio de ingreso">
                {datos.por_medio_ingreso.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Sin datos</p>
                ) : (
                  <div className="max-w-xs mx-auto">
                    <Doughnut
                      data={{
                        labels: datos.por_medio_ingreso.map(m => m.descripcion),
                        datasets: [{
                          data: datos.por_medio_ingreso.map(m => m.total),
                          backgroundColor: ['#0B1220', '#C8A800', '#1F8C6F', '#2B5BA8', '#DC2626', '#F59E0B'],
                        }],
                      }}
                      options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }}
                    />
                  </div>
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel titulo="Procedencia (interno / externo)">
                <TablaResumen columnas={['Procedencia', 'Total']} filas={datos.por_procedencia.map(p => [p.valor, p.total])} />
              </Panel>
              <Panel titulo="Manejo (informativo / resolutivo)">
                <TablaResumen columnas={['Manejo', 'Total']} filas={datos.por_manejo.map(p => [p.valor, p.total])} />
              </Panel>
            </div>

            {/* SLA detalle */}
            <Panel titulo="Cumplimiento de plazos (SLA)">
              <p className="text-xs text-slate-500 -mt-1 mb-4">
                Solo cuenta como <strong>cumplido</strong> un radicado que llegó a estado <strong>Respondido</strong> dentro de su fecha límite.
                Cerrado (sin respuesta, cierre administrativo del CDR) y Anulado no cuentan como respuesta, así que se muestran aparte,
                no como "cumplidos".
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{datos.sla.respondidos_a_tiempo}</p>
                  <p className="text-xs text-slate-500">Respondidos a tiempo</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{datos.sla.respondidos_fuera_plazo}</p>
                  <p className="text-xs text-slate-500">Respondidos fuera de plazo</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-500">{datos.sla.cerrados_sin_respuesta}</p>
                  <p className="text-xs text-slate-500">Cerrados sin respuesta</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-400">{datos.sla.anulados}</p>
                  <p className="text-xs text-slate-500">Anulados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{datos.sla.pendientes_en_plazo}</p>
                  <p className="text-xs text-slate-500">Pendientes, aún en plazo</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">{datos.sla.pendientes_vencidos}</p>
                  <p className="text-xs text-slate-500">Pendientes, ya vencidos</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <p className="text-lg font-bold text-slate-700">{datos.sla.promedio_dias != null ? `${datos.sla.promedio_dias} días` : '—'}</p>
                <p className="text-xs text-slate-500">Tiempo promedio de respuesta (radicación → Respondido)</p>
              </div>
            </Panel>
          </>
        )}
      </motion.div>
    </AppLayout>
  )
}
