import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SERVICES, getServiceByUrlSlug } from '@/lib/seo/services'
import { AREAS } from '@/lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/lib/seo/locations'
import { serviceContent, serviceFAQs, getServiceRichContent, commonServiceFAQs } from '@/lib/seo/content'
import { servicePageSchemas, faqSchema } from '@/lib/seo/schema'
import { pickPhotoByCategory, type PhotoCategory } from '@/lib/seo/photos'
import Image from 'next/image'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import FAQSection from '@/components/marketing/FAQSection'
import CTABlock from '@/components/marketing/CTABlock'

const SERVICE_PHOTO_CATEGORY: Record<string, PhotoCategory> = {
  'deep-cleaning': 'kitchen',
  'regular-cleaning': 'mop',
  'weekly-cleaning': 'mop',
  'bi-weekly-cleaning': 'dust',
  'monthly-cleaning': 'mop',
  'move-in-move-out-cleaning': 'team',
  'post-renovation-cleaning': 'team',
  'same-day-cleaning': 'vacuum',
  'airbnb-cleaning': 'bed',
  'office-cleaning': 'team',
}

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export async function generateStaticParams() {
  return SERVICES.map(s => ({ slug: s.urlSlug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = getServiceByUrlSlug(slug)
  if (!service) return {}

  const url = `https://www.thenycmaid.com/services/${slug}`
  const title = `${service.name} in NYC From ${service.priceRange.split('–')[0]} | 5-Star Rated | The NYC Maid`
  const description = `Professional ${service.name.toLowerCase()} across Manhattan, Brooklyn, Queens, Long Island & NJ. ${service.features.slice(0, 2).join(', ')} & more. From ${service.priceRange.split('–')[0]}. 5.0★ Rated. (212) 202-9030`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'The NYC Maid',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      'geo.region': 'US-NY',
      'geo.placename': 'New York City',
      'geo.position': '40.7589;-73.9851',
      'ICBM': '40.7589, -73.9851',
    },
  }
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const service = getServiceByUrlSlug(slug)
  if (!service) notFound()

  const content = serviceContent(service)
  const baseFaqs = serviceFAQs(service)
  const rich = getServiceRichContent(service.slug)
  const common = commonServiceFAQs(service)
  // Combine rich FAQs + common FAQs to hit 25, deduplicating by question
  const richFaqs = rich?.faqs.length ? rich.faqs : baseFaqs
  const seen = new Set(richFaqs.map(f => f.question))
  const combined = [...richFaqs, ...common.filter(f => !seen.has(f.question))]
  const faqs = combined.slice(0, 25)
  const otherServices = SERVICES.filter(s => s.slug !== service.slug)
  const servicePhoto = pickPhotoByCategory(SERVICE_PHOTO_CATEGORY[service.slug] || 'mop', service.slug)

  return (
    <>
      <JsonLd data={[...servicePageSchemas(service), faqSchema(faqs)]} />

      {/* Hero — split layout: left text, right pricing card */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-3">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <span className="text-blue-200/60 text-sm">5.0 Rating &middot; 50+ verified reviews</span>
              </div>
              <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-6xl text-white tracking-wide leading-[0.95] mb-5">
                {rich?.heroH1 || `${service.name} in NYC — Professional & Affordable`}
              </h1>
              <p className="text-blue-200/60 text-lg leading-relaxed mb-6">
                {rich?.heroSubtitle || content.intro}
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <a href="sms:2122029030" className="bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Text (212) 202-9030
                </a>
                <a href="tel:2122029030" className="text-blue-200/60 font-medium py-3.5 hover:text-white transition-colors underline underline-offset-4">
                  or Call (212) 202-9030
                </a>
              </div>
            </div>
            {/* Floating pricing card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-7 shadow-xl">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-5">Flat Hourly Rate — No Hidden Fees</p>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 bg-gray-100 rounded-xl py-5 px-4 text-center">
                    <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#1E2A4A] tracking-wide leading-none">$59<span className="text-xl text-gray-400">/hr</span></p>
                    <p className="text-gray-500 text-xs mt-2">Your supplies</p>
                  </div>
                  <div className="flex-1 bg-[#1E2A4A] rounded-xl py-5 px-4 text-center">
                    <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide leading-none">$75<span className="text-xl text-blue-200/40">/hr</span></p>
                    <p className="text-[#A8F0DC]/70 text-xs mt-2">We bring everything</p>
                  </div>
                </div>
                {service.slug === 'same-day-cleaning' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-center">
                    <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide">$100<span className="text-sm text-gray-400">/hr</span></p>
                    <p className="text-amber-700 text-xs">Same-day dispatch</p>
                  </div>
                )}
                <div className="border border-[#A8F0DC]/40 bg-[#E8F8F1] rounded-xl p-4 mb-5 text-center">
                  <p className="text-gray-500 text-xs mb-1">Average {service.shortName}</p>
                  <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide">{service.duration}</p>
                  <p className="text-[#1E2A4A]/60 text-xs mt-1">Pay only for time worked &middot; No upfront cost</p>
                </div>
                <a href="sms:2122029030" className="block text-center bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Text (212) 202-9030
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real cleaning photo — service-relevant category */}
      <section className="bg-white">
        <figure className="relative aspect-[21/9] w-full overflow-hidden max-h-[520px]">
          <Image
            src={servicePhoto.src}
            alt={`${servicePhoto.alt} — ${service.name} in NYC`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <figcaption className="sr-only">{servicePhoto.caption} — {service.name} by The NYC Maid</figcaption>
        </figure>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: 'Services', href: '/nyc-maid-service-services-offered-by-the-nyc-maid' },
          { name: service.name, href: `/services/${service.urlSlug}` },
        ]} />
      </div>

      {/* What Is Section — split heading + numbered insight cards */}
      {rich?.whatIs.heading && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              {/* Left — heading */}
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[#A8F0DC] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide leading-tight mb-4">{rich.whatIs.heading}</h2>
                {rich.whatIs.subheading && (
                  <p className="text-gray-500 leading-relaxed mb-6">{rich.whatIs.subheading}</p>
                )}
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <a href="sms:2122029030" className="bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                    Text (212) 202-9030
                  </a>
                  <a href="tel:2122029030" className="text-[#1E2A4A]/60 font-medium py-3 hover:text-[#1E2A4A] transition-colors underline underline-offset-4">
                    or Call (212) 202-9030
                  </a>
                </div>
              </div>
              {/* Right — insight cards */}
              <div className="lg:col-span-3 space-y-5">
                {rich.whatIs.body.map((p, i) => (
                  <div key={i} className="flex items-start gap-5 bg-gray-50 border border-gray-100 rounded-2xl p-6">
                    <span className="font-[family-name:var(--font-bebas)] text-4xl text-[#A8F0DC]/40 leading-none flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-gray-600 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Room-by-room checklist — horizontal cards */}
      {rich?.rooms && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Room-by-Room Checklist</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-12">{rich?.roomsTitle || `What Gets Cleaned During a ${service.name}`}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rich.rooms.map(room => (
                <div key={room.room} className="bg-white border border-gray-200 rounded-2xl p-7">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">{room.room}</h3>
                  <ul className="space-y-2.5">
                    {room.tasks.map(task => (
                      <li key={task} className="flex items-start gap-2.5">
                        <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                        <span className="text-gray-600 text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Comparison table — two column */}
      {rich?.comparison && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              {/* Left — heading + context */}
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[#A8F0DC] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide leading-tight mb-4">{rich.comparison.title}</h2>
                <p className="text-gray-500 leading-relaxed mb-6">A regular clean maintains your home. A deep clean resets it. See exactly what&apos;s covered in each service so you know which one you need.</p>
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <a href="sms:2122029030" className="bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                    Text (212) 202-9030
                  </a>
                  <a href="tel:2122029030" className="text-[#1E2A4A]/60 font-medium py-3 hover:text-[#1E2A4A] transition-colors underline underline-offset-4">
                    or Call (212) 202-9030
                  </a>
                </div>
              </div>
              {/* Right — table */}
              <div className="lg:col-span-3">
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_110px_110px] bg-[#1E2A4A] text-white text-xs font-semibold tracking-[0.15em] uppercase">
                    <div className="px-5 py-3.5">Task</div>
                    <div className="px-3 py-3.5 text-center">Regular</div>
                    <div className="px-3 py-3.5 text-center bg-[#A8F0DC]/20">Deep</div>
                  </div>
                  {rich.comparison.rows.map((row, i) => (
                    <div key={row.task} className={`grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_110px_110px] ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-100`}>
                      <div className="px-5 py-3.5 text-sm text-gray-700">{row.task}</div>
                      <div className="px-3 py-3.5 text-center text-lg">{row.regular ? <span className="text-[#A8F0DC]">&#10003;</span> : <span className="text-gray-300">&mdash;</span>}</div>
                      <div className="px-3 py-3.5 text-center text-lg bg-[#A8F0DC]/5">{row.deep ? <span className="text-[#A8F0DC]">&#10003;</span> : <span className="text-gray-300">&mdash;</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* When to book — two column split */}
      {rich && rich.whenToBook.items.length > 0 && (
        <section className="py-20 bg-[#F5FBF8]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="w-10 h-[3px] bg-[#A8F0DC] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide leading-tight mb-4">{rich.whenToBook.title}</h2>
                <p className="text-gray-500 leading-relaxed mb-6">If any of these apply to you, a professional {service.name.toLowerCase()} is the move. Text us and we&apos;ll get you on the schedule.</p>
                <a href="sms:2122029030" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Text (212) 202-9030
                </a>
              </div>
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rich.whenToBook.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-5">
                    <span className="font-[family-name:var(--font-bebas)] text-3xl text-[#A8F0DC]/40 leading-none flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* NYC Tips — large numbered cards */}
      {rich && rich.nycTips.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-[#1E2A4A] to-[#243352]">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-[#A8F0DC]/60 tracking-[0.25em] uppercase mb-3 text-center">Pro Tips</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">{rich?.tipsTitle || `NYC ${service.name} Tips From Local Pros`}</p>
            <div className="space-y-5">
              {rich.nycTips.map((tip, i) => (
                <div key={tip.title} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl p-6 flex items-start gap-5">
                  <span className="font-[family-name:var(--font-bebas)] text-4xl text-[#A8F0DC]/30 leading-none flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-white font-semibold mb-1">{tip.title}</p>
                    <p className="text-blue-200/50 text-sm leading-relaxed">{tip.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Education sections — two column split, alternating bg */}
      {rich && rich.educationSections.length > 0 && rich.educationSections.map((section, i) => (
        <section key={section.heading} className={`py-20 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className={`grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start ${i % 2 === 1 ? 'lg:direction-rtl' : ''}`}>
              <div className={`lg:col-span-2 lg:sticky lg:top-28 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="w-10 h-[3px] bg-[#A8F0DC] mb-5" />
                <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide leading-tight">{section.heading}</h2>
              </div>
              <div className={`lg:col-span-3 space-y-4 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                {section.body.map((p, j) => (
                  <div key={j} className={`${i % 2 === 0 ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'} border rounded-xl p-5`}>
                    <p className="text-gray-600 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Pricing note callout */}
      {rich?.pricingNote && (
        <section className="py-12 bg-[#A8F0DC]">
          <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-[#1E2A4A] rounded-full flex items-center justify-center">
                <span className="text-white text-xl">$</span>
              </div>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-2">{service.name} Cost Summary</h3>
              <p className="text-[#1E2A4A]/80 leading-relaxed">{rich.pricingNote}</p>
              <Link href="/updated-nyc-maid-service-industry-pricing" className="inline-block mt-3 text-[#1E2A4A] font-semibold text-sm underline underline-offset-4">Full pricing details &rarr;</Link>
            </div>
          </div>
        </section>
      )}

      {/* Features + Ideal For — only show if no rich content "What Is" section */}
      {!rich?.whatIs.heading && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">What&apos;s Included</h2>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">{service.name} Checklist</p>
              <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
              <p className="text-gray-600 leading-relaxed mb-6">{service.description}</p>
              <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-6">
                <ul className="space-y-3">
                  {service.features.map(f => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-gray-700 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-xl p-6">
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">Ideal Clients</h2>
                <ul className="space-y-3">
                  {service.idealFor.map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-[#A8F0DC] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-1">{service.priceRange}</p>
                <p className="text-gray-500 text-sm mb-4">{service.duration}</p>
                <a href="sms:2122029030" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Text (212) 202-9030
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How it works — bold step cards */}
      <section className="py-20 bg-[#1E2A4A]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[#A8F0DC]/60 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Book in 3 Simple Steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Text Us', d: 'Reach us at (212) 202-9030 with your address, preferred date, and any special requests.' },
              { n: '02', t: 'We Confirm', d: 'We match you with a background-checked, insured cleaner and lock in your appointment — usually within the hour.' },
              { n: '03', t: 'Pay After', d: 'Your cleaner arrives on time, does the work, and you pay only after the cleaning is complete. No deposits ever.' },
            ].map(s => (
              <div key={s.n} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-center">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC]/30 leading-none">{s.n}</span>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide mt-3 mb-2">{s.t}</p>
                <p className="text-blue-200/50 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <a href="sms:2122029030" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Text (212) 202-9030
            </a>
          </div>
        </div>
      </section>

      {/* Neighborhoods — structured grid with area cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">{service.name} Near You</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">{service.name} Across Manhattan, Brooklyn, Queens & Beyond</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Same rates, same quality — no matter which neighborhood you call home. Click any location to book {service.name.toLowerCase()} in your area.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AREAS.map(area => {
              const neighborhoods = getNeighborhoodsByArea(area.slug).slice(0, 8)
              return (
                <div key={area.slug} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                  <Link href={`/${area.urlSlug}`} className="flex items-center justify-between mb-4 group">
                    <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">{area.name}</h3>
                    <span className="text-[#A8F0DC] text-sm font-medium group-hover:underline underline-offset-4">{neighborhoods.length}+ areas &rarr;</span>
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    {neighborhoods.map(n => (
                      <Link key={n.slug} href={`/${n.urlSlug}/${service.slug}`} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 hover:border-[#A8F0DC] hover:bg-[#F5FBF8] hover:text-[#1E2A4A] transition-all">
                        {n.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/service-areas-served-by-the-nyc-maid" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
              Browse All 225+ Neighborhoods &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Other services — full showcase */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">More NYC Cleaning Services</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">Not What You Need? We Do That Too.</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            Same background-checked cleaners, same flat hourly rate, same quality — regardless of service type. Explore what else we can do for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {otherServices.map(s => (
              <Link
                key={s.slug}
                href={`/services/${s.urlSlug}`}
                className="group border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] hover:shadow-lg transition-all bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">{s.name}</h3>
                  <span className="text-[#1E2A4A] font-bold text-sm whitespace-nowrap ml-3">From {s.priceRange.split('–')[0]}</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {s.features.slice(0, 3).map(f => (
                    <span key={f} className="bg-gray-50 text-gray-400 text-xs px-2.5 py-1 rounded-full">{f}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{s.duration}</span>
                  <span className="text-[#1E2A4A] text-sm font-medium group-hover:underline underline-offset-4">View Details &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/nyc-maid-service-services-offered-by-the-nyc-maid" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              View All Services &amp; Pricing
            </Link>
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} title={`${service.name} — Frequently Asked Questions`} columns={2} />
      <CTABlock title={`Book ${service.name} Today`} subtitle="Text us — trusted by thousands of New Yorkers." />
    </>
  )
}
