import api from './api'
import type { AuthResponse, User } from '@/types'

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    return data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async me(): Promise<AuthResponse['user']> {
    const { data } = await api.get('/auth/me')
    return data
  },

  async getFoto(): Promise<Blob> {
    const { data } = await api.get('/auth/foto', { responseType: 'blob' })
    return data
  },

  async subirFoto(file: File): Promise<User> {
    const formData = new FormData()
    formData.append('foto', file)
    const { data } = await api.post('/auth/foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.user
  },

  async eliminarFoto(): Promise<User> {
    const { data } = await api.delete('/auth/foto')
    return data.user
  },

  async cambiarPassword(passwordActual: string, passwordNueva: string): Promise<User> {
    const { data } = await api.post('/auth/cambiar-password', {
      password_actual: passwordActual,
      password_nueva: passwordNueva,
      password_nueva_confirmation: passwordNueva,
    })
    return data.user
  },
}
