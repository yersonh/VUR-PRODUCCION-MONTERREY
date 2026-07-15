import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon, PowerIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable } from '@/components/admin/AdminTable'
import { personalAdmin, type PersonalRow } from '@/services/adminService'
import { useCatalogoStore } from '@/store/catalogoStore'
import { cn } from '@/lib/utils'

const schema = z.object({
  cedula:         z.string().regex(/^\d{6,10}$/, 'Solo dígitos, 6–10 caracteres'),
  nombres:        z.string().min(2, 'Mínimo 2 caracteres').max(80),
  apellidos:      z.string().min(2, 'Mínimo 2 caracteres').max(80),
  cargo:          z.string().max(100).optional(),
  email:          z.string().email('Email inválido').or(z.literal('')).optional(),
  telefono:       z.string().regex(/^[\d\s\+\-\(\)]{7,15}$/, 'Teléfono inválido').or(z.literal('')).optional(),
  dependencia_id: z.number().min(1, 'Seleccione una dependencia'),
  activo:         z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Estado {
  data: PersonalRow[]
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

export default function PersonalAdmin() {
  const navigate = useNavigate()
  const { dependencias } = useCatalogoStore()
  const [estado, setEstado] = useState<Estado>({ data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true })
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<PersonalRow | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { activo: true },
  })

  const cargar = useCallback(async (pagina: number, q: string) => {
    setEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await personalAdmin.list({ page: pagina, q, per_page: 20 })
      setEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch {
      toast.error('Error al cargar personal')
      setEstado(s => ({ ...s, cargando: false }))
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(1, busqueda), busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  const abrirNuevo = () => {
    setEditando(null)
    reset({ cedula: '', nombres: '', apellidos: '', cargo: '', email: '', telefono: '', dependencia_id: undefined, activo: true })
    setModalAbierto(true)
  }

  const abrirEditar = (p: PersonalRow) => {
    setEditando(p)
    reset({
      cedula:         p.cedula,
      nombres:        p.nombres,
      apellidos:      p.apellidos,
      cargo:          p.cargo ?? '',
      email:          p.email ?? '',
      telefono:       p.telefono ?? '',
      dependencia_id: p.dependencia_id,
      activo:         p.activo,
    })
    setModalAbierto(true)
  }

  const cerrar = () => { setModalAbierto(false); setEditando(null) }

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    try {
      if (editando) {
        await personalAdmin.update(editando.id, data)
        toast.success('Personal actualizado')
      } else {
        await personalAdmin.create(data)
        toast.success('Personal creado')
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

  const toggle = async (p: PersonalRow) => {
    try {
      await personalAdmin.toggle(p.id)
      toast.success(p.activo ? 'Desactivado' : 'Activado')
      cargar(estado.pagina, busqueda)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const crearUsuarioDeAcceso = (p: PersonalRow) => {
    navigate('/admin/usuarios', {
      state: {
        crearDesdeFuncionario: {
          funcionario_id: p.id,
          nombre: `${p.nombres} ${p.apellidos}`.trim(),
          email: p.email ?? '',
          dependencia_id: p.dependencia_id,
          cargo: p.cargo ?? null,
        },
      },
    })
  }

  const columnas = [
    { key: 'id'        as const, label: '#',          width: '60px'  },
    { key: 'cedula'    as const, label: 'Cédula',    width: '110px' },
    { key: 'apellidos' as const, label: 'Apellidos' },
    { key: 'nombres'   as const, label: 'Nombres' },
    { key: 'cargo'     as const, label: 'Cargo' },
    {
      key: 'email' as const,
      label: 'Correo',
      render: (p: PersonalRow) => <span className="text-xs text-slate-500">{p.email || '—'}</span>,
    },
    {
      key: 'dependencia' as const,
      label: 'Dependencia',
      render: (p: PersonalRow) => <span className="text-xs text-slate-500">{p.dependencia?.descripcion ?? '—'}</span>,
    },
    {
      key: 'tiene_usuario' as const,
      label: 'Usuario',
      width: '110px',
      render: (p: PersonalRow) => p.tiene_usuario
        ? <span className="text-xs text-slate-400">Con acceso</span>
        : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">Sin cuenta</span>,
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
          titulo="Personal"
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
          labelNuevo="Nuevo Personal"
          accionExtra={p => (
            <>
              {!p.tiene_usuario && (
                <button
                  type="button" onClick={() => crearUsuarioDeAcceso(p)}
                  title="Crear usuario de acceso"
                  className="p-1.5 rounded-lg transition-colors text-indigo-600 hover:bg-indigo-50"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button" onClick={() => toggle(p)}
                title={p.activo ? 'Desactivar' : 'Activar'}
                className={cn('p-1.5 rounded-lg transition-colors', p.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50')}
              >
                <PowerIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
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
                <h3 className="text-white font-semibold">{editando ? 'Editar Personal' : 'Nuevo Personal'}</h3>
                <button type="button" onClick={cerrar} className="text-white/70 hover:text-white p-1 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cédula <span className="text-red-500">*</span>
                    </label>
                    <input {...register('cedula')} maxLength={10} inputMode="numeric"
                      onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/\D/g, '') }}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.cedula ? 'border-red-400' : 'border-slate-300')} />
                    {errors.cedula && <p className="text-xs text-red-500 mt-1">{errors.cedula.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cargo
                    </label>
                    <input {...register('cargo')} maxLength={100}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nombres <span className="text-red-500">*</span>
                    </label>
                    <input {...register('nombres')} maxLength={80}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.nombres ? 'border-red-400' : 'border-slate-300')} />
                    {errors.nombres && <p className="text-xs text-red-500 mt-1">{errors.nombres.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Apellidos <span className="text-red-500">*</span>
                    </label>
                    <input {...register('apellidos')} maxLength={80}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.apellidos ? 'border-red-400' : 'border-slate-300')} />
                    {errors.apellidos && <p className="text-xs text-red-500 mt-1">{errors.apellidos.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                    <input {...register('email')} type="email" maxLength={100}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.email ? 'border-red-400' : 'border-slate-300')} />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
                    <input {...register('telefono')} maxLength={20}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Dependencia <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('dependencia_id', { valueAsNumber: true })}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800] bg-white', errors.dependencia_id ? 'border-red-400' : 'border-slate-300')}
                    >
                      <option value="">— Seleccione —</option>
                      {dependencias.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                    </select>
                    {errors.dependencia_id && <p className="text-xs text-red-500 mt-1">{errors.dependencia_id.message}</p>}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...register('activo')} className="w-4 h-4 accent-[#0B1220]" />
                  <span className="text-sm text-slate-700">Activo</span>
                </label>

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
