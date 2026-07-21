import { motion, AnimatePresence } from 'framer-motion'

interface ProgressModalProps {
  open: boolean
  title?: string
  message?: string
  /** 0-100 */
  progress: number
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
const panel = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
}

// Modal de carga sin acción del usuario — cubre toda la pantalla e impide
// interactuar con el formulario mientras dura un proceso asíncrono (ej.
// validación de un documento con IA), para que no se pueda enviar el
// formulario antes de que termine.
export function ProgressModal({ open, title = 'Procesando...', message, progress }: ProgressModalProps) {
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
          <div className="absolute inset-0 bg-black/40" />

          <motion.div
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="alertdialog"
            aria-modal="true"
            aria-busy="true"
            className="relative w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col items-center px-8 pt-8 pb-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#C8A800] animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                {message && <p className="text-slate-500 text-sm mt-1">{message}</p>}
              </div>

              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C8A800] rounded-full transition-[width] duration-150 ease-out"
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
