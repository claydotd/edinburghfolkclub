import { type FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMembership } from '../../membership/useMembership';

export default function MembersGate() {
  const { memberEmail, ready, signIn } = useMembership();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const from =
    (location.state as { from?: string } | null)?.from ?? '/members/account';

  if (!ready) {
    return (
      <main className="page">
        <p className="page-lede">Loading…</p>
      </main>
    );
  }

  if (memberEmail) {
    return <Navigate to={from} replace />;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    signIn(email);
  }

  return (
    <main className="page members-gate">
      <header className="page-masthead">
        <h1 className="page-title">Members</h1>
        <p className="page-lede">
          Enter the email you use for club membership to open the members’
          area.
        </p>
      </header>
      <form className="site-form site-form--compact" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" className="form-submit">
          Continue
        </button>
      </form>
      <p className="form-note">
        Prototype: any email works. Real membership checks arrive with the
        Netlify backend.
      </p>
    </main>
  );
}
