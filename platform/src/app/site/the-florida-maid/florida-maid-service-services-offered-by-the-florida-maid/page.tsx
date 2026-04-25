import type { Metadata } from 'next'
import Link from 'next/link'
import { SERVICES } from '@/app/site/the-florida-maid/_lib/seo/services'
import { breadcrumbSchema, localBusinessSchema, serviceItemListSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'
import ServiceGrid from '@/app/site/the-florida-maid/_components/marketing/ServiceGrid'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'

export const metadata: Metadata = {
  title: { absolute: 'Florida Home & Business Cleaning Services | The Florida Maid' },
  description: 'All cleaning services by The Florida Maid from $49/hr. Deep cleaning, weekly maid service, move-in/out, post-construction, Airbnb, same-day. 25,000+ homes served. 5.0★, $1M insured.',
  alternates: { canonical: 'https://www.thefloridamaid.com/florida-maid-service-services-offered-by-the-florida-maid' },
  openGraph: {
    title: 'Florida Home & Business Cleaning Services | The Florida Maid',
    description: 'Professional cleaning services from $49/hr across Florida. 25,000+ homes served. 5.0★ rated, $1M insured.',
    url: 'https://www.thefloridamaid.com/florida-maid-service-services-offered-by-the-florida-maid',
  },
}

export default function ServicesIndexPage() {
  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        serviceItemListSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thefloridamaid.com' },
          { name: 'Services', url: 'https://www.thefloridamaid.com/florida-maid-service-services-offered-by-the-florida-maid' },
        ]),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-white text-sm font-medium">5.0 Google Rating &middot; 27 Reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Florida House Cleaning Services — Every Type of Clean, One Trusted Team
          </h1>
          <p className="text-white text-lg max-w-3xl leading-relaxed mb-8">
            From <Link href="/services/weekly-maid-service-in-florida" className="text-[#34D399] underline underline-offset-2">weekly maid service</Link> and <Link href="/services/deep-cleaning-service-in-florida" className="text-[#34D399] underline underline-offset-2">deep cleaning</Link> to <Link href="/services/move-in-move-out-cleaning-service-in-florida" className="text-[#34D399] underline underline-offset-2">move-in/move-out</Link>, <Link href="/services/post-construction-cleanup-service-in-florida" className="text-[#34D399] underline underline-offset-2">post-renovation cleanup</Link>, and <Link href="/services/same-day-cleaning-service-in-florida" className="text-[#34D399] underline underline-offset-2">same-day emergency service</Link> — our background-checked, insured cleaners handle it all across Miami, Tampa, Orlando, Fort Lauderdale &amp; Jacksonville.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10">
            <span className="text-[#34D399] text-sm font-medium">&#10003; From $49/hr</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; No money upfront</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; Licensed &amp; insured</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; Background-checked</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <a href="sms:9547103636" className="bg-[#34D399] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Text (954) 710-3636
            </a>
            <a href="tel:9547103636" className="text-white font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
              or Call Us
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Services', href: '/florida-maid-service-services-offered-by-the-florida-maid' }]} />
      </div>

      {/* Service cards (reuse homepage grid with icons) */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Professional Cleaning for Every Situation</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-14">Choose the Service That Fits Your Needs</p>

          {/* Full service cards with descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {SERVICES.map(service => (
              <Link
                key={service.slug}
                href={`/services/${service.urlSlug}`}
                className="group border border-gray-200 rounded-2xl p-8 hover:border-[#34D399] hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">{service.name}</h3>
                  <span className="text-[#CC6222] font-bold text-sm whitespace-nowrap ml-4">From {service.priceRange.split('–')[0]}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">{service.description}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {service.features.slice(0, 3).map(f => (
                    <span key={f} className="bg-gray-50 text-gray-500 text-xs px-3 py-1.5 rounded-full">{f}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{service.duration}</span>
                  <span className="text-[#CC6222] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing overview */}
      <section className="py-20 bg-[#34D399]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-xs font-semibold text-[#CC6222]/50 tracking-[0.25em] uppercase mb-3">Simple, Transparent Hourly Pricing for All Services</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-6">One Rate — Every Service, Every Neighborhood</p>
          <p className="text-[#CC6222]/70 max-w-2xl mx-auto mb-10">
            All of our cleaning services use the same flat hourly rate. No surge pricing, no hidden fees, no different rates per service type. The only variable is whether you provide supplies or we bring everything.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto mb-10">
            <div className="bg-white rounded-2xl p-6">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Client Supplies</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide">$49<span className="text-xl text-gray-300">/hr</span></p>
            </div>
            <div className="bg-[#CC6222] rounded-2xl p-6 shadow-lg">
              <p className="text-xs font-semibold text-[#34D399]/70 tracking-[0.15em] uppercase mb-2">We Bring Everything</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-white tracking-wide">$65<span className="text-xl text-white/60">/hr</span></p>
            </div>
            <div className="bg-white rounded-2xl p-6">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Same-Day</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide">$100<span className="text-xl text-gray-300">/hr</span></p>
            </div>
          </div>
          <Link href="/updated-florida-maid-service-industry-pricing" className="inline-block bg-[#CC6222] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
            View Full Pricing Details
          </Link>
        </div>
      </section>

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Why Floridians Choose The Florida Maid</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide leading-tight mb-6">Same Professional Standards — Every Service, Every Visit</p>
            <div className="w-12 h-[2px] bg-[#34D399] mb-6" />
            <p className="text-gray-600 leading-relaxed mb-5">
              Whether you book a <Link href="/services/deep-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">deep clean</Link>, a <Link href="/services/weekly-maid-service-in-florida" className="text-[#CC6222] underline underline-offset-2">weekly maid service</Link>, or a <Link href="/services/same-day-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">same-day emergency clean</Link> — you get the same background-checked, insured professional and the same attention to detail. We don&apos;t send different tiers of cleaners for different services.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our cleaners serve <Link href="/miami-dade-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami-Dade</Link>, <Link href="/broward-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Broward</Link>, <Link href="/palm-beach-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Palm Beach</Link>, <Link href="/tampa-bay-maid-service" className="text-[#CC6222] underline underline-offset-2">Tampa Bay</Link>, and <Link href="/orlando-maid-service" className="text-[#CC6222] underline underline-offset-2">Orlando</Link> — same rates, same quality, no travel fees. <Link href="/florida-customer-reviews-for-the-florida-maid" className="text-[#CC6222] underline underline-offset-2">Read our reviews</Link> to see what clients say.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a href="sms:9547103636" className="inline-block bg-[#34D399] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Text Us to Book
              </a>
              <a href="tel:9547103636" className="inline-block text-[#CC6222] font-semibold py-3.5 hover:underline underline-offset-4">
                or Call (954) 710-3636
              </a>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Background-Checked & Insured', desc: 'Every cleaner is fully vetted, background-checked, and covered by our general liability insurance and bonding.' },
              { title: 'No Money Upfront', desc: 'You pay only after the cleaning is complete, before the cleaner leaves. No deposits, no pre-charges.' },
              { title: 'Flat Hourly Rate', desc: 'Same rate regardless of service type or neighborhood. $49/hr with your supplies, $65/hr when we bring everything.' },
              { title: 'Same Cleaner Every Time', desc: 'For recurring services, we match you with the same cleaner so they learn your home and your preferences.' },
              { title: 'No Contracts', desc: 'Stay because you\'re happy, not because you\'re locked in. Cancel recurring service with 7 days notice.' },
            ].map(item => (
              <div key={item.title} className="border border-gray-200 rounded-xl p-5">
                <p className="text-[#CC6222] font-semibold text-sm mb-1">{item.title}</p>
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
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-4">All Services Available in Every Area We Serve</p>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8">
            Every service listed above is available in all of our coverage areas. Same rates, same quality — whether you&apos;re in <Link href="/miami-beach-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami Beach</Link>, <Link href="/boca-raton-maid-service" className="text-[#CC6222] underline underline-offset-2">Boca Raton</Link>, <Link href="/st-petersburg-maid-service" className="text-[#CC6222] underline underline-offset-2">St. Petersburg</Link>, <Link href="/west-palm-beach-maid-service" className="text-[#CC6222] underline underline-offset-2">West Palm Beach</Link>, or <Link href="/fort-lauderdale-maid-service" className="text-[#CC6222] underline underline-offset-2">Fort Lauderdale</Link>.
          </p>
          <Link href="/service-areas-served-by-the-florida-maid" className="inline-block bg-[#CC6222] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
            Browse All Service Areas &rarr;
          </Link>
        </div>
      </section>

      <CTABlock title="Book Any Cleaning Service Today" subtitle="Text or call — trusted by Floridians across Miami, Tampa, Orlando, Fort Lauderdale & Jacksonville." />
    </>
  )
}
