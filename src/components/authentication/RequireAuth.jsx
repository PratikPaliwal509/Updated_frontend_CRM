import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { cachedMe, loadMe } from '@/utils/authSession'

const hasToken = () => {
  try { return !!localStorage.getItem('token') } catch { return false }
}

/** Where a signed-in user must go instead of the staff app (null = stay). */
const redirectFor = (me, path) => {
  if (!me) return null
  if (me.user?.user_type === 'client') return '/portal'
  if (me.workspace?.is_owner && !me.workspace.onboarding_completed && path !== '/onboarding') return '/onboarding'
  return null
}

/**
 * Guards the staff application layouts. The API is the real security boundary;
 * this only keeps people on the right screen:
 *  - no token          -> login (with ?next=)
 *  - client account    -> client portal
 *  - owner, onboarding not finished -> onboarding wizard
 * Expired/revoked sessions are handled by the global auth interceptor.
 */
const RequireAuth = ({ children }) => {
  const location = useLocation()
  const [me, setMe] = useState(() => cachedMe())
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!hasToken()) return
    let alive = true
    loadMe().then((m) => { if (alive) setMe(m) }).catch(() => {}).finally(() => { if (alive) setChecked(true) })
    return () => { alive = false }
  }, [])

  if (!hasToken()) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/authentication/login${next && next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} replace />
  }
  const target = redirectFor(me, location.pathname)
  if (target) return <Navigate to={target} replace />
  // first visit without cached profile: wait for /auth/me before showing the app
  if (!me && !checked) return null
  return children
}

export default RequireAuth
