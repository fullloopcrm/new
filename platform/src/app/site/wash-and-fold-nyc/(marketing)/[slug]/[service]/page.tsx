// @ts-nocheck
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getNeighborhoodByUrlSlug,
  getArea,
  ALL_NEIGHBORHOODS,
} from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'
import { SERVICES, getService } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import { neighborhoodServiceContent, neighborhoodFAQs, serviceFAQs, commonServiceFAQs } from '@/app/site/wash-and-fold-nyc/_lib/seo/content'
import { neighborhoodServicePageSchemas, faqSchema } from '@/app/site/wash-and-fold-nyc/_lib/seo/schema'
import JsonLd from '@/app/site/wash-and-fold-nyc/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/wash-and-fold-nyc/_components/marketing/Breadcrumbs'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import NearbyNeighborhoods from '@/app/site/wash-and-fold-nyc/_components/marketing/NearbyNeighborhoods'

interface Props {
  params: Promise<{ slug: string; service: string }>
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, service: serviceSlug } = await params
  const neighborhood = getNeighborhoodByUrlSlug(slug)
  const service = getService(serviceSlug)
  if (!neighborhood || !service) return {}

  const area = getArea(neighborhood.area)!
  const url = `https://www.washandfoldnyc.com/${slug}/${serviceSlug}`
  const title = `${service.name} in ${neighborhood.name}, ${area.name} From $3/lb | The NYC Wash and Fold Service Company`
  const description = `Professional ${service.name.toLowerCase()} in ${neighborhood.name}, ${area.name}. ${service.features.slice(0, 3).join(', ')} & more. ${service.priceRange}. 5.0★ Google. (917) 970-6002`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'The NYC Wash and Fold Service Company', locale: 'en_US' },
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
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-14 md:pt-20 pb-0">
        <div className="max-w-6xl mx-auto px-4">
          {/* Inline breadcrumb trail */}
          <div className="flex items-center gap-2 mb-6">
            <Link href={`/${area.urlSlug}`} className="text-xs font-semibold text-[#4BA3D4]/70 tracking-[0.15em] uppercase hover:text-[#4BA3D4] transition-colors">{area.name}</Link>
            <span className="text-white/20">/</span>
            <Link href={`/${neighborhood.urlSlug}`} className="text-xs font-semibold text-[#4BA3D4]/70 tracking-[0.15em] uppercase hover:text-[#4BA3D4] transition-colors">{neighborhood.name}</Link>
            <span className="text-white/20">/</span>
            <span className="text-xs font-semibold text-white/40 tracking-[0.15em] uppercase">{service.shortName}</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            {content.h1}
          </h1>
          <p className="text-sky-200/60 text-lg max-w-3xl leading-relaxed mb-8">{content.intro}</p>
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">
              Text (917) 970-6002
            </a>
            <a href="tel:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">
              Call (917) 970-6002
            </a>
          </div>
        </div>
        {/* Stat row — anchored to bottom of hero */}
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">{service.priceRange}</p>
                <p className="text-sky-200/40 text-xs">Typical cost</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4] tracking-wide">{service.duration}</p>
                <p className="text-sky-200/40 text-xs">Average duration</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">{service.features.length} Steps</p>
                <p className="text-sky-200/40 text-xs">Included in every clean</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 text-sm mt-1">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">5.0</p>
                  <p className="text-sky-200/40 text-xs">Google rating</p>
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
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">{service.name} Checklist</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.features.map((f, i) => (
                  <div key={f} className="flex items-start gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <span className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c]/30 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-gray-700 text-sm leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — stacked: Why Us dark card + pricing mini card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2B7BB0] rounded-2xl p-7">
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-5">Why {neighborhood.name} Residents Choose Us</h2>
                <ul className="space-y-4">
                  {content.whyUs.map(reason => (
                    <li key={reason} className="flex items-start gap-3">
                      <span className="text-[#4BA3D4] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                      <span className="text-sky-100/80 text-sm leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#F0F8FF] border border-[#4BA3D4]/30 rounded-2xl p-6 text-center">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide leading-none">{service.priceRange}</p>
                    <p className="text-gray-400 text-xs mt-1">Typical cost</p>
                  </div>
                  <div className="w-px h-10 bg-[#4BA3D4]/30" />
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide leading-none">{service.duration}</p>
                    <p className="text-gray-400 text-xs mt-1">Duration</p>
                  </div>
                </div>
                <a href="sms:9179706002" className="inline-block bg-white text-[#4BA3D4] px-6 py-3 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-[#2B7BB0] transition-colors w-full">
                  Text (917) 970-6002
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Neighborhood Story */}
      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">{service.name} in {neighborhood.name}, {area.name}</h2>
          <p className="text-gray-600 leading-relaxed mb-6">{content.neighborhoodStory}</p>
          <p className="text-gray-600 leading-relaxed mb-6">{content.processDetail}</p>
          <p className="text-gray-600 leading-relaxed">{content.comparisonText}</p>
        </div>
      </section>

      {/* Detailed Pricing */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">{service.name} Pricing in {neighborhood.name}</h2>
          <p className="text-gray-600 leading-relaxed mb-8">{content.pricingDetail}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c]">{service.priceRange}</p>
              <p className="text-gray-400 text-xs mt-1">Per order</p>
            </div>
            <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4]">FREE</p>
              <p className="text-gray-400 text-xs mt-1">Pickup & Delivery</p>
            </div>
            <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c]">+$20</p>
              <p className="text-gray-400 text-xs mt-1">Same-Day Rush</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pricing" className="text-[#4BA3D4] text-sm font-medium underline underline-offset-2">Full pricing details</Link>
            <span className="text-gray-300">|</span>
            <Link href="/services" className="text-[#4BA3D4] text-sm font-medium underline underline-offset-2">All services</Link>
            <span className="text-gray-300">|</span>
            <Link href={`/${neighborhood.urlSlug}`} className="text-[#4BA3D4] text-sm font-medium underline underline-offset-2">All services in {neighborhood.name}</Link>
          </div>
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="py-12 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">Save 10% With a Weekly Subscription</h2>
          <p className="text-white/80 text-sm mb-4">Weekly 15 lb: $162/mo &middot; Weekly 20 lb: $216/mo &middot; Biweekly 15 lb: $85.50/mo</p>
          <p className="text-white/60 text-xs">Same driver, consistent schedule, priority processing. Pause or cancel anytime.</p>
        </div>
      </section>

      {/* Neighborhood expertise — service × housing types */}
      <section className="py-16 bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-[#4BA3D4]/60 tracking-[0.25em] uppercase mb-3 text-center">{service.shortName} Expertise</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-4">{service.name} Tailored for {neighborhood.name} Homes</p>
          <p className="text-sky-200/60 text-center max-w-2xl mx-auto mb-12">
            Our team is experienced with the building types and laundry needs specific to {neighborhood.name}. We know the doorman buildings, the walkups, and the shared laundry rooms — and we tailor our {service.name.toLowerCase()} service to fit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">{neighborhood.name} Home Types We {service.shortName === 'Regular' ? 'Clean' : 'Handle'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {neighborhood.housing_types.map(t => (
                  <div key={t} className="flex items-start gap-2.5">
                    <span className="text-[#4BA3D4] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-sky-100/80 text-sm">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mb-5">Cleaning Challenges We Handle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {neighborhood.cleaning_challenges.map(c => (
                  <div key={c} className="flex items-start gap-2.5">
                    <span className="text-[#4BA3D4] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-sky-100/80 text-sm">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — mint band */}
      <section className="py-12 bg-[#4BA3D4]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[#1a3a5c] rounded-full flex items-center justify-center">
              <span className="text-white text-xl">$</span>
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-2">{service.name} Pricing in {neighborhood.name}</h3>
            <p className="text-[#1a3a5c]/80 leading-relaxed">
              {service.name} in {neighborhood.name} is {service.priceRange} with a $39 minimum order. Free pickup and delivery on all orders. Same-day rush is available for a flat $20 fee. Turnaround is {service.duration}. Weekly subscribers save 10% — biweekly subscribers save 5%. No travel fees, no surge pricing, no hidden costs. {neighborhood.name} residents pay the same rate as every other neighborhood we serve across <Link href="/boroughs/manhattan" className="text-[#1a3a5c] underline underline-offset-2">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#1a3a5c] underline underline-offset-2">Brooklyn</Link>, and <Link href="/boroughs/queens" className="text-[#1a3a5c] underline underline-offset-2">Queens</Link>.
            </p>
            <Link href="/pricing" className="inline-block mt-3 text-[#1a3a5c] font-semibold text-sm underline underline-offset-4">Full pricing details &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Ideal For */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Perfect For</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-10">Who Books {service.name} in {neighborhood.name}?</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {service.idealFor.map(item => (
              <div key={item} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                <p className="text-sm font-medium text-[#1a3a5c]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other services in this neighborhood */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">More Services</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1a3a5c] tracking-wide text-center mb-4">Other Laundry Services in {neighborhood.name}</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality — pick the service that fits your needs.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.filter(s => s.slug !== service.slug).map(s => (
              <Link
                key={s.slug}
                href={`/${neighborhood.urlSlug}/${s.slug}`}
                className="group border border-gray-200 rounded-2xl p-6 hover:border-[#4BA3D4] hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide group-hover:text-[#1a3a5c]/70 transition-colors">{s.name}</h3>
                  <span className="text-[#1a3a5c] font-bold text-sm whitespace-nowrap ml-3">From {s.priceRange.split('–')[0]}</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{s.duration}</span>
                  <span className="text-[#1a3a5c] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Book in 3 Steps */}
      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[#4BA3D4]/60 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {service.name} in {neighborhood.name} — 3 Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: `Reach us at (917) 970-6002 with your ${neighborhood.name} address and tell us you need ${service.name.toLowerCase()}.` },
              { n: '02', t: 'We Pick Up', d: `We send a driver to your ${neighborhood.name} address. Leave your bag at the door, with the doorman, or hand it off directly. Free pickup on all orders over $39.` },
              { n: '03', t: 'Delivered Clean', d: `Your ${service.name.toLowerCase()} is completed and delivered back to your door within ${service.duration}. Pay after delivery — no deposits, no upfront charges.` },
            ].map(s => (
              <div key={s.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30 leading-none">{s.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{s.t}</p>
                <p className="text-sky-200/60 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#2B7BB0] transition-colors">
              Text (917) 970-6002
            </a>
          </div>
        </div>
      </section>

      {/* Nearby neighborhoods for this service */}
      {neighborhood.nearby.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Also Serving</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1a3a5c] tracking-wide text-center mb-4">{service.name} Near {neighborhood.name}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality — we offer {service.name.toLowerCase()} across all of {area.name}.</p>
            <NearbyNeighborhoods slugs={neighborhood.nearby} />
          </div>
        </section>
      )}

      {/* Cost Calculator */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">What Does {service.name} Cost in {neighborhood.name}? Real Numbers.</h2>
          <p className="text-gray-600 leading-relaxed mb-6">Here is what {service.name.toLowerCase()} in {neighborhood.name} actually costs for different household sizes, so you can see exactly what to expect on your bill. All prices include free pickup and delivery to any address in {neighborhood.name}, {area.name}.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5">
              <p className="font-semibold text-[#1a3a5c] text-sm">Single Person</p>
              <p className="text-gray-500 text-xs mt-1">10–15 lbs/week</p>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4] mt-2">$39–$45/week</p>
              <p className="text-gray-400 text-xs mt-1">$162/mo with weekly sub (10% off)</p>
            </div>
            <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5">
              <p className="font-semibold text-[#1a3a5c] text-sm">Couple</p>
              <p className="text-gray-500 text-xs mt-1">20–25 lbs/week</p>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4] mt-2">$60–$75/week</p>
              <p className="text-gray-400 text-xs mt-1">$216/mo with weekly sub (10% off)</p>
            </div>
            <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5">
              <p className="font-semibold text-[#1a3a5c] text-sm">Family</p>
              <p className="text-gray-500 text-xs mt-1">30–50 lbs/week</p>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4] mt-2">$90–$150/week</p>
              <p className="text-gray-400 text-xs mt-1">Save 10% with weekly subscription</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">These estimates are based on typical laundry volumes. A single person generates about 10 to 15 pounds of laundry per week — that is roughly four to five outfits plus towels and underwear. Couples typically generate 20 to 25 pounds, which includes bedsheets, bath towels, and two wardrobes of daily wear. Families with children can generate 30 to 50 pounds or more per week, especially with kids in sports, school uniforms, or during summer when outdoor play creates more laundry. At $3 per pound, you always know exactly what your bill will be before we even pick up your bag. No surprises, no variable pricing, no surge rates. The price in {neighborhood.name} is the same as every other neighborhood we serve.</p>
        </div>
      </section>

      {/* How We Handle Your Laundry */}
      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">How We Handle Your {service.name} in {neighborhood.name}</h2>
          <p className="text-gray-600 leading-relaxed mb-6">When you book {service.name.toLowerCase()} in {neighborhood.name}, here is the exact process your laundry goes through. We follow this same 12-step process on every single order — no exceptions, no shortcuts.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Pickup from your door, lobby, or doorman',
              'Tag and inventory every item in your bag',
              'Sort by color — whites, darks, colors, brights',
              'Sort by fabric — delicates, regular, heavy items',
              'Pre-treat every stain individually',
              'Wash each sorted load separately',
              'Dry on correct heat setting per fabric type',
              'Hand-fold every single item',
              'Organize by garment type',
              'Package in sealed clean bags',
              'Quality check against pickup inventory',
              'Deliver back to your door with text notification',
            ].map((step, i) => (
              <div key={step} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-[#4BA3D4]/5">
                <span className="font-[family-name:var(--font-bebas)] text-lg text-[#4BA3D4]/40 mt-0.5 w-6 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-gray-600 text-sm">{step}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mt-6">This process applies whether you are in a {neighborhood.housing_types[0]} or a {neighborhood.housing_types[1]}. We process every order in its own separate batch — your laundry never touches another customer&apos;s clothes. This is how we maintain quality, prevent lost items, and deliver consistent results on every order in {neighborhood.name}.</p>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">Why {neighborhood.name} Residents Trust The NYC Wash and Fold Service Company</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: '&#9733;', label: '5.0 Google Rating', detail: 'Zero negative reviews' },
              { icon: '&#10003;', label: 'Licensed & Insured', detail: 'Full liability coverage' },
              { icon: '&#128274;', label: 'Background Checked', detail: 'Every team member' },
              { icon: '&#128176;', label: 'Pay After Delivery', detail: 'No deposits, no upfront' },
              { icon: '&#128222;', label: 'Real Human Support', detail: 'Text (917) 970-6002' },
              { icon: '&#128230;', label: 'Never Mixed', detail: 'Your order processed alone' },
            ].map(b => (
              <div key={b.label} className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-4 text-center">
                <span className="text-2xl text-[#4BA3D4]" dangerouslySetInnerHTML={{ __html: b.icon }} />
                <p className="text-xs font-semibold text-[#1a3a5c] mt-2">{b.label}</p>
                <p className="text-xs text-gray-400 mt-1">{b.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} title={`${service.name} in ${neighborhood.name} — Frequently Asked Questions`} columns={2} />
      <CTABlock title={`Book ${service.name} in ${neighborhood.name}`} subtitle={`Text or call — ${service.priceRange}, free pickup & delivery across all of ${area.name}.`} />
    </>
  )
}
