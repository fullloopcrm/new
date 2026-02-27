import type { Metadata } from 'next'
import Link from 'next/link'
import { getCitiesByState } from '@/lib/marketing/locations'
import { services } from '@/lib/marketing/services'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'Available Markets — Full Loop CRM | 360+ US Cities',
  description: 'Full Loop CRM is available in 360+ US metropolitan areas. Check territory availability for your trade in your city. One exclusive partner per trade per metro — first come, first serve.',
  keywords: ['Full Loop CRM locations', 'home service CRM cities', 'CRM territory availability', 'home service CRM near me', 'exclusive territory CRM markets'],
  openGraph: {
    title: 'Available Markets — Full Loop CRM | 360+ US Cities',
    description: 'Check territory availability in 360+ US cities. One exclusive partner per trade per metro.',
    url: 'https://fullloopcrm.com/locations',
    siteName: 'Full Loop CRM',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Available Markets — Full Loop CRM | 360+ US Cities',
    description: 'Check territory availability in 360+ US cities. One exclusive partner per trade per metro.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com/locations',
  },
}

export default function LocationsPage() {
  const citiesByState = getCitiesByState()
  const states = Object.keys(citiesByState).sort()

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Full Loop CRM',
    url: 'https://fullloopcrm.com',
    telephone: '+12122029220',
    email: 'hello@fullloopcrm.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '150 W 47th St',
      addressLocality: 'New York',
      addressRegion: 'NY',
      postalCode: '10036',
      addressCountry: 'US',
    },
    areaServed: states.map((state) => ({
      '@type': 'State',
      name: state,
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'Locations', item: 'https://fullloopcrm.com/locations' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label="Locations introduction">
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem'}}>Available in 360+ US Metropolitan Areas</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>Full Loop CRM operates on an exclusive territory model — one partner per trade per metro area. Check if your city is available and lock your market before a competitor does.</p>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Territory exclusivity explanation">
        <div className="section-container" style={{maxWidth: '900px'}}>
          <div className="section-header">
            <h2>How Territory Exclusivity Works</h2>
            <p>Your metro area. Your trade. Nobody else gets it.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem'}}>
            <div className="feature-card">
              <div className="feature-icon blue-icon">&#127961;</div>
              <h3>Metro-Level Lock</h3>
              <p>A territory is defined as a mid-to-large US metropolitan area and its surrounding neighborhoods. When you lock your trade in your metro, no other business in your industry can access Full Loop CRM in that market.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon green-icon">&#128274;</div>
              <h3>First Come, First Serve</h3>
              <p>Territory availability is checked in real time. Once a partner locks a trade in a metro area, it is permanently reserved. There is no waiting list — if your market is open, act now.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon purple-icon">&#127760;</div>
              <h3>Your Domains, Your Leads</h3>
              <p>Your neighborhood-specific website network generates organic leads exclusively for you. No shared leads, no competing for the same traffic. Your domains rank, your phone rings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="alt-bg" style={{padding: '6rem 2rem'}} aria-label="Cities directory organized by state">
        <div className="section-container">
          <div className="section-header">
            <h2>Browse by State</h2>
            <p>Click any city to see available trades and service opportunities in that market.</p>
          </div>
          {states.map((state) => (
            <div key={state} style={{marginBottom: '2.5rem'}}>
              <h3 style={{fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--gray-200)'}}>{state}</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem'}}>
                {citiesByState[state].map((city) => (
                  <Link
                    key={city.slug}
                    href={`/locations/${city.slug}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.7rem 1rem',
                      background: 'var(--white)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'var(--gray-700)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{city.name}</span>
                    <span style={{fontSize: '0.75rem', color: 'var(--gray-400)'}}>{city.population}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Browse by service type">
        <div className="section-container">
          <div className="section-header">
            <h2>Browse by Service Type</h2>
            <p>Find Full Loop CRM opportunities for your specific home service trade.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem'}} role="list">
            {services.map((svc) => (
              <Link
                key={svc.slug}
                href={`/services/${svc.slug}`}
                role="listitem"
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '10px',
                  padding: '0.9rem 1.25rem',
                  fontSize: '0.925rem',
                  fontWeight: 600,
                  color: 'var(--gray-700)',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                {svc.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaSection heading="Check if your city is available" description="Tell us your trade and your metro area. We'll check territory availability and let you know if your market is open." />
    </>
  )
}
