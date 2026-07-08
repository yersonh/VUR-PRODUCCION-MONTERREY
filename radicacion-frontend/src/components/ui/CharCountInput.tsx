import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CharCountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  maxLength: number
  error?: string
  readOnly?: boolean
  helpText?: string
}

export const CharCountInput = forwardRef<HTMLInputElement, CharCountInputProps>(
  ({ label, maxLength, error, readOnly, helpText, className, value, ...props }, ref) => {
    const current = String(value ?? '').length
    const nearLimit = current >= maxLength * 0.9

    return (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          maxLength={maxLength}
          value={value}
          readOnly={readOnly}
          aria-invalid={!!error}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
            'placeholder:text-slate-400',
            readOnly
              ? 'bg-slate-50 text-slate-600 border-slate-200 cursor-default'
              : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]',
            error ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : '',
            className
          )}
          {...props}
        />
        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-[10px] text-red-500">{error}</span>
          ) : helpText ? (
            <span className="text-[10px] text-slate-400">{helpText}</span>
          ) : (
            <span />
          )}
          <span className={cn('text-[10px]', nearLimit ? 'text-red-500 font-medium' : 'text-slate-400')}>
            {current}/{maxLength}
          </span>
        </div>
      </div>
    )
  }
)
CharCountInput.displayName = 'CharCountInput'
