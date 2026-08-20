import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, localBusinessSchema, reviewSchemas, reviewsPageSchema, videoReviewsSchemas } from '@/app/site/connecticut-maid/_lib/seo/schema'
import { getTenantFromHeaders, getPublicReviewsForSchema } from '@/lib/tenant-site'
import JsonLd from '@/app/site/connecticut-maid/_components/JsonLd'
import Breadcrumbs from '@/app/site/connecticut-maid/_components/Breadcrumbs'
import CTABlock from '@/app/site/connecticut-maid/_components/CTABlock'
import ReviewsList from './ReviewsList'

export const metadata: Metadata = {
  title: 'Connecticut Maid Service Reviews | 5-Star Verified Client Reviews',
  description: 'See why New Yorkers trust our background-checked, insured cleaners for apartments across Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, Westchester & NJ. From $59/hr, no contracts. (203) 491-5600',
  alternates: { canonical: 'https://www.theconnecticutmaid.com/reviews' },
  openGraph: {
    title: 'Connecticut Maid Service Reviews | 5-Star Verified Client Reviews',
    description: 'See reviews from across Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, Westchester & NJ.',
    url: 'https://www.theconnecticutmaid.com/reviews',
  },
}

export default async function ReviewsPage() {
  // Real, publicly-approved reviews — same tenant + status filter the public
  // /api/reviews GET applies for anonymous visitors — so the Review/JSON-LD
  // below always matches what ReviewsList actually renders on this page.
  // Falling back to `undefined` (→ curated CLIENT_REVIEWS excerpts) only
  // happens when the tenant itself can't be resolved, not when it resolves
  // with zero approved reviews.
  let liveReviews: Awaited<ReturnType<typeof getPublicReviewsForSchema>> | undefined
  try {
    const tenant = await getTenantFromHeaders()
    if (tenant) liveReviews = await getPublicReviewsForSchema(tenant.id)
  } catch {
    liveReviews = undefined
  }

  return (
    <>
      <JsonLd data={[
        reviewsPageSchema(liveReviews),
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.theconnecticutmaid.com' },
          { name: 'Reviews', url: 'https://www.theconnecticutmaid.com/reviews' },
        ]),
        ...reviewSchemas(liveReviews),
        ...videoReviewsSchemas(),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-semibold text-blue-200/50 tracking-[0.25em] uppercase mb-4">Verified Client Reviews</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Real Reviews From Real Clients
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed">
            Don&rsquo;t take our word for it &mdash; hear directly from the families, professionals, and New Yorkers who trust us to clean their homes every week. These are verified reviews from real <Link href="/services/apartment-cleaning-service-in-nyc" className="text-white underline underline-offset-2">apartment cleaning</Link>, <Link href="/services/deep-cleaning-service-in-nyc" className="text-white underline underline-offset-2">deep cleaning</Link>, and <Link href="/services/weekly-maid-service-in-nyc" className="text-white underline underline-offset-2">weekly maid service</Link> clients across <Link href="/manhattan-maid-service" className="text-white underline underline-offset-2">Manhattan</Link>, <Link href="/brooklyn-maid-service" className="text-white underline underline-offset-2">Brooklyn</Link>, <Link href="/queens-maid-service" className="text-white underline underline-offset-2">Queens</Link>, the <Link href="/bronx-maid-service" className="text-white underline underline-offset-2">Bronx</Link>, <Link href="/staten-island-maid-service" className="text-white underline underline-offset-2">Staten Island</Link>, <Link href="/long-island-maid-service" className="text-white underline underline-offset-2">Long Island</Link>, <Link href="/westchester-maid-service" className="text-white underline underline-offset-2">Westchester</Link> &amp; <Link href="/new-jersey-maid-service" className="text-white underline underline-offset-2">New Jersey</Link>. No fake reviews, no cherry-picking &mdash; just honest feedback from people who chose us and keep coming back.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Reviews', href: '/reviews' }]} />
        <ReviewsList />

        {/* CTA below reviews */}
        <div className="text-center mt-12 mb-8">
          <p className="text-gray-500 mb-4">Had a great experience? We&apos;d love to hear from you.</p>
          <Link href="/reviews/submit" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-[#243352] transition-colors">
            Write a Review
          </Link>
        </div>
      </div>

      <CTABlock title="Book Your Cleaning Service Today" subtitle="Text us to schedule your first cleaning." />
    </>
  )
}
