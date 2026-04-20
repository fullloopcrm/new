import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, tenantSiteUrl, getTenantAreas, toSlug } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const email = tenant?.email || ''
  const base = tenantSiteUrl(tenant)
  const url = base ? `${base}/contact-the-nyc-maid-service-today` : undefined
  const title = `Contact ${name} | ${phone ? `Call or Text ${phone} | ` : ''}Free Quote`
  const description = `Contact ${name} for a free quote.${phone ? ` Text or call ${phone}.` : ''}${email ? ` Email ${email}.` : ''} Licensed, insured, 5-star rated.`

  return {
    title: { absolute: title },
    description,
    ...(url && { alternates: { canonical: url } }),
    openGraph: { title, description, ...(url && { url }), type: 'website', siteName: name, locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ContactPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const email = tenant?.email || ''
  const address = (tenant?.address as string | undefined) || ''
  const base = tenantSiteUrl(tenant)
  const baseHost = base.replace(/^https?:\/\//, '')
  const areas = tenant ? await getTenantAreas(tenant.id) : []

  const contactFaqs = [
    { question: "What's the fastest way to get a quote?", answer: `${phone ? `Text ${phone}` : 'Message us'} with your address, property details, and what service you need. Most quotes are delivered within 15 minutes.` },
    { question: 'Do I need to call to book, or can I text?', answer: `Texting is our preferred method — it's faster for both of us.${phone ? ` You can also call ${phone}` : ''}${email ? `, email ${email}` : ''}${base ? `, or book online at ${baseHost}/book/new` : ''}.` },
    { question: 'What information do you need for a quote?', answer: "Your address (or neighborhood), property size, the type of service you need, and your preferred date. That's it — we'll handle the rest." },
    { question: 'How quickly can you schedule an appointment?', answer: 'Usually within 24–48 hours. For same-day service, message us as early as possible for the best chance of availability.' },
    { question: 'What areas do you serve?', answer: areas.length > 0 ? `We serve ${areas.length}+ areas including ${areas.slice(0, 5).join(', ')}${areas.length > 5 ? ', and more' : ''}. Same rates everywhere.` : 'We serve the surrounding area. Message us to confirm coverage for your address.' },
    { question: 'What are your hours?', answer: 'Office hours are Monday–Saturday 7am–7pm. Our sales and booking line is available 24/7 — message us anytime and we typically respond within 15 minutes.' },
    { question: 'Is there any obligation when I ask for a quote?', answer: "None at all. Get a quote, think about it, and book when you're ready. No pressure, no follow-up calls, no sales tactics." },
    { question: 'Can I book for someone else?', answer: 'Yes. Many clients book services for family members, tenants, or other properties. Just provide the service address and any access instructions.' },
  ]

  const pageUrl = base ? `${base}/contact-the-nyc-maid-service-today` : ''

  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        ...(pageUrl ? [webPageSchema({ url: pageUrl, name: `Contact ${name}`, description: `Contact ${name} for a free quote.`, type: 'ContactPage', breadcrumb: [{ name: 'Home', url: base }, { name: 'Contact', url: pageUrl }] })] : []),
        localBusinessSchema(),
        howToBookSchema(),
        ...(pageUrl ? [breadcrumbSchema([{ name: 'Home', url: base }, { name: 'Contact', url: pageUrl }])] : []),
        faqSchema(contactFaqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/60 text-sm">5-Star Rated &middot; Verified Reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-5">
            Get in Touch
          </h1>
          <p className="text-blue-200/60 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Text is fastest. Call if you prefer. Email works too. We respond to everything within 15 minutes during business hours.
          </p>
          {phone && (
            <a href={`sms:${phoneDigits}`} className="inline-block font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand-accent)] tracking-wide hover:text-white transition-colors">
              {phone}
            </a>
          )}
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
            {phone && (
              <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-[var(--brand-accent)] rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="text-[var(--brand)] text-2xl">&#9742;</span>
                </div>
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">Text or Call</h2>
                <a href={`sms:${phoneDigits}`} className="text-[var(--brand)] text-xl font-bold hover:underline underline-offset-4">{phone}</a>
                <p className="text-gray-500 text-sm mt-3">Fastest way to reach us. Most quotes delivered within 15 minutes.</p>
                <div className="flex flex-col gap-2 mt-5">
                  <a href={`sms:${phoneDigits}`} className="bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
                    Text Us
                  </a>
                  <a href={`tel:${phoneDigits}`} className="text-[var(--brand)] font-semibold text-sm py-2 hover:underline underline-offset-4">
                    or Call
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {email && (
              <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="text-[var(--brand)] text-2xl">&#9993;</span>
                </div>
                <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">Email Us</h2>
                <a href={`mailto:${email}`} className="text-[var(--brand)] text-lg font-bold hover:underline underline-offset-4">{email}</a>
                <p className="text-gray-500 text-sm mt-3">For detailed requests, photos, or questions. We respond within 2 hours.</p>
                <a href={`mailto:${email}`} className="inline-block mt-5 bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-colors">
                  Send Email
                </a>
              </div>
            )}

            {/* Book Online */}
            <div className="border border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--brand-accent)] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-[var(--brand)] text-2xl">&#128197;</span>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">Book Online</h2>
              {base && <p className="text-[var(--brand)] text-lg font-bold">{baseHost}/book</p>}
              <p className="text-gray-500 text-sm mt-3">Submit your details online and we&apos;ll confirm your appointment within the hour.</p>
              <Link href="/book/new" className="inline-block mt-5 bg-[var(--brand)] text-white px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-colors">
                Book Now
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
              <div className="bg-[var(--brand-accent)]/15 rounded-lg p-3 mb-8">
                <p className="text-[var(--brand)] text-sm font-semibold">Sales &amp; Booking: Available 24/7</p>
                {phone && <p className="text-gray-500 text-xs">Call or text {phone} anytime — day or night.</p>}
              </div>
              {address && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">Main Office</p>
                  <p className="text-[var(--brand)] font-medium">{address}</p>
                </div>
              )}
            </div>

            {/* What to include */}
            <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand)] rounded-2xl p-8">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-2">What to Include in Your Message</h2>
              <p className="text-blue-200/50 text-sm mb-6">Help us quote you faster by including these details:</p>
              <div className="space-y-4">
                {[
                  { n: '01', t: 'Your address or neighborhood' },
                  { n: '02', t: 'Property size or number of rooms' },
                  { n: '03', t: 'Type of service you need' },
                  { n: '04', t: 'Preferred date and time' },
                  { n: '05', t: 'Any special requests or access notes' },
                ].map(item => (
                  <div key={item.n} className="flex items-start gap-4">
                    <span className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand-accent)]/40 leading-none mt-0.5">{item.n}</span>
                    <span className="text-blue-100/70 text-sm">{item.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service areas we cover */}
      {areas.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Where We Serve</h2>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide text-center mb-4">Same Rates Across Every Location</p>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">No travel fees, no zone surcharges. You pay the same flat rate everywhere.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {areas.map(area => (
                <Link
                  key={area}
                  href={`/${toSlug(area)}`}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center hover:border-[var(--brand-accent)] hover:shadow-sm transition-all"
                >
                  <p className="font-[family-name:var(--font-bebas)] text-lg text-[var(--brand)] tracking-wide">{area}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mint band — response time promise */}
      <section className="py-12 bg-[var(--brand-accent)]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-[var(--brand)] rounded-full flex items-center justify-center">
              <span className="text-white text-xl">&#9889;</span>
            </div>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-2">Our Response Time Promise</h3>
            <p className="text-[var(--brand)]/80 leading-relaxed">
              Text messages get a response within 15 minutes during business hours. Emails within 2 hours. We don&apos;t use bots or auto-responders — you&apos;re always talking to a real person who can answer your questions and book your appointment on the spot.
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

      <CTABlock title="Ready to Get Started?" subtitle="Text, call, or email — we'll have a quote for you in minutes." phone={phone} />
    </>
  )
}
