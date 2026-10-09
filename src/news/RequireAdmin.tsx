import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { adminMe } from './api'

export default function RequireAdmin() {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    adminMe()
      .then((authed) => {
        if (!cancelled) {
          setOk(authed)
          setReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOk(false)
          setReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (!ready) {
    return (
      <main className="page admin-page admin-gate">
        <p className="admin-loading">Checking session…</p>
      </main>
    )
  }

  if (!ok) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
