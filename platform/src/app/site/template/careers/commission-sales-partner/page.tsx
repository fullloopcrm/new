import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, breadcrumbSchema, faqSchema, buildBusiness, type Biz } from '@/app/site/template/_lib/seo/schema'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import JsonLd from '@/app/site/template/_components/JsonLd'
import Breadcrumbs from '@/app/site/template/_components/Breadcrumbs'

export const dynamic = 'force-dynamic'

function jobPostingSchema(biz: Biz, noun: string) {
  const now = new Date()
  const datePosted = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const validThrough = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: 'Commission Sales Representative (1099)',
    datePosted,
    validThrough,
    description: `<h2>Commission Sales Partner — ${biz.name}</h2>
<p>Earn <strong>10% recurring commission</strong> on every completed job — from clients you sign directly OR from referrers you recruit. Paid via Zelle or Apple Cash after each completed job. 1099 independent contractor, no cap.</p>
<h3>Two ways to earn — both pay 10% recurring, both pay forever</h3>
<ul><li><strong>Sign clients directly</strong> — 10% recurring on every job they book.</li>
<li><strong>Sign referrers</strong> — recruit people who send us clients, and earn 10% on every job their network generates.</li></ul>
<h3>How to apply</h3>
<p>Apply on this site — include a 60-second selfie video.</p>`,
    hiringOrganization: {
      '@type': 'Organization',
      name: biz.name,
      ...(biz.url ? { sameAs: biz.url, url: biz.url } : {}),
      ...(biz.logo ? { logo: { '@type': 'ImageObject', url: biz.logo, width: 512, height: 512 } } : {}),
      telephone: biz.phone,
      email: biz.email,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: biz.placename, addressRegion: biz.region, addressCountry: 'US' },
    },
    applicantLocationRequirements: { '@type': 'Country', name: 'US' },
    employmentType: ['CONTRACTOR', 'PART_TIME', 'FULL_TIME'],
    jobImmediateStart: true,
    totalJobOpenings: 5,
    directApply: true,
    url: `${biz.url}/careers/commission-sales-partner`,
    industry: 'Services',
    occupationalCategory: '41-3091.00',
    qualifications: `Local network access. Relationship builder. Sales background helpful, not required.`,
    responsibilities: `Sign ${noun} clients and referral partners. Build and maintain a recurring book of business.`,
    skills: 'Relationship building, prospecting, referral network development, communication, follow-through',
    incentiveCompensation: '10% recurring commission on every completed job, from direct clients and referrer networks. Paid via Zelle or Apple Cash. 1099 independent contractor, uncapped.',
    jobBenefits: 'Recurring commission that compounds. No cap. 1099 — be your own boss.',
    educationRequirements: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'high school' },
    experienceRequirements: { '@type': 'OccupationalExperienceRequirements', monthsOfExperience: 0 },
    experienceInPlaceOfEducation: true,
    applicationContact: { '@type': 'ContactPoint', telephone: biz.phone, email: biz.email, contactType: 'Recruiting' },
  }
}

const faqs = [
  { question: 'How do I get paid?', questionEs: '¿Cómo me pagan?', answer: 'Via Zelle or Apple Cash after each completed job. No invoicing, no chasing.' },
  { question: 'What exactly earns me commission?', questionEs: '¿Qué exactamente me genera comisión?', answer: 'Every completed job tied to you — whether it came from a client you signed directly or from anyone in your referrer network. 10% recurring, for as long as they stay a customer.' },
  { question: 'Is there a cap?', questionEs: '¿Hay un límite?', answer: 'No. 1099 independent contractor, no ceiling. Sign clients directly, sign referrers who bring us clients, or stack both.' },
  { question: 'Do I need prior sales experience?', questionEs: '¿Necesito experiencia previa en ventas?', answer: 'Helpful but not required. What matters most is your network and your hustle.' },
  { question: "What's the commitment?", questionEs: '¿Cuál es el compromiso?', answer: 'This is a build. Early months are the foundation; real income comes from compounding.' },
  { question: 'What do I get to work with?', questionEs: '¿Con qué herramientas cuento?', answer: 'A unique tracking link and code (permanent attribution) and a commission history you can see in your own portal.' },
]

export default async function CommissionSalesPartnerPage() {
  const config = await getSiteConfig()
  const biz = buildBusiness(config)
  const noun = industryProfile(config.industry).serviceNoun
  const pageUrl = `${biz.url}/careers/commission-sales-partner`
  const pageTitle = `Commission Sales Jobs — 1099 Sales Rep, 10% Recurring | ${biz.name}`
  const pageDescription = `Commission sales role at ${biz.name}. 1099 sales rep — sign clients or referrers, earn 10% recurring on every completed job, paid via Zelle or Apple Cash. Uncapped. Apply now.`

  return (
    <>
      <JsonLd data={[
        organizationSchema(biz),
        webSiteSchema(biz),
        webPageSchema(biz, {
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          type: 'WebPage',
          speakable: ['h1', 'h2', '.hero-description'],
          breadcrumb: [
            { name: 'Home', url: biz.url },
            { name: 'Careers', url: `${biz.url}/careers` },
            { name: 'Commission Sales Partner', url: pageUrl },
          ],
        }),
        breadcrumbSchema([
          { name: 'Home', url: biz.url },
          { name: 'Careers', url: `${biz.url}/careers` },
          { name: 'Commission Sales Partner', url: pageUrl },
        ]),
        jobPostingSchema(biz, noun),
        faqSchema(faqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className="text-[var(--accent)] text-sm font-semibold tracking-[0.2em] uppercase">Now Hiring</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">1099 &middot; Uncapped</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Paid via Zelle / Apple Cash</p>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Commission Sales — 10% Recurring, No Ceiling
          </h1>
          <p className="hero-description text-blue-200/80 text-lg max-w-3xl leading-relaxed mb-3">
            {biz.name} &mdash; {biz.placename}
          </p>
          <p className="text-blue-200/60 max-w-3xl leading-relaxed mb-6">
            Two ways to earn &mdash; both pay <strong className="text-white">10% recurring</strong>, both pay forever. Sign clients directly, sign referrers who bring us clients, or stack both.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <span className="bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent)] text-xs font-semibold px-4 py-2 rounded-full">10% Recurring &mdash; Forever</span>
            <span className="bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent)] text-xs font-semibold px-4 py-2 rounded-full">Paid via Zelle / Apple Cash</span>
            <span className="bg-[rgb(var(--accent-rgb)/0.2)] text-[var(--accent)] text-xs font-semibold px-4 py-2 rounded-full">1099 &middot; No Cap</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Link href="/apply/commission-sales-partner" data-track="sales-hero-apply" className="bg-[var(--accent)] text-[var(--brand)] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors">
              Apply Now
            </Link>
            <a href={`tel:${biz.phone}`} data-track="sales-hero-call" className="text-blue-200/70 font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
              or Call {biz.phoneDisplay}
            </a>
          </div>
        </div>
      </section>

      {/* Numbers Bar */}
      <section className="bg-[var(--accent)] py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand)] tracking-wide">10%</p>
              <p className="text-[rgb(var(--brand-rgb)/0.6)] text-sm font-medium">Recurring, Forever</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand)] tracking-wide">No Cap</p>
              <p className="text-[rgb(var(--brand-rgb)/0.6)] text-sm font-medium">1099 Independent Contractor</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[var(--brand)] tracking-wide">Zelle</p>
              <p className="text-[rgb(var(--brand-rgb)/0.6)] text-sm font-medium">Fast Payouts</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Careers', href: '/careers' },
          { name: 'Commission Sales Partner', href: '/careers/commission-sales-partner' },
        ]} />

        {/* Two ways to earn */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.2em] uppercase mb-2">How You Earn</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-3">Two Ways to Earn. Both Pay 10% Recurring. Both Pay Forever.</h2>
          <p className="text-gray-400 text-sm italic mb-3">Dos formas de ganar. Ambas pagan 10% recurrente, para siempre.</p>
          <p className="text-gray-500 max-w-3xl mb-10">Direct clients pay you fast. Referrer networks compound long-term. Together = a real passive income book that grows every month.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] p-6">
                <p className="font-[family-name:var(--font-bebas)] text-5xl text-[var(--accent)] tracking-wide mb-1">1</p>
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Sign Clients Directly</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm leading-relaxed">Close a client and you earn <strong>10% recurring on every job they book</strong>. As long as they&apos;re a client, you&apos;re paid.</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand-alt)] p-6">
                <p className="font-[family-name:var(--font-bebas)] text-5xl text-[var(--accent)] tracking-wide mb-1">2</p>
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Sign Referrers</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm leading-relaxed">Recruit people who refer clients, and <strong>you earn 10% on every job generated by your referrer network</strong>. Sign the referrer once, earn on everything they send us for years.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Already Built</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-3">The Infrastructure Is Built. You Just Plug In.</h2>
          <p className="text-gray-500 max-w-3xl mb-10">Every part of the commission tracking is already live and running. No manual reporting, no guessing at the math &mdash; every dollar is tracked and traceable to the source booking.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Unique tracking URL and code — permanent attribution locked to you',
              'Auto-applied at booking — commission calculated the moment the booking is created',
              'Commission history — every lead and booking as it happens, in your own portal',
              'Full audit trail — every commission timestamped and traceable to the source booking',
              'Recurring commissions auto-apply — every future job fires another commission',
            ].map((item) => (
              <div key={item} className="flex gap-2 border border-gray-200 rounded-xl p-4">
                <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                <p className="text-gray-600 text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Target segments */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.2em] uppercase mb-2">Your Target List</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-8">Two Lanes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[var(--brand)] mb-3">Direct clients (10% on their jobs)</h3>
              <div className="space-y-2">
                {['Homeowners in your network', 'Commercial accounts — offices, gyms, medical, retail', 'Property management contracts', 'Airbnb hosts and superhosts'].map((i) => (
                  <div key={i} className="flex gap-2"><span className="text-[var(--accent)] mt-0.5">&#10003;</span><p className="text-gray-600 text-sm">{i}</p></div>
                ))}
              </div>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[var(--brand)] mb-3">Referrers (10% on all their referrals)</h3>
              <div className="space-y-2">
                {['Building doormen', 'Real estate agents', 'Corporate concierges', 'Moving companies', 'Interior designers'].map((i) => (
                  <div key={i} className="flex gap-2"><span className="text-[var(--accent)] mt-0.5">&#10003;</span><p className="text-gray-600 text-sm">{i}</p></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What we look for + the catch */}
        <section className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="font-semibold text-[var(--brand)] mb-3">What We&apos;re Looking For</h3>
            <div className="space-y-2">
              {['Relationship builder — you know people in your neighborhood or industry', 'Sales background helpful, not required', 'Strong communication', `Based in ${biz.placename} with real network access`, 'Hungry for passive income and willing to build a book over time', 'Comfortable working as a 1099'].map((i) => (
                <div key={i} className="flex gap-2"><span className="text-[var(--accent)] mt-0.5">&#10003;</span><p className="text-gray-600 text-sm">{i}</p></div>
              ))}
            </div>
          </div>
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="font-semibold text-[var(--brand)] mb-3">The Catch</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-3">There isn&apos;t one. But be honest with yourself before applying:</p>
            <div className="space-y-2">
              {['This is a build. Early months are the foundation — real income comes from compounding.', 'You do the outreach — meetings, calls, follow-ups.', 'A slow start is normal — the book compounds as your relationships pay off.'].map((i) => (
                <div key={i} className="flex gap-2"><span className="text-[var(--brand)] mt-0.5">&bull;</span><p className="text-gray-600 text-sm">{i}</p></div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[var(--accent)] tracking-[0.2em] uppercase mb-2">Questions</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group border border-gray-200 rounded-xl overflow-hidden hover:border-[var(--accent)] transition-colors">
                <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-[var(--brand)] text-sm">{faq.question}</span>
                    <span className="block text-gray-400 text-xs italic mt-0.5">{faq.questionEs}</span>
                  </div>
                  <span className="text-[var(--accent)] text-lg flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-5"><p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p></div>
              </details>
            ))}
          </div>
        </section>

        {/* Apply CTA */}
        <section className="bg-[var(--accent)] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-2">10% Recurring. No Ceiling.</p>
          <p className="text-[rgb(var(--brand-rgb)/0.6)] max-w-xl mx-auto mb-6">Apply in a few minutes — include a 60-second selfie video. We respond within 48 hours.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/apply/commission-sales-partner" data-track="sales-bottom-apply" className="bg-[var(--brand)] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
              Apply Now
            </Link>
            <a href={`tel:${biz.phone}`} data-track="sales-bottom-call" className="text-[rgb(var(--brand-rgb)/0.6)] font-medium text-sm hover:text-[var(--brand)] transition-colors underline underline-offset-4">
              or Call {biz.phoneDisplay}
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
