import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServiceBySlug, getAllServiceSlugs } from '@/lib/marketing/services'
import { cities } from '@/lib/marketing/locations'
import CtaSection from '@/components/marketing/cta-section'

interface PageProps {
  params: Promise<{ service: string }>
}

export async function generateStaticParams() {
  return getAllServiceSlugs().map((service) => ({ service }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service: serviceSlug } = await params
  const service = getServiceBySlug(serviceSlug)
  if (!service) return {}

  return {
    title: `${service.name} CRM — Full Loop CRM | Complete Business Platform`,
    description: service.description,
    keywords: service.keywords,
    openGraph: {
      title: `${service.name} CRM — Full Loop CRM`,
      description: service.description,
      url: `https://fullloopcrm.com/services/${service.slug}`,
      siteName: 'Full Loop CRM',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${service.name} CRM — Full Loop CRM`,
      description: service.description,
    },
    alternates: {
      canonical: `https://fullloopcrm.com/services/${service.slug}`,
    },
  }
}

export default async function ServicePage({ params }: PageProps) {
  const { service: serviceSlug } = await params
  const service = getServiceBySlug(serviceSlug)
  if (!service) notFound()

  const topCities = cities.slice(0, 30)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://fullloopcrm.com/businesses' },
      { '@type': 'ListItem', position: 3, name: service.name, item: `https://fullloopcrm.com/services/${service.slug}` },
    ],
  }

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Full Loop CRM for ${service.name}`,
    serviceType: service.name,
    description: service.longDescription,
    provider: {
      '@type': 'Organization',
      name: 'Full Loop CRM',
      url: 'https://fullloopcrm.com',
    },
    areaServed: { '@type': 'Country', name: 'United States' },
    offers: {
      '@type': 'Offer',
      price: '25000',
      priceCurrency: 'USD',
      availability: 'https://schema.org/LimitedAvailability',
      description: 'Annual platform license with exclusive territory lock',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label={`${service.name} CRM`}>
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <nav aria-label="Breadcrumb" style={{marginBottom: '1.5rem'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--gray-500)'}}>
              <Link href="/businesses" style={{color: 'var(--blue)', textDecoration: 'none'}}>Businesses</Link>
              {' / '}
              <span>{service.name}</span>
            </span>
          </nav>
          <span className="section-label" style={{background: 'var(--blue-light)', color: 'var(--blue)'}}>{service.category}</span>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem', marginTop: '0.5rem'}}>Full Loop CRM for {service.name}</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>{service.longDescription}</p>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label={`Challenges for ${service.name.toLowerCase()} businesses`}>
        <div className="section-container" style={{maxWidth: '900px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
            <div className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
              <h2 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--red)'}}>The Challenges</h2>
              <p style={{color: 'var(--gray-600)', fontSize: '0.95rem', marginBottom: '1rem'}}>Common pain points for {service.name.toLowerCase()} business owners:</p>
              <ul style={{listStyle: 'none'}}>
                {service.challenges.map((challenge, i) => (
                  <li key={i} style={{padding: '0.5rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)', borderBottom: '1px solid var(--gray-100)'}}>
                    <span style={{position: 'absolute', left: 0, color: 'var(--red)', fontWeight: 700}}>&#10007;</span>
                    {challenge}
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
              <h2 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--green)'}}>How Full Loop Helps</h2>
              <p style={{color: 'var(--gray-600)', fontSize: '0.95rem', marginBottom: '1rem'}}>What Full Loop CRM does for your {service.name.toLowerCase()} business:</p>
              <ul style={{listStyle: 'none'}}>
                {service.howFullLoopHelps.map((help, i) => (
                  <li key={i} style={{padding: '0.5rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)', borderBottom: '1px solid var(--gray-100)'}}>
                    <span style={{position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700}}>&#10003;</span>
                    {help}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="alt-bg" style={{padding: '6rem 2rem'}} aria-label="7-stage platform overview">
        <div className="section-container" style={{maxWidth: '900px'}}>
          <div className="section-header">
            <h2>7 Stages. Built for {service.name}.</h2>
            <p>Full Loop CRM covers your entire business cycle — from the first search to the five-star review.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem'}}>
            <div className="feature-card">
              <h3 style={{color: 'var(--blue)'}}>1. Lead Generation</h3>
              <p>Neighborhood-specific websites rank organically for &quot;{service.name.toLowerCase()} near me&quot; searches in your territory.</p>
            </div>
            <div className="feature-card">
              <h3 style={{color: 'var(--purple)'}}>2. AI Sales</h3>
              <p>Selenas AI engages every {service.name.toLowerCase()} lead via SMS within seconds — qualifies, quotes, and books.</p>
            </div>
            <div className="feature-card">
              <h3 style={{color: 'var(--teal)'}}>3. Scheduling</h3>
              <p>Smart booking with real-time availability, recurring schedules, and automated 4-stage reminders.</p>
            </div>
            <div className="feature-card">
              <h3 style={{color: 'var(--orange)'}}>4. Operations</h3>
              <p>GPS-verified check-in/out for your {service.name.toLowerCase()} teams. Bilingual portal, earnings tracking.</p>
            </div>
            <div className="feature-card">
              <h3 style={{color: 'var(--green)'}}>5. Payments</h3>
              <p>Revenue tracking, per-team payroll, expense management, P&amp;L reporting, and 1099 generation.</p>
            </div>
            <div className="feature-card">
              <h3 style={{color: 'var(--yellow)'}}>6. Reviews</h3>
              <p>Automated post-service follow-ups, feedback collection, and AI-powered complaint escalation.</p>
            </div>
            <div className="feature-card">
              <h3 style={{color: 'var(--red)'}}>7. Retargeting</h3>
              <p>Client lifecycle analytics, referral program, and multi-channel re-engagement for {service.name.toLowerCase()} clients.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label={`${service.name} in top cities`}>
        <div className="section-container">
          <div className="section-header">
            <h2>{service.name} Territories Available</h2>
            <p>Check territory availability for {service.name.toLowerCase()} in these major US metros.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem'}} role="list">
            {topCities.map((city) => (
              <Link
                key={city.slug}
                href={`/locations/${city.slug}/${service.slug}`}
                role="listitem"
                style={{
                  display: 'block',
                  background: 'var(--white)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '10px',
                  padding: '0.9rem 1.25rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{fontSize: '0.925rem', fontWeight: 600, color: 'var(--gray-700)'}}>{city.name}, {city.stateAbbr}</span>
              </Link>
            ))}
          </div>
          <div style={{textAlign: 'center', marginTop: '2rem'}}>
            <Link href="/locations" className="btn-secondary">View All 360+ Cities</Link>
          </div>
        </div>
      </section>

      <CtaSection heading={`Ready to own ${service.name.toLowerCase()} in your city?`} description={`Apply now to lock your exclusive ${service.name.toLowerCase()} territory. One partner per trade per metro — first come, first serve.`} />
    </>
  )
}
