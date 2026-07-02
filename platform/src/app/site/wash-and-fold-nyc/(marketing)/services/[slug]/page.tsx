// @ts-nocheck
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SERVICES, getServiceByUrlSlug } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import { AREAS } from '@/app/site/wash-and-fold-nyc/_lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'
import Breadcrumbs from '@/app/site/wash-and-fold-nyc/_components/marketing/Breadcrumbs'

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = getServiceByUrlSlug(slug)
  if (!service) return {}
  return {
    title: `NYC ${service.name} — ${service.priceRange}, Free Pickup & Delivery | The NYC Wash and Fold Service Company`,
    description: `Professional ${service.name.toLowerCase()} across Manhattan, Brooklyn & Queens. ${service.priceRange}, free pickup & delivery. ${service.features.slice(0, 3).join(', ')} & more. (917) 970-6002.`,
    alternates: { canonical: `https://www.washandfoldnyc.com/services/${slug}` },
  }
}

const serviceFAQs: Record<string, { question: string; answer: string }[]> = {
  'wash-and-fold': [
    { question: 'How much does wash and fold cost?', answer: '$3 per pound with a $39 minimum order. Free pickup and delivery. Same-day rush is +$20. Weekly subscribers save 10%, biweekly save 5%.' },
    { question: 'What is included in wash and fold?', answer: 'Sorting by color and fabric type, stain pre-treatment, washing with premium detergent, tumble drying on appropriate heat, hand-folding every item, organizing by garment type, and packaging in sealed clean bags.' },
    { question: 'How fast is turnaround?', answer: 'Standard turnaround is 24 to 48 hours. Same-day rush is available for +$20 on orders before 10am.' },
    { question: 'Is pickup really free?', answer: 'Yes. Free pickup and delivery on all orders over the $39 minimum. No delivery fee, no fuel surcharge, no tip required.' },
    { question: 'Do you separate colors?', answer: 'Yes. Every load is sorted into whites, darks, colors, and brights before washing. Delicates are washed separately in mesh bags on gentle cycles.' },
    { question: 'What detergent do you use?', answer: 'Premium commercial-grade detergent. Fragrance-free, eco-friendly, and hypoallergenic options available at no extra cost.' },
    { question: 'Do you fold everything?', answer: 'Yes. Every single item is hand-folded by a trained professional. Shirts flat, pants creased, towels stacked, socks paired.' },
    { question: 'Is my laundry mixed with others?', answer: 'Never. Every customer order is processed in its own separate batch from start to finish. Your laundry never touches another person clothes.' },
    { question: 'What if something is lost or damaged?', answer: 'We carry full liability insurance. We inventory at pickup and cross-check at delivery. Lost items are extremely rare. Contact us within 48 hours for any issues.' },
    { question: 'Can I get a subscription?', answer: 'Yes. Weekly 15 lb: $162/mo (10% off). Weekly 20 lb: $216/mo (10% off). Biweekly 15 lb: $85.50/mo (5% off). Same driver, consistent schedule, pause anytime.' },
    { question: 'What areas do you serve?', answer: 'All of Manhattan, Brooklyn, and Queens — nearly 200 neighborhoods. Same rate everywhere.' },
    { question: 'How do I get started?', answer: 'Text or call (917) 970-6002 with your address. We schedule a pickup, usually same-day or next-day. No app, no account, no contract.' },
  ],
  'default': [
    { question: 'How does this service work?', answer: 'Text or call (917) 970-6002 with your address and what you need. We schedule a pickup, process your order, and deliver it back to your door. Free pickup and delivery on all orders.' },
    { question: 'What areas do you serve?', answer: 'All of Manhattan, Brooklyn, and Queens — nearly 200 neighborhoods. Same rate everywhere, no distance surcharges.' },
    { question: 'Is there a minimum order?', answer: '$39 minimum for pickup and delivery. Most orders exceed this easily.' },
    { question: 'How fast is turnaround?', answer: 'Standard turnaround varies by service. Same-day rush is available on select services for +$20.' },
    { question: 'Is pickup and delivery free?', answer: 'Yes, free on all orders over the $39 minimum.' },
    { question: 'What payment methods do you accept?', answer: 'Credit card, Zelle, Venmo, Apple Pay, and cash. Pay after delivery.' },
    { question: 'Are you licensed and insured?', answer: 'Yes. Fully licensed, bonded, and insured with general liability coverage. All team members are background-checked.' },
    { question: 'Can I get recurring service?', answer: 'Yes. Weekly subscribers save 10%, biweekly save 5%. Same driver, consistent schedule, pause or cancel anytime.' },
  ],
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const service = getServiceByUrlSlug(slug)
  if (!service) notFound()

  const faqs = serviceFAQs[service.slug] || serviceFAQs['default']

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/services" className="text-xs font-semibold text-[#7EC8E3]/70 tracking-[0.15em] uppercase hover:text-[#7EC8E3] transition-colors">Services</Link>
            <span className="text-white/20">/</span>
            <span className="text-xs font-semibold text-white/40 tracking-[0.15em] uppercase">{service.shortName}</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">
            NYC {service.name} — {service.priceRange} With Free Pickup & Delivery
          </h1>
          <p className="text-sky-200/70 text-lg max-w-3xl mb-4">{service.description} Serving every neighborhood across <Link href="/boroughs/manhattan" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Brooklyn</Link>, and <Link href="/boroughs/queens" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Queens</Link>.</p>
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-white/10 border border-white/20 rounded-lg px-5 py-3">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white">{service.priceRange}</p>
              <p className="text-sky-200/40 text-xs">Price</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-lg px-5 py-3">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#7EC8E3]">{service.duration}</p>
              <p className="text-sky-200/40 text-xs">Turnaround</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-lg px-5 py-3">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white">FREE</p>
              <p className="text-sky-200/40 text-xs">Pickup & Delivery</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-lg px-5 py-3">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white">+$20</p>
              <p className="text-sky-200/40 text-xs">Same-Day Rush</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">
              Text (917) 970-6002
            </a>
            <a href="tel:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">
              Call (917) 970-6002
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ name: 'Services', href: '/services' }, { name: service.name, href: `/services/${service.urlSlug}` }]} />
      </div>

      {/* What's Included */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">What&apos;s Included in Every {service.name} Order</h2>
          <p className="text-gray-500 max-w-3xl mb-8">Every {service.name.toLowerCase()} order goes through our standardized process. Here is exactly what is included — no surprises, no add-on charges, no fine print.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {service.features.map((f, i) => (
              <div key={f} className="flex items-start gap-4 bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-4">
                <span className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c]/20 leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-gray-700 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide text-center mb-4">How {service.name} Works — 3 Steps</h2>
          <p className="text-sky-200/60 text-center max-w-2xl mx-auto mb-10">No app, no account, no contract. Text us your address and we handle everything.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text or Call', d: `Text (917) 970-6002 with your address. Tell us you need ${service.name.toLowerCase()}. We confirm pricing and schedule a pickup.` },
              { n: '02', t: 'We Pick Up — Free', d: `Leave your bag at your door, lobby, or with the doorman. Our driver picks it up. Free pickup on all orders over $39.` },
              { n: '03', t: 'Delivered Back Clean', d: `Your ${service.name.toLowerCase()} is completed and delivered back to your door within ${service.duration}. Pay after delivery.` },
            ].map(s => (
              <div key={s.n} className="bg-white/[0.06] border border-white/10 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">{s.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white mt-3 mb-2">{s.t}</p>
                <p className="text-sky-200/60 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Who Uses {service.name}?</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-8">{service.name} is designed for people who value their time and want consistent, professional results without the hassle of doing it themselves.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {service.idealFor.map(item => (
              <div key={item} className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5 text-center">
                <p className="text-sm font-medium text-[#1a3a5c]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Detail */}
      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">{service.name} Pricing — Transparent, No Surprises</h2>
          <p className="text-gray-600 leading-relaxed mb-6">{service.name} is {service.priceRange} with a $39 minimum order for pickup and delivery. Free pickup on all orders. Same-day rush is available for a flat $20 fee. Weekly subscribers save 10 percent and biweekly subscribers save 5 percent. The rate is the same across Manhattan, Brooklyn, and Queens — no neighborhood premiums, no zone fees, no surge pricing. Visit our <Link href="/pricing" className="text-[#4BA3D4] underline underline-offset-2">full pricing page</Link> for the complete breakdown of all services.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c]">{service.priceRange}</p>
              <p className="text-gray-400 text-xs mt-1">Per order</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4]">FREE</p>
              <p className="text-gray-400 text-xs mt-1">Pickup & Delivery</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c]">+$20</p>
              <p className="text-gray-400 text-xs mt-1">Same-Day Rush</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="py-12 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">Save 10% With a Weekly Subscription</h2>
          <p className="text-white/80 text-sm mb-1">Weekly 15 lb: $162/mo &middot; Weekly 20 lb: $216/mo &middot; Biweekly 15 lb: $85.50/mo</p>
          <p className="text-white/60 text-xs">Same driver, consistent schedule, priority processing. Pause or cancel anytime.</p>
        </div>
      </section>

      {/* Coverage */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">{service.name} Across NYC</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-8">We offer {service.name.toLowerCase()} in nearly 200 neighborhoods across three boroughs. Same rate, same quality, same free pickup and delivery everywhere.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {AREAS.map(area => {
              const neighborhoods = getNeighborhoodsByArea(area.slug)
              return (
                <div key={area.slug}>
                  <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-3">{area.name} — {neighborhoods.length} neighborhoods</h3>
                  <div className="flex flex-wrap gap-1">
                    {neighborhoods.slice(0, 10).map(n => (
                      <Link key={n.slug} href={`/${n.urlSlug}/${service.slug}`} className="text-xs text-gray-500 hover:text-[#4BA3D4] transition-colors bg-[#F0F8FF] px-2 py-1 rounded">
                        {n.name}
                      </Link>
                    ))}
                    {neighborhoods.length > 10 && (
                      <Link href={`/boroughs/${area.slug}`} className="text-xs text-[#4BA3D4] font-medium px-2 py-1">+{neighborhoods.length - 10} more</Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Other Services */}
      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Other Services</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-8">All services include free pickup and delivery across Manhattan, Brooklyn, and Queens.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.filter(s => s.slug !== service.slug).map(s => (
              <Link key={s.slug} href={`/services/${s.urlSlug}`} className="group border border-gray-200 bg-white rounded-2xl p-6 hover:border-[#4BA3D4] hover:shadow-lg transition-all">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide group-hover:text-[#4BA3D4] transition-colors">{s.name}</h3>
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">{s.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-bold text-[#1a3a5c]">{s.priceRange}</span>
                  <span className="text-sm text-[#4BA3D4]">Learn More &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={faqs} title={`${service.name} — Frequently Asked Questions`} />

      <CTABlock title={`Book ${service.name} Today`} subtitle={`${service.priceRange}, free pickup & delivery. Text or call (917) 970-6002.`} />
    </>
  )
}
