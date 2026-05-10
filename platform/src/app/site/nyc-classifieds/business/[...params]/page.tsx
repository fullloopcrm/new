// @ts-nocheck
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/app/site/nyc-classifieds/_lib/supabase-server'
import { slugify } from '@/app/site/nyc-classifieds/_lib/data'
import { getCategorySeo, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'
import BusinessProfileClient from './BusinessProfileClient'

interface PageProps {
  params: Promise<{ params: string[] }>
}

async function getBusinessBySlug(slug: string) {
  const db = getSupabaseAdmin()
  const { data } = await db
    .from('users')
    .select('business_name, business_slug, business_category, business_description, business_photo, selfie_url, business_address, phone, seo_keywords')
    .eq('business_slug', slug)
    .eq('account_type', 'business')
    .single()
  return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { params: segments } = await params

  // Only generate metadata for canonical 2-segment URLs
  if (segments.length !== 2) return {}

  const slug = segments[1]
  const biz = await getBusinessBySlug(slug)
  if (!biz) return {}

  const categorySeo = getCategorySeo(biz.business_category)
  const name = biz.business_name
  const category = biz.business_category || 'Business'
  const catSlug = slugify(category)

  const title = `${name} — ${category} in NYC | The NYC Classifieds`
  const description = biz.business_description
    ? biz.business_description.slice(0, 160)
    : `${name} is a ${category.toLowerCase()} ${categorySeo.descriptionTemplate}. View reviews, hours, photos, and more.`

  const keywords = [
    name,
    category,
    ...(biz.seo_keywords || []),
    ...categorySeo.keywords,
    'NYC',
    'New York City',
  ]

  const url = `${SITE_URL}/business/${catSlug}/${biz.business_slug}`
  const image = biz.business_photo || biz.selfie_url

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'The NYC Classifieds',
      type: 'website',
      locale: 'en_US',
      ...(image && { images: [{ url: image, width: 600, height: 600, alt: name }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

export default async function BusinessProfilePage({ params }: PageProps) {
  const { params: segments } = await params

  // /business/[category]/[slug] — canonical URL
  if (segments.length === 2) {
    return <BusinessProfileClient slug={segments[1]} category={segments[0]} />
  }

  // /business/[slug] — old URL, server-side redirect
  if (segments.length === 1) {
    const biz = await getBusinessBySlug(segments[0])
    if (biz) {
      const catSlug = biz.business_category ? slugify(biz.business_category) : 'other'
      redirect(`/business/${catSlug}/${biz.business_slug}`)
    }
    redirect('/business')
  }

  // Invalid URL
  notFound()
}
