// @ts-nocheck
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { categories, categoryBySlug, slugify } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, faqSchema, speakableSchema, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'
import { categoryFaqs } from '@/app/site/nyc-classifieds/_lib/seo-faqs'
import CategoryPageClient from './CategoryPageClient'

export async function generateStaticParams() {
  return categories.map(c => ({ category: c.slug }))
}

// Custom per-category SEO copy
const categoryMeta: Record<string, { title: string; desc: string }> = {
  'housing': {
    title: 'Housing in New York City',
    desc: 'Apartments, rooms, sublets & real estate in NYC. Every landlord verified with selfie + GPS. No brokers, no fees across all 5 boroughs. The NYC Classifieds.',
  },
  'jobs': {
    title: 'Jobs in New York City',
    desc: 'Local jobs in NYC — restaurants, tech, healthcare, trades, finance & more. Every employer geo-verified. Apply direct, zero fees. The NYC Classifieds.',
  },
  'for-sale': {
    title: 'For Sale in New York City',
    desc: 'Buy & sell furniture, electronics, clothing, bikes, sneakers & more in NYC. Every seller verified with selfie + GPS. Meet locally, buy safely. The NYC Classifieds.',
  },
  'services': {
    title: 'Services in New York City',
    desc: 'Hire trusted local pros in NYC — plumbing, cleaning, moving, tutoring & 40+ categories. Every provider geo-verified to your neighborhood. The NYC Classifieds.',
  },
  'gigs': {
    title: 'Gigs in New York City',
    desc: 'Pick up gigs in NYC — dog walking, moving help, event setup, delivery & more. Post a gig or find work from verified neighbors. The NYC Classifieds.',
  },
  'community': {
    title: 'Community in New York City',
    desc: 'Your neighborhood board for NYC. Recommendations, local alerts, stoop sales, lost pets & more from verified neighbors across 126+ neighborhoods. The NYC Classifieds.',
  },
  'tickets': {
    title: 'Tickets & Events in New York City',
    desc: 'Buy & sell tickets to NYC events — Broadway, comedy, concerts, sports & festivals. Verified sellers only, no scalper bots. The NYC Classifieds.',
  },
  'pets': {
    title: 'Pets in New York City',
    desc: 'Adopt pets, find dog walkers, groomers & pet sitters in NYC. Every poster is a verified local animal lover. The NYC Classifieds.',
  },
  'personals': {
    title: 'Personals in New York City',
    desc: 'Activity partners, missed connections, penpals & platonic friendships in NYC. Every person verified with selfie + GPS. Real people, real neighborhoods. The NYC Classifieds.',
  },
  'barter': {
    title: 'Barter in New York City',
    desc: 'Swap goods for goods, skills for skills, or mix & match with verified NYC neighbors. No cash needed. Everyone geo-verified. The NYC Classifieds.',
  },
  'rentals': {
    title: 'Rentals & Lending in New York City',
    desc: 'Borrow from verified NYC neighbors — cameras, baby gear, formal wear, tools, sports equipment & more. Why buy when you can borrow? The NYC Classifieds.',
  },
  'resumes': {
    title: 'Resumes in New York City',
    desc: 'Post your resume free and get found by NYC employers. Browse candidates across tech, healthcare, trades, finance & 30+ fields. Verified profiles only. The NYC Classifieds.',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const cat = categoryBySlug[category]
  if (!cat) return { title: 'Not Found' }

  const custom = categoryMeta[cat.slug]
  const subList = cat.subs.slice(0, 8).join(', ')
  return buildMetadata({
    title: custom?.title || `${cat.name} in New York City — Free ${cat.name} Listings`,
    description: custom?.desc || `Browse free ${cat.name.toLowerCase()} listings in NYC. ${subList}, and more from geo-verified New Yorkers.`,
    path: `/listings/${cat.slug}`,
  })
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const cat = categoryBySlug[category]

  // JSON-LD for category page
  const subItems = cat?.subs.map(s => ({
    name: `${s} in NYC`,
    url: `/listings/${category}/${slugify(s)}`,
  })) || []

  const siteUrl = SITE_URL

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cat?.name || category} in New York City`,
    description: `Browse free ${(cat?.name || category).toLowerCase()} listings across all five NYC boroughs.`,
    url: `${siteUrl}/listings/${category}`,
    isPartOf: { '@type': 'WebSite', name: 'The NYC Classifieds' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: subItems.length,
      itemListElement: subItems.map((item, i) => ({
        '@type': 'ListItem', position: i + 1, name: item.name,
        url: `${siteUrl}${item.url}`,
      })),
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: cat?.name || category, item: `${siteUrl}/listings/${category}` },
    ],
  }

  const faqs = categoryFaqs[category]
  const faqLd = faqs ? faqSchema(faqs) : null
  const speakableLd = speakableSchema({ url: `/listings/${category}` })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
        <CategoryPageClient categorySlug={category} />
      </Suspense>
    </>
  )
}
