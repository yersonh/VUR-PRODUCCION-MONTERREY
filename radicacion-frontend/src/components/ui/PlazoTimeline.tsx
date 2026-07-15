import { useMemo } from 'react'
import { format, parseISO, isValid, addBusinessDays, differenceInCalendarDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { DocumentTextIcon, InboxArrowDownIcon, FlagIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PlazoTimelineProps {
  fechaDocumento?: string | null
  fechaIngreso?: string | null
  diasHabiles?: number | null
}

interface Paso {
  key: string
  icono: typeof DocumentTextIcon
  label: string
  fecha: Date | null
  sublabel?: string
  acento?: 'oro' | 'teal'
}

function parseFecha(valor?: string | null): Date | null {
  if (!valor) return null
  const d = parseISO(valor)
  return isValid(d) ? d : null
}

export function PlazoTimeline({ fechaDocumento, fechaIngreso, diasHabiles }: PlazoTimelineProps) {
  const pasos = useMemo<Paso[]>(() => {
    const docFecha = parseFecha(fechaDocumento)
    const ingresoFecha = parseFecha(fechaIngreso)
    const sinLimite = !diasHabiles || diasHabiles <= 0
    const limiteFecha = !sinLimite && ingresoFecha ? addBusinessDays(ingresoFecha, diasHabiles!) : null

    const items: Paso[] = []
    if (docFecha) {
      items.push({ key: 'documento', icono: DocumentTextIcon, label: 'Fecha Documento', fecha: docFecha })
    }
    items.push({ key: 'ingreso', icono: InboxArrowDownIcon, label: 'Fecha de Ingreso', fecha: ingresoFecha })
    items.push({
      key: 'limite',
      icono: FlagIcon,
      label: 'Fecha de Finalización',
      fecha: limiteFecha,
      sublabel: sinLimite ? 'Sin límite' : diasHabiles ? `${diasHabiles} día${diasHabiles > 1 ? 's' : ''} hábil${diasHabiles > 1 ? 'es' : ''}` : undefined,
      acento: 'oro',
    })
    return items
  }, [fechaDocumento, fechaIngreso, diasHabiles])

  const hoy = new Date()
  const limite = pasos[pasos.length - 1]?.fecha ?? null
  const diasRestantes = limite ? differenceInCalendarDays(limite, hoy) : null
  const vencido = diasRestantes !== null && diasRestantes < 0

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 sm:px-6 py-5">
      <div className="relative flex items-start justify-between">
        {/* Línea base */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200" />
        {/* Línea de progreso animada */}
        <motion.div
          className="absolute top-4 left-4 right-4 h-0.5 bg-gradient-to-r from-[#1F8C6F] to-[#C8A800] origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pasos.length > 1 ? 1 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {pasos.map((paso, i) => {
          const Icono = paso.icono
          const esUltimo = i === pasos.length - 1
          const tieneFecha = !!paso.fecha

          return (
            <motion.div
              key={paso.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center flex-1 min-w-0 px-1"
            >
              <motion.div
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.12 + 0.1, type: 'spring', stiffness: 260, damping: 18 }}
                className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0',
                  esUltimo
                    ? vencido
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-[#C8A800] border-[#C8A800] text-white'
                    : tieneFecha
                      ? 'bg-[#1F8C6F] border-[#1F8C6F] text-white'
                      : 'bg-white border-slate-300 text-slate-300',
                )}
              >
                {esUltimo && !vencido && tieneFecha && (
                  <span className="absolute inset-0 rounded-full bg-[#C8A800] animate-ping opacity-30" />
                )}
                <Icono className="w-4 h-4 relative" />
              </motion.div>

              <span className="mt-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                {paso.label}
              </span>
              <span className={cn('text-sm font-bold mt-0.5', tieneFecha ? 'text-[#0B1220]' : 'text-slate-300')}>
                {paso.fecha ? format(paso.fecha, 'dd/MM/yyyy', { locale: es }) : '—'}
              </span>
              {paso.sublabel && (
                <span className="text-[11px] text-slate-400 mt-0.5">{paso.sublabel}</span>
              )}
              {esUltimo && tieneFecha && diasRestantes !== null && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.12 + 0.3 }}
                  className={cn(
                    'mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
                    vencido ? 'bg-red-100 text-red-600' : diasRestantes <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700',
                  )}
                >
                  {vencido ? `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? '' : 's'}` : diasRestantes === 0 ? 'Vence hoy' : `Quedan ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`}
                </motion.span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
