import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import type { Section } from '@/app/site/template/_lib/va-content'

/**
 * Shared renderer for every VA SEO page (service pages, city/state hubs,
 * geo×service combos). Keeps the routes thin: each route resolves its data,
 * generates Section[], and hands it here. Brand-var themed like the rest of the
 * template so it inherits the tenant's palette.
 */

export interface RelatedGroup {
  title: string
  links: { href: string; label: string }[]
}

function funnelCta(config: SiteConfig): { label: string; href: string } {
  // VA SEO pages point at the lead form on the home page (#get-started).
  return { label: 'Get an Assistant', href: '/#get-started' }
}

export default function VASeoPage({
  config,
  h1,
  subtitle,
  sections,
  related,
  breadcrumb,
}: {
  config: SiteConfig
  h1: string
  subtitle: string
  sections: Section[]
  related?: RelatedGroup[]
  breadcrumb?: { href: string; label: string }[]
}) {
  const cta = funnelCta(config)

  return (
    <main>
      {/* Hero */}
      <section className="bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="mb-6 text-sm text-[var(--brand-fg)]/60 flex flex-wrap gap-2" aria-label="Breadcrumb">
              {breadcrumb.map((b, i) => (
                <span key={b.href} className="flex gap-2">
                  <Link href={b.href} className="hover:text-[var(--accent)] underline underline-offset-2">{b.label}</Link>
                  {i < breadcrumb.length - 1 && <span className="text-[var(--brand-fg)]/30">/</span>}
                </span>
              ))}
            </nav>
          )}
          <p className="text-[var(--accent)] font-semibold tracking-[0.2em] uppercase text-sm mb-4">
            Real human assistants · from $8/hour
          </p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl tracking-wide leading-[0.98] mb-5">
            {h1}
          </h1>
          <p className="text-[var(--brand-fg)]/75 text-lg max-w-2xl mb-8">{subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={cta.href}
              className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors"
            >
              {cta.label}
            </Link>
            <a
              href={`tel:${config.contact.phoneDigits}`}
              className="inline-flex items-center bg-white/10 border border-white/30 text-[var(--brand-fg)] px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-white/20 transition-colors"
            >
              Call {config.contact.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Body sections */}
      <div className="max-w-3xl mx-auto px-6 py-14 md:py-20">
        {sections.map((s) => (
          <section key={s.heading} className="mb-12">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">
              {s.heading}
            </h2>
            <div className="space-y-4">
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-gray-600 leading-relaxed">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Related links (internal linking) */}
      {related && related.length > 0 && (
        <section className="bg-[var(--surface)] border-t border-black/5">
          <div className="max-w-5xl mx-auto px-6 py-14">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {related.map((g) => (
                <div key={g.title}>
                  <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-4">{g.title}</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-gray-600 text-sm hover:text-[var(--brand)] underline underline-offset-2">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl tracking-wide mb-4">
            Get a Real Assistant Today
          </h2>
          <p className="text-[var(--brand-fg)]/70 mb-8">
            English-speaking, 24/7, tracked in Quo, starting at $8/hour. Tell us what you need off your plate.
          </p>
          <Link
            href={cta.href}
            className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors"
          >
            {cta.label}
          </Link>
        </div>
      </section>
    </main>
  )
}
