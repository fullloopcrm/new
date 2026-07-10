import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Legal Information | The Florida Maid',
  description: 'Legal information for The Florida Maid — privacy policy, terms, refund policy & data sharing. Florida cleaning from $49/hr. $1M insured. (954) 710-3636',
  alternates: { canonical: 'https://www.thefloridamaid.com/legal' },
}

export default function LegalPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.thefloridamaid.com' },
        { name: 'Legal', url: 'https://www.thefloridamaid.com/legal' },
      ])} />

      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Legal Information</h1>
          <p className="text-white mt-3">Policies and terms for The Florida Maid</p>
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
            <Link key={item.href} href={item.href} className="block p-6 border border-gray-200 rounded-xl hover:border-[#34D399] hover:shadow-md transition-all group">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-[#F5FBF8] border border-[#34D399]/30 rounded-xl p-6">
          <h2 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-3">The Short Version</h2>
          <ul className="space-y-2.5">
            {[
              'We never take money upfront — you pay only after your cleaning is done',
              'We never sell, share, or distribute your personal information',
              'One-time bookings cannot be cancelled once confirmed',
              'Recurring services require 7 days notice to cancel, 3 days to reschedule',
              'Payment is due before the cleaner leaves — Zelle (hi@thefloridamaid.com), Apple Pay, Venmo, card, or cash',
              'We collect anonymized usage data to improve our website — never tied to your identity',
              'Not happy? Contact us within 24 hours and we\'ll send someone back at no charge',
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                <span className="text-gray-600 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Questions? Contact us at <a href="mailto:hi@thefloridamaid.com" className="text-[#CC6222] underline underline-offset-2">hi@thefloridamaid.com</a> or text/call <a href="tel:9547103636" className="text-[#CC6222] underline underline-offset-2">(954) 710-3636</a>.
          </p>
        </div>
      </div>
    </>
  )
}
