import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { useAvatarUrl } from '@/hooks/useAvatarUrl'
import toast from 'react-hot-toast'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  FUNCIONARIO: 'Funcionario',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'text-[#C8A800] bg-[#C8A800]/15 border-[#C8A800]/30',
  OPERADOR: 'text-blue-300 bg-blue-400/15 border-blue-400/30',
  FUNCIONARIO: 'text-slate-300 bg-slate-400/15 border-slate-400/30',
}

// ── Modal de confirmación de cierre de sesión ──────────────────────
function LogoutModal({ userName, onConfirm, onCancel, loading }: {
  userName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(5, 10, 25, 0.75)', backdropFilter: 'blur(6px)' }}
        onClick={!loading ? onCancel : undefined}
      >
        {/* Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm relative"
          style={{
            background: 'rgba(10, 20, 48, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,50,50,0.1)',
          }}
        >
          {/* Franja roja superior */}
          <div
            className="h-0.5 rounded-t-[20px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.8), transparent)' }}
          />

          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-all disabled:opacity-40"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          <div className="px-7 pt-7 pb-6">
            {/* Icono */}
            <div className="flex justify-center mb-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  boxShadow: '0 0 30px rgba(239,68,68,0.1)',
                }}
              >
                <ArrowRightOnRectangleIcon className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Texto */}
            <h3 className="text-white font-bold text-lg text-center leading-snug">
              ¿Cerrar sesión?
            </h3>
            <p className="text-white/50 text-sm text-center mt-2 leading-relaxed">
              Vas a cerrar la sesión de{' '}
              <span className="text-white/80 font-semibold">{userName}</span>.
              <br />Tendrás que volver a ingresar tus credenciales.
            </p>

            {/* Aviso */}
            <div
              className="mt-4 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl"
              style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.15)' }}
            >
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400/70 shrink-0 mt-0.5" />
              <p className="text-yellow-200/60 text-xs leading-relaxed">
                Los cambios no guardados se perderán al cerrar sesión.
              </p>
            </div>

            {/* Botones */}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-all duration-150 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all duration-150 disabled:opacity-70 active:scale-[0.97]"
                style={{
                  background: loading
                    ? 'rgba(239,68,68,0.3)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(220,38,38,0.35)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cerrando...
                  </span>
                ) : (
                  'Sí, cerrar sesión'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Modal de vista previa de foto de perfil ────────────────────────
function FotoPreviewModal({ imageUrl, onConfirm, onCancel, loading }: {
  imageUrl: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(5, 10, 25, 0.75)', backdropFilter: 'blur(6px)' }}
        onClick={!loading ? onCancel : undefined}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm relative"
          style={{
            background: 'rgba(10, 20, 48, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,168,0,0.1)',
          }}
        >
          <div
            className="h-0.5 rounded-t-[20px]"
            style={{ background: 'linear-gradient(90deg, transparent, #C8A800, transparent)' }}
          />

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-all disabled:opacity-40"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          <div className="px-7 pt-7 pb-6">
            <h3 className="text-white font-bold text-lg text-center leading-snug">
              Actualizar foto de perfil
            </h3>
            <p className="text-white/50 text-sm text-center mt-1">
              Así se verá tu nueva foto
            </p>

            <div className="flex justify-center my-5">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#C8A800]/60 shadow-lg">
                <img src={imageUrl} alt="Vista previa" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-all duration-150 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-[#0B1220] transition-all duration-150 disabled:opacity-70 active:scale-[0.97]"
                style={{
                  background: loading ? 'rgba(200,168,0,0.4)' : '#C8A800',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(200,168,0,0.35)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  'Guardar foto'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── UserMenu principal ─────────────────────────────────────────────
export function UserMenu() {
  const { user, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const avatarUrl = useAvatarUrl(user?.tiene_foto)

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() ?? '??'

  const roleName = user?.role?.nombre ?? ''
  const roleLabel = ROLE_LABELS[roleName] ?? roleName
  const roleColor = ROLE_COLORS[roleName] ?? ROLE_COLORS.FUNCIONARIO

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewFile(null)
  }

  const handleConfirmarFoto = async () => {
    if (!previewFile) return

    setSubiendoFoto(true)
    try {
      const updatedUser = await authService.subirFoto(previewFile)
      setUser(updatedUser)
      toast.success('Foto de perfil actualizada')
      closePreview()
    } catch {
      toast.error('No se pudo actualizar la foto de perfil')
    } finally {
      setSubiendoFoto(false)
    }
  }

  const handleEliminarFoto = async () => {
    setSubiendoFoto(true)
    try {
      const updatedUser = await authService.eliminarFoto()
      setUser(updatedUser)
      toast.success('Foto de perfil eliminada')
    } catch {
      toast.error('No se pudo eliminar la foto de perfil')
    } finally {
      setSubiendoFoto(false)
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const handleConfirmLogout = async () => {
    setLoggingOut(true)
    try { await authService.logout() } catch { /* ignore */ }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`
            flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl
            border transition-all duration-200
            ${open
              ? 'bg-white/15 border-white/25'
              : 'bg-white/0 border-white/0 hover:bg-white/10 hover:border-white/15'
            }
          `}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C8A800] to-[#0B1220] border-2 border-[#C8A800]/70 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-md overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-white text-xs font-semibold leading-none max-w-[120px] truncate">
              {user?.name}
            </p>
            <p className="text-[#C8A800]/80 text-[10px] mt-0.5 font-medium">{roleLabel}</p>
          </div>
          <ChevronDownIcon
            className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-72 z-50"
              style={{
                background: 'rgba(10, 20, 45, 0.90)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,168,0,0.08)',
              }}
            >
              <div
                className="h-0.5 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, transparent, #C8A800, transparent)' }}
              />

              {/* Info */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C8A800] to-[#0B1220] border-2 border-[#C8A800]/60 flex items-center justify-center text-white text-lg font-bold shadow-lg overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={subiendoFoto}
                      title="Cambiar foto de perfil"
                      aria-label="Cambiar foto de perfil"
                      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#C8A800] border-2 border-[#0B1220] flex items-center justify-center shadow-md hover:bg-[#dab900] transition-colors disabled:opacity-50"
                    >
                      <CameraIcon className="w-2.5 h-2.5 text-[#0B1220]" strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-sm leading-snug truncate">{user?.name}</p>
                    <p className="text-blue-300/70 text-[11px] truncate mt-0.5">{user?.email}</p>
                    <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleColor}`}>
                      <ShieldCheckIcon className="w-3 h-3" />
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {user?.dependencia && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/8">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Dependencia</p>
                    <p className="text-white/75 text-xs mt-0.5 font-medium">{user.dependencia.descripcion}</p>
                  </div>
                )}
              </div>

              <div className="mx-4 h-px bg-white/8" />

              <div className="p-3">
                {user?.tiene_foto && (
                  <button
                    type="button"
                    onClick={handleEliminarFoto}
                    disabled={subiendoFoto}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200/70 hover:text-white hover:bg-white/8 transition-all duration-150 text-sm disabled:opacity-50 disabled:cursor-wait"
                  >
                    {subiendoFoto ? (
                      <svg className="w-4.5 h-4.5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <CameraIcon className="w-4.5 h-4.5 shrink-0" />
                    )}
                    <span className="font-medium">{subiendoFoto ? 'Quitando foto...' : 'Quitar foto de perfil'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setOpen(false); setShowLogoutModal(true) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150 text-sm"
                >
                  <ArrowRightOnRectangleIcon className="w-4.5 h-4.5 shrink-0" />
                  <span className="font-medium">Cerrar sesión</span>
                </button>
              </div>

              <div className="px-5 pb-3 text-center">
                <p className="text-white/20 text-[10px]">Sistema de Radicación · v2.1</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de confirmación */}
      {showLogoutModal && (
        <LogoutModal
          userName={user?.name ?? ''}
          loading={loggingOut}
          onConfirm={handleConfirmLogout}
          onCancel={() => !loggingOut && setShowLogoutModal(false)}
        />
      )}

      {/* Modal de vista previa de foto */}
      {previewUrl && (
        <FotoPreviewModal
          imageUrl={previewUrl}
          loading={subiendoFoto}
          onConfirm={handleConfirmarFoto}
          onCancel={() => !subiendoFoto && closePreview()}
        />
      )}
    </>
  )
}
