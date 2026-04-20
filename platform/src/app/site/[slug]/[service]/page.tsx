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
  getChecklistForService,
} from '@/lib/tenant-site'

interface Props {
  params: Promise<{ slug: string; service: string }>
}

// Tenant context requires a request host, which isn't available at build time.
// Pages render lazily and cache for 24h.
export const dynamic = 'force-static'
export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() {
  return []
}

function findAreaBySlug(areas: string[], slug: string): string | null {
  const match = areas.find(a => toSlug(a) === slug)
  return match || null
}

function findServiceBySlug<T extends { name: string }>(services: T[], slug: string): T | null {
  const match = services.find(s => toSlug(s.name) === slug)
  return match || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, service: serviceSlug } = await params
  const tenant = await getTenantFromHeaders()
  if (!tenant) return {}

  const [areas, services] = await Promise.all([
    getTenantAreas(tenant.id),
    getTenantServices(tenant.id),
  ])

  const area = findAreaBySlug(areas, slug)
  const service = findServiceBySlug(services, serviceSlug)
  if (!area || !service) return {}

  const name = tenant.name || 'Our Company'
  const phone = tenant.phone || ''
  const base = tenantSiteUrl(tenant)
  const url = base ? `${base}/${slug}/${serviceSlug}` : undefined
  const title = `${service.name} in ${area} | ${name}`
  const description = `Professional ${service.name.toLowerCase()} in ${area}. Licensed, insured, 5-star rated.${phone ? ` Call ${phone}.` : ''}`

  return {
    title: { absolute: title },
    description,
    ...(url && { alternates: { canonical: url } }),
    openGraph: { title, description, ...(url && { url }), type: 'website', siteName: name, locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function AreaServicePage({ params }: Props) {
  const { slug, service: serviceSlug } = await params
  const tenant = await getTenantFromHeaders()
  if (!tenant) notFound()

  const [areas, services] = await Promise.all([
    getTenantAreas(tenant.id),
    getTenantServices(tenant.id),
  ])

  const area = findAreaBySlug(areas, slug)
  const service = findServiceBySlug(services, serviceSlug) as
    | { id: string; name: string; description?: string; default_hourly_rate?: number; default_duration_hours?: number }
    | null

  if (!area || !service) notFound()

  const name = tenant.name || 'Our Company'
  const phone = tenant.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const industry = tenant.industry || 'services'
  const base = tenantSiteUrl(tenant)
  const areaName = area || fromSlug(slug)
  const content = generateContent(industry, name, { service: service.name, area: areaName })
  const checklist = getChecklistForService(service.name, industry)
  const description = (service as Record<string, unknown>).description as string | undefined
  const rate = (service as Record<string, unknown>).default_hourly_rate as number | undefined
  const duration = (service as Record<string, unknown>).default_duration_hours as number | undefined

  const breadcrumbItems = [
    { name: areaName, href: `/${slug}` },
    { name: service.name, href: `/${slug}/${serviceSlug}` },
  ]

  const otherServices = services.filter((s: { id: string }) => s.id !== service.id)

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        ...(base ? [{ name: 'Home', url: base }] : []),
        { name: areaName, url: `${base}/${slug}` },
        { name: service.name, url: `${base}/${slug}/${serviceSlug}` },
      ])} />

      {/* Hero — dark gradient with stat row at bottom */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] pt-14 md:pt-20 pb-0">
        <div className="max-w-6xl mx-auto px-4">
          {/* Inline breadcrumb trail */}
          <div className="flex items-center gap-2 mb-6">
            <Link href={`/${slug}`} className="text-xs font-semibold text-[var(--brand-accent)]/70 tracking-[0.15em] uppercase hover:text-[var(--brand-accent)] transition-colors">{areaName}</Link>
            <span className="text-white/20">/</span>
            <span className="text-xs font-semibold text-white/40 tracking-[0.15em] uppercase">{service.name}</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            {service.name} in {areaName}
          </h1>
          <p className="text-blue-200/60 text-lg max-w-3xl leading-relaxed mb-8">{content.aboutParagraphs[0]}</p>
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
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
        {/* Stat row — anchored to bottom of hero */}
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {rate && (
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">From ${rate}/hr</p>
                  <p className="text-blue-200/40 text-xs">Typical rate</p>
                </div>
              )}
              {duration && (
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand-accent)] tracking-wide">{duration} hrs</p>
                  <p className="text-blue-200/40 text-xs">Average duration</p>
                </div>
              )}
              <div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">{checklist.length} Steps</p>
                <p className="text-blue-200/40 text-xs">Included in every visit</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 text-sm mt-1">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">5.0</p>
                  <p className="text-blue-200/40 text-xs">Customer rating</p>
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
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-6">{service.name} Checklist</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {checklist.map((f, i) => (
                  <div key={f} className="flex items-start gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <span className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)]/30 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-gray-700 text-sm leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
              {description && (
                <div className="mt-8 bg-gray-50 border border-gray-100 rounded-xl p-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
                </div>
              )}
            </div>

            {/* Right — stacked: Why Us dark card + pricing mini card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand)] rounded-2xl p-7">
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-5">Why {areaName} Clients Choose Us</h2>
                <ul className="space-y-4">
                  {content.whyChoose.map(reason => (
                    <li key={reason.title} className="flex items-start gap-3">
                      <span className="text-[var(--brand-accent)] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                      <div>
                        <p className="text-white text-sm font-semibold leading-tight">{reason.title}</p>
                        <p className="text-blue-100/70 text-xs leading-relaxed mt-1">{reason.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {(rate || duration) && (
                <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-2xl p-6 text-center">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    {rate && (
                      <div>
                        <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide leading-none">${rate}/hr</p>
                        <p className="text-gray-400 text-xs mt-1">Hourly rate</p>
                      </div>
                    )}
                    {rate && duration && <div className="w-px h-10 bg-[var(--brand-accent)]/30" />}
                    {duration && (
                      <div>
                        <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide leading-none">{duration} hrs</p>
                        <p className="text-gray-400 text-xs mt-1">Duration</p>
                      </div>
                    )}
                  </div>
                  <a href="/chat-with-selena" className="inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-xs tracking-widest uppercase hover:brightness-95 transition-colors w-full">
                    Chat With Selena
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Process steps */}
      <section className="py-16 bg-gradient-to-b from-[var(--brand)] to-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-[var(--brand-accent)]/60 tracking-[0.25em] uppercase mb-3 text-center">Our Process</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">How We Deliver {service.name} in {areaName}</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {content.processSteps.map((step, i) => (
              <div key={step} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand-accent)]/40 leading-none block mb-2">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-blue-100/70 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other services */}
      {otherServices.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">More Services</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Other Services Available in {areaName}</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality — pick the service that fits your needs.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {otherServices.map((s: { id: string; name: string; description?: string; default_hourly_rate?: number }) => {
                const sSlug = toSlug(s.name)
                const sDesc = (s as Record<string, unknown>).description as string | undefined
                const sRate = (s as Record<string, unknown>).default_hourly_rate as number | undefined
                return (
                  <Link
                    key={s.id}
                    href={`/${slug}/${sSlug}`}
                    className="group border border-gray-200 rounded-2xl p-6 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide group-hover:text-[var(--brand)]/70 transition-colors">{s.name}</h3>
                      {sRate && <span className="text-[var(--brand)] font-bold text-sm whitespace-nowrap ml-3">From ${sRate}/hr</span>}
                    </div>
                    {sDesc && <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{sDesc}</p>}
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
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book {service.name} in {areaName} — 3 Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: `${phone ? `Reach us at ${phone}` : 'Reach out'} with your ${areaName} address and tell us you need ${service.name.toLowerCase()}.` },
              { n: '02', t: 'We Confirm', d: `We match you with a team member experienced in ${service.name.toLowerCase()} for ${areaName} and lock in your appointment.` },
              { n: '03', t: 'Pay After', d: `Your team member arrives on time, completes the ${service.name.toLowerCase()}, and you pay only when you're satisfied. No deposits.` },
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

      <CTABlock title={`Book ${service.name} in ${areaName}`} subtitle={`Text or call — flat rates across all of our service areas.`} phone={phone} />
    </>
  )
}
