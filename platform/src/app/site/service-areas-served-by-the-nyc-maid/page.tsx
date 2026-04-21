import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/lib/seo/locations'
import { SERVICES } from '@/lib/seo/services'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema, areaItemListSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

const allNeighborhoods = AREAS.flatMap(a => getNeighborhoodsByArea(a.slug))
const totalNeighborhoods = allNeighborhoods.length

const areaFAQs = [
  { question: 'What areas does The NYC Maid serve?', answer: `We serve ${totalNeighborhoods}+ neighborhoods across Manhattan, Brooklyn, Queens, Long Island (Nassau County), and New Jersey (Hudson County). Same rates and same quality everywhere.` },
  { question: 'Do you charge extra for certain neighborhoods?', answer: 'No. Our rates are the same regardless of neighborhood or borough — $59/hr with your supplies, $75/hr when we bring everything, and $100/hr for same-day emergency service. No travel fees, no surge pricing.' },
  { question: 'Are all services available in every area?', answer: 'Yes. Every service we offer — deep cleaning, regular cleaning, move-in/out, post-renovation, Airbnb, office, same-day — is available in all neighborhoods we serve.' },
  { question: 'Do you serve areas outside of these neighborhoods?', answer: 'We may. If you don\'t see your neighborhood listed, text (212) 202-9030 and we\'ll let you know. We\'re always expanding.' },
  { question: 'Do I get the same cleaner in my area?', answer: 'Yes. For recurring clients, we assign a dedicated cleaner who lives near your area so they can arrive consistently and on time.' },
  { question: 'How quickly can you schedule a cleaning in my area?', answer: 'We typically schedule within 24–48 hours for standard service. Same-day cleaning is available in most areas — text (212) 202-9030 for availability.' },
  { question: 'Do your cleaners use public transit or drive?', answer: 'It depends on the area. In Manhattan, Brooklyn, and Queens, many of our cleaners use public transit. For Long Island and New Jersey, cleaners typically drive.' },
  { question: 'What if I\'m on the border of two neighborhoods?', answer: 'We serve the entire area, not just specific blocks. If you\'re near any of our listed neighborhoods, we cover your location. Just give us your address and we\'ll confirm.' },
]

const pageUrl = 'https://www.thenycmaid.com/service-areas-served-by-the-nyc-maid'
const pageTitle = `Service Areas — ${totalNeighborhoods}+ Neighborhoods in NYC, Long Island & NJ | The NYC Maid`
const pageDescription = `The NYC Maid serves ${totalNeighborhoods}+ neighborhoods across Manhattan, Brooklyn, Queens, Long Island & New Jersey. Same rates everywhere — $59/hr. Find professional cleaning in your neighborhood. (212) 202-9030`

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    type: 'website',
    siteName: 'The NYC Maid',
    locale: 'en_US',
    images: [{ url: 'https://www.thenycmaid.com/icon-512.png', width: 512, height: 512, alt: 'The NYC Maid' }],
  },
  twitter: {
    card: 'summary',
    title: pageTitle,
    description: pageDescription,
  },
  other: {
    'geo.region': 'US-NY',
    'geo.placename': 'New York City',
    'geo.position': '40.7589;-73.9851',
    'ICBM': '40.7589, -73.9851',
  },
}

export default function AreasIndexPage() {
  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          breadcrumb: [
            { name: 'Home', url: 'https://www.thenycmaid.com' },
            { name: 'Service Areas', url: pageUrl },
          ],
        }),
        localBusinessSchema(),
        howToBookSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Service Areas', url: pageUrl },
        ]),
        areaItemListSchema(),
        faqSchema(areaFAQs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/70 text-sm font-medium">5.0 Rating &middot; 50+ Reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            {totalNeighborhoods}+ Neighborhoods Across NYC, Long Island &amp; New Jersey
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-10">
            Professional house cleaning from $59/hr in every neighborhood we serve. Same rates, same quality, same background-checked cleaners — whether you&apos;re in Manhattan, Brooklyn, Queens, Long Island, or New Jersey.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; From $59/hr</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Same rate everywhere</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; No travel fees</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; All services available</span>
          </div>
        </div>
      </section>

      {/* Area summary strip */}
      <section className="bg-[#A8F0DC] py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-x-10 gap-y-3">
          {AREAS.map(area => {
            const count = getNeighborhoodsByArea(area.slug).length
            return (
              <a key={area.slug} href={`#${area.slug}`} className="flex items-center gap-2 text-[#1E2A4A] hover:underline underline-offset-2">
                <span className="font-semibold">{area.name}</span>
                <span className="text-[#1E2A4A]/50 text-sm">({count})</span>
              </a>
            )
          })}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Service Areas', href: '/service-areas-served-by-the-nyc-maid' }]} />

        {/* Area sections */}
        {AREAS.map(area => {
          const neighborhoods = getNeighborhoodsByArea(area.slug)
          return (
            <section key={area.slug} id={area.slug} className="mb-16 scroll-mt-8">
              <div className="flex items-end justify-between mb-2">
                <Link href={`/${area.urlSlug}`} className="group">
                  <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-1">{neighborhoods.length} Neighborhoods</p>
                  <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide group-hover:underline underline-offset-4">{area.name}</h2>
                </Link>
                <Link href={`/${area.urlSlug}`} className="text-[#1E2A4A] text-sm font-medium hover:underline underline-offset-2 hidden md:inline">
                  View {area.name} &rarr;
                </Link>
              </div>
              <p className="text-gray-500 text-sm mb-6 max-w-2xl">{area.description}</p>
              <div className="w-10 h-[2px] bg-[#A8F0DC] mb-6" />

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {neighborhoods.map(n => (
                  <Link
                    key={n.slug}
                    href={`/${n.urlSlug}`}
                    className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-[#A8F0DC] hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-[#1E2A4A] group-hover:underline underline-offset-2 text-sm mb-1">{n.name}</h3>
                    <p className="text-xs text-gray-400">{n.zip_codes.slice(0, 2).join(', ')}</p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {/* Services available everywhere */}
        <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8 md:p-14 mb-20">
          <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Available in Every Neighborhood</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-8">All 10 Services — Same Rate Everywhere</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map(service => (
              <Link
                key={service.slug}
                href={`/services/${service.urlSlug}`}
                className="group flex items-center justify-between bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-colors"
              >
                <div>
                  <p className="text-white font-semibold text-sm group-hover:underline underline-offset-2">{service.name}</p>
                  <p className="text-blue-200/50 text-xs">{service.duration}</p>
                </div>
                <span className="text-[#A8F0DC] font-bold text-sm whitespace-nowrap ml-3">{service.priceRange}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Common Questions</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">Service Area FAQ</p>
          <div className="w-10 h-[2px] bg-[#A8F0DC] mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {areaFAQs.map((faq, i) => (
              <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h2 className="font-semibold text-[#1E2A4A] text-sm text-left pr-4">{faq.question}</h2>
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Don't see your neighborhood */}
        <section className="bg-[#A8F0DC] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">Don&apos;t See Your Neighborhood?</p>
          <p className="text-[#1E2A4A]/60 max-w-xl mx-auto mb-8">
            We&apos;re always expanding. Text us with your address and we&apos;ll let you know if we cover your area — we probably do.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="sms:2122029030" className="bg-[#1E2A4A] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
              Text (212) 202-9030
            </a>
            <a href="sms:2122029030" className="text-[#1E2A4A] font-semibold underline underline-offset-4 hover:no-underline">
              or Text (212) 202-9030
            </a>
          </div>
        </section>
      </div>

      <CTABlock title="Book Your NYC Cleaning Service Today" subtitle="Text us — trusted by New Yorkers across Manhattan, Brooklyn, Queens, Long Island & New Jersey." />
    </>
  )
}
