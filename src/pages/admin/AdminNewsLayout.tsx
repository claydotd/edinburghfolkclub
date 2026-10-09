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
      <div className="admin-shell-bar">
        <p className="admin-shell-label">EFC Admin</p>
        <button type="button" className="admin-sign-out" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      <nav className="admin-nav" aria-label="Site admin">
        <NavLink to="/admin/list" end>
          All posts
        </NavLink>
        <NavLink to="/admin/new">New post</NavLink>
        <NavLink to="/admin/banner">Homepage banner</NavLink>
        <Link to="/news" target="_blank" rel="noreferrer">
          View site
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}
