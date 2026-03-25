import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getAreaByUrlSlug,
  getNeighborhoodByUrlSlug,
  getNeighborhoodsByArea,
  getArea,
  getNeighborhood,
  ALL_NEIGHBORHOODS,
  AREAS,
} from '@/lib/seo/locations'
import { SERVICES } from '@/lib/seo/services'
import { areaContent, neighborhoodContent, neighborhoodFAQs, commonServiceFAQs, neighborhoodVibe, neighborhoodKnownFor, neighborhoodFunFacts } from '@/lib/seo/content'
import { areaPageSchemas, neighborhoodPageSchemas, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import FAQSection from '@/components/site/FAQSection'
import CTABlock from '@/components/site/CTABlock'
import NearbyNeighborhoods from '@/components/site/NearbyNeighborhoods'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return [
    ...AREAS.map(a => ({ slug: a.urlSlug })),
    ...ALL_NEIGHBORHOODS.map(n => ({ slug: n.urlSlug })),
  ]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const area = getAreaByUrlSlug(slug)
  if (area) {
    const content = areaContent(area)
    const url = `https://www.thenycmaid.com/${slug}`
    const title = `${area.name} Maid Service & House Cleaning From $49/hr | The NYC Maid`
    const description = `Professional house cleaning in ${area.name} from $49/hr. Deep cleaning, weekly maid service, move-in/out & more. Licensed, insured, 5.0★ Google. (212) 202-8400`
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: 'website', siteName: 'The NYC Maid', locale: 'en_US' },
      twitter: { card: 'summary_large_image', title, description },
      other: { 'geo.region': `US-${area.state}`, 'geo.placename': area.name, 'geo.position': `${area.lat};${area.lng}`, 'ICBM': `${area.lat}, ${area.lng}` },
    }
  }

  const neighborhood = getNeighborhoodByUrlSlug(slug)
  if (neighborhood) {
    const neighborhoodArea = getArea(neighborhood.area)!
    const content = neighborhoodContent(neighborhood, neighborhoodArea)
    const url = `https://www.thenycmaid.com/${slug}`
    const title = `${neighborhood.name} Maid Service & House Cleaning From $49/hr | The NYC Maid`
    const description = `Professional cleaning in ${neighborhood.name}, ${neighborhoodArea.name}. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. From $49/hr. 5.0★ Google. (212) 202-8400`
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: 'website', siteName: 'The NYC Maid', locale: 'en_US' },
      twitter: { card: 'summary_large_image', title, description },
      other: { 'geo.region': `US-${neighborhoodArea.state}`, 'geo.placename': neighborhood.name, 'geo.position': `${neighborhood.lat};${neighborhood.lng}`, 'ICBM': `${neighborhood.lat}, ${neighborhood.lng}` },
    }
  }

  return {}
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params

  // ============ AREA PAGE ============
  const area = getAreaByUrlSlug(slug)
  if (area) {
    const content = areaContent(area)
    const neighborhoods = getNeighborhoodsByArea(area.slug)

    return (
      <>
        <JsonLd data={areaPageSchemas(area)} />

        {/* Hero */}
        <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-blue-200/60 text-sm">5.0 on Google &middot; 27 verified reviews</span>
                </div>
                <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide leading-[0.95] mb-5">
                  {area.name} Maid Service & House Cleaning — From $49/hr
                </h1>
                <p className="text-blue-200/60 text-lg leading-relaxed mb-6">{content.intro}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8">
                  <span className="text-[#A8F0DC] text-sm font-medium">&#10003; From $49/hr</span>
                  <span className="text-[#A8F0DC] text-sm font-medium">&#10003; No money upfront</span>
                  <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Licensed &amp; insured</span>
                  <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Background-checked</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <a href="/chat-with-selena" className="bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                    Chat With Selena
                  </a>
                  <a href="tel:2122028400" className="text-blue-200/60 font-medium py-3.5 hover:text-white transition-colors underline underline-offset-4">
                    or Call (212) 202-8400
                  </a>
                </div>
              </div>
              {/* Pricing card */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-7 shadow-xl">
                  <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-5">Flat Hourly Rate — All {area.name}</p>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex-1 bg-gray-100 rounded-xl py-5 px-4 text-center">
                      <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#1E2A4A] tracking-wide leading-none">$49<span className="text-xl text-gray-400">/hr</span></p>
                      <p className="text-gray-500 text-xs mt-2">Your supplies</p>
                    </div>
                    <div className="flex-1 bg-[#1E2A4A] rounded-xl py-5 px-4 text-center">
                      <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide leading-none">$65<span className="text-xl text-blue-200/40">/hr</span></p>
                      <p className="text-[#A8F0DC]/70 text-xs mt-2">We bring everything</p>
                    </div>
                  </div>
                  <div className="border border-[#A8F0DC]/40 bg-[#E8F8F1] rounded-xl p-4 mb-5 text-center">
                    <p className="text-gray-500 text-xs mb-1">{neighborhoods.length} Neighborhoods Served</p>
                    <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide">Same Rate Everywhere</p>
                    <p className="text-[#1E2A4A]/60 text-xs mt-1">No travel fees &middot; No surge pricing</p>
                  </div>
                  <a href="/chat-with-selena" className="block text-center bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                    Chat With Selena
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <Breadcrumbs items={[{ name: area.name, href: `/${area.urlSlug}` }]} />
        </div>

        {/* Neighborhoods — two column split */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[#A8F0DC] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide leading-tight mb-4">{area.name} Neighborhoods We Serve</h2>
                <p className="text-gray-500 leading-relaxed mb-6">Every neighborhood below gets the same rates, the same quality, and the same background-checked cleaners. Click any neighborhood to see services available in your area.</p>
                <a href="/chat-with-selena" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Chat With Selena
                </a>
              </div>
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {neighborhoods.map(n => (
                  <Link
                    key={n.slug}
                    href={`/${n.urlSlug}`}
                    className="group border border-gray-200 rounded-xl p-5 hover:border-[#A8F0DC] hover:shadow-md transition-all bg-white"
                  >
                    <h3 className="font-semibold text-[#1E2A4A] group-hover:text-[#1E2A4A]/70 transition-colors mb-1">{n.name}</h3>
                    <p className="text-gray-400 text-sm">{n.housing_types.slice(0, 2).join(' · ')}</p>
                    <p className="text-[#1E2A4A] text-xs font-medium mt-3 group-hover:underline underline-offset-4">View Services &rarr;</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Services — full showcase */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Cleaning Services</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">Every Cleaning Service Available in {area.name}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">From weekly maid service to deep cleaning, move-in/out, and same-day emergency cleans — all at the same flat hourly rate.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICES.map(s => (
                <Link
                  key={s.slug}
                  href={`/services/${s.urlSlug}`}
                  className="group border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] hover:shadow-lg transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">{s.name}</h3>
                    <span className="text-[#1E2A4A] font-bold text-sm whitespace-nowrap ml-3">From {s.priceRange.split('–')[0]}</span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{s.duration}</span>
                    <span className="text-[#1E2A4A] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Book in 3 Steps */}
        <section className="py-20 bg-[#1E2A4A]">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs font-semibold text-[#A8F0DC]/60 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {area.name} Cleaning in 3 Steps</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { n: '01', t: 'Text or Call', d: `Reach us at (212) 202-8400 with your ${area.name} address, preferred date, and any special requests.` },
                { n: '02', t: 'We Confirm', d: 'We match you with a background-checked, insured cleaner and lock in your appointment — usually within the hour.' },
                { n: '03', t: 'Pay After', d: 'Your cleaner arrives on time, does the work, and you pay only after the cleaning is complete. No deposits ever.' },
              ].map(s => (
                <div key={s.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                  <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC]/30 leading-none">{s.n}</span>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{s.t}</p>
                  <p className="text-blue-200/50 text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <a href="/chat-with-selena" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Chat With Selena
              </a>
            </div>
          </div>
        </section>

        <CTABlock title={`Book Your ${area.name} Cleaning Today`} subtitle={`Text or call — serving every ${area.name} neighborhood at the same flat hourly rate.`} />
      </>
    )
  }

  // ============ NEIGHBORHOOD PAGE ============
  const neighborhood = getNeighborhoodByUrlSlug(slug)
  if (neighborhood) {
    const neighborhoodArea = getArea(neighborhood.area)!
    const content = neighborhoodContent(neighborhood, neighborhoodArea)
    const baseFaqs = neighborhoodFAQs(neighborhood, neighborhoodArea)
    const common = commonServiceFAQs(SERVICES[0])
    const seen = new Set(baseFaqs.map(f => f.question))
    const combined = [...baseFaqs, ...common.filter(f => !seen.has(f.question))]
    const faqs = combined.slice(0, 25)
    const vibe = neighborhoodVibe(neighborhood, neighborhoodArea)
    const knownFor = neighborhoodKnownFor(neighborhood)
    const funFacts = neighborhoodFunFacts(neighborhood)
    const nearbyNames = neighborhood.nearby.map(s => {
      const n = getNeighborhood(s)
      return n ? n.name : s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    })

    return (
      <>
        <JsonLd data={[...neighborhoodPageSchemas(neighborhood, neighborhoodArea), faqSchema(faqs)]} />

        {/* Hero — centered, light background, neighborhood-focused */}
        <section className="bg-white border-b border-gray-100 pt-14 md:pt-20 pb-0">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Link href={`/${neighborhoodArea.urlSlug}`} className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase hover:text-[#1E2A4A] transition-colors">{neighborhoodArea.name}</Link>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase">{neighborhood.name}</span>
            </div>
            <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-[#1E2A4A] tracking-wide leading-[0.9] mb-5">
              {neighborhood.name} Maid Service &amp; House Cleaning
            </h1>
            <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">{content.intro}</p>
            {/* Landmark pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {neighborhood.landmarks.map(l => (
                <span key={l} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-600">{l}</span>
              ))}
            </div>
            {/* CTA row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a href="/chat-with-selena" className="bg-[#1E2A4A] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                Chat With Selena
              </a>
              <a href="tel:2122028400" className="text-[#1E2A4A] font-semibold py-4 hover:underline underline-offset-4">
                or Call (212) 202-8400
              </a>
            </div>
          </div>
          {/* Pricing bar — anchored to bottom of hero */}
          <div className="bg-[#1E2A4A]">
            <div className="max-w-5xl mx-auto px-4 py-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide">$49</span>
                    <span className="text-blue-200/50 text-sm">/hr &middot; your supplies</span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-white/20" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-[family-name:var(--font-bebas)] text-3xl text-[#A8F0DC] tracking-wide">$65</span>
                    <span className="text-blue-200/50 text-sm">/hr &middot; we bring everything</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 text-sm">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-blue-200/50 text-sm">5.0 on Google</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <Breadcrumbs items={[
            { name: neighborhoodArea.name, href: `/${neighborhoodArea.urlSlug}` },
            { name: neighborhood.name, href: `/${neighborhood.urlSlug}` },
          ]} />
        </div>

        {/* Discover the Neighborhood — character + fun facts */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              {/* Left — story */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Discover {neighborhood.name}, {neighborhoodArea.name}</h2>
                <p className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide leading-tight mb-4">Life in {neighborhood.name}</p>
                <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
                <p className="text-gray-600 text-lg leading-relaxed mb-5">{vibe}</p>
                <p className="text-gray-600 leading-relaxed mb-8">
                  That&apos;s why we&apos;re proud to serve {neighborhood.name} with the same care and attention your neighborhood deserves. Our cleaners know the {neighborhood.housing_types[0]} and {neighborhood.housing_types[1]} here — and they know how to make them shine.
                </p>
                {/* Landmark tags */}
                <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-3">Local Landmarks</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {neighborhood.landmarks.map(l => (
                    <span key={l} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700">{l}</span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <a href="/chat-with-selena" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                    Chat With Selena
                  </a>
                  <a href="tel:2122028400" className="text-[#1E2A4A] font-semibold hover:underline underline-offset-4">
                    or Call (212) 202-8400
                  </a>
                </div>
              </div>

              {/* Right — at a glance + known for */}
              <div className="space-y-6">
                <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-2xl p-8">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">{neighborhood.name} at a Glance</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {funFacts.map(fact => (
                      <div key={fact.label}>
                        <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">{fact.value}</p>
                        <p className="text-gray-500 text-sm">{fact.label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{fact.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl p-8">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">{neighborhood.name} Is Known For</h3>
                  <ul className="space-y-3.5">
                    {knownFor.map(item => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="text-[#A8F0DC] mt-0.5 text-lg">&#10003;</span>
                        <span className="text-gray-700 text-[15px]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Neighborhood Expertise — housing types + challenges, dark section */}
        <section className="py-16 bg-gradient-to-b from-[#1E2A4A] to-[#243352]">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-[#A8F0DC]/60 tracking-[0.25em] uppercase mb-3 text-center">Local Cleaning Expertise</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-4">We Know {neighborhood.name} Homes Inside and Out</p>
            <p className="text-blue-200/50 text-center max-w-2xl mx-auto mb-12">
              Our cleaners are experienced with the specific home types and cleaning challenges unique to {neighborhood.name}. No learning curve — just expert-level results from day one.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">{neighborhood.name} Home Types We Clean</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {neighborhood.housing_types.map(t => (
                    <div key={t} className="flex items-start gap-2.5">
                      <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-blue-100/70 text-sm">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">{neighborhood.name} Cleaning Challenges We Handle</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {neighborhood.cleaning_challenges.map(c => (
                    <div key={c} className="flex items-start gap-2.5">
                      <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-blue-100/70 text-sm">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing callout — mint background */}
        <section className="py-12 bg-[#A8F0DC]">
          <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-[#1E2A4A] rounded-full flex items-center justify-center">
                <span className="text-white text-xl">$</span>
              </div>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-2">{neighborhood.name} Cleaning Costs</h3>
              <p className="text-[#1E2A4A]/80 leading-relaxed">
                House cleaning in {neighborhood.name} starts at $49/hr with your supplies or $65/hr when we bring everything. A typical {neighborhood.name} apartment cleaning runs $98–$260 depending on size and service type. Deep cleans, move-in/move-out, and post-renovation jobs take longer but use the same flat hourly rate. No travel fees, no surge pricing — {neighborhood.name} residents pay the same rate as every other neighborhood we serve.
              </p>
              <Link href="/updated-nyc-maid-service-industry-pricing" className="inline-block mt-3 text-[#1E2A4A] font-semibold text-sm underline underline-offset-4">Full pricing details &rarr;</Link>
            </div>
          </div>
        </section>

        {/* Services — full showcase grid */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Cleaning Services</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">Every Cleaning Service Available in {neighborhood.name}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">From weekly maid service to deep cleaning, move-in/out, and same-day emergency cleans — all at the same flat hourly rate.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICES.map(s => (
                <Link
                  key={s.slug}
                  href={`/${neighborhood.urlSlug}/${s.slug}`}
                  className="group border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] hover:shadow-lg transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">{s.name}</h3>
                    <span className="text-[#1E2A4A] font-bold text-sm whitespace-nowrap ml-3">From {s.priceRange.split('–')[0]}</span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{s.duration}</span>
                    <span className="text-[#1E2A4A] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Book in 3 Steps */}
        <section className="py-20 bg-[#1E2A4A]">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs font-semibold text-[#A8F0DC]/60 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {neighborhood.name} Cleaning in 3 Steps</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { n: '01', t: 'Text or Call', d: `Reach us at (212) 202-8400 with your ${neighborhood.name} address, preferred date, and any special requests.` },
                { n: '02', t: 'We Confirm', d: 'We match you with a background-checked, insured cleaner and lock in your appointment — usually within the hour.' },
                { n: '03', t: 'Pay After', d: 'Your cleaner arrives on time, does the work, and you pay only after the cleaning is complete. No deposits ever.' },
              ].map(s => (
                <div key={s.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                  <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC]/30 leading-none">{s.n}</span>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{s.t}</p>
                  <p className="text-blue-200/50 text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <a href="/chat-with-selena" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Chat With Selena
              </a>
            </div>
          </div>
        </section>

        {/* Nearby neighborhoods — styled cards with details */}
        {neighborhood.nearby.length > 0 && (
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Also Serving</h2>
              <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">Neighborhoods Near {neighborhood.name}</p>
              <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality, same background-checked cleaners — no matter which {neighborhoodArea.name} neighborhood you call home.</p>
              <NearbyNeighborhoods slugs={neighborhood.nearby} />
            </div>
          </section>
        )}

        <FAQSection faqs={faqs} title={`${neighborhood.name} Cleaning — Frequently Asked Questions`} columns={2} />
        <CTABlock title={`Book Your ${neighborhood.name} Cleaning Today`} subtitle={`Text or call — same rates, same quality across all of ${neighborhoodArea.name}.`} />
      </>
    )
  }

  notFound()
}
