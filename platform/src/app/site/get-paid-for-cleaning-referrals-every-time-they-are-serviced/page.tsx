import type { Metadata } from 'next'
import { breadcrumbSchema, localBusinessSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import FAQSection from '@/components/marketing/FAQSection'
import CTABlock from '@/components/marketing/CTABlock'
import ReferralSignupForm from '@/components/marketing/ReferralSignupForm'

export const metadata: Metadata = {
  title: 'Get Paid for Cleaning Referrals | Earn 10% Commission | The NYC Maid',
  description: 'Earn 10% commission every time your referral books a cleaning (from $49/hr). Recurring income, fast payouts via Zelle or Apple Cash. (212) 202-8400',
  alternates: { canonical: 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
  openGraph: {
    title: 'Get Paid for Cleaning Referrals | The NYC Maid',
    description: 'Earn 10% commission every time someone you refer books a cleaning. Recurring income, fast payouts.',
    url: 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced',
  },
}

const referralFAQs = [
  { question: 'How much do I earn per referral?', answer: 'You earn 10% commission on every cleaning booked by someone you referred. This is recurring — every time they book, you get paid.' },
  { question: 'How do I get paid?', answer: 'We pay commissions via Zelle or Apple Cash after each completed cleaning. You choose your preferred payout method when you sign up.' },
  { question: 'Is there a limit on how many people I can refer?', answer: 'No limit! Refer as many people as you want. The more referrals, the more you earn.' },
  { question: 'How do I track my referrals?', answer: 'After signing up, you get access to a referral dashboard where you can see your link performance, active referrals, earnings, and payout history.' },
  { question: 'Do my referrals need to use a special link?', answer: 'Yes — when you sign up, you receive a unique referral link. When someone books through your link, the referral is automatically tracked.' },
  { question: 'How long do I earn commissions for each referral?', answer: 'You earn commissions for as long as the person you referred remains a customer. If they book weekly cleanings for a year, you earn 10% on every single one.' },
]

export default function ReferralPage() {
  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Referral Program', url: 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
        ]),
        faqSchema(referralFAQs),
      ]} />

      {/* Hero */}
      <section className="bg-[#1E2A4A] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Get Paid for Cleaning Referrals
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl leading-relaxed">
            Earn 10% commission every time someone you refer books a cleaning with The NYC Maid. No limit on referrals. Recurring income for as long as they stay a customer.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Referral Program', href: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced' }]} />

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-8 text-center">
            <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#1E2A4A] tracking-wide mb-2">10%</p>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Commission</p>
            <p className="text-gray-600 text-sm">On every cleaning your referral books — not just the first one.</p>
          </div>
          <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-8 text-center">
            <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#1E2A4A] tracking-wide mb-2">Recurring</p>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Income</p>
            <p className="text-gray-600 text-sm">Every time they book, you earn. Weekly clients mean weekly payouts.</p>
          </div>
          <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-8 text-center">
            <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#1E2A4A] tracking-wide mb-2">Fast</p>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Payouts</p>
            <p className="text-gray-600 text-sm">Paid via Zelle or Apple Cash after each completed cleaning.</p>
          </div>
        </div>

        {/* Video */}
        <div className="mb-16">
          <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
            <iframe
              src="https://www.youtube.com/embed/MhVjNiZtB_E"
              title="The NYC Maid Referral Program"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Two-column: How it Works + Signup Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-4">How It Works</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-8">Three Simple Steps</p>

            <div className="space-y-8">
              <div className="flex gap-5">
                <div className="w-10 h-10 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-[#1E2A4A] text-lg mb-1">Sign Up &amp; Get Your Link</h3>
                  <p className="text-gray-600">Fill out the form — takes 30 seconds. You&apos;ll receive a unique referral link and code.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-10 h-10 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-[#1E2A4A] text-lg mb-1">Share With Friends &amp; Family</h3>
                  <p className="text-gray-600">Send your link to anyone who needs cleaning in NYC, Long Island, or NJ. They book using your link.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-10 h-10 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-[#1E2A4A] text-lg mb-1">Earn 10% Every Time</h3>
                  <p className="text-gray-600">You get 10% of every cleaning they book — paid after each completed visit. No cap on earnings.</p>
                </div>
              </div>
            </div>

            <div className="w-12 h-[2px] bg-[#A8F0DC] my-10" />

            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-4">Why It Works</h2>
            <ul className="space-y-3">
              {[
                'No cost to you — ever',
                'No sales pitch needed — just share your link',
                'Your referrals get the same great rates',
                'Track everything in your referral dashboard',
                'Unlimited referrals, unlimited earnings',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#A8F0DC] mt-1 text-lg">&#10003;</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <ReferralSignupForm />
        </div>

        {/* Earnings example */}
        <div className="bg-white border border-gray-200 rounded-xl p-10 mb-16 text-center">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Example Earnings</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-6">See How Quickly It Adds Up</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-5 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">1 referral, weekly cleaning</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">$25+/mo</p>
            </div>
            <div className="p-5 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">5 referrals, bi-weekly</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">$60+/mo</p>
            </div>
            <div className="p-5 bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">10 referrals, weekly</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">$250+/mo</p>
            </div>
          </div>
        </div>
      </div>

      <FAQSection faqs={referralFAQs} title="Referral Program FAQ" />
      <CTABlock title="Start Earning Today" subtitle="Sign up in 30 seconds and start sharing your referral link." />
    </>
  )
}
