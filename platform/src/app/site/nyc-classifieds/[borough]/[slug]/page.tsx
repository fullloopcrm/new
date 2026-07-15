// @ts-nocheck
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { boroughs, boroughBySlug, categoryBySlug, findNeighborhood, neighborhoodSlug, categories } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, faqSchema, speakableSchema } from '@/app/site/nyc-classifieds/_lib/seo'
import { neighborhoodFaqs, boroughCategoryFaqs } from '@/app/site/nyc-classifieds/_lib/seo-faqs'
import BoroughCategoryClient from './BoroughCategoryClient'
import NeighborhoodPageClient from './NeighborhoodPageClient'

export const dynamicParams = true

export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ borough: string; slug: string }> }): Promise<Metadata> {
  const { borough, slug } = await params
  const b = boroughBySlug[borough]
  if (!b) return { title: 'Not Found' }

  const cat = categoryBySlug[slug]
  if (cat) {
    const subSample = cat.subs.slice(0, 5).join(', ')
    return buildMetadata({
      title: `${cat.name} Classified Ads in ${b.name}`,
      description: `${cat.name} classified ads in ${b.name} — ${subSample} & more. Every poster geo-verified with selfie + GPS. Free to post and browse. The NYC Classifieds.`,
      path: `/${borough}/${slug}`,
    })
  }

  const nh = findNeighborhood(borough, slug)
  if (nh) {
    return buildMetadata({
      title: `Classified Ads in ${nh.name}, ${b.name}`,
      description: `Classified ads in ${nh.name}, ${b.name} — apartments, jobs, services, for sale & more. Every poster verified with selfie + GPS — real neighbors, not strangers. The NYC Classifieds.`,
      path: `/${borough}/${slug}`,
    })
  }

  return { title: 'Not Found' }
}

export default async function BoroughSlugPage({ params }: { params: Promise<{ borough: string; slug: string }> }) {
  const { borough, slug } = await params
  const b = boroughBySlug[borough]
  if (!b) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'

  const cat = categoryBySlug[slug]
  if (cat) {
    const breadcrumbLd = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: b.name, item: `${siteUrl}/${borough}` },
        { '@type': 'ListItem', position: 3, name: cat.name, item: `${siteUrl}/${borough}/${slug}` },
      ],
    }
    const collectionLd = {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: `${cat.name} in ${b.name}`,
      description: `Free ${cat.name.toLowerCase()} listings in ${b.name}, NYC.`,
      url: `${siteUrl}/${borough}/${slug}`,
    }
    const bcFaqLd = faqSchema(boroughCategoryFaqs(b.name, cat.name))
    const bcSpeakLd = speakableSchema({ url: `/${borough}/${slug}` })
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(bcFaqLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(bcSpeakLd).replace(/</g, '\\u003c') }} />
        <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
          <BoroughCategoryClient boroughSlug={borough} categorySlug={slug} />
        </Suspense>
      </>
    )
  }

  const nh = findNeighborhood(borough, slug)
  if (nh) {
    const placeLd = {
      '@context': 'https://schema.org', '@type': 'Place',
      name: `${nh.name}, ${b.name}, New York City`,
      description: `Free classifieds in ${nh.name}, ${b.name}. Housing, jobs, services, and more from verified locals.`,
      url: `${siteUrl}/${borough}/${slug}`,
      address: { '@type': 'PostalAddress', addressLocality: b.name, addressRegion: 'NY', addressCountry: 'US' },
      containedInPlace: { '@type': 'AdministrativeArea', name: b.name },
    }
    const breadcrumbLd = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: b.name, item: `${siteUrl}/${borough}` },
        { '@type': 'ListItem', position: 3, name: nh.name, item: `${siteUrl}/${borough}/${slug}` },
      ],
    }
    const collectionLd = {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: `Classifieds in ${nh.name}, ${b.name}`,
      url: `${siteUrl}/${borough}/${slug}`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: categories.map((c, i) => ({
          '@type': 'ListItem', position: i + 1,
          name: `${c.name} in ${nh.name}`,
          url: `${siteUrl}/${borough}/${slug}/${c.slug}`,
        })),
      },
    }
    const nhFaqLd = faqSchema(neighborhoodFaqs(nh.name, b.name))
    const nhSpeakLd = speakableSchema({ url: `/${borough}/${slug}` })
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(nhFaqLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(nhSpeakLd).replace(/</g, '\\u003c') }} />
        <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
          <NeighborhoodPageClient boroughSlug={borough} neighborhoodSlug={slug} />
        </Suspense>
      </>
    )
  }

  notFound()
}
