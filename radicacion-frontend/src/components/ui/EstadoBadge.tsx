import { cn } from '@/lib/utils'
import type { EstadoRadicado } from '@/types'

const CONFIG: Record<EstadoRadicado, { label: string; className: string }> = {
  RADICADO:   { label: 'Radicado',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
  EN_TRAMITE: { label: 'En Trámite', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  RESPONDIDO: { label: 'Respondido', className: 'bg-green-100 text-green-700 border-green-200' },
  CERRADO:    { label: 'Cerrado',    className: 'bg-slate-100 text-slate-600 border-slate-200' },
  ANULADO:    { label: 'Anulado',    className: 'bg-red-100 text-red-700 border-red-200' },
}

const DOT: Record<EstadoRadicado, string> = {
  RADICADO:   'bg-blue-500',
  EN_TRAMITE: 'bg-amber-500',
  RESPONDIDO: 'bg-green-500',
  CERRADO:    'bg-slate-400',
  ANULADO:    'bg-red-500',
}

interface EstadoBadgeProps {
  estado: EstadoRadicado
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

export function EstadoBadge({ estado, size = 'md', showDot = true, className }: EstadoBadgeProps) {
  const cfg = CONFIG[estado]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        cfg.className,
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT[estado])} />
      )}
      {cfg.label}
    </span>
  )
}
