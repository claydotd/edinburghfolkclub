import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <p className="footer-copyright">
          Edinburgh Folk Club&nbsp;&copy;&nbsp;{year}
        </p>

        <nav className="footer-nav" aria-label="Footer">
          <a
            href="https://www.facebook.com/edinburghfolkclub"
            target="_blank"
            rel="noopener noreferrer"
          >
            Facebook
          </a>
          <a
            href="https://www.instagram.com/edinburghfolkclub"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
          <Link to="/contact#newsletter">Join the mailing list</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
        </nav>

        <p className="footer-credit">
          site built by{' '}
          <a
            href="https://analoguegonedigital.co.uk"
            target="_blank"
            rel="noopener noreferrer"
          >
            analoguegonedigital.co.uk
          </a>
        </p>
      </div>
    </footer>
  )
}
