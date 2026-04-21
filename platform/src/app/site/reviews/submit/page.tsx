import type { Metadata } from 'next'
import { localBusinessSchema, breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import ReviewForm from './ReviewForm'

export const metadata: Metadata = {
  title: 'Leave a Review | The NYC Maid',
  description: 'Share your experience with The NYC Maid. Your honest feedback helps other New Yorkers find trusted, reliable cleaning services.',
  alternates: { canonical: 'https://www.thenycmaid.com/reviews/submit' },
  openGraph: {
    title: 'Leave a Review | The NYC Maid',
    description: 'Share your experience with The NYC Maid cleaning service.',
    url: 'https://www.thenycmaid.com/reviews/submit',
  },
}

export default function ReviewSubmitPage() {
  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Reviews', url: 'https://www.thenycmaid.com/reviews' },
          { name: 'Leave a Review', url: 'https://www.thenycmaid.com/reviews/submit' },
        ]),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-24">
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
