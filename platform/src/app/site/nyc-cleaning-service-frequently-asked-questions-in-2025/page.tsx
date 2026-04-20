import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'

function buildFAQs(opts: { name: string; phone: string; zelleEmail: string }) {
  const { name, phone, zelleEmail } = opts
  const phoneLabel = phone || 'us'
  const payMethods = zelleEmail ? `cash, credit card, debit card, Zelle (${zelleEmail}), Venmo, and Apple Pay` : 'cash, credit card, debit card, Venmo, and Apple Pay'

  const pricingFAQs = [
    { question: 'How much does service cost?', answer: `${name} provides custom quotes based on your property size and service needs. Reach out for a free, upfront estimate.` },
    { question: 'Do you charge a flat rate or hourly?', answer: 'We charge by the hour at a flat, transparent rate. No hidden fees, no surge pricing.' },
    { question: 'Is there a minimum charge?', answer: 'Our minimum is 2 hours per visit. Most jobs take 2–4 hours depending on size and condition.' },
    { question: 'Do I pay before or after the service?', answer: 'You pay after the service is complete, before our team member leaves. No deposits, no pre-charges, no money upfront.' },
    { question: 'What payment methods do you accept?', answer: `We accept ${payMethods}. You choose what works best for you.` },
    { question: 'Do you offer discounts for recurring service?', answer: 'Our hourly rate stays the same. The savings with recurring service come from shorter service times — a well-maintained property takes less time each visit.' },
  ]

  const serviceFAQs = [
    { question: 'What\'s included in a standard service?', answer: 'Our team follows a consistent professional checklist for every visit tailored to the service type you book.' },
    { question: 'Do you offer commercial and residential service?', answer: 'Yes. We serve both residential and commercial clients. Same rates, same quality.' },
    { question: 'What products and equipment do you use?', answer: 'We use professional-grade products that are safe for children, pets, and all surfaces. If you have specific product preferences or allergies, let us know and we\'ll accommodate.' },
  ]

  const schedulingFAQs = [
    { question: 'How do I book?', answer: `Text or call${phone ? ` ${phone}` : ' us'}. We typically schedule within 24–48 hours. Same-day availability for urgent requests.` },
    { question: 'Can I get the same team member each time?', answer: 'Yes. For recurring clients, we assign the same dedicated team member so they learn your preferences and layout. Consistency is one of the things our clients value most.' },
    { question: 'Do you offer same-day service?', answer: `Yes. Call or text ${phoneLabel} and we\'ll dispatch a professional within hours.` },
    { question: 'How do I reschedule or cancel?', answer: `Text or call ${phoneLabel} at least 24 hours before your scheduled appointment. We\'ll reschedule at no charge. Cancellations with less than 24 hours notice may incur a fee.` },
  ]

  const trustFAQs = [
    { question: 'Are your team members licensed and insured?', answer: 'Yes. All of our team members are fully licensed, insured, and background-checked. We carry general liability insurance and bonding for your complete protection and peace of mind.' },
    { question: 'Do I need to be home during the service?', answer: 'No. Many of our clients provide a key, lockbox code, or doorman access. If you prefer to be home, that\'s perfectly fine too.' },
    { question: 'What if I\'m not satisfied?', answer: 'We offer a satisfaction guarantee. If you\'re not happy with any part of the service, contact us within 24 hours and we\'ll send a team back to address the issue at no extra charge.' },
    { question: 'Are there any contracts or commitments?', answer: 'No contracts. Stay because you\'re happy, not because you\'re locked in. Cancel recurring service anytime with 7 days notice.' },
  ]

  return { pricingFAQs, serviceFAQs, schedulingFAQs, trustFAQs }
}

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const pageUrl = `${base}/nyc-cleaning-service-frequently-asked-questions-in-2025`
  const pageTitle = `FAQ | ${name}`
  const pageDescription = `Answers to common questions about ${name} — pricing, services, scheduling, insurance, and more.${phone ? ` Call ${phone}.` : ''}`

  return {
    title: pageTitle,
    description: pageDescription,
    ...(base && { alternates: { canonical: pageUrl } }),
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      ...(base && { url: pageUrl }),
      type: 'website',
      siteName: name,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title: pageTitle,
      description: pageDescription,
    },
  }
}

export default async function FAQPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const email = tenant?.email || ''
  const zelleEmail = (tenant?.zelle_email as string | undefined) || email
  const base = tenantSiteUrl(tenant)
  const pageUrl = `${base}/nyc-cleaning-service-frequently-asked-questions-in-2025`

  const { pricingFAQs, serviceFAQs, schedulingFAQs, trustFAQs } = buildFAQs({ name, phone, zelleEmail })
  const allFAQs = [...pricingFAQs, ...serviceFAQs, ...schedulingFAQs, ...trustFAQs]

  const sections = [
    { label: 'Pricing & Payment', faqs: pricingFAQs },
    { label: 'Services & What\'s Included', faqs: serviceFAQs },
    { label: 'Scheduling & Availability', faqs: schedulingFAQs },
    { label: 'Trust, Insurance & Coverage', faqs: trustFAQs },
  ]

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          ...(base ? [{ name: 'Home', url: base }] : []),
          { name: 'FAQ', url: pageUrl },
        ]),
        faqSchema(allFAQs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-10">
            Everything you need to know about pricing, services, scheduling, and how we work — answered by our team.
            {phone && <> Can&apos;t find your question? Call <a href={`tel:${phoneDigits}`} className="text-[var(--brand-accent)] underline underline-offset-2">{phone}</a>.</>}
          </p>

          {/* Quick nav */}
          <div className="flex flex-wrap gap-3">
            {sections.map(s => (
              <a key={s.label} href={`#${s.label.toLowerCase().replace(/[^a-z]+/g, '-')}`} className="bg-white/10 text-white/80 text-sm px-4 py-2 rounded-lg hover:bg-white/20 transition-colors">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'FAQ', href: '/nyc-cleaning-service-frequently-asked-questions-in-2025' }]} />

        {/* FAQ Sections */}
        {sections.map(section => (
          <div key={section.label} id={section.label.toLowerCase().replace(/[^a-z]+/g, '-')} className="mb-16 scroll-mt-8">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">{section.label}</p>
            <div className="w-10 h-[2px] bg-[var(--brand-accent)] mb-6" />

            <div className="space-y-3">
              {section.faqs.map((faq, i) => (
                <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between p-5 md:p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                    <h2 className="font-semibold text-[var(--brand)] text-left pr-4">{faq.question}</h2>
                    <span className="text-gray-400 group-open:rotate-45 transition-transform text-2xl flex-shrink-0">+</span>
                  </summary>
                  <div className="px-5 md:px-6 pb-5 md:pb-6 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* Still have questions */}
        <div className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-3">Still Have Questions?</p>
          <p className="text-blue-200/70 max-w-xl mx-auto mb-8">
            We&apos;re happy to answer anything. Text or call us — most questions are answered within minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="/chat-with-selena" className="bg-[var(--brand-accent)] text-[var(--brand)] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-colors">
              Chat With Selena
            </a>
            {phone && (
              <a href={`tel:${phoneDigits}`} className="text-blue-200/70 font-medium text-lg hover:text-white transition-colors underline underline-offset-4">
                or Call {phone}
              </a>
            )}
          </div>
        </div>

        {/* Helpful links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <Link href="/nyc-maid-service-services-offered-by-the-nyc-maid" className="group border border-gray-200 rounded-xl p-6 hover:border-[var(--brand-accent)] transition-all">
            <p className="font-semibold text-[var(--brand)] group-hover:underline underline-offset-2 mb-1">View All Services</p>
            <p className="text-gray-500 text-sm">Browse every service we offer</p>
          </Link>
          <Link href="/service-areas-served-by-the-nyc-maid" className="group border border-gray-200 rounded-xl p-6 hover:border-[var(--brand-accent)] transition-all">
            <p className="font-semibold text-[var(--brand)] group-hover:underline underline-offset-2 mb-1">Service Areas</p>
            <p className="text-gray-500 text-sm">See where we operate</p>
          </Link>
          <Link href="/nyc-customer-reviews-for-the-nyc-maid" className="group border border-gray-200 rounded-xl p-6 hover:border-[var(--brand-accent)] transition-all">
            <p className="font-semibold text-[var(--brand)] group-hover:underline underline-offset-2 mb-1">Read Reviews</p>
            <p className="text-gray-500 text-sm">Verified customer reviews</p>
          </Link>
        </div>
      </div>

      <CTABlock title="Ready to Book?" subtitle="Text or call — trusted by clients across all our service areas." phone={phone} />
    </>
  )
}
