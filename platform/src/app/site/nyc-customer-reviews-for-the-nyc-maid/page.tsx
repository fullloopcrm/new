import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, getTenantReviews, tenantSiteUrl } from '@/lib/tenant-site'

const avatarColors = [
  'bg-emerald-400', 'bg-indigo-500', 'bg-slate-500', 'bg-purple-500',
  'bg-amber-400', 'bg-violet-400', 'bg-cyan-400', 'bg-lime-500',
  'bg-fuchsia-400', 'bg-yellow-500', 'bg-red-400', 'bg-green-400',
  'bg-blue-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  'bg-pink-400', 'bg-orange-400', 'bg-green-500', 'bg-teal-400',
  'bg-purple-400', 'bg-blue-400', 'bg-indigo-400', 'bg-rose-400',
  'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
]

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const title = `Customer Reviews | ${name}`
  const description = `Verified customer reviews for ${name}.${phone ? ` Call ${phone}.` : ''}`
  return {
    title,
    description,
    ...(base && { alternates: { canonical: `${base}/nyc-customer-reviews-for-the-nyc-maid` } }),
    openGraph: {
      title,
      description,
      ...(base && { url: `${base}/nyc-customer-reviews-for-the-nyc-maid` }),
    },
  }
}

export default async function ReviewsPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const reviews = tenant ? await getTenantReviews(tenant.id) : []

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        ...(base ? [{ name: 'Home', url: base }] : []),
        { name: 'Reviews', url: `${base}/nyc-customer-reviews-for-the-nyc-maid` },
      ])} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Customer Reviews — What Real Clients Say About {name}
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed">
            Verified reviews from real clients. No fake reviews, no cherry-picking — just honest feedback from customers who trust us.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Reviews', href: '/nyc-customer-reviews-for-the-nyc-maid' }]} />

        {reviews.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-8">
            {/* Widget header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[#4285F4] font-semibold text-lg">G</span>
                  <span className="text-[#EA4335] font-semibold text-lg">o</span>
                  <span className="text-[#FBBC05] font-semibold text-lg">o</span>
                  <span className="text-[#4285F4] font-semibold text-lg">g</span>
                  <span className="text-[#34A853] font-semibold text-lg">l</span>
                  <span className="text-[#EA4335] font-semibold text-lg">e</span>
                </div>
                <span className="text-gray-900 font-semibold text-lg">Reviews</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-bold text-2xl">5.0</span>
                  <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-gray-400 text-sm">({reviews.length})</span>
                </div>
              </div>
            </div>

            {/* Review cards grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reviews.map((review: Record<string, unknown>, i: number) => {
                  const reviewerName = (review.reviewer_name as string) || 'Client'
                  const initial = reviewerName.charAt(0).toUpperCase()
                  const color = avatarColors[i % avatarColors.length]
                  const text = (review.text as string) || (review.comment as string) || ''
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{reviewerName}</p>
                            <svg className="w-3.5 h-3.5 text-[#4285F4] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                          </div>
                        </div>
                      </div>
                      <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                      <p className="text-gray-700 text-sm leading-relaxed">{text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">Reviews coming soon.</div>
        )}

        {/* CTA below reviews */}
        <div className="text-center mt-12 mb-8">
          <p className="text-gray-500 mb-4">Had a great experience? We&apos;d love to hear from you.</p>
        </div>
      </div>

      <CTABlock title={`Book ${name} Today`} subtitle="Text or call to schedule your service." phone={phone} />
    </>
  )
}
