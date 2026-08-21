import Link from 'next/link'
import { getAllServices, getServicesByCategory, getNeighborhoodsByRegion } from '../../_lib/data'
import { getAllTips } from '../../_data/tips'
import { neighborhoodMicrositeSchemas } from '../../_lib/emd/schema'
import { getOtherNeighborhoodSites } from '../../_lib/emd/registry'
import {
  PARENT_TAG,
  PARENT_BRAND_NAME,
  SITE_URL,
  PHONE_DISPLAY,
  PHONE_SMS,
  EMAIL,
  BOOK_URL,
  QUOTE_URL,
  REVIEWS_URL,
  GENERAL_FAQS,
} from '../../_lib/emd/shared-content'
import type { NeighborhoodMicrositeConfig } from '../../_lib/emd/types'
import JsonLd from '@/components/site/JsonLd'

export default function NeighborhoodMicrosite({ config }: { config: NeighborhoodMicrositeConfig }) {
  const allFaqs = [...config.localFaqs, ...GENERAL_FAQS]
  const schemas = neighborhoodMicrositeSchemas(config, allFaqs)
  const servicesByCategory = getServicesByCategory()
  const neighborhoodsByRegion = getNeighborhoodsByRegion()
  const tips = getAllTips()
  const otherSites = getOtherNeighborhoodSites(config)
  const totalServices = getAllServices().length
  const totalNeighborhoods = Object.values(neighborhoodsByRegion).reduce((n, list) => n + list.length, 0)

  return (
    <>
      <JsonLd data={schemas} />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-[#0A0A0A] pb-16 pt-12 text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-green-500/[0.04] blur-[120px]" />
        <div className="relative mx-auto max-w-5xl px-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-green-400/80">
            {config.neighborhoodName}, {config.borough} &middot; Licensed &amp; Insured &middot; 24/7 Same-Day Service
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {config.neighborhoodName}{' '}
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent">
              Exterminator &amp; Pest Control
            </span>
          </h1>
          <p className="mt-3 text-[#8DE8CC] text-lg font-medium">({PARENT_TAG})</p>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            {config.brandName} is the {config.neighborhoodName} pest control team behind{' '}
            <Link href={SITE_URL} className="text-green-400 hover:text-green-300">The NYC Exterminator</Link> —
            NYC&apos;s flat-rate, licensed exterminator company. If you searched &ldquo;{config.neighborhoodName.toLowerCase()} exterminator&rdquo; or
            &ldquo;{config.neighborhoodName.toLowerCase()} pest control,&rdquo; you found the right team: same NYS DEC licensed technicians,
            same $199/hr flat rate, same guarantee — focused specifically on {config.neighborhoodName}.
          </p>

          <div className="mt-6 flex items-baseline gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 px-6 py-5 w-fit">
            <span className="text-6xl font-black leading-none text-green-400 sm:text-7xl">$199</span>
            <span className="text-lg font-bold uppercase leading-tight tracking-wide text-zinc-200">per hour<br />flat rate</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={QUOTE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-500">
              Get a Free {config.neighborhoodName} Quote
            </a>
            <a href={PHONE_SMS} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-base font-bold text-white transition-all hover:bg-white/10">
              Text {PHONE_DISPLAY}
            </a>
            <a href={BOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-green-500/40 px-7 py-3.5 text-base font-bold text-green-400 transition-all hover:bg-green-500/10">
              Self-Book &amp; Save $20
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm text-zinc-500">
            <span><strong className="text-zinc-200">NYS DEC Licensed</strong> Exterminators</span>
            <span><strong className="text-zinc-200">Fully Insured</strong> Pest Control</span>
            <span><strong className="text-zinc-200">4.9&#9733;</strong> · 2,847+ verified reviews on <a href={REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">TheNYCExterminator.com</a></span>
          </div>
        </div>
      </section>

      {/* ── INTRO / WHY THIS NEIGHBORHOOD ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 space-y-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-700">{config.neighborhoodName} Pest Control</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Your Local {config.neighborhoodName} Exterminator
          </h2>
          {config.introParagraphs.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-zinc-700">{p}</p>
          ))}
        </div>
      </section>

      {/* ── LOCAL CHALLENGES ── */}
      <section className="bg-[#0A0A0A] py-16 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-400 text-center">Local Pest Pressure</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-center sm:text-4xl">
            Why {config.neighborhoodName} Needs a Dedicated Exterminator
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {config.neighborhoodChallenges.map(c => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <h3 className="text-lg font-bold text-green-400">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL SERVICES ── */}
      <section id="services" className="bg-zinc-50 py-16 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-700 text-center">Every Service, {config.neighborhoodName}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            All {totalServices} Pest Control Services in {config.neighborhoodName}
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-center text-zinc-600">
            {config.brandName} covers every pest {PARENT_BRAND_NAME} treats — the exact same licensed technicians, flat $199/hr rate, and
            service catalog, focused on {config.neighborhoodName}. Every service links to its full page on TheNYCExterminator.com.
          </p>

          <div className="mt-10 space-y-10">
            {Object.entries(servicesByCategory).map(([category, services]) => (
              <div key={category}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">{category}</h3>
                <div className="mt-4 space-y-3">
                  {services.map(service => (
                    <details key={service.slug} className="group rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                      <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 hover:bg-zinc-50">
                        <div>
                          <span className="font-bold text-zinc-900">
                            {service.name} in {config.neighborhoodName}
                          </span>
                          <p className="mt-1 text-sm text-zinc-500">{service.description}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-4">
                          <span className="hidden text-sm font-semibold text-zinc-700 sm:inline">{service.priceRange}</span>
                          <span className="text-xl text-zinc-400 transition-transform group-open:rotate-45">+</span>
                        </div>
                      </summary>
                      <div className="grid grid-cols-1 gap-6 px-6 pb-6 sm:grid-cols-2">
                        <div>
                          <p className="text-sm leading-relaxed text-zinc-600">{service.extendedDescription}</p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">What&apos;s Included</p>
                          <ul className="mt-2 space-y-1">
                            {service.commonServices.map(f => (
                              <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                                <span className="mt-0.5 text-green-600">&#10003;</span>{f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Common Questions</p>
                          <div className="mt-2 space-y-3">
                            {service.faqs.slice(0, 2).map(f => (
                              <div key={f.q}>
                                <p className="text-sm font-semibold text-zinc-800">{f.q}</p>
                                <p className="mt-1 text-sm text-zinc-600">{f.a}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-xs text-zinc-500">{service.licensingNote}</p>
                          <a href={`${SITE_URL}/${service.slug}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-green-700 hover:text-green-600">
                            Full {service.name} details &rarr;
                          </a>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="bg-[#0A0A0A] py-16 text-white scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-400 text-center">{config.neighborhoodName} Pest Control Pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-center sm:text-4xl">
            Flat $199/hr. No Hidden Fees. Ever.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-300">
            {config.brandName} charges the exact rate every {PARENT_BRAND_NAME} customer pays: $199/hr, 1-hour minimum, no matter the
            pest, the severity, or whether the job is residential or commercial in {config.neighborhoodName}. Every job starts with a
            free inspection and a written estimate — the number on that estimate is the number you pay.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-3xl font-black text-green-400">Free</p>
              <p className="mt-1 text-sm text-zinc-400">Inspection &amp; written estimate</p>
            </div>
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
              <p className="text-3xl font-black text-green-400">$199/hr</p>
              <p className="mt-1 text-sm text-zinc-400">Standard treatment, 1-hr minimum</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-3xl font-black text-green-400">$50-125<span className="text-base">/mo</span></p>
              <p className="mt-1 text-sm text-zinc-400">Ongoing maintenance plans</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICE LOCATIONS DIRECTORY ── */}
      <section id="areas" className="bg-white py-16 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-700 text-center">Full NYC Coverage</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            {totalNeighborhoods}+ Neighborhoods {PARENT_BRAND_NAME} Serves
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-center text-zinc-600">
            {config.brandName} is based around {config.neighborhoodName}, and backed by {PARENT_BRAND_NAME}&apos;s full coverage across
            every borough, NJ, Long Island, and Westchester. Every neighborhood below links to its dedicated page on TheNYCExterminator.com.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(neighborhoodsByRegion).map(([region, list]) => (
              <div key={region}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">{region}</h3>
                <ul className="mt-3 space-y-1.5">
                  {list.map(n => (
                    <li key={n.slug}>
                      <a
                        href={`${SITE_URL}/areas/${n.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm hover:text-green-700 hover:underline ${n.name === config.neighborhoodName ? 'font-bold text-green-700' : 'text-zinc-600'}`}
                      >
                        {n.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PEST CONTROL TIPS ── */}
      <section id="tips" className="bg-zinc-50 py-16 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-700 text-center">{config.neighborhoodName} Pest Control Tips</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            Every NYC Pest Control Guide From The NYC Exterminator
          </h2>
          <p className="mt-3 text-center text-zinc-600">
            {tips.length} in-depth guides written by our licensed technicians — identification, prevention, tenant rights, and what
            actually works in a {config.neighborhoodName} apartment or building.
          </p>
          <div className="mt-10 space-y-4">
            {tips.map(tip => (
              <details key={tip.slug} className="group rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 hover:bg-zinc-50">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-green-700">{tip.category}</p>
                    <p className="mt-1 font-bold text-zinc-900">{tip.title}</p>
                  </div>
                  <span className="text-xl text-zinc-400 transition-transform group-open:rotate-45 flex-shrink-0">+</span>
                </summary>
                <div className="space-y-4 px-6 pb-6">
                  <p className="text-sm leading-relaxed text-zinc-600">{tip.intro}</p>
                  {tip.sections.map(s => (
                    <div key={s.heading}>
                      <p className="font-semibold text-zinc-800">{s.heading}</p>
                      {s.content.split('\n\n').map((para, i) => (
                        <p key={i} className="mt-1.5 text-sm leading-relaxed text-zinc-600 whitespace-pre-line">{para}</p>
                      ))}
                    </div>
                  ))}
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-green-800">Pro Tip</p>
                    <p className="mt-1 text-sm text-green-900">{tip.proTip}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-100 border border-zinc-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">When to Call a Pro</p>
                    <p className="mt-1 text-sm text-zinc-700">{tip.whenToCallPro}</p>
                  </div>
                  <a href={`${SITE_URL}/pest-control-tips/${tip.slug}`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-green-700 hover:text-green-600">
                    Read on TheNYCExterminator.com &rarr;
                  </a>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-white py-16 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-700 text-center">FAQ</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 text-center sm:text-4xl">
            {config.neighborhoodName} Exterminator — Frequently Asked Questions
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {allFaqs.map(f => (
              <details key={f.question} className="group rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900">{f.question}</summary>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── SISTER NEIGHBORHOOD SITES ── */}
      {otherSites.length > 0 && (
        <section className="bg-zinc-50 py-14 border-t border-zinc-200">
          <div className="mx-auto max-w-4xl px-4">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-green-700 text-center">The NYC Exterminator Neighborhood Network</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 text-center">
              Also Serving These NYC Neighborhoods
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {otherSites.map(s => (
                <a
                  key={s.domain}
                  href={`https://www.${s.domain}`}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-green-600 hover:text-green-700"
                >
                  {s.brandName}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <section className="bg-green-600 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Book Your {config.neighborhoodName} Exterminator Today
          </h2>
          <p className="max-w-xl text-green-50">
            Free inspection. Flat $199/hr. Same-day availability across {config.neighborhoodName} and every {PARENT_BRAND_NAME} service area.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={QUOTE_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-green-700 hover:bg-green-50">
              Get a Free Quote
            </a>
            <a href={PHONE_SMS} className="rounded-xl border-2 border-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-white/10">
              Text {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      <p className="bg-[#0A0A0A] py-6 text-center text-xs text-zinc-500">
        <a href={SITE_URL} className="underline hover:text-zinc-300">
          Part of {PARENT_BRAND_NAME}&apos;s family of NYC exterminator &amp; pest control services
        </a>
      </p>
    </>
  )
}
