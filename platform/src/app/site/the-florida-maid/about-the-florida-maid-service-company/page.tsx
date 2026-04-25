import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/app/site/the-florida-maid/_lib/seo/data/areas'
import { getNeighborhoodsByArea, ALL_NEIGHBORHOODS } from '@/app/site/the-florida-maid/_lib/seo/locations'
import { SERVICES } from '@/app/site/the-florida-maid/_lib/seo/services'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'

const url = 'https://www.thefloridamaid.com/about-the-florida-maid-service-company'
const title = 'About The Florida Maid | Florida Home & Business Cleaning Since 2018'
const description = 'The Florida Maid is Florida\'s most trusted cleaning service — from $49/hr, 25,000+ homes served, 5.0★ rated, $1M insured. Background-checked cleaners, consistent quality since 2018. (954) 710-3636'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: 'website', siteName: 'The Florida Maid', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title, description },
  other: { 'geo.region': 'US-FL', 'geo.placename': 'Florida', 'geo.position': '25.7617;-80.1918', 'ICBM': '25.7617, -80.1918' },
}

const aboutFaqs = [
  { question: 'How long has The Florida Maid been in business?', answer: 'Since 2018. We started serving Miami-Dade and have expanded to Broward, Palm Beach, Tampa Bay, and Orlando. We\'ve completed thousands of cleanings and maintain a 5.0-star Google rating.' },
  { question: 'Are your cleaners employees or contractors?', answer: 'Our cleaners are independent professionals who work exclusively with us. Every cleaner is background-checked, trained on our quality standards, and covered by our general liability insurance while working in your home.' },
  { question: 'How do you keep prices so affordable?', answer: 'We keep overhead low — no storefront, no middle-management layer, no expensive marketing budgets. We pass those savings to you. Our cleaners earn competitive pay while you get rates well below the Florida average.' },
  { question: 'What makes you different from other cleaning companies?', answer: 'Three things: consistency (same cleaner every visit for recurring clients), affordability ($49/hr is among the lowest rates in Florida for licensed, insured service), and reliability (we show up on time, every time, and we don\'t cancel).' },
  { question: 'How many neighborhoods do you serve?', answer: `We serve ${ALL_NEIGHBORHOODS.length}+ neighborhoods across Miami, Tampa, Orlando, Fort Lauderdale, and Jacksonville. Same rates everywhere — no travel surcharges.` },
  { question: 'Do you serve commercial spaces too?', answer: 'Yes. We clean offices, co-working spaces, medical offices, and retail spaces. Same hourly rates, same quality. Many of our residential clients also use us for their workspaces.' },
  { question: 'How do I know I can trust your cleaners?', answer: 'Every cleaner undergoes a comprehensive background check. We carry general liability insurance and bonding. We\'ve been in business since 2018 with a perfect 5.0-star Google rating and zero complaints filed with the BBB.' },
  { question: 'What languages do your cleaners speak?', answer: 'Our team is bilingual — English and Spanish. We can accommodate communication preferences for both languages.' },
]

export default function AboutPage() {
  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({ url, name: title, description, type: 'AboutPage', breadcrumb: [{ name: 'Home', url: 'https://www.thefloridamaid.com' }, { name: 'About', url }] }),
        localBusinessSchema(),
        howToBookSchema(),
        breadcrumbSchema([{ name: 'Home', url: 'https://www.thefloridamaid.com' }, { name: 'About', url }]),
        faqSchema(aboutFaqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-white text-sm">5.0 on Google &middot; 27 verified reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            Affordable. Reliable. Friendly.
          </h1>
          <p className="text-white text-lg max-w-2xl mx-auto leading-relaxed">
            The Florida Maid has been keeping Florida homes clean since 2018. No gimmicks, no corporate nonsense — just honest, dependable cleaning from people who care.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: 'About', href: '/about-the-florida-maid-service-company' }]} />
      </div>

      {/* Our Story — two column */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
            <div className="lg:col-span-3">
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Our Story</h2>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide leading-tight mb-6">Built on a Simple Idea: Show Up, Do Great Work, Charge Fair Prices</p>
              <div className="space-y-5 text-gray-600 leading-relaxed">
                <p>
                  We started The Florida Maid in 2018 because we were frustrated with the cleaning industry in Florida. Prices were inflated, quality was inconsistent, and companies treated cleaners and clients like numbers. We knew there had to be a better way.
                </p>
                <p>
                  Our approach was simple from day one: hire great people, pay them well, charge honest prices, and show up on time. No surge pricing when demand is high. No bait-and-switch quotes. No cancelling on clients because a higher-paying job came in. Just reliable, thorough cleaning from people who genuinely take pride in their work.
                </p>
                <p>
                  That approach has earned us a perfect 5.0-star rating on Google with 27 verified reviews, thousands of completed cleanings, and a client base that includes everyone from condos in Brickell to homes in Coral Springs to offices in Downtown Miami. Many of our clients have been with us for years — and they stay because we deliver the same quality every single visit.
                </p>
                <p>
                  Today we serve {ALL_NEIGHBORHOODS.length}+ neighborhoods across Miami, Tampa, Orlando, Fort Lauderdale, and Jacksonville. Our team is bilingual (English and Spanish), background-checked, licensed, and insured. And our prices haven&apos;t changed — $49/hr with your supplies, $65/hr when we bring everything.
                </p>
              </div>
            </div>

            {/* Right — stats */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#F5FBF8] border border-[#34D399]/30 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-6">By the Numbers</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">2018</p>
                    <p className="text-gray-500 text-sm">Founded</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">5.0</p>
                    <p className="text-gray-500 text-sm">Google rating</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">{ALL_NEIGHBORHOODS.length}+</p>
                    <p className="text-gray-500 text-sm">Neighborhoods</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">{SERVICES.length}</p>
                    <p className="text-gray-500 text-sm">Service types</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">$49</p>
                    <p className="text-gray-500 text-sm">Starting rate/hr</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">27</p>
                    <p className="text-gray-500 text-sm">5-star reviews</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#CC6222] to-[#CC6222] rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-5">What We Believe</h3>
                <ul className="space-y-4">
                  {[
                    'Cleaners deserve fair pay and respect',
                    'Clients deserve honest, predictable pricing',
                    'Consistency matters more than one-time perfection',
                    'A friendly face is worth as much as a clean floor',
                    'Reliability is the most underrated quality in this industry',
                  ].map(belief => (
                    <li key={belief} className="flex items-start gap-3">
                      <span className="text-[#34D399] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                      <span className="text-white text-sm leading-relaxed">{belief}</span>
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
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-12">Why Thousands of Floridians Trust Us</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Truly Affordable', detail: 'Our rates start at $49/hr — well below the Florida average for licensed, insured cleaning. No surge pricing, no hidden fees, no travel charges. Miami to Jacksonville, same rate.' },
              { title: 'Reliably On Time', detail: 'We show up when we say we will. Period. We don\'t cancel, we don\'t reschedule last-minute, and we don\'t ghost. Our cleaners are punctual and our scheduling team confirms every appointment.' },
              { title: 'Consistent Quality', detail: 'For recurring clients, we assign the same cleaner every visit. They learn your home, your preferences, and your standards. The result is consistent, reliable quality — not a different stranger every time.' },
              { title: 'Friendly People', detail: 'Our cleaners are warm, respectful, and professional. Many of our 5-star reviews mention how friendly and pleasant our team is. We hire for character first, then train for skill.' },
              { title: 'Licensed & Insured', detail: 'Full general liability insurance and bonding on every job. Every cleaner is background-checked before their first assignment. Your home, your belongings, and your peace of mind are protected.' },
              { title: 'No Contracts', detail: 'Book when you want, cancel when you want. No long-term commitments, no cancellation penalties for recurring service (with proper notice), and no pressure to upsell or upgrade.' },
            ].map(item => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-7 hover:border-[#34D399] hover:shadow-lg transition-all">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How we work — dark section */}
      <section className="py-16 bg-gradient-to-b from-[#CC6222] to-[#CC6222]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-[#34D399]/60 tracking-[0.25em] uppercase mb-3 text-center">How We Work</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-4">The Florida Maid Difference</p>
          <p className="text-white text-center max-w-2xl mx-auto mb-12">Here&apos;s what happens when you book with us — no surprises, no fine print.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">For One-Time Cleanings</h3>
              <div className="space-y-3">
                {[
                  'You text or call with your details',
                  'We quote a time estimate (not a flat fee — you pay hourly)',
                  'We assign a cleaner experienced with your home type',
                  'Cleaner arrives on time, cleans thoroughly',
                  'You pay after, when you\'re satisfied',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="font-[family-name:var(--font-bebas)] text-lg text-[#34D399]/40 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-white text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">For Recurring Clients</h3>
              <div className="space-y-3">
                {[
                  'Same cleaner assigned to your home every visit',
                  'They learn your preferences and priorities',
                  'Set schedule — same day, same time each week/month',
                  'We text when the cleaner is on the way',
                  'Pay after each cleaning — no auto-billing',
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="font-[family-name:var(--font-bebas)] text-lg text-[#34D399]/40 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-white text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service areas */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Where We Serve</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-10">{ALL_NEIGHBORHOODS.length}+ Neighborhoods, One Flat Rate</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {AREAS.map(area => (
              <Link
                key={area.slug}
                href={`/${area.urlSlug}`}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-[#34D399] hover:shadow-sm transition-all"
              >
                <p className="font-[family-name:var(--font-bebas)] text-lg text-[#CC6222] tracking-wide">{area.name}</p>
                <p className="text-gray-400 text-xs mt-1">{getNeighborhoodsByArea(area.slug).length} neighborhoods</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mint band — hiring note */}
      <section className="py-12 bg-[#34D399]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[#CC6222] rounded-full flex items-center justify-center">
              <span className="text-white text-xl">&#128075;</span>
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-2">We&apos;re Always Looking for Great Cleaners</h3>
            <p className="text-[#CC6222]/80 leading-relaxed">
              If you&apos;re an experienced cleaner who takes pride in their work, we&apos;d love to hear from you. Competitive pay, flexible hours, respectful management, and steady work.
            </p>
            <Link href="/available-florida-maid-jobs" className="inline-block mt-3 text-[#CC6222] font-semibold text-sm underline underline-offset-4">See open positions &rarr;</Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Common Questions</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-12">About The Florida Maid</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {aboutFaqs.map(faq => (
              <div key={faq.question}>
                <h3 className="font-semibold text-[#CC6222] mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABlock title="Ready to See the Difference?" subtitle="Text or call — affordable, reliable, friendly cleaning from day one." />
    </>
  )
}
