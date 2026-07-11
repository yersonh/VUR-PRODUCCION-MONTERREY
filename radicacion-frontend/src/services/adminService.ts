import api, { parsePaginated } from '@/services/api'
import type { Dependencia, TipoCorrespondencia, AuxTip, TipoAnexo, MedioIngreso, User, Role, TipoIdentificacion } from '@/types'
import type { PaginatedResponse } from '@/types'

export interface PersonalRow {
  id: number
  codigo: string
  cedula: string
  nombres: string
  apellidos: string
  cargo?: string
  email?: string
  telefono?: string
  dependencia_id: number
  dependencia?: Dependencia
  activo: boolean
}

// ── Helper paginación ─────────────────────────────────────────────
const pg = <T>(url: string, params = {}): Promise<PaginatedResponse<T>> =>
  api.get(url, { params }).then(r => parsePaginated<T>(r.data))

// ── Dependencias ──────────────────────────────────────────────────
export const depAdmin = {
  list:   (p: object) => pg<Dependencia>('/admin/dependencias', p),
  create: (d: object) => api.post<Dependencia>('/admin/dependencias', d).then(r => r.data),
  update: (id: number, d: object) => api.put<Dependencia>(`/admin/dependencias/${id}`, d).then(r => r.data),
  toggle: (id: number) => api.patch<Dependencia>(`/admin/dependencias/${id}/toggle`).then(r => r.data),
}

// ── Tipos Correspondencia ─────────────────────────────────────────
export const tiposCorrAdmin = {
  list:   (p: object) => pg<TipoCorrespondencia>('/admin/tipos-correspondencia', p),
  create: (d: object) => api.post<TipoCorrespondencia>('/admin/tipos-correspondencia', d).then(r => r.data),
  update: (id: number, d: object) => api.put<TipoCorrespondencia>(`/admin/tipos-correspondencia/${id}`, d).then(r => r.data),
  toggle: (id: number) => api.patch<TipoCorrespondencia>(`/admin/tipos-correspondencia/${id}/toggle`).then(r => r.data),
}

// ── Usuarios ──────────────────────────────────────────────────────
export const usuariosAdmin = {
  list:   (p: object) => pg<User>('/admin/usuarios', p),
  roles:  () => api.get<Role[]>('/admin/usuarios/roles').then(r => r.data),
  create: (d: object) => api.post<User>('/admin/usuarios', d).then(r => r.data),
  update: (id: number, d: object) => api.put<User>(`/admin/usuarios/${id}`, d).then(r => r.data),
  toggle: (id: number) => api.patch<User>(`/admin/usuarios/${id}/toggle`).then(r => r.data),
}

// ── Personal ──────────────────────────────────────────────────────
export const personalAdmin = {
  list:   (p: object) => pg<PersonalRow>('/admin/personal', p),
  create: (d: object) => api.post<PersonalRow>('/admin/personal', d).then(r => r.data),
  update: (id: number, d: object) => api.put<PersonalRow>(`/admin/personal/${id}`, d).then(r => r.data),
  toggle: (id: number) => api.patch<PersonalRow>(`/admin/personal/${id}/toggle`).then(r => r.data),
}

// ── Ciudadanos (Core) ────────────────────────────────────────────
export interface CiudadanoRow {
  id: number
  codigo: string
  tipo_identificacion_id: number
  tipo_identificacion?: TipoIdentificacion
  numero_identificacion: string
  nombres: string
  apellidos: string
  telefono?: string
  email?: string
  direccion?: string
  municipio?: string
  activo: boolean
}

export const ciudadanosAdmin = {
  list:   (p: object) => pg<CiudadanoRow>('/admin/ciudadanos', p),
  create: (d: object) => api.post<CiudadanoRow>('/admin/ciudadanos', d).then(r => r.data),
  update: (id: number, d: object) => api.put<CiudadanoRow>(`/admin/ciudadanos/${id}`, d).then(r => r.data),
}

// ── Empresas (Core) — solo crear + listar, el Core no expone editar ──
export interface EmpresaRow {
  id: number
  codigo: string
  nit: string
  razon_social: string
  direccion?: string
  municipio?: string
  telefono?: string
  email?: string
  activo: boolean
}

export const empresasAdmin = {
  list:   (p: object) => pg<EmpresaRow>('/admin/empresas', p),
  create: (d: object) => api.post<EmpresaRow>('/admin/empresas', d).then(r => r.data),
}

// ── Aux Tips ──────────────────────────────────────────────────────
export const auxTipsAdmin = {
  list:   (p: object) => pg<AuxTip>('/admin/aux-tips', p),
  create: (d: object) => api.post<AuxTip>('/admin/aux-tips', d).then(r => r.data),
  update: (id: number, d: object) => api.put<AuxTip>(`/admin/aux-tips/${id}`, d).then(r => r.data),
  toggle: (id: number) => api.patch<AuxTip>(`/admin/aux-tips/${id}/toggle`).then(r => r.data),
}

// ── Tipos Anexo ───────────────────────────────────────────────────
export const tiposAnexoAdmin = {
  list:   (p: object) => pg<TipoAnexo>('/admin/tipos-anexo', p),
  create: (d: object) => api.post<TipoAnexo>('/admin/tipos-anexo', d).then(r => r.data),
  update: (id: number, d: object) => api.put<TipoAnexo>(`/admin/tipos-anexo/${id}`, d).then(r => r.data),
}

// ── Medios Ingreso ────────────────────────────────────────────────
export const mediosIngresoAdmin = {
  list:   (p: object) => pg<MedioIngreso>('/admin/medios-ingreso', p),
  create: (d: object) => api.post<MedioIngreso>('/admin/medios-ingreso', d).then(r => r.data),
  update: (id: number, d: object) => api.put<MedioIngreso>(`/admin/medios-ingreso/${id}`, d).then(r => r.data),
}
