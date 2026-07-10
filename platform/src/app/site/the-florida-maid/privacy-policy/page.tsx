import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Privacy Policy | The Florida Maid',
  description: 'The Florida Maid privacy policy — how we protect your data. We never sell or share your information. Florida cleaning from $49/hr. Over 25,000 homes served. (954) 710-3636',
  alternates: { canonical: 'https://www.thefloridamaid.com/privacy-policy' },
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://www.thefloridamaid.com' },
        { name: 'Privacy Policy', url: 'https://www.thefloridamaid.com/privacy-policy' },
      ])} />

      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide">Privacy Policy</h1>
          <p className="text-white mt-3">How we handle your information</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Privacy Policy', href: '/privacy-policy' }]} />

        <div className="mt-8 space-y-10">
          <p className="text-gray-400 text-sm">Last updated: February 2026</p>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-4">When you book a cleaning or use our website, we collect the following information:</p>
            <ul className="space-y-3">
              {[
                { label: 'Contact Information', detail: 'Your name, phone number, email address, and home address — provided when you book a cleaning or request a quote.' },
                { label: 'Service Details', detail: 'Information about your home (size, condition, access instructions) and any special cleaning requests or preferences.' },
                { label: 'Payment Information', detail: 'Payment is collected in person upon completion of service via Zelle (hi@thefloridamaid.com), Apple Pay, Venmo, credit card, or cash. We do not store payment card details on our servers.' },
                { label: 'Usage Data', detail: 'We collect anonymized data about how you interact with our website — pages visited, buttons clicked, and features used. This helps us improve the user experience and make our site more useful for you.' },
              ].map(item => (
                <li key={item.label} className="bg-gray-50 rounded-xl p-5">
                  <p className="text-[#CC6222] font-semibold text-sm mb-1">{item.label}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">How We Use Your Information</h2>
            <ul className="space-y-2.5">
              {[
                'To schedule, confirm, and provide your cleaning service',
                'To communicate with you about appointments, updates, and service-related matters',
                'To assign the right cleaner to your home based on location and service type',
                'To analyze anonymized usage data and improve our website experience',
                'To send you relevant updates about our services (you can opt out at any time)',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-gray-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">We Do Not Share Your Information</h2>
            <div className="bg-[#F5FBF8] border border-[#34D399]/30 rounded-xl p-6">
              <p className="text-gray-600 leading-relaxed mb-3">
                We do not sell, trade, rent, or share your personal information with any third parties. Period. Your data stays with us and is used solely to provide and improve your cleaning service.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The only people who see your information are the members of our team who need it to do their job — your assigned cleaner receives your address and access instructions, and that&apos;s it. We do not use third-party marketing platforms, data brokers, or advertising networks that track you.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">User Activity &amp; Analytics</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              We do collect anonymized data about how visitors use our website. This includes which pages you visit, what you click on, and how you navigate through the site. This data is used exclusively to improve the user experience — making it easier to book, find information, and get the most out of our services.
            </p>
            <p className="text-gray-600 leading-relaxed">
              This data is never tied to your identity, never shared with third parties, and never used for advertising or profiling purposes.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">How We Protect Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use industry-standard security measures including encrypted data transmission (SSL/TLS), secure access controls, and restricted internal access to personal data. Only authorized team members can view client information, and only what they need to perform their role.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">Your Rights</h2>
            <ul className="space-y-2.5">
              {[
                'Access the personal information we hold about you',
                'Request correction of inaccurate information',
                'Request deletion of your personal information',
                'Opt out of any communications at any time',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                  <span className="text-gray-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about this privacy policy? Contact us at <a href="mailto:hi@thefloridamaid.com" className="text-[#CC6222] underline underline-offset-2">hi@thefloridamaid.com</a> or text/call <a href="tel:9547103636" className="text-[#CC6222] underline underline-offset-2">(954) 710-3636</a>.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              See also: <Link href="/terms-conditions" className="text-[#CC6222] underline underline-offset-2">Terms &amp; Conditions</Link> &middot; <Link href="/refund-policy" className="text-[#CC6222] underline underline-offset-2">Refund Policy</Link> &middot; <Link href="/do-not-share-policy" className="text-[#CC6222] underline underline-offset-2">Do Not Share Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
