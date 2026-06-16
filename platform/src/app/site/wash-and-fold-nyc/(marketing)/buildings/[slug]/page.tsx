// @ts-nocheck
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'
import Breadcrumbs from '@/app/site/wash-and-fold-nyc/_components/marketing/Breadcrumbs'

interface Props { params: Promise<{ slug: string }> }

const BUILDING_DATA: Record<string, { name: string; description: string; longDescription: string; features: string[]; faqs: { question: string; answer: string }[] }> = {
  'luxury-buildings': {
    name: 'Luxury Building Laundry Service',
    description: 'White-glove laundry service for luxury residences. Concierge integration, lobby pickup, premium garment care, and dry cleaning — all at $3/lb with free pickup.',
    longDescription: 'Luxury buildings in Manhattan, Brooklyn, and Queens demand a higher standard of service. Residents expect seamless experiences that integrate with the building existing concierge workflow. Our luxury building laundry program is designed specifically for high-end residences — we coordinate directly with your concierge and doorman team so residents never have to think about logistics. Residents leave their laundry bag at the front desk, our driver picks up during a scheduled window, and clean, perfectly folded laundry is delivered back to the concierge desk within twenty-four to forty-eight hours. For dry cleaning, we provide garment bags and handle suits, dresses, coats, and specialty items with the same white-glove approach. Many luxury buildings list our service alongside gym access, rooftop lounges, and package handling as a building amenity. We offer volume discounts for buildings with ten or more active resident accounts — the more residents who participate, the better the rate for everyone. There is no cost to the building itself. No contracts, no equipment to install, no changes to your existing procedures. We simply become another service your concierge offers to residents.',
    features: ['Concierge and doorman coordination', 'Lobby pickup and delivery', 'Premium detergent and fabric care', 'Garment bags for all delicates', 'Same-day rush available (+$20)', 'Dry cleaning pickup included', 'Comforter and bedding service', 'Recurring weekly scheduling', 'Volume discounts for 10+ units', 'Dedicated account manager', 'Building amenity marketing materials', 'Proof of insurance for management'],
    faqs: [
      { question: 'How does concierge integration work?', answer: 'We coordinate directly with your concierge or doorman team. Residents leave laundry bags at the desk, our driver picks up during a scheduled window, and delivers clean laundry back to the desk. The concierge can hold it for the resident or deliver it to their unit depending on building policy. We provide a simple pickup and delivery log so the concierge always knows what is coming and going.' },
      { question: 'Is there a cost to the building?', answer: 'No. There is zero cost to the building or management company. Individual residents pay three dollars per pound for their own orders. We handle all billing, customer communication, and logistics. The building simply allows us to coordinate pickups and deliveries through the front desk.' },
      { question: 'What volume discount is available?', answer: 'Buildings with ten or more active residents receive a discounted per-pound rate. The exact discount depends on total weekly volume across all participating units. Contact us at hi@washandfoldnyc.com for your building specific pricing.' },
      { question: 'Can this be marketed as a building amenity?', answer: 'Absolutely. We provide branded flyers, lobby signage, and welcome package inserts that buildings can distribute to residents. Many luxury buildings include our service in their amenity list alongside fitness centers, package rooms, and rooftop access. There is no cost for these materials.' },
      { question: 'Do you handle dry cleaning for luxury garments?', answer: 'Yes. We pick up dry cleaning alongside regular wash and fold orders. Suits are thirty-four dollars, dresses twenty-eight dollars, winter coats forty-five dollars, evening gowns sixty dollars, and wedding dresses three hundred fifty dollars. Every dry cleaning item is returned in a garment bag with a button and repair check included.' },
      { question: 'What about security and building access?', answer: 'All drivers are background-checked and carry ID. We are fully licensed, bonded, and insured with general liability coverage. We can provide proof of insurance to building management upon request. Our drivers follow your building guest and vendor access procedures exactly.' },
    ],
  },
  'doorman-buildings': {
    name: 'Doorman Building Laundry Service',
    description: 'Leave your laundry with the doorman, we pick it up and deliver it back — clean, folded, and ready. $3/lb, free pickup, no hassle.',
    longDescription: 'Doorman buildings are the easiest building type for our service because the workflow is completely frictionless. The resident leaves a laundry bag with the doorman before their scheduled pickup window. Our driver arrives, picks up the bag from the doorman, and sends the resident a text confirmation. The laundry goes through our twelve-step processing system — sort by color, sort by fabric, stain pre-treatment, wash, dry, hand-fold, organize, and package. Within twenty-four to forty-eight hours, our driver returns with clean, sealed bags of perfectly folded laundry and leaves them with the doorman. The resident receives a text that their laundry is ready at the front desk. The entire process requires approximately thirty seconds of the resident time — handing a bag to the doorman and picking up a clean bag later. No waiting for machines, no folding, no carrying bags to a laundromat. Thousands of doorman buildings across Manhattan, Brooklyn, and Queens already use this exact workflow. There is nothing for building management to set up or maintain. Residents sign up individually by texting us their address.',
    features: ['Doorman pickup coordination', 'Scheduled pickup windows', 'Free delivery back to front desk', 'Text notifications at pickup and delivery', 'Same-day rush available (+$20)', 'Recurring weekly or biweekly scheduling', 'All services: wash & fold, dry cleaning, comforters', 'Volume discounts for 10+ residents', 'Building-wide packages available', 'No in-unit access needed', 'Works with any doorman schedule', 'Zero setup for building management'],
    faqs: [
      { question: 'Does the doorman need to do anything special?', answer: 'Nothing beyond what they already do — holding packages and bags for residents. The resident tells the doorman they are expecting a pickup from The NYC Wash and Fold Service Company. Our driver arrives during the scheduled window, identifies the resident bag, and takes it. On delivery, we drop the clean bags at the front desk and the doorman holds them. No special procedures, no training, no systems to learn.' },
      { question: 'What if the doorman is not at the desk during pickup?', answer: 'We schedule pickups during staffed hours. If the doorman is temporarily away from the desk, our driver will wait briefly or coordinate with the relief doorman. We have backup procedures for every scenario — the laundry always gets picked up and delivered on time.' },
      { question: 'Can different residents have different pickup days?', answer: 'Yes. Each resident has their own individual account with their own pickup schedule. One resident might have Monday pickups, another might have Wednesday. We coordinate with the doorman for each resident independently. The doorman simply accepts and holds bags — they do not need to track individual schedules.' },
      { question: 'How do I sign up if I live in a doorman building?', answer: 'Text nine-one-seven, nine-seven-zero, six-zero-zero-two with your address. We confirm your building and schedule your first pickup. Let your doorman know to expect a pickup from The NYC Wash and Fold Service Company. That is it — the entire setup takes about two minutes.' },
      { question: 'Is there a building-wide discount?', answer: 'Yes. Buildings with ten or more active residents qualify for a volume discount on the per-pound rate. If you are a resident who wants to bring the service to your building, we can provide flyers for the lobby and information for your building management.' },
      { question: 'What buildings do you already serve?', answer: 'We serve doorman buildings across all of Manhattan, Brooklyn, and Queens. We do not publish a specific list for privacy reasons, but if you text us your building address, we can tell you whether we already have active residents in your building and how the logistics work there.' },
    ],
  },
  'student-housing': {
    name: 'Student Housing Laundry Service',
    description: 'Affordable laundry service for students. $3/lb, flexible scheduling around classes, pickup from your dorm or building lobby.',
    longDescription: 'College students in New York City know the dorm laundry room struggle — two machines for an entire floor, both always occupied or broken, and the whole process eats into study time. Our student housing laundry service eliminates the problem entirely. We pick up from your dorm lobby, mail room, or building entrance and deliver clean, folded laundry back within twenty-four to forty-eight hours. The rate is the same three dollars per pound that everyone pays — no student premium, no dorm surcharge. Scheduling is flexible and works around your class schedule. You text us when you have a bag ready and we schedule a pickup that fits your day. Many students use our weekly subscription plan which saves ten percent and creates a consistent pickup routine — same day every week, same driver, and you never run out of clean clothes during midterms or finals. Parents can set up and pay for a subscription on their student behalf — we handle the pickup and delivery and send the parent a confirmation after each order. This is one of the most popular gifts parents give their NYC college students. End-of-semester deep clean packages are available for move-out — we wash everything including bedding, towels, and clothing before you pack up for the summer or transfer to a new dorm.',
    features: ['$3/lb — same rate as everyone', 'Dorm lobby and mail room pickup', 'Flexible scheduling around classes', 'Text to schedule anytime', 'Weekly subscription saves 10%', 'Comforter and bedding cleaning', 'End-of-semester move-out packages', 'No contract or commitment', 'Parents can set up and pay', 'Fast 24-48 hour turnaround', 'Works with campus mail rooms', 'Popular at NYU, Columbia, FIT, Baruch, Hunter'],
    faqs: [
      { question: 'How does dorm pickup work?', answer: 'Leave your laundry bag at the dorm lobby, front desk, mail room, or building entrance before your scheduled pickup window. Our driver grabs it and texts you confirmation. On delivery, we bring it back to the same spot. You do not need to be present for either pickup or delivery.' },
      { question: 'Can my parents set up and pay for this?', answer: 'Yes. This is one of our most popular options. A parent texts or calls us with their student name, dorm address, and payment method. We set up the account, schedule pickups, and the parent receives a confirmation text after each delivery. The student just has to leave a bag at the designated spot.' },
      { question: 'Is there a student discount?', answer: 'The rate is three dollars per pound for everyone — we do not offer a separate student discount because our pricing is already among the most affordable in NYC. However, the weekly subscription saves ten percent, which most students find is the best value. A weekly fifteen pound plan costs one hundred sixty-two dollars per month.' },
      { question: 'What about end-of-semester move-out?', answer: 'We offer end-of-semester packages where we wash everything — all clothing, bedding, towels, and linens — so you can pack clean items for the summer or transfer. Text us to schedule a large pickup during your move-out week. Standard three dollar per pound rate applies.' },
      { question: 'Which colleges do you serve?', answer: 'We serve student housing near every college and university in Manhattan, Brooklyn, and Queens — including NYU, Columbia, The New School, Parsons, FIT, Baruch, Hunter, Brooklyn College, Queens College, St. John, and more. If your dorm or student apartment is in our coverage area, we serve it.' },
      { question: 'Do I need to sign a contract?', answer: 'No. There are no contracts, no commitments, and no cancellation fees. You can use us once for a single bag or sign up for a weekly subscription. Subscriptions can be paused during breaks and cancelled anytime. You are never locked in.' },
    ],
  },
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = BUILDING_DATA[slug]
  if (!data) return {}
  return {
    title: `${data.name} — $3/lb, Free Lobby Pickup | The NYC Wash and Fold Service Company`,
    description: `${data.description} Serving Manhattan, Brooklyn & Queens. (917) 970-6002.`,
    alternates: { canonical: `https://www.washandfoldnyc.com/buildings/${slug}` },
  }
}

export default async function BuildingTypePage({ params }: Props) {
  const { slug } = await params
  const data = BUILDING_DATA[slug]
  if (!data) notFound()

  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">{data.name} — $3/lb With Free Pickup</h1>
          <p className="text-sky-200/70 text-lg max-w-3xl mb-6">{data.description} Available across <Link href="/locations" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">every neighborhood</Link> in Manhattan, Brooklyn, and Queens.</p>
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-white/10 border border-white/20 rounded-lg px-5 py-3">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white">$3<span className="text-lg text-sky-200/60">/lb</span></p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-lg px-5 py-3">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#7EC8E3]">FREE</p>
              <p className="text-sky-200/40 text-xs">Pickup & Delivery</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-lg px-5 py-3">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white">+$20</p>
              <p className="text-sky-200/40 text-xs">Same-Day Rush</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Text (917) 970-6002</a>
            <a href="tel:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Call (917) 970-6002</a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ name: 'Buildings', href: '/buildings' }, { name: data.name, href: `/buildings/${slug}` }]} />
      </div>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">How It Works</h2>
          <p className="text-gray-600 leading-relaxed">{data.longDescription}</p>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">What&apos;s Included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.features.map((f, i) => (
              <div key={f} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100">
                <span className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c]/20">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-gray-700 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide mb-2">Subscription Plans for Building Residents</h2>
          <p className="text-white/80 text-sm">Weekly 15 lb: $162/mo (10% off) &middot; Weekly 20 lb: $216/mo (10% off) &middot; Biweekly 15 lb: $85.50/mo (5% off)</p>
          <p className="text-white/60 text-xs mt-2">Same driver every week. Priority processing. Pause or cancel anytime.</p>
        </div>
      </section>

      <FAQSection faqs={data.faqs} title={`${data.name} — Frequently Asked Questions`} />
      <CTABlock title="Get Started" subtitle="Text (917) 970-6002 with your building address — we'll have you set up in minutes." />
    </>
  )
}
