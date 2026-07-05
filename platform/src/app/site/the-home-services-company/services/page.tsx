import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/the-home-services-company/_data/content";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";

export const metadata: Metadata = {
  title: "Home Services — 40 Services Nationwide | Starting at $99/Hour",
  description: "40 home services under one roof. HVAC, plumbing, electrical, painting, flooring, cleaning, handyman, remodeling, and more. Starting at $99/hour, upfront pricing, licensed and insured.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {SERVICES.length} Home Services Under One Roof
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Every Home Service You Need<br />
            <span className="gradient-text">One Phone Number, Starting at $99/Hour</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {SERVICES.length} home services — HVAC, plumbing, electrical, painting, flooring, cleaning, handyman, remodeling, and more. Upfront pricing. Licensed and insured. Same-day availability in most markets.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">One Vendor for Every Home Service</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How It Works — Starting at $99/Hour Across Every Trade</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">When you call us, you&apos;re not picking between 10 different specialists. You&apos;re booking licensed technicians across 40 home services — <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link>, and beyond — all through one account, one phone number, and one standard of service.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most homeowners juggle too many vendors. The plumber who&apos;s fine but can&apos;t touch electrical. The painter who doesn&apos;t do drywall. The handyman who ghosts you after the first visit. Every call means starting over — searching, comparing quotes, hoping someone shows up. Home Services Co collapses that vendor list. Licensed technicians across 40 trades, starting at $99/hour with upfront pricing on every job.</p>
            <p>On every job across every trade, the operating standards are the same. Written estimates before any work begins. Parts and materials itemized up front. The invoice at the end matches the estimate at the start. Scope changes require your approval before continuing. Licensed and insured technicians. Drop cloths and floor protection. Clean workspace at the end. Same-day availability in most markets.</p>
            <p>We&apos;re local in every market we operate. Our technicians live in the communities they serve. They know the building codes, the permit processes, the supply houses, and the regional quirks that keep jobs moving. We&apos;re in <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT} cities</Link> across all {STATE_COUNT} states — but every job is local. Licensed, insured, and consistent from the first call to the final invoice.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Core Home Services</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Home Services — The Trades Most Homeowners Need</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Licensed technicians in the trades you call most often — HVAC, plumbing, electrical, painting, flooring, cleaning, and handyman. Starting at $99/hour.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "residential").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Assembly and Single-Item Services</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Furniture Assembly and Installs</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">IKEA, Wayfair, Amazon, Target — we assemble it correctly the first time. Starting at $99/hour.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "item-specific").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Outdoor Structures and Builds</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Fence, Deck, and Outdoor Structure Work</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">New fence and deck builds, plus outdoor structure repair and replacement. Starting at $99/hour.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "structure").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Specialty Services</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Specialty Trades — Tree, Pool, Snow, Security, and More</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Tree work, pool service, snow removal, home security installation, and other specialty trades. All under one account. Starting at $99/hour.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "specialty").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Commercial Services</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Commercial Home Services — Offices, Property Management, Retail</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Commercial facility services under one account. See our <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">full commercial service page</Link> for details on dedicated account management and consolidated invoicing.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.filter((s) => s.category === "commercial").map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{SERVICES.indexOf(service) + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Consistent Pricing Across Every Service</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Pricing Works Across All {SERVICES.length} Services</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">No matter which of our {SERVICES.length} services you book, the pricing model is the same. See our full <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing page</Link> for examples and details.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>The starting rate:</strong> $99 per hour. This covers labor. For jobs requiring parts, fixtures, or materials (a new water heater, a light fixture, paint and supplies), those costs are itemized up front before work begins.</p>
            <p><strong>The estimate:</strong> Written, before any technician touches a tool. You approve it, work begins. The invoice at the end matches the estimate at the start. Scope changes only happen with your explicit approval.</p>
            <p><strong>Larger projects:</strong> Kitchen remodels, bathroom remodels, full paint jobs, roof replacements — these are quoted as complete written project scopes rather than strictly hourly. You see the full cost before committing.</p>
            <p><strong>No contracts:</strong> Every job is standalone unless you specifically set up a recurring service account (like weekly cleaning or seasonal lawn care). <Link href="/book" className="text-teal-700 font-semibold hover:underline">Book when you need us</Link>.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">The One-Vendor Model</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why {SERVICES.length} Services Under One Roof Saves You Time and Money</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The typical American homeowner uses between twelve and twenty different home service vendors across a year. An HVAC company for spring and fall maintenance. A plumber when something leaks. An electrician for panel work or a ceiling fan. A painter when a room needs refreshing. A handyman for small repairs. A house cleaner for recurring cleaning. A landscaper for lawn care. A roofer when damage shows up. A pest control company for the annual spray. An appliance repair tech for whichever appliance fails this year. Each vendor is its own relationship, its own billing, its own discovery process, and its own potential failure point.</p>
            <p>Home Services Co was built to collapse that vendor list. Our <Link href="/blog/one-vendor-for-every-home-service" className="text-teal-700 font-semibold hover:underline">one-vendor model</Link> is the operating principle — one phone number, one account, one billing relationship, one standard of service, covering every home service trade from <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link> to <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link> to <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link> to <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link> and 36 more. Once you use us for one service, the next appointment for any other trade is a single call with your existing account.</p>
            <p>The time savings compound. The average vendor search takes a homeowner forty-five minutes — Googling options, reading reviews, getting callback quotes, picking one, scheduling. Eliminating that search for every repeat service need across twelve vendor relationships saves real hours per year. The billing consolidation matters too — one account, one monthly invoice option for recurring service, one credit card on file, one place to find every service record when tax season or resale documentation demands it.</p>
            <p>The quality consolidation is the part customers appreciate most. Every technician across all {SERVICES.length} of our services is held to the same operating standards — upfront pricing, <Link href="/blog/licensed-and-insured-what-it-means" className="text-teal-700 font-semibold hover:underline">licensed and insured</Link>, clean workmanship, transparent communication, and accountable follow-up when something needs correction. The experience is consistent whether you are booking an <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC tune-up</Link>, <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">a kitchen remodel</Link>, or a <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman visit</Link>. You do not have to re-verify a new provider&apos;s credentials every time you need a different trade.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Licensed and Insured Across Every Trade</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Our Credentials Actually Mean</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Licensing requirements vary by trade. <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC work</Link> requires state-level licenses in most states plus EPA 608 certification for refrigerant handling. <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">Plumbing</Link> and <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link> both require state-issued journeyman or master licenses with continuing education. <Link href="/services/roofing" className="text-teal-700 font-semibold hover:underline">Roofing</Link> licensing varies widely — state level in some states, county or municipal in others. Specialty trades like <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>, <Link href="/services/tree-services" className="text-teal-700 font-semibold hover:underline">tree services</Link>, <Link href="/services/locksmith-services" className="text-teal-700 font-semibold hover:underline">locksmith services</Link>, and <Link href="/services/solar-installation" className="text-teal-700 font-semibold hover:underline">solar installation</Link> carry their own certification requirements.</p>
            <p>Our technicians hold the specific licenses their trade and their state require. We verify those credentials directly with the issuing authority rather than trusting a candidate&apos;s word or paperwork. Annual renewals are tracked so credentials never lapse. For property managers, homeowner associations, and commercial clients, <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">certificates of insurance</Link> and license documentation are available within one business day of request.</p>
            <p>Insurance coverage extends across general liability, commercial auto, and workers&apos; compensation in every state we operate in. Coverage limits meet or exceed what <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property managers</Link> and <Link href="/who-we-serve/businesses" className="text-teal-700 font-semibold hover:underline">business customers</Link> require in standard vendor agreements. Certificates listing specific properties or clients as additional insured are issued on demand.</p>
            <p>This credential consolidation is one of the most underrated benefits of the one-vendor model. Homeowners who work with multiple independent contractors rarely verify credentials every time, and the verification process for a new vendor is the kind of due diligence most people skip. With one vendor across {SERVICES.length} services, credential verification happens once and applies to every trade we cover.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The One-Phone-Number Standard Across Every Service</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every one of the {SERVICES.length} services we offer runs through the same phone number and the same scheduling system. There is no separate routing for different trades, no branded subsidiary for commercial work, no upsell tier that charges extra for the same service under a different label. You call one number, describe the service you need, and the scheduler books the appropriate technician at the consistent hourly rate. For customers who have experienced home services through a patchwork of independent vendors, this consolidation is often the single most noticeable operational change. Cross-trade coordination becomes trivial rather than a multi-vendor juggling exercise. Service history builds up in one account rather than scattering across multiple vendors. Invoicing consolidates naturally rather than accumulating as a drawer full of receipts from different providers.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Each Service Works Operationally</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The operational flow for every one of our {SERVICES.length} services follows the same sequence — call or book online, get a confirmed appointment window, technician arrives, walkthrough and estimate, execution, completion and payment. The differences between services are in the specifics: what tools the technician carries, how long the job takes, whether parts or materials are needed, what permits apply, and how the work should be tested before completion. The outer wrapper is consistent; the trade content inside each wrapper is specialized to the work.</p>
            <p>For emergency-capable services like <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link>, <Link href="/services/locksmith-services" className="text-teal-700 font-semibold hover:underline">locksmith services</Link>, <Link href="/services/water-damage-restoration" className="text-teal-700 font-semibold hover:underline">water damage restoration</Link>, and <Link href="/services/garage-door-repair" className="text-teal-700 font-semibold hover:underline">garage door repair</Link>, we maintain priority-dispatch capability with faster-than-standard arrival for genuine emergencies. Active leaks, no heating in freezing weather, electrical sparking, and active property-damage scenarios get priority routing regardless of the surrounding scheduling load.</p>
            <p>For recurring-service capable trades like <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link>, <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>, <Link href="/services/pool-services" className="text-teal-700 font-semibold hover:underline">pool services</Link>, <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>, and <Link href="/services/snow-removal" className="text-teal-700 font-semibold hover:underline">snow removal</Link>, we offer recurring account setup with consistent technician assignments, priority scheduling, and consolidated monthly invoicing. Recurring accounts are the most common relationship type for property managers and customers who have decided to outsource a specific service permanently.</p>
            <p>For project-scale services like <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link>, <Link href="/services/bathroom-remodeling" className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>, <Link href="/services/roofing" className="text-teal-700 font-semibold hover:underline">roofing</Link>, <Link href="/services/siding-installation" className="text-teal-700 font-semibold hover:underline">siding</Link>, and <Link href="/services/solar-installation" className="text-teal-700 font-semibold hover:underline">solar installation</Link>, we quote written project scopes with milestone payments rather than strictly hourly billing. A dedicated project manager coordinates the work across multiple visits and multiple trades if needed. Project timelines are communicated up front with realistic estimates rather than optimistic marketing promises.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">All {SERVICES.length} Services Available in {CITY_COUNT} Cities</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Nationwide Home Services — Every Service Available in Every City</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">All {SERVICES.length} services are available in every one of our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT} cities across {STATE_COUNT} states</Link>. Same starting rate, same standards, same quality. <Link href="/book" className="text-teal-700 font-semibold hover:underline">Book now</Link> or call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a> for same-day service.</p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Book Any of Our {SERVICES.length} Services — Starting at $99/Hour Nationwide
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One phone number. Upfront pricing. Licensed and insured. Same-day available in {CITY_COUNT} cities across {STATE_COUNT} states.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
