import { useState } from 'react'
import { QuestionMarkCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { abrirPdfEnNuevaVentana } from '@/services/api'
import toast from 'react-hot-toast'

export default function Ayuda() {
  const [cargando, setCargando] = useState(false)

  const verManual = async () => {
    setCargando(true)
    try {
      await abrirPdfEnNuevaVentana('/manuales/mio')
    } catch {
      toast.error('No se pudo abrir el manual de usuario')
    } finally {
      setCargando(false)
    }
  }

  return (
    <AppLayout subtitle="Ayuda">
      <div className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#C8A800]/10 flex items-center justify-center shrink-0">
              <QuestionMarkCircleIcon className="w-6 h-6 text-[#C8A800]" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">Ayuda</h1>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Consulte el manual de usuario del Sistema de Radicación de Correspondencia,
            preparado según su rol en el sistema.
          </p>

          <button
            type="button"
            onClick={verManual}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0B1220] text-white text-sm font-medium hover:bg-[#0B1220]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {cargando ? 'Abriendo...' : 'Ver Manual de Usuario'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
