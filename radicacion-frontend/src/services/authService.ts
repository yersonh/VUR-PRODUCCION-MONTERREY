import api from './api'
import type { AuthResponse } from '@/types'

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
}
