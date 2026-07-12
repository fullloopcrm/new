// @ts-nocheck
import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { boroughs, boroughBySlug } from '@/app/site/nyc-classifieds/_lib/data'
import { buildMetadata, breadcrumbSchema, collectionPageSchema, faqSchema, speakableSchema, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'
import PorchClient from '../PorchClient'

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ borough: string }> }): Promise<Metadata> {
  const { borough } = await params
  const b = boroughBySlug[borough]
  if (!b) return { title: 'Not Found' }

  return buildMetadata({
    title: `The Porch — ${b.name} Neighborhood Feed`,
    description: `Join the neighborhood conversation in ${b.name}. Recommendations, questions, alerts, lost & found, events, stoop sales, and more from verified ${b.name} residents.`,
    path: `/porch/${borough}`,
  })
}

export default async function PorchBoroughPage({ params }: { params: Promise<{ borough: string }> }) {
  const { borough } = await params
  const b = boroughBySlug[borough]
  if (!b) notFound()

  const breadcrumbLd = breadcrumbSchema([
    { name: 'The Porch', url: '/porch' },
    { name: b.name, url: `/porch/${borough}` },
  ])

  const collectionLd = collectionPageSchema({
    name: `The Porch — ${b.name}`,
    description: `Neighborhood discussions in ${b.name}, New York City.`,
    url: `/porch/${borough}`,
    items: b.neighborhoods.map(n => ({
      name: `The Porch in ${n}`,
      url: `/porch/${borough}/${n.toLowerCase().replace(/ /g, '-').replace(/'/g, '').replace(/\./g, '')}`,
    })),
  })

  const siteUrl = SITE_URL

  const forumLd = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForum',
    name: `The Porch — ${b.name} Neighborhood Feed`,
    description: `Neighborhood discussion feed for ${b.name}, New York City. Recommendations, questions, alerts, events, and more from verified residents.`,
    url: `${siteUrl}/porch/${borough}`,
    author: { '@type': 'Organization', name: 'The NYC Classifieds', url: siteUrl },
  }

  const porchBoroughFaqLd = faqSchema([
    { question: `What is The Porch in ${b.name}?`, answer: `The Porch is a verified neighborhood feed for ${b.name} residents. Post questions, recommendations, alerts, lost pets, stoop sales, and more. Every poster is confirmed to live or work in ${b.name} with selfie + GPS.` },
    { question: `How do I post on The Porch in ${b.name}?`, answer: `Sign up free on The NYC Classifieds, verify your ${b.name} address with a live selfie + GPS, and start posting immediately. It's 100% free.` },
    { question: `Is The Porch only for ${b.name}?`, answer: `The Porch covers all 5 NYC boroughs and 123+ neighborhoods. Browse your specific neighborhood or the full ${b.name} feed.` },
  ])

  const porchSpeakLd = speakableSchema({ url: `/porch/${borough}` })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(forumLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(porchBoroughFaqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(porchSpeakLd) }} />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>}>
        <PorchClient boroughSlug={borough} />
      </Suspense>
    </>
  )
}
