import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, EnvelopeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { AlcaldiaLogo } from '@/components/ui/AlcaldiaLogo'
import { NexGovIAInfoModal } from '@/components/ui/NexGovIAInfoModal'
import fondoInstitucional from '@/assets/fondo/fondo-casa.png'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingrese un correo electrónico válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

const itemVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

interface FormFieldProps {
  id: string
  label: string
  type?: string
  placeholder: string
  error?: string
  icon: React.ReactNode
  rightElement?: React.ReactNode
  registration: ReturnType<typeof useForm<LoginForm>>['register']
  fieldName: keyof LoginForm
}

function FormField({ id, label, type = 'text', placeholder, error, icon, rightElement, registration, fieldName }: FormFieldProps) {
  return (
    <motion.div variants={itemVariants} className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-white">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            w-full pl-10 pr-${rightElement ? '12' : '4'} py-3 rounded-xl border text-sm
            text-white placeholder-white/30
            transition-all duration-200
            focus:outline-none focus:ring-2
            ${error
              ? 'bg-red-900/30 border-red-400/40 focus:ring-red-400/30 focus:border-red-400/60'
              : 'bg-black/25 border-white/12 focus:ring-[#C8A800]/40 focus:border-[#C8A800]/70 focus:bg-black/30'
            }
          `}
          style={{
            colorScheme: 'dark',
            WebkitTextFillColor: 'white',
            WebkitBoxShadow: '0 0 0px 1000px rgba(0,0,0,0.25) inset',
            transition: 'background-color 5000s ease-in-out 0s',
          }}
          {...registration(fieldName)}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 text-xs text-red-600"
          >
            <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showNexGovIA, setShowNexGovIA] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true)
      setServerError(null)
      const response = await authService.login(data.email, data.password)
      login(response.user, response.token)
      toast.success(`Bienvenido, ${response.user.name}`)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Credenciales incorrectas. Verifique su usuario y contraseña.'
      setServerError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    /*
      Para agregar imagen de fondo, reemplaza el style del div raíz por:
        backgroundImage: "url('/bg-login.jpg')", backgroundSize: 'cover', backgroundPosition: 'center'
      y coloca el archivo en radicacion-frontend/public/bg-login.jpg
    */
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#0B1220]">
      {/* Fondo difuminado */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${fondoInstitucional})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(3px) brightness(0.65) saturate(0.9)',
          transform: 'scale(1.02)',
        }}
      />

      {/* Velo oscuro para contraste con la tarjeta */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0B1220]/45 via-[#0B1220]/25 to-[#0B1220]/50" />

      {/* Aura de color sobre el fondo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 80%, rgba(200,168,0,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(31,140,111,0.14) 0%, transparent 50%)',
        }}
      />

      {/* Tarjeta central */}
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
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.1)',
          }}
        >
          {/* Franja superior dorada */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #0B1220 0%, #1F8C6F 50%, #C8A800 100%)' }}
          />

          <div className="px-8 pt-8 pb-8">
            {/* Logo + nombre institución */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="flex flex-col items-center mb-7"
            >
              <AlcaldiaLogo size="xl" />
              <h1 className="mt-4 text-base font-bold text-white tracking-wide text-center leading-snug">
                ALCALDÍA DE MONTERREY
                <span className="block text-[#C8A800]">CASANARE</span>
              </h1>
              <p className="mt-1 text-xs text-blue-200/70 text-center">
                Sistema de Radicación de Correspondencia
              </p>
            </motion.div>

            {/* Separador */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs font-semibold text-white/40 tracking-widest uppercase">Iniciar Sesión</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Error servidor */}
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

            {/* Formulario */}
            <motion.form
              initial="initial"
              animate="animate"
              variants={{ animate: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              <FormField
                id="email"
                fieldName="email"
                label="Correo electrónico"
                type="email"
                placeholder="correo@ejemplo.com"
                error={errors.email?.message}
                icon={<EnvelopeIcon className="w-4.5 h-4.5" />}
                registration={register}
              />

              <FormField
                id="password"
                fieldName="password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                icon={<LockClosedIcon className="w-4.5 h-4.5" />}
                registration={register}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-white/40 hover:text-white/70 transition-colors p-1 rounded"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword
                      ? <EyeSlashIcon className="w-4.5 h-4.5" />
                      : <EyeIcon className="w-4.5 h-4.5" />
                    }
                  </button>
                }
              />

              <motion.div variants={itemVariants} className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`
                    w-full flex items-center justify-center gap-2.5
                    py-3.5 px-6 rounded-xl font-bold text-sm
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8A800]/60
                    ${isLoading
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : 'text-[#0B1220] bg-gradient-to-r from-[#C8A800] to-[#e0be00] hover:from-[#d4b200] hover:to-[#f0ce00] shadow-lg shadow-[#C8A800]/30 hover:shadow-xl hover:shadow-[#C8A800]/40 active:scale-[0.98]'
                    }
                  `}
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="w-4 h-4" />
                      <span>Ingresar al Sistema</span>
                    </>
                  )}
                </button>
              </motion.div>
            </motion.form>

            {/* Nota */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-5 text-center text-xs text-white/35 leading-relaxed"
            >
              Acceso exclusivo para funcionarios autorizados de la<br />
              <span className="font-medium text-white/50">Alcaldía de Monterrey Casanare</span>
            </motion.p>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 border-t border-white/8 text-center">
            <p className="text-[11px] text-white/30">
              © 2026 Alcaldía de Monterrey Casanare · Desarrollado por{' '}
              <button
                type="button"
                onClick={() => setShowNexGovIA(true)}
                className="font-semibold text-[#C8A800]/70 hover:text-[#C8A800] underline underline-offset-2 decoration-dotted transition-colors cursor-pointer"
              >
                NexGovIA
              </button>
            </p>
          </div>
        </div>
      </motion.div>

      <NexGovIAInfoModal isOpen={showNexGovIA} onClose={() => setShowNexGovIA(false)} />
    </div>
  )
}
