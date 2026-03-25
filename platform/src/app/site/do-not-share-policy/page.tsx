import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Do Not Share Policy | The NYC Maid',
  description: 'The NYC Maid does not sell, share, or distribute your personal information. Your data stays with us. NYC cleaning from $49/hr. (212) 202-8400',
  alternates: { canonical: 'https://www.thenycmaid.com/do-not-share-policy' },
}

export default function DoNotSharePage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.thenycmaid.com' },
        { name: 'Do Not Share Policy', url: 'https://www.thenycmaid.com/do-not-share-policy' },
      ])} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Do Not Share My Personal Information</h1>
          <p className="text-blue-200/60 mt-3">We don&apos;t share it — because we never have</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Do Not Share Policy', href: '/do-not-share-policy' }]} />

        <div className="mt-8 space-y-10">
          <p className="text-gray-400 text-sm">Last updated: February 2026</p>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Our Position Is Simple</h2>
            <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-6">
              <p className="text-gray-600 leading-relaxed mb-3">
                <strong className="text-[#1E2A4A]">We do not sell, trade, rent, or share your personal information with anyone.</strong> Not with advertisers, not with data brokers, not with marketing companies, not with any third parties of any kind.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Your name, phone number, email, address, and service details exist in our system for one reason — to provide you with an excellent cleaning service. That&apos;s it.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">What We Do Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do collect anonymized, non-identifiable data about how visitors interact with our website. This includes:
            </p>
            <ul className="space-y-2.5">
              {[
                'Which pages you visit and how long you spend on them',
                'What buttons and links you click',
                'How you navigate through the booking process',
                'General device and browser information',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#1E2A4A]/30 mt-0.5 flex-shrink-0">&#8226;</span>
                  <span className="text-gray-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              This data is collected solely to improve the user experience — helping us make the website easier to use, the booking process smoother, and our service information clearer. It is never tied to your personal identity, never sold, and never shared.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Your Rights Under CCPA &amp; Other Privacy Laws</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Under the California Consumer Privacy Act (CCPA) and similar state privacy laws, you have the right to opt out of the sale or sharing of your personal information. Since we do not sell or share your personal information, this right is already fully honored by default.
            </p>
            <p className="text-gray-600 leading-relaxed">
              If you would still like to submit a formal request, you may do so at any time:
            </p>
            <div className="bg-gray-50 rounded-xl p-5 mt-4 space-y-2">
              <p className="text-gray-600 text-sm">Email us at <a href="mailto:hi@thenycmaid.com" className="text-[#1E2A4A] underline underline-offset-2">hi@thenycmaid.com</a> with the subject &ldquo;Do Not Share&rdquo;</p>
              <p className="text-gray-600 text-sm">Or text/call <a href="tel:2122028400" className="text-[#1E2A4A] underline underline-offset-2">(212) 202-8400</a></p>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              We will acknowledge your request within 15 business days.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Data Deletion</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the right to request deletion of all personal information we hold about you. If you would like your data removed from our systems, contact us and we will process your request promptly. Please note that deleting your data will remove your booking history and cleaner preferences.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-500 text-sm">
              See also: <Link href="/privacy-policy" className="text-[#1E2A4A] underline underline-offset-2">Privacy Policy</Link> &middot; <Link href="/terms-conditions" className="text-[#1E2A4A] underline underline-offset-2">Terms &amp; Conditions</Link> &middot; <Link href="/refund-policy" className="text-[#1E2A4A] underline underline-offset-2">Refund Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
