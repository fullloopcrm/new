import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/app/site/the-florida-maid/_lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/app/site/the-florida-maid/_lib/seo/locations'
import { organizationSchema, webSiteSchema, webPageSchema, localBusinessSchema, howToBookSchema, breadcrumbSchema, faqSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'

const openings = [
  {
    region: 'South Florida',
    locations: 'Miami-Dade, Broward & Palm Beach',
    areaSlugs: ['miami-dade', 'broward', 'palm-beach'],
    id: 'south-florida',
  },
  {
    region: 'Tampa Bay',
    locations: 'Tampa, St. Petersburg & Clearwater',
    areaSlugs: ['tampa-bay'],
    id: 'tampa-bay',
  },
  {
    region: 'Central Florida',
    locations: 'Orlando, Winter Park & Kissimmee',
    areaSlugs: ['orlando'],
    id: 'central-florida',
  },
]

const careerFAQs = [
  { question: 'How much do cleaners earn?', questionEs: '¿Cuánto ganan los limpiadores?', answer: 'Starting at $30 per hour for every job, paid via Zelle within 30 minutes. On top of that, our bonus programs reward retention, client satisfaction, and five-star reviews. Hit 25 verified five-star reviews and you unlock Tier 2 bonuses. Top performers earn well above the base rate.', answerEs: 'Desde $30 por hora por cada trabajo, pagado por Zelle en 30 minutos. Además, nuestros programas de bonos recompensan retención, satisfacción y reseñas de 5 estrellas.' },
  { question: 'How do I get paid?', questionEs: '¿Cómo me pagan?', answer: 'You get paid via Zelle within 30 minutes of every completed job. Finish the job, get paid immediately. No weekly checks, no delays.', answerEs: 'Te pagan por Zelle en 30 minutos después de cada trabajo completado. Sin cheques semanales, sin demoras.' },
  { question: 'Do I need to bring my own supplies?', questionEs: '¿Necesito traer mis propios suministros?', answer: 'Yes. Our cleaners provide their own cleaning supplies and equipment. You choose the products you trust and work best with.', answerEs: 'Sí. Nuestros limpiadores proporcionan sus propios suministros y equipo. Tú eliges los productos que prefieres.' },
  { question: 'What experience do I need?', questionEs: '¿Qué experiencia necesito?', answer: 'We require at least 1 year of professional cleaning experience. You should be comfortable cleaning apartments, homes, and offices independently.', answerEs: 'Requerimos al menos 1 año de experiencia profesional en limpieza.' },
  { question: 'What kind of cleaning jobs will I do?', questionEs: '¿Qué tipo de trabajos haré?', answer: 'Regular home cleanings, deep cleans, move-in/move-out cleanings, post-renovation cleanup, Airbnb turnovers, and office cleaning. You\'ll get a variety of work.', answerEs: 'Limpieza regular de apartamentos, limpieza profunda, mudanzas, post-renovación, Airbnb y oficinas.' },
  { question: 'How many hours can I work per week?', questionEs: '¿Cuántas horas puedo trabajar?', answer: 'That\'s up to you. Full-time cleaners take 18–20 jobs per week (average 2.5 hours each) and earn $1,350–$1,500+. Part-time cleaners pick up 5–10 jobs per week. You set your own availability.', answerEs: 'Depende de ti. Tiempo completo: 18–20 trabajos/semana = $1,350–$1,500+. Medio tiempo: 5–10 trabajos/semana.' },
  { question: 'Is the schedule flexible?', questionEs: '¿Es flexible el horario?', answer: 'Yes. You set your own availability. We match you with jobs that fit your schedule. No forced hours or mandatory shifts.', answerEs: 'Sí. Tú defines tu disponibilidad. Te conectamos con trabajos que se ajusten a tu horario.' },
  { question: 'Do I need a car?', questionEs: '¿Necesito carro?', answer: 'Yes — a car is strongly preferred for all Florida service areas since jobs are spread across different neighborhoods. Reliable transportation is essential to arrive on time.', answerEs: 'Sí — se prefiere carro para todas las áreas de servicio en Florida ya que los trabajos están repartidos por diferentes vecindarios.' },
  { question: 'Do I need to pass a background check?', questionEs: '¿Necesito verificación de antecedentes?', answer: 'Yes. All cleaners must pass a background check before being assigned to any client. This protects both you and our clients.', answerEs: 'Sí. Todos los limpiadores deben pasar una verificación de antecedentes.' },
  { question: 'How do I apply?', questionEs: '¿Cómo aplico?', answer: 'Apply online at thefloridamaid.com/apply or text (954) 710-3636. We review applications within 24–48 hours and get you working fast.', answerEs: 'Aplica en thefloridamaid.com/apply o envía un texto al (954) 710-3636. Revisamos en 24–48 horas.' },
]

// Revalidate every 3 days so datePosted stays fresh in Google Jobs
export const revalidate = 259200

const pageUrl = 'https://www.thefloridamaid.com/available-florida-maid-jobs'
const pageTitle = 'Cleaning Jobs Florida — Starting $30/hr + Bonuses, Open 24/7 | Trabajo de Limpieza'
const pageDescription = 'Hiring cleaners Florida! Starting $30/hr + bonus programs. Zelle in <30 min. 100% tips. Open 24/7. English & Spanish | Contratando — desde $30/hr + bonos, propinas 100% tuyas. (954) 710-3636'

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
    images: [{ url: 'https://www.thefloridamaid.com/icon-512.png', width: 512, height: 512, alt: 'The Florida Maid' }],
  },
  twitter: {
    card: 'summary',
    title: pageTitle,
    description: pageDescription,
  },
  other: {
    'geo.region': 'US-FL',
    'geo.placename': 'Florida',
    'geo.position': '25.7617;-80.1918',
    'ICBM': '25.7617, -80.1918',
  },
}

function jobPostingSchema(region: string, locations: string) {
  const regionSlug = region.toLowerCase().replace(/\s+/g, '-')
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: `Professional House Cleaner — ${region}`,
    description: `Now hiring experienced house cleaners in ${locations}. Starting at $30/hr paid via Zelle within 30 minutes of every completed job. Bonus programs available for retention, client satisfaction, and five-star reviews. Flexible schedule. Open 24/7. You provide your own cleaning supplies and equipment. Background check required. Apply at thefloridamaid.com/apply or text (954) 710-3636. Bilingual workplace (English/Spanish). 100% of tips are yours.`,
    identifier: {
      '@type': 'PropertyValue',
      name: 'The Florida Maid',
      value: `floridamaid-cleaner-${regionSlug}`,
    },
    datePosted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    validThrough: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    employmentType: ['FULL_TIME', 'PART_TIME'],
    jobImmediateStart: true,
    totalJobOpenings: 10,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'The Florida Maid',
      sameAs: 'https://www.thefloridamaid.com',
      logo: 'https://www.thefloridamaid.com/icon-512.png',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '390 N Orange Ave',
        addressLocality: region === 'South Florida' ? 'Miami' : region === 'Tampa Bay' ? 'Tampa' : 'Orlando',
        addressRegion: 'FL',
        postalCode: region === 'South Florida' ? '33131' : region === 'Tampa Bay' ? '33602' : '32801',
        addressCountry: 'US',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        value: 30,
        minValue: 30,
        maxValue: 75,
        unitText: 'HOUR',
      },
    },
    applicantLocationRequirements: {
      '@type': 'State',
      name: 'Florida',
      sameAs: 'https://en.wikipedia.org/wiki/Florida',
    },
    educationRequirements: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'high school',
    },
    directApply: true,
    industry: 'Cleaning Services',
    occupationalCategory: '37-2012.00',
    qualifications: 'Minimum 1 year professional cleaning experience. Must pass background check. Must provide own cleaning supplies and equipment.',
    responsibilities: 'Perform residential and commercial cleaning including regular home cleaning, deep cleaning, move-in/move-out cleaning, post-renovation cleanup, Airbnb turnovers, and office cleaning.',
    skills: 'Professional cleaning, attention to detail, time management, reliability, customer service',
    incentiveCompensation: 'Bonus programs for client retention, satisfaction ratings, and verified five-star reviews. Tier system unlocks higher bonuses as you accumulate reviews. 100% of client tips go directly to you.',
    jobBenefits: 'Same-day pay via Zelle within 30 minutes of job completion, bonus programs for retention and client satisfaction and five-star reviews, 100% of tips are yours, flexible scheduling 24/7, steady work, supportive team, bilingual portal (English/Spanish)',
    workHours: 'Flexible — set your own schedule',
    experienceRequirements: {
      '@type': 'OccupationalExperienceRequirements',
      monthsOfExperience: 12,
    },
  }
}

export default function CareersPage() {
  return (
    <>
      <JsonLd data={[
        organizationSchema(),
        webSiteSchema(),
        webPageSchema({
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          breadcrumb: [
            { name: 'Home', url: 'https://www.thefloridamaid.com' },
            { name: 'Careers', url: pageUrl },
          ],
        }),
        localBusinessSchema(),
        howToBookSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thefloridamaid.com' },
          { name: 'Careers', url: pageUrl },
        ]),
        ...openings.map(o => jobPostingSchema(o.region, o.locations)),
        faqSchema(careerFAQs),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[#34D399] text-sm font-semibold tracking-[0.2em] uppercase">Now Hiring</p>
            <span className="text-white/30">·</span>
            <p className="text-white/60 text-sm">Florida</p>
            <span className="text-white/30">·</span>
            <p className="text-white/60 text-sm">Open 24/7</p>
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            Join The Florida Maid — Starting at $30/hr, Bonus Programs Available
          </h1>
          <p className="text-white text-lg max-w-2xl leading-relaxed mb-3">
            We&apos;re hiring experienced cleaners across Florida — South Florida, Tampa Bay, and Central Florida. You bring your own supplies and equipment — we bring a steady stream of clients, a flexible schedule, and starting at $30/hr paid via Zelle within 30 minutes of every completed job. Bonus programs let top performers earn even more.
          </p>
          <p className="text-white max-w-2xl leading-relaxed mb-4 italic">
            Contratando limpiadores experimentados en todo Florida — Sur de Florida, Tampa Bay y Florida Central. Tú traes tus suministros — nosotros traemos clientes estables, horario flexible, y desde $30/hr pagado por Zelle en menos de 30 minutos. Programas de bonos disponibles.
          </p>
          <p className="text-white text-lg max-w-2xl leading-relaxed mb-3">
            Full-time cleaners take 18–20 jobs per week and earn $1,350–$1,500+. Average job is 2.5 hours. No waiting for payday — you get paid the same day, every job.
          </p>
          <p className="text-white max-w-2xl leading-relaxed mb-10 italic">
            Limpiadores de tiempo completo toman 18–20 trabajos por semana y ganan $1,350–$1,500+. Sin esperar día de pago — te pagan el mismo día, cada trabajo.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Link href="/apply" target="_blank" className="bg-[#34D399] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Apply Now / Aplica Ahora
            </Link>
            <a href="sms:9547103636" className="text-white font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
              or Text (954) 710-3636
            </a>
          </div>
        </div>
      </section>

      {/* Pay highlights */}
      <section className="bg-[#34D399] py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-center">
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide">$30+</p>
              <p className="text-[#CC6222]/60 text-sm font-medium">Starting Per Hour</p>
              <p className="text-[#CC6222]/40 text-xs italic">Desde por hora</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide">30 Min</p>
              <p className="text-[#CC6222]/60 text-sm font-medium">Pay After Every Job</p>
              <p className="text-[#CC6222]/40 text-xs italic">Pago después de cada trabajo</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide">Zelle</p>
              <p className="text-[#CC6222]/60 text-sm font-medium">Direct to Your Bank</p>
              <p className="text-[#CC6222]/40 text-xs italic">Directo a tu banco</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide">Bonos</p>
              <p className="text-[#CC6222]/60 text-sm font-medium">Performance Programs</p>
              <p className="text-[#CC6222]/40 text-xs italic">Programas de rendimiento</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-4xl text-[#CC6222] tracking-wide">24/7</p>
              <p className="text-[#CC6222]/60 text-sm font-medium">Florida</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Careers', href: '/available-florida-maid-jobs' }]} />

        {/* Open Positions */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Open Positions / Posiciones Abiertas</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-3">Three Regions, Same Great Pay</p>
          <p className="text-gray-500 max-w-2xl mb-2">We&apos;re actively hiring in all three regions. Each position is the same role — professional house cleaner — starting at $30/hr with same-day Zelle payment and bonus programs.</p>
          <p className="text-gray-400 text-sm italic max-w-2xl mb-10">Estamos contratando activamente en las tres regiones. Cada puesto es el mismo rol — limpiador profesional — desde $30/hr con pago Zelle el mismo día y programas de bonos.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {openings.map(opening => {
              const neighborhoods = opening.areaSlugs.flatMap(s => getNeighborhoodsByArea(s))
              return (
                <div key={opening.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-[#34D399] transition-all">
                  <div className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] p-6">
                    <p className="text-[#34D399] text-xs font-semibold tracking-[0.2em] uppercase mb-1">Now Hiring · {neighborhoods.length} Neighborhoods</p>
                    <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">{opening.region}</h2>
                    <p className="text-white text-sm">{opening.locations}</p>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[#CC6222] font-bold text-lg">Desde $30/hr</span>
                      <span className="bg-[#34D399]/20 text-white text-xs font-semibold px-3 py-1 rounded-full">Pago el Mismo Día</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-2">All Neighborhoods / Todos los Vecindarios</p>
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {neighborhoods.map(n => (
                        <Link key={n.slug} href={`/available-florida-maid-jobs/${n.slug}`} className="bg-gray-50 text-gray-600 text-xs px-2.5 py-1 rounded-full hover:bg-[#34D399]/20 hover:text-[#CC6222] transition-colors">{n.name}</Link>
                      ))}
                    </div>
                    <Link href="/apply" target="_blank" className="block text-center bg-[#CC6222] text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
                      Apply / Aplica — {opening.region}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* What We're Looking For + What You Get */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-20">
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Requirements / Requisitos</p>
            <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-6">What We&apos;re Looking For / Lo Que Buscamos</p>
            <div className="space-y-3">
              {[
                { title: 'Professional Experience', desc: 'Minimum 1 year of professional cleaning experience. You know how to clean a home top to bottom without supervision.', es: 'Mínimo 1 año de experiencia profesional en limpieza.' },
                { title: 'Your Own Supplies & Equipment', desc: 'You bring your own cleaning products, vacuum, mop, and tools. Use the products you trust and work best with.', es: 'Traes tus propios productos de limpieza, aspiradora, trapeador y herramientas.' },
                { title: 'Reliable & Punctual', desc: 'Show up on time, every time. Our clients depend on their scheduled cleaning and so does our reputation.', es: 'Llega a tiempo, siempre. Nuestros clientes dependen de su limpieza programada.' },
                { title: 'Detail-Oriented', desc: 'You notice the baseboards, the light switches, the corners. Good enough isn\'t good enough.', es: 'Notas los rodapiés, los interruptores, las esquinas. Lo suficiente no es suficiente.' },
                { title: 'Background Check', desc: 'All cleaners must pass a background check before being assigned to any client home.', es: 'Todos los limpiadores deben pasar una verificación de antecedentes.' },
                { title: 'Positive Attitude', desc: 'Our clients love friendly, warm cleaners. A smile and a good attitude go a long way.', es: 'Nuestros clientes aman limpiadores amigables y cálidos. Una sonrisa llega lejos.' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-4 border border-gray-200 rounded-xl">
                  <span className="text-[#34D399] mt-0.5 text-lg flex-shrink-0">&#10003;</span>
                  <div>
                    <p className="font-semibold text-[#CC6222] text-sm mb-0.5">{item.title}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                    <p className="text-gray-400 text-xs italic mt-1">{item.es}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] rounded-2xl p-8">
              <p className="text-[#34D399] text-xs font-semibold tracking-[0.2em] uppercase mb-4">What You Get / Lo Que Recibes</p>
              <div className="space-y-5">
                {[
                  { label: 'Starting $30/hr + Bonuses', desc: 'Base rate plus performance bonus programs', es: 'Tarifa base más programas de bonos' },
                  { label: 'Paid in 30 Minutes', desc: 'Zelle payment after every completed job', es: 'Pago por Zelle después de cada trabajo' },
                  { label: 'Flexible Schedule', desc: 'Choose days and hours that work for you', es: 'Elige los días y horas que te convengan' },
                  { label: 'Steady Work', desc: 'Recurring clients mean reliable income', es: 'Clientes recurrentes = ingresos confiables' },
                  { label: 'Great Clients', desc: 'Respectful, appreciative homeowners', es: 'Propietarios respetuosos y agradecidos' },
                  { label: 'Supportive Team', desc: 'Training, guidance, and ongoing support', es: 'Capacitación, orientación y apoyo continuo' },
                  { label: 'Growth Opportunity', desc: 'Advance to team lead or area manager', es: 'Avanza a líder de equipo o gerente de área' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-white font-semibold text-sm">{item.label}</p>
                    <p className="text-white text-sm">{item.desc}</p>
                    <p className="text-white/50 text-xs italic">{item.es}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#34D399] rounded-2xl p-8">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-1">Example Weekly Earnings</p>
              <p className="text-[#CC6222]/40 text-xs italic mb-2">Ganancias Semanales Ejemplo</p>
              <p className="text-[#CC6222]/50 text-xs mb-3">Avg job: 2.5 hrs &times; $30/hr = $75/job</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[#CC6222]/70 text-sm">5 jobs/week (part-time)</span>
                    <span className="text-[#CC6222]/40 text-xs italic block">5 trabajos/semana (medio tiempo)</span>
                  </div>
                  <span className="font-bold text-[#CC6222]">$375/wk</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[#CC6222]/70 text-sm">10 jobs/week</span>
                    <span className="text-[#CC6222]/40 text-xs italic block">10 trabajos/semana</span>
                  </div>
                  <span className="font-bold text-[#CC6222]">$750/wk</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#CC6222]/10 pt-3">
                  <div>
                    <span className="text-[#CC6222]/70 text-sm">18–20 jobs/week (full-time)</span>
                    <span className="text-[#CC6222]/40 text-xs italic block">18–20 trabajos/semana (tiempo completo)</span>
                  </div>
                  <span className="font-bold text-[#CC6222] text-lg">$1,350–$1,500/wk</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bonus Programs */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-[#34D399] tracking-[0.2em] uppercase mb-2">Earn More / Gana Más</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-3">Bonus Programs — Reward Your Excellence</p>
          <p className="text-gray-600 max-w-2xl mb-4">Starting at $30/hr is just the beginning. Our bonus programs reward cleaners who go above and beyond — retention, client satisfaction, and five-star reviews all earn you more money.</p>
          <p className="text-gray-400 text-sm italic mb-10">Comenzando a $30/hr es solo el inicio. Nuestros programas de bonos recompensan a los limpiadores que van más allá — retención, satisfacción del cliente y reseñas de cinco estrellas te hacen ganar más dinero.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="border-2 border-[#34D399] rounded-2xl p-6">
              <div className="w-12 h-12 bg-[#34D399]/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🔁</span>
              </div>
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-2">Retention Bonus</h3>
              <p className="text-gray-600 text-sm mb-3">Clients who request you back are proof you&apos;re doing great work. When your clients stick with you — and they will — you earn retention bonuses on top of your hourly rate.</p>
              <p className="text-gray-400 text-xs italic">Bono de retención — cuando tus clientes te piden de vuelta, ganas bonos adicionales sobre tu tarifa por hora.</p>
            </div>

            <div className="border-2 border-[#34D399] rounded-2xl p-6">
              <div className="w-12 h-12 bg-[#34D399]/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">😊</span>
              </div>
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-2">Client Satisfaction Bonus</h3>
              <p className="text-gray-600 text-sm mb-3">Happy clients mean a healthy business. Cleaners who consistently deliver excellent service and receive positive client feedback earn satisfaction bonuses.</p>
              <p className="text-gray-400 text-xs italic">Bono de satisfacción — los limpiadores que entregan un servicio excelente consistentemente ganan bonos de satisfacción.</p>
            </div>

            <div className="border-2 border-[#34D399] rounded-2xl p-6">
              <div className="w-12 h-12 bg-[#34D399]/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-2">Review Tier Bonuses</h3>
              <p className="text-gray-600 text-sm mb-3">Five-star reviews are gold. As you accumulate verified 5-star reviews from clients, you unlock higher bonus tiers with increasing rewards.</p>
              <p className="text-gray-400 text-xs italic">Bonos por reseñas — las reseñas de 5 estrellas desbloquean niveles de bonos más altos con mayores recompensas.</p>
            </div>
          </div>

          {/* Review Tiers */}
          <div className="bg-gradient-to-r from-[#CC6222] to-[#CC6222] rounded-2xl p-8 md:p-10">
            <p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide mb-6 text-center">Review Tier Milestones</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white/10 rounded-xl p-5">
                <p className="text-[#34D399] text-3xl mb-1">⭐</p>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">10 Reviews</p>
                <p className="text-white/50 text-xs mt-1">Rising Star</p>
                <p className="text-[#34D399] text-sm font-bold mt-2">Tier 1 Bonus</p>
              </div>
              <div className="bg-white/10 rounded-xl p-5 ring-1 ring-[#34D399]/30">
                <p className="text-[#34D399] text-3xl mb-1">⭐⭐</p>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">25 Reviews</p>
                <p className="text-white/50 text-xs mt-1">Trusted Pro</p>
                <p className="text-[#34D399] text-sm font-bold mt-2">Tier 2 Bonus</p>
              </div>
              <div className="bg-white/10 rounded-xl p-5 ring-1 ring-[#34D399]/50">
                <p className="text-[#34D399] text-3xl mb-1">⭐⭐⭐</p>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">50 Reviews</p>
                <p className="text-white/50 text-xs mt-1">Elite Cleaner</p>
                <p className="text-[#34D399] text-sm font-bold mt-2">Tier 3 Bonus</p>
              </div>
              <div className="bg-white/15 rounded-xl p-5 ring-2 ring-[#34D399]">
                <p className="text-[#34D399] text-3xl mb-1">👑</p>
                <p className="font-[family-name:var(--font-bebas)] text-xl text-white tracking-wide">100+ Reviews</p>
                <p className="text-white/50 text-xs mt-1">MVP</p>
                <p className="text-[#34D399] text-sm font-bold mt-2">Max Tier Bonus</p>
              </div>
            </div>
            <p className="text-white/40 text-xs text-center mt-6">All reviews must be verified 5-star ratings from completed client cleanings. Bonuses are paid monthly on top of your per-job rate.</p>
            <p className="text-white/30 text-xs text-center italic mt-1">Todas las reseñas deben ser calificaciones verificadas de 5 estrellas. Los bonos se pagan mensualmente.</p>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] rounded-2xl p-8 md:p-14 mb-20">
          <p className="text-[#34D399] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Getting Started / Cómo Empezar</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-10">How It Works / Cómo Funciona</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Apply Online', desc: 'Fill out our application — takes 2 minutes. Tell us about your experience and preferred area.', es: 'Llena nuestra solicitud — toma 2 minutos. Cuéntanos tu experiencia y área preferida.' },
              { step: '2', title: 'Quick Interview', desc: 'We review your application within 24–48 hours and schedule a brief phone or text interview.', es: 'Revisamos tu solicitud en 24–48 horas y programamos una breve entrevista.' },
              { step: '3', title: 'Background Check', desc: 'Pass a standard background check. This protects you and our clients.', es: 'Pasa una verificación de antecedentes estándar. Esto te protege a ti y a nuestros clientes.' },
              { step: '4', title: 'Start Working', desc: 'Get matched with clients in your area. Complete jobs, get paid $30/hr via Zelle within 30 minutes.', es: 'Te conectamos con clientes en tu área. Completa trabajos, cobra $30/hr por Zelle en 30 minutos.' },
            ].map(item => (
              <div key={item.step}>
                <div className="w-10 h-10 bg-[#34D399] text-white rounded-full flex items-center justify-center font-bold mb-4">{item.step}</div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-white text-sm leading-relaxed">{item.desc}</p>
                <p className="text-white/50 text-xs italic mt-1">{item.es}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team Portal */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold text-[#34D399] tracking-[0.2em] uppercase mb-2">Your Tools / Tus Herramientas</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-4">Full Team Portal — Bilingual 🇺🇸🇪🇸</p>
              <p className="text-gray-600 mb-6">Every team member gets access to our complete team portal — available in English and Spanish. Track everything in one place.</p>
              <p className="text-gray-500 text-sm italic mb-6">Cada miembro del equipo tiene acceso a nuestro portal completo — disponible en inglés y español.</p>
              <div className="space-y-3">
                {[
                  { icon: '📋', en: 'View all upcoming jobs — date, time, address, service type, pay rate', es: 'Ver todos los trabajos — fecha, hora, dirección, tipo de servicio, tarifa' },
                  { icon: '📍', en: 'GPS directions to every job — one tap navigation', es: 'Direcciones GPS a cada trabajo — navegación con un toque' },
                  { icon: '📝', en: 'Client notes — special instructions, access codes, preferences', es: 'Notas del cliente — instrucciones especiales, códigos de acceso' },
                  { icon: '💰', en: 'Payment tracking — see every payment with confirmation', es: 'Seguimiento de pagos — ver cada pago con confirmación' },
                  { icon: '✅', en: 'Check in / check out — log your hours for every job', es: 'Entrada/salida — registra tus horas de cada trabajo' },
                  { icon: '📊', en: 'Job history — complete record of all work and payments', es: 'Historial de trabajos — registro completo de trabajo y pagos' },
                  { icon: '🙋', en: 'Claim available jobs — grab new jobs in your area instantly', es: 'Reclama trabajos disponibles — toma nuevos trabajos al instante' },
                ].map(item => (
                  <div key={item.en} className="flex gap-3 items-start">
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-gray-800 text-sm">{item.en}</p>
                      <p className="text-gray-400 text-xs italic">{item.es}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-[#34D399] rounded-2xl p-8">
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">100% of Tips Are Yours</p>
                <p className="text-[#CC6222]/70 text-sm mb-2">We never take a cut of your tips. When a client tips you — cash, Zelle, Venmo, whatever — it&apos;s 100% yours. Always.</p>
                <p className="text-[#CC6222]/50 text-xs italic">El 100% de las propinas son tuyas. Nunca tomamos nada de tus propinas. Siempre.</p>
              </div>
              <div className="border-2 border-[#CC6222] rounded-2xl p-8">
                <p className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide mb-4">We Need Devoted Team Members</p>
                <p className="text-gray-600 text-sm mb-4">We&apos;re not looking for people who show up sometimes. We need cleaners who are committed to excellence, who care about their clients, and who take pride in doing outstanding work. In return, we take care of you — fast pay, steady work, and real support.</p>
                <p className="text-gray-400 text-xs italic">Necesitamos miembros del equipo dedicados. Buscamos limpiadores comprometidos con la excelencia que se enorgullecen de su trabajo. A cambio, cuidamos de ti — pago rápido, trabajo estable y apoyo real.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Neighborhood job links */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Jobs by Neighborhood / Trabajos por Vecindario</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-3">Every Neighborhood — One Job Page</p>
          <p className="text-gray-400 text-sm italic mb-8">Cada vecindario — una página de trabajo</p>
          {AREAS.map(area => {
            const neighborhoods = getNeighborhoodsByArea(area.slug)
            return (
              <div key={area.slug} className="mb-6">
                <h3 className="font-semibold text-lg text-[#CC6222] mb-3">{area.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {neighborhoods.map(nb => (
                    <Link key={nb.slug} href={`/available-florida-maid-jobs/${nb.slug}`} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-[#34D399]/20 hover:text-[#CC6222] transition-colors">
                      {nb.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-2">Common Questions / Preguntas Frecuentes</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-2">Careers FAQ / Preguntas Frecuentes</p>
          <div className="w-10 h-[2px] bg-[#34D399] mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {careerFAQs.map((faq, i) => (
              <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="pr-4">
                    <h2 className="font-semibold text-[#CC6222] text-sm text-left">{faq.question}</h2>
                    <p className="text-gray-400 text-xs italic text-left">{faq.questionEs}</p>
                  </div>
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-gray-600 text-sm leading-relaxed mb-2">{faq.answer}</p>
                  <p className="text-gray-400 text-xs italic leading-relaxed">{faq.answerEs}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Apply CTA */}
        <section className="bg-[#34D399] rounded-2xl p-8 md:p-12 text-center mb-16">
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-2">Ready to Start Earning? / ¿Listo para Empezar a Ganar?</p>
          <p className="text-[#CC6222]/60 max-w-xl mx-auto mb-2">
            Apply in 2 minutes. We review applications within 24–48 hours. Get working and get paid — starting $30/hr, same day, every job.
          </p>
          <p className="text-[#CC6222]/40 text-sm italic max-w-xl mx-auto mb-8">
            Aplica en 2 minutos. Revisamos solicitudes en 24–48 horas. Empieza a trabajar y cobra — desde $30/hr, el mismo día, cada trabajo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href="/apply" target="_blank" className="bg-[#CC6222] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors">
              Apply Now / Aplica Ahora
            </Link>
            <a href="sms:9547103636" className="text-[#CC6222] font-semibold underline underline-offset-4 hover:no-underline">
              or Text (954) 710-3636
            </a>
          </div>
        </section>
      </div>

      <CTABlock title="Know a Great Cleaner? / ¿Conoces un Gran Limpiador?" subtitle="Refer them to us. They get a great job, and you earn 10% on every cleaning they complete. | Refiérelos. Ellos obtienen un gran trabajo y tú ganas 10% de cada limpieza que completen." />
    </>
  )
}
