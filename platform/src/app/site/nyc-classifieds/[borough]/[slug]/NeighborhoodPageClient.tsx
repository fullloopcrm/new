// @ts-nocheck
'use client'

import Link from 'next/link'
import BrowsePage from '@/app/site//_components/BrowsePage'
import { LocationDescription } from '@/app/site//_components/PageDescription'
import NeighborhoodHome from '@/app/site//_components/NeighborhoodHome'
import { boroughBySlug, findNeighborhood, categories } from '@/app/site/nyc-classifieds/_lib/data'

export default function NeighborhoodPageClient({ boroughSlug, neighborhoodSlug }: { boroughSlug: string; neighborhoodSlug: string }) {
  const b = boroughBySlug[boroughSlug]
  const nh = findNeighborhood(boroughSlug, neighborhoodSlug)
  if (!b || !nh) return null

  return (
    <>
      <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '0 24px' }}>
        <NeighborhoodHome
          boroughSlug={boroughSlug}
          neighborhoodSlug={neighborhoodSlug}
          neighborhoodName={nh.name}
          boroughName={b.name}
        />
      </div>
      <BrowsePage
        title={`Classified Ads in ${nh.name}, ${b.name}`}
        description={<LocationDescription neighborhood={nh.name} borough={b.name} />}
        breadcrumbs={[
          { label: b.name, href: `/${b.slug}` },
          { label: nh.name, href: `/${b.slug}/${neighborhoodSlug}` },
        ]}
        borough={b.name}
        neighborhood={nh.name}
      />
      {/* Category links for SEO */}
      <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '0 24px 32px' }}>
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Browse {nh.name} by category
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {categories.map(cat => (
              <Link key={cat.slug} href={`/${b.slug}/${neighborhoodSlug}/${cat.slug}`} style={{
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
