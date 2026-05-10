// @ts-nocheck
'use client'

import Link from 'next/link'
import BrowsePage from '@/app/site/nyc-classifieds/_components/BrowsePage'
import { LocationDescription } from '@/app/site/nyc-classifieds/_components/PageDescription'
import { boroughBySlug, categories, neighborhoodSlug } from '@/app/site/nyc-classifieds/_lib/data'

export default function BoroughPageClient({ boroughSlug }: { boroughSlug: string }) {
  const b = boroughBySlug[boroughSlug]
  if (!b) return null

  return (
    <>
      <BrowsePage
        title={`Classified Ads in ${b.name}`}
        description={<LocationDescription borough={b.name} />}
        breadcrumbs={[{ label: b.name, href: `/${b.slug}` }]}
        borough={b.name}
      />
      {/* Neighborhood + Category links for SEO */}
      <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '0 24px 32px' }}>
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Browse by neighborhood
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {b.neighborhoods.map(n => (
              <Link key={n} href={`/${b.slug}/${neighborhoodSlug(n)}`} style={{
                color: '#1a56db',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                lineHeight: 1.8,
              }}>
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginTop: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Browse by category
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {categories.map(cat => (
              <Link key={cat.slug} href={`/${b.slug}/${cat.slug}`} style={{
                color: '#1a56db',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                lineHeight: 1.8,
              }}>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
