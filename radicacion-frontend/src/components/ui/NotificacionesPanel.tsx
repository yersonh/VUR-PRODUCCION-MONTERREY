import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  BellIcon,
  InboxArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { BellAlertIcon } from '@heroicons/react/24/solid'
import { notificacionService } from '@/services/notificacionService'
import type { Notificacion } from '@/types'

const POLL_INTERVAL = 30_000

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)}d`
}

const TIPO_CONFIG = {
  RADICADO_NUEVO: {
    icon: <InboxArrowDownIcon className="w-4 h-4" />,
    color: 'text-blue-400',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.2)',
  },
  ESTADO_CAMBIADO: {
    icon: <ArrowPathIcon className="w-4 h-4" />,
    color: 'text-emerald-400',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.2)',
  },
  VENCIMIENTO: {
    icon: <ExclamationTriangleIcon className="w-4 h-4" />,
    color: 'text-amber-400',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.2)',
  },
  RESPUESTA_CARGADA: {
    icon: <DocumentCheckIcon className="w-4 h-4" />,
    color: 'text-[#C8A800]',
    bg: 'rgba(200,168,0,0.12)',
    border: 'rgba(200,168,0,0.2)',
  },
  CDR_CONFLICTO: {
    icon: <ExclamationTriangleIcon className="w-4 h-4" />,
    color: 'text-red-400',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.2)',
  },
}

function NotificacionToast({ notif, onClick }: { notif: Notificacion; onClick: () => void }) {
  const cfg = TIPO_CONFIG[notif.tipo] ?? TIPO_CONFIG.ESTADO_CAMBIADO
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex gap-3 items-start text-left w-80 max-w-[90vw] rounded-xl px-4 py-3"
      style={{
        background: 'rgba(8, 18, 44, 0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
      }}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        {cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-white text-xs font-semibold leading-snug">{notif.titulo}</p>
        <p className="text-white/60 text-[11px] leading-relaxed mt-0.5 line-clamp-3">{notif.mensaje}</p>
      </div>
    </button>
  )
}

export function NotificacionesPanel() {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [cargando, setCargando] = useState(false)
  const vistasRef = useRef<Set<number> | null>(null)

  const mostrarPopup = useCallback((notif: Notificacion) => {
    toast.custom(
      (t) => (
        <div style={{ opacity: t.visible ? 1 : 0, transition: 'opacity 0.2s' }}>
          <NotificacionToast
            notif={notif}
            onClick={async () => {
              toast.dismiss(t.id)
              await notificacionService.marcarLeida(notif.id)
              setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n))
              setNoLeidas(v => Math.max(0, v - 1))
              if (notif.radicado_id) navigate(`/radicados/${notif.radicado_id}`)
            }}
          />
        </div>
      ),
      { duration: 8000, id: `notif-${notif.id}` }
    )
  }, [navigate])

  // Trae la lista completa; detecta notificaciones sin leer que no se
  // habían visto todavía y muestra un popup por cada una para que no pasen
  // desapercibidas aunque el usuario no abra la campanita.
  const fetchAll = useCallback(async (mostrarPopups: boolean) => {
    setCargando(true)
    try {
      const data = await notificacionService.listar()
      setNotifs(data)
      setNoLeidas(data.filter(n => !n.leida).length)

      if (vistasRef.current === null) {
        vistasRef.current = new Set(data.map(n => n.id))
      } else {
        const nuevas = data.filter(n => !n.leida && !vistasRef.current!.has(n.id))
        for (const notif of nuevas) {
          vistasRef.current.add(notif.id)
          if (mostrarPopups) mostrarPopup(notif)
        }
        for (const n of data) vistasRef.current.add(n.id)
      }
    } catch { /* silencioso */ } finally {
      setCargando(false)
    }
  }, [mostrarPopup])

  // Polling cada 30s: refresca el badge y dispara popups de lo nuevo
  useEffect(() => {
    fetchAll(true)
    const id = setInterval(() => fetchAll(true), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAll])

  // Al abrir el panel, refrescar sin duplicar popups (ya se muestran por polling)
  useEffect(() => {
    if (open) fetchAll(false)
  }, [open, fetchAll])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = async (notif: Notificacion) => {
    if (!notif.leida) {
      await notificacionService.marcarLeida(notif.id)
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n))
      setNoLeidas(v => Math.max(0, v - 1))
    }
    if (notif.radicado_id) {
      setOpen(false)
      navigate(`/radicados/${notif.radicado_id}`)
    }
  }

  const handleMarcarTodas = async () => {
    await notificacionService.marcarTodasLeidas()
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
    setNoLeidas(0)
  }

  return (
    <div ref={ref} className="relative">
      {/* Botón campana */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Notificaciones"
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          open ? 'text-white bg-white/15' : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        {noLeidas > 0
          ? <BellAlertIcon className="w-5 h-5 text-[#C8A800]" />
          : <BellIcon className="w-5 h-5" />
        }
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-80 z-50 flex flex-col"
            style={{
              background: 'rgba(8, 18, 44, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              maxHeight: '480px',
            }}
          >
            {/* Franja superior */}
            <div className="h-0.5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, transparent, #C8A800, transparent)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <BellIcon className="w-4 h-4 text-white/60" />
                <span className="text-white font-semibold text-sm">Notificaciones</span>
                {noLeidas > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">
                    {noLeidas} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {noLeidas > 0 && (
                  <button
                    type="button"
                    onClick={handleMarcarTodas}
                    title="Marcar todas como leídas"
                    className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(71,85,105,0.4) transparent' }}>
              {cargando ? (
                <div className="flex items-center justify-center py-10">
                  <svg className="w-5 h-5 animate-spin text-white/30" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <BellIcon className="w-8 h-8 text-white/15" />
                  <p className="text-white/30 text-xs">Sin notificaciones</p>
                </div>
              ) : (
                notifs.map(notif => {
                  const cfg = TIPO_CONFIG[notif.tipo] ?? TIPO_CONFIG.ESTADO_CAMBIADO
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleClick(notif)}
                      className={`w-full text-left px-4 py-3 border-b border-white/5 transition-all duration-150 hover:bg-white/5 flex gap-3 ${
                        notif.leida ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Ícono tipo */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.icon}
                      </div>

                      {/* Contenido */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-white text-xs font-semibold leading-snug">{notif.titulo}</p>
                          {!notif.leida && (
                            <span className="w-2 h-2 rounded-full bg-[#C8A800] shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-white/50 text-[11px] leading-relaxed mt-0.5 line-clamp-2">{notif.mensaje}</p>
                        <p className="text-white/25 text-[10px] mt-1">{tiempoRelativo(notif.created_at)}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div className="px-4 py-2.5 border-t border-white/8 text-center">
                <p className="text-white/25 text-[10px]">{notifs.length} notificaciones · Actualiza cada 30s</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
