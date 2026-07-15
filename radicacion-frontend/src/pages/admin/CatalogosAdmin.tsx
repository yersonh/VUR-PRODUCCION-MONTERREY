import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { XMarkIcon, PowerIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { auxTipsAdmin, tiposAnexoAdmin, mediosIngresoAdmin } from '@/services/adminService'
import type { AuxTip, TipoAnexo, MedioIngreso, TipoCorrespondencia } from '@/types'
import { useCatalogoStore } from '@/store/catalogoStore'
import { cn } from '@/lib/utils'

type Tab = 'aux_tips' | 'tipos_anexo' | 'medios_ingreso'

const TABS: { id: Tab; label: string }[] = [
  { id: 'aux_tips',       label: 'Aux Tips (Subtipo)' },
  { id: 'tipos_anexo',    label: 'Tipos de Anexo' },
  { id: 'medios_ingreso', label: 'Medios de Ingreso' },
]

// ── Schemas ────────────────────────────────────────────────────────
const schemaConToggle = z.object({
  descripcion:             z.string().min(1, 'Requerido').max(100),
  tipo_correspondencia_id: z.number().nullable().optional(),
  zona:                    z.enum(['URBANO', 'RURAL']).nullable().optional(),
  activo:                  z.boolean().optional(),
})

type FormData = z.infer<typeof schemaConToggle>

// ── Estado genérico ────────────────────────────────────────────────
interface TableState<T> {
  data: T[]
  total: number
  pagina: number
  ultimaPagina: number
  cargando: boolean
}

function emptyState<T>(): TableState<T> {
  return { data: [], total: 0, pagina: 1, ultimaPagina: 1, cargando: true }
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

// ── Tabla genérica con toggle ──────────────────────────────────────
function CatalogoTab<T extends { id: number; descripcion: string }>({
  titulo,
  labelNuevo,
  estado,
  busqueda,
  onBuscar,
  onNuevo,
  onEditar,
  onPagina,
  onToggle,
  conToggle = true,
  colExtra,
}: {
  titulo: string
  labelNuevo: string
  estado: TableState<T>
  busqueda: string
  onBuscar: (q: string) => void
  onNuevo: () => void
  onEditar: (fila: T) => void
  onPagina: (p: number) => void
  onToggle?: (fila: T) => void
  conToggle?: boolean
  colExtra?: AdminColumn<T>
}) {
  const columnas: AdminColumn<T>[] = [
    { key: 'id' as keyof T, label: '#', width: '60px' },
    { key: 'descripcion' as keyof T, label: 'Descripción' },
    ...(colExtra ? [colExtra] : []),
    ...(conToggle ? [{ key: 'activo' as keyof T, label: 'Estado', width: '90px' }] : []),
  ]

  return (
    <AdminTable
      titulo={titulo}
      columnas={columnas}
      filas={estado.data}
      total={estado.total}
      pagina={estado.pagina}
      ultimaPagina={estado.ultimaPagina}
      cargando={estado.cargando}
      busqueda={busqueda}
      onBuscar={onBuscar}
      onNuevo={onNuevo}
      onEditar={onEditar}
      onPagina={onPagina}
      labelNuevo={labelNuevo}
      accionExtra={conToggle && onToggle ? (fila) => (
        <button
          type="button"
          onClick={() => onToggle(fila)}
          title={(fila as unknown as { activo?: boolean }).activo ? 'Desactivar' : 'Activar'}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            (fila as unknown as { activo?: boolean }).activo
              ? 'text-red-500 hover:bg-red-50'
              : 'text-green-600 hover:bg-green-50',
          )}
        >
          <PowerIcon className="w-3.5 h-3.5" />
        </button>
      ) : undefined}
    />
  )
}

// ── Componente principal ───────────────────────────────────────────
export default function CatalogosAdmin() {
  const { tiposCorrespondencia } = useCatalogoStore()
  const [tabActiva, setTabActiva] = useState<Tab>('aux_tips')

  const [auxTipsEstado, setAuxTipsEstado] = useState<TableState<AuxTip>>(emptyState())
  const [tiposAnexoEstado, setTiposAnexoEstado] = useState<TableState<TipoAnexo>>(emptyState())
  const [mediosEstado, setMediosEstado] = useState<TableState<MedioIngreso>>(emptyState())

  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [conToggle, setConToggle] = useState(true)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schemaConToggle),
    defaultValues: { activo: true, tipo_correspondencia_id: null, zona: null },
  })

  // Carga per-tab
  const cargarAuxTips = useCallback(async (pagina: number, q: string) => {
    setAuxTipsEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await auxTipsAdmin.list({ page: pagina, q })
      setAuxTipsEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch { setAuxTipsEstado(s => ({ ...s, cargando: false })) }
  }, [])

  const cargarTiposAnexo = useCallback(async (pagina: number, q: string) => {
    setTiposAnexoEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await tiposAnexoAdmin.list({ page: pagina, q })
      setTiposAnexoEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch { setTiposAnexoEstado(s => ({ ...s, cargando: false })) }
  }, [])

  const cargarMedios = useCallback(async (pagina: number, q: string) => {
    setMediosEstado(s => ({ ...s, cargando: true }))
    try {
      const res = await mediosIngresoAdmin.list({ page: pagina, q })
      setMediosEstado({ data: res.data, total: res.meta.total, pagina: res.meta.current_page, ultimaPagina: res.meta.last_page, cargando: false })
    } catch { setMediosEstado(s => ({ ...s, cargando: false })) }
  }, [])

  useEffect(() => {
    setBusqueda('')
    if (tabActiva === 'aux_tips') cargarAuxTips(1, '')
    if (tabActiva === 'tipos_anexo') cargarTiposAnexo(1, '')
    if (tabActiva === 'medios_ingreso') cargarMedios(1, '')
  }, [tabActiva, cargarAuxTips, cargarTiposAnexo, cargarMedios])

  useEffect(() => {
    const t = setTimeout(() => {
      if (tabActiva === 'aux_tips') cargarAuxTips(1, busqueda)
      if (tabActiva === 'tipos_anexo') cargarTiposAnexo(1, busqueda)
      if (tabActiva === 'medios_ingreso') cargarMedios(1, busqueda)
    }, busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [busqueda, tabActiva, cargarAuxTips, cargarTiposAnexo, cargarMedios])

  const abrirNuevo = (hasToggle: boolean) => {
    setEditandoId(null)
    setConToggle(hasToggle)
    reset({ descripcion: '', tipo_correspondencia_id: null, zona: null, activo: true })
    setModalAbierto(true)
  }

  const abrirEditar = (fila: { id: number; descripcion: string; activo?: boolean; tipo_correspondencia_id?: number | null; zona?: 'URBANO' | 'RURAL' | null }, hasToggle: boolean) => {
    setEditandoId(fila.id)
    setConToggle(hasToggle)
    reset({
      descripcion: fila.descripcion,
      tipo_correspondencia_id: fila.tipo_correspondencia_id ?? null,
      zona: fila.zona ?? null,
      activo: fila.activo ?? true,
    })
    setModalAbierto(true)
  }

  const cerrar = () => { setModalAbierto(false); setEditandoId(null) }

  const recargarActiva = (pagina = 1, q = busqueda) => {
    if (tabActiva === 'aux_tips') cargarAuxTips(pagina, q)
    if (tabActiva === 'tipos_anexo') cargarTiposAnexo(pagina, q)
    if (tabActiva === 'medios_ingreso') cargarMedios(pagina, q)
  }

  const onSubmit = async (data: FormData) => {
    setGuardando(true)
    try {
      if (tabActiva === 'aux_tips') {
        if (editandoId) await auxTipsAdmin.update(editandoId, data)
        else await auxTipsAdmin.create(data)
      } else if (tabActiva === 'tipos_anexo') {
        if (editandoId) await tiposAnexoAdmin.update(editandoId, data)
        else await tiposAnexoAdmin.create(data)
      } else {
        if (editandoId) await mediosIngresoAdmin.update(editandoId, data)
        else await mediosIngresoAdmin.create(data)
      }
      toast.success(editandoId ? 'Actualizado correctamente' : 'Creado correctamente')
      cerrar()
      recargarActiva()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const toggleAux = async (fila: AuxTip) => {
    try {
      await auxTipsAdmin.toggle(fila.id)
      cargarAuxTips(auxTipsEstado.pagina, busqueda)
    } catch { toast.error('Error') }
  }

  const titulo = {
    aux_tips:       'Aux Tips (Subtipos de Correspondencia)',
    tipos_anexo:    'Tipos de Anexo',
    medios_ingreso: 'Medios de Ingreso',
  }[tabActiva]

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }}
        className="p-6 w-full space-y-6"
      >
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabActiva(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tabActiva === tab.id
                  ? 'bg-white text-[#0B1220] shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tablas */}
        {tabActiva === 'aux_tips' && (
          <CatalogoTab
            titulo="Aux Tips (Subtipos de Correspondencia)"
            labelNuevo="Nuevo Aux Tip"
            estado={auxTipsEstado}
            busqueda={busqueda}
            onBuscar={setBusqueda}
            onNuevo={() => abrirNuevo(true)}
            onEditar={(f: AuxTip) => abrirEditar(f, true)}
            onPagina={p => cargarAuxTips(p, busqueda)}
            onToggle={toggleAux}
            conToggle
            colExtra={{
              key: 'zona' as keyof AuxTip,
              label: 'Zona',
              width: '80px',
              render: (fila: AuxTip) => fila.zona ? (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  fila.zona === 'URBANO' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>{fila.zona}</span>
              ) : null,
            }}
          />
        )}

        {tabActiva === 'tipos_anexo' && (
          <CatalogoTab
            titulo="Tipos de Anexo"
            labelNuevo="Nuevo Tipo Anexo"
            estado={tiposAnexoEstado}
            busqueda={busqueda}
            onBuscar={setBusqueda}
            onNuevo={() => abrirNuevo(false)}
            onEditar={(f: TipoAnexo) => abrirEditar(f, false)}
            onPagina={p => cargarTiposAnexo(p, busqueda)}
            conToggle={false}
          />
        )}

        {tabActiva === 'medios_ingreso' && (
          <CatalogoTab
            titulo="Medios de Ingreso"
            labelNuevo="Nuevo Medio"
            estado={mediosEstado}
            busqueda={busqueda}
            onBuscar={setBusqueda}
            onNuevo={() => abrirNuevo(false)}
            onEditar={(f: MedioIngreso) => abrirEditar(f, false)}
            onPagina={p => cargarMedios(p, busqueda)}
            conToggle={false}
          />
        )}
      </motion.div>

      {/* Modal único para todos los catálogos */}
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
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-[#0B1220] px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-semibold">
                  {editandoId ? `Editar — ${titulo}` : `Nuevo — ${titulo}`}
                </h3>
                <button type="button" onClick={cerrar} className="text-white/70 hover:text-white p-1 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('descripcion')} maxLength={100}
                    className={cn('w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]', errors.descripcion ? 'border-red-400' : 'border-slate-300')}
                  />
                  {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>}
                </div>

                {/* Campos extra solo para AuxTips */}
                {tabActiva === 'aux_tips' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Tipo Correspondencia
                      </label>
                      <select
                        {...register('tipo_correspondencia_id', { setValueAs: v => v === '' ? null : Number(v) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                      >
                        <option value="">— Ninguno —</option>
                        {tiposCorrespondencia.map((t: TipoCorrespondencia) => (
                          <option key={t.id} value={t.id}>{t.descripcion}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Zona</label>
                      <select
                        {...register('zona', { setValueAs: v => v === '' ? null : v })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                      >
                        <option value="">— Sin zona —</option>
                        <option value="URBANO">URBANO</option>
                        <option value="RURAL">RURAL</option>
                      </select>
                    </div>
                  </>
                )}

                {conToggle && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" {...register('activo')} className="w-4 h-4 accent-[#0B1220]" />
                    <span className="text-sm text-slate-700">Activo</span>
                  </label>
                )}

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
