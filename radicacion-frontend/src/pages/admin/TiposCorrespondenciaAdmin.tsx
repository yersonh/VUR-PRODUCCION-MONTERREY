import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon, PowerIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable } from '@/components/admin/AdminTable'
import { tiposCorrAdmin } from '@/services/adminService'
import type { TipoCorrespondencia } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  descripcion: z.string().min(1, 'Requerido').max(100),
  max_dias:    z.number().int().min(0, 'Mínimo 0').max(365, 'Máx 365 días'),
  activo:      z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Estado {
  data: TipoCorrespondencia[]
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

export default function TiposCorrespondenciaAdmin() {
  const [estado, setEstado] = useState<Estado>({
    data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true,
  })
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<TipoCorrespondencia | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { activo: true, max_dias: 15 },
  })

  const cargar = useCallback(async (pagina: number, q: string) => {
    setEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await tiposCorrAdmin.list({ page: pagina, q, per_page: 20 })
      setEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch {
      toast.error('Error al cargar tipos de correspondencia')
      setEstado(s => ({ ...s, cargando: false }))
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(1, busqueda), busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  const abrirNuevo = () => {
    setEditando(null)
    reset({ descripcion: '', max_dias: 15, activo: true })
    setModalAbierto(true)
  }

  const abrirEditar = (tc: TipoCorrespondencia) => {
    setEditando(tc)
    reset({ descripcion: tc.descripcion, max_dias: tc.max_dias, activo: tc.activo })
    setModalAbierto(true)
  }

  const cerrar = () => { setModalAbierto(false); setEditando(null) }

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    try {
      if (editando) {
        await tiposCorrAdmin.update(editando.id, data)
        toast.success('Tipo actualizado')
      } else {
        await tiposCorrAdmin.create(data)
        toast.success('Tipo creado')
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

  const toggle = async (tc: TipoCorrespondencia) => {
    try {
      const updated = await tiposCorrAdmin.toggle(tc.id)
      toast.success(updated.activo ? 'Tipo activado' : 'Tipo desactivado')
      cargar(estado.pagina, busqueda)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const columnas = [
    { key: 'id'          as const, label: '#',          width: '60px' },
    { key: 'descripcion' as const, label: 'Descripción' },
    {
      key: 'max_dias' as const,
      label: 'Días máx.',
      width: '90px',
      render: (tc: TipoCorrespondencia) => (
        <span className="font-mono text-slate-600">{tc.max_dias}</span>
      ),
    },
    { key: 'activo' as const, label: 'Estado', width: '90px' },
  ]

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }}
        className="p-6 max-w-5xl mx-auto"
      >
        <AdminTable
          titulo="Tipos de Correspondencia"
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
          labelNuevo="Nuevo Tipo"
          accionExtra={tc => (
            <button
              type="button"
              onClick={() => toggle(tc)}
              title={tc.activo ? 'Desactivar' : 'Activar'}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                tc.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50',
              )}
            >
              <PowerIcon className="w-3.5 h-3.5" />
            </button>
          )}
        />
      </motion.div>

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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-[#1B3A6E] px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-semibold">
                  {editando ? 'Editar Tipo de Correspondencia' : 'Nuevo Tipo de Correspondencia'}
                </h3>
                <button type="button" onClick={cerrar} className="text-white/70 hover:text-white p-1 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="tc-dias">
                    Días máx. <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="tc-dias"
                    type="number"
                    min={0} max={365}
                    {...register('max_dias', { valueAsNumber: true })}
                    className={cn(
                      'w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]',
                      errors.max_dias ? 'border-red-400' : 'border-slate-300',
                    )}
                  />
                  {errors.max_dias && <p className="text-xs text-red-500 mt-1">{errors.max_dias.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="tc-desc">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="tc-desc"
                    {...register('descripcion')}
                    maxLength={100}
                    className={cn(
                      'w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]',
                      errors.descripcion ? 'border-red-400' : 'border-slate-300',
                    )}
                  />
                  {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>}
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...register('activo')} className="w-4 h-4 accent-[#1B3A6E]" />
                  <span className="text-sm text-slate-700">Activo</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button" onClick={cerrar}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                  >Cancelar</button>
                  <button
                    type="submit" disabled={guardando}
                    className="px-6 py-2 bg-[#1B3A6E] hover:bg-[#14306A] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                  >{guardando ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
