import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import LandingPage from './pages/LandingPage'
import LiveMapPage from './pages/LiveMapPage'
import NotFoundPage from './pages/NotFoundPage'
import PredictPage from './pages/PredictPage'
import ProfilePage from './pages/ProfilePage'
import RoutesPage from './pages/RoutesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="predict" element={<PredictPage />} />
          <Route path="map" element={<LiveMapPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}