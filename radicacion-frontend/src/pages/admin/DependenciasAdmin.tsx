import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon, PowerIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable } from '@/components/admin/AdminTable'
import { depAdmin } from '@/services/adminService'
import type { Dependencia } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  descripcion: z.string().min(1, 'Requerido').max(120, 'Máx 120 caracteres'),
  activo:      z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Estado {
  data: Dependencia[]
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

export default function DependenciasAdmin() {
  const [estado, setEstado] = useState<Estado>({
    data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true,
  })
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Dependencia | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { activo: true },
  })

  const cargar = useCallback(async (pagina: number, q: string) => {
    setEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await depAdmin.list({ page: pagina, q, per_page: 20 })
      setEstado({
        data: res.data,
        total: res.meta.total,
        pagina: res.meta.current_page,
        ultimaPagina: res.meta.last_page,
        cargando: false,
      })
    } catch {
      toast.error('Error al cargar dependencias')
      setEstado(s => ({ ...s, cargando: false }))
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(1, busqueda), busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  const abrirNuevo = () => {
    setEditando(null)
    reset({ descripcion: '', activo: true })
    setModalAbierto(true)
  }

  const abrirEditar = (dep: Dependencia) => {
    setEditando(dep)
    reset({ descripcion: dep.descripcion, activo: dep.activo })
    setModalAbierto(true)
  }

  const cerrar = () => {
    setModalAbierto(false)
    setEditando(null)
  }

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    try {
      if (editando) {
        await depAdmin.update(editando.id, data)
        toast.success('Dependencia actualizada')
      } else {
        await depAdmin.create(data)
        toast.success('Dependencia creada')
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

  const toggle = async (dep: Dependencia) => {
    try {
      const updated = await depAdmin.toggle(dep.id)
      toast.success(updated.activo ? 'Dependencia activada' : 'Dependencia desactivada')
      cargar(estado.pagina, busqueda)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const columnas = [
    { key: 'id'          as const, label: '#',           width: '60px' },
    { key: 'descripcion' as const, label: 'Descripción' },
    { key: 'activo'      as const, label: 'Estado',      width: '90px' },
  ]

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }}
        className="p-6 w-full"
      >
        <AdminTable
          titulo="Dependencias"
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
          labelNuevo="Nueva Dependencia"
          accionExtra={dep => (
            <button
              type="button"
              onClick={() => toggle(dep)}
              title={dep.activo ? 'Desactivar' : 'Activar'}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                dep.activo
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-green-600 hover:bg-green-50',
              )}
            >
              <PowerIcon className="w-3.5 h-3.5" />
            </button>
          )}
        />
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalAbierto && (
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="initial" animate="animate" exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) cerrar() }}
          >
            <motion.div
              variants={modalVariants}
              initial="initial" animate="animate" exit="exit"
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-[#0B1220] px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-semibold">
                  {editando ? 'Editar Dependencia' : 'Nueva Dependencia'}
                </h3>
                <button
                  type="button"
                  onClick={cerrar}
                  className="text-white/70 hover:text-white p-1 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="descripcion">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="descripcion"
                    {...register('descripcion')}
                    maxLength={120}
                    placeholder="Nombre completo de la dependencia"
                    className={cn(
                      'w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]',
                      errors.descripcion ? 'border-red-400' : 'border-slate-300',
                    )}
                  />
                  {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>}
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...register('activo')} className="w-4 h-4 accent-[#0B1220]" />
                  <span className="text-sm text-slate-700">Activa</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cerrar}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-6 py-2 bg-[#0B1220] hover:bg-[#060911] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                  >
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
