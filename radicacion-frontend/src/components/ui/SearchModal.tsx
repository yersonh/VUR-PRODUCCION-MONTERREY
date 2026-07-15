import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

export interface SearchColumn {
  key: string
  label: string
  width?: string
}

export type SearchRow = Record<string, string | number | boolean | null | undefined>

interface SearchModalProps {
  open: boolean
  title: string
  columns: SearchColumn[]
  data: SearchRow[]
  onSelect: (row: SearchRow) => void
  onClose: () => void
  isLoading?: boolean
  searchPlaceholder?: string
  onQueryChange?: (q: string) => void
  onCrear?: () => void
  labelCrear?: string
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
const panel = {
  hidden:  { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } },
}

export function SearchModal({
  open, title, columns, data, onSelect, onClose, isLoading,
  searchPlaceholder = 'Buscar...', onQueryChange, onCrear, labelCrear = 'Crear nuevo',
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SearchRow | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(null)
      onQueryChange?.('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    onQueryChange?.(val)
  }

  const filtered = onQueryChange
    ? data
    : data.filter(row =>
        query.trim() === '' || columns.some(col => {
          const val = row[col.key]
          return val != null && String(val).toLowerCase().includes(query.toLowerCase())
        })
      )

  const handleSelect = (row: SearchRow) => {
    setSelected(row)
    onSelect(row)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-2xl bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#0B1220]">
              <h2 className="text-white font-semibold text-sm tracking-wide uppercase">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="text-white/70 hover:text-white transition-colors p-1 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  maxLength={50}
                  className="w-full pl-9 pr-12 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  {query.length}/50
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                  <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cargando...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No se encontraron resultados
                  {onCrear && (
                    <p className="mt-1 text-xs text-slate-400">
                      ¿No está registrado? Créelo desde el botón de abajo.
                    </p>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      {columns.map(col => (
                        <th
                          key={col.key}
                          style={col.width ? { width: col.width } : undefined}
                          className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const isSelected = selected != null && columns.every(c => row[c.key] === selected[c.key])
                      return (
                        <tr
                          key={i}
                          onClick={() => handleSelect(row)}
                          className={`
                            cursor-pointer border-b border-slate-100 transition-colors
                            ${isSelected
                              ? 'bg-[#0B1220] text-white'
                              : 'hover:bg-blue-50 text-slate-700'
                            }
                          `}
                        >
                          {columns.map(col => (
                            <td key={col.key} className="px-4 py-2.5">
                              {String(row[col.key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer con botón Crear */}
            {onCrear && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => { onClose(); onCrear() }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0B1220] text-white text-xs font-semibold rounded-lg hover:bg-[#060911] transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {labelCrear}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
