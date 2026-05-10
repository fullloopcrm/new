// @ts-nocheck
import Link from "next/link";
import {
  PHONE,
  PHONE_HREF,
  SMS_HREF,
  HOURS,
  RATING,
  REVIEW_COUNT,
  CITY_COUNT,
  STATE_COUNT,
  SERVICES,
  PRICING,
  TESTIMONIALS,
  FAQ,
  TOP_CITIES,
} from "@/app/site/the-home-services-company/_data/content";
import { STATES } from "@/app/site/the-home-services-company/_data/cities";

export default function HomePage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Nationwide Home Services Company
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">Starting at $99/Hour</span>
            <br />
            40 Home Services, One Phone Number
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            HVAC, plumbing, electrical, painting, flooring, cleaning, handyman, remodeling, and 32 more trades — all under one roof. Licensed and insured technicians, upfront pricing, same-day availability in most markets. 990 cities across all 50 states.
          </p>

          {/* Trust stat cards */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{HOURS}</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">7 Days a Week</p>
              <p className="mt-1 text-xs text-white/50">Weekends &amp; holidays at same rate</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{RATING} Stars</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">{REVIEW_COUNT} Verified Reviews</p>
              <p className="mt-1 text-xs text-white/50">Real customers, real results</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">From $99</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">Upfront Pricing</p>
              <p className="mt-1 text-xs text-white/50">Invoice matches the estimate</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{CITY_COUNT}</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">Cities Nationwide</p>
              <p className="mt-1 text-xs text-white/50">Licensed and insured locally</p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {PHONE} — Fastest
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {PHONE}
              </span>
            </a>
            <Link href="/book">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Book Now
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── WHAT WE DO ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            One Company, 40 Home Services
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What Is Home Services Co?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            The home services industry has a vendor-sprawl problem.{" "}
            <Link href="/services" className="text-teal-600 underline">We consolidated 40 home services</Link> into one reliable company with{" "}
            <Link href="/pricing" className="text-teal-600 underline">upfront pricing starting at $99/hour</Link>, available in{" "}
            <Link href="/locations" className="text-teal-600 underline">{CITY_COUNT} cities</Link> — from <Link href="/locations/new-york/new-york-city" className="text-teal-600 underline">New York</Link> to <Link href="/locations/california/los-angeles" className="text-teal-600 underline">Los Angeles</Link>, <Link href="/locations/texas/houston" className="text-teal-600 underline">Houston</Link> to <Link href="/locations/florida/miami" className="text-teal-600 underline">Miami</Link> — across all {STATE_COUNT} states.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Most homeowners have a contact list full of specialists — an HVAC guy, a plumber, an electrician, a painter, a handyman, a cleaner, a landscaper. Every time you need a service, you call around, compare vague quotes, and hope the vendor shows up. Half the time they don&apos;t. The other half, the invoice is higher than the estimate and there&apos;s a &ldquo;shop fee&rdquo; nobody explained.
            </p>
            <p>
              Home Services Co was built to collapse that contact list into one phone number. <strong>40 home services under one roof, starting at $99/hour, with upfront pricing on every job.</strong> Licensed and insured technicians across every trade. Same-day availability in most markets. Weekends and holidays at the same rate.
            </p>
            <p>
              Our core services include <Link href="/services/hvac-services" className="text-teal-600 underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-600 underline">plumbing</Link>, <Link href="/services/electrical" className="text-teal-600 underline">electrical</Link>, <Link href="/services/roofing" className="text-teal-600 underline">roofing</Link>, <Link href="/services/painting" className="text-teal-600 underline">painting</Link>, <Link href="/services/flooring-installation" className="text-teal-600 underline">flooring</Link>, <Link href="/services/landscaping" className="text-teal-600 underline">landscaping</Link>, <Link href="/services/house-cleaning" className="text-teal-600 underline">house cleaning</Link>, <Link href="/services/handyman-services" className="text-teal-600 underline">handyman work</Link>, <Link href="/services/kitchen-remodeling" className="text-teal-600 underline">kitchen remodeling</Link>, <Link href="/services/bathroom-remodeling" className="text-teal-600 underline">bathroom remodeling</Link>, and 29 more trades. Every service follows the same pricing model: hourly rate plus itemized materials, approved in writing before any work begins.
            </p>
            <p>
              Upfront pricing is not a gimmick — it&apos;s the basic professional standard that should have been the industry default for decades. Before any technician touches a tool at your home, you see a written estimate. Parts and materials are itemized. The invoice at the end matches the estimate at the start. If scope changes during the job, we stop and get your approval before continuing. No mystery shop fees, no &ldquo;while we were here&rdquo; add-ons, no weekend premiums beyond what was clearly priced up front.
            </p>
            <p>
              We operate in {CITY_COUNT} cities across all {STATE_COUNT} states with local technicians who know your area. Same-day service is available for calls placed before noon in most markets. We operate {HOURS}, including weekends and holidays — no overtime charges, no weekend surcharges, no holiday premiums.
            </p>
          </div>
        </div>
      </section>

      {/* ─── WHY US — 6 CARDS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Why Home Services Co
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Why Customers Choose Us Over Everyone Else
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            From <Link href="/pricing" className="text-teal-600 underline">upfront pricing</Link> to{" "}
            <Link href="/services/hvac-services" className="text-teal-600 underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-600 underline">plumbing</Link>, and <Link href="/services/electrical" className="text-teal-600 underline">electrical</Link> all under one roof,{" "}
            <Link href="/book" className="text-teal-600 underline">same-day bookings</Link>, and{" "}
            <Link href="/locations/california" className="text-teal-600 underline">California coverage</Link>, <Link href="/locations/texas" className="text-teal-600 underline">Texas coverage</Link>, and <Link href="/locations/florida" className="text-teal-600 underline">every state in between</Link> — we built this company to fix what&apos;s broken in home services.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Upfront Pricing", desc: "Starting at $99/hour. Written estimates before any work begins. Parts and materials itemized. The invoice matches the estimate — every time." },
              { title: "40 Services, One Vendor", desc: "HVAC, plumbing, electrical, painting, cleaning, handyman, remodeling, and 33 more trades. One phone number, one account, one standard of service." },
              { title: "Licensed &amp; Insured", desc: "Every technician is licensed in their specific trade and covered by comprehensive liability insurance. Certificates of insurance available within 24 hours." },
              { title: "Same-Day Service", desc: "Call before noon and we can usually have a technician at your door the same day. Available 7 days a week, including weekends and holidays." },
              { title: "Real Accountability", desc: "If anything isn't right, one phone call fixes it. No ghosting, no excuses, no runaround. There's a company behind every job — not just a contractor." },
              { title: "990 Cities Nationwide", desc: "Local technicians who know your area, backed by a national company with consistent standards, scheduling, and invoicing across every market." },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading" dangerouslySetInnerHTML={{ __html: card.title }} />
                <p className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: card.desc }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICE GRID ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Home Services Near You
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            {SERVICES.length} Home Services — One Phone Number
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            From <Link href="/services/hvac-services" className="text-teal-600 underline">HVAC</Link> and{" "}
            <Link href="/services/plumbing" className="text-teal-600 underline">plumbing</Link> to{" "}
            <Link href="/services/painting" className="text-teal-600 underline">painting</Link>,{" "}
            <Link href="/services/house-cleaning" className="text-teal-600 underline">house cleaning</Link>, and{" "}
            <Link href="/commercial" className="text-teal-600 underline">commercial services</Link> — all starting at{" "}
            <Link href="/pricing" className="text-teal-600 underline">$99/hour</Link>.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(0, 12).map((service, i) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group">
                <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                  <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 font-cta">
                    #{i + 1} &middot; {service.category}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-700 font-heading">
                    {service.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{service.subtitle}</p>
                  <p className="mt-2 text-sm text-slate-600">{service.description}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-base font-semibold text-teal-600 hover:text-teal-800 font-cta">
              View All {SERVICES.length} Services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            How Home Services Should Work
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            How It Works — 4 Simple Steps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/book" className="text-teal-600 underline">Book online</Link> or{" "}
            <a href={PHONE_HREF} className="text-teal-600 underline">call us</a>. We confirm the price before any work starts. No surprises.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Call or Book Online", desc: "Describe the service you need. We confirm pricing, ask clarifying questions, and schedule your technician." },
              { step: "2", title: "Technician Arrives", desc: "Our local technician shows up within the scheduled window in a branded vehicle. Quick walkthrough to confirm scope." },
              { step: "3", title: "Approve and Work Begins", desc: "You get a written estimate up front — labor plus itemized materials. Approve it, and work begins. No mystery charges." },
              { step: "4", title: "Clean Finish, Clear Invoice", desc: "Work completed to scope, workspace cleaned, walkthrough to confirm. Invoice matches the estimate you approved." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-white font-cta">
                  {s.step}
                </span>
                <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO BENEFITS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Home Services for Homeowners, Landlords, and Businesses
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Who We Serve
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Whether you are a <Link href="/who-we-serve/homeowners" className="text-teal-600 underline">homeowner</Link>,
            a <Link href="/who-we-serve/property-managers" className="text-teal-600 underline">property manager</Link>,
            or a <Link href="/commercial" className="text-teal-600 underline">business</Link> — one vendor across 40 home services saves time, money, and coordination overhead.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Homeowners", desc: "Every home service need under one phone number — HVAC, plumbing, electrical, painting, cleaning, handyman, and 34 more. Starting at $99/hour with upfront pricing." },
              { title: "Renters &amp; Movers", desc: "Move-in/out cleaning, handyman repairs, furniture assembly, rekeying. One vendor handles the whole transition — cheaper than juggling three specialists." },
              { title: "Property Managers", desc: "One vendor for every trade across every unit in your portfolio. Dedicated account, priority scheduling, consistent technicians, consolidated monthly invoicing." },
              { title: "Realtors &amp; Sellers", desc: "Pre-listing prep and inspection repairs handled by one company. Cleaning, painting, handyman, landscaping — all coordinated on the same timeline." },
              { title: "Businesses &amp; Offices", desc: "Commercial facility services — HVAC, cleaning, electrical, handyman — under one account. After-hours and weekend service at the same rate." },
              { title: "Estate &amp; Senior Services", desc: "Full estate prep with patient, respectful technicians. Cleaning, junk removal, painting, and handyman punch lists coordinated by one project manager." },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading" dangerouslySetInnerHTML={{ __html: card.title }} />
                <p className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: card.desc }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Home Services Pricing — Honest and Upfront
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Starting at $99/Hour Across All 40 Services
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Written estimates before any work begins. Parts and materials itemized. The invoice matches the estimate. See the full{" "}
            <Link href="/pricing" className="text-teal-600 underline">pricing breakdown</Link> or{" "}
            <Link href="/faq" className="text-teal-600 underline">FAQ</Link>.{" "}
            <Link href="/book" className="text-teal-600 underline">Book today</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => (
              <div key={key} className={`rounded-xl border bg-white p-6 text-center transition-all h-full ${"popular" in tier && tier.popular ? "border-accent shadow-lg relative" : "border-slate-200 hover:border-teal-400 hover:shadow-md"}`}>
                {"popular" in tier && tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white">MOST POPULAR</div>
                )}
                <h3 className="text-lg font-bold text-slate-900 font-heading">{tier.label}</h3>
                <p className="mt-2 text-5xl font-bold text-teal-700 font-heading">{tier.price}</p>
                <p className="mt-1 text-sm text-slate-500">{tier.unit}</p>
                <ul className="mt-6 space-y-2 text-sm text-left">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-teal-600 mt-0.5">✓</span>
                      <span className="text-slate-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/book" className={`mt-6 inline-block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors font-cta ${"popular" in tier && tier.popular ? "bg-accent text-white hover:bg-accent-dark" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Home Services Reviews
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            {RATING} Stars Across {REVIEW_COUNT} Reviews
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Real customers across 40 services. Read how our <Link href="/pricing" className="text-teal-600 underline">upfront pricing</Link> and{" "}
            <Link href="/blog/one-vendor-for-every-home-service" className="text-teal-600 underline">one-vendor model</Link> changed how they hire home services.{" "}
            <Link href="/book" className="text-teal-600 underline">Schedule your service</Link>.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.location}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <svg key={i} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">Verified Customer</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TOP CITIES ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Home Services in Major Cities
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Top {TOP_CITIES.length} Cities We Serve
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Local technicians in every major metro — from <Link href="/locations/illinois/chicago" className="text-teal-600 underline">Chicago</Link> and <Link href="/locations/texas/dallas" className="text-teal-600 underline">Dallas</Link> to <Link href="/locations/georgia/atlanta" className="text-teal-600 underline">Atlanta</Link> and <Link href="/locations/washington/seattle" className="text-teal-600 underline">Seattle</Link>. <Link href="/locations" className="text-teal-600 underline">Browse all {CITY_COUNT} cities</Link>, check <Link href="/pricing" className="text-teal-600 underline">pricing</Link>, or book any of the <Link href="/services" className="text-teal-600 underline">40 home services</Link> in your area.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {[
              { name: "New York", href: "/locations/new-york/new-york-city" },
              { name: "Los Angeles", href: "/locations/california/los-angeles" },
              { name: "Chicago", href: "/locations/illinois/chicago" },
              { name: "Houston", href: "/locations/texas/houston" },
              { name: "Phoenix", href: "/locations/arizona/phoenix" },
              { name: "Philadelphia", href: "/locations/pennsylvania/philadelphia" },
              { name: "San Antonio", href: "/locations/texas/san-antonio" },
              { name: "San Diego", href: "/locations/california/san-diego" },
              { name: "Dallas", href: "/locations/texas/dallas" },
              { name: "Miami", href: "/locations/florida/miami" },
              { name: "Atlanta", href: "/locations/georgia/atlanta" },
              { name: "Denver", href: "/locations/colorado/denver" },
              { name: "Seattle", href: "/locations/washington/seattle" },
              { name: "Boston", href: "/locations/massachusetts/boston" },
              { name: "Nashville", href: "/locations/tennessee/nashville" },
              { name: "Portland", href: "/locations/oregon/portland" },
              { name: "Las Vegas", href: "/locations/nevada/las-vegas" },
              { name: "Austin", href: "/locations/texas/austin" },
              { name: "Charlotte", href: "/locations/north-carolina/charlotte" },
              { name: "Tampa", href: "/locations/florida/tampa" },
            ].map((city) => (
              <Link
                key={city.name}
                href={city.href}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700 hover:shadow-sm"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ALL STATES ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Home Services in All 50 States
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Serving Every State in America
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Coverage stretches from <Link href="/locations/new-york" className="text-teal-600 underline">New York</Link> and <Link href="/locations/massachusetts" className="text-teal-600 underline">Massachusetts</Link> down through <Link href="/locations/florida" className="text-teal-600 underline">Florida</Link>, west through <Link href="/locations/texas" className="text-teal-600 underline">Texas</Link> and <Link href="/locations/arizona" className="text-teal-600 underline">Arizona</Link>, up the coast through <Link href="/locations/california" className="text-teal-600 underline">California</Link> and <Link href="/locations/washington" className="text-teal-600 underline">Washington</Link>. Click any state below, or <Link href="/contact" className="text-teal-600 underline">contact us</Link> to confirm coverage in your area.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {STATES.map((state) => (
              <Link
                key={state.slug}
                href={`/locations/${state.slug}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700"
              >
                {state.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EMERGENCY SERVICE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Emergency Response</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What to Do When It&apos;s an Emergency</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>An active water leak. A gas smell. A furnace that failed overnight in twenty-degree weather. Sparking outlets. A tree on the roof after a storm. A plumbing backup threatening to ruin flooring. These are the moments where a home services company either proves its value or reveals that its advertising was mostly decoration. Home Services Co operates an emergency dispatch channel in every market we serve, and the response protocol is specific enough to explain plainly.</p>
            <p>For any situation where property damage is actively occurring or a safety issue is present, call {PHONE} and tell the phone team it is an emergency. Our phone team is trained to triage the call: they confirm the nature of the emergency, collect the information the technician will need, and escalate to the on-call dispatch for your market. Dispatch reshuffles technician assignments to respond to true emergencies as a matter of priority over non-urgent scheduled work. The technician on the way will confirm an arrival estimate — usually within two hours for active damage situations, faster in dense markets.</p>
            <p>What constitutes an emergency in our dispatch priority: active water leaks or flooding, gas smells (call your gas utility first, us second), complete loss of heating in freezing weather or cooling in extreme heat, sparking or burning electrical issues, locked-out access with children or pets inside, and storm damage creating ongoing exposure to weather. What does not constitute an emergency: a furnace that will not start but the home is not yet cold, a slow drip under the sink that can be contained with a bucket overnight, a light fixture that stopped working, or a broken appliance. These situations are urgent and we book them quickly, but they do not require the on-call emergency dispatch.</p>
            <p>Customers sometimes hesitate to call for true emergencies at night or on weekends because they anticipate &ldquo;after-hours premiums&rdquo; that double the bill. Our pricing does not work that way for actual emergencies. The starting rate is the same $99 per hour that applies during business hours. Parts and materials are itemized the same way. We are not in the business of exploiting emergencies — we are in the business of actually solving them, and the customer who trusts us with an emergency today becomes the customer who calls us first for non-emergency work for years afterward.</p>
            <p>If you are in an active emergency right now, call <a href={PHONE_HREF} className="text-teal-600 underline">{PHONE}</a>. If you are reading this in advance because you want to know what to do when an emergency eventually happens, save our number in your phone under &ldquo;home emergencies&rdquo; — it is worth the ten seconds today to avoid searching for a provider at 2am during an actual leak.</p>
          </div>
        </div>
      </section>

      {/* ─── PROPERTY MANAGERS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">For Property Managers</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How We Work With Property Managers and Portfolios</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Property managers running multi-family buildings, single-family rental portfolios, or commercial real estate operate under different operational constraints than a homeowner calling for a single service. The vendor relationship has to support portfolio-level reporting, consolidated billing, certificate of insurance compliance, scheduled maintenance programs, fast emergency response across multiple properties, and documentation that property management accounting systems can actually process. Home Services Co is built to meet those constraints.</p>
            <p>Our property management accounts come with dedicated account coordinators — a single point of contact who handles scheduling escalations, manages the preferred-technician assignments across properties, coordinates scheduled maintenance programs, and ensures that documentation flows through to the property manager&apos;s accounting and compliance systems as required. The coordinator is not a salesperson with a quota. They are an operational partner whose job is to make your vendor relationship with us run smoothly over time.</p>
            <p>Recurring services work particularly well in a property management context. Preventive HVAC maintenance programs, quarterly drain cleaning, scheduled electrical inspections on shared systems, landscaping and lawn care on common areas, seasonal gutter cleaning, and janitorial services for common spaces all benefit from consistent crew assignments. The same team that handles your properties week after week develops institutional knowledge of the buildings — they know which circuit breaker serves which unit, they know the quirks of the older boilers, they know the tenants with specific access needs. That institutional knowledge compounds over time into faster, better service.</p>
            <p>Tenant-reported issues flow through our scheduling system with property-management-specific routing. Tenants can submit requests directly, with the work order automatically associated with the right property and billed to the property manager&apos;s account. Completed work generates documentation — photos, scope notes, and invoices — that flows to the property manager for approval and records. For emergency tenant-reported issues (leaks, failed systems, lockouts), the same urgency routing applies as for homeowner emergencies, and dispatch can coordinate building access through property-manager-managed lockboxes, smart locks, or tenant-scheduled appointments as your protocol requires.</p>
            <p>Certificate of insurance requirements are standard for commercial clients. We provide COIs listing specific properties or owners as additional insured within twenty-four hours of request. Renewals are tracked and auto-sent before expiration so your compliance file never falls out of date. For property managers running portfolios across multiple states, the COI coverage extends to every state we operate in — no per-property re-verification needed.</p>
            <p>Billing options support both per-property invoicing (one invoice per property) and consolidated portfolio invoicing (one monthly invoice with per-property breakdown). Payment terms for established accounts are net-15 or net-30 depending on the relationship. For property managers accustomed to juggling twenty separate trade vendors across a portfolio, consolidating to one vendor covering all 40 home services typically saves significant admin time in addition to saving money on the work itself. <Link href="/commercial" className="text-teal-600 underline">Commercial services details here</Link>, and <Link href="/who-we-serve/property-managers" className="text-teal-600 underline">property-manager-specific information here</Link>.</p>
          </div>
        </div>
      </section>

      {/* ─── TECHNOLOGY ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Technology</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Technology Behind the Service</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Running a consistent home services experience across {CITY_COUNT} cities requires real operational infrastructure. The customer-facing version of that infrastructure is deliberately simple — you call, text, or book online and a technician shows up. Behind that simplicity is a central scheduling system, a dispatch engine, a technician mobile app, a customer communication layer, a payment processing pipeline, and a data platform that ties it all together. Each layer exists to keep the customer-facing experience reliable.</p>
            <p>The scheduling system is the backbone. Every appointment is a record with real data behind it — technician assignment, arrival window, customer scope, property access details, required tools and parts, estimated duration, and the connection to the customer&apos;s service history. When you call or book online, the scheduling system checks technician availability in real time, matches the job to the right skill set, and confirms an arrival window that reflects actual logistics rather than optimistic marketing promises. The result is that the arrival window we give you is a window we can actually meet.</p>
            <p>The technician mobile app turns the scheduling system into daily execution. Technicians see their route for the day, navigation to each stop, the customer&apos;s scope and history, arrival-notification triggers that fire automatically as they approach, estimate and invoicing tools, photo and note upload for the job record, and payment processing for collection on site. The app is not a consumer-grade tool with workflow bolted on afterward — it was built specifically for this operation and updated continuously based on technician feedback.</p>
            <p>Customer communication runs through automated workflows that fire at key moments — booking confirmation, appointment reminders, technician dispatch notification with photo and name, arrival window updates, scope approval requests, job completion summaries, and invoices. Each of these is designed to close the information gaps that create anxiety in typical home service experiences. You should always know who is coming, when, and what they will do — and the system is built to make sure you do.</p>
            <p>The data platform underlying all of this gives us visibility into operational quality across the company. We track on-time arrival rates, estimate accuracy, customer satisfaction scores, technician performance metrics, scheduling capacity utilization, and dozens of other indicators that let us identify problems early and improve consistently. Customers do not see this data directly, but they benefit from the decisions it drives — staffing changes, process improvements, and investment in areas where we fall short of our own standards.</p>
            <p>Payment processing accepts all major cards, digital wallets, bank transfers, and ACH for account customers. Digital invoices with line-item detail land in customer inboxes within an hour of job completion. Receipts and work histories are available on demand through the customer portal for anyone who wants to pull records for taxes, insurance claims, or resale documentation.</p>
          </div>
        </div>
      </section>

      {/* ─── COMMERCIAL DEEP DIVE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Commercial Services</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Commercial and Business Home Services</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Commercial customers — small businesses, offices, retail locations, restaurants, medical practices, gyms, and similar small-to-midsize operations — need a different approach to facility services than residential customers. The work has to happen around operating hours rather than during them. Invoicing has to flow through the business&apos;s accounting systems. Single points of contact matter more than they do for residential work. And vendor agreements often require COI documentation, W-9s, and other compliance paperwork that residential vendors rarely deal with.</p>
            <p>Our <Link href="/commercial" className="text-teal-600 underline">commercial services division</Link> handles these considerations as a matter of standard operating procedure. Scheduling defaults to after-hours, before-hours, or weekend windows for commercial customers whose operations would be disrupted by daytime service. The starting rate is the same $99 per hour that applies to residential work — we do not add commercial surcharges for the same technical service. Invoicing formats match what commercial accounting systems expect, with clean POs, net-30 payment terms on approved accounts, and tax-exempt handling where applicable.</p>
            <p>Commercial HVAC is one of our largest commercial service categories. Restaurant walk-in coolers, office-building rooftop units, split systems in retail spaces, and mini-splits in medical offices all have specific maintenance and repair rhythms. Our commercial HVAC technicians hold the refrigerant certifications required and work with the specific equipment types common in commercial settings — not just residential furnaces. Commercial plumbing covers the same range — from tenant fit-outs to grease traps to specialized fixtures in medical or food-service settings.</p>
            <p>Commercial cleaning programs operate on schedules ranging from nightly to weekly depending on your facility. Dedicated crews, consistent arrival timing, photo-documented completion, and key or code handling that respects your security protocols. Janitorial supplies included in the contract rate. Restroom restocking, floor care, deep cleaning on quarterly or semi-annual intervals, window cleaning on regular rotations, and carpet cleaning scheduled around your operating calendar.</p>
            <p>Commercial handyman and general maintenance services take care of the steady stream of small repairs that every facility accumulates — door closers that need adjustment, fixtures that need replacement, paint touch-ups, furniture assembly, shelving installation, cosmetic repairs, and the dozens of other small items that individually are not worth a specialist trip but collectively eat up the day if left for the facilities coordinator to handle. A recurring handyman visit every two weeks or once a month handles most of this backlog efficiently.</p>
            <p>For commercial customers with multiple locations, we consolidate vendor management across every site. One agreement, one account coordinator, one billing structure, one set of compliance documentation. The cost and admin savings compared to running separate vendors at each location are substantial, and the consistency of service across sites is typically better than what a patchwork of local vendors delivers.</p>
          </div>
        </div>
      </section>

      {/* ─── CONSOLIDATION STORY ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">The Consolidation Story</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why Home Services Co Exists</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The residential home services industry in the United States is one of the largest and most fragmented consumer markets in the country. Homeowners spend roughly $500 billion a year on home maintenance, repairs, and improvements. That money is distributed across hundreds of thousands of small, independent businesses — plumbers, electricians, HVAC contractors, painters, cleaners, handymen, landscapers, roofers, and dozens of other trades, most operating as single-owner LLCs or small crews that never grow beyond ten people. The fragmentation is not an accident. It reflects decades of industry inertia, a reliance on referral-based growth, and a regulatory landscape that forces every trade into its own licensing track.</p>
            <p>From a homeowner&apos;s perspective, this fragmentation shows up as one exhausting pattern: every home need requires a new vendor search. Furnace stops working in January? Start Googling. Kitchen sink backs up? Start Googling. Light fixture needs replacing? Start Googling. Each search surfaces a dozen options, most with thin websites, inconsistent reviews, and phone numbers that may or may not be answered. The homeowner picks one, crosses their fingers, and hopes the vendor shows up, does the work correctly, charges a reasonable price, and doesn&apos;t try to upsell anything unnecessary. Repeat this cycle across twenty home service needs a year and you have the modern American homeowner experience: a permanent low-grade anxiety about which vendor to trust next.</p>
            <p>Home Services Co is the deliberate opposite of that pattern. We built a single accountable brand across 40 home service trades, operating in {CITY_COUNT} cities across all {STATE_COUNT} states, with one phone number, one pricing model, and one standard of service. Our technicians are licensed and insured in their specific trade, vetted through a multi-step onboarding process, and dispatched through a central scheduling system that shows up on time with real arrival windows. Pricing starts at $99 per hour across every service, with written estimates before any work begins and invoices that match the estimate at the end. The business model is not complicated. What is hard is executing it consistently at scale, across every city, every week, every technician. That is the work we built this company to do.</p>
            <p>Our story starts the same way most homeowners&apos; frustrations start: a broken system we had to navigate personally. After one too many experiences of vendors ghosting, inflated invoices, and finding out mid-job that the &ldquo;plumber&rdquo; who showed up was not actually licensed, we decided the better answer was to build the service company we would want to hire. That meant hiring real licensed technicians as our workforce, pricing honestly, showing up on time, standing behind the work, and expanding into every trade so the customer never has to start a new vendor search. Every element of Home Services Co comes from that simple premise.</p>
            <p>We are not a referral network, a lead marketplace, or a directory. We do not sell customer information to the highest bidder, we do not route jobs to random contractors who pay for placement, and we do not take a clip on work we did not actually do. When you call Home Services Co, the technician who shows up works for us, or is part of our preferred partner network under our accountability standards. That distinction matters. When something goes wrong — and in any service business, something occasionally does — you have one company to call, not a finger-pointing chain of independent contractors blaming each other. The accountability does not scatter.</p>
          </div>
        </div>
      </section>

      {/* ─── 40-TRADE BREAKDOWN ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">The 40-Service Menu</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What We Actually Do — All 40 Home Services</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">Our service menu covers essentially every licensed residential home service trade. We grouped them here by category so you can see how broadly the coverage extends.</p>
          <div className="mx-auto mt-10 max-w-4xl space-y-8 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Climate and Utility Systems</h3>
              <p className="mt-3"><Link href="/services/hvac-services" className="text-teal-600 underline font-semibold">HVAC Services</Link>, <Link href="/services/plumbing" className="text-teal-600 underline font-semibold">Plumbing</Link>, <Link href="/services/electrical" className="text-teal-600 underline font-semibold">Electrical</Link>, <Link href="/services/insulation-services" className="text-teal-600 underline font-semibold">Insulation</Link>, <Link href="/services/solar-installation" className="text-teal-600 underline font-semibold">Solar Installation</Link>, <Link href="/services/chimney-sweep" className="text-teal-600 underline font-semibold">Chimney Sweep</Link>, and <Link href="/services/air-duct-cleaning" className="text-teal-600 underline font-semibold">Air Duct Cleaning</Link> are the systems that keep a home functional. Our licensed technicians in these trades carry the specific state certifications their work requires — EPA 608 refrigerant handling for HVAC, journeyman or master licenses for electrical, state plumbing licensing, and appropriate certifications for specialty work like solar installation. Code-compliant work, permits pulled when required, and documentation that holds up at the point of sale or insurance claim.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Exterior and Structural</h3>
              <p className="mt-3"><Link href="/services/roofing" className="text-teal-600 underline font-semibold">Roofing</Link>, <Link href="/services/siding-installation" className="text-teal-600 underline font-semibold">Siding Installation</Link>, <Link href="/services/fence-installation" className="text-teal-600 underline font-semibold">Fence Installation</Link>, <Link href="/services/deck-building" className="text-teal-600 underline font-semibold">Deck Building</Link>, <Link href="/services/concrete-services" className="text-teal-600 underline font-semibold">Concrete Services</Link>, <Link href="/services/masonry" className="text-teal-600 underline font-semibold">Masonry</Link>, and <Link href="/services/gutter-cleaning" className="text-teal-600 underline font-semibold">Gutter Cleaning</Link> cover the envelope and site work of a property. Exterior work is often high-ticket and high-consequence — a bad roof replacement costs tens of thousands to correct, a failing deck can injure someone, and shortcuts in siding or masonry become visible within a single season. Our technicians in these trades are experienced, insured, and willing to explain repair-versus-replace trade-offs honestly rather than steering every customer toward the most expensive option.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Interior Finish and Remodeling</h3>
              <p className="mt-3"><Link href="/services/painting" className="text-teal-600 underline font-semibold">Painting</Link>, <Link href="/services/flooring-installation" className="text-teal-600 underline font-semibold">Flooring Installation</Link>, <Link href="/services/drywall-repair" className="text-teal-600 underline font-semibold">Drywall Repair</Link>, <Link href="/services/kitchen-remodeling" className="text-teal-600 underline font-semibold">Kitchen Remodeling</Link>, <Link href="/services/bathroom-remodeling" className="text-teal-600 underline font-semibold">Bathroom Remodeling</Link>, <Link href="/services/carpentry" className="text-teal-600 underline font-semibold">Carpentry</Link>, and <Link href="/services/handyman-services" className="text-teal-600 underline font-semibold">Handyman Services</Link> cover interior finish work and remodeling. These are the services that shape how a home feels day to day. Prep matters more than application in painting. Subfloor prep matters more than product selection in flooring. Cabinet ordering lead times drive kitchen remodel timelines. Our crews in these trades respect the trade craft and the customer&apos;s schedule in equal measure, and we quote remodels as written project scopes with milestone payments so customers see exactly what they are buying.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Recurring Home Maintenance</h3>
              <p className="mt-3"><Link href="/services/house-cleaning" className="text-teal-600 underline font-semibold">House Cleaning</Link>, <Link href="/services/carpet-cleaning" className="text-teal-600 underline font-semibold">Carpet Cleaning</Link>, <Link href="/services/window-cleaning" className="text-teal-600 underline font-semibold">Window Cleaning</Link>, <Link href="/services/pressure-washing" className="text-teal-600 underline font-semibold">Pressure Washing</Link>, <Link href="/services/lawn-care" className="text-teal-600 underline font-semibold">Lawn Care</Link>, <Link href="/services/landscaping" className="text-teal-600 underline font-semibold">Landscaping</Link>, <Link href="/services/tree-services" className="text-teal-600 underline font-semibold">Tree Services</Link>, <Link href="/services/pest-control" className="text-teal-600 underline font-semibold">Pest Control</Link>, <Link href="/services/pool-services" className="text-teal-600 underline font-semibold">Pool Services</Link>, and <Link href="/services/snow-removal" className="text-teal-600 underline font-semibold">Snow Removal</Link> are the recurring services that keep a home in good shape year-round. Most of these are offered on weekly, biweekly, monthly, or seasonal schedules, with dedicated technician or crew assignments so the same people show up each visit and learn the property.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Home Systems and Appliances</h3>
              <p className="mt-3"><Link href="/services/appliance-repair" className="text-teal-600 underline font-semibold">Appliance Repair</Link>, <Link href="/services/garage-door-repair" className="text-teal-600 underline font-semibold">Garage Door Repair</Link>, <Link href="/services/locksmith-services" className="text-teal-600 underline font-semibold">Locksmith Services</Link>, <Link href="/services/home-security-installation" className="text-teal-600 underline font-semibold">Home Security Installation</Link>, <Link href="/services/water-damage-restoration" className="text-teal-600 underline font-semibold">Water Damage Restoration</Link>, <Link href="/services/holiday-light-installation" className="text-teal-600 underline font-semibold">Holiday Light Installation</Link>, <Link href="/services/furniture-assembly" className="text-teal-600 underline font-semibold">Furniture Assembly</Link>, <Link href="/services/moving-services" className="text-teal-600 underline font-semibold">Moving Services</Link>, and <Link href="/services/junk-removal" className="text-teal-600 underline font-semibold">Junk Removal</Link> cover the everything-else category of home service needs. Some of these are urgent (water damage restoration, locksmith), some are seasonal (holiday lights), and some are one-off project work (furniture assembly, moving). Every service follows the same upfront pricing and licensed-and-insured standard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── UPFRONT PRICING DEEP DIVE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Pricing Philosophy</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Upfront Pricing Actually Means</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>&ldquo;Upfront pricing&rdquo; has been reduced to a marketing phrase in the home services industry. Most companies claim it, few deliver it. At Home Services Co, upfront pricing has a specific meaning we can defend line by line. Before any technician touches a tool at your home, you see a written estimate. The estimate includes an hourly labor rate — $99 per hour as the starting point across all 40 services — and an itemized list of any parts, materials, or fixtures the job requires at their actual cost plus a disclosed markup. You approve the estimate in writing or electronically. Work begins only after approval. The final invoice matches the estimate unless scope changes during the job, in which case we stop, explain the change, present revised pricing, and continue only after you approve the revision. That is what upfront pricing means to us.</p>
            <p>What upfront pricing explicitly excludes: no mystery &ldquo;shop fees&rdquo; added at checkout. No &ldquo;travel surcharge&rdquo; tacked on because the technician drove more than ten miles. No &ldquo;weekend premium&rdquo; doubling the hourly rate on Saturday. No &ldquo;evening rate&rdquo; kicking in at 5pm. No &ldquo;disposal fee&rdquo; for taking away materials we generated. No &ldquo;overhead allocation&rdquo; added at the bottom of the invoice. The hourly rate is the labor rate, and the materials are the materials. If a job involves dump runs, permits, inspections, or any other real cost, it is itemized on the estimate in advance — not slipped onto the final bill.</p>
            <p>Compare this to how a large fraction of the industry actually bills. Flat-rate plumbing and HVAC franchises use pricing books that assign a fixed dollar amount to each diagnostic category and repair type. These books are designed to maximize per-ticket revenue, which is why they produce wild outcomes — a straightforward faucet replacement quoted at $800, a thermostat install quoted at $450, a garbage disposal replacement quoted at $600. The companies using these books defend them as &ldquo;upfront pricing&rdquo; because you see the price before the work begins. But upfront inflation is not the same thing as honest pricing, and informed customers can tell the difference.</p>
            <p>Our <Link href="/pricing" className="text-teal-600 underline">pricing page</Link> walks through the full details, including how we handle emergency calls, after-hours work, materials, and multi-day projects. For most single-visit jobs, the bill lands in the $99 to $400 range. For multi-day remodels and installations, we quote written project scopes with milestone payments rather than hourly billing, because hourly billing does not match how customers want to think about large projects.</p>
            <p>Our quotes are good faith estimates of what a job will actually cost based on the scope described at the time of booking. If the technician arrives and finds unexpected conditions — a hidden problem behind a wall, an additional repair the initial scope did not catch, a part that turns out to be a non-standard size — we stop, explain, re-quote, and resume only after approval. This communication pattern is built into our training specifically because the industry-standard approach of &ldquo;quote low, pile on change orders later&rdquo; destroys customer trust. We would rather lose a job at the estimate stage than win it and create a customer who feels ambushed at the invoice.</p>
          </div>
        </div>
      </section>

      {/* ─── LICENSED AND INSURED DEEP DIVE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Credentials</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Licensed and Insured Actually Means</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The phrase &ldquo;licensed and insured&rdquo; appears on the website of nearly every home service company in America. In practice, the rigor behind the phrase varies enormously. Some companies verify credentials on day one and monitor them annually. Others check once during initial hiring and never follow up. Others still use the phrase as general marketing copy with no actual verification process behind it. Home Services Co treats credential verification as a recurring operational requirement, and we verify both pieces of &ldquo;licensed and insured&rdquo; directly with the issuing authority rather than taking a technician&apos;s word for it.</p>
            <p>Licensing requirements vary by trade and state. HVAC, plumbing, and electrical work typically require state-issued journeyman or master licenses with continuing education requirements. Roofing and general contracting licensing varies widely — some states require state-level licensing, others regulate at the county or municipal level, others do not license at all beyond a business registration. Painting, cleaning, handyman, and landscaping work is generally unlicensed at the state level in most states, which is why the quality bar in these trades tends to vary more. For every technician we onboard, we identify the specific licensing required for the work they will perform in the specific state they will operate in, and we verify that license is current and in good standing before dispatching them to a customer.</p>
            <p>Insurance is the other half, and it matters for a specific reason: if a technician damages your property, injures a family member, or causes a secondary problem during the work, the insurance is what actually makes you whole. &ldquo;We have insurance&rdquo; without a current certificate and adequate coverage is a phrase, not a guarantee. We carry general liability insurance in every state we operate in, at coverage levels that meet or exceed what property managers, HOAs, and commercial clients require in their vendor agreements. Certificates of insurance listing specific properties or clients as additional insured are available within twenty-four hours of request.</p>
            <p>Workers&apos; compensation is the third element — and the one most small contractors skip. Workers&apos; comp covers a technician if they are injured on your property. Without it, an injured technician can, in some jurisdictions, sue the property owner directly for medical costs and lost wages. Our technicians are covered by workers&apos; compensation in every state we operate in. This is a line item you may not have known to ask about before hiring a home service provider — but it matters, and it is the kind of detail that separates professional service companies from informal operators.</p>
            <p>For property managers and commercial clients specifically, we provide full documentation packages — certificates of insurance, W-9s, tax ID, business registration — within a business day of request. This is standard practice for us, not a special accommodation, because the kinds of customers who need this documentation to onboard a new vendor are exactly the customers our operation was built to serve.</p>
          </div>
        </div>
      </section>

      {/* ─── HOW WE HIRE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Technician Hiring</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How We Hire the Technicians Who Show Up at Your Home</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The quality of a home services company is ultimately the quality of the technicians it dispatches. Every promise we make on this website — upfront pricing, clean workmanship, on-time arrivals, accountable follow-through — only lands if the technician at the customer&apos;s door actually delivers on it. That is why our technician hiring process is deliberately slower than the industry standard. We turn away candidates who could start tomorrow at another company, because the cost of hiring the wrong technician compounds across every customer that technician ever sees.</p>
            <p>Every candidate goes through a structured multi-step process. We verify licensing directly with the state authority rather than trusting a candidate&apos;s documentation. We check insurance coverage and confirm the policy is active at adequate coverage levels. We run background checks through a consumer reporting agency with a scope that matches what a reasonable property owner would expect before letting someone enter their home. We pull driving records for any position involving a company vehicle. We conduct drug screens per jurisdiction norms. And we run a technical assessment specific to the trade the candidate is applying for — practical skill tests that go beyond the self-reported experience on a resume.</p>
            <p>After credential and skill verification, we pair every new technician with an experienced lead technician for a ride-along period before assigning solo routes. During this ride-along, the new technician shadows on actual jobs, observes the customer-service and communication standards we hold, and gradually takes over more of the work under supervision. This process is expensive to run — the lead technician&apos;s productivity drops during the ride-along window, and the new technician is paid but not yet producing fully — and we run it anyway because it is the single highest-leverage quality control we have found.</p>
            <p>Training does not end at onboarding. We provide ongoing continuing education on trade-specific updates — code changes, new product releases, updated safety protocols, emerging diagnostic techniques — and we require our technicians to stay current on continuing-education requirements their trade license demands. For property managers and commercial customers who need documentation of technician qualifications, we can provide credential summaries on request.</p>
            <p>Our <Link href="/careers" className="text-teal-600 underline">careers page</Link> has more on what we hire for and how our technician compensation works. If you know a licensed tradesperson looking for steady work with upfront pricing and consistent routes, send them our way.</p>
          </div>
        </div>
      </section>

      {/* ─── SAME-DAY OPERATIONS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Operations</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Same-Day Service Actually Works</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most home service companies advertise same-day availability. Far fewer deliver it reliably. The gap between the marketing claim and the operational reality comes from a specific problem: same-day service is expensive to operate. It requires spare technician capacity, a dispatch system that can reshuffle routes on short notice, and a willingness to turn down some calls when capacity runs out rather than overpromising and under-delivering. Most companies choose the overpromise path because it generates more bookings, even though the customer experience suffers.</p>
            <p>Our approach is different. We staff markets with enough technician capacity to absorb reasonable same-day demand, particularly in the peak windows for each trade (summer for HVAC, winter for heating and plumbing, spring and fall for roofing and landscaping). We operate a central dispatch system that can dynamically re-route technicians based on urgent new calls, rather than locking schedules a week in advance. And we are honest when capacity actually runs out. If a same-day request comes in on a day we are booked solid, we say so, offer the earliest next-day slot, and let the customer decide — rather than booking a slot we know we cannot make and explaining it away when we miss.</p>
            <p>For calls placed before noon, same-day service is available in most markets, most days of the year. For afternoon calls, same-day is possible but harder to guarantee — the earliest next-day window is often a more honest promise. For true emergencies — active water leaks, gas smells, failed heating in freezing weather, or sparking electrical — our dispatch prioritizes urgent calls ahead of non-urgent scheduled appointments and flexes capacity to respond. We have an after-hours dispatch channel in most markets for emergencies occurring outside of business hours.</p>
            <p>Scheduled (non-same-day) appointments come with a two-hour arrival window in most markets, which is significantly tighter than the four-hour or &ldquo;sometime that day&rdquo; windows common in the industry. A tighter window is possible because our dispatch system integrates technician capacity, travel time, and job duration estimates in a way that smaller operations cannot match. The practical effect for customers is that you are not losing half a day waiting for a technician who may or may not arrive by 5pm.</p>
            <p>If you need service today, the fastest path is to <a href={PHONE_HREF} className="text-teal-600 underline">call {PHONE}</a> — our phone team can see real-time technician availability and give you a same-day answer. <Link href="/book" className="text-teal-600 underline">Online booking</Link> also works and is typically answered within an hour during business hours.</p>
          </div>
        </div>
      </section>

      {/* ─── PRICING COMPARISON ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Compare</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Our Pricing Compares to the Alternatives</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Customers trying to decide between Home Services Co and the alternatives have a few options to compare against. The major categories are independent contractors found through word of mouth or online directories, handyman marketplaces like TaskRabbit or Thumbtack, national franchise networks like those in HVAC and plumbing, private-equity-backed roll-up brands, and lead-generation platforms that route calls to whoever pays the most per lead. Each of these has trade-offs worth understanding.</p>
            <p><strong>Independent contractors</strong> can be the best option when you have a personal relationship with a tradesperson who has worked on your home before and delivers consistently. The trade-off is that independent contractors are hit-or-miss across the population — some are excellent, many are inconsistent, and the path to finding the excellent ones usually runs through trial and error. There is no accountability chain if the independent contractor disappears, quits the trade, or ghosts you mid-job. For recurring needs across multiple trades, managing a stable of trusted independents becomes a part-time job in itself.</p>
            <p><strong>Handyman marketplaces</strong> solve the discovery problem by aggregating contractors onto a platform. The trade-off is quality control: the platform itself rarely verifies licensing, insurance, or skill. Reviews help but can be gamed. The contractor showing up is often someone you have never worked with before, and the platform&apos;s incentive is to keep both sides transacting rather than to enforce quality. For quick handyman work the marketplace model works fine. For licensed work where credentials matter, it introduces risk.</p>
            <p><strong>National franchise networks</strong> in HVAC, plumbing, and other trades offer a consistent brand, trained technicians, and reliable dispatch — all real improvements over independent contractors. The trade-off is pricing. Franchise networks almost universally use flat-rate pricing books engineered to maximize per-ticket revenue. The brand recognition and dispatch reliability come with a premium that often runs thirty to fifty percent above honest hourly billing for equivalent work. For simple jobs this matters more than for complex jobs, because simple jobs are where the flat-rate book markup is most visible.</p>
            <p><strong>Private-equity-backed roll-ups</strong> have acquired thousands of local trade shops over the past decade. The operating model typically layers centralized marketing, sales scripts, and aggressive upsell training on top of the original local business. Customers who used a local shop for years sometimes notice the change: prices rise, sales pitches lengthen, and the local feel fades. Quality of work does not necessarily decline, but the pricing and customer-experience trade-offs shift meaningfully. For customers who prefer straightforward pricing over commission-driven upsells, these roll-ups can feel like a downgrade from the original local shop.</p>
            <p><strong>Lead-generation platforms</strong> route your request to whoever pays them the most for leads in your area. The company that shows up is whoever won that auction. Quality is entirely dependent on which company bought your lead. Your information is typically resold to multiple companies, which is why you get half a dozen follow-up calls from companies you never asked to contact you.</p>
            <p>Home Services Co is none of these. We are a single integrated company with licensed-and-insured technicians on our payroll or in our verified partner network, central dispatch and pricing, upfront billing without flat-rate markup, and accountability that stays with us rather than scattering across a supply chain. For most homeowners most of the time, that combination is simply a better deal.</p>
          </div>
        </div>
      </section>

      {/* ─── EXPANSION PLAN ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Coverage</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Where We Operate and How We Expand</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>We currently operate in {CITY_COUNT} cities across all {STATE_COUNT} states. Coverage is deepest in the largest metropolitan areas, where we have full technician rosters across all 40 trades, dedicated dispatch, and established supplier relationships. In smaller markets, coverage focuses on the highest-demand trades first — HVAC, plumbing, electrical, handyman, house cleaning — and expands into specialty trades as market demand justifies adding technicians in those categories. Every market is rolling toward full 40-trade coverage on a schedule determined by local demand signals.</p>
            <p>Market launches follow a consistent playbook. We assess local demand, identify the right initial technician hires, verify licensing requirements for the jurisdiction, establish supplier relationships, set up the dispatch territory in our scheduling system, and launch with a focused service menu that expands as the team grows. Expansion timing is driven by real customer demand rather than capital-fueled land-grab rollouts that leave markets understaffed for the work they committed to deliver. This is a less glamorous growth model than the &ldquo;launch fifty markets in a quarter&rdquo; pitch that attracts press coverage, and it delivers a more reliable customer experience at launch.</p>
            <p>Browse the <Link href="/locations" className="text-teal-600 underline">full locations directory</Link> to see every city we serve. If your city is listed, we operate there with at least the core set of services and often the full 40-trade menu. If your city is not listed but falls within a metro area we serve, we likely cover you through the nearest market — call {PHONE} and we will confirm. If your area is genuinely outside our current coverage, we will tell you honestly and often point you toward a reputable local option rather than send a technician on a wasted trip.</p>
            <p>For customers in markets we have not yet reached, we offer a notification list — leave your zip code with us and we will reach out when we activate local service. Many of our market launches have been prompted directly by customer demand from specific zip codes, and we prioritize the launch sequence partly based on where that demand concentrates.</p>
          </div>
        </div>
      </section>

      {/* ─── REPEAT CUSTOMERS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Customer Retention</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why Homeowners Keep Coming Back</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most of our business comes from repeat customers and referrals. That is a specific claim with a specific implication: if the first appointment does not generate a satisfied customer, the whole business model breaks. We are not in the business of one-off transactions monetized through high-margin flat-rate pricing. We are in the business of being the home services company a customer calls for the next ten years, across every trade, every time.</p>
            <p>The economics of this model require us to do a few things consistently. We have to price honestly so the customer trusts the invoice. We have to do the work correctly so the customer does not need to re-hire someone else to fix it. We have to show up when we say we will so the customer does not have to reorganize their day around vague windows. And we have to stand behind the work so that when something does go wrong, the resolution is fast and does not require the customer to fight for it. These things are simple to state and surprisingly difficult to execute at scale across forty trades and nearly a thousand markets.</p>
            <p>Our customer data reflects the model. Repeat-customer share of total appointments sits well above the industry average. Average number of distinct services a customer uses within their first year climbs as they discover they can call us for trades they did not initially realize we covered. Referral share of new customer acquisition is substantial — new customers frequently mention they heard about us from a neighbor, a friend, or a property manager. None of this is accidental. It is the direct operational output of a business model designed for repeat custom rather than per-ticket extraction.</p>
            <p>If you use us once and it goes well, you are likely to find yourself calling us again the next time a home need comes up. That is the playbook. We would rather earn your second appointment than maximize the first one.</p>
          </div>
        </div>
      </section>

      {/* ─── SEASONAL DEMAND ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Seasonal Planning</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Home Services Through the Seasons</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Home service demand is highly seasonal, and planning your appointments around the seasonal calendar often saves both money and frustration. The first hot week of summer creates a massive spike in AC service calls — every HVAC company in a market gets slammed at once, waits stretch to a week or more, and emergency premiums kick in at some companies. Scheduling your HVAC maintenance in the spring, before peak heat, almost always produces faster scheduling and a more relaxed appointment than waiting until July.</p>
            <p>Winter heating is the mirror of summer cooling. The first cold week of the season spikes furnace and heating system calls. Boilers and furnaces that have been idle all summer wake up and reveal problems that would have been caught by a fall tune-up. Pipes freeze in unheated spaces. Chimney inspections become urgent. Scheduling heating system work in the fall — ideally October in most climates — catches problems before they become emergencies and avoids the December queue.</p>
            <p>Spring is the busy season for exterior work. Roofing inspections and repairs, gutter cleaning, siding work, pressure washing, deck repair, landscaping installations, and lawn care all start as soon as weather permits and continue through early summer. Booking exterior work in February or March for an April or May appointment almost always produces a better scheduling experience than calling in May when every crew is already booked for weeks.</p>
            <p>Fall is preventive maintenance season across the board. HVAC tune-ups, chimney sweeps, gutter cleaning to clear leaves before winter, roof inspections before winter weather, tree services to handle storm-damage risks before snow loads, and pre-holiday interior services (carpet cleaning, deep cleaning, painting) all peak in October and November. Booking these services in late summer or early fall produces the best combination of scheduling availability and weather cooperation.</p>
            <p>Year-round services — house cleaning, handyman work, plumbing emergencies, electrical — follow their own rhythms but are not heavily seasonal in most markets. Routine recurring work should be on a regular schedule regardless of season. Emergency work gets priority dispatch regardless of season. And if you are planning a larger project, we are happy to help you think through the right timing for the specific work. <Link href="/book" className="text-teal-600 underline">Book online</Link> anytime, or call for a quick consult.</p>
          </div>
        </div>
      </section>

      {/* ─── TRUST SIGNALS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Trust Signals</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Makes a Home Services Company Trustworthy</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Before hiring any home services provider, there are specific signals worth checking. Most of them take less than five minutes. Many customers skip the checks because they assume any professional-looking company will have the basics covered. That assumption is incorrect frequently enough that the basics are worth verifying every time.</p>
            <p><strong>License verification.</strong> Every state has a public license-lookup tool for regulated trades. Searching a contractor&apos;s business name or license number on the relevant state website takes under a minute and confirms whether the license exists, is current, and is in good standing. Any legitimate contractor will happily provide their license number and encourage you to verify it.</p>
            <p><strong>Insurance verification.</strong> Ask for a current certificate of insurance. A legitimate company will produce it within a business day. If the request produces hesitation, excuses, or an expired certificate, that is a meaningful signal. For larger projects or work on valuable property, insist on being named as an additional insured on the certificate for the duration of the job.</p>
            <p><strong>Written estimates.</strong> Any work beyond a minor service call should come with a written estimate before work begins. &ldquo;I&apos;ll let you know at the end&rdquo; is not a pricing model — it is a setup for a dispute. A legitimate service provider produces written estimates as a matter of course.</p>
            <p><strong>Communication quality.</strong> The quality of pre-appointment communication often predicts the quality of the work itself. Do they answer the phone? Return messages within a business day? Explain scope clearly? Give realistic arrival windows? If pre-appointment communication is shaky, post-appointment communication usually is too — and the work itself often follows the same pattern.</p>
            <p><strong>Reviews with pattern, not just volume.</strong> A five-star average across two hundred reviews is less informative than a careful read of the reviews that describe the specific scenario you care about. Did they show up on time? Did they stand behind the work when something went wrong? Did the invoice match the estimate? Look for patterns in the specifics, not just the star count.</p>
            <p>We publish our reviews, certifications, insurance documentation, and licensing information because we expect customers to check. Call <a href={PHONE_HREF} className="text-teal-600 underline">{PHONE}</a> for any credential documentation you need before booking.</p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Home Services Frequently Asked Questions
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Common Questions
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Everything you need to know about <Link href="/pricing" className="text-teal-600 underline">pricing</Link>,{" "}
            <Link href="/services" className="text-teal-600 underline">services</Link>, and{" "}
            <Link href="/book" className="text-teal-600 underline">booking</Link>. Still have questions?{" "}
            <Link href="/faq" className="text-teal-600 underline">See our full FAQ page</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 font-heading">
                  {item.q}
                </summary>
                <div className="px-6 pb-4 text-sm leading-relaxed text-slate-700">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FIRST-TIME GUIDE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">First-Time Customer Guide</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What to Expect if You&apos;re Calling Us for the First Time</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most new customers find us because an existing customer or neighbor referred them, or because they searched for a specific service in their city and our page turned up. Either way, the first call is a chance for us to show that everything the website claims is also how we actually operate. Here is what the first-time experience looks like in practice, so you know what to expect and how to get the most out of the call.</p>
            <p>When you call <a href={PHONE_HREF} className="text-teal-600 underline">{PHONE}</a>, you will reach a real person on our phone team during business hours, or voicemail with a guaranteed callback within one business hour during business hours (or first thing the next business day for after-hours calls that are not emergencies). The phone team will ask for your name, a callback number, your zip code or city, and a brief description of what you need. They will check real-time technician availability, give you an appointment window, and confirm the starting rate and any likely additional costs based on what you described.</p>
            <p>If you prefer to skip the phone and book through the website, the online booking form collects the same information and enters it into our scheduling system. Online bookings are usually confirmed within an hour during business hours. For same-day service, the phone is faster than online — call us directly when timing matters.</p>
            <p>Before your appointment, you will receive a confirmation with the technician&apos;s name and photo, the arrival window, and contact details if you need to reach us about access or timing. As the technician approaches, an automated notification goes out with updated arrival timing. This removes the &ldquo;is the plumber still coming?&rdquo; uncertainty that is endemic to the industry.</p>
            <p>At arrival, the technician introduces themselves, walks through the scope with you, answers any questions, and presents the written estimate. This is the moment to ask anything you want — about the work, the pricing, the materials, the timeline, the warranty, or anything else. We would rather answer ten questions now than leave any of them unanswered and create a surprise later.</p>
            <p>Once you approve, work begins. For most residential jobs the technician completes the work in one visit. For larger projects, we schedule multiple visits with a clear project timeline. When the job is complete, the technician walks you through what was done, confirms everything meets your expectations, collects payment, and hands you a digital receipt. The whole sequence is designed to leave you with zero surprises and zero outstanding questions.</p>
            <p>After the appointment, we follow up to confirm satisfaction and invite feedback. If anything is not right, one call fixes it. If everything is right, we hope you call us again for the next thing. That is the simple relationship we are trying to build — one call at a time, over years — and it starts with the first-time experience meeting the standard the website describes.</p>
          </div>
        </div>
      </section>

      {/* ─── GUARANTEE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Our Guarantee</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What We Stand Behind</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every job we complete carries written warranty coverage appropriate to the work. Labor is warrantied against defects in workmanship. Parts carry whatever manufacturer warranty applies, registered in your name and documented on your invoice. If anything we installed fails within the warranty period because of our workmanship or a covered manufacturing defect, we come back and fix it at no additional cost. The warranty is not a marketing line — it is written policy, and we honor it even when the original technician has moved on or years have passed since the original job. Customer service histories persist in our system indefinitely, and any technician responding to a warranty call can pull the full context of the original work before arriving.</p>
            <p>If you are dissatisfied with any aspect of a completed job, the path to resolution is direct. Call <a href={PHONE_HREF} className="text-teal-600 underline">{PHONE}</a> and describe the situation. A manager with authority to resolve the issue will respond within one business day. Most concerns are resolved on the first call — sometimes with a return visit, sometimes with a credit or refund, sometimes with a direct conversation that clarifies what happened. We do not make customers fight for fair resolution of legitimate issues. The time saved by getting a complaint to the right manager quickly is time worth paying for even when the resolution costs us money.</p>
            <p>Our standard of work is set by a simple test. Would the technician who did this work be comfortable showing it to a licensed inspector, a building official, a real estate agent staging the home for sale, or another professional in the same trade? If the answer is yes, the work meets our standard. If the answer is no, the work needs correction before we consider the job done. This test is applied consistently across every trade we operate in because it is the honest threshold for what &ldquo;done right&rdquo; means in home services.</p>
            <p>We do not promise perfection. Human beings do the work in real homes with real complications. Occasionally things will go wrong — a missed arrival window, a communication breakdown, a small defect that becomes visible after completion, a scheduling error. What we promise is that when something goes wrong, we will respond honestly, fix what needs fixing, and make the customer whole. That is the full scope of our accountability, and it is backed by the reputation we have built across {CITY_COUNT} cities and nearly every state. If you want to book home services with a company that is willing to put its name on the work, the text, call, or book-online paths are all open — and every one of them leads to a real person with the authority and the incentive to do right by you.</p>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">
            One Call for Every Home Service You Need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Starting at $99/hour across 40 home services. Licensed and insured technicians. Upfront pricing. Same-day availability in most markets. {CITY_COUNT} cities across all {STATE_COUNT} states. Open {HOURS}, seven days a week, including weekends and holidays. No contracts, no hidden fees, no surprise invoices. Text, call, or book online — one vendor for every home service need.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {PHONE} — Fastest
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {PHONE}
              </span>
            </a>
            <Link href="/book">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Book Now
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
