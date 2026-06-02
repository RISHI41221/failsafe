import { createContext, useContext, useEffect, useState } from 'react'

const TOKEN_STORAGE_KEY = 'failsafe_token'
const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return typeof window !== 'undefined'
      ? window.localStorage.getItem(TOKEN_STORAGE_KEY)
      : null
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleStorageChange = () => {
      setToken(window.localStorage.getItem(TOKEN_STORAGE_KEY))
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const login = (accessToken) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
    }
    setToken(accessToken)
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: Boolean(token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
