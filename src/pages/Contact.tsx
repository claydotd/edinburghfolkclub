import NetlifyForm from '../components/NetlifyForm';
import NewsletterSignup from '../components/NewsletterSignup';
import Reveal from '../components/Reveal';
import { Link } from 'react-router-dom';
import { publicUrl } from '../utils/publicUrl';

export default function Contact() {
  return (
    <main className="page contact-page">
      <Reveal variant="up" delay={40}>
        <header className="page-masthead">
          <h1 className="page-title">Contact</h1>
          <p className="page-lede">
            Get in touch with the club, or join the newsletter for what’s on.
          </p>
          <p>
            Interested in playing at Edinburgh Folk Club? Find out more by clicking the button below.
          </p>
          <Link to="/contact/play-at-efc" className="button button">Play at Edinburgh Folk Club</Link>
        </header>
      </Reveal>

      <div className="contact-forms">
        <Reveal variant="left" delay={120}>
          <section className="form-section" aria-labelledby="contact-heading">
            <h2 id="contact-heading">Send a message</h2>
            <NetlifyForm name="contact" className="site-form">
              {({ submitted, submitting }) =>
                submitted ? (
                  <p className="form-success" role="status">
                    Thanks you, your message has been sent.
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
        </Reveal>

        <Reveal variant="right" delay={200}>
          <NewsletterSignup />
        </Reveal>
      </div>

      <Reveal variant="fade" delay={280}>
        <section id="location" aria-labelledby="location-heading" className="contact-map">
          <h2 id="location-heading">Location</h2>
          <span className="location-link"><p>what3words: <a href="https://w3w.co/zealous.cure.blues" target="_blank" rel="noopener noreferrer">///zealous.cure.blues</a></p></span>
          <img src={publicUrl('/images/efcmap.png')} alt="Edinburgh Folk Club" className="contact-map-image" />
        </section>
        <section className="contact-bottom">
          <img src={publicUrl('/images/efc-crowd.webp')} alt="Edinburgh Folk Club" className="contact-bottom-image" />
        </section>
      </Reveal>
    </main>
  );
}
