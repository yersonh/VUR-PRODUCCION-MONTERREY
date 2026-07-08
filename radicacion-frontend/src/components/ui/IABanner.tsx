import { useState } from 'react'
import { SparklesIcon, CheckCircleIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CampoAplicado {
  label: string
  valor: string
}

interface IABannerProps {
  campos: CampoAplicado[]
  confianza: number
  revisado: boolean
  onRevisar: () => void
  onDismiss: () => void
  onReanalizar?: () => void
}

export function IABanner({ campos, confianza, revisado, onRevisar, onDismiss, onReanalizar }: IABannerProps) {
  const [mostrarDetalle, setMostrarDetalle] = useState(false)

  if (campos.length === 0) return null

  const pct = Math.round(confianza * 100)
  const colorBar = confianza >= 0.8 ? 'bg-green-500' : confianza >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
  const colorPct = confianza >= 0.8 ? 'text-green-600' : confianza >= 0.5 ? 'text-amber-600' : 'text-red-600'

  if (revisado) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl"
      >
        <CheckCircleIcon className="w-4 h-4 text-green-600 shrink-0" />
        <p className="text-xs text-green-700 font-medium flex-1">
          {campos.length} campo{campos.length > 1 ? 's' : ''} pre-llenado{campos.length > 1 ? 's' : ''} por IA — revisados y confirmados.
        </p>
        {onReanalizar && (
          <button
            type="button"
            onClick={onReanalizar}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium transition-colors"
          >
            <ArrowPathIcon className="w-3 h-3" />
            Re-analizar
          </button>
        )}
        <button type="button" onClick={onDismiss} aria-label="Cerrar" className="text-green-400 hover:text-green-600 transition-colors">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-indigo-200 bg-indigo-50 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <SparklesIcon className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="text-sm font-semibold text-indigo-800 flex-1">
          IA completó {campos.length} campo{campos.length > 1 ? 's' : ''} automáticamente
        </span>

        {/* Confianza */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-xs font-bold', colorPct)}>{pct}%</span>
          <div className="w-16 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', colorBar)} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarDetalle(v => !v)}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors ml-1"
        >
          {mostrarDetalle ? 'Ocultar' : 'Ver datos'}
        </button>

        <button type="button" onClick={onDismiss} aria-label="Cerrar IA banner" className="text-indigo-400 hover:text-red-400 transition-colors ml-1">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Chips de campos */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {campos.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[11px] bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 font-medium"
          >
            <CheckCircleIcon className="w-3 h-3 text-indigo-500" />
            {c.label}
          </span>
        ))}
      </div>

      {/* Detalle de valores */}
      <AnimatePresence>
        {mostrarDetalle && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2 space-y-1 border-t border-indigo-100 pt-2">
              {campos.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 w-32 shrink-0">{c.label}</span>
                  <span className="text-slate-700 font-medium line-clamp-1">{c.valor}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — acción de revisión */}
      <div className="flex items-center justify-between px-4 py-2 bg-indigo-100/60 border-t border-indigo-200">
        <p className="text-[11px] text-indigo-600">
          Revisa cada campo antes de guardar el radicado
        </p>
        <div className="flex items-center gap-2">
          {onReanalizar && (
            <button
              type="button"
              onClick={onReanalizar}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              <ArrowPathIcon className="w-3 h-3" />
              Re-analizar
            </button>
          )}
          <button
            type="button"
            onClick={onRevisar}
            className="flex items-center gap-1.5 text-xs bg-[#1B3A6E] text-white px-3 py-1.5 rounded-lg hover:bg-[#14306A] transition-colors font-semibold"
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Confirmar revisión
          </button>
        </div>
      </div>
    </motion.div>
  )
}
