import Link from 'next/link'
import JsonLd from '@/app/site/template/_components/JsonLd'
import type { SiteConfig, ServiceOption } from '@/app/site/template/_config/types'
import { Badge, FilmStripEdge, Scanlines } from '@/app/site/template/_components/photography/PhotographyUI'
import { SERVICE_DESCRIPTIONS, SERVICE_DETAILS, photographyExtraFaq, slugifyService } from '@/app/site/template/_lib/seo/photography-services'

type ServiceRow = ServiceOption

/**
 * Bespoke photography-vertical service detail page — dispatched from
 * services/[slug]/page.tsx only for photography tenants, before that
 * route's nycmaid-only gate. Every other tenant's /services/[slug] is
 * completely untouched.
 */
export default function PhotographyServicePage({ config, service, otherServices }: { config: SiteConfig; service: ServiceRow; otherServices: ServiceRow[] }) {
  const place = config.geo.placename
  const smsHref = `sms:${config.contact.phoneDigits}`
  const detail = SERVICE_DETAILS[service.value]
  const shortDescription = SERVICE_DESCRIPTIONS[service.value] ?? `Real 35mm black and white film ${service.value.toLowerCase()}, shot and hand-developed by ${config.identity.name} — no AI, ever.`
  const rate = service.rate
  const faqs = photographyExtraFaq(place)

  const cta =
    config.funnelMode === 'lead_only'
      ? { label: 'Get in touch', href: '/contact' }
      : config.funnelMode === 'pipeline'
        ? { label: 'Request a quote', href: '/book/new' }
        : { label: 'Book Your Service', href: '/book/new' }

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.value,
    description: shortDescription,
    areaServed: place,
    provider: {
      '@type': 'LocalBusiness',
      name: config.identity.name,
      telephone: config.contact.phone,
      url: config.identity.url,
    },
    ...(rate ? { offers: { '@type': 'Offer', priceCurrency: 'USD', price: rate, priceSpecification: { '@type': 'UnitPriceSpecification', price: rate, priceCurrency: 'USD', unitText: 'HOUR' } } } : {}),
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: config.identity.url },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${config.identity.url}/services` },
      { '@type': 'ListItem', position: 3, name: service.value, item: `${config.identity.url}/services/${slugifyService(service.value)}` },
    ],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [...(detail?.faqs ?? []), ...faqs].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div>
      <JsonLd data={serviceLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <FilmStripEdge />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-[var(--brand)] text-white">
        <Scanlines />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-16 md:py-20">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs tracking-widest uppercase text-white/50 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-white transition-colors">Services</Link>
            <span>/</span>
            <span className="text-white/80">{service.value}</span>
          </nav>
          <Badge>{service.value} {place}</Badge>
          <h1 className="font-[family-name:var(--font-bebas)] tracking-wide leading-[0.92] text-[clamp(2.5rem,6vw,5rem)] mb-5 max-w-4xl">
            {service.value} in {place}
          </h1>
          <p className="text-white/80 text-lg md:text-xl mb-8 max-w-2xl">
            {shortDescription}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href={cta.href} className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-8 py-4 text-base font-bold tracking-widest uppercase hover:brightness-110 transition-all">
              {cta.label}
            </Link>
            <a href={smsHref} className="inline-flex items-center border border-white/40 text-white px-8 py-4 text-base font-bold tracking-widest uppercase hover:bg-white/10 transition-colors">
              Text {config.contact.phone}
            </a>
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* ============ INTRO + PRICING CARD ============ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 grid md:grid-cols-[1.3fr_0.7fr] gap-12 items-start">
          <div>
            <Badge>About This Session</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              What to Expect
            </h2>
            {detail && (
              <div className="space-y-4 mb-8">
                <p className="text-gray-600 text-[17px] leading-relaxed">{detail.intro}</p>
                {detail.introExtra && <p className="text-gray-600 text-[17px] leading-relaxed">{detail.introExtra}</p>}
              </div>
            )}

            {detail && (
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-[var(--brand)] text-sm tracking-widest uppercase mb-4">What&apos;s Included</h3>
                  <ul className="space-y-3">
                    {detail.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-gray-600 text-[15px] leading-relaxed">
                        <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--brand)] text-sm tracking-widest uppercase mb-4">Ideal For</h3>
                  <ul className="space-y-3">
                    {detail.idealFor.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-gray-600 text-[15px] leading-relaxed">
                        <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Pricing card — sharp corners, matches the site's Polaroid/badge language, not a rounded generic card. */}
          <div className="bg-[#E3E3E3] border border-gray-300 p-6 md:p-8">
            <p className="text-xs font-semibold text-gray-500 tracking-[0.2em] uppercase mb-4">Flat Rate — No Hidden Fees</p>
            {rate ? (
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[var(--brand)] tracking-wide leading-none mb-2">
                ${rate}<span className="text-xl text-gray-500">/hr</span>
              </p>
            ) : (
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide leading-none mb-2">
                Flat-Fee Service
              </p>
            )}
            {service.hours > 0 && (
              <p className="text-gray-500 text-sm mb-6">{service.hours}-hour typical session &middot; billed for actual time worked</p>
            )}
            <div className="border-t border-gray-400 my-6" />
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Self-book online and save $20 — the discount is noted automatically at checkout, no code needed.
            </p>
            <Link href={cta.href} className="block text-center bg-[var(--accent)] text-[var(--accent-fg)] px-6 py-4 font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all mb-3">
              {cta.label}
            </Link>
            <a href={smsHref} className="block text-center border border-[var(--brand)] text-[var(--brand)] px-6 py-4 font-bold text-sm tracking-widest uppercase hover:bg-white transition-colors">
              Text {config.contact.phone}
            </a>
          </div>
        </div>
      </section>

      {detail && detail.pricingDetail.length > 0 && (
        <section className="bg-white">
          <div className="max-w-[1000px] mx-auto px-6 pb-16 md:pb-24">
            <h3 className="font-semibold text-[var(--brand)] text-sm tracking-widest uppercase mb-4">Pricing &amp; What&apos;s Included</h3>
            <div className="space-y-4">
              {detail.pricingDetail.map((p, i) => (
                <p key={i} className="text-gray-600 text-[15px] leading-relaxed">{p}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {detail && detail.process.length > 0 && (
        <>
          <FilmStripEdge />
          {/* ============ PROCESS ============ */}
          <section className="bg-white">
            <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
              <Badge>How It Works</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-10 leading-[0.95]">
                From Booking to Delivery
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {detail.process.map((step, i) => (
                  <div key={step.title} className="border border-gray-200 p-6">
                    <span className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--accent)] leading-none block mb-3">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="font-semibold text-[var(--brand)] text-lg mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-[15px] leading-relaxed">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {detail && detail.whyFilm.length > 0 && (
        <>
          <FilmStripEdge />
          {/* ============ WHY FILM FOR THIS SERVICE ============ */}
          <section className="relative overflow-hidden bg-[var(--brand)] text-white">
            <Scanlines />
            <div className="relative z-10 max-w-[1000px] mx-auto px-6 py-16 md:py-24">
              <Badge dark>The Case for Film</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl tracking-wide mb-8 leading-[0.95]">
                Why This Session Is Shot on Real Film
              </h2>
              <div className="space-y-5 text-white/80 text-[17px] leading-relaxed">
                {detail.whyFilm.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {detail && detail.locations && detail.locations.length > 0 && (
        <>
          <FilmStripEdge />
          {/* ============ LOCATIONS ============ */}
          <section className="bg-white">
            <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
              <Badge>{place} Locations</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-4 leading-[0.95]">
                Best {place} Spots for This Session
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mb-10">
                See the full <Link href="/services" className="underline text-[var(--brand)] hover:text-[var(--accent)]">services list</Link> or check every {place} neighborhood we shoot in on the <Link href="/" className="underline text-[var(--brand)] hover:text-[var(--accent)]">homepage</Link>.
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {detail.locations.map((loc) => (
                  <div key={loc.name} className="border-l-2 border-[var(--accent)] pl-5">
                    <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">{loc.name}</h3>
                    <p className="text-gray-600 text-[15px] leading-relaxed">{loc.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {detail && detail.extraSection && (
        <>
          <FilmStripEdge />
          {/* ============ EXTRA SECTION (services without a locations block) ============ */}
          <section className="bg-white">
            <div className="max-w-[1000px] mx-auto px-6 py-16 md:py-24">
              <Badge>{detail.extraSection.badge}</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-8 leading-[0.95]">
                {detail.extraSection.title}
              </h2>
              <div className="space-y-4">
                {detail.extraSection.paragraphs.map((p, i) => (
                  <p key={i} className="text-gray-600 text-[17px] leading-relaxed">{p}</p>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {detail && detail.preparation.length > 0 && (
        <>
          <FilmStripEdge />
          {/* ============ PREPARATION ============ */}
          <section className="bg-[#E3E3E3]">
            <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
              <Badge>Before Your Session</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-10 leading-[0.95]">
                How to Prepare
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
                {detail.preparation.map((tip, i) => (
                  <p key={i} className="flex items-start gap-3 text-gray-700 text-[15px] leading-relaxed">
                    <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>{tip}</span>
                  </p>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <FilmStripEdge />

      {/* ============ RELATED SERVICES — every one interlinked ============ */}
      <section className="bg-[#E3E3E3]">
        <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
          <Badge>Other Sessions</Badge>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-4">
            Not What You Need? Explore Every Service
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mb-10">
            Same real 35mm black and white film, same darkroom process, same $300/hr flat rate — across every session type {config.identity.name} offers in {place}.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherServices.map((s) => (
              <Link
                key={s.value}
                href={`/services/${slugifyService(s.value)}`}
                className="group block bg-white border border-gray-900 p-5 hover:bg-[var(--brand)] transition-colors"
              >
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-2 group-hover:text-white transition-colors">
                  {s.value}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 group-hover:text-white/70 transition-colors">
                  {SERVICE_DESCRIPTIONS[s.value] ?? `Real 35mm black and white film ${s.value.toLowerCase()}.`}
                </p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/services" className="inline-block bg-[var(--brand)] text-white px-8 py-4 font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all">
              View Full Services &amp; Pricing
            </Link>
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* ============ FAQ ============ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
          <Badge>Questions</Badge>
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-10">
            {service.value} — Common Questions
          </h2>
          <div className="md:columns-2 md:gap-x-12">
            {[...(detail?.faqs ?? []), ...faqs].map((f, i) => (
              <div key={i} className="border-l-2 border-[var(--accent)] pl-5 mb-8 break-inside-avoid">
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">{f.q}</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-[var(--brand)] text-white">
        <Scanlines />
        <div className="relative z-10 max-w-[1000px] mx-auto px-6 py-20 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl tracking-wide mb-4">Book Your {service.value}</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            No AI, no filters standing in for a real photographer. Text, call, or book online — a fast, honest response and a real negative to show for it.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href={smsHref} className="inline-flex items-center border border-white/40 text-white px-9 py-4 text-base font-bold tracking-widest uppercase hover:bg-white/10 transition-colors">
              Text {config.contact.phone}
            </a>
            <Link href={cta.href} className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-9 py-4 text-base font-bold tracking-widest uppercase hover:brightness-110 transition-all">
              {cta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
