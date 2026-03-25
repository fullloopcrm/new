import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'

export const revalidate = 259200

const pageUrl = 'https://www.thenycmaid.com/careers/virtual-operations-manager'
const pageTitle = 'Help Wanted: Remote Ops Mgr — $500/wk+10% Rev | Growing 100% Monthly'
const pageDescription = 'The NYC Maid is hiring a remote admin/ops manager — $500/wk + 10% of total revenue. Growing 50–100% every month. Work from home. Perfect for admins, receptionists, secretaries ready to upgrade. Ground-floor opportunity. Apply now.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large' as const,
    'max-video-preview': -1,
  },
  openGraph: {
    title: 'Help Wanted: Remote Ops Mgr — $500/wk+10% Rev | Growing 100% Monthly',
    description: 'The NYC Maid is hiring a remote admin/ops manager starting at $500/wk + 10% of total revenue. Work from home. Perfect for admins, receptionists, and secretaries looking to upgrade their careers. Apply now.',
    url: pageUrl,
    type: 'article',
    siteName: 'The NYC Maid',
    locale: 'en_US',
    images: [{ url: 'https://www.thenycmaid.com/icon-512.png', width: 512, height: 512, alt: 'Help Wanted Remote Ops Manager — The NYC Maid — Now Hiring' }],
    publishedTime: '2026-03-15T00:00:00Z',
    modifiedTime: new Date().toISOString(),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Wanted: Remote Ops Mgr — $500/wk+10% Rev | Growing 100% Monthly',
    description: 'The NYC Maid is hiring a remote admin/ops manager starting at $500/wk + 10% of total revenue. Perfect for admins, receptionists, secretaries looking to upgrade. Apply now.',
    images: ['https://www.thenycmaid.com/icon-512.png'],
  },
  keywords: 'operations manager, operations manager remote, operations manager work from home, operations manager virtual, operations manager NYC, operations manager New York, operations manager New Jersey, operations manager Long Island, virtual operations manager, remote operations manager, customer service manager, customer service manager remote, customer service manager NYC, scheduling manager, scheduling coordinator, scheduling coordinator remote, office manager remote, office manager NYC, office manager work from home, operations coordinator, service coordinator, remote dispatcher, team manager remote, virtual assistant manager, bilingual operations manager, bilingual customer service manager, cleaning company operations manager, cleaning service manager, administrative assistant to operations manager, secretary to manager, receptionist to operations, work from home manager NYC, remote manager job New York, operations manager part time, work from home jobs NYC, remote jobs New York, work from home jobs New Jersey, service business operations manager',
  other: {
    'geo.region': 'US-NY',
    'geo.placename': 'New York City',
    'geo.position': '40.7589;-73.9851',
    'ICBM': '40.7589, -73.9851',
    'revisit-after': '3 days',
    'format-detection': 'telephone=yes',
  },
}

function opsManagerJobPostingSchema() {
  const now = new Date()
  const datePosted = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const validThrough = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',

    // ── REQUIRED FIELDS ──
    title: 'Operations Manager (Virtual)',
    datePosted,
    validThrough,
    description: `<h2>Operations Manager (Virtual) — The NYC Maid — Remote Work From Home</h2>
<p>The NYC Maid is hiring an <strong>Operations Manager (Virtual)</strong> to own scheduling, customer service, team management, and payment coordination across New York City, Long Island, and New Jersey. This role combines the responsibilities of a <strong>customer service manager</strong>, <strong>scheduling coordinator</strong>, <strong>office manager</strong>, and <strong>operations coordinator</strong> — all from home. Part-time to start, growing into full-time as volume scales. We currently manage 15–20 cleanings per week and are growing 50–100% monthly.</p>

<h3>Compensation</h3>
<p><strong>$500/week base salary + 10% of gross weekly revenue to start.</strong> Paid every Friday. We currently do 15–20 cleanings per week and are growing 50–100% month over month. Your revenue share grows with the business — no renegotiating required. At $10,000 gross revenue/week you earn $1,500. At $20,000/week you earn $2,500.</p>

<h3>Schedule</h3>
<p>Part-time to start, growing into full-time. Work from home. 8:00 AM – 6:00 PM Eastern Time, 7 days per week.</p>

<h3>About The NYC Maid</h3>
<p>The NYC Maid has been serving New York City since 2018. Rebranded and rebuilt from the ground up in 2025, the company is now doubling in size month over month. We operate over 100 websites across NYC, Long Island, and New Jersey — driving organic growth across every market we touch. The owner drives all sales, marketing, and growth. You own everything else.</p>

<h3>About the Role</h3>
<p>You are the primary point of contact for all clients and the entire cleaning team. From the moment a job is scheduled to the moment it is completed and paid, you run the operation. You monitor the dashboard daily, coordinate cleaners, manage scheduling, confirm payments, resolve complaints, recruit and onboard new team members, and send a daily operations summary to the owner.</p>

<h3>Key Responsibilities</h3>
<ul>
<li>Own the full job lifecycle: scheduled, assigned, rescheduled, executed, completed, paid</li>
<li>Be the primary contact for all client calls, texts, and messages 8 AM–6 PM ET, 7 days/week</li>
<li>Monitor the operations dashboard daily: jobs, cleaners, scheduling, completions, system alerts</li>
<li>Coordinate cleaners: confirmations, check-ins, late arrivals, reschedules, coverage gaps</li>
<li>Alert cleaners 15 minutes before job completion so payment is collected before they leave</li>
<li>Confirm all incoming payments via Zelle and Apple Pay and log against completed jobs</li>
<li>Follow up on every unpaid balance without exception</li>
<li>Recruit, interview, hire, and onboard new cleaners as the business grows</li>
<li>Build genuine relationships with the cleaning team</li>
<li>Resolve client complaints before they become cancellations</li>
<li>Follow up after every job to ensure client satisfaction</li>
<li>Send owner a concise daily summary: completed jobs, payments received, issues handled</li>
<li>Manage additional operations staff as volume grows</li>
</ul>

<h3>Requirements</h3>
<ul>
<li>Bilingual English and Spanish strongly preferred — our cleaning team is primarily Spanish-speaking</li>
<li>2+ years of experience in customer service, operations, scheduling, or service coordination</li>
<li>Process-driven and detail-obsessed — you have a system for everything</li>
<li>Available and responsive 8 AM–6 PM Eastern Time, 7 days per week</li>
<li>Calm under pressure — chaos is just another problem to solve</li>
<li>Trustworthy with financial information — integrity is non-negotiable</li>
<li>Self-directed — you solve problems before being asked</li>
<li>Comfortable with technology — dashboards, scheduling tools, communication platforms</li>
<li>Old-school customer service values — every client feels taken care of, every time</li>
</ul>

<h3>Benefits</h3>
<ul>
<li>Work from home — fully remote from anywhere in the United States</li>
<li>Part-time to start with a clear path to full-time as volume grows</li>
<li>$500/week guaranteed base salary — even while part-time</li>
<li>10% revenue share to start — grows as you prove yourself</li>
<li>Paid every Friday, on time, every time</li>
<li>No commute, no office, no dress code</li>
<li>Direct partnership with the owner — no middle management, no corporate bureaucracy</li>
<li>Ground-floor leadership opportunity in a company growing 50–100% month over month</li>
<li>Build and manage your own operations team as volume increases</li>
<li>Currently managing 15–20 cleanings per week and growing weekly — get in now</li>
</ul>

<h3>How to Apply</h3>
<p>Submit your application at <a href="https://www.thenycmaid.com/apply/virtual-operations-manager">thenycmaid.com/apply/virtual-operations-manager</a>. You must include a clear photo of yourself, a 60–90 second selfie video introduction, and your resume. If you are bilingual, speak in both English and Spanish in the video. Applications without a selfie video will not be reviewed.</p>`,

    hiringOrganization: {
      '@type': 'Organization',
      name: 'The NYC Maid',
      sameAs: 'https://www.thenycmaid.com',
      url: 'https://www.thenycmaid.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.thenycmaid.com/icon-512.png',
        width: 512,
        height: 512,
      },
      telephone: '+1-212-202-8400',
      email: 'hi@thenycmaid.com',
      foundingDate: '2018',
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        minValue: 10,
        maxValue: 25,
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: '150 W 47th St',
        addressLocality: 'New York',
        addressRegion: 'NY',
        postalCode: '10036',
        addressCountry: 'US',
      },
    },

    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '150 W 47th St',
        addressLocality: 'New York',
        addressRegion: 'NY',
        postalCode: '10036',
        addressCountry: 'US',
      },
    },

    // ── REMOTE JOB FIELDS (critical for telecommute) ──
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'US',
    },

    // ── SALARY (Google's #1 ranking advantage — 90% of postings omit this) ──
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: 500,
        maxValue: 2250,
        unitText: 'WEEK',
      },
    },

    // ── EMPLOYMENT DETAILS ──
    employmentType: ['PART_TIME', 'FULL_TIME'],
    jobImmediateStart: true,
    totalJobOpenings: 1,
    directApply: true,
    url: 'https://www.thenycmaid.com/careers/virtual-operations-manager',

    // ── IDENTIFIER ──
    identifier: {
      '@type': 'PropertyValue',
      name: 'The NYC Maid',
      value: 'nycmaid-virtual-ops-manager-2026',
    },

    // ── CLASSIFICATION ──
    industry: 'Cleaning Services',
    occupationalCategory: '11-1021.00',
    relevantOccupation: {
      '@type': 'Occupation',
      name: 'Operations Manager (Virtual)',
      occupationalCategory: '11-1021.00',
      estimatedSalary: {
        '@type': 'MonetaryAmountDistribution',
        name: 'base plus revenue share',
        currency: 'USD',
        median: 1500,
        percentile10: 500,
        percentile90: 2250,
        duration: 'P1W',
      },
    },

    // ── QUALIFICATIONS & REQUIREMENTS ──
    qualifications: '2+ years in customer service, operations, scheduling, or service coordination. Bilingual English and Spanish strongly preferred. Process-driven, detail-obsessed, self-directed. Available and responsive 8 AM–6 PM Eastern Time, 7 days per week. Trustworthy with financial information. Comfortable with technology and willing to learn new systems quickly. Old-school customer service values.',
    responsibilities: 'Own the full job lifecycle from scheduling through completion and payment. Monitor operations dashboard daily for jobs, cleaners, scheduling, completions, and system alerts. Coordinate the entire cleaning team including confirmations, check-ins, late arrivals, reschedules, and coverage gaps. Be the primary contact for all client communications 8 AM–6 PM ET, 7 days per week. Resolve client complaints before they become cancellations. Follow up after every job to ensure client satisfaction. Recruit, interview, hire, and onboard new cleaners. Build genuine relationships with the cleaning team. Confirm all incoming payments via Zelle and Apple Pay and log against completed jobs. Follow up on every unpaid balance without exception. Send owner a concise daily summary of completed jobs, payments received, and issues handled. Manage additional operations staff as volume grows.',
    skills: 'Operations management, customer service, scheduling, team leadership, team management, payment coordination, bilingual English and Spanish communication, process design, conflict resolution, recruiting, onboarding, client relationship management, problem solving, attention to detail, time management, multitasking',

    educationRequirements: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'high school',
    },
    experienceRequirements: {
      '@type': 'OccupationalExperienceRequirements',
      monthsOfExperience: 24,
    },
    experienceInPlaceOfEducation: true,

    // ── COMPENSATION DETAILS ──
    incentiveCompensation: '$500/week guaranteed base salary plus 10% of gross weekly revenue. Paid every Friday. Currently managing 15–20 cleanings per week and growing 50–100% month over month. Total compensation starts at $500–$750/week with part-time workload. At $10,000 gross revenue per week total compensation is $1,500. At $20,000 per week total compensation is $2,500. Revenue share percentage grows as you prove yourself.',
    jobBenefits: 'Work from home — fully remote from anywhere in the United States. Part-time to start with a clear path to full-time. $500/week guaranteed base salary even while part-time. 10% revenue share to start with growth potential. Paid every Friday on time every time. No commute, no office, no dress code. Direct partnership with the owner with no middle management. Ground-floor leadership opportunity in a company growing 50–100% month over month. Build and manage your own operations team as volume increases. Bilingual work environment. Flexible remote work that grows with your ambition.',
    workHours: '8:00 AM to 6:00 PM Eastern Time, 7 days per week',

    // ── APPLICATION CONTACT ──
    applicationContact: {
      '@type': 'ContactPoint',
      telephone: '+1-212-202-8400',
      email: 'hi@thenycmaid.com',
      contactType: 'Human Resources',
      availableLanguage: ['English', 'Spanish'],
    },

    // ── EMPLOYER OVERVIEW ──
    employerOverview: 'The NYC Maid is a professional house cleaning service that has been serving New York City since 2018. Rebranded and rebuilt from the ground up in 2025, the company operates over 100 websites across NYC, Long Island, and New Jersey. The NYC Maid is rated 5.0 stars on Google with 28 verified reviews. The company is doubling in size month over month and is looking for an operations leader to own the day-to-day while the owner focuses on sales, marketing, and growth.',
  }
}

const faqs = [
  {
    question: 'Is this a remote position?',
    questionEs: '¿Es una posición remota?',
    answer: 'Yes. This is a fully remote role. You will manage operations virtually — coordinating schedules, communicating with clients and cleaners, and monitoring the dashboard from wherever you work best. You must be available and responsive 8 AM–6 PM ET, 7 days a week.',
  },
  {
    question: 'What does the compensation look like?',
    questionEs: '¿Cómo es la compensación?',
    answer: '$500/week base salary plus 10% of gross weekly revenue to start. Paid every Friday via Zelle. We currently do 15–20 cleanings per week, so total compensation starts around $500–$815/week. The business is growing 50–100% every single month. As volume scales, your income grows automatically — at $10,000 gross revenue per week you earn $1,500, at $17,500 you earn $2,250. No renegotiating required.',
  },
  {
    question: 'Do I need to speak Spanish?',
    questionEs: '¿Necesito hablar español?',
    answer: 'Bilingual English and Spanish is strongly preferred. Our cleaning team is primarily Spanish-speaking, and the ability to communicate naturally — not through a translator app — will make you significantly more effective in this role.',
  },
  {
    question: 'What tools and systems will I use?',
    questionEs: '¿Qué herramientas y sistemas usaré?',
    answer: 'You will use our internal dashboard for scheduling, job tracking, cleaner management, and payment monitoring. Communication happens via phone, text, and the team portal. You should be comfortable with technology and willing to learn new systems quickly.',
  },
  {
    question: 'Is this part-time or full-time?',
    questionEs: '¿Es medio tiempo o tiempo completo?',
    answer: 'This starts as a part-time role. We currently manage 15–20 cleanings per week, so the workload is manageable — but we are growing weekly. As volume increases, this becomes a full-time position. You must be available 8 AM–6 PM, 7 days a week from the start so nothing falls through the cracks. Your compensation grows automatically as the business scales.',
  },
  {
    question: 'What kind of experience do you need?',
    questionEs: '¿Qué tipo de experiencia necesitan?',
    answer: '2+ years in customer service, operations, or service coordination is preferred. More importantly, we need someone who is self-directed, process-driven, and takes genuine pride in running a tight operation. If you have managed teams, coordinated schedules, or handled client communications in a fast-paced environment, this role is for you.',
  },
  {
    question: 'How do I apply?',
    questionEs: '¿Cómo aplico?',
    answer: 'Submit your application at thenycmaid.com/apply/virtual-operations-manager. You must include a photo of yourself, a 60–90 second selfie video introduction, and your resume. If you are bilingual, speak in both English and Spanish in the video. Applications without a selfie video will not be reviewed.',
  },
  {
    question: 'What does growth look like in this role?',
    questionEs: '¿Cómo se ve el crecimiento en este puesto?',
    answer: 'As The NYC Maid scales, so does your role. You will manage additional operations staff as volume grows. Your compensation scales automatically through the revenue-sharing model. This is a ground-floor leadership opportunity with a company that is doubling in size month over month.',
  },
  {
    question: 'How much does a virtual operations manager make?',
    questionEs: '¿Cuánto gana un gerente de operaciones virtual?',
    answer: 'At The NYC Maid, the Operations Manager (Virtual) earns $500/week guaranteed base salary plus 10% of gross weekly revenue to start. We currently do 15–20 cleanings per week, so total compensation starts around $500–$815/week. This is a part-time workload right now — work from home, no commute, manageable hours. The business is growing 50–100% every single month. As volume scales, total weekly compensation grows to $1,500+ at $10,000/week revenue and $2,250+ at $17,500/week revenue.',
  },
  {
    question: 'Can I work from home as an operations manager?',
    questionEs: '¿Puedo trabajar desde casa como gerente de operaciones?',
    answer: 'Yes. This is a fully remote position. You manage all operations virtually — scheduling, client communication, team coordination, and payment tracking — from wherever you work best. The only requirement is that you are available and responsive 8 AM–6 PM Eastern Time, 7 days a week.',
  },
  {
    question: 'What is a virtual operations manager?',
    questionEs: '¿Qué es un gerente de operaciones virtual?',
    answer: 'A virtual operations manager oversees the day-to-day operations of a business remotely. At The NYC Maid, this means owning the full job lifecycle — from scheduling cleaning appointments to coordinating the team, handling client communications, confirming payments, and reporting daily to the owner. You are the operational backbone of the company.',
  },
  {
    question: 'Do I need management experience to apply?',
    questionEs: '¿Necesito experiencia en gerencia para aplicar?',
    answer: 'Management experience is preferred but not strictly required. What matters most is that you are self-directed, process-driven, and obsessively organized. If you have coordinated schedules, handled client communications, or managed teams in any capacity — even informally — you may be a strong fit.',
  },
]

export default function VirtualOpsManagerPage() {
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
          speakable: ['h1', 'h2', '.hero-description'],
          breadcrumb: [
            { name: 'Home', url: 'https://www.thenycmaid.com' },
            { name: 'Careers', url: 'https://www.thenycmaid.com/available-nyc-maid-jobs' },
            { name: 'Operations Manager (Virtual)', url: pageUrl },
          ],
        }),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Careers', url: 'https://www.thenycmaid.com/available-nyc-maid-jobs' },
          { name: 'Operations Manager (Virtual)', url: pageUrl },
        ]),
        opsManagerJobPostingSchema(),
        faqSchema(faqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className="text-[#A8F0DC] text-sm font-semibold tracking-[0.2em] uppercase">Ground Floor Opportunity</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Work From Home</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Part-Time &rarr; Full-Time</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Growing 50–100% Monthly</p>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Operations Manager (Virtual) — $500/wk + 10% Revenue to Start
          </h1>
          <p className="text-blue-200/80 text-lg max-w-3xl leading-relaxed mb-3">
            The NYC Maid &mdash; New York City | Long Island | New Jersey
          </p>
          <p className="text-blue-200/60 max-w-3xl leading-relaxed mb-4">
            This is a ground-floor opportunity to get in early with a company that is scaling fast. Work from home. Start part-time &mdash; the workload is manageable right now &mdash; and grow into full-time as volume increases weekly. No commute. No office. No ceiling on where this goes.
          </p>
          <p className="text-blue-200/60 max-w-3xl leading-relaxed mb-6">
            You own scheduling, customer service, team management, and payment coordination. The owner drives all sales, marketing, and growth. You run the operation.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">$500/wk + 10% Revenue to Start</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">Paid via Zelle Every Friday</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">Work From Home</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">Bilingual Preferred</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Link href="/apply/virtual-operations-manager" data-track="ops-hero-apply" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Apply Now
            </Link>
            <a href="sms:2122028400" data-track="ops-hero-text" className="text-blue-200/70 font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
              or Text (212) 202-8400
            </a>
          </div>
        </div>
      </section>

      {/* Highlights Bar */}
      <section className="bg-[#A8F0DC] py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-center">
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">$500</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Weekly Base</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Base semanal</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">+10%</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Revenue Share</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Porcentaje de ingresos</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">Home</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Work From Home</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Trabaja desde casa</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">Friday</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Paid Weekly</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Pago semanal</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">50–100%</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Monthly Growth</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Crecimiento mensual</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Careers', href: '/available-nyc-maid-jobs' },
          { name: 'Operations Manager (Virtual)', href: '/careers/virtual-operations-manager' },
        ]} />

        {/* About the Role */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">About the Role</p>
          <p className="text-gray-400 text-xs italic mb-2">Sobre el puesto</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-6">This Is Not a Job for Everyone</h2>
          <p className="text-gray-400 text-sm italic mb-6">Este no es un trabajo para cualquiera</p>
          <div className="space-y-4 text-gray-600 leading-relaxed max-w-3xl">
            <p>
              The NYC Maid has been serving New York City since 2018. Rebranded and rebuilt from the ground up in 2025, we are now doubling in size month over month. We operate over 100 websites across NYC, Long Island, and just over the Hudson in New Jersey &mdash; driving organic growth across every market we touch &mdash; and the volume of business coming through our platform is accelerating fast.
            </p>
            <p>
              The owner, Jeff, brings 20+ years of experience in service-based businesses and marketing. He is caring, supportive, and genuinely invested in the people around him. He is also laser-focused, consistent, and operates with clear plans and expectations that must be met. He has an old-school customer service mentality combined with a modern marketing strategy that blends organic grassroots hustle with cutting-edge AI. When things go wrong he expects solutions &mdash; and he expects them to never happen again. When things run right, everyone wins.
            </p>
            <p>
              The owner drives all sales, marketing, and growth. <strong>You own everything else</strong> &mdash; from the moment a job is scheduled to the moment it&apos;s completed, leaving every client happy, satisfied, and in love with our service.
            </p>
            <p className="text-gray-400 text-xs italic">
              El dueño impulsa todas las ventas, marketing y crecimiento. <strong>Tú manejas todo lo demás</strong> — desde el momento en que se programa un trabajo hasta que se completa, dejando a cada cliente feliz, satisfecho y enamorado de nuestro servicio.
            </p>
            <p className="text-[#1E2A4A] font-semibold">
              This is not a job for someone who needs to be told what to do. This is a role for someone who sees disorder and cannot rest until it&apos;s fixed. If you have a process for everything, hold yourself to a standard most people can&apos;t keep up with, and take genuine pride in a perfectly executed day &mdash; keep reading.
            </p>
            <p className="text-gray-400 text-xs italic">
              Este no es un trabajo para alguien que necesita que le digan qué hacer. Es un rol para alguien que ve desorden y no descansa hasta arreglarlo. Si tienes un proceso para todo, te exiges a un nivel que la mayoría no puede mantener, y sientes orgullo genuino por un día perfectamente ejecutado — sigue leyendo.
            </p>
          </div>
        </section>

        {/* A Day in the Life */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-2">What to Expect</p>
          <p className="text-gray-400 text-xs italic mb-2">Qué esperar</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-8">A Day in the Life</h2>
          <p className="text-gray-400 text-sm italic mb-8">Un día en la vida</p>
          <div className="space-y-4">
            {[
              {
                time: '8:00 AM',
                title: 'Start Your Day',
                titleEs: 'Empieza tu día',
                desc: 'You review the dashboard. Every job for the day is accounted for, every cleaner is confirmed, and you know exactly what the day looks like before it starts.',
                descEs: 'Revisas el panel. Cada trabajo del día está contabilizado, cada limpiador confirmado, y sabes exactamente cómo se ve el día antes de que empiece.',
              },
              {
                time: '9:00 AM',
                title: 'The Team Begins',
                titleEs: 'El equipo empieza',
                desc: 'Cleaners access their schedules through their portal. You are monitoring. When a cleaner checks in at a job, you are notified. If someone is running late or hasn\'t checked in, you are already on it.',
                descEs: 'Los limpiadores acceden a sus horarios por su portal. Tú estás monitoreando. Cuando un limpiador se reporta en un trabajo, recibes notificación. Si alguien va tarde o no se ha reportado, ya estás en eso.',
              },
              {
                time: 'Throughout the Day',
                title: 'Communications Hub',
                titleEs: 'Centro de comunicaciones',
                desc: 'Clients reach you by call or text. Cleaners reach you when anything changes. You keep everyone informed, calm, and on schedule. If a job is running long and the next client could be affected, you\'ve already sent that message before they had to ask.',
                descEs: 'Los clientes te contactan por llamada o texto. Los limpiadores te contactan cuando algo cambia. Mantienes a todos informados, tranquilos y a tiempo. Si un trabajo se extiende y el próximo cliente podría verse afectado, ya enviaste ese mensaje antes de que tuvieran que preguntar.',
              },
              {
                time: '15 Min Before Job End',
                title: 'Payment Coordination',
                titleEs: 'Coordinación de pagos',
                desc: 'The cleaner notifies you. You coordinate payment collection with the client — via Zelle or payment link. You watch for the email confirmation that payment is received. No job closes without payment confirmed.',
                descEs: 'El limpiador te notifica. Tú coordinas el cobro con el cliente — vía Zelle o link de pago. Verificas la confirmación por email de que el pago fue recibido. Ningún trabajo se cierra sin pago confirmado.',
              },
              {
                time: 'After Each Job',
                title: 'Close & Clear',
                titleEs: 'Cerrar y limpiar',
                desc: 'You make sure the cleaner is cleared, the next job on their schedule is updated, and the client is taken care of. Cleaner pay is processed by the owner after each completed service.',
                descEs: 'Te aseguras de que el limpiador esté libre, el siguiente trabajo en su horario esté actualizado, y el cliente esté atendido. El pago del limpiador lo procesa el dueño después de cada servicio completado.',
              },
              {
                time: 'End of Day',
                title: 'Daily Summary',
                titleEs: 'Resumen diario',
                desc: 'You send a concise daily summary to the owner: every job completed, every payment received, every issue that came up and how it was handled. The day is closed clean.',
                descEs: 'Envías un resumen diario conciso al dueño: cada trabajo completado, cada pago recibido, cada problema que surgió y cómo se resolvió. El día se cierra limpio.',
              },
            ].map(item => (
              <div key={item.time} className="flex gap-5 p-5 border border-gray-200 rounded-xl hover:border-[#A8F0DC] transition-colors">
                <div className="flex-shrink-0 w-28">
                  <span className="text-[#1E2A4A]/40 font-bold text-sm">{item.time}</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1E2A4A] mb-1">{item.title}</p>
                  <p className="text-gray-400 text-xs italic mb-1">{item.titleEs}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  <p className="text-gray-400 text-xs italic mt-1">{item.descEs}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Responsibilities */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Your Responsibilities</p>
          <p className="text-gray-400 text-xs italic mb-2">Tus responsabilidades</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-8">What You Own</h2>
          <p className="text-gray-400 text-sm italic mb-8">Lo que tú manejas</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Operations & Scheduling */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] p-6">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Operations &amp; Scheduling</h3>
                <p className="text-blue-200/30 text-xs italic">Operaciones y programación</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  'Own the full job lifecycle: scheduled, assigned, rescheduled, executed, completed, paid',
                  'Monitor the dashboard daily: jobs, cleaners, scheduling, completions, system alerts',
                  'Coordinate cleaners: confirmations, check-ins, late arrivals, reschedules, coverage gaps',
                  'Alert cleaners 15 minutes before job completion so payment is collected before they leave',
                  'Identify system issues and bring them to the owner with a proposed solution',
                ].map(item => (
                  <div key={item} className="flex gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <p className="text-gray-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Services */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] p-6">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Client Services</h3>
                <p className="text-blue-200/30 text-xs italic">Servicios al cliente</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  'Be the primary contact for all client calls, texts, and messages 8 AM–6 PM, 7 days a week',
                  'Resolve complaints before they become cancellations',
                  'Follow up on job completions to ensure every client is happy and coming back',
                ].map(item => (
                  <div key={item} className="flex gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <p className="text-gray-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Team & Payments */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] p-6">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Team &amp; Payments</h3>
                <p className="text-blue-200/30 text-xs italic">Equipo y pagos</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  'Build genuine relationships with the cleaning team — they are the backbone of this business',
                  'Recruit, interview, and hire new cleaners as we grow',
                  'Onboard new team members and hold them to company standards',
                  'Manage team performance and escalate issues with solutions, not just problems',
                  'Confirm all payments via Zelle and Apple Pay and log against completed jobs',
                  'Follow up on every unpaid balance without exception',
                  'Send owner a concise daily summary: completed jobs, payments received, issues handled',
                ].map(item => (
                  <div key={item} className="flex gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <p className="text-gray-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* The Platform You'll Run */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-2">What You&apos;re Walking Into</p>
          <p className="text-gray-400 text-xs italic mb-2">A lo que estás entrando</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">This Is Not a Startup With Spreadsheets</h2>
          <p className="text-gray-400 text-sm italic mb-3">Esto no es un startup con hojas de cálculo</p>
          <p className="text-gray-500 max-w-3xl mb-3">You&apos;re not building from scratch. The entire platform &mdash; the dashboard, the portals, the automations, the finance system, the analytics &mdash; is already built. Custom-built for this business. You&apos;re stepping into a fully operational command center from day one.</p>
          <p className="text-gray-400 text-xs italic max-w-3xl mb-10">No estás construyendo desde cero. Toda la plataforma — el panel, los portales, las automatizaciones, el sistema financiero, los análisis — ya está construida. Hecha a medida para este negocio. Entras a un centro de comando totalmente operativo desde el primer día.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin Dashboard */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Operations Dashboard &mdash; Your Command Center</h3>
              <p className="text-gray-400 text-xs italic mb-3">Panel de operaciones — Tu centro de comando</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">A full real-time command center built custom for this business. Revenue tracking, job status, team monitoring, and client management &mdash; everything you need to run the day is in one place.</p>
              <div className="space-y-2">
                {[
                  'Live revenue tracking — today, this week, this month, annual projections, and outstanding balances',
                  'Job pipeline — see every scheduled, pending, in-progress, and completed job at a glance',
                  'Interactive job map — filter by cleaner, status, or time period with clickable details',
                  'Today\'s jobs feed — real-time list with client name, service, cleaner, time, and status',
                  'Upcoming 14-day view — see the full pipeline of scheduled work',
                  'Monthly revenue forecast — booked jobs projected out with dollar amounts',
                  'Notification center — new bookings, check-ins, payments, applications, and system alerts',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar & Scheduling */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Calendar &amp; Scheduling System</h3>
              <p className="text-gray-400 text-xs italic mb-3">Calendario y sistema de programación</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">Full visual calendar with drag-and-drop scheduling. Color-coded by cleaner. Month, week, and day views. Click any job to see full details, reassign, or edit.</p>
              <div className="space-y-2">
                {[
                  'Drag-and-drop scheduling — move jobs to new times with one click',
                  'Color-coded by cleaner — instantly see who\'s working where',
                  'Conflict detection — alerts when assigning overlapping jobs',
                  'Cleaner availability checker — see who\'s free before assigning',
                  'Recurring booking system — auto-generates weekly/bi-weekly/monthly jobs',
                  'Quick reassign — move a job to a different cleaner in seconds',
                  'Mobile-friendly list view for on-the-go management',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Portal */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Bilingual Team Portal (English &amp; Spanish)</h3>
              <p className="text-gray-400 text-xs italic mb-3">Portal bilingüe del equipo (inglés y español)</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">Every cleaner has their own portal &mdash; fully bilingual. They see their jobs, check in, check out, claim available work, track their pay, and manage their availability. You monitor everything from your side.</p>
              <div className="space-y-2">
                {[
                  'Upcoming jobs with date, time, address, service type, pay rate, and client notes',
                  'One-tap GPS directions to every job site',
                  'Check-in / check-out — you get notified in real time when they arrive and leave',
                  'Job claiming — cleaners grab open jobs in their area instantly',
                  'Earnings dashboard — this week, this month, this year totals',
                  'Availability management — set working days, hours, and days off',
                  'Push notifications — real-time alerts for new assignments, changes, and broadcasts',
                  'Cleaning guidelines — bilingual SOPs you can update and broadcast to the whole team',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Finance Dashboard */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Finance &amp; Payroll Dashboard</h3>
              <p className="text-gray-400 text-xs italic mb-3">Panel de finanzas y nómina</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">Full financial visibility. Track revenue, labor costs, expenses, cleaner payroll, referral commissions, and bank statements &mdash; all in one place.</p>
              <div className="space-y-2">
                {[
                  'Revenue summary — collected, outstanding, and projected by week/month/year',
                  'Labor costs — cleaner pay breakdown, paid vs. unpaid wages',
                  'Cleaner payroll — per-cleaner income breakdown with job-by-job detail',
                  'Pending payments — unpaid client invoices and unpaid cleaner wages in one view',
                  'Expense tracking — log expenses by category with receipt uploads',
                  'Referral commissions — track, calculate, and process referrer payouts',
                  'Bank statement uploads — monthly statement storage for audit trail',
                  '1099 contractor reporting — export cleaner income data for tax filing',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Client System */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Client Management &amp; Booking System</h3>
              <p className="text-gray-400 text-xs italic mb-3">Gestión de clientes y sistema de reservas</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">Full client database with booking history, communication logs, payment records, and referral tracking. Clients can also self-serve &mdash; book online, view their appointments, and pay through their own portal.</p>
              <div className="space-y-2">
                {[
                  'Client profiles — name, contact, address, total spent, booking count, last visit',
                  'Activity feed — every interaction logged (bookings, emails, SMS, payments)',
                  'Client booking portal — clients book themselves online in 30 seconds',
                  'Client dashboard — login to view upcoming/past bookings, reschedule, and pay',
                  'Interactive client map — see all clients geographically with filters',
                  'Notes and preferences — internal notes per client, not shared with cleaners',
                  'Do-Not-Service flag — prevent future bookings for problematic clients',
                  'Referrer attribution — see which referrer brought each client',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Automations */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Automations &amp; Notifications</h3>
              <p className="text-gray-400 text-xs italic mb-3">Automatizaciones y notificaciones</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">The system does the heavy lifting. Automated reminders, confirmations, daily summaries, recurring job generation, and multi-channel notifications &mdash; push, email, and SMS &mdash; all running in the background so you can focus on the human side.</p>
              <div className="space-y-2">
                {[
                  'Automated booking confirmations — email + SMS sent to client and cleaner',
                  'Scheduled reminders — configurable day-before and hour-before reminders to clients and cleaners',
                  'Daily cleaner summary — every morning, each cleaner gets their next 3 days of jobs via push, email, and SMS',
                  'Recurring job auto-generation — system creates 4 weeks of future bookings for recurring clients',
                  'Push notifications — real-time alerts for check-ins, late arrivals, completed jobs, and new bookings',
                  'Bilingual SMS — all cleaner messages sent in both English and Spanish automatically',
                  'Post-service follow-up — automated thank you messages with rebooking incentive',
                  'Admin alerts — new bookings, new applications, payment confirmations, expiring schedules',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Systems Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Analytics &amp; Leads</h3>
              <p className="text-gray-400 text-xs italic mb-3">Análisis y prospectos</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">Full analytics dashboard tracking visitors, conversions, traffic sources, form funnels, and device breakdowns. Plus a live lead feed showing every visitor in real time.</p>
              <div className="space-y-2">
                {[
                  'Visitor analytics — sessions, time on site, scroll depth, bounce rate',
                  'Conversion tracking — booking form funnel with step-by-step drop-off',
                  'Traffic sources — see which domains and pages drive bookings',
                  'Live lead feed — real-time visitor activity across all sites',
                  'Device breakdown — mobile vs. desktop engagement',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Marketing &amp; Reviews</h3>
              <p className="text-gray-400 text-xs italic mb-3">Marketing y reseñas</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">Built-in campaign manager for email and SMS marketing. Google review management with AI-generated replies. Referral program with full tracking and payouts.</p>
              <div className="space-y-2">
                {[
                  'Campaign builder — email + SMS with AI-assisted drafting',
                  'Audience targeting — active clients, all clients, or custom segments',
                  'Google review dashboard — view, reply, and track ratings',
                  'AI-generated review replies — one-click professional responses',
                  'Referral program — full tracking, payout processing, and referrer portal',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">Settings &amp; Configuration</h3>
              <p className="text-gray-400 text-xs italic mb-3">Configuración y ajustes</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">Everything is configurable. Service types, pricing, booking rules, reminder schedules, cancellation policies, team guidelines &mdash; all adjustable from the settings panel.</p>
              <div className="space-y-2">
                {[
                  'Service types — add and manage unlimited service offerings',
                  'Pricing tiers — standard, budget, same-day rates',
                  'Booking rules — min advance time, same-day options, buffer between jobs',
                  'Reminder scheduling — configure exactly when reminders go out',
                  'Team guidelines — write SOPs in English, auto-translate to Spanish, broadcast to team',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-gray-400 text-xs mt-8 max-w-2xl mb-1">This is the platform the owner built. Your job is to run it. Every tool you need is already here &mdash; you just need to master it and use it to deliver a perfect experience for every client, every day.</p>
          <p className="text-gray-400/60 text-xs italic max-w-2xl">Esta es la plataforma que el dueño construyó. Tu trabajo es manejarla. Cada herramienta que necesitas ya está aquí — solo necesitas dominarla y usarla para entregar una experiencia perfecta a cada cliente, cada día.</p>
        </section>

        {/* Who Is This Role Perfect For */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-2">Is This You?</p>
          <p className="text-gray-400 text-xs italic mb-2">¿Eres tú?</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">Who This Role Is Perfect For</h2>
          <p className="text-gray-400 text-sm italic mb-3">Para quién es perfecto este puesto</p>
          <p className="text-gray-500 max-w-3xl mb-3">This isn&apos;t for everyone. But if you see yourself in any of these descriptions, you might be exactly who we&apos;re looking for.</p>
          <p className="text-gray-400 text-xs italic max-w-3xl mb-10">Esto no es para todos. Pero si te ves reflejado en alguna de estas descripciones, podrías ser exactamente quien estamos buscando.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Secretary or Administrative Assistant Who Wants More</h3>
              <p className="text-gray-400 text-xs italic mb-2">La secretaria o asistente administrativa que quiere más</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;ve been answering phones, managing calendars, and keeping an office running for years. You&apos;re great at it &mdash; but you know you&apos;re capable of more. You want to own something, not just support someone else&apos;s operation. This role lets you take everything you&apos;re already good at and apply it to running a real business &mdash; from home.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Customer Service Rep Ready to Lead</h3>
              <p className="text-gray-400 text-xs italic mb-2">El representante de servicio al cliente listo para liderar</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;ve handled hundreds of client calls. You know how to de-escalate, how to make people feel heard, and how to solve problems on the spot. But you&apos;re tired of being one of fifty reps in a call center. You want to be the person who runs the entire customer experience &mdash; not just answer tickets.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Office Manager in NYC Who&apos;s Over the Commute</h3>
              <p className="text-gray-400 text-xs italic mb-2">El gerente de oficina en NYC que ya no quiere el viaje diario</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;ve been commuting into Manhattan or Brooklyn every day to manage an office, coordinate schedules, and keep things running. You&apos;re good at operations &mdash; but you&apos;re done with the subway, the commute, and the fluorescent lights. This is the same work, from your couch, with real upside.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Scheduling Coordinator Who Wants Ownership</h3>
              <p className="text-gray-400 text-xs italic mb-2">El coordinador de horarios que quiere ser dueño de la operación</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;ve coordinated schedules for medical offices, home services, field teams, or logistics companies. You understand the puzzle &mdash; moving pieces, covering gaps, keeping everyone on time. But you want to own the whole operation, not just the calendar. Here, scheduling is one piece of a much bigger role.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Dispatcher or Service Coordinator</h3>
              <p className="text-gray-400 text-xs italic mb-2">El despachador o coordinador de servicios</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;ve dispatched technicians, cleaners, drivers, or field workers. You know what it takes to keep a service operation running &mdash; the check-ins, the no-shows, the last-minute changes. You&apos;re calm under pressure and you never let a ball drop. This is that same energy, but with revenue share and a path to running the whole show.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Virtual Assistant Who&apos;s Outgrown the Title</h3>
              <p className="text-gray-400 text-xs italic mb-2">La asistente virtual que superó el título</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;ve been a VA for one or more clients. You handle email, scheduling, customer communication, maybe even billing. But you&apos;re not being challenged anymore. You want a single company to invest in &mdash; one where your work directly impacts growth and your income grows with it. This is that company.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Stay-at-Home Parent in NYC or NJ Ready to Work Again</h3>
              <p className="text-gray-400 text-xs italic mb-2">El padre o madre en casa en NYC o NJ listo para volver a trabajar</p>
              <p className="text-gray-500 text-sm leading-relaxed">You stepped away from your career to raise a family. Now you&apos;re ready to get back to work &mdash; but you need flexibility. You need to work from home. You need something that fits around school drop-offs and pickups. This role starts part-time, works from home, and grows at your pace.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Bilingual Professional Looking for Real Opportunity</h3>
              <p className="text-gray-400 text-xs italic mb-2">El profesional bilingüe buscando una oportunidad real</p>
              <p className="text-gray-500 text-sm leading-relaxed">You speak English and Spanish fluently. In most jobs, that gets you a thank you and maybe a small premium. Here, it makes you 10x more effective &mdash; our cleaning team is primarily Spanish-speaking. Your bilingual skills aren&apos;t a nice-to-have, they&apos;re a competitive advantage that directly impacts how well this operation runs.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">The Person Who Wants to Put Their Thumbprint on a Real Business</h3>
              <p className="text-gray-400 text-xs italic mb-2">La persona que quiere dejar su huella en un negocio real</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;re not looking for a job. You&apos;re looking for something to build. You want to walk into a growing company, take ownership of the operation, build a team under you, and know that what you built is the reason the business runs. You want your work to matter. At The NYC Maid, it will.</p>
            </div>
          </div>

          <div className="mt-10 bg-gradient-to-r from-[#1E2A4A] to-[#243352] rounded-2xl p-8">
            <p className="text-white font-semibold text-lg mb-1">Didn&apos;t See Yourself Above?</p>
            <p className="text-blue-200/30 text-xs italic mb-3">¿No te viste reflejado arriba?</p>
            <p className="text-blue-200/60 text-sm leading-relaxed max-w-2xl mb-1">If you have the work ethic, the organizational instincts, and the drive to run an operation &mdash; regardless of your background or title &mdash; we want to hear from you. We don&apos;t care about your resume as much as we care about who you are and how you work. The right person for this role might come from anywhere. What matters is that you see this opportunity for what it is and you&apos;re ready to take it.</p>
            <p className="text-blue-200/30 text-xs italic max-w-2xl">Si tienes la ética de trabajo, el instinto organizacional y las ganas de dirigir una operación — sin importar tu experiencia o título — queremos saber de ti. No nos importa tanto tu currículum como quién eres y cómo trabajas. La persona correcta para este puesto puede venir de cualquier lugar. Lo que importa es que veas esta oportunidad por lo que es y estés listo para tomarla.</p>
          </div>
        </section>

        {/* The Marketing Engine */}
        <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8 md:p-14 mb-20">
          <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Why This Is Growing So Fast</p>
          <p className="text-blue-200/30 text-xs italic mb-2">Por qué esto está creciendo tan rápido</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-3">100+ Websites. Organic Growth. No Paid Ads.</h2>
          <p className="text-blue-200/50 italic mb-3">100+ sitios web. Crecimiento orgánico. Sin anuncios pagados.</p>
          <p className="text-blue-200/60 max-w-3xl mb-3">The owner has built a network of over 100 websites across NYC, Long Island, and New Jersey &mdash; all driving organic traffic to The NYC Maid. This is not a company that relies on paid ads or lead generation services. Every client comes through our own channels. That&apos;s why the growth is real, sustainable, and accelerating.</p>
          <p className="text-blue-200/30 text-xs italic max-w-3xl mb-10">El dueño ha construido una red de más de 100 sitios web en NYC, Long Island y New Jersey — todos generando tráfico orgánico para The NYC Maid. Esta no es una empresa que depende de anuncios pagados o servicios de generación de prospectos. Cada cliente llega por nuestros propios canales. Por eso el crecimiento es real, sostenible y se está acelerando.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC] tracking-wide mb-2">100+</p>
              <p className="text-white font-semibold mb-1">Websites</p>
              <p className="text-blue-200/30 text-xs italic mb-1">Sitios web</p>
              <p className="text-blue-200/50 text-sm">Across every neighborhood in NYC, Long Island, and NJ. Each one ranks on Google and drives organic leads directly to our booking system.</p>
              <p className="text-blue-200/30 text-xs italic mt-1">En cada barrio de NYC, Long Island y NJ. Cada uno posicionado en Google generando prospectos orgánicos directo a nuestro sistema de reservas.</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC] tracking-wide mb-2">225+</p>
              <p className="text-white font-semibold mb-1">Neighborhoods</p>
              <p className="text-blue-200/30 text-xs italic mb-1">Vecindarios</p>
              <p className="text-blue-200/50 text-sm">Dedicated landing pages for every neighborhood we serve &mdash; Manhattan, Brooklyn, Queens, Long Island, New Jersey. Each one optimized for local search.</p>
              <p className="text-blue-200/30 text-xs italic mt-1">Páginas dedicadas para cada vecindario que servimos — Manhattan, Brooklyn, Queens, Long Island, New Jersey. Cada una optimizada para búsqueda local.</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC] tracking-wide mb-2">$0</p>
              <p className="text-white font-semibold mb-1">Ad Spend</p>
              <p className="text-blue-200/30 text-xs italic mb-1">Gasto en anuncios</p>
              <p className="text-blue-200/50 text-sm">Every single client comes through organic search, direct bookings, and referrals. No paid ads. No middlemen. No lead fees. That&apos;s why margins are healthy and growth is sustainable.</p>
              <p className="text-blue-200/30 text-xs italic mt-1">Cada cliente llega por búsqueda orgánica, reservas directas y referidos. Sin anuncios pagados. Sin intermediarios. Sin cuotas por prospectos. Por eso los márgenes son saludables y el crecimiento es sostenible.</p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-6">
              <p className="text-white font-semibold mb-1">Growth Trajectory</p>
              <p className="text-blue-200/30 text-xs italic mb-2">Trayectoria de crecimiento</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-blue-200/60">February</span><span className="text-white font-semibold">36 jobs</span></div>
                <div className="flex justify-between"><span className="text-blue-200/60">March (on pace)</span><span className="text-white font-semibold">75 jobs</span></div>
                <div className="flex justify-between"><span className="text-blue-200/60">April (projected)</span><span className="text-white font-semibold">125–150 jobs</span></div>
                <div className="flex justify-between"><span className="text-blue-200/60">May (projected)</span><span className="text-white font-semibold">200–250 jobs</span></div>
                <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-[#A8F0DC]">Winter target</span><span className="text-[#A8F0DC] font-bold">100 jobs/week</span></div>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-6">
              <p className="text-white font-semibold mb-1">What This Means for You</p>
              <p className="text-blue-200/30 text-xs italic mb-2">Lo que esto significa para ti</p>
              <p className="text-blue-200/50 text-sm leading-relaxed mb-1">The owner handles all of this &mdash; the websites, the SEO, the marketing, the growth. You never have to worry about where the next client comes from. Your job is to make sure every client that comes through the door has a perfect experience and comes back.</p>
              <p className="text-blue-200/30 text-xs italic mb-3">El dueño maneja todo esto — los sitios web, el SEO, el marketing, el crecimiento. Nunca tienes que preocuparte de dónde viene el próximo cliente. Tu trabajo es asegurar que cada cliente que llega tenga una experiencia perfecta y regrese.</p>
              <p className="text-blue-200/50 text-sm leading-relaxed mb-1">As volume increases, your revenue share increases automatically. You don&apos;t need to sell. You don&apos;t need to market. You just need to run the operation and run it well.</p>
              <p className="text-blue-200/30 text-xs italic">A medida que el volumen aumenta, tu porcentaje de ingresos aumenta automáticamente. No necesitas vender. No necesitas hacer marketing. Solo necesitas dirigir la operación y dirigirla bien.</p>
            </div>
          </div>
        </section>

        {/* What Else You'll Do As We Grow */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-1">As We Scale</p>
          <p className="text-gray-400 text-xs italic mb-2">A medida que crecemos</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-1">This Role Grows With You</h2>
          <p className="text-gray-400 text-sm italic mb-3">Este puesto crece contigo</p>
          <p className="text-gray-500 max-w-3xl mb-1">Right now you&apos;re managing 15–20 cleanings a week. That&apos;s the starting point. Here&apos;s what the role looks like as the business scales &mdash; and it&apos;s scaling fast.</p>
          <p className="text-gray-400 text-xs italic max-w-3xl mb-8">Ahora mismo manejas 15–20 limpiezas por semana. Ese es el punto de partida. Así se ve el puesto a medida que el negocio escala — y está escalando rápido.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                phase: 'Now',
                phaseEs: 'Ahora',
                title: 'Learn the Operation',
                titleEs: 'Aprende la operación',
                items: ['Manage 15–20 jobs/week', 'Learn the dashboard and systems', 'Build relationships with current cleaners', 'Master the daily workflow', 'Part-time, manageable workload'],
              },
              {
                phase: 'Month 2–3',
                phaseEs: 'Mes 2–3',
                title: 'Own the Process',
                titleEs: 'Adueñate del proceso',
                items: ['Handle 30–50 jobs/week', 'Recruit and onboard new cleaners', 'Build your own SOPs and checklists', 'Start managing client relationships independently', 'Revenue share climbing steadily'],
              },
              {
                phase: 'Month 4–6',
                phaseEs: 'Mes 4–6',
                title: 'Build Your Team',
                titleEs: 'Construye tu equipo',
                items: ['50–80+ jobs/week', 'Hire an assistant to help with volume', 'Your assistant reports to you', 'Oversee multi-region operations', 'Full-time workload, full-time income'],
              },
              {
                phase: 'Month 6+',
                phaseEs: 'Mes 6+',
                title: 'Executive Operations',
                titleEs: 'Operaciones ejecutivas',
                items: ['100+ jobs/week', 'Manage a full operations team', 'Own the entire department from home', 'Revenue share at its highest tier', 'COO-level responsibility, executive income'],
              },
            ].map(item => (
              <div key={item.phase} className="border border-gray-200 rounded-2xl p-6">
                <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.15em] uppercase mb-1">{item.phase}</p>
                <p className="text-gray-400 text-[10px] italic mb-1">{item.phaseEs}</p>
                <h3 className="font-semibold text-[#1E2A4A] mb-3">{item.title}</h3>
                <p className="text-gray-400 text-xs italic mb-3">{item.titleEs}</p>
                <div className="space-y-2">
                  {item.items.map(li => (
                    <div key={li} className="flex gap-2">
                      <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                      <p className="text-gray-500 text-xs leading-relaxed">{li}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who You Are */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-1">Requirements</p>
              <p className="text-gray-400 text-xs italic mb-2">Requisitos</p>
              <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-1">Who You Are</h2>
              <p className="text-gray-400 text-sm italic mb-6">Quién eres tú</p>
              <div className="space-y-3">
                {[
                  { title: 'Bilingual English & Spanish Preferred', titleEs: 'Se prefiere bilingüe inglés y español', desc: 'Our team is primarily Spanish-speaking. The ability to communicate naturally — not through a translator app — will make you significantly more effective.', descEs: 'Nuestro equipo habla principalmente español. La habilidad de comunicarte naturalmente — no a través de una app de traducción — te hará significativamente más efectivo.' },
                  { title: 'Addicted to Order', titleEs: 'Adicto al orden', desc: 'Inconsistency bothers you on a personal level. You see a gap, a missed step, or an out-of-place detail and you fix it before anyone asks.', descEs: 'La inconsistencia te molesta a nivel personal. Ves un hueco, un paso perdido, o un detalle fuera de lugar y lo arreglas antes de que alguien pregunte.' },
                  { title: 'Process-Driven', titleEs: 'Orientado a procesos', desc: 'You have a system for everything and follow it every single time. You don\'t wing it.', descEs: 'Tienes un sistema para todo y lo sigues cada vez. No improvisas.' },
                  { title: 'Relentless Work Ethic', titleEs: 'Ética de trabajo incansable', desc: 'You do what needs to be done, no excuses, no shortcuts. When something falls through, you catch it and fix it.', descEs: 'Haces lo que hay que hacer, sin excusas, sin atajos. Cuando algo se cae, lo atrapas y lo arreglas.' },
                  { title: 'Available 8 AM–6 PM, 7 Days/Week to Start', titleEs: 'Disponible 8 AM–6 PM, 7 días/semana para empezar', desc: 'You need to be reachable during these hours — but you are not working all day. During the week, you handle scheduling, recruiting, client communication, and team coordination. On weekends, you are simply monitoring active jobs and making sure everything runs smooth — about 30 minutes of actual work per day on average. At current volume, the actual work is a few hours a day. As volume grows and we hire an admin under you, the schedule becomes more flexible.', descEs: 'Necesitas estar disponible durante estas horas — pero no estás trabajando todo el día. Entre semana, manejas programación, reclutamiento, comunicación con clientes y coordinación del equipo. Los fines de semana, simplemente monitoreas los trabajos activos y te aseguras de que todo funcione bien — unos 30 minutos de trabajo real por día en promedio. Al volumen actual, el trabajo real es unas pocas horas al día. A medida que el volumen crece y contratamos un asistente bajo tu mando, el horario se vuelve más flexible.' },
                  { title: 'Detail-Obsessed', titleEs: 'Obsesionado con los detalles', desc: 'You catch what everyone else misses and bring it forward. Nothing slips through.', descEs: 'Atrapas lo que todos los demás pasan por alto y lo traes a la luz. Nada se escapa.' },
                  { title: 'Calm Under Pressure', titleEs: 'Calma bajo presión', desc: 'Chaos is just another problem to solve. You don\'t panic. You act.', descEs: 'El caos es solo otro problema por resolver. No entras en pánico. Actúas.' },
                  { title: 'Tech-Comfortable', titleEs: 'Cómodo con la tecnología', desc: 'You embrace systems and automation. What you don\'t know yet, you\'re willing to learn fast.', descEs: 'Aceptas los sistemas y la automatización. Lo que aún no sabes, estás dispuesto a aprenderlo rápido.' },
                  { title: 'Trustworthy with Financial Info', titleEs: 'Confiable con información financiera', desc: 'You will handle payment confirmations and financial data daily. Integrity is non-negotiable.', descEs: 'Manejarás confirmaciones de pago y datos financieros diariamente. La integridad no es negociable.' },
                  { title: 'Self-Directed', titleEs: 'Autónomo', desc: 'You solve problems before being asked. You don\'t wait for instructions. You see what needs to happen and you make it happen.', descEs: 'Resuelves problemas antes de que te lo pidan. No esperas instrucciones. Ves lo que necesita pasar y lo haces realidad.' },
                  { title: 'Old-School Customer Service Values', titleEs: 'Valores de servicio al cliente de la vieja escuela', desc: 'Every client feels taken care of, every time. No exceptions.', descEs: 'Cada cliente se siente atendido, siempre. Sin excepciones.' },
                  { title: '2+ Years Experience', titleEs: '2+ años de experiencia', desc: 'In customer service, operations, or service coordination preferred.', descEs: 'En servicio al cliente, operaciones, o coordinación de servicios preferido.' },
                ].map(item => (
                  <div key={item.title} className="flex gap-4 p-4 border border-gray-200 rounded-xl">
                    <span className="text-[#A8F0DC] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                    <div>
                      <p className="font-semibold text-[#1E2A4A] text-sm mb-0.5">{item.title}</p>
                      <p className="text-gray-400 text-xs italic mb-0.5">{item.titleEs}</p>
                      <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                      <p className="text-gray-400 text-xs italic mt-1">{item.descEs}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* Ground Floor Opportunity */}
              <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8">
                <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-1">Ground Floor Opportunity</p>
                <p className="text-blue-200/30 text-xs italic mb-4">Oportunidad desde el inicio</p>
                <div className="space-y-5">
                  <div>
                    <p className="text-white font-semibold text-lg">Get in Early</p>
                    <p className="text-blue-200/30 text-xs italic mb-1">Entra temprano</p>
                    <p className="text-blue-200/50 text-sm">We&apos;re at 15–20 cleanings/week right now. That means the workload is manageable, the role is part-time, and you have time to learn the operation inside and out before it gets big.</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">Growing 50–100% Monthly</p>
                    <p className="text-blue-200/30 text-xs italic mb-1">Creciendo 50–100% mensual</p>
                    <p className="text-blue-200/50 text-sm">This business is scaling fast. We operate 100+ websites driving organic growth across NYC, Long Island, and NJ. The volume is accelerating &mdash; and so will your income.</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">No Ceiling</p>
                    <p className="text-blue-200/30 text-xs italic mb-1">Sin límite</p>
                    <p className="text-blue-200/50 text-sm">Your revenue share grows as the business grows. No renegotiating, no asking. You build the team. You run the operation. Your compensation scales automatically.</p>
                  </div>
                </div>
              </div>

              {/* Compensation & Real Growth Path */}
              <div className="bg-[#A8F0DC] rounded-2xl p-8">
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-1">Compensation &amp; Growth Path</p>
                <p className="text-[#1E2A4A]/40 text-xs italic mb-2">Compensación y camino de crecimiento</p>
                <p className="text-[#1E2A4A]/50 text-xs mb-1">$500/wk guaranteed base + 10% of gross revenue &mdash; paid via Zelle every Friday</p>
                <p className="text-[#1E2A4A]/40 text-xs italic mb-5">$500/sem base garantizado + 10% de ingresos brutos — pagado vía Zelle cada viernes</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#1E2A4A]/40 text-[10px] font-semibold tracking-[0.15em] uppercase">Right Now &mdash; Part-Time <span className="font-normal italic normal-case tracking-normal">/ Ahora mismo — Medio tiempo</span></p>
                    <div className="flex justify-between items-center mt-1">
                      <div>
                        <p className="text-[#1E2A4A]/70 text-sm">~18 jobs/wk &times; $175 avg</p>
                        <p className="text-[#1E2A4A]/40 text-xs">~$3,150/wk revenue</p>
                      </div>
                      <span className="font-bold text-[#1E2A4A]">~$815/wk</span>
                    </div>
                  </div>
                  <div className="border-t border-[#1E2A4A]/10 pt-3">
                    <p className="text-[#1E2A4A]/40 text-[10px] font-semibold tracking-[0.15em] uppercase">April &mdash; Projected 125–150 Jobs/Mo <span className="font-normal italic normal-case tracking-normal">/ Abril — Proyectado</span></p>
                    <div className="flex justify-between items-center mt-1">
                      <div>
                        <p className="text-[#1E2A4A]/70 text-sm">~35 jobs/wk &times; $175 avg</p>
                        <p className="text-[#1E2A4A]/40 text-xs">~$6,125/wk revenue</p>
                      </div>
                      <span className="font-bold text-[#1E2A4A] text-lg">~$1,112/wk</span>
                    </div>
                  </div>
                  <div className="border-t border-[#1E2A4A]/10 pt-3">
                    <p className="text-[#1E2A4A]/40 text-[10px] font-semibold tracking-[0.15em] uppercase">May &mdash; Projected 200–250 Jobs/Mo <span className="font-normal italic normal-case tracking-normal">/ Mayo — Proyectado</span></p>
                    <div className="flex justify-between items-center mt-1">
                      <div>
                        <p className="text-[#1E2A4A]/70 text-sm">~55 jobs/wk &times; $175 avg</p>
                        <p className="text-[#1E2A4A]/40 text-xs">~$9,625/wk revenue</p>
                      </div>
                      <span className="font-bold text-[#1E2A4A] text-lg">~$1,462/wk</span>
                    </div>
                  </div>
                  <div className="border-t border-[#1E2A4A]/10 pt-3">
                    <p className="text-[#1E2A4A]/40 text-[10px] font-semibold tracking-[0.15em] uppercase">Winter &mdash; Target 100 Jobs/Wk <span className="font-normal italic normal-case tracking-normal">/ Invierno — Meta</span></p>
                    <div className="flex justify-between items-center mt-1">
                      <div>
                        <p className="text-[#1E2A4A]/70 text-sm">100 jobs/wk &times; $175 avg</p>
                        <p className="text-[#1E2A4A]/40 text-xs">$17,500/wk revenue</p>
                      </div>
                      <span className="font-bold text-[#1E2A4A] text-xl">$2,250/wk</span>
                    </div>
                  </div>
                </div>
                <p className="text-[#1E2A4A]/40 text-xs mt-5">These are real projections based on actual growth. We did 36 jobs last month. We&apos;re on pace for 75 this month. Revenue share % grows as you prove yourself.</p>
              </div>

              {/* Why Now */}
              <div className="border-2 border-[#1E2A4A] rounded-2xl p-8">
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-1">Why Now</p>
                <p className="text-gray-400 text-xs italic mb-4">¿Por qué ahora?</p>
                <p className="text-gray-600 text-sm leading-relaxed mb-1">
                  Right now the workload is light. You can learn the systems, build relationships with the team, and master the operation while it&apos;s still manageable. That window is closing fast.
                </p>
                <p className="text-gray-400 text-xs italic mb-3">
                  Ahora mismo la carga de trabajo es ligera. Puedes aprender los sistemas, construir relaciones con el equipo, y dominar la operación mientras es manejable. Esa ventana se está cerrando rápido.
                </p>
                <p className="text-gray-600 text-sm leading-relaxed mb-1">
                  The people who get in early at companies like this are the ones who end up running the show. This is that moment.
                </p>
                <p className="text-gray-400 text-xs italic">
                  Las personas que entran temprano a empresas como esta son las que terminan dirigiendo todo. Este es ese momento.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-1">Common Questions</p>
          <p className="text-gray-400 text-xs italic mb-2">Preguntas comunes</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-1">Frequently Asked Questions</h2>
          <p className="text-gray-400 text-sm italic mb-2">Preguntas frecuentes</p>
          <div className="w-10 h-[2px] bg-[#A8F0DC] mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="pr-4">
                    <h3 className="font-semibold text-[#1E2A4A] text-sm text-left">{faq.question}</h3>
                    <p className="text-gray-400 text-xs italic text-left">{faq.questionEs}</p>
                  </div>
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* How to Apply */}
        <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8 md:p-14 mb-20">
          <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-1">How to Apply</p>
          <p className="text-blue-200/30 text-xs italic mb-2">Cómo aplicar</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-1">Application Requirements</h2>
          <p className="text-blue-200/50 italic mb-8">Requisitos de la solicitud</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 bg-[#A8F0DC] text-[#1E2A4A] rounded-full flex items-center justify-center font-bold mb-4">1</div>
              <h3 className="text-white font-semibold mb-1">Photo &amp; Selfie Video</h3>
              <p className="text-blue-200/30 text-xs italic mb-2">Foto y video selfie</p>
              <p className="text-blue-200/60 text-sm leading-relaxed">
                Upload a clear photo of yourself and record a 60&ndash;90 second selfie video. Tell us who you are, why this role fits you, and why we can trust you to own operations independently. If bilingual, speak in both English and Spanish.
              </p>
              <p className="text-blue-200/30 text-xs italic mt-1">
                Sube una foto clara tuya y graba un video selfie de 60–90 segundos. Dinos quién eres, por qué este puesto es para ti, y por qué podemos confiar en que manejes las operaciones de forma independiente. Si eres bilingüe, habla en inglés y español en el video.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-[#A8F0DC] text-[#1E2A4A] rounded-full flex items-center justify-center font-bold mb-4">2</div>
              <h3 className="text-white font-semibold mb-1">Resume</h3>
              <p className="text-blue-200/30 text-xs italic mb-2">Currículum</p>
              <p className="text-blue-200/60 text-sm leading-relaxed">
                Attach your resume highlighting relevant experience in customer service, operations, scheduling, or team management.
              </p>
              <p className="text-blue-200/30 text-xs italic mt-1">
                Adjunta tu currículum resaltando experiencia relevante en servicio al cliente, operaciones, programación, o gestión de equipos.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-[#A8F0DC] text-[#1E2A4A] rounded-full flex items-center justify-center font-bold mb-4">3</div>
              <h3 className="text-white font-semibold mb-1">Complete the Form</h3>
              <p className="text-blue-200/30 text-xs italic mb-2">Completa el formulario</p>
              <p className="text-blue-200/60 text-sm leading-relaxed">
                Fill out the application form with your details, experience, and references. Applications without a selfie video will not be reviewed.
              </p>
              <p className="text-blue-200/30 text-xs italic mt-1">
                Llena el formulario de solicitud con tus datos, experiencia y referencias. Las solicitudes sin video selfie no serán revisadas.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link href="/apply/virtual-operations-manager" data-track="ops-howto-apply" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Apply Now
            </Link>
          </div>
        </section>

        {/* The Bigger Picture */}
        <section className="mb-20">
          <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8 md:p-14">
            <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-1">The Bigger Picture</p>
            <p className="text-blue-200/30 text-xs italic mb-2">El panorama completo</p>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide mb-1">This Is Not Just an Operations Manager Job</h2>
            <p className="text-blue-200/50 italic mb-6">Este no es solo un trabajo de gerente de operaciones</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-blue-200/70 text-sm leading-relaxed">
                  Let&apos;s be real about what this becomes. You&apos;re not applying to answer phones and shuffle schedules. You&apos;re stepping into the #2 seat at a company that is on a trajectory most businesses never see.
                </p>
                <p className="text-blue-200/70 text-sm leading-relaxed">
                  The owner builds the machine &mdash; the websites, the SEO, the marketing, the brand. You run everything that machine produces. Every client. Every cleaner. Every job. Every dollar collected. Every problem solved. Every day closed clean.
                </p>
                <p className="text-blue-200/70 text-sm leading-relaxed">
                  Within months, you&apos;ll be hiring your own assistant. Then managing a small team. By winter, you could be running 100+ jobs a week with a full operations staff reporting to you &mdash; all from your home.
                </p>
                <p className="text-white font-semibold leading-relaxed">
                  This is an executive-level opportunity disguised as a part-time operations role. The people who recognize that are the ones we want to hear from.
                </p>
                <p className="text-blue-200/30 text-xs italic mt-1">
                  Esta es una oportunidad de nivel ejecutivo disfrazada de puesto de operaciones a medio tiempo. Las personas que reconocen eso son las que queremos escuchar.
                </p>
              </div>
              <div className="space-y-4">
                <div className="bg-white/10 rounded-xl p-6">
                  <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.15em] uppercase mb-1">What This Role Becomes</p>
                  <p className="text-blue-200/30 text-xs italic mb-3">En lo que se convierte este puesto</p>
                  <div className="space-y-3">
                    {[
                      'Head of Operations — you own the entire operations department',
                      'Team builder — hire, train, and manage your own staff',
                      'Revenue partner — your income is tied directly to the business you run',
                      'Executive from home — no commute, no office, no corporate politics',
                      'Direct line to the owner — no layers, no bureaucracy, real impact',
                      'Build something real — this isn\'t a job, it\'s a career you\'re building',
                    ].map(item => (
                      <div key={item} className="flex gap-2">
                        <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-sm">&#10003;</span>
                        <p className="text-blue-200/60 text-sm">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#A8F0DC]/10 rounded-xl p-6">
                  <p className="text-white font-semibold mb-1">Think About It</p>
                  <p className="text-blue-200/30 text-xs italic mb-2">Piénsalo</p>
                  <p className="text-blue-200/60 text-sm leading-relaxed mb-1">
                    How many jobs let you work from your couch, start part-time, get paid every Friday via Zelle, earn a revenue share that grows automatically, build your own team, and have a direct partnership with the owner of a company that&apos;s doubling every month? This is that job.
                  </p>
                  <p className="text-blue-200/30 text-xs italic">
                    ¿Cuántos trabajos te dejan trabajar desde tu sofá, empezar medio tiempo, cobrar cada viernes vía Zelle, ganar un porcentaje de ingresos que crece automáticamente, construir tu propio equipo, y tener una alianza directa con el dueño de una empresa que se duplica cada mes? Este es ese trabajo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[#A8F0DC] rounded-2xl p-8 md:p-12 text-center mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-1">This Is the Ground Floor. The Door Is Open.</h2>
          <p className="text-[#1E2A4A]/40 text-sm italic mb-2">Este es el inicio. La puerta está abierta.</p>
          <p className="text-[#1E2A4A]/60 max-w-xl mx-auto mb-1">
            Work from home. Part-time to start. $500–$750/week to start via Zelle every Friday. A company growing 50–100% monthly. The workload is manageable now &mdash; get in, prove yourself, and grow into an executive operations role from your living room.
          </p>
          <p className="text-[#1E2A4A]/40 text-xs italic max-w-xl mx-auto mb-8">
            Trabaja desde casa. Medio tiempo para empezar. $500–$750/semana para empezar vía Zelle cada viernes. Una empresa creciendo 50–100% mensual. La carga de trabajo es manejable ahora — entra, demuestra lo que vales, y crece a un puesto ejecutivo de operaciones desde tu sala.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href="/apply/virtual-operations-manager" data-track="ops-bottom-apply" className="bg-[#1E2A4A] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
              Apply Now
            </Link>
            <a href="sms:2122028400" data-track="ops-bottom-text" className="text-[#1E2A4A] font-semibold underline underline-offset-4 hover:no-underline">
              or Text (212) 202-8400
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
