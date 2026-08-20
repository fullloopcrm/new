import type { Metadata } from 'next'
import Link from 'next/link'
import { homepageContent } from '@/app/site/pennsylvania-maid/_lib/seo/content'
import { homepageSchemas, faqSchema, videoReviewsSchemas } from '@/app/site/pennsylvania-maid/_lib/seo/schema'
import { pickLifestylePhoto } from '@/app/site/pennsylvania-maid/_lib/seo/photos'
import JsonLd from '@/app/site/pennsylvania-maid/_components/JsonLd'
import ServiceGrid from '@/app/site/pennsylvania-maid/_components/ServiceGrid'
import TrustBadges from '@/app/site/pennsylvania-maid/_components/TrustBadges'
import CTABlock from '@/app/site/pennsylvania-maid/_components/CTABlock'
import FAQSection from '@/app/site/pennsylvania-maid/_components/FAQSection'
import Image from 'next/image'


const content = homepageContent()

export const metadata: Metadata = {
  title: { absolute: content.title },
  description: content.metaDescription,
  alternates: { canonical: 'https://www.thepennsylvaniamaid.com' },
  openGraph: {
    title: content.title,
    description: content.metaDescription,
    url: 'https://www.thepennsylvaniamaid.com',
    siteName: 'The Pennsylvania Maid',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: content.title,
    description: content.metaDescription,
  },
  other: {
    'format-detection': 'telephone=yes',
    'geo.region': 'US-PA',
    'geo.placename': 'Pennsylvania',
    'geo.position': '39.9526;-75.1652',
    'ICBM': '39.9526, -75.1652',
  },
}

const homepageFAQs = [
  // Pricing & Booking
  { question: 'How much does house cleaning cost in Pennsylvania?', answer: `Our house cleaning services start at $59/hour when you provide supplies (recurring: 10% off weekly, 5% off biweekly/monthly), or $69/hour when we bring everything (recurring: 20% off weekly, 10% off biweekly/monthly). Same-day and emergency service is $89/hour. Final cost depends on home size and service type.` },
  { question: 'Do you charge by the hour or a flat rate?', answer: 'We charge by the hour. This keeps pricing fair — you only pay for the time your space actually needs. No inflated flat-rate quotes.' },
  { question: 'Is there a minimum number of hours?', answer: `Yes — a 2-hour minimum on all bookings, first-time cleanings included. Bookings with 2 or more cleaners carry a 4-hour minimum and receive no discounts.` },
  { question: 'How do I book a cleaning?', answer: 'Text (215) 398-4500. We typically schedule within 24-48 hours, with same-day availability for urgent requests.' },
  { question: 'Do you offer same-day cleaning?', answer: `Yes. Same-day and emergency cleaning is available at $89/hour. We dispatch a professional cleaner to your door within hours.` },
  { question: 'What payment methods do you accept?', answer: 'We accept credit cards, debit cards, Apple Pay, and Cash App through our secure online payment link, plus cash. You can also pay securely online through our payment portal.' },
  { question: 'Do I need to tip my cleaner?', answer: 'Tipping is never required but always appreciated. If you feel your cleaner did a great job, a tip is a wonderful way to show it.' },

  // Services
  { question: 'What types of cleaning do you offer?', answer: 'We offer regular apartment cleaning, deep cleaning, move-in/move-out cleaning, post-construction cleanup, weekly/bi-weekly/monthly service, Airbnb turnover cleaning, same-day cleaning, and office cleaning.' },
  { question: 'What is included in a regular cleaning?', answer: 'A regular cleaning covers dusting, vacuuming, mopping, kitchen cleaning (counters, sink, appliances), bathroom cleaning (toilet, tub, sink, mirror), and general tidying of all rooms.' },
  { question: 'What is included in a deep cleaning?', answer: 'A deep clean covers everything in a regular clean plus inside appliances (oven, fridge), baseboards, light fixtures, window sills, behind furniture, inside cabinets, and detailed scrubbing of all surfaces.' },
  { question: 'Do you offer move-in/move-out cleaning?', answer: 'Yes. Our move-in/move-out service is designed to get your apartment spotless for the next occupant or ready for you to settle in. We clean every surface, inside cabinets, appliances, and more.' },
  { question: 'Do you clean offices and commercial spaces?', answer: 'Yes. We offer office cleaning for small to mid-size commercial spaces across the Pennsylvania area. Contact us for a custom quote.' },
  { question: 'Can you clean after a renovation or construction?', answer: 'Absolutely. Post-construction cleanup is one of our specialties. We remove dust, debris, paint splatters, and get your space move-in ready.' },
  { question: 'Do you offer Airbnb and short-term rental cleaning?', answer: 'Yes. We provide fast-turnaround Airbnb cleaning between guests — fresh linens, restocked supplies, and a spotless space for your next booking.' },
  { question: 'Can I customize what gets cleaned?', answer: 'Of course. Just let us know your priorities and we will tailor the cleaning to focus on what matters most to you.' },

  // Supplies & Equipment
  { question: 'Do you bring your own cleaning supplies?', answer: `We offer both options. At $59/hour, you provide supplies (recurring: 10% off weekly, 5% off biweekly/monthly). At $69/hour, we bring all professional-grade supplies and equipment (recurring: 20% off weekly, 10% off biweekly/monthly). Same-day emergency service is $89/hour, supplies included.` },
  { question: 'What cleaning products do you use?', answer: 'We use professional-grade, effective standard cleaning products. If you want eco-friendly, non-toxic, or hypoallergenic products used instead, just provide them and we will use them.' },
  { question: 'Can I request eco-friendly or green products?', answer: 'Yes — provide your own eco-friendly, non-toxic, or hypoallergenic products and we will use them on your cleaning. We don\'t stock these ourselves; our standard supplies are professional-grade, not eco-specific.' },
  { question: 'Do I need to provide a vacuum or mop?', answer: `If you choose our $59/hour rate, yes — you provide all supplies and equipment. At $69/hour, we bring everything including vacuums, mops, and all cleaning tools. Same-day emergency service at $89/hour also includes all supplies.` },

  // Trust & Safety
  { question: 'Are your cleaners background-checked and insured?', answer: 'Yes. Every cleaner on our team is fully background-checked, licensed, and insured. We carry general liability insurance and bonding for your complete peace of mind.' },
  { question: 'Are your cleaners employees or contractors?', answer: 'Our cleaners are vetted professionals who work with us regularly. Every cleaner is background-checked and trained to our quality standards.' },
  { question: 'Do you carry liability insurance?', answer: 'Yes. We carry full general liability insurance and bonding. Your home and belongings are protected on every visit.' },
  { question: 'What if something is damaged during cleaning?', answer: 'We carry liability insurance for exactly this reason. If anything is damaged, contact us immediately and we will resolve it. Your property is always protected.' },
  { question: 'Can I request the same cleaner each time?', answer: 'Yes. We do our best to match you with the same cleaner for recurring appointments. Consistency matters and we know you want someone you trust.' },
  { question: 'Will I need to be home during the cleaning?', answer: 'It is up to you. Many clients leave a key, provide door codes, or arrange access with their doorman. You are welcome to be home or out — whatever is most comfortable.' },

  // Scheduling & Policies
  { question: 'How far in advance should I book?', answer: 'We recommend booking 2-3 days in advance for regular cleanings. For same-day service, contact us as early as possible and we will do our best to accommodate.' },
  { question: 'What is your cancellation policy?', answer: 'First-time and one-time services cannot be cancelled or rescheduled once confirmed. Recurring services (weekly, bi-weekly, monthly) require 7 days notice to reschedule, and cancellations are only permitted if discontinuing the service entirely with 7 days notice. We don\'t take payment upfront — we hold your spot on our busy schedule, turning away other clients. Late cancellations directly affect our team members who depend on this income.' },
  { question: 'Can I reschedule my cleaning?', answer: 'Recurring clients can reschedule with 7 days notice. First-time and one-time services cannot be rescheduled. We hold your spot without collecting payment upfront and turn away other clients to do so — rescheduling leaves our cleaners without the income they were counting on.' },
  { question: 'What days and hours are you available?', answer: 'Our office is open Monday through Saturday 7am–7pm. Self-booking is available 24/7 online anytime.' },
  { question: 'Do you clean on weekends?', answer: 'Yes, we offer Saturday appointments from 7am–7pm. Sunday availability may be limited — contact us to check.' },
  { question: 'Do you offer recurring cleaning schedules?', answer: 'Yes. We offer weekly, bi-weekly, and monthly recurring cleaning. Recurring clients get priority scheduling and a consistent cleaner.' },

  // Areas & Coverage
  { question: 'What areas do you serve?', answer: 'We serve Pennsylvania and the surrounding area. Same rates everywhere — no travel fees.' },
  { question: 'Is there a travel fee for certain areas?', answer: 'No travel fees. Our pricing is the same across our entire service area.' },

  // Quality & Satisfaction
  { question: 'What if I am not happy with the cleaning?', answer: 'Your satisfaction is guaranteed. If you are not happy with any aspect of the clean, contact us within 24 hours and we will send someone back to make it right at no extra charge.' },
  { question: 'How do you maintain quality?', answer: 'We use detailed checklists, conduct regular quality reviews, and only work with experienced, vetted cleaners. Every clean is held to the same high standard.' },
  { question: 'Do you have reviews I can read?', answer: 'Yes! We have a 5.0-star rating from 27 verified clients. You can read all reviews on our Reviews page.' },
  { question: 'How long have you been in business?', answer: 'The Pennsylvania Maid is proud to bring the same standard of professional, background-checked house cleaning to Pennsylvania.' },

  // Special Situations
  { question: 'Can you clean if I have pets?', answer: 'Absolutely. We love pets! Just let us know so we can plan accordingly. We are experienced with homes that have dogs, cats, and other animals.' },
  { question: 'Do you clean high-rise apartments?', answer: 'Yes. We regularly clean in high-rise and multi-unit buildings. We are comfortable working with doormen, building management, and freight elevator schedules.' },
  { question: 'Can you clean a studio apartment?', answer: 'Of course. Studios, one-bedrooms, and small spaces are no problem. Our 2-hour minimum (first-time cleanings included) is usually perfect for a thorough studio clean.' },
  { question: 'Do you clean pre-war apartments?', answer: 'Yes. Our cleaners are experienced with the unique features of pre-war apartments — hardwood floors, crown molding, older fixtures, and everything that makes them special.' },
  { question: 'Can you help prepare for a party or event?', answer: 'Yes. We offer pre-event and post-event cleaning. Get your place guest-ready before, or let us handle the cleanup after.' },

  // Referral & Extras
  { question: 'Do you have a referral program?', answer: 'Yes! Refer a friend and earn 10% commission on every cleaning they book — not just the first one. It is recurring income for as long as they stay a client. Sign up on our Referral Program page.' },
  { question: 'How do I contact you?', answer: 'Text (215) 398-4500, or email hi@thepennsylvaniamaid.com. Texting is the fastest way to reach us.' },
]

export default function HomePage() {
  const schemas = [...homepageSchemas(), faqSchema(homepageFAQs), ...videoReviewsSchemas()]
  const homepagePhoto = pickLifestylePhoto('homepage')

  return (
    <>
      <JsonLd data={schemas} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] pt-12 md:pt-16 pb-14 md:pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Social proof bar */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <span className="text-blue-200/70 text-sm font-medium">Insured Up To $1,000,000</span>
          </div>

          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-white tracking-wide leading-[0.95] mb-3">
            {content.h1}
          </h1>

          {/* Trust points */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; No money upfront</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Payment upon completion</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; No contracts</span>
            <span className="text-[#A8F0DC] text-sm font-medium">&#10003; Flat hourly pricing</span>
          </div>

          {/* Divider */}
          <div className="w-3/4 h-[1px] bg-white/20 mb-5" />

          {/* CTA */}
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide mb-1">Book Your Cleaning</p>
          <p className="text-blue-200/70 text-sm mb-5 max-w-[75%]">One page. Quick. We&apos;ll confirm by text within 15 minutes.</p>
          <div className="flex flex-wrap gap-3 mb-8">
            <Link href="/book/new" className="inline-flex items-center gap-2 bg-[#A8F0DC] text-[#1E2A4A] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Self Booking $10 OFF
            </Link>
            <a href="sms:2153984500" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-white/20 transition-colors">
              Text (215) 398-4500
            </a>
            <Link href="/feedback" className="inline-flex items-center gap-2 bg-red-600 text-yellow-300 px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-red-700 transition-colors">
              Feedback | Suggestions?
            </Link>
          </div>

          {/* Referral hook */}
          <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" target="_blank" className="inline-flex items-center gap-2 text-[#A8F0DC] text-sm font-semibold mb-8 hover:text-white transition-colors group">
            <span className="text-base">&#9733;</span>
            <span className="underline underline-offset-4 decoration-[#A8F0DC]/40 group-hover:decoration-white">Refer friends &amp; earn 10% recurring on every cleaning they book &rarr;</span>
          </Link>

          {/* Pricing tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/[0.08] backdrop-blur-sm border border-white/15 rounded-2xl p-8">
              <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-3">Client Supplies &amp; Equipment</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide">$59<span className="text-2xl text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-sm mt-3">You provide the cleaning supplies and equipment. We bring the expertise.</p>
              <p className="text-[#A8F0DC]/80 text-xs mt-2 font-medium">10% off weekly &middot; 5% off biweekly &amp; monthly</p>
            </div>
            <div className="bg-[#A8F0DC]/10 backdrop-blur-sm border border-[#A8F0DC]/30 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-6 bg-[#A8F0DC] text-[#1E2A4A] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">Most Popular</div>
              <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-3">We Bring Everything</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide">$69<span className="text-2xl text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-sm mt-3">We bring all supplies and professional-grade equipment. Just open the door.</p>
              <p className="text-[#A8F0DC]/80 text-xs mt-2 font-medium">20% off weekly &middot; 10% off biweekly &amp; monthly</p>
            </div>
            <div className="bg-white/[0.08] backdrop-blur-sm border border-white/15 rounded-2xl p-8">
              <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-3">Same-Day / Emergency</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide">$89<span className="text-2xl text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-sm mt-3">Need it today? We dispatch a professional cleaner to your door within hours.</p>
            </div>
          </div>
          <p className="text-blue-200/50 text-xs mt-5 max-w-3xl leading-relaxed">
            2-hour minimum on all bookings (first-time cleanings included). Bookings with 2 or more cleaners carry a 4-hour minimum and receive no discounts.
          </p>
        </div>
      </section>

      {/* Homepage hero photo */}
      <section className="bg-white">
        <figure className="relative aspect-[21/9] w-full overflow-hidden max-h-[560px]">
          <Image
            src={homepagePhoto.src}
            alt={`${homepagePhoto.alt} — The Pennsylvania Maid`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <figcaption className="sr-only">{homepagePhoto.caption} — Pennsylvania Maid service homepage</figcaption>
        </figure>
      </section>

      {/* Welcome */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left — story */}
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Pennsylvania&apos;s Trusted Home Cleaning Company</p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide leading-tight mb-4">Welcome to The Pennsylvania Maid</h2>
              <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                We&apos;re a small, dedicated cleaning company that treats every home like our own. No apps, no algorithms, no random strangers — just experienced, professional cleaners who show up on time, do beautiful work, and earn your trust visit after visit.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                Whether it&apos;s a <Link href="/services/weekly-maid-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">weekly cleaning</Link> for your apartment, a <Link href="/services/deep-cleaning-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">deep clean</Link> before guests arrive, or a <Link href="/services/move-in-move-out-cleaning-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">move-out clean</Link> — we handle it all with care, attention to detail, and genuine pride in what we do.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                We serve <Link href="/service-areas-served-by-the-pennsylvania-maid" className="text-[#1E2A4A] underline underline-offset-2">Pennsylvania</Link>. Every cleaner is background-checked, insured, and paid fairly. We don&apos;t cut corners — on your home or on our people.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                Our clients aren&apos;t looking for the cheapest option — they&apos;re looking for someone they can rely on. Someone who remembers how they like their kitchen cleaned, who notices the details, and who treats their space with respect. That&apos;s what earns repeat bookings week after week.
              </p>
              <p className="text-gray-500 leading-relaxed mb-8">
                We started in 2018 with one cleaner and a commitment to doing things the right way. We&apos;re not the biggest cleaning company, but we care the most. Read our <Link href="/reviews" className="text-[#1E2A4A] underline underline-offset-2">customer reviews</Link> and see for yourself.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/book/new" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Self Booking $10 OFF
                </Link>
                <a href="sms:2153984500" className="inline-block bg-[#1E2A4A] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                  Text (215) 398-4500
                </a>
                <Link href="/about-the-pennsylvania-maid-service-company" className="text-[#1E2A4A] font-semibold hover:underline underline-offset-4">
                  Learn more &rarr;
                </Link>
              </div>
            </div>

            {/* Right — at a glance + quick stats */}
            <div className="space-y-6">
              <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">The Pennsylvania Maid at a Glance</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">2018</p>
                    <p className="text-gray-500 text-sm">Founded</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">5.0</p>
                    <p className="text-gray-500 text-sm">Client Rating</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">225+</p>
                    <p className="text-gray-500 text-sm">Neighborhoods</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">$59</p>
                    <p className="text-gray-500 text-sm">Starting Rate/Hr</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">What You Can Expect</h3>
                <ul className="space-y-3.5">
                  {[
                    'Same cleaner on every visit — someone you know and trust',
                    'Background-checked, insured, and professionally trained',
                    'No money upfront — pay only after your cleaning is done',
                    'No contracts, no commitments — stay because you\'re happy',
                    'Flat hourly pricing with zero hidden fees',
                    'Responsive support — text us anytime, we answer fast',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-[#A8F0DC] mt-0.5 text-lg">&#10003;</span>
                      <span className="text-gray-700 text-[15px]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Pricing Deep Dive */}
      <section className="py-20 bg-[#A8F0DC]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[#1E2A4A]/50 tracking-[0.25em] uppercase mb-3 text-center">Pennsylvania Maid Service Pricing Explained — Hourly Rates, Average Costs &amp; What to Expect</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide text-center mb-4">How Much Does House Cleaning Cost in Pennsylvania?</h2>
          <p className="text-[#1E2A4A]/70 text-center max-w-3xl mx-auto mb-14">
            We keep it simple: flat hourly rates, no hidden fees, no contracts. Choose the option that fits your situation. Every tier includes the same professional, <Link href="/about-the-pennsylvania-maid-service-company" className="text-[#1E2A4A] font-semibold underline underline-offset-2">background-checked cleaners</Link> — the only difference is who brings the supplies. See our full <Link href="/updated-pennsylvania-maid-service-industry-pricing" className="text-[#1E2A4A] font-semibold underline underline-offset-2">pricing page</Link> for more details.
          </p>

          {/* 3 pricing cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16 items-start">
            {/* Tier 1 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Client Supplies &amp; Equipment</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl sm:text-6xl lg:text-7xl text-[#1E2A4A] tracking-wide leading-none mb-1">$59<span className="text-2xl sm:text-3xl text-gray-300">/hr</span></p>
              <div className="w-10 h-[2px] bg-[#A8F0DC] mt-4 mb-5" />
              <p className="text-gray-600 text-sm leading-relaxed mb-5">
                You provide all cleaning supplies, equipment, and products. We bring an experienced, background-checked professional cleaner who does the work.
              </p>
              <p className="text-[#1E2A4A] text-xs font-semibold tracking-wide mb-5">Save 10% on weekly &middot; 5% on biweekly &amp; monthly</p>
              <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-3">Best For</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Budget-conscious clients who already own supplies',
                  'Recurring weekly or bi-weekly clients looking for the lowest rate',
                  'Clients with specific product preferences (eco-friendly, hypoallergenic)',
                  'Small studios and one-bedrooms where a vacuum and basics are enough',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto bg-gray-50 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Average Cost Examples</p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>Studio / 1BR: <strong className="text-[#1E2A4A]">$98–$147</strong> (2–3 hrs)</li>
                  <li>2BR apartment: <strong className="text-[#1E2A4A]">$147–$196</strong> (3–4 hrs)</li>
                  <li>3BR apartment: <strong className="text-[#1E2A4A]">$196–$294</strong> (4–6 hrs)</li>
                </ul>
              </div>
            </div>

            {/* Tier 2 — Most Popular */}
            <div className="bg-[#1E2A4A] rounded-2xl p-8 pt-10 relative flex flex-col lg:-my-4 shadow-xl">
              <div className="absolute -top-3.5 left-6 bg-[#A8F0DC] text-[#1E2A4A] text-xs font-bold tracking-widest uppercase px-5 py-1.5 rounded-full">Most Popular</div>
              <p className="text-xs font-semibold text-[#A8F0DC]/70 tracking-[0.2em] uppercase mb-3">We Bring Everything</p>
              <p className="font-[family-name:var(--font-bebas)] text-6xl sm:text-7xl lg:text-8xl text-white tracking-wide leading-none mb-1">$69<span className="text-2xl sm:text-3xl text-blue-200/40">/hr</span></p>
              <div className="w-10 h-[2px] bg-[#A8F0DC] mt-4 mb-5" />
              <p className="text-blue-200/60 text-sm leading-relaxed mb-5">
                We bring all professional-grade supplies, equipment, vacuums, mops, and cleaning products. Just open the door — we handle everything from start to finish.
              </p>
              <p className="text-[#A8F0DC] text-xs font-semibold tracking-wide mb-5">Save 20% on weekly &middot; 10% on biweekly &amp; monthly</p>
              <p className="text-xs font-semibold text-blue-200/40 tracking-[0.15em] uppercase mb-3">Best For</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Most Pennsylvania renters — no storage needed for bulky supplies',
                  'First-time clients who want a hassle-free experience',
                  'Deep cleaning, move-in/move-out, and one-time bookings',
                  'Clients who want consistent, professional-grade results',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-blue-100/70 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto bg-white/[0.08] rounded-xl p-5">
                <p className="text-xs font-semibold text-blue-200/40 tracking-[0.15em] uppercase mb-2">Average Cost Examples</p>
                <ul className="space-y-1.5 text-sm text-blue-200/60">
                  <li>Studio / 1BR: <strong className="text-white">$138–$207</strong> (2–3 hrs)</li>
                  <li>2BR apartment: <strong className="text-white">$207–$276</strong> (3–4 hrs)</li>
                  <li>3BR apartment: <strong className="text-white">$276–$414</strong> (4–6 hrs)</li>
                </ul>
              </div>
            </div>

            {/* Tier 3 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Same-Day &amp; Emergency</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl sm:text-6xl lg:text-7xl text-[#1E2A4A] tracking-wide leading-none mb-1">$89<span className="text-2xl sm:text-3xl text-gray-300">/hr</span></p>
              <div className="w-10 h-[2px] bg-[#A8F0DC] mt-4 mb-5" />
              <p className="text-gray-600 text-sm leading-relaxed mb-5">
                Need a cleaner today? We dispatch a professional to your door within hours. Includes all supplies and equipment — <Link href="/services/same-day-cleaning-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">same-day cleaning</Link> when you need it most.
              </p>
              <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-3">Best For</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Unexpected guests arriving tonight',
                  'Post-party or post-event cleanup',
                  'Last-minute move-out before landlord inspection',
                  'Airbnb hosts with a same-day turnover',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto bg-gray-50 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Average Cost Examples</p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>Studio / 1BR: <strong className="text-[#1E2A4A]">$200–$300</strong> (2–3 hrs)</li>
                  <li>2BR apartment: <strong className="text-[#1E2A4A]">$300–$400</strong> (3–4 hrs)</li>
                  <li>3BR apartment: <strong className="text-[#1E2A4A]">$400–$600</strong> (4–6 hrs)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tips + Education */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">Pennsylvania Cleaning Cost Tips — How to Get the Best Value</h3>
              <ul className="space-y-4">
                {[
                  { tip: 'Book recurring service for the best rate', detail: 'Recurring discounts vary by tier. $69/hr (we supply): 20% weekly, 10% biweekly/monthly. $59/hr (you supply): 10% weekly, 5% biweekly/monthly. A weekly 2-hour clean at $59/hr drops to ~$106/visit with the recurring discount.' },
                  { tip: 'First cleaning always takes longer', detail: 'Your initial deep clean may run 4–6 hours. After that, recurring maintenance cleanings are typically 2–3 hours because we\'re maintaining — not catching up.' },
                  { tip: 'Provide your own supplies to save 25%', detail: 'The difference between $59/hour and $69/hr is who provides supplies. If you have a vacuum, mop, and basic products, you save $20/hr — that\'s $40+ per visit.' },
                  { tip: 'Declutter before we arrive', detail: 'Our cleaners are most efficient when surfaces are accessible. Less time moving items means more time actually cleaning — better results, lower cost.' },
                  { tip: 'Bundle services for new apartments', detail: 'Moving in? Book a move-in deep clean at $69/hr, then transition to weekly or biweekly at $59/hour with your own supplies for ongoing maintenance — and stack the recurring discount on top.' },
                ].map(item => (
                  <li key={item.tip}>
                    <p className="text-[#1E2A4A] font-semibold text-sm mb-1">{item.tip}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">What Affects the Cost of House Cleaning in Pennsylvania?</h3>
              <ul className="space-y-4">
                {[
                  { factor: 'Apartment size', detail: 'A studio takes 2 hours. A 3-bedroom may take 5–6. We charge by the hour so you only pay for the time your space actually needs — no inflated flat rates.' },
                  { factor: 'Cleaning type', detail: 'A regular maintenance clean is faster than a deep clean. Deep cleans cover inside appliances, baseboards, window tracks, and behind furniture — expect 2x the time.' },
                  { factor: 'Condition of the space', detail: 'A well-maintained home that gets cleaned weekly takes less time than a first-time clean or post-construction job. Recurring clients see lower bills over time.' },
                  { factor: 'Supplies', detail: 'At $59/hour you provide supplies. At $69/hr we bring commercial-grade vacuums, microfiber systems, and professional products. Both options include the same quality of work.' },
                  { factor: 'Urgency', detail: 'Same-day and emergency service is $89/hr because we prioritize your booking and dispatch immediately. Plan ahead to save — most clients book 2–3 days in advance.' },
                ].map(item => (
                  <li key={item.factor}>
                    <p className="text-[#1E2A4A] font-semibold text-sm mb-1">{item.factor}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick comparison + CTA */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-2">How Pennsylvania Maid Pricing Compares to the Industry</h3>
            <p className="text-gray-500 text-sm max-w-2xl mx-auto mb-6">
              Many cleaning companies charge $79–$120/hr or use opaque flat-rate quotes that hide the true cost. We publish our rates, charge by the hour, and never surprise you with add-on fees. What you see is what you pay.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-1">Typical Average</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-gray-400 tracking-wide">$79–$120/hr</p>
              </div>
              <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-4">
                <p className="text-xs text-[#A8F0DC] font-semibold tracking-wide uppercase mb-1">The Pennsylvania Maid</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide">$59–$89/hr</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-1">You Save</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#A8F0DC] tracking-wide">25–45%</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/book/new" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Self Booking $10 OFF
              </Link>
              <a href="sms:2153984500" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                Text (215) 398-4500
              </a>
              <Link href="/updated-pennsylvania-maid-service-industry-pricing" className="text-[#1E2A4A] font-semibold hover:underline underline-offset-4 text-sm">
                View pricing &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-gradient-to-b from-[#1E2A4A] to-[#243352]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[#A8F0DC]/70 tracking-[0.25em] uppercase mb-3 text-center">Professional Pennsylvania House Cleaning Services</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide text-center mb-4">Deep Cleaning, Regular Maid Service &amp; More in Pennsylvania</h2>
          <p className="text-blue-200/60 text-center max-w-3xl mx-auto mb-14">
            From <Link href="/services/weekly-maid-service-in-pennsylvania" className="text-[#A8F0DC] underline underline-offset-2">weekly maid service</Link> and <Link href="/services/deep-cleaning-service-in-pennsylvania" className="text-[#A8F0DC] underline underline-offset-2">deep cleaning</Link> to <Link href="/services/move-in-move-out-cleaning-service-in-pennsylvania" className="text-[#A8F0DC] underline underline-offset-2">move-in/move-out cleaning</Link>, <Link href="/services/post-construction-cleanup-service-in-pennsylvania" className="text-[#A8F0DC] underline underline-offset-2">post-renovation cleanup</Link>, and <Link href="/services/same-day-cleaning-service-in-pennsylvania" className="text-[#A8F0DC] underline underline-offset-2">same-day emergency cleaning</Link> — we handle every type of residential cleaning across Pennsylvania. All cleaners are background-checked, licensed, and insured.
          </p>
          <ServiceGrid />
          <div className="text-center mt-10">
            <Link href="/pennsylvania-maid-service-services-offered-by-the-pennsylvania-maid" className="text-[#A8F0DC] font-semibold hover:underline underline-offset-4">Browse All Cleaning Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Insured Up To $1,000,000 Cleaning Company</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide leading-tight mb-6">Why Pennsylvania Trusts The Pennsylvania Maid</h2>
            <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              We provide personalized, hourly <Link href="/updated-pennsylvania-maid-service-industry-pricing" className="text-[#1E2A4A] underline underline-offset-2">cleaning service pricing</Link> for each unique space — ensuring high-quality cleaning tailored to your needs. No contracts, no hidden fees, no surprises.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Every cleaner on our team is fully background-checked and insured. Whether you need a <Link href="/services/apartment-cleaning-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">regular apartment cleaning</Link>, a <Link href="/services/deep-cleaning-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">deep clean</Link>, or <Link href="/services/airbnb-cleaning-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">Airbnb turnover cleaning</Link> — we&apos;ve got you covered. <Link href="/about-the-pennsylvania-maid-service-company" className="text-[#1E2A4A] underline underline-offset-2">Learn more about our company</Link>.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link href="/book/new" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Self Booking $10 OFF
              </Link>
              <a href="sms:2153984500" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                Text (215) 398-4500
              </a>
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-8">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-6">Background-Checked, Insured &amp; 5-Star Rated</h3>
            <ul className="space-y-4">
              {[
                { icon: '\u{1F6E1}', text: 'Full general liability insurance and bonding on every visit' },
                { icon: '\u{1F4CB}', text: 'Every cleaner is thoroughly background-checked before hire' },
                { icon: '\u{1F3E0}', text: 'Trained in apartment and high-rise care' },
                                { icon: '\u{1F4B0}', text: 'Transparent hourly pricing starting at $59/hour' },
                { icon: '\u2705', text: 'Satisfaction guaranteed — we come back if you are not happy' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{item.icon}</span>
                  <span className="text-gray-700">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link href="/reviews" className="text-[#1E2A4A] font-semibold text-sm hover:underline underline-offset-4">Read Our Customer Reviews &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Clients Choose Us */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">What Makes The Pennsylvania Maid Different From Other Cleaning Services</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide text-center mb-4">Why Clients Choose The Pennsylvania Maid Over Every Other Cleaning Company</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-14">
            No money upfront — you pay only after your cleaning is complete. Flat <Link href="/updated-pennsylvania-maid-service-industry-pricing" className="text-[#1E2A4A] underline underline-offset-2">hourly pricing</Link> with no surprise fees. Experienced, professional cleaners — not random gig workers. <Link href="/services/weekly-maid-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">Weekly</Link> and <Link href="/services/bi-weekly-cleaning-service-in-pennsylvania" className="text-[#1E2A4A] underline underline-offset-2">bi-weekly recurring service</Link> available. No contracts — stay because you&apos;re happy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Transparent Cleaning Service Scheduling</h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">How Scheduling Works</p>
              <ul className="space-y-3">
                {[
                  'All appointments are confirmed in advance',
                  'No-cancellation policy once your booking is confirmed',
                  'This protects cleaner schedules and ensures reliability',
                  'Recurring clients receive priority scheduling',
                  'We value consistency over chaos',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#A8F0DC] mt-0.5">&#10003;</span>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">No Upfront Payment — Pay After Your Cleaning</h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Payment &amp; Completion</p>
              <ul className="space-y-3">
                {[
                  'Payment is requested when the cleaning is nearly complete',
                  'You see the results before you pay',
                  'Accepted methods: credit/debit card, Apple Pay, or Cash App',
                  'No processing fees, no delays, no chargebacks',
                  'Cleaner remains on site until payment is completed',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#A8F0DC] mt-0.5">&#10003;</span>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Consistent Quality Home Cleaning Standards</h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Quality &amp; Expectations</p>
              <ul className="space-y-3">
                {[
                  'Clear scope agreed upfront — no vague promises',
                  'We clean what\'s agreed, every visit',
                  'Consistent, repeatable quality over rushed work',
                  'Any concerns are addressed immediately',
                  'We don\'t overbook or rush our cleaners',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#A8F0DC] mt-0.5">&#10003;</span>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Our Cleaners + Who We're Best For */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Professional Background-Checked House Cleaners</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-6">Our Cleaners Are Paid Well, Equipped &amp; Treated Right</h2>
            <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
            <p className="text-gray-600 leading-relaxed mb-5">
              We don&apos;t cut corners on the people who do the work. Our cleaners are experienced professionals — not gig workers pulled from an app. They bring their own professional supplies and equipment, they&apos;re paid well, and they&apos;re paid immediately. Happy cleaners do better work, every time.
            </p>
            <p className="text-gray-600 leading-relaxed mb-5">
              Every cleaner goes through a thorough background check and vetting process before they ever step foot in your home. We don&apos;t use staffing agencies or subcontractors — our team is built on trust, consistency, and pride in the work. When you book with us, you get someone who genuinely cares about doing a great job.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              That&apos;s why clients keep rebooking — they know exactly who&apos;s coming, and they trust them completely.
            </p>
            <Link href="/available-pennsylvania-maid-jobs" className="text-[#1E2A4A] font-semibold text-sm hover:underline underline-offset-4">Join Our Cleaning Team &rarr;</Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">The Ideal Pennsylvania Maid Service Client</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-6">Who We&apos;re Best For</h2>
            <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
            <ul className="space-y-4">
              {[
                'Clients who value reliability and consistency over the cheapest price',
                'Homes that appreciate clear, respectful communication',
                'People looking for a long-term cleaning relationship — not a one-off gig',
                'Clients who respect professional service and treat cleaners well',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#A8F0DC] mt-1 text-lg">&#10003;</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-2xl p-6 mt-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-3">Our Standards</h3>
              <ul className="space-y-2">
                {[
                  'Respectful homes and respectful clients only',
                  'No discount-driven or price-shopping bookings',
                  'No last-minute cancellations',
                  'Clear expectations on both sides',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#1E2A4A]/40 mt-0.5">&#8226;</span>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area */}

      <section className="py-16 bg-white">

        <div className="max-w-4xl mx-auto px-4 text-center">

          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Where We Clean</p>

          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-4">Proudly Serving Pennsylvania</h2>

          <p className="text-gray-500 max-w-2xl mx-auto">Same flat hourly rate, same background-checked cleaners, no travel fees — anywhere in our Pennsylvania service area. Text us your address and we&apos;ll confirm coverage.</p>

        </div>

      </section>


      {/* Referral CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Earn Passive Income With Our Cleaning Referral Program</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-4">Get Paid 10% Every Time Your Referral Books a Cleaning</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8">
            Refer friends, family, or neighbors to The Pennsylvania Maid and earn 10% recurring commission on every cleaning they book — not just the first. Paid via Stripe after each completed visit. No limit on referrals, no cap on earnings.
          </p>
          <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" target="_blank" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
            Join the Referral Program &rarr;
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={homepageFAQs} title="Pennsylvania House Cleaning Service — Frequently Asked Questions &amp; Answers" columns={2} />

      <CTABlock title="Book Your Pennsylvania Cleaning Service Today" subtitle="Text us — background-checked, insured cleaners serving Pennsylvania." />
    </>
  )
}
