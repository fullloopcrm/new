import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, breadcrumbSchema, faqSchema } from '@/app/site/connecticut-maid/_lib/seo/schema'
import JsonLd from '@/app/site/connecticut-maid/_components/JsonLd'
import Breadcrumbs from '@/app/site/connecticut-maid/_components/Breadcrumbs'
import { getPosition } from '@/lib/positions/catalog'

const pageUrl = 'https://www.theconnecticutmaid.com/careers/administrator'
const pageTitle = 'Administrator — Your Path to CEO of a Multi-Million-Dollar Company | The Connecticut Maid'
const pageDescription = 'The Connecticut Maid is a brand-new market launch backed by the same team and platform behind The NYC Maid. We’re hiring an Administrator with a real long-term path to becoming CEO. Compensation based on experience. Remote, anywhere in the US.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' as const },
  openGraph: { title: pageTitle, description: pageDescription, url: pageUrl, type: 'article', siteName: 'The Connecticut Maid' },
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
    description: `<h2>${config.title} — The Connecticut Maid — Remote, Anywhere in the US</h2><p>${config.tagline}</p><p><strong>Compensation:</strong> ${config.compSummary}</p><p><strong>Schedule:</strong> ${config.schedule}</p><p><strong>Employment type:</strong> ${config.employmentType}</p>${config.responsibilitiesNote ? `<p>${config.responsibilitiesNote}</p>` : ''}<p>How to apply: <a href="${pageUrl.replace('/careers/', '/apply/')}">theconnecticutmaid.com/apply/administrator</a>. Includes a short video introduction.</p>`,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'The Connecticut Maid',
      sameAs: 'https://www.theconnecticutmaid.com',
      url: 'https://www.theconnecticutmaid.com',
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: { '@type': 'Country', name: 'US' },
    employmentType: 'CONTRACTOR',
    directApply: true,
    url: pageUrl,
    identifier: { '@type': 'PropertyValue', name: 'The Connecticut Maid', value: 'connecticut-maid-administrator-2026' },
    industry: 'Cleaning Services',
    qualifications: 'Experience managing or operating a service business or team. Comfortable owning scheduling, client communication, payments, and hiring end to end. Willing to learn to manage and eventually help implement AI-driven systems. Bilingual (Spanish) a plus.',
    jobBenefits: config.compSummary,
    workHours: config.schedule,
  }
}

const ownershipAreas = [
  {
    title: 'Sales & Growth',
    detail: 'Own the pipeline from lead to booked client — the lead queue, the service and pricing catalog, the sales-partner commission program, and the referral program that keeps growth compounding.',
  },
  {
    title: 'Day-to-Day Operations',
    detail: 'Run bookings, scheduling, and crew coordination. When a team member no-shows or a client is upset, you’re the one making the call in the next ten minutes — not escalating it.',
  },
  {
    title: 'Client Relationships',
    detail: 'Quality control, feedback, and retention. Every client interaction reflects on the business, and you own making sure it holds up.',
  },
  {
    title: 'Finance',
    detail: 'Real bookkeeping — transactions, expenses, payroll, bank reconciliation, and a formal monthly close. This is the actual books, not a revenue dashboard.',
  },
  {
    title: 'People & Hiring',
    detail: 'Recruit, onboard, and pay the team. You’ll also train the weekend assistant administrator who covers weekend service — building a playbook someone else can run, not just running it yourself.',
  },
  {
    title: 'Marketing',
    detail: 'Campaigns, review requests, social, Google Business Profile, the marketing site, and the analytics behind all of it.',
  },
  {
    title: 'AI Systems',
    detail: 'Voice, SMS, and web chat already run through an AI agent. You’ll be trained to manage it day to day — tuning responses and escalation rules — and eventually to help implement it fresh as each new market goes live. This is a named, core skill for this role, not a side task.',
  },
  {
    title: 'Company Systems',
    detail: 'As you grow into General Manager and beyond, this expands to owning the rules the business runs on — pricing, service areas, integrations, and who has access to what.',
  },
]

const requirements = [
  'Fully available, and completely "all in." This is remote, but it’s a primary commitment, not a side gig.',
  'Dependable, reliable, and honest — you’ll have visibility into finance, payroll, and eventually a real ownership stake, so trust isn’t optional here.',
  'A self-starter and a natural leader — someone who takes control and ownership without needing to be managed.',
  'Goal-driven and ambitious — someone who sets goals, crushes them, and always wants more. Not a clock-watcher waiting for the day to end.',
  '100% communication and a strong team builder. You’re training people from day one and will be building teams across multiple markets as we grow.',
  'Positive, grateful, and even-keeled — your energy sets the tone for the team and the client relationships you own.',
  'Bilingual is a plus — Spanish would be ideal, and matches the team you’ll be working with.',
]

const ninetyDays = [
  { range: 'Weeks 1–2', focus: 'Production & Clients', detail: 'Learn bookings, scheduling, crews, and how client issues actually get handled — the parts of the business that break fastest if they’re neglected.' },
  { range: 'Weeks 3–4', focus: 'AI, People & Sales', detail: 'Get fluent in what the AI agent already automates, meet the team, and learn the sales pipeline it feeds.' },
  { range: 'Weeks 5–8', focus: 'Finance', detail: 'Ramp into payroll and the monthly close with real support — this is deliberately not rushed.' },
  { range: 'Weeks 9–12', focus: 'Marketing & Systems', detail: 'Take on campaigns, reviews, and the settings that run the business.' },
]

const learningAreas = [
  { title: 'A Brand-New CRM', detail: 'Full Loop CRM — the exact system we built and run this entire company on. You’ll learn how a real operating system for a service business works, end to end, not just how to click through software.' },
  { title: 'AI', detail: 'How to manage the AI agent already running our voice, SMS, and web chat — and eventually how to implement AI systems yourself as we launch in new markets.' },
  { title: 'How to Manage & Grow a Company', detail: 'Real operational leadership — hiring, team-building, finance, and the judgment calls that make someone capable of running a business, not just working in one.' },
  { title: 'Marketing & SEO', detail: 'Campaigns, reviews, social, Google Business Profile, website performance, and the analytics behind all of it.' },
]

const qualifyingQuestions = [
  'Are you dependable — the kind of person who shows up and follows through, every time, without being chased?',
  'Are you responsible enough to be trusted with real financial oversight — payroll, client payments, and eventually company decisions?',
  'Do you have experience in an administrator, manager, or operator role — running a team, a shift, a department, or a business of your own?',
  'Are you comfortable being 100% available and fully committed to one opportunity, not splitting your attention across several?',
  'Can you stay calm and make a good call under pressure — a no-show, an upset client, a scheduling conflict — without waiting to be told what to do?',
  'Are you excited, not intimidated, by learning brand-new systems from scratch — a CRM, AI tools, marketing platforms — with no prior experience required?',
  'Are you a strong communicator who can build real trust with a team and with clients?',
  'Are you thinking long-term — looking for a real career and eventual ownership, not just a paycheck?',
  'When you see an under-resourced operation with obvious, untapped upside, does that excite you — or overwhelm you?',
]

const faqs = [
  { question: 'Is this a General Manager role?', answer: 'Functionally, yes — full ownership of the day-to-day operation. It is titled Administrator because the platform automates most of the routine work a GM would otherwise spend hours on, so the workload is lighter than a traditional GM role while the responsibility is not. It is also Stage 1 of a real progression — this role is built to grow into General Manager, and eventually into running the company.' },
  { question: 'What does the compensation structure look like?', answer: 'Compensation is based on experience and discussed directly as part of the process. Long-term, this is a real path toward becoming CEO of a multi-million-dollar company.' },
  { question: 'Is this a real, backed opportunity?', answer: 'The Connecticut Maid is a brand-new market launch from the same team and platform behind The NYC Maid, one of New York City’s highest-rated cleaning companies, backed by someone with 20 years of experience in home services marketing. This is a genuine ground-floor role in a new market, not an established operation with a track record yet — that’s exactly the opportunity: you’d be building it.' },
  { question: 'Do I need to live in Connecticut?', answer: 'No. This is fully remote and open to candidates anywhere in the United States.' },
  { question: 'Will I need to know AI tools already?', answer: 'No prior AI experience required — you’ll be trained to manage and eventually help implement the AI agent that already handles voice, SMS, and web chat for the business. As we expand into new markets, this becomes one of the most important parts of the role.' },
  { question: 'Will I need to manage anyone else?', answer: 'Yes. Part of this role is training the weekend assistant administrator, who covers weekend service — so you are building a playbook someone else can run, not just running the operation yourself. As the company grows into new markets, that team-building responsibility grows with it.' },
  { question: 'What’s the long-term path here?', answer: 'This role starts as Administrator, with a real track toward General Manager and eventually running the operation as it grows. The exact milestones are worked out directly with ownership as you grow into the role — this is a genuine long-term opportunity, not a scripted ladder.' },
  { question: 'How do I apply?', answer: 'Submit the application at theconnecticutmaid.com/apply/administrator. It includes background questions, a few scenario questions, and a short required video introduction.' },
]

export default function AdministratorCareersPage() {
  const config = getPosition('connecticut-maid', 'administrator')
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
            { name: 'Home', url: 'https://www.theconnecticutmaid.com' },
            { name: 'Careers', url: 'https://www.theconnecticutmaid.com/available-nyc-maid-jobs' },
            { name: 'Administrator', url: pageUrl },
          ],
        }),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.theconnecticutmaid.com' },
          { name: 'Careers', url: 'https://www.theconnecticutmaid.com/available-nyc-maid-jobs' },
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
            <p className="text-white/60 text-sm">Remote — Anywhere in the US</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Leadership + Profit Sharing</p>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl text-white tracking-wide leading-[0.92] mb-4">
            {config.title} Today. CEO Tomorrow.
          </h1>
          <p className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[#A8F0DC] tracking-wide mb-3">This is the opportunity of a lifetime.</p>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-8">A brand-new market launch. A real seat at the top of a company that&rsquo;s just getting started.</p>

          <div className="border-y border-white/10 py-6 mb-8">
            <div className="flex flex-wrap gap-6 sm:gap-10">
              <div>
                <p className="text-[#A8F0DC] font-[family-name:var(--font-bebas)] text-4xl tracking-wide leading-none">30</p>
                <p className="text-white/50 text-xs uppercase tracking-wide mt-1">Cleanings, January</p>
              </div>
              <div>
                <p className="text-[#A8F0DC] font-[family-name:var(--font-bebas)] text-4xl tracking-wide leading-none">~200</p>
                <p className="text-white/50 text-xs uppercase tracking-wide mt-1">Cleanings, July</p>
              </div>
              <div>
                <p className="text-[#A8F0DC] font-[family-name:var(--font-bebas)] text-4xl tracking-wide leading-none">7x</p>
                <p className="text-white/50 text-xs uppercase tracking-wide mt-1">Growth in 6 Months</p>
              </div>
              <div>
                <p className="text-[#A8F0DC] font-[family-name:var(--font-bebas)] text-4xl tracking-wide leading-none">$40K</p>
                <p className="text-white/50 text-xs uppercase tracking-wide mt-1">Monthly Revenue, Month 7</p>
              </div>
              <div>
                <p className="text-[#A8F0DC] font-[family-name:var(--font-bebas)] text-4xl tracking-wide leading-none">$600K</p>
                <p className="text-white/50 text-xs uppercase tracking-wide mt-1">Annual Revenue Pace</p>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-4">8 months in, as a rebranded startup.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-10">
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.compSummary}</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.schedule}</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.employmentType}</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">{config.location}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/apply/administrator" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Apply Now
            </Link>
            <a href={`sms:${config.supportPhone}`} className="text-[#A8F0DC] text-sm font-semibold underline underline-offset-4 hover:text-white transition-colors">
              Not ready yet? Text your questions to {config.supportPhone && `(${config.supportPhone.slice(0,3)}) ${config.supportPhone.slice(3,6)}-${config.supportPhone.slice(6)}`}
            </a>
          </div>
          <p className="text-white/40 text-xs mt-4">Backed by 20 years of experience in home services marketing.</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Careers', href: '/available-nyc-maid-jobs' },
          { name: 'Administrator', href: '/careers/administrator' },
        ]} />

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-4">The Bigger Picture</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            This is a real entrepreneurial opportunity — for someone who wants to jump in and be completely all-in on a startup, not manage a stable, slow-moving company. The Connecticut Maid is a brand-new market launch, backed by the same team and platform behind The NYC Maid, one of New York City’s highest-rated cleaning companies. Whoever takes this role isn’t signing up to manage an established operation — you’re getting in on the ground floor and building it.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            This company is backed by someone with 20 years of experience in home services marketing — the growth isn’t luck, it’s a repeatable playbook, and it’s about to be applied to three new markets. That’s the opportunity: not a job at a company that might grow, but a leadership seat in one that already is, this early.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            And this growth has happened without spending a single dollar on ads or lead generation — it’s entirely organic. Whoever takes this role isn’t just learning to run a cleaning service — they’re learning to run a genuinely sophisticated operation, from the marketing playbook to the AI systems behind it.
          </p>

          <div className="border-l-4 border-[#A8F0DC] bg-gray-50 rounded-r-xl p-5 mb-3">
            <p className="text-gray-700 leading-relaxed">
              Here’s the part that makes this a real opportunity, not just a pitch: right now, this entire operation — marketing, sales, scheduling, collections, reviews, growth, the cleaning team, hiring — is run by <strong className="text-[#1E2A4A]">one person, about one to two hours a day</strong>. We’ve been playing pure defense, taking whatever comes to us. Nobody has had the bandwidth to go on offense. Whoever steps into this role isn’t inheriting a maxed-out operation squeezed for every last drop — they’re inheriting an obvious, wide-open runway in a business already growing 7x on defense alone.
            </p>
          </div>

          <p className="text-gray-600 leading-relaxed">
            Administrator is where this starts, not where it ends. The team is sold on and scheduled — from that point, the operation is yours: team coordination, client communication, payment collection, quality control, and hiring. It’s general-manager-level ownership without general-manager-level hours, because the platform automates most of the routine work — confirmations, reminders, check-ins, and payment tracking all happen automatically. You handle the judgment calls, not the busywork.
          </p>
        </section>

        <section className="mb-16 bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-6 sm:p-10 -mx-4 sm:mx-0">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#A8F0DC] tracking-wide mb-4">Real Ownership Later.</h2>
          <p className="text-blue-100/80 leading-relaxed mb-6">
            Long-term, this role is a genuine path toward taking over the entire business — Administrator is Stage 1, with General Manager and eventual CEO of a multi-million-dollar company ahead of it for the right person. This is the kind of opportunity that changes the trajectory of a career.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-white/15 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-1">Compensation</p>
              <p className="text-white/90">{config.compSummary}</p>
            </div>
            <div className="border border-white/15 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-1">Employment Type</p>
              <p className="text-white/90">{config.employmentType}</p>
            </div>
            <div className="border border-white/15 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-1">Schedule</p>
              <p className="text-white/90">{config.schedule}</p>
            </div>
            <div className="border border-white/15 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-1">Location</p>
              <p className="text-white/90">{config.location}</p>
            </div>
          </div>

          <Link href="/apply/administrator" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-8 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors mt-8">
            Apply Now
          </Link>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-4">Who You’ll Work With</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            A note directly from ownership: I’ve spent 20 years in business and services — plenty of failures, plenty of wins, and I’ve learned from both.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            Here’s how I work: I’m not a micromanager. I give a task, you complete it, we move to the next thing — that’s the whole cycle, and it’s easy to work within. The one thing I have zero patience for is repeating the same error or issue twice. Get it right, or tell me it’s not working so we can fix it together — but the same mistake shouldn’t happen twice.
          </p>
          <p className="text-gray-600 leading-relaxed">
            I’m always willing to teach — genuinely, not as a line in a job post. I want someone who already has real experience, but who still wants to learn and grow. If that’s you, we’ll work well together.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">What You’ll Own</h2>
          <p className="text-gray-500 text-sm mb-6">Run entirely through Full Loop CRM, the platform we built and run the whole business on. We’ll teach you all of it.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ownershipAreas.map((area) => (
              <div key={area.title} className="border border-gray-200 rounded-xl p-5 hover:border-[#A8F0DC] transition-colors">
                <p className="font-semibold text-[#1E2A4A] mb-1.5">{area.title}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{area.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">What You’ll Learn</h2>
          <p className="text-gray-500 text-sm mb-6">None of this requires prior experience. I will personally teach you all of it.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {learningAreas.map((area) => (
              <div key={area.title} className="border border-gray-200 rounded-xl p-5 hover:border-[#A8F0DC] transition-colors">
                <p className="font-semibold text-[#1E2A4A] mb-1.5">{area.title}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{area.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-6">Your First 90 Days</h2>
          <div className="space-y-4">
            {ninetyDays.map((step) => (
              <div key={step.range} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 border-l-2 border-[#A8F0DC] pl-5 py-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2A4A]/60 sm:w-32 sm:flex-shrink-0">{step.range}</p>
                <div>
                  <p className="font-semibold text-[#1E2A4A]">{step.focus}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-6">Who We’re Looking For</h2>
          <ul className="space-y-3">
            {requirements.map((req) => (
              <li key={req} className="flex gap-3 text-gray-600 leading-relaxed">
                <span className="text-[#A8F0DC] mt-1 flex-shrink-0">&#9679;</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">Are You Right For This Job?</h2>
          <p className="text-xl text-[#1E2A4A] font-semibold leading-snug mb-4">The main question: are you ready to go all in on an opportunity of a lifetime?</p>
          <p className="text-gray-500 text-sm mb-6">If that lands, read these honestly before you apply. If most of them are a clear yes, keep going.</p>

          <div className="border-l-4 border-[#A8F0DC] bg-gray-50 rounded-r-xl p-5 mb-6">
            <p className="text-gray-700 leading-relaxed">
              Here’s what a leader looks like to us: you take a task, you kill it, you 100% verify it’s actually done — then you come back and say <em>&ldquo;I’m ready for the next thing.&rdquo;</em> Not someone who sits and waits for the clock to run out. We’ll know within days whether you’re really all in.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {qualifyingQuestions.map((q) => (
              <div key={q} className="flex gap-3 border border-gray-200 rounded-xl p-4">
                <span className="text-[#A8F0DC] text-lg leading-none mt-0.5 flex-shrink-0">&#10003;</span>
                <p className="text-gray-600 text-sm leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-4">Why Do You Want This Job?</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Sit with that question before you apply, because it’s one of the first things we’ll ask you — on video.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            This isn’t a scheduling job. It’s the ground floor of a brand-new market, and the person who takes it will be personally taught — by ownership — how to run the CRM, the AI, the marketing, and the finance behind all of it. Opportunities to grow into owning a real business don’t usually get offered outright. This one is, to the right person.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            If your honest answer is closer to <em>&ldquo;I need a job&rdquo;</em> than <em>&ldquo;I want to build something real and I&rsquo;m willing to earn my way into owning it&rdquo;</em>, this probably isn&rsquo;t the right fit — and that&rsquo;s okay. If it&rsquo;s the second one, we want to hear it.
          </p>
          <Link href="/apply/administrator" className="inline-block bg-[#1E2A4A] text-white px-8 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
            Apply Now
          </Link>
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
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">7x Growth. A Real Path to CEO. Your Move.</p>
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
