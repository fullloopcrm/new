import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/lib/seo/locations'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

const url = 'https://www.thenycmaid.com/contact-the-nyc-maid-service-today'
const title = 'Contact The NYC Maid | Text Sales (212) 202-9030 | Support (646) 490-0130'
const description = 'Contact The NYC Maid for a free cleaning quote. Text sales at (212) 202-9030, support at (646) 490-0130, or email hi@thenycmaid.com. Service from $59/hr across NYC, Brooklyn, Queens, LI & NJ. 5.0★ Rated.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: 'website', siteName: 'The NYC Maid', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title, description },
  other: { 'geo.region': 'US-NY', 'geo.placename': 'New York City', 'geo.position': '40.7589;-73.9851', 'ICBM': '40.7589, -73.9851' },
}

const contactFaqs = [
  { question: 'What\'s the fastest way to get a quote?', answer: 'Text sales at (212) 202-9030 with your address, home size (bedrooms/bathrooms), and what type of cleaning you need. For existing clients needing support, text (646) 490-0130. Most quotes are delivered within 15 minutes.' },
  { question: 'Do I need to call to book, or can I text?', answer: 'Texting is our preferred method — it\'s faster for both of us. You can also call or email hi@thenycmaid.com.' },
  { question: 'What information do you need for a quote?', answer: 'Your address (or neighborhood), number of bedrooms and bathrooms, the type of cleaning you need (regular, deep, move-in/out, etc.), and your preferred date. That\'s it — we\'ll handle the rest.' },
  { question: 'How quickly can you schedule a cleaning?', answer: 'Usually within 24–48 hours. For same-day service, text us before 10am for the best chance of afternoon availability. Same-day is $100/hr.' },
  { question: 'What areas do you serve?', answer: 'All of Manhattan, Brooklyn, Queens, Long Island (North Shore including Great Neck, Manhasset, Port Washington), and northern New Jersey (Jersey City, Hoboken, Weehawken, Edgewater, Fort Lee). Same rates everywhere.' },
  { question: 'What are your hours?', answer: 'Office hours are Monday–Saturday 7am–7pm. Our sales and booking line is available 24/7 — call or text anytime and we typically respond within 15 minutes.' },
  { question: 'Is there any obligation when I ask for a quote?', answer: 'None at all. Get a quote, think about it, and book when you\'re ready. No pressure, no follow-up calls, no sales tactics.' },
  { question: 'Can I book for someone else?', answer: 'Yes. Many clients book cleanings for family members, tenants, or Airbnb properties. Just provide the service address and any access instructions.' },
]

export default function ContactPage() {
  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({ url, name: title, description, type: 'ContactPage', breadcrumb: [{ name: 'Home', url: 'https://www.thenycmaid.com' }, { name: 'Contact', url }] }),
        localBusinessSchema(),
        howToBookSchema(),
        breadcrumbSchema([{ name: 'Home', url: 'https://www.thenycmaid.com' }, { name: 'Contact', url }]),
        faqSchema(contactFaqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/60 text-sm">5.0 Rating &middot; 50+ verified reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            Get in Touch
          </h1>
          <p className="text-blue-200/60 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Text is fastest. Call if you prefer. Email works too. We respond to everything within 15 minutes during business hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <a href="sms:2122029030" className="inline-block font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#A8F0DC] tracking-wide hover:text-white transition-colors">
              Sales: (212) 202-9030
            </a>
            <a href="sms:6464900130" className="inline-block font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#A8F0DC] tracking-wide hover:text-white transition-colors">
              Support: (646) 490-0130
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: 'Contact', href: '/contact-the-nyc-maid-service-today' }]} />
      </div>

      {/* Three contact method cards */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Text / Call */}
            <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[#A8F0DC] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-[#A8F0DC] rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-[#1E2A4A] text-2xl">&#9742;</span>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-2">Text Us</h2>
              <p className="text-gray-500 text-sm mt-3">Fastest way to reach us. Most quotes delivered within 15 minutes.</p>
              <div className="flex flex-col gap-2 mt-5">
                <a href="sms:2122029030" className="bg-[#A8F0DC] text-[#1E2A4A] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
                  Sales: (212) 202-9030
                </a>
                <a href="sms:6464900130" className="bg-[#1E2A4A] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                  Support: (646) 490-0130
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[#A8F0DC] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-[#1E2A4A] text-2xl">&#9993;</span>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-2">Email Us</h2>
              <a href="mailto:hi@thenycmaid.com" className="text-[#1E2A4A] text-lg font-bold hover:underline underline-offset-4">hi@thenycmaid.com</a>
              <p className="text-gray-500 text-sm mt-3">For detailed requests, photos, or questions. We respond within 2 hours.</p>
              <a href="mailto:hi@thenycmaid.com" className="inline-block mt-5 bg-[#1E2A4A] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                Send Email
              </a>
            </div>

            {/* Client Portal */}
            <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[#A8F0DC] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-[#1E2A4A] text-2xl">&#128197;</span>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-2">Existing Client?</h2>
              <p className="text-[#1E2A4A] text-lg font-bold">thenycmaid.com/book</p>
              <p className="text-gray-500 text-sm mt-3">Log in to view your bookings, reschedule, or manage your account.</p>
              <Link href="/book" className="inline-block mt-5 bg-[#1E2A4A] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
                Client Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column: hours + what to include */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Hours + address */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-6">Hours &amp; Location</h2>
              <div className="space-y-4 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700 font-medium">Monday – Saturday</span>
                  <span className="text-[#1E2A4A] font-bold">7:00 AM – 7:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700 font-medium">Sunday</span>
                  <span className="text-gray-400">Closed</span>
                </div>
              </div>
              <div className="bg-[#A8F0DC]/15 rounded-lg p-3 mb-8">
                <p className="text-[#1E2A4A] text-sm font-semibold">Sales &amp; Booking: Available 24/7</p>
                <p className="text-gray-500 text-xs">Text sales (212) 202-9030 anytime. Support: (646) 490-0130.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Main Office</p>
                <p className="text-[#1E2A4A] font-medium">150 W 47th St, New York, NY 10036</p>
                <p className="text-gray-500 text-sm mt-1">Serving all five boroughs, Long Island &amp; NJ</p>
              </div>
            </div>

            {/* What to include */}
            <div className="bg-gradient-to-br from-[#1E2A4A] to-[#243352] rounded-2xl p-8">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">What to Include in Your Message</h2>
              <p className="text-blue-200/50 text-sm mb-6">Help us quote you faster by including these details:</p>
              <div className="space-y-4">
                {[
                  { n: '01', t: 'Your address or neighborhood' },
                  { n: '02', t: 'Number of bedrooms and bathrooms' },
                  { n: '03', t: 'Type of cleaning (regular, deep, move-in/out, etc.)' },
                  { n: '04', t: 'Preferred date and time' },
                  { n: '05', t: 'Any special requests (inside fridge, pets, allergies)' },
                ].map(item => (
                  <div key={item.n} className="flex items-start gap-4">
                    <span className="font-[family-name:var(--font-bebas)] text-xl text-[#A8F0DC]/40 leading-none mt-0.5">{item.n}</span>
                    <span className="text-blue-100/70 text-sm">{item.t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-blue-200/50 text-xs mb-3">Example text message:</p>
                <div className="bg-white/[0.06] rounded-xl p-4">
                  <p className="text-blue-100/80 text-sm italic">&ldquo;Hi! I need a deep cleaning for my 2BR/1BA apartment on the Upper West Side. Available anytime next week. I have a cat.&rdquo;</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service areas we cover */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Where We Serve</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">Same Rates Across Every Location</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">No travel fees, no zone surcharges. Manhattan to Long Island — you pay the same flat hourly rate.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {AREAS.map(area => (
              <Link
                key={area.slug}
                href={`/${area.urlSlug}`}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-[#A8F0DC] hover:shadow-sm transition-all"
              >
                <p className="font-[family-name:var(--font-bebas)] text-lg text-[#1E2A4A] tracking-wide">{area.name}</p>
                <p className="text-gray-400 text-xs mt-1">{getNeighborhoodsByArea(area.slug).length} neighborhoods</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mint band — response time promise */}
      <section className="py-12 bg-[#A8F0DC]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[#1E2A4A] rounded-full flex items-center justify-center">
              <span className="text-white text-xl">&#9889;</span>
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-2">Our Response Time Promise</h3>
            <p className="text-[#1E2A4A]/80 leading-relaxed">
              Text messages get a response within 15 minutes during business hours. Emails within 2 hours. We don&apos;t use bots or auto-responders — you&apos;re always talking to a real person who can answer your questions and book your cleaning on the spot.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Common Questions</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-12">Contact FAQ</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {contactFaqs.map(faq => (
              <div key={faq.question}>
                <h3 className="font-semibold text-[#1E2A4A] mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABlock title="Ready to Get Started?" subtitle="Text, call, or email — we'll have a quote for you in minutes." />
    </>
  )
}
