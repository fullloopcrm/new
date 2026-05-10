// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata, breadcrumbSchema, SITE_NAME, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'

export const metadata: Metadata = buildMetadata({
  title: `About — ${SITE_NAME}`,
  description: 'NYC Classifieds is a free, geo-verified classifieds platform for New York City. Learn about our mission, verification process, and community features.',
  path: '/about',
})

function aboutPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${SITE_NAME}`,
    description: 'Free, geo-verified classifieds for New York City. Buy, sell, find housing, jobs, and services from real New Yorkers.',
    url: `${SITE_URL}/about`,
    mainEntity: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      description: 'Free local classifieds for New York City with geo-verified users.',
      areaServed: { '@type': 'City', name: 'New York City' },
    },
  }
}

export default function AboutPage() {
  const schemas = [
    aboutPageSchema(),
    breadcrumbSchema([{ name: 'About', url: '/about' }]),
  ]

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 64px', fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          About {SITE_NAME}
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '32px', lineHeight: 1.6 }}>
          Free. Real. Local. Verified. The classifieds platform New York City deserves.
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>What We Are</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            NYC Classifieds is a free classifieds platform built exclusively for New York City. We connect real, verified New Yorkers
            who want to buy, sell, find housing, get hired, offer services, and build community — neighborhood by neighborhood, across
            all five boroughs.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Why We Exist</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            The platforms New Yorkers rely on for local connections are broken. Craigslist is overrun with scams. Facebook Marketplace
            buries your post behind ads. Nextdoor became a complaint board. None of them feel like New York.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7, marginTop: '12px' }}>
            We built NYC Classifieds to be different — a platform where every user is verified as a real person in NYC, where community
            features are first-class, and where posting is always free.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Geo-Verification</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Every user on NYC Classifieds is geo-verified with a selfie and GPS check. This confirms you&apos;re a real person and that
            you&apos;re actually in New York City. The process takes about 30 seconds, and it eliminates bots, spam, and out-of-state scammers.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7, marginTop: '12px' }}>
            Your selfie is used for verification only and not stored long-term. Your exact location is never shared with other users —
            only your borough and neighborhood are visible.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>The Porch</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Classifieds are only half the story. <Link href="/porch" style={{ color: '#2563eb', textDecoration: 'underline' }}>The Porch</Link> is
            our community space where neighbors share recommendations, post alerts about package thefts or water main breaks, organize
            block parties and events, report lost pets, and welcome newcomers to the neighborhood.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7, marginTop: '12px' }}>
            Think of it as the digital version of sitting on your front stoop and chatting with the people who live around you.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Free, Forever</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Posting on NYC Classifieds is free, and it always will be. No listing fees, no premium tiers, no paywalls on community
            features. We believe that connecting neighbors shouldn&apos;t cost anything.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7, marginTop: '12px' }}>
            <Link href="/blog/free-forever" style={{ color: '#2563eb', textDecoration: 'underline' }}>Read more about our free-forever commitment.</Link>
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Get Involved</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            NYC Classifieds is built for New Yorkers, by New Yorkers. <Link href="/signup" style={{ color: '#2563eb', textDecoration: 'underline' }}>Sign up</Link> to
            start posting, or browse <Link href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>classifieds</Link> and <Link href="/porch" style={{ color: '#2563eb', textDecoration: 'underline' }}>The Porch</Link> to
            see what your neighbors are sharing. We&apos;d love to hear your feedback — look for the Feedback button at the bottom of any page.
          </p>
        </section>
      </main>
    </>
  )
}
