import NetlifyForm from './NetlifyForm';

export default function NewsletterSignup() {
  return (
    <section className="newsletter-signup">
    <section
      className="form-section"
      id="newsletter"
      aria-labelledby="newsletter-heading"
    >
      <h2 id="newsletter-heading">Join our mailing list</h2>
      <p className="form-intro">
        Get the latest news and updates about upcoming gigs.
      </p>
      <NetlifyForm name="newsletter" className="site-form site-form--compact">
        {({ submitted, submitting }) =>
          submitted ? (
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
                <input type="checkbox" name="consent" required id="consent" aria-describedby="consent-description" />
                <span>I consent to receive email updates from Edinburgh Folk Club.</span>
              </label>
              <p id="consent-description" className="consent-description">
                We will only send you emails about upcoming gigs and other club news. You can unsubscribe at any time.
              </p>
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
    </section>
  );
}
