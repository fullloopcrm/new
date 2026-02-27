import type { Metadata } from 'next'
import Link from 'next/link'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'Contact Full Loop CRM — Apply for Exclusive Partnership',
  description: 'Contact Full Loop CRM: call (212) 202-9220, text us, or email hello@fullloopcrm.com. Apply for exclusive territory partnership for your home service business. Located in New York, NY.',
  keywords: ['contact Full Loop CRM', 'Full Loop CRM phone number', 'home service CRM partnership', 'apply for CRM partnership', 'Full Loop CRM email'],
  openGraph: {
    title: 'Contact Full Loop CRM — Apply for Exclusive Partnership',
    description: 'Call, text, or email us. Apply for exclusive territory partnership for your home service business.',
    url: 'https://fullloopcrm.com/contact',
    siteName: 'Full Loop CRM',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Full Loop CRM — Apply for Exclusive Partnership',
    description: 'Call, text, or email us. Apply for exclusive territory partnership for your home service business.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com/contact',
  },
}

export default function ContactPage() {
  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPoint',
    telephone: '+12122029220',
    email: 'hello@fullloopcrm.com',
    contactType: 'sales',
    areaServed: 'US',
    availableLanguage: ['English', 'Spanish'],
  }

  const addressSchema = {
    '@context': 'https://schema.org',
    '@type': 'PostalAddress',
    streetAddress: '150 W 47th St',
    addressLocality: 'New York',
    addressRegion: 'NY',
    postalCode: '10036',
    addressCountry: 'US',
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'Contact', item: 'https://fullloopcrm.com/contact' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(addressSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label="Contact introduction">
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem'}}>Get in Touch</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>Ready to lock your exclusive territory? Have questions about the platform? Reach out — we respond to every message personally.</p>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Contact information">
        <div className="section-container">
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto'}}>
            <div className="feature-card" style={{textAlign: 'center'}}>
              <div className="feature-icon blue-icon" style={{margin: '0 auto 1rem'}}>&#128222;</div>
              <h2 style={{fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem'}}>Call Us</h2>
              <a href="tel:+12122029220" style={{fontSize: '1.3rem', fontWeight: 700, color: 'var(--blue)', textDecoration: 'none'}}>(212) 202-9220</a>
              <p style={{color: 'var(--gray-500)', fontSize: '0.9rem', marginTop: '0.5rem'}}>Mon–Fri, 9am–6pm ET</p>
            </div>
            <div className="feature-card" style={{textAlign: 'center'}}>
              <div className="feature-icon green-icon" style={{margin: '0 auto 1rem'}}>&#128172;</div>
              <h2 style={{fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem'}}>Text Us</h2>
              <a href="sms:+12122029220" style={{fontSize: '1.3rem', fontWeight: 700, color: 'var(--green)', textDecoration: 'none'}}>(212) 202-9220</a>
              <p style={{color: 'var(--gray-500)', fontSize: '0.9rem', marginTop: '0.5rem'}}>Fastest response — 24/7</p>
            </div>
            <div className="feature-card" style={{textAlign: 'center'}}>
              <div className="feature-icon purple-icon" style={{margin: '0 auto 1rem'}}>&#9993;</div>
              <h2 style={{fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem'}}>Email Us</h2>
              <a href="mailto:hello@fullloopcrm.com" style={{fontSize: '1.1rem', fontWeight: 700, color: 'var(--purple)', textDecoration: 'none'}}>hello@fullloopcrm.com</a>
              <p style={{color: 'var(--gray-500)', fontSize: '0.9rem', marginTop: '0.5rem'}}>We reply within 24 hours</p>
            </div>
          </div>
        </div>
      </section>

      <section className="alt-bg" style={{padding: '6rem 2rem'}} aria-label="Office location">
        <div className="section-container" style={{maxWidth: '600px', textAlign: 'center'}}>
          <h2 style={{fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem'}}>Our Office</h2>
          <address style={{fontStyle: 'normal'}}>
            <a href="https://maps.google.com/?q=150+W+47th+St+New+York+NY+10036" target="_blank" rel="noopener noreferrer" style={{fontSize: '1.15rem', color: 'var(--gray-700)', textDecoration: 'none', lineHeight: 1.8}}>
              150 W 47th St<br />New York, NY 10036
            </a>
          </address>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Partnership application">
        <div className="section-container" style={{maxWidth: '700px', textAlign: 'center'}}>
          <h2 style={{fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem'}}>Apply for Partnership</h2>
          <p style={{color: 'var(--gray-600)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem'}}>Tell us your trade, your city, and a little about your business. We&apos;ll check territory availability and walk you through the platform if your market is open.</p>
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Link href="/crm-partnership-request-form" className="btn-primary" style={{fontSize: '1.1rem', padding: '1rem 2.5rem'}}>Apply Now</Link>
            <Link href="/feedback" className="btn-secondary">Give Feedback</Link>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
