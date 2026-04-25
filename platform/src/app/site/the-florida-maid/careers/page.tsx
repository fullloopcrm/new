import type { Metadata } from 'next'
import Link from 'next/link'
import { organizationSchema, webSiteSchema, webPageSchema, breadcrumbSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'

const pageUrl = 'https://www.thefloridamaid.com/careers'
const pageTitle = 'Careers at The Florida Maid — Now Hiring Cleaners & Operations Staff'
const pageDescription = 'Join The Florida Maid team. Cleaners start at $30/hr with same-day pay via Zelle. Operations roles available. Apply online or text (954) 710-3636.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    type: 'website',
    siteName: 'The Florida Maid',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: pageTitle,
    description: pageDescription,
  },
}

const positions = [
  {
    title: 'House Cleaner / Maid',
    titleEs: 'Limpiador(a) / Mucama',
    pay: 'Starting $30/hr',
    payDetail: 'Paid via Zelle within 30 minutes of every job',
    description: 'Join our growing team of professional cleaners across Florida. Flexible schedule, same-day pay, 100% tips yours. Full-time and part-time positions available in South Florida, Tampa Bay, and Central Florida.',
    descriptionEs: 'Únete a nuestro equipo de limpiadores profesionales. Horario flexible, pago el mismo día, 100% de propinas.',
    href: '/available-florida-maid-jobs',
    highlights: ['Flexible schedule — you set your hours', 'Same-day pay via Zelle', '100% of tips are yours', 'Bonus programs for top performers', 'No forced hours or mandatory shifts'],
  },
]

export default function CareersPage() {
  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({ name: pageTitle, description: pageDescription, url: pageUrl }),
        breadcrumbSchema([{ name: 'Careers', url: pageUrl }]),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-[#34D399]/60 text-xs font-semibold tracking-[0.25em] uppercase mb-4">Now Hiring / Estamos Contratando</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl text-white tracking-wide leading-[0.9] mb-5">
            Careers at The Florida Maid
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
            We&apos;re growing fast and hiring across Florida. Same-day pay, flexible hours, and a team that actually respects your time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="sms:9547103636" className="bg-[#34D399] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Text (954) 710-3636
            </a>
            <Link href="/apply" className="text-white font-semibold py-3.5 hover:text-[#34D399] transition-colors underline underline-offset-4">
              Apply Online
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: 'Careers', href: '/careers' }]} />
      </div>

      {/* Open Positions */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Open Positions / Posiciones Abiertas</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-12">Join Our Team</p>

          <div className="space-y-8">
            {positions.map(pos => (
              <Link
                key={pos.href}
                href={pos.href}
                className="group block border border-gray-200 rounded-2xl p-8 hover:border-[#34D399] hover:shadow-lg transition-all bg-white"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                  <div>
                    <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide group-hover:text-[#CC6222]/70 transition-colors">
                      {pos.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{pos.titleEs}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-[family-name:var(--font-bebas)] text-xl text-[#34D399] tracking-wide">{pos.pay}</p>
                    <p className="text-gray-400 text-xs">{pos.payDetail}</p>
                  </div>
                </div>

                <p className="text-gray-600 leading-relaxed mb-2">{pos.description}</p>
                <p className="text-gray-400 text-sm mb-5">{pos.descriptionEs}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {pos.highlights.map(h => (
                    <div key={h} className="flex items-start gap-2">
                      <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                      <span className="text-gray-600 text-sm">{h}</span>
                    </div>
                  ))}
                </div>

                <span className="text-[#CC6222] font-semibold text-sm group-hover:underline underline-offset-4">
                  View Details & Apply &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Why The Florida Maid</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide text-center mb-12">Built for People Who Actually Work</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Same-Day Pay', desc: 'Get paid via Zelle within 30 minutes of every completed job. No weekly checks, no payroll delays.' },
              { title: 'Your Schedule', desc: 'You set your own availability. Full-time, part-time, weekends only — whatever works for your life.' },
              { title: '100% Your Tips', desc: 'Every tip goes straight to you. We never take a cut of your tips, period.' },
            ].map(item => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-7">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABlock title="Ready to Join?" subtitle="Apply online or text (954) 710-3636. We review applications within 24–48 hours." />
    </>
  )
}
