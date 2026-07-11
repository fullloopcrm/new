import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { homeContent } from '@/app/site/template/_lib/content/longform'

/**
 * Config-driven long-form homepage for non-cleaning tenants — the replacement
 * for the thin GenericLanding. Renders a brand hero + the tenant's real services
 * grid + the full homeContent() long-form body (meets the 10k word floor) + FAQ,
 * all from SiteConfig. No cleaning copy, no dead links, no per-trade forks.
 * Cleaning tenants keep their existing editorial homepage (handled in page.tsx).
 */
export default function GenericHome({ config }: { config: SiteConfig }) {
  const p = industryProfile(config.industry)
  const c = homeContent(config)
  const services = config.services.filter((s) => !s.emergency)
  const smsHref = `sms:${config.contact.phoneDigits}`

  const cta =
    config.funnelMode === 'lead_only'
      ? { label: 'Get in touch', href: '/contact' }
      : config.funnelMode === 'pipeline'
        ? { label: 'Request a quote', href: '/book/new' }
        : { label: 'Book now', href: '/book/new' }

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.identity.name,
    url: config.identity.url,
    telephone: config.contact.phone,
    ...(config.identity.logo ? { image: config.identity.logo } : {}),
    areaServed: config.geo.placename,
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="bg-[var(--brand)] text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm text-white/70">
            {config.reviewCount && (<>
              <span className="text-[var(--accent)] font-semibold">★ {config.rating.toFixed(1)}</span>
              <span>{config.reviewCount} reviews</span>
              <span className="hidden sm:inline text-white/20">|</span>
            </>)}
            <span>Licensed &amp; insured</span>
            <span className="hidden sm:inline text-white/20">|</span>
            <span>Serving {config.geo.placename}</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl tracking-wide leading-[0.95] mb-5 max-w-4xl">
            {c.h1}
          </h1>
          <p className="text-white/75 text-lg md:text-xl max-w-2xl mb-8">{c.intro}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={cta.href} className="inline-flex items-center bg-[var(--accent)] text-[var(--brand)] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
              {cta.label}
            </Link>
            <a href={smsHref} className="inline-flex items-center bg-white/10 border border-white/30 text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-white/20 transition-colors">
              Text {config.contact.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Services grid — the tenant's real offerings */}
      {services.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">What we do</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-12">
            {p.serviceLabel} in {config.geo.placename}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <Link key={s.value} href="/services" className="border border-gray-200 rounded-2xl p-8 hover:border-[var(--brand)] transition-colors block">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">{s.value}</h3>
                <p className="text-gray-500 text-sm">{p.serviceLabel} — {config.identity.name}, {config.geo.placename}.</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Long-form body */}
      <article className="max-w-3xl mx-auto px-6 pb-16 md:pb-24">
        {c.sections.map((section, i) => (
          <section key={i} className={i > 0 ? 'mt-14' : ''}>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">
              {section.heading}
            </h2>
            <div className="space-y-4">
              {section.paragraphs.map((para, j) => (
                <p key={j} className="text-gray-600 text-[17px] leading-relaxed">{para}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-16 pt-12 border-t border-gray-200">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-8">
            Common Questions
          </h2>
          <div className="space-y-6">
            {c.faq.map((f, i) => (
              <div key={i}>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">{f.q}</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </article>

      {/* CTA */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide mb-4">
            Let&apos;s Get Started
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
            Text, call, or book online — a fast, honest response, a clear quote, and work we stand behind.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={smsHref} className="inline-flex items-center bg-[var(--brand)] text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
              Text {config.contact.phone}
            </a>
            <Link href={cta.href} className="inline-flex items-center bg-[var(--accent)] text-[var(--brand)] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
              {cta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
