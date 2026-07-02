// @ts-nocheck
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { boroughs, boroughBySlug, categories } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, faqSchema, speakableSchema } from '@/app/site/nyc-classifieds/_lib/seo'
import { boroughFaqs } from '@/app/site/nyc-classifieds/_lib/seo-faqs'
import BoroughPageClient from './BoroughPageClient'

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

const boroughMeta: Record<string, { title: string; desc: string }> = {
  'manhattan': {
    title: 'Classified Ads in Manhattan',
    desc: 'Classified ads in Manhattan — apartments, jobs, services & more across 41 neighborhoods from Upper East Side to Tribeca. Every poster verified with selfie + GPS. The NYC Classifieds.',
  },
  'brooklyn': {
    title: 'Classified Ads in Brooklyn',
    desc: 'Classified ads in Brooklyn — apartments, jobs, services & more across 28 neighborhoods from Williamsburg to Bay Ridge. Every poster geo-verified. The NYC Classifieds.',
  },
  'queens': {
    title: 'Classified Ads in Queens',
    desc: 'Classified ads in Queens — apartments, jobs, services & more across 30 neighborhoods from Astoria to Flushing. Every poster verified with selfie + GPS. The NYC Classifieds.',
  },
  'bronx': {
    title: 'Classified Ads in the Bronx',
    desc: 'Classified ads in the Bronx — apartments, jobs, services & more across 15 neighborhoods from Fordham to Riverdale. Every poster geo-verified. The NYC Classifieds.',
  },
  'staten-island': {
    title: 'Classified Ads in Staten Island',
    desc: 'Classified ads in Staten Island — apartments, jobs, services & more across 10 neighborhoods from Tottenville to St. George. Every poster geo-verified. The NYC Classifieds.',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ borough: string }> }): Promise<Metadata> {
  const { borough } = await params
  const b = boroughBySlug[borough]
  if (!b) return { title: 'Not Found' }

  const custom = boroughMeta[b.slug]
  const nhSample = b.neighborhoods.slice(0, 6).join(', ')
  return buildMetadata({
    title: custom?.title || `Classified Ads in ${b.name}`,
    description: custom?.desc || `Classified ads in ${b.name} — apartments, jobs, services & more across ${b.neighborhoods.length} neighborhoods including ${nhSample}. Every poster geo-verified. The NYC Classifieds.`,
    path: `/${b.slug}`,
  })
}

export default async function BoroughPage({ params }: { params: Promise<{ borough: string }> }) {
  const { borough } = await params
  const b = boroughBySlug[borough]
  if (!b) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'

  const placeLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${b.name}, New York City`,
    description: `Free classifieds for ${b.name}, NYC. Browse ${b.neighborhoods.length} neighborhoods for housing, jobs, services, and more.`,
    url: `${siteUrl}/${b.slug}`,
    address: { '@type': 'PostalAddress', addressLocality: b.name, addressRegion: 'NY', addressCountry: 'US' },
    containedInPlace: { '@type': 'City', name: 'New York', sameAs: 'https://en.wikipedia.org/wiki/New_York_City' },
  }

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${b.name} Classifieds`,
    description: `All classifieds in ${b.name}, NYC`,
    url: `${siteUrl}/${b.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        ...categories.map((cat, i) => ({
          '@type': 'ListItem', position: i + 1,
          name: `${cat.name} in ${b.name}`,
          url: `${siteUrl}/${b.slug}/${cat.slug}`,
        })),
      ],
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: b.name, item: `${siteUrl}/${b.slug}` },
    ],
  }

  const nhSample = b.neighborhoods.slice(0, 8).join(', ')
  const faqLd = faqSchema(boroughFaqs(b.name, b.neighborhoods.length, nhSample))
  const speakableLd = speakableSchema({ url: `/${b.slug}` })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
        <BoroughPageClient boroughSlug={borough} />
      </Suspense>
    </>
  )
}
