import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantAreas,
  tenantSiteUrl,
  toSlug,
  fromSlug,
  generateContent,
} from '@/lib/tenant-site'

interface Props {
  params: Promise<{ slug: string }>
}

// Render on demand — tenant isn't resolvable at build time without the host header.
export const dynamic = 'force-static'
export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() {
  // Tenant context requires a request host, which isn't available during build.
  // Pages render on first request and cache for 24h.
  return []
}

function findAreaBySlug(areas: string[], slug: string): string | null {
  const match = areas.find(a => toSlug(a) === slug)
  return match || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantFromHeaders()
  if (!tenant) return {}

  const areas = await getTenantAreas(tenant.id)
  const area = findAreaBySlug(areas, slug)
  if (!area) return {}

  const name = tenant.name || 'Our Company'
  const phone = tenant.phone || ''
  const industry = tenant.industry || 'services'
  const base = tenantSiteUrl(tenant)
  const url = base ? `${base}/${slug}` : undefined
  const title = `${area} ${industry} | ${name}`
  const description = `Professional ${industry.toLowerCase()} in ${area}. Licensed, insured, 5-star rated.${phone ? ` Call ${phone}.` : ''}`

  return {
    title: { absolute: title },
    description,
    ...(url && { alternates: { canonical: url } }),
    openGraph: { title, description, ...(url && { url }), type: 'website', siteName: name, locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantFromHeaders()
  if (!tenant) notFound()

  const areas = await getTenantAreas(tenant.id)
  const area = findAreaBySlug(areas, slug)
  if (!area) {
    // Try rendering from the slug directly if the tenant hasn't listed areas but the URL still matched something meaningful
    notFound()
  }

  const services = await getTenantServices(tenant.id)
  const name = tenant.name || 'Our Company'
  const phone = tenant.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const industry = tenant.industry || 'services'
  const base = tenantSiteUrl(tenant)
  const content = generateContent(industry, name, { area })
  const areaName = area || fromSlug(slug)

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        ...(base ? [{ name: 'Home', url: base }] : []),
        { name: areaName, url: `${base}/${slug}` },
      ])} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-3">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <span className="text-blue-200/60 text-sm">5-Star Rated &middot; Verified Reviews</span>
              </div>
              <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide leading-[0.95] mb-5">
                {areaName} {industry}
              </h1>
              <p className="text-blue-200/60 text-lg leading-relaxed mb-6">{content.aboutParagraphs[0]}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8">
                <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; No money upfront</span>
                <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; Licensed &amp; insured</span>
                <span className="text-[var(--brand-accent)] text-sm font-medium">&#10003; Background-checked</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <a href="/chat-with-selena" className="bg-[var(--brand-accent)] text-[var(--brand)] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                  Chat With Selena
                </a>
                {phone && (
                  <a href={`tel:${phoneDigits}`} className="text-blue-200/60 font-medium py-3.5 hover:text-white transition-colors underline underline-offset-4">
                    or Call {phone}
                  </a>
                )}
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-7 shadow-xl">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-5">Same Rates Across All Areas</p>
                <div className="border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 rounded-xl p-4 mb-5 text-center">
                  <p className="text-gray-500 text-xs mb-1">{areas.length}+ Areas Served</p>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide">Same Rate Everywhere</p>
                  <p className="text-[var(--brand)]/60 text-xs mt-1">No travel fees &middot; No surge pricing</p>
                </div>
                <a href="/chat-with-selena" className="block text-center bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                  Chat With Selena
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: areaName, href: `/${slug}` }]} />
      </div>

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Why Choose Us</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-12">Serving {areaName} With Care</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.whyChoose.map(item => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services — full showcase */}
      {services.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Our Services</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Every Service Available in {areaName}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Browse our full range of {industry.toLowerCase()} services — all with the same transparent pricing.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((s: { id: string; name: string; description?: string; default_hourly_rate?: number }) => {
                const serviceSlug = toSlug(s.name)
                const desc = (s as Record<string, unknown>).description as string | undefined
                const rate = (s as Record<string, unknown>).default_hourly_rate as number | undefined
                return (
                  <Link
                    key={s.id}
                    href={`/${slug}/${serviceSlug}`}
                    className="group border border-gray-200 rounded-2xl p-6 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide group-hover:text-[var(--brand)]/70 transition-colors">{s.name}</h3>
                      {rate && <span className="text-[var(--brand)] font-bold text-sm whitespace-nowrap ml-3">From ${rate}/hr</span>}
                    </div>
                    {desc && <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{desc}</p>}
                    <span className="text-[var(--brand)] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Book in 3 Steps */}
      <section className="py-20 bg-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[var(--brand-accent)]/60 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {areaName} Service in 3 Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: `${phone ? `Reach us at ${phone}` : 'Reach out'} with your ${areaName} address, preferred date, and any special requests.` },
              { n: '02', t: 'We Confirm', d: 'We match you with a background-checked, insured team member and lock in your appointment — usually within the hour.' },
              { n: '03', t: 'Pay After', d: 'Your team member arrives on time, does the work, and you pay only after the service is complete. No deposits ever.' },
            ].map(s => (
              <div key={s.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[var(--brand-accent)]/30 leading-none">{s.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{s.t}</p>
                <p className="text-blue-200/50 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <a href="/chat-with-selena" className="bg-[var(--brand-accent)] text-[var(--brand)] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
              Chat With Selena
            </a>
          </div>
        </div>
      </section>

      <CTABlock title={`Book Your ${areaName} Appointment Today`} subtitle={`Text or call — same flat rates across all of our service areas.`} phone={phone} />
    </>
  )
}
