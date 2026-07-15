import api from '@/services/api'

export interface ReporteFiltros {
  fecha_desde?: string
  fecha_hasta?: string
  estado_id?: number
  tipo_correspondencia_id?: number
  dependencia_destino_id?: number
  operador_id?: number
}

export interface ReporteKpis {
  total: number
  vencidos: number
  promedio_dias_respuesta: number | null
  radicados_respondidos: number
}

export interface ReportePunto { fecha: string; total: number }
export interface ReportePorEstado { estado_id: number; codigo: string | null; descripcion: string; color_hex: string; total: number }
export interface ReportePorTipo { tipo_correspondencia_id: number; descripcion: string; max_dias: number | null; total: number; vencidos: number; cumplimiento_pct: number }
export interface ReportePorDependencia { dependencia_id: number; nombre: string; total: number }
export interface ReportePorOperador { operador_id: number; nombre: string; total: number }
export interface ReportePorFuncionario { funcionario_id: number; nombre: string; total: number }
export interface ReportePorMedioIngreso { medio_ingreso_id: number; descripcion: string; total: number }
export interface ReportePorValor { valor: string; total: number }
export interface ReporteSla {
  respondidos_a_tiempo: number
  respondidos_fuera_plazo: number
  total_respondidos: number
  cerrados_sin_respuesta: number
  anulados: number
  pendientes_en_plazo: number
  pendientes_vencidos: number
  cumplimiento_pct: number | null
  promedio_dias: number | null
}

export interface ReporteData {
  filtros: { fecha_desde: string; fecha_hasta: string }
  kpis: ReporteKpis
  serie_tiempo: ReportePunto[]
  por_estado: ReportePorEstado[]
  por_tipo: ReportePorTipo[]
  por_dependencia: ReportePorDependencia[]
  por_operador: ReportePorOperador[]
  por_funcionario: ReportePorFuncionario[]
  por_medio_ingreso: ReportePorMedioIngreso[]
  por_procedencia: ReportePorValor[]
  por_manejo: ReportePorValor[]
  sla: ReporteSla
}

export const reportesAdmin = {
  obtener: (filtros: ReporteFiltros) =>
    api.get<ReporteData>('/admin/reportes', { params: filtros }).then(r => r.data),

  exportarCsv: async (filtros: ReporteFiltros) => {
    const res = await api.get('/admin/reportes/export', { params: filtros, responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'reporte-radicados.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
