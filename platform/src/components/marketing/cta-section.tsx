import Link from 'next/link'

interface CtaSectionProps {
  heading?: string
  description?: string
}

export default function CtaSection({
  heading = 'Ready to dominate your market?',
  description = 'Apply for exclusive partnership — one partner per service per city. Tell us your trade and your metro area, and we will check availability.',
}: CtaSectionProps) {
  return (
    <section className="cta-section" aria-label="Call to action">
      <h2>{heading}</h2>
      <p>{description}</p>
      <div className="cta-buttons">
        <Link href="/waitlist" className="btn-white" style={{fontSize: '1.15rem', padding: '1rem 3rem'}}>Apply Now</Link>
      </div>
      <div className="cta-buttons" style={{marginTop: '1rem', gap: '1rem'}}>
        <a href="sms:+12122029220" className="btn-outline">Text Us</a>
        <a href="tel:+12122029220" className="btn-outline">Call Us</a>
        <a href="mailto:hello@homeservicesbusinesscrm.com" className="btn-outline">Email Us</a>
      </div>
    </section>
  )
}
