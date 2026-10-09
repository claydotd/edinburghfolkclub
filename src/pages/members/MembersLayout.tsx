import { NavLink, Outlet } from 'react-router-dom';
import { useMembership } from '../../membership/useMembership';
import Reveal from '../../components/Reveal';

export default function MembersLayout() {
  const { memberEmail, signOut } = useMembership();

  return (
    <Reveal variant="zoom" delay={100}>
    <div className="members-shell">
      <div className="members-shell-bar">
        <p className="members-shell-email">
          Signed in as <strong>{memberEmail}</strong>
        </p>
        <button type="button" className="members-sign-out" onClick={signOut}>
          Sign out
        </button>
      </div>
      <nav className="members-nav" aria-label="Members">
        <NavLink to="/members/account">Account</NavLink>
        <NavLink to="/members/documents">Documents</NavLink>
        <NavLink to="/members/tickets">Tickets</NavLink>
      </nav>
      <Outlet />
    </div>
    </Reveal>
  );
}
