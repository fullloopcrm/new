import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'

/**
 * Trade-agnostic homepage for non-cleaning tenants. The rich cleaning homepage
 * is cleaning-editorial (cost breakdowns, cleaning testimonials, a services grid
 * that links to gated pages), so rather than hand-de-brand it we render a clean,
 * config-driven landing: hero + the tenant's real services + a funnel-aware CTA.
 * No cleaning copy, no dead links. Cleaning tenants keep their full homepage.
 */
export default function GenericLanding({
  config,
  h1,
  subtitle,
}: {
  config: SiteConfig
  h1: string
  subtitle: string
}) {
  const p = industryProfile(config.industry)
  const services = config.services.filter((s) => !s.emergency)
  const smsHref = `sms:${config.contact.phoneDigits}`

  const cta =
    config.funnelMode === 'lead_only'
      ? { label: 'Get in touch', href: '/contact-the-nyc-maid-service-today' }
      : config.funnelMode === 'pipeline'
        ? { label: 'Request a quote', href: '/book/new' }
        : { label: 'Book now', href: '/book/new' }

  return (
    <main>
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
            {h1}
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mb-8">{subtitle}</p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={cta.href}
              className="inline-flex items-center bg-[var(--accent)] text-[var(--brand)] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors"
            >
              {cta.label}
            </Link>
            <a
              href={smsHref}
              className="inline-flex items-center bg-white/10 border border-white/30 text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-white/20 transition-colors"
            >
              Text {config.contact.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Services — the tenant's real offerings, no gated-page links */}
      {services.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">
            What we do
          </p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-12">
            {p.serviceLabel} in {config.geo.placename}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.value}
                className="border border-gray-200 rounded-2xl p-8 hover:border-[var(--brand)] transition-colors"
              >
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">
                  {s.value}
                </h3>
                <p className="text-gray-500 text-sm">
                  {p.serviceLabel} — {config.identity.name}, {config.geo.placename}.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="bg-[rgb(var(--brand-rgb)/0.04)]">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-4">
            Ready when you are
          </h2>
          <p className="text-gray-500 mb-8">
            {config.identity.name} serves {config.geo.placename} and the surrounding area. Licensed,
            insured, and focused on doing the job right.
          </p>
          <Link
            href={cta.href}
            className="inline-flex items-center bg-[var(--brand)] text-white px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors"
          >
            {cta.label}
          </Link>
        </div>
      </section>
    </main>
  )
}
