import { useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: number | string
  label: string
}

interface SearchableSelectProps {
  id?: string
  options: SearchableSelectOption[]
  value: number | string | undefined
  onChange: (value: string) => void
  placeholder?: string
  allLabel?: string
  className?: string
}

export function SearchableSelect({
  id, options, value, onChange, placeholder = 'Buscar...', allLabel = 'Todos', className,
}: SearchableSelectProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionado = useMemo(
    () => options.find(o => String(o.value) === String(value)),
    [options, value],
  )

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, busqueda])

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
        setBusqueda('')
      }
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [])

  return (
    <div ref={contenedorRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#C8A800]"
      >
        <span className={cn('truncate text-left', !seleccionado && 'text-slate-500')}>
          {seleccionado ? seleccionado.label : allLabel}
        </span>
        <ChevronDownIcon className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', abierto && 'rotate-180')} />
      </button>

      {abierto && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 w-full min-w-[14rem] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="relative border-b border-slate-100">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => { onChange(''); setAbierto(false); setBusqueda('') }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors',
                !value && 'bg-[#0B1220] text-white hover:bg-[#0B1220]',
              )}
            >
              {allLabel}
            </button>
            {filtradas.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">Sin resultados</p>
            ) : (
              filtradas.map(o => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={String(o.value) === String(value)}
                  onClick={() => { onChange(String(o.value)); setAbierto(false); setBusqueda('') }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors truncate',
                    String(o.value) === String(value) && 'bg-[#0B1220] text-white hover:bg-[#0B1220]',
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
          {seleccionado && (
            <button
              type="button"
              onClick={() => { onChange(''); setAbierto(false); setBusqueda('') }}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-red-600 border-t border-slate-100 transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" /> Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  )
}
