import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationCircleIcon } from '@heroicons/react/24/solid'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  labelSi?: string
  labelNo?: string
  onSi: () => void
  onNo: () => void
  loadingSi?: boolean
}

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
const panel = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
}

export function ConfirmDialog({
  open, title = '¡Atención!', message, labelSi = 'SÍ', labelNo = 'NO', onSi, onNo, loadingSi = false,
}: ConfirmDialogProps) {
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
          <div className="absolute inset-0 bg-black/40" onClick={onNo} />

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
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <ExclamationCircleIcon className="w-8 h-8 text-[#C8A800]" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <p className="text-slate-500 text-sm mt-1">{message}</p>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={onNo}
                  className="flex-1 py-2.5 px-4 rounded-xl border-2 border-red-400 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
                >
                  {labelNo} ✕
                </button>
                <button
                  type="button"
                  onClick={onSi}
                  disabled={loadingSi}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingSi ? 'Guardando...' : `${labelSi} ✓`}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
