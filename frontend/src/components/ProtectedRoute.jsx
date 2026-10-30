import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from './UI'

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <LoadingScreen label="Checking your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/app" replace />
  return <Outlet />
}