import type { Metadata } from 'next'
import Link from 'next/link'
import { AREAS } from '@/app/site/the-florida-maid/_lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/app/site/the-florida-maid/_lib/seo/locations'
import { breadcrumbSchema, localBusinessSchema } from '@/app/site/the-florida-maid/_lib/seo/schema'
import JsonLd from '@/app/site/the-florida-maid/_components/marketing/JsonLd'
import Breadcrumbs from '@/app/site/the-florida-maid/_components/marketing/Breadcrumbs'
import CTABlock from '@/app/site/the-florida-maid/_components/marketing/CTABlock'
import TrustBadges from '@/app/site/the-florida-maid/_components/marketing/TrustBadges'

const emergencyTypes = [
  {
    name: 'Water Damage & Flooding',
    icon: '💧',
    isEmergency: true,
    description: 'Burst pipes, overflowing fixtures, storm flooding, or water intrusion from adjacent units. Water damage gets exponentially worse every hour — mold can begin growing within 24–48 hours.',
    whatToDo: [
      'Stop the water source if possible (shut off the valve under the sink or the main water shutoff)',
      'Turn off electricity in affected areas if water is near outlets',
      'Move furniture and valuables away from standing water',
      'Document everything with photos and video before cleanup begins',
      'Contact your landlord/management company immediately',
      'Call your renter\'s insurance company to open a claim',
      'Call us for professional water damage cleanup',
    ],
    whatNotToDo: [
      'Don\'t use a regular household vacuum on standing water — use a wet/dry vac or wait for pros',
      'Don\'t walk through standing water near electrical outlets',
      'Don\'t assume it will dry on its own — moisture trapped under floors and walls breeds mold',
    ],
  },
  {
    name: 'Fire & Smoke Damage',
    icon: '🔥',
    isEmergency: true,
    description: 'After a fire (even a small one), smoke residue and soot permeate everything. The oily residue bonds to walls, ceilings, fabrics, and gets into HVAC systems. Every day it sits, it becomes harder to remove.',
    whatToDo: [
      'Wait for the fire department to clear the building before re-entering',
      'Open windows for ventilation if safe to do so',
      'Don\'t turn on the HVAC system — it will spread soot through the ductwork',
      'Document damage with photos for insurance before touching anything',
      'Remove undamaged items from the space if possible',
      'Call a professional cleaning service — smoke damage requires specialized equipment',
    ],
    whatNotToDo: [
      'Don\'t try to wipe soot off walls — smearing it into porous surfaces makes it permanent',
      'Don\'t use water on soot-covered surfaces — it creates a paste that stains',
      'Don\'t stay in a smoke-damaged home — the particles are a serious respiratory hazard',
    ],
  },
  {
    name: 'Sewage Backup',
    icon: '🚫',
    isEmergency: true,
    description: 'Sewage backup is a genuine biohazard. Raw sewage contains bacteria, viruses, and parasites that can cause serious illness. This is not a DIY situation — it requires professional cleaning and sanitization.',
    whatToDo: [
      'Do not touch the sewage water without protective equipment (gloves, boots, mask minimum)',
      'Turn off HVAC and close vents in affected areas to prevent airborne contamination',
      'Keep children and pets away from the affected area',
      'Contact your building management — this is usually a building-wide issue',
      'Call a professional biohazard cleaning service immediately',
      'Dispose of any porous items that contacted sewage (carpet, fabric, cardboard)',
    ],
    whatNotToDo: [
      'Don\'t try to clean sewage with household products — they don\'t kill the pathogens present',
      'Don\'t use fans to dry the area — you\'ll spread contaminated particles through the air',
      'Don\'t eat, drink, or smoke in or near the affected area',
    ],
  },
  {
    name: 'Mold Discovery',
    icon: '🦠',
    isEmergency: false,
    description: 'Finding mold in your home ranges from minor (surface mold on bathroom caulking) to serious (black mold behind walls). Small patches can be handled with cleaning. Large areas or mold behind walls require professional assessment.',
    whatToDo: [
      'Assess the size — if it\'s smaller than a 3×3 ft area, you can likely handle it yourself',
      'For small patches: spray with white vinegar or hydrogen peroxide, scrub with a stiff brush',
      'For larger areas: do NOT disturb it — disturbing large mold colonies releases spores into the air',
      'Notify your landlord in writing — Florida law requires landlords to remediate mold',
      'For suspected black mold (dark green/black, musty smell), call a professional for testing',
      'Increase ventilation — run fans, open windows, use a dehumidifier',
    ],
    whatNotToDo: [
      'Don\'t paint over mold — it grows right through paint',
      'Don\'t bleach mold on porous surfaces (wood, drywall) — bleach only works on non-porous surfaces',
      'Don\'t ignore it — mold spreads rapidly and affects your respiratory health',
    ],
  },
  {
    name: 'Hoarding Situations',
    icon: '📦',
    isEmergency: false,
    description: 'Hoarding cleanups require sensitivity and expertise. Whether it\'s a gradual accumulation over years or an estate situation, these projects need systematic, compassionate handling. We work with families and individuals without judgment.',
    whatToDo: [
      'Start with a plan — map out the space and decide what needs sorting vs. immediate disposal',
      'Work with the person living there if possible — forced cleanouts cause psychological harm',
      'Ensure proper protective equipment (dust masks, gloves) — air quality can be poor',
      'Have dumpster or junk removal service arranged before starting',
      'Professional cleaning after clearing — deep sanitization of all surfaces is essential',
      'Consider mental health resources — hoarding is a recognized disorder and support exists',
    ],
    whatNotToDo: [
      'Don\'t throw things away without sorting — important documents, valuables, and medication can be buried',
      'Don\'t attempt it alone — hoarding cleanups are physically and emotionally exhausting',
      'Don\'t expect a single-day job — most require 2–5 days depending on severity',
    ],
  },
  {
    name: 'Storm Damage Cleanup',
    icon: '⛈️',
    isEmergency: true,
    description: 'Florida storms can cause water intrusion, window damage, and debris from flooding or wind damage. After a severe storm, move quickly to prevent secondary damage like mold growth.',
    whatToDo: [
      'Check for structural damage before entering — look for cracks, sagging ceilings, or gas smells',
      'Photograph all damage before touching anything (for insurance)',
      'Remove standing water as quickly as possible',
      'Move wet contents to a dry area for sorting',
      'Open windows and run dehumidifiers to start drying',
      'Contact your insurance company within 24 hours',
    ],
    whatNotToDo: [
      'Don\'t enter if you smell gas — leave immediately and call 911',
      'Don\'t use electrical appliances that got wet until they\'ve been inspected',
      'Don\'t wait to start drying — mold begins growing within 24–48 hours in wet conditions',
    ],
  },
  {
    name: 'Vandalism & Break-In Cleanup',
    icon: '🔨',
    isEmergency: false,
    description: 'After a break-in or vandalism, dealing with the physical mess adds insult to injury. Once police have documented the scene and released it, we can help restore your space quickly so you can feel safe in your home again.',
    whatToDo: [
      'Call police first and don\'t touch anything until they\'ve documented the scene',
      'Contact your landlord about any structural damage (broken doors, windows)',
      'Document damage with photos for your insurance claim',
      'Once police release the scene, call us for cleanup',
      'Change locks immediately (your landlord must provide this in Florida)',
    ],
    whatNotToDo: [
      'Don\'t clean before police have processed the scene',
      'Don\'t try to fix structural damage yourself — that\'s your landlord\'s responsibility',
    ],
  },
  {
    name: 'Biohazard Situations',
    icon: '⚠️',
    isEmergency: true,
    description: 'Any situation involving blood, bodily fluids, or other biological hazards requires professional cleaning with proper equipment and disposal procedures. This includes unattended death, crime scene cleanup, and medical waste.',
    whatToDo: [
      'Do not attempt to clean biohazard materials yourself — it\'s dangerous and often illegal to dispose of improperly',
      'Call a professional biohazard cleaning service',
      'Keep the area sealed off from other occupants',
      'If related to a crime or death, wait for law enforcement clearance before cleaning',
    ],
    whatNotToDo: [
      'Don\'t use household cleaners — they don\'t meet biohazard decontamination standards',
      'Don\'t put biohazard waste in regular trash',
      'Don\'t attempt cleanup without proper PPE (personal protective equipment)',
    ],
  },
]

const process = [
  { step: '1', title: 'Call Us', description: 'Call (954) 710-3636 and describe the situation. We\'ll ask what happened, when it happened, and the scope of damage. Be honest about severity — it helps us send the right team with the right equipment.' },
  { step: '2', title: 'Assessment', description: 'We assess the situation — in person if possible, or by phone/video for faster response. We\'ll give you an honest estimate of time, cost, and what to expect. No surprises.' },
  { step: '3', title: 'Response', description: 'Our team arrives with professional-grade equipment — HEPA vacuums, industrial dehumidifiers, commercial cleaning agents, PPE, and specialized tools for the specific emergency type.' },
  { step: '4', title: 'Cleanup', description: 'Systematic cleanup following industry protocols. We document everything for your insurance claim. For water damage, we monitor moisture levels. For biohazard, we follow OSHA bloodborne pathogen standards.' },
  { step: '5', title: 'Verification', description: 'We walk through the space with you, verify all affected areas are clean, and provide documentation of work performed for your insurance company or landlord.' },
]

const faqData = [
  { q: 'How fast can you respond to an emergency?', a: 'We aim to respond within 2–4 hours for emergencies in Miami-Dade and Broward and within 4–6 hours for surrounding areas. Response time depends on the time of day, current team availability, and your location. For true emergencies (active flooding, biohazard), we prioritize same-day response.' },
  { q: 'How much does emergency cleaning cost?', a: 'Emergency cleaning typically ranges from $500 to $2,000+ depending on the type and severity. Water damage and fire cleanup cost more due to specialized equipment. We provide upfront estimates before work begins — no surprise bills. Many situations are covered by renter\'s or homeowner\'s insurance.' },
  { q: 'Do you work with insurance companies?', a: 'Yes. We provide detailed documentation of all work performed, including before/after photos, itemized invoices, and scope-of-work reports. This documentation is formatted to support your insurance claim. Many clients get full reimbursement for professional emergency cleaning.' },
  { q: 'Is my situation actually an emergency?', a: 'If there\'s active water flow, sewage, biohazard material, or fire/smoke damage — yes, that\'s an emergency requiring immediate professional response. Mold discovery, hoarding cleanup, and vandalism aftermath are urgent but can usually wait 24–48 hours for scheduling. When in doubt, call us and we\'ll help you assess.' },
  { q: 'What should I do while waiting for your team?', a: 'For water damage: stop the water source and move valuables. For fire/smoke: ventilate if safe. For all situations: document with photos, don\'t touch biohazard materials, and keep people and pets away from the affected area. See our detailed guides above for specific situations.' },
  { q: 'Can I clean emergency situations myself?', a: 'Small surface mold patches, minor spills, and general mess — yes. But for standing water, fire/smoke damage, sewage, biohazard, or any situation covering more than a small area — professional cleaning is strongly recommended. DIY attempts often make things worse or miss hidden damage that causes problems later.' },
  { q: 'Do you handle condo emergencies or just houses?', a: 'We serve all types of Florida homes — houses, condos, townhomes, and apartments. We\'re experienced with the unique challenges of condo emergencies: limited access, shared building systems, HOA coordination, building management communication, and multi-unit considerations common in Florida.' },
  { q: 'What about my landlord\'s or HOA\'s responsibility?', a: 'In Florida, landlords are responsible for maintaining habitable conditions. Water damage from building systems (not your negligence), mold from building ventilation issues, and sewage from building plumbing are landlord responsibilities. For condos, your HOA may be responsible for common-area issues. Document everything, notify them in writing, and know your rights under Florida statutes.' },
  { q: 'Are you available on weekends and holidays?', a: 'Yes. Emergencies don\'t wait for business hours. We have team members available 7 days a week including holidays. Weekend and holiday rates may apply for non-urgent situations, but true emergencies are always prioritized regardless of when they happen.' },
  { q: 'What areas do you cover for emergency service?', a: 'We cover all Florida service areas: Miami-Dade, Broward, Palm Beach, Tampa Bay, and Orlando. We also serve Jacksonville and surrounding areas for emergency situations. Response times are fastest in Miami-Dade and Broward.' },
]

export const metadata: Metadata = {
  title: 'Emergency Cleaning Service Florida — 24/7 Response | The Florida Maid',
  description: 'Florida emergency cleaning — water damage, fire, sewage, biohazard & mold. 24/7 rapid response with pro equipment. $1M insured. Call (954) 710-3636.',
  alternates: { canonical: 'https://www.thefloridamaid.com/service/florida-emergency-cleaning-service' },
  openGraph: {
    title: 'Emergency Cleaning Service Florida | The Florida Maid',
    description: 'Rapid-response emergency cleaning across Florida. Water damage, fire, biohazard & more. Available 24/7.',
    url: 'https://www.thefloridamaid.com/service/florida-emergency-cleaning-service',
  },
}

export default function EmergencyCleaningPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Emergency Cleaning Service',
    description: 'Professional emergency cleaning service for Florida homes — water damage, fire, sewage, biohazard, mold, and disaster cleanup. Available 24/7.',
    provider: {
      '@type': 'LocalBusiness',
      name: 'The Florida Maid',
      url: 'https://www.thefloridamaid.com',
      telephone: '+19547103636',
      address: { '@type': 'PostalAddress', addressLocality: 'Miami', addressRegion: 'FL', addressCountry: 'US' },
    },
    areaServed: { '@type': 'City', name: 'Florida' },
    serviceType: 'Emergency Cleaning',
    offers: {
      '@type': 'Offer',
      priceRange: '$500-$2000+',
      priceCurrency: 'USD',
    },
    availableChannel: {
      '@type': 'ServiceChannel',
      servicePhone: { '@type': 'ContactPoint', telephone: '+19547103636', contactType: 'customer service', availableLanguage: ['English', 'Spanish'] },
    },
    hoursAvailable: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  }

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'What to Do in a Cleaning Emergency',
    description: 'Step-by-step guide for handling cleaning emergencies in Florida apartments — from water damage to biohazard situations.',
    step: emergencyTypes.filter(e => e.isEmergency).map((type, i) => ({
      '@type': 'HowToSection',
      name: type.name,
      position: i + 1,
      itemListElement: type.whatToDo.map((step, j) => ({
        '@type': 'HowToStep',
        position: j + 1,
        text: step,
      })),
    })),
  }

  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thefloridamaid.com' },
          { name: 'Services', url: 'https://www.thefloridamaid.com/florida-maid-service-services-offered-by-the-florida-maid' },
          { name: 'Emergency Cleaning', url: 'https://www.thefloridamaid.com/service/florida-emergency-cleaning-service' },
        ]),
        faqSchema,
        serviceSchema,
        howToSchema,
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#CC6222] to-[#CC6222] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-red-400 tracking-[0.25em] uppercase mb-4">24/7 Emergency Response</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">Emergency Cleaning Service in Florida</h1>
          <p className="text-white/60 text-lg max-w-3xl mx-auto mb-8">Flooding, fire damage, sewage, biohazard, mold — when disaster hits your home, you need professionals who respond fast and know what they&apos;re doing. We&apos;ve handled hundreds of emergency cleanups across all Florida counties we serve.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="tel:9547103636" className="bg-red-600 text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-red-700 transition-colors">
              Call Now — (954) 710-3636
            </a>
            <a href="sms:9547103636" className="text-white font-semibold text-lg hover:underline underline-offset-4">
              or Text Us
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Services', href: '/florida-maid-service-services-offered-by-the-florida-maid' },
          { name: 'Emergency Cleaning', href: '/service/florida-emergency-cleaning-service' },
        ]} />
        <TrustBadges />

        {/* Quick reference: is it an emergency? */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-6">Is It an Emergency?</h2>
          <p className="text-gray-600 text-lg mb-8">Not every mess is an emergency. Here&apos;s a quick guide to help you determine what needs immediate professional response and what can wait for a scheduled appointment.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-red-200 bg-red-50/50 rounded-xl p-6">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-red-900 tracking-wide mb-4">Call Immediately</h3>
              <ul className="space-y-2">
                {['Standing water or active flooding', 'Sewage backup of any kind', 'Fire or smoke damage', 'Biohazard material (blood, bodily fluids)', 'Gas smell combined with mess (call 911 first)', 'Active mold covering large areas (3+ sq ft)'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-red-800">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">&#9888;</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222] tracking-wide mb-4">Can Schedule Within 24–48 Hours</h3>
              <ul className="space-y-2">
                {['Small mold patches on bathroom caulking', 'Post-break-in cleanup (after police clear scene)', 'Hoarding cleanup', 'Vandalism cleanup', 'Post-storm debris (no standing water)', 'Heavy-duty deep cleaning after neglect'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-gray-700">
                    <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Emergency types — detailed guides */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-4">Emergency Types: What to Do (and What Not to Do)</h2>
          <p className="text-gray-600 text-lg mb-10">Each emergency is different. We&apos;ve put together detailed guides for every type of cleaning emergency so you know exactly what steps to take — even before we arrive.</p>

          {emergencyTypes.map(type => (
            <div key={type.name} className="border border-gray-200 rounded-xl p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{type.icon}</span>
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#CC6222] tracking-wide">{type.name}</h3>
                {type.isEmergency && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">Urgent</span>}
              </div>
              <p className="text-gray-600 mb-6">{type.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-[#CC6222] mb-3 flex items-center gap-2">
                    <span className="text-[#34D399]">&#10003;</span> What to Do
                  </h4>
                  <ol className="space-y-2">
                    {type.whatToDo.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#CC6222]/10 text-[#CC6222] text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <span className="text-red-500">&#10007;</span> What NOT to Do
                  </h4>
                  <ul className="space-y-2">
                    {type.whatNotToDo.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-800/80">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">&mdash;</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Emergency CTA */}
        <div className="bg-red-600 rounded-xl p-8 md:p-10 mb-20 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-2">Dealing With an Emergency Right Now?</h2>
          <p className="text-red-100 mb-6">Don&apos;t wait. Our team is available 24/7 for emergency response across all Florida counties we serve.</p>
          <a href="tel:9547103636" className="inline-block bg-white text-red-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-red-50 transition-colors">
            Call (954) 710-3636
          </a>
        </div>

        {/* Our process */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-4">Our Emergency Response Process</h2>
          <p className="text-gray-600 text-lg mb-8">Here&apos;s exactly what happens from the moment you call to the final walkthrough.</p>
          <div className="space-y-6">
            {process.map(p => (
              <div key={p.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#CC6222] text-white font-[family-name:var(--font-bebas)] text-xl flex items-center justify-center">{p.step}</div>
                <div>
                  <h3 className="font-semibold text-[#CC6222] text-lg">{p.title}</h3>
                  <p className="text-gray-600 mt-1">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-20">
          <div className="bg-gray-50 rounded-xl p-8 md:p-10">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-6 text-center">Emergency Cleaning Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Minor Emergency</p>
                <p className="text-3xl font-bold text-[#CC6222]">$500–$800</p>
                <p className="text-sm text-gray-500 mt-2">Small water leak, minor mold, localized damage</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Standard Emergency</p>
                <p className="text-3xl font-bold text-[#CC6222]">$800–$1,500</p>
                <p className="text-sm text-gray-500 mt-2">Flooding cleanup, smoke damage, sewage (1–2 rooms)</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Major Emergency</p>
                <p className="text-3xl font-bold text-[#CC6222]">$1,500–$3,000+</p>
                <p className="text-sm text-gray-500 mt-2">Full-home water damage, extensive fire/biohazard</p>
              </div>
            </div>
            <p className="text-center text-gray-500 text-sm">Exact pricing depends on the type of emergency, area affected, and equipment required. We always provide an upfront estimate before beginning work. Most emergency cleaning is covered by renter&apos;s or homeowner&apos;s insurance.</p>
          </div>
        </section>

        {/* Insurance */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-4">Working With Your Insurance</h2>
          <p className="text-gray-600 mb-6">Most emergency cleaning is covered by renter&apos;s or homeowner&apos;s insurance. Here&apos;s how to make the process smooth:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-[#CC6222]">Before We Arrive</h3>
              <ul className="space-y-2">
                {['Document all damage with photos and video', 'Call your insurance company to open a claim', 'Get your claim number — we\'ll reference it in our documentation', 'Don\'t throw anything away until the adjuster approves (photograph first)'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-[#CC6222]">What We Provide</h3>
              <ul className="space-y-2">
                {['Detailed scope-of-work report', 'Before and after photo documentation', 'Itemized invoice with labor and materials breakdown', 'Professional assessment of damage severity', 'Direct communication with your adjuster if needed'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-[#34D399] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqData.map(f => (
              <div key={f.q} className="border-b border-gray-200 pb-6">
                <h3 className="font-semibold text-[#CC6222] text-lg mb-2">{f.q}</h3>
                <p className="text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coverage */}
        <section className="mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#CC6222] tracking-wide mb-6">Emergency Service Coverage</h2>
          <p className="text-gray-600 mb-8">We cover all Florida service areas for emergency cleaning. Response times are fastest in Miami-Dade and Broward.</p>
          {AREAS.map(area => {
            const neighborhoods = getNeighborhoodsByArea(area.slug)
            return (
              <div key={area.slug} className="mb-6">
                <h3 className="font-semibold text-lg text-[#CC6222] mb-3">{area.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {neighborhoods.map(n => (
                    <Link key={n.slug} href={`/${n.urlSlug}`} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-[#34D399]/20 hover:text-[#CC6222] transition-colors">
                      {n.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      </div>

      <CTABlock title="Emergency? Call Now — We're Here 24/7" />
    </>
  )
}
