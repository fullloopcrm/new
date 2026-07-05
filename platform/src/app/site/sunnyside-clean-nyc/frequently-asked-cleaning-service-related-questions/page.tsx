import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema, reviewSchemas } from '@/app/site/sunnyside-clean-nyc/_lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

const L = (href: string, text: string) => `<a href="${href}" class="text-[#1E2A4A] underline underline-offset-2">${text}</a>`

const pricingFAQs = [
  { question: 'How much does house cleaning cost in NYC?', answer: `Our standard rate is $59/hr when you provide supplies (recurring: 10% off weekly, 5% off biweekly/monthly), $79/hr when we bring everything (recurring: 20% off weekly, 10% off biweekly/monthly), and $99/hr for ${L('/services/nyc-same-day-cleaning-service', 'same-day emergency service')}. A typical studio takes 2–3 hours. See our ${L('/nyc-cleaning-service-pricing', 'full pricing details')} or get a free custom quote based on your home size and cleaning needs.` },
  { question: 'Do you charge a flat rate or hourly?', answer: `We charge by the hour. The rate is the same regardless of service type or neighborhood — $59/hr with your supplies (recurring: 10% off weekly, 5% off biweekly/monthly), $79/hr when we bring everything (recurring: 20% off weekly, 10% off biweekly/monthly). No hidden fees, no surge pricing. See ${L('/nyc-cleaning-service-pricing', 'pricing')}.` },
  { question: 'Is there a minimum charge?', answer: `Our minimum is 2 hours per visit. Most ${L('/services/nyc-apartment-cleaning-service', 'apartment cleanings')} take 2–4 hours depending on size and condition.` },
  { question: 'Do I pay before or after the cleaning?', answer: 'You pay after the cleaning is complete, before the cleaner leaves. No deposits, no pre-charges, no money upfront.' },
  { question: 'What payment methods do you accept?', answer: 'We accept cash, credit card, debit card, Zelle (hi@thenycmaid.com), Venmo, and Apple Pay. You choose what works best for you.' },
  { question: 'Do you offer discounts for recurring cleanings?', answer: `Yes — discounts depend on the rate tier. $79/hr (we supply): save 20% weekly or 10% biweekly/monthly. $59/hr (you supply): save 10% weekly or 5% biweekly/monthly. On top of that, ${L('/services/nyc-maid-service', 'recurring service')} takes less time because your home stays consistently clean — so you save twice over.` },
]

const serviceFAQs = [
  { question: 'What\'s included in a regular cleaning?', answer: `Kitchen countertops, stovetop, and sink cleaning. Bathroom toilet, tub, and sink scrub. Dusting all surfaces. Vacuuming and mopping all floors. Bed making. Mirror polishing. Trash removal. Appliance exterior wipe-down. Light switches and door handles. See ${L('/services/nyc-house-cleaning-service', 'house cleaning')} or ${L('/services/nyc-apartment-cleaning-service', 'apartment cleaning')} for full details.` },
  { question: 'What\'s the difference between deep cleaning and regular cleaning?', answer: `A ${L('/services/nyc-deep-cleaning-service', 'deep cleaning')} covers everything in a regular cleaning plus: inside the oven and refrigerator, baseboard scrubbing, window sills and tracks, cabinet exteriors, light fixtures and ceiling fans, behind and under all furniture, air vents, and door frames. It's recommended for first-time clients or seasonal refreshes.` },
  { question: 'What does move-in/move-out cleaning include?', answer: `Our ${L('/services/nyc-moving-cleaning-service', 'move-in/move-out cleaning')} covers every inch of the empty space: inside all cabinets, drawers, and shelves. Inside the oven, fridge, and dishwasher. All closet interiors. Wall spot-cleaning and scuff removal. Window interiors. Baseboard scrubbing. All floors scrubbed and polished. Final walk-through inspection.` },
  { question: 'Do you clean offices and commercial spaces?', answer: `Yes. We provide professional ${L('/services/nyc-office-cleaning-service', 'office cleaning')} for small offices, co-working spaces, medical offices, and retail spaces. Same rates, same quality. Desk and workstation wipe-down, ${L('/services/nyc-common-area-cleaning-service', 'common areas')}, restrooms, and kitchen/break room included.` },
  { question: 'Do you offer Airbnb turnover cleaning?', answer: 'Yes. We follow a strict checklist for short-term rental turnovers: strip and remake beds, amenity restocking check, photo-ready staging, full bathroom scrub, kitchen reset, and spot-check for damage. Fast turnovers between guests.' },
  { question: 'What cleaning products do you use?', answer: 'We use professional-grade, eco-friendly cleaning products that are safe for children, pets, and all surfaces. If you have specific product preferences or allergies, let us know and we\'ll accommodate.' },
]

const schedulingFAQs = [
  { question: 'How do I book a cleaning?', answer: 'Text or call (212) 202-8400, or book online at cleaningservicesunnysideny.com. We typically schedule within 24–48 hours. Same-day availability for urgent requests.' },
  { question: 'Can I get the same cleaner each time?', answer: `Yes. For ${L('/services/nyc-maid-service', 'recurring clients')}, we assign the same dedicated cleaner to your home so they learn your preferences and layout. Consistency is one of the things our clients value most.` },
  { question: 'Do you offer same-day cleaning?', answer: `Yes. Our ${L('/services/nyc-same-day-cleaning-service', 'same-day cleaning service')} dispatches a professional cleaner within hours. Call or text (212) 202-8400. Same-day service is $99/hr.` },
  { question: 'How do I reschedule or cancel?', answer: 'Text or call us at least 24 hours before your scheduled cleaning. We\'ll reschedule at no charge. Cancellations with less than 24 hours notice may incur a fee.' },
  { question: 'What hours do you operate?', answer: 'Office hours are Monday through Saturday 7am to 7pm. Sales and booking inquiries are available 24/7 — call or text (212) 202-8400 anytime.' },
]

const trustFAQs = [
  { question: 'Are your cleaners licensed and insured?', answer: `Yes. All of our cleaners are fully licensed, insured, and background-checked. We carry general liability insurance and bonding for your complete protection and peace of mind. ${L('/about-nyc-cleaning-service-sunnyside-clean-nyc', 'Learn more about us')}.` },
  { question: 'Do I need to be home during the cleaning?', answer: 'No. Many of our clients provide a key, lockbox code, or doorman access. If you prefer to be home, that\'s perfectly fine too.' },
  { question: 'What if I\'m not satisfied with the cleaning?', answer: `We offer a satisfaction guarantee. If you're not happy with any part of the cleaning, ${L('/contact-nyc-cleaning-service-sunnyside-clean-nyc', 'contact us')} within 24 hours and we'll send a team back to address the issue at no extra charge.` },
  { question: 'Do you bring your own supplies?', answer: `It's your choice. At $59/hr you provide the supplies. At $79/hr we bring everything — professional-grade cleaning products and all equipment needed. See ${L('/nyc-cleaning-service-pricing', 'pricing details')}.` },
  { question: 'Are there any contracts or commitments?', answer: `No contracts. Stay because you're happy, not because you're locked in. Cancel ${L('/services/nyc-maid-service', 'recurring service')} anytime with 7 days notice.` },
  { question: 'What areas do you serve?', answer: `We serve ${L('/service-areas/manhattan-cleaning-services', 'Manhattan')}, ${L('/service-areas/brooklyn-cleaning-services', 'Brooklyn')}, and ${L('/service-areas/queens-cleaning-services', 'Queens')}. Same rates everywhere — no travel surcharges. See all ${L('/service-areas', '267+ neighborhoods')}.` },
  { question: 'How long does a cleaning take?', answer: `${L('/services/nyc-house-cleaning-service', 'Regular cleaning')}: 2–4 hours. ${L('/services/nyc-deep-cleaning-service', 'Deep cleaning')}: 2–4 hours. ${L('/services/nyc-moving-cleaning-service', 'Move-in/out')}: 4–8 hours. Time depends on home size and condition.` },
]

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '')
const allFAQs = [...pricingFAQs, ...serviceFAQs, ...schedulingFAQs, ...trustFAQs]
const schemaFAQs = allFAQs.map(f => ({ question: f.question, answer: stripHtml(f.answer) }))

const pageUrl = 'https://www.cleaningservicesunnysideny.com/frequently-asked-cleaning-service-related-questions'
const pageTitle = 'NYC Cleaning Service FAQ — Pricing, Services & Scheduling | Sunnyside Clean NYC'
const pageDescription = 'Answers to common questions about Sunnyside Clean NYC — pricing ($59–$99/hr), what\'s included, scheduling, insurance, service areas, and more. Serving Manhattan, Brooklyn & Queens. (212) 202-8400'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    type: 'website',
    siteName: 'Sunnyside Clean NYC',
    locale: 'en_US',
    images: [{ url: 'https://www.cleaningservicesunnysideny.com/images/sunnyside-clean-nyc.png', width: 512, height: 512, alt: 'Sunnyside Clean NYC' }],
  },
  twitter: {
    card: 'summary',
    title: pageTitle,
    description: pageDescription,
  },
  other: {
    'geo.region': 'US-NY',
    'geo.placename': 'New York City',
    'geo.position': '40.7589;-73.9851',
    'ICBM': '40.7589, -73.9851',
  },
}

export default function FAQPage() {
  const sections = [
    { label: 'Pricing & Payment', faqs: pricingFAQs },
    { label: 'Services & What\'s Included', faqs: serviceFAQs },
    { label: 'Scheduling & Availability', faqs: schedulingFAQs },
    { label: 'Trust, Insurance & Coverage', faqs: trustFAQs },
  ]

  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          type: 'FAQPage',
          breadcrumb: [
            { name: 'Home', url: 'https://www.cleaningservicesunnysideny.com' },
            { name: 'FAQ', url: pageUrl },
          ],
        }),
        localBusinessSchema(),
        howToBookSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.cleaningservicesunnysideny.com' },
          { name: 'FAQ', url: pageUrl },
        ]),
        faqSchema(schemaFAQs),
        ...reviewSchemas(),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-blue-200/70 text-sm font-medium">5.0 Google Rating &middot; 27 Reviews</span>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Frequently Asked Questions About NYC House Cleaning Services
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-10">
            Everything you need to know about pricing, services, scheduling, and how we work — answered by our team. Can&apos;t find your question? Call <a href="tel:2122028400" className="text-[#A8F0DC] underline underline-offset-2">(212) 202-8400</a>.
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
        <Breadcrumbs items={[{ name: 'FAQ', href: '/frequently-asked-cleaning-service-related-questions' }]} />

        {/* FAQ Sections */}
        {sections.map(section => (
          <div key={section.label} id={section.label.toLowerCase().replace(/[^a-z]+/g, '-')} className="mb-16 scroll-mt-8">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">{section.label}</p>
            <div className="w-10 h-[2px] bg-[#A8F0DC] mb-6" />

            <div className="space-y-3">
              {section.faqs.map((faq, i) => (
                <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between p-5 md:p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                    <h2 className="font-semibold text-[#1E2A4A] text-left pr-4">{faq.question}</h2>
                    <span className="text-gray-400 group-open:rotate-45 transition-transform text-2xl flex-shrink-0">+</span>
                  </summary>
                  <div className="px-5 md:px-6 pb-5 md:pb-6 text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* Quick pricing reference */}
        <div className="bg-[#A8F0DC] rounded-2xl p-8 md:p-12 mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-[#1E2A4A]/50 tracking-[0.25em] uppercase mb-2">Quick Pricing Reference</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-8">Three Simple Rates — No Hidden Fees</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-1">Client Supplies</p>
                <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">$59<span className="text-xl text-gray-300">/hr</span></p>
                <p className="text-[#1E2A4A] text-[10px] font-semibold tracking-wide mt-1">10% off weekly &middot; 5% off biweekly/monthly</p>
              </div>
              <div className="bg-[#1E2A4A] rounded-xl p-5">
                <p className="text-xs font-semibold text-[#A8F0DC]/70 tracking-[0.15em] uppercase mb-1">We Bring Everything</p>
                <p className="font-[family-name:var(--font-bebas)] text-4xl text-white tracking-wide">$79<span className="text-xl text-blue-200/40">/hr</span></p>
                <p className="text-[#A8F0DC] text-[10px] font-semibold tracking-wide mt-1">20% off weekly &middot; 10% off biweekly/monthly</p>
              </div>
              <div className="bg-white rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-1">Same-Day</p>
                <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">$99<span className="text-xl text-gray-300">/hr</span></p>
              </div>
            </div>
            <Link href="/nyc-cleaning-service-pricing" className="inline-block mt-6 text-[#1E2A4A] font-semibold underline underline-offset-4 hover:no-underline">
              View Full Pricing Details &rarr;
            </Link>
          </div>
        </div>

        {/* Still have questions */}
        <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-3">Still Have Questions?</p>
          <p className="text-blue-200/70 max-w-xl mx-auto mb-8">
            We&apos;re happy to answer anything. Text or call us — most questions are answered within minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="sms:2122028400" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Text (212) 202-8400
            </a>
            <a href="tel:2122028400" className="text-blue-200/70 font-medium text-lg hover:text-white transition-colors underline underline-offset-4">
              or Call Us
            </a>
          </div>
        </div>

        {/* Helpful links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <Link href="/nyc-cleaning-services-offered" className="group border border-gray-200 rounded-xl p-6 hover:border-[#A8F0DC] transition-all">
            <p className="font-semibold text-[#1E2A4A] group-hover:underline underline-offset-2 mb-1">View All Services</p>
            <p className="text-gray-500 text-sm">10 cleaning services for every situation</p>
          </Link>
          <Link href="/service-areas" className="group border border-gray-200 rounded-xl p-6 hover:border-[#A8F0DC] transition-all">
            <p className="font-semibold text-[#1E2A4A] group-hover:underline underline-offset-2 mb-1">Service Areas</p>
            <p className="text-gray-500 text-sm">Manhattan, Brooklyn &amp; Queens</p>
          </Link>
          <a href="https://share.google/Iq9oblq3vJr07aP27" target="_blank" rel="noopener noreferrer" className="group border border-gray-200 rounded-xl p-6 hover:border-[#A8F0DC] transition-all">
            <p className="font-semibold text-[#1E2A4A] group-hover:underline underline-offset-2 mb-1">Read Reviews</p>
            <p className="text-gray-500 text-sm">27 verified 5-star Google reviews</p>
          </a>
        </div>
      </div>

      <CTABlock title="Ready to Book Your Cleaning?" subtitle="Text or call — trusted by New Yorkers across Manhattan, Brooklyn & Queens." />
    </>
  )
}
