// @ts-nocheck
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { boroughs, boroughBySlug, categoryBySlug, findNeighborhood, neighborhoodSlug, categories, slugify } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, faqSchema, speakableSchema } from '@/app/site/nyc-classifieds/_lib/seo'
import { subcategoryFaqs } from '@/app/site/nyc-classifieds/_lib/seo-faqs'
import { subcategoryExamples } from '@/app/site/nyc-classifieds/_lib/page-content'
import NeighborhoodSubcategoryClient from './NeighborhoodSubcategoryClient'

export const dynamicParams = true

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ borough: string; slug: string; category: string; subcategory: string }> }): Promise<Metadata> {
  const { borough, slug, category, subcategory } = await params
  const b = boroughBySlug[borough]
  const nh = findNeighborhood(borough, slug)
  const cat = categoryBySlug[category]
  const subName = cat?.subs.find(s => slugify(s) === subcategory)
  if (!b || !nh || !cat || !subName) return { title: 'Not Found' }

  // Housing subcategories need specific patterns
  const housingTitles: Record<string, string> = {
    'apartments': `Apartments for Rent in ${nh.name}, ${b.name}`,
    'apartments-wanted': `Apartments Wanted in ${nh.name}, ${b.name}`,
    'co-working': `Co-working Space in ${nh.name}, ${b.name}`,
    'for-sale-real-estate': `Real Estate for Sale in ${nh.name}, ${b.name}`,
    'parking-storage': `Parking & Storage in ${nh.name}, ${b.name}`,
    'real-estate-wanted': `Real Estate Wanted in ${nh.name}, ${b.name}`,
    'rooms-shared': `Rooms for Rent in ${nh.name}, ${b.name}`,
    'sublets': `Sublets in ${nh.name}, ${b.name}`,
  }

  const petsTitles: Record<string, string> = {
    'adoption': `Animals up for Adoption in ${nh.name}, ${b.name}`,
    'dog-walking': `Dog Walking Services in ${nh.name}, ${b.name}`,
    'grooming': `Pet Grooming Services in ${nh.name}, ${b.name}`,
    'lost-found-pets': `Lost & Found Pets in ${nh.name}, ${b.name}`,
    'pet-sitting': `Pet Sitting Services in ${nh.name}, ${b.name}`,
  }

  const barterTitles: Record<string, string> = {
    'goods-for-goods': `Barter in ${nh.name}, ${b.name} — Trade Goods for Goods`,
    'goods-for-skills': `Barter in ${nh.name}, ${b.name} — Trade Goods for Skills`,
    'skills-for-skills': `Barter in ${nh.name}, ${b.name} — Swap Skills for Skills`,
  }

  const titleMap: Record<string, string> = {
    housing: housingTitles[subcategory] || `${subName} in ${nh.name}, ${b.name}`,
    jobs: `${subName} Jobs in ${nh.name}, ${b.name}`,
    'for-sale': `${subName} for Sale in ${nh.name}, ${b.name}`,
    services: `${subName} Services in ${nh.name}, ${b.name}`,
    gigs: `${subName} Gigs in ${nh.name}, ${b.name}`,
    community: `${subName} in ${nh.name}, ${b.name}`,
    'tickets': `${subName} Tickets for Sale in ${nh.name}, ${b.name}`,
    pets: petsTitles[subcategory] || `${subName} in ${nh.name}, ${b.name}`,
    personals: `${subName} in ${nh.name}, ${b.name}`,
    barter: barterTitles[subcategory] || `${subName} in ${nh.name}, ${b.name}`,
    'rentals': `${subName} for Rent in ${nh.name}, ${b.name}`,
    resumes: `${subName} Resumes in ${nh.name}, ${b.name}`,
  }

  const ex = subcategoryExamples[category]?.[subcategory] || ''
  const loc = `${nh.name}, ${b.name}`

  const descBuilders: Record<string, () => string> = {
    housing: () => ex
      ? `${subName} in ${loc} — ${ex}. No brokers, no scams. Every poster verified with selfie + GPS. The NYC Classifieds.`
      : `${subName} in ${loc} from geo-verified locals. No brokers, no scams, no fees. The NYC Classifieds.`,
    jobs: () => ex
      ? `${subName} jobs in ${loc} — ${ex}. Every employer geo-verified to your area. Apply direct, zero fees. The NYC Classifieds.`
      : `${subName} jobs in ${loc}. Every employer geo-verified. Apply directly, no middlemen. The NYC Classifieds.`,
    'for-sale': () => ex
      ? `${subName} for sale in ${loc} — ${ex}. Every seller verified with selfie + GPS. Meet locally, buy safely. The NYC Classifieds.`
      : `${subName} for sale in ${loc} from verified neighbors. Meet locally, buy safely. The NYC Classifieds.`,
    services: () => ex
      ? `${subName} services in ${loc} — ${ex}. Every provider geo-verified to your neighborhood. The NYC Classifieds.`
      : `Hire ${subName.toLowerCase()} pros in ${loc}. Every provider geo-verified — real neighbors, not anonymous contractors. The NYC Classifieds.`,
    gigs: () => ex
      ? `${subName} gigs in ${loc} — ${ex}. Posted by geo-verified neighbors. Pick up work nearby. The NYC Classifieds.`
      : `${subName} gigs in ${loc}. Quick jobs from verified neighbors in your area. Free to post and apply. The NYC Classifieds.`,
    community: () => ex
      ? `${subName} in ${loc} — ${ex}. Every post from a verified neighbor. Your real community board. The NYC Classifieds.`
      : `${subName} in ${loc}. Connect with verified neighbors — no spam, no fakes. The NYC Classifieds.`,
    tickets: () => ex
      ? `${subName} tickets for sale in ${loc} — ${ex}. Buy from verified locals, not scalper bots. The NYC Classifieds.`
      : `${subName} tickets for sale in ${loc}. Every seller geo-verified. No bots, no scams. The NYC Classifieds.`,
    pets: () => ex
      ? `${subName} in ${loc} — ${ex}. Every poster is a verified local who cares about animals. The NYC Classifieds.`
      : `${subName} in ${loc} from verified pet owners and animal lovers in your neighborhood. The NYC Classifieds.`,
    personals: () => ex
      ? `${subName} in ${loc} — ${ex}. Every person verified with selfie + GPS. Real and actually local. The NYC Classifieds.`
      : `${subName} in ${loc}. Every person geo-verified — real and actually local. Safe to use. The NYC Classifieds.`,
    barter: () => ex
      ? `Barter in ${loc} — ${ex}. Every user geo-verified. Trade with neighbors you can trust. The NYC Classifieds.`
      : `Trade and swap in ${loc} with verified neighbors. No money needed. The NYC Classifieds.`,
    rentals: () => ex
      ? `${subName} for rent in ${loc} — ${ex}. Every lender geo-verified to your area. Why buy when you can borrow? The NYC Classifieds.`
      : `${subName} for rent in ${loc}. Borrow from verified neighbors instead of buying. The NYC Classifieds.`,
    resumes: () => ex
      ? `${subName} pros in ${loc} — ${ex}. Every candidate geo-verified. They actually live or work here. The NYC Classifieds.`
      : `${subName} professionals in ${loc}. Every candidate verified with selfie + GPS. The NYC Classifieds.`,
  }

  const desc = descBuilders[category]?.() || `${subName} in ${loc}. Every poster geo-verified. Free to browse and post. The NYC Classifieds.`

  return buildMetadata({
    title: titleMap[category] || `${subName} in ${nh.name}, ${b.name}`,
    description: desc,
    path: `/${borough}/${slug}/${category}/${subcategory}`,
  })
}

export default async function NeighborhoodSubcategoryPage({ params }: { params: Promise<{ borough: string; slug: string; category: string; subcategory: string }> }) {
  const { borough, slug, category, subcategory } = await params
  const b = boroughBySlug[borough]
  const nh = findNeighborhood(borough, slug)
  const cat = categoryBySlug[category]
  const subName = cat?.subs.find(s => slugify(s) === subcategory)
  if (!b || !nh || !cat || !subName) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: b.name, item: `${siteUrl}/${borough}` },
      { '@type': 'ListItem', position: 3, name: nh.name, item: `${siteUrl}/${borough}/${slug}` },
      { '@type': 'ListItem', position: 4, name: cat.name, item: `${siteUrl}/${borough}/${slug}/${category}` },
      { '@type': 'ListItem', position: 5, name: subName, item: `${siteUrl}/${borough}/${slug}/${category}/${subcategory}` },
    ],
  }

  const collectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: `${subName} in ${nh.name}, ${b.name}`,
    description: `Free ${subName.toLowerCase()} listings in ${nh.name}, ${b.name}, New York City from verified locals.`,
    url: `${siteUrl}/${borough}/${slug}/${category}/${subcategory}`,
    about: {
      '@type': 'Place',
      name: `${nh.name}, ${b.name}`,
      address: { '@type': 'PostalAddress', addressLocality: b.name, addressRegion: 'NY', addressCountry: 'US' },
    },
  }

  const scFaqLd = faqSchema(subcategoryFaqs(subName, cat.name))
  const scSpeakLd = speakableSchema({ url: `/${borough}/${slug}/${category}/${subcategory}` })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(scFaqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(scSpeakLd) }} />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
        <NeighborhoodSubcategoryClient boroughSlug={borough} neighborhoodSlug={slug} categorySlug={category} subcategorySlug={subcategory} />
      </Suspense>
    </>
  )
}
