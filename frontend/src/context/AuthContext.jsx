import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getToken, request, setToken } from '../Api.jsx'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false) // false until we know if the saved token is valid

  // On page load: if a token is saved, ask the backend who it belongs to
  useEffect(() => {
    if (!getToken()) { setReady(true); return }
    request('account/me/')
      .then(setUser)
      .catch((e) => { if (e.status === 401) setToken(null) }) // bad/expired token -> signed out
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async ({ email, password, remember }) => {
    const data = await request('account/login/', { method: 'POST', body: { email, password }, auth: false })
    setToken(data.token, remember)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async ({ full_name, email, password }) => {
    const data = await request('account/register/', { method: 'POST', body: { full_name, email, password }, auth: false })
    setToken(data.token, true)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try { await request('account/logout/', { method: 'POST' }) } catch { /* token already invalid */ }
    setToken(null)
    setUser(null)
  }, [])

  // Used after password change (backend issues a fresh token) or profile edits
  const replaceSession = useCallback((token, nextUser) => {
    let remembered = true
    try { remembered = !!localStorage.getItem('heem_token') } catch { /* keep default */ }
    setToken(token, remembered)
    setUser(nextUser)
  }, [])

  const value = useMemo(
    () => ({ user, setUser, ready, login, register, logout, replaceSession }),
    [user, ready, login, register, logout, replaceSession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}