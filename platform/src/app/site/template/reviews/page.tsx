import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, localBusinessSchema, buildBusiness } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'
import CTABlock from '@/app/site/template/_components/CTABlock'
import VideoReviews from '@/app/site/template/_components/VideoReviews'
import ReviewsList from './ReviewsList'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { reviewsContent } from '@/app/site/template/_lib/content/longform'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = reviewsContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/reviews` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/reviews` },
  }
}

export default async function ReviewsPage() {
  const config = await getSiteConfig()
  const profile = industryProfile(config.industry)

  // Cleaning tenants keep the existing editorial reviews page (NYC-Maid video
  // testimonials, cleaning-slug links). Untouched to avoid regressing the live
  // cleaning site.
  if (profile.isCleaning) {
    return (
      <>
        <JsonLd data={[
          localBusinessSchema(buildBusiness(config)),
          breadcrumbSchema([
            { name: 'Home', url: config.identity.url },
            { name: 'Reviews', url: `${config.identity.url}/reviews` },
          ]),
        ]} />

        <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-20 md:py-28">
          <div className="max-w-5xl mx-auto px-4">
            <p className="text-xs font-semibold text-blue-200/50 tracking-[0.25em] uppercase mb-4">50+ Verified 5-Star Reviews</p>
            <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
              Real Reviews From Real NYC Cleaning Clients
            </h1>
            <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed">
              Don&rsquo;t take our word for it &mdash; hear directly from the families, professionals, and New Yorkers who trust us to clean their homes every week. These are verified reviews from real <Link href="/services/apartment-cleaning-service-in-nyc" className="text-white underline underline-offset-2">apartment cleaning</Link>, <Link href="/services/deep-cleaning-service-in-nyc" className="text-white underline underline-offset-2">deep cleaning</Link>, and <Link href="/services/weekly-maid-service-in-nyc" className="text-white underline underline-offset-2">weekly maid service</Link> clients across <Link href="/manhattan-maid-service" className="text-white underline underline-offset-2">Manhattan</Link>, <Link href="/brooklyn-maid-service" className="text-white underline underline-offset-2">Brooklyn</Link>, <Link href="/queens-maid-service" className="text-white underline underline-offset-2">Queens</Link>, the <Link href="/bronx-maid-service" className="text-white underline underline-offset-2">Bronx</Link>, <Link href="/staten-island-maid-service" className="text-white underline underline-offset-2">Staten Island</Link>, <Link href="/long-island-maid-service" className="text-white underline underline-offset-2">Long Island</Link>, <Link href="/westchester-maid-service" className="text-white underline underline-offset-2">Westchester</Link> &amp; <Link href="/new-jersey-maid-service" className="text-white underline underline-offset-2">New Jersey</Link>. No fake reviews, no cherry-picking &mdash; just honest feedback from people who chose us and keep coming back.
            </p>
          </div>
        </section>

        <VideoReviews />

        <div className="max-w-7xl mx-auto px-4 py-12">
          <Breadcrumbs items={[{ name: 'Reviews', href: '/reviews' }]} />
          <ReviewsList />
          <div className="text-center mt-12 mb-8">
            <p className="text-gray-500 mb-4">Had a great experience? We&apos;d love to hear from you.</p>
            <Link href="https://g.page/r/CSX9IqciUG9SEAE/review" className="inline-block bg-[var(--brand)] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-[var(--brand-alt)] transition-colors">
              Write a Review
            </Link>
          </div>
        </div>

        <CTABlock title="Book Your NYC Cleaning Service Today" subtitle="Trusted by New Yorkers since 2018. Text us to schedule your first cleaning." />
      </>
    )
  }

  // Non-cleaning tenants: config-driven reviews page — real per-tenant review
  // list (ReviewsList reads /api/reviews) + long-form reputation content. No
  // cleaning video testimonials, no NYC-slug links, no hardcoded Google place.
  const c = reviewsContent(config)
  const smsHref = `sms:${config.contact.phoneDigits}`
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.identity.name,
    url: `${config.identity.url}/reviews`,
    telephone: config.contact.phone,
    ...(config.reviewCount
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: config.rating.toFixed(1), reviewCount: config.reviewCount } }
      : {}),
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />

      <section className="bg-[var(--brand)] text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.25em] uppercase mb-4">Reviews</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl tracking-wide leading-[0.95] mb-6">{c.h1}</h1>
          <p className="text-white/75 text-lg md:text-xl max-w-2xl">{c.intro}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <ReviewsList />
      </div>

      <article className="max-w-3xl mx-auto px-6 pb-16 md:pb-24">
        {c.sections.map((section, i) => (
          <section key={i} className={i > 0 ? 'mt-14' : ''}>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">{section.heading}</h2>
            <div className="space-y-4">
              {section.paragraphs.map((para, j) => (
                <p key={j} className="text-gray-600 text-[17px] leading-relaxed">{para}</p>
              ))}
            </div>
          </section>
        ))}
        <section className="mt-16 pt-12 border-t border-gray-200">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-8">Common Questions</h2>
          <div className="space-y-6">
            {c.faq.map((f, i) => (
              <div key={i}>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">{f.q}</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </article>

      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide mb-4">See the Difference for Yourself</h2>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">Give us one job and judge us on it — the way nearly all of our long-term clients started.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={smsHref} className="inline-flex items-center bg-[var(--brand)] text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">Text {config.contact.phone}</a>
            <Link href="/contact" className="inline-flex items-center bg-[var(--accent)] text-[var(--brand)] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">Contact us</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
