import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, tenantSiteUrl, getTenantAreas, getTenantServices, toSlug } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const tagline = tenant?.tagline || `Professional services by ${name}`
  const base = tenantSiteUrl(tenant)
  const url = base ? `${base}/about-the-nyc-maid-service-company` : undefined
  const title = `About ${name} | ${tagline}`
  const description = `${name} — ${tagline}. Reliable, background-checked team.${phone ? ` Call ${phone}.` : ''}`

  return {
    title: { absolute: title },
    description,
    ...(url && { alternates: { canonical: url } }),
    openGraph: { title, description, ...(url && { url }), type: 'website', siteName: name, locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function AboutPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const tagline = tenant?.tagline || `Professional services by ${name}`
  const industry = tenant?.industry || 'services'
  const base = tenantSiteUrl(tenant)
  const areas = tenant ? await getTenantAreas(tenant.id) : []
  const services = tenant ? await getTenantServices(tenant.id) : []

  const aboutFaqs = [
    { question: `How long has ${name} been in business?`, answer: `${name} has been serving clients for years with a commitment to quality and consistency. We've completed thousands of jobs and maintain strong customer ratings.` },
    { question: 'Are your team members employees or contractors?', answer: 'Our team members are independent professionals who work exclusively with us. Every team member is background-checked, trained on our quality standards, and covered by our general liability insurance while working on your property.' },
    { question: 'How do you keep prices affordable?', answer: 'We keep overhead low — no storefront, no middle-management layer, no expensive marketing budgets. We pass those savings to you. Our team earns competitive pay while you get fair rates.' },
    { question: `What makes ${name} different from competitors?`, answer: 'Three things: consistency (same team member every visit for recurring clients), affordability (honest rates with no surge pricing), and reliability (we show up on time, every time, and we don\'t cancel).' },
    { question: 'How many areas do you serve?', answer: areas.length > 0 ? `We serve ${areas.length}+ areas. Same rates everywhere — no travel surcharges.` : 'We serve a wide service area. Message us to confirm coverage.' },
    { question: 'How do I know I can trust your team?', answer: 'Every team member undergoes a comprehensive background check. We carry general liability insurance and bonding. We have a strong track record with verified customer reviews.' },
  ]

  const pageUrl = base ? `${base}/about-the-nyc-maid-service-company` : ''
  const description = `${name} — ${tagline}. Reliable, background-checked team.${phone ? ` Call ${phone}.` : ''}`

  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        ...(pageUrl ? [webPageSchema({ url: pageUrl, name: `About ${name}`, description, type: 'AboutPage', breadcrumb: [{ name: 'Home', url: base }, { name: 'About', url: pageUrl }] })] : []),
        localBusinessSchema(),
        howToBookSchema(),
        ...(pageUrl ? [breadcrumbSchema([{ name: 'Home', url: base }, { name: 'About', url: pageUrl }])] : []),
        faqSchema(aboutFaqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/60 text-sm">5-Star Rated &middot; Verified Reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            Affordable. Reliable. Friendly.
          </h1>
          <p className="text-blue-200/60 text-lg max-w-2xl mx-auto leading-relaxed">
            {name} — {tagline}. No gimmicks, no corporate nonsense — just honest, dependable {industry.toLowerCase()} from people who care.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: 'About', href: '/about-the-nyc-maid-service-company' }]} />
      </div>

      {/* Our Story — two column */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
            <div className="lg:col-span-3">
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Our Story</h2>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand)] tracking-wide leading-tight mb-6">Built on a Simple Idea: Show Up, Do Great Work, Charge Fair Prices</p>
              <div className="space-y-5 text-gray-600 leading-relaxed">
                <p>
                  We started {name} because we were frustrated with how the {industry.toLowerCase()} industry treated people. Prices were inflated, quality was inconsistent, and companies treated workers and clients like numbers. We knew there had to be a better way.
                </p>
                <p>
                  Our approach was simple from day one: hire great people, pay them well, charge honest prices, and show up on time. No surge pricing when demand is high. No bait-and-switch quotes. No cancelling on clients because a higher-paying job came in. Just reliable, thorough work from people who genuinely take pride in what they do.
                </p>
                <p>
                  That approach has earned us a strong reputation, thousands of completed jobs, and a loyal client base. Many of our clients have been with us for years — and they stay because we deliver the same quality every single visit.
                </p>
                {areas.length > 0 && (
                  <p>
                    Today we serve {areas.length}+ areas. Our team is background-checked, licensed, and insured.
                  </p>
                )}
              </div>
            </div>

            {/* Right — stats */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-6">By the Numbers</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">5.0</p>
                    <p className="text-gray-500 text-sm">Customer rating</p>
                  </div>
                  {areas.length > 0 && (
                    <div>
                      <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">{areas.length}+</p>
                      <p className="text-gray-500 text-sm">Areas served</p>
                    </div>
                  )}
                  {services.length > 0 && (
                    <div>
                      <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">{services.length}</p>
                      <p className="text-gray-500 text-sm">Service types</p>
                    </div>
                  )}
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">24/7</p>
                    <p className="text-gray-500 text-sm">Booking support</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand)] rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-5">What We Believe</h3>
                <ul className="space-y-4">
                  {[
                    'Team members deserve fair pay and respect',
                    'Clients deserve honest, predictable pricing',
                    'Consistency matters more than one-time perfection',
                    'A friendly face is worth as much as a great result',
                    'Reliability is the most underrated quality in any industry',
                  ].map(belief => (
                    <li key={belief} className="flex items-start gap-3">
                      <span className="text-[var(--brand-accent)] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                      <span className="text-blue-100/70 text-sm leading-relaxed">{belief}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core values — 6 cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">What Sets Us Apart</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-12">Why Clients Trust {name}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Truly Affordable', detail: 'Our rates are honest and competitive. No surge pricing, no hidden fees, no travel charges — same rate across all our service areas.' },
              { title: 'Reliably On Time', detail: 'We show up when we say we will. Period. We don\'t cancel, we don\'t reschedule last-minute, and we don\'t ghost. Our team is punctual and our scheduling confirms every appointment.' },
              { title: 'Consistent Quality', detail: 'For recurring clients, we assign the same team member every visit. They learn your property, your preferences, and your standards. The result is consistent, reliable quality — not a different stranger every time.' },
              { title: 'Friendly People', detail: 'Our team is warm, respectful, and professional. Many of our 5-star reviews mention how friendly and pleasant our team is. We hire for character first, then train for skill.' },
              { title: 'Licensed & Insured', detail: 'Full general liability insurance and bonding on every job. Every team member is background-checked before their first assignment. Your property, your belongings, and your peace of mind are protected.' },
              { title: 'No Contracts', detail: 'Book when you want, cancel when you want. No long-term commitments, no cancellation penalties for recurring service (with proper notice), and no pressure to upsell or upgrade.' },
            ].map(item => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-7 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How we work — dark section */}
      <section className="py-16 bg-gradient-to-b from-[var(--brand)] to-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-[var(--brand-accent)]/60 tracking-[0.25em] uppercase mb-3 text-center">How We Work</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-4">The {name} Difference</p>
          <p className="text-blue-200/50 text-center max-w-2xl mx-auto mb-12">Here&apos;s what happens when you book with us — no surprises, no fine print.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">For One-Time Service</h3>
              <div className="space-y-3">
                {[
                  'You text or call with your details',
                  'We quote a time estimate (not a flat fee — you pay hourly)',
                  'We assign a team member experienced with your property type',
                  'Team member arrives on time, completes the work thoroughly',
                  'You pay after, when you\'re satisfied',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="font-[family-name:var(--font-bebas)] text-lg text-[var(--brand-accent)]/40 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-blue-100/70 text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">For Recurring Clients</h3>
              <div className="space-y-3">
                {[
                  'Same team member assigned to your property every visit',
                  'They learn your preferences and priorities',
                  'Set schedule — same day, same time each week/month',
                  'We text when the team member is on the way',
                  'Pay after each visit — no auto-billing',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="font-[family-name:var(--font-bebas)] text-lg text-[var(--brand-accent)]/40 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-blue-100/70 text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service areas */}
      {areas.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Where We Serve</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-10">{areas.length}+ Areas, One Flat Rate</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {areas.map(area => (
                <Link
                  key={area}
                  href={`/${toSlug(area)}`}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-[var(--brand-accent)] hover:shadow-sm transition-all"
                >
                  <p className="font-[family-name:var(--font-bebas)] text-lg text-[var(--brand)] tracking-wide">{area}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Common Questions</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-12">About {name}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {aboutFaqs.map(faq => (
              <div key={faq.question}>
                <h3 className="font-semibold text-[var(--brand)] mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABlock title="Ready to See the Difference?" subtitle="Text or call — affordable, reliable, friendly service from day one." phone={phone} />
    </>
  )
}
