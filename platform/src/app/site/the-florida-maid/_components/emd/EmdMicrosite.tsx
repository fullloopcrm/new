import Link from 'next/link'
import EmdMicrositeNav from '@/app/site/emd-microsites/_components/EmdMicrositeNav'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import TrustBadges from '@/app/site/the-florida-maid/_components/marketing/TrustBadges'
import FAQSection from '@/app/site/the-florida-maid/_components/marketing/FAQSection'
import { SERVICES } from '@/app/site/the-florida-maid/_lib/seo/services'
import { emdMicrositeSchemas } from '@/app/site/the-florida-maid/_lib/emd/schema'
import { getNearbyMicrosites } from '@/app/site/the-florida-maid/_lib/emd/registry'
import { EMD_CITY_PHOTOS, EMD_GENERIC_CLEANING_PHOTO } from '@/app/site/the-florida-maid/_lib/emd/photos'
import type { EmdMicrositeConfig } from '@/app/site/the-florida-maid/_lib/emd/types'

const PARENT_TAG = 'A Florida Maid Services Company'
const BOOK_URL = 'https://www.thefloridamaid.com/book-now'
const FEEDBACK_URL = 'https://www.thefloridamaid.com/feedback'
const PHONE_DISPLAY = '(954) 710-3636'
const PHONE_SMS = 'sms:9547103636'

/** Every standalone mention of the brand name in body copy gets the parent-company tag appended, per brand spec — the hero H1/tagline are the one exception, styled separately below. */
function tagBrand(text: string, brandName: string): string {
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${escaped}(?!\\s\\(${PARENT_TAG}\\))`, 'g')
  return text.replace(re, `${brandName} (${PARENT_TAG})`)
}

export default function EmdMicrosite({ config }: { config: EmdMicrositeConfig }) {
  const taggedIntro = config.introParagraphs.map(p => tagBrand(p, config.brandName))
  const taggedOurStory = config.ourStory.map(p => tagBrand(p, config.brandName))
  const taggedDifferentiation = config.differentiation.map(p => tagBrand(p, config.brandName))
  const taggedFaqs = config.faqs.map(f => ({
    question: tagBrand(f.question, config.brandName),
    answer: tagBrand(f.answer, config.brandName),
  }))
  const schemas = emdMicrositeSchemas(config, taggedFaqs)
  const taggedNeighborhoods = config.neighborhoods.map(n => ({
    ...n,
    blurb: tagBrand(n.blurb, config.brandName),
  }))
  const taggedPricingExplainer = config.pricingExplainer.map(p => tagBrand(p, config.brandName))
  const taggedTestimonials = config.testimonials.map(t => ({ ...t, text: tagBrand(t.text, config.brandName) }))
  const nearby = getNearbyMicrosites(config, 5)
  const cityPhoto = EMD_CITY_PHOTOS[config.domain]

  return (
    <>
      <JsonLd data={schemas} />
      <EmdMicrositeNav brandName={config.brandName} bookUrl={BOOK_URL} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] pt-12 md:pt-16 pb-14 md:pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Social proof bar */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <span className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-white text-sm font-medium">5.0 on Google</span>
            </span>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-white text-sm font-medium">Licensed &amp; Insured Up To $1,000,000</span>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-white text-sm font-medium">Background-Checked Cleaners</span>
          </div>

          {/* Brand / logo area */}
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-white tracking-wide leading-[0.95] mb-2">
            {config.brandName} and Cleaning Service
          </h1>
          <p className="text-[#FFE8D6] text-lg md:text-xl font-medium tracking-wide mb-3">({PARENT_TAG})</p>

          {/* Trust points */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
            <span className="text-[#34D399] text-sm font-medium">&#10003; No money upfront</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; Payment upon completion</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; No contracts</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; Flat hourly pricing</span>
          </div>

          {/* Divider */}
          <div className="w-3/4 h-[1px] bg-white/20 mb-5" />

          {/* CTA — above the fold, all three link out to the main Florida Maid site */}
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide mb-1">Book Your Cleaning</p>
          <p className="text-white/70 text-sm mb-5 max-w-[75%]">One page. Quick. We&apos;ll confirm by text within 15 minutes.</p>
          <div className="flex flex-wrap gap-3 mb-8">
            <a href={BOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#A8F0DC] text-[#CC6222] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Self Booking $20 Off
            </a>
            <a href={PHONE_SMS} className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-white/20 transition-colors">
              Text {PHONE_DISPLAY}
            </a>
            <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-red-600 text-yellow-300 px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-red-700 transition-colors">
              Feedback | Suggestions?
            </a>
          </div>

          {/* Pricing tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <p className="text-xs font-semibold text-[#E8732A] tracking-[0.2em] uppercase mb-3">Client Supplies &amp; Equipment</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-black tracking-wide">$49<span className="text-2xl text-black/40">/hr</span></p>
              <p className="text-black text-sm mt-3">You provide the cleaning supplies and equipment. We bring the expertise.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 relative shadow-lg border-2 border-[#34D399]">
              <div className="absolute -top-3 left-6 bg-[#34D399] text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">Most Popular</div>
              <p className="text-xs font-semibold text-[#E8732A] tracking-[0.2em] uppercase mb-3">We Bring Everything</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-black tracking-wide">$59<span className="text-2xl text-black/40">/hr</span></p>
              <p className="text-black text-sm mt-3">We bring all supplies and professional-grade equipment. Just open the door.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <p className="text-xs font-semibold text-[#E8732A] tracking-[0.2em] uppercase mb-3">Same-Day / Emergency</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-black tracking-wide">$89<span className="text-2xl text-black/40">/hr</span></p>
              <p className="text-black text-sm mt-3">Need it today? We dispatch a professional cleaner to your door within hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* City photo banner. cityPhoto.realLocation false means no confidently-verified
          Pexels match for this exact city — a neutral clean-home photo is used instead
          rather than risk showing the wrong place. */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cityPhoto.src} alt={cityPhoto.alt} width={1200} height={627} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
        {cityPhoto.photographer && (
          <a
            href={cityPhoto.photographerUrl || 'https://www.pexels.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-3 text-[10px] text-white/70 bg-black/30 rounded px-2 py-0.5 hover:text-white"
          >
            Photo: {cityPhoto.photographer} / Pexels
          </a>
        )}
      </div>

      {/* Welcome / intro */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] mb-1">{config.city} House Cleaning</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-2">
            Trusted House Cleaning Service in {config.city}, FL
          </h2>
          {taggedIntro.map((p, i) => (
            <p key={i} className="text-gray-600 text-lg leading-relaxed">{p}</p>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4">
        <TrustBadges />
      </div>

      {/* Our story */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] mb-1">About {config.brandName}</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-2">
            {config.city}&apos;s Local House Cleaning Company
          </h2>
          {taggedOurStory.map((p, i) => (
            <p key={i} className="text-gray-600 text-lg leading-relaxed">{p}</p>
          ))}
        </div>
      </section>

      {/* Beach-living cleaning challenges */}
      <section className="py-20 bg-[#1E2A4A]">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#A8F0DC] text-center mb-3">Beach Home Cleaning</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-3">
            Why {config.city} Homes Need a Different Kind of Clean
          </h2>
          <p className="text-blue-200/70 text-center max-w-2xl mx-auto mb-12">
            Beach living comes with its own set of cleaning challenges in {config.city}. Here&apos;s how {config.brandName} handles them.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {config.challenges.map(c => (
              <div key={c.title} className="bg-white/[0.06] border border-white/10 rounded-2xl p-6">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#A8F0DC] tracking-wide mb-2">{c.title}</h3>
                <p className="text-blue-100/80 text-sm leading-relaxed">{tagBrand(c.body, config.brandName)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] text-center mb-3">Cleaning Services</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-3">
            House Cleaning Services Available in {config.city}, FL
          </h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            Every {config.brandName} visit in {config.city} is performed by a licensed, insured, background-checked cleaner — here&apos;s exactly what&apos;s included in each service.
          </p>
          <div className="space-y-4">
            {SERVICES.map(service => (
              <details key={service.slug} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide">{service.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <span className="text-sm font-semibold text-[#1E2A4A] hidden sm:inline">{service.priceRange}</span>
                    <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
                  </div>
                </summary>
                <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-[#1E2A4A] tracking-widest uppercase mb-2">What&apos;s Included</p>
                    <ul className="space-y-1.5">
                      {service.features.map(f => (
                        <li key={f} className="text-gray-600 text-sm flex items-start gap-2">
                          <span className="text-[#34D399] mt-0.5">&#10003;</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E2A4A] tracking-widest uppercase mb-2">Ideal For</p>
                    <ul className="space-y-1.5 mb-4">
                      {service.idealFor.map(f => (
                        <li key={f} className="text-gray-600 text-sm flex items-start gap-2">
                          <span className="text-[#E8732A] mt-0.5">&#8226;</span>{f}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-500">Price: <span className="font-semibold text-[#1E2A4A]">{service.priceRange}</span> &middot; Duration: <span className="font-semibold text-[#1E2A4A]">{service.duration}</span></p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] text-center mb-3">Why Choose Us</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-3">
            Why {config.city} Residents Trust {config.brandName}
          </h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            From background-checked cleaners to transparent hourly pricing, here&apos;s what sets {config.brandName} apart for house cleaning in {config.city}.
          </p>
          <div className="rounded-2xl overflow-hidden mb-12 h-56 md:h-72 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMD_GENERIC_CLEANING_PHOTO.src} alt={EMD_GENERIC_CLEANING_PHOTO.alt} width={1200} height={627} loading="lazy" className="w-full h-full object-cover" />
            <span className="absolute bottom-2 right-3 text-[10px] text-white/70 bg-black/30 rounded px-2 py-0.5">
              Photo: {EMD_GENERIC_CLEANING_PHOTO.photographer} / Pexels
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { title: 'Local Focus, Statewide Backing', body: `${config.brandName} (${PARENT_TAG}) is built specifically around ${config.city}, but backed by a Florida cleaning company that has served over 25,000 homes statewide since 2018.` },
              { title: 'Background-Checked Cleaners', body: 'Every cleaner is background-checked, licensed, and insured before they ever set foot in your home — no exceptions.' },
              { title: 'Transparent Hourly Pricing', body: 'No flat-rate guessing games and no surprise fees. You pay for the time your home actually needs, every time.' },
              { title: 'No Contracts, Ever', body: 'Book once or book every week — there is no long-term contract locking you in. Cancel or reschedule with notice, no penalty.' },
              { title: 'Satisfaction Guaranteed', body: "If you're not happy with any part of your cleaning, contact us within 24 hours and we'll send someone back to make it right at no extra charge." },
              { title: 'Insured Up To $1,000,000', body: 'We carry full general liability insurance and bonding, so your home and belongings are protected on every single visit.' },
            ].map(item => (
              <div key={item.title} className="border border-gray-200 rounded-2xl p-6">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing explained */}
      <section id="pricing" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] text-center mb-3">Cleaning Prices</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-10">
            {config.city} House Cleaning Prices &amp; Rates
          </h2>
          <div className="space-y-5 mb-14">
            {taggedPricingExplainer.map((p, i) => (
              <p key={i} className="text-gray-600 text-lg leading-relaxed">{p}</p>
            ))}
          </div>
          <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide text-center mb-8">
            Choosing a Cleaning Frequency
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {config.frequencyGuide.map(f => (
              <div key={f.frequency} className="bg-white border border-gray-200 rounded-2xl p-6">
                <h4 className="font-[family-name:var(--font-bebas)] text-lg text-[#1E2A4A] tracking-wide mb-2">{f.frequency}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{tagBrand(f.body, config.brandName)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhoods */}
      <section id="areas" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] text-center mb-3">Service Areas</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-3">
            {config.city} Neighborhoods We Serve
          </h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            {config.brandName} covers every neighborhood across {config.city} — here&apos;s a closer look at where we clean most.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {taggedNeighborhoods.map(n => (
              <div key={n.name} className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="font-[family-name:var(--font-bebas)] text-lg text-[#1E2A4A] tracking-wide mb-2">{n.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{n.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[#1E2A4A]">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#A8F0DC] text-center mb-3">Client Reviews</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-3">
            What {config.city} Clients Say About {config.brandName}
          </h2>
          <p className="text-blue-200/70 text-center max-w-2xl mx-auto mb-12">
            Real feedback from real {config.city} homeowners and renters who trust {config.brandName} with their homes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {taggedTestimonials.map(t => (
              <div key={t.name} className="bg-white/[0.06] border border-white/10 rounded-2xl p-6">
                <p className="text-yellow-400 text-sm mb-3">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
                <p className="text-blue-100/90 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <p className="text-[#A8F0DC] text-sm font-semibold">{t.name} &middot; {t.neighborhood}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works / first visit */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] text-center mb-3">Getting Started</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-3">
            How to Book a House Cleaning in {config.city}
          </h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            Booking with {config.brandName} takes minutes — here&apos;s exactly what happens from your first text to your first clean in {config.city}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {config.firstVisitSteps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#1E2A4A] text-[#A8F0DC] font-[family-name:var(--font-bebas)] text-lg flex items-center justify-center">{i + 1}</div>
                <p className="text-gray-600 text-sm leading-relaxed pt-1.5">{tagBrand(step, config.brandName)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] mb-1">Local vs. National</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-2">
            {config.brandName} vs. National Cleaning Franchises in {config.city}
          </h2>
          {taggedDifferentiation.map((p, i) => (
            <p key={i} className="text-gray-600 text-lg leading-relaxed">{p}</p>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <div id="faq" className="scroll-mt-20 bg-white">
        <div className="pt-16 pb-2 bg-white">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] text-center mb-3">FAQ</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto px-4">
            Answers to common questions about house cleaning in {config.city}, FL — pricing, scheduling, and what&apos;s included.
          </p>
        </div>
        <FAQSection faqs={taggedFaqs} title={`${config.brandName} — Frequently Asked Questions`} columns={2} />
      </div>

      {/* Nearby Locations — internal links to the geographically closest sister EMD microsites */}
      {nearby.length > 0 && (
        <section className="py-16 bg-[#FFF8F3] border-t border-[#F3D9C4]">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#CC6222] text-center mb-3">Nearby Service Areas</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#1E2A4A] tracking-wide text-center mb-8">
              Also Serving Florida Communities Near {config.city}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {nearby.map(n => (
                <a
                  key={n.domain}
                  href={`https://www.${n.domain}`}
                  className="bg-white border border-[#F3D9C4] rounded-full px-5 py-2.5 text-sm font-semibold text-[#1E2A4A] hover:border-[#CC6222] hover:text-[#CC6222] transition-colors"
                >
                  {n.city} Maid and Cleaning Service
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA — all links point back to the main Florida Maid site */}
      <section className="bg-[#A8F0DC] py-20">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide">
              Ready for a Spotless {config.city} Home?
            </h2>
            <p className="text-[#1E2A4A]/70 text-lg mt-2">
              Book online in 30 seconds or call us — {config.brandName} is trusted across {config.city}.
            </p>
            <p className="inline-block mt-3 bg-[#1E2A4A] text-[#A8F0DC] text-sm font-bold tracking-wide px-4 py-1.5 rounded-full">
              Save 20% on weekly service &middot; 10% bi-weekly &amp; monthly
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
            <a href={BOOK_URL} target="_blank" rel="noopener noreferrer" className="bg-[#1E2A4A] text-white px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#2a3a5e] transition-colors">
              Self Booking $20 Off
            </a>
            <a href={PHONE_SMS} className="border-2 border-[#1E2A4A] text-[#1E2A4A] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A] hover:text-white transition-colors">
              Text {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-gray-400 py-6 bg-white">
        <Link href="https://www.thefloridamaid.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
Part of The Florida Maid family of cleaning services across Florida, FL
        </Link>
      </p>
    </>
  )
}
