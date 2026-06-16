// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/app/site/wash-and-fold-nyc/_lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'

export const metadata: Metadata = {
  title: 'Laundry Jobs NYC — $18–22/hr, Flexible Schedule, Weekly Pay | The NYC Wash and Fold Service Company',
  description: 'Join the NYC Wash and Fold Service Company team. Now hiring pickup/delivery drivers, laundry attendants, and route managers across Manhattan, Brooklyn & Queens. $18-22/hr, weekly pay, flexible hours. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/careers' },
}

const careerFAQs = [
  { question: 'How much does the job pay?', answer: 'Pickup and delivery drivers earn twenty to twenty-two dollars per hour. Laundry attendants earn eighteen to twenty dollars per hour. Route managers earn twenty-two to twenty-six dollars per hour. All positions are paid weekly via direct deposit or Zelle. Tips from customers are one hundred percent yours and not deducted from your hourly rate.' },
  { question: 'What does the schedule look like?', answer: 'You set your own availability. We have morning routes, afternoon routes, and evening routes available seven days a week. Most drivers work four to five days per week with shifts ranging from four to eight hours. You tell us when you are available and we build your route around your schedule — not the other way around.' },
  { question: 'Do I need a car?', answer: 'For pickup and delivery drivers in Manhattan, a car is not required — many routes are walkable or use public transit with a folding cart. For Brooklyn and Queens routes, a car or access to a vehicle is strongly preferred since stops are more spread out. Laundry attendants work at our partner facilities and do not need a vehicle.' },
  { question: 'Do I need experience?', answer: 'No prior laundry industry experience is required for any position. We provide full training on our twelve-step process, route management, customer communication, and quality standards. What we look for is reliability, attention to detail, and a good attitude. If you show up on time and care about doing good work, we will teach you everything else.' },
  { question: 'How do I apply?', answer: 'Text nine-one-seven, nine-seven-zero, six-zero-zero-two with your name and the position you are interested in. Or visit washandfoldnyc.com/apply and fill out the application form. We review applications within forty-eight hours and schedule interviews the same week. Most new hires start working within one to two weeks of applying.' },
  { question: 'Is there room for growth?', answer: 'Yes. We are a growing company and promote from within. Drivers who demonstrate reliability and leadership are promoted to route managers. Route managers can advance to operations roles. Several of our current managers started as drivers. As we expand into new neighborhoods and boroughs, there will be more opportunities at every level.' },
  { question: 'What neighborhoods are you hiring in?', answer: 'We are currently hiring across all of Manhattan, Brooklyn, and Queens. You can choose routes in your own neighborhood or surrounding areas. We try to assign routes close to where you live to minimize commute time.' },
  { question: 'Are positions full-time or part-time?', answer: 'Both. We have full-time drivers working forty or more hours per week and part-time drivers working fifteen to twenty-five hours per week. You tell us how many hours you want and we will build a schedule that works. Many of our part-time drivers are students, parents, or people with other jobs who want flexible supplemental income.' },
]

export default function CareersPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">
            Laundry Jobs in NYC — $18–22/hr, Weekly Pay, Flexible Hours
          </h1>
          <p className="text-sky-200/70 text-lg max-w-2xl mx-auto mb-6">
            Now hiring across <Link href="/boroughs/manhattan" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Brooklyn</Link>, and <Link href="/boroughs/queens" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white">Queens</Link>. Pickup and delivery drivers, laundry attendants, and route managers. No experience required — we train you. Set your own schedule. Get paid every week.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Apply — Text (917) 970-6002</a>
            <Link href="/apply" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Apply Online</Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">Open Positions</h2>
          <div className="space-y-6">
            {[
              { title: 'Pickup & Delivery Driver', pay: '$20–22/hr', desc: 'Pick up dirty laundry bags from customer doors, lobbies, and doormen across your assigned route. Deliver clean, folded laundry back the following day. You will manage a route of fifteen to twenty-five stops per shift, communicating with customers via text and coordinating with building staff. Must be reliable, punctual, and comfortable navigating NYC neighborhoods. A smartphone is required for route tracking and customer communication. A car is preferred for Brooklyn and Queens routes but not required for Manhattan.' },
              { title: 'Laundry Attendant', pay: '$18–20/hr', desc: 'Work at our partner laundry facility sorting, washing, drying, and folding customer laundry. You will follow our twelve-step process on every order: color sorting, fabric sorting, stain pre-treatment, washing, drying, hand-folding, organizing, and packaging. Attention to detail is critical — every item must be folded to our standard and every order must be inventoried before packaging. No prior laundry experience needed — we train you on everything. Must be comfortable standing for extended periods and lifting bags up to thirty pounds.' },
              { title: 'Route Manager', pay: '$22–26/hr', desc: 'Oversee a team of three to six pickup and delivery drivers across a borough. Manage route scheduling, driver assignments, customer issue resolution, and quality control. You are responsible for ensuring every order in your borough is picked up on time and delivered within our twenty-four to forty-eight hour turnaround window. This role requires prior logistics or management experience, strong organizational skills, and the ability to solve problems quickly. Most route managers started as drivers and were promoted based on performance.' },
            ].map(job => (
              <div key={job.title} className="border border-gray-200 rounded-xl p-8">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide">{job.title}</h3>
                  <span className="text-[#4BA3D4] font-bold text-xl whitespace-nowrap ml-4">{job.pay}</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{job.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">Why Work With The NYC Wash and Fold Service Company</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { t: 'Weekly Pay', d: 'Get paid every week via direct deposit or Zelle. No waiting two weeks or a month for a paycheck. Tips are one hundred percent yours — paid directly by customers and never deducted from your hourly rate.' },
              { t: 'Flexible Schedule', d: 'You tell us when you are available — mornings, afternoons, evenings, weekdays, weekends. We build your route around your schedule. Work as few as fifteen hours or as many as forty-plus per week. Change your availability anytime.' },
              { t: 'Routes Near Home', d: 'We assign routes close to where you live so you are not commuting across the city to start your shift. Most drivers work in their own neighborhood or adjacent neighborhoods. Less commute time means more earning hours.' },
              { t: 'No Experience Needed', d: 'Full training provided on everything — our process, route management, customer communication, folding standards. If you are reliable and detail-oriented, we will teach you the rest. Many of our best drivers had zero laundry industry experience before joining.' },
              { t: 'Growth Opportunities', d: 'We promote from within. Drivers become route managers. Route managers move into operations. As we expand to new boroughs and neighborhoods, new positions open regularly. High performers get first priority for promotions and schedule preferences.' },
              { t: 'Real Company, Real Support', d: 'You are not a gig contractor with no backup. We are a licensed, insured company with a management team that supports you. If a customer has an issue, we handle it. If you have a question, you text your manager and get an answer in minutes. You are part of a team, not a solo operator.' },
            ].map(item => (
              <div key={item.t} className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-[#1a3a5c] text-base mb-2">{item.t}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-4">How to Apply — 3 Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7 text-center">
              <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">01</span>
              <p className="font-[family-name:var(--font-bebas)] text-xl text-white mt-2 mb-2">Text or Apply Online</p>
              <p className="text-sky-200/60 text-sm">Text (917) 970-6002 with your name and the position you want. Or fill out the form at washandfoldnyc.com/apply.</p>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7 text-center">
              <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">02</span>
              <p className="font-[family-name:var(--font-bebas)] text-xl text-white mt-2 mb-2">Quick Interview</p>
              <p className="text-sky-200/60 text-sm">We review applications within forty-eight hours and schedule a brief phone or in-person interview the same week.</p>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7 text-center">
              <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">03</span>
              <p className="font-[family-name:var(--font-bebas)] text-xl text-white mt-2 mb-2">Start Working</p>
              <p className="text-sky-200/60 text-sm">Most new hires start within one to two weeks. We provide full training on your first few shifts. Get paid weekly from day one.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">Hiring by Neighborhood</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">We are hiring in every neighborhood we serve. Click your area to see local job details.</p>
          {AREAS.map(area => {
            const neighborhoods = getNeighborhoodsByArea(area.slug)
            return (
              <div key={area.slug} className="mb-8">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-3">{area.name}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {neighborhoods.map(n => (
                    <Link key={n.slug} href={`/careers/${n.slug}`} className="text-sm text-gray-600 hover:text-[#4BA3D4] transition-colors py-1">
                      {n.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <FAQSection faqs={careerFAQs} title="Careers — Frequently Asked Questions" />
      <CTABlock title="Apply Today — Start This Week" subtitle="Text (917) 970-6002 with your name and position. $18-22/hr, flexible schedule, weekly pay." />
    </>
  )
}
