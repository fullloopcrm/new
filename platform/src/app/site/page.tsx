import type { Metadata } from 'next'
import Link from 'next/link'
import { homepageContent } from '@/lib/seo/content'
import { homepageSchemas, faqSchema, videoReviewsSchemas } from '@/lib/seo/schema'
import { pickLifestylePhoto } from '@/lib/seo/photos'
import JsonLd from '@/components/marketing/JsonLd'
import ServiceGrid from '@/components/marketing/ServiceGrid'
import TrustBadges from '@/components/marketing/TrustBadges'
import CTABlock from '@/components/marketing/CTABlock'
import FAQSection from '@/components/marketing/FAQSection'
import Image from 'next/image'
import VideoReviews from '@/components/marketing/VideoReviews'
import HeroChat from '@/components/marketing/HeroChat'
import { getTenantFromHeaders } from '@/lib/tenant-site'


const content = homepageContent()

export const metadata: Metadata = {
  title: { absolute: content.title },
  description: content.metaDescription,
  alternates: { canonical: 'https://www.[yourbusiness].com' },
  openGraph: {
    title: content.title,
    description: content.metaDescription,
    url: 'https://www.[yourbusiness].com',
    siteName: '[Your Business]',
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
    'geo.region': 'US-NY',
    'geo.placename': 'New York City',
    'geo.position': '40.7589;-73.9851',
    'ICBM': '40.7589, -73.9851',
  },
}

const testimonials = [
  { text: 'We just had our apartment painted and needed a deep clean to get rid of loads of dust. NYC Maid sent a wonderful cleaner who was prompt, professional and did an amazing job. Highly recommend!!!', name: 'Julie Salamon', location: 'New York' },
  { text: 'Best cleaning service I\'ve used in the 20 years I\'ve lived in NYC! Consistently efficient, thorough...', name: 'Courtney Gamble', location: 'New York' },
  { text: 'After trying three different cleaning companies in NYC, [Your Business] is hands down the most affordable and thorough.', name: 'Jenna M', location: 'New York' },
]

const homepageFAQs = [
  // Pricing & Booking
  { question: 'How much does house cleaning cost in NYC?', answer: 'Our house cleaning services start at $59/hour when you provide supplies, or $75/hour when we bring everything. Same-day and emergency service is $100/hour. Final cost depends on home size and service type.' },
  { question: 'Do you charge by the hour or a flat rate?', answer: 'We charge by the hour. This keeps pricing fair — you only pay for the time your space actually needs. No inflated flat-rate quotes.' },
  { question: 'Is there a minimum number of hours?', answer: 'We have a 2-hour minimum for most bookings. This ensures our cleaners have enough time to deliver a thorough, quality clean.' },
  { question: 'How do I book a cleaning?', answer: 'Text [phone]. We typically schedule within 24-48 hours, with same-day availability for urgent requests.' },
  { question: 'Do you offer same-day cleaning?', answer: 'Yes. Same-day and emergency cleaning is available at $100/hour. We dispatch a professional cleaner to your door within hours.' },
  { question: 'What payment methods do you accept?', answer: 'We accept credit cards, debit cards, Zelle ([email]), Venmo, Apple Pay, and cash. You can also pay securely online through our payment portal.' },
  { question: 'Do I need to tip my cleaner?', answer: 'Tipping is never required but always appreciated. If you feel your cleaner did a great job, a tip is a wonderful way to show it.' },

  // Services
  { question: 'What types of cleaning do you offer?', answer: 'We offer regular apartment cleaning, deep cleaning, move-in/move-out cleaning, post-construction cleanup, weekly/bi-weekly/monthly service, Airbnb turnover cleaning, same-day cleaning, and office cleaning.' },
  { question: 'What is included in a regular cleaning?', answer: 'A regular cleaning covers dusting, vacuuming, mopping, kitchen cleaning (counters, sink, appliances), bathroom cleaning (toilet, tub, sink, mirror), and general tidying of all rooms.' },
  { question: 'What is included in a deep cleaning?', answer: 'A deep clean covers everything in a regular clean plus inside appliances (oven, fridge), baseboards, light fixtures, window sills, behind furniture, inside cabinets, and detailed scrubbing of all surfaces.' },
  { question: 'Do you offer move-in/move-out cleaning?', answer: 'Yes. Our move-in/move-out service is designed to get your apartment spotless for the next occupant or ready for you to settle in. We clean every surface, inside cabinets, appliances, and more.' },
  { question: 'Do you clean offices and commercial spaces?', answer: 'Yes. We offer office cleaning for small to mid-size commercial spaces across the NYC metro area. Contact us for a custom quote.' },
  { question: 'Can you clean after a renovation or construction?', answer: 'Absolutely. Post-construction cleanup is one of our specialties. We remove dust, debris, paint splatters, and get your space move-in ready.' },
  { question: 'Do you offer Airbnb and short-term rental cleaning?', answer: 'Yes. We provide fast-turnaround Airbnb cleaning between guests — fresh linens, restocked supplies, and a spotless space for your next booking.' },
  { question: 'Can I customize what gets cleaned?', answer: 'Of course. Just let us know your priorities and we will tailor the cleaning to focus on what matters most to you.' },

  // Supplies & Equipment
  { question: 'Do you bring your own cleaning supplies?', answer: 'We offer both options. At $59/hour, you provide supplies. At $75/hour, we bring all professional-grade supplies and equipment. Same-day emergency service is $100/hour, supplies included.' },
  { question: 'What cleaning products do you use?', answer: 'We use professional-grade, effective cleaning products. If you have preferences for eco-friendly or specific brands, just let us know and we will accommodate.' },
  { question: 'Can I request eco-friendly or green products?', answer: 'Yes. We are happy to use eco-friendly, non-toxic, or hypoallergenic products. Just mention your preference when booking.' },
  { question: 'Do I need to provide a vacuum or mop?', answer: 'If you choose our $59/hour rate, yes — you provide all supplies and equipment. At $75/hour, we bring everything including vacuums, mops, and all cleaning tools. Same-day emergency service at $100/hour also includes all supplies.' },

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
  { question: 'What days and hours are you available?', answer: 'Our office is open Monday through Saturday 7am–7pm. Our sales and booking line is available 24/7 — text [phone] anytime.' },
  { question: 'Do you clean on weekends?', answer: 'Yes, we offer Saturday appointments from 7am–7pm. Sunday availability may be limited — contact us to check.' },
  { question: 'Do you offer recurring cleaning schedules?', answer: 'Yes. We offer weekly, bi-weekly, and monthly recurring cleaning. Recurring clients get priority scheduling and a consistent cleaner.' },

  // Areas & Coverage
  { question: 'What areas do you serve?', answer: 'We serve all of Manhattan, Brooklyn, Queens, Long Island (Nassau County), and Northern New Jersey including Jersey City, Hoboken, and Weehawken. We cover 225+ neighborhoods across the NYC metro area.' },
  { question: 'Do you serve Brooklyn?', answer: 'Yes. We serve all Brooklyn neighborhoods including Brooklyn Heights, Park Slope, Williamsburg, DUMBO, Cobble Hill, Fort Greene, Bushwick, Bed-Stuy, and many more.' },
  { question: 'Do you serve Queens?', answer: 'Yes. We cover Astoria, Long Island City, Forest Hills, Jackson Heights, Flushing, Bayside, and neighborhoods throughout Queens.' },
  { question: 'Do you serve Long Island?', answer: 'Yes. We serve Nassau County including Great Neck, Manhasset, Port Washington, Garden City, Roslyn, and towns across the North Shore and South Shore.' },
  { question: 'Do you serve New Jersey?', answer: 'Yes. We cover the Hudson River waterfront including Jersey City, Hoboken, Weehawken, Edgewater, Fort Lee, Cliffside Park, and towns up through Bergen County.' },
  { question: 'Do you serve the Upper East Side?', answer: 'Yes. The Upper East Side is one of our most popular service areas. We clean apartments and townhouses throughout the UES regularly.' },
  { question: 'Is there a travel fee for areas outside Manhattan?', answer: 'No travel fees. Our pricing is the same across all service areas — Manhattan, Brooklyn, Queens, Long Island, and New Jersey.' },

  // Quality & Satisfaction
  { question: 'What if I am not happy with the cleaning?', answer: 'Your satisfaction is guaranteed. If you are not happy with any aspect of the clean, contact us within 24 hours and we will send someone back to make it right at no extra charge.' },
  { question: 'How do you maintain quality?', answer: 'We use detailed checklists, conduct regular quality reviews, and only work with experienced, vetted cleaners. Every clean is held to the same high standard.' },
  { question: 'Do you have reviews I can read?', answer: 'Yes! We have a 5.0-star rating from 27 verified clients. You can read all reviews on our Reviews page.' },
  { question: 'How long have you been in business?', answer: '[Your Business] has been serving the New York City metro area since 2018. We have cleaned thousands of homes and built a loyal client base through consistent quality.' },

  // Special Situations
  { question: 'Can you clean if I have pets?', answer: 'Absolutely. We love pets! Just let us know so we can plan accordingly. We are experienced with homes that have dogs, cats, and other animals.' },
  { question: 'Do you clean high-rise apartments?', answer: 'Yes. We regularly clean in high-rise buildings across Manhattan, Brooklyn, and Jersey City. We are comfortable working with doormen, building management, and freight elevator schedules.' },
  { question: 'Can you clean a studio apartment?', answer: 'Of course. Studios, one-bedrooms, and small spaces are no problem. Our 2-hour minimum is usually perfect for a thorough studio clean.' },
  { question: 'Do you clean pre-war apartments?', answer: 'Yes. Our cleaners are experienced with the unique features of pre-war apartments — hardwood floors, crown molding, older fixtures, and everything that makes them special.' },
  { question: 'Can you help prepare for a party or event?', answer: 'Yes. We offer pre-event and post-event cleaning. Get your place guest-ready before, or let us handle the cleanup after.' },

  // Referral & Extras
  { question: 'Do you have a referral program?', answer: 'Yes! Refer a friend and earn 10% commission on every cleaning they book — not just the first one. It is recurring income for as long as they stay a client. Sign up on our Referral Program page.' },
  { question: 'How do I contact you?', answer: 'Text [phone], or email [email]. Texting is the fastest way to reach us.' },
]

export default async function HomePage() {
  const tenant = await getTenantFromHeaders()
  // Fallbacks default to nycmaid's live values so localhost rendering stays
  // intact when no tenant header is present. In production, middleware
  // injects x-tenant-id for tenant domains and these resolve per-tenant.
  const name = tenant?.name || '[Your Business]'
  const phone = tenant?.phone || '[phone]'
  const phoneDigits = (tenant?.phone || '').replace(/\D/g, '')
  const email = tenant?.email || '[email]'

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
            <Link href="/reviews" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-blue-200/70 text-sm font-medium underline underline-offset-2">5.0 Rating &middot; 50+ Reviews</span>
            </Link>
            <span className="text-white/20 hidden sm:inline">|</span>
            <a href="https://www.bbb.org/us/ny/new-york/profile/house-cleaning/the-nyc-maid-0121-87177862" target="_blank" rel="noopener noreferrer" className="text-blue-200/70 text-sm font-medium underline underline-offset-2 hover:text-white transition-colors">A Rating on BBB</a>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-blue-200/70 text-sm font-medium">Trusted by New Yorkers Since 2018</span>
            <span className="text-white/20 hidden sm:inline">|</span>
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
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide mb-1">Book Now — Text or Call {phone}</p>
          <p className="text-blue-200/70 text-sm mb-5 max-w-[75%]">Pricing, availability, and scheduling in seconds. We respond fast.</p>
          <div className="flex flex-wrap gap-3 mb-8">
            <a href={`sms:${phoneDigits}`} className="inline-flex items-center gap-2 bg-[#A8F0DC] text-[#1E2A4A] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              💬 Text Us
            </a>
            <a href={`tel:${phoneDigits}`} className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-white/20 transition-colors">
              📞 Call Us
            </a>
          </div>

          {/* Selena Chat */}
          <div className="mb-8">
            <HeroChat />
          </div>

          {/* Pricing tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/[0.08] backdrop-blur-sm border border-white/15 rounded-2xl p-8">
              <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-3">Client Supplies &amp; Equipment</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide">$59<span className="text-2xl text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-sm mt-3">You provide the cleaning supplies and equipment. We bring the expertise.</p>
            </div>
            <div className="bg-[#A8F0DC]/10 backdrop-blur-sm border border-[#A8F0DC]/30 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-6 bg-[#A8F0DC] text-[#1E2A4A] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">Most Popular</div>
              <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-3">We Bring Everything</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide">$75<span className="text-2xl text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-sm mt-3">We bring all supplies and professional-grade equipment. Just open the door.</p>
              <p className="text-[#A8F0DC]/80 text-xs mt-2 font-medium">10% off for weekly, bi-weekly &amp; monthly clients</p>
            </div>
            <div className="bg-white/[0.08] backdrop-blur-sm border border-white/15 rounded-2xl p-8">
              <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-3">Same-Day / Emergency</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-white tracking-wide">$100<span className="text-2xl text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-sm mt-3">Need it today? We dispatch a professional cleaner to your door within hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Homepage hero photo */}
      <section className="bg-white">
        <figure className="relative aspect-[21/9] w-full overflow-hidden max-h-[560px]">
          <Image
            src={homepagePhoto.src}
            alt={`${homepagePhoto.alt} — ${name}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <figcaption className="sr-only">{homepagePhoto.caption} — NYC Maid service homepage</figcaption>
        </figure>
      </section>

      <VideoReviews autoPlay />

      {/* Welcome */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left — story */}
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">New York City&apos;s Trusted Home Cleaning Company Since 2018</p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide leading-tight mb-4">Welcome to {name}</h2>
              <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                We&apos;re a small, dedicated cleaning company that treats every home like our own. No apps, no algorithms, no random strangers — just experienced, professional cleaners who show up on time, do beautiful work, and earn your trust visit after visit.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                Whether it&apos;s a <Link href="/services/weekly-maid-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">weekly cleaning</Link> for your <Link href="/upper-east-side-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Upper East Side</Link> apartment, a <Link href="/services/deep-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">deep clean</Link> before guests arrive in <Link href="/park-slope-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Park Slope</Link>, or a <Link href="/services/move-in-move-out-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">move-out clean</Link> in <Link href="/hoboken-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Hoboken</Link> — we handle it all with care, attention to detail, and genuine pride in what we do.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                We serve over <Link href="/service-areas-served-by-the-nyc-maid" className="text-[#1E2A4A] underline underline-offset-2">225 neighborhoods</Link> across <Link href="/manhattan-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Manhattan</Link>, <Link href="/brooklyn-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Brooklyn</Link>, <Link href="/queens-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Queens</Link>, <Link href="/long-island-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Long Island</Link>, and <Link href="/new-jersey-maid-service" className="text-[#1E2A4A] underline underline-offset-2">New Jersey</Link>. Every cleaner is background-checked, insured, and paid fairly. We don&apos;t cut corners — on your home or on our people.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                Our clients aren&apos;t looking for the cheapest option — they&apos;re looking for someone they can rely on. Someone who remembers how they like their kitchen cleaned, who notices the details, and who treats their space with respect. That&apos;s what we do. It&apos;s why families in <Link href="/chelsea-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Chelsea</Link>, <Link href="/williamsburg-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Williamsburg</Link>, <Link href="/forest-hills-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Forest Hills</Link>, and <Link href="/great-neck-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Great Neck</Link> keep us coming back week after week.
              </p>
              <p className="text-gray-500 leading-relaxed mb-8">
                We started in 2018 with one cleaner and a commitment to doing things the right way. Today we&apos;re one of the highest-rated cleaning companies in New York — not because we&apos;re the biggest, but because we care the most. Read our <Link href="/reviews" className="text-[#1E2A4A] underline underline-offset-2">customer reviews</Link> and see for yourself.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/about-the-nyc-maid-service-company" className="inline-block bg-[#1E2A4A] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                  Learn More About Us
                </Link>
                <a href={`sms:${phoneDigits}`} className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Text Us
                </a>
                <a href={`sms:${phoneDigits}`} className="text-[#1E2A4A] font-semibold hover:underline underline-offset-4">
                  or Text {phone}
                </a>
              </div>
            </div>

            {/* Right — at a glance + quick stats */}
            <div className="space-y-6">
              <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">{name} at a Glance</h3>
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
          <p className="text-xs font-semibold text-[#1E2A4A]/50 tracking-[0.25em] uppercase mb-3 text-center">NYC Maid Service Pricing Explained — Hourly Rates, Average Costs &amp; What to Expect</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide text-center mb-4">How Much Does House Cleaning Cost in New York City?</h2>
          <p className="text-[#1E2A4A]/70 text-center max-w-3xl mx-auto mb-14">
            We keep it simple: flat hourly rates, no hidden fees, no contracts. Choose the option that fits your situation. Every tier includes the same professional, <Link href="/about-the-nyc-maid-service-company" className="text-[#1E2A4A] font-semibold underline underline-offset-2">background-checked cleaners</Link> — the only difference is who brings the supplies. See our full <Link href="/updated-nyc-maid-service-industry-pricing" className="text-[#1E2A4A] font-semibold underline underline-offset-2">pricing page</Link> for more details.
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
              <p className="font-[family-name:var(--font-bebas)] text-6xl sm:text-7xl lg:text-8xl text-white tracking-wide leading-none mb-1">$75<span className="text-2xl sm:text-3xl text-blue-200/40">/hr</span></p>
              <div className="w-10 h-[2px] bg-[#A8F0DC] mt-4 mb-5" />
              <p className="text-blue-200/60 text-sm leading-relaxed mb-5">
                We bring all professional-grade supplies, equipment, vacuums, mops, and cleaning products. Just open the door — we handle everything from start to finish.
              </p>
              <p className="text-xs font-semibold text-blue-200/40 tracking-[0.15em] uppercase mb-3">Best For</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Most NYC apartment renters — no storage needed for bulky supplies',
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
                  <li>Studio / 1BR: <strong className="text-white">$130–$195</strong> (2–3 hrs)</li>
                  <li>2BR apartment: <strong className="text-white">$195–$260</strong> (3–4 hrs)</li>
                  <li>3BR apartment: <strong className="text-white">$260–$390</strong> (4–6 hrs)</li>
                </ul>
              </div>
            </div>

            {/* Tier 3 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Same-Day &amp; Emergency</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl sm:text-6xl lg:text-7xl text-[#1E2A4A] tracking-wide leading-none mb-1">$100<span className="text-2xl sm:text-3xl text-gray-300">/hr</span></p>
              <div className="w-10 h-[2px] bg-[#A8F0DC] mt-4 mb-5" />
              <p className="text-gray-600 text-sm leading-relaxed mb-5">
                Need a cleaner today? We dispatch a professional to your door within hours. Includes all supplies and equipment — <Link href="/services/same-day-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">same-day cleaning</Link> when you need it most.
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
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">NYC Cleaning Cost Tips — How to Get the Best Value</h3>
              <ul className="space-y-4">
                {[
                  { tip: 'Book recurring service for the best rate', detail: 'Weekly and bi-weekly clients at $59/hour save significantly over one-time deep cleans. A weekly 2-hour clean costs just $98/visit — less than most NYC dinner tabs.' },
                  { tip: 'First cleaning always takes longer', detail: 'Your initial deep clean may run 4–6 hours. After that, recurring maintenance cleanings are typically 2–3 hours because we\'re maintaining — not catching up.' },
                  { tip: 'Provide your own supplies to save 35%', detail: 'The difference between $59/hour and $75/hr is who provides supplies. If you have a vacuum, mop, and basic products, you save $26/hr — that\'s $52+ per visit.' },
                  { tip: 'Declutter before we arrive', detail: 'Our cleaners are most efficient when surfaces are accessible. Less time moving items means more time actually cleaning — better results, lower cost.' },
                  { tip: 'Bundle services for new apartments', detail: 'Moving in? Book a move-in deep clean at $75/hr, then transition to weekly or bi-weekly at $59/hour with your own supplies for ongoing maintenance.' },
                ].map(item => (
                  <li key={item.tip}>
                    <p className="text-[#1E2A4A] font-semibold text-sm mb-1">{item.tip}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-5">What Affects the Cost of House Cleaning in NYC?</h3>
              <ul className="space-y-4">
                {[
                  { factor: 'Apartment size', detail: 'A studio takes 2 hours. A 3-bedroom may take 5–6. We charge by the hour so you only pay for the time your space actually needs — no inflated flat rates.' },
                  { factor: 'Cleaning type', detail: 'A regular maintenance clean is faster than a deep clean. Deep cleans cover inside appliances, baseboards, window tracks, and behind furniture — expect 2x the time.' },
                  { factor: 'Condition of the space', detail: 'A well-maintained home that gets cleaned weekly takes less time than a first-time clean or post-construction job. Recurring clients see lower bills over time.' },
                  { factor: 'Supplies', detail: 'At $59/hour you provide supplies. At $75/hr we bring commercial-grade vacuums, microfiber systems, and professional products. Both options include the same quality of work.' },
                  { factor: 'Urgency', detail: 'Same-day and emergency service is $100/hr because we prioritize your booking and dispatch immediately. Plan ahead to save — most clients book 2–3 days in advance.' },
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
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-2">How NYC Maid Pricing Compares to the Industry</h3>
            <p className="text-gray-500 text-sm max-w-2xl mx-auto mb-6">
              Most NYC cleaning companies charge $75–$120/hr or use opaque flat-rate quotes that hide the true cost. We publish our rates, charge by the hour, and never surprise you with add-on fees. What you see is what you pay.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-1">NYC Average</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-gray-400 tracking-wide">$75–$120/hr</p>
              </div>
              <div className="bg-[#F5FBF8] border border-[#A8F0DC]/30 rounded-xl p-4">
                <p className="text-xs text-[#A8F0DC] font-semibold tracking-wide uppercase mb-1">[Your Business]</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide">$59–$100/hr</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-1">You Save</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#A8F0DC] tracking-wide">25–45%</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/updated-nyc-maid-service-industry-pricing" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                View Full Pricing Details
              </Link>
              <a href={`sms:${phoneDigits}`} className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Text for a Quote
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Client Reviews */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Real NYC House Cleaning Reviews From Verified Clients</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide text-center mb-4">5-Star Rated Maid Service in New York City — Read What Our Clients Say</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-12">
            Every review is from a verified client. From <Link href="/services/deep-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">deep cleaning</Link> and <Link href="/services/apartment-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">apartment cleaning</Link> to <Link href="/services/move-in-move-out-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">move-in/move-out</Link> and <Link href="/services/same-day-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">same-day emergency service</Link> — see why New Yorkers across <Link href="/manhattan-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Manhattan</Link>, <Link href="/brooklyn-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Brooklyn</Link>, <Link href="/queens-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Queens</Link>, <Link href="/long-island-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Long Island</Link> &amp; <Link href="/new-jersey-maid-service" className="text-[#1E2A4A] underline underline-offset-2">New Jersey</Link> rate us 5 stars.
          </p>

          {/* Reviews widget */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Widget header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E2A4A] rounded-full flex items-center justify-center">
                  <span className="text-white text-lg font-bold">M</span>
                </div>
                <div>
                  <span className="text-gray-900 font-semibold text-base sm:text-lg">[Your Business] Reviews</span>
                  <p className="text-gray-400 text-xs">Verified Client Reviews</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-gray-900 font-bold text-xl sm:text-2xl">5.0</span>
                  <span className="text-yellow-400 text-base sm:text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-gray-400 text-xs sm:text-sm">(50+)</span>
                </div>
                <Link href="/reviews/submit" className="hidden sm:inline-block bg-[#1E2A4A] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#243352] transition-colors">
                  Write a Review
                </Link>
              </div>
            </div>

            {/* Review cards grid */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { name: 'Desiree Marie', time: 'Yesterday', text: 'I cannot recommend this company enough! I found myself in a bind and made a last-minute, desperate call at midnight. They answered, were incredibly understanding, and had someone at my door first thing the next morning.', initial: 'D', color: 'bg-emerald-400' },
                  { name: 'Cristina Garelli', time: '5 days ago', text: 'Gloria did such a wonderful job! Came back to my home smelling fresh and clean. She even cleaned all three of my apartment windows!', initial: 'C', color: 'bg-indigo-500' },
                  { name: 'Hailey', time: '6 days ago', text: 'Gloria did an incredible job, very thorough, showed up on time, and did not leave until everything was spotless. Jeff was very easy to coordinate with. Highly recommend!', initial: 'H', color: 'bg-slate-500' },
                  { name: 'Roy Khoury', time: '1 week ago', text: 'Pilar was great, she was very friendly, and thorough with her cleaning, definitely recommend!', initial: 'R', color: 'bg-purple-500' },
                  { name: 'Ofek Inger', time: '2 weeks ago', text: 'Maria did a great job, with a thorough clean of the bathroom and the overall process was very seamless.', initial: 'O', color: 'bg-amber-400' },
                  { name: 'Fanny K.', time: '2 weeks ago', text: 'Amazing cleaner and customer service, should\'ve called this company sooner.', initial: 'F', color: 'bg-violet-400' },
                  { name: 'Jessica Pace', time: '3 weeks ago', text: 'Ines Enriquez was incredible. Loved this job. Worth every penny.', initial: 'J', color: 'bg-cyan-400' },
                  { name: 'Gerianne Perez', time: '3 weeks ago', text: 'Karina was absolutely incredible! She was so thorough, fast, efficient, and left my apartment looking better than I could\'ve imagined.', initial: 'G', color: 'bg-lime-500' },
                  { name: 'Marisa Akson', time: '3 weeks ago', text: 'I was in a stressful situation after another cleaning company canceled on me last minute, and NYC Maid was able to fit me in right away. The cleaner was thorough, friendly, and did an amazing job.', initial: 'M', color: 'bg-fuchsia-400' },
                  { name: 'David Rold', time: '4 weeks ago', text: 'Fantastic service! On time and very thorough', initial: 'D', color: 'bg-yellow-500' },
                  { name: 'Ashley Austin', time: '4 weeks ago', text: 'Gloria my cleaner was really great! She deep cleaned very well, and the company made sure they got me in a same day fast request!', initial: 'A', color: 'bg-red-400' },
                  { name: 'Jordan Chacon', time: '5 weeks ago', text: 'Gloria was amazing! This was our first time using this service and it definitely won\'t be the last. I don\'t think I\'ve ever seen my fridge this clean before!!', initial: 'J', color: 'bg-green-400' },
                  { name: 'Giana Horigan', time: '5 weeks ago', text: 'Karina just came and cleaned our whole apartment and it was spotless! The rate was a lot better than other cleaning services I have used for a deep clean.', initial: 'G', color: 'bg-blue-500' },
                  { name: 'Shannon Atran', time: '6 weeks ago', text: 'Karina was incredible. She was extremely meticulous and left my apt spotless. 10/10; will definitely use again.', initial: 'S', color: 'bg-orange-500' },
                  { name: 'Lindsey Hill', time: '7 weeks ago', text: 'Awesome cleaners and very responsive. I\'ve used them for several months now for my 3 bed 3 bath walk up in Hell\'s Kitchen. Karina is my cleaner. She is so sweet and warm and lovely.', initial: 'L', color: 'bg-pink-500' },
                  { name: 'Brad Lieberman', time: '9 weeks ago', text: 'Jeff is a real gem. Super communicative easy going and responsive. In a city with a lot of fly by night operations, NYC Maids is the real deal.', initial: 'B', color: 'bg-teal-500' },
                  { name: 'Kelly Gay', time: '13 weeks ago', text: 'What a gift to have found [Your Business] and Jeff, the owner! The cleaner did a wonderful job — thorough, detail-oriented, and left everything spotless.', initial: 'K', color: 'bg-pink-400' },
                  { name: 'Mona Abdel-Misih', time: '17 weeks ago', text: 'Needed a deep clean before moving in. It was amazing to place a phone call and have someone show up the next day. Highly recommend!', initial: 'M', color: 'bg-orange-400' },
                  { name: 'Ricky Foschi', time: '9 weeks ago', text: 'The services was amazing from beginning to end. Not just in quality but also in attitude. Karina was incredibly thorough.', initial: 'R', color: 'bg-green-500' },
                  { name: 'Natalie Pita', time: '9 weeks ago', text: 'Fantastic experience. Price is affordable for great service. I\'ve been more than happy each time, and staff is very friendly.', initial: 'N', color: 'bg-teal-400' },
                  { name: 'Alexandra Spieth', time: '20 weeks ago', text: 'Have used NYC Maid twice and have had a great experience both times. Maria was thorough, prompt, and awesome. Highly recommend!', initial: 'A', color: 'bg-purple-400' },
                  { name: 'Ella Sultan', time: '8 weeks ago', text: 'Fantastic job! Super fast and easy communication and was booked a day before. Will be using them again and recommending to friends :)', initial: 'E', color: 'bg-blue-400' },
                  { name: 'Kelsey Wheeler', time: '9 weeks ago', text: 'Great experience. Texted the number on their website on Saturday and had a deep cleaning scheduled for that following Monday at 9am.', initial: 'K', color: 'bg-indigo-400' },
                  { name: 'Will Gags', time: '19 weeks ago', text: 'Maria is the grandmother you didn\'t know you needed. Couldn\'t recommend a more trustworthy and tidy business.', initial: 'W', color: 'bg-rose-400' },
                ].map((review, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={`w-8 h-8 ${review.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {review.initial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{review.name}</p>
                          <svg className="w-3.5 h-3.5 text-[#1E2A4A] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                        </div>
                        <p className="text-xs text-gray-400">{review.time}</p>
                      </div>
                    </div>
                    <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                    <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/reviews" className="text-[#1E2A4A] font-semibold hover:underline underline-offset-4">Read All Reviews &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-gradient-to-b from-[#1E2A4A] to-[#243352]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[#A8F0DC]/70 tracking-[0.25em] uppercase mb-3 text-center">Professional NYC Apartment &amp; House Cleaning Services</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide text-center mb-4">Deep Cleaning, Regular Maid Service &amp; More in New York City</h2>
          <p className="text-blue-200/60 text-center max-w-3xl mx-auto mb-14">
            From <Link href="/services/weekly-maid-service-in-nyc" className="text-[#A8F0DC] underline underline-offset-2">weekly maid service</Link> and <Link href="/services/deep-cleaning-service-in-nyc" className="text-[#A8F0DC] underline underline-offset-2">deep cleaning</Link> to <Link href="/services/move-in-move-out-cleaning-service-in-nyc" className="text-[#A8F0DC] underline underline-offset-2">move-in/move-out cleaning</Link>, <Link href="/services/post-construction-cleanup-service-in-nyc" className="text-[#A8F0DC] underline underline-offset-2">post-renovation cleanup</Link>, and <Link href="/services/same-day-cleaning-service-in-nyc" className="text-[#A8F0DC] underline underline-offset-2">same-day emergency cleaning</Link> — we handle every type of residential cleaning across the NYC metro area. All cleaners are background-checked, licensed, and insured.
          </p>
          <ServiceGrid />
          <div className="text-center mt-10">
            <Link href="/nyc-maid-service-services-offered-by-the-nyc-maid" className="text-[#A8F0DC] font-semibold hover:underline underline-offset-4">Browse All NYC Cleaning Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Insured Up To $1,000,000 NYC Cleaning Company</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide leading-tight mb-6">Why Thousands of New Yorkers Trust [Your Business]</h2>
            <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              We provide personalized, hourly <Link href="/updated-nyc-maid-service-industry-pricing" className="text-[#1E2A4A] underline underline-offset-2">cleaning service pricing</Link> for each unique space — ensuring high-quality cleaning tailored to your needs. No contracts, no hidden fees, no surprises.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Every cleaner on our team is fully background-checked and insured. Whether you need a <Link href="/services/apartment-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">regular apartment cleaning</Link> in <Link href="/manhattan-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Manhattan</Link>, a <Link href="/services/deep-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">deep clean</Link> in <Link href="/brooklyn-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Brooklyn</Link>, or <Link href="/services/airbnb-cleaning-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">Airbnb turnover cleaning</Link> in <Link href="/queens-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Queens</Link> — we&apos;ve got you covered. <Link href="/about-the-nyc-maid-service-company" className="text-[#1E2A4A] underline underline-offset-2">Learn more about our company</Link>.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a href={`sms:${phoneDigits}`} className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Text Us
              </a>
              <a href={`sms:${phoneDigits}`} className="inline-block text-[#1E2A4A] font-semibold py-3.5 hover:underline underline-offset-4">
                or Text {phone}
              </a>
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-8">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-6">Background-Checked, Insured &amp; 5-Star Rated</h3>
            <ul className="space-y-4">
              {[
                { icon: '\u{1F6E1}', text: 'Full general liability insurance and bonding on every visit' },
                { icon: '\u{1F4CB}', text: 'Every cleaner is thoroughly background-checked before hire' },
                { icon: '\u{1F3E0}', text: 'Trained in NYC apartment care — pre-war to high-rise' },
                { icon: '\u2B50', text: '5.0-star rating with 27 verified client reviews' },
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

      {/* Testimonials */}
      <section className="bg-[#A8F0DC] py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#1E2A4A]/50 tracking-[0.25em] uppercase mb-6">Real NYC Cleaning Service Reviews From Verified Customers</p>
          <p className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#1E2A4A] tracking-wide leading-relaxed mb-6">
            &ldquo;{testimonials[0].text}&rdquo;
          </p>
          <p className="text-[#1E2A4A]/70 font-medium tracking-wide">&mdash; {testimonials[0].name}, {testimonials[0].location}</p>
          <div className="mt-8">
            <Link href="/reviews" className="text-[#1E2A4A] font-semibold text-sm tracking-wide hover:underline underline-offset-4">Read All NYC Maid Service Reviews &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Why Clients Choose Us */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">What Makes [Your Business] Different From Other NYC Cleaning Services</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide text-center mb-4">Why Clients Choose [Your Business] Over Every Other Cleaning Company</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-14">
            No money upfront — you pay only after your cleaning is complete. Flat <Link href="/updated-nyc-maid-service-industry-pricing" className="text-[#1E2A4A] underline underline-offset-2">hourly pricing</Link> with no surprise fees. Experienced, professional cleaners — not random gig workers. <Link href="/services/weekly-maid-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">Weekly</Link> and <Link href="/services/bi-weekly-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">bi-weekly recurring service</Link> available. No contracts — stay because you&apos;re happy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Transparent NYC Cleaning Service Scheduling</h3>
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
                  'Accepted methods: Zelle ([email]) or Apple Pay',
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
              <h3 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Consistent Quality NYC Home Cleaning Standards</h3>
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
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">Professional Background-Checked NYC House Cleaners</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-6">Our Cleaners Are Paid Well, Equipped &amp; Treated Right</h2>
            <div className="w-12 h-[2px] bg-[#A8F0DC] mb-6" />
            <p className="text-gray-600 leading-relaxed mb-5">
              We don&apos;t cut corners on the people who do the work. Our cleaners are experienced professionals — not gig workers pulled from an app. They bring their own professional supplies and equipment, they&apos;re paid well, and they&apos;re paid immediately. Happy cleaners do better work, every time.
            </p>
            <p className="text-gray-600 leading-relaxed mb-5">
              Every cleaner goes through a thorough background check and vetting process before they ever step foot in your home. We don&apos;t use staffing agencies or subcontractors — our team is built on trust, consistency, and pride in the work. When you book with us, you get someone who genuinely cares about doing a great job.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              That&apos;s why our clients in <Link href="/upper-west-side-maid-service" className="text-[#1E2A4A] underline underline-offset-2">the Upper West Side</Link>, <Link href="/park-slope-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Park Slope</Link>, <Link href="/long-island-city-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Long Island City</Link>, and <Link href="/jersey-city-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Jersey City</Link> keep rebooking — they know exactly who&apos;s coming, and they trust them completely.
            </p>
            <Link href="/available-nyc-maid-jobs" className="text-[#1E2A4A] font-semibold text-sm hover:underline underline-offset-4">Join Our Cleaning Team &rarr;</Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-3">The Ideal NYC Maid Service Client</p>
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

      {/* Areas */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Maid Service Across Manhattan, Brooklyn, Queens, Long Island &amp; New Jersey</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#1E2A4A] tracking-wide text-center mb-4">225+ NYC Neighborhoods Served by Professional Cleaners</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-14">
            From the <Link href="/upper-east-side-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Upper East Side</Link> and <Link href="/tribeca-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Tribeca</Link> to <Link href="/brooklyn-heights-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Brooklyn Heights</Link>, <Link href="/astoria-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Astoria</Link>, <Link href="/great-neck-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Great Neck</Link>, and <Link href="/hoboken-maid-service" className="text-[#1E2A4A] underline underline-offset-2">Hoboken</Link> — our insured, background-checked cleaners are already in your neighborhood. Same rates everywhere, no travel fees.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
            {/* Manhattan */}
            <div>
              <Link href="/manhattan-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">Manhattan</h3>
                <p className="text-xs text-gray-400 tracking-[0.15em] uppercase">New York</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'Upper East Side', slug: 'upper-east-side-maid-service' },
                  { name: 'Upper West Side', slug: 'upper-west-side-maid-service' },
                  { name: 'Midtown', slug: 'midtown-manhattan-maid-service' },
                  { name: 'Hell\'s Kitchen', slug: 'hells-kitchen-maid-service' },
                  { name: 'Chelsea', slug: 'chelsea-maid-service' },
                  { name: 'Gramercy', slug: 'gramercy-maid-service' },
                  { name: 'Murray Hill', slug: 'murray-hill-maid-service' },
                  { name: 'West Village', slug: 'west-village-maid-service' },
                  { name: 'Greenwich Village', slug: 'greenwich-maid-service' },
                  { name: 'East Village', slug: 'east-village-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-gray-600 hover:text-[#1E2A4A] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/manhattan-maid-service" className="text-sm text-[#1E2A4A] font-semibold hover:underline underline-offset-4">All Manhattan &rarr;</Link></li>
              </ul>
            </div>

            {/* Brooklyn */}
            <div>
              <Link href="/brooklyn-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">Brooklyn</h3>
                <p className="text-xs text-gray-400 tracking-[0.15em] uppercase">New York</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'Brooklyn Heights', slug: 'brooklyn-heights-maid-service' },
                  { name: 'DUMBO', slug: 'dumbo-maid-service' },
                  { name: 'Park Slope', slug: 'park-slope-maid-service' },
                  { name: 'Williamsburg', slug: 'williamsburg-maid-service' },
                  { name: 'Cobble Hill', slug: 'cobble-hill-maid-service' },
                  { name: 'Carroll Gardens', slug: 'carroll-gardens-maid-service' },
                  { name: 'Fort Greene', slug: 'fort-greene-maid-service' },
                  { name: 'Clinton Hill', slug: 'clinton-hill-maid-service' },
                  { name: 'Boerum Hill', slug: 'boerum-hill-maid-service' },
                  { name: 'Red Hook', slug: 'red-hook-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-gray-600 hover:text-[#1E2A4A] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/brooklyn-maid-service" className="text-sm text-[#1E2A4A] font-semibold hover:underline underline-offset-4">All Brooklyn &rarr;</Link></li>
              </ul>
            </div>

            {/* Queens */}
            <div>
              <Link href="/queens-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">Queens</h3>
                <p className="text-xs text-gray-400 tracking-[0.15em] uppercase">New York</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'Long Island City', slug: 'long-island-city-maid-service' },
                  { name: 'Astoria', slug: 'astoria-maid-service' },
                  { name: 'Hunters Point', slug: 'hunters-point-maid-service' },
                  { name: 'Sunnyside', slug: 'sunnyside-maid-service' },
                  { name: 'Jackson Heights', slug: 'jackson-heights-maid-service' },
                  { name: 'Forest Hills', slug: 'forest-hills-maid-service' },
                  { name: 'Flushing', slug: 'flushing-maid-service' },
                  { name: 'Bayside', slug: 'bayside-maid-service' },
                  { name: 'Roosevelt Island', slug: 'roosevelt-island-maid-service' },
                  { name: 'Ditmars Steinway', slug: 'ditmars-steinway-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-gray-600 hover:text-[#1E2A4A] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/queens-maid-service" className="text-sm text-[#1E2A4A] font-semibold hover:underline underline-offset-4">All Queens &rarr;</Link></li>
              </ul>
            </div>

            {/* Long Island */}
            <div>
              <Link href="/long-island-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">Long Island</h3>
                <p className="text-xs text-gray-400 tracking-[0.15em] uppercase">New York</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'Great Neck', slug: 'great-neck-maid-service' },
                  { name: 'Manhasset', slug: 'manhasset-maid-service' },
                  { name: 'Port Washington', slug: 'port-washington-maid-service' },
                  { name: 'Sands Point', slug: 'sands-point-maid-service' },
                  { name: 'Roslyn', slug: 'roslyn-maid-service' },
                  { name: 'Roslyn Heights', slug: 'roslyn-heights-maid-service' },
                  { name: 'Old Westbury', slug: 'old-westbury-maid-service' },
                  { name: 'Brookville', slug: 'brookville-maid-service' },
                  { name: 'Glen Cove', slug: 'glen-cove-maid-service' },
                  { name: 'Garden City', slug: 'garden-city-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-gray-600 hover:text-[#1E2A4A] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/long-island-maid-service" className="text-sm text-[#1E2A4A] font-semibold hover:underline underline-offset-4">All Long Island &rarr;</Link></li>
              </ul>
            </div>

            {/* New Jersey */}
            <div>
              <Link href="/new-jersey-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide group-hover:text-[#1E2A4A]/70 transition-colors">New Jersey</h3>
                <p className="text-xs text-gray-400 tracking-[0.15em] uppercase">NJ</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'Jersey City', slug: 'jersey-city-maid-service' },
                  { name: 'Hoboken', slug: 'hoboken-maid-service' },
                  { name: 'Weehawken', slug: 'weehawken-maid-service' },
                  { name: 'Bayonne', slug: 'bayonne-maid-service' },
                  { name: 'Union City', slug: 'union-city-maid-service' },
                  { name: 'North Bergen', slug: 'north-bergen-maid-service' },
                  { name: 'Cliffside Park', slug: 'cliffside-park-maid-service' },
                  { name: 'Edgewater', slug: 'edgewater-maid-service' },
                  { name: 'Fort Lee', slug: 'fort-lee-maid-service' },
                  { name: 'West New York', slug: 'west-new-york-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-gray-600 hover:text-[#1E2A4A] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/new-jersey-maid-service" className="text-sm text-[#1E2A4A] font-semibold hover:underline underline-offset-4">All New Jersey &rarr;</Link></li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/service-areas-served-by-the-nyc-maid" className="text-[#1E2A4A] font-semibold hover:underline underline-offset-4">Browse All 225+ Neighborhoods &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3">Earn Passive Income With Our NYC Cleaning Referral Program</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-4">Get Paid 10% Every Time Your Referral Books a Cleaning</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8">
            Refer friends, family, or neighbors to [Your Business] and earn 10% recurring commission on every cleaning they book — not just the first. Paid via Zelle or Apple Cash after each completed visit. No limit on referrals, no cap on earnings.
          </p>
          <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" target="_blank" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
            Join the Referral Program &rarr;
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={homepageFAQs} title="NYC House Cleaning Service — Frequently Asked Questions &amp; Answers" columns={2} />

      <CTABlock title="Book Your NYC Cleaning Service Today" subtitle="Text us — trusted by thousands of New Yorkers across Manhattan, Brooklyn, Queens, Long Island &amp; New Jersey." />
    </>
  )
}
