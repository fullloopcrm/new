import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/app/site/wash-and-fold-nyc/_lib/seo/data/areas'
import { getNeighborhoodsByArea, ALL_NEIGHBORHOODS } from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'
import { SERVICES } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'

export const metadata: Metadata = {
  title: 'NYC Laundry Service Locations — Manhattan, Brooklyn & Queens | The NYC Wash and Fold Service Company',
  description: 'The NYC Wash and Fold Service Company serves nearly 200 neighborhoods across Manhattan, Brooklyn & Queens. $3/lb, free pickup & delivery, same rate everywhere. Find your neighborhood. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/locations' },
}

const locationFAQs = [
  { question: 'What areas does The NYC Wash and Fold Service Company serve?', answer: 'We serve all of Manhattan, Brooklyn, and Queens — nearly two hundred neighborhoods in total. Every neighborhood gets the same three dollar per pound rate with free pickup and delivery. There are no distance surcharges, no zone fees, and no different pricing based on where you live. We cover the Upper East Side to Washington Heights, Williamsburg to Bay Ridge, and Astoria to Far Rockaway.' },
  { question: 'Is the price the same in every neighborhood?', answer: 'Yes. Three dollars per pound, thirty-nine dollar minimum, free pickup and delivery — the same in every neighborhood we serve. Whether you live in a luxury doorman building on Park Avenue or a walkup in Bushwick, the rate is identical. We do not charge more for farther locations or busier neighborhoods.' },
  { question: 'How do I know if you serve my building?', answer: 'If your building is in Manhattan, Brooklyn, or Queens, we almost certainly serve it. We pick up from doorman buildings, walkups, co-ops, condos, public housing, student dorms, and single-family homes. Text us your address and we will confirm immediately.' },
  { question: 'Do you serve the outer parts of Queens?', answer: 'Yes. We serve all of Queens including Flushing, Bayside, Jamaica, Richmond Hill, Ozone Park, Howard Beach, Far Rockaway, and every neighborhood in between. Same three dollar per pound rate with free pickup.' },
  { question: 'Are you expanding to the Bronx or Staten Island?', answer: 'Not currently, but we are evaluating expansion. If you are in the Bronx or Staten Island and want to be notified when we launch, text nine-one-seven, nine-seven-zero, six-zero-zero-two and we will add you to our waitlist.' },
  { question: 'How does pickup work in a walkup?', answer: 'We come directly to your apartment door on any floor. Leave your bag outside your door before your pickup window. Our driver walks up, grabs the bag, and texts you confirmation. On delivery, we bring it back to the same spot. No need to carry anything downstairs.' },
  { question: 'How does pickup work with a doorman?', answer: 'Leave your bag with the front desk. Our driver picks it up during your window and drops clean laundry back at the desk on delivery day. You get a text at both pickup and delivery. Zero coordination needed on your part.' },
  { question: 'Can I use different addresses for pickup and delivery?', answer: 'Yes. Some customers have us pick up from their office and deliver to their apartment, or vice versa. Just let us know both addresses when scheduling. Both must be in our Manhattan, Brooklyn, or Queens service area.' },
  { question: 'Do you serve commercial addresses?', answer: 'Yes. Our commercial laundry service is available at any business address in our coverage area. Restaurants, salons, gyms, offices, and Airbnb units all qualify. Commercial pricing ranges from one to two dollars per pound.' },
  { question: 'What if I move to a different neighborhood?', answer: 'Your service comes with you. Since we serve all three boroughs at the same rate, moving neighborhoods changes nothing about your pricing. Text us your new address and we update your pickup and delivery location. Your subscription and preferences transfer seamlessly.' },
]

export default function LocationsPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">
            NYC Wash & Fold — {ALL_NEIGHBORHOODS.length}+ Neighborhoods, One Rate: $3/lb
          </h1>
          <p className="text-sky-200/70 text-lg max-w-3xl mx-auto mb-4">
            Free pickup and delivery across every neighborhood in <Link href="/boroughs/manhattan" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Brooklyn</Link>, and <Link href="/boroughs/queens" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Queens</Link>. Same rate everywhere — no zone fees, no distance surcharges. Whether you live in a luxury high-rise, a brownstone, or a walkup, you pay three dollars per pound with free pickup and delivery on every order over thirty-nine dollars.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">{ALL_NEIGHBORHOODS.length}+</p>
              <p className="text-sky-200/40 text-xs">Neighborhoods</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#7EC8E3]">$3/lb</p>
              <p className="text-sky-200/40 text-xs">Same Rate Everywhere</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">FREE</p>
              <p className="text-sky-200/40 text-xs">Pickup & Delivery</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Text (917) 970-6002</a>
            <a href="tel:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Call (917) 970-6002</a>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Browse by Borough</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Click a borough to see every neighborhood we serve, or scroll down for the complete directory.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {AREAS.map(area => {
              const neighborhoods = getNeighborhoodsByArea(area.slug)
              return (
                <Link key={area.slug} href={`/boroughs/${area.slug}`} className="group border border-gray-200 rounded-2xl p-8 hover:border-[#4BA3D4] hover:shadow-lg transition-all text-center">
                  <h3 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide group-hover:text-[#4BA3D4] transition-colors">{area.name}</h3>
                  <p className="text-[#4BA3D4] font-bold text-lg mt-2">{neighborhoods.length} neighborhoods</p>
                  <p className="text-gray-500 text-sm mt-3">{area.description}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Complete Neighborhood Directory</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Every neighborhood below has full <Link href="/services" className="text-[#4BA3D4] underline underline-offset-2">laundry service</Link> — wash and fold, <Link href="/services/nyc-pickup-and-delivery" className="text-[#4BA3D4] underline underline-offset-2">pickup and delivery</Link>, <Link href="/services/nyc-dry-cleaning" className="text-[#4BA3D4] underline underline-offset-2">dry cleaning</Link>, <Link href="/services/nyc-comforter-cleaning" className="text-[#4BA3D4] underline underline-offset-2">comforter cleaning</Link>, and <Link href="/services/nyc-commercial-laundry" className="text-[#4BA3D4] underline underline-offset-2">commercial laundry</Link>.</p>
          {AREAS.map(area => {
            const neighborhoods = getNeighborhoodsByArea(area.slug)
            return (
              <div key={area.slug} className="mb-12">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-4">{area.name} — {neighborhoods.length} Neighborhoods</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {neighborhoods.map(n => (
                    <Link key={n.slug} href={`/${n.urlSlug}`} className="text-sm text-gray-600 hover:text-[#4BA3D4] transition-colors py-2 px-3 bg-white rounded-lg border border-gray-100 hover:border-[#4BA3D4]/30">
                      {n.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Services Available in Every Neighborhood</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">No matter which neighborhood you are in, you have access to all seven laundry services at the same rate.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s => (
              <Link key={s.slug} href={`/services/${s.urlSlug}`} className="group border border-gray-200 rounded-xl p-6 hover:border-[#4BA3D4] hover:shadow-md transition-all">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide group-hover:text-[#4BA3D4]">{s.name}</h3>
                <p className="text-sm font-bold text-[#4BA3D4] mt-1">{s.priceRange}</p>
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide text-center mb-4">How Pickup Works in Your Building</h2>
          <p className="text-sky-200/60 text-center max-w-2xl mx-auto mb-12">We pick up from every building type across all three boroughs. Here is how it works for each.</p>
          <div className="space-y-6">
            {[
              { t: 'Doorman & Concierge Buildings', d: 'Leave your bag with the front desk. Our driver picks up during your window and drops clean laundry back at the desk on delivery day. You get a text at both pickup and delivery. Common in Manhattan, Downtown Brooklyn, and Long Island City.' },
              { t: 'Walkup Apartments', d: 'We come to your apartment door on any floor. Leave your bag outside or on the handle. Our driver walks up, grabs it, and texts confirmation. Common in the East Village, Bushwick, Astoria, and across older housing stock.' },
              { t: 'Lobby Buildings Without Doorman', d: 'Leave your bag in the vestibule, lobby, or a spot you designate. We coordinate buzzer access or building entry with you on first pickup. Works well for mid-rise buildings across all three boroughs.' },
              { t: 'Houses & Townhouses', d: 'Leave your bag on the porch, stoop, or at the front door. Typical for Park Slope, Bay Ridge, Forest Hills, and other neighborhoods with single-family homes.' },
            ].map(item => (
              <div key={item.t} className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
                <h3 className="font-semibold text-white text-base mb-2">{item.t}</h3>
                <p className="text-sky-200/60 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">Save 10% With a Weekly Subscription — Every Neighborhood</h2>
          <p className="text-white/80 text-sm">Weekly 15 lb: $162/mo &middot; Weekly 20 lb: $216/mo &middot; Biweekly 15 lb: $85.50/mo</p>
        </div>
      </section>

      <FAQSection faqs={locationFAQs} title="Locations — Frequently Asked Questions" />
      <CTABlock title="Find Your Neighborhood" subtitle="Text your address to (917) 970-6002 — we'll confirm coverage and schedule a free pickup." />
    </>
  )
}
