import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, breadcrumbSchema, faqSchema } from '@/app/site/nycmaid/_lib/seo/schema'
import JsonLd from '@/app/site/nycmaid/_components/JsonLd'
import Breadcrumbs from '@/app/site/nycmaid/_components/Breadcrumbs'
import { getPosition } from '@/lib/positions/catalog'

const pageUrl = 'https://www.thenycmaid.com/careers/administrator'
const pageTitle = 'Administrator (Remote, Full Oversight) | The NYC Maid'
const pageDescription = 'The NYC Maid is hiring an Administrator to run the day-to-day operation — team, clients, payments, hiring, and quality control. $1,000/week 1099 for the first 90 days, then 10% of net profit. Remote, Monday-Friday.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' as const },
  openGraph: { title: pageTitle, description: pageDescription, url: pageUrl, type: 'article', siteName: 'The NYC Maid' },
}

function administratorJobPostingSchema(config: NonNullable<ReturnType<typeof getPosition>>) {
  const now = new Date()
  const datePosted = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
  const validThrough = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: config.title,
    datePosted,
    validThrough,
    description: `<h2>${config.title} — The NYC Maid — Remote</h2><p>${config.tagline}</p><p><strong>Compensation:</strong> ${config.compSummary}</p><p><strong>Schedule:</strong> ${config.schedule}</p><p><strong>Employment type:</strong> ${config.employmentType}</p>${config.responsibilitiesNote ? `<p>${config.responsibilitiesNote}</p>` : ''}<p>How to apply: <a href="${pageUrl.replace('/careers/', '/apply/')}">thenycmaid.com/apply/administrator</a>. Includes a short video introduction.</p>`,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'The NYC Maid',
      sameAs: 'https://www.thenycmaid.com',
      url: 'https://www.thenycmaid.com',
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: { '@type': 'Country', name: 'US' },
    employmentType: 'CONTRACTOR',
    directApply: true,
    url: pageUrl,
    identifier: { '@type': 'PropertyValue', name: 'The NYC Maid', value: 'nycmaid-administrator-2026' },
    industry: 'Cleaning Services',
    qualifications: 'Experience managing or operating a service business or team. Comfortable owning scheduling, client communication, payments, and hiring end to end.',
    jobBenefits: config.compSummary,
    workHours: config.schedule,
  }
}

const faqs = [
  { question: 'Is this a General Manager role?', answer: 'Functionally, yes — full ownership of the day-to-day operation. It is titled Administrator because the platform automates most of the routine work a GM would otherwise spend hours on, so the workload is lighter than a traditional GM role while the responsibility is not.' },
  { question: 'What does the compensation structure look like?', answer: '$1,000/week as a 1099 independent contractor for the first 90 days. After 90 days, compensation moves to 10% of net profit, with scaling opportunities to discuss as the business grows.' },
  { question: 'Is this remote?', answer: 'Yes — fully remote, work from home. Schedule is Monday through Friday, 8:00 AM to 6:00 PM.' },
  { question: 'Will I need to manage anyone else?', answer: 'Yes. Part of this role is training the weekend assistant administrator, who covers weekend service — so you are building a playbook someone else can run, not just running the operation yourself.' },
  { question: 'How do I apply?', answer: 'Submit the application at thenycmaid.com/apply/administrator. It includes background questions, a few scenario questions, and a short required video introduction.' },
]

export default function AdministratorCareersPage() {
  const config = getPosition('nycmaid', 'administrator')
  if (!config) return null

  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          type: 'WebPage',
          breadcrumb: [
            { name: 'Home', url: 'https://www.thenycmaid.com' },
            { name: 'Careers', url: 'https://www.thenycmaid.com/available-nyc-maid-jobs' },
            { name: 'Administrator', url: pageUrl },
          ],
        }),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Careers', url: 'https://www.thenycmaid.com/available-nyc-maid-jobs' },
          { name: 'Administrator', url: pageUrl },
        ]),
        administratorJobPostingSchema(config),
        faqSchema(faqs),
      ]} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className="text-[#A8F0DC] text-sm font-semibold tracking-[0.2em] uppercase">Now Hiring</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Remote</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Full Oversight</p>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide leading-[0.95] mb-6">
            {config.title} — Run the Operation
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-6">{config.tagline}</p>
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.compSummary}</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.schedule}</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.employmentType}</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.location}</span>
          </div>
          <Link href="/apply/administrator" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
            Apply Now
          </Link>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Careers', href: '/available-nyc-maid-jobs' },
          { name: 'Administrator', href: '/careers/administrator' },
        ]} />

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-4">What You Own</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            The team is sold on and scheduled. From that point, the operation is yours — team coordination, client communication, payment collection, quality control, and hiring. It is general-manager-level ownership. It is not general-manager-level hours, because the platform automates most of the routine work: confirmations, reminders, check-ins, and payment tracking all happen automatically. You handle the judgment calls, not the busywork.
          </p>
          {config.responsibilitiesNote && (
            <p className="text-gray-600 leading-relaxed">{config.responsibilitiesNote}</p>
          )}
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-4">Compensation &amp; Schedule</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Compensation</p>
              <p className="text-slate-700">{config.compSummary}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Employment Type</p>
              <p className="text-slate-700">{config.employmentType}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Schedule</p>
              <p className="text-slate-700">{config.schedule}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Location</p>
              <p className="text-slate-700">{config.location}</p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group border border-gray-200 rounded-xl overflow-hidden hover:border-[#A8F0DC] transition-colors">
                <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
                  <span className="font-medium text-[#1E2A4A] text-sm">{faq.question}</span>
                  <span className="text-[#A8F0DC] text-lg flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-[#A8F0DC] rounded-2xl p-8 md:p-12 text-center">
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">Full Ownership. Real Business.</p>
          <p className="text-[#1E2A4A]/60 max-w-xl mx-auto mb-6">
            Apply in a few minutes. Background questions, a few scenario questions, and a short required video introduction.
          </p>
          <Link href="/apply/administrator" className="inline-block bg-[#1E2A4A] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
            Apply Now
          </Link>
        </section>
      </div>
    </>
  )
}
