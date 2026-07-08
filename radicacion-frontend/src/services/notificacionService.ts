import api from './api'
import type { Notificacion } from '@/types'

export const notificacionService = {
  listar: (): Promise<Notificacion[]> =>
    api.get('/notificaciones').then(r => r.data),

  noLeidas: (): Promise<number> =>
    api.get('/notificaciones/no-leidas').then(r => r.data.count),

  marcarLeida: (id: number): Promise<void> =>
    api.patch(`/notificaciones/${id}/leer`),

  marcarTodasLeidas: (): Promise<void> =>
    api.patch('/notificaciones/leer-todas'),
}
