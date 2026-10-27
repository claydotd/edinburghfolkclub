import { type FormEvent, useState } from 'react'
import { isNewsDemo } from '../news/api'
import { subscribeToNewsletter } from '../newsletter/api'

export default function NewsletterSignup() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (String(data.get('bot-field') ?? '').trim()) {
      setSubmitted(true)
      return
    }
    const email = String(data.get('email') ?? '')
    const consent = data.get('consent') === 'on'
    setSubmitting(true)
    setError(null)
    try {
      await subscribeToNewsletter(email, consent)
      setSubmitted(true)
      form.reset()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="newsletter-signup">
      <section
        className="form-section"
        id="newsletter"
        aria-labelledby="newsletter-heading"
      >
        <h2 id="newsletter-heading">Join our mailing list</h2>
        <p className="form-intro">
          <em>Get the latest updates from EFC in your inbox.</em>
        </p>
        {isNewsDemo() ? (
          <p className="page-lede">
            Mailing list sign-up is available on the live site.
          </p>
        ) : (
          <form
            className="site-form site-form--compact"
            onSubmit={handleSubmit}
            noValidate={false}
          >
            <p className="form-honeypot" aria-hidden="true">
              <label>
                Don’t fill this out if you’re human:{' '}
                <input name="bot-field" tabIndex={-1} autoComplete="off" />
              </label>
            </p>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            {submitted ? (
              <p className="form-success" role="status">
                You’re on the list.
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
                <label className="consent-field">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    id="consent"
                    aria-describedby="consent-description"
                  />
                  <span>
                    I consent to receive email updates from Edinburgh Folk Club.
                  </span>
                </label>
                <p id="consent-description" className="consent-description">
                  We will only send you emails about upcoming gigs and other club
                  news. You can unsubscribe at any time.
                </p>
                <button
                  type="submit"
                  className="form-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Subscribing…' : 'Subscribe'}
                </button>
              </>
            )}
          </form>
        )}
      </section>
    </section>
  )
}
