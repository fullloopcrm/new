import type { Metadata } from 'next'
import Link from 'next/link'
import { SERVICES } from '@/app/site/long-island-maid/_lib/seo/services'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/app/site/long-island-maid/_lib/seo/schema'
import JsonLd from '@/app/site/long-island-maid/_components/JsonLd'
import Breadcrumbs from '@/app/site/long-island-maid/_components/Breadcrumbs'
import CTABlock from '@/app/site/long-island-maid/_components/CTABlock'

const areaFAQs = [
  { question: 'What areas does The Long Island Maid serve?', answer: 'We serve Long Island and the surrounding area. Same rates and same quality everywhere — text (516) 202-5900 with your address and we\'ll confirm coverage.' },
  { question: 'Do you charge extra for certain areas?', answer: 'No. Our rates are the same across our entire service area — $59/hr with your supplies (recurring: 10% off weekly, 5% off biweekly/monthly), $69/hr when we bring everything (recurring: 20% off weekly, 10% off biweekly/monthly), and $89/hr for same-day emergency service. No travel fees, no surge pricing.' },
  { question: 'Are all services available everywhere you serve?', answer: 'Yes. Every service we offer — deep cleaning, regular cleaning, move-in/out, post-renovation, Airbnb, office, same-day — is available throughout our service area.' },
  { question: 'Do you serve areas outside your core coverage?', answer: 'We may. Text (516) 202-5900 with your address and we\'ll let you know — we\'re always expanding.' },
  { question: 'Do I get the same cleaner every visit?', answer: 'Yes. For recurring clients, we assign a dedicated cleaner so they can arrive consistently and on time.' },
  { question: 'How quickly can you schedule a cleaning?', answer: 'We typically schedule within 24-48 hours for standard service. Same-day cleaning is available in most cases — text (516) 202-5900 for availability. A 2-hour minimum applies (first-time cleanings included). Bookings with 2 or more cleaners carry a 4-hour minimum and receive no discounts.' },
]

const pageUrl = 'https://www.thelongislandmaid.com/service-areas-served-by-the-nyc-maid'
const pageTitle = `Service Area | The Long Island Maid`
const pageDescription = `The Long Island Maid serves Long Island and the surrounding area. Same rates everywhere — $59/hr. Text (516) 202-5900 to confirm coverage for your address.`

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    type: 'website',
    siteName: 'The Long Island Maid',
    locale: 'en_US',
    images: [{ url: 'https://www.thelongislandmaid.com/icon-512.png', width: 512, height: 512, alt: 'The Long Island Maid' }],
  },
  twitter: {
    card: 'summary',
    title: pageTitle,
    description: pageDescription,
  },
  other: {
    'geo.region': 'US-NY',
    'geo.placename': 'Long Island',
    'geo.position': '40.7370;-73.5594',
    'ICBM': '40.7370, -73.5594',
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
            { name: 'Home', url: 'https://www.thelongislandmaid.com' },
            { name: 'Service Area', url: pageUrl },
          ],
        }),
        localBusinessSchema(),
        howToBookSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thelongislandmaid.com' },
          { name: 'Service Area', url: pageUrl },
        ]),
        faqSchema(areaFAQs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/70 text-sm font-medium">5.0 Rating &middot; Verified Reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Proudly Serving Long Island
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-10">
            Professional house cleaning from $59/hr, background-checked cleaners, and the same flat rate everywhere in our service area. Text (516) 202-5900 with your address and we&apos;ll confirm coverage.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; From $59/hr</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Same rate everywhere</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; No travel fees</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; All services available</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Service Area', href: '/service-areas-served-by-the-nyc-maid' }]} />

        {/* Services available everywhere */}
        <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8 md:p-14 mb-20">
          <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Available Everywhere We Serve</p>
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

        {/* Confirm your address */}
        <section className="bg-[#A8F0DC] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">Not Sure If We Cover Your Address?</p>
          <p className="text-[#1E2A4A]/60 max-w-xl mx-auto mb-8">
            We&apos;re always expanding. Text us your address and we&apos;ll let you know if we cover your area — we probably do.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="/book/new" className="bg-[#1E2A4A] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
              Self-book, save $10
            </a>
            <a href="sms:5162025900" className="text-[#1E2A4A] font-semibold underline underline-offset-4 hover:no-underline">
              Text us for questions
            </a>
          </div>
        </section>
      </div>

      <CTABlock title="Book Your Long Island Cleaning Service Today" subtitle="Text us — background-checked, insured cleaners serving Long Island." />
    </>
  )
}
