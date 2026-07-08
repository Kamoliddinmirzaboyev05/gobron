import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { setSessionExpiredHandler } from './api/client'
import SplashScreen from './pages/SplashScreen'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomeShell from './pages/HomeShell'
import FieldFormPage from './pages/FieldFormPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)
  if (status === 'loading') return <SplashScreen />
  if (status === 'unauthenticated') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  const logout = useAuthStore((s) => s.logout)
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    setSessionExpiredHandler(() => logout())
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show splash while we're checking auth
  if (status === 'loading') return <SplashScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            status === 'authenticated'
              ? <Navigate to="/home" replace />
              : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            status === 'authenticated'
              ? <Navigate to="/home" replace />
              : <RegisterPage />
          }
        />
        <Route
          path="/home/*"
          element={
            <RequireAuth>
              <HomeShell />
            </RequireAuth>
          }
        />
        <Route
          path="/fields/new"
          element={
            <RequireAuth>
              <FieldFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="/fields/edit/:id"
          element={
            <RequireAuth>
              <FieldFormPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
