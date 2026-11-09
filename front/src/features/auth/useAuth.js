import { useEffect, useRef, useState } from 'react'
import { accountRequest } from './authApi.js'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const sequence = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    const current = ++sequence.current
    accountRequest('me', { signal: controller.signal })
      .then((value) => {
        if (sequence.current === current) setUser(value)
      })
      .catch((failure) => {
        if (!controller.signal.aborted && sequence.current === current) setError(failure.message)
      })
      .finally(() => {
        if (sequence.current === current && !controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
  }, [])

  async function authenticate(email, password, signup) {
    ++sequence.current
    setError('')
    const credentials = { email, password }
    if (signup) await accountRequest('register', { credentials })
    const value = await accountRequest('login', { credentials })
    setUser(value)
  }

  async function logout() {
    ++sequence.current
    setBusy(true)
    setError('')
    try {
      await accountRequest('logout')
      setUser(null)
      return true
    } catch (failure) {
      setError(failure.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  return { user, busy, error, authenticate, logout }
}
