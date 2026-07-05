import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/app/site/template/_lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/app/site/template/_lib/seo/locations'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/app/site/template/_lib/seo/schema'
import JsonLd from '@/app/site/template/_components/JsonLd'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'
import CTABlock from '@/app/site/template/_components/CTABlock'

const url = 'https://www.example.com/contact-the-nyc-maid-service-today'
const title = 'Contact Your Business | Text Sales (555) 555-5555 | Support (555) 555-5556'
const description = 'Contact Your Business for a free cleaning quote. Text sales at (555) 555-5555, support at (555) 555-5556, or email hi@example.com. Service from $59/hr across Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, Westchester & NJ. 5.0★ Rated.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: 'website', siteName: 'Your Business', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title, description },
  other: { 'geo.region': 'US-NY', 'geo.placename': 'New York City', 'geo.position': '40.7589;-73.9851', 'ICBM': '40.7589, -73.9851' },
}

const contactFaqs = [
  { question: 'What\'s the fastest way to get a quote?', answer: 'Text sales at (555) 555-5555 with your address, home size (bedrooms/bathrooms), and what type of cleaning you need. For existing clients needing support, text (555) 555-5556. Most quotes are delivered within 15 minutes.' },
  { question: 'Do I need to call to book, or can I text?', answer: 'Texting is our preferred method — it\'s faster for both of us. You can also call or email hi@example.com.' },
  { question: 'What information do you need for a quote?', answer: 'Your address (or neighborhood), number of bedrooms and bathrooms, the type of cleaning you need (regular, deep, move-in/out, etc.), and your preferred date. That\'s it — we\'ll handle the rest.' },
  { question: 'How quickly can you schedule a cleaning?', answer: 'Usually within 24–48 hours. For same-day service, text us before 10am for the best chance of afternoon availability. Same-day is $89/hr. A 2-hour minimum applies (first-time cleanings included). Bookings with 2 or more cleaners require 48 hours notice, carry a 4-hour minimum, and receive no discounts — a multi-cleaner booking with under 48 hours notice is billed at same-day / emergency pricing ($89/hr).' },
  { question: 'What areas do you serve?', answer: 'Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island (Nassau and western Suffolk including Great Neck, Manhasset, Port Washington, Garden City, Huntington), Westchester County (Yonkers, Bronxville, Scarsdale, White Plains, Larchmont, Rye, Tarrytown, and beyond), and northern New Jersey (Jersey City, Hoboken, Weehawken, Edgewater, Fort Lee). Same rates everywhere.' },
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
        webPageSchema({ url, name: title, description, type: 'ContactPage', breadcrumb: [{ name: 'Home', url: 'https://www.example.com' }, { name: 'Contact', url }] }),
        localBusinessSchema(),
        howToBookSchema(),
        breadcrumbSchema([{ name: 'Home', url: 'https://www.example.com' }, { name: 'Contact', url }]),
        faqSchema(contactFaqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-16 md:py-24">
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
            <a href="sms:5555555555" className="inline-block font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--accent)] tracking-wide hover:text-white transition-colors">
              Sales: (555) 555-5555
            </a>
            <a href="sms:5555555556" className="inline-block font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--accent)] tracking-wide hover:text-white transition-colors">
              Support: (555) 555-5556
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
            <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--accent)] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-[var(--brand)] text-2xl">&#9742;</span>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">Text Us</h2>
              <p className="text-gray-500 text-sm mt-3">Fastest way to reach us. Most quotes delivered within 15 minutes.</p>
              <div className="flex flex-col gap-2 mt-5">
                <a href="sms:5555555555" className="bg-[var(--accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
                  Sales: (555) 555-5555
                </a>
                <a href="sms:5555555556" className="bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
                  Support: (555) 555-5556
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--accent)] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-[var(--brand)] text-2xl">&#9993;</span>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">Email Us</h2>
              <a href="mailto:hi@example.com" className="text-[var(--brand)] text-lg font-bold hover:underline underline-offset-4">hi@example.com</a>
              <p className="text-gray-500 text-sm mt-3">For detailed requests, photos, or questions. We respond within 2 hours.</p>
              <a href="mailto:hi@example.com" className="inline-block mt-5 bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
                Send Email
              </a>
            </div>

            {/* Client Portal */}
            <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--accent)] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-[var(--brand)] text-2xl">&#128197;</span>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">Existing Client?</h2>
              <p className="text-[var(--brand)] text-lg font-bold">example.com/book</p>
              <p className="text-gray-500 text-sm mt-3">Log in to view your bookings, reschedule, or manage your account.</p>
              <Link href="/book" className="inline-block mt-5 bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
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
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-6">Hours &amp; Location</h2>
              <div className="space-y-4 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700 font-medium">Monday – Saturday</span>
                  <span className="text-[var(--brand)] font-bold">7:00 AM – 7:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700 font-medium">Sunday</span>
                  <span className="text-gray-400">Closed</span>
                </div>
              </div>
              <div className="bg-[rgb(var(--accent-rgb)/0.15)] rounded-lg p-3 mb-8">
                <p className="text-[var(--brand)] text-sm font-semibold">Sales &amp; Booking: Available 24/7</p>
                <p className="text-gray-500 text-xs">Text sales (555) 555-5555 anytime. Support: (555) 555-5556.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Main Office</p>
                <p className="text-[var(--brand)] font-medium">150 W 47th St, New York, NY 10036</p>
                <p className="text-gray-500 text-sm mt-1">Serving Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, Westchester &amp; NJ</p>
              </div>
            </div>

            {/* What to include */}
            <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-alt)] rounded-2xl p-8">
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
                    <span className="font-[family-name:var(--font-bebas)] text-xl text-[rgb(var(--accent-rgb)/0.4)] leading-none mt-0.5">{item.n}</span>
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
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Same Rates Across Every Location</p>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">No travel fees, no zone surcharges. Manhattan to Long Island — you pay the same flat hourly rate.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {AREAS.map(area => (
              <Link
                key={area.slug}
                href={`/${area.urlSlug}`}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-[var(--accent)] hover:shadow-sm transition-all"
              >
                <p className="font-[family-name:var(--font-bebas)] text-lg text-[var(--brand)] tracking-wide">{area.name}</p>
                <p className="text-gray-400 text-xs mt-1">{getNeighborhoodsByArea(area.slug).length} neighborhoods</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mint band — response time promise */}
      <section className="py-12 bg-[var(--accent)]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[var(--brand)] rounded-full flex items-center justify-center">
              <span className="text-white text-xl">&#9889;</span>
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-2">Our Response Time Promise</h3>
            <p className="text-[rgb(var(--brand-rgb)/0.8)] leading-relaxed">
              Text messages get a response within 15 minutes during business hours. Emails within 2 hours. We don&apos;t use bots or auto-responders — you&apos;re always talking to a real person who can answer your questions and book your cleaning on the spot.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Common Questions</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-12">Contact FAQ</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {contactFaqs.map(faq => (
              <div key={faq.question}>
                <h3 className="font-semibold text-[var(--brand)] mb-2">{faq.question}</h3>
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
