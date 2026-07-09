import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { SparklesIcon } from '@heroicons/react/24/solid'

import { AppLayout } from '@/components/layout/AppLayout'
import { LookupField } from '@/components/ui/LookupField'
import { SearchModal, type SearchColumn, type SearchRow } from '@/components/ui/SearchModal'
import { CrearTerceroModal, type TerceroCreado, type TerceroDefaults } from '@/components/ui/CrearTerceroModal'
import { CrearFuncionarioModal, type FuncionarioCreado, type FuncionarioDefaults } from '@/components/ui/CrearFuncionarioModal'
import type { AuxTip, IACamposSugeridos, TerceroContacto } from '@/types'
import { CharCountInput } from '@/components/ui/CharCountInput'
import { CharCountTextarea } from '@/components/ui/CharCountTextarea'
import { PDFUploader } from '@/components/ui/PDFUploader'
import { IABanner, type CampoAplicado } from '@/components/ui/IABanner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EstadoBadge } from '@/components/ui/EstadoBadge'
import { useRadicadoForm } from '@/hooks/useRadicadoForm'
import { useCatalogoStore } from '@/store/catalogoStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

// ── Modales abiertos ───────────────────────────────────────────────
type ModalKey =
  | 'tercero' | 'funcionario'
  | 'tipoCorr' | 'auxTip'
  | 'depDestino' | 'personalDestino' | 'terceroDestino'
  | 'depRemitente'
  | null

interface TerceroRow {
  id: number
  codigo: string
  nit: string
  razon_social: string
  municipio: string | null
  email: string | null
}

// ── Sección separador ─────────────────────────────────────────────
function SeccionTitulo({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[11px] font-bold text-[#1B3A6E] uppercase tracking-widest whitespace-nowrap">
        {titulo}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

// ── Campo de solo lectura ─────────────────────────────────────────
function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 min-h-[38px]">
        {value || <span className="text-slate-300">—</span>}
      </div>
    </div>
  )
}

// ── Columnas para cada modal ───────────────────────────────────────
const COL_TERCERO: SearchColumn[] = [
  { key: 'nit', label: 'NIT / Doc', width: '130px' },
  { key: 'razon_social', label: 'Razón Social / Nombre' },
  { key: 'municipio', label: 'Municipio', width: '120px' },
]
const COL_FUNCIONARIO: SearchColumn[] = [
  { key: 'cedula', label: 'Cédula', width: '120px' },
  { key: 'nombre_completo', label: 'Nombre Completo' },
  { key: 'cargo', label: 'Cargo', width: '150px' },
  { key: 'dependencia_nombre', label: 'Dependencia', width: '160px' },
]
const COL_TIPO_CORR: SearchColumn[] = [
  { key: 'descripcion', label: 'Descripción' },
  { key: 'max_dias', label: 'Días', width: '60px' },
]
const COL_AUX_TIP: SearchColumn[] = [
  { key: 'descripcion', label: 'Descripción' },
]
const COL_DEPENDENCIA: SearchColumn[] = [
  { key: 'descripcion', label: 'Descripción' },
]
const COL_PERSONAL: SearchColumn[] = [
  { key: 'cedula', label: 'Cédula', width: '130px' },
  { key: 'nombre_completo', label: 'Nombre Completo' },
  { key: 'cargo', label: 'Cargo', width: '140px' },
]

export default function RadicadoNuevo() {
  const navigate = useNavigate()
  const {
    form, añoRadicado, fechaRadicacion, horaRadicacion,
    display, setDisplayField,
    calcularFechaLimite,
    limpiarRemitente, limpiarTipoCorr, limpiarAuxTip, limpiarDestino,
    tieneAnexos, setTieneAnexos,
    pdfEntrada, setPdfEntrada,
    iaSugerencias, setIaSugerencias, iaProcessing, setIaProcessing,
    resetForm,
  } = useRadicadoForm()

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form
  const { dependencias, tiposCorrespondencia, auxTips, tiposAnexo, mediosIngreso, tiposIdentificacion } = useCatalogoStore()
  const user = useAuthStore(s => s.user)

  const [selectedAuxTip, setSelectedAuxTip] = useState<AuxTip | null>(null)
  const [siguienteNumero, setSiguienteNumero] = useState<string>('...')
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/radicados/siguiente-numero`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` },
    })
      .then(r => r.json())
      .then(d => setSiguienteNumero(d.numero ?? '—'))
      .catch(() => setSiguienteNumero('—'))
  }, [])

  const [modalAbierto, setModalAbierto] = useState<ModalKey>(null)
  const [confirmCancelar, setConfirmCancelar] = useState(false)
  const [terceroNoRegistrado, setTerceroNoRegistrado] = useState<IACamposSugeridos | null>(null)
  const [funcionarioNoRegistrado, setFuncionarioNoRegistrado] = useState<IACamposSugeridos | null>(null)

  // Modal crear tercero — contexto 'remitente' | 'destino'
  const [creandoTerceroCtx, setCreandoTerceroCtx] = useState<'remitente' | 'destino' | null>(null)
  const [terceroDefaults, setTerceroDefaults] = useState<TerceroDefaults | undefined>()

  // Modal crear funcionario — contexto 'remitente' | 'destino'
  const [creandoFuncionarioCtx, setCreandoFuncionarioCtx] = useState<'remitente' | 'destino' | null>(null)
  const [funcionarioDefaults, setFuncionarioDefaults] = useState<FuncionarioDefaults | undefined>()
  const [funcionarioRows, setFuncionarioRows] = useState<SearchRow[]>([])
  const [funcionarioLoading, setFuncionarioLoading] = useState(false)
  const debounceRefFun = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Contactos de empresa remitente ───────────────────────────────
  const [contactosEmpresa, setContactosEmpresa] = useState<TerceroContacto[]>([])
  const [loadingContactos, setLoadingContactos] = useState(false)

  // ── Contactos de empresa destino ──────────────────────────────────
  const [contactosEmpresaDestino, setContactosEmpresaDestino] = useState<TerceroContacto[]>([])
  const [loadingContactosDestino, setLoadingContactosDestino] = useState(false)

  // ── Destino (interno o externo) ───────────────────────────────────
  const [destinoNoRegistrado, setDestinoNoRegistrado] = useState<IACamposSugeridos | null>(null)
  const [terceroDestinoRows, setTerceroDestinoRows] = useState<SearchRow[]>([])
  const [terceroDestinoLoading, setTerceroDestinoLoading] = useState(false)
  const debounceRefTerDestino = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [personalDestinoRows, setPersonalDestinoRows] = useState<SearchRow[]>([])
  const [personalDestinoLoading, setPersonalDestinoLoading] = useState(false)
  const debounceRefPerDestino = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [iaCamposAplicados, setIaCamposAplicados] = useState<CampoAplicado[]>([])
  const [iaRevisado, setIaRevisado] = useState(false)
  const [confirmIARevision, setConfirmIARevision] = useState(false)
  const pendingValuesRef = useRef<import('@/hooks/useRadicadoForm').RadicadoFormValues | null>(null)
  const enviandoRef = useRef(false)
  const [enviandoRadicado, setEnviandoRadicado] = useState(false)

  // ── Lista dinámica de anexos ──────────────────────────────────────
  // 'archivo' se maneja fuera de react-hook-form (igual que pdfEntrada/pdfSalida)
  // y se cruza por índice con el subconjunto filtrado al armar el FormData.
  const [anexosItems, setAnexosItems] = useState<{ descripcion: string; tipo_id: number | null; archivo: File | null }[]>([])
  const syncAnexos = (items: { descripcion: string; tipo_id: number | null; archivo: File | null }[]) => {
    setAnexosItems(items)
    const limpios = items.filter(i => i.descripcion.trim() !== '')
    setValue('anexos', limpios.length > 0 ? limpios.map(({ descripcion, tipo_id }) => ({ descripcion, tipo_id })) : null)
    setValue('cantidad_anexos', limpios.length > 0 ? limpios.length : null)
  }

  // ── Búsqueda de terceros (server-side) ────────────────────────────
  const [terceroRows, setTerceroRows] = useState<SearchRow[]>([])
  const [terceroLoading, setTerceroLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscarTerceros = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setTerceroLoading(true)
      try {
        // Filtrar por categoría según el radio seleccionado
        const tipo = watch('tipo_remitente')
        const categoria = tipo === 'TERCERO_NIT' ? 'NIT' : tipo === 'CIUDADANO' ? 'PERSONA' : ''
        const qs = new URLSearchParams()
        if (q.trim()) qs.set('q', q)
        if (categoria) qs.set('categoria', categoria)
        const params = qs.toString() ? `?${qs.toString()}` : ''
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/terceros${params}`,
          { headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } },
        )
        if (!res.ok) throw new Error()
        const data: TerceroRow[] = await res.json()
        setTerceroRows(data.map(t => ({
          id: t.id,
          nit: t.nit,
          razon_social: t.razon_social,
          municipio: t.municipio ?? '',
        })))
      } catch {
        setTerceroRows([])
      } finally {
        setTerceroLoading(false)
      }
    }, 350)
  }, [watch])

  const buscarFuncionarios = useCallback((q: string) => {
    if (debounceRefFun.current) clearTimeout(debounceRefFun.current)
    debounceRefFun.current = setTimeout(async () => {
      setFuncionarioLoading(true)
      try {
        const params = q.trim() ? `?q=${encodeURIComponent(q)}` : ''
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/personal${params}`,
          { headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } },
        )
        if (!res.ok) throw new Error()
        const data: Array<{ id: number; cedula: string; nombre_completo: string; cargo: string | null; dependencia_id: number; email: string | null }> = await res.json()
        const deps = useCatalogoStore.getState().dependencias
        setFuncionarioRows(data.map(p => ({
          id: p.id,
          cedula: p.cedula,
          nombre_completo: p.nombre_completo,
          cargo: p.cargo ?? '',
          dependencia_id: p.dependencia_id,
          dependencia_nombre: deps.find(d => d.id === p.dependencia_id)?.descripcion ?? '',
        })))
      } catch {
        setFuncionarioRows([])
      } finally {
        setFuncionarioLoading(false)
      }
    }, 350)
  }, [])

  const handleFuncionarioCreado = (f: FuncionarioCreado) => {
    setValue('funcionario_id', f.id)
    setValue('tercero_id', null)
    setValue('procedencia', 'INTERNO')
    setDisplayField({ descripcionRemitente: f.nombre_completo })
    setFuncionarioRows([{ id: f.id, cedula: f.cedula, nombre_completo: f.nombre_completo, cargo: f.cargo ?? '' }])
    setFuncionarioNoRegistrado(null)
    const dep = useCatalogoStore.getState().dependencias.find(d => d.id === f.dependencia_id)
    if (dep) {
      setValue('dependencia_remitente_id', dep.id)
      setDisplayField({ descripcionDepRemitente: dep.descripcion })
    }
  }

  const watchTipoRemitente = watch('tipo_remitente')
  const watchTipoDestino = watch('tipo_destino')
  const watchMedioIngresoId = watch('medio_ingreso_id')
  const watchTipoCorrespondenciaId = watch('tipo_correspondencia_id')

  // ── Cargar contactos de una empresa ──────────────────────────────
  const cargarContactosEmpresa = useCallback(async (terceroId: number) => {
    setContactosEmpresa([])
    setLoadingContactos(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api/v1'}/terceros/${terceroId}/contactos`,
        { headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } },
      )
      if (res.ok) setContactosEmpresa(await res.json())
    } catch { /* silencioso */ } finally {
      setLoadingContactos(false)
    }
  }, [])

  const cargarContactosEmpresaDestino = useCallback(async (terceroId: number) => {
    setContactosEmpresaDestino([])
    setLoadingContactosDestino(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api/v1'}/terceros/${terceroId}/contactos`,
        { headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } },
      )
      if (res.ok) setContactosEmpresaDestino(await res.json())
    } catch { /* silencioso */ } finally {
      setLoadingContactosDestino(false)
    }
  }, [])

  // Registra un nombre libre como contacto en tercero_contactos y lo agrega al estado local
  const registrarContacto = useCallback(async (
    terceroId: number,
    nombreCompleto: string,
    onSuccess: (contacto: TerceroContacto) => void,
  ) => {
    const partes = nombreCompleto.trim().split(/\s+/)
    const nombres = partes.slice(0, Math.max(1, partes.length - 1)).join(' ')
    const primer_apellido = partes.length > 1 ? partes[partes.length - 1] : undefined
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api/v1'}/terceros/${terceroId}/contactos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${useAuthStore.getState().token ?? ''}`,
          },
          body: JSON.stringify({ nombres, primer_apellido }),
        },
      )
      if (!res.ok) throw new Error('Error al registrar')
      const contacto: TerceroContacto = await res.json()
      toast.success('Contacto registrado en la empresa')
      onSuccess(contacto)
    } catch {
      toast.error('No se pudo registrar el contacto')
    }
  }, [])

  // ── Handlers modales ──────────────────────────────────────────────
  const selectTercero = (row: SearchRow) => {
    const id = Number(row.id)
    setValue('tercero_id', id)
    setValue('funcionario_id', null)
    setValue('nombre_persona_empresa', '')
    setDisplayField({ descripcionRemitente: String(row.razon_social ?? row.nombre_completo ?? '') })
    setTerceroNoRegistrado(null)
    if (watch('tipo_remitente') === 'TERCERO_NIT') cargarContactosEmpresa(id)
    else setContactosEmpresa([])
  }

  const handleTerceroCreado = (t: TerceroCreado, nombreContacto?: string) => {
    setValue('tercero_id', t.id)
    setValue('funcionario_id', null)
    setDisplayField({ descripcionRemitente: t.razon_social })
    setTerceroRows([{ id: t.id, nit: t.nit, razon_social: t.razon_social, municipio: t.municipio ?? '' }])
    if (nombreContacto) setValue('nombre_persona_empresa', nombreContacto)
    setTerceroNoRegistrado(null)
    if (watch('tipo_remitente') === 'TERCERO_NIT') cargarContactosEmpresa(t.id)
  }

  const selectFuncionario = (row: SearchRow) => {
    setValue('funcionario_id', Number(row.id))
    setValue('tercero_id', null)
    setValue('procedencia', 'INTERNO')
    setDisplayField({ descripcionRemitente: String(row.nombre_completo ?? '') })
    setFuncionarioNoRegistrado(null)
    // Leer dependencias del store directamente (evita stale closure de useCallback)
    const deps = useCatalogoStore.getState().dependencias
    const dep = deps.find(d => d.id === Number(row.dependencia_id))
    if (dep) {
      setValue('dependencia_remitente_id', dep.id)
      setDisplayField({ descripcionDepRemitente: dep.descripcion })
    }
  }

  const selectTipoCorr = (row: SearchRow) => {
    setValue('tipo_correspondencia_id', Number(row.id))
    const dias = Number(row.max_dias ?? 0)
    setDisplayField({
      descripcionTipoCorr: String(row.descripcion ?? ''),
      maxDias: dias === 0 ? 'Sin límite' : String(dias),
      fechaLimite: calcularFechaLimite(dias),
    })
    // Limpiar AuxTip al cambiar tipo de correspondencia (el filtrado cambia)
    limpiarAuxTip()
    setSelectedAuxTip(null)
  }

  const selectAuxTip = (row: SearchRow) => {
    setValue('aux_tip_id', Number(row.id))
    setDisplayField({ descripcionAuxTip: String(row.descripcion ?? '') })
    setSelectedAuxTip(auxTips.find(a => a.id === Number(row.id)) ?? null)
  }

  const selectDepDestino = (row: SearchRow) => {
    setValue('dependencia_destino_id', Number(row.id))
    setValue('personal_destino_id', null)
    setDisplayField({ descripcionDepDestino: String(row.descripcion ?? ''), responsable: '' })
  }

  const selectPersonalDestino = (row: SearchRow) => {
    setValue('personal_destino_id', Number(row.id))
    setDisplayField({ responsable: String(row.nombre_completo ?? '') })
  }

  const selectDepRemitente = (row: SearchRow) => {
    setValue('dependencia_remitente_id', Number(row.id))
    setDisplayField({ descripcionDepRemitente: String(row.descripcion ?? '') })
  }

  const selectTerceroDestino = (row: SearchRow) => {
    const id = Number(row.id)
    setValue('tercero_destino_id', id)
    setValue('nombre_persona_destino', '')
    setDisplayField({ descripcionTerceroDestino: String(row.razon_social ?? row.nombre_completo ?? '') })
    setDestinoNoRegistrado(null)
    if (watch('tipo_destino') === 'TERCERO_NIT') cargarContactosEmpresaDestino(id)
    else setContactosEmpresaDestino([])
  }

  const handleTerceroDestinoCreado = (t: TerceroCreado, nombreContacto?: string) => {
    setValue('tercero_destino_id', t.id)
    setValue('nombre_persona_destino', nombreContacto ?? '')
    setDisplayField({ descripcionTerceroDestino: t.razon_social })
    setTerceroDestinoRows([{ id: t.id, nit: t.nit, razon_social: t.razon_social, municipio: t.municipio ?? '' }])
    setDestinoNoRegistrado(null)
    if (watch('tipo_destino') === 'TERCERO_NIT') cargarContactosEmpresaDestino(t.id)
  }

  const handleFuncionarioDestinoCreado = (f: FuncionarioCreado) => {
    setValue('personal_destino_id', f.id)
    setDisplayField({ responsable: f.nombre_completo })
    setPersonalDestinoRows([{ id: f.id, cedula: f.cedula, nombre_completo: f.nombre_completo, cargo: f.cargo ?? '' }])
    setDestinoNoRegistrado(null)
    const dep = useCatalogoStore.getState().dependencias.find(d => d.id === f.dependencia_id)
    if (dep) {
      setValue('dependencia_destino_id', dep.id)
      setDisplayField({ descripcionDepDestino: dep.descripcion })
    }
  }

  // ── Búsqueda destino externo (server-side) ───────────────────────
  const buscarTercerosDestino = useCallback((q: string) => {
    if (debounceRefTerDestino.current) clearTimeout(debounceRefTerDestino.current)
    debounceRefTerDestino.current = setTimeout(async () => {
      setTerceroDestinoLoading(true)
      try {
        const tipo = watch('tipo_destino')
        const categoria = tipo === 'TERCERO_NIT' ? 'NIT' : tipo === 'CIUDADANO' ? 'PERSONA' : ''
        const qs = new URLSearchParams()
        if (q.trim()) qs.set('q', q)
        if (categoria) qs.set('categoria', categoria)
        const params = qs.toString() ? `?${qs.toString()}` : ''
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/terceros${params}`,
          { headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } },
        )
        if (!res.ok) throw new Error()
        const data: TerceroRow[] = await res.json()
        setTerceroDestinoRows(data.map(t => ({
          id: t.id, nit: t.nit, razon_social: t.razon_social, municipio: t.municipio ?? '',
        })))
      } catch {
        setTerceroDestinoRows([])
      } finally {
        setTerceroDestinoLoading(false)
      }
    }, 350)
  }, [watch])

  // ── Búsqueda personal destino (server-side, arregla bug data=[]) ─
  const buscarPersonalDestino = useCallback((q: string) => {
    if (debounceRefPerDestino.current) clearTimeout(debounceRefPerDestino.current)
    debounceRefPerDestino.current = setTimeout(async () => {
      setPersonalDestinoLoading(true)
      try {
        const depId = watch('dependencia_destino_id')
        const qs = new URLSearchParams()
        if (q.trim()) qs.set('q', q)
        if (depId) qs.set('dependencia_id', String(depId))
        const params = qs.toString() ? `?${qs.toString()}` : ''
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/personal${params}`,
          { headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } },
        )
        if (!res.ok) throw new Error()
        const data: Array<{ id: number; cedula: string; nombre_completo: string; cargo: string | null }> = await res.json()
        setPersonalDestinoRows(data.map(p => ({
          id: p.id, cedula: p.cedula, nombre_completo: p.nombre_completo, cargo: p.cargo ?? '',
        })))
      } catch {
        setPersonalDestinoRows([])
      } finally {
        setPersonalDestinoLoading(false)
      }
    }, 350)
  }, [watch])

  // ── Búsqueda de tercero post-IA (por NIT/cédula y/o nombre) ────────
  const buscarTerceroIA = useCallback(async (campos: IACamposSugeridos) => {
    const base = `${import.meta.env.VITE_API_URL ?? '/api/v1'}/terceros`
    const headers = { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` }

    const autoSelect = (rows: TerceroRow[], camposIA: IACamposSugeridos) => {
      const t = rows[0]
      selectTercero({ id: t.id, razon_social: t.razon_social, nombre_completo: t.razon_social })
      setTerceroRows(rows.map(r => ({ id: r.id, nit: r.nit, razon_social: r.razon_social, municipio: r.municipio ?? '' })))
      // Si es empresa (NIT), pre-llenar responsable con nombre del firmante
      if (camposIA.tipo_remitente_sugerido === 'EMPRESA' && camposIA.nombre_remitente) {
        setValue('nombre_persona_empresa', camposIA.nombre_remitente)
      }
      toast.success(`Remitente autodetectado: ${t.razon_social}`)
    }

    try {
      // 1. Buscar por número de identificación exacto (más confiable)
      if (campos.nro_identificacion_remitente) {
        const res = await fetch(`${base}?nro_exacto=${encodeURIComponent(campos.nro_identificacion_remitente)}`, { headers })
        if (res.ok) {
          const data: TerceroRow[] = await res.json()
          if (data.length > 0) { autoSelect(data, campos); return }
        }
      }

      // 2. Buscar por nombre empresa o nombre remitente
      const nombre = campos.nombre_persona_empresa || campos.nombre_remitente || ''
      if (nombre.trim().length >= 3) {
        const res = await fetch(`${base}?q=${encodeURIComponent(nombre.trim())}`, { headers })
        if (res.ok) {
          const data: TerceroRow[] = await res.json()
          // Solo auto-seleccionar si hay coincidencia exacta única (evitar falsos positivos)
          if (data.length === 1) { autoSelect(data, campos); return }
        }
      }

      // 3. No se encontró → mostrar banner para crear/buscar manualmente
      setTerceroNoRegistrado(campos)
    } catch {
      setTerceroNoRegistrado(campos)
    }
  }, [])

  // ── Búsqueda de funcionario post-IA ──────────────────────────────
  const buscarFuncionarioIA = useCallback(async (campos: IACamposSugeridos) => {
    const nombre = campos.nombre_remitente || ''
    if (nombre.trim().length < 3) { setFuncionarioNoRegistrado(campos); return }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api/v1'}/personal?q=${encodeURIComponent(nombre.trim())}`,
        { headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` } },
      )
      if (!res.ok) { setFuncionarioNoRegistrado(campos); return }
      const data: Array<{ id: number; cedula: string; nombre_completo: string; cargo: string | null; dependencia_id: number; email: string | null }> = await res.json()
      if (data.length === 1) {
        const p = data[0]
        selectFuncionario({ id: p.id, nombre_completo: p.nombre_completo, dependencia_id: p.dependencia_id })
        setFuncionarioRows([{ id: p.id, cedula: p.cedula, nombre_completo: p.nombre_completo, cargo: p.cargo ?? '' }])
        toast.success(`Funcionario autodetectado: ${p.nombre_completo}`)
      } else {
        setFuncionarioNoRegistrado(campos)
      }
    } catch {
      setFuncionarioNoRegistrado(campos)
    }
  }, [])

  // ── Búsqueda de destinatario post-IA ─────────────────────────────
  const buscarDestinoIA = useCallback(async (campos: IACamposSugeridos) => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const API = import.meta.env.VITE_API_URL ?? '/api/v1'
    const headers = { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` }

    if (campos.tipo_destinatario === 'INTERNO') {
      setValue('tipo_destino', 'INTERNO')
      const depNombre = norm(campos.dependencia_destino ?? '')
      const dep = depNombre
        ? useCatalogoStore.getState().dependencias.find(d => {
            const n = norm(d.descripcion)
            return n.includes(depNombre) || depNombre.includes(n)
          })
        : undefined
      if (!dep) { setDestinoNoRegistrado(campos); return }
      setValue('dependencia_destino_id', dep.id)
      setDisplayField({ descripcionDepDestino: dep.descripcion })

      const nombre = (campos.nombre_destinatario ?? '').trim()
      if (nombre.length >= 3) {
        try {
          const res = await fetch(`${API}/personal?q=${encodeURIComponent(nombre)}&dependencia_id=${dep.id}`, { headers })
          const data: Array<{ id: number; cedula: string; nombre_completo: string; cargo: string | null }> = res.ok ? await res.json() : []
          if (data.length === 1) {
            setValue('personal_destino_id', data[0].id)
            setDisplayField({ responsable: data[0].nombre_completo })
            setPersonalDestinoRows([{ id: data[0].id, cedula: data[0].cedula, nombre_completo: data[0].nombre_completo, cargo: data[0].cargo ?? '' }])
            return
          }
        } catch { /* continúa a banner */ }
      }
      setDestinoNoRegistrado(campos)
    } else if (campos.tipo_destinatario === 'EMPRESA' || campos.tipo_destinatario === 'CIUDADANO') {
      setValue('tipo_destino', campos.tipo_destinatario === 'EMPRESA' ? 'TERCERO_NIT' : 'CIUDADANO')
      const nombre = (campos.nombre_empresa_destino || campos.nombre_destinatario || '').trim()
      if (nombre.length < 3) { setDestinoNoRegistrado(campos); return }
      try {
        const res = await fetch(`${API}/terceros?q=${encodeURIComponent(nombre)}`, { headers })
        const data: TerceroRow[] = res.ok ? await res.json() : []
        if (data.length === 1) {
          setValue('tercero_destino_id', data[0].id)
          setDisplayField({ descripcionTerceroDestino: data[0].razon_social })
          setTerceroDestinoRows([{ id: data[0].id, nit: data[0].nit, razon_social: data[0].razon_social, municipio: data[0].municipio ?? '' }])
          if (campos.tipo_destinatario === 'EMPRESA' && campos.nombre_destinatario) {
            setValue('nombre_persona_destino', campos.nombre_destinatario)
          }
          return
        }
      } catch { /* continúa a banner */ }
      setDestinoNoRegistrado(campos)
    }
  }, [])

  // ── Análisis IA (Gemini) ──────────────────────────────────────────
  const analizarConIA = async (file: File) => {
    setPdfEntrada(file)
    if (!file) return
    setIaProcessing(true)
    setTerceroNoRegistrado(null)
    setFuncionarioNoRegistrado(null)
    setDestinoNoRegistrado(null)
    setIaCamposAplicados([])
    setIaRevisado(false)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/ia/analizar-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Error al analizar PDF')
      const campos: IACamposSugeridos = data.campos ?? {}
      setIaSugerencias(campos)

      // Pre-seleccionar radio según tipo detectado por IA
      const tipoSugerido = campos.tipo_remitente_sugerido
      const sinRemitente = !watch('tercero_id') && !watch('funcionario_id')
      if (sinRemitente && tipoSugerido) {
        const mapa = { FUNCIONARIO: 'FUNCIONARIO', EMPRESA: 'TERCERO_NIT', CIUDADANO: 'CIUDADANO' } as const
        const tipoMapeado = mapa[tipoSugerido]
        setValue('tipo_remitente', tipoMapeado)
        setValue('procedencia', tipoMapeado === 'FUNCIONARIO' ? 'INTERNO' : 'EXTERNO')
      }

      // ── Auto-aplicar todos los campos detectados ──────────────────
      const aplicados: CampoAplicado[] = []
      const normStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

      if (campos.asunto) {
        setValue('aux_descripcion', campos.asunto.substring(0, 100))
        aplicados.push({ label: 'Asunto', valor: campos.asunto })
      }
      if (campos.fecha_documento) {
        setValue('fecha_documento', campos.fecha_documento)
        aplicados.push({ label: 'Fecha documento', valor: campos.fecha_documento })
      }
      if (campos.observaciones) {
        setValue('observaciones', campos.observaciones.substring(0, 5700))
        const preview = campos.observaciones.length > 60
          ? campos.observaciones.substring(0, 60) + '…'
          : campos.observaciones
        aplicados.push({ label: 'Observaciones', valor: preview })
      }
      if (campos.tiene_folios) {
        setValue('folios', Number(campos.tiene_folios))
        aplicados.push({ label: 'Folios', valor: String(campos.tiene_folios) })
        // Si no hay total explícito, el DE es igual a los folios detectados
        const de = campos.total_folios ?? campos.tiene_folios
        setValue('folios_de', Number(de))
        aplicados.push({ label: 'Total folios (DE)', valor: String(de) })
      } else if (campos.total_folios != null) {
        setValue('folios_de', Number(campos.total_folios))
        aplicados.push({ label: 'Total folios (DE)', valor: String(campos.total_folios) })
      }
      if (campos.tiene_anexos === true) {
        setTieneAnexos(true)
        if (campos.descripcion_anexos && campos.descripcion_anexos.length > 0) {
          syncAnexos(campos.descripcion_anexos.map(d => ({ descripcion: d, tipo_id: null, archivo: null })))
          aplicados.push({ label: 'Anexos', valor: `${campos.descripcion_anexos.length} detectado(s)` })
        }
      } else if (campos.tiene_anexos === false) {
        setTieneAnexos(false)
        syncAnexos([])
        aplicados.push({ label: 'Anexos', valor: 'Sin anexos' })
      }
      if (campos.medio_probable) {
        const claves: Record<string, string[]> = {
          VENTANILLA: ['ventanilla', 'presencial', 'personal'],
          EMAIL: ['email', 'correo', 'electroni'],
          MENSAJERIA: ['mensajer', 'transport', 'courier', 'paquete'],
        }
        const palabras = claves[campos.medio_probable.toUpperCase()] ?? []
        const catMedios = useCatalogoStore.getState().mediosIngreso
        const medio = catMedios.find(m => palabras.some(p => normStr(m.descripcion ?? '').includes(p)))
        if (medio) {
          setValue('medio_ingreso_id', medio.id)
          aplicados.push({ label: 'Medio de ingreso', valor: medio.descripcion })
        }
      }
      if (aplicados.length > 0) setIaCamposAplicados(aplicados)

      // Buscar remitente en BD según el tipo detectado
      const hayRemitente = campos.nro_identificacion_remitente || campos.nombre_remitente || campos.nombre_persona_empresa
      if (hayRemitente && sinRemitente) {
        if (tipoSugerido === 'FUNCIONARIO') {
          await buscarFuncionarioIA(campos)
        } else {
          await buscarTerceroIA(campos)
        }
      }

      // Buscar destinatario en BD
      if (campos.tipo_destinatario) {
        await buscarDestinoIA(campos)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo analizar el PDF con IA')
    } finally {
      setIaProcessing(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────
  const enviarRadicado = async (values: import('@/hooks/useRadicadoForm').RadicadoFormValues) => {
    // Evita duplicados: el botón "Confirmar y Radicar" del modal de revisión
    // IA no pasa por handleSubmit() de react-hook-form, así que no queda
    // protegido por isSubmitting — un doble clic ahí disparaba dos POST.
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviandoRadicado(true)
    try {
      const formData = new FormData()
      Object.entries(values).forEach(([k, v]) => {
        if (v == null) return
        if (k === 'anexos' && Array.isArray(v)) {
          // 'archivo' no viaja en el valor de react-hook-form (solo descripcion/
          // tipo_id); se cruza por índice con anexosItems filtrado igual que en
          // syncAnexos() para saber qué archivo corresponde a cada anexo.
          const archivos = anexosItems.filter(i => i.descripcion.trim() !== '')
          ;(v as { descripcion: string; tipo_id: number | null }[]).forEach((item, i) => {
            formData.append(`anexos[${i}][descripcion]`, item.descripcion)
            if (item.tipo_id != null) formData.append(`anexos[${i}][tipo_id]`, String(item.tipo_id))
            if (archivos[i]?.archivo) formData.append(`anexos[${i}][archivo]`, archivos[i].archivo)
          })
        } else if (Array.isArray(v)) {
          ;(v as unknown as string[]).forEach(item => formData.append(`${k}[]`, item))
        } else {
          formData.append(k, String(v))
        }
      })
      if (pdfEntrada) formData.append('pdf_entrada', pdfEntrada)

      const res = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/radicados`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Error al guardar')
      }
      const data = await res.json()
      toast.success(`Radicado ${data.numero_radicado ?? ''} creado exitosamente`)
      resetForm()
      setAnexosItems([])
      setIaCamposAplicados([])
      setIaRevisado(false)
      navigate('/radicados')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el radicado')
    } finally {
      enviandoRef.current = false
      setEnviandoRadicado(false)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (iaCamposAplicados.length > 0 && !iaRevisado) {
      pendingValuesRef.current = values
      setConfirmIARevision(true)
      return
    }
    await enviarRadicado(values)
  })

  const handleConfirmarIAYEnviar = async () => {
    setConfirmIARevision(false)
    setIaRevisado(true)
    if (pendingValuesRef.current) {
      await enviarRadicado(pendingValuesRef.current)
      pendingValuesRef.current = null
    }
  }

  // ── Datos de catálogos para modales (en espera de API real) ───────
  const depRows: SearchRow[] = dependencias.map(d => ({ id: d.id, descripcion: d.descripcion }))
  const tipoCorrRows: SearchRow[] = tiposCorrespondencia.map(t => ({
    id: t.id, descripcion: t.descripcion, max_dias: t.max_dias ?? 0,
  }))
  const auxTipsFiltrados = watchTipoCorrespondenciaId
    ? auxTips.filter(a => a.tipo_correspondencia_id === watchTipoCorrespondenciaId)
    : auxTips
  const auxTipRows: SearchRow[] = auxTipsFiltrados.map(a => ({ id: a.id, descripcion: a.descripcion }))

  const medioActual = mediosIngreso.find(m => m.id === watchMedioIngresoId)
  const requiereGuia = medioActual?.descripcion?.toLowerCase().includes('mensajer') || medioActual?.descripcion?.toLowerCase().includes('transportador')

  return (
    <AppLayout subtitle="Nueva Radicación">
      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto w-full">

        {/* ── Encabezado de página ───────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1B3A6E]">Nueva Radicación</h1>
            <p className="text-sm text-slate-500">Ingreso de correspondencia · Año {añoRadicado}</p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmCancelar(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" /> Cancelar
          </button>
        </div>

        {/* ── Formulario ─────────────────────────────────────────── */}
        <form onSubmit={onSubmit} noValidate>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6">

            {/* ── BLOQUE 0: PDF de entrada + IA ────────────────────── */}
            <div className="space-y-3">
              {/* Banner instructivo */}
              {!pdfEntrada && (
                <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <SparklesIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">
                      Paso 1 — Sube el documento de entrada
                    </p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      La IA analizará el PDF y completará automáticamente los campos del formulario.
                      Puedes revisar y ajustar los datos antes de guardar.
                    </p>
                  </div>
                </div>
              )}

              <PDFUploader
                label="PDF Entrada (Documento radicado) *"
                file={pdfEntrada}
                onFile={analizarConIA}
                onRemove={() => { setPdfEntrada(null); setIaSugerencias(null); setIaCamposAplicados([]); setIaRevisado(false) }}
                isProcessingIA={iaProcessing}
              />

              {pdfEntrada && !iaProcessing && iaCamposAplicados.length === 0 && (
                <button
                  type="button"
                  onClick={() => analizarConIA(pdfEntrada)}
                  className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Analizar con IA
                </button>
              )}

              <IABanner
                campos={iaCamposAplicados}
                confianza={iaSugerencias?.confianza ?? 0}
                revisado={iaRevisado}
                onRevisar={() => setIaRevisado(true)}
                onDismiss={() => { setIaCamposAplicados([]); setIaRevisado(false) }}
                onReanalizar={pdfEntrada ? () => analizarConIA(pdfEntrada) : undefined}
              />

              {/* Banner: remitente autodetectado */}
              {iaSugerencias && watch('tercero_id') && !terceroNoRegistrado && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircleIcon className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 font-medium">
                    Remitente identificado y autoseleccionado correctamente.
                  </p>
                </div>
              )}

              {/* Banner: remitente no registrado */}
              {terceroNoRegistrado && !watch('tercero_id') && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      Remitente no registrado en el sistema
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      La IA detectó: <strong>{terceroNoRegistrado.nombre_persona_empresa || terceroNoRegistrado.nombre_remitente || '—'}</strong>
                      {terceroNoRegistrado.nro_identificacion_remitente && (
                        <> · {terceroNoRegistrado.tipo_documento ?? 'Doc'}: <strong>{terceroNoRegistrado.nro_identificacion_remitente}</strong></>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setModalAbierto('tercero')}
                      className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                    >
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const esNit = watch('tipo_remitente') === 'TERCERO_NIT'
                        const tipoDocIA = terceroNoRegistrado.tipo_documento?.toUpperCase()
                        const tipoId = tiposIdentificacion.find(t => {
                          const cod = t.codigo?.toUpperCase()
                          if (esNit) return cod === 'NIT'
                          return cod === (tipoDocIA || 'CC')
                        })?.id ?? 0
                        setTerceroDefaults({
                          tipo_identificacion_id: tipoId,
                          nro_identificacion:     terceroNoRegistrado.nro_identificacion_remitente ?? '',
                          nombres: esNit
                            ? (terceroNoRegistrado.nombre_persona_empresa ?? '')
                            : (terceroNoRegistrado.nombre_remitente ?? ''),
                          nombre_contacto: esNit ? (terceroNoRegistrado.nombre_remitente ?? '') : '',
                        })
                        setCreandoTerceroCtx('remitente')
                      }}
                      className="px-3 py-1.5 text-xs bg-[#1B3A6E] text-white rounded-lg hover:bg-[#14306A] transition-colors font-medium"
                    >
                      + Registrar
                    </button>
                  </div>
                </div>
              )}

              {/* Banner: funcionario no registrado */}
              {funcionarioNoRegistrado && !watch('funcionario_id') && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      Funcionario no registrado en el sistema
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      La IA detectó: <strong>{funcionarioNoRegistrado.nombre_remitente || '—'}</strong>
                      {funcionarioNoRegistrado.dependencia_remitente && (
                        <> · <span>{funcionarioNoRegistrado.dependencia_remitente}</span></>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setModalAbierto('funcionario')}
                      className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                    >
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nombre = funcionarioNoRegistrado.nombre_remitente ?? ''
                        const partes = nombre.trim().split(' ')
                        const apellidos = partes.length > 2 ? partes.slice(-2).join(' ') : partes.slice(-1).join(' ')
                        const nombres   = partes.length > 2 ? partes.slice(0, -2).join(' ') : partes.slice(0, 1).join(' ')
                        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                        const depNombre = norm(funcionarioNoRegistrado.dependencia_remitente ?? '')
                        const allDeps = useCatalogoStore.getState().dependencias
                        const depEncontrada = depNombre ? allDeps.find(d => {
                          const n = norm(d.descripcion ?? '')
                          return n.includes(depNombre) || depNombre.includes(n)
                        }) : undefined
                        setFuncionarioDefaults({
                          nombres,
                          apellidos,
                          cargo:          funcionarioNoRegistrado.cargo_remitente ?? '',
                          dependencia_id: depEncontrada?.id,
                        })
                        setCreandoFuncionarioCtx('remitente')
                      }}
                      className="px-3 py-1.5 text-xs bg-[#1B3A6E] text-white rounded-lg hover:bg-[#14306A] transition-colors font-medium"
                    >
                      + Registrar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Separador Paso 2 */}
            <div className="flex items-center gap-3 py-1">
              <span className="text-[11px] font-bold text-[#1B3A6E] uppercase tracking-widest whitespace-nowrap">
                {pdfEntrada ? 'Paso 2 — Verifica los datos' : 'Paso 2 — Completa los datos manualmente'}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* ── BLOQUE 1: Encabezado de radicación ──────────────── */}
            <div className="space-y-3">
              <SeccionTitulo titulo="Datos de Radicación" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <ReadonlyField label="Año" value={String(añoRadicado)} />
                <ReadonlyField label="Número" value={siguienteNumero} />
                <ReadonlyField label="Fecha" value={fechaRadicacion} />
                <ReadonlyField label="Hora" value={horaRadicacion} />

                {/* Manejo */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                    Manejo
                  </span>
                  <select
                    {...register('manejo')}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                  >
                    <option value="RESOLUTIVO">Resolutivo</option>
                    <option value="INFORMATIVO">Informativo</option>
                  </select>
                </div>

                {/* Procedencia */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                    Procedencia
                  </span>
                  <select
                    {...register('procedencia')}
                    onChange={e => {
                      setValue('procedencia', e.target.value as 'EXTERNO' | 'INTERNO')
                      if (e.target.value === 'INTERNO' && watchTipoRemitente !== 'FUNCIONARIO') {
                        setValue('tipo_remitente', 'FUNCIONARIO')
                        limpiarRemitente()
                      }
                      if (e.target.value === 'EXTERNO' && watchTipoRemitente === 'FUNCIONARIO') {
                        setValue('tipo_remitente', 'TERCERO_NIT')
                        limpiarRemitente()
                      }
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                  >
                    <option value="EXTERNO">Externa</option>
                    <option value="INTERNO">Interna</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── BLOQUE 2: Remitente ──────────────────────────────── */}
            <div className="space-y-3">
              <SeccionTitulo titulo="Remitente" />

              {/* Tipo remitente */}
              <div className="flex flex-wrap gap-2">
                {(['TERCERO_NIT', 'CIUDADANO', 'FUNCIONARIO'] as const).map(tipo => (
                  <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={tipo}
                      {...register('tipo_remitente')}
                      onChange={() => {
                        setValue('tipo_remitente', tipo)
                        limpiarRemitente()
                        // Sincronizar procedencia con tipo
                        setValue('procedencia', tipo === 'FUNCIONARIO' ? 'INTERNO' : 'EXTERNO')
                      }}
                      className="accent-[#2B5BA8]"
                    />
                    <span className="text-sm text-slate-700">
                      {{ TERCERO_NIT: 'Empresa (NIT)', CIUDADANO: 'Ciudadano', FUNCIONARIO: 'Funcionario' }[tipo]}
                    </span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Campo búsqueda remitente */}
                {(watchTipoRemitente === 'TERCERO_NIT' || watchTipoRemitente === 'CIUDADANO') && (
                  <LookupField
                    label={watchTipoRemitente === 'TERCERO_NIT' ? 'Empresa / NIT' : 'Ciudadano'}
                    code={String(watch('tercero_id') ?? '')}
                    display={display.descripcionRemitente}
                    maxLength={10}
                    required
                    error={errors.tercero_id?.message}
                    onSearch={() => setModalAbierto('tercero')}
                    onClear={() => { setValue('tercero_id', null); setValue('nombre_persona_empresa', ''); setDisplayField({ descripcionRemitente: '' }); setContactosEmpresa([]) }}
                    className="lg:col-span-2"
                  />
                )}
                {watchTipoRemitente === 'FUNCIONARIO' && (
                  <LookupField
                    label="Funcionario"
                    code={String(watch('funcionario_id') ?? '')}
                    display={display.descripcionRemitente}
                    maxLength={10}
                    required
                    error={errors.funcionario_id?.message}
                    onSearch={() => setModalAbierto('funcionario')}
                    onClear={() => { setValue('funcionario_id', null); setDisplayField({ descripcionRemitente: '' }) }}
                    className="lg:col-span-2"
                  />
                )}

                {/* Dependencia remitente — solo para FUNCIONARIO, se auto-llena al seleccionar */}
                {watchTipoRemitente === 'FUNCIONARIO' && (
                  <LookupField
                    label="Dependencia Remitente"
                    code={String(watch('dependencia_remitente_id') ?? '')}
                    display={display.descripcionDepRemitente}
                    onSearch={() => setModalAbierto('depRemitente')}
                    onClear={() => { setValue('dependencia_remitente_id', null); setDisplayField({ descripcionDepRemitente: '' }) }}
                    className="lg:col-span-2"
                  />
                )}

                {/* Responsable de la solicitud — solo para EMPRESA (NIT) */}
                {watchTipoRemitente === 'TERCERO_NIT' && watch('tercero_id') && (
                  <div className="lg:col-span-2 flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      Responsable de la solicitud
                    </span>
                    {loadingContactos ? (
                      <div className="px-3 py-2 text-sm text-slate-400 border border-slate-200 rounded-lg bg-slate-50">
                        Cargando contactos...
                      </div>
                    ) : contactosEmpresa.length > 0 ? (
                      <div className="flex gap-2">
                        <select
                          value={watch('nombre_persona_empresa') ?? ''}
                          onChange={e => setValue('nombre_persona_empresa', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                        >
                          <option value="">— Seleccione o ingrese nuevo —</option>
                          {contactosEmpresa.map(c => (
                            <option key={c.id} value={c.nombre_completo}>
                              {c.nombre_completo}{c.cargo ? ` · ${c.cargo}` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          title="Agregar nuevo contacto a esta empresa"
                          onClick={() => {
                            setTerceroDefaults({ tipo_identificacion_id: tiposIdentificacion.find(t => t.codigo?.toUpperCase() === 'NIT')?.id })
                            setCreandoTerceroCtx('remitente')
                          }}
                          className="px-3 py-2 text-xs bg-[#1B3A6E] text-white rounded-lg hover:bg-[#14306A] transition-colors font-medium"
                        >
                          + Nuevo
                        </button>
                      </div>
                    ) : (
                      <Controller
                        control={control}
                        name="nombre_persona_empresa"
                        render={({ field }) => (
                          <CharCountInput
                            {...field}
                            value={field.value ?? ''}
                            label=""
                            maxLength={100}
                            placeholder="Nombre del contacto en la empresa"
                            error={errors.nombre_persona_empresa?.message}
                          />
                        )}
                      />
                    )}
                  </div>
                )}

              {/* Banner: contacto de empresa remitente no registrado */}
              {watchTipoRemitente === 'TERCERO_NIT' && watch('tercero_id') && (() => {
                const nombre = (watch('nombre_persona_empresa') ?? '').trim()
                if (!nombre) return null
                const yaRegistrado = contactosEmpresa.some(
                  c => c.nombre_completo.toLowerCase() === nombre.toLowerCase()
                )
                if (yaRegistrado) return null
                return (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="flex-1 text-xs text-amber-800">
                      <strong>{nombre}</strong> no está registrado como contacto de esta empresa.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const id = watch('tercero_id')
                        if (!id) return
                        registrarContacto(id, nombre, (c) => {
                          setContactosEmpresa(prev => [...prev, c])
                        })
                      }}
                      className="px-3 py-1 text-xs bg-[#1B3A6E] text-white rounded-lg hover:bg-[#14306A] transition-colors font-medium shrink-0"
                    >
                      + Registrar contacto
                    </button>
                  </div>
                )
              })()}
              </div>
            </div>

            {/* ── BLOQUE 3: Tipo correspondencia ───────────────────── */}
            <div className="space-y-3">
              <SeccionTitulo titulo="Tipo de Correspondencia" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <LookupField
                  label="Tipo Correspondencia *"
                  code={String(watch('tipo_correspondencia_id') || '')}
                  display={display.descripcionTipoCorr}
                  required
                  maxLength={6}
                  error={errors.tipo_correspondencia_id?.message}
                  onSearch={() => setModalAbierto('tipoCorr')}
                  onClear={limpiarTipoCorr}
                  className="lg:col-span-2"
                />
                <ReadonlyField label="Días hábiles" value={display.maxDias} />
                <ReadonlyField label="Fecha límite" value={display.fechaLimite} />
              </div>
            </div>

            {/* ── BLOQUE 4: Aux Tip ─────────────────────────────────── */}
            <div className="space-y-3">
              <SeccionTitulo titulo="Asunto / Aux Tip" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <LookupField
                    label="Aux Tip"
                    code={String(watch('aux_tip_id') ?? '')}
                    display={display.descripcionAuxTip}
                    maxLength={6}
                    onSearch={() => setModalAbierto('auxTip')}
                    onClear={() => { limpiarAuxTip(); setSelectedAuxTip(null) }}
                  />
                  {selectedAuxTip?.zona && (
                    <span className={`mt-1.5 inline-flex text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedAuxTip.zona === 'URBANO'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedAuxTip.zona}
                    </span>
                  )}
                </div>
                <Controller
                  control={control}
                  name="aux_descripcion"
                  render={({ field }) => (
                    <CharCountInput
                      {...field}
                      value={field.value ?? ''}
                      label="Descripción / Asunto"
                      maxLength={100}
                      placeholder="Descripción breve del asunto"
                      error={errors.aux_descripcion?.message}
                      className="lg:col-span-2"
                    />
                  )}
                />
              </div>
            </div>

            {/* ── BLOQUE 5: Destino ──────────────────────────────────── */}
            <div className="space-y-3">
              <SeccionTitulo titulo="Destino" />

              {/* Tipo destino */}
              <div className="flex flex-wrap gap-2">
                {(['INTERNO', 'TERCERO_NIT', 'CIUDADANO'] as const).map(tipo => (
                  <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={tipo}
                      checked={watchTipoDestino === tipo}
                      onChange={() => { setValue('tipo_destino', tipo); limpiarDestino() }}
                      className="accent-[#2B5BA8]"
                    />
                    <span className="text-sm text-slate-700">
                      {{ INTERNO: 'Dependencia interna', TERCERO_NIT: 'Empresa externa', CIUDADANO: 'Ciudadano externo' }[tipo]}
                    </span>
                  </label>
                ))}
              </div>

              {/* Campos condicionales según tipo_destino */}
              {watchTipoDestino === 'INTERNO' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <LookupField
                    label="Dependencia Destino *"
                    code={String(watch('dependencia_destino_id') || '')}
                    display={display.descripcionDepDestino}
                    required
                    maxLength={6}
                    error={errors.dependencia_destino_id?.message}
                    onSearch={() => setModalAbierto('depDestino')}
                    onClear={limpiarDestino}
                    className="lg:col-span-2"
                  />
                  <LookupField
                    label="Responsable"
                    code={String(watch('personal_destino_id') ?? '')}
                    display={display.responsable}
                    maxLength={10}
                    onSearch={() => {
                      if (!watch('dependencia_destino_id')) {
                        toast.error('Seleccione primero la dependencia destino')
                      } else {
                        buscarPersonalDestino('')
                        setModalAbierto('personalDestino')
                      }
                    }}
                    onClear={() => { setValue('personal_destino_id', null); setDisplayField({ responsable: '' }) }}
                    className="lg:col-span-2"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <LookupField
                    label={watchTipoDestino === 'TERCERO_NIT' ? 'Empresa destino *' : 'Ciudadano destino *'}
                    code={String(watch('tercero_destino_id') ?? '')}
                    display={display.descripcionTerceroDestino}
                    required
                    maxLength={10}
                    error={errors.tercero_destino_id?.message}
                    onSearch={() => { buscarTercerosDestino(''); setModalAbierto('terceroDestino') }}
                    onClear={() => { setValue('tercero_destino_id', null); setValue('nombre_persona_destino', ''); setDisplayField({ descripcionTerceroDestino: '' }); setContactosEmpresaDestino([]) }}
                    className="lg:col-span-2"
                  />
                  {watchTipoDestino === 'TERCERO_NIT' && watch('tercero_destino_id') && (
                    <div className="lg:col-span-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                        Contacto en la empresa
                      </span>
                      {loadingContactosDestino ? (
                        <div className="px-3 py-2 text-sm text-slate-400 border border-slate-200 rounded-lg bg-slate-50">
                          Cargando contactos...
                        </div>
                      ) : contactosEmpresaDestino.length > 0 ? (
                        <select
                          value={watch('nombre_persona_destino') ?? ''}
                          onChange={e => setValue('nombre_persona_destino', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                        >
                          <option value="">— Seleccione o escriba un nuevo nombre —</option>
                          {contactosEmpresaDestino.map(c => (
                            <option key={c.id} value={c.nombre_completo}>
                              {c.nombre_completo}{c.cargo ? ` · ${c.cargo}` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Controller
                          control={control}
                          name="nombre_persona_destino"
                          render={({ field }) => (
                            <CharCountInput
                              {...field}
                              label=""
                              value={field.value ?? ''}
                              maxLength={100}
                              placeholder="Nombre del contacto en la empresa"
                            />
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Banner: contacto de empresa destino no registrado */}
              {watchTipoDestino === 'TERCERO_NIT' && watch('tercero_destino_id') && (() => {
                const nombre = (watch('nombre_persona_destino') ?? '').trim()
                if (!nombre) return null
                const yaRegistrado = contactosEmpresaDestino.some(
                  c => c.nombre_completo.toLowerCase() === nombre.toLowerCase()
                )
                if (yaRegistrado) return null
                return (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="flex-1 text-xs text-amber-800">
                      <strong>{nombre}</strong> no está registrado como contacto de esta empresa.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const id = watch('tercero_destino_id')
                        if (!id) return
                        registrarContacto(id, nombre, (c) => {
                          setContactosEmpresaDestino(prev => [...prev, c])
                        })
                      }}
                      className="px-3 py-1 text-xs bg-[#1B3A6E] text-white rounded-lg hover:bg-[#14306A] transition-colors font-medium shrink-0"
                    >
                      + Registrar contacto
                    </button>
                  </div>
                )
              })()}

              {/* Banner: destinatario no registrado */}
              {destinoNoRegistrado && !watch('tercero_destino_id') && !watch('personal_destino_id') && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      Destinatario no registrado en el sistema
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      La IA detectó:{' '}
                      <strong>
                        {destinoNoRegistrado.nombre_empresa_destino || destinoNoRegistrado.nombre_destinatario || '—'}
                      </strong>
                      {destinoNoRegistrado.dependencia_destino && (
                        <> · <span>{destinoNoRegistrado.dependencia_destino}</span></>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (watchTipoDestino === 'INTERNO') {
                          buscarPersonalDestino('')
                          setModalAbierto('personalDestino')
                        } else {
                          buscarTercerosDestino('')
                          setModalAbierto('terceroDestino')
                        }
                      }}
                      className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                    >
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (watchTipoDestino === 'INTERNO') {
                          const nombre = destinoNoRegistrado.nombre_destinatario ?? ''
                          const partes = nombre.trim().split(' ')
                          const apellidos = partes.length > 2 ? partes.slice(-2).join(' ') : partes.slice(-1).join(' ')
                          const nombres = partes.length > 2 ? partes.slice(0, -2).join(' ') : partes.slice(0, 1).join(' ')
                          const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                          const depNombre = norm(destinoNoRegistrado.dependencia_destino ?? '')
                          const allDeps = useCatalogoStore.getState().dependencias
                          const depEncontrada = depNombre
                            ? allDeps.find(d => { const n = norm(d.descripcion ?? ''); return n.includes(depNombre) || depNombre.includes(n) })
                            : undefined
                          setFuncionarioDefaults({
                            nombres,
                            apellidos,
                            cargo: destinoNoRegistrado.cargo_destinatario ?? '',
                            dependencia_id: depEncontrada?.id,
                          })
                          setCreandoFuncionarioCtx('destino')
                        } else {
                          const esNit = watchTipoDestino === 'TERCERO_NIT'
                          const tipoId = tiposIdentificacion.find(t => t.codigo?.toUpperCase() === (esNit ? 'NIT' : 'CC'))?.id ?? 0
                          setTerceroDefaults({
                            tipo_identificacion_id: tipoId,
                            nro_identificacion: '',
                            nombres: esNit
                              ? (destinoNoRegistrado.nombre_empresa_destino ?? '')
                              : (destinoNoRegistrado.nombre_destinatario ?? ''),
                            nombre_contacto: esNit ? (destinoNoRegistrado.nombre_destinatario ?? '') : '',
                          })
                          setCreandoTerceroCtx('destino')
                        }
                      }}
                      className="px-3 py-1.5 text-xs bg-[#1B3A6E] text-white rounded-lg hover:bg-[#14306A] transition-colors font-medium"
                    >
                      + Registrar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── BLOQUE 6: Documento físico / Medio ingreso ──────────── */}
            <div className="space-y-3">
              <SeccionTitulo titulo="Documento Físico" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Folios */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Folios</span>
                  <input
                    type="number"
                    min={1}
                    {...register('folios', { valueAsNumber: true })}
                    placeholder="0"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">De</span>
                  <input
                    type="number"
                    min={1}
                    {...register('folios_de', { valueAsNumber: true })}
                    placeholder="0"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                  />
                </div>

                {/* ¿Tiene anexos? */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">¿Anexos?</span>
                  <div className="flex gap-3 pt-1">
                    {[true, false].map(val => (
                      <label key={String(val)} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="tiene_anexos"
                          checked={tieneAnexos === val}
                          onChange={() => {
                            setTieneAnexos(val)
                            if (!val) syncAnexos([])
                          }}
                          className="accent-[#2B5BA8]"
                        />
                        {val ? 'Sí' : 'No'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista dinámica de anexos — solo si tiene_anexos */}
              {tieneAnexos === true && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      Descripción de anexos
                      {anexosItems.filter(i => i.descripcion.trim()).length > 0 && (
                        <span className="ml-1.5 text-[#2B5BA8] font-semibold">
                          ({anexosItems.filter(i => i.descripcion.trim()).length})
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => syncAnexos([...anexosItems, { descripcion: '', tipo_id: null, archivo: null }])}
                      className="text-xs text-[#2B5BA8] hover:text-[#1B3A6E] font-medium flex items-center gap-1 transition-colors"
                    >
                      + Agregar anexo
                    </button>
                  </div>

                  {anexosItems.length === 0 && (
                    <p className="text-xs text-slate-400 italic">
                      Haz clic en "+ Agregar anexo" o espera a que la IA detecte los anexos del PDF.
                    </p>
                  )}

                  <div className="space-y-2">
                    {anexosItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-xs text-slate-400 font-semibold w-4 shrink-0 text-right mt-2">{idx + 1}.</span>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            value={item.descripcion}
                            maxLength={150}
                            placeholder="Ej: Factura expedida por Enerca"
                            onChange={e => {
                              const updated = [...anexosItems]
                              updated[idx] = { ...updated[idx], descripcion: e.target.value }
                              syncAnexos(updated)
                            }}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                          />
                          <select
                            value={item.tipo_id ?? ''}
                            onChange={e => {
                              const updated = [...anexosItems]
                              updated[idx] = { ...updated[idx], tipo_id: e.target.value ? Number(e.target.value) : null }
                              syncAnexos(updated)
                            }}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8] text-slate-600"
                          >
                            <option value="">Tipo de anexo...</option>
                            {tiposAnexo.map(t => (
                              <option key={t.id} value={t.id}>{t.descripcion}</option>
                            ))}
                          </select>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={e => {
                              const updated = [...anexosItems]
                              updated[idx] = { ...updated[idx], archivo: e.target.files?.[0] ?? null }
                              syncAnexos(updated)
                            }}
                            className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-[#2B5BA8] hover:file:bg-blue-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => syncAnexos(anexosItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0 mt-1"
                          aria-label="Eliminar anexo"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fechas + factura + medio */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Fecha Documento</span>
                  <input
                    type="date"
                    {...register('fecha_documento')}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Fecha Entrega</span>
                  <input
                    type="date"
                    {...register('fecha_entrega')}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                  />
                </div>

                {/* Medio de ingreso */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Medio Ingreso *</span>
                  <select
                    {...register('medio_ingreso_id', { valueAsNumber: true })}
                    className={cn(
                      'px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]',
                      errors.medio_ingreso_id ? 'border-red-300' : 'border-slate-300',
                    )}
                  >
                    <option value={0}>Seleccione...</option>
                    {mediosIngreso.map(m => (
                      <option key={m.id} value={m.id}>{m.descripcion}</option>
                    ))}
                  </select>
                  {errors.medio_ingreso_id && (
                    <span className="text-[10px] text-red-500">{errors.medio_ingreso_id.message}</span>
                  )}
                </div>

                {/* Nro guía — solo si mensajería */}
                {requiereGuia && (
                  <Controller
                    control={control}
                    name="nro_guia"
                    render={({ field }) => (
                      <CharCountInput
                        {...field}
                        value={field.value ?? ''}
                        label="Nro. Guía"
                        maxLength={30}
                        placeholder="Número de guía"
                      />
                    )}
                  />
                )}

                <Controller
                  control={control}
                  name="nro_factura"
                  render={({ field }) => (
                    <CharCountInput
                      {...field}
                      value={field.value ?? ''}
                      label="Nro. Factura"
                      maxLength={30}
                      placeholder="Opcional"
                    />
                  )}
                />

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Valor Factura</span>
                  <input
                    type="text"
                    {...register('valor_factura')}
                    placeholder="$0"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
                  />
                </div>
              </div>
            </div>

            {/* ── BLOQUE 7: Observaciones ──────────────────────────────── */}
            <div className="space-y-3">
              <SeccionTitulo titulo="Observaciones" />
              <Controller
                control={control}
                name="observaciones"
                render={({ field }) => (
                  <CharCountTextarea
                    {...field}
                    value={field.value ?? ''}
                    label="Observaciones"
                    maxLength={5700}
                    rows={4}
                    placeholder="Observaciones adicionales sobre la correspondencia..."
                    error={errors.observaciones?.message}
                  />
                )}
              />
            </div>

          </div>

          {/* ── Barra de estado / acciones ─────────────────────────── */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 rounded-b-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-lg mt-0 -mx-0">
            <div className="flex items-center gap-3">
              <EstadoBadge estado="RADICADO" />
              {user && (
                <span className="text-xs text-slate-500">
                  Operador: <strong className="text-slate-700">{user.name}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancelar(true)}
                className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors',
                  isSubmitting
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-[#16A34A] hover:bg-green-700',
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
                ) : (
                  <><PlusIcon className="w-4 h-4" /> Guardar Radicado</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Modales de búsqueda ──────────────────────────────────────── */}
      <SearchModal
        open={modalAbierto === 'tercero'}
        title={watchTipoRemitente === 'TERCERO_NIT' ? 'Buscar Empresa / NIT' : 'Buscar Ciudadano'}
        columns={COL_TERCERO}
        data={terceroRows}
        isLoading={terceroLoading}
        searchPlaceholder={watchTipoRemitente === 'TERCERO_NIT' ? 'Buscar por NIT o razón social...' : 'Buscar por cédula o nombre...'}
        onQueryChange={buscarTerceros}
        onSelect={selectTercero}
        onClose={() => setModalAbierto(null)}
        onCrear={() => {
          const esNit = watchTipoRemitente === 'TERCERO_NIT'
          const tipoId = tiposIdentificacion.find(t => t.codigo?.toUpperCase() === (esNit ? 'NIT' : 'CC'))?.id ?? 0
          setTerceroDefaults({ tipo_identificacion_id: tipoId })
          setCreandoTerceroCtx('remitente')
        }}
        labelCrear={watchTipoRemitente === 'TERCERO_NIT' ? '+ Registrar Empresa' : '+ Registrar Ciudadano'}
      />
      <SearchModal
        open={modalAbierto === 'funcionario'}
        title="Buscar Funcionario"
        columns={COL_FUNCIONARIO}
        data={funcionarioRows}
        isLoading={funcionarioLoading}
        searchPlaceholder="Buscar por cédula o nombre..."
        onQueryChange={buscarFuncionarios}
        onSelect={selectFuncionario}
        onClose={() => setModalAbierto(null)}
        onCrear={() => {
          setFuncionarioDefaults(undefined)
          setCreandoFuncionarioCtx('remitente')
        }}
        labelCrear="+ Registrar Funcionario"
      />
      <SearchModal
        open={modalAbierto === 'tipoCorr'}
        title="Tipo de Correspondencia"
        columns={COL_TIPO_CORR}
        data={tipoCorrRows}
        searchPlaceholder="Buscar tipo..."
        onSelect={selectTipoCorr}
        onClose={() => setModalAbierto(null)}
      />
      <SearchModal
        open={modalAbierto === 'auxTip'}
        title="Buscar Aux Tip"
        columns={COL_AUX_TIP}
        data={auxTipRows}
        searchPlaceholder="Buscar asunto..."
        onSelect={selectAuxTip}
        onClose={() => setModalAbierto(null)}
      />
      <SearchModal
        open={modalAbierto === 'depDestino'}
        title="Dependencia Destino"
        columns={COL_DEPENDENCIA}
        data={depRows}
        searchPlaceholder="Buscar dependencia..."
        onSelect={selectDepDestino}
        onClose={() => setModalAbierto(null)}
      />
      <SearchModal
        open={modalAbierto === 'personalDestino'}
        title="Responsable / Personal Destino"
        columns={COL_PERSONAL}
        data={personalDestinoRows}
        isLoading={personalDestinoLoading}
        searchPlaceholder="Buscar funcionario..."
        onQueryChange={buscarPersonalDestino}
        onSelect={selectPersonalDestino}
        onClose={() => setModalAbierto(null)}
        onCrear={() => {
          setFuncionarioDefaults(undefined)
          setCreandoFuncionarioCtx('destino')
        }}
        labelCrear="+ Registrar Funcionario"
      />
      <SearchModal
        open={modalAbierto === 'terceroDestino'}
        title={watchTipoDestino === 'TERCERO_NIT' ? 'Buscar Empresa destino' : 'Buscar Ciudadano destino'}
        columns={COL_TERCERO}
        data={terceroDestinoRows}
        isLoading={terceroDestinoLoading}
        searchPlaceholder={watchTipoDestino === 'TERCERO_NIT' ? 'Buscar por NIT o razón social...' : 'Buscar por cédula o nombre...'}
        onQueryChange={buscarTercerosDestino}
        onSelect={selectTerceroDestino}
        onClose={() => setModalAbierto(null)}
        onCrear={() => {
          const esNit = watchTipoDestino === 'TERCERO_NIT'
          const tipoId = tiposIdentificacion.find(t => t.codigo?.toUpperCase() === (esNit ? 'NIT' : 'CC'))?.id ?? 0
          setTerceroDefaults({ tipo_identificacion_id: tipoId })
          setCreandoTerceroCtx('destino')
        }}
        labelCrear={watchTipoDestino === 'TERCERO_NIT' ? '+ Registrar Empresa' : '+ Registrar Ciudadano'}
      />
      <SearchModal
        open={modalAbierto === 'depRemitente'}
        title="Dependencia Remitente"
        columns={COL_DEPENDENCIA}
        data={depRows}
        searchPlaceholder="Buscar dependencia..."
        onSelect={selectDepRemitente}
        onClose={() => setModalAbierto(null)}
      />

      {/* ── Modal crear tercero (remitente o destino según contexto) ─── */}
      <CrearTerceroModal
        open={creandoTerceroCtx !== null}
        onClose={() => { setCreandoTerceroCtx(null); setTerceroDefaults(undefined) }}
        onCreado={(t, nombreContacto) => {
          if (creandoTerceroCtx === 'remitente') handleTerceroCreado(t, nombreContacto)
          else handleTerceroDestinoCreado(t, nombreContacto)
          setCreandoTerceroCtx(null)
          setTerceroDefaults(undefined)
        }}
        defaultValues={terceroDefaults}
      />

      {/* ── Modal crear funcionario (remitente o destino según contexto) */}
      <CrearFuncionarioModal
        open={creandoFuncionarioCtx !== null}
        onClose={() => { setCreandoFuncionarioCtx(null); setFuncionarioDefaults(undefined) }}
        onCreado={(f) => {
          if (creandoFuncionarioCtx === 'remitente') handleFuncionarioCreado(f)
          else handleFuncionarioDestinoCreado(f)
          setCreandoFuncionarioCtx(null)
          setFuncionarioDefaults(undefined)
        }}
        defaultValues={funcionarioDefaults}
      />

      {/* ── Confirm cancelar ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmCancelar}
        title="¿Cancelar radicación?"
        message="Se perderán todos los datos ingresados. ¿Desea continuar?"
        labelSi="Sí, cancelar"
        labelNo="No, continuar"
        onSi={() => { setConfirmCancelar(false); resetForm(); navigate('/radicados') }}
        onNo={() => setConfirmCancelar(false)}
      />

      {/* ── Confirm revisión IA antes de radicar ─────────────────────── */}
      <ConfirmDialog
        open={confirmIARevision}
        title="Revisar campos completados por IA"
        message={`La IA pre-llenó ${iaCamposAplicados.length} campo${iaCamposAplicados.length > 1 ? 's' : ''} automáticamente. ¿Confirmás que revisaste los datos y son correctos antes de radicar?`}
        labelSi="Confirmar y Radicar"
        labelNo="Volver a revisar"
        onSi={handleConfirmarIAYEnviar}
        onNo={() => { setConfirmIARevision(false); pendingValuesRef.current = null }}
        loadingSi={enviandoRadicado}
      />
    </AppLayout>
  )
}
