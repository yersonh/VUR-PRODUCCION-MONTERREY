import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon, PowerIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable } from '@/components/admin/AdminTable'
import { usuariosAdmin } from '@/services/adminService'
import { useCatalogoStore } from '@/store/catalogoStore'
import type { User, Role } from '@/types'
import { cn } from '@/lib/utils'

// Schema único con password opcional — se valida en backend si está vacío en edición
const schema = z.object({
  name:           z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email:          z.string().email('Email inválido').max(100),
  password:       z.string().min(8, 'Mínimo 8 caracteres').or(z.literal('')),
  role_id:        z.number().min(1, 'Seleccione un rol'),
  dependencia_id: z.number().nullable().optional(),
  activo:         z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Estado {
  data: User[]
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

export default function UsuariosAdmin() {
  const { dependencias } = useCatalogoStore()
  const [roles, setRoles] = useState<Role[]>([])
  const [estado, setEstado] = useState<Estado>({ data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true })
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<User | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mostrarPass, setMostrarPass] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { activo: true, password: '' },
  })

  useEffect(() => {
    usuariosAdmin.roles().then(setRoles).catch(() => {})
  }, [])

  const cargar = useCallback(async (pagina: number, q: string) => {
    setEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await usuariosAdmin.list({ page: pagina, q, per_page: 20 })
      setEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch {
      toast.error('Error al cargar usuarios')
      setEstado(s => ({ ...s, cargando: false }))
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(1, busqueda), busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  const abrirNuevo = () => {
    setEditando(null)
    reset({ name: '', email: '', password: '', role_id: undefined as unknown as number, dependencia_id: null, activo: true })
    setMostrarPass(false)
    setModalAbierto(true)
  }

  const abrirEditar = (u: User) => {
    setEditando(u)
    reset({
      name:           u.name,
      email:          u.email,
      password:       '',
      role_id:        u.role_id,
      dependencia_id: u.dependencia_id ?? null,
      activo:         u.activo,
    })
    setMostrarPass(false)
    setModalAbierto(true)
  }

  const cerrar = () => { setModalAbierto(false); setEditando(null) }

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    // Si estamos editando y no se cambió la contraseña, la omitimos
    const payload: Record<string, unknown> = { ...data }
    if (editando && !payload.password) delete payload.password
    try {
      if (editando) {
        await usuariosAdmin.update(editando.id, payload)
        toast.success('Usuario actualizado')
      } else {
        await usuariosAdmin.create(payload)
        toast.success('Usuario creado')
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

  const toggle = async (u: User) => {
    try {
      await usuariosAdmin.toggle(u.id)
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
      cargar(estado.pagina, busqueda)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al cambiar estado')
    }
  }

  const columnas = [
    { key: 'id'             as const, label: '#',      width: '60px' },
    { key: 'name'           as const, label: 'Nombre' },
    { key: 'email'          as const, label: 'Email' },
    {
      key: 'role' as const,
      label: 'Rol',
      width: '130px',
      render: (u: User) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
          {u.role?.nombre ?? '—'}
        </span>
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
          titulo="Usuarios del Sistema"
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
          labelNuevo="Nuevo Usuario"
          accionExtra={u => (
            <button
              type="button" onClick={() => toggle(u)}
              title={u.activo ? 'Desactivar' : 'Activar'}
              className={cn('p-1.5 rounded-lg transition-colors', u.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50')}
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
            variants={overlayVariants} initial="initial" animate="animate" exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) cerrar() }}
          >
            <motion.div
              variants={modalVariants} initial="initial" animate="animate" exit="exit"
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-[#1B3A6E] px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-semibold">
                  {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button type="button" onClick={cerrar} className="text-white/70 hover:text-white p-1 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-name">
                      Nombre completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="u-name" {...register('name')} maxLength={100}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]', errors.name ? 'border-red-400' : 'border-slate-300')}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-email">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="u-email" type="email" {...register('email')}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]', errors.email ? 'border-red-400' : 'border-slate-300')}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div className="col-span-2 relative">
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-pass">
                      Contraseña{!editando && <span className="text-red-500 ml-1">*</span>}
                      {editando && <span className="font-normal text-slate-400 ml-1">(vacío = sin cambios)</span>}
                    </label>
                    <input
                      id="u-pass" type={mostrarPass ? 'text' : 'password'}
                      {...register('password')}
                      className={cn('w-full px-3 py-2 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]', errors.password ? 'border-red-400' : 'border-slate-300')}
                    />
                    <button type="button" onClick={() => setMostrarPass(v => !v)}
                      className="absolute right-3 top-[calc(1.5rem+0.625rem)] text-slate-400 hover:text-slate-600"
                    >
                      {mostrarPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-rol">
                      Rol <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="u-rol"
                      {...register('role_id', { valueAsNumber: true })}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8] bg-white', errors.role_id ? 'border-red-400' : 'border-slate-300')}
                    >
                      <option value="">— Seleccione —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                    {errors.role_id && <p className="text-xs text-red-500 mt-1">{errors.role_id.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-dep">
                      Dependencia
                    </label>
                    <select
                      id="u-dep"
                      {...register('dependencia_id', { setValueAs: v => v === '' ? null : Number(v) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8] bg-white"
                    >
                      <option value="">— Sin dependencia —</option>
                      {dependencias.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...register('activo')} className="w-4 h-4 accent-[#1B3A6E]" />
                  <span className="text-sm text-slate-700">Usuario activo</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={cerrar} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="submit" disabled={guardando} className="px-6 py-2 bg-[#1B3A6E] hover:bg-[#14306A] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
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
