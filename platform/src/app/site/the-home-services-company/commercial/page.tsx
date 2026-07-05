import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";

export const metadata: Metadata = {
  title: "Commercial Home Services — Offices, Retail, Property Management & More",
  description: "Commercial facility services starting at $99/hour — HVAC, cleaning, electrical, handyman, and more. One vendor for every facility need. Licensed, insured, consolidated invoicing.",
  alternates: { canonical: "/commercial" },
};

const commercialServices = SERVICES.filter((s) => s.category === "commercial");

export default function CommercialPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Commercial &amp; Business Services</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Commercial Home Services<br /><span className="gradient-text">One Vendor for Every Trade</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Commercial HVAC, cleaning, electrical, handyman, painting, and more — all under one account. Starting at $99/hour with upfront pricing, dedicated account management, and consolidated monthly invoicing.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta text-center">Commercial Home Services Under One Account</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Services Designed for Business</h2>
          <p className="mt-4 text-base text-slate-600 text-center mx-auto max-w-2xl">From <Link href="/services/hvac-services" className="text-teal-700 underline hover:text-teal-900">commercial HVAC</Link> to <Link href="/services/house-cleaning" className="text-teal-700 underline hover:text-teal-900">office cleaning</Link> and <Link href="/services/handyman-services" className="text-teal-700 underline hover:text-teal-900">facility handyman work</Link>, we handle every trade a small business or commercial facility needs. Browse all of our <Link href="/services" className="text-teal-700 underline hover:text-teal-900">40 services</Link> or <Link href="/book" className="text-teal-700 underline hover:text-teal-900">book a service today</Link>.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {commercialServices.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta text-center">Why Businesses Choose Home Services Co</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Businesses Choose Us</h2>
          <p className="mt-4 text-base text-slate-600 text-center mx-auto max-w-2xl">We serve offices, retail, <Link href="/who-we-serve/hotels-hospitality" className="text-teal-700 underline hover:text-teal-900">hotels</Link>, <Link href="/who-we-serve/property-managers" className="text-teal-700 underline hover:text-teal-900">property managers</Link>, HOAs, and more. Check our <Link href="/pricing" className="text-teal-700 underline hover:text-teal-900">upfront pricing</Link> or find a <Link href="/locations" className="text-teal-700 underline hover:text-teal-900">service area near you</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Commercial facility management has the same problem residential homeowners face — vendor sprawl. Most small businesses and property managers juggle a dozen specialists across HVAC, plumbing, electrical, cleaning, handyman, painting, and more. Home Services Co collapses all of that into one vendor relationship with dedicated account management, priority scheduling, and consolidated monthly invoicing.</p>
            <p>Commercial accounts get priority scheduling, after-hours and weekend service at the same starting rate, certificates of insurance within 24 hours, and detailed disposal documentation where compliance requires it. We work around your business schedule to minimize disruption. Recurring accounts get consistent technicians assigned to your facilities.</p>
            <p>From 5-person startups to multi-location portfolios, the operating model is the same: one phone number, 40 services, starting at $99/hour with upfront pricing. Licensed and insured across every trade. Same standard of service every time.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Upfront Pricing", desc: "Written estimates before any work begins. The invoice matches the estimate. No surprise fees." },
              { title: "Priority Scheduling", desc: "Commercial accounts get same-day and next-day priority. Your timeline is our timeline." },
              { title: "After-Hours Service", desc: "Evenings and weekends at the same starting rate. Minimize disruption to your operations." },
              { title: "Insurance Certificates", desc: "COIs within 24 hours. Full liability coverage as standard practice." },
              { title: "Dedicated Account Management", desc: "One point of contact across every service and location in your portfolio." },
              { title: "Consolidated Invoicing", desc: "One monthly invoice across every service, every location, every technician." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INDUSTRIES WE SERVE ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Commercial Verticals We Know Cold</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Industries We Serve</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Commercial facilities are not generic. Each industry has specific service patterns, compliance requirements, and operating hours. We work with every segment below — see also <Link href="/who-we-serve" className="text-teal-700 font-semibold hover:underline">who we serve</Link> and <Link href="/services" className="text-teal-700 font-semibold hover:underline">our 40 services</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-4xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Offices and professional services.</strong> Daily or weekly <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">cleaning</Link>, quarterly <Link href="/services/carpet-cleaning" className="text-teal-700 font-semibold hover:underline">carpet cleaning</Link>, <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link> maintenance on a preventive schedule, <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman</Link> for office moves and reconfigurations, and same-day response for electrical or plumbing emergencies. Most office accounts run a recurring service agreement plus ad-hoc requests through the same account manager.</p>
            <p><strong>Retail and storefronts.</strong> <Link href="/services/window-cleaning" className="text-teal-700 font-semibold hover:underline">Window cleaning</Link> on visible frontage, <Link href="/services/pressure-washing" className="text-teal-700 font-semibold hover:underline">pressure washing</Link> sidewalks and storefronts, emergency lock-out and glass repair response, seasonal <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link> touch-ups, and after-hours scheduling to avoid disrupting customer traffic during open hours.</p>
            <p><strong>Property management and HOAs.</strong> Multi-unit service coordination, punch-list execution for turnover, preventive maintenance across the full portfolio, consolidated invoicing that maps to each property&apos;s P&L, and dedicated account management for property managers running dozens of units. See our <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property manager program</Link>.</p>
            <p><strong>Hotels and hospitality.</strong> Nightly cleaning support during peak season, event-driven <Link href="/services/landscaping" className="text-teal-700 font-semibold hover:underline">landscaping</Link> and exterior prep, on-call HVAC and plumbing for guest issues, and scheduled painting, flooring, and <Link href="/services/drywall-repair" className="text-teal-700 font-semibold hover:underline">drywall repair</Link> rotations across guest rooms.</p>
            <p><strong>Restaurants and food service.</strong> Grease trap cleaning support, vent hood maintenance coordination with licensed specialty vendors, exterior pressure washing and window cleaning on a tight schedule that works around service hours, <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link> on the health-department-required cadence, and 24/7 emergency response for anything that could close the business.</p>
            <p><strong>Medical and professional clinics.</strong> Hospital-grade disinfection protocols, biohazard-aware cleaning procedures, HVAC with filtration attention, plumbing with backflow-prevention awareness, and scheduling that avoids patient hours. We are not a specialty medical-facility vendor, but for general facility services in medical buildings we work within the compliance framework the tenant requires.</p>
            <p><strong>Churches and nonprofits.</strong> Event-driven service scaling (Sunday prep, holiday seasons, conferences), weeknight and weekend availability without premium pricing, and nonprofit-aware pricing structures that help mission-driven organizations get professional service within real-world budgets. See our <Link href="/who-we-serve/churches-nonprofits" className="text-teal-700 font-semibold hover:underline">nonprofit page</Link>.</p>
            <p><strong>Schools and universities.</strong> Summer-break heavy-maintenance windows, after-hours routine work during the school year, consistent technician assignments so facilities staff always know who is on-site, and the paperwork discipline (COIs, background checks, safety certifications) that education clients require as standard practice.</p>
            <p><strong>Warehouses and light industrial.</strong> Loading dock maintenance, concrete repair, exterior lighting, high-bay HVAC service, and the heavier pressure washing and landscaping that industrial sites need. See <Link href="/services/concrete-services" className="text-teal-700 font-semibold hover:underline">concrete work</Link> and the full <Link href="/services" className="text-teal-700 font-semibold hover:underline">service menu</Link>.</p>
          </div>
        </div>
      </section>

      {/* ===== ONBOARDING ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Going from First Call to Consolidated Vendor</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Commercial Onboarding Process</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Most businesses can be fully onboarded in under a week. Call <Link href="/contact" className="text-teal-700 font-semibold hover:underline">contact</Link> or use the <Link href="/book" className="text-teal-700 font-semibold hover:underline">booking form</Link> to start, then follow the four steps below.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Discovery Call", desc: "30 minutes. We map your facilities, current vendors, pain points, and the services you want us to take over first. No commitment." },
              { step: "2", title: "Site Walk", desc: "We visit the site (or multiple sites), document current conditions, identify any immediate issues, and build a baseline service plan." },
              { step: "3", title: "Proposal and Agreement", desc: "Written scope, rates, response-time commitments, and insurance certificates. You review with your team, request changes, and sign when ready." },
              { step: "4", title: "First Service Window", desc: "First scheduled service on the calendar. Dedicated account manager assigned. Consolidated invoicing activated. You stop juggling vendors." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-3xl font-bold text-teal-700 font-heading">{item.step}</p>
                <h3 className="mt-2 text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMERCIAL PRICING ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Three Pricing Models for Commercial Accounts</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Commercial Pricing Works</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Commercial pricing extends our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">standard upfront pricing</Link> with structures designed for businesses. Pick the model that matches how you actually buy service.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Hourly at published rate.</strong> Starting at $99/hour per technician, plus itemized parts and materials. Best for businesses with irregular or unpredictable service needs. No commitment, no minimums, full upfront pricing on every dispatch. Most small commercial accounts start here.</p>
            <p><strong>Flat-rate project pricing.</strong> For scoped projects — an office paint refresh, a retail storefront pressure wash and window clean, a warehouse concrete repair — we bid a single flat-rate number. You know the total before any work begins. Scope changes go through formal written change orders the same way they would on any professional construction project.</p>
            <p><strong>Monthly retainer / recurring service agreement.</strong> For businesses with steady, predictable service needs (nightly cleaning, weekly landscaping, monthly HVAC preventive), we structure a fixed monthly retainer with a defined scope. Consolidated monthly invoicing, priority dispatch, dedicated account manager. Ad-hoc work outside the retainer scope is billed at standard hourly with priority scheduling.</p>
            <p>Most multi-location commercial accounts blend all three: retainer for predictable recurring services, flat-rate for larger planned projects, hourly for unpredictable dispatches. One account, three pricing models, one dedicated point of contact.</p>
          </div>
        </div>
      </section>

      {/* ===== COMMERCIAL FAQ ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Commercial Account FAQ</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Questions Commercial Buyers Ask</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">More in our general <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link>. For specific segments, see <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property managers</Link>, <Link href="/who-we-serve/businesses" className="text-teal-700 font-semibold hover:underline">businesses</Link>, and <Link href="/partnerships" className="text-teal-700 font-semibold hover:underline">partnership programs</Link>.</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            {[
              { q: "Do you serve multi-location portfolios nationally?", a: "Yes. We operate in all 50 states across 990 cities. Multi-location commercial accounts get one dedicated account manager, consolidated invoicing across every location, and consistent service standards across every technician — regardless of which city the job is in." },
              { q: "Can you provide a certificate of insurance (COI) addressed to my property?", a: "Yes, within 24 hours. COIs listing your property as an additional insured are standard practice for commercial accounts. We can issue COIs for a single property or a portfolio of properties under one account." },
              { q: "What are your after-hours and weekend rates?", a: "The same rate. Starting at $99/hour applies 24/7 for standard service. Emergency dispatch rates (for after-hours calls requiring immediate response) are disclosed upfront and do not quadruple the way many commercial vendors charge." },
              { q: "Do you handle work that requires permits?", a: "Yes. Our licensed technicians pull permits where required — electrical, plumbing, HVAC, and structural work in most jurisdictions. Permit costs are itemized on the estimate. We do not do unpermitted work that should be permitted." },
              { q: "Can you provide W-9s, insurance, and compliance paperwork for procurement?", a: "Yes. Our commercial onboarding team handles W-9, COI, safety documentation, background check verification, and any additional compliance paperwork your procurement process requires. We have worked with Fortune 500 procurement teams and small local HOAs. The paperwork is the same — we just deliver it on your timeline." },
              { q: "Can I assign a dedicated technician to my account?", a: "For recurring accounts, yes. Many commercial clients request the same technician each visit for continuity (the cleaner who knows where everything goes, the HVAC tech who knows the system history). We assign dedicated technicians based on schedule alignment and customer preference." },
              { q: "What happens if a service call does not meet your standard?", a: "You call the account manager, we send someone back at no charge to make it right, and we document what happened to prevent the same issue on the next visit. This is standard practice, not a special case." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.q}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">One Vendor Across Every Facility Service</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Stop Juggling Commercial Vendors</h2>
          <p className="mt-4 text-base text-white/80 mx-auto max-w-2xl">See how our <Link href="/services" className="text-teal-200 underline hover:text-white">40 services</Link> work together, review our <Link href="/pricing" className="text-teal-200 underline hover:text-white">upfront pricing</Link>, or <Link href="/book" className="text-teal-200 underline hover:text-white">book a service today</Link>.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
