import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface LookupFieldProps {
  label?: string
  code: string
  display?: string
  onSearch: () => void
  onClear?: () => void
  maxLength?: number
  required?: boolean
  disabled?: boolean
  placeholder?: string
  error?: string
  className?: string
}

export function LookupField({
  label, code, display, onSearch, onClear, maxLength = 10,
  required, disabled, placeholder = 'Buscar...', error, className,
}: LookupFieldProps) {
  const current = code.length

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {label && (
        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className={cn(
        'flex items-center rounded-lg border transition-colors overflow-hidden',
        disabled ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300',
        error ? 'border-red-300' : 'focus-within:border-[#2B5BA8] focus-within:ring-2 focus-within:ring-blue-100',
      )}>
        <input
          type="text"
          readOnly
          value={display || code}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 min-w-0 px-3 py-2 text-sm bg-transparent outline-none cursor-pointer',
            code ? 'text-slate-800' : 'text-slate-400',
          )}
          onClick={disabled ? undefined : onSearch}
        />

        {code && onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Limpiar campo"
            className="px-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={disabled ? undefined : onSearch}
          disabled={disabled}
          aria-label="Buscar"
          className={cn(
            'px-3 py-2 border-l transition-colors',
            disabled
              ? 'border-slate-200 text-slate-300 cursor-default'
              : 'border-slate-200 text-[#2B5BA8] hover:bg-[#2B5BA8] hover:text-white',
          )}
        >
          <MagnifyingGlassIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        {error
          ? <span className="text-[10px] text-red-500">{error}</span>
          : <span />
        }
        <span className="text-[10px] text-slate-400">{current}/{maxLength}</span>
      </div>
    </div>
  )
}
