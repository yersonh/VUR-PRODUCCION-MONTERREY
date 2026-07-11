import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon, PencilSquareIcon, DocumentArrowDownIcon,
  ArrowPathIcon, NoSymbolIcon, CheckCircleIcon,
  ClockIcon, DocumentCheckIcon, SparklesIcon,
  TrashIcon, PaperClipIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

import { AppLayout } from '@/components/layout/AppLayout'
import { EstadoBadge } from '@/components/ui/EstadoBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PDFUploader } from '@/components/ui/PDFUploader'
import radicadoService from '@/services/radicadoService'
import { formatNumeroRadicado, cn } from '@/lib/utils'
import type { Radicado, EstadoRadicado, RadicadoActuacion } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { useCatalogoStore } from '@/store/catalogoStore'

// ── Transiciones de estado permitidas ─────────────────────────────
const TRANSICIONES: Record<EstadoRadicado, EstadoRadicado[]> = {
  RADICADO:   ['EN_TRAMITE', 'ANULADO'],
  EN_TRAMITE: ['RESPONDIDO', 'CERRADO'],
  RESPONDIDO: ['CERRADO'],
  CERRADO:    [],
  ANULADO:    [],
}

const ESTADO_LABELS: Record<EstadoRadicado, string> = {
  RADICADO:   'Radicado',
  EN_TRAMITE: 'En Trámite',
  RESPONDIDO: 'Respondido',
  CERRADO:    'Cerrado',
  ANULADO:    'Anulado',
}

// ── Campo readonly ─────────────────────────────────────────────────
function Campo({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={cn(
        'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[36px]',
        mono ? 'font-mono font-bold text-[#0B1220]' : 'text-slate-700',
        !value && 'text-slate-300',
      )}>
        {value ?? '—'}
      </div>
    </div>
  )
}

// ── Sección ────────────────────────────────────────────────────────
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-[#0B1220] uppercase tracking-widest whitespace-nowrap">{titulo}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {children}
    </div>
  )
}

// ── Timeline de actuaciones ────────────────────────────────────────
function TimelineActuacion({ actuacion, isLast }: { actuacion: RadicadoActuacion; isLast: boolean }) {
  const fecha = (() => {
    try { return format(parseISO(actuacion.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es }) }
    catch { return actuacion.created_at }
  })()

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-[#0B1220] flex items-center justify-center shrink-0">
          <CheckCircleIcon className="w-4 h-4 text-white" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-200 my-1" />}
      </div>
      <div className={cn('pb-6', isLast && 'pb-0')}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {actuacion.estado_anterior && (
            <>
              <EstadoBadge estado={actuacion.estado_anterior.codigo} />
              <span className="text-slate-400 text-xs">→</span>
            </>
          )}
          <EstadoBadge estado={actuacion.estado_nuevo.codigo} />
        </div>
        <p className="text-sm text-slate-700 font-medium">{actuacion.descripcion}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {actuacion.usuario.name} · {fecha}
        </p>
      </div>
    </div>
  )
}

// ── Modal cambio de estado ─────────────────────────────────────────
interface CambiarEstadoModalProps {
  open: boolean
  estadoActual: EstadoRadicado
  onCambiar: (estado: EstadoRadicado, observacion: string) => void
  onClose: () => void
  guardando: boolean
}

function CambiarEstadoModal({ open, estadoActual, onCambiar, onClose, guardando }: CambiarEstadoModalProps) {
  const [estadoSel, setEstadoSel] = useState<EstadoRadicado | ''>('')
  const [observacion, setObservacion] = useState('')
  const opciones = TRANSICIONES[estadoActual] ?? []

  useEffect(() => {
    if (open) { setEstadoSel(''); setObservacion('') }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.18 } }}
        className="relative w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-[#0B1220] px-5 py-4">
          <h3 className="text-white font-semibold text-sm">Cambiar Estado del Radicado</h3>
          <p className="text-blue-200 text-xs mt-0.5">Estado actual: <strong>{ESTADO_LABELS[estadoActual]}</strong></p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Nuevo estado *</label>
            <div className="flex flex-col gap-2">
              {opciones.map(op => (
                <label key={op} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  estadoSel === op
                    ? 'border-[#C8A800] bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300',
                )}>
                  <input
                    type="radio"
                    name="estado_nuevo"
                    value={op}
                    checked={estadoSel === op}
                    onChange={() => setEstadoSel(op)}
                    className="accent-[#C8A800]"
                  />
                  <span className="flex-1">
                    <EstadoBadge estado={op} />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
              Observación {estadoSel === 'ANULADO' && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Motivo del cambio de estado..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800] resize-none"
              />
              <span className={cn(
                'absolute bottom-2 right-2.5 text-[10px]',
                observacion.length >= 270 ? 'text-red-400' : 'text-slate-400',
              )}>
                {observacion.length}/300
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => estadoSel && onCambiar(estadoSel, observacion)}
            disabled={!estadoSel || guardando || (estadoSel === 'ANULADO' && !observacion.trim())}
            className="flex-1 py-2.5 bg-[#0B1220] hover:bg-[#060911] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando...' : 'Confirmar cambio'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function RadicadoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { tiposAnexo } = useCatalogoStore()

  const [radicado, setRadicado] = useState<Radicado | null>(null)
  const [cargando, setCargando] = useState(true)
  const [modalEstado, setModalEstado] = useState(false)
  const [confirmAnular, setConfirmAnular] = useState(false)
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [subiendoPdfSalida, setSubiendoPdfSalida] = useState(false)
  const [pdfSalida, setPdfSalida] = useState<File | null>(null)

  const [nuevoAnexoDescripcion, setNuevoAnexoDescripcion] = useState('')
  const [nuevoAnexoTipoId, setNuevoAnexoTipoId] = useState<number | null>(null)
  const [nuevoAnexoArchivo, setNuevoAnexoArchivo] = useState<File | null>(null)
  const [agregandoAnexo, setAgregandoAnexo] = useState(false)
  const [eliminandoAnexoId, setEliminandoAnexoId] = useState<number | null>(null)

  const esAdmin = user?.role?.nombre === 'ADMIN'

  useEffect(() => {
    if (!id) return
    cargar()
  }, [id])

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await radicadoService.obtener(Number(id))
      setRadicado(data)
    } catch {
      toast.error('No se pudo cargar el radicado')
      navigate('/radicados')
    } finally {
      setCargando(false)
    }
  }

  const handleCambiarEstado = async (estado: EstadoRadicado, observacion: string) => {
    if (!radicado) return
    setGuardandoEstado(true)
    try {
      const actualizado = await radicadoService.cambiarEstado(radicado.id, estado, observacion)
      setRadicado(actualizado)
      setModalEstado(false)
      toast.success(`Estado cambiado a ${ESTADO_LABELS[estado]}`)
    } catch {
      toast.error('Error al cambiar el estado')
    } finally {
      setGuardandoEstado(false)
    }
  }

  const handleAnular = async () => {
    if (!radicado) return
    setConfirmAnular(false)
    try {
      await radicadoService.anular(radicado.id, 'Anulado por el usuario')
      toast.success('Radicado anulado')
      navigate('/radicados')
    } catch {
      toast.error('Error al anular el radicado')
    }
  }

  const handleSubirPdfSalida = async () => {
    if (!radicado || !pdfSalida) return
    setSubiendoPdfSalida(true)
    try {
      const fd = new FormData()
      fd.append('pdf_salida', pdfSalida)
      const actualizado = await radicadoService.actualizar(radicado.id, fd)
      setRadicado(actualizado)
      setPdfSalida(null)
      toast.success('PDF de respuesta adjuntado correctamente')
    } catch {
      toast.error('Error al subir el PDF')
    } finally {
      setSubiendoPdfSalida(false)
    }
  }

  const handleAgregarAnexo = async () => {
    if (!radicado || !nuevoAnexoDescripcion.trim()) return
    setAgregandoAnexo(true)
    try {
      const fd = new FormData()
      fd.append('anexos[0][descripcion]', nuevoAnexoDescripcion.trim())
      if (nuevoAnexoTipoId) fd.append('anexos[0][tipo_id]', String(nuevoAnexoTipoId))
      if (nuevoAnexoArchivo) fd.append('anexos[0][archivo]', nuevoAnexoArchivo)
      const actualizado = await radicadoService.agregarAnexos(radicado.id, fd)
      setRadicado(actualizado)
      setNuevoAnexoDescripcion('')
      setNuevoAnexoTipoId(null)
      setNuevoAnexoArchivo(null)
      toast.success('Anexo agregado')
    } catch {
      toast.error('Error al agregar el anexo')
    } finally {
      setAgregandoAnexo(false)
    }
  }

  const handleEliminarAnexo = async (documentoId: number) => {
    if (!radicado) return
    setEliminandoAnexoId(documentoId)
    try {
      const actualizado = await radicadoService.eliminarAnexo(radicado.id, documentoId)
      setRadicado(actualizado)
      toast.success('Anexo eliminado')
    } catch {
      toast.error('Error al eliminar el anexo')
    } finally {
      setEliminandoAnexoId(null)
    }
  }

  const formatFecha = (f?: string) => {
    if (!f) return '—'
    try { return format(parseISO(f), 'dd/MM/yyyy', { locale: es }) }
    catch { return f }
  }

  const nombreRemitente = () => {
    if (!radicado) return '—'
    if (radicado.tercero) {
      return radicado.tercero.nombre_completo
    }
    if (radicado.funcionario) {
      return radicado.funcionario.nombre_completo
    }
    return radicado.nombre_persona_empresa ?? '—'
  }

  const estadoActual = radicado?.estado?.codigo as EstadoRadicado | undefined
  const puedeAnular = esAdmin && estadoActual && !['CERRADO', 'ANULADO'].includes(estadoActual)
  const puedeCambiarEstado = estadoActual && TRANSICIONES[estadoActual]?.length > 0
  const puedeEditarAnexos = estadoActual && !['CERRADO', 'ANULADO'].includes(estadoActual)
  const tienePdfEntrada = (radicado?.documentos ?? []).some(d => d.tipo === 'ENTRADA')
  const tienePdfSalida = (radicado?.documentos ?? []).some(d => d.tipo === 'SALIDA')

  // ── Skeleton ───────────────────────────────────────────────────
  if (cargando) {
    return (
      <AppLayout subtitle="Detalle de Radicado">
        <div className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded-xl w-64" />
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-10 bg-slate-100 rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!radicado) return null

  return (
    <AppLayout subtitle={`Radicado ${formatNumeroRadicado(radicado.nro_radicado, radicado.año_radicado)}`}>
      <div className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full space-y-4">

        {/* ── Encabezado ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/radicados"
              className="p-2 rounded-xl border border-white/20 text-slate-200 hover:bg-white/10 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white font-mono">
                  {formatNumeroRadicado(radicado.nro_radicado, radicado.año_radicado)}
                </h1>
                {estadoActual && <EstadoBadge estado={estadoActual} />}
                {radicado.ia_procesado && (
                  <span className="flex items-center gap-1 text-xs text-indigo-300 font-medium">
                    <SparklesIcon className="w-3.5 h-3.5" /> IA
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-0.5">
                {formatFecha(radicado.fecha_radicacion)} · {radicado.hora_radicacion} · Operador: {radicado.operador.name}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={cargar}
              title="Recargar"
              className="p-2 border border-white/20 text-slate-200 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>

            {puedeCambiarEstado && (
              <button
                type="button"
                onClick={() => setModalEstado(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#C8A800] hover:bg-[#0B1220] text-white rounded-xl text-sm font-medium transition-colors"
              >
                <PencilSquareIcon className="w-4 h-4" /> Cambiar Estado
              </button>
            )}

            {puedeAnular && (
              <button
                type="button"
                onClick={() => setConfirmAnular(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
              >
                <NoSymbolIcon className="w-4 h-4" /> Anular
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* ── Columna principal (2/3) ───────────────────────────── */}
          <div className="xl:col-span-2 space-y-4">

            {/* Bloque encabezado */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <Seccion titulo="Datos de Radicación">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Campo label="Año" value={radicado.año_radicado} />
                  <Campo label="Número" value={radicado.nro_radicado} mono />
                  <Campo label="Fecha" value={formatFecha(radicado.fecha_radicacion)} />
                  <Campo label="Hora" value={radicado.hora_radicacion} />
                  <Campo label="Manejo" value={radicado.manejo} />
                  <Campo label="Procedencia" value={radicado.procedencia} />
                </div>
              </Seccion>

              <Seccion titulo="Remitente">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Campo
                    label="Tipo remitente"
                    value={{ TERCERO_NIT: 'Tercero / NIT', FUNCIONARIO: 'Funcionario', CIUDADANO: 'Ciudadano' }[radicado.tipo_remitente]}
                  />
                  <Campo label="Remitente" value={nombreRemitente()} />
                  <Campo label="Dependencia remitente" value={radicado.dependencia_remitente?.descripcion} />
                  <Campo label="Nombre Persona / Empresa" value={radicado.nombre_persona_empresa} />
                </div>
              </Seccion>

              <Seccion titulo="Tipo de Correspondencia">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Campo label="Tipo" value={radicado.tipo_correspondencia?.descripcion} />
                  <Campo label="Aux Tip" value={radicado.aux_tip?.descripcion} />
                  <Campo label="Asunto" value={radicado.aux_descripcion} />
                  <Campo
                    label="Fecha límite"
                    value={radicado.fecha_limite ? formatFecha(radicado.fecha_limite) : 'Sin límite'}
                  />
                </div>
              </Seccion>

              <Seccion titulo="Destino">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Campo label="Dependencia destino" value={radicado.dependencia_destino?.descripcion} />
                  <Campo
                    label="Responsable"
                    value={radicado.personal_destino?.nombre_completo}
                  />
                </div>
              </Seccion>

              <Seccion titulo="Documento Físico">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Campo label="Folios" value={radicado.folios ?? '—'} />
                  <Campo label="De" value={radicado.folios_de ?? '—'} />
                  <Campo label="Medio Ingreso" value={radicado.medio_ingreso?.descripcion} />
                  <Campo label="Fecha Documento" value={formatFecha(radicado.fecha_documento)} />
                  <Campo label="Fecha Entrega" value={formatFecha(radicado.fecha_entrega)} />
                </div>

                {/* Lista de anexos */}
                {radicado.anexos && radicado.anexos.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      Anexos ({radicado.anexos.length})
                    </span>
                    <ul className="space-y-1.5">
                      {radicado.anexos.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-[#C8A800] font-semibold shrink-0 mt-0.5">{i + 1}.</span>
                          <div className="flex-1 flex flex-col gap-0.5">
                            <span className="text-slate-700">{item.descripcion}</span>
                            {item.tipo_id && (
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                {tiposAnexo.find(t => t.id === item.tipo_id)?.descripcion ?? `Tipo #${item.tipo_id}`}
                              </span>
                            )}
                          </div>
                          {item.documento_id && (
                            <a
                              href={`/api/v1/radicados/${radicado.id}/documentos/${item.documento_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-[#C8A800] hover:text-[#0B1220] transition-colors shrink-0"
                              title="Descargar anexo"
                            >
                              <DocumentArrowDownIcon className="w-4 h-4" />
                            </a>
                          )}
                          {item.documento_id && puedeEditarAnexos && (
                            <button
                              type="button"
                              onClick={() => item.documento_id && handleEliminarAnexo(item.documento_id)}
                              disabled={eliminandoAnexoId === item.documento_id}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors shrink-0 disabled:opacity-40"
                              title="Eliminar anexo"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : radicado.cantidad_anexos != null && radicado.cantidad_anexos > 0 ? (
                  <div className="mt-3">
                    <Campo label="Cantidad Anexos" value={radicado.cantidad_anexos} />
                  </div>
                ) : null}

                {/* Agregar anexo nuevo */}
                {puedeEditarAnexos && (
                  <div className="mt-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <PaperClipIcon className="w-3.5 h-3.5" /> Agregar anexo
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={nuevoAnexoDescripcion}
                        onChange={e => setNuevoAnexoDescripcion(e.target.value)}
                        placeholder="Descripción del anexo"
                        maxLength={150}
                        className="sm:col-span-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                      />
                      <select
                        value={nuevoAnexoTipoId ?? ''}
                        onChange={e => setNuevoAnexoTipoId(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                      >
                        <option value="">Tipo de anexo...</option>
                        {tiposAnexo.map(t => (
                          <option key={t.id} value={t.id}>{t.descripcion}</option>
                        ))}
                      </select>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={e => setNuevoAnexoArchivo(e.target.files?.[0] ?? null)}
                        className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-[#C8A800] hover:file:bg-blue-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAgregarAnexo}
                      disabled={!nuevoAnexoDescripcion.trim() || agregandoAnexo}
                      className="px-4 py-1.5 bg-[#C8A800] hover:bg-[#0B1220] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {agregandoAnexo ? 'Agregando...' : '+ Agregar anexo'}
                    </button>
                  </div>
                )}
              </Seccion>

              {radicado.observaciones && (
                <Seccion titulo="Observaciones">
                  <div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {radicado.observaciones}
                  </div>
                </Seccion>
              )}
            </div>

            {/* PDFs adjuntos */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <Seccion titulo="Documentos PDF">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* PDF Entrada */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">PDF Entrada</span>
                    {tienePdfEntrada ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <DocumentCheckIcon className="w-5 h-5 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {radicado.documentos?.find(d => d.tipo === 'ENTRADA')?.nombre_original ?? 'documento.pdf'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(() => {
                              const bytes = radicado.documentos?.find(d => d.tipo === 'ENTRADA')?.tamanio_bytes ?? 0
                              return bytes < 1024 * 1024
                                ? `${(bytes / 1024).toFixed(1)} KB`
                                : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                            })()}
                          </p>
                        </div>
                        <a
                          href={`/api/v1/radicados/${radicado.id}/pdf/entrada`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-green-600 hover:text-green-800 transition-colors"
                          title="Descargar PDF entrada"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400 text-sm">
                        Sin PDF de entrada adjunto
                      </div>
                    )}
                  </div>

                  {/* PDF Salida */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">PDF Salida / Respuesta</span>
                    {tienePdfSalida ? (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <DocumentCheckIcon className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {radicado.documentos?.find(d => d.tipo === 'SALIDA')?.nombre_original ?? 'respuesta.pdf'}
                          </p>
                        </div>
                        <a
                          href={`/api/v1/radicados/${radicado.id}/pdf/salida`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Descargar PDF salida"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </a>
                      </div>
                    ) : estadoActual && !['CERRADO', 'ANULADO'].includes(estadoActual) && radicado.puede_responder ? (
                      <div className="space-y-2">
                        <PDFUploader
                          label=""
                          file={pdfSalida}
                          onFile={setPdfSalida}
                          onRemove={() => setPdfSalida(null)}
                        />
                        {pdfSalida && (
                          <button
                            type="button"
                            onClick={handleSubirPdfSalida}
                            disabled={subiendoPdfSalida}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {subiendoPdfSalida ? 'Subiendo...' : 'Adjuntar PDF de respuesta'}
                          </button>
                        )}
                      </div>
                    ) : estadoActual && !['CERRADO', 'ANULADO'].includes(estadoActual) ? (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-dashed border-amber-200 rounded-xl text-amber-600 text-xs">
                        Solo el funcionario responsable de este radicado puede adjuntar la respuesta.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400 text-sm">
                        Sin PDF de respuesta
                      </div>
                    )}
                  </div>
                </div>
              </Seccion>
            </div>
          </div>

          {/* ── Columna lateral (1/3) ─────────────────────────────── */}
          <div className="space-y-4">

            {/* Resumen rápido */}
            <div className="bg-[#0B1220] rounded-2xl p-5 text-white space-y-3">
              <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">Resumen</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">Estado</span>
                  {estadoActual && <EstadoBadge estado={estadoActual} />}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">Manejo</span>
                  <span className="font-medium">{radicado.manejo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">Procedencia</span>
                  <span className="font-medium">{radicado.procedencia}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">PDF Entrada</span>
                  <span className={tienePdfEntrada ? 'text-green-300 font-medium' : 'text-slate-400'}>
                    {tienePdfEntrada ? '✓ Adjunto' : '✗ Sin PDF'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">PDF Respuesta</span>
                  <span className={tienePdfSalida ? 'text-green-300 font-medium' : 'text-slate-400'}>
                    {tienePdfSalida ? '✓ Adjunto' : '✗ Sin PDF'}
                  </span>
                </div>
                {radicado.fecha_limite && (
                  <>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-200">Fecha límite</span>
                      <span className="font-medium text-[#C8A800]">{formatFecha(radicado.fecha_limite)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Timeline de actuaciones */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="w-4 h-4 text-[#0B1220]" />
                <span className="text-sm font-bold text-[#0B1220] uppercase tracking-wide">Historial</span>
              </div>

              {(radicado.actuaciones ?? []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin actuaciones registradas</p>
              ) : (
                <div>
                  {[...(radicado.actuaciones ?? [])].reverse().map((act, i, arr) => (
                    <TimelineActuacion
                      key={act.id}
                      actuacion={act}
                      isLast={i === arr.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Modales ───────────────────────────────────────────────── */}
      <CambiarEstadoModal
        open={modalEstado}
        estadoActual={estadoActual ?? 'RADICADO'}
        onCambiar={handleCambiarEstado}
        onClose={() => setModalEstado(false)}
        guardando={guardandoEstado}
      />

      <ConfirmDialog
        open={confirmAnular}
        title="¿Anular radicado?"
        message={`Se anulará el radicado ${formatNumeroRadicado(radicado.nro_radicado, radicado.año_radicado)}. Esta acción no se puede deshacer.`}
        labelSi="Sí, anular"
        labelNo="No, cancelar"
        onSi={handleAnular}
        onNo={() => setConfirmAnular(false)}
      />
    </AppLayout>
  )
}
