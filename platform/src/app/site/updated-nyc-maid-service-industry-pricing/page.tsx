import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, getTenantServices, tenantSiteUrl, toSlug } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const url = `${base}/updated-nyc-maid-service-industry-pricing`
  const title = `Pricing | ${name}`
  const description = `Transparent pricing from ${name}. No hidden fees.${phone ? ` Call ${phone}.` : ''}`

  return {
    title: { absolute: title },
    description,
    ...(base && { alternates: { canonical: url } }),
    openGraph: { title, description, ...(base && { url }), type: 'website', siteName: name, locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PricingPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const email = tenant?.email || ''
  const zelleEmail = (tenant?.zelle_email as string | undefined) || email
  const base = tenantSiteUrl(tenant)
  const url = `${base}/updated-nyc-maid-service-industry-pricing`
  const services = tenant ? await getTenantServices(tenant.id) : []

  const selenaConfig = tenant?.selena_config as Record<string, unknown> | undefined
  const pricingTiers = (selenaConfig?.pricing_tiers as Array<{ label?: string; price?: string; features?: string[] }> | undefined) || []

  const payMethods = zelleEmail ? `cash, Venmo, Zelle (${zelleEmail}), and credit card` : 'cash, Venmo, and credit card'

  const pricingFaqs = [
    { question: 'How much does service cost?', answer: `${name} provides a custom quote based on your property size, service type, and specific needs. Reach out for a free upfront estimate.` },
    { question: 'Do you charge by the hour or by the job?', answer: 'We charge by the hour at a flat rate. The total cost depends on how long the job takes, which we estimate upfront.' },
    { question: 'Is there a minimum charge?', answer: 'Our minimum booking is 2 hours. Most jobs take 2–6+ hours depending on size and service type.' },
    { question: 'Do you charge extra for travel or different areas?', answer: 'No. Every area we serve gets the same flat hourly rate. No travel surcharges, no surge pricing.' },
    { question: 'Do I pay before or after the service?', answer: `After. We never charge upfront or take deposits. You pay only after the service is complete, before our team member leaves. We accept ${payMethods}.` },
    { question: 'What payment methods do you accept?', answer: `${payMethods.charAt(0).toUpperCase() + payMethods.slice(1)}. Payment is collected after the service is complete. No deposits, no pre-authorization holds.` },
    { question: 'Do you offer discounts for recurring service?', answer: 'Our hourly rate stays the same for recurring service, but recurring jobs take less time because your property stays consistently maintained.' },
    { question: 'Is there a cancellation fee?', answer: 'For one-time services, we have a no-cancellation policy once confirmed. For recurring services, we require 7 days notice to cancel and 3 days notice to reschedule.' },
    { question: 'Do you offer free estimates?', answer: `Yes.${phone ? ` Text or call ${phone}` : ' Reach out'} with your address, property size, and service type and we\'ll provide a custom quote within minutes.` },
    { question: 'Are you insured?', answer: 'Yes. We carry general liability insurance and bonding. Every team member is covered while working on your property.' },
    { question: 'How long does a typical job take?', answer: 'It depends on the service type and property size. We estimate the time upfront so you know the approximate cost before we start.' },
    { question: 'Can I get a quote without booking?', answer: `Absolutely.${phone ? ` Text ${phone}` : ' Reach out'} with your property details and we\'ll send a quote. No commitment required.` },
  ]

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          ...(base ? [{ name: 'Home', url: base }] : []),
          { name: 'Pricing', url },
        ]),
        faqSchema(pricingFaqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] pt-14 md:pt-20 pb-0">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            Simple, Honest Pricing
          </h1>
          <p className="text-blue-200/60 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Flat rates across every area we serve. No hidden fees, no surge pricing, no surprises. You pay after the job is done.
          </p>
        </div>

        {pricingTiers.length > 0 && (
          <div className="border-t border-white/10 bg-white/[0.04]">
            <div className="max-w-5xl mx-auto px-4 py-10">
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(pricingTiers.length, 3)} gap-6`}>
                {pricingTiers.slice(0, 3).map((tier, i) => {
                  const featured = i === 1
                  return (
                    <div key={i} className={featured ? 'bg-[var(--brand-accent)] rounded-2xl p-7 text-center relative' : 'bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center'}>
                      {featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--brand)] text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1 rounded-full">Most Popular</span>}
                      {tier.label && <p className={`text-xs font-semibold ${featured ? 'text-[var(--brand)]/50' : 'text-[var(--brand-accent)]/60'} tracking-[0.2em] uppercase mb-3`}>{tier.label}</p>}
                      {tier.price && <p className={`font-[family-name:var(--font-bebas)] text-6xl ${featured ? 'text-[var(--brand)]' : 'text-white'} tracking-wide leading-none`}>{tier.price}</p>}
                      <div className={`w-10 h-[2px] ${featured ? 'bg-[var(--brand)]/20' : 'bg-[var(--brand-accent)]/30'} mx-auto my-5`} />
                      {tier.features && (
                        <ul className="space-y-2.5 text-left">
                          {tier.features.map(f => (
                            <li key={f} className="flex items-start gap-2.5">
                              <span className={`${featured ? 'text-[var(--brand)]' : 'text-[var(--brand-accent)]'} mt-0.5 flex-shrink-0`}>&#10003;</span>
                              <span className={`${featured ? 'text-[var(--brand)]/80' : 'text-blue-100/70'} text-sm`}>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-center mt-8">
                <a href="/chat-with-selena" className="bg-[var(--brand-accent)] text-[var(--brand)] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                  Chat With Selena
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: 'Pricing', href: '/updated-nyc-maid-service-industry-pricing' }]} />
      </div>

      {/* Pricing guarantees */}
      <section className="pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'No Hidden Fees', detail: 'The quote you get is the price you pay' },
              { label: 'Pay After', detail: 'Never upfront — pay when the job is done' },
              { label: 'No Contracts', detail: 'Cancel recurring service anytime' },
              { label: 'Same Rate Everywhere', detail: 'Every area — same price' },
            ].map(g => (
              <div key={g.label} className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center">
                <p className="font-[family-name:var(--font-bebas)] text-lg text-[var(--brand)] tracking-wide mb-1">{g.label}</p>
                <p className="text-gray-500 text-xs">{g.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service pricing grid */}
      {services.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">By Service Type</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">What Does Each Service Cost?</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">All services use the same hourly rate. The total cost depends on the time required, which varies by service type and property size.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service: Record<string, unknown>) => {
                const sName = (service.name as string) || ''
                const description = (service.description as string) || ''
                const priceRange = (service.price_range as string) || ''
                return (
                  <Link
                    key={sName}
                    href={`/services/${toSlug(sName)}`}
                    className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide group-hover:text-[var(--brand)]/70 transition-colors">{sName}</h3>
                    </div>
                    {priceRange && <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-1">{priceRange}</p>}
                    {description && <p className="text-gray-500 text-xs mb-4">{description}</p>}
                    <span className="text-[var(--brand)] text-sm font-medium group-hover:underline underline-offset-4">Full details &rarr;</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* What affects price */}
      <section className="py-16 bg-gradient-to-b from-[var(--brand)] to-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-[var(--brand-accent)]/60 tracking-[0.25em] uppercase mb-3 text-center">Pricing Factors</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">What Affects Your Final Price?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', t: 'Property Size', d: 'Larger properties take longer to service. We quote the time upfront.' },
              { n: '02', t: 'Service Type', d: 'Deeper services take longer than standard maintenance. More time means higher total at the same hourly rate.' },
              { n: '03', t: 'Current Condition', d: 'A property that hasn\'t been serviced in a while needs more attention on the first visit. Recurring visits are faster.' },
              { n: '04', t: 'Scope of Work', d: 'We adjust the scope to your specific needs — you only pay for the work you want done.' },
            ].map(item => (
              <div key={item.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand-accent)]/30 leading-none">{item.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{item.t}</p>
                <p className="text-blue-200/50 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book in 3 Steps */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-12">Get a Quote in 3 Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: `Reach us${phone ? ` at ${phone}` : ''} with your address, property size, and what type of service you need.` },
              { n: '02', t: 'Get Your Quote', d: 'We\'ll reply with a custom quote based on your property\'s size, condition, and service type — usually within 15 minutes.' },
              { n: '03', t: 'Pay After', d: `We perform the service, you inspect, you pay. No deposits, no upfront charges. ${payMethods.charAt(0).toUpperCase() + payMethods.slice(1)}.` },
            ].map(s => (
              <div key={s.n} className="border border-gray-200 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[var(--brand-accent)] leading-none">{s.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mt-3 mb-2">{s.t}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <a href="/chat-with-selena" className="bg-[var(--brand)] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-colors">
              Chat With Selena
            </a>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Common Questions</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-12">Pricing FAQ</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {pricingFaqs.map(faq => (
              <div key={faq.question}>
                <h3 className="font-semibold text-[var(--brand)] mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABlock title="Get Your Free Custom Quote" subtitle="Text or call — we'll reply with a personalized quote within minutes." phone={phone} />
    </>
  )
}
