// @ts-nocheck
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { categoryBySlug, slugify } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, faqSchema, speakableSchema, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'
import { subcategoryFaqs } from '@/app/site/nyc-classifieds/_lib/seo-faqs'
import { subcategoryExamples } from '@/app/site/nyc-classifieds/_lib/page-content'
import { getSupabaseAdmin } from '@/app/site/nyc-classifieds/_lib/supabase-server'
import { safeJsonLd } from '@/lib/json-ld-safe'
import SubcategoryPageClient from './SubcategoryPageClient'
import ListingDetailClient from './ListingDetailClient'

export const dynamicParams = true

export const revalidate = 2592000

export async function generateStaticParams() { return [] }

// ─── Server-side listing fetch ───

interface ListingRow {
  id: number
  title: string
  description: string | null
  price: number | null
  images: string[]
  location: string | null
  category_slug: string
  subcategory_slug: string | null
  status: string
  created_at: string
  user_id: number
  users: { id: number; name: string; verified: boolean; created_at: string }
}

async function fetchListing(id: string): Promise<ListingRow | null> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('listings')
    .select('*, users!inner(id, name, verified, created_at)')
    .eq('id', id)
    .neq('status', 'removed')
    .single()
  if (error || !data) return null
  return data as ListingRow
}

// ─── Metadata ───

export async function generateMetadata({ params }: { params: Promise<{ category: string; subcategory: string }> }): Promise<Metadata> {
  const { category, subcategory } = await params
  const cat = categoryBySlug[category]
  const subName = cat?.subs.find(s => slugify(s) === subcategory)

  // Subcategory browse page
  if (subName) {
    const housingTitles: Record<string, string> = {
      'apartments': 'Apartments for Rent in NYC',
      'apartments-wanted': 'Apartments Wanted in NYC',
      'co-working': 'Co-working Space in NYC',
      'for-sale-real-estate': 'Real Estate for Sale in NYC',
      'parking-storage': 'Parking & Storage in NYC',
      'real-estate-wanted': 'Real Estate Wanted in NYC',
      'rooms-shared': 'Rooms for Rent in NYC',
      'sublets': 'Sublets in NYC',
    }

    const petsTitles: Record<string, string> = {
      'adoption': 'Animals up for Adoption in NYC',
      'dog-walking': 'Dog Walking Services in NYC',
      'grooming': 'Pet Grooming Services in NYC',
      'lost-found-pets': 'Lost & Found Pets in NYC',
      'pet-sitting': 'Pet Sitting Services in NYC',
    }

    const barterTitles: Record<string, string> = {
      'goods-for-goods': 'Barter in NYC — Trade Goods for Goods',
      'goods-for-skills': 'Barter in NYC — Trade Goods for Skills',
      'skills-for-skills': 'Barter in NYC — Swap Skills for Skills',
    }

    const titleMap: Record<string, string> = {
      housing: housingTitles[subcategory] || `${subName} in NYC`,
      jobs: `${subName} Jobs in NYC`,
      'for-sale': `${subName} for Sale in NYC`,
      services: `${subName} Services in NYC`,
      gigs: `${subName} Gigs in NYC`,
      community: `${subName} in NYC`,
      'tickets': `${subName} Tickets for Sale in NYC`,
      pets: petsTitles[subcategory] || `${subName} in NYC`,
      personals: `${subName} in NYC`,
      barter: barterTitles[subcategory] || `${subName} in NYC`,
      'rentals': `${subName} for Rent in NYC`,
      resumes: `${subName} Resumes in NYC`,
    }

    const ex = subcategoryExamples[category]?.[subcategory] || ''

    const descBuilders: Record<string, () => string> = {
      housing: () => ex
        ? `${subName} in NYC — ${ex}. No brokers, no scams. Every poster verified with selfie + GPS across all 5 boroughs. The NYC Classifieds.`
        : `${subName} in New York City from geo-verified locals. No brokers, no scams, no fees. The NYC Classifieds.`,
      jobs: () => ex
        ? `${subName} jobs in NYC — ${ex}. Every employer geo-verified across all 5 boroughs. Apply direct, zero fees. The NYC Classifieds.`
        : `${subName} jobs in New York City. Every employer geo-verified. Apply directly, no middlemen. The NYC Classifieds.`,
      'for-sale': () => ex
        ? `${subName} for sale in NYC — ${ex}. Every seller verified with selfie + GPS. Meet locally, buy safely. The NYC Classifieds.`
        : `${subName} for sale in New York City from verified neighbors. Meet locally, buy safely. The NYC Classifieds.`,
      services: () => ex
        ? `${subName} services in NYC — ${ex}. Every provider geo-verified to your neighborhood. The NYC Classifieds.`
        : `Hire ${subName.toLowerCase()} pros in NYC. Every provider geo-verified — real neighbors, not anonymous contractors. The NYC Classifieds.`,
      gigs: () => ex
        ? `${subName} gigs in NYC — ${ex}. Posted by geo-verified neighbors across all 5 boroughs. The NYC Classifieds.`
        : `${subName} gigs in New York City. Quick jobs from verified neighbors in your area. The NYC Classifieds.`,
      community: () => ex
        ? `${subName} in NYC — ${ex}. Every post from a verified neighbor across all 5 boroughs. The NYC Classifieds.`
        : `${subName} in New York City. Connect with verified neighbors — no spam, no fakes. The NYC Classifieds.`,
      tickets: () => ex
        ? `${subName} tickets for sale in NYC — ${ex}. Buy from verified locals, not scalper bots. The NYC Classifieds.`
        : `${subName} tickets for sale in NYC. Every seller geo-verified. No bots, no scams. The NYC Classifieds.`,
      pets: () => ex
        ? `${subName} in NYC — ${ex}. Every poster is a verified local who cares about animals. The NYC Classifieds.`
        : `${subName} in New York City from verified pet owners in your neighborhood. The NYC Classifieds.`,
      personals: () => ex
        ? `${subName} in NYC — ${ex}. Every person verified with selfie + GPS. Real and actually local. The NYC Classifieds.`
        : `${subName} in New York City. Every person geo-verified — real and actually local. The NYC Classifieds.`,
      barter: () => ex
        ? `Barter in NYC — ${ex}. Every user geo-verified. Trade with neighbors you can trust. The NYC Classifieds.`
        : `Trade and swap in New York City with verified neighbors. No money needed. The NYC Classifieds.`,
      rentals: () => ex
        ? `${subName} for rent in NYC — ${ex}. Every lender geo-verified. Why buy when you can borrow? The NYC Classifieds.`
        : `${subName} for rent in NYC. Borrow from verified neighbors instead of buying. The NYC Classifieds.`,
      resumes: () => ex
        ? `${subName} pros in NYC — ${ex}. Every candidate geo-verified. They actually live or work here. The NYC Classifieds.`
        : `${subName} professionals in NYC. Every candidate verified with selfie + GPS. The NYC Classifieds.`,
    }

    const desc = descBuilders[category]?.() || `${subName} in New York City. Every poster geo-verified across all 5 boroughs. The NYC Classifieds.`

    return buildMetadata({
      title: titleMap[category] || `${subName} in NYC`,
      description: desc,
      path: `/listings/${category}/${subcategory}`,
    })
  }

  // Listing detail page
  const listing = await fetchListing(subcategory)
  if (listing) {
    const catName = cat?.name || category
    const statusPrefix = listing.status === 'sold' ? '[SOLD] ' : listing.status === 'expired' ? '[EXPIRED] ' : ''
    const loc = listing.location || ''
    const meta = buildMetadata({
      title: `${statusPrefix}${listing.title} — ${catName}${loc ? ` in ${loc}` : ''}`,
      description: listing.description?.slice(0, 155) || `${listing.title} — free classified listing from a verified NYC resident.${loc ? ` Located in ${loc}.` : ''} Browse more on NYC Classifieds.`,
      path: `/listings/${category}/${subcategory}`,
    })
    // Add listing image as OG image
    if (listing.images.length > 0) {
      meta.openGraph = { ...meta.openGraph, images: [{ url: listing.images[0], alt: listing.title }] }
      meta.twitter = { ...meta.twitter, images: [listing.images[0]] }
    }
    return meta
  }

  return { title: `Listing #${subcategory}` }
}

// ─── Page ───

const PRODUCT_CATEGORIES = new Set(['for-sale', 'rentals', 'tickets', 'pets', 'barter', 'housing'])

export default async function SubcategoryOrDetailPage({ params }: { params: Promise<{ category: string; subcategory: string }> }) {
  const { category, subcategory } = await params
  const cat = categoryBySlug[category]
  const isSubcategory = cat?.subs.some(s => slugify(s) === subcategory)

  if (isSubcategory) {
    const subName = cat?.subs.find(s => slugify(s) === subcategory) || subcategory
    const siteUrl = SITE_URL

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${subName} in New York City`,
      description: `Free ${subName.toLowerCase()} listings in ${cat?.name.toLowerCase()} in New York City from verified locals.`,
      url: `${siteUrl}/listings/${category}/${subcategory}`,
      isPartOf: { '@type': 'WebSite', name: 'The NYC Classifieds' },
    }

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: cat?.name, item: `${siteUrl}/listings/${category}` },
        { '@type': 'ListItem', position: 3, name: subName, item: `${siteUrl}/listings/${category}/${subcategory}` },
      ],
    }

    const scFaqLd = faqSchema(subcategoryFaqs(subName, cat?.name || category))
    const scSpeakLd = speakableSchema({ url: `/listings/${category}/${subcategory}` })

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(scFaqLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(scSpeakLd) }} />
        <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
          <SubcategoryPageClient categorySlug={category} subcategorySlug={subcategory} />
        </Suspense>
      </>
    )
  }

  // ─── Listing detail ───
  const listing = await fetchListing(subcategory)
  const siteUrl = SITE_URL
  const catName = cat?.name || category
  const fullUrl = `${siteUrl}/listings/${category}/${subcategory}`

  // JSON-LD: Product schema for applicable categories
  const schemas: Record<string, unknown>[] = []

  if (listing) {
    if (PRODUCT_CATEGORIES.has(category)) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: listing.title,
        description: listing.description || undefined,
        url: fullUrl,
        ...(listing.images.length > 0 && { image: listing.images }),
        category: catName,
        offers: {
          '@type': 'Offer',
          price: listing.price ? (listing.price / 100).toFixed(2) : '0',
          priceCurrency: 'USD',
          availability: listing.status === 'sold'
            ? 'https://schema.org/SoldOut'
            : listing.status === 'expired'
              ? 'https://schema.org/Discontinued'
              : 'https://schema.org/InStock',
          seller: { '@type': 'Person', name: listing.users.name },
          ...(listing.location && {
            availableAtOrFrom: {
              '@type': 'Place',
              name: listing.location,
              address: {
                '@type': 'PostalAddress',
                addressLocality: listing.location,
                addressRegion: 'NY',
                addressCountry: 'US',
              },
            },
          }),
        },
      })
    } else if (category === 'jobs') {
      // JobPosting schema for jobs
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: listing.title,
        description: listing.description || listing.title,
        url: fullUrl,
        ...(listing.images.length > 0 && { image: listing.images[0] }),
        datePosted: listing.created_at,
        hiringOrganization: {
          '@type': 'Organization',
          name: listing.users.name,
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: listing.location || 'New York',
            addressRegion: 'NY',
            addressCountry: 'US',
          },
        },
        ...(listing.price && {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: { '@type': 'QuantitativeValue', value: (listing.price / 100).toFixed(2) },
          },
        }),
      })
    } else if (category === 'services') {
      // Service schema for services
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: listing.title,
        description: listing.description || undefined,
        url: fullUrl,
        ...(listing.images.length > 0 && { image: listing.images }),
        provider: {
          '@type': 'Person',
          name: listing.users.name,
        },
        ...(listing.location && {
          areaServed: {
            '@type': 'Place',
            name: listing.location,
            address: { '@type': 'PostalAddress', addressLocality: listing.location, addressRegion: 'NY', addressCountry: 'US' },
          },
        }),
        ...(listing.price && {
          offers: {
            '@type': 'Offer',
            price: (listing.price / 100).toFixed(2),
            priceCurrency: 'USD',
          },
        }),
      })
    } else if (category === 'gigs') {
      // Service schema for gigs (short-term work)
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: listing.title,
        description: listing.description || undefined,
        url: fullUrl,
        ...(listing.images.length > 0 && { image: listing.images }),
        provider: {
          '@type': 'Person',
          name: listing.users.name,
        },
        ...(listing.location && {
          areaServed: {
            '@type': 'Place',
            name: listing.location,
            address: { '@type': 'PostalAddress', addressLocality: listing.location, addressRegion: 'NY', addressCountry: 'US' },
          },
        }),
        ...(listing.price && {
          offers: {
            '@type': 'Offer',
            price: (listing.price / 100).toFixed(2),
            priceCurrency: 'USD',
          },
        }),
      })
    } else if (category === 'resumes') {
      // Person schema for resumes
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: listing.users.name,
        description: listing.description || listing.title,
        url: fullUrl,
        ...(listing.images.length > 0 && { image: listing.images[0] }),
        ...(listing.location && {
          homeLocation: {
            '@type': 'Place',
            name: listing.location,
            address: { '@type': 'PostalAddress', addressLocality: listing.location, addressRegion: 'NY', addressCountry: 'US' },
          },
        }),
      })
    } else {
      // Community, personals, etc. — generic WebPage
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: listing.title,
        description: listing.description || undefined,
        url: fullUrl,
        ...(listing.images.length > 0 && { image: listing.images }),
        author: { '@type': 'Person', name: listing.users.name },
        datePublished: listing.created_at,
        ...(listing.location && {
          contentLocation: {
            '@type': 'Place',
            name: listing.location,
            address: { '@type': 'PostalAddress', addressLocality: listing.location, addressRegion: 'NY', addressCountry: 'US' },
          },
        }),
      })
    }

    // Breadcrumb always
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: catName, item: `${siteUrl}/listings/${category}` },
        { '@type': 'ListItem', position: 3, name: listing.title, item: fullUrl },
      ],
    })
  }

  return (
    <>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      ))}
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
        <ListingDetailClient id={subcategory} />
      </Suspense>
    </>
  )
}
