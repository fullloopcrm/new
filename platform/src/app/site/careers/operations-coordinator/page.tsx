import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, breadcrumbSchema, faqSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import { requireLegacySeoPages } from '@/lib/tenant-site'


const pageUrl = 'https://www.thenycmaid.com/careers/operations-coordinator'
const pageTitle = 'Part-Time Operations Admin — 10% Per Job, ~$40/hr Last Month | The NYC Maid'
const pageDescription = 'The NYC Maid is hiring a part-time operations coordinator. Earn 10% of every completed job — paid per job via Zelle. Last month 10% averaged out to about $40/hr. Own the calendar, cleaners, and collections. Aiming for 100 services/week. Apply now.'

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
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    type: 'article',
    siteName: 'The NYC Maid',
    locale: 'en_US',
    images: [{ url: 'https://www.thenycmaid.com/icon-512.png', width: 512, height: 512, alt: 'Part-Time Operations Admin — The NYC Maid — Now Hiring' }],
    publishedTime: '2026-03-31T00:00:00Z',
    modifiedTime: new Date().toISOString(),
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
    images: ['https://www.thenycmaid.com/icon-512.png'],
  },
  keywords: 'part time operations coordinator, part time coordinator remote, part time dispatcher, part time customer service, second job from home, side job remote, work from phone job, cleaning service coordinator, scheduling coordinator part time, payment coordinator, virtual coordinator, remote coordinator NYC, part time work from home, easy second job, side gig remote, operations coordinator cleaning company, bilingual coordinator, part time job NYC, part time job New Jersey, part time job Long Island, remote part time job, work from home part time, dispatcher part time, service coordinator part time, 10 percent commission job, per job pay, pay per job coordinator',
  other: {
    'geo.region': 'US-NY',
    'geo.placename': 'New York City',
    'geo.position': '40.7589;-73.9851',
    'ICBM': '40.7589, -73.9851',
    'revisit-after': '3 days',
    'format-detection': 'telephone=yes',
  },
}

function coordinatorJobPostingSchema() {
  const now = new Date()
  const datePosted = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const validThrough = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',

    title: 'Operations Admin (Part-Time, Remote)',
    datePosted,
    validThrough,
    description: `<h2>Part-Time Operations Admin — The NYC Maid — Remote</h2>
<p>The NYC Maid is hiring a <strong>part-time operations coordinator</strong> to own the calendar, the cleaners, and the collections. You earn <strong>10% of every completed and paid job</strong> — paid per job via Zelle within minutes of completion, same as the cleaners. No base salary. No hourly rate. You earn when the business earns.</p>

<h3>Compensation</h3>
<p><strong>10% of total revenue per completed job, paid via Zelle within minutes.</strong> February: 36 jobs. March: 81 jobs, $17,000 revenue = $1,700 earned — 10% averaged out to about $40/hr. We are aiming for 100 services per week, which would be $80K/month in revenue and around $8,000/month for you. Average job is ~$210, so you earn ~$21 per job. The business is doubling — more jobs means more money, automatically.</p>

<h3>Time Commitment</h3>
<p>About 40 hours per month. Average 2-5 services per day. Each job takes minutes of your time — the platform handles automations. This is a perfect second job that could become full-time if you want it to.</p>

<h3>How Every Job Works</h3>
<ul>
<li>Jobs are sold and added to the schedule. Cleaners are notified via text, email, and their team portal automatically.</li>
<li>Clients receive reminders at 7, 3, and 1 day before. Cleaners get a daily summary of all jobs the following day.</li>
<li>Cleaner arrives and checks in via the portal. You monitor check-ins in real time.</li>
<li>30 minutes before completion, cleaner hits the 30-min button. You are notified and reach out to the client to collect payment.</li>
<li>If client is happy, offer $10 off for a review on our platform and send the link: thenycmaid.com/reviews/submit</li>
<li>Payment via Zelle. You get the confirmation email, thank the client, pay the cleaner, take your 10%, discuss next services.</li>
</ul>

<h3>Beyond the Daily Jobs</h3>
<ul>
<li>Maintain great, steady communication with the owner — proactive updates, issues, and suggestions to improve processes</li>
<li>Handle client and cleaner issues — complaints, no-shows, scheduling conflicts, quality issues</li>
<li>Onboard new cleaners — check references, add to system, give portal access</li>
</ul>

<h3>Requirements</h3>
<ul>
<li>Bilingual English and Spanish strongly preferred — our cleaning team is primarily Spanish-speaking</li>
<li>Responsive and reliable — clients and cleaners need quick answers, not next-day replies</li>
<li>Comfortable working from a phone and a dashboard</li>
<li>Available during business hours (8 AM–6 PM ET) to respond within 15 minutes</li>
<li>Honest and trustworthy with payment information</li>
</ul>

<h3>Employment Type</h3>
<p>This is a <strong>1099 independent contractor position</strong>. You are not an employee. You are paid per job, you set your own workflow, and you are responsible for your own taxes. You will receive a 1099-NEC at the end of the year.</p>

<h3>How to Apply</h3>
<p>Submit your application at <a href="https://www.thenycmaid.com/apply/operations-coordinator">thenycmaid.com/apply/operations-coordinator</a>. Include a photo and a 60-second selfie video introduction. If bilingual, speak in both English and Spanish.</p>`,

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
      telephone: '+1-212-202-9030',
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

    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'US',
    },

    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: 756,
        maxValue: 8000,
        unitText: 'MONTH',
      },
    },

    employmentType: 'CONTRACTOR',
    jobImmediateStart: true,
    totalJobOpenings: 1,
    directApply: true,
    url: pageUrl,

    identifier: {
      '@type': 'PropertyValue',
      name: 'The NYC Maid',
      value: 'nycmaid-ops-coordinator-2026',
    },

    industry: 'Cleaning Services',
    occupationalCategory: '43-5032.00',

    qualifications: 'Bilingual English and Spanish strongly preferred. Responsive and reliable. Comfortable working from a phone and dashboard. Available 8 AM–6 PM ET to respond within 15 minutes. Trustworthy with payment information.',
    responsibilities: 'Respond to client texts and calls. Handle scheduling, reschedules, and complaints. Assign jobs to cleaners from the dashboard. Manage cleaner time-off, no-shows, and coverage swaps. Confirm payment received after every job via Zelle and Apple Pay. Chase unpaid balances. Keep the schedule full and clients happy.',
    skills: 'Customer service, scheduling, payment coordination, bilingual English and Spanish, text communication, problem solving, reliability, attention to detail',

    educationRequirements: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'high school',
    },
    experienceInPlaceOfEducation: true,

    incentiveCompensation: '10% of total revenue per completed and paid job, paid per job via Zelle within minutes of completion. February: 36 jobs = $756. March: 81 jobs, $17,000 revenue = $1,700 earned, averaging about $40/hr. Aiming for 100 services per week = $80K/month revenue = $8,000/month for you. 1099 independent contractor position.',
    jobBenefits: 'Work from home or your phone. About 40 hours per month. Perfect second job or side gig. No commute. Paid per job via Zelle within minutes. Income grows automatically as business grows. Could become full-time if desired. Bilingual work environment. 1099 independent contractor — you are your own boss.',
    workHours: 'Available 8 AM–6 PM ET to respond within 15 minutes. About 40 hours per month, 2-5 services per day.',

    applicationContact: {
      '@type': 'ContactPoint',
      telephone: '+1-212-202-9030',
      email: 'hi@thenycmaid.com',
      contactType: 'Human Resources',
      availableLanguage: ['English', 'Spanish'],
    },
  }
}

const faqs = [
  {
    question: 'How much will I actually earn?',
    questionEs: '¿Cuánto voy a ganar realmente?',
    answer: 'You earn 10% of every completed and paid job — paid per job via Zelle, just like the cleaners. The average job is about $210, so you earn roughly $21 per job. February we did 36 services. March we did 81 — that\'s $1,700. April target is 100+. The business is doubling. More jobs, more money, automatically.',
  },
  {
    question: 'How many hours per day is this?',
    questionEs: '¿Cuántas horas al día es esto?',
    answer: 'About 40 hours per month — not per week. Average is 2-5 services per day. Each one takes minutes of your time — the platform sends reminders, cleaners check themselves in, Zelle confirmations come to your email. You\'re responding to texts and clicking buttons in a dashboard between your other activities. You need to be responsive during business hours, but responsive means 15 minutes, not glued to a screen.',
  },
  {
    question: 'Is there a base salary or hourly rate?',
    questionEs: '¿Hay un salario base o pago por hora?',
    answer: 'No. You are paid per job — 10% of every completed and paid service, via Zelle, within minutes of completion. Same way the cleaners are paid. No base, no hourly. You get paid when jobs get done and money comes in. That means you have every incentive to keep the schedule full, prevent no-shows, and chase every payment. March that averaged out to about $40/hr. We\'re aiming for 100 services per week — at that volume this role pays around $8,000/month.',
  },
  {
    question: 'Can I do this alongside another job?',
    questionEs: '¿Puedo hacer esto junto con otro trabajo?',
    answer: 'Yes. That is exactly what this role is designed for. You need to be responsive during business hours (8 AM–6 PM ET) — meaning you can reply to a text within 15 minutes. If your other job allows you to check your phone and respond quickly, this works. Many dispatchers, VAs, and coordinators handle multiple clients or gigs at once.',
  },
  {
    question: 'What tools do I use?',
    questionEs: '¿Qué herramientas uso?',
    answer: 'A custom-built operations dashboard. It shows today\'s jobs, the cleaner schedule, client info, payment status, check-ins, and the 30-minute alerts — all in one place. You can run it from your phone or laptop. Cleaners have their own portal where they see their jobs, check in, check out, and hit the 30-minute button. Clients get automated reminders at 7, 3, and 1 day before. Everything is centralized — no spreadsheets, no guessing.',
  },
  {
    question: 'Do I need to speak Spanish?',
    questionEs: '¿Necesito hablar español?',
    answer: 'Strongly preferred. Our cleaning team is primarily Spanish-speaking. Being able to text a cleaner naturally in Spanish — not through a translator — makes you significantly more effective and makes the cleaners\' lives easier. If you are bilingual, say so in your application video.',
  },
  {
    question: 'What are the three jobs exactly?',
    questionEs: '¿Cuáles son los tres trabajos exactamente?',
    answer: 'You own the calendar, the cleaners, and the collections. The full flow: jobs are scheduled, cleaners are notified automatically, you make sure they show up and check in. When the cleaner hits the 30-minute button, you reach out to the client to collect payment via Zelle. If the client is happy, you offer $10 off for a review on our platform: thenycmaid.com/reviews/submit Then you pay the cleaner, take your 10%, and discuss next services if applicable. Between jobs, you handle any client or cleaner issues, onboard new cleaners, and keep Jeff updated.',
  },
  {
    question: 'How do I get paid?',
    questionEs: '¿Cómo me pagan?',
    answer: 'Per job, via Zelle, within minutes of the job completing — same as the cleaners. Client pays via Zelle, you get the email confirmation, you pay the cleaner their rate, and take your 10%. It happens in real time, not at the end of the week.',
  },
  {
    question: 'What happens if the business grows?',
    questionEs: '¿Qué pasa si el negocio crece?',
    answer: 'You make more money. February was 36 jobs. March was 81. We\'re aiming for 100 services per week — that\'s $80K/month in revenue and $8,000/month for you. Yes, more jobs means more of your time, but the per-hour rate stays strong because the platform handles the automations. You don\'t renegotiate. You just earn more.',
  },
  {
    question: 'Is this a W-2 job or 1099?',
    questionEs: '¿Es un trabajo W-2 o 1099?',
    answer: 'This is a 1099 independent contractor position. You are not an employee — you are paid per job, you set your own workflow, and you are responsible for your own taxes. At the end of the year you will receive a 1099-NEC for your total earnings. This is the same arrangement as the cleaners.',
  },
  {
    question: 'How do I apply?',
    questionEs: '¿Cómo aplico?',
    answer: 'Go to thenycmaid.com/apply/operations-coordinator. Fill out the short form, upload a photo of yourself and a 60-second selfie video. If you\'re bilingual, speak in both English and Spanish in the video. We review applications within 48 hours.',
  },
]

export default async function OperationsCoordinatorPage() {
  await requireLegacySeoPages()
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
            { name: 'Operations Admin', url: pageUrl },
          ],
        }),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Careers', url: 'https://www.thenycmaid.com/available-nyc-maid-jobs' },
          { name: 'Operations Admin', url: pageUrl },
        ]),
        coordinatorJobPostingSchema(),
        faqSchema(faqs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className="text-[#A8F0DC] text-sm font-semibold tracking-[0.2em] uppercase">Now Hiring</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Part-Time</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Work From Your Phone</p>
            <span className="text-white/30">&middot;</span>
            <p className="text-white/60 text-sm">Perfect Second Job</p>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Operations Admin — 10% Per Job, Averaged ~$40/hr Last Month
          </h1>
          <p className="text-blue-200/80 text-lg max-w-3xl leading-relaxed mb-3">
            The NYC Maid &mdash; New York City | Long Island | New Jersey
          </p>
          <p className="text-blue-200/60 max-w-3xl leading-relaxed mb-4">
            You own the calendar, the cleaners, and the collections. Jobs are sold and scheduled &mdash; your job is to make sure every cleaning runs, every client is happy, and every payment comes in. You get paid 10% of every completed job, same way the cleaners get paid &mdash; per job, via Zelle, within minutes of completion.
          </p>
          <p className="text-blue-200/60 max-w-3xl leading-relaxed mb-3">
            February: 36 services. March: 81 services, $17K revenue. April target: 100+. This business is growing fast. The more jobs that run, the more you earn &mdash; automatically.
          </p>
          <p className="text-blue-200/60 max-w-3xl leading-relaxed mb-6">
            March would have paid you ~$1,700 for about 40 hours of total work &mdash; 10% averaged out to about $40/hr. We&apos;re aiming for 100 services per week, which would be $80K/month in revenue. That&apos;s more time &mdash; but it&apos;s also around $8,000/month for you. It starts part-time, but it grows into something real if you want it to.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">10% Per Completed Job</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">~$40/hr Last Month</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">Paid Per Job via Zelle</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">2-5 Services/Day</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">Bilingual Preferred</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">1099 Independent Contractor</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Link href="/apply/operations-coordinator" data-track="coord-hero-apply" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Apply Now
            </Link>
            <a href="sms:2122029030" data-track="coord-hero-text" className="text-blue-200/70 font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
              or Text (212) 202-9030
            </a>
          </div>
        </div>
      </section>

      {/* Numbers Bar */}
      <section className="bg-[#A8F0DC] py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-center">
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">~$40/hr</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Averaged Last Month</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Promedio el mes pasado</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">36 &rarr; 81</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Feb &rarr; Mar Jobs</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Trabajos feb &rarr; mar</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">100+</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">April Target</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Meta de abril</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">~40 hrs</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Per Month</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Por mes</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#1E2A4A] tracking-wide">Zelle</p>
              <p className="text-[#1E2A4A]/60 text-sm font-medium">Paid Per Job</p>
              <p className="text-[#1E2A4A]/40 text-xs italic">Pago por trabajo</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Careers', href: '/available-nyc-maid-jobs' },
          { name: 'Operations Admin', href: '/careers/operations-coordinator' },
        ]} />

        {/* The Three Jobs */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-2">What You Own</p>
          <p className="text-gray-400 text-xs italic mb-2">Lo que tú controlas</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">You Own the Calendar, the Cleaners, and the Collections</h2>
          <p className="text-gray-400 text-sm italic mb-3">Tú controlas el calendario, los limpiadores y los cobros</p>
          <p className="text-gray-500 max-w-3xl mb-3">The owner sells the jobs and adds them to the schedule. From that moment on, <strong className="text-[#1E2A4A]">everything is yours</strong>. You make sure the cleaner shows up, the client is happy, and the money comes in. You are paid the same way the cleaners are paid &mdash; per job, via Zelle, within minutes of completion.</p>
          <p className="text-gray-500 max-w-3xl mb-10">This is not a task list. This is ownership. If a job falls through, that&apos;s on you. If a client doesn&apos;t pay, that&apos;s on you. If a cleaner no-shows, that&apos;s on you to fix. You run the operation. The platform gives you every tool you need &mdash; you just have to use them.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clients */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] p-6">
                <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC] tracking-wide mb-1">1</p>
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Clients</h3>
                <p className="text-blue-200/30 text-xs italic">Clientes</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  'Respond to client texts and calls during business hours',
                  'Answer scheduling questions — dates, times, availability',
                  'Handle reschedules and cancellations',
                  'Resolve complaints before they become problems',
                  'Keep clients happy so they keep coming back',
                ].map(item => (
                  <div key={item} className="flex gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <p className="text-gray-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cleaners */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] p-6">
                <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC] tracking-wide mb-1">2</p>
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Cleaners</h3>
                <p className="text-blue-200/30 text-xs italic">Limpiadores</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  'Assign jobs to cleaners from the dashboard',
                  'Manage cleaner availability and time-off requests',
                  'Handle no-shows — find coverage fast',
                  'Swap cleaners when schedules change',
                  'Keep the schedule full so nothing sits empty',
                ].map(item => (
                  <div key={item} className="flex gap-3">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0">&#10003;</span>
                    <p className="text-gray-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] p-6">
                <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#A8F0DC] tracking-wide mb-1">3</p>
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">Payments</h3>
                <p className="text-blue-200/30 text-xs italic">Pagos</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  'Confirm Zelle or Apple Pay received after every job',
                  'Mark jobs as paid in the dashboard',
                  'Follow up on unpaid balances — no exceptions',
                  'No job closes until payment is confirmed',
                  'You only get paid when they pay — so you will chase it',
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

        {/* How a Job Flows */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">How Every Job Works</p>
          <p className="text-gray-400 text-xs italic mb-2">Cómo funciona cada trabajo</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">The Full Lifecycle of a Cleaning Job</h2>
          <p className="text-gray-400 text-sm italic mb-3">El ciclo completo de un trabajo de limpieza</p>
          <p className="text-gray-500 max-w-3xl mb-10">This is exactly what happens from the moment a job is booked to the moment you get paid. Every step. No surprises.</p>

          <div className="space-y-4">
            {[
              {
                step: '1',
                title: 'Job Is Sold & Scheduled',
                titleEs: 'El trabajo se vende y se programa',
                desc: 'Jeff sells the job and adds it to the calendar. Cleaners are automatically notified via text and email. The job appears in their team portal. The client receives automatic reminders at 7 days, 3 days, and 1 day before the appointment.',
                descEs: 'Jeff vende el trabajo y lo agrega al calendario. Los limpiadores son notificados automáticamente por texto y email. El trabajo aparece en su portal. El cliente recibe recordatorios automáticos a 7, 3 y 1 día antes de la cita.',
              },
              {
                step: '2',
                title: 'Day Before — Cleaner Reminder',
                titleEs: 'Día anterior — Recordatorio al limpiador',
                desc: 'Cleaners get a daily summary of all jobs for the following day. You check the dashboard to make sure every job is covered. If a cleaner is out, you find a replacement.',
                descEs: 'Los limpiadores reciben un resumen diario de todos los trabajos del día siguiente. Tú revisas el panel para asegurarte de que cada trabajo esté cubierto. Si un limpiador no está disponible, encuentras un reemplazo.',
              },
              {
                step: '3',
                title: 'Cleaner Arrives & Checks In',
                titleEs: 'El limpiador llega y se reporta',
                desc: 'The cleaner arrives at the job and checks in through their portal. You see the check-in in real time on the dashboard. If someone hasn\'t checked in, you\'re already texting them.',
                descEs: 'El limpiador llega al trabajo y se reporta por su portal. Tú ves el reporte en tiempo real en el panel. Si alguien no se ha reportado, ya le estás escribiendo.',
              },
              {
                step: '4',
                title: '30 Minutes Before Completion',
                titleEs: '30 minutos antes de terminar',
                desc: 'The cleaner hits the 30-minute button in their portal. You are notified instantly. You text the client to collect payment — they know it\'s coming, they\'ve been prepped. If the client is happy, you offer $10 off their next service for a review and send them the link: thenycmaid.com/reviews/submit',
                descEs: 'El limpiador presiona el botón de 30 minutos en su portal. Tú recibes la notificación al instante. Le escribes al cliente para cobrar — ya saben que viene, están preparados. Si el cliente está contento, le ofreces $10 de descuento por una reseña en Google y le envías el enlace.',
              },
              {
                step: '5',
                title: 'Payment Collected',
                titleEs: 'Pago cobrado',
                desc: 'Client pays via Zelle. You get the email confirmation. You thank the client. Then you pay the cleaner their rate via Zelle — and take your 10%. If applicable, you discuss the next service or recurring schedule.',
                descEs: 'El cliente paga por Zelle. Recibes la confirmación por email. Agradeces al cliente. Luego pagas al limpiador su tarifa por Zelle — y tomas tu 10%. Si aplica, discutes el próximo servicio o horario recurrente.',
              },
              {
                step: '6',
                title: 'Done — Next Job',
                titleEs: 'Listo — Siguiente trabajo',
                desc: 'That\'s one job. You do this 2-5 times a day. The whole cycle takes minutes per job because the platform handles the automations. You\'re just the human in the loop making sure it all runs clean.',
                descEs: 'Eso es un trabajo. Haces esto 2-5 veces al día. El ciclo completo toma minutos por trabajo porque la plataforma maneja las automatizaciones. Tú eres la persona asegurándose de que todo funcione bien.',
              },
            ].map(item => (
              <div key={item.step} className="flex gap-5 p-5 border border-gray-200 rounded-xl hover:border-[#A8F0DC] transition-colors">
                <div className="flex-shrink-0 w-12">
                  <span className="font-[family-name:var(--font-bebas)] text-3xl text-[#A8F0DC]">{item.step}</span>
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

        {/* Beyond the Jobs */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-2">The Rest</p>
          <p className="text-gray-400 text-xs italic mb-2">Lo demás</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">Beyond the Daily Jobs</h2>
          <p className="text-gray-400 text-sm italic mb-3">Más allá de los trabajos diarios</p>
          <p className="text-gray-500 max-w-3xl mb-10">The job cycle is the core. But you also own these:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Communication with Jeff</h3>
              <p className="text-gray-400 text-xs italic mb-2">Comunicación con Jeff</p>
              <p className="text-gray-500 text-sm leading-relaxed">Great, steady communication. Jeff needs to know what&apos;s happening without having to ask. Issues, wins, suggestions &mdash; proactive, not reactive. If something is off with the system or a process could be better, say it.</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Client &amp; Cleaner Issues</h3>
              <p className="text-gray-400 text-xs italic mb-2">Problemas con clientes y limpiadores</p>
              <p className="text-gray-500 text-sm leading-relaxed">Complaints, no-shows, scheduling conflicts, late arrivals, quality issues. You handle them. You solve them. You don&apos;t wait for Jeff to tell you what to do. If a client is unhappy, you fix it before it becomes a cancellation.</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Onboarding New Cleaners</h3>
              <p className="text-gray-400 text-xs italic mb-2">Incorporación de nuevos limpiadores</p>
              <p className="text-gray-500 text-sm leading-relaxed">Cleaners apply through the website. You check their references, add them to the system, and give them access to the team portal. As the business grows, you build the team that supports it.</p>
            </div>
          </div>
        </section>

        {/* Not a Full-Time Job */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">The Time Commitment</p>
          <p className="text-gray-400 text-xs italic mb-2">El compromiso de tiempo</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">~40 Hours a Month. Not 40 Hours a Week.</h2>
          <p className="text-gray-400 text-sm italic mb-3">~40 horas al mes. No 40 horas a la semana.</p>
          <p className="text-gray-500 max-w-3xl mb-3">Average is 2-5 services per day. Each one takes minutes of your time &mdash; not hours. The platform sends the reminders, the cleaners check themselves in, the Zelle confirmation comes to your email. You&apos;re responding to texts and clicking buttons in a dashboard, not scrubbing floors.</p>
          <p className="text-gray-500 max-w-3xl mb-3">Most of your day, you&apos;re doing your other job, living your life, or sitting on the couch. The work comes in bursts. A text here, a dashboard check there. You need to be responsive during business hours &mdash; but responsive means 15 minutes, not glued to a screen.</p>
          <p className="text-gray-500 max-w-3xl"><strong className="text-[#1E2A4A]">But it could become more if you want it to.</strong> The business is doubling. If you want to grow with it into a full-time role, that path is there. If you want to keep it as the best side gig you&apos;ve ever had, that works too.</p>
        </section>

        {/* The Math */}
        <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] rounded-2xl p-8 md:p-14 mb-20">
          <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-2">The Math</p>
          <p className="text-blue-200/30 text-xs italic mb-2">Los números</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-3">You Earn More When the Business Does More</h2>
          <p className="text-blue-200/30 text-xs italic mb-3">Ganas más cuando el negocio crece</p>
          <p className="text-blue-200/60 max-w-3xl mb-3">You get paid the same way the cleaners get paid &mdash; per job, via Zelle, within minutes of completion. No renegotiating. No asking for a raise. The business grows, your check grows.</p>
          <p className="text-blue-200/60 max-w-3xl mb-10">February we did 36 services. March we did 81. We&apos;re targeting 100+ in April. Here&apos;s what that looks like for you:</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="border border-white/10 rounded-2xl p-6">
              <p className="text-blue-200/40 text-xs font-semibold tracking-[0.2em] uppercase mb-3">February</p>
              <p className="text-blue-200/30 text-xs italic mb-3">Febrero</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-white/40 tracking-wide mb-1">$756</p>
              <p className="text-blue-200/40 text-sm">36 jobs &times; ~$210 avg</p>
              <p className="text-blue-200/40 text-sm">Your 10% = $756</p>
              <p className="text-blue-200/30 text-xs mt-2">~20 hrs/mo</p>
            </div>
            <div className="border border-[#A8F0DC]/30 rounded-2xl p-6">
              <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.2em] uppercase mb-3">March</p>
              <p className="text-blue-200/30 text-xs italic mb-3">Marzo</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#A8F0DC] tracking-wide mb-1">$1,700</p>
              <p className="text-blue-200/60 text-sm">81 jobs &times; ~$210 avg = $17K</p>
              <p className="text-blue-200/60 text-sm">Your 10% = <strong className="text-white">$1,700</strong></p>
              <p className="text-blue-200/40 text-xs mt-2">~40 hrs/mo &mdash; about $40/hr</p>
            </div>
            <div className="border border-white/10 rounded-2xl p-6">
              <p className="text-blue-200/40 text-xs font-semibold tracking-[0.2em] uppercase mb-3">April Target (100+)</p>
              <p className="text-blue-200/30 text-xs italic mb-3">Meta de abril</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#A8F0DC] tracking-wide mb-1">$2,100+</p>
              <p className="text-blue-200/60 text-sm">100 jobs &times; ~$210 avg = $21K</p>
              <p className="text-blue-200/60 text-sm">Your 10% = <strong className="text-white">$2,100</strong></p>
              <p className="text-blue-200/40 text-xs mt-2">~45 hrs/mo &mdash; still part-time</p>
            </div>
            <div className="border border-white/10 rounded-2xl p-6">
              <p className="text-blue-200/40 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Goal: 100/wk ($80K/mo)</p>
              <p className="text-blue-200/30 text-xs italic mb-3">Meta: 100/sem ($80K/mes)</p>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#A8F0DC] tracking-wide mb-1">$8,000</p>
              <p className="text-blue-200/60 text-sm">400 jobs/mo &times; ~$200 avg = $80K</p>
              <p className="text-blue-200/60 text-sm">Your 10% = <strong className="text-white">$8,000/mo</strong></p>
              <p className="text-blue-200/40 text-xs mt-2">More time &mdash; but real money</p>
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-2">Is This You?</p>
          <p className="text-gray-400 text-xs italic mb-2">¿Eres tú?</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">The Perfect Second Job For</h2>
          <p className="text-gray-400 text-sm italic mb-10">El segundo trabajo perfecto para</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Stay-at-Home Parents</h3>
              <p className="text-gray-400 text-xs italic mb-2">Padres que están en casa</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;re home with the kids. You can check your phone between school runs and nap times. An extra $1,700/mo for responding to texts during the day? That&apos;s real money for real families.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Virtual Assistants &amp; Freelancers</h3>
              <p className="text-gray-400 text-xs italic mb-2">Asistentes virtuales y freelancers</p>
              <p className="text-gray-500 text-sm leading-relaxed">You already manage multiple clients from your laptop. Adding one more &mdash; with a dashboard that does most of the work &mdash; is easy. And this one pays you more when you do it well.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Customer Service Reps</h3>
              <p className="text-gray-400 text-xs italic mb-2">Representantes de servicio al cliente</p>
              <p className="text-gray-500 text-sm leading-relaxed">You already spend your day answering people. This is the same skill set, but on your own terms, from your phone, with commission instead of an hourly wage. Better work, better pay.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Dispatchers &amp; Coordinators</h3>
              <p className="text-gray-400 text-xs italic mb-2">Despachadores y coordinadores</p>
              <p className="text-gray-500 text-sm leading-relaxed">You&apos;ve dispatched drivers, technicians, or field workers before. Same energy, smaller scale, from your couch. And you get 10% of every job instead of a flat hourly.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Anyone Who Wants Extra Income</h3>
              <p className="text-gray-400 text-xs italic mb-2">Cualquiera que quiera ingresos extra</p>
              <p className="text-gray-500 text-sm leading-relaxed">You have a full-time job but can check your phone during the day. It starts at $1,700/mo and the business is aiming for $8,000/mo. No second commute, no second boss breathing down your neck, no second uniform. This is that.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6 hover:border-[#A8F0DC] transition-colors">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Bilingual Professionals</h3>
              <p className="text-gray-400 text-xs italic mb-2">Profesionales bilingües</p>
              <p className="text-gray-500 text-sm leading-relaxed">You speak English and Spanish. Here, that&apos;s not a nice-to-have &mdash; it&apos;s a superpower. Our cleaning team is primarily Spanish-speaking. You bridge the gap and make the whole operation smoother.</p>
            </div>
          </div>
        </section>

        {/* The Platform */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Your Tools</p>
          <p className="text-gray-400 text-xs italic mb-2">Tus herramientas</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-3">The Platform Does the Heavy Lifting</h2>
          <p className="text-gray-400 text-sm italic mb-3">La plataforma hace el trabajo pesado</p>
          <p className="text-gray-500 max-w-3xl mb-10">You are not building systems or managing spreadsheets. The entire operation runs on a custom-built platform. Automated reminders, recurring booking generation, cleaner notifications, payment tracking &mdash; all handled. You are the human making sure the human parts work.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">What the Platform Handles</h3>
              <p className="text-gray-400 text-xs italic mb-3">Lo que maneja la plataforma</p>
              <div className="space-y-2">
                {[
                  'Automated booking confirmations to clients and cleaners (SMS + email)',
                  'Recurring job generation — weekly, bi-weekly, and monthly bookings auto-created',
                  'Reminders sent automatically before every job',
                  'Cleaner portal — they see their jobs, check in, check out, track earnings',
                  'Client portal — clients can view their bookings and history',
                  'Finance tracking — revenue, cleaner pay, and your commission all tracked',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-3">What You Handle</h3>
              <p className="text-gray-400 text-xs italic mb-3">Lo que tú manejas</p>
              <div className="space-y-2">
                {[
                  'Client texts and calls — the human stuff a bot can\'t do',
                  'Assigning the right cleaner to the right job',
                  'Handling the unexpected — no-shows, reschedules, complaints',
                  'Confirming payment came through and chasing what didn\'t',
                  'Keeping clients happy so they come back',
                  'Keeping cleaners coordinated so jobs run smooth',
                ].map(item => (
                  <div key={item} className="flex gap-2">
                    <span className="text-[#A8F0DC] mt-0.5 flex-shrink-0 text-xs">&#10003;</span>
                    <p className="text-gray-500 text-xs leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.2em] uppercase mb-2">Questions</p>
          <p className="text-gray-400 text-xs italic mb-2">Preguntas</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-8">Frequently Asked Questions</h2>
          <p className="text-gray-400 text-sm italic mb-8">Preguntas frecuentes</p>
          <div className="space-y-3">
            {faqs.map(faq => (
              <details key={faq.question} className="group border border-gray-200 rounded-xl overflow-hidden hover:border-[#A8F0DC] transition-colors">
                <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-[#1E2A4A] text-sm">{faq.question}</span>
                    <span className="block text-gray-400 text-xs italic mt-0.5">{faq.questionEs}</span>
                  </div>
                  <span className="text-[#A8F0DC] text-lg flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Apply CTA */}
        <section className="bg-[#A8F0DC] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-2">10% Per Job. Averaged ~$40/hr Last Month. Paid via Zelle in Minutes.</p>
          <p className="text-[#1E2A4A]/40 text-sm italic mb-2">10% por trabajo. Promedio ~$40/hr el mes pasado. Pagado por Zelle en minutos.</p>
          <p className="text-[#1E2A4A]/60 max-w-xl mx-auto mb-6">
            Apply in 2 minutes. Upload a photo and a 60-second video. We review applications within 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/apply/operations-coordinator" data-track="coord-bottom-apply" className="bg-[#1E2A4A] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
              Apply Now
            </Link>
            <a href="sms:2122029030" data-track="coord-bottom-text" className="text-[#1E2A4A]/60 font-medium text-sm hover:text-[#1E2A4A] transition-colors underline underline-offset-4">
              or Text (212) 202-9030
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
