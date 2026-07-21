import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'

interface AlertDialogProps {
  open: boolean
  title?: string
  message: string
  labelOk?: string
  onOk: () => void
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
const panel = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
}

// Modal de una sola acción — para avisos que el usuario debe reconocer
// explícitamente antes de continuar (a diferencia de ConfirmDialog, que
// pide una decisión SÍ/NO).
export function AlertDialog({ open, title = '¡Atención!', message, labelOk = 'Entendido', onOk }: AlertDialogProps) {
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
          <div className="absolute inset-0 bg-black/40" onClick={onOk} />

          <motion.div
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col items-center px-8 pt-8 pb-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <p className="text-slate-500 text-sm mt-1">{message}</p>
              </div>

              <button
                type="button"
                onClick={onOk}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#0B1220] text-white font-semibold text-sm hover:bg-[#1A2E28] transition-colors"
              >
                {labelOk}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
