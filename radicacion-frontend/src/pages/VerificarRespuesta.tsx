import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { verificacionService, type VerificacionResult } from '@/services/verificacionService'
import { AlcaldiaLogo } from '@/components/ui/AlcaldiaLogo'
import { NexGovIAInfoModal } from '@/components/ui/NexGovIAInfoModal'
import fondoInstitucional from '@/assets/fondo/fondo-casa.png'

export default function VerificarRespuesta() {
  const [params, setParams] = useSearchParams()
  const [codigo, setCodigo] = useState(params.get('codigo') ?? '')
  const [consulta, setConsulta] = useState<string | null>(params.get('codigo'))
  const [resultado, setResultado] = useState<VerificacionResult | null>(null)
  const [cargando, setCargando] = useState(false)
  const [showNexGovIA, setShowNexGovIA] = useState(false)

  useEffect(() => {
    if (!consulta) return
    setCargando(true)
    setResultado(null)
    verificacionService.verificar(consulta)
      .then(setResultado)
      .catch(() => setResultado({ valido: false, message: 'No fue posible consultar el código. Intente de nuevo.' }))
      .finally(() => setCargando(false))
  }, [consulta])

  const buscar = () => {
    const c = codigo.trim().toUpperCase()
    if (!c) return
    setParams({ codigo: c })
    setConsulta(c)
  }

  const doc = resultado?.documento
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#0B1220]">
      {/* Fondo difuminado — mismo tratamiento que Login.tsx */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${fondoInstitucional})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(3px) brightness(0.65) saturate(0.9)',
          transform: 'scale(1.02)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0B1220]/45 via-[#0B1220]/25 to-[#0B1220]/50" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 80%, rgba(200,168,0,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(31,140,111,0.14) 0%, transparent 50%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(32px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.1)',
          }}
        >
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #0B1220 0%, #1F8C6F 50%, #C8A800 100%)' }}
          />

          <div className="px-8 pt-8 pb-8">
            <div className="flex flex-col items-center mb-7">
              <AlcaldiaLogo size="xl" />
              <h1 className="mt-4 text-base font-bold text-white tracking-wide text-center leading-snug">
                ALCALDÍA DE MONTERREY
                <span className="block text-[#C8A800]">CASANARE</span>
              </h1>
              <p className="mt-1 text-xs text-blue-200/70 text-center">
                Verificación pública de documentos de respuesta
              </p>
            </div>

            <div className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <MagnifyingGlassIcon className="w-4.5 h-4.5" />
                </div>
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscar()}
                  placeholder="Código de verificación (ej. ABCD-1234)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm uppercase text-white placeholder-white/30 bg-black/25 border-white/12 focus:outline-none focus:ring-2 focus:ring-[#C8A800]/40 focus:border-[#C8A800]/70 focus:bg-black/30 transition-all duration-200"
                  style={{
                    colorScheme: 'dark',
                    WebkitTextFillColor: 'white',
                    WebkitBoxShadow: '0 0 0px 1000px rgba(0,0,0,0.25) inset',
                    transition: 'background-color 5000s ease-in-out 0s',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={buscar}
                disabled={cargando}
                className="px-5 rounded-xl font-bold text-sm text-[#0B1220] bg-gradient-to-r from-[#C8A800] to-[#e0be00] hover:from-[#d4b200] hover:to-[#f0ce00] shadow-lg shadow-[#C8A800]/30 disabled:opacity-50 transition-all duration-200"
              >
                {cargando ? 'Buscando…' : 'Verificar'}
              </button>
            </div>

            {consulta && !cargando && resultado && (
              resultado.valido && doc ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <CheckCircleIcon className="w-8 h-8 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-bold text-white">Documento válido</p>
                      <p className="text-sm text-white/60">Respuesta auténtica emitida por la Alcaldía de Monterrey, Casanare.</p>
                    </div>
                  </div>

                  <dl className="divide-y divide-white/10 rounded-lg border border-white/12 overflow-hidden">
                    {([
                      ['Radicado', doc.radicado],
                      ['Tipo de trámite', doc.tipo_correspondencia ?? '—'],
                      ['Estado', doc.estado ?? '—'],
                      ['Fecha de respuesta', doc.fecha_respuesta ?? '—'],
                      ['Código', doc.codigo_verificacion],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                        <dt className="text-white/50">{k}</dt>
                        <dd className="text-right font-medium text-white">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <a href={`${apiUrl}/verificar-respuesta/${doc.codigo_verificacion}/pdf`} target="_blank" rel="noreferrer">
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-bold text-sm text-[#0B1220] bg-gradient-to-r from-[#C8A800] to-[#e0be00] hover:from-[#d4b200] hover:to-[#f0ce00] shadow-lg shadow-[#C8A800]/30 hover:shadow-xl hover:shadow-[#C8A800]/40 active:scale-[0.98] transition-all duration-200"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" /> Descargar documento
                    </button>
                  </a>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/15 p-4">
                  <XCircleIcon className="w-8 h-8 shrink-0 text-red-300" />
                  <div>
                    <p className="font-bold text-white">Documento no encontrado</p>
                    <p className="text-sm text-white/60">{resultado.message ?? 'Verifique el código e intente nuevamente.'}</p>
                  </div>
                </div>
              )
            )}

            {!consulta && (
              <p className="flex items-start gap-2 text-xs text-white/40 leading-relaxed">
                <ExclamationCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                Ingrese el código impreso junto al código QR del documento de respuesta para confirmar su autenticidad.
              </p>
            )}
          </div>

          <div className="px-8 py-3 border-t border-white/8 text-center">
            <p className="text-[11px] text-white/30">
              © 2026 Alcaldía de Monterrey Casanare · Desarrollado por{' '}
              <button
                type="button"
                onClick={() => setShowNexGovIA(true)}
                className="font-semibold text-[#C8A800]/70 hover:text-[#C8A800] underline underline-offset-2 decoration-dotted transition-colors cursor-pointer"
              >
                NexGovIA
              </button>
            </p>
          </div>
        </div>
      </motion.div>

      <NexGovIAInfoModal isOpen={showNexGovIA} onClose={() => setShowNexGovIA(false)} />
    </div>
  )
}
