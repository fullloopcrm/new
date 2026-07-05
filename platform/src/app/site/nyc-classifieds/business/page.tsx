import type { Metadata } from 'next'
import { Suspense } from 'react'
import { buildMetadata, breadcrumbSchema, collectionPageSchema } from '@/app/site/nyc-classifieds/_lib/seo'
import BusinessDirectoryClient from './BusinessDirectoryClient'

export const metadata: Metadata = buildMetadata({
  title: 'NYC Business Directory — Find Local Businesses in New York City',
  description: 'Find local businesses in NYC. Browse the NYC business directory by category, borough, or search — restaurants, salons, contractors, and more.',
  path: '/business',
})

export default function BusinessDirectoryPage() {
  const breadcrumbs = breadcrumbSchema([{ name: 'Business Directory', url: '/business' }])
  const collection = collectionPageSchema({
    name: 'NYC Business Directory',
    description: 'Find local businesses in New York City — browse by category, borough, or search.',
    url: '/business',
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading directory...</div>}>
        <BusinessDirectoryClient />
      </Suspense>
    </>
  )
}
