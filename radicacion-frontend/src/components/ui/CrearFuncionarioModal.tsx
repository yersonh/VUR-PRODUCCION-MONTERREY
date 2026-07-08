import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useCatalogoStore } from '@/store/catalogoStore'
import { useAuthStore } from '@/store/authStore'
import { CharCountInput } from '@/components/ui/CharCountInput'
import { cn } from '@/lib/utils'

const schema = z.object({
  cedula:         z.string().regex(/^\d{6,10}$/, 'Solo dígitos, 6–10 caracteres'),
  nombres:        z.string().min(2, 'Mínimo 2 caracteres').max(80),
  apellidos:      z.string().min(2, 'Mínimo 2 caracteres').max(80),
  cargo:          z.string().max(100).optional().or(z.literal('')),
  email:          z.string().email('Email inválido').max(100).optional().or(z.literal('')),
  telefono:       z.string().regex(/^\d{7,10}$/, 'Solo dígitos, 7–10 caracteres').optional().or(z.literal('')),
  dependencia_id: z.number().min(1, 'Seleccione una dependencia'),
})

type FormValues = z.infer<typeof schema>

export interface FuncionarioCreado {
  id: number
  cedula: string
  nombre_completo: string
  cargo: string | null
  dependencia_id: number
  email: string | null
}

export interface FuncionarioDefaults {
  cedula?: string
  nombres?: string
  apellidos?: string
  cargo?: string
  dependencia_id?: number
}

interface Props {
  open: boolean
  onClose: () => void
  onCreado: (f: FuncionarioCreado) => void
  defaultValues?: FuncionarioDefaults
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
const panel = {
  hidden:  { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.96, y: 8,  transition: { duration: 0.15 } },
}

export function CrearFuncionarioModal({ open, onClose, onCreado, defaultValues }: Props) {
  const { dependencias } = useCatalogoStore()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cedula: '', nombres: '', apellidos: '', cargo: '',
      email: '', telefono: '', dependencia_id: 0,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        cedula:         defaultValues?.cedula ?? '',
        nombres:        defaultValues?.nombres ?? '',
        apellidos:      defaultValues?.apellidos ?? '',
        cargo:          defaultValues?.cargo ?? '',
        email:          '',
        telefono:       '',
        dependencia_id: defaultValues?.dependencia_id ?? 0,
      })
    }
  }, [open, reset, defaultValues])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/personal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token ?? ''}`,
        },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        const msg = err.message ?? (err.errors ? Object.values(err.errors).flat().join(', ') : 'Error al guardar')
        throw new Error(String(msg))
      }
      const data = await res.json()
      toast.success(`Funcionario ${data.codigo} registrado`)
      onCreado({
        id:              data.id,
        cedula:          data.cedula,
        nombre_completo: data.nombre_completo,
        cargo:           data.cargo ?? null,
        dependencia_id:  data.dependencia_id,
        email:           data.email ?? null,
      })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Registrar Funcionario"
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#1B3A6E]">
              <div className="flex items-center gap-2">
                <UserCircleIcon className="w-4 h-4 text-white/70" />
                <h2 className="text-white font-semibold text-sm tracking-wide uppercase">
                  Registrar Funcionario
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="text-white/70 hover:text-white transition-colors p-1 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} noValidate className="p-5 space-y-4">

              {/* Cédula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CharCountInput
                  {...register('cedula')}
                  label="Cédula *"
                  maxLength={10}
                  inputMode="numeric"
                  onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/\D/g, '') }}
                  placeholder="Solo dígitos, 6–10"
                  helpText="Solo dígitos, 6–10 caracteres"
                  error={errors.cedula?.message}
                  autoFocus
                />
                <CharCountInput
                  {...register('cargo')}
                  label="Cargo"
                  maxLength={100}
                  placeholder="Ej: Secretario de Despacho"
                  error={errors.cargo?.message}
                />
              </div>

              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CharCountInput
                  {...register('nombres')}
                  label="Nombres *"
                  maxLength={80}
                  placeholder="Nombres"
                  error={errors.nombres?.message}
                />
                <CharCountInput
                  {...register('apellidos')}
                  label="Apellidos *"
                  maxLength={80}
                  placeholder="Apellidos"
                  error={errors.apellidos?.message}
                />
              </div>

              {/* Dependencia */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                  Dependencia <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('dependencia_id', { valueAsNumber: true })}
                  aria-invalid={!!errors.dependencia_id}
                  className={cn(
                    'px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]',
                    errors.dependencia_id ? 'border-red-300' : 'border-slate-300',
                  )}
                >
                  <option value={0}>Seleccione dependencia...</option>
                  {dependencias.map(d => (
                    <option key={d.id} value={d.id}>{d.descripcion}</option>
                  ))}
                </select>
                {errors.dependencia_id && (
                  <span className="text-[10px] text-red-500">{errors.dependencia_id.message}</span>
                )}
              </div>

              {/* Email y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CharCountInput
                  {...register('email')}
                  label="Email"
                  maxLength={100}
                  placeholder="correo@alcaldiamonterrey.gov.co"
                  error={errors.email?.message}
                />
                <CharCountInput
                  {...register('telefono')}
                  label="Teléfono"
                  maxLength={10}
                  inputMode="numeric"
                  onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/\D/g, '') }}
                  placeholder="Solo dígitos, 7–10"
                  helpText="Solo dígitos, 7–10 caracteres"
                  error={errors.telefono?.message}
                />
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={onClose}
                  className="px-5 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-colors',
                    isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#16A34A] hover:bg-green-700',
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Guardando...
                    </>
                  ) : 'Registrar Funcionario'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
