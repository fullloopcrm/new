import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { requireLegacySeoPages } from '@/lib/tenant-site'

export const metadata: Metadata = {
  title: 'Refund Policy | The NYC Maid',
  description: 'The NYC Maid refund policy — no money upfront, pay only after cleaning is complete. No deposits. Service from $59/hr. (646) 490-0130',
  alternates: { canonical: 'https://www.thenycmaid.com/refund-policy' },
}

export default async function RefundPolicyPage() {
  await requireLegacySeoPages()
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.thenycmaid.com' },
        { name: 'Refund Policy', url: 'https://www.thenycmaid.com/refund-policy' },
      ])} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Refund Policy</h1>
          <p className="text-blue-200/60 mt-3">No money upfront means no refunds needed</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Refund Policy', href: '/refund-policy' }]} />

        <div className="mt-8 space-y-10">
          <p className="text-gray-400 text-sm">Last updated: February 2026</p>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Why We Don&apos;t Issue Refunds</h2>
            <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-6">
              <p className="text-gray-600 leading-relaxed mb-3">
                <strong className="text-[#1E2A4A]">We do not collect any money upfront.</strong> There are no deposits, no pre-authorizations, no advance charges, and no pre-payments of any kind.
              </p>
              <p className="text-gray-600 leading-relaxed mb-3">
                Payment is collected approximately 30 minutes before the cleaner finishes. If payment is not received, the cleaner will wait and the wait time is billable. Time is billed in 30-minute increments. Because we never take your money in advance, there is nothing to refund.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This is by design. We believe you should only pay for work that&apos;s been done, and you should be able to see the quality before handing over payment.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Our Satisfaction Guarantee</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you are not satisfied with any aspect of your cleaning, contact us within 24 hours. We will send a cleaner back to address the specific issues at no additional charge. We stand behind our work — always.
            </p>
            <ul className="space-y-2.5">
              {[
                'Contact us within 24 hours of service completion with your concern',
                'We will schedule a re-clean to address the specific issue — free of charge',
                'Our goal is to make it right, not to argue about it',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-gray-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Payment Method</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Payment is collected approximately 30 minutes before the cleaner finishes. If not received, the cleaner will wait and the time is billable. Time is billed in 30-minute increments. We accept:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['Zelle', 'Apple Pay', 'Venmo', 'Credit Card', 'Debit Card', 'Cash'].map(method => (
                <div key={method} className="bg-gray-50 rounded-lg p-3 text-center">
                  <span className="text-gray-700 text-sm font-medium">{method}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Cancellation Policy Summary</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Since we do not take money upfront, cancellation refunds do not apply. We hold your spot on our busy schedule, turning away other clients — late cancellations and no-shows directly affect our team members who depend on this income. Our cancellation terms protect our cleaners&apos; livelihoods:
            </p>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-[#1E2A4A] font-semibold text-sm mb-1">One-Time &amp; First-Time Bookings</p>
                <p className="text-gray-600 text-sm">Cannot be cancelled or rescheduled once confirmed. We reserve a cleaner exclusively for your slot and turn away other clients to hold it.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-[#1E2A4A] font-semibold text-sm mb-1">Recurring Services (Weekly, Bi-Weekly, Monthly)</p>
                <p className="text-gray-600 text-sm">7 days notice required to reschedule. Cancellations are only permitted if discontinuing the service entirely with 7 days notice.</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              For full cancellation details, see our <Link href="/terms-conditions" className="text-[#1E2A4A] underline underline-offset-2">Terms &amp; Conditions</Link>.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              Questions? Contact us at <a href="mailto:hi@thenycmaid.com" className="text-[#1E2A4A] underline underline-offset-2">hi@thenycmaid.com</a> or text <a href="sms:6464900130" className="text-[#1E2A4A] underline underline-offset-2">(646) 490-0130</a>.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              See also: <Link href="/privacy-policy" className="text-[#1E2A4A] underline underline-offset-2">Privacy Policy</Link> &middot; <Link href="/terms-conditions" className="text-[#1E2A4A] underline underline-offset-2">Terms &amp; Conditions</Link> &middot; <Link href="/do-not-share-policy" className="text-[#1E2A4A] underline underline-offset-2">Do Not Share Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
