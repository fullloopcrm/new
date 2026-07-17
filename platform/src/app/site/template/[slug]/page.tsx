import type { Metadata } from 'next'
import { requireCleaningTenant } from '@/app/site/template/_lib/gate'
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
} from '@/app/site/template/_lib/seo/locations'
import { SERVICES } from '@/app/site/template/_lib/seo/services'
import { areaContent, neighborhoodContent, neighborhoodFAQs, commonServiceFAQs, neighborhoodVibe, neighborhoodKnownFor, neighborhoodFunFacts } from '@/app/site/template/_lib/seo/content'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { toBrand } from '@/app/site/template/_lib/seo/brand'
import { areaPageSchemas, neighborhoodPageSchemas, faqSchema, buildBusiness } from '@/app/site/template/_lib/seo/schema'
import { getSeoOverride } from '@/lib/seo/overrides'
import { pickLifestylePhoto } from '@/app/site/template/_lib/seo/photos'
import Image from 'next/image'
import JsonLd from '@/app/site/template/_components/JsonLd'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'
import FAQSection from '@/app/site/template/_components/FAQSection'
import CTABlock from '@/app/site/template/_components/CTABlock'
import NearbyNeighborhoods from '@/app/site/template/_components/NearbyNeighborhoods'

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true

// This route resolves the tenant from request headers (getSiteConfig → headers())
// to personalize per-tenant, so it must render dynamically. Without this, Next
// tries to statically optimize (generateStaticParams returns []) and throws
// "Page changed from static to dynamic at runtime, reason: headers" → 500.
export const dynamic = 'force-dynamic'

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const brand = toBrand(await getSiteConfig())
  const area = getAreaByUrlSlug(slug)
  if (area) {
    const url = `${brand.url}/${slug}`
    const override = await getSeoOverride(url)
    const title = override?.title || `${area.name} Maid Service & House Cleaning From $59/hr | ${brand.name}`
    const description = override?.description || `Professional house cleaning in ${area.name} from $59/hr. Deep cleaning, weekly maid service, move-in/out & more. Licensed, insured, 5.0★ Rated. ${brand.phone}`
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: 'website', siteName: brand.siteName, locale: 'en_US' },
      twitter: { card: 'summary_large_image', title, description },
      other: { 'geo.region': `US-${area.state}`, 'geo.placename': area.name, 'geo.position': `${area.lat};${area.lng}`, 'ICBM': `${area.lat}, ${area.lng}` },
    }
  }

  const neighborhood = getNeighborhoodByUrlSlug(slug)
  if (neighborhood) {
    const neighborhoodArea = getArea(neighborhood.area)!
    const url = `${brand.url}/${slug}`
    const override = await getSeoOverride(url)
    const title = override?.title || `${neighborhood.name} Maid Service & House Cleaning From $59/hr | ${brand.name}`
    const description = override?.description || `Professional cleaning in ${neighborhood.name}, ${neighborhoodArea.name}. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. From $59/hr. 5.0★ Rated. ${brand.phone}`
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: 'website', siteName: brand.siteName, locale: 'en_US' },
      twitter: { card: 'summary_large_image', title, description },
      other: { 'geo.region': `US-${neighborhoodArea.state}`, 'geo.placename': neighborhood.name, 'geo.position': `${neighborhood.lat};${neighborhood.lng}`, 'ICBM': `${neighborhood.lat}, ${neighborhood.lng}` },
    }
  }

  return {}
}

export default async function SlugPage({ params }: Props) {
  await requireCleaningTenant()
  const { slug } = await params
  const config = await getSiteConfig()
  const brand = toBrand(config)
  const biz = buildBusiness(config)

  // ============ AREA PAGE ============
  const area = getAreaByUrlSlug(slug)
  if (area) {
    const content = areaContent(area, brand)
    const neighborhoods = getNeighborhoodsByArea(area.slug)
    const areaPhoto = pickLifestylePhoto(area.slug, brand)

    return (
      <>
        <JsonLd data={areaPageSchemas(biz, area)} />

        {/* Hero */}
        <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-blue-200/60 text-sm">5.0 Rating &middot; 50+ verified reviews</span>
                </div>
                <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide leading-[0.95] mb-5">
                  {area.name} Maid Service & House Cleaning — From $59/hr
                </h1>
                <p className="text-blue-200/60 text-lg leading-relaxed mb-6">{content.intro}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8">
                  <span className="text-[var(--accent)] text-sm font-medium">&#10003; From $59/hr</span>
                  <span className="text-[var(--accent)] text-sm font-medium">&#10003; No money upfront</span>
                  <span className="text-[var(--accent)] text-sm font-medium">&#10003; Licensed &amp; insured</span>
                  <span className="text-[var(--accent)] text-sm font-medium">&#10003; Background-checked</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link href="/book/new" className="bg-[var(--accent)] text-[var(--brand)] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
                    Self Booking $10 OFF
                  </Link>
                  <a href={`sms:${config.contact.phoneDigits}`} className="bg-white/10 border border-white/30 text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-white/20 transition-colors">
                    Text {config.contact.phone}
                  </a>
                </div>
              </div>
              {/* Pricing card */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-7 shadow-xl">
                  <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-5">Flat Hourly Rate — All {area.name}</p>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex-1 bg-gray-100 rounded-xl py-5 px-4 text-center">
                      <p className="font-[family-name:var(--font-bebas)] text-5xl text-[var(--brand)] tracking-wide leading-none">$59<span className="text-xl text-gray-400">/hr</span></p>
                      <p className="text-gray-500 text-xs mt-2">Your supplies</p>
                      <p className="text-[var(--brand)] text-[10px] font-semibold mt-1">10% off weekly &middot; 5% biweekly/monthly</p>
                    </div>
                    <div className="flex-1 bg-[var(--brand)] rounded-xl py-5 px-4 text-center">
                      <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide leading-none">$69<span className="text-xl text-blue-200/40">/hr</span></p>
                      <p className="text-[rgb(var(--accent-rgb)/0.7)] text-xs mt-2">We bring everything</p>
                      <p className="text-[var(--accent)] text-[10px] font-semibold mt-1">20% off weekly &middot; 10% biweekly/monthly</p>
                    </div>
                  </div>
                  <div className="border border-[rgb(var(--accent-rgb)/0.4)] bg-[#E8F8F1] rounded-xl p-4 mb-5 text-center">
                    <p className="text-gray-500 text-xs mb-1">{neighborhoods.length} Neighborhoods Served</p>
                    <p className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide">Same Rate Everywhere</p>
                    <p className="text-[rgb(var(--brand-rgb)/0.6)] text-xs mt-1">No travel fees &middot; No surge pricing</p>
                  </div>
                  <a href={`sms:${config.contact.phoneDigits}`} className="block text-center bg-[var(--accent)] text-[var(--brand)] px-6 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
                    Text {config.contact.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real cleaning photo — de-duplicates this page from other area pages */}
        <section className="bg-white">
          <figure className="relative aspect-[21/9] w-full overflow-hidden max-h-[520px]">
            <Image
              src={areaPhoto.src}
              alt={`${areaPhoto.alt} — cleaning services in ${area.name}`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <figcaption className="sr-only">{areaPhoto.caption} — {area.name} cleaning service by {brand.name}</figcaption>
          </figure>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <Breadcrumbs items={[{ name: area.name, href: `/${area.urlSlug}` }]} />
        </div>

        {/* Neighborhoods — two column split */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[var(--accent)] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide leading-tight mb-4">{area.name} Neighborhoods We Serve</h2>
                <p className="text-gray-500 leading-relaxed mb-6">Every neighborhood below gets the same rates, the same quality, and the same background-checked cleaners. Click any neighborhood to see services available in your area.</p>
                <a href={`sms:${config.contact.phoneDigits}`} className="inline-block bg-[var(--accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
                  Text {config.contact.phone}
                </a>
              </div>
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {neighborhoods.map(n => (
                  <Link
                    key={n.slug}
                    href={`/${n.urlSlug}`}
                    className="group border border-gray-200 rounded-xl p-5 hover:border-[var(--accent)] hover:shadow-md transition-all bg-white"
                  >
                    <h3 className="font-semibold text-[var(--brand)] group-hover:text-[rgb(var(--brand-rgb)/0.7)] transition-colors mb-1">{n.name}</h3>
                    <p className="text-gray-400 text-sm">{n.housing_types.slice(0, 2).join(' · ')}</p>
                    <p className="text-[var(--brand)] text-xs font-medium mt-3 group-hover:underline underline-offset-4">View Services &rarr;</p>
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
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Every Cleaning Service Available in {area.name}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">From weekly maid service to deep cleaning, move-in/out, and same-day emergency cleans — all at the same flat hourly rate.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICES.map(s => (
                <Link
                  key={s.slug}
                  href={`/services/${s.urlSlug}`}
                  className="group border border-gray-200 rounded-2xl p-6 hover:border-[var(--accent)] hover:shadow-lg transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide group-hover:text-[rgb(var(--brand-rgb)/0.7)] transition-colors">{s.name}</h3>
                    <span className="text-[var(--brand)] font-bold text-sm whitespace-nowrap ml-3">From {s.priceRange.split('–')[0]}</span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{s.duration}</span>
                    <span className="text-[var(--brand)] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Book in 3 Steps */}
        <section className="py-20 bg-[var(--brand)]">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs font-semibold text-[rgb(var(--accent-rgb)/0.6)] tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {area.name} Cleaning in 3 Steps</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { n: '01', t: 'Text Us', d: `Reach us at ${config.contact.phone} with your ${area.name} address, preferred date, and any special requests.` },
                { n: '02', t: 'We Confirm', d: 'We match you with a background-checked, insured cleaner and lock in your appointment — usually within the hour.' },
                { n: '03', t: 'Pay After', d: 'Your cleaner arrives on time, does the work, and you pay only after the cleaning is complete. No deposits ever.' },
              ].map(s => (
                <div key={s.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                  <span className="font-[family-name:var(--font-bebas)] text-5xl text-[rgb(var(--accent-rgb)/0.3)] leading-none">{s.n}</span>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{s.t}</p>
                  <p className="text-blue-200/50 text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <a href={`sms:${config.contact.phoneDigits}`} className="bg-[var(--accent)] text-[var(--brand)] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
                Text {config.contact.phone}
              </a>
            </div>
          </div>
        </section>

        <CTABlock title={`Book Your ${area.name} Cleaning Today`} subtitle={`Text us — serving every ${area.name} neighborhood at the same flat hourly rate.`} phone={config.contact.phone} phoneDigits={config.contact.phoneDigits} reviewUrl={config.reviewUrl} />
      </>
    )
  }

  // ============ NEIGHBORHOOD PAGE ============
  const neighborhood = getNeighborhoodByUrlSlug(slug)
  if (neighborhood) {
    const neighborhoodArea = getArea(neighborhood.area)!
    const content = neighborhoodContent(neighborhood, neighborhoodArea, brand)
    const baseFaqs = neighborhoodFAQs(neighborhood, neighborhoodArea, brand)
    const common = commonServiceFAQs(SERVICES[0], brand)
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
    const neighborhoodPhoto = pickLifestylePhoto(neighborhood.slug, brand)

    return (
      <>
        <JsonLd data={[...neighborhoodPageSchemas(biz, neighborhood, neighborhoodArea), faqSchema(faqs)]} />

        {/* Hero — centered, light background, neighborhood-focused */}
        <section className="bg-white border-b border-gray-100 pt-14 md:pt-20 pb-0">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Link href={`/${neighborhoodArea.urlSlug}`} className="text-xs font-semibold text-[var(--accent)] tracking-[0.2em] uppercase hover:text-[var(--brand)] transition-colors">{neighborhoodArea.name}</Link>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase">{neighborhood.name}</span>
            </div>
            <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-[var(--brand)] tracking-wide leading-[0.9] mb-5">
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
              <a href={`sms:${config.contact.phoneDigits}`} className="bg-[var(--brand)] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
                Text {config.contact.phone}
              </a>
              <a href={`sms:${config.contact.phoneDigits}`} className="text-[var(--brand)] font-semibold py-4 hover:underline underline-offset-4">
                or Text {config.contact.phone}
              </a>
            </div>
          </div>
          {/* Pricing bar — anchored to bottom of hero */}
          <div className="bg-[var(--brand)]">
            <div className="max-w-5xl mx-auto px-4 py-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide">$59</span>
                    <span className="text-blue-200/50 text-sm">/hr &middot; your supplies</span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-white/20" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--accent)] tracking-wide">$69</span>
                    <span className="text-blue-200/50 text-sm">/hr &middot; we bring everything</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 text-sm">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-blue-200/50 text-sm">5.0 Rating &middot; 50+ Reviews</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real cleaning photo — unique per neighborhood for duplicate protection */}
        <section className="bg-white">
          <figure className="relative aspect-[21/9] w-full overflow-hidden max-h-[520px]">
            <Image
              src={neighborhoodPhoto.src}
              alt={`${neighborhoodPhoto.alt} — cleaning services in ${neighborhood.name}, ${neighborhoodArea.name}`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <figcaption className="sr-only">{neighborhoodPhoto.caption} — {neighborhood.name}, {neighborhoodArea.name} cleaning service by {brand.name}</figcaption>
          </figure>
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
                <p className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide leading-tight mb-4">Life in {neighborhood.name}</p>
                <div className="w-12 h-[2px] bg-[var(--accent)] mb-6" />
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
                  <a href={`sms:${config.contact.phoneDigits}`} className="inline-block bg-[var(--accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
                    Text {config.contact.phone}
                  </a>
                  <a href={`sms:${config.contact.phoneDigits}`} className="text-[var(--brand)] font-semibold hover:underline underline-offset-4">
                    or Text {config.contact.phone}
                  </a>
                </div>
              </div>

              {/* Right — at a glance + known for */}
              <div className="space-y-6">
                <div className="bg-[var(--surface)] border border-[rgb(var(--accent-rgb)/0.3)] rounded-2xl p-8">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-5">{neighborhood.name} at a Glance</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {funFacts.map(fact => (
                      <div key={fact.label}>
                        <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide">{fact.value}</p>
                        <p className="text-gray-500 text-sm">{fact.label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{fact.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl p-8">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-5">{neighborhood.name} Is Known For</h3>
                  <ul className="space-y-3.5">
                    {knownFor.map(item => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="text-[var(--accent)] mt-0.5 text-lg">&#10003;</span>
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
        <section className="py-16 bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)]">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-[rgb(var(--accent-rgb)/0.6)] tracking-[0.25em] uppercase mb-3 text-center">Local Cleaning Expertise</h2>
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
                      <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
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
                      <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-blue-100/70 text-sm">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing callout — mint background */}
        <section className="py-12 bg-[var(--accent)]">
          <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-[var(--brand)] rounded-full flex items-center justify-center">
                <span className="text-white text-xl">$</span>
              </div>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-2">{neighborhood.name} Cleaning Costs</h3>
              <p className="text-[rgb(var(--brand-rgb)/0.8)] leading-relaxed">
                House cleaning in {neighborhood.name} starts at $59/hr with your supplies (recurring: 10% off weekly, 5% off biweekly/monthly), $69/hr when we bring everything (recurring: 20% off weekly, 10% off biweekly/monthly), or $89/hr for same-day emergency service. A typical {neighborhood.name} apartment cleaning runs $98–$276 depending on size and service type. Deep cleans, move-in/move-out, and post-renovation jobs take longer but use the same flat hourly rate. No travel fees, no surge pricing — {neighborhood.name} residents pay the same rate as every other neighborhood we serve.
              </p>
              <Link href="/pricing" className="inline-block mt-3 text-[var(--brand)] font-semibold text-sm underline underline-offset-4">Full pricing details &rarr;</Link>
            </div>
          </div>
        </section>

        {/* Services — full showcase grid */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Cleaning Services</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Every Cleaning Service Available in {neighborhood.name}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">From weekly maid service to deep cleaning, move-in/out, and same-day emergency cleans — all at the same flat hourly rate.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SERVICES.map(s => (
                <Link
                  key={s.slug}
                  href={`/${neighborhood.urlSlug}/${s.slug}`}
                  className="group border border-gray-200 rounded-2xl p-6 hover:border-[var(--accent)] hover:shadow-lg transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide group-hover:text-[rgb(var(--brand-rgb)/0.7)] transition-colors">{s.name}</h3>
                    <span className="text-[var(--brand)] font-bold text-sm whitespace-nowrap ml-3">From {s.priceRange.split('–')[0]}</span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{s.duration}</span>
                    <span className="text-[var(--brand)] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Book in 3 Steps */}
        <section className="py-20 bg-[var(--brand)]">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs font-semibold text-[rgb(var(--accent-rgb)/0.6)] tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {neighborhood.name} Cleaning in 3 Steps</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { n: '01', t: 'Text Us', d: `Reach us at ${config.contact.phone} with your ${neighborhood.name} address, preferred date, and any special requests.` },
                { n: '02', t: 'We Confirm', d: 'We match you with a background-checked, insured cleaner and lock in your appointment — usually within the hour.' },
                { n: '03', t: 'Pay After', d: 'Your cleaner arrives on time, does the work, and you pay only after the cleaning is complete. No deposits ever.' },
              ].map(s => (
                <div key={s.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                  <span className="font-[family-name:var(--font-bebas)] text-5xl text-[rgb(var(--accent-rgb)/0.3)] leading-none">{s.n}</span>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{s.t}</p>
                  <p className="text-blue-200/50 text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <a href={`sms:${config.contact.phoneDigits}`} className="bg-[var(--accent)] text-[var(--brand)] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
                Text {config.contact.phone}
              </a>
            </div>
          </div>
        </section>

        {/* Nearby neighborhoods — styled cards with details */}
        {neighborhood.nearby.length > 0 && (
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Also Serving</h2>
              <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Neighborhoods Near {neighborhood.name}</p>
              <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality, same background-checked cleaners — no matter which {neighborhoodArea.name} neighborhood you call home.</p>
              <NearbyNeighborhoods slugs={neighborhood.nearby} />
            </div>
          </section>
        )}

        <FAQSection faqs={faqs} title={`${neighborhood.name} Cleaning — Frequently Asked Questions`} columns={2} />
        <CTABlock title={`Book Your ${neighborhood.name} Cleaning Today`} subtitle={`Text us — same rates, same quality across all of ${neighborhoodArea.name}.`} phone={config.contact.phone} phoneDigits={config.contact.phoneDigits} reviewUrl={config.reviewUrl} />
      </>
    )
  }

  notFound()
}
