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
    title: `Terms & Conditions | ${name}`,
    description: `Terms & conditions for ${name} — cancellation policy, payment terms, scheduling, and service agreement.`,
    alternates: { canonical: `${origin}/terms-conditions` },
  }
}

export default async function TermsPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Business'
  const email = tenant?.email || ''
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const origin = tenantSiteUrl(tenant) || ''
  const hasLegacyLegal = !!(tenant as Record<string, unknown> | null)?.enable_legacy_seo_pages
  const acceptedMethods = Array.isArray((tenant?.selena_config as Record<string, unknown> | undefined)?.payment_methods)
    ? ((tenant!.selena_config as Record<string, unknown>).payment_methods as string[]).join(', ')
    : 'accepted payment methods listed at booking'

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: origin || '/' },
        { name: 'Terms & Conditions', url: `${origin}/terms-conditions` },
      ])} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Terms &amp; Conditions</h1>
          <p className="text-blue-200/60 mt-3">Service agreement for {name}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Terms & Conditions', href: '/terms-conditions' }]} />

        <div className="mt-8 space-y-10">
          <p className="text-gray-400 text-sm">Last updated: February 2026</p>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Service Agreement</h2>
            <p className="text-gray-600 leading-relaxed">
              By booking a service with {name}, you agree to the following terms and conditions. We reserve the right to update these terms at any time. Continued use of our services constitutes acceptance of any changes.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Booking &amp; Scheduling</h2>
            <ul className="space-y-2.5">
              {[
                'All bookings are subject to availability and confirmation.',
                'We will confirm your appointment via text or email.',
                'Accurate information about the job (size, condition, access details) must be provided for proper scheduling and pricing.',
                'If the actual condition of the job differs significantly from what was described, pricing may be adjusted with your approval before work begins.',
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
                  Once a one-time or first-time service is booked and confirmed, <strong>cancellations and rescheduling are subject to our policy</strong>. We hold your spot on our schedule, turning away other clients for that slot. Cancelling or rescheduling a confirmed booking directly impacts our team members who depend on this income. Please only book when you are certain of your availability.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-[#1E2A4A] font-semibold mb-3">Recurring Services</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 font-bold text-sm">7 days</span>
                    <span className="text-gray-600 text-sm">notice required to <strong>reschedule</strong> a recurring service. This gives us time to reassign your team member and adjust schedules fairly.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 font-bold text-sm">7 days</span>
                    <span className="text-gray-600 text-sm">notice required to <strong>cancel/discontinue</strong> a recurring service entirely.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Payment Terms</h2>
            <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-6">
              <ul className="space-y-3">
                {[
                  'Pricing is transparent. The rate you are quoted is the rate you pay. No hidden fees, no surcharges.',
                  `Accepted payment methods: ${acceptedMethods}.`,
                  'If a job runs longer than expected, we will communicate with you before continuing and before adjusting the final amount.',
                  'Time is billed according to the quoted rate structure. Any applicable rounding is disclosed at booking.',
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
              If you are not satisfied with any aspect of your service, contact us within 24 hours and we will work with you to address the specific issues. We stand behind our work.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Liability &amp; Insurance</h2>
            <ul className="space-y-2.5">
              {[
                `${name} carries appropriate general liability insurance.`,
                'Any damage claims must be reported within 24 hours of service completion.',
                'We are not responsible for pre-existing damage, normal wear and tear, or items left in accessible areas during service.',
                'Clients are responsible for securing valuables, fragile items, and personal belongings before service begins.',
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
                'Clients are responsible for providing safe, clear access to the service location.',
                'Keys, lockbox codes, or access instructions provided to us are kept strictly confidential.',
                'Our team will secure the property upon departure if you are not present.',
                'If we cannot access the service location at the scheduled time due to lockout, the full service charge may still apply.',
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
              Questions about these terms? Contact us{email ? <> at <a href={`mailto:${email}`} className="text-[#1E2A4A] underline underline-offset-2">{email}</a></> : ''}{phoneDigits ? <> or text <a href={`sms:${phoneDigits}`} className="text-[#1E2A4A] underline underline-offset-2">{phone}</a></> : ''}.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              See also: <Link href="/privacy-policy" className="text-[#1E2A4A] underline underline-offset-2">Privacy Policy</Link>
              {hasLegacyLegal && (
                <>
                  {' '}&middot; <Link href="/refund-policy" className="text-[#1E2A4A] underline underline-offset-2">Refund Policy</Link>
                  {' '}&middot; <Link href="/do-not-share-policy" className="text-[#1E2A4A] underline underline-offset-2">Do Not Share Policy</Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
