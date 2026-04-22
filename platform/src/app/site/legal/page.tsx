import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Business'
  const origin = tenantSiteUrl(tenant) || ''
  return {
    title: `Legal Information | ${name}`,
    description: `Legal information for ${name} — privacy policy, terms, policies.`,
    alternates: { canonical: `${origin}/legal` },
  }
}

export default async function LegalPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Business'
  const email = tenant?.email || ''
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const origin = tenantSiteUrl(tenant) || ''
  const hasLegacyLegal = !!(tenant as Record<string, unknown> | null)?.enable_legacy_seo_pages

  const cards: Array<{ title: string; href: string; desc: string }> = [
    { title: 'Privacy Policy', href: '/privacy-policy', desc: 'How we collect, use, and protect your information. We never sell or share your data.' },
    { title: 'Terms & Conditions', href: '/terms-conditions', desc: 'Service agreement, cancellation policy, payment terms, and scheduling rules.' },
  ]
  if (hasLegacyLegal) {
    cards.push(
      { title: 'Refund Policy', href: '/refund-policy', desc: 'We don\'t take money upfront — so there\'s nothing to refund. Plus our satisfaction guarantee.' },
      { title: 'Do Not Share Policy', href: '/do-not-share-policy', desc: 'We don\'t sell or share your personal information with anyone. Your rights under CCPA.' },
    )
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: origin || '/' },
        { name: 'Legal', url: `${origin}/legal` },
      ])} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Legal Information</h1>
          <p className="text-blue-200/60 mt-3">Policies and terms for {name}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Legal', href: '/legal' }]} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {cards.map(item => (
            <Link key={item.href} href={item.href} className="block p-6 border border-gray-200 rounded-xl hover:border-[#A8F0DC] hover:shadow-md transition-all group">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-6">
          <h2 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-3">The Short Version</h2>
          <ul className="space-y-2.5">
            {[
              'Transparent pricing disclosed at booking — no hidden fees',
              'We never sell, share, or distribute your personal information',
              'Cancellation policies vary by service type; review Terms for details',
              'We collect anonymized usage data to improve our website — never tied to your identity',
              'Not happy? Contact us within 24 hours and we\'ll work with you to make it right',
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                <span className="text-gray-600 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Questions? Contact us{email ? <> at <a href={`mailto:${email}`} className="text-[#1E2A4A] underline underline-offset-2">{email}</a></> : ''}{phoneDigits ? <> or text <a href={`sms:${phoneDigits}`} className="text-[#1E2A4A] underline underline-offset-2">{phone}</a></> : ''}.
          </p>
        </div>
      </div>
    </>
  )
}
