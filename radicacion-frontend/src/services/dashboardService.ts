import api from '@/services/api'

export interface DashboardPorEstado {
  estado_id: number
  codigo: string | null
  descripcion: string
  color_hex: string
  total: number
}

export interface DashboardItemRadicado {
  id: number
  numero_radicado: string
  remitente: string
  tipo_correspondencia: string | null
  estado: { codigo: string | null; descripcion: string | null; color_hex: string | null }
  fecha_radicacion: string | null
  fecha_limite: string | null
}

export interface DashboardPorDependencia {
  dependencia_id: number | string | null
  nombre: string
  total: number
}

export interface DashboardResumen {
  radicados_hoy: {
    total: number
    por_estado: DashboardPorEstado[]
  }
  plazos: {
    vencidos_total: number
    proximos_total: number
    vencidos: DashboardItemRadicado[]
    proximos: DashboardItemRadicado[]
  }
  por_dependencia: DashboardPorDependencia[]
  actividad_reciente: DashboardItemRadicado[]
}

export const dashboardService = {
  resumen: () => api.get<DashboardResumen>('/dashboard/resumen').then(r => r.data),
}
