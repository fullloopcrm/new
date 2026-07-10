import Link from 'next/link'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'

/**
 * Shared renderer for the template's legal documents (privacy, terms, refund,
 * do-not-sell). Content is built per-tenant in _lib/legal.ts from SiteConfig, so
 * every legal page names the real business, uses its real contact info, and
 * reads as trade-neutral (not cleaning-specific). One shell → consistent look.
 */

export interface LegalSection {
  heading: string
  /** Optional anchor id (e.g. "do-not-sell") for deep-linking. */
  id?: string
  body?: string[]
  bullets?: string[]
  /** Highlighted callout paragraph. */
  note?: string
}

export interface LegalDocData {
  title: string
  subtitle: string
  updated: string
  breadcrumb: string
  breadcrumbHref: string
  intro?: string[]
  sections: LegalSection[]
  contactHeading?: string
  contactBody: string
  contactEmail?: string
  contactPhone?: string
  contactPhoneDigits?: string
}

const CROSS_LINKS = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-conditions', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/do-not-share-policy', label: 'Do Not Sell or Share' },
]

export default function LegalDoc({ doc }: { doc: LegalDocData }) {
  return (
    <>
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">{doc.title}</h1>
          <p className="text-blue-200/60 mt-3">{doc.subtitle}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: doc.breadcrumb, href: doc.breadcrumbHref }]} />

        <div className="mt-8 space-y-10">
          <p className="text-gray-400 text-sm">Last updated: {doc.updated}</p>

          {doc.intro?.map((p, i) => (
            <p key={`intro-${i}`} className="text-gray-600 leading-relaxed">{p}</p>
          ))}

          {doc.sections.map((s) => (
            <div key={s.heading} {...(s.id ? { id: s.id, className: 'scroll-mt-24' } : {})}>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-4">{s.heading}</h2>
              {s.body?.map((p, i) => (
                <p key={i} className="text-gray-600 leading-relaxed mb-3">{p}</p>
              ))}
              {s.bullets && (
                <ul className="space-y-2.5 mt-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-gray-600 text-sm leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.note && (
                <div className="bg-[var(--surface)] border border-[rgb(var(--accent-rgb)/0.3)] rounded-xl p-6 mt-3">
                  <p className="text-gray-600 leading-relaxed">{s.note}</p>
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-gray-200 pt-8">
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-4">{doc.contactHeading || 'Contact Us'}</h2>
            <p className="text-gray-600 leading-relaxed">
              {doc.contactBody}
              {doc.contactEmail && (
                <> <a href={`mailto:${doc.contactEmail}`} className="text-[var(--brand)] underline underline-offset-2">{doc.contactEmail}</a></>
              )}
              {doc.contactPhone && doc.contactPhoneDigits && (
                <> or text <a href={`sms:${doc.contactPhoneDigits}`} className="text-[var(--brand)] underline underline-offset-2">{doc.contactPhone}</a></>
              )}
              .
            </p>
            <p className="text-gray-500 text-sm mt-4">
              {CROSS_LINKS.map((l, i) => (
                <span key={l.href}>
                  {i > 0 && ' · '}
                  <Link href={l.href} className="text-[var(--brand)] underline underline-offset-2">{l.label}</Link>
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
