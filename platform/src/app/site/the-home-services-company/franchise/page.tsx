// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL, CITY_COUNT, PHONE, PHONE_HREF } from "@/app/site//_data/content";

export const metadata: Metadata = {
  title: "Franchise Opportunity — Home Services Co",
  description: "Own a Home Services Co franchise. 40 home services under one brand. Territory-based opportunities, proven operations, national marketing support.",
  alternates: { canonical: "/franchise" },
};

export default function FranchisePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Franchise Opportunity</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Own a <span className="gradient-text">Home Services Co</span> Franchise</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Territory-based franchise opportunities for entrepreneurs who want to bring 40 home services under one roof to their community. Currently operating in {CITY_COUNT} cities, expanding nationwide.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Franchise Built for Scale</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why This Franchise Is Different</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Our consolidated model means franchise owners operate 40 home services under one brand. See our <Link href="/services" className="text-teal-700 font-semibold hover:underline">full service list</Link>, check our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing model</Link>, and explore our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">nationwide footprint</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Traditional home services franchises typically operate one trade — an HVAC franchise, a plumbing franchise, a cleaning franchise. Home Services Co franchise operates 40 trades under one brand, one phone number, and one customer account system. That consolidation matters because customers don&apos;t want to juggle vendors — and franchise owners with 40 services capture more of each customer&apos;s total home services spend.</p>
            <p>The operating advantage is customer lifetime value. A plumbing-only franchise sees a customer once every few years. A cleaning-only franchise sees them weekly but never for plumbing. Our franchise sees the same customer for their HVAC tune-up, their cleaning, their handyman punch list, their exterior paint job, and every other service on the 40-item menu. One customer relationship, many service events.</p>
            <p>The operating standards are consistent across every trade. Upfront pricing. Licensed and insured technicians. Same-day availability. Consolidated invoicing. Dedicated account management for commercial clients. Franchise owners don&apos;t have to figure any of this out — the playbook is documented and proven across 990 cities.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Franchise Benefits and Support</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What You Get</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every franchise package includes access to our <Link href="/services" className="text-teal-700 font-semibold hover:underline">40 service offerings</Link>, national brand, marketing infrastructure, and operational playbook. Consistent <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing model</Link> across <Link href="/locations" className="text-teal-700 font-semibold hover:underline">all 50 states</Link>.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Proven Model", desc: "Operating in 990 cities with consistent pricing, scheduling, and invoicing across every trade." },
              { title: "40 Services", desc: "One brand, 40 trades, one customer account system. Maximum customer lifetime value." },
              { title: "National Brand", desc: "Leverage Home Services Co brand, website, SEO, and marketing infrastructure from day one." },
              { title: "Training Program", desc: "Comprehensive owner training covering operations, scheduling, quality control, and commercial account management." },
              { title: "Technician Network", desc: "Established relationships with licensed technicians across every trade, in every state we operate." },
              { title: "Territory Protection", desc: "Exclusive territory rights. No other franchise operates in your market." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Who Should Own a Franchise</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Ideal Franchise Owner</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Home services experience helps but isn&apos;t required. See our <Link href="/about" className="text-teal-700 font-semibold hover:underline">company values</Link>, <Link href="/careers" className="text-teal-700 font-semibold hover:underline">career opportunities</Link>, and <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link> for common franchise questions.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our best franchise owners share a few traits: they&apos;re hands-on operators who want to build a local business, they understand customer experience, they&apos;re comfortable coordinating across multiple trades, and they see the opportunity in a consolidated model that&apos;s genuinely different from specialist-only competitors.</p>
            <p>Prior home services experience is not required. We train owners on every aspect of the business — operations, scheduling, technician management, customer service, and financial reporting. What matters is your drive to build something, your commitment to fair dealing, and your ability to lead a small team across multiple trades.</p>
          </div>
        </div>
      </section>

      {/* ===== HOW THE MODEL WORKS ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Unit Economics and Operating Model</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How the Franchise Model Works</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            A franchise isn&apos;t a job — it&apos;s a business. Here&apos;s how territory, fees, and operations come together across <Link href="/services" className="text-teal-700 font-semibold hover:underline">40 services</Link>, <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial accounts</Link>, and <Link href="/who-we-serve" className="text-teal-700 font-semibold hover:underline">every customer segment</Link> we reach.
          </p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every franchise operates an exclusive territory — typically 100,000 to 250,000 households, depending on market density. Within that territory, you are the only Home Services Co franchisee. No other franchisee can advertise into, accept booking requests from, or dispatch technicians into your area. Customers who book through the national site at <Link href="/" className="text-teal-700 font-semibold hover:underline">thehomeservicescompany.com</Link> inside your territory are routed to you automatically.</p>
            <p>The revenue model is straightforward: customers pay the national rate starting at $99/hour (see <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">full pricing</Link>). Franchisees pay a royalty — a percentage of top-line service revenue — plus a marketing contribution that funds national SEO, paid search, and brand campaigns that drive traffic into your territory. The rest is yours: pay your technicians, cover operating costs, take home the margin.</p>
            <p>Initial franchise fee covers onboarding: territory grant, training, initial marketing spend, systems access, brand licensing, and playbook. Ongoing royalty and marketing fees are disclosed in the FDD (Franchise Disclosure Document) — a legally required document you&apos;ll receive before you sign anything. We do not pitch franchises. We disclose terms and let the numbers decide.</p>
            <p>A franchise typically needs two things working from day one: a booking engine (we provide — integrated with our national site, scheduler, and dispatch) and a technician bench (you hire — we support with recruiting playbooks, interview guides, and certification pathways). Most franchisees start with three to six technicians across the highest-demand trades (<Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link>, <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman</Link>, <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">cleaning</Link>) and expand the bench as demand grows.</p>
          </div>
        </div>
      </section>

      {/* ===== TRAINING ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Four-Week Owner Training Program</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Training Program</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">No prior home services background required. Owners complete a structured four-week program before opening. Additional ongoing training covers <Link href="/careers" className="text-teal-700 font-semibold hover:underline">technician development</Link>, <Link href="/partnerships" className="text-teal-700 font-semibold hover:underline">partnership programs</Link>, and <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial accounts</Link>.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { week: "Week 1", title: "Operating Fundamentals", desc: "Booking, scheduling, dispatch, upfront pricing, estimate-to-invoice workflow, customer communication standards, and the on-call framework for emergencies." },
              { week: "Week 2", title: "Technician Management", desc: "Recruiting, interviewing, licensing verification, onboarding paperwork, performance standards, ride-alongs, and the progressive discipline framework." },
              { week: "Week 3", title: "Sales and Commercial", desc: "Commercial account development, recurring-service agreements, facility management pitches, property manager outreach, and the partnership program playbook." },
              { week: "Week 4", title: "Finance and Compliance", desc: "P&L literacy, cash flow management, insurance renewals, licensing calendars, permit coordination, and the monthly reporting package every franchise submits." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">{item.week}</p>
                <h3 className="mt-2 text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECHNOLOGY AND MARKETING ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Technology, Marketing, and Lead Flow</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Every System You Need, Built In</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Franchisees don&apos;t cobble together tools. Everything runs on the same stack the corporate operation uses, across <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT} cities</Link>, <Link href="/services" className="text-teal-700 font-semibold hover:underline">40 services</Link>, and every <Link href="/who-we-serve" className="text-teal-700 font-semibold hover:underline">customer segment</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>National lead flow.</strong> The corporate site, SEO, and paid-search program drive inbound requests. Every request inside your territory is routed to your dispatcher — usually the same day, usually with zero local marketing required from you on day one. Your local marketing spend is additive, not foundational.</p>
            <p><strong>Booking and dispatch.</strong> Customers book through the national site or phone, the lead hits your dispatcher&apos;s queue, the system confirms arrival windows, and technicians get job packets on their phone. All of it is tracked — arrival time, on-site time, parts used, signed approval on change orders, payment captured.</p>
            <p><strong>Customer account system.</strong> Every customer in your territory has a profile in the shared system — service history, preferred technician, payment methods, property notes. When they come back for a different trade (and they do), the next tech already knows the property. This is the consolidation advantage in practice.</p>
            <p><strong>Reporting and analytics.</strong> Revenue, utilization, average ticket, recurring-service mix, complaint rate, response time, and technician performance — all surfaced in a dashboard you and the corporate team both see. This is how we catch problems early and share what&apos;s working across the network.</p>
            <p><strong>Local marketing support.</strong> National marketing drives the big funnel. For local push — community events, sponsorships, neighborhood postcards, Google Business Profile optimization, local review strategy — we provide playbooks and a field marketing manager who reviews your plan quarterly.</p>
          </div>
        </div>
      </section>

      {/* ===== FINANCIAL QUALIFICATIONS ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Financial Fit and Qualifications</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Who Qualifies Financially</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We do not approve franchises to owners who are underfunded on day one. That&apos;s the fastest way to destroy value for everyone. Here&apos;s the framework — detailed numbers are in the FDD, available after initial <Link href="/contact" className="text-teal-700 font-semibold hover:underline">qualification conversation</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Liquid capital:</strong> enough to cover the franchise fee plus six months of operating expenses before you expect to reach breakeven. The exact number varies by market size and how aggressively you staff in the first 90 days, but the minimum is typically low six figures in liquid (non-retirement, non-home-equity) capital.</p>
            <p><strong>Net worth:</strong> we want to know you can weather a slow quarter without folding the business. Not because slow quarters are common, but because any service business has them occasionally, and the franchises that survive them are the ones with a financial cushion.</p>
            <p><strong>Credit and background:</strong> standard background check, credit review, and verification of anything you claim about business or professional history. We are not filtering for perfect credit — we are filtering for honest disclosure.</p>
            <p><strong>Operating role:</strong> we prefer owner-operators. Absentee franchises exist in some concepts. Not in ours. You either work the business daily for the first two to three years, or you hire a dedicated general manager whose comp is tied to business performance. The worst franchise outcomes are always the ones where the owner wasn&apos;t in the building.</p>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Common Franchise Questions</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Franchise FAQ</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">More in our general <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link>, or reach out through <Link href="/contact" className="text-teal-700 font-semibold hover:underline">contact</Link>. Want to see the operating side? Browse <Link href="/services" className="text-teal-700 font-semibold hover:underline">services</Link>, <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>, or our <Link href="/about" className="text-teal-700 font-semibold hover:underline">about page</Link>.</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            {[
              { q: "Do I need home services experience?", a: "No. Our best-performing franchisees come from a mix of backgrounds — former executives, military veterans, tradespeople, and first-time business owners. What matters is operating discipline, customer obsession, and the willingness to be in the field for the first two years." },
              { q: "How long from signing to opening?", a: "Typically 90 to 120 days. That covers FDD review, lease or workspace setup, technician recruiting, licensing in applicable trades, system onboarding, and the four-week owner training. Some markets open faster, some slower depending on local licensing timelines." },
              { q: "Who owns the customer relationship?", a: "You do, inside your territory. Corporate owns the brand, the national customer database, and national accounts that span multiple territories. Within your territory, every individual customer relationship is yours — and every referral, repeat visit, and recurring agreement generates revenue you capture." },
              { q: "Can I sell the franchise later?", a: "Yes. Franchise agreements include transfer terms. Transfers require corporate approval (the buyer must qualify the same way you did), but we have a structured process and have approved resales in multiple markets. This is an asset you can build and exit." },
              { q: "What if my territory isn&apos;t a good fit after a few years?", a: "We have a termination process defined in the FDD. It is not something either party wants — but it exists, and the terms are known on day one. Most underperforming franchises are coached back to performance through field support rather than terminated." },
              { q: "Can I own more than one territory?", a: "Yes, and many of our most successful franchisees operate multiple territories. Multi-unit ownership requires demonstrated performance in the first unit before additional territories are granted — we do not approve speculative multi-unit deals with no operating track record." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.q}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NEXT STEPS ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Discovery Process</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Next Steps</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Four stages from inquiry to signed agreement. No pressure — the filter is mutual fit.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Inquiry Call", desc: "30-minute conversation. We learn about your background, goals, and target market. You ask anything about the model, economics, or expectations." },
              { step: "2", title: "FDD Review", desc: "We send the Franchise Disclosure Document. Federal law requires a 14-day review period before you can sign anything. Read it with a franchise attorney if you want independent counsel." },
              { step: "3", title: "Validation Calls", desc: "Talk to existing franchisees — we introduce you to three to five operators at different stages and in different market sizes. No scripts, no filters." },
              { step: "4", title: "Discovery Day", desc: "Come to our corporate operation for a full day. Meet the support team, ride along with a dispatcher, shadow a technician, and sit with leadership. If we&apos;re both still in after that day, we move to signing." },
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

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Start Your Home Services Business Today</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Interested? Let&apos;s Talk.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Use our <Link href="/contact" className="text-teal-200 font-semibold hover:underline">contact form</Link> to request our franchise information packet and schedule a discovery call. You can also browse our <Link href="/services" className="text-teal-200 font-semibold hover:underline">full service menu</Link>, or learn more <Link href="/about" className="text-teal-200 font-semibold hover:underline">about us</Link>.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/contact"><span className="inline-block rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-dark font-cta">Request Franchise Info</span></Link>
            <a href={PHONE_HREF}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
