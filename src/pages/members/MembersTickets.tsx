import { type FormEvent, useState } from 'react';

/**
 * Layout-only reservation UI.
 * TODO(Phase 2): wire booking flow once ticket reservation approach is decided.
 */
export default function MembersTickets() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="page members-tickets">
      <header className="page-masthead">
        <h1 className="page-title">Members’ tickets</h1>
        <p className="page-lede">
          Reserve members’-price tickets for an upcoming night.
        </p>
      </header>

      {submitted ? (
        <p className="form-success" role="status">
          Reservation noted in the prototype. Live booking will be connected
          later.
        </p>
      ) : (
        <form className="site-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Gig</span>
            <select name="gig" required defaultValue="">
              <option value="" disabled>
                Select a night…
              </option>
              <option value="2026-09-30">Àirdan — 30 Sep 2026</option>
              <option value="2026-10-04">Alan Reid & Christine Kydd — 4 Oct 2026</option>
              <option value="2026-10-28">Iona Fyfe — 28 Oct 2026</option>
            </select>
          </label>
          <label className="form-field">
            <span>Number of tickets</span>
            <input
              type="number"
              name="quantity"
              min={1}
              max={4}
              defaultValue={1}
              required
            />
          </label>
          <button type="submit" className="form-submit">
            Request reservation
          </button>
        </form>
      )}
    </main>
  );
}
