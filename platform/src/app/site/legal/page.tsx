import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import { getTenantFromHeaders } from '@/lib/tenant-site'

function siteUrl(tenant: { domain?: string | null; slug?: string | null } | null): string {
  if (!tenant) return ''
  if (tenant.domain) return `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  if (tenant.slug) return `https://${tenant.slug}.homeservicesbusinesscrm.com`
  return ''
}

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = siteUrl(tenant)
  return {
    title: `Legal Information | ${name}`,
    description: `Legal information for ${name} — privacy policy, terms, refund policy & data sharing.${phone ? ` Call ${phone}.` : ''}`,
    ...(base && { alternates: { canonical: `${base}/legal` } }),
  }
}

export default async function LegalPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const email = tenant?.email || ''
  const zelleEmail = (tenant?.zelle_email as string | undefined) || email
  const base = siteUrl(tenant)

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        ...(base ? [{ name: 'Home', url: base }] : []),
        { name: 'Legal', url: `${base}/legal` },
      ])} />

      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Legal Information</h1>
          <p className="text-blue-200/60 mt-3">Policies and terms for {name}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Legal', href: '/legal' }]} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {[
            { title: 'Privacy Policy', href: '/privacy-policy', desc: 'How we collect, use, and protect your information. We never sell or share your data.' },
            { title: 'Terms & Conditions', href: '/terms-conditions', desc: 'Service agreement, cancellation policy, payment terms, and scheduling rules.' },
            { title: 'Refund Policy', href: '/refund-policy', desc: 'We don\'t take money upfront — so there\'s nothing to refund. Plus our satisfaction guarantee.' },
            { title: 'Do Not Share Policy', href: '/do-not-share-policy', desc: 'We don\'t sell or share your personal information with anyone. Your rights under CCPA.' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="block p-6 border border-gray-200 rounded-xl hover:border-[var(--brand-accent)] hover:shadow-md transition-all group">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide group-hover:text-[var(--brand)]/70 mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-xl p-6">
          <h2 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-3">The Short Version</h2>
          <ul className="space-y-2.5">
            {[
              'We never take money upfront — you pay only after your service is done',
              'We never sell, share, or distribute your personal information',
              'One-time bookings cannot be cancelled once confirmed',
              'Recurring services require 7 days notice to cancel, 3 days to reschedule',
              `Payment is due before we leave${zelleEmail ? ` — Zelle (${zelleEmail}), Apple Pay, Venmo, card, or cash` : ''}`,
              'We collect anonymized usage data to improve our website — never tied to your identity',
              "Not happy? Contact us within 24 hours and we'll come back at no charge",
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[var(--brand-accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                <span className="text-gray-600 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {(email || phone) && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Questions? Contact us
              {email && <> at <a href={`mailto:${email}`} className="text-[var(--brand)] underline underline-offset-2">{email}</a></>}
              {email && phone ? ' or text/call ' : phone ? ' by text/call at ' : ''}
              {phone && <a href={`tel:${phoneDigits}`} className="text-[var(--brand)] underline underline-offset-2">{phone}</a>}.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
