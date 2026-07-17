import type { Metadata } from 'next'
import { localBusinessSchema, breadcrumbSchema, buildBusiness } from '@/app/site/template/_lib/seo/schema'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { toBrand } from '@/app/site/template/_lib/seo/brand'
import JsonLd from '@/app/site/template/_components/JsonLd'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'
import ReviewForm from './ReviewForm'

export async function generateMetadata(): Promise<Metadata> {
  const brand = toBrand(await getSiteConfig())
  return {
    title: `Leave a Review | ${brand.name}`,
    description: `Share your experience with ${brand.name}. Your honest feedback helps other New Yorkers find trusted, reliable cleaning services.`,
    alternates: { canonical: '/reviews/submit' },
    openGraph: {
      title: `Leave a Review | ${brand.name}`,
      description: `Share your experience with ${brand.name} cleaning service.`,
      url: `${brand.url}/reviews/submit`,
    },
  }
}

export default async function ReviewSubmitPage() {
  const biz = buildBusiness(await getSiteConfig())
  return (
    <>
      <JsonLd data={[
        localBusinessSchema(biz),
        breadcrumbSchema([
          { name: 'Home', url: biz.url },
          { name: 'Reviews', url: `${biz.url}/reviews` },
          { name: 'Leave a Review', url: `${biz.url}/reviews/submit` },
        ]),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="text-yellow-400 text-sm">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/70 text-sm font-medium">5.0 Average Rating</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            How Was Your Cleaning?
          </h1>
          <p className="text-blue-200/80 text-lg max-w-xl mx-auto leading-relaxed">
            Your honest feedback helps us improve and helps other New Yorkers find cleaning services they can trust. Share a written review, upload photos, or record a video — every review matters.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Reviews', href: '/reviews' },
          { name: 'Leave a Review', href: '/reviews/submit' },
        ]} />
        <ReviewForm />
      </div>
    </>
  )
}
