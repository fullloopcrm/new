// @ts-nocheck
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { buildMetadata, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'
import SearchClient from './SearchClient'

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Search Free NYC Classifieds — Apartments, Jobs, Services & More',
    description: 'Search free local classifieds in New York City. Find apartments, jobs, services, furniture, gigs and more from geo-verified NYC residents across all 5 boroughs.',
    path: '/search',
  }),
  robots: { index: false, follow: true },
}

export default function SearchPage() {
  const searchSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(searchSchema) }} />
      <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
        <SearchClient />
      </Suspense>
    </>
  )
}
