import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMembership } from './useMembership';

/** Protects /members/* except the gate at /members. */
export default function RequireMember() {
  const { memberEmail, ready } = useMembership();
  const location = useLocation();

  if (!ready) {
    return (
      <main className="page">
        <p className="page-lede">Loading…</p>
      </main>
    );
  }

  if (!memberEmail) {
    return (
      <Navigate to="/members" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
