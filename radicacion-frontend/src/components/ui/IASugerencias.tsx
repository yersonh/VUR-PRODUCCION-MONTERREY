import { useState } from 'react'
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline'
import type { IACamposSugeridos } from '@/types'

interface CampoMapeado {
  key: keyof IACamposSugeridos
  label: string
  campo: string
}

const CAMPOS_SIMPLES: CampoMapeado[] = [
  { key: 'nombre_remitente',       label: 'Nombre remitente',    campo: 'nombre_persona_empresa' },
  { key: 'asunto',                 label: 'Asunto / Aux tip',    campo: 'aux_descripcion' },
  { key: 'fecha_documento',        label: 'Fecha del documento', campo: 'fecha_documento' },
  { key: 'observaciones',          label: 'Observaciones',       campo: 'observaciones' },
  { key: 'tiene_folios',           label: 'Folios',              campo: 'folios' },
  { key: 'total_folios',           label: 'Total folios (DE)',   campo: 'folios_de' },
  { key: 'nombre_persona_empresa', label: 'Persona / Empresa',   campo: 'nombre_persona_empresa' },
]

interface IASugerenciasProps {
  sugerencias: IACamposSugeridos | null
  onAplicarCampo: (campo: string, valor: string | number) => void
  onAplicarAnexos: (lista: string[]) => void
  onDescartar: () => void
}

export function IASugerencias({ sugerencias, onAplicarCampo, onAplicarAnexos, onDescartar }: IASugerenciasProps) {
  const [expandido, setExpandido] = useState(true)

  if (!sugerencias) return null

  const confianza    = sugerencias.confianza ?? 0
  const confianzaPct = Math.round(confianza * 100)
  const colorConfianza = confianza >= 0.8 ? 'text-green-600' : confianza >= 0.5 ? 'text-amber-500' : 'text-red-500'
  const barWidth       = confianza >= 0.8 ? 'bg-green-500'   : confianza >= 0.5 ? 'bg-amber-400'   : 'bg-red-400'

  const camposSimples = CAMPOS_SIMPLES.filter(c => sugerencias[c.key] != null)
  const tieneAnexosIA  = sugerencias.tiene_anexos
  const listaAnexosIA  = sugerencias.descripcion_anexos

  const hayAlgo = camposSimples.length > 0 || tieneAnexosIA != null
  if (!hayAlgo) return null

  return (
    <div className="border border-indigo-200 bg-indigo-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 border-b border-indigo-200">
        <SparklesIcon className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="font-semibold text-indigo-800 text-sm flex-1">
          ✨ Gemini IA — Campos detectados del PDF
        </span>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${colorConfianza}`}>{confianzaPct}%</span>
            <div className="w-16 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barWidth}`} style={{ width: `${confianzaPct}%` }} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpandido(v => !v)}
            aria-label={expandido ? 'Colapsar sugerencias' : 'Expandir sugerencias'}
            className="text-indigo-500 hover:text-indigo-700 p-0.5"
          >
            {expandido ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onDescartar}
            aria-label="Descartar sugerencias"
            className="text-indigo-400 hover:text-red-500 p-0.5 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expandido && (
        <div className="p-3 space-y-2">
          {/* Campos simples */}
          {camposSimples.map(({ key, label, campo }) => {
            const val = sugerencias[key]
            return (
              <div key={key} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-indigo-100">
                <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
                <span className="text-sm text-slate-700 flex-1 truncate font-medium">{String(val)}</span>
                <button
                  type="button"
                  onClick={() => onAplicarCampo(campo, val as string | number)}
                  className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors font-medium shrink-0"
                >
                  Aplicar
                </button>
              </div>
            )
          })}

          {/* Fila especial de anexos */}
          {tieneAnexosIA === false && (
            <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-indigo-100">
              <PaperClipIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 flex-1 italic">Sin anexos mencionados en el documento</span>
            </div>
          )}

          {tieneAnexosIA === true && (
            <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2 border-b border-indigo-50">
                <PaperClipIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs text-slate-500 w-36 shrink-0">Anexos detectados</span>
                <span className="text-sm text-slate-700 font-medium flex-1">
                  {listaAnexosIA && listaAnexosIA.length > 0
                    ? `${listaAnexosIA.length} anexo${listaAnexosIA.length > 1 ? 's' : ''}`
                    : 'Con anexos (sin descripción)'}
                </span>
                {listaAnexosIA && listaAnexosIA.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onAplicarAnexos(listaAnexosIA)}
                    className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors font-medium shrink-0"
                  >
                    Aplicar
                  </button>
                )}
              </div>
              {listaAnexosIA && listaAnexosIA.length > 0 && (
                <ul className="px-4 py-2 space-y-0.5">
                  {listaAnexosIA.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-indigo-400 font-bold shrink-0">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="text-[10px] text-indigo-400 text-center pt-1">
            Revisa y confirma los valores antes de guardar el radicado
          </p>
        </div>
      )}
    </div>
  )
}
