// @ts-nocheck
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AREAS } from '@/app/site/wash-and-fold-nyc/_lib/seo/data/areas'
import { getArea, getNeighborhoodsByArea } from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'
import { SERVICES } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'
import Breadcrumbs from '@/app/site/wash-and-fold-nyc/_components/marketing/Breadcrumbs'

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return AREAS.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const area = getArea(slug)
  if (!area) return {}
  const neighborhoods = getNeighborhoodsByArea(slug)
  return {
    title: `${area.name} Wash & Fold — $3/lb Laundry, Free Pickup | ${neighborhoods.length} Neighborhoods`,
    description: `${area.description} $3/lb, $39 minimum, free pickup & delivery to every ${area.name} neighborhood. (917) 970-6002.`,
    alternates: { canonical: `https://www.washandfoldnyc.com/boroughs/${slug}` },
  }
}

export default async function BoroughPage({ params }: Props) {
  const { slug } = await params
  const area = getArea(slug)
  if (!area) notFound()
  const neighborhoods = getNeighborhoodsByArea(area.slug)

  const boroughFAQs = [
    { question: `How much does wash and fold cost in ${area.name}?`, answer: `Wash and fold in ${area.name} is three dollars per pound with a thirty-nine dollar minimum order. Free pickup and delivery to every ${area.name} neighborhood. Same-day rush is plus twenty dollars. Weekly subscribers save ten percent, biweekly save five percent. The rate is identical across all ${neighborhoods.length} ${area.name} neighborhoods we serve — no zone fees or surcharges.` },
    { question: `How many neighborhoods do you serve in ${area.name}?`, answer: `We serve ${neighborhoods.length} neighborhoods across ${area.name}. This includes ${neighborhoods.slice(0, 5).map(n => n.name).join(', ')}, and ${neighborhoods.length - 5} more. Every neighborhood gets the same three dollar per pound rate with free pickup and delivery.` },
    { question: `Do you pick up from any building in ${area.name}?`, answer: `Yes. We pick up from doorman buildings, walkups, co-ops, condos, houses, townhouses, and student housing across all of ${area.name}. We coordinate with doormen, concierges, and building managers. Text us your address to confirm your specific building.` },
    { question: `How fast is turnaround in ${area.name}?`, answer: `Standard turnaround is twenty-four to forty-eight hours regardless of which ${area.name} neighborhood you are in. Same-day rush is available for plus twenty dollars on orders received before ten in the morning.` },
    { question: `Do you offer dry cleaning in ${area.name}?`, answer: `Yes. Dry cleaning with free pickup and delivery is available across all of ${area.name}. Dress shirts ten dollars, suits thirty-four dollars, dresses twenty-eight dollars, winter coats forty-five dollars. Full dry cleaning pricing on our pricing page.` },
    { question: `Can I get a subscription in ${area.name}?`, answer: `Yes. Subscriptions are available in every ${area.name} neighborhood. Weekly fifteen pound plan is one hundred sixty-two dollars per month with ten percent off. Weekly twenty pound is two hundred sixteen dollars per month. Biweekly fifteen pound is eighty-five fifty per month with five percent off. Same driver every week, pause or cancel anytime.` },
    { question: `Do you serve businesses in ${area.name}?`, answer: `Yes. Our commercial laundry service is available to restaurants, salons, gyms, Airbnb hosts, and offices throughout ${area.name}. Commercial pricing ranges from one to two dollars per pound with daily or weekly pickup schedules.` },
    { question: `Is ${area.name} pickup and delivery really free?`, answer: `Yes. Free pickup and free delivery on all orders over the thirty-nine dollar minimum. No delivery fee, no fuel surcharge, no tip required. We cover all of ${area.name} at the same rate with the same free pickup service.` },
  ]

  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">
            {area.name} Wash & Fold — $3/lb With Free Pickup & Delivery
          </h1>
          <p className="text-sky-200/70 text-lg max-w-2xl mx-auto mb-4">{area.description} Serving {neighborhoods.length} neighborhoods with the same rate, same quality, and same free pickup on every order. <Link href="/locations" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">View all locations</Link>.</p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4"><p className="font-[family-name:var(--font-bebas)] text-3xl text-white">{neighborhoods.length}</p><p className="text-sky-200/40 text-xs">Neighborhoods</p></div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4"><p className="font-[family-name:var(--font-bebas)] text-3xl text-[#7EC8E3]">$3/lb</p><p className="text-sky-200/40 text-xs">Every Neighborhood</p></div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4"><p className="font-[family-name:var(--font-bebas)] text-3xl text-white">FREE</p><p className="text-sky-200/40 text-xs">Pickup & Delivery</p></div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Text (917) 970-6002</a>
            <a href="tel:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Call (917) 970-6002</a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ name: 'Locations', href: '/locations' }, { name: area.name, href: `/boroughs/${area.slug}` }]} />
      </div>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">{area.name} Neighborhoods We Serve</h2>
          <p className="text-gray-500 max-w-3xl mb-8">Click any neighborhood to see available services, local pricing details, and how pickup works in your specific area. Every neighborhood below offers all seven <Link href="/services" className="text-[#4BA3D4] underline underline-offset-2">laundry services</Link> at the same three dollar per pound rate.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {neighborhoods.map(n => (
              <Link key={n.slug} href={`/${n.urlSlug}`} className="border border-gray-200 rounded-xl p-4 text-center hover:border-[#4BA3D4] hover:shadow-md transition-all">
                <p className="text-sm font-medium text-[#1a3a5c]">{n.name}</p>
                <p className="text-xs text-gray-400 mt-1">{n.zip_codes[0]}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">Services in {area.name}</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">Every {area.name} neighborhood has access to all seven services. Same rate, same quality, same free pickup.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s => (
              <div key={s.slug} className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide">{s.name}</h3>
                <p className="text-sm font-bold text-[#4BA3D4] mt-1">{s.priceRange}</p>
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">{s.description}</p>
                <p className="text-xs text-gray-400 mt-2">{s.duration} turnaround</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">{area.name} Subscription Plans — Save 10%</h2>
          <p className="text-white/80 text-sm">Weekly 15 lb: $162/mo &middot; Weekly 20 lb: $216/mo &middot; Biweekly 15 lb: $85.50/mo</p>
        </div>
      </section>

      <FAQSection faqs={boroughFAQs} title={`${area.name} Laundry Service — Frequently Asked Questions`} />
      <CTABlock title={`Schedule a Pickup in ${area.name}`} subtitle={`$3/lb, free pickup & delivery across all ${neighborhoods.length} ${area.name} neighborhoods.`} />
    </>
  )
}
