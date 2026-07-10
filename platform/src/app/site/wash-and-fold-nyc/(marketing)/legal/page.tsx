import type { Metadata } from 'next'
import CTABlock from "@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock"
import Link from 'next/link'
import { breadcrumbSchema } from '@/app/site/wash-and-fold-nyc/_lib/seo/schema'
import JsonLd from '@/app/site/wash-and-fold-nyc/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/wash-and-fold-nyc/_components/marketing/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Legal Information | The NYC Wash and Fold Service Company',
  description: 'Legal information for The NYC Wash and Fold Service Company — privacy policy, terms, refund policy & data sharing. NYC cleaning from $3/lb. (917) 970-6002',
  alternates: { canonical: 'https://www.washandfoldnyc.com/legal' },
}

export default function LegalPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.washandfoldnyc.com' },
        { name: 'Legal', url: 'https://www.washandfoldnyc.com/legal' },
      ])} />

      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Legal Information</h1>
          <p className="text-sky-200/60 mt-3">Policies and terms for The NYC Wash and Fold Service Company, a division of The NYC Maid</p>
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
            <Link key={item.href} href={item.href} className="block p-6 border border-gray-200 rounded-xl hover:border-[#4BA3D4] hover:shadow-md transition-all group">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide group-hover:text-[#1a3a5c]/70 mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-[#F0F8FF] border border-[#4BA3D4]/30 rounded-xl p-6">
          <h2 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-3">The Short Version</h2>
          <ul className="space-y-2.5">
            {[
              'We never take money upfront — you pay only after your cleaning is done',
              'We never sell, share, or distribute your personal information',
              'First-time and one-time bookings cannot be cancelled or rescheduled once confirmed',
              'Recurring services require 7 days notice to reschedule — cancellations only if discontinuing service entirely with 7 days notice',
              'Payment is due upon delivery — Zelle (hi@washandfoldnyc.com), Apple Pay, Venmo, card, or cash',
              'We collect anonymized usage data to improve our website — never tied to your identity',
              'Not happy? Contact us within 24 hours and we\'ll send someone back at no charge',
            ].map(item => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[#4BA3D4] mt-0.5 flex-shrink-0">&#10003;</span>
                <span className="text-gray-600 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Questions? Contact us at <a href="mailto:hi@washandfoldnyc.com" className="text-[#1a3a5c] underline underline-offset-2">hi@washandfoldnyc.com</a> or text/call <a href="tel:9179706002" className="text-[#1a3a5c] underline underline-offset-2">(917) 970-6002</a>.
          </p>
        </div>
      </div>
    <CTABlock />
      </>
  )
}
