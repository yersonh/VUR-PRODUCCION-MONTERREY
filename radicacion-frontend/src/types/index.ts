export interface User {
  id: number
  name: string
  email: string
  role_id: number
  role: Role
  dependencia_id?: number
  dependencia?: Dependencia
  funcionario_id?: number | null
  funcionario_nombre?: string | null
  activo: boolean
  tiene_foto?: boolean
  debe_cambiar_password?: boolean
}

export interface Role {
  id: number
  nombre: 'ADMIN' | 'OPERADOR' | 'FUNCIONARIO'
  descripcion?: string
}

export interface Dependencia {
  id: number
  descripcion: string
  activo: boolean
}

export interface Personal {
  id: number
  codigo: string
  nombres: string
  apellidos: string
  cargo?: string
  email?: string
  dependencia_id: number
  dependencia?: Dependencia
  activo: boolean
}

export interface TerceroContacto {
  id: number
  tercero_id: number
  nombre_completo: string
  cargo?: string
  email?: string
  telefono?: string
}

export interface Tercero {
  id: number
  codigo: string
  categoria?: 'EMPRESA' | 'CIUDADANO'
  tipo_identificacion_id: number
  tipo_identificacion?: TipoIdentificacion
  razon_social?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  direccion?: string
  telefono?: string
  email?: string
  dependencia_id?: number
  dependencia?: Dependencia
  contactos?: TerceroContacto[]
  activo: boolean
}

// Formas resueltas vía Core Institucional por RadicadoService::funcionarioInfo()
// y terceroInfo() — no confundir con los tipos `Personal`/`Tercero` locales,
// que reflejan la forma de los endpoints /admin/personal y /terceros.
export interface FuncionarioResumen {
  id: number
  cedula: string
  nombre_completo: string
  cargo?: string | null
  email?: string | null
  dependencia_id?: number | null
}

export interface TerceroResumen {
  id: number
  codigo: string
  categoria: 'EMPRESA' | 'CIUDADANO'
  nro_identificacion: string
  nombre_completo: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  tipo_documento?: string | null
}

export interface TipoCorrespondencia {
  id: number
  descripcion: string
  max_dias: number
  activo: boolean
  dependencia_destino_id: number | null
  dependencia_destino_descripcion?: string | null
}

export interface AuxTip {
  id: number
  descripcion: string
  tipo_correspondencia_id?: number | null
  zona?: 'URBANO' | 'RURAL' | null
  activo: boolean
}

export interface TipoAnexo {
  id: number
  descripcion: string
}

export interface MedioIngreso {
  id: number
  descripcion: string
}

export interface TipoIdentificacion {
  id: number
  codigo: string
  descripcion: string
}

export interface EstadoCorrespondencia {
  id: number
  codigo: EstadoRadicado
  descripcion: string
  color_hex: string
  orden: number
  es_terminal: boolean
}

export interface RadicadoDocumento {
  id: number
  radicado_id: number
  tipo: 'ENTRADA' | 'SALIDA' | 'ANEXO'
  nombre_original: string
  tamanio_bytes: number
  created_at: string
}

export interface RadicadoActuacion {
  id: number
  radicado_id: number
  descripcion: string
  estado_anterior?: EstadoCorrespondencia
  estado_nuevo: EstadoCorrespondencia
  usuario: Pick<User, 'id' | 'name'>
  created_at: string
}

export interface AnexoItem {
  descripcion: string
  tipo_id: number | null
  documento_id?: number | null
}

export interface Radicado {
  id: number
  nro_radicado: number
  año_radicado: number
  manejo: 'INFORMATIVO' | 'RESOLUTIVO'
  procedencia: 'EXTERNO' | 'INTERNO'
  fecha_radicacion: string
  hora_radicacion: string
  tipo_remitente: 'FUNCIONARIO' | 'TERCERO_NIT'
  funcionario?: FuncionarioResumen
  tercero?: TerceroResumen
  dependencia_remitente?: Dependencia
  tipo_correspondencia: TipoCorrespondencia
  aux_tip?: AuxTip
  aux_descripcion?: string
  fecha_limite?: string
  dependencia_destino?: Dependencia
  personal_destino?: FuncionarioResumen
  folios?: number
  folios_de?: number
  cantidad_anexos?: number
  tipo_anexo?: TipoAnexo
  otro_anexo?: string
  anexos?: AnexoItem[]
  nro_factura?: string
  valor_factura?: number
  fecha_documento?: string
  fecha_entrega?: string
  medio_ingreso?: MedioIngreso
  nro_guia?: string
  nombre_persona_empresa?: string
  observaciones?: string
  ia_procesado: boolean
  ia_campos_sugeridos?: Record<string, unknown>
  estado: EstadoCorrespondencia
  operador: Pick<User, 'id' | 'name'>
  documentos?: RadicadoDocumento[]
  actuaciones?: RadicadoActuacion[]
  puede_responder?: boolean
  created_at: string
}

export interface AuthResponse {
  user: User
  token: string
  message?: string
}

export type EstadoRadicado = 'RADICADO' | 'EN_TRAMITE' | 'RESPONDIDO' | 'CERRADO' | 'ANULADO'

export type TipoNotificacion = 'RADICADO_NUEVO' | 'ESTADO_CAMBIADO' | 'VENCIMIENTO' | 'RESPUESTA_CARGADA'

export interface Notificacion {
  id: number
  tipo: TipoNotificacion
  titulo: string
  mensaje: string
  radicado_id: number | null
  leida: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

export interface IACamposSugeridos {
  nombre_remitente?: string
  nro_identificacion_remitente?: string
  tipo_documento?: string
  asunto?: string
  fecha_documento?: string
  nombre_persona_empresa?: string
  observaciones?: string
  medio_probable?: string
  tiene_folios?: number
  total_folios?: number | null
  tiene_anexos?: boolean | null
  descripcion_anexos?: string[] | null
  confianza?: number
  tipo_remitente_sugerido?: 'FUNCIONARIO' | 'EMPRESA' | 'CIUDADANO' | null
  dependencia_remitente?: string | null
  cargo_remitente?: string | null
  nombre_destinatario?: string | null
  dependencia_destino?: string | null
  cargo_destinatario?: string | null
  es_solicitud_residencia?: boolean
}
