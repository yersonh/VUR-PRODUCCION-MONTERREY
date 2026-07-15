import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon, InboxArrowDownIcon, MagnifyingGlassIcon,
  UsersIcon, BuildingOffice2Icon, DocumentTextIcon,
  UserGroupIcon, Cog8ToothIcon, IdentificationIcon,
  BuildingOfficeIcon, ChartBarIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { useAvatarUrl } from '@/hooks/useAvatarUrl'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  badge?: string
  adminOnly?: boolean
  // Oculto para el rol FUNCIONARIO — no radica entradas, solo responde lo
  // que le asignan (ver 'labelFuncionario' para el ítem que sí ve distinto).
  ocultoParaFuncionario?: boolean
  labelFuncionario?: string
}

const NAV_SECTIONS = [
  {
    title: 'Principal',
    items: [
      { to: '/dashboard', icon: <HomeIcon className="w-4.5 h-4.5" />, label: 'Inicio' },
    ] as NavItem[],
  },
  {
    title: 'Correspondencia',
    items: [
      {
        to: '/radicados/nuevo',
        icon: <InboxArrowDownIcon className="w-4.5 h-4.5" />,
        label: 'Nueva Radicación',
        ocultoParaFuncionario: true,
      },
      {
        to: '/radicados',
        icon: <MagnifyingGlassIcon className="w-4.5 h-4.5" />,
        label: 'Bandeja de Radicados',
        labelFuncionario: 'Mis Radicados',
      },
    ] as NavItem[],
  },
  {
    title: 'Administración',
    items: [
      {
        to: '/admin/reportes',
        icon: <ChartBarIcon className="w-4.5 h-4.5" />,
        label: 'Reportes',
        adminOnly: true,
      },
      {
        to: '/admin/usuarios',
        icon: <UsersIcon className="w-4.5 h-4.5" />,
        label: 'Usuarios',
        adminOnly: true,
      },
      {
        to: '/admin/dependencias',
        icon: <BuildingOffice2Icon className="w-4.5 h-4.5" />,
        label: 'Dependencias',
        adminOnly: true,
      },
      {
        to: '/admin/tipos-correspondencia',
        icon: <DocumentTextIcon className="w-4.5 h-4.5" />,
        label: 'Tipos Correspondencia',
        adminOnly: true,
      },
      {
        to: '/admin/personal',
        icon: <UserGroupIcon className="w-4.5 h-4.5" />,
        label: 'Funcionarios',
        adminOnly: true,
      },
      {
        to: '/admin/ciudadanos',
        icon: <IdentificationIcon className="w-4.5 h-4.5" />,
        label: 'Ciudadanos',
        adminOnly: true,
      },
      {
        to: '/admin/empresas',
        icon: <BuildingOfficeIcon className="w-4.5 h-4.5" />,
        label: 'Empresas',
        adminOnly: true,
      },
      {
        to: '/admin/catalogos',
        icon: <Cog8ToothIcon className="w-4.5 h-4.5" />,
        label: 'Catálogos',
        adminOnly: true,
      },
    ] as NavItem[],
  },
]

const sidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit:   { x: -280, opacity: 0, transition: { duration: 0.2 } },
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role?.nombre === 'ADMIN'
  const isFuncionario = user?.role?.nombre === 'FUNCIONARIO'
  const location = useLocation()
  const avatarUrl = useAvatarUrl(user?.tiene_foto)

  return (
    <>
      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" role="navigation" aria-label="Menú principal">
        {NAV_SECTIONS.map(section => {
          const visibleItems = section.items
            .filter(item => !item.adminOnly || isAdmin)
            .filter(item => !isFuncionario || !item.ocultoParaFuncionario)
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title} className="mb-4">
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-blue-300/60 uppercase tracking-widest">
                {section.title}
              </p>
              {visibleItems.map(item => {
                // Evita que "/radicados" quede activo cuando la ruta real es una de sus sub-rutas propias (p.ej. "/radicados/nuevo")
                const hasSiblingSubroute = visibleItems.some(
                  other => other.to !== item.to && other.to.startsWith(`${item.to}/`),
                )
                const isActive = hasSiblingSubroute
                  ? location.pathname === item.to
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5',
                      isActive
                        ? 'bg-[#C8A800] text-white font-medium shadow-sm'
                        : 'text-blue-200/70 hover:text-white hover:bg-white/8',
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1">{isFuncionario && item.labelFuncionario ? item.labelFuncionario : item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-[#C8A800]/20 text-[#C8A800] px-1.5 py-0.5 rounded font-bold">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User info footer */}
      {user && (
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#C8A800] border border-[#C8A800]/50 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <p className="text-blue-300/60 text-[10px] truncate">{user.role?.nombre}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Panel estático de escritorio */}
      <aside className="hidden lg:flex fixed top-14 left-0 bottom-14 z-40 w-64 bg-[#0B1220] flex-col shadow-2xl">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Panel deslizante móvil */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop mobile */}
            <motion.div
              className="fixed inset-0 z-30 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Panel */}
            <motion.aside
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-14 left-0 bottom-14 z-40 w-64 bg-[#0B1220] flex flex-col shadow-2xl lg:hidden"
            >
              <SidebarContent onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
