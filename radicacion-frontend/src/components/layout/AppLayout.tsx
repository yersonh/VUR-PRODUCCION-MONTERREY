import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { InstitucionalHeader } from './InstitucionalHeader'
import { InstitucionalFooter } from './InstitucionalFooter'
import { Sidebar } from './Sidebar'
import { useCatalogoStore } from '@/store/catalogoStore'
import { useAuthStore } from '@/store/authStore'

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
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Skip to content (accesibilidad) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1B3A6E] focus:text-white focus:rounded-lg focus:text-sm"
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
        className="flex-1 mt-14 mb-14 flex flex-col"
      >
        {children}
      </motion.main>

      <InstitucionalFooter />
    </div>
  )
}
