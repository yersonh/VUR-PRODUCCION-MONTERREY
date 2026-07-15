import { Bars3Icon } from '@heroicons/react/24/outline'
import { AlcaldiaLogo } from '@/components/ui/AlcaldiaLogo'
import { UserMenu } from '@/components/ui/UserMenu'
import { NotificacionesPanel } from '@/components/ui/NotificacionesPanel'

interface InstitucionalHeaderProps {
  subtitle?: string
  onToggleSidebar: () => void
}

export function InstitucionalHeader({ subtitle, onToggleSidebar }: InstitucionalHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-[#0B1220] shadow-lg flex items-center gap-3 px-4">
      {/* Hamburger (solo móvil, el panel es estático en escritorio) */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Abrir menú"
        className="lg:hidden text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Escudo + Título */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <AlcaldiaLogo size="xs" />
        <div className="min-w-0 hidden sm:block">
          <p className="text-white font-bold text-xs leading-tight tracking-wide truncate">
            ALCALDÍA DE MONTERREY CASANARE
          </p>
          <p className="text-blue-200 text-[10px] truncate">
            {subtitle ?? 'Sistema de Radicación de Correspondencia'}
          </p>
        </div>
      </div>


      {/* Acciones derecha */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notificaciones */}
        <NotificacionesPanel />

        {/* Separador */}
        <div className="w-px h-6 bg-white/20" />

        {/* Menú de usuario */}
        <UserMenu />
      </div>
    </header>
  )
}
