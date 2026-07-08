import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CharCountTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  maxLength: number
  error?: string
}

export const CharCountTextarea = forwardRef<HTMLTextAreaElement, CharCountTextareaProps>(
  ({ label, maxLength, error, className, value, ...props }, ref) => {
    const current = String(value ?? '').length
    const nearLimit = current >= maxLength * 0.9

    return (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          maxLength={maxLength}
          value={value}
          aria-invalid={!!error}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border resize-none transition-colors',
            'bg-white text-slate-800 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]',
            error ? 'border-red-300' : 'border-slate-300',
            className
          )}
          {...props}
        />
        <div className="flex items-center justify-between">
          {error
            ? <span className="text-[10px] text-red-500">{error}</span>
            : <span />
          }
          <span className={cn('text-[10px]', nearLimit ? 'text-red-500 font-medium' : 'text-slate-400')}>
            {current}/{maxLength}
          </span>
        </div>
      </div>
    )
  }
)
CharCountTextarea.displayName = 'CharCountTextarea'
