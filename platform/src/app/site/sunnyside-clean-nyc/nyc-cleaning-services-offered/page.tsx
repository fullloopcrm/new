import type { Metadata } from 'next'
import Link from 'next/link'
import { SERVICES } from '@/app/site/sunnyside-clean-nyc/_lib/seo/services'
import { breadcrumbSchema, localBusinessSchema, serviceItemListSchema } from '@/app/site/sunnyside-clean-nyc/_lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import ServiceGrid from '@/components/marketing/ServiceGrid'
import CTABlock from '@/components/marketing/CTABlock'

export const metadata: Metadata = {
  title: { absolute: 'NYC Cleaning Services — Deep Clean, Move-In/Out & More | Sunnyside Clean NYC' },
  description: 'All cleaning services by Sunnyside Clean NYC from $59/hr. Deep cleaning, weekly cleaning, move-in/out, same-day, office cleaning and more. Manhattan, Brooklyn & Queens.',
  alternates: { canonical: 'https://www.cleaningservicesunnysideny.com/nyc-cleaning-services-offered' },
  openGraph: {
    title: 'NYC Cleaning Services — Deep Clean, Weekly & More | Sunnyside Clean NYC',
    description: 'Professional cleaning services from $59/hr across Manhattan, Brooklyn & Queens. Licensed, insured, 5-star rated.',
    url: 'https://www.cleaningservicesunnysideny.com/nyc-cleaning-services-offered',
  },
}

export default function ServicesIndexPage() {
  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        serviceItemListSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.cleaningservicesunnysideny.com' },
          { name: 'Services', url: 'https://www.cleaningservicesunnysideny.com/nyc-cleaning-services-offered' },
        ]),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/70 text-sm font-medium">5.0 Google Rating &middot; 27 Reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            NYC House Cleaning Services — Every Type of Clean, One Trusted Team
          </h1>
          <p className="text-blue-200/70 text-lg max-w-3xl leading-relaxed mb-8">
            From <Link href="/services/nyc-maid-service" className="text-[#A8F0DC] underline underline-offset-2">weekly cleaning service</Link> and <Link href="/services/nyc-deep-cleaning-service" className="text-[#A8F0DC] underline underline-offset-2">deep cleaning</Link> to <Link href="/services/nyc-moving-cleaning-service" className="text-[#A8F0DC] underline underline-offset-2">move-in/move-out</Link>, <Link href="/services/nyc-house-cleaning-service" className="text-[#A8F0DC] underline underline-offset-2">house cleaning</Link>, and <Link href="/services/nyc-same-day-cleaning-service" className="text-[#A8F0DC] underline underline-offset-2">same-day emergency service</Link> — our background-checked, insured cleaners handle it all across Manhattan, Brooklyn &amp; Queens.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10">
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; From $59/hr</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; No money upfront</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Licensed &amp; insured</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Background-checked</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <a href="sms:2122028400" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Text (212) 202-8400
            </a>
            <a href="tel:2122028400" className="text-blue-200/70 font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
              or Call Us
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Services', href: '/nyc-cleaning-services-offered' }]} />
      </div>

      {/* Service cards (reuse homepage grid with icons) */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Professional Cleaning for Every Situation</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-14">Choose the Service That Fits Your Needs</p>

          {/* Full service cards with descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {SERVICES.map(service => (
              <Link
                key={service.slug}
                href={`/services/${service.urlSlug}`}
                className="group border border-gray-200 rounded-2xl p-8 hover:border-[#A8F0DC] hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">{service.name}</h3>
                  <span className="text-[#1E2A4A] font-bold text-sm whitespace-nowrap ml-4">From {service.priceRange.split('–')[0]}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">{service.description}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {service.features.slice(0, 3).map(f => (
                    <span key={f} className="bg-gray-50 text-gray-500 text-xs px-3 py-1.5 rounded-full">{f}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{service.duration}</span>
                  <span className="text-[#1E2A4A] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing overview */}
      <section className="py-20 bg-[#A8F0DC]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-xs font-semibold text-[#1E2A4A]/50 tracking-[0.25em] uppercase mb-3">Simple, Transparent Hourly Pricing for All Services</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-6">One Rate — Every Service, Every Neighborhood</p>
          <p className="text-[#1E2A4A]/70 max-w-2xl mx-auto mb-10">
            All of our cleaning services use the same flat hourly rate. No surge pricing, no hidden fees, no different rates per service type. The only variable is whether you provide supplies or we bring everything.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto mb-10">
            <div className="bg-white rounded-2xl p-6">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Client Supplies</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">$59<span className="text-xl text-gray-300">/hr</span></p>
              <p className="text-[#1E2A4A] text-[10px] font-semibold tracking-wide mt-2">10% off weekly &middot; 5% off biweekly/monthly</p>
            </div>
            <div className="bg-[#1E2A4A] rounded-2xl p-6 shadow-lg">
              <p className="text-xs font-semibold text-[#A8F0DC]/70 tracking-[0.15em] uppercase mb-2">We Bring Everything</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-white tracking-wide">$79<span className="text-xl text-blue-200/40">/hr</span></p>
              <p className="text-[#A8F0DC] text-[10px] font-semibold tracking-wide mt-2">20% off weekly &middot; 10% off biweekly/monthly</p>
            </div>
            <div className="bg-white rounded-2xl p-6">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Same-Day</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">$99<span className="text-xl text-gray-300">/hr</span></p>
            </div>
          </div>
          <Link href="/nyc-cleaning-service-pricing" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
            View Full Pricing Details
          </Link>
        </div>
      </section>

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Why New Yorkers Choose Sunnyside Clean NYC</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide leading-tight mb-6">Same Professional Standards — Every Service, Every Visit</p>
            <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
            <p className="text-gray-600 leading-relaxed mb-5">
              Whether you book a <Link href="/services/nyc-deep-cleaning-service" className="text-[#1E2A4A] underline underline-offset-2">deep clean</Link>, a <Link href="/services/nyc-maid-service" className="text-[#1E2A4A] underline underline-offset-2">weekly cleaning service</Link>, or a <Link href="/services/nyc-same-day-cleaning-service" className="text-[#1E2A4A] underline underline-offset-2">same-day emergency clean</Link> — you get the same background-checked, insured professional and the same attention to detail. We don&apos;t send different tiers of cleaners for different services.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our cleaners serve <Link href="/service-areas/nyc-cleaning-services" className="text-[#1E2A4A] underline underline-offset-2">Manhattan</Link>, <Link href="/service-areas/brooklyn-cleaning-services" className="text-[#1E2A4A] underline underline-offset-2">Brooklyn</Link>, and <Link href="/service-areas/queens-cleaning-services" className="text-[#1E2A4A] underline underline-offset-2">Queens</Link> — same rates, same quality, no travel fees.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a href="sms:2122028400" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Text Us to Book
              </a>
              <a href="tel:2122028400" className="inline-block text-[#1E2A4A] font-semibold py-3.5 hover:underline underline-offset-4">
                or Call (212) 202-8400
              </a>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Background-Checked & Insured', desc: 'Every cleaner is fully vetted, background-checked, and covered by our general liability insurance and bonding.' },
              { title: 'No Money Upfront', desc: 'You pay only after the cleaning is complete, before the cleaner leaves. No deposits, no pre-charges.' },
              { title: 'Flat Hourly Rate', desc: 'Same rate regardless of service type or neighborhood. $59/hr with your supplies, $79/hr when we bring everything.' },
              { title: 'Same Cleaner Every Time', desc: 'For recurring services, we match you with the same cleaner so they learn your home and your preferences.' },
              { title: 'No Contracts', desc: 'Stay because you\'re happy, not because you\'re locked in. Cancel recurring service with 7 days notice.' },
            ].map(item => (
              <div key={item.title} className="border border-gray-200 rounded-xl p-5">
                <p className="text-[#1E2A4A] font-semibold text-sm mb-1">{item.title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service areas teaser */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Available Across 225+ Neighborhoods</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-4">All Services Available in Every Area We Serve</p>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8">
            Every service listed above is available in all of our coverage areas. Same rates, same quality — whether you&apos;re in the <Link href="/service-areas/upper-east-side-cleaning-services" className="text-[#1E2A4A] underline underline-offset-2">Upper East Side</Link>, <Link href="/service-areas/williamsburg-cleaning-services" className="text-[#1E2A4A] underline underline-offset-2">Williamsburg</Link>, or <Link href="/service-areas/astoria-cleaning-services" className="text-[#1E2A4A] underline underline-offset-2">Astoria</Link>.
          </p>
          <Link href="/service-areas" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
            Browse All Service Areas &rarr;
          </Link>
        </div>
      </section>

      <CTABlock title="Book Any Cleaning Service Today" subtitle="Text or call — trusted by New Yorkers across Manhattan, Brooklyn & Queens." />
    </>
  )
}
