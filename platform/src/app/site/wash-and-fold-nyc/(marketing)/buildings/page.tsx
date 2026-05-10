// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'

export const metadata: Metadata = {
  title: 'Building Laundry Packages — $3/lb, Lobby Pickup | Wash and Fold NYC',
  description: 'Laundry service for NYC buildings — luxury high-rises, doorman buildings, and student housing. $3/lb, free lobby pickup, volume discounts. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/buildings' },
}

const buildingTypes = [
  { slug: 'luxury-buildings', name: 'Luxury & High-Rise Buildings', desc: 'White-glove laundry service with concierge coordination, lobby pickup, premium garment care, and dedicated account management. Volume discounts for buildings that sign up ten or more units. We integrate with your building existing concierge workflow so residents never have to leave their floor. This includes same-day dry cleaning pickup, comforter and bedding service, and the ability to schedule recurring weekly pickups through the front desk. Many luxury buildings in Manhattan and Brooklyn use our service as a building amenity — listed alongside gym access, rooftop access, and package handling.' },
  { slug: 'doorman-buildings', name: 'Doorman Buildings', desc: 'Leave your bag with the doorman on your way out. We pick up during a scheduled window, process your laundry, and deliver it back to the front desk the next day. You get a text when it is ready. The doorman holds it until you pick up or can bring it to your unit. This is our most common building type — thousands of doorman buildings across Manhattan, Brooklyn, and Queens use this exact workflow. There is nothing for the building management to set up or maintain. Residents simply tell the doorman they are expecting a pickup from Wash and Fold NYC and we handle the rest.' },
  { slug: 'student-housing', name: 'Student Housing & Dorms', desc: 'Affordable three dollar per pound service with flexible scheduling that works around class times, exam periods, and semester breaks. We pick up from dorm lobbies, mail rooms, or building entrances. Students skip the crowded basement laundry room entirely. End-of-semester deep clean packages are available for move-out. Parents can set up and pay for a subscription for their college student — we handle the pickup and delivery and send the parent a confirmation after each order. Popular with students at NYU, Columbia, The New School, Parsons, FIT, Baruch, Hunter, and Brooklyn College.' },
]

const buildingFAQs = [
  { question: 'How does building laundry service work?', answer: 'Residents leave laundry bags with the doorman, in the lobby, or at a designated pickup spot. Our driver picks up during a scheduled window, processes the laundry at our facility, and delivers it back to the same location within twenty-four to forty-eight hours. Residents pay individually per order at three dollars per pound. There is no setup cost or ongoing cost for the building itself.' },
  { question: 'Does the building management need to do anything?', answer: 'No. We coordinate directly with the doorman or front desk staff. Building management does not need to sign a contract, install anything, or change any procedures. Residents opt in individually. If building management wants to formally promote the service, we can provide marketing materials and offer volume discounts.' },
  { question: 'Are there volume discounts for buildings?', answer: 'Yes. Buildings with ten or more active residents receive a discounted rate. Contact us for specifics — the discount depends on total weekly volume across all participating units. The more residents who use the service, the better the rate for everyone.' },
  { question: 'Can this be offered as a building amenity?', answer: 'Absolutely. Many luxury buildings and management companies promote our laundry service as a building amenity alongside gym access, package rooms, and rooftop lounges. We provide branded materials and can do a launch event or flyer distribution for new buildings. There is no cost to the building — residents pay per order.' },
  { question: 'How does it work for walkups without a doorman?', answer: 'For walkup buildings without a doorman, residents leave their bag at their apartment door. Our driver comes to the specified floor during the pickup window. This works well for buildings of any height — we have drivers who regularly service fifth-floor walkups. Delivery works the same way — we bring the clean laundry back to the apartment door.' },
  { question: 'Is there a minimum number of residents?', answer: 'No building-wide minimum. Individual residents can start using the service one at a time. The volume discount kicks in at ten or more active residents, but even a single resident in a building can sign up and get the full three dollar per pound service with free pickup and delivery.' },
  { question: 'What about security and building access?', answer: 'We work with your building existing access procedures. In doorman buildings, the doorman handles everything. In buildings with buzzer systems, residents buzz us in during their pickup window. We can be added to authorized visitor lists. All of our drivers carry ID and are background-checked. We are happy to provide proof of insurance to building management upon request.' },
  { question: 'How do I get this started for my building?', answer: 'There are two ways. Individual residents can start immediately — just text nine-one-seven, nine-seven-zero, six-zero-zero-two with your address. Building management or boards who want to set up a building-wide program can contact us at hi@washandfoldnyc.com and we will schedule a meeting to discuss volume discounts and implementation.' },
]

export default function BuildingsPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">
            Building Laundry Packages — $3/lb With Lobby Pickup
          </h1>
          <p className="text-sky-200/70 text-lg max-w-2xl mx-auto mb-6">
            Laundry service designed for NYC buildings. We work with your doorman, concierge, or building manager to make laundry seamless for residents. Same three dollar per pound rate, free pickup and delivery, and volume discounts for buildings with ten or more active residents. Works with <Link href="/buildings/luxury-buildings" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">luxury high-rises</Link>, <Link href="/buildings/doorman-buildings" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">doorman buildings</Link>, and <Link href="/buildings/student-housing" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">student housing</Link>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Text (917) 970-6002</a>
            <a href="mailto:hi@washandfoldnyc.com" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Email for Building Quotes</a>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-12">Three Building Types, One Simple Service</h2>
          <div className="space-y-8">
            {buildingTypes.map(bt => (
              <Link key={bt.slug} href={`/buildings/${bt.slug}`} className="group block border border-gray-200 rounded-2xl p-8 hover:border-[#4BA3D4] hover:shadow-lg transition-all">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide group-hover:text-[#4BA3D4] transition-colors mb-3">{bt.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{bt.desc}</p>
                <p className="text-[#4BA3D4] text-sm font-medium mt-4">Learn more &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-6">How It Works for Buildings</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { n: '01', t: 'Resident Signs Up', d: 'Any resident texts (917) 970-6002 with their address. No building-wide contract needed. Residents opt in individually.' },
              { n: '02', t: 'Bag Left at Pickup Spot', d: 'Resident leaves their laundry bag with the doorman, in the lobby, or at their apartment door before their pickup window.' },
              { n: '03', t: 'We Pick Up & Process', d: 'Our driver picks up, takes it to our facility, and processes through our twelve-step wash-dry-fold system. Free pickup on every order.' },
              { n: '04', t: 'Delivered Back Clean', d: 'Clean, folded laundry is delivered back to the same spot within twenty-four to forty-eight hours. Resident gets a text notification.' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <span className="font-[family-name:var(--font-bebas)] text-4xl text-[#4BA3D4]/30">{s.n}</span>
                <p className="font-semibold text-[#1a3a5c] text-sm mt-2 mb-1">{s.t}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide mb-2">Volume Discounts for Buildings</h2>
          <p className="text-white/80 text-sm">10+ active residents = discounted rate. Contact us for your building specific pricing.</p>
        </div>
      </section>

      <FAQSection faqs={buildingFAQs} title="Building Laundry — Frequently Asked Questions" />
      <CTABlock title="Get a Building Quote" subtitle="Text (917) 970-6002 or email hi@washandfoldnyc.com with your building address." />
    </>
  )
}
