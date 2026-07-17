import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { breadcrumbSchema } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'
import { getSeoOverride } from '@/lib/seo/overrides'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const override = await getSeoOverride(`${config.identity.url}/legal`)
  return {
    title: override?.title || `Legal Information | ${config.identity.name}`,
    description: override?.description || `Privacy policy, terms & conditions, refund policy, and your privacy choices for ${config.identity.name}.`,
    alternates: { canonical: '/legal' },
  }
}

const DOCS = [
  { title: 'Privacy Policy', href: '/privacy-policy', desc: 'How we collect, use, share, and protect your information — including the service providers we work with and your privacy rights.' },
  { title: 'Terms & Conditions', href: '/terms-conditions', desc: 'Service agreement, booking, pricing, payment, cancellations, messaging consent, and liability.' },
  { title: 'Refund Policy', href: '/refund-policy', desc: 'Our satisfaction commitment, re-service, cancellation windows, and how refunds are handled.' },
  { title: 'Do Not Sell or Share', href: '/do-not-share-policy', desc: 'California residents: how to opt out of the sale or sharing of your personal information, plus your CCPA/CPRA rights.' },
]

export default async function LegalPage() {
  const config = await getSiteConfig()
  const { name, url } = { name: config.identity.name, url: config.identity.url.replace(/\/+$/, '') }
  const email = config.contact.email
  const phone = config.contact.phone
  const phoneDigits = config.contact.phoneDigits
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url },
        { name: 'Legal', url: `${url}/legal` },
      ])} />

      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Legal Information</h1>
          <p className="text-blue-200/60 mt-3">Policies and terms for {name}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Legal', href: '/legal' }]} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {DOCS.map(item => (
            <Link key={item.href} href={item.href} className="block p-6 border border-gray-200 rounded-xl hover:border-[var(--accent)] hover:shadow-md transition-all group">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide group-hover:text-[rgb(var(--brand-rgb)/0.7)] mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-[var(--surface)] border border-[rgb(var(--accent-rgb)/0.3)] rounded-xl p-6">
          <h2 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-3">The Short Version</h2>
          <ul className="space-y-2.5">
            {[
              'We collect only what we need to quote, schedule, and deliver your service',
              'We do not sell your personal information or share it with data brokers or ad networks',
              'We share information only with the providers that run our payments, texts, email, and hosting — and only what they need',
              'By giving us your number you consent to service-related texts and calls; reply STOP to opt out anytime',
              'You can opt out of the sale or sharing of your info any time, and we honor Global Privacy Control signals',
              'Cancellation, rescheduling, and refund terms are set at booking and in our Refund Policy',
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                <span className="text-gray-600 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Questions? Contact {name}
            {email && (<> at <a href={`mailto:${email}`} className="text-[var(--brand)] underline underline-offset-2">{email}</a></>)}
            {phone && phoneDigits && (<> or text <a href={`sms:${phoneDigits}`} className="text-[var(--brand)] underline underline-offset-2">{phone}</a></>)}
            .
          </p>
        </div>
      </div>
    </>
  )
}
