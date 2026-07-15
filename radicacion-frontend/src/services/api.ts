import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Laravel devuelve paginación plana (current_page, total, etc. en la raíz).
// Este helper la transforma al shape { data, meta } que usa el frontend.
export function parsePaginated<T>(raw: Record<string, unknown>): { data: T[]; meta: { current_page: number; last_page: number; total: number; per_page: number } } {
  return {
    data: raw.data as T[],
    meta: {
      current_page: raw.current_page as number,
      last_page:    raw.last_page as number,
      total:        raw.total as number,
      per_page:     raw.per_page as number,
    },
  }
}

// Abre un documento de la API en una pestaña nueva. Un <a href> plano no
// sirve aquí: el backend exige Bearer token (esta SPA no usa cookies de
// Sanctum) y la ruta es relativa a VITE_API_URL, no al origen del frontend —
// un <a>/window.open directo ni pega al backend correcto ni lleva el token.
// Se abre la pestaña primero (sync, dentro del gesto del usuario) para que
// el navegador no la bloquee como popup mientras se espera el fetch.
//
// Los anexos pueden ser PDF o imagen (ver reglas de subida en el backend) —
// se usa el Content-Type real que devuelve la respuesta en vez de forzar
// 'application/pdf', porque si no el navegador intenta abrir una imagen con
// su visor de PDF y falla con "No se pudo cargar el documento PDF".
export async function abrirPdfEnNuevaVentana(path: string): Promise<void> {
  const ventana = window.open('', '_blank')
  try {
    const res = await api.get(path, { responseType: 'blob' })
    const tipo = (res.headers['content-type'] as string | undefined) ?? 'application/pdf'
    const blobUrl = URL.createObjectURL(new Blob([res.data], { type: tipo }))
    if (ventana) {
      ventana.location.href = blobUrl
    } else {
      window.open(blobUrl, '_blank')
    }
  } catch {
    ventana?.close()
    throw new Error('No se pudo abrir el documento')
  }
}
