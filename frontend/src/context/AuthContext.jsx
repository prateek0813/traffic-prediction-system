import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  async function refreshUser() {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data)
      return data
    } catch {
      setUser(null)
      return null
    } finally {
      setReady(true)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  async function login(email, password) {
    await api.post('/api/auth/login', { email, password })
    return refreshUser()
  }

  async function register(name, email, password) {
    await api.post('/api/auth/register', { name, email, password })
    return login(email, password)
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}