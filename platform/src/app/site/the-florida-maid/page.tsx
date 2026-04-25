import type { Metadata } from 'next'
import Link from 'next/link'
import { homepageContent } from '@/app/site/the-florida-maid/_lib/seo/content'
import { homepageSchemas, faqSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import ServiceGrid from '@/app/site/the-florida-maid/_components/marketing/ServiceGrid'
import TrustBadges from '@/app/site/the-florida-maid/_components/marketing/TrustBadges'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'
import FAQSection from '@/app/site/the-florida-maid/_components/marketing/FAQSection'


const content = homepageContent()

export const metadata: Metadata = {
  title: { absolute: content.title },
  description: content.metaDescription,
  alternates: { canonical: 'https://www.thefloridamaid.com' },
  openGraph: {
    title: content.title,
    description: content.metaDescription,
    url: 'https://www.thefloridamaid.com',
    siteName: 'The Florida Maid',
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
    'geo.region': 'US-FL',
    'geo.placename': 'Florida',
    'geo.position': '25.7617;-80.1918',
    'ICBM': '25.7617, -80.1918',
  },
}

const testimonials = [
  { text: 'We just had our apartment painted and needed a deep clean to get rid of loads of dust. Florida Maid sent a wonderful cleaner who was prompt, professional and did an amazing job. Highly recommend!!!', name: 'Julie Salamon', location: 'Florida' },
  { text: 'Best cleaning service I\'ve used in the 20 years I\'ve lived in Florida! Consistently efficient, thorough...', name: 'Courtney Gamble', location: 'Florida' },
  { text: 'After trying three different cleaning companies in Florida, The Florida Maid is hands down the most affordable and thorough.', name: 'Jenna M', location: 'Florida' },
]

const homepageFAQs = [
  // Pricing & Booking
  { question: 'How much does house cleaning cost in Florida?', answer: 'Our house cleaning services start at $49/hour when you provide supplies, or $65/hour when we bring everything. Same-day and emergency service is $100/hour. Final cost depends on home size and service type.' },
  { question: 'Do you charge by the hour or a flat rate?', answer: 'We charge by the hour. This keeps pricing fair — you only pay for the time your space actually needs. No inflated flat-rate quotes.' },
  { question: 'Is there a minimum number of hours?', answer: 'We have a 2-hour minimum for most bookings. This ensures our cleaners have enough time to deliver a thorough, quality clean.' },
  { question: 'How do I book a cleaning?', answer: 'Text or call us at (954) 710-3636. We typically schedule within 24-48 hours, with same-day availability for urgent requests.' },
  { question: 'Can I book online?', answer: 'Yes! You can book directly through our website. Just click "Book Online" in the menu, or text us if you prefer a personal touch.' },
  { question: 'Do you offer same-day cleaning?', answer: 'Yes. Same-day and emergency cleaning is available at $100/hour. We dispatch a professional cleaner to your door within hours.' },
  { question: 'What payment methods do you accept?', answer: 'We accept credit cards, debit cards, Zelle (hi@thefloridamaid.com), Venmo, Apple Pay, and cash. You can also pay securely online through our payment portal.' },
  { question: 'Do I need to tip my cleaner?', answer: 'Tipping is never required but always appreciated. If you feel your cleaner did a great job, a tip is a wonderful way to show it.' },

  // Services
  { question: 'What types of cleaning do you offer?', answer: 'We offer regular home cleaning, deep cleaning, move-in/move-out cleaning, post-construction cleanup, weekly/bi-weekly/monthly service, Airbnb turnover cleaning, same-day cleaning, and office cleaning.' },
  { question: 'What is included in a regular cleaning?', answer: 'A regular cleaning covers dusting, vacuuming, mopping, kitchen cleaning (counters, sink, appliances), bathroom cleaning (toilet, tub, sink, mirror), and general tidying of all rooms.' },
  { question: 'What is included in a deep cleaning?', answer: 'A deep clean covers everything in a regular clean plus inside appliances (oven, fridge), baseboards, light fixtures, window sills, behind furniture, inside cabinets, and detailed scrubbing of all surfaces.' },
  { question: 'Do you offer move-in/move-out cleaning?', answer: 'Yes. Our move-in/move-out service is designed to get your home spotless for the next occupant or ready for you to settle in. We clean every surface, inside cabinets, appliances, and more.' },
  { question: 'Do you clean offices and commercial spaces?', answer: 'Yes. We offer office cleaning for small to mid-size commercial spaces across Florida. Contact us for a custom quote.' },
  { question: 'Can you clean after a renovation or construction?', answer: 'Absolutely. Post-construction cleanup is one of our specialties. We remove dust, debris, paint splatters, and get your space move-in ready.' },
  { question: 'Do you offer Airbnb and short-term rental cleaning?', answer: 'Yes. We provide fast-turnaround Airbnb cleaning between guests — fresh linens, restocked supplies, and a spotless space for your next booking.' },
  { question: 'Can I customize what gets cleaned?', answer: 'Of course. Just let us know your priorities and we will tailor the cleaning to focus on what matters most to you.' },

  // Supplies & Equipment
  { question: 'Do you bring your own cleaning supplies?', answer: 'We offer both options. At $49/hour, you provide supplies. At $65/hour (normally $75), we bring all professional-grade supplies and equipment.' },
  { question: 'What cleaning products do you use?', answer: 'We use professional-grade, effective cleaning products. If you have preferences for eco-friendly or specific brands, just let us know and we will accommodate.' },
  { question: 'Can I request eco-friendly or green products?', answer: 'Yes. We are happy to use eco-friendly, non-toxic, or hypoallergenic products. Just mention your preference when booking.' },
  { question: 'Do I need to provide a vacuum or mop?', answer: 'If you choose our $49/hour rate, yes — you provide all supplies and equipment. At $65/hour, we bring everything including vacuums, mops, and all cleaning tools.' },

  // Trust & Safety
  { question: 'Are your cleaners background-checked and insured?', answer: 'Yes. Every cleaner on our team is fully background-checked, licensed, and insured. We carry general liability insurance and bonding for your complete peace of mind.' },
  { question: 'Are your cleaners employees or contractors?', answer: 'Our cleaners are vetted professionals who work with us regularly. Every cleaner is background-checked and trained to our quality standards.' },
  { question: 'Do you carry liability insurance?', answer: 'Yes. We carry full general liability insurance and bonding. Your home and belongings are protected on every visit.' },
  { question: 'What if something is damaged during cleaning?', answer: 'We carry liability insurance for exactly this reason. If anything is damaged, contact us immediately and we will resolve it. Your property is always protected.' },
  { question: 'Can I request the same cleaner each time?', answer: 'Yes. We do our best to match you with the same cleaner for recurring appointments. Consistency matters and we know you want someone you trust.' },
  { question: 'Will I need to be home during the cleaning?', answer: 'It is up to you. Many clients leave a key, provide door codes, or arrange access with their doorman. You are welcome to be home or out — whatever is most comfortable.' },

  // Scheduling & Policies
  { question: 'How far in advance should I book?', answer: 'We recommend booking 2-3 days in advance for regular cleanings. For same-day service, contact us as early as possible and we will do our best to accommodate.' },
  { question: 'What is your cancellation policy?', answer: 'We ask for 24 hours notice for cancellations or rescheduling. Same-day cancellations may be subject to a fee. We understand things come up and always try to be flexible.' },
  { question: 'Can I reschedule my cleaning?', answer: 'Of course. Just text or call us at least 24 hours before your appointment and we will find a new time that works for you.' },
  { question: 'What days and hours are you available?', answer: 'Our office is open Monday through Saturday 7am–7pm. Our sales and booking line is available 24/7 — call or text (954) 710-3636 anytime.' },
  { question: 'Do you clean on weekends?', answer: 'Yes, we offer Saturday appointments from 7am–7pm. Sunday availability may be limited — contact us to check.' },
  { question: 'Do you offer recurring cleaning schedules?', answer: 'Yes. We offer weekly, bi-weekly, and monthly recurring cleaning. Recurring clients get priority scheduling and a consistent cleaner.' },

  // Areas & Coverage
  { question: 'What areas do you serve?', answer: 'We serve all of Miami-Dade, Broward, Palm Beach, Hillsborough, and Orange Counties across Florida. We cover 225+ neighborhoods across Florida.' },
  { question: 'Do you serve Tampa Bay?', answer: 'Yes. We serve all Tampa Bay neighborhoods including South Tampa, St. Petersburg, Clearwater, Brandon, Wesley Chapel, Largo, Dunedin, Safety Harbor, and many more.' },
  { question: 'Do you serve Orlando?', answer: 'Yes. We cover Winter Park, Lake Nona, Kissimmee, Dr. Phillips, Celebration, Windermere, Sanford, Altamonte Springs, and neighborhoods throughout the Orlando metro.' },
  { question: 'Do you serve Jacksonville?', answer: 'Yes. We serve Jacksonville Beach, Ponte Vedra, San Marco, Riverside, Avondale, Mandarin, and communities across the Jacksonville area.' },
  { question: 'Do you serve Southwest Florida?', answer: 'Yes. We cover Naples, Fort Myers, Cape Coral, Bonita Springs, Estero, Marco Island, and communities throughout Southwest Florida.' },
  { question: 'Do you serve Miami Beach?', answer: 'Yes. Miami Beach is one of our most popular service areas. We clean homes and condos throughout South Beach, Mid-Beach, and North Beach regularly.' },
  { question: 'Is there a travel fee for areas outside major cities?', answer: 'No travel fees. Our pricing is the same across all service areas — Miami, Tampa, Orlando, Fort Lauderdale, and Jacksonville.' },

  // Quality & Satisfaction
  { question: 'What if I am not happy with the cleaning?', answer: 'Your satisfaction is guaranteed. If you are not happy with any aspect of the clean, contact us within 24 hours and we will send someone back to make it right at no extra charge.' },
  { question: 'How do you maintain quality?', answer: 'We use detailed checklists, conduct regular quality reviews, and only work with experienced, vetted cleaners. Every clean is held to the same high standard.' },
  { question: 'Do you have reviews I can read?', answer: 'Yes! We have a 5.0-star Google rating. You can read verified reviews on our Reviews page or on Google directly.' },
  { question: 'How long have you been in business?', answer: 'The Florida Maid has been serving the Florida metro area since 2018. We have cleaned thousands of homes and built a loyal client base through consistent quality.' },

  // Special Situations
  { question: 'Can you clean if I have pets?', answer: 'Absolutely. We love pets! Just let us know so we can plan accordingly. We are experienced with homes that have dogs, cats, and other animals.' },
  { question: 'Do you clean high-rise apartments?', answer: 'Yes. We regularly clean in high-rise condos across Miami, Fort Lauderdale, and Tampa. We are comfortable working with building management, concierge services, and HOA requirements.' },
  { question: 'Can you clean a studio or condo?', answer: 'Of course. Studios, condos, one-bedrooms, and small spaces are no problem. Our 2-hour minimum is usually perfect for a thorough studio or condo clean.' },
  { question: 'Do you clean Florida homes?', answer: 'Yes. Our cleaners are experienced with the unique features of Florida homes — hardwood floors, crown molding, older fixtures, and everything that makes them special.' },
  { question: 'Can you help prepare for a party or event?', answer: 'Yes. We offer pre-event and post-event cleaning. Get your place guest-ready before, or let us handle the cleanup after.' },

  // Referral & Extras
  { question: 'Do you have a referral program?', answer: 'Yes! Refer a friend and earn 10% commission on every cleaning they book — not just the first one. It is recurring income for as long as they stay a client. Sign up on our Referral Program page.' },
  { question: 'How do I contact you?', answer: 'Text or call (954) 710-3636, or email hi@thefloridamaid.com. Texting is the fastest way to reach us.' },
]

export default function HomePage() {
  const schemas = [...homepageSchemas(), faqSchema(homepageFAQs)]

  return (
    <>
      <JsonLd data={schemas} />

      {/* Hero with pricing */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] pt-12 md:pt-16 pb-14 md:pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Social proof bar */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <a href="https://share.google/Iq9oblq3vJr07aP27" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-white text-sm font-medium underline underline-offset-2">5.0 on Google</span>
            </a>
            <span className="text-white/20 hidden sm:inline">|</span>
            <a href="https://www.bbb.org/" target="_blank" rel="noopener noreferrer" className="text-white text-sm font-medium underline underline-offset-2 hover:text-white transition-colors">A Rating on BBB</a>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-white text-sm font-medium">Trusted by Floridians Since 2018</span>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-white text-sm font-medium">Licensed &amp; Insured</span>
          </div>

          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-white tracking-wide leading-[0.95] mb-6">
            {content.h1}
          </h1>
          <p className="text-white text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
            Professional house cleaning across Miami, Tampa, Orlando, Fort Lauderdale &amp; Jacksonville. Background-checked cleaners, transparent pricing, and no surprises.
          </p>

          {/* Hero trust points */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-14">
            <span className="text-[#34D399] text-sm font-medium">&#10003; No money upfront</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; Payment upon completion</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; No contracts</span>
            <span className="text-[#34D399] text-sm font-medium">&#10003; Flat hourly pricing</span>
          </div>

          {/* Pricing tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <p className="text-xs font-semibold text-[#E8732A] tracking-[0.2em] uppercase mb-3">Client Supplies &amp; Equipment</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-black tracking-wide">$49<span className="text-2xl text-black/40">/hr</span></p>
              <p className="text-black text-sm mt-3">You provide the cleaning supplies and equipment. We bring the expertise.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 relative shadow-lg border-2 border-[#34D399]">
              <div className="absolute -top-3 left-6 bg-[#34D399] text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">Most Popular</div>
              <p className="text-xs font-semibold text-[#E8732A] tracking-[0.2em] uppercase mb-3">We Bring Everything</p>
              <div className="flex items-baseline gap-3">
                <p className="font-[family-name:var(--font-bebas)] text-5xl text-black tracking-wide">$65<span className="text-2xl text-black/40">/hr</span></p>
                <p className="text-black/30 line-through text-lg">$75</p>
              </div>
              <p className="text-black text-sm mt-3">We bring all supplies and professional-grade equipment. Just open the door.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <p className="text-xs font-semibold text-[#E8732A] tracking-[0.2em] uppercase mb-3">Same-Day / Emergency</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-black tracking-wide">$100<span className="text-2xl text-black/40">/hr</span></p>
              <p className="text-black text-sm mt-3">Need it today? We dispatch a professional cleaner to your door within hours.</p>
            </div>
          </div>

          {/* CTA: book, text, or call */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Link href="/clients/collect" className="bg-white text-[#CC6222] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-gray-100 transition-colors">
              Book Online Now
            </Link>
            <a href="sms:9547103636" className="bg-[#34D399] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Text (954) 710-3636
            </a>
            <a href="tel:9547103636" className="text-white font-medium text-lg py-4 hover:text-white/80 transition-colors underline underline-offset-4">
              or Call Us
            </a>
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left — story */}
            <div>
              <p className="text-xs font-semibold text-black tracking-[0.25em] uppercase mb-3">Florida&apos;s Trusted Home Cleaning Company Since 2018</p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#CC6222] tracking-wide leading-tight mb-4">Welcome to The Florida Maid</h2>
              <div className="w-12 h-[2px] bg-[#34D399] mb-6" />
              <p className="text-black text-lg leading-relaxed mb-5">
                We&apos;re a small, dedicated cleaning company that treats every home like our own. No apps, no algorithms, no random strangers — just experienced, professional cleaners who show up on time, do beautiful work, and earn your trust visit after visit.
              </p>
              <p className="text-black leading-relaxed mb-5">
                Whether it&apos;s a <Link href="/services/weekly-maid-service-in-florida" className="text-[#CC6222] underline underline-offset-2">weekly cleaning</Link> for your <Link href="/miami-beach-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami Beach</Link> home, a <Link href="/services/deep-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">deep clean</Link> before guests arrive in <Link href="/coral-gables-maid-service" className="text-[#CC6222] underline underline-offset-2">Coral Gables</Link>, or a <Link href="/services/move-in-move-out-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">move-out clean</Link> in <Link href="/fort-lauderdale-maid-service" className="text-[#CC6222] underline underline-offset-2">Fort Lauderdale</Link> — we handle it all with care, attention to detail, and genuine pride in what we do.
              </p>
              <p className="text-black leading-relaxed mb-5">
                We serve over <Link href="/service-areas-served-by-the-florida-maid" className="text-[#CC6222] underline underline-offset-2">225 neighborhoods</Link> across <Link href="/miami-dade-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami-Dade</Link>, <Link href="/broward-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Broward</Link>, <Link href="/palm-beach-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Palm Beach</Link>, <Link href="/tampa-bay-maid-service" className="text-[#CC6222] underline underline-offset-2">Tampa Bay</Link>, and <Link href="/orlando-maid-service" className="text-[#CC6222] underline underline-offset-2">Orlando</Link>. Every cleaner is background-checked, insured, and paid fairly. We don&apos;t cut corners — on your home or on our people.
              </p>
              <p className="text-black leading-relaxed mb-5">
                Our clients aren&apos;t looking for the cheapest option — they&apos;re looking for someone they can rely on. Someone who remembers how they like their kitchen cleaned, who notices the details, and who treats their space with respect. That&apos;s what we do. It&apos;s why families in <Link href="/brickell-maid-service" className="text-[#CC6222] underline underline-offset-2">Brickell</Link>, <Link href="/south-beach-maid-service" className="text-[#CC6222] underline underline-offset-2">South Beach</Link>, <Link href="/winter-park-maid-service" className="text-[#CC6222] underline underline-offset-2">Winter Park</Link>, and <Link href="/naples-maid-service" className="text-[#CC6222] underline underline-offset-2">Naples</Link> keep us coming back week after week.
              </p>
              <p className="text-black leading-relaxed mb-8">
                We started in 2018 with one cleaner and a commitment to doing things the right way. Today we&apos;re one of the highest-rated cleaning companies in Florida — not because we&apos;re the biggest, but because we care the most. Read our <Link href="/florida-customer-reviews-for-the-florida-maid" className="text-[#CC6222] underline underline-offset-2">customer reviews</Link> and see for yourself.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/about-the-florida-maid-service-company" className="inline-block bg-[#CC6222] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
                  Learn More About Us
                </Link>
                <a href="sms:9547103636" className="inline-block bg-[#34D399] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Text Us
                </a>
                <a href="tel:9547103636" className="text-[#CC6222] font-semibold hover:underline underline-offset-4">
                  or Call (954) 710-3636
                </a>
              </div>
            </div>

            {/* Right — at a glance + quick stats */}
            <div className="space-y-6">
              <div className="bg-[#F5FBF8] border border-[#34D399]/30 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-5">The Florida Maid at a Glance</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">2018</p>
                    <p className="text-black text-sm">Founded</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">5.0</p>
                    <p className="text-black text-sm">Google Rating</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">225+</p>
                    <p className="text-black text-sm">Neighborhoods</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide">$49</p>
                    <p className="text-black text-sm">Starting Rate/Hr</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl p-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-5">What You Can Expect</h3>
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
                      <span className="text-[#34D399] mt-0.5 text-lg">&#10003;</span>
                      <span className="text-black text-[15px]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Pricing Deep Dive */}
      <section className="py-20 bg-[#34D399]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-white/70 tracking-[0.25em] uppercase mb-3 text-center">Florida Maid Service Pricing Explained — Hourly Rates, Average Costs &amp; What to Expect</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#CC6222] tracking-wide text-center mb-4">How Much Does House Cleaning Cost in Florida?</h2>
          <p className="text-white text-center max-w-3xl mx-auto mb-14">
            We keep it simple: flat hourly rates, no hidden fees, no contracts. Choose the option that fits your situation. Every tier includes the same professional, <Link href="/about-the-florida-maid-service-company" className="text-[#CC6222] font-semibold underline underline-offset-2">background-checked cleaners</Link> — the only difference is who brings the supplies. See our full <Link href="/updated-florida-maid-service-industry-pricing" className="text-[#CC6222] font-semibold underline underline-offset-2">pricing page</Link> for more details.
          </p>

          {/* 3 pricing cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16 items-start">
            {/* Tier 1 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
              <p className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">Client Supplies &amp; Equipment</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl sm:text-6xl lg:text-7xl text-[#CC6222] tracking-wide leading-none mb-1">$49<span className="text-2xl sm:text-3xl text-black">/hr</span></p>
              <div className="w-10 h-[2px] bg-[#34D399] mt-4 mb-5" />
              <p className="text-black text-sm leading-relaxed mb-5">
                You provide all cleaning supplies, equipment, and products. We bring an experienced, background-checked professional cleaner who does the work.
              </p>
              <p className="text-xs font-semibold text-black tracking-[0.15em] uppercase mb-3">Best For</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Budget-conscious clients who already own supplies',
                  'Recurring weekly or bi-weekly clients looking for the lowest rate',
                  'Clients with specific product preferences (eco-friendly, hypoallergenic)',
                  'Small studios and one-bedrooms where a vacuum and basics are enough',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-black text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto bg-gray-50 rounded-xl p-5">
                <p className="text-xs font-semibold text-black tracking-[0.15em] uppercase mb-2">Average Cost Examples</p>
                <ul className="space-y-1.5 text-sm text-black">
                  <li>Studio / 1BR: <strong className="text-[#CC6222]">$98–$147</strong> (2–3 hrs)</li>
                  <li>2BR home: <strong className="text-[#CC6222]">$147–$196</strong> (3–4 hrs)</li>
                  <li>3BR home: <strong className="text-[#CC6222]">$196–$294</strong> (4–6 hrs)</li>
                </ul>
              </div>
            </div>

            {/* Tier 2 — Most Popular */}
            <div className="bg-[#CC6222] rounded-2xl p-8 pt-10 relative flex flex-col lg:-my-4 shadow-xl">
              <div className="absolute -top-3.5 left-6 bg-[#34D399] text-white text-xs font-bold tracking-widest uppercase px-5 py-1.5 rounded-full">Most Popular</div>
              <p className="text-xs font-semibold text-white tracking-[0.2em] uppercase mb-3">We Bring Everything</p>
              <div className="flex items-baseline gap-3 mb-1">
                <p className="font-[family-name:var(--font-bebas)] text-6xl sm:text-7xl lg:text-8xl text-white tracking-wide leading-none">$65<span className="text-2xl sm:text-3xl text-white">/hr</span></p>
                <span className="font-[family-name:var(--font-bebas)] text-3xl text-white line-through">$75</span>
              </div>
              <div className="w-10 h-[2px] bg-[#34D399] mt-4 mb-5" />
              <p className="text-white text-sm leading-relaxed mb-5">
                We bring all professional-grade supplies, equipment, vacuums, mops, and cleaning products. Just open the door — we handle everything from start to finish.
              </p>
              <p className="text-xs font-semibold text-white tracking-[0.15em] uppercase mb-3">Best For</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Most Florida home renters — no storage needed for bulky supplies',
                  'First-time clients who want a hassle-free experience',
                  'Deep cleaning, move-in/move-out, and one-time bookings',
                  'Clients who want consistent, professional-grade results',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-white text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto bg-white/[0.08] rounded-xl p-5">
                <p className="text-xs font-semibold text-white tracking-[0.15em] uppercase mb-2">Average Cost Examples</p>
                <ul className="space-y-1.5 text-sm text-white">
                  <li>Studio / 1BR: <strong className="text-white">$130–$195</strong> (2–3 hrs)</li>
                  <li>2BR home: <strong className="text-white">$195–$260</strong> (3–4 hrs)</li>
                  <li>3BR home: <strong className="text-white">$260–$390</strong> (4–6 hrs)</li>
                </ul>
              </div>
            </div>

            {/* Tier 3 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
              <p className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">Same-Day &amp; Emergency</p>
              <p className="font-[family-name:var(--font-bebas)] text-5xl sm:text-6xl lg:text-7xl text-[#CC6222] tracking-wide leading-none mb-1">$100<span className="text-2xl sm:text-3xl text-black">/hr</span></p>
              <div className="w-10 h-[2px] bg-[#34D399] mt-4 mb-5" />
              <p className="text-black text-sm leading-relaxed mb-5">
                Need a cleaner today? We dispatch a professional to your door within hours. Includes all supplies and equipment — <Link href="/services/same-day-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">same-day cleaning</Link> when you need it most.
              </p>
              <p className="text-xs font-semibold text-black tracking-[0.15em] uppercase mb-3">Best For</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Unexpected guests arriving tonight',
                  'Post-party or post-event cleanup',
                  'Last-minute move-out before landlord inspection',
                  'Airbnb hosts with a same-day turnover',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-black text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto bg-gray-50 rounded-xl p-5">
                <p className="text-xs font-semibold text-black tracking-[0.15em] uppercase mb-2">Average Cost Examples</p>
                <ul className="space-y-1.5 text-sm text-black">
                  <li>Studio / 1BR: <strong className="text-[#CC6222]">$200–$300</strong> (2–3 hrs)</li>
                  <li>2BR home: <strong className="text-[#CC6222]">$300–$400</strong> (3–4 hrs)</li>
                  <li>3BR home: <strong className="text-[#CC6222]">$400–$600</strong> (4–6 hrs)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tips + Education */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-5">Florida Cleaning Cost Tips — How to Get the Best Value</h3>
              <ul className="space-y-4">
                {[
                  { tip: 'Book recurring service for the best rate', detail: 'Weekly and bi-weekly clients at $49/hr save significantly over one-time deep cleans. A weekly 2-hour clean costs just $98/visit — less than most Florida dinner tabs.' },
                  { tip: 'First cleaning always takes longer', detail: 'Your initial deep clean may run 4–6 hours. After that, recurring maintenance cleanings are typically 2–3 hours because we\'re maintaining — not catching up.' },
                  { tip: 'Provide your own supplies to save 25%', detail: 'The difference between $49/hr and $65/hr is who provides supplies. If you have a vacuum, mop, and basic products, you save $16/hr — that\'s $32+ per visit.' },
                  { tip: 'Declutter before we arrive', detail: 'Our cleaners are most efficient when surfaces are accessible. Less time moving items means more time actually cleaning — better results, lower cost.' },
                  { tip: 'Bundle services for new homes', detail: 'Moving in? Book a move-in deep clean at $65/hr, then transition to weekly or bi-weekly at $49/hr with your own supplies for ongoing maintenance.' },
                ].map(item => (
                  <li key={item.tip}>
                    <p className="text-black font-semibold text-sm mb-1">{item.tip}</p>
                    <p className="text-black text-sm leading-relaxed">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-5">What Affects the Cost of House Cleaning in Florida?</h3>
              <ul className="space-y-4">
                {[
                  { factor: 'Home size', detail: 'A studio takes 2 hours. A 3-bedroom may take 5–6. We charge by the hour so you only pay for the time your space actually needs — no inflated flat rates.' },
                  { factor: 'Cleaning type', detail: 'A regular maintenance clean is faster than a deep clean. Deep cleans cover inside appliances, baseboards, window tracks, and behind furniture — expect 2x the time.' },
                  { factor: 'Condition of the space', detail: 'A well-maintained home that gets cleaned weekly takes less time than a first-time clean or post-construction job. Recurring clients see lower bills over time.' },
                  { factor: 'Supplies', detail: 'At $49/hr you provide supplies. At $65/hr we bring commercial-grade vacuums, microfiber systems, and professional products. Both options include the same quality of work.' },
                  { factor: 'Urgency', detail: 'Same-day and emergency service is $100/hr because we prioritize your booking and dispatch immediately. Plan ahead to save — most clients book 2–3 days in advance.' },
                ].map(item => (
                  <li key={item.factor}>
                    <p className="text-black font-semibold text-sm mb-1">{item.factor}</p>
                    <p className="text-black text-sm leading-relaxed">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick comparison + CTA */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-2">How Florida Maid Pricing Compares to the Industry</h3>
            <p className="text-black text-sm max-w-2xl mx-auto mb-6">
              Most Florida cleaning companies charge $75–$120/hr or use opaque flat-rate quotes that hide the true cost. We publish our rates, charge by the hour, and never surprise you with add-on fees. What you see is what you pay.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-black font-semibold tracking-wide uppercase mb-1">Florida Average</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-black tracking-wide">$75–$120/hr</p>
              </div>
              <div className="bg-[#F5FBF8] border border-[#34D399]/30 rounded-xl p-4">
                <p className="text-xs text-[#34D399] font-semibold tracking-wide uppercase mb-1">The Florida Maid</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide">$49–$65/hr</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-black font-semibold tracking-wide uppercase mb-1">You Save</p>
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#34D399] tracking-wide">25–45%</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/updated-florida-maid-service-industry-pricing" className="inline-block bg-[#CC6222] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
                View Full Pricing Details
              </Link>
              <a href="sms:9547103636" className="inline-block bg-[#34D399] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Text for a Quote
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-black tracking-[0.25em] uppercase mb-3 text-center">Real Florida House Cleaning Reviews From Verified Google Customers</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#CC6222] tracking-wide text-center mb-4">5-Star Rated Maid Service in Florida — Read What Our Clients Say</h2>
          <p className="text-black text-center max-w-3xl mx-auto mb-12">
            Every review is from a verified Google client. From <Link href="/services/deep-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">deep cleaning</Link> and <Link href="/services/house-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">home cleaning</Link> to <Link href="/services/move-in-move-out-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">move-in/move-out</Link> and <Link href="/services/same-day-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">same-day emergency service</Link> — see why Floridians across <Link href="/miami-dade-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami-Dade</Link>, <Link href="/broward-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Broward</Link>, <Link href="/palm-beach-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Palm Beach</Link>, <Link href="/tampa-bay-maid-service" className="text-[#CC6222] underline underline-offset-2">Tampa Bay</Link> &amp; <Link href="/orlando-maid-service" className="text-[#CC6222] underline underline-offset-2">Orlando</Link> rate us 5 stars.
          </p>

          {/* Google Reviews widget */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Widget header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[#4285F4] font-semibold text-lg">G</span>
                  <span className="text-[#EA4335] font-semibold text-lg">o</span>
                  <span className="text-[#FBBC05] font-semibold text-lg">o</span>
                  <span className="text-[#4285F4] font-semibold text-lg">g</span>
                  <span className="text-[#34A853] font-semibold text-lg">l</span>
                  <span className="text-[#EA4335] font-semibold text-lg">e</span>
                </div>
                <span className="text-black font-semibold text-base sm:text-lg">Reviews</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-black font-bold text-xl sm:text-2xl">5.0</span>
                  <span className="text-yellow-400 text-base sm:text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-black text-xs sm:text-sm">(27)</span>
                </div>
                <a href="https://share.google/Iq9oblq3vJr07aP27" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-block bg-[#4285F4] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#3367D6] transition-colors">
                  Review us on Google
                </a>
              </div>
            </div>

            {/* Review cards grid */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { name: 'Lindsey Hill', time: '3 days ago', text: 'Awesome cleaners and very responsive. I\'ve used them for several months now for my 3 bed 3 bath walk up in Hell\'s Kitchen. Karina is my cleaner. She is so sweet and warm and lovely.', initial: 'L', color: 'bg-emerald-400' },
                  { name: 'Joseph Busacca', time: 'a day ago', text: 'Karina was great and very helpful.', initial: 'J', color: 'bg-indigo-500' },
                  { name: 'Adam Berger', time: '3 days ago', text: 'Great job. Friendly and professional.', initial: 'A', color: 'bg-slate-500' },
                  { name: 'Jessica Pace', time: '4 days ago', text: 'Ines Enriquez was incredible. Loved this job. Worth every penny.', initial: 'J', color: 'bg-purple-500' },
                  { name: 'Brad Lieberman', time: '2 weeks ago', text: 'Jeff is a real gem. Super communicative easy going and responsive. In a city with a lot of fly by night operations, Florida Maids is the real deal.', initial: 'B', color: 'bg-amber-400' },
                  { name: 'Eeland Stribling', time: '4 weeks ago', text: 'Cindy came and cleaned very well. Even cleaned up my living room as bonus. Right on time, fast, easy to book and communicate. Will be using again. No complaints!', initial: 'E', color: 'bg-violet-400' },
                  { name: 'Kelsey Wheeler', time: '2 weeks ago', text: 'Great experience. Texted the number on their website on Saturday and had a deep cleaning scheduled for that following Monday at 9am. The cleaner was prompt and super nice/friendly.', initial: 'K', color: 'bg-cyan-400' },
                  { name: 'Jason Klig', time: '2 months ago', text: 'Maria did an amazing job! My apartment is spotless and she is so easy to work with. Was very happy to accommodate all of my requests.', initial: 'J', color: 'bg-lime-500' },
                  { name: 'Jessica Papantoniou', time: '2 months ago', text: 'I called for an emergency cleaning Jeff took care of it right away. Karina did an amazing job and she\'s incredibly sweet. I\'ll definitely be using their services again!', initial: 'J', color: 'bg-fuchsia-400' },
                  { name: 'Endrit Jonuzi', time: '2 months ago', text: 'We hired them for cleaning our offices in Miami and no doubt they are the best we ever had. Affordable pricing, staff was friendly and on time.', initial: 'E', color: 'bg-yellow-500' },
                  { name: 'Shannon Atran', time: '2 months ago', text: 'Karina was incredible. She was extremely meticulous and left my apt spotless. 10/10; will definitely use again.', initial: 'S', color: 'bg-red-400' },
                  { name: 'Will Gags', time: '2 months ago', text: 'Maria is the grandmother you didn\'t know you needed. Couldn\'t recommend a more trustworthy and tidy business.', initial: 'W', color: 'bg-green-400' },
                  { name: 'Blair Silver-Matthes', time: '2 months ago', text: 'Karina was wonderful! She left my home in exceptional condition and I\'m looking forward to having her come again!', initial: 'B', color: 'bg-blue-500' },
                  { name: 'Vijay Chadderwala', time: '2 months ago', text: 'Gloria was great and very nice. Felt comfortable with her cleaning home.', initial: 'V', color: 'bg-orange-500' },
                  { name: 'Priya Vadlamudi', time: '3 months ago', text: 'Service was great and very friendly staff.', initial: 'P', color: 'bg-pink-500' },
                  { name: 'Erik Berlin', time: '2 months ago', text: 'Great service, cleaning, and pricing!', initial: 'E', color: 'bg-teal-500' },
                  { name: 'Kayli Watson', time: '5 months ago', text: 'Super fast to book, incredibly kind people, and great results!', initial: 'K', color: 'bg-pink-400' },
                  { name: 'Julie Salamon', time: '5 months ago', text: 'We just had our apartment painted and needed a deep clean to get rid of loads of dust. Florida Maid sent a wonderful cleaner who was prompt, professional and did an amazing job. Highly recommend!!!', initial: 'J', color: 'bg-orange-400' },
                  { name: 'Moodap', time: '5 months ago', text: 'Super detailed!', initial: 'M', color: 'bg-green-500' },
                  { name: 'Antong', time: '6 months ago', text: 'Everything was spotless, from oven stove to fridge.', initial: 'A', color: 'bg-teal-400' },
                  { name: 'Courtney Gamble', time: '6 months ago', text: "Best cleaning service I've used in the 20 years I've lived in Florida! Consistently efficient, thorough...", initial: 'C', color: 'bg-purple-400' },
                  { name: 'Shilpa Ray', time: '6 months ago', text: 'Perfect for post move deep cleaning. Appliances were spotless. Looked brand new.', initial: 'S', color: 'bg-blue-400' },
                  { name: 'Greg Farr', time: '6 months ago', text: 'The very best service every time, amazing!!', initial: 'G', color: 'bg-indigo-400' },
                  { name: 'Maria Lina', time: '6 months ago', text: 'The Florida Maid is so efficient and professional! I know I can always count on them.', initial: 'M', color: 'bg-rose-400' },
                  { name: 'Timothy Wojcik', time: '7 months ago', text: 'Excellent service and a great price! Prompt and thorough, would highly recommend!', initial: 'T', color: 'bg-amber-500' },
                  { name: 'Jenni Martinez', time: '7 months ago', text: '5 Stars \u2013 Absolutely the Best Cleaning Service in Florida! I gotta say, The Florida Maid is truly the best.', initial: 'J', color: 'bg-emerald-500' },
                  { name: 'Jenna M', time: '7 months ago', text: 'After trying three different cleaning companies in Florida, The Florida Maid is hands down the most affordable and thorough.', initial: 'J', color: 'bg-sky-500' },
                ].map((review, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={`w-8 h-8 ${review.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {review.initial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-black truncate">{review.name}</p>
                          <svg className="w-3.5 h-3.5 text-[#4285F4] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                        </div>
                        <p className="text-xs text-black">{review.time}</p>
                      </div>
                    </div>
                    <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                    <p className="text-black text-sm leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/florida-customer-reviews-for-the-florida-maid" className="text-[#CC6222] font-semibold hover:underline underline-offset-4">Read All Reviews &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-gradient-to-b from-[#CC6222] to-[#CC6222]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-white tracking-[0.25em] uppercase mb-3 text-center">Professional Florida Home &amp; House Cleaning Services</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide text-center mb-4">Deep Cleaning, Regular Maid Service &amp; More in Florida</h2>
          <p className="text-white text-center max-w-3xl mx-auto mb-14">
            From <Link href="/services/weekly-maid-service-in-florida" className="text-[#34D399] underline underline-offset-2">weekly maid service</Link> and <Link href="/services/deep-cleaning-service-in-florida" className="text-[#34D399] underline underline-offset-2">deep cleaning</Link> to <Link href="/services/move-in-move-out-cleaning-service-in-florida" className="text-[#34D399] underline underline-offset-2">move-in/move-out cleaning</Link>, <Link href="/services/post-construction-cleanup-service-in-florida" className="text-[#34D399] underline underline-offset-2">post-renovation cleanup</Link>, and <Link href="/services/same-day-cleaning-service-in-florida" className="text-[#34D399] underline underline-offset-2">same-day emergency cleaning</Link> — we handle every type of residential cleaning across Florida. All cleaners are background-checked, licensed, and insured.
          </p>
          <ServiceGrid />
          <div className="text-center mt-10">
            <Link href="/florida-maid-service-services-offered-by-the-florida-maid" className="text-[#34D399] font-semibold hover:underline underline-offset-4">Browse All Florida Cleaning Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">Licensed &amp; Insured Florida Cleaning Company</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#CC6222] tracking-wide leading-tight mb-6">Why Thousands of Floridians Trust The Florida Maid</h2>
            <div className="w-12 h-[2px] bg-[#34D399] mb-6" />
            <p className="text-black text-lg leading-relaxed mb-4">
              We provide personalized, hourly <Link href="/updated-florida-maid-service-industry-pricing" className="text-[#CC6222] underline underline-offset-2">cleaning service pricing</Link> for each unique space — ensuring high-quality cleaning tailored to your needs. No contracts, no hidden fees, no surprises.
            </p>
            <p className="text-black leading-relaxed mb-6">
              Every cleaner on our team is fully background-checked and insured. Whether you need a <Link href="/services/house-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">regular home cleaning</Link> in <Link href="/miami-dade-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami-Dade</Link>, a <Link href="/services/deep-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">deep clean</Link> in <Link href="/broward-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Broward</Link>, or <Link href="/services/airbnb-cleaning-in-florida" className="text-[#CC6222] underline underline-offset-2">Airbnb turnover cleaning</Link> in <Link href="/palm-beach-county-maid-service" className="text-[#CC6222] underline underline-offset-2">Palm Beach</Link> — we&apos;ve got you covered. <Link href="/about-the-florida-maid-service-company" className="text-[#CC6222] underline underline-offset-2">Learn more about our company</Link>.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a href="sms:9547103636" className="inline-block bg-[#34D399] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                Text Us
              </a>
              <a href="tel:9547103636" className="inline-block text-[#CC6222] font-semibold py-3.5 hover:underline underline-offset-4">
                or Call (954) 710-3636
              </a>
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-8">
            <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-6">Background-Checked, Insured &amp; 5-Star Rated</h3>
            <ul className="space-y-4">
              {[
                { icon: '\u{1F6E1}', text: 'Full general liability insurance and bonding on every visit' },
                { icon: '\u{1F4CB}', text: 'Every cleaner is thoroughly background-checked before hire' },
                { icon: '\u{1F3E0}', text: 'Trained in Florida home care — single-family homes to waterfront condos' },
                { icon: '\u2B50', text: '5.0-star rating across Google with verified reviews' },
                { icon: '\u{1F4B0}', text: 'Transparent hourly pricing starting at $49/hr' },
                { icon: '\u2705', text: 'Satisfaction guaranteed — we come back if you are not happy' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{item.icon}</span>
                  <span className="text-black">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link href="/florida-customer-reviews-for-the-florida-maid" className="text-[#CC6222] font-semibold text-sm hover:underline underline-offset-4">Read Our Customer Reviews &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#34D399] py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-white/70 tracking-[0.25em] uppercase mb-6">Real Florida Cleaning Service Reviews From Verified Customers</p>
          <p className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-white tracking-wide leading-relaxed mb-6">
            &ldquo;{testimonials[0].text}&rdquo;
          </p>
          <p className="text-white font-medium tracking-wide">&mdash; {testimonials[0].name}, {testimonials[0].location}</p>
          <div className="mt-8">
            <Link href="/florida-customer-reviews-for-the-florida-maid" className="text-white font-semibold text-sm tracking-wide hover:underline underline-offset-4">Read All Florida Maid Service Reviews &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Why Clients Choose Us */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-black tracking-[0.25em] uppercase mb-3 text-center">What Makes The Florida Maid Different From Other Florida Cleaning Services</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#CC6222] tracking-wide text-center mb-4">Why Clients Choose The Florida Maid Over Every Other Cleaning Company</h2>
          <p className="text-black text-center max-w-3xl mx-auto mb-14">
            No money upfront — you pay only after your cleaning is complete. Flat <Link href="/updated-florida-maid-service-industry-pricing" className="text-[#CC6222] underline underline-offset-2">hourly pricing</Link> with no surprise fees. Experienced, professional cleaners — not random gig workers. <Link href="/services/weekly-maid-service-in-florida" className="text-[#CC6222] underline underline-offset-2">Weekly</Link> and <Link href="/services/bi-weekly-cleaning-service-in-florida" className="text-[#CC6222] underline underline-offset-2">bi-weekly recurring service</Link> available. No contracts — stay because you&apos;re happy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">Transparent Florida Cleaning Service Scheduling</h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">How Scheduling Works</p>
              <ul className="space-y-3">
                {[
                  'All appointments are confirmed in advance',
                  'No-cancellation policy once your booking is confirmed',
                  'This protects cleaner schedules and ensures reliability',
                  'Recurring clients receive priority scheduling',
                  'We value consistency over chaos',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#34D399] mt-0.5">&#10003;</span>
                    <span className="text-black text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">No Upfront Payment — Pay After Your Cleaning</h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">Payment &amp; Completion</p>
              <ul className="space-y-3">
                {[
                  'Payment is requested when the cleaning is nearly complete',
                  'You see the results before you pay',
                  'Accepted methods: Zelle (hi@thefloridamaid.com) or Apple Pay',
                  'No processing fees, no delays, no chargebacks',
                  'Cleaner remains on site until payment is completed',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#34D399] mt-0.5">&#10003;</span>
                    <span className="text-black text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">Consistent Quality Florida Home Cleaning Standards</h3>
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">Quality &amp; Expectations</p>
              <ul className="space-y-3">
                {[
                  'Clear scope agreed upfront — no vague promises',
                  'We clean what\'s agreed, every visit',
                  'Consistent, repeatable quality over rushed work',
                  'Any concerns are addressed immediately',
                  'We don\'t overbook or rush our cleaners',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#34D399] mt-0.5">&#10003;</span>
                    <span className="text-black text-sm">{item}</span>
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
            <p className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">Professional Background-Checked Florida House Cleaners</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-6">Our Cleaners Are Paid Well, Equipped &amp; Treated Right</h2>
            <div className="w-12 h-[2px] bg-[#34D399] mb-6" />
            <p className="text-black leading-relaxed mb-5">
              We don&apos;t cut corners on the people who do the work. Our cleaners are experienced professionals — not gig workers pulled from an app. They bring their own professional supplies and equipment, they&apos;re paid well, and they&apos;re paid immediately. Happy cleaners do better work, every time.
            </p>
            <p className="text-black leading-relaxed mb-5">
              Every cleaner goes through a thorough background check and vetting process before they ever step foot in your home. We don&apos;t use staffing agencies or subcontractors — our team is built on trust, consistency, and pride in the work. When you book with us, you get someone who genuinely cares about doing a great job.
            </p>
            <p className="text-black leading-relaxed mb-6">
              That&apos;s why our clients in <Link href="/miami-beach-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami Beach</Link>, <Link href="/coral-gables-maid-service" className="text-[#CC6222] underline underline-offset-2">Coral Gables</Link>, <Link href="/south-tampa-maid-service" className="text-[#CC6222] underline underline-offset-2">South Tampa</Link>, and <Link href="/winter-park-maid-service" className="text-[#CC6222] underline underline-offset-2">Winter Park</Link> keep rebooking — they know exactly who&apos;s coming, and they trust them completely.
            </p>
            <Link href="/available-florida-maid-jobs" className="text-[#CC6222] font-semibold text-sm hover:underline underline-offset-4">Join Our Cleaning Team &rarr;</Link>
          </div>
          <div>
            <p className="text-xs font-semibold text-black tracking-[0.2em] uppercase mb-3">The Ideal Florida Maid Service Client</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-6">Who We&apos;re Best For</h2>
            <div className="w-12 h-[2px] bg-[#34D399] mb-6" />
            <ul className="space-y-4">
              {[
                'Clients who value reliability and consistency over the cheapest price',
                'Homes that appreciate clear, respectful communication',
                'People looking for a long-term cleaning relationship — not a one-off gig',
                'Clients who respect professional service and treat cleaners well',
              ].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#34D399] mt-1 text-lg">&#10003;</span>
                  <span className="text-black">{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-[#F5FBF8] border border-[#34D399]/30 rounded-2xl p-6 mt-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-3">Our Standards</h3>
              <ul className="space-y-2">
                {[
                  'Respectful homes and respectful clients only',
                  'No discount-driven or price-shopping bookings',
                  'No last-minute cancellations',
                  'Clear expectations on both sides',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-[#CC6222]/40 mt-0.5">&#8226;</span>
                    <span className="text-black text-sm">{item}</span>
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
          <p className="text-xs font-semibold text-black tracking-[0.25em] uppercase mb-3 text-center">Maid Service Across Miami, Tampa, Orlando, Fort Lauderdale &amp; Jacksonville</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[#CC6222] tracking-wide text-center mb-4">225+ Florida Communities Served by Professional Cleaners</h2>
          <p className="text-black text-center max-w-3xl mx-auto mb-14">
            From <Link href="/miami-beach-maid-service" className="text-[#CC6222] underline underline-offset-2">Miami Beach</Link> and <Link href="/brickell-maid-service" className="text-[#CC6222] underline underline-offset-2">Brickell</Link> to <Link href="/fort-lauderdale-maid-service" className="text-[#CC6222] underline underline-offset-2">Fort Lauderdale</Link>, <Link href="/south-tampa-maid-service" className="text-[#CC6222] underline underline-offset-2">South Tampa</Link>, <Link href="/naples-maid-service" className="text-[#CC6222] underline underline-offset-2">Naples</Link>, and <Link href="/winter-park-maid-service" className="text-[#CC6222] underline underline-offset-2">Winter Park</Link> — our insured, background-checked cleaners are already in your neighborhood. Same rates everywhere, no travel fees.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
            {/* Miami-Dade */}
            <div>
              <Link href="/miami-dade-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">Miami-Dade</h3>
                <p className="text-xs text-black tracking-[0.15em] uppercase">South FL</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'South Beach', slug: 'south-beach-maid-service' },
                  { name: 'Brickell', slug: 'brickell-maid-service' },
                  { name: 'Coral Gables', slug: 'coral-gables-maid-service' },
                  { name: 'Coconut Grove', slug: 'coconut-grove-maid-service' },
                  { name: 'Doral', slug: 'doral-maid-service' },
                  { name: 'Kendall', slug: 'kendall-maid-service' },
                  { name: 'Aventura', slug: 'aventura-maid-service' },
                  { name: 'Key Biscayne', slug: 'key-biscayne-maid-service' },
                  { name: 'Wynwood', slug: 'wynwood-maid-service' },
                  { name: 'Pinecrest', slug: 'pinecrest-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-black hover:text-[#CC6222] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/miami-dade-maid-service" className="text-sm text-[#CC6222] font-semibold hover:underline underline-offset-4">All Miami-Dade &rarr;</Link></li>
              </ul>
            </div>

            {/* Broward */}
            <div>
              <Link href="/broward-county-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">Broward</h3>
                <p className="text-xs text-black tracking-[0.15em] uppercase">South FL</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'Fort Lauderdale', slug: 'fort-lauderdale-maid-service' },
                  { name: 'Hollywood', slug: 'hollywood-florida-maid-service' },
                  { name: 'Pembroke Pines', slug: 'pembroke-pines-maid-service' },
                  { name: 'Weston', slug: 'weston-maid-service' },
                  { name: 'Coral Springs', slug: 'coral-springs-maid-service' },
                  { name: 'Plantation', slug: 'plantation-maid-service' },
                  { name: 'Pompano Beach', slug: 'pompano-beach-maid-service' },
                  { name: 'Davie', slug: 'davie-maid-service' },
                  { name: 'Parkland', slug: 'parkland-maid-service' },
                  { name: 'Deerfield Beach', slug: 'deerfield-beach-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-black hover:text-[#CC6222] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/broward-county-maid-service" className="text-sm text-[#CC6222] font-semibold hover:underline underline-offset-4">All Broward &rarr;</Link></li>
              </ul>
            </div>

            {/* Palm Beach */}
            <div>
              <Link href="/palm-beach-county-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">Palm Beach</h3>
                <p className="text-xs text-black tracking-[0.15em] uppercase">South FL</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'West Palm Beach', slug: 'west-palm-beach-maid-service' },
                  { name: 'Boca Raton', slug: 'boca-raton-maid-service' },
                  { name: 'Delray Beach', slug: 'delray-beach-maid-service' },
                  { name: 'Jupiter', slug: 'jupiter-maid-service' },
                  { name: 'Wellington', slug: 'wellington-maid-service' },
                  { name: 'Palm Beach Gardens', slug: 'palm-beach-gardens-maid-service' },
                  { name: 'Boynton Beach', slug: 'boynton-beach-maid-service' },
                  { name: 'Lake Worth', slug: 'lake-worth-maid-service' },
                  { name: 'Royal Palm Beach', slug: 'royal-palm-beach-maid-service' },
                  { name: 'Lantana', slug: 'lantana-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-black hover:text-[#CC6222] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/palm-beach-county-maid-service" className="text-sm text-[#CC6222] font-semibold hover:underline underline-offset-4">All Palm Beach &rarr;</Link></li>
              </ul>
            </div>

            {/* Tampa Bay */}
            <div>
              <Link href="/tampa-bay-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">Tampa Bay</h3>
                <p className="text-xs text-black tracking-[0.15em] uppercase">West FL</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'South Tampa', slug: 'south-tampa-maid-service' },
                  { name: 'St. Petersburg', slug: 'st-petersburg-maid-service' },
                  { name: 'Clearwater', slug: 'clearwater-maid-service' },
                  { name: 'Brandon', slug: 'brandon-maid-service' },
                  { name: 'Wesley Chapel', slug: 'wesley-chapel-maid-service' },
                  { name: 'Largo', slug: 'largo-maid-service' },
                  { name: 'Dunedin', slug: 'dunedin-maid-service' },
                  { name: 'Safety Harbor', slug: 'safety-harbor-maid-service' },
                  { name: 'Temple Terrace', slug: 'temple-terrace-maid-service' },
                  { name: 'Riverview', slug: 'riverview-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-black hover:text-[#CC6222] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/tampa-bay-maid-service" className="text-sm text-[#CC6222] font-semibold hover:underline underline-offset-4">All Tampa Bay &rarr;</Link></li>
              </ul>
            </div>

            {/* Orlando */}
            <div>
              <Link href="/orlando-maid-service" className="block mb-4 group">
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">Orlando</h3>
                <p className="text-xs text-black tracking-[0.15em] uppercase">Central FL</p>
              </Link>
              <ul className="space-y-2">
                {[
                  { name: 'Winter Park', slug: 'winter-park-maid-service' },
                  { name: 'Lake Nona', slug: 'lake-nona-maid-service' },
                  { name: 'Kissimmee', slug: 'kissimmee-maid-service' },
                  { name: 'Dr. Phillips', slug: 'dr-phillips-maid-service' },
                  { name: 'Celebration', slug: 'celebration-maid-service' },
                  { name: 'Windermere', slug: 'windermere-maid-service' },
                  { name: 'Sanford', slug: 'sanford-maid-service' },
                  { name: 'Altamonte Springs', slug: 'altamonte-springs-maid-service' },
                  { name: 'Oviedo', slug: 'oviedo-maid-service' },
                  { name: 'Clermont', slug: 'clermont-maid-service' },
                ].map(n => (
                  <li key={n.slug}>
                    <Link href={`/${n.slug}`} className="text-sm text-black hover:text-[#CC6222] transition-colors">{n.name}</Link>
                  </li>
                ))}
                <li><Link href="/orlando-maid-service" className="text-sm text-[#CC6222] font-semibold hover:underline underline-offset-4">All Orlando &rarr;</Link></li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/service-areas-served-by-the-florida-maid" className="text-[#CC6222] font-semibold hover:underline underline-offset-4">Browse All 225+ Neighborhoods &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-black tracking-[0.25em] uppercase mb-3">Earn Passive Income With Our Florida Cleaning Referral Program</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-4">Get Paid 10% Every Time Your Referral Books a Cleaning</h2>
          <p className="text-black max-w-2xl mx-auto mb-8">
            Refer friends, family, or neighbors to The Florida Maid and earn 10% recurring commission on every cleaning they book — not just the first. Paid via Zelle or Apple Cash after each completed visit. No limit on referrals, no cap on earnings.
          </p>
          <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" target="_blank" className="inline-block bg-[#CC6222] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
            Join the Referral Program &rarr;
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection faqs={homepageFAQs} title="Florida House Cleaning Service — Frequently Asked Questions &amp; Answers" columns={2} />

      <CTABlock title="Book Your Florida Cleaning Service Today" subtitle="Text or call — trusted by thousands of Floridians across Miami, Tampa, Orlando, Fort Lauderdale &amp; Jacksonville." />
    </>
  )
}
