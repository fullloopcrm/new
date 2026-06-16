// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/app/site/wash-and-fold-nyc/_lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'

export const metadata: Metadata = {
  title: 'Laundromat Partnership Program — We Send Customers, You Wash | The NYC Wash and Fold Service Company',
  description: 'Partner with The NYC Wash and Fold Service Company. We send customers to your laundromat, you process at $1-1.50/lb, we charge $3/lb and handle everything else. Apply today. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/partners' },
}

const partnerFAQs = [
  { question: 'How does the partnership model work?', answer: 'We bring you customers through our marketing and pickup delivery service. You process their laundry at your facility using your machines and staff at your normal rate of one to one fifty per pound. We charge customers three dollars per pound and handle all customer communication, billing, pickup, and delivery logistics. You focus on washing and folding. We focus on everything else.' },
  { question: 'How much do partners earn?', answer: 'Partners earn their standard processing rate — typically one to one fifty per pound. On a weekly volume of one hundred pounds, that is one hundred to one hundred fifty dollars per week in additional revenue from customers you did not have to acquire or market to. As volume grows to two hundred plus pounds per week, annual partner revenue reaches fifteen thousand to forty thousand dollars or more — all incremental volume on machines that would otherwise sit idle.' },
  { question: 'How much volume can I expect?', answer: 'New partners typically start with thirty to fifty pounds per week in the first month. By month three, volume usually reaches one hundred to one hundred fifty pounds per week as we build out routes in your neighborhood. By month six to twelve, established partners process two hundred to five hundred pounds per week depending on neighborhood density and demand.' },
  { question: 'What do I need to qualify?', answer: 'You need commercial washers and dryers in good working condition, staff to handle wash-dry-fold processing, consistent turnaround times of under twenty-four hours, and a clean facility that passes our quality inspection. We do not require exclusivity — you can continue running your regular walk-in business alongside our partnership volume.' },
  { question: 'Is there a contract or exclusivity requirement?', answer: 'We ask for a simple partnership agreement that outlines quality standards, turnaround expectations, and pricing. There is no exclusivity requirement — you keep your existing customers and business. Either party can end the partnership with thirty days notice.' },
  { question: 'How do I get paid?', answer: 'We pay partners weekly via direct deposit or Zelle based on the total pounds processed that week. You receive a detailed report showing each order, its weight, and the amount owed. Payment is sent every Monday for the previous week volume.' },
  { question: 'What neighborhoods are you looking for partners in?', answer: 'We are actively seeking partners in every Manhattan, Brooklyn, and Queens neighborhood. Priority areas include the Upper West Side, Upper East Side, Midtown, Chelsea, Williamsburg, Park Slope, Bushwick, Astoria, Long Island City, and Forest Hills — but we welcome applications from laundromats anywhere in our coverage area.' },
  { question: 'How do I apply?', answer: 'Text nine-one-seven, nine-seven-zero, six-zero-zero-two with your laundromat name and address. Or email hi@washandfoldnyc.com. We schedule a facility visit within one week, review your equipment and capacity, and can have you processing orders within two to three weeks of application.' },
]

export default function PartnersPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">
            Laundromat Partnership — We Send Customers, You Wash
          </h1>
          <p className="text-sky-200/70 text-lg max-w-2xl mx-auto mb-6">
            Own a laundromat in <Link href="/boroughs/manhattan" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Brooklyn</Link>, or <Link href="/boroughs/queens" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Queens</Link>? We bring you incremental volume at your standard processing rate. You wash, we handle everything else — marketing, customer acquisition, pickup, delivery, billing, and support.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white">$1–$1.50/lb</p>
              <p className="text-sky-200/40 text-xs">Your Processing Rate</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#7EC8E3]">$3/lb</p>
              <p className="text-sky-200/40 text-xs">Customer Rate</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white">$0</p>
              <p className="text-sky-200/40 text-xs">Marketing Cost to You</p>
            </div>
          </div>
          <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Apply — Text (917) 970-6002</a>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">How the Partnership Works</h2>
          <div className="text-gray-600 leading-relaxed space-y-5">
            <p>The model is straightforward. We invest heavily in marketing, SEO, and customer acquisition to generate wash and fold customers across New York City. When a customer in your neighborhood places an order, we pick up their laundry and deliver it to your facility. You process it — wash, dry, fold — at your standard rate of one to one dollar fifty per pound. We pick it up from your facility and deliver it back to the customer. We charge the customer three dollars per pound and handle all customer communication, payment processing, and issue resolution.</p>
            <p>You never interact with the customer directly. You never handle billing. You never deal with marketing or customer acquisition. You focus entirely on what you do best — running your machines and producing clean, well-folded laundry. We handle everything else. The volume we bring is incremental — it fills machines that would otherwise sit idle during off-peak hours and generates revenue you would not have without the partnership.</p>
            <p>There is no exclusivity requirement. You keep your existing walk-in business, your regular customers, and your drop-off service. Our partnership volume is additive. And because we handle all the customer-facing logistics, your staff workload increases only in actual laundry processing — not in customer service, phone calls, or dispute resolution.</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">What We Bring vs. What You Bring</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#4BA3D4] mb-4">We Bring</h3>
              <ul className="space-y-2 text-gray-600 text-sm">{['Customer acquisition and marketing', 'Pickup and delivery logistics', 'Customer communication and support', 'Billing and payment processing', 'Route optimization and scheduling', 'Brand, website, and SEO', 'Quality standards and checklists', 'Volume growth over time'].map(i => (<li key={i} className="flex items-start gap-2"><span className="text-[#4BA3D4]">&#10003;</span>{i}</li>))}</ul>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] mb-4">You Bring</h3>
              <ul className="space-y-2 text-gray-600 text-sm">{['Commercial washers and dryers', 'Trained staff for wash-dry-fold', 'Consistent under-24-hour turnaround', 'Clean, well-maintained facility', 'Capacity to handle growing volume', 'Your existing expertise'].map(i => (<li key={i} className="flex items-start gap-2"><span className="text-[#4BA3D4]">&#10003;</span>{i}</li>))}</ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide mb-2">Revenue Potential</h2>
          <p className="text-white/80 text-sm">Month 1: 30–50 lbs/week &middot; Month 3: 100–150 lbs/week &middot; Month 6+: 200–500 lbs/week</p>
          <p className="text-white/60 text-xs mt-2">At $1–$1.50/lb partner rate, annual revenue potential: $15,000–$40,000+ in incremental volume</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">Neighborhoods Seeking Partners</h2>
          {AREAS.map(area => {
            const neighborhoods = getNeighborhoodsByArea(area.slug)
            return (
              <div key={area.slug} className="mb-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-3">{area.name}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {neighborhoods.map(n => (<Link key={n.slug} href={`/partners/${n.slug}`} className="text-sm text-gray-600 hover:text-[#4BA3D4] transition-colors py-1">{n.name}</Link>))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <FAQSection faqs={partnerFAQs} title="Partnership — Frequently Asked Questions" />
      <CTABlock title="Apply to Partner" subtitle="Text (917) 970-6002 or email hi@washandfoldnyc.com — we respond within 24 hours." />
    </>
  )
}
