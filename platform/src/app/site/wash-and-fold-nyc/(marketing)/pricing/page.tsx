// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'

export const metadata: Metadata = {
  title: 'NYC Wash and Fold Pricing — $3/lb, Free Pickup & Delivery | Wash and Fold NYC',
  description: 'Complete pricing for Wash and Fold NYC. Wash & fold $3/lb, dry cleaning from $10/item, comforters from $35, commercial $1-$2/lb. Free pickup & delivery. Subscriptions save 10%. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/pricing' },
  openGraph: {
    title: 'NYC Wash and Fold Pricing — $3/lb, Free Pickup & Delivery',
    description: 'Every price for every service. $3/lb wash & fold, dry cleaning from $10, comforters from $35. Free pickup & delivery across Manhattan, Brooklyn & Queens.',
    url: 'https://www.washandfoldnyc.com/pricing',
  },
}

const pricingFAQs = [
  { question: 'Is pickup and delivery really free?', answer: 'Yes. Free on all orders over the $39 minimum. No delivery fee, no fuel surcharge, no tip required.' },
  { question: 'Is there a minimum order?', answer: '$39 minimum for pickup and delivery — about 13 pounds at $3/lb. Most single people exceed this easily with a week of laundry.' },
  { question: 'How do subscriptions work?', answer: 'Choose weekly or biweekly. Same day, same driver every time. Billed automatically after each delivery. Pause, skip, or cancel anytime — no contracts, no penalties.' },
  { question: 'Are there any hidden fees?', answer: 'Zero. The price on this page is the price on your bill. No surcharges for neighborhoods, distance, time of day, or busy periods.' },
]

export default function PricingPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7EC8E3] tracking-[0.25em] uppercase mb-4">Pricing</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-6">
            NYC Wash and Fold Pricing — $3/lb
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mx-auto mb-10">
            Every price for every service. No hidden fees. Free pickup & delivery across Manhattan, Brooklyn & Queens.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">$3<span className="text-lg text-sky-200/60">/lb</span></p>
              <p className="text-sky-200/40 text-xs mt-1">Wash & Fold</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#7EC8E3]">FREE</p>
              <p className="text-sky-200/40 text-xs mt-1">Pickup & Delivery</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">10%<span className="text-lg text-sky-200/60"> off</span></p>
              <p className="text-sky-200/40 text-xs mt-1">Weekly Subscribers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wash & Fold */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-8">Wash & Fold</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-sm text-gray-400 font-medium">Service</th>
                  <th className="pb-3 text-sm text-gray-400 font-medium">Price</th>
                  <th className="pb-3 text-sm text-gray-400 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ['Standard wash & fold', '$3/lb', '$39 minimum, 24-48 hr turnaround'],
                  ['Same-day rush', '+$20 flat', 'Orders before 10am, back by evening'],
                  ['Weekly subscription (15 lb)', '$162/mo', '10% off, same driver, priority processing'],
                  ['Weekly subscription (20 lb)', '$216/mo', '10% off, same driver, priority processing'],
                  ['Biweekly subscription (15 lb)', '$85.50/mo', '5% off, consistent schedule'],
                  ['Pickup & delivery', 'FREE', 'Included on all orders over $39 minimum'],
                ].map(([service, price, details]) => (
                  <tr key={service} className="border-b border-gray-100">
                    <td className="py-4 font-medium text-[#1a3a5c]">{service}</td>
                    <td className="py-4 text-[#4BA3D4] font-bold">{price}</td>
                    <td className="py-4 text-gray-500">{details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-400 text-xs mt-4">Fragrance-free, eco-friendly, and hypoallergenic detergent options at no extra charge.</p>
        </div>
      </section>

      {/* Dry Cleaning */}
      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-8"><Link href="/services/nyc-dry-cleaning" className="hover:text-[#4BA3D4] transition-colors">Dry Cleaning</Link></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <table className="w-full text-left text-sm">
              <tbody>
                {[
                  ['Dress shirt', '$10'],
                  ['Blouse', '$14'],
                  ['Pants / trousers', '$18'],
                  ['Skirt', '$18'],
                  ['Sweater', '$18'],
                  ['Blazer / sport coat', '$22'],
                ].map(([item, price]) => (
                  <tr key={item} className="border-b border-gray-200/60">
                    <td className="py-3 text-[#1a3a5c]">{item}</td>
                    <td className="py-3 text-[#4BA3D4] font-bold text-right">{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full text-left text-sm">
              <tbody>
                {[
                  ['Dress', '$28'],
                  ['2-piece suit', '$34'],
                  ['Winter coat', '$45'],
                  ['Down jacket', '$45'],
                  ['Evening gown', '$60'],
                  ['Wedding dress', '$350'],
                ].map(([item, price]) => (
                  <tr key={item} className="border-b border-gray-200/60">
                    <td className="py-3 text-[#1a3a5c]">{item}</td>
                    <td className="py-3 text-[#4BA3D4] font-bold text-right">{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-400 text-xs mt-6">Free pickup & delivery included. Same-week turnaround. Garment bags provided.</p>
        </div>
      </section>

      {/* Comforters */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-8"><Link href="/services/nyc-comforter-cleaning" className="hover:text-[#4BA3D4] transition-colors">Comforters & Bedding</Link></h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Twin comforter', '$35'],
              ['Full/Queen comforter', '$45'],
              ['King comforter', '$55'],
              ['Duvet cover', '$20'],
              ['Pillow (each)', '$12'],
              ['Mattress pad', '$25'],
              ['Sleeping bag', '$30'],
            ].map(([item, price]) => (
              <div key={item} className="border border-gray-200 rounded-xl p-5 text-center">
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4]">{price}</p>
                <p className="text-gray-500 text-sm mt-1">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* In-Unit & In-Building */}
      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-8">In-Home Laundry Service</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] mb-2"><Link href="/services/nyc-in-unit-laundry-service" className="hover:text-[#4BA3D4] transition-colors">In-Unit Laundry Service</Link></h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4] mb-3">$45–$85/visit</p>
              <p className="text-gray-500 text-sm leading-relaxed">We come to your apartment and do your laundry using your own washer/dryer. Sort, wash, dry, fold — 2-4 hours.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] mb-2"><Link href="/services/nyc-in-building-laundry-service" className="hover:text-[#4BA3D4] transition-colors">In-Building Laundry Service</Link></h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4] mb-3">$50–$90/visit</p>
              <p className="text-gray-500 text-sm leading-relaxed">We handle your building&apos;s shared laundry room. We bring quarters, manage machines, deliver folded to your door.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Commercial */}
      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-6"><Link href="/services/nyc-commercial-laundry" className="hover:text-[#7EC8E3] transition-colors">Commercial Laundry</Link></h2>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-8">
            <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#7EC8E3] mb-4">$1–$2/lb</p>
            <p className="text-sky-200/60 text-sm leading-relaxed mb-4">Bulk pricing for restaurants, salons, gyms, Airbnb hosts, and offices. Price depends on volume and frequency. Daily or weekly pickup schedules. Invoice billing. Dedicated account manager for 100+ lb/week accounts.</p>
            <p className="text-sky-200/40 text-xs">Text (917) 970-6002 for a custom business quote.</p>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">Payment Methods</h2>
          <p className="text-gray-500 mb-8">Pay after delivery — we never charge upfront.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Credit Card', 'Debit Card', 'Zelle', 'Venmo', 'Apple Pay', 'Cash'].map(method => (
              <span key={method} className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-lg px-5 py-3 text-sm text-[#1a3a5c] font-medium">{method}</span>
            ))}
          </div>
        </div>
      </section>

      <FAQSection faqs={pricingFAQs} title="Pricing FAQ" />

      <CTABlock title="Ready for $3/lb Laundry With Free Pickup?" subtitle="Text (917) 970-6002 — same rate across all 200 neighborhoods." />
    </>
  )
}
