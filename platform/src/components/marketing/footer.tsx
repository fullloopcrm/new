import Link from 'next/link'

export default function Footer() {
  return (
    <footer aria-label="Site footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <h3>Full<span>Loop</span> CRM</h3>
            <p>The first full-cycle CRM for home service businesses. From lead generation to five-star reviews — one platform, zero gaps.</p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/businesses">Businesses</Link>
            <Link href="/locations">Locations</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/crm-partnership-request-form">Apply for Partnership</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/feedback">Feedback</Link>
            <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer">Built by Consortium NYC</a>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a href="sms:+12122029220">Text Us: (212) 202-9220</a>
            <a href="tel:+12122029220">Call Us: (212) 202-9220</a>
            <a href="mailto:hello@fullloopcrm.com">hello@fullloopcrm.com</a>
            <address>
              <a href="https://maps.google.com/?q=150+W+47th+St+New+York+NY+10036" style={{marginTop: '0.5rem', lineHeight: '1.5'}}>150 W 47th St<br />New York, NY 10036</a>
            </address>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 Full Loop CRM. All rights reserved.</span>
          <span>Built by <a href="https://www.consortiumnyc.com" style={{color: 'var(--blue)', textDecoration: 'none'}} target="_blank" rel="noopener noreferrer">Consortium NYC</a></span>
        </div>
      </div>
    </footer>
  )
}
