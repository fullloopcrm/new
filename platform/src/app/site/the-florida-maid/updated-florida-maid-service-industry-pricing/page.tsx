import type { Metadata } from 'next'
import Link from 'next/link'
import { SERVICES } from '@/app/site/the-florida-maid/_lib/seo/services'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, pricingOffersSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'

const url = 'https://www.thefloridamaid.com/updated-florida-maid-service-industry-pricing'
const title = 'Florida Cleaning Pricing From $49/hr | Transparent Rates | The Florida Maid'
const description = 'Transparent hourly cleaning rates across Florida. $49/hr your supplies, $65/hr we bring everything, $100/hr same-day. Over 25,000 homes served. 5.0★ rated, $1M insured. No hidden fees. (954) 710-3636'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: 'website', siteName: 'The Florida Maid', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title, description },
  other: { 'geo.region': 'US-FL', 'geo.placename': 'Florida', 'geo.position': '25.7617;-80.1918', 'ICBM': '25.7617, -80.1918' },
}

const pricingFaqs = [
  { question: 'How much does house cleaning cost in Florida?', answer: 'Our rates are $49/hr when you provide supplies, $65/hr when we bring everything, and $100/hr for same-day emergency service. A typical Florida home cleaning costs $98–$390 depending on size and service type. We provide a custom quote based on your specific needs.' },
  { question: 'Do you charge by the hour or by the job?', answer: 'We charge by the hour at a flat rate. $49/hr if you provide cleaning supplies, $65/hr if we bring our own professional-grade products and equipment. The total cost depends on how long your cleaning takes, which we estimate upfront based on your home size and service type.' },
  { question: 'Is there a minimum charge?', answer: 'Our minimum booking is 2 hours. For most studio and 1-bedroom regular cleanings, 2 hours is sufficient. Deep cleans and larger apartments typically require 3–6+ hours.' },
  { question: 'Do you charge extra for travel or different neighborhoods?', answer: 'No. Every neighborhood we serve — from Miami-Dade to Broward to Tampa Bay — gets the same flat hourly rate. No travel surcharges, no surge pricing, no zone fees.' },
  { question: 'What\'s the difference between $49/hr and $65/hr?', answer: 'At $49/hr, you provide the cleaning supplies and equipment (vacuum, mop, products). At $65/hr, we bring everything — professional-grade products, microfiber systems, and a commercial vacuum. The cleaning quality and thoroughness is identical.' },
  { question: 'How much does a deep cleaning cost?', answer: 'Deep cleaning typically costs $196–$390 for a standard Florida home. Studios run $196–$245, 1-bedrooms $245–$325, and 2-3 bedrooms $325–$390+. The exact price depends on square footage, condition, and whether you want us to bring supplies.' },
  { question: 'How much does move-in/move-out cleaning cost?', answer: 'Move-in/move-out cleaning runs $260–$520. These take 4–8 hours because we clean inside every cabinet, drawer, closet, and appliance. Empty apartments are easier to clean but require more detail work to be deposit-ready.' },
  { question: 'Do I pay before or after the cleaning?', answer: 'After. We never charge upfront or take deposits. You pay only after the cleaning is complete, before the cleaner leaves. We accept cash, Venmo, Zelle (hi@thefloridamaid.com), and credit card.' },
  { question: 'What payment methods do you accept?', answer: 'Cash, Venmo, Zelle (hi@thefloridamaid.com), and credit card (via Stripe). Payment is collected after the cleaning is complete. No deposits, no pre-authorization holds.' },
  { question: 'Do you offer discounts for recurring service?', answer: 'Our hourly rate stays the same for recurring service, but recurring cleanings take less time because your home stays consistently clean. A weekly client\'s cleaning might take 2 hours vs. 4 hours for a first-time deep clean — so you naturally pay less per visit.' },
  { question: 'Is there a cancellation fee?', answer: 'For one-time services, we have a no-cancellation policy once confirmed. For recurring services, we require 7 days notice to cancel and 3 days notice to reschedule. This protects our cleaners\' schedules and livelihoods.' },
  { question: 'Do you offer free estimates?', answer: 'Yes. Text or call (954) 710-3636 with your address, home size, and service type and we\'ll provide a custom quote within minutes. No obligation, no pressure.' },
  { question: 'Are your cleaners insured?', answer: 'Yes. We carry general liability insurance and bonding. Every cleaner is covered while working in your home. If anything is accidentally damaged, we handle it through our insurance.' },
  { question: 'How long does a typical cleaning take?', answer: 'Regular home cleaning: 2–4 hours. Deep cleaning: 3–6 hours. Move-in/out: 4–8 hours. Post-construction: 5–10 hours. We estimate the time upfront so you know the approximate cost before we start.' },
  { question: 'Can I get a quote without booking?', answer: 'Absolutely. Text (954) 710-3636 with your home details and we\'ll send a quote. No commitment required. Most quotes are delivered within 15 minutes.' },
]

export default function PricingPage() {
  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({ url, name: title, description, breadcrumb: [{ name: 'Home', url: 'https://www.thefloridamaid.com' }, { name: 'Pricing', url }] }),
        localBusinessSchema(),
        pricingOffersSchema(),
        howToBookSchema(),
        breadcrumbSchema([{ name: 'Home', url: 'https://www.thefloridamaid.com' }, { name: 'Pricing', url }]),
        faqSchema(pricingFaqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] pt-14 md:pt-20 pb-0">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-white text-sm">5.0 on Google &middot; 27 verified reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            Simple, Honest Cleaning Prices
          </h1>
          <p className="text-white text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Flat hourly rates across every neighborhood we serve. No hidden fees, no surge pricing, no surprises. You pay after the cleaning is done.
          </p>
        </div>

        {/* Three pricing tiers — anchored to bottom of hero */}
        <div className="border-t border-white/10 bg-white/[0.04]">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tier 1 */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                <p className="text-xs font-semibold text-[#34D399]/60 tracking-[0.2em] uppercase mb-3">Your Supplies</p>
                <p className="font-[family-name:var(--font-bebas)] text-6xl text-white tracking-wide leading-none">$49<span className="text-2xl text-white/60">/hr</span></p>
                <div className="w-10 h-[2px] bg-[#34D399]/30 mx-auto my-5" />
                <ul className="space-y-2.5 text-left">
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">You provide cleaning supplies</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">You provide vacuum and mop</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">Same quality cleaning</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">Licensed &amp; insured cleaner</span></li>
                </ul>
              </div>

              {/* Tier 2 — featured */}
              <div className="bg-[#34D399] rounded-2xl p-7 text-center relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#CC6222] text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1 rounded-full">Most Popular</span>
                <p className="text-xs font-semibold text-[#CC6222]/50 tracking-[0.2em] uppercase mb-3">We Bring Everything</p>
                <p className="font-[family-name:var(--font-bebas)] text-6xl text-[#CC6222] tracking-wide leading-none">$65<span className="text-2xl text-[#CC6222]/40">/hr</span></p>
                <div className="w-10 h-[2px] bg-[#CC6222]/20 mx-auto my-5" />
                <ul className="space-y-2.5 text-left">
                  <li className="flex items-start gap-2.5"><span className="text-[#CC6222] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-[#CC6222]/80 text-sm">Pro-grade cleaning products</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#CC6222] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-[#CC6222]/80 text-sm">Commercial vacuum included</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#CC6222] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-[#CC6222]/80 text-sm">Microfiber systems &amp; tools</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#CC6222] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-[#CC6222]/80 text-sm">Just open the door</span></li>
                </ul>
              </div>

              {/* Tier 3 */}
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                <p className="text-xs font-semibold text-[#34D399]/60 tracking-[0.2em] uppercase mb-3">Same-Day / Emergency</p>
                <p className="font-[family-name:var(--font-bebas)] text-6xl text-white tracking-wide leading-none">$100<span className="text-2xl text-white/60">/hr</span></p>
                <div className="w-10 h-[2px] bg-[#34D399]/30 mx-auto my-5" />
                <ul className="space-y-2.5 text-left">
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">Dispatched within hours</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">We bring all supplies</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">Emergency &amp; last-minute</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span><span className="text-white text-sm">Subject to availability</span></li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <a href="sms:9547103636" className="bg-[#34D399] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Text for a Free Quote
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: 'Pricing', href: '/updated-florida-maid-service-industry-pricing' }]} />
      </div>

      {/* Pricing guarantees */}
      <section className="pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'No Hidden Fees', detail: 'The quote you get is the price you pay' },
              { label: 'Pay After', detail: 'Never upfront — pay when the job is done' },
              { label: 'No Contracts', detail: 'Cancel recurring service anytime' },
              { label: 'Same Rate Everywhere', detail: 'Miami to Jacksonville — same price' },
            ].map(g => (
              <div key={g.label} className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center">
                <p className="font-[family-name:var(--font-bebas)] text-lg text-[#CC6222] tracking-wide mb-1">{g.label}</p>
                <p className="text-gray-500 text-xs">{g.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service pricing grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">By Service Type</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-4">What Does Each Service Cost?</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">All services use the same hourly rate. The total cost depends on the time required, which varies by service type and home size.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(service => (
              <Link
                key={service.slug}
                href={`/services/${service.urlSlug}`}
                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#34D399] hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">{service.name}</h3>
                </div>
                <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-1">{service.priceRange}</p>
                <p className="text-gray-400 text-xs mb-4">{service.duration} typical</p>
                <ul className="space-y-2 mb-4">
                  {service.features.slice(0, 4).map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <span className="text-[#CC6222] text-sm font-medium group-hover:underline underline-offset-4">Full details &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* What affects price */}
      <section className="py-16 bg-gradient-to-b from-[#CC6222] to-[#CC6222]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-[#34D399]/60 tracking-[0.25em] uppercase mb-3 text-center">Pricing Factors</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">What Affects Your Final Price?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', t: 'Home Size', d: 'Number of bedrooms and bathrooms determines how long the cleaning takes. A studio takes ~2 hours, a 3-bedroom takes 4–6+.' },
              { n: '02', t: 'Service Type', d: 'Deep cleans and move-in/out take 2–3x longer than regular maintenance. More time = higher total, same hourly rate.' },
              { n: '03', t: 'Current Condition', d: 'A home that hasn\'t been cleaned in months needs more attention on the first visit. After that, recurring visits are faster.' },
              { n: '04', t: 'Supply Choice', d: '$49/hr with your supplies or $65/hr when we bring professional-grade products and equipment. Same quality either way.' },
            ].map(item => (
              <div key={item.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-4xl text-[#34D399]/30 leading-none">{item.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{item.t}</p>
                <p className="text-white text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick cost estimator */}
      <section className="py-12 bg-[#34D399]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[#CC6222] rounded-full flex items-center justify-center">
              <span className="text-white text-xl">$</span>
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-2">Quick Cost Guide</h3>
            <p className="text-[#CC6222]/80 leading-relaxed mb-3">
              <strong>Studio/1BR regular clean:</strong> $98–$195 &middot; <strong>2BR deep clean:</strong> $245–$390 &middot; <strong>3BR move-out:</strong> $390–$520 &middot; <strong>Post-reno:</strong> $325–$650
            </p>
            <p className="text-[#CC6222]/60 text-sm">
              These are estimates at $49/hr. Add ~30% for the $65/hr supplies-included option. Every quote is customized to your specific home.
            </p>
          </div>
        </div>
      </section>

      {/* Book in 3 Steps */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-12">Get a Quote in 3 Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: 'Reach us at (954) 710-3636 with your address, home size, and what type of cleaning you need.' },
              { n: '02', t: 'Get Your Quote', d: 'We\'ll reply with a custom quote based on your home\'s size, condition, and service type — usually within 15 minutes.' },
              { n: '03', t: 'Pay After', d: 'We clean, you inspect, you pay. No deposits, no upfront charges. Cash, Venmo, Zelle (hi@thefloridamaid.com), or credit card.' },
            ].map(s => (
              <div key={s.n} className="border border-gray-200 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#34D399] leading-none">{s.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mt-3 mb-2">{s.t}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <a href="sms:9547103636" className="bg-[#CC6222] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
              Text (954) 710-3636
            </a>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Common Questions</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-12">Pricing FAQ</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {pricingFaqs.map(faq => (
              <div key={faq.question}>
                <h3 className="font-semibold text-[#CC6222] mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABlock title="Get Your Free Custom Quote" subtitle="Text or call — we'll reply with a personalized quote within minutes." />
    </>
  )
}
