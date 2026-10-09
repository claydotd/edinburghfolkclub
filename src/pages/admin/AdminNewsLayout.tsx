import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminLogout } from '../../news/api'

export default function AdminNewsLayout() {
  const navigate = useNavigate()

  async function onSignOut() {
    try {
      await adminLogout()
    } finally {
      navigate('/admin', { replace: true })
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-shell-header">
        <div className="admin-shell-brand">
          <p className="admin-shell-mark">Edinburgh Folk Club</p>
          <p className="admin-shell-label">Site Admin</p>
        </div>
        <div className="admin-shell-tools">
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="admin-shell-link"
          >
            View site
          </Link>
          <button type="button" className="admin-sign-out" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="admin-nav" aria-label="Site admin">
        <NavLink to="/admin/list" end>
          All posts
        </NavLink>
        <NavLink to="/admin/new">New post</NavLink>
        <NavLink to="/admin/banner">Homepage banner</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
