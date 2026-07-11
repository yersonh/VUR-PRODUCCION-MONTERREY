import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable } from '@/components/admin/AdminTable'
import { ciudadanosAdmin, type CiudadanoRow } from '@/services/adminService'
import { useCatalogoStore } from '@/store/catalogoStore'
import { cn } from '@/lib/utils'

const schema = z.object({
  tipo_identificacion_id: z.number().min(1, 'Seleccione un tipo de identificación'),
  numero_identificacion:  z.string().min(4, 'Mínimo 4 caracteres').max(20),
  nombres:                z.string().min(2, 'Mínimo 2 caracteres').max(100),
  apellidos:              z.string().min(2, 'Mínimo 2 caracteres').max(100),
  telefono:               z.string().max(20).optional(),
  email:                  z.string().email('Email inválido').or(z.literal('')).optional(),
  direccion:              z.string().max(250).optional(),
  municipio:              z.string().max(150).optional(),
})

type FormData = z.infer<typeof schema>

interface Estado {
  data: CiudadanoRow[]
  total: number
  pagina: number
  ultimaPagina: number
  cargando: boolean
}

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
}
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 as const },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.95 as const, transition: { duration: 0.15 } },
}

export default function CiudadanosAdmin() {
  const { tiposIdentificacion } = useCatalogoStore()
  const [estado, setEstado] = useState<Estado>({ data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true })
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<CiudadanoRow | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const cargar = useCallback(async (pagina: number, q: string) => {
    setEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await ciudadanosAdmin.list({ page: pagina, q, per_page: 20 })
      setEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch {
      toast.error('Error al cargar ciudadanos')
      setEstado(s => ({ ...s, cargando: false }))
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(1, busqueda), busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  const abrirNuevo = () => {
    setEditando(null)
    reset({ tipo_identificacion_id: undefined, numero_identificacion: '', nombres: '', apellidos: '', telefono: '', email: '', direccion: '', municipio: '' })
    setModalAbierto(true)
  }

  const abrirEditar = (c: CiudadanoRow) => {
    setEditando(c)
    reset({
      tipo_identificacion_id: c.tipo_identificacion_id,
      numero_identificacion:  c.numero_identificacion,
      nombres:                c.nombres,
      apellidos:              c.apellidos,
      telefono:               c.telefono ?? '',
      email:                  c.email ?? '',
      direccion:              c.direccion ?? '',
      municipio:              c.municipio ?? '',
    })
    setModalAbierto(true)
  }

  const cerrar = () => { setModalAbierto(false); setEditando(null) }

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    try {
      if (editando) {
        await ciudadanosAdmin.update(editando.id, data)
        toast.success('Ciudadano actualizado')
      } else {
        await ciudadanosAdmin.create(data)
        toast.success('Ciudadano creado')
      }
      cerrar()
      cargar(estado.pagina, busqueda)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const columnas = [
    { key: 'id' as const, label: '#', width: '60px' },
    {
      key: 'tipo_identificacion' as const,
      label: 'Tipo',
      width: '70px',
      render: (c: CiudadanoRow) => <span className="text-xs text-slate-500">{c.tipo_identificacion?.codigo ?? '—'}</span>,
    },
    { key: 'numero_identificacion' as const, label: 'Identificación', width: '130px' },
    { key: 'apellidos' as const, label: 'Apellidos' },
    { key: 'nombres'   as const, label: 'Nombres' },
    {
      key: 'email' as const,
      label: 'Correo',
      render: (c: CiudadanoRow) => <span className="text-xs text-slate-500">{c.email || '—'}</span>,
    },
    {
      key: 'telefono' as const,
      label: 'Teléfono',
      render: (c: CiudadanoRow) => <span className="text-xs text-slate-500">{c.telefono || '—'}</span>,
    },
    { key: 'activo' as const, label: 'Estado', width: '90px' },
  ]

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }}
        className="p-6 w-full"
      >
        <AdminTable
          titulo="Ciudadanos"
          columnas={columnas}
          filas={estado.data}
          total={estado.total}
          pagina={estado.pagina}
          ultimaPagina={estado.ultimaPagina}
          cargando={estado.cargando}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          onNuevo={abrirNuevo}
          onEditar={abrirEditar}
          onPagina={p => cargar(p, busqueda)}
          labelNuevo="Nuevo Ciudadano"
        />
      </motion.div>

      <AnimatePresence>
        {modalAbierto && (
          <motion.div
            key="overlay"
            variants={overlayVariants} initial="initial" animate="animate" exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) cerrar() }}
          >
            <motion.div
              variants={modalVariants} initial="initial" animate="animate" exit="exit"
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-[#0B1220] px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-semibold">{editando ? 'Editar Ciudadano' : 'Nuevo Ciudadano'}</h3>
                <button type="button" onClick={cerrar} className="text-white/70 hover:text-white p-1 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tipo identificación <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('tipo_identificacion_id', { valueAsNumber: true })}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800] bg-white', errors.tipo_identificacion_id ? 'border-red-400' : 'border-slate-300')}
                    >
                      <option value="">— Seleccione —</option>
                      {tiposIdentificacion.map(t => <option key={t.id} value={t.id}>{t.codigo} — {t.descripcion}</option>)}
                    </select>
                    {errors.tipo_identificacion_id && <p className="text-xs text-red-500 mt-1">{errors.tipo_identificacion_id.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Número identificación <span className="text-red-500">*</span>
                    </label>
                    <input {...register('numero_identificacion')} maxLength={20}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.numero_identificacion ? 'border-red-400' : 'border-slate-300')} />
                    {errors.numero_identificacion && <p className="text-xs text-red-500 mt-1">{errors.numero_identificacion.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nombres <span className="text-red-500">*</span>
                    </label>
                    <input {...register('nombres')} maxLength={100}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.nombres ? 'border-red-400' : 'border-slate-300')} />
                    {errors.nombres && <p className="text-xs text-red-500 mt-1">{errors.nombres.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Apellidos <span className="text-red-500">*</span>
                    </label>
                    <input {...register('apellidos')} maxLength={100}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.apellidos ? 'border-red-400' : 'border-slate-300')} />
                    {errors.apellidos && <p className="text-xs text-red-500 mt-1">{errors.apellidos.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                    <input {...register('email')} type="email" maxLength={150}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.email ? 'border-red-400' : 'border-slate-300')} />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
                    <input {...register('telefono')} maxLength={20}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección</label>
                    <input {...register('direccion')} maxLength={250}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Municipio</label>
                    <input {...register('municipio')} maxLength={150}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={cerrar} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="submit" disabled={guardando} className="px-6 py-2 bg-[#0B1220] hover:bg-[#060911] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
