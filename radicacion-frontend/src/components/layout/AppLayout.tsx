import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { InstitucionalHeader } from './InstitucionalHeader'
import { InstitucionalFooter } from './InstitucionalFooter'
import { Sidebar } from './Sidebar'
import { useCatalogoStore } from '@/store/catalogoStore'
import { useAuthStore } from '@/store/authStore'
import fondoInstitucional from '@/assets/fondo/fondo-casa.png'

interface AppLayoutProps {
  children: React.ReactNode
  subtitle?: string
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
}

export function AppLayout({ children, subtitle }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { cargarCatalogos, cargado } = useCatalogoStore()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated && !cargado) {
      cargarCatalogos()
    }
  }, [isAuthenticated, cargado, cargarCatalogos])

  // Close sidebar on desktop resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setSidebarOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0B1220]">
      {/* Fondo difuminado */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${fondoInstitucional})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(3px) brightness(0.65) saturate(0.9)',
          transform: 'scale(1.02)',
        }}
      />

      {/* Velo oscuro para contraste con el contenido */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#0B1220]/45 via-[#0B1220]/25 to-[#0B1220]/50" />

      {/* Aura de color sobre el fondo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 80%, rgba(200,168,0,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(31,140,111,0.14) 0%, transparent 50%)',
        }}
      />

      {/* Skip to content (accesibilidad) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0B1220] focus:text-white focus:rounded-lg focus:text-sm"
      >
        Ir al contenido principal
      </a>

      {/* Header fijo */}
      <InstitucionalHeader
        subtitle={subtitle}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      {/* Sidebar deslizante */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido principal */}
      <motion.main
        id="main-content"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="relative z-10 flex-1 mt-14 mb-14 flex flex-col lg:ml-64"
      >
        {children}
      </motion.main>

      <InstitucionalFooter />
    </div>
  )
}
