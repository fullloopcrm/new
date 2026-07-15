import { boroughs, categories, neighborhoodSlug, slugify } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, collectionPageSchema, speakableSchema } from '@/app/site/nyc-classifieds/_lib/seo'
import Link from 'next/link'
import HomeSearch from '../components/HomeSearch'
import BoroughNav from '../components/BoroughNav'
import HomeCategoryGrid from '../components/HomeCategoryGrid'
import HomepageAd from '../components/HomepageAd'
import PreLaunchBanner from '../components/PreLaunchBanner'

export const metadata = buildMetadata({
  title: 'Browse NYC Classifieds — Free Listings Across 126+ Neighborhoods',
  description: 'Browse free classifieds across all 5 NYC boroughs and 126+ neighborhoods. Housing, jobs, services, for sale, gigs & more. Every user geo-verified.',
  path: '/the-classifieds',
})

export default function TheClassifiedsPage() {
  const categoryItems = categories.map(c => ({ name: c.name, url: `/listings/${c.slug}` }))
  const boroughItems = boroughs.map(b => ({ name: `${b.name} Classifieds`, url: `/${b.slug}` }))

  const schemas = [
    collectionPageSchema({
      name: 'Browse NYC Classifieds — Free Listings in All 5 Boroughs',
      description: 'Browse all classifieds categories in New York City including housing, jobs, services, for sale, gigs, community, and more.',
      url: '/the-classifieds',
      items: [...categoryItems, ...boroughItems],
    }),
    speakableSchema({ url: '/the-classifieds' }),
  ]

  return (
    <main style={{ maxWidth: '1050px', margin: '0 auto', padding: '12px 24px 32px' }}>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s).replace(/</g, '\\u003c') }} />
      ))}

      <PreLaunchBanner />

      <div className="mobile-only-ad">
        <HomepageAd />
      </div>

      <section style={{ padding: '12px 0 10px', fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          Browse NYC Classifieds — Free Listings in All 5 Boroughs
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: '0.8125rem', color: '#374151' }}>
          <span><strong style={{ color: '#2563eb' }}>Geo-verified</strong> — Selfie + GPS at your address</span>
          <span><strong style={{ color: '#2563eb' }}>100% free</strong> — No fees, ever</span>
          <span><strong style={{ color: '#2563eb' }}>126+ neighborhoods</strong> — All 5 NYC boroughs</span>
          <span><strong style={{ color: '#2563eb' }}><Link href="/porch" style={{ color: '#059669', textDecoration: 'underline' }}>The Porch</Link></strong> — Neighbor Q&A, alerts, lost pets</span>
        </div>
      </section>

      <section className="homepage-top" style={{ padding: '0', marginBottom: '0' }}>
        <h2 className="sr-only">Search Free Classifieds in NYC — Apartments, Jobs, Services, For Sale, Gigs &amp; Community</h2>
        <div className="homepage-top-left">
          <div style={{ marginBottom: '12px' }}>
            <HomeSearch />
          </div>
          <BoroughNav />
        </div>
        <div className="desktop-only-ad homepage-top-right">
          <HomepageAd />
        </div>
      </section>

      <HomeCategoryGrid />
    </main>
  )
}
