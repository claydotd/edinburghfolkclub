import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-left">
          <p>Edinburgh Folk Club © {new Date().getFullYear()}</p>
          <div className="social-links">
            <p className="social-links-text">Follow us on</p>
            <ul className="social-links-list">
              <li>
                <a href="https://www.facebook.com/edinburghfolkclub">
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/edinburghfolkclub">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
          <p className="footer-newsletter">
            <Link to="/contact#newsletter">Join the newsletter</Link>
          </p>
        </div>
        <div className="footer-right">
          <p className="footer-links">
            <Link to="/terms">Terms &amp; Conditions</Link>
          </p>
          <p>
            site built by{' '}
            <a href="https://analoguegonedigital.co.uk">
              analoguegonedigital.co.uk
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
