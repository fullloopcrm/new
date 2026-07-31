import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/app/site/wash-and-fold-nyc/_components/marketing/JsonLd'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import { breadcrumbSchema, reviewSchemas } from '@/app/site/wash-and-fold-nyc/_lib/seo/schema'
import { getTenantFromHeaders, getPublicReviewsForSchema } from '@/lib/tenant-site'
import ReviewsList from './ReviewsList'

export const metadata: Metadata = {
  title: 'NYC Wash and Fold Reviews | The NYC Wash and Fold Service Company',
  description: 'Read reviews from real NYC Wash and Fold Service Company customers. $3/lb wash & fold laundry service with free pickup & delivery. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/reviews' },
  openGraph: {
    title: 'The NYC Wash and Fold Service Company Reviews',
    description: 'Real reviews from real NYC customers. $3/lb wash & fold with free pickup & delivery.',
    url: 'https://www.washandfoldnyc.com/reviews',
  },
}

export default async function ReviewsPage() {
  // Real, publicly-approved reviews only -- same filter /api/reviews applies
  // for anonymous visitors, so the Review JSON-LD below always matches what
  // ReviewsList actually renders. No fabricated fallback data.
  let liveReviews: Awaited<ReturnType<typeof getPublicReviewsForSchema>> = []
  try {
    const tenant = await getTenantFromHeaders()
    if (tenant) liveReviews = await getPublicReviewsForSchema(tenant.id)
  } catch {
    liveReviews = []
  }

  return (
    <>
      <JsonLd data={[
        ...reviewSchemas(liveReviews),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.washandfoldnyc.com' },
          { name: 'Reviews', url: 'https://www.washandfoldnyc.com/reviews' },
        ]),
      ]} />

      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7EC8E3] tracking-[0.25em] uppercase mb-4">Customer Reviews</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-6">
            Real Reviews From Real NYC Laundry Customers
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mx-auto mb-8">
            Read what our customers say about our $3/lb wash &amp; fold laundry service with free pickup &amp; delivery. No fake reviews, no cherry-picking &mdash; just honest feedback.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <ReviewsList />

          <div className="text-center mt-12">
            <p className="text-gray-500 mb-4">Had a great experience? We&apos;d love to hear from you.</p>
            <Link href="sms:9179706002" className="inline-block bg-[#1a3a5c] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-[#2B7BB0] transition-colors">
              Text Us a Review
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-4">Why Customers Stay</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white mb-2">$3/lb</p>
              <p className="text-sky-200/60 text-sm">Transparent pricing with zero hidden fees. Same rate across all neighborhoods.</p>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white mb-2">Free Pickup</p>
              <p className="text-sky-200/60 text-sm">Free pickup and delivery on every order. No delivery fee, no fuel surcharge.</p>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white mb-2">Real Humans</p>
              <p className="text-sky-200/60 text-sm">Text <Link href="sms:9179706002" className="text-[#7EC8E3] underline underline-offset-2">(917) 970-6002</Link> and talk to an actual person, not a chatbot.</p>
            </div>
          </div>
        </div>
      </section>

      <CTABlock title="Book Your NYC Wash and Fold Today" subtitle="Text (917) 970-6002 to schedule your first pickup — $3/lb, free pickup & delivery across Manhattan, Brooklyn & Queens." />
    </>
  )
}
