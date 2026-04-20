import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SERVICES, getServiceByUrlSlug } from '@/lib/seo/services'
import { serviceContent, serviceFAQs, getServiceRichContent, commonServiceFAQs } from '@/lib/seo/content'
import { faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import FAQSection from '@/components/site/FAQSection'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, tenantSiteUrl, getTenantServiceByUrlSlug, getTenantServiceList } from '@/lib/tenant-site'

interface Props {
  params: Promise<{ slug: string }>
}

// Per-tenant dynamic rendering — pages render on demand since tenant
// context isn't available at build time.
export const dynamic = 'force-static'
export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantFromHeaders()
  // Prefer tenant-scoped service, fall back to static SERVICES for legacy nycmaid urls
  const service = tenant
    ? (await getTenantServiceByUrlSlug(tenant.id, slug)) || getServiceByUrlSlug(slug)
    : getServiceByUrlSlug(slug)
  if (!service) return {}

  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const url = `${base}/services/${slug}`
  const title = `${service.name} | ${name}`
  const description = `Professional ${service.name.toLowerCase()} by ${name}.${phone ? ` Call ${phone}.` : ''}`

  return {
    title: { absolute: title },
    description,
    ...(base && { alternates: { canonical: url } }),
    openGraph: {
      title,
      description,
      ...(base && { url }),
      type: 'website',
      siteName: name,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantFromHeaders()
  const service = tenant
    ? (await getTenantServiceByUrlSlug(tenant.id, slug)) || getServiceByUrlSlug(slug)
    : getServiceByUrlSlug(slug)
  if (!service) notFound()

  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')

  const content = serviceContent(service)
  const baseFaqs = serviceFAQs(service)
  const rich = getServiceRichContent(service.slug)
  const common = commonServiceFAQs(service)
  const richFaqs = rich?.faqs.length ? rich.faqs : baseFaqs
  const seen = new Set(richFaqs.map(f => f.question))
  const combined = [...richFaqs, ...common.filter(f => !seen.has(f.question))]
  const faqs = combined.slice(0, 25)
  // Tenant-scoped "other services" grid — excludes current service.
  const otherServices = tenant
    ? await getTenantServiceList(tenant.id, service.slug)
    : SERVICES.filter(s => s.slug !== service.slug)

  return (
    <>
      <JsonLd data={[faqSchema(faqs)]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-3">
              <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide leading-[0.95] mb-5">
                {rich?.heroH1 || `${service.name} — Professional & Affordable`}
              </h1>
              <p className="text-blue-200/60 text-lg leading-relaxed mb-6">
                {rich?.heroSubtitle || content.intro}
              </p>
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
                <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-5">Professional Service</p>
                <div className="border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 rounded-xl p-4 mb-5 text-center">
                  <p className="text-gray-500 text-xs mb-1">{service.shortName}</p>
                  <p className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide">{service.duration}</p>
                  <p className="text-[var(--brand)]/60 text-xs mt-1">Pay only for time worked &middot; No upfront cost</p>
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
        <Breadcrumbs items={[
          { name: 'Services', href: '/nyc-maid-service-services-offered-by-the-nyc-maid' },
          { name: service.name, href: `/services/${service.urlSlug}` },
        ]} />
      </div>

      {/* What Is Section */}
      {rich?.whatIs.heading && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[var(--brand-accent)] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide leading-tight mb-4">{rich.whatIs.heading}</h2>
                {rich.whatIs.subheading && (
                  <p className="text-gray-500 leading-relaxed mb-6">{rich.whatIs.subheading}</p>
                )}
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <a href="/chat-with-selena" className="bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                    Chat With Selena
                  </a>
                  {phone && (
                    <a href={`tel:${phoneDigits}`} className="text-[var(--brand)]/60 font-medium py-3 hover:text-[var(--brand)] transition-colors underline underline-offset-4">
                      or Call {phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="lg:col-span-3 space-y-5">
                {rich.whatIs.body.map((p, i) => (
                  <div key={i} className="flex items-start gap-5 bg-gray-50 border border-gray-100 rounded-2xl p-6">
                    <span className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand-accent)]/40 leading-none flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-gray-600 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Room-by-room checklist */}
      {rich?.rooms && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Room-by-Room Checklist</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-12">{rich?.roomsTitle || `What Gets Covered During a ${service.name}`}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rich.rooms.map(room => (
                <div key={room.room} className="bg-white border border-gray-200 rounded-2xl p-7">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-5">{room.room}</h3>
                  <ul className="space-y-2.5">
                    {room.tasks.map(task => (
                      <li key={task} className="flex items-start gap-2.5">
                        <span className="text-[var(--brand-accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                        <span className="text-gray-600 text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Comparison table */}
      {rich?.comparison && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[var(--brand-accent)] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide leading-tight mb-4">{rich.comparison.title}</h2>
                <p className="text-gray-500 leading-relaxed mb-6">A regular visit maintains your property. A deep service resets it. See exactly what&apos;s covered in each option.</p>
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <a href="/chat-with-selena" className="bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                    Chat With Selena
                  </a>
                  {phone && (
                    <a href={`tel:${phoneDigits}`} className="text-[var(--brand)]/60 font-medium py-3 hover:text-[var(--brand)] transition-colors underline underline-offset-4">
                      or Call {phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_110px_110px] bg-[var(--brand)] text-white text-xs font-semibold tracking-[0.15em] uppercase">
                    <div className="px-5 py-3.5">Task</div>
                    <div className="px-3 py-3.5 text-center">Regular</div>
                    <div className="px-3 py-3.5 text-center bg-[var(--brand-accent)]/20">Deep</div>
                  </div>
                  {rich.comparison.rows.map((row, i) => (
                    <div key={row.task} className={`grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_110px_110px] ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-100`}>
                      <div className="px-5 py-3.5 text-sm text-gray-700">{row.task}</div>
                      <div className="px-3 py-3.5 text-center text-lg">{row.regular ? <span className="text-[var(--brand-accent)]">&#10003;</span> : <span className="text-gray-300">&mdash;</span>}</div>
                      <div className="px-3 py-3.5 text-center text-lg bg-[var(--brand-accent)]/5">{row.deep ? <span className="text-[var(--brand-accent)]">&#10003;</span> : <span className="text-gray-300">&mdash;</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* When to book */}
      {rich && rich.whenToBook.items.length > 0 && (
        <section className="py-20 bg-[var(--brand-accent)]/10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[var(--brand-accent)] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide leading-tight mb-4">{rich.whenToBook.title}</h2>
                <p className="text-gray-500 leading-relaxed mb-6">If any of these apply to you, professional {service.name.toLowerCase()} is the move. Text us and we&apos;ll get you on the schedule.</p>
                <a href="/chat-with-selena" className="inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                  Chat With Selena
                </a>
              </div>
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rich.whenToBook.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-5">
                    <span className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand-accent)]/40 leading-none flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pro tips */}
      {rich && rich.nycTips.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-[var(--brand)] to-[var(--brand)]">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-[var(--brand-accent)]/60 tracking-[0.25em] uppercase mb-3 text-center">Pro Tips</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">{rich?.tipsTitle || `${service.name} Tips From Local Pros`}</p>
            <div className="space-y-5">
              {rich.nycTips.map((tip, i) => (
                <div key={tip.title} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-6 flex items-start gap-5">
                  <span className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand-accent)]/30 leading-none flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-white font-semibold mb-1">{tip.title}</p>
                    <p className="text-blue-200/50 text-sm leading-relaxed">{tip.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Education sections */}
      {rich && rich.educationSections.length > 0 && rich.educationSections.map((section, i) => (
        <section key={section.heading} className={`py-20 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className={`grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start ${i % 2 === 1 ? 'lg:direction-rtl' : ''}`}>
              <div className={`lg:col-span-2 lg:sticky lg:top-28 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="w-10 h-[3px] bg-[var(--brand-accent)] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide leading-tight">{section.heading}</h2>
              </div>
              <div className={`lg:col-span-3 space-y-4 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                {section.body.map((p, j) => (
                  <div key={j} className={`${i % 2 === 0 ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'} border rounded-xl p-5`}>
                    <p className="text-gray-600 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Features + Ideal For */}
      {!rich?.whatIs.heading && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">What&apos;s Included</h2>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-2">{service.name} Checklist</p>
              <div className="w-12 h-[2px] bg-[var(--brand-accent)] mb-6" />
              <p className="text-gray-600 leading-relaxed mb-6">{service.description}</p>
              <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-xl p-6">
                <ul className="space-y-3">
                  {service.features.map(f => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="text-[var(--brand-accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-gray-700 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-xl p-6">
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-5">Ideal Clients</h2>
                <ul className="space-y-3">
                  {service.idealFor.map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-[var(--brand-accent)] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm mb-4">{service.duration}</p>
                <a href="/chat-with-selena" className="inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-8 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                  Chat With Selena
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 bg-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[var(--brand-accent)]/60 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book in 3 Simple Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: `Reach us${phone ? ` at ${phone}` : ''} with your address, preferred date, and any special requests.` },
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

      {/* Other services */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">More Services</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Not What You Need? We Do That Too.</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            Same background-checked team, same flat rate, same quality — regardless of service type. Explore what else we can do for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {otherServices.map(s => (
              <Link
                key={s.slug}
                href={`/services/${s.urlSlug}`}
                className="group border border-gray-200 rounded-2xl p-6 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide group-hover:text-[var(--brand)]/70 transition-colors">{s.name}</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{s.duration}</span>
                  <span className="text-[var(--brand)] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/nyc-maid-service-services-offered-by-the-nyc-maid" className="inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
              View All Services
            </Link>
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} title={`${service.name} — Frequently Asked Questions`} columns={2} />
      <CTABlock title={`Book ${service.name} Today`} subtitle={`Text or call — trusted by clients of ${name}.`} phone={phone} />
    </>
  )
}
