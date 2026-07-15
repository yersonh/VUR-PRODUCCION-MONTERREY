import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/auth/Login'
import CambiarPassword from '@/pages/auth/CambiarPassword'

const VerificarRespuesta = lazy(() => import('@/pages/VerificarRespuesta'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const RadicadoNuevo = lazy(() => import('@/pages/radicados/RadicadoNuevo'))
const RadicadoListado = lazy(() => import('@/pages/radicados/RadicadoListado'))
const RadicadoDetalle = lazy(() => import('@/pages/radicados/RadicadoDetalle'))

// Admin
const DependenciasAdmin = lazy(() => import('@/pages/admin/DependenciasAdmin'))
const TiposCorrespondenciaAdmin = lazy(() => import('@/pages/admin/TiposCorrespondenciaAdmin'))
const UsuariosAdmin = lazy(() => import('@/pages/admin/UsuariosAdmin'))
const PersonalAdmin = lazy(() => import('@/pages/admin/PersonalAdmin'))
const CiudadanosAdmin = lazy(() => import('@/pages/admin/CiudadanosAdmin'))
const EmpresasAdmin = lazy(() => import('@/pages/admin/EmpresasAdmin'))
const CatalogosAdmin = lazy(() => import('@/pages/admin/CatalogosAdmin'))
const ReportesAdmin = lazy(() => import('@/pages/admin/ReportesAdmin'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

// Bloquea el rol FUNCIONARIO (no radica entradas, solo responde lo que le
// asignan) — usada en /radicados/nuevo. ADMIN y OPERADOR pasan normal.
function NoFuncionarioRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />
  if (user?.role?.nombre === 'FUNCIONARIO') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />
  if (user?.role?.nombre !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Solo exige sesión iniciada — no redirige aunque debe_cambiar_password sea
// true, porque esta es precisamente la pantalla a la que las otras rutas
// protegidas redirigen mientras esa bandera siga activa.
function RequireAuthOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.debe_cambiar_password) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin text-[#C8A800]" fill="none" viewBox="0 0 24 24">
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
        {/* Pública de verdad: sin guard en ningún sentido — accesible con o
            sin sesión, no redirige nunca. Es lo que abre el QR estampado en
            el documento de respuesta (ver RadicadoService::adjuntarPdf en
            el backend), que cualquier remitente externo debe poder ver. */}
        <Route path="/verificar-respuesta" element={<VerificarRespuesta />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/cambiar-password"
          element={
            <RequireAuthOnly>
              <CambiarPassword />
            </RequireAuthOnly>
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
            <NoFuncionarioRoute>
              <RadicadoNuevo />
            </NoFuncionarioRoute>
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
          path="/admin/ciudadanos"
          element={<AdminRoute><CiudadanosAdmin /></AdminRoute>}
        />
        <Route
          path="/admin/empresas"
          element={<AdminRoute><EmpresasAdmin /></AdminRoute>}
        />
        <Route
          path="/admin/catalogos"
          element={<AdminRoute><CatalogosAdmin /></AdminRoute>}
        />
        <Route
          path="/admin/reportes"
          element={<AdminRoute><ReportesAdmin /></AdminRoute>}
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
