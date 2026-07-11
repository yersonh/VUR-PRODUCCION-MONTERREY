import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable } from '@/components/admin/AdminTable'
import { empresasAdmin, type EmpresaRow } from '@/services/adminService'
import { cn } from '@/lib/utils'

const schema = z.object({
  nit:           z.string().min(4, 'Mínimo 4 caracteres').max(20),
  razon_social:  z.string().min(2, 'Mínimo 2 caracteres').max(150),
  direccion:     z.string().max(250).optional(),
  municipio:     z.string().max(150).optional(),
  telefono:      z.string().max(20).optional(),
  email:         z.string().email('Email inválido').or(z.literal('')).optional(),
})

type FormData = z.infer<typeof schema>

interface Estado {
  data: EmpresaRow[]
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

// Solo crear + listar: el Core todavía no expone un endpoint para editar
// empresas (ver EmpresaAdminController en el backend). No se ofrece un
// botón de editar que sabemos que fallaría.
export default function EmpresasAdmin() {
  const [estado, setEstado] = useState<Estado>({ data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true })
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const cargar = useCallback(async (pagina: number, q: string) => {
    setEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await empresasAdmin.list({ page: pagina, q, per_page: 20 })
      setEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch {
      toast.error('Error al cargar empresas')
      setEstado(s => ({ ...s, cargando: false }))
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(1, busqueda), busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  const abrirNuevo = () => {
    reset({ nit: '', razon_social: '', direccion: '', municipio: '', telefono: '', email: '' })
    setModalAbierto(true)
  }

  const cerrar = () => setModalAbierto(false)

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    try {
      await empresasAdmin.create(data)
      toast.success('Empresa creada')
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
    { key: 'nit' as const, label: 'NIT', width: '130px' },
    { key: 'razon_social' as const, label: 'Razón social' },
    {
      key: 'email' as const,
      label: 'Correo',
      render: (e: EmpresaRow) => <span className="text-xs text-slate-500">{e.email || '—'}</span>,
    },
    {
      key: 'telefono' as const,
      label: 'Teléfono',
      render: (e: EmpresaRow) => <span className="text-xs text-slate-500">{e.telefono || '—'}</span>,
    },
    {
      key: 'municipio' as const,
      label: 'Municipio',
      render: (e: EmpresaRow) => <span className="text-xs text-slate-500">{e.municipio || '—'}</span>,
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
          titulo="Empresas"
          columnas={columnas}
          filas={estado.data}
          total={estado.total}
          pagina={estado.pagina}
          ultimaPagina={estado.ultimaPagina}
          cargando={estado.cargando}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          onNuevo={abrirNuevo}
          onPagina={p => cargar(p, busqueda)}
          labelNuevo="Nueva Empresa"
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
                <h3 className="text-white font-semibold">Nueva Empresa</h3>
                <button type="button" onClick={cerrar} className="text-white/70 hover:text-white p-1 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      NIT <span className="text-red-500">*</span>
                    </label>
                    <input {...register('nit')} maxLength={20}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.nit ? 'border-red-400' : 'border-slate-300')} />
                    {errors.nit && <p className="text-xs text-red-500 mt-1">{errors.nit.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Razón social <span className="text-red-500">*</span>
                    </label>
                    <input {...register('razon_social')} maxLength={150}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.razon_social ? 'border-red-400' : 'border-slate-300')} />
                    {errors.razon_social && <p className="text-xs text-red-500 mt-1">{errors.razon_social.message}</p>}
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
