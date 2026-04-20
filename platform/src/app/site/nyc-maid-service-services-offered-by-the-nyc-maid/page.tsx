import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, getTenantServices, getTenantAreas, tenantSiteUrl, toSlug } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const title = `Services — Professional Services by ${name}`
  const description = `Browse all services offered by ${name}.${phone ? ` Call ${phone}.` : ''}`
  return {
    title: { absolute: title },
    description,
    ...(base && { alternates: { canonical: `${base}/nyc-maid-service-services-offered-by-the-nyc-maid` } }),
    openGraph: {
      title,
      description,
      ...(base && { url: `${base}/nyc-maid-service-services-offered-by-the-nyc-maid` }),
    },
  }
}

export default async function ServicesIndexPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const base = tenantSiteUrl(tenant)
  const services = tenant ? await getTenantServices(tenant.id) : []
  const areas = tenant ? await getTenantAreas(tenant.id) : []
  const industry = tenant?.industry || 'service'

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          ...(base ? [{ name: 'Home', url: base }] : []),
          { name: 'Services', url: `${base}/nyc-maid-service-services-offered-by-the-nyc-maid` },
        ]),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Professional {industry} Services — One Trusted Team
          </h1>
          <p className="text-blue-200/70 text-lg max-w-3xl leading-relaxed mb-8">
            Our background-checked, insured team handles every type of {industry.toLowerCase()} service across every area we serve.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10">
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; No money upfront</span>
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; Licensed &amp; insured</span>
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; Background-checked</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <a href="/chat-with-selena" className="bg-[var(--brand-accent)] text-[var(--brand)] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
              Chat With Selena
            </a>
            {phone && (
              <a href={`tel:${phoneDigits}`} className="text-blue-200/70 font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
                or Call {phone}
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Services', href: '/nyc-maid-service-services-offered-by-the-nyc-maid' }]} />
      </div>

      {/* Service cards */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Professional {industry} Services for Every Situation</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-14">Choose the Service That Fits Your Needs</p>

          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
              {services.map((service: Record<string, unknown>) => {
                const sName = (service.name as string) || ''
                const description = (service.description as string) || ''
                const priceRange = (service.price_range as string) || ''
                return (
                  <Link
                    key={sName}
                    href={`/services/${toSlug(sName)}`}
                    className="group border border-gray-200 rounded-2xl p-8 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide group-hover:text-[var(--brand)]/70 transition-colors">{sName}</h3>
                      {priceRange && <span className="text-[var(--brand)] font-bold text-sm whitespace-nowrap ml-4">{priceRange}</span>}
                    </div>
                    {description && <p className="text-gray-600 text-sm leading-relaxed mb-5">{description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--brand)] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 mb-16">Services coming soon.</p>
          )}
        </div>
      </section>

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Why Clients Choose {name}</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide leading-tight mb-6">Same Professional Standards — Every Service, Every Visit</p>
            <div className="w-12 h-[2px] bg-[var(--brand-accent)] mb-6" />
            <p className="text-gray-600 leading-relaxed mb-5">
              Whether you book a one-time service or recurring maintenance — you get the same background-checked, insured professional and the same attention to detail. We don&apos;t send different tiers of team members for different services.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a href="/chat-with-selena" className="inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                Chat With Selena
              </a>
              {phone && (
                <a href={`tel:${phoneDigits}`} className="inline-block text-[var(--brand)] font-semibold py-3.5 hover:underline underline-offset-4">
                  or Call {phone}
                </a>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Background-Checked & Insured', desc: 'Every team member is fully vetted, background-checked, and covered by our general liability insurance and bonding.' },
              { title: 'No Money Upfront', desc: 'You pay only after the service is complete, before the team member leaves. No deposits, no pre-charges.' },
              { title: 'Same Team Member Every Time', desc: 'For recurring services, we match you with the same team member so they learn your property and your preferences.' },
              { title: 'No Contracts', desc: 'Stay because you\'re happy, not because you\'re locked in. Cancel recurring service with 7 days notice.' },
            ].map(item => (
              <div key={item.title} className="border border-gray-200 rounded-xl p-5">
                <p className="text-[var(--brand)] font-semibold text-sm mb-1">{item.title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service areas teaser */}
      {areas.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Available Across {areas.length}+ Areas</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-4">All Services Available in Every Area We Serve</p>
            <p className="text-gray-500 max-w-2xl mx-auto mb-8">
              Every service listed above is available in all of our coverage areas. Same rates, same quality.
            </p>
            <Link href="/service-areas-served-by-the-nyc-maid" className="inline-block bg-[var(--brand)] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-colors">
              Browse All Service Areas &rarr;
            </Link>
          </div>
        </section>
      )}

      <CTABlock title="Book Your Service Today" subtitle={`Text or call — trusted by clients across all our service areas.`} phone={phone} />
    </>
  )
}
