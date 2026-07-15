import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, ExclamationCircleIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { AlcaldiaLogo } from '@/components/ui/AlcaldiaLogo'
import { cn } from '@/lib/utils'
import fondoInstitucional from '@/assets/fondo/fondo-casa.png'

const schema = z
  .object({
    password_actual: z.string().min(1, 'Ingrese la contraseña actual'),
    password_nueva: z.string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-z]/, 'Debe incluir una minúscula')
      .regex(/[A-Z]/, 'Debe incluir una mayúscula')
      .regex(/[0-9]/, 'Debe incluir un número'),
    password_confirmacion: z.string().min(1, 'Confirme la nueva contraseña'),
  })
  .refine((data) => data.password_nueva !== data.password_actual, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['password_nueva'],
  })
  .refine((data) => data.password_nueva === data.password_confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmacion'],
  })

type FormData = z.infer<typeof schema>

// ── Requisitos de contraseña segura, evaluados en vivo mientras se escribe ─
const REQUISITOS = [
  { test: (v: string) => v.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (v: string) => /[a-z]/.test(v), label: 'Una letra minúscula' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'Una letra mayúscula' },
  { test: (v: string) => /[0-9]/.test(v), label: 'Un número' },
]

function ChecklistRequisitos({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
      {REQUISITOS.map((r) => {
        const ok = r.test(password)
        return (
          <li key={r.label} className={cn('flex items-center gap-1.5 text-[11px] transition-colors', ok ? 'text-emerald-300' : 'text-white/40')}>
            {ok ? <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" /> : <XCircleIcon className="w-3.5 h-3.5 shrink-0" />}
            {r.label}
          </li>
        )
      })}
    </ul>
  )
}

function Campo({
  id, label, error, show, onToggleShow, registration,
}: {
  id: keyof FormData
  label: string
  error?: string
  show: boolean
  onToggleShow: () => void
  registration: ReturnType<typeof useForm<FormData>>['register']
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-white">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
          <LockClosedIcon className="w-4.5 h-4.5" />
        </div>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          aria-invalid={!!error}
          className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm text-white placeholder-white/30 transition-all duration-200 focus:outline-none focus:ring-2 ${
            error
              ? 'bg-red-900/30 border-red-400/40 focus:ring-red-400/30 focus:border-red-400/60'
              : 'bg-black/25 border-white/12 focus:ring-[#C8A800]/40 focus:border-[#C8A800]/70 focus:bg-black/30'
          }`}
          style={{ colorScheme: 'dark', WebkitTextFillColor: 'white' }}
          {...registration(id)}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/70 transition-colors"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeSlashIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
        </button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 text-xs text-red-300"
          >
            <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CambiarPassword() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmacion, setShowConfirmacion] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const passwordNueva = watch('password_nueva') ?? ''
  const passwordConfirmacion = watch('password_confirmacion') ?? ''
  const coincide = passwordConfirmacion.length > 0 && passwordNueva === passwordConfirmacion

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true)
      setServerError(null)
      const user = await authService.cambiarPassword(data.password_actual, data.password_nueva)
      setUser(user)
      toast.success('Contraseña actualizada correctamente')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'No se pudo cambiar la contraseña. Verifique la contraseña actual.'
      setServerError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#0B1220]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${fondoInstitucional})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(3px) brightness(0.65) saturate(0.9)',
          transform: 'scale(1.02)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0B1220]/45 via-[#0B1220]/25 to-[#0B1220]/50" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(32px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #0B1220 0%, #1F8C6F 50%, #C8A800 100%)' }} />

          <div className="px-8 pt-8 pb-8">
            <div className="flex flex-col items-center mb-6">
              <AlcaldiaLogo size="xl" />
              <div className="mt-4 flex items-center gap-2 text-[#C8A800]">
                <ShieldCheckIcon className="w-5 h-5" />
                <h1 className="text-base font-bold text-white">Cambio de contraseña requerido</h1>
              </div>
              <p className="mt-2 text-xs text-blue-200/70 text-center leading-relaxed">
                Por seguridad, debes reemplazar la contraseña temporal asignada<br />antes de continuar.
              </p>
            </div>

            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="flex items-start gap-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl px-4 py-3 text-sm"
                  role="alert"
                >
                  <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-300" />
                  <span>{serverError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Campo
                id="password_actual"
                label="Contraseña actual (temporal)"
                error={errors.password_actual?.message}
                show={showActual}
                onToggleShow={() => setShowActual((v) => !v)}
                registration={register}
              />
              <div>
                <Campo
                  id="password_nueva"
                  label="Nueva contraseña"
                  error={errors.password_nueva?.message}
                  show={showNueva}
                  onToggleShow={() => setShowNueva((v) => !v)}
                  registration={register}
                />
                <ChecklistRequisitos password={passwordNueva} />
              </div>
              <div>
                <Campo
                  id="password_confirmacion"
                  label="Confirmar nueva contraseña"
                  error={errors.password_confirmacion?.message}
                  show={showConfirmacion}
                  onToggleShow={() => setShowConfirmacion((v) => !v)}
                  registration={register}
                />
                <AnimatePresence>
                  {passwordConfirmacion.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn('flex items-center gap-1.5 text-[11px] pt-1', coincide ? 'text-emerald-300' : 'text-red-300')}
                    >
                      {coincide
                        ? <><CheckCircleIcon className="w-3.5 h-3.5 shrink-0" /> Las contraseñas coinciden</>
                        : <><XCircleIcon className="w-3.5 h-3.5 shrink-0" /> Las contraseñas no coinciden</>}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8A800]/60 ${
                  isLoading
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'text-[#0B1220] bg-gradient-to-r from-[#C8A800] to-[#e0be00] hover:from-[#d4b200] hover:to-[#f0ce00] shadow-lg shadow-[#C8A800]/30 active:scale-[0.98]'
                }`}
                aria-busy={isLoading}
              >
                {isLoading ? 'Guardando...' : 'Cambiar contraseña y continuar'}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
