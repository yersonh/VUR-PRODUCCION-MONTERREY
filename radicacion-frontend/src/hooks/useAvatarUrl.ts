import { useEffect, useState } from 'react'
import { authService } from '@/services/authService'

/**
 * Descarga la foto de perfil del usuario autenticado como blob (el endpoint
 * requiere el Bearer token, por eso no se puede usar directamente como
 * <img src="/auth/foto">) y expone una object URL. Se revoca al desmontar
 * o cuando `tieneFoto` cambia, para no filtrar memoria.
 */
export function useAvatarUrl(tieneFoto: boolean | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!tieneFoto) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelado = false

    authService.getFoto().then(blob => {
      if (cancelado) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => {
      if (!cancelado) setUrl(null)
    })

    return () => {
      cancelado = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [tieneFoto])

  return url
}
