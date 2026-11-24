import { createContext, useContext, useState } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => localStorage.getItem('gemini_username') || null)
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('gemini_is_admin') === 'true')

  async function register(username, password) {
    const data = await api.register(username, password)
    localStorage.setItem('gemini_token', data.token)
    localStorage.setItem('gemini_username', data.username)
    localStorage.setItem('gemini_is_admin', String(!!data.isAdmin))
    setUser(data.username)
    setIsAdmin(!!data.isAdmin)
  }

  async function login(username, password) {
    const data = await api.login(username, password)
    localStorage.setItem('gemini_token', data.token)
    localStorage.setItem('gemini_username', data.username)
    localStorage.setItem('gemini_is_admin', String(!!data.isAdmin))
    setUser(data.username)
    setIsAdmin(!!data.isAdmin)
  }

  async function googleLogin(credential) {
    const data = await api.googleLogin(credential)
    localStorage.setItem('gemini_token', data.token)
    localStorage.setItem('gemini_username', data.username)
    localStorage.setItem('gemini_is_admin', String(!!data.isAdmin))
    setUser(data.username)
    setIsAdmin(!!data.isAdmin)
    return data
  }

  function logout() {
    localStorage.removeItem('gemini_token')
    localStorage.removeItem('gemini_username')
    localStorage.removeItem('gemini_is_admin')
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, register, login, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
