import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon, InboxArrowDownIcon, MagnifyingGlassIcon,
  UsersIcon, BuildingOffice2Icon, DocumentTextIcon,
  UserGroupIcon, Cog8ToothIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

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
        badge: '2.1',
      },
      {
        to: '/radicados',
        icon: <MagnifyingGlassIcon className="w-4.5 h-4.5" />,
        label: 'Consultar Radicados',
      },
    ] as NavItem[],
  },
  {
    title: 'Administración',
    items: [
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
        label: 'Personal',
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

export function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role?.nombre === 'ADMIN'

  return (
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
            className="fixed top-14 left-0 bottom-14 z-40 w-64 bg-[#0f2348] flex flex-col shadow-2xl"
          >
            {/* Navegación */}
            <nav className="flex-1 overflow-y-auto py-3 px-2" role="navigation" aria-label="Menú principal">
              {NAV_SECTIONS.map(section => {
                const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin)
                if (visibleItems.length === 0) return null

                return (
                  <div key={section.title} className="mb-4">
                    <p className="px-3 mb-1.5 text-[10px] font-semibold text-blue-300/60 uppercase tracking-widest">
                      {section.title}
                    </p>
                    {visibleItems.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5',
                            isActive
                              ? 'bg-[#2B5BA8] text-white font-medium shadow-sm'
                              : 'text-blue-200/70 hover:text-white hover:bg-white/8',
                          )
                        }
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] bg-[#C8A800]/20 text-[#C8A800] px-1.5 py-0.5 rounded font-bold">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )
              })}
            </nav>

            {/* User info footer */}
            {user && (
              <div className="px-4 py-3 border-t border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#2B5BA8] border border-[#C8A800]/50 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{user.name}</p>
                    <p className="text-blue-300/60 text-[10px] truncate">{user.role?.nombre}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
