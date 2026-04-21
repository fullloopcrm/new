import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Terms & Conditions | The NYC Maid',
  description: 'Terms & conditions for The NYC Maid — cancellation policy, payment terms, scheduling & service agreement. Cleaning from $59/hr. (646) 490-0130',
  alternates: { canonical: 'https://www.thenycmaid.com/terms-conditions' },
}

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.thenycmaid.com' },
        { name: 'Terms & Conditions', url: 'https://www.thenycmaid.com/terms-conditions' },
      ])} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Terms &amp; Conditions</h1>
          <p className="text-blue-200/60 mt-3">Service agreement for The NYC Maid</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Terms & Conditions', href: '/terms-conditions' }]} />

        <div className="mt-8 space-y-10">
          <p className="text-gray-400 text-sm">Last updated: February 2026</p>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Service Agreement</h2>
            <p className="text-gray-600 leading-relaxed">
              By booking a cleaning service with The NYC Maid, you agree to the following terms and conditions. We reserve the right to update these terms at any time. Continued use of our services constitutes acceptance of any changes.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Booking &amp; Scheduling</h2>
            <ul className="space-y-2.5">
              {[
                'All bookings are subject to availability and confirmation.',
                'We will confirm your appointment via text or email.',
                'Accurate home information (size, condition, access details) must be provided for proper scheduling and pricing.',
                'If the actual condition of the home differs significantly from what was described, pricing may be adjusted with your approval before cleaning begins.',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-gray-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Cancellation Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-5">Our cancellation policy depends on the type of service booked:</p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-[#1E2A4A] font-semibold mb-3">One-Time &amp; First-Time Services</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Once a one-time or first-time cleaning is booked and confirmed, <strong>cancellations and rescheduling are not permitted</strong>. We do not collect payment upfront — we hold your spot on our busy schedule, turning away other clients for that slot. Cancelling or rescheduling a confirmed booking directly impacts our team members who depend on this income. Please only book when you are certain of your availability.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-[#1E2A4A] font-semibold mb-3">Recurring Services (Weekly, Bi-Weekly, Monthly)</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 font-bold text-sm">7 days</span>
                    <span className="text-gray-600 text-sm">notice required to <strong>reschedule</strong> a recurring cleaning. This gives us time to reassign your cleaner and adjust schedules fairly.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 font-bold text-sm">7 days</span>
                    <span className="text-gray-600 text-sm">notice required to <strong>cancel/discontinue</strong> a recurring service entirely. Cancellations are only permitted if you are discontinuing the service — not for skipping individual appointments.</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                  We do not collect payment upfront — we hold your spot on our busy schedule, turning away other clients. Late cancellations, rescheduling without adequate notice, and no-shows directly affect our team members who depend on this income.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Payment Terms</h2>
            <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-6">
              <ul className="space-y-3">
                {[
                  'We do not collect any money upfront. There are no deposits, no pre-authorizations, and no advance charges.',
                  'Payment is collected approximately 30 minutes before the cleaner finishes. If payment is not received, the cleaner will wait until it is — and the wait time is billable.',
                  'Time is billed in 30-minute increments. Once 10 minutes into the next half hour has passed, it counts as a full 30 billable minutes. We do not bill by the minute or quarter hour.',
                  'Accepted payment methods: Zelle (hi@thenycmaid.com), Apple Pay, Venmo, credit/debit card, and cash.',
                  'Pricing is hourly and transparent. The rate you are quoted is the rate you pay. No hidden fees, no surcharges.',
                  'If a cleaning runs longer than expected, we will communicate with you before continuing and adjusting the final amount.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Satisfaction Guarantee</h2>
            <p className="text-gray-600 leading-relaxed">
              If you are not satisfied with any aspect of your cleaning, contact us within 24 hours. We will send a cleaner back to address the specific issues at no additional charge. We stand behind our work.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Liability &amp; Insurance</h2>
            <ul className="space-y-2.5">
              {[
                'The NYC Maid carries full general liability insurance and bonding.',
                'Any damage claims must be reported within 24 hours of service completion.',
                'We are not responsible for pre-existing damage, normal wear and tear, or items left in accessible areas during cleaning.',
                'Clients are responsible for securing valuables, fragile items, and personal belongings before the cleaning begins.',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-gray-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Access &amp; Security</h2>
            <ul className="space-y-2.5">
              {[
                'Clients are responsible for providing safe, clear access to their home.',
                'Keys, lockbox codes, or doorman instructions provided to us are kept strictly confidential.',
                'Our team will lock up upon departure if you are not present.',
                'If we cannot access your home at the scheduled time due to lockout, the full service charge may still apply.',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-gray-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about these terms? Contact us at <a href="mailto:hi@thenycmaid.com" className="text-[#1E2A4A] underline underline-offset-2">hi@thenycmaid.com</a> or text <a href="sms:6464900130" className="text-[#1E2A4A] underline underline-offset-2">(646) 490-0130</a>.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              See also: <Link href="/privacy-policy" className="text-[#1E2A4A] underline underline-offset-2">Privacy Policy</Link> &middot; <Link href="/refund-policy" className="text-[#1E2A4A] underline underline-offset-2">Refund Policy</Link> &middot; <Link href="/do-not-share-policy" className="text-[#1E2A4A] underline underline-offset-2">Do Not Share Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
