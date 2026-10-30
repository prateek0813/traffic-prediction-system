import { useState } from 'react'
import { ArrowLeft, ArrowRight, Waves } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../lib/api'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, ready, login, register } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  if (ready && user) return <Navigate to="/app" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password.length > 72) {
      setError('Password must be 72 characters or fewer.')
      return
    }
    setSubmitting(true)
    try {
      if (isRegister) await register(name.trim(), email.trim(), password)
      else await login(email.trim(), password)
      notify(isRegister ? 'Your account is ready.' : 'Welcome back.')
      navigate(location.state?.from?.pathname || '/app', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to authenticate. Check your connection and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Link className="auth-brand" to="/"><span className="brand-symbol"><Waves size={19} /></span><span>FLOWSTATE</span></Link>
        <div className="auth-aside-copy">
          <div className="eyebrow">BENGALURU TRAFFIC INTELLIGENCE</div>
          <h1>Read the road<br />before it changes.</h1>
          <p>One workspace for live network conditions, congestion forecasts and traffic history.</p>
        </div>
        <div className="auth-aside-foot">Indicative traffic estimates · Bengaluru, India</div>
      </aside>
      <main className="auth-main">
        <div className="auth-form-wrap">
          <Link className="back-home" to="/"><ArrowLeft size={14} /> Back to overview</Link>
          <div className="eyebrow">{isRegister ? 'GET STARTED' : 'YOUR WORKSPACE'}</div>
          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p>{isRegister ? 'Set up an account to save forecasts and review traffic history.' : 'Sign in to continue to your traffic workspace.'}</p>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister && <div className="field"><label htmlFor="name">Full name</label><input id="name" className="input" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></div>}
            <div className="field"><label htmlFor="email">Email address</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" className="input" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />{isRegister && <div className="field-hint">Use 8 to 72 characters.</div>}</div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="button button-primary button-block auth-submit" disabled={submitting}>
              {submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Flowstate?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></div>
        </div>
      </main>
    </div>
  )
}