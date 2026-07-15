import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon, PowerIcon, KeyIcon, IdentificationIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable } from '@/components/admin/AdminTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usuariosAdmin } from '@/services/adminService'
import { useCatalogoStore } from '@/store/catalogoStore'
import type { User, Role } from '@/types'
import { cn } from '@/lib/utils'

interface PrefillFuncionario {
  funcionario_id: number
  nombre: string
  email?: string | null
  dependencia_id?: number | null
  cargo?: string | null
}

const schema = z.object({
  name:           z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email:          z.string().email('Email inválido').max(100),
  role_id:        z.number().min(1, 'Seleccione un rol'),
  dependencia_id: z.number().nullable().optional(),
  funcionario_id: z.number().nullable().optional(),
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
  const location = useLocation()
  const navigate = useNavigate()
  const { dependencias } = useCatalogoStore()

  // Prefill desde "Crear usuario de acceso" en Personal/Funcionarios — se lee
  // una sola vez al montar (el componente remonta en cada navegación a esta
  // ruta), así que puede alimentar directamente el estado inicial en lugar
  // de setearse desde un efecto.
  const [prefillFuncionario] = useState<PrefillFuncionario | null>(
    () => (location.state as { crearDesdeFuncionario?: PrefillFuncionario } | null)?.crearDesdeFuncionario ?? null
  )

  const [roles, setRoles] = useState<Role[]>([])
  const [estado, setEstado] = useState<Estado>({ data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true })
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<User | null>(null)
  const [modalAbierto, setModalAbierto] = useState(!!prefillFuncionario)
  const [guardando, setGuardando] = useState(false)
  const [vinculoFuncionario, setVinculoFuncionario] = useState<PrefillFuncionario | null>(prefillFuncionario)
  const [restableciendo, setRestableciendo] = useState<User | null>(null)
  const [restaurando, setRestaurando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:           prefillFuncionario?.nombre ?? '',
      email:          prefillFuncionario?.email ?? '',
      dependencia_id: prefillFuncionario?.dependencia_id ?? null,
      funcionario_id: prefillFuncionario?.funcionario_id ?? null,
      activo:         true,
    },
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

  // Limpia el location.state para que un F5 no reabra el modal de prefill.
  // No toca estado propio del componente, solo el historial del router.
  useEffect(() => {
    if (prefillFuncionario) {
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setVinculoFuncionario(null)
    reset({ name: '', email: '', role_id: undefined as unknown as number, dependencia_id: null, funcionario_id: null, activo: true })
    setModalAbierto(true)
  }

  const abrirEditar = (u: User) => {
    setEditando(u)
    setVinculoFuncionario(u.funcionario_id ? {
      funcionario_id: u.funcionario_id,
      nombre: u.funcionario_nombre ?? `Funcionario #${u.funcionario_id}`,
    } : null)
    reset({
      name:           u.name,
      email:          u.email,
      role_id:        u.role_id,
      dependencia_id: u.dependencia_id ?? null,
      funcionario_id: u.funcionario_id ?? null,
      activo:         u.activo,
    })
    setModalAbierto(true)
  }

  const cerrar = () => { setModalAbierto(false); setEditando(null); setVinculoFuncionario(null) }

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    try {
      if (editando) {
        await usuariosAdmin.update(editando.id, data)
        toast.success('Usuario actualizado')
      } else {
        await usuariosAdmin.create(data)
        toast.success('Usuario creado. Se enviaron las credenciales por correo.')
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

  const confirmarResetPassword = async () => {
    if (!restableciendo) return
    setRestaurando(true)
    try {
      await usuariosAdmin.resetPassword(restableciendo.id)
      toast.success('Se generó una nueva contraseña y se envió por correo')
      cargar(estado.pagina, busqueda)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al restablecer la contraseña')
    } finally {
      setRestaurando(false)
      setRestableciendo(null)
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
    {
      key: 'debe_cambiar_password' as const,
      label: 'Acceso',
      width: '150px',
      render: (u: User) => u.debe_cambiar_password
        ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">Pendiente 1er cambio</span>
        : <span className="text-xs text-slate-400">Activado</span>,
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
          titulo="Usuarios del Sistema"
          columnas={columnas}
          filas={estado.data}
          total={estado.total}
          pagina={estado.pagina}
          ultimaPagina={estado.ultimaPagina}
          cargando={estado.cargando}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          onNuevo={() => abrirNuevo()}
          onEditar={abrirEditar}
          onPagina={p => cargar(p, busqueda)}
          labelNuevo="Nuevo Usuario"
          accionExtra={u => (
            <>
              <button
                type="button" onClick={() => setRestableciendo(u)}
                title="Restablecer contraseña"
                className="p-1.5 rounded-lg transition-colors text-slate-500 hover:bg-slate-100"
              >
                <KeyIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button" onClick={() => toggle(u)}
                title={u.activo ? 'Desactivar' : 'Activar'}
                className={cn('p-1.5 rounded-lg transition-colors', u.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50')}
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
                <h3 className="text-white font-semibold">
                  {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button type="button" onClick={cerrar} className="text-white/70 hover:text-white p-1 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                {vinculoFuncionario && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700">
                    <IdentificationIcon className="w-4 h-4 shrink-0" />
                    <span>Vinculado a: <strong>{vinculoFuncionario.nombre}</strong>{vinculoFuncionario.cargo ? ` — ${vinculoFuncionario.cargo}` : ''}</span>
                  </div>
                )}

                {!editando && (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    Se generará una contraseña temporal aleatoria y se enviará por correo. El usuario deberá cambiarla al iniciar sesión.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-name">
                      Nombre completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="u-name" {...register('name')} maxLength={100}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.name ? 'border-red-400' : 'border-slate-300')}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-email">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="u-email" type="email" {...register('email')}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.email ? 'border-red-400' : 'border-slate-300')}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="u-rol">
                      Rol <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="u-rol"
                      {...register('role_id', { valueAsNumber: true })}
                      className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800] bg-white', errors.role_id ? 'border-red-400' : 'border-slate-300')}
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800] bg-white"
                    >
                      <option value="">— Sin dependencia —</option>
                      {dependencias.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                    </select>
                  </div>
                </div>

                <input type="hidden" {...register('funcionario_id', { setValueAs: v => v === '' ? null : Number(v) })} />

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...register('activo')} className="w-4 h-4 accent-[#0B1220]" />
                  <span className="text-sm text-slate-700">Usuario activo</span>
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

      <ConfirmDialog
        open={restableciendo !== null}
        title="¿Restablecer contraseña?"
        message={`Se generará una nueva contraseña temporal para ${restableciendo?.name ?? ''} y se enviará por correo. Deberá cambiarla al iniciar sesión.`}
        labelSi="Sí, restablecer"
        labelNo="Cancelar"
        onSi={confirmarResetPassword}
        onNo={() => setRestableciendo(null)}
        loadingSi={restaurando}
      />
    </AppLayout>
  )
}
