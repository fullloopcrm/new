import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCityBySlug, getAllCitySlugs } from '@/lib/marketing/locations'
import { getServiceBySlug, getAllServiceSlugs } from '@/lib/marketing/services'
import CtaSection from '@/components/marketing/cta-section'

interface PageProps {
  params: Promise<{ city: string; service: string }>
}

export async function generateStaticParams() {
  const citySlugs = getAllCitySlugs()
  const serviceSlugs = getAllServiceSlugs()
  const params: { city: string; service: string }[] = []
  for (const city of citySlugs) {
    for (const service of serviceSlugs) {
      params.push({ city, service })
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug, service: serviceSlug } = await params
  const city = getCityBySlug(citySlug)
  const service = getServiceBySlug(serviceSlug)
  if (!city || !service) return {}

  const title = `${service.name} in ${city.name}, ${city.stateAbbr} — Full Loop CRM`
  const description = `Full Loop CRM for ${service.name.toLowerCase()} businesses in ${city.name}, ${city.stateAbbr}. Exclusive territory lock — one partner per trade. Organic lead gen, AI sales, scheduling, GPS operations, payments, reviews, retargeting.`

  return {
    title,
    description,
    keywords: [`${service.name.toLowerCase()} ${city.name}`, `${service.name.toLowerCase()} CRM ${city.name}`, `${city.name} ${service.name.toLowerCase()} software`, `best ${service.name.toLowerCase()} in ${city.name}`, `${service.name.toLowerCase()} near me ${city.name}`],
    openGraph: {
      title,
      description,
      url: `https://fullloopcrm.com/locations/${city.slug}/${service.slug}`,
      siteName: 'Full Loop CRM',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://fullloopcrm.com/locations/${city.slug}/${service.slug}`,
    },
  }
}

export default async function CityServicePage({ params }: PageProps) {
  const { city: citySlug, service: serviceSlug } = await params
  const city = getCityBySlug(citySlug)
  const service = getServiceBySlug(serviceSlug)
  if (!city || !service) notFound()

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'Locations', item: 'https://fullloopcrm.com/locations' },
      { '@type': 'ListItem', position: 3, name: city.name, item: `https://fullloopcrm.com/locations/${city.slug}` },
      { '@type': 'ListItem', position: 4, name: service.name, item: `https://fullloopcrm.com/locations/${city.slug}/${service.slug}` },
    ],
  }

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `Full Loop CRM — ${service.name} in ${city.name}`,
    url: `https://fullloopcrm.com/locations/${city.slug}/${service.slug}`,
    telephone: '+12122029220',
    email: 'hello@fullloopcrm.com',
    areaServed: {
      '@type': 'City',
      name: city.name,
      containedInPlace: { '@type': 'State', name: city.state },
    },
    description: `Full Loop CRM platform for ${service.name.toLowerCase()} businesses in the ${city.name}, ${city.stateAbbr} metropolitan area.`,
    offers: {
      '@type': 'Offer',
      price: '25000',
      priceCurrency: 'USD',
      availability: 'https://schema.org/LimitedAvailability',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label={`${service.name} in ${city.name}`}>
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <nav aria-label="Breadcrumb" style={{marginBottom: '1.5rem'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--gray-500)'}}>
              <Link href="/locations" style={{color: 'var(--blue)', textDecoration: 'none'}}>Locations</Link>
              {' / '}
              <Link href={`/locations/${city.slug}`} style={{color: 'var(--blue)', textDecoration: 'none'}}>{city.name}</Link>
              {' / '}
              <span>{service.name}</span>
            </span>
          </nav>
          <span className="section-label" style={{background: 'var(--blue-light)', color: 'var(--blue)'}}>{service.category} · {city.stateAbbr}</span>
          <h1 style={{fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem', marginTop: '0.5rem'}}>{service.name} in {city.name}, {city.stateAbbr}</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.1rem', lineHeight: 1.7}}>Full Loop CRM is the complete platform for {service.name.toLowerCase()} businesses in the {city.name} metro area. One exclusive partner per trade — if your territory is open, lock it now before a competitor does.</p>
          <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Link href="/crm-partnership-request-form" className="btn-primary" style={{fontSize: '1.1rem', padding: '1rem 2.5rem'}}>Check Territory Availability</Link>
            <a href="sms:+12122029220" className="btn-secondary">Text Us</a>
          </div>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label={`Why ${service.name.toLowerCase()} businesses in ${city.name} need Full Loop`}>
        <div className="section-container" style={{maxWidth: '900px'}}>
          <div className="section-header">
            <h2>Why {service.name} in {city.name} Needs Full Loop CRM</h2>
            <p>{city.description}</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
            <div className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
              <h3 style={{color: 'var(--red)', marginBottom: '1rem'}}>Without Full Loop</h3>
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
              <h3 style={{color: 'var(--green)', marginBottom: '1rem'}}>With Full Loop</h3>
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

      <section className="alt-bg" style={{padding: '6rem 2rem'}} aria-label="What you get">
        <div className="section-container" style={{maxWidth: '800px', textAlign: 'center'}}>
          <h2 style={{fontSize: 'clamp(2rem, 3.5vw, 2.5rem)', fontWeight: 800, marginBottom: '1.5rem'}}>Everything Included</h2>
          <p style={{color: 'var(--gray-600)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem'}}>Your {city.name} {service.name.toLowerCase()} business gets the full platform — all 7 stages, AI sales, all portals, full analytics, and your exclusive territory lock.</p>
          <div className="stats-bar" style={{borderRadius: '16px', overflow: 'hidden'}}>
            <div className="stats-grid">
              <div className="stat-item"><h3>7</h3><p>Business stages</p></div>
              <div className="stat-item"><h3>9+</h3><p>Tools replaced</p></div>
              <div className="stat-item"><h3>1</h3><p>Partner per trade</p></div>
              <div className="stat-item"><h3>24/7</h3><p>AI sales agent</p></div>
            </div>
          </div>
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem'}}>
            <Link href="/features" className="btn-secondary">See All Features</Link>
            <Link href="/pricing" className="btn-secondary">View Pricing</Link>
          </div>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Cross links">
        <div className="section-container" style={{maxWidth: '800px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
            <div>
              <h3 style={{fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem'}}>More services in {city.name}</h3>
              <Link href={`/locations/${city.slug}`} style={{color: 'var(--blue)', textDecoration: 'none', fontSize: '0.9rem'}}>View all trades in {city.name} &rarr;</Link>
            </div>
            <div>
              <h3 style={{fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem'}}>{service.name} in other cities</h3>
              <Link href={`/services/${service.slug}`} style={{color: 'var(--blue)', textDecoration: 'none', fontSize: '0.9rem'}}>View all {service.name.toLowerCase()} territories &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      <CtaSection heading={`Lock ${service.name.toLowerCase()} in ${city.name}`} description={`Apply now — exclusive territory for ${service.name.toLowerCase()} in the ${city.name}, ${city.stateAbbr} metro area.`} />
    </>
  )
}
