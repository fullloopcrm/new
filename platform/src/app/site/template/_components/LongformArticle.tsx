import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import type { LongformPage } from '@/app/site/template/_lib/content/longform'

/**
 * Shared renderer for config-driven long-form marketing pages (About, Services,
 * Pricing, FAQ, Contact, Careers, Referral). Takes a LongformPage from the
 * content engine and renders it to the template's house style: brand hero,
 * body sections, FAQ, CTA, plus Organization + FAQPage JSON-LD. All visible copy
 * lands inside the layout's <main>, which is what the Site-Readiness gate audits.
 */
export function LongformArticle({
  config,
  content,
  eyebrow,
  ctaHeading = 'Ready When You Are',
  ctaBody,
}: {
  config: SiteConfig
  content: LongformPage
  eyebrow: string
  ctaHeading?: string
  ctaBody?: string
}) {
  const smsHref = `sms:${config.contact.phoneDigits}`
  const defaultCtaBody = `Tell us what you need and we'll take it from there — a clear quote, a time that works, and work we stand behind.`

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.identity.name,
    url: config.identity.url,
    telephone: config.contact.phone,
    ...(config.identity.logo ? { logo: config.identity.logo } : {}),
    ...(config.reviewCount
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: config.rating.toFixed(1), reviewCount: config.reviewCount } }
      : {}),
  }
  const faqLd = content.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: content.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, '\\u003c') }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />}

      {/* Hero */}
      <section className="bg-[var(--brand)] text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.25em] uppercase mb-4">{eyebrow}</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl tracking-wide leading-[0.95] mb-6">
            {content.h1}
          </h1>
          <p className="text-white/75 text-lg md:text-xl max-w-2xl">{content.intro}</p>
        </div>
      </section>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        {content.sections.map((section, i) => (
          <section key={i} className={i > 0 ? 'mt-14' : ''}>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">
              {section.heading}
            </h2>
            <div className="space-y-4">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-gray-600 text-[17px] leading-relaxed">{p}</p>
              ))}
            </div>
          </section>
        ))}

        {content.faq.length > 0 && (
          <section className="mt-16 pt-12 border-t border-gray-200">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-8">
              Common Questions
            </h2>
            <div className="space-y-6">
              {content.faq.map((f, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">{f.q}</h3>
                  <p className="text-gray-600 text-[17px] leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* CTA */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide mb-4">
            {ctaHeading}
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">{ctaBody || defaultCtaBody}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={smsHref} className="inline-flex items-center bg-[var(--brand)] text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
              Text {config.contact.phone}
            </a>
            <Link href="/contact" className="inline-flex items-center bg-[var(--accent)] text-[var(--brand)] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
