// @ts-nocheck
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { boroughs, boroughBySlug, categoryBySlug, findNeighborhood, neighborhoodSlug, categories, slugify } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, faqSchema, speakableSchema } from '@/app/site/nyc-classifieds/_lib/seo'
import { neighborhoodCategoryFaqs } from '@/app/site/nyc-classifieds/_lib/seo-faqs'
import NeighborhoodCategoryClient from './NeighborhoodCategoryClient'

export const dynamicParams = true

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ borough: string; slug: string; category: string }> }): Promise<Metadata> {
  const { borough, slug, category } = await params
  const b = boroughBySlug[borough]
  const nh = findNeighborhood(borough, slug)
  const cat = categoryBySlug[category]
  if (!b || !nh || !cat) return { title: 'Not Found' }

  const subSample = cat.subs.slice(0, 5).join(', ')
  const titleMap: Record<string, string> = {
    housing: `Housing in ${nh.name}, ${b.name}`,
    jobs: `Jobs in ${nh.name}, ${b.name}`,
    'for-sale': `For Sale in ${nh.name}, ${b.name}`,
    services: `Services in ${nh.name}, ${b.name}`,
    gigs: `Gigs in ${nh.name}, ${b.name}`,
    community: `Community in ${nh.name}, ${b.name}`,
    'tickets': `Tickets & Events in ${nh.name}, ${b.name}`,
    pets: `Pets in ${nh.name}, ${b.name}`,
    personals: `Personals in ${nh.name}, ${b.name}`,
    barter: `Barter in ${nh.name}, ${b.name}`,
    'rentals': `Rentals & Lending in ${nh.name}, ${b.name}`,
    resumes: `Resumes in ${nh.name}, ${b.name}`,
  }

  const loc = `${nh.name}, ${b.name}`
  const descMap: Record<string, string> = {
    housing: `Apartments, rooms, sublets & more in ${loc}. ${subSample} — no brokers, no scams. Every listing from a geo-verified neighbor. The NYC Classifieds.`,
    jobs: `Jobs in ${loc} — ${subSample} & more. Every employer geo-verified to your area. Apply direct, zero fees. The NYC Classifieds.`,
    'for-sale': `Buy & sell in ${loc} — ${subSample} & more. Every seller verified with selfie + GPS. Meet locally, buy safely. The NYC Classifieds.`,
    services: `Hire local pros in ${loc} — ${subSample} & more. Every provider geo-verified to your neighborhood. The NYC Classifieds.`,
    gigs: `Gigs in ${loc} — ${subSample} & more. Quick jobs from geo-verified neighbors. Pick up work nearby. The NYC Classifieds.`,
    community: `Your neighborhood board for ${loc} — ${subSample} & more. Every post from a verified local. The NYC Classifieds.`,
    tickets: `Tickets & events in ${loc} — ${subSample}. Buy from verified locals, not scalper bots. The NYC Classifieds.`,
    pets: `Pets in ${loc} — ${subSample}. Every poster is a verified local animal lover. The NYC Classifieds.`,
    personals: `Personals in ${loc} — ${subSample}. Every person verified with selfie + GPS. Real and local. The NYC Classifieds.`,
    barter: `Barter in ${loc} — ${subSample}. Trade with geo-verified neighbors you can trust. No money needed. The NYC Classifieds.`,
    rentals: `Rent & borrow in ${loc} — ${subSample} & more. Every lender geo-verified. Why buy when you can borrow? The NYC Classifieds.`,
    resumes: `Browse resumes in ${loc} — ${subSample} & more. Every candidate geo-verified to your area. The NYC Classifieds.`,
  }

  return buildMetadata({
    title: titleMap[category] || `${cat.name} in ${nh.name}, ${b.name}`,
    description: descMap[category] || `${cat.name} in ${loc}. ${subSample} & more. Every poster geo-verified. The NYC Classifieds.`,
    path: `/${borough}/${slug}/${category}`,
  })
}

export default async function NeighborhoodCategoryPage({ params }: { params: Promise<{ borough: string; slug: string; category: string }> }) {
  const { borough, slug, category } = await params
  const b = boroughBySlug[borough]
  const nh = findNeighborhood(borough, slug)
  const cat = categoryBySlug[category]
  if (!b || !nh || !cat) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: b.name, item: `${siteUrl}/${borough}` },
      { '@type': 'ListItem', position: 3, name: nh.name, item: `${siteUrl}/${borough}/${slug}` },
      { '@type': 'ListItem', position: 4, name: cat.name, item: `${siteUrl}/${borough}/${slug}/${category}` },
    ],
  }

  const collectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: `${cat.name} in ${nh.name}, ${b.name}`,
    description: `Free ${cat.name.toLowerCase()} listings in ${nh.name}, ${b.name}, NYC.`,
    url: `${siteUrl}/${borough}/${slug}/${category}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: cat.subs.map((sub, i) => ({
        '@type': 'ListItem', position: i + 1,
        name: `${sub} in ${nh.name}`,
        url: `${siteUrl}/${borough}/${slug}/${category}/${slugify(sub)}`,
      })),
    },
  }

  const ncFaqLd = faqSchema(neighborhoodCategoryFaqs(nh.name, b.name, cat.name))
  const ncSpeakLd = speakableSchema({ url: `/${borough}/${slug}/${category}` })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ncFaqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ncSpeakLd) }} />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
        <NeighborhoodCategoryClient boroughSlug={borough} neighborhoodSlug={slug} categorySlug={category} />
      </Suspense>
    </>
  )
}
