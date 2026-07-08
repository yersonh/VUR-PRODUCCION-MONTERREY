import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import nexgoviaLogo from '@/assets/logos/empresa.png'

interface NexGovIAInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NexGovIAInfoModal({ isOpen, onClose }: NexGovIAInfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{
              background: 'rgba(8, 16, 40, 0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
            }}
          >
            {/* Botón cerrar — fuera del header para que overflow-hidden no lo bloquee */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full z-20 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <XMarkIcon className="w-4.5 h-4.5" />
            </button>

            {/* ── Header ── */}
            <div className="relative overflow-hidden shrink-0" style={{
              background: 'linear-gradient(135deg, #020818 0%, #0d1b3e 50%, #0f1f4a 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* Dot pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%" fill="none">
                  <pattern id="dots-nex" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="white" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#dots-nex)" />
                </svg>
              </div>
              {/* Halo dorado */}
              <div className="absolute -left-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Logo + texto */}
              <div className="flex items-center gap-5 px-6 sm:px-8 py-6 pr-14 relative z-10">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center p-2.5 shadow-xl shrink-0"
                  style={{ boxShadow: '0 0 0 4px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)' }}
                >
                  <img src={nexgoviaLogo} alt="NexGovIA" className="w-full h-full object-contain" />
                </motion.div>
                <div>
                  <p className="text-white text-xs sm:text-sm font-semibold leading-relaxed">
                    Plataforma desarrollada por{' '}
                    <span className="text-amber-400">NexGovIA S.A.S.®</span>
                  </p>
                  <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed mt-1">
                    Asesores{' '}
                    <span className="text-indigo-300 font-semibold">e-Governance Solutions</span>{' '}
                    para Entidades Públicas.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Contenido ── */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(71,85,105,0.5) transparent' }}>

              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                NexGovIA es una firma líder en consultoría y desarrollo tecnológico, especializada en la implementación de soluciones de Inteligencia Artificial para la administración pública, mediante la automatización de procesos de sus actividades administrativas incursas en cumplimientos normativos.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mb-7">
                Diseñamos ecosistemas digitales que permiten a las organizaciones gubernamentales operar con mayor transparencia, agilidad y eficiencia, conectando mejor con las necesidades del ciudadano moderno.
              </p>

              {/* Features */}
              <div className="grid grid-cols-3 gap-3 mb-7">
                {[
                  {
                    icon: <GlobeAltIcon className="w-5 h-5" />,
                    color: 'text-indigo-400',
                    bg: 'rgba(99,102,241,0.08)',
                    border: 'rgba(99,102,241,0.2)',
                    label: 'Alcance',
                    labelColor: 'text-indigo-300',
                    desc: 'Sistemas escalables a nivel nacional.',
                  },
                  {
                    icon: <ShieldCheckIcon className="w-5 h-5" />,
                    color: 'text-purple-400',
                    bg: 'rgba(168,85,247,0.08)',
                    border: 'rgba(168,85,247,0.2)',
                    label: 'Seguridad',
                    labelColor: 'text-purple-300',
                    desc: 'Protección de datos de alto nivel.',
                  },
                  {
                    icon: <BoltIcon className="w-5 h-5" />,
                    color: 'text-amber-400',
                    bg: 'rgba(245,158,11,0.08)',
                    border: 'rgba(245,158,11,0.2)',
                    label: 'IA',
                    labelColor: 'text-amber-300',
                    desc: 'Automatización inteligente de procesos.',
                  },
                ].map(f => (
                  <div
                    key={f.label}
                    className="p-4 rounded-2xl"
                    style={{ background: f.bg, border: `1px solid ${f.border}` }}
                  >
                    <div className={`${f.color} mb-2`}>{f.icon}</div>
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${f.labelColor}`}>{f.label}</h4>
                    <p className="text-slate-400 text-[11px] leading-snug">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Sitio web */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-7">
                <p className="text-slate-400 text-sm">Conoce más sobre nosotros en:</p>
                <a
                  href="https://nexgovia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
                >
                  <GlobeAltIcon className="w-3.5 h-3.5" />
                  nexgovia.com
                </a>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #4338ca, #3730a3)',
                  boxShadow: '0 4px 20px rgba(67,56,202,0.35)',
                }}
              >
                Entendido
              </button>

              <p className="text-center text-[10px] text-slate-600 mt-4">
                © 2026 NexGovIA • Transformando el futuro de la gestión pública
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
