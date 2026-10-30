import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  History,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Moon,
  Route,
  ShieldCheck,
  Sun,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const primaryLinks = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/predict', label: 'Predict traffic', icon: Activity },
  { to: '/app/map', label: 'Live network', icon: MapPinned },
  { to: '/app/history', label: 'History & analytics', icon: History },
  { to: '/app/routes', label: 'Route planner', icon: Route },
]

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="app-frame">
      {menuOpen && <button className="mobile-scrim" type="button" onClick={closeMenu} aria-label="Close navigation" />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-symbol"><Activity size={21} strokeWidth={2.2} /></div>
          <div><strong>Flowstate</strong><span>TRAFFIC INTELLIGENCE</span></div>
          <button type="button" className="icon-button sidebar-close" onClick={closeMenu} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="workspace-label">BENGALURU NETWORK</div>
        <nav className="side-nav" aria-label="Main navigation">
          <div className="nav-caption">WORKSPACE</div>
          {primaryLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={closeMenu} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Live network' && <span className="nav-live-dot" />}
            </NavLink>
          ))}
          {user?.role === 'admin' && <>
            <div className="nav-caption nav-caption-spaced">MANAGEMENT</div>
            <NavLink to="/app/admin" onClick={closeMenu} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <ShieldCheck size={18} strokeWidth={1.8} /><span>Admin console</span>
            </NavLink>
          </>}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-status"><span className="status-pulse" /><div><strong>Network active</strong><small>Data feed connected</small></div><ArrowUpRight size={15} /></div>
          <NavLink to="/app/profile" onClick={closeMenu} className={({ isActive }) => `profile-mini ${isActive ? 'profile-mini-active' : ''}`}>
            <span className="avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</span>
            <span className="profile-mini-copy"><strong>{user?.name || 'Traffic User'}</strong><small>{user?.role === 'admin' ? 'Administrator' : 'Network analyst'}</small></span>
            <UserRound size={16} />
          </NavLink>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="breadcrumbs"><span>Network</span><span className="crumb-slash">/</span><strong>{pageTitle(location.pathname)}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="topbar-live"><span className="status-pulse" /> Live data</span>
            <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle color theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="icon-button logout-button" onClick={handleLogout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="app-content"><Outlet /></main>
        <footer className="app-footer"><span><Zap size={13} /> Flowstate Traffic Intelligence</span><span>Indicative forecasts · Bengaluru</span></footer>
      </div>
    </div>
  )
}

function pageTitle(path) {
  if (path === '/app') return 'Overview'
  if (path.includes('/predict')) return 'Predict traffic'
  if (path.includes('/map')) return 'Live network'
  if (path.includes('/history')) return 'History & analytics'
  if (path.includes('/routes')) return 'Route planner'
  if (path.includes('/admin')) return 'Admin console'
  if (path.includes('/profile')) return 'Profile'
  return 'Traffic intelligence'
}