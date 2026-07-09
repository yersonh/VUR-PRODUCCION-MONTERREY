import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { XMarkIcon, BuildingOfficeIcon, UserIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useCatalogoStore } from '@/store/catalogoStore'
import { useAuthStore } from '@/store/authStore'
import { CharCountInput } from '@/components/ui/CharCountInput'
import { cn } from '@/lib/utils'

const schema = z.object({
  tipo_identificacion_id: z.number().min(1, 'Requerido'),
  nro_identificacion:  z.string().min(1, 'Requerido').max(20).regex(/^[A-Za-z0-9\-]+$/, 'Solo letras, dígitos y guiones'),
  // EMPRESA
  razon_social:        z.string().max(150).optional().or(z.literal('')),
  nombre_contacto:     z.string().max(80).optional().or(z.literal('')),
  apellido_contacto:   z.string().max(60).optional().or(z.literal('')),
  cargo_contacto:      z.string().max(100).optional().or(z.literal('')),
  email_contacto:      z.string().email('Email inválido').max(100).optional().or(z.literal('')),
  // CIUDADANO
  nombres:             z.string().max(80).optional().or(z.literal('')),
  primer_apellido:     z.string().max(60).optional().or(z.literal('')),
  segundo_apellido:    z.string().max(60).optional().or(z.literal('')),
  // Comunes
  direccion:           z.string().max(120).optional().or(z.literal('')),
  municipio:           z.string().max(80).optional().or(z.literal('')),
  telefono:            z.string().max(20).optional().or(z.literal('')),
  email:               z.string().email('Email inválido').max(100).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export interface TerceroCreado {
  id: number
  codigo: string
  nit: string
  razon_social: string
  nombre_contacto: string | null
  municipio: string | null
  email: string | null
}

export interface TerceroDefaults {
  tipo_identificacion_id?: number
  nro_identificacion?: string
  /** Para EMPRESA: nombre de la empresa */
  nombres?: string
  /** Para EMPRESA: responsable pre-llenado */
  nombre_contacto?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreado: (t: TerceroCreado, nombreContacto?: string) => void
  defaultValues?: TerceroDefaults
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
const panel = {
  hidden:  { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } },
}

export function CrearTerceroModal({ open, onClose, onCreado, defaultValues }: Props) {
  const { tiposIdentificacion } = useCatalogoStore()

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_identificacion_id: 0,
      nro_identificacion: '',
      razon_social: '', nombre_contacto: '', apellido_contacto: '', cargo_contacto: '', email_contacto: '',
      nombres: '', primer_apellido: '', segundo_apellido: '',
      direccion: '', municipio: '', telefono: '', email: '',
    },
  })

  const tipoIdActual = useWatch({ control, name: 'tipo_identificacion_id' })
  const tipoActual   = tiposIdentificacion.find(t => t.id === tipoIdActual)
  const tipoCod      = tipoActual?.codigo?.toUpperCase() ?? ''
  const esNIT        = tipoCod === 'NIT'
  const esCC         = tipoCod === 'CC'
  const nroMaxLen    = esNIT ? 16 : esCC ? 10 : 20
  const nroInputMode = esNIT || esCC ? ('numeric' as const) : ('text' as const)
  const nroOnInput   = (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.target as HTMLInputElement
    if (esNIT)     el.value = el.value.replace(/[^0-9-]/g, '')
    else if (esCC) el.value = el.value.replace(/\D/g, '')
  }

  useEffect(() => {
    if (open) {
      // 'defaultValues.nombres' trae el nombre completo detectado por la IA.
      // Si el tipo de identificación precargado es NIT, es el nombre de la
      // empresa (va a razon_social). Si es cualquier otro tipo (persona
      // natural), hay que repartirlo en nombres/primer_apellido — si no, el
      // nombre detectado se perdía silenciosamente y el operador tenía que
      // volver a escribirlo a mano.
      const tipoDefault  = tiposIdentificacion.find(t => t.id === defaultValues?.tipo_identificacion_id)
      const esNITDefault = tipoDefault?.codigo?.toUpperCase() === 'NIT'
      const partes        = (!esNITDefault ? defaultValues?.nombres ?? '' : '').trim().split(/\s+/).filter(Boolean)
      const nombresPersona = partes.length > 0 ? partes.slice(0, Math.max(1, partes.length - 1)).join(' ') : ''
      const apellidoPersona = partes.length > 1 ? partes[partes.length - 1] : ''

      reset({
        tipo_identificacion_id: defaultValues?.tipo_identificacion_id ?? 0,
        nro_identificacion:     defaultValues?.nro_identificacion ?? '',
        razon_social:           esNITDefault ? (defaultValues?.nombres ?? '') : '',
        nombre_contacto:        defaultValues?.nombre_contacto ?? '',
        apellido_contacto: '', cargo_contacto: '', email_contacto: '',
        nombres: nombresPersona, primer_apellido: apellidoPersona, segundo_apellido: '',
        direccion: '', municipio: '', telefono: '', email: '',
      })
    }
  }, [open, reset, defaultValues, tiposIdentificacion])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/terceros`, {
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
      toast.success(`${esNIT ? 'Empresa' : 'Tercero'} ${data.codigo} creado`)
      const nombreContacto = data.contacto?.nombre_completo || values.nombre_contacto || undefined
      onCreado(
        {
          id:             data.id,
          codigo:         data.codigo,
          nit:            data.nro_identificacion,
          razon_social:   data.razon_social,
          nombre_contacto: nombreContacto ?? null,
          municipio:      data.municipio ?? null,
          email:          data.email ?? null,
        },
        nombreContacto,
      )
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
            aria-label="Crear Tercero"
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#1B3A6E]">
              <div className="flex items-center gap-2">
                {esNIT
                  ? <BuildingOfficeIcon className="w-4 h-4 text-white/70" />
                  : <UserIcon className="w-4 h-4 text-white/70" />
                }
                <h2 className="text-white font-semibold text-sm tracking-wide uppercase">
                  {esNIT ? 'Registrar Empresa / NIT' : 'Registrar Tercero'}
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="text-white/70 hover:text-white transition-colors p-1 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} noValidate className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

              {/* Tipo ID + NRO ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="tipo_id" className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                    Tipo Identificación <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="tipo_id"
                    {...register('tipo_identificacion_id', { valueAsNumber: true })}
                    autoFocus
                    aria-invalid={!!errors.tipo_identificacion_id}
                    className={cn(
                      'px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]',
                      errors.tipo_identificacion_id ? 'border-red-300' : 'border-slate-300',
                    )}
                  >
                    <option value={0}>Seleccione...</option>
                    {tiposIdentificacion.map(t => (
                      <option key={t.id} value={t.id}>{t.descripcion ?? t.codigo}</option>
                    ))}
                  </select>
                  {errors.tipo_identificacion_id && (
                    <span className="text-[10px] text-red-500">{errors.tipo_identificacion_id.message}</span>
                  )}
                </div>
                <CharCountInput
                  {...register('nro_identificacion')}
                  label={esNIT ? 'NIT *' : 'Nro. Identificación *'}
                  maxLength={nroMaxLen}
                  inputMode={nroInputMode}
                  onInput={nroOnInput}
                  placeholder={esNIT ? 'Ej: 891857824-3' : esCC ? 'Solo dígitos, 6–10' : 'Número de documento'}
                  helpText={esNIT ? 'Dígitos y guión (ej: 900123456-1)' : esCC ? 'Solo dígitos, 6–10 caracteres' : undefined}
                  error={errors.nro_identificacion?.message}
                />
              </div>

              {esNIT ? (
                <>
                  {/* Razón Social */}
                  <CharCountInput
                    {...register('razon_social')}
                    label="Razón Social / Nombre empresa *"
                    maxLength={150}
                    placeholder="Nombre oficial de la empresa o entidad"
                    error={errors.razon_social?.message}
                  />

                  {/* Separador responsable */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] font-bold text-[#1B3A6E] uppercase tracking-widest whitespace-nowrap">
                      Contacto / Responsable
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CharCountInput
                      {...register('nombre_contacto')}
                      label="Nombres del contacto"
                      maxLength={80}
                      placeholder="Nombres de quien firma o envía"
                      error={errors.nombre_contacto?.message}
                    />
                    <CharCountInput
                      {...register('apellido_contacto')}
                      label="Apellido(s)"
                      maxLength={60}
                      placeholder="Apellidos"
                      error={errors.apellido_contacto?.message}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CharCountInput
                      {...register('cargo_contacto')}
                      label="Cargo"
                      maxLength={100}
                      placeholder="Ej: Representante Legal, Director"
                      error={errors.cargo_contacto?.message}
                    />
                    <CharCountInput
                      {...register('email_contacto')}
                      label="Email del contacto"
                      maxLength={100}
                      placeholder="correo@empresa.com"
                      error={errors.email_contacto?.message}
                    />
                  </div>
                </>
              ) : (
                /* Persona natural */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CharCountInput
                      {...register('nombres')}
                      label="Nombres *"
                      maxLength={80}
                      placeholder="Nombres"
                      error={errors.nombres?.message}
                    />
                    <CharCountInput
                      {...register('primer_apellido')}
                      label="Primer Apellido"
                      maxLength={60}
                      placeholder="Primer apellido"
                      error={errors.primer_apellido?.message}
                    />
                  </div>
                  <CharCountInput
                    {...register('segundo_apellido')}
                    label="Segundo Apellido"
                    maxLength={60}
                    placeholder="Segundo apellido"
                    error={errors.segundo_apellido?.message}
                  />
                </>
              )}

              {/* Dirección — común para EMPRESA y CIUDADANO */}
              <CharCountInput
                {...register('direccion')}
                label="Dirección"
                maxLength={120}
                placeholder={esNIT ? 'Dirección de la empresa' : 'Dirección de residencia'}
                error={errors.direccion?.message}
              />

              {/* Municipio + Teléfono + Email empresa/entidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CharCountInput
                  {...register('municipio')}
                  label="Municipio"
                  maxLength={80}
                  placeholder="Municipio"
                  error={errors.municipio?.message}
                />
                <CharCountInput
                  {...register('telefono')}
                  label="Teléfono"
                  maxLength={20}
                  placeholder="Teléfono"
                  error={errors.telefono?.message}
                />
                <CharCountInput
                  {...register('email')}
                  label={esNIT ? 'Email empresa' : 'Email'}
                  maxLength={100}
                  placeholder="correo@ejemplo.com"
                  error={errors.email?.message}
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
                  ) : (esNIT ? 'Registrar Empresa' : 'Guardar Tercero')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
