import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/site/JsonLd'
import Breadcrumbs from '@/components/site/Breadcrumbs'
import CTABlock from '@/components/site/CTABlock'
import TrustBadges from '@/components/site/TrustBadges'
import { getTenantFromHeaders, getTenantAreas, tenantSiteUrl, toSlug } from '@/lib/tenant-site'

const emergencyTypes = [
  {
    name: 'Water Damage & Flooding',
    icon: '\u{1F4A7}',
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
    icon: '\u{1F525}',
    isEmergency: true,
    description: 'After a fire (even a small one), smoke residue and soot permeate everything. The oily residue bonds to walls, ceilings, fabrics, and gets into HVAC systems.',
    whatToDo: [
      'Wait for the fire department to clear the building before re-entering',
      'Open windows for ventilation if safe to do so',
      'Don\'t turn on the HVAC system — it will spread soot through the ductwork',
      'Document damage with photos for insurance before touching anything',
      'Remove undamaged items from the space if possible',
      'Call a professional service — smoke damage requires specialized equipment',
    ],
    whatNotToDo: [
      'Don\'t try to wipe soot off walls — smearing it into porous surfaces makes it permanent',
      'Don\'t use water on soot-covered surfaces — it creates a paste that stains',
      'Don\'t stay in a smoke-damaged property — the particles are a serious respiratory hazard',
    ],
  },
  {
    name: 'Sewage Backup',
    icon: '\u{1F6AB}',
    isEmergency: true,
    description: 'Sewage backup is a genuine biohazard. Raw sewage contains bacteria, viruses, and parasites that can cause serious illness. This is not a DIY situation — it requires professional equipment and sanitization.',
    whatToDo: [
      'Do not touch the sewage water without protective equipment (gloves, boots, mask minimum)',
      'Turn off HVAC and close vents in affected areas to prevent airborne contamination',
      'Keep children and pets away from the affected area',
      'Contact your building management — this is usually a building-wide issue',
      'Call a professional biohazard service immediately',
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
    icon: '\u{1F9A0}',
    isEmergency: false,
    description: 'Finding mold ranges from minor (surface mold on caulking) to serious (black mold behind walls). Small patches can be handled with cleaning. Large areas or mold behind walls require professional assessment.',
    whatToDo: [
      'Assess the size — if it\'s smaller than a 3×3 ft area, you can likely handle it yourself',
      'For small patches: spray with white vinegar or hydrogen peroxide, scrub with a stiff brush',
      'For larger areas: do NOT disturb it — disturbing large mold colonies releases spores into the air',
      'Notify your landlord in writing — most local laws require landlords to remediate mold',
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
    name: 'Storm Damage',
    icon: '\u{26C8}',
    isEmergency: true,
    description: 'Storms can cause water intrusion, window damage, and debris from flooding or wind damage. After a severe storm, move quickly to prevent secondary damage like mold growth.',
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
    name: 'Biohazard Situations',
    icon: '\u{26A0}',
    isEmergency: true,
    description: 'Any situation involving blood, bodily fluids, or other biological hazards requires professional response with proper equipment and disposal procedures.',
    whatToDo: [
      'Do not attempt to address biohazard materials yourself — it\'s dangerous and often illegal to dispose of improperly',
      'Call a professional biohazard service',
      'Keep the area sealed off from other occupants',
      'If related to a crime or death, wait for law enforcement clearance before cleanup',
    ],
    whatNotToDo: [
      'Don\'t use household products — they don\'t meet biohazard decontamination standards',
      'Don\'t put biohazard waste in regular trash',
      'Don\'t attempt cleanup without proper PPE (personal protective equipment)',
    ],
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const title = `Emergency Service — 24/7 Response | ${name}`
  const description = `Emergency response from ${name} — water damage, fire, sewage, biohazard & mold. 24/7 rapid response with pro equipment.${phone ? ` Call ${phone}.` : ''}`
  return {
    title,
    description,
    ...(base && { alternates: { canonical: `${base}/service/nyc-emergency-cleaning-service` } }),
    openGraph: {
      title: `Emergency Service | ${name}`,
      description: 'Rapid-response emergency service. Water damage, fire, biohazard & more. Available 24/7.',
      ...(base && { url: `${base}/service/nyc-emergency-cleaning-service` }),
    },
  }
}

export default async function EmergencyCleaningPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const base = tenantSiteUrl(tenant)
  const areas = tenant ? await getTenantAreas(tenant.id) : []

  const faqData = [
    { q: 'How fast can you respond to an emergency?', a: 'We aim to respond within a few hours for emergencies in our primary service areas. Response time depends on the time of day, current team availability, and your location. For true emergencies, we prioritize same-day response.' },
    { q: 'Do you work with insurance companies?', a: 'Yes. We provide detailed documentation of all work performed, including before/after photos, itemized invoices, and scope-of-work reports. This documentation is formatted to support your insurance claim.' },
    { q: 'Is my situation actually an emergency?', a: 'If there\'s active water flow, sewage, biohazard material, or fire/smoke damage — yes, that\'s an emergency requiring immediate professional response. When in doubt, reach out and we\'ll help you assess.' },
    { q: 'What should I do while waiting for your team?', a: 'For water damage: stop the water source and move valuables. For fire/smoke: ventilate if safe. For all situations: document with photos, don\'t touch biohazard materials, and keep people and pets away from the affected area.' },
    { q: 'Can I handle emergency situations myself?', a: 'Small surface mold patches, minor spills, and general mess — yes. But for standing water, fire/smoke damage, sewage, biohazard, or any situation covering more than a small area — professional service is strongly recommended.' },
    { q: 'Are you available on weekends and holidays?', a: 'Yes. Emergencies don\'t wait for business hours. We have team members available 7 days a week including holidays. True emergencies are always prioritized regardless of when they happen.' },
  ]

  const faqSchemaData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const process = [
    { step: '1', title: 'Call Us', description: `${phone ? `Call ${phone}` : 'Reach out'} and describe the situation. We\'ll ask what happened, when it happened, and the scope of damage. Be honest about severity — it helps us send the right team with the right equipment.` },
    { step: '2', title: 'Assessment', description: 'We assess the situation — in person if possible, or by phone/video for faster response. We\'ll give you an honest estimate of time, cost, and what to expect. No surprises.' },
    { step: '3', title: 'Response', description: 'Our team arrives with professional-grade equipment — HEPA vacuums, industrial dehumidifiers, commercial agents, PPE, and specialized tools for the specific emergency type.' },
    { step: '4', title: 'Cleanup', description: 'Systematic response following industry protocols. We document everything for your insurance claim. For water damage, we monitor moisture levels. For biohazard, we follow OSHA bloodborne pathogen standards.' },
    { step: '5', title: 'Verification', description: 'We walk through the property with you, verify all affected areas are addressed, and provide documentation of work performed for your insurance company or landlord.' },
  ]

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          ...(base ? [{ name: 'Home', url: base }] : []),
          { name: 'Services', url: `${base}/nyc-maid-service-services-offered-by-the-nyc-maid` },
          { name: 'Emergency Service', url: `${base}/service/nyc-emergency-cleaning-service` },
        ]),
        faqSchemaData,
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-red-400 tracking-[0.25em] uppercase mb-4">24/7 Emergency Response</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">Emergency Service</h1>
          <p className="text-white/60 text-lg max-w-3xl mx-auto mb-8">Flooding, fire damage, sewage, biohazard, mold — when disaster hits your property, you need professionals who respond fast and know what they&apos;re doing. We&apos;ve handled hundreds of emergency responses.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {phone && (
              <a href={`tel:${phoneDigits}`} className="bg-red-600 text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-red-700 transition-colors">
                Call Now — {phone}
              </a>
            )}
            <a href="/chat-with-selena" className="text-white font-semibold text-lg hover:underline underline-offset-4">
              or Chat With Selena
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Services', href: '/nyc-maid-service-services-offered-by-the-nyc-maid' },
          { name: 'Emergency Service', href: '/service/nyc-emergency-cleaning-service' },
        ]} />
        <TrustBadges />

        {/* Quick reference: is it an emergency? */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-6">Is It an Emergency?</h2>
          <p className="text-gray-600 text-lg mb-8">Not every situation is an emergency. Here&apos;s a quick guide to help you determine what needs immediate professional response and what can wait for a scheduled appointment.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-red-200 bg-red-50/50 rounded-xl p-6">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-red-900 tracking-wide mb-4">Call Immediately</h3>
              <ul className="space-y-2">
                {['Standing water or active flooding', 'Sewage backup of any kind', 'Fire or smoke damage', 'Biohazard material (blood, bodily fluids)', 'Gas smell combined with damage (call 911 first)', 'Active mold covering large areas (3+ sq ft)'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-red-800">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">&#9888;</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-2 border-gray-200 rounded-xl p-6">
              <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-4">Can Schedule Within 24–48 Hours</h3>
              <ul className="space-y-2">
                {['Small mold patches on caulking', 'Post-break-in cleanup (after police clear scene)', 'Post-storm debris (no standing water)', 'Heavy-duty work after neglect'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-gray-700">
                    <span className="text-[var(--brand-accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Emergency types — detailed guides */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-4">Emergency Types: What to Do (and What Not to Do)</h2>
          <p className="text-gray-600 text-lg mb-10">Each emergency is different. We&apos;ve put together detailed guides for every type of emergency so you know exactly what steps to take — even before we arrive.</p>

          {emergencyTypes.map(type => (
            <div key={type.name} className="border border-gray-200 rounded-xl p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{type.icon}</span>
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide">{type.name}</h3>
                {type.isEmergency && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">Urgent</span>}
              </div>
              <p className="text-gray-600 mb-6">{type.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-[var(--brand)] mb-3 flex items-center gap-2">
                    <span className="text-[var(--brand-accent)]">&#10003;</span> What to Do
                  </h4>
                  <ol className="space-y-2">
                    {type.whatToDo.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
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
        {phone && (
          <div className="bg-red-600 rounded-xl p-8 md:p-10 mb-20 text-center">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-2">Dealing With an Emergency Right Now?</h2>
            <p className="text-red-100 mb-6">Don&apos;t wait. Our team is available 24/7 for emergency response.</p>
            <a href={`tel:${phoneDigits}`} className="inline-block bg-white text-red-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-red-50 transition-colors">
              Call {phone}
            </a>
          </div>
        )}

        {/* Our process */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-4">Our Emergency Response Process</h2>
          <p className="text-gray-600 text-lg mb-8">Here&apos;s exactly what happens from the moment you call to the final walkthrough.</p>
          <div className="space-y-6">
            {process.map(p => (
              <div key={p.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--brand)] text-white font-[family-name:var(--font-bebas)] text-xl flex items-center justify-center">{p.step}</div>
                <div>
                  <h3 className="font-semibold text-[var(--brand)] text-lg">{p.title}</h3>
                  <p className="text-gray-600 mt-1">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Insurance */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-4">Working With Your Insurance</h2>
          <p className="text-gray-600 mb-6">Most emergency response is covered by renter&apos;s or homeowner&apos;s insurance. Here&apos;s how to make the process smooth:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-[var(--brand)]">Before We Arrive</h3>
              <ul className="space-y-2">
                {['Document all damage with photos and video', 'Call your insurance company to open a claim', 'Get your claim number — we\'ll reference it in our documentation', 'Don\'t throw anything away until the adjuster approves (photograph first)'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-[var(--brand-accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-[var(--brand)]">What We Provide</h3>
              <ul className="space-y-2">
                {['Detailed scope-of-work report', 'Before and after photo documentation', 'Itemized invoice with labor and materials breakdown', 'Professional assessment of damage severity', 'Direct communication with your adjuster if needed'].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-[var(--brand-accent)] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqData.map(f => (
              <div key={f.q} className="border-b border-gray-200 pb-6">
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-2">{f.q}</h3>
                <p className="text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coverage */}
        {areas.length > 0 && (
          <section className="mb-16">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[var(--brand)] tracking-wide mb-6">Emergency Service Coverage</h2>
            <p className="text-gray-600 mb-8">We cover {areas.length}+ areas for emergency service.</p>
            <div className="flex flex-wrap gap-2">
              {areas.map(area => (
                <Link key={area} href={`/${toSlug(area)}`} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-[var(--brand-accent)]/20 hover:text-[var(--brand)] transition-colors">
                  {area}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <CTABlock title="Emergency? Call Now — We're Here 24/7" phone={phone} />
    </>
  )
}
