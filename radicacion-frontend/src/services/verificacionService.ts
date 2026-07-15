import api from './api'

export interface VerificacionDocumento {
  codigo_verificacion: string
  radicado: string
  tipo_correspondencia: string | null
  estado: string | null
  fecha_respuesta: string | null
}

export interface VerificacionResult {
  valido: boolean
  message?: string
  documento?: VerificacionDocumento
}

// Pública, sin sesión — GET /v1/verificar-respuesta/{codigo} (ver
// VerificacionPublicaController en el backend). El 404 de "código no
// encontrado" se resuelve como respuesta normal (no como excepción), para
// no chocar con el interceptor 401 de `api` que redirige a /login.
export const verificacionService = {
  async verificar(codigo: string): Promise<VerificacionResult> {
    try {
      const { data } = await api.get<VerificacionResult>(`/verificar-respuesta/${codigo}`)
      return data
    } catch (err: unknown) {
      const response = (err as { response?: { data?: VerificacionResult } })?.response
      if (response?.data) return response.data
      throw err
    }
  },
}
