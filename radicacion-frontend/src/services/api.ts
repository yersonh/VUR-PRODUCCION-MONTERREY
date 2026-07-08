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
