import api, { parsePaginated } from '@/services/api'
import type { Radicado, PaginatedResponse, EstadoRadicado } from '@/types'

export interface RadicadoFiltros {
  page?: number
  per_page?: number
  nro_radicado?: string
  año_radicado?: number
  estado?: EstadoRadicado | ''
  fecha_desde?: string
  fecha_hasta?: string
  tipo_correspondencia_id?: number
  dependencia_destino_id?: number
  remitente?: string
  asignados_a_mi?: boolean
  solo_cdr?: boolean
}

export interface RadicadoListItem {
  id: number
  nro_radicado: number
  año_radicado: number
  fecha_radicacion: string
  hora_radicacion: string
  manejo: 'INFORMATIVO' | 'RESOLUTIVO'
  procedencia: 'EXTERNO' | 'INTERNO'
  remitente_display: string
  tipo_correspondencia_descripcion: string
  dependencia_destino_descripcion: string
  aux_descripcion?: string
  nombre_persona_empresa?: string
  estado_codigo: EstadoRadicado
  estado_descripcion: string
  operador_nombre: string
  tiene_pdf_entrada: boolean
  tiene_pdf_salida: boolean
}

const radicadoService = {
  listar: async (filtros: RadicadoFiltros = {}): Promise<PaginatedResponse<RadicadoListItem>> => {
    const params = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== '' && v != null)
    )
    const res = await api.get('/radicados', { params })
    return parsePaginated<RadicadoListItem>(res.data)
  },

  obtener: async (id: number): Promise<Radicado> => {
    const res = await api.get<{ data: Radicado }>(`/radicados/${id}`)
    return res.data.data
  },

  crear: async (formData: FormData): Promise<{ data: Radicado; numero_radicado: string }> => {
    const res = await api.post<{ data: Radicado; numero_radicado: string }>('/radicados', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  actualizar: async (id: number, formData: FormData): Promise<Radicado> => {
    const res = await api.post<{ data: Radicado }>(`/radicados/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  anular: async (id: number, motivo: string): Promise<void> => {
    await api.patch(`/radicados/${id}/anular`, { motivo })
  },

  agregarAnexos: async (id: number, formData: FormData): Promise<Radicado> => {
    const res = await api.post<{ data: Radicado }>(`/radicados/${id}/anexos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  eliminarAnexo: async (id: number, documentoId: number): Promise<Radicado> => {
    const res = await api.delete<{ data: Radicado }>(`/radicados/${id}/anexos/${documentoId}`)
    return res.data.data
  },

  exportarCsv: async (filtros: RadicadoFiltros = {}): Promise<void> => {
    const { page: _page, per_page: _perPage, ...resto } = filtros
    const params = Object.fromEntries(
      Object.entries(resto).filter(([, v]) => v !== '' && v != null)
    )
    const res = await api.get('/radicados/export', { params, responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'radicados.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export default radicadoService
