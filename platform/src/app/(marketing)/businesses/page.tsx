import type { Metadata } from 'next'
import Link from 'next/link'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'Home Service Businesses We Partner With — Full Loop CRM',
  description: 'Full Loop CRM partners with cleaning services, HVAC, plumbing, electrical, landscaping, pest control, and 50+ home service trades. One exclusive partner per trade per metro area.',
  keywords: ['home service businesses', 'cleaning business CRM', 'HVAC CRM', 'plumbing CRM', 'landscaping CRM', 'pest control CRM', 'home service trades', 'field service CRM'],
  openGraph: {
    title: 'Home Service Businesses We Partner With — Full Loop CRM',
    description: 'Built for 50+ home service trades. One exclusive partner per trade per metro area.',
    url: 'https://fullloopcrm.com/businesses',
    siteName: 'Full Loop CRM',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Home Service Businesses We Partner With — Full Loop CRM',
    description: 'Built for 50+ home service trades. One exclusive partner per trade per metro area.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com/businesses',
  },
}

const serviceCategories = [
  { name: 'House Cleaning', slug: 'house-cleaning' },
  { name: 'Maid Service', slug: 'maid-service' },
  { name: 'Deep Cleaning', slug: 'deep-cleaning' },
  { name: 'Move In/Out Cleaning', slug: 'move-in-out-cleaning' },
  { name: 'Carpet Cleaning', slug: 'carpet-cleaning' },
  { name: 'Window Cleaning', slug: 'window-cleaning' },
  { name: 'Pressure Washing', slug: 'pressure-washing' },
  { name: 'Pool Cleaning', slug: 'pool-cleaning' },
  { name: 'Landscaping', slug: 'landscaping' },
  { name: 'Lawn Care', slug: 'lawn-care' },
  { name: 'Tree Service', slug: 'tree-service' },
  { name: 'Snow Removal', slug: 'snow-removal' },
  { name: 'HVAC Repair', slug: 'hvac-repair' },
  { name: 'HVAC Installation', slug: 'hvac-installation' },
  { name: 'Plumbing', slug: 'plumbing' },
  { name: 'Electrical', slug: 'electrical' },
  { name: 'Handyman Services', slug: 'handyman-services' },
  { name: 'Pest Control', slug: 'pest-control' },
  { name: 'Roofing', slug: 'roofing' },
  { name: 'Painting', slug: 'painting' },
  { name: 'Interior Painting', slug: 'interior-painting' },
  { name: 'Exterior Painting', slug: 'exterior-painting' },
  { name: 'Drywall Repair', slug: 'drywall-repair' },
  { name: 'Flooring Installation', slug: 'flooring-installation' },
  { name: 'Tile Installation', slug: 'tile-installation' },
  { name: 'Fence Installation', slug: 'fence-installation' },
  { name: 'Deck Building', slug: 'deck-building' },
  { name: 'Garage Door Repair', slug: 'garage-door-repair' },
  { name: 'Appliance Repair', slug: 'appliance-repair' },
  { name: 'Junk Removal', slug: 'junk-removal' },
  { name: 'Home Organization', slug: 'home-organization' },
  { name: 'Air Duct Cleaning', slug: 'air-duct-cleaning' },
  { name: 'Chimney Sweep', slug: 'chimney-sweep' },
  { name: 'Gutter Cleaning', slug: 'gutter-cleaning' },
  { name: 'Septic Service', slug: 'septic-service' },
  { name: 'Home Inspection', slug: 'home-inspection' },
  { name: 'Locksmith', slug: 'locksmith' },
  { name: 'Home Security', slug: 'home-security' },
  { name: 'Solar Installation', slug: 'solar-installation' },
  { name: 'Insulation', slug: 'insulation' },
  { name: 'Waterproofing', slug: 'waterproofing' },
  { name: 'Foundation Repair', slug: 'foundation-repair' },
  { name: 'Bathroom Remodeling', slug: 'bathroom-remodeling' },
  { name: 'Kitchen Remodeling', slug: 'kitchen-remodeling' },
  { name: 'General Contracting', slug: 'general-contracting' },
  { name: 'Janitorial Services', slug: 'janitorial-services' },
  { name: 'Commercial Cleaning', slug: 'commercial-cleaning' },
  { name: 'Post-Construction Cleaning', slug: 'post-construction-cleaning' },
  { name: 'Upholstery Cleaning', slug: 'upholstery-cleaning' },
  { name: 'Power Washing', slug: 'power-washing' },
]

export default function BusinessesPage() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Full Loop CRM Platform',
    serviceType: 'Business Management Software',
    provider: {
      '@type': 'Organization',
      name: 'Full Loop CRM',
      url: 'https://fullloopcrm.com',
    },
    areaServed: { '@type': 'Country', name: 'United States' },
    description: 'Complete CRM platform for home service businesses covering lead generation, AI sales, scheduling, operations, payments, reviews, and retargeting.',
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'Businesses', item: 'https://fullloopcrm.com/businesses' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label="Businesses introduction">
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem'}}>Built for Home Service Businesses</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>Full Loop CRM is designed for any field-service company that books recurring or one-time appointments in a defined geographic area. One exclusive partner per trade per metropolitan area.</p>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Service categories we serve">
        <div className="section-container">
          <div className="section-header">
            <h2>50+ Home Service Trades</h2>
            <p>From house cleaning to HVAC repair — if your business sends teams to homes, Full Loop CRM was built for you.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem'}} role="list">
            {serviceCategories.map((svc) => (
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

      <section className="alt-bg" style={{padding: '6rem 2rem'}} aria-label="Exclusivity model">
        <div className="section-container" style={{maxWidth: '900px'}}>
          <div className="section-header">
            <h2>One Partner Per Trade Per City</h2>
            <p>Exclusivity is the foundation of our value proposition. Here&apos;s how it works.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem'}}>
            <div className="feature-card">
              <div className="feature-icon blue-icon">&#128274;</div>
              <h3>Exclusive Territory Lock</h3>
              <p>When you become a Full Loop CRM partner, your trade in your metro area is locked. No other business in your industry can access the platform in your market. Your leads are your leads.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon green-icon">&#127760;</div>
              <h3>Your Domain Network</h3>
              <p>Your neighborhood-specific websites rank for local search in your territory. Because no competing partner exists in your area, every organic lead flows exclusively to you.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon purple-icon">&#128200;</div>
              <h3>Compounding Advantage</h3>
              <p>The longer you hold your territory, the stronger your organic presence grows. Domains age, rankings solidify, and your lead flow compounds — creating an ever-widening moat against competitors.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="What we look for in a partner">
        <div className="section-container" style={{maxWidth: '800px'}}>
          <div className="section-header">
            <h2>What We Look For in a Partner</h2>
            <p>Full Loop CRM is not for everyone. We&apos;re selective because exclusivity demands it.</p>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
              <h3 style={{color: 'var(--green)', marginBottom: '0.75rem'}}>The Right Fit</h3>
              <ul style={{listStyle: 'none'}}>
                <li style={{padding: '0.4rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)'}}><span style={{position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700}}>&#10003;</span> Established business with existing client base</li>
                <li style={{padding: '0.4rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)'}}><span style={{position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700}}>&#10003;</span> Team-based operation (not solo operator)</li>
                <li style={{padding: '0.4rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)'}}><span style={{position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700}}>&#10003;</span> Revenue of $5K+/month or scaling toward it</li>
                <li style={{padding: '0.4rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)'}}><span style={{position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700}}>&#10003;</span> Growth-minded and committed to organic strategy</li>
                <li style={{padding: '0.4rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)'}}><span style={{position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700}}>&#10003;</span> Values long-term partnership over quick fixes</li>
                <li style={{padding: '0.4rem 0', paddingLeft: '1.5rem', position: 'relative', fontSize: '0.9rem', color: 'var(--gray-600)'}}><span style={{position: 'absolute', left: 0, color: 'var(--green)', fontWeight: 700}}>&#10003;</span> Appreciates real consulting guidance</li>
              </ul>
            </div>
            <div className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
              <h3 style={{color: 'var(--red)', marginBottom: '0.75rem'}}>Not the Right Fit</h3>
              <ul className="not-for-list" style={{gridTemplateColumns: '1fr'}}>
                <li>Looking for the cheapest option</li>
                <li>Expecting unlimited free support</li>
                <li>Not ready for $25K annual commitment</li>
                <li>Sees this as a software subscription</li>
                <li>Solo operator without a team</li>
                <li>Wants paid ads instead of organic growth</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CtaSection heading="Is your trade available in your city?" description="Apply now to check territory availability. One partner per trade per metro — first come, first serve." />
    </>
  )
}
