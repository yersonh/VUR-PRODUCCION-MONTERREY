import { Link } from 'react-router-dom'
import { InboxArrowDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/store/authStore'
import { AlcaldiaLogo } from '@/components/ui/AlcaldiaLogo'

export default function Dashboard() {
  const user = useAuthStore(s => s.user)
  const esFuncionario = user?.role?.nombre === 'FUNCIONARIO'

  return (
    <AppLayout subtitle="Panel Principal">
      <div className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full space-y-6">

        {/* Bienvenida */}
        <div className="bg-gradient-to-r from-[#0B1220] to-[#C8A800] rounded-2xl p-6 text-white flex items-center gap-5">
          <AlcaldiaLogo size="lg" />
          <div>
            <h1 className="text-xl font-bold">Bienvenido, {user?.name}</h1>
            <p className="text-blue-200 text-sm mt-1">Sistema de Radicación de Correspondencia · Alcaldía de Monterrey</p>
            {esFuncionario && (user?.dependencia || user?.cargo) && (
              <p className="text-blue-100/90 text-xs mt-1">
                {[user?.cargo, user?.dependencia?.descripcion].filter(Boolean).join(' · ')}
              </p>
            )}
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 text-white text-xs rounded-full font-medium">
              {user?.role?.nombre}
            </span>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!esFuncionario && (
            <Link
              to="/radicados/nuevo"
              className="flex items-center gap-4 p-5 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#C8A800]/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                <InboxArrowDownIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Nueva Radicación</p>
                <p className="text-xs text-slate-500 mt-0.5">Ingresar correspondencia recibida</p>
              </div>
            </Link>
          )}

          <Link
            to="/radicados"
            className="flex items-center gap-4 p-5 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#C8A800]/40 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
              <MagnifyingGlassIcon className="w-6 h-6 text-[#C8A800]" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{esFuncionario ? 'Mis Radicados' : 'Consultar Radicados'}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {esFuncionario ? 'Radicados asignados a ti, pendientes de respuesta' : 'Buscar y gestionar correspondencia'}
              </p>
            </div>
          </Link>
        </div>

      </div>
    </AppLayout>
  )
}
