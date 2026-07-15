import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import type { IACamposSugeridos } from '@/types'

// ── Schema de validación ──────────────────────────────────────────
const radicadoSchemaBase = z.object({
  manejo:                  z.enum(['INFORMATIVO', 'RESOLUTIVO']),
  procedencia:             z.enum(['EXTERNO', 'INTERNO']),
  tipo_remitente:          z.enum(['FUNCIONARIO', 'TERCERO_NIT', 'CIUDADANO']),
  tercero_id:              z.number().nullable(),
  funcionario_id:          z.number().nullable(),
  dependencia_remitente_id:z.number().nullable(),
  tipo_correspondencia_id: z.number().min(1, 'Seleccione un tipo'),
  aux_tip_id:              z.number().nullable(),
  aux_descripcion:         z.string().max(100).nullable(),
  // El destino siempre es una dependencia interna: se autocompleta desde el
  // tipo de correspondencia elegido, o desde lo que detecte la IA en el PDF.
  dependencia_destino_id:  z.number().nullable(),
  personal_destino_id:     z.number().nullable(),
  folios:                  z.number().nullable(),
  folios_de:               z.number().nullable(),
  cantidad_anexos:         z.number().nullable(),
  tipo_anexo_id:           z.number().nullable(),
  otro_anexo:              z.string().max(60).nullable(),
  anexos:                  z.array(z.object({ descripcion: z.string().max(150), tipo_id: z.number().nullable() })).nullable(),
  fecha_documento:         z.string().nullable(),
  fecha_entrega:           z.string().nullable(),
  medio_ingreso_id:        z.number().min(1, 'Seleccione un medio'),
  nombre_persona_empresa:  z.string().max(100).nullable(),
  observaciones:           z.string().max(5700).nullable(),
})

export const radicadoSchema = radicadoSchemaBase.superRefine((data, ctx) => {
  if (!data.dependencia_destino_id) {
    ctx.addIssue({ code: 'custom', path: ['dependencia_destino_id'], message: 'Seleccione una dependencia' })
  }
})

export type RadicadoFormValues = z.infer<typeof radicadoSchemaBase>

// ── Estado de display (campos auto-poblados, no enviados) ─────────
export interface DisplayState {
  descripcionRemitente: string
  descripcionDepRemitente: string
  descripcionTipoCorr: string
  maxDias: string
  descripcionAuxTip: string
  descripcionDepDestino: string
  responsable: string
  descripcionTipoAnexo: string
  descripcionMedioIngreso: string
}

const DISPLAY_INIT: DisplayState = {
  descripcionRemitente:    '',
  descripcionDepRemitente: '',
  descripcionTipoCorr:     '',
  maxDias:                 '',
  descripcionAuxTip:       '',
  descripcionDepDestino:   '',
  responsable:             '',
  descripcionTipoAnexo:    '',
  descripcionMedioIngreso: '',
}

const DEFAULT_VALUES: RadicadoFormValues = {
  manejo:                  'RESOLUTIVO',
  procedencia:             'EXTERNO',
  tipo_remitente:          'TERCERO_NIT',
  tercero_id:              null,
  funcionario_id:          null,
  dependencia_remitente_id:null,
  tipo_correspondencia_id: 0,
  aux_tip_id:              null,
  aux_descripcion:         null,
  dependencia_destino_id:  null,
  personal_destino_id:     null,
  folios:                  null,
  folios_de:               null,
  cantidad_anexos:         null,
  tipo_anexo_id:           null,
  otro_anexo:              null,
  anexos:                  null,
  fecha_documento:         null,
  fecha_entrega:           null,
  medio_ingreso_id:        0,
  nombre_persona_empresa:  null,
  observaciones:           null,
}

export function useRadicadoForm() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const nowTime = format(new Date(), 'HH:mm')

  const [añoRadicado] = useState(new Date().getFullYear())
  const [fechaRadicacion] = useState(today)
  const [horaRadicacion] = useState(nowTime)
  const [display, setDisplay] = useState<DisplayState>(DISPLAY_INIT)
  const [tieneAnexos, setTieneAnexos] = useState<boolean | null>(null)
  const [pdfEntrada, setPdfEntrada] = useState<File | null>(null)
  const [pdfSalida, setPdfSalida] = useState<File | null>(null)
  const [iaSugerencias, setIaSugerencias] = useState<IACamposSugeridos | null>(null)
  const [iaProcessing, setIaProcessing] = useState(false)

  const form = useForm<RadicadoFormValues>({
    resolver: zodResolver(radicadoSchema),
    defaultValues: { ...DEFAULT_VALUES, fecha_entrega: today },
    mode: 'onBlur',
  })

  // ── Helpers de display ─────────────────────────────────────────
  const setDisplayField = (field: Partial<DisplayState>) =>
    setDisplay(prev => ({ ...prev, ...field }))

  // ── Limpiar remitente ──────────────────────────────────────────
  const limpiarRemitente = () => {
    form.setValue('tercero_id', null)
    form.setValue('funcionario_id', null)
    form.setValue('nombre_persona_empresa', '')
    form.setValue('dependencia_remitente_id', null)
    setDisplayField({ descripcionRemitente: '', descripcionDepRemitente: '' })
  }

  // ── Limpiar tipo correspondencia ───────────────────────────────
  const limpiarTipoCorr = () => {
    form.setValue('tipo_correspondencia_id', 0)
    setDisplayField({ descripcionTipoCorr: '', maxDias: '' })
  }

  // ── Limpiar aux tip ────────────────────────────────────────────
  const limpiarAuxTip = () => {
    form.setValue('aux_tip_id', null)
    setDisplayField({ descripcionAuxTip: '' })
  }

  // ── Limpiar destino ────────────────────────────────────────────
  const limpiarDestino = () => {
    form.setValue('dependencia_destino_id', null)
    form.setValue('personal_destino_id', null)
    setDisplayField({ descripcionDepDestino: '', responsable: '' })
  }

  const resetForm = () => {
    form.reset({ ...DEFAULT_VALUES, fecha_entrega: format(new Date(), 'yyyy-MM-dd') })
    setDisplay(DISPLAY_INIT)
    setTieneAnexos(null)
    setPdfEntrada(null)
    setPdfSalida(null)
    setIaSugerencias(null)
    setIaProcessing(false)
  }

  return {
    form,
    añoRadicado,
    fechaRadicacion,
    horaRadicacion,
    display,
    setDisplayField,
    limpiarRemitente,
    limpiarTipoCorr,
    limpiarAuxTip,
    limpiarDestino,
    tieneAnexos,
    setTieneAnexos,
    pdfEntrada,
    setPdfEntrada,
    pdfSalida,
    setPdfSalida,
    iaSugerencias,
    setIaSugerencias,
    iaProcessing,
    setIaProcessing,
    resetForm,
  }
}
