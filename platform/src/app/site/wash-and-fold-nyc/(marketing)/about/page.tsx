// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'

export const metadata: Metadata = {
  title: 'About The NYC Wash and Fold Service Company — NYC Laundry Service Since 2024 | $3/lb, Free Pickup & Delivery',
  description: 'The NYC Wash and Fold Service Company is a professional laundry service across Manhattan, Brooklyn & Queens. $3/lb wash & fold with free pickup & delivery. 5.0★ Google, 16 reviews, zero complaints. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/about' },
  openGraph: {
    title: 'About The NYC Wash and Fold Service Company — NYC Laundry Service',
    description: 'Professional wash & fold laundry service across Manhattan, Brooklyn & Queens. $3/lb, free pickup & delivery, 5.0★ Google.',
    url: 'https://www.washandfoldnyc.com/about',
  },
}

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7EC8E3] tracking-[0.25em] uppercase mb-4">About Us</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-6">
            About The NYC Wash and Fold Service Company
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mx-auto">
            Professional laundry service across Manhattan, Brooklyn & Queens. $3/lb with free pickup & delivery. 5.0★ Google rating. Zero negative reviews.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-gray-600 leading-relaxed space-y-6">
            <p>The NYC Wash and Fold Service Company, a division of The NYC Maid, is a professional laundry service built for how New Yorkers actually live. We pick up your dirty laundry from your door, wash and fold every item by hand, and deliver it back clean, fresh, and organized — all for $3 per pound with free pickup and delivery.</p>
            <p>We serve nearly 200 neighborhoods across <Link href="/boroughs/manhattan" className="text-[#4BA3D4] underline underline-offset-2">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#4BA3D4] underline underline-offset-2">Brooklyn</Link>, and <Link href="/boroughs/queens" className="text-[#4BA3D4] underline underline-offset-2">Queens</Link>. Same rate everywhere — no zone fees, no distance surcharges, no surge pricing.</p>
            <p>Every order goes through the same 12-step process: intake, color sort, fabric sort, stain pre-treatment, wash with premium detergent, dry on appropriate heat, hand-fold every item, organize by garment type, package in clean bags, quality check, and delivery. Your laundry is never mixed with another customer&apos;s — every order is processed in its own separate batch from start to finish.</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-10">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: '5.0★', label: 'Google Rating' },
              { n: '16', label: 'Five-Star Reviews' },
              { n: '~200', label: 'Neighborhoods Served' },
              { n: '$3/lb', label: 'Flat Rate' },
              { n: '0', label: 'Negative Reviews' },
              { n: '24-48hr', label: 'Standard Turnaround' },
              { n: '7', label: 'Laundry Services' },
              { n: '12', label: 'Step Process' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c]">{stat.n}</p>
                <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">What We Do</h2>
          <div className="text-gray-600 leading-relaxed space-y-6">
            <p>We offer seven laundry services designed to cover every need:</p>
            <ul className="space-y-3">
              <li><Link href="/services/nyc-wash-and-fold" className="text-[#4BA3D4] underline underline-offset-2 font-medium">Wash & Fold</Link> — $3/lb, 24-48 hour turnaround, free pickup & delivery</li>
              <li><Link href="/services/nyc-pickup-and-delivery" className="text-[#4BA3D4] underline underline-offset-2 font-medium">Pickup & Delivery</Link> — free doorstep service across all three boroughs</li>
              <li><Link href="/services/nyc-in-unit-laundry-service" className="text-[#4BA3D4] underline underline-offset-2 font-medium">In-Unit Laundry</Link> — we come to your apartment and use your own W/D</li>
              <li><Link href="/services/nyc-in-building-laundry-service" className="text-[#4BA3D4] underline underline-offset-2 font-medium">In-Building Laundry</Link> — we handle your building&apos;s shared laundry room</li>
              <li><Link href="/services/nyc-dry-cleaning" className="text-[#4BA3D4] underline underline-offset-2 font-medium">Dry Cleaning</Link> — suits, dresses, coats, delicates, wedding gowns</li>
              <li><Link href="/services/nyc-comforter-cleaning" className="text-[#4BA3D4] underline underline-offset-2 font-medium">Comforter Cleaning</Link> — twin $35, queen $45, king $55</li>
              <li><Link href="/services/nyc-commercial-laundry" className="text-[#4BA3D4] underline underline-offset-2 font-medium">Commercial Laundry</Link> — restaurants, salons, gyms, Airbnbs, $1-$2/lb</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-6">What Sets Us Apart</h2>
          <div className="space-y-6">
            {[
              { t: 'Separate Batch Processing', d: 'Your laundry never touches another customer\'s clothes. Every order is tagged, processed, and packaged individually from pickup to delivery.' },
              { t: 'Real Human Communication', d: 'Text (917) 970-6002 and talk to an actual person — not a chatbot, not an automated system. Response within minutes during business hours.' },
              { t: 'Transparent Pricing', d: '$3/lb. No hidden fees, no delivery charges, no fuel surcharges, no tip expectations. The price on the website is the price on your bill.' },
              { t: 'Licensed, Insured & Background-Checked', d: 'Fully licensed in New York State with general liability insurance. Every team member passes a background check. 150 W 47th St, New York, NY 10036.' },
              { t: 'Consistent Quality', d: 'Same 12-step process on every order. Same standards from your first order to your hundredth. 5.0★ Google rating with zero negative reviews.' },
            ].map(item => (
              <div key={item.t} className="bg-white/[0.06] border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-2">{item.t}</h3>
                <p className="text-sky-200/60 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">Company Details</h2>
          <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Legal Name:</span> <span className="text-[#1a3a5c] font-medium">The NYC Wash and Fold Service Company Laundry Service LLC</span></div>
              <div><span className="text-gray-400">Founded:</span> <span className="text-[#1a3a5c] font-medium">2024</span></div>
              <div><span className="text-gray-400">Address:</span> <span className="text-[#1a3a5c] font-medium">150 W 47th St, New York, NY 10036</span></div>
              <div><span className="text-gray-400">Phone:</span> <a href="tel:9179706002" className="text-[#4BA3D4] font-medium">(917) 970-6002</a></div>
              <div><span className="text-gray-400">Email:</span> <a href="mailto:hi@washandfoldnyc.com" className="text-[#4BA3D4] font-medium">hi@washandfoldnyc.com</a></div>
              <div><span className="text-gray-400">Google Rating:</span> <span className="text-[#1a3a5c] font-medium">5.0★ (16 reviews)</span></div>
              <div><span className="text-gray-400">Service Area:</span> <span className="text-[#1a3a5c] font-medium">Manhattan, Brooklyn, Queens</span></div>
              <div><span className="text-gray-400">Languages:</span> <span className="text-[#1a3a5c] font-medium">English, Spanish</span></div>
            </div>
          </div>
        </div>
      </section>

      <CTABlock title="Ready to Try NYC's Top-Rated Laundry Service?" subtitle="Text (917) 970-6002 — $3/lb, free pickup & delivery, 24-48 hour turnaround." />
    </>
  )
}
