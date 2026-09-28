import { useEffect } from 'react';
import NetlifyForm from '../components/NetlifyForm';

export default function Contact() {
  useEffect(() => {
    if (window.location.hash === '#newsletter') {
      document.getElementById('newsletter')?.scrollIntoView({
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <main className="page contact-page">
      <header className="page-masthead">
        <h1 className="page-title">Contact</h1>
        <p className="page-lede">
          Get in touch with the club, or join the newsletter for what’s on.
        </p>
      </header>

      <section className="form-section" aria-labelledby="contact-heading">
        <h2 id="contact-heading">Send a message</h2>
        <NetlifyForm name="contact" className="site-form">
          {({ submitted, submitting }) =>
            submitted ? (
              <p className="form-success" role="status">
                Thanks — your message has been noted. (Prototype: nothing was
                sent yet.)
              </p>
            ) : (
              <>
                <label className="form-field">
                  <span>Name</span>
                  <input type="text" name="name" required autoComplete="name" />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                  />
                </label>
                <label className="form-field">
                  <span>Message</span>
                  <textarea name="message" rows={6} required />
                </label>
                <button
                  type="submit"
                  className="form-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
              </>
            )
          }
        </NetlifyForm>
      </section>

      <section
        className="form-section"
        id="newsletter"
        aria-labelledby="newsletter-heading"
      >
        <h2 id="newsletter-heading">Newsletter</h2>
        <p className="form-intro">
          Occasional updates about upcoming nights — no spam.
        </p>
        <NetlifyForm name="newsletter" className="site-form site-form--compact">
          {({ submitted, submitting }) =>
            submitted ? (
              <p className="form-success" role="status">
                You’re on the list. (Prototype: nothing was sent yet.)
              </p>
            ) : (
              <>
                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                  />
                </label>
                <button
                  type="submit"
                  className="form-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Subscribing…' : 'Subscribe'}
                </button>
              </>
            )
          }
        </NetlifyForm>
      </section>
    </main>
  );
}
