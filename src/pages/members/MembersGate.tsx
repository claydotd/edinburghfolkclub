import { type FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMembership } from '../../membership/useMembership';
import Reveal from '../../components/Reveal';

export default function MembersGate() {
  const { memberEmail, ready, signIn } = useMembership();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const from =
    (location.state as { from?: string } | null)?.from ?? '/members/documents';

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not open the members’ area',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Reveal variant="up" delay={100}>
    <main className="page members-gate">
      <header className="page-masthead">
        <h1 className="page-title">Members</h1>
        <p className="page-lede">
          Enter the email you use for club membership to open the members’
          area.
        </p>
      </header>
      <form className="site-form site-form--compact" onSubmit={handleSubmit}>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
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
        <button type="submit" className="form-submit" disabled={submitting}>
          {submitting ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </main>
    </Reveal>
  );
}
