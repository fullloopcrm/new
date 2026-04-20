import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getNeighborhoodByUrlSlug,
  getArea,
  ALL_NEIGHBORHOODS,
} from '@/lib/seo/locations'
import { SERVICES, getService } from '@/lib/seo/services'
import { neighborhoodServiceContent, neighborhoodFAQs, serviceFAQs, commonServiceFAQs } from '@/lib/seo/content'
import { neighborhoodServicePageSchemas, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import FAQSection from '@/components/site/FAQSection'
import CTABlock from '@/components/site/CTABlock'
import NearbyNeighborhoods from '@/components/site/NearbyNeighborhoods'

interface Props {
  params: Promise<{ slug: string; service: string }>
}

// Render on demand — Clerk in the root layout breaks build-time static gen
// without NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY available at build. ISR keeps the
// pages fast and indexable without baking thousands at build time.
export const dynamic = 'force-static'
export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() {
  // Build no params at build time — pages render on first request and cache for 24h.
  // The full list (ALL_NEIGHBORHOODS × SERVICES) generates lazily.
  return []
}

// Reference imports kept so refactoring keeps types alive
void ALL_NEIGHBORHOODS
void SERVICES

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, service: serviceSlug } = await params
  const neighborhood = getNeighborhoodByUrlSlug(slug)
  const service = getService(serviceSlug)
  if (!neighborhood || !service) return {}

  const area = getArea(neighborhood.area)!
  const url = `https://www.thenycmaid.com/${slug}/${serviceSlug}`
  const title = `${service.name} in ${neighborhood.name}, ${area.name} From $49/hr | The NYC Maid`
  const description = `Professional ${service.name.toLowerCase()} in ${neighborhood.name}, ${area.name}. ${service.features.slice(0, 3).join(', ')} & more. ${service.priceRange}. 5.0★ Google. (212) 202-8400`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'The NYC Maid', locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
    other: { 'geo.region': `US-${area.state}`, 'geo.placename': neighborhood.name, 'geo.position': `${neighborhood.lat};${neighborhood.lng}`, 'ICBM': `${neighborhood.lat}, ${neighborhood.lng}` },
  }
}

export default async function NeighborhoodServicePage({ params }: Props) {
  const { slug, service: serviceSlug } = await params
  const neighborhood = getNeighborhoodByUrlSlug(slug)
  const service = getService(serviceSlug)
  if (!neighborhood || !service) notFound()

  const area = getArea(neighborhood.area)!
  const content = neighborhoodServiceContent(neighborhood, service, area)

  // Build 25 FAQs: neighborhood-specific + service-specific + common (deduplicated)
  const nFaqs = neighborhoodFAQs(neighborhood, area)
  const sFaqs = serviceFAQs(service)
  const cFaqs = commonServiceFAQs(service)
  const seen = new Set<string>()
  const allFaqs: { question: string; answer: string }[] = []
  for (const f of [...nFaqs, ...sFaqs, ...cFaqs]) {
    if (!seen.has(f.question)) {
      seen.add(f.question)
      allFaqs.push(f)
    }
  }
  const faqs = allFaqs.slice(0, 25)

  const breadcrumbItems = [
    { name: area.name, href: `/${area.urlSlug}` },
    { name: neighborhood.name, href: `/${neighborhood.urlSlug}` },
    { name: service.name, href: `/${neighborhood.urlSlug}/${service.slug}` },
  ]

  return (
    <>
      <JsonLd data={[...neighborhoodServicePageSchemas(neighborhood, service, area), faqSchema(faqs)]} />

      {/* Hero — dark gradient with stat row at bottom */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] pt-14 md:pt-20 pb-0">
        <div className="max-w-6xl mx-auto px-4">
          {/* Inline breadcrumb trail */}
          <div className="flex items-center gap-2 mb-6">
            <Link href={`/${area.urlSlug}`} className="text-xs font-semibold text-[#A8F0DC]/70 tracking-[0.15em] uppercase hover:text-[#A8F0DC] transition-colors">{area.name}</Link>
            <span className="text-white/20">/</span>
            <Link href={`/${neighborhood.urlSlug}`} className="text-xs font-semibold text-[#A8F0DC]/70 tracking-[0.15em] uppercase hover:text-[#A8F0DC] transition-colors">{neighborhood.name}</Link>
            <span className="text-white/20">/</span>
            <span className="text-xs font-semibold text-white/40 tracking-[0.15em] uppercase">{service.shortName}</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            {content.h1}
          </h1>
          <p className="text-blue-200/60 text-lg max-w-3xl leading-relaxed mb-8">{content.intro}</p>
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
            <a href="/chat-with-selena" className="bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Chat With Selena
            </a>
            <a href="tel:2122028400" className="text-blue-200/60 font-medium py-3.5 hover:text-white transition-colors underline underline-offset-4">
              or Call (212) 202-8400
            </a>
          </div>
        </div>
        {/* Stat row — anchored to bottom of hero */}
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">{service.priceRange}</p>
                <p className="text-blue-200/40 text-xs">Typical cost</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#A8F0DC] tracking-wide">{service.duration}</p>
                <p className="text-blue-200/40 text-xs">Average duration</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">{service.features.length} Steps</p>
                <p className="text-blue-200/40 text-xs">Included in every clean</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 text-sm mt-1">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">5.0</p>
                  <p className="text-blue-200/40 text-xs">Google rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* Two-column: Features (numbered) + Why Us (dark card) + Pricing card */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
            {/* Left — numbered feature checklist */}
            <div className="lg:col-span-3">
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">What&apos;s Included</h2>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-6">{service.name} Checklist</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.features.map((f, i) => (
                  <div key={f} className="flex items-start gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <span className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A]/30 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-gray-700 text-sm leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — stacked: Why Us dark card + pricing mini card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gradient-to-br from-[#1E2A4A] to-[#243352] rounded-2xl p-7">
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-5">Why {neighborhood.name} Residents Choose Us</h2>
                <ul className="space-y-4">
                  {content.whyUs.map(reason => (
                    <li key={reason} className="flex items-start gap-3">
                      <span className="text-[#A8F0DC] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                      <span className="text-blue-100/70 text-sm leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-2xl p-6 text-center">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide leading-none">{service.priceRange}</p>
                    <p className="text-gray-400 text-xs mt-1">Typical cost</p>
                  </div>
                  <div className="w-px h-10 bg-[#A8F0DC]/30" />
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide leading-none">{service.duration}</p>
                    <p className="text-gray-400 text-xs mt-1">Duration</p>
                  </div>
                </div>
                <a href="/chat-with-selena" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors w-full">
                  Chat With Selena
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Neighborhood expertise — service × housing types */}
      <section className="py-16 bg-gradient-to-b from-[#1E2A4A] to-[#243352]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-[#A8F0DC]/60 tracking-[0.25em] uppercase mb-3 text-center">{service.shortName} Expertise</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-4">{service.name} Tailored for {neighborhood.name} Homes</p>
          <p className="text-blue-200/50 text-center max-w-2xl mx-auto mb-12">
            Our cleaners are experienced with the housing types and cleaning challenges specific to {neighborhood.name}. No learning curve — just expert {service.name.toLowerCase()} from day one.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">{neighborhood.name} Home Types We {service.shortName === 'Regular' ? 'Clean' : 'Handle'}</h3>
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
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">Cleaning Challenges We Handle</h3>
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

      {/* Pricing — mint band */}
      <section className="py-12 bg-[#A8F0DC]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[#1E2A4A] rounded-full flex items-center justify-center">
              <span className="text-white text-xl">$</span>
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-2">{service.name} Pricing in {neighborhood.name}</h3>
            <p className="text-[#1E2A4A]/80 leading-relaxed">
              {service.name} in {neighborhood.name} typically costs {service.priceRange} and takes {service.duration}. We charge a flat hourly rate — $49/hr with your supplies or $65/hr when we bring everything. No travel fees, no surge pricing, no hidden costs. {neighborhood.name} residents pay the same rate as every other neighborhood we serve.
            </p>
            <Link href="/updated-nyc-maid-service-industry-pricing" className="inline-block mt-3 text-[#1E2A4A] font-semibold text-sm underline underline-offset-4">Full pricing details &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Ideal For */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Perfect For</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide text-center mb-10">Who Books {service.name} in {neighborhood.name}?</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {service.idealFor.map(item => (
              <div key={item} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                <p className="text-sm font-medium text-[#1E2A4A]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other services in this neighborhood */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">More Services</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">Other Cleaning Services in {neighborhood.name}</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality — pick the service that fits your needs.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.filter(s => s.slug !== service.slug).map(s => (
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
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {service.name} in {neighborhood.name} — 3 Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: `Reach us at (212) 202-8400 with your ${neighborhood.name} address and tell us you need ${service.name.toLowerCase()}.` },
              { n: '02', t: 'We Confirm', d: `We match you with a cleaner experienced in ${service.name.toLowerCase()} for ${neighborhood.name} homes and lock in your appointment.` },
              { n: '03', t: 'Pay After', d: `Your cleaner arrives on time, completes the ${service.name.toLowerCase()}, and you pay only when you're satisfied. No deposits.` },
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

      {/* Nearby neighborhoods for this service */}
      {neighborhood.nearby.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Also Serving</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">{service.name} Near {neighborhood.name}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality — we offer {service.name.toLowerCase()} across all of {area.name}.</p>
            <NearbyNeighborhoods slugs={neighborhood.nearby} />
          </div>
        </section>
      )}

      <FAQSection faqs={faqs} title={`${service.name} in ${neighborhood.name} — Frequently Asked Questions`} columns={2} />
      <CTABlock title={`Book ${service.name} in ${neighborhood.name}`} subtitle={`Text or call — flat hourly rates across all of ${area.name}.`} />
    </>
  )
}
