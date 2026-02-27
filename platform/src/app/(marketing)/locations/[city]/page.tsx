import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCityBySlug, getAllCitySlugs } from '@/lib/marketing/locations'
import { services } from '@/lib/marketing/services'
import CtaSection from '@/components/marketing/cta-section'

interface PageProps {
  params: Promise<{ city: string }>
}

export async function generateStaticParams() {
  return getAllCitySlugs().map((city) => ({ city }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = getCityBySlug(citySlug)
  if (!city) return {}

  return {
    title: `Full Loop CRM in ${city.name}, ${city.stateAbbr} — Home Service Business Platform`,
    description: `Full Loop CRM is available in ${city.name}, ${city.stateAbbr}. Exclusive territory lock for home service businesses — one partner per trade. Organic lead gen, AI sales, scheduling, GPS ops, payments, reviews.`,
    keywords: [`${city.name} home service CRM`, `CRM in ${city.name}`, `${city.name} cleaning business software`, `${city.name} home service lead generation`, `${city.name} field service management`],
    openGraph: {
      title: `Full Loop CRM in ${city.name}, ${city.stateAbbr}`,
      description: `Lock your exclusive territory in ${city.name}. One partner per trade per metro.`,
      url: `https://fullloopcrm.com/locations/${city.slug}`,
      siteName: 'Full Loop CRM',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Full Loop CRM in ${city.name}, ${city.stateAbbr}`,
      description: `Lock your exclusive territory in ${city.name}. One partner per trade per metro.`,
    },
    alternates: {
      canonical: `https://fullloopcrm.com/locations/${city.slug}`,
    },
  }
}

export default async function CityPage({ params }: PageProps) {
  const { city: citySlug } = await params
  const city = getCityBySlug(citySlug)
  if (!city) notFound()

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'Locations', item: 'https://fullloopcrm.com/locations' },
      { '@type': 'ListItem', position: 3, name: city.name, item: `https://fullloopcrm.com/locations/${city.slug}` },
    ],
  }

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Full Loop CRM',
    url: `https://fullloopcrm.com/locations/${city.slug}`,
    telephone: '+12122029220',
    email: 'hello@fullloopcrm.com',
    areaServed: {
      '@type': 'City',
      name: city.name,
      containedInPlace: {
        '@type': 'State',
        name: city.state,
      },
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label={`Full Loop CRM in ${city.name}`}>
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <nav aria-label="Breadcrumb" style={{marginBottom: '1.5rem'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--gray-500)'}}>
              <Link href="/locations" style={{color: 'var(--blue)', textDecoration: 'none'}}>Locations</Link>
              {' / '}
              <span>{city.name}, {city.stateAbbr}</span>
            </span>
          </nav>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem'}}>Full Loop CRM in {city.name}, {city.stateAbbr}</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>{city.description} Lock your exclusive territory — one partner per trade in the {city.name} metro area.</p>
          <p style={{color: 'var(--gray-400)', fontSize: '0.9rem', marginTop: '1rem'}}>Metro population: {city.population}</p>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Why Full Loop CRM works in this city">
        <div className="section-container" style={{maxWidth: '900px'}}>
          <div className="section-header">
            <h2>Why Full Loop CRM in {city.name}?</h2>
            <p>The {city.name} metro area has massive demand for home services. Full Loop CRM gives you the tools to dominate your trade in this market.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem'}}>
            <div className="feature-card">
              <div className="feature-icon blue-icon">&#127760;</div>
              <h3>Organic Lead Generation</h3>
              <p>Neighborhood-specific websites ranking for local search terms in every {city.name} area community. Hyper-local SEO that puts you at the top of Google, Bing, and AI search results.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon green-icon">&#128274;</div>
              <h3>Exclusive Territory</h3>
              <p>Be the only business in your trade with Full Loop CRM in the {city.name} metro. Your competitors cannot access this platform in your market — your leads are exclusively yours.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon purple-icon">&#129302;</div>
              <h3>24/7 AI Sales</h3>
              <p>Selenas AI engages every {city.name} lead within seconds via SMS — day or night, weekday or weekend. No missed leads, no delayed responses, no lost revenue.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="alt-bg" style={{padding: '6rem 2rem'}} aria-label={`Services available in ${city.name}`}>
        <div className="section-container">
          <div className="section-header">
            <h2>Available Trades in {city.name}</h2>
            <p>Select your trade to check territory availability in the {city.name} metro area.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem'}} role="list">
            {services.map((svc) => (
              <Link
                key={svc.slug}
                href={`/locations/${city.slug}/${svc.slug}`}
                role="listitem"
                style={{
                  display: 'block',
                  background: 'var(--white)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{fontSize: '0.925rem', fontWeight: 600, color: 'var(--gray-700)'}}>{svc.name}</span>
                <span style={{display: 'block', fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem'}}>in {city.name}, {city.stateAbbr}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Platform overview">
        <div className="section-container" style={{maxWidth: '800px', textAlign: 'center'}}>
          <h2 style={{fontSize: 'clamp(2rem, 3.5vw, 2.5rem)', fontWeight: 800, marginBottom: '1.5rem'}}>Everything You Need to Run Your {city.name} Business</h2>
          <p style={{color: 'var(--gray-600)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem'}}>Full Loop CRM covers all 7 stages of your home service business — from the first Google search to the five-star review. One platform, one login, zero integrations.</p>
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Link href="/features" className="btn-secondary">See All Features</Link>
            <Link href="/pricing" className="btn-secondary">View Pricing</Link>
          </div>
        </div>
      </section>

      <CtaSection heading={`Lock your ${city.name} territory`} description={`Apply now to check availability for your trade in the ${city.name} metro area. First come, first serve.`} />
    </>
  )
}
