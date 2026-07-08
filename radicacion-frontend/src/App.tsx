import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/auth/Login'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const RadicadoNuevo = lazy(() => import('@/pages/radicados/RadicadoNuevo'))
const RadicadoListado = lazy(() => import('@/pages/radicados/RadicadoListado'))
const RadicadoDetalle = lazy(() => import('@/pages/radicados/RadicadoDetalle'))

// Admin
const DependenciasAdmin = lazy(() => import('@/pages/admin/DependenciasAdmin'))
const TiposCorrespondenciaAdmin = lazy(() => import('@/pages/admin/TiposCorrespondenciaAdmin'))
const UsuariosAdmin = lazy(() => import('@/pages/admin/UsuariosAdmin'))
const PersonalAdmin = lazy(() => import('@/pages/admin/PersonalAdmin'))
const CatalogosAdmin = lazy(() => import('@/pages/admin/CatalogosAdmin'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role?.nombre !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin text-[#2B5BA8]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-slate-500">Cargando módulo...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/radicados/nuevo"
          element={
            <ProtectedRoute>
              <RadicadoNuevo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/radicados"
          element={
            <ProtectedRoute>
              <RadicadoListado />
            </ProtectedRoute>
          }
        />
        <Route
          path="/radicados/:id"
          element={
            <ProtectedRoute>
              <RadicadoDetalle />
            </ProtectedRoute>
          }
        />
        {/* Rutas Admin */}
        <Route
          path="/admin/dependencias"
          element={<AdminRoute><DependenciasAdmin /></AdminRoute>}
        />
        <Route
          path="/admin/tipos-correspondencia"
          element={<AdminRoute><TiposCorrespondenciaAdmin /></AdminRoute>}
        />
        <Route
          path="/admin/usuarios"
          element={<AdminRoute><UsuariosAdmin /></AdminRoute>}
        />
        <Route
          path="/admin/personal"
          element={<AdminRoute><PersonalAdmin /></AdminRoute>}
        />
        <Route
          path="/admin/catalogos"
          element={<AdminRoute><CatalogosAdmin /></AdminRoute>}
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
