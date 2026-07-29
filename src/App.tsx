import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ScreenWrapper } from './components/layout/ScreenWrapper'
import { Auth } from './pages/Auth'
import { Onboarding } from './pages/Onboarding'
import { CompanionSetup } from './pages/CompanionSetup'
import { Dashboard } from './pages/Dashboard'
import { Workout } from './pages/Workout'
import { ActiveWorkout } from './pages/ActiveWorkout'
import { Meals } from './pages/Meals'
import { Katamad } from './pages/Katamad'
import { Ako } from './pages/Ako'
import { Progress } from './pages/Progress'
import { AUTH_BYPASS } from './lib/demoMode'
import { isCompanionReady } from './lib/store'

function ProtectedRoutes() {
  const { session, profile, loading, bypass } = useAuth()
  const location = useLocation()
  const hideNav = location.pathname.includes('/active') || location.pathname === '/setup'

  if (loading) {
    return (
      <div className="min-h-screen bg-dirty flex items-center justify-center font-display text-2xl">
        G!
      </div>
    )
  }

  if (!bypass && !session) return <Navigate to="/auth" replace />
  if (!bypass && !profile?.coaching_style) return <Navigate to="/onboarding" replace />

  const ready = isCompanionReady()
  if (
    !ready &&
    location.pathname !== '/setup' &&
    location.pathname !== '/ako' &&
    location.pathname !== '/' &&
    !location.pathname.startsWith('/onboarding')
  ) {
    return <Navigate to="/" replace />
  }

  return (
    <Routes>
      <Route element={<ScreenWrapper hideNav={hideNav} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<CompanionSetup />} />
        <Route path="/bakal" element={<Workout />} />
        <Route path="/bakal/active" element={<ActiveWorkout />} />
        <Route path="/workout" element={<Navigate to="/bakal" replace />} />
        <Route path="/workout/active" element={<Navigate to="/bakal/active" replace />} />
        <Route path="/lamon" element={<Meals />} />
        <Route path="/meals" element={<Navigate to="/lamon" replace />} />
        <Route path="/katamad" element={<Katamad />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/ako" element={<Ako />} />
        <Route path="/settings" element={<Navigate to="/ako" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PublicRoutes() {
  const { session, profile, loading, bypass } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-dirty flex items-center justify-center font-display text-2xl">
        G!
      </div>
    )
  }
  if (bypass || (session && profile?.coaching_style)) return <Navigate to="/" replace />
  if (session && !profile?.coaching_style) return <Navigate to="/onboarding" replace />
  return <Auth />
}

function OnboardingGate() {
  const { session, profile, loading, bypass } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-dirty flex items-center justify-center font-display text-2xl">
        G!
      </div>
    )
  }
  if (bypass) return <Navigate to="/setup" replace />
  if (!session) return <Navigate to="/auth" replace />
  if (profile?.coaching_style) {
    return <Navigate to={isCompanionReady() ? '/' : '/setup'} replace />
  }
  return <Onboarding />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route
            path="/auth"
            element={AUTH_BYPASS ? <Navigate to="/" replace /> : <PublicRoutes />}
          />
          <Route path="/onboarding" element={<OnboardingGate />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
