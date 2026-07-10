import type { Metadata } from 'next'
import Link from 'next/link'
import { faqSchema } from '@/app/site/wash-and-fold-nyc/_lib/seo/schema'
import JsonLd from '@/app/site/wash-and-fold-nyc/_components/marketing/JsonLd'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'

export const metadata: Metadata = {
  title: 'NYC Wash and Fold FAQ — Pricing, Pickup, Delivery, Subscriptions | The NYC Wash and Fold Service Company',
  description: 'Answers to every question about The NYC Wash and Fold Service Company. $3/lb pricing, free pickup & delivery, subscription plans, turnaround times, service areas, payment methods, and more. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/faq' },
  openGraph: {
    title: 'NYC Wash and Fold FAQ — Pricing, Delivery, Subscriptions',
    description: 'Everything you need to know about NYC wash & fold laundry service. $3/lb, free pickup & delivery, 24-48 hour turnaround.',
    url: 'https://www.washandfoldnyc.com/faq',
  },
}

const pricingFAQs = [
  { question: 'How much does wash and fold cost in NYC?', answer: '$3 per pound with a $39 minimum order. Free pickup and delivery on every order. Same-day rush is +$20. Weekly subscribers save 10%, biweekly save 5%. No hidden fees, no surcharges, no zone pricing — same rate across all neighborhoods.' },
  { question: 'Is there a minimum order?', answer: 'Yes, $39 minimum for pickup and delivery — about 13 pounds. Most single people generate 10-15 pounds per week, so a typical weekly order easily exceeds the minimum. Couples and families are well above it.' },
  { question: 'How much is dry cleaning?', answer: 'Priced per item: dress shirts $10, blouses $14, suits $34, dresses $28, pants $18, blazers $22, winter coats $45, sweaters $18, ties $12, evening gowns $60, wedding dresses $350. Free pickup and delivery included.' },
  { question: 'How much are comforters?', answer: 'Flat rate: Twin $35, Full/Queen $45, King $55. Duvet covers $20, pillows $12 each, mattress pads $25, sleeping bags $30. Free pickup and delivery.' },
  { question: 'What are the subscription plans?', answer: 'Weekly 15 lb: $162/mo (10% off). Weekly 20 lb: $216/mo (10% off). Biweekly 15 lb: $85.50/mo (5% off). Same driver, consistent schedule, priority processing, pause or cancel anytime. No contracts.' },
  { question: 'What payment methods do you accept?', answer: 'Credit card, debit card, Zelle (hi@washandfoldnyc.com), Venmo, Apple Pay, and cash. Payment is collected after delivery — never upfront. Subscriptions are billed automatically after each delivery.' },
]

const serviceFAQs = [
  { question: 'How does pickup and delivery work?', answer: 'Text (917) 970-6002 with your address. We confirm a pickup window, usually same-day or next-day. Leave your bag at your door, lobby, or doorman. We pick up, wash, fold, and deliver back within 24-48 hours. You get text updates at every stage.' },
  { question: 'How fast is turnaround?', answer: '24-48 hours standard. Orders placed before noon are usually back the next day. Same-day rush is available for +$20 on orders picked up before 10am.' },
  { question: 'Do I need to be home?', answer: 'No. Most customers are not home for pickup or delivery. We leave clean laundry with your doorman, at your door, or in any secure location you designate. You get a text confirmation with the exact drop location.' },
  { question: 'Is my laundry mixed with others?', answer: 'Never. Every order is processed in its own separate batch from pickup to delivery. Your laundry is tagged at intake and never touches another customer\'s clothes.' },
  { question: 'Do you separate colors?', answer: 'Yes. Every load is sorted into whites, darks, colors, and brights. Delicates go in mesh bags on gentle cycles. Each color group is washed as its own load.' },
  { question: 'What detergent do you use?', answer: 'Premium commercial-grade detergent. Fragrance-free, eco-friendly, and hypoallergenic options available at no extra charge. Just tell us your preference and we save it for every future order.' },
  { question: 'How do you handle delicates?', answer: 'Sorted separately, washed in mesh bags on gentle cycles with cold water. Never machine-dried unless the care label says it is safe. Items that appear dry-clean-only are flagged and set aside — we text you before proceeding.' },
  { question: 'Do you fold everything?', answer: 'Yes. Every item is hand-folded by a trained professional. Shirts flat, pants creased, towels in thirds, socks paired, underwear folded. Everything organized by garment type.' },
]

const coverageFAQs = [
  { question: 'What areas do you serve?', answer: 'All of Manhattan, Brooklyn, and Queens — nearly 200 neighborhoods. Same rate everywhere, no distance surcharges.' },
  { question: 'Do you serve businesses?', answer: 'Yes. Commercial laundry for restaurants, salons, gyms, Airbnb hosts, and offices. $1-$2/lb depending on volume and frequency. Daily or weekly schedules, invoice billing, dedicated account manager for 100+ lb/week accounts.' },
  { question: 'What are your hours?', answer: 'Pickup and delivery: 7am-9pm, 7 days a week. Text support during the same hours. Processing runs overnight and weekends.' },
]

const trustFAQs = [
  { question: 'Are you licensed and insured?', answer: 'Yes. Fully licensed, bonded, and insured in New York State with general liability coverage. All team members are background-checked. Business address: 150 W 47th St, New York, NY 10036.' },
  { question: 'What if something is damaged or lost?', answer: 'Contact us within 48 hours. We carry full liability insurance. Every order is inventoried at pickup and cross-checked at delivery. Lost items are extremely rare due to our separate-batch processing.' },
  { question: 'Can I get the same driver each time?', answer: 'Subscription customers automatically get a consistent route driver every week. For one-time orders, let us know if you have a driver preference and we\'ll accommodate when possible.' },
  { question: 'How do I get started?', answer: 'Text or call (917) 970-6002 with your address. No app, no account, no forms. We schedule a pickup — usually same-day or next-day — and have clean folded laundry back at your door within 24-48 hours.' },
]

const allFAQs = [...pricingFAQs, ...serviceFAQs, ...coverageFAQs, ...trustFAQs]

export default function FAQPage() {
  const schemas = [faqSchema(allFAQs)]

  return (
    <>
      <JsonLd data={schemas} />

      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7EC8E3] tracking-[0.25em] uppercase mb-4">FAQ</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-6">
            NYC Wash and Fold — Frequently Asked Questions
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mx-auto">
            Everything you need to know about our $3/lb wash & fold laundry service with free pickup & delivery across Manhattan, Brooklyn & Queens.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-6">Pricing & Payment</h2>
          <div className="space-y-3">
            {pricingFAQs.map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-medium text-[#1a3a5c] hover:bg-gray-50 transition-colors">
                  {faq.question}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0 ml-4">+</span>
                </summary>
                <div className="px-6 pb-5 text-gray-600 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-6">Service & Process</h2>
          <div className="space-y-3">
            {serviceFAQs.map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-medium text-[#1a3a5c] hover:bg-gray-50 transition-colors">
                  {faq.question}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0 ml-4">+</span>
                </summary>
                <div className="px-6 pb-5 text-gray-600 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-6">Coverage & Hours</h2>
          <div className="space-y-3">
            {coverageFAQs.map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-medium text-[#1a3a5c] hover:bg-gray-50 transition-colors">
                  {faq.question}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0 ml-4">+</span>
                </summary>
                <div className="px-6 pb-5 text-gray-600 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-6">Trust & Getting Started</h2>
          <div className="space-y-3">
            {trustFAQs.map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-medium text-[#1a3a5c] hover:bg-gray-50 transition-colors">
                  {faq.question}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0 ml-4">+</span>
                </summary>
                <div className="px-6 pb-5 text-gray-600 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CTABlock title="Still Have Questions?" subtitle="Text (917) 970-6002 — a real person will answer within minutes." />
    </>
  )
}
