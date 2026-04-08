import { useState, useEffect } from 'react'
import api from '../api/axios'

/**
 * Returns { user, loading, error }
 * user is null if not logged in
 */
export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
     api.get('/api/auth/user')
      .then(res => setUser(res.data.data))
      .catch(err => {
        if (err.response?.status === 401) {
          setUser(null)   // not logged in — normal case
        } else {
          setError(err)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  return { user, loading, error }
}