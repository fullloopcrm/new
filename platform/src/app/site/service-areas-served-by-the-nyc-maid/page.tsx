import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, getTenantAreas, getTenantServices, tenantSiteUrl, toSlug } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const areas = tenant ? await getTenantAreas(tenant.id) : []
  const pageUrl = `${base}/service-areas-served-by-the-nyc-maid`
  const pageTitle = `Service Areas | ${name}`
  const pageDescription = `${name} serves ${areas.length}+ areas. Same rates everywhere.${phone ? ` Call ${phone}.` : ''}`

  return {
    title: pageTitle,
    description: pageDescription,
    ...(base && { alternates: { canonical: pageUrl } }),
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      ...(base && { url: pageUrl }),
      type: 'website',
      siteName: name,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title: pageTitle,
      description: pageDescription,
    },
  }
}

export default async function AreasIndexPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const base = tenantSiteUrl(tenant)
  const areas = tenant ? await getTenantAreas(tenant.id) : []
  const services = tenant ? await getTenantServices(tenant.id) : []
  const totalAreas = areas.length
  const pageUrl = `${base}/service-areas-served-by-the-nyc-maid`

  const areaFAQs = [
    { question: `What areas does ${name} serve?`, answer: `We serve ${totalAreas}+ areas. Same rates and same quality everywhere.` },
    { question: 'Do you charge extra for certain areas?', answer: 'No. Our rates are the same regardless of area. No travel fees, no surge pricing.' },
    { question: 'Are all services available in every area?', answer: 'Yes. Every service we offer is available in every area we serve.' },
    { question: 'Do you serve areas outside of these?', answer: `We may. If you don\'t see your area listed${phone ? `, call or text ${phone}` : ', reach out'} and we\'ll let you know. We\'re always expanding.` },
    { question: 'Do I get the same team member in my area?', answer: 'Yes. For recurring clients, we assign a dedicated team member who serves your area so they can arrive consistently and on time.' },
    { question: 'How quickly can you schedule a service in my area?', answer: `We typically schedule within 24–48 hours for standard service. Same-day service is available in most areas${phone ? ` — call ${phone} for availability` : ''}.` },
    { question: 'What if I\'m on the border of two areas?', answer: 'We serve the entire area, not just specific blocks. Just give us your address and we\'ll confirm.' },
  ]

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          ...(base ? [{ name: 'Home', url: base }] : []),
          { name: 'Service Areas', url: pageUrl },
        ]),
        faqSchema(areaFAQs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            {totalAreas}+ Service Areas
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-10">
            Professional service in every area we serve. Same rates, same quality, same background-checked team.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; Same rate everywhere</span>
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; No travel fees</span>
            <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; All services available</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Service Areas', href: '/service-areas-served-by-the-nyc-maid' }]} />

        {/* Area grid */}
        {areas.length > 0 ? (
          <section className="mb-16">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-1">{totalAreas} Areas</p>
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide">All Service Areas</h2>
              </div>
            </div>
            <div className="w-10 h-[2px] bg-[var(--brand-accent)] mb-6" />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {areas.map(area => (
                <Link
                  key={area}
                  href={`/${toSlug(area)}`}
                  className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-[var(--brand-accent)] hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-[var(--brand)] group-hover:underline underline-offset-2 text-sm mb-1">{area}</h3>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <p className="text-center text-gray-500 mb-16">Service areas coming soon.</p>
        )}

        {/* Services available everywhere */}
        {services.length > 0 && (
          <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] rounded-2xl p-8 md:p-14 mb-20">
            <p className="text-[var(--brand-accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Available in Every Area</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-8">All {services.length} Services — Same Rate Everywhere</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service: Record<string, unknown>) => {
                const sName = (service.name as string) || ''
                const priceRange = (service.price_range as string) || ''
                return (
                  <Link
                    key={sName}
                    href={`/services/${toSlug(sName)}`}
                    className="group flex items-center justify-between bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-colors"
                  >
                    <div>
                      <p className="text-white font-semibold text-sm group-hover:underline underline-offset-2">{sName}</p>
                    </div>
                    {priceRange && <span className="text-[var(--brand-accent)] font-bold text-sm whitespace-nowrap ml-3">{priceRange}</span>}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Common Questions</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-2">Service Area FAQ</p>
          <div className="w-10 h-[2px] bg-[var(--brand-accent)] mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {areaFAQs.map((faq, i) => (
              <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h2 className="font-semibold text-[var(--brand)] text-sm text-left pr-4">{faq.question}</h2>
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Don't see your area */}
        <section className="bg-[var(--brand-accent)] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-3">Don&apos;t See Your Area?</p>
          <p className="text-[var(--brand)]/60 max-w-xl mx-auto mb-8">
            We&apos;re always expanding. Text or call us with your address and we&apos;ll let you know if we cover your area — we probably do.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="/chat-with-selena" className="bg-[var(--brand)] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-colors">
              Chat With Selena
            </a>
            {phone && (
              <a href={`tel:${phoneDigits}`} className="text-[var(--brand)] font-semibold underline underline-offset-4 hover:no-underline">
                or Call {phone}
              </a>
            )}
          </div>
        </section>
      </div>

      <CTABlock title="Book Your Service Today" subtitle="Text or call — trusted by clients across all our service areas." phone={phone} />
    </>
  )
}
