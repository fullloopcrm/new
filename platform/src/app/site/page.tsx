import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/site/JsonLd'
import ServiceGrid from '@/components/site/ServiceGrid'
import TrustBadges from '@/components/site/TrustBadges'
import CTABlock from '@/components/site/CTABlock'
import FAQSection from '@/components/site/FAQSection'
import HeroChat from '@/components/site/HeroChat'
import { getTenantFromHeaders, getTenantServices, getTenantAreas, getTenantReviews, toSlug } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const tagline = tenant?.tagline || `Professional services by ${name}`
  const url = tenant?.website_url || (tenant?.slug ? `https://${tenant.slug}.fullloopcrm.com` : '')

  return {
    title: { absolute: `${name} — ${tagline}` },
    description: `${tagline}. ${phone ? `Call ${phone}.` : ''}`,
    ...(url && { alternates: { canonical: url } }),
    openGraph: {
      title: `${name} — ${tagline}`,
      description: `${tagline}. ${phone ? `Call ${phone}.` : ''}`,
      ...(url && { url }),
      siteName: name,
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — ${tagline}`,
      description: `${tagline}. ${phone ? `Call ${phone}.` : ''}`,
    },
    other: {
      'format-detection': 'telephone=yes',
    },
  }
}

export default async function HomePage() {
  const tenant = await getTenantFromHeaders()
  const services = tenant ? await getTenantServices(tenant.id) : []
  const areas = tenant ? await getTenantAreas(tenant.id) : []
  const reviews = tenant ? await getTenantReviews(tenant.id) : []

  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const email = tenant?.email || ''
  const tagline = tenant?.tagline || `Professional services by ${name}`
  const industry = tenant?.industry || 'services'

  // Build area links for the areas section
  const areaLinks = areas.map(a => ({
    name: a,
    href: `/${toSlug(a)}`,
  }))

  // Build service data for ServiceGrid
  const serviceItems = services.map((s: { name: string; id: string; description?: string; price_range?: string }) => ({
    name: s.name,
    slug: toSlug(s.name),
    description: (s as Record<string, unknown>).description as string | undefined,
    price_range: (s as Record<string, unknown>).price_range as string | undefined,
  }))

  // Review colors for avatar backgrounds
  const avatarColors = [
    'bg-emerald-400', 'bg-indigo-500', 'bg-slate-500', 'bg-purple-500',
    'bg-amber-400', 'bg-violet-400', 'bg-cyan-400', 'bg-lime-500',
    'bg-fuchsia-400', 'bg-yellow-500', 'bg-red-400', 'bg-green-400',
    'bg-blue-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  ]

  return (
    <>
      {/* Hero with Selena chat */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] pt-12 md:pt-16 pb-14 md:pb-20" style={{ '--tw-gradient-to': 'color-mix(in srgb, var(--brand) 85%, white)' } as React.CSSProperties}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Social proof bar */}
          {reviews.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <span className="text-blue-200/70 text-sm font-medium">5-Star Rated</span>
              </div>
              <span className="text-white/20 hidden sm:inline">|</span>
              <span className="text-blue-200/70 text-sm font-medium">Trusted &amp; Insured</span>
            </div>
          )}

          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-white tracking-wide leading-[0.95] mb-3">
            {tagline}
          </h1>

          {/* Trust points */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; No money upfront</span>
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; Payment upon completion</span>
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; No contracts</span>
          </div>

          {/* Divider */}
          <div className="w-3/4 h-[1px] bg-white/20 mb-5" />

          {/* Selena intro */}
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide mb-1">Book Instantly With Selena (Avg 30 Seconds)</p>
          <p className="text-blue-200/70 text-sm mb-4 max-w-[75%]">Our AI booking concierge — pricing, availability, scheduling in seconds. Prefer to {phone ? <><a href={`tel:${phoneDigits}`} className="text-[var(--brand-accent)] font-semibold underline underline-offset-2 hover:text-white transition-colors">call</a>, <a href={`sms:${phoneDigits}`} className="text-[var(--brand-accent)] font-semibold underline underline-offset-2 hover:text-white transition-colors">text</a></> : 'call or text'}{email ? <>, or <a href={`mailto:${email}`} className="text-[var(--brand-accent)] font-semibold underline underline-offset-2 hover:text-white transition-colors">email</a></> : null}? We&apos;re there too.</p>

          {/* Selena Chat */}
          <div className="mb-14 max-w-2xl">
            <HeroChat phone={phone} />
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left — story */}
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Trusted {industry} Company</p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide leading-tight mb-4">Welcome to {name}</h2>
              <div className="w-12 h-[2px] bg-[var(--brand-accent)] mb-6" />
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                We&apos;re a dedicated team that treats every client like our own. Experienced, professional staff who show up on time, do beautiful work, and earn your trust visit after visit.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                Every team member is background-checked, insured, and paid fairly. We don&apos;t cut corners — on your space or on our people.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/about" className="inline-block bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-colors">
                  Learn More About Us
                </Link>
                {phone && (
                  <>
                    <a href={`sms:${phoneDigits}`} className="inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                      Text Us
                    </a>
                    <a href={`tel:${phoneDigits}`} className="text-[var(--brand)] font-semibold hover:underline underline-offset-4">
                      or Call {phone}
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Right — at a glance */}
            <div className="space-y-6">
              <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-5">{name} at a Glance</h3>
                <div className="grid grid-cols-2 gap-6">
                  {reviews.length > 0 && (
                    <div>
                      <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">5.0</p>
                      <p className="text-gray-500 text-sm">Google Rating</p>
                    </div>
                  )}
                  {areas.length > 0 && (
                    <div>
                      <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">{areas.length}+</p>
                      <p className="text-gray-500 text-sm">Service Areas</p>
                    </div>
                  )}
                  {services.length > 0 && (
                    <div>
                      <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">{services.length}</p>
                      <p className="text-gray-500 text-sm">Services Offered</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-5">What You Can Expect</h3>
                <ul className="space-y-3.5">
                  {[
                    'Background-checked, insured, and professionally trained',
                    'No money upfront — pay only after your service is done',
                    'No contracts, no commitments — stay because you\'re happy',
                    'Transparent pricing with zero hidden fees',
                    'Responsive support — reach us anytime',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-[var(--brand-accent)] mt-0.5 text-lg">&#10003;</span>
                      <span className="text-gray-700 text-[15px]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews */}
      {reviews.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Real Reviews From Verified Customers</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-4">What Our Clients Say</h2>
            <p className="text-gray-500 text-center max-w-3xl mx-auto mb-12">
              Every review is from a verified customer. See why clients trust {name}.
            </p>

            {/* Review cards grid */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[#4285F4] font-semibold text-lg">G</span>
                    <span className="text-[#EA4335] font-semibold text-lg">o</span>
                    <span className="text-[#FBBC05] font-semibold text-lg">o</span>
                    <span className="text-[#4285F4] font-semibold text-lg">g</span>
                    <span className="text-[#34A853] font-semibold text-lg">l</span>
                    <span className="text-[#EA4335] font-semibold text-lg">e</span>
                  </div>
                  <span className="text-gray-900 font-semibold text-base sm:text-lg">Reviews</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-gray-900 font-bold text-xl sm:text-2xl">5.0</span>
                  <span className="text-yellow-400 text-base sm:text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-gray-400 text-xs sm:text-sm">({reviews.length})</span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                            <p className="text-sm font-semibold text-gray-900 truncate">{reviewerName}</p>
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

            <div className="text-center mt-10">
              <Link href="/reviews" className="text-[var(--brand)] font-semibold hover:underline underline-offset-4">Read All Reviews &rarr;</Link>
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-[var(--brand)] to-[var(--brand)]">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs font-semibold text-[var(--brand-accent)]/70 tracking-[0.25em] uppercase mb-3 text-center">Professional {industry} Services</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide text-center mb-4">Our Services</h2>
            <p className="text-blue-200/60 text-center max-w-3xl mx-auto mb-14">
              Browse our full range of {industry.toLowerCase()} services. All team members are background-checked, licensed, and insured.
            </p>
            <ServiceGrid services={serviceItems} />
            <div className="text-center mt-10">
              <Link href="/services" className="text-[var(--brand-accent)] font-semibold hover:underline underline-offset-4">Browse All Services &rarr;</Link>
            </div>
          </div>
        </section>
      )}

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Insured &amp; Licensed</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide leading-tight mb-6">Why Clients Trust {name}</h2>
            <div className="w-12 h-[2px] bg-[var(--brand-accent)] mb-6" />
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              We provide personalized service tailored to your needs. No contracts, no hidden fees, no surprises.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Every member of our team is fully background-checked and insured. We&apos;ve got you covered.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {phone && (
                <>
                  <a href={`sms:${phoneDigits}`} className="inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                    Text Us
                  </a>
                  <a href={`tel:${phoneDigits}`} className="inline-block text-[var(--brand)] font-semibold py-3.5 hover:underline underline-offset-4">
                    or Call {phone}
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-8">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-6">Background-Checked, Insured &amp; Rated</h3>
            <ul className="space-y-4">
              {[
                { icon: '\u{1F6E1}', text: 'Full general liability insurance and bonding on every visit' },
                { icon: '\u{1F4CB}', text: 'Every team member is thoroughly background-checked' },
                { icon: '\u2B50', text: 'Top-rated with verified customer reviews' },
                { icon: '\u{1F4B0}', text: 'Transparent pricing with no hidden fees' },
                { icon: '\u2705', text: 'Satisfaction guaranteed' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{item.icon}</span>
                  <span className="text-gray-700">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link href="/reviews" className="text-[var(--brand)] font-semibold text-sm hover:underline underline-offset-4">Read Our Customer Reviews &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      {reviews.length > 0 && (
        <section className="bg-[var(--brand-accent)] py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-xs font-semibold text-[var(--brand)]/50 tracking-[0.25em] uppercase mb-6">Real Reviews From Verified Customers</p>
            <p className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[var(--brand)] tracking-wide leading-relaxed mb-6">
              &ldquo;{(reviews[0] as Record<string, unknown>).text as string || (reviews[0] as Record<string, unknown>).comment as string || ''}&rdquo;
            </p>
            <p className="text-[var(--brand)]/70 font-medium tracking-wide">&mdash; {(reviews[0] as Record<string, unknown>).reviewer_name as string || 'Client'}</p>
            <div className="mt-8">
              <Link href="/reviews" className="text-[var(--brand)] font-semibold text-sm tracking-wide hover:underline underline-offset-4">Read All Reviews &rarr;</Link>
            </div>
          </div>
        </section>
      )}

      {/* Areas */}
      {areaLinks.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">{industry} Service Across All Our Areas</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-4">{areaLinks.length}+ Service Areas</h2>
            <p className="text-gray-500 text-center max-w-3xl mx-auto mb-14">
              Our insured, background-checked team is already in your neighborhood. Same rates everywhere, no travel fees.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-center">
              {areaLinks.map(area => (
                <Link
                  key={area.href}
                  href={area.href}
                  className="text-sm text-gray-600 hover:text-[var(--brand)] transition-colors py-2"
                >
                  {area.name}
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/areas" className="text-[var(--brand)] font-semibold hover:underline underline-offset-4">Browse All Service Areas &rarr;</Link>
            </div>
          </div>
        </section>
      )}

      {/* Referral CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Earn With Our Referral Program</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-4">Get Paid For Every Referral</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8">
            Refer friends, family, or neighbors to {name} and earn recurring commission on every booking they make.
          </p>
          <Link href="/referral" className="inline-block bg-[var(--brand)] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-colors">
            Join the Referral Program &rarr;
          </Link>
        </div>
      </section>

      <CTABlock
        title={`Book Your ${industry} Service Today`}
        subtitle={`Reach out today — trusted by clients across all our service areas.`}
        phone={phone}
      />
    </>
  )
}
