  import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.get('/api/auth/user')
      .then(res => setUser(res.data.data))
      .catch(err => {
        if (err.response?.status === 401) {
          setUser(null)   // not logged in — expected
        } else {
          setError(err)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function updateUser(updated) {
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
