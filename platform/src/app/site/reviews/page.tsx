import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, localBusinessSchema, reviewSchemas, reviewsPageSchema, videoReviewsSchemas } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'
import VideoReviews from '@/components/marketing/VideoReviews'
import ReviewsList from './ReviewsList'

export const metadata: Metadata = {
  title: 'NYC Maid Service Reviews | 5-Star Verified Client Reviews',
  description: 'Read 43+ verified 5-star reviews from real NYC cleaning clients. See why New Yorkers trust our background-checked, insured cleaners for apartments across Manhattan, Brooklyn, Queens, Long Island & NJ. From $59/hr, no contracts. (212) 202-9030',
  alternates: { canonical: 'https://www.thenycmaid.com/reviews' },
  openGraph: {
    title: 'NYC Maid Service Reviews | 5-Star Verified Client Reviews',
    description: 'Read 50+ verified 5-star reviews from real NYC apartment cleaning, deep cleaning, and maid service clients across Manhattan, Brooklyn, Queens, Long Island & NJ.',
    url: 'https://www.thenycmaid.com/reviews',
  },
}

export default function ReviewsPage() {
  return (
    <>
      <JsonLd data={[
        reviewsPageSchema(),
        localBusinessSchema(undefined, undefined, { includeRating: true }),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Reviews', url: 'https://www.thenycmaid.com/reviews' },
        ]),
        ...reviewSchemas(),
        ...videoReviewsSchemas(),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-semibold text-blue-200/50 tracking-[0.25em] uppercase mb-4">50+ Verified 5-Star Reviews</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Real Reviews From Real NYC Cleaning Clients
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed">
            Don&rsquo;t take our word for it &mdash; hear directly from the families, professionals, and New Yorkers who trust us to clean their homes every week. These are verified reviews from real <Link href="/services/apartment-cleaning-service-in-nyc" className="text-white underline underline-offset-2">apartment cleaning</Link>, <Link href="/services/deep-cleaning-service-in-nyc" className="text-white underline underline-offset-2">deep cleaning</Link>, and <Link href="/services/weekly-maid-service-in-nyc" className="text-white underline underline-offset-2">weekly maid service</Link> clients across <Link href="/manhattan-maid-service" className="text-white underline underline-offset-2">Manhattan</Link>, <Link href="/brooklyn-maid-service" className="text-white underline underline-offset-2">Brooklyn</Link>, <Link href="/queens-maid-service" className="text-white underline underline-offset-2">Queens</Link>, <Link href="/long-island-maid-service" className="text-white underline underline-offset-2">Long Island</Link> &amp; <Link href="/new-jersey-maid-service" className="text-white underline underline-offset-2">New Jersey</Link>. No fake reviews, no cherry-picking &mdash; just honest feedback from people who chose us and keep coming back.
          </p>
        </div>
      </section>

      <VideoReviews />

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

      <CTABlock title="Book Your NYC Cleaning Service Today" subtitle="Trusted by New Yorkers since 2018. Text us to schedule your first cleaning." />
    </>
  )
}
