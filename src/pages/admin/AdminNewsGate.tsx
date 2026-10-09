import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { adminLogin, adminMe, isNewsDemo } from '../../news/api'


export default function AdminNewsGate() {
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from || '/admin/list'

  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    adminMe()
      .then((ok) => {
        if (!cancelled) {
          setAuthed(ok)
          setChecking(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthed(false)
          setChecking(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await adminLogin(password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <main className="page admin-page">
        <p className="page-lede">Loading…</p>
      </main>
    )
  }

  if (authed) {
    return <Navigate to={from} replace />
  }

  return (
    <main className="page admin-page">
      <header className="page-masthead">
        <h1 className="page-title">Admin</h1>
        <p className="page-lede">Sign in to manage news and the homepage banner.</p>
      </header>
      <form className="site-form site-form--compact" onSubmit={onSubmit}>
        <label className="form-field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="form-note news-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="form-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {isNewsDemo() ? (
        <p className="form-note">
          Prototype (GitHub Pages): password is <code>admin</code>. Changes stay
          in this browser only.
        </p>
      ) : null}
    </main>
  )
}
