import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF, PRICING, CITY_COUNT } from "@/app/site/the-home-services-company/_data/content";

export const metadata: Metadata = {
  title: "Home Services Pricing — Starting at $99/Hour, Upfront Pricing, No Hidden Fees",
  description: "Home services pricing explained. Starting at $99/hour with upfront written estimates, itemized parts and materials, and invoices that match the estimate. No surcharges, no surprises, 40 services under one roof.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Honest, Upfront Home Services Pricing</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services Pricing<br /><span className="gradient-text">Starting at $99/Hour</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One hourly rate across 40 home services. Upfront written estimates before any work begins. Parts and materials itemized. The invoice at the end matches the estimate at the start.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Pricing Plans</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Standard, Recurring, and Emergency — All Starting at $99/Hour</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Whether you need a one-time service, an ongoing recurring schedule, or urgent same-day dispatch — the starting rate is $99/hour across <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 40 services</Link>.</p>
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
          <div className="mt-10 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Pricing is simple: $99/hour across 40 home services, with parts and materials itemized up front. Before any technician touches a tool at your home, you see a written estimate. You approve it, and work begins. The invoice at the end matches the estimate at the start. No mystery shop fees, no &ldquo;fuel surcharges,&rdquo; no weekend or holiday premiums.</p>
            <p>If scope changes during the job — because something unexpected comes up — we stop, explain the change, and get your approval before continuing. There are no &ldquo;while we were here&rdquo; add-ons billed after the fact. This is basic professional practice, and it&apos;s rare enough in the home services industry that it&apos;s become our primary differentiator.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How Upfront Pricing Works</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Invoice Matches the Estimate — Every Time</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Written estimates before any work begins. Parts itemized. Labor clear. No surprises. Here&apos;s how it actually works on every job across <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 40 services</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Step 1 — You call, text, or book online. Describe the service you need. Our scheduler asks clarifying questions and gives you a starting rate ($99/hour) plus an initial estimate range based on what you&apos;ve described.</p>
            <p>Step 2 — Our technician arrives at your scheduled window, walks through the job with you, and gives you a final written estimate before any work begins. Labor at $99/hour, parts and materials itemized, and a total you approve.</p>
            <p>Step 3 — You approve the estimate, and work begins. If the scope changes during the job because something unexpected comes up, we stop, explain the change, and get your approval before continuing.</p>
            <p>Step 4 — Work gets completed to the agreed scope. At the end, the invoice itemizes what was done and what you&apos;re paying for. The total matches what you approved — no mystery charges, no shop fees, no &ldquo;fuel surcharge&rdquo; appearing for the first time on the final bill.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Pricing Examples Across Services</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Typical Home Service Costs — Real Examples</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Based on typical job durations across our service categories. Actual costs depend on scope, parts, and materials. See <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 40 services</Link> for details.</p>

          <h3 className="mt-10 text-xl font-bold text-slate-900 font-heading">Common Service Pricing Ranges</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Service</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Typical Time</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Labor</th>
                  <th className="py-3 pl-4 font-bold text-teal-700">Plus Parts/Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { service: "HVAC Tune-Up", slug: "hvac-services", time: "1–2 hrs", labor: "$99–$198", parts: "None for tune-up; repairs itemized" },
                  { service: "Plumbing Repair", slug: "plumbing", time: "1–2 hrs", labor: "$99–$198", parts: "Fixtures and parts at cost" },
                  { service: "Electrical (outlet, fixture)", slug: "electrical", time: "1 hr", labor: "$99", parts: "Fixtures and parts at cost" },
                  { service: "Interior Painting (room)", slug: "painting", time: "4–8 hrs", labor: "$396–$792", parts: "Paint and supplies itemized" },
                  { service: "House Cleaning (standard)", slug: "house-cleaning", time: "2–4 hrs", labor: "$198–$396", parts: "Supplies included" },
                  { service: "Handyman (punch list)", slug: "handyman-services", time: "1–2 hrs", labor: "$99–$198", parts: "Parts itemized when needed" },
                  { service: "Drywall Repair", slug: "drywall-repair", time: "1–3 hrs", labor: "$99–$297", parts: "Materials itemized" },
                  { service: "Appliance Repair", slug: "appliance-repair", time: "1–2 hrs", labor: "$99–$198", parts: "Replacement parts at cost" },
                  { service: "Gutter Cleaning", slug: "gutter-cleaning", time: "1–2 hrs", labor: "$99–$198", parts: "None" },
                  { service: "Lawn Care (weekly)", slug: "lawn-care", time: "1–2 hrs", labor: "$99–$198", parts: "None; seasonal packages available" },
                ].map((row) => (
                  <tr key={row.slug} className="hover:bg-white/50">
                    <td className="py-3 pr-4"><Link href={`/services/${row.slug}`} className="text-teal-700 font-semibold hover:underline">{row.service}</Link></td>
                    <td className="py-3 px-4 text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 text-slate-600">{row.labor}</td>
                    <td className="py-3 pl-4 text-slate-600">{row.parts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-10 text-xl font-bold text-slate-900 font-heading">Project Pricing — Larger Scopes</h3>
          <p className="mt-2 text-sm text-slate-500">Larger projects are quoted as complete written scopes rather than strictly hourly. You see the full project cost — labor, materials, permits, and any subcontracted specialties — before work begins.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Project Type</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Typical Scope</th>
                  <th className="py-3 pl-4 font-bold text-teal-700">Pricing Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { service: "Kitchen Remodeling", slug: "kitchen-remodeling", scope: "Full or partial kitchen", pricing: "Written project scope with milestones" },
                  { service: "Bathroom Remodeling", slug: "bathroom-remodeling", scope: "Full or partial bathroom", pricing: "Written project scope with milestones" },
                  { service: "Flooring Installation", slug: "flooring-installation", scope: "Per room or full home", pricing: "Labor at $99/hr + materials itemized" },
                  { service: "Roofing Replacement", slug: "roofing", scope: "Full tear-off and replacement", pricing: "Complete project quote with permits" },
                  { service: "Siding Installation", slug: "siding-installation", scope: "Full or partial exterior", pricing: "Complete project quote with materials" },
                  { service: "Deck Building", slug: "deck-building", scope: "New deck or full replacement", pricing: "Complete project quote with permits" },
                  { service: "Solar Installation", slug: "solar-installation", scope: "Residential solar + battery", pricing: "Detailed proposal with ROI modeling" },
                  { service: "Water Damage Restoration", slug: "water-damage-restoration", scope: "Extraction, drying, restoration", pricing: "Phased scope with insurance coordination" },
                ].map((row) => (
                  <tr key={row.slug} className="hover:bg-white/50">
                    <td className="py-3 pr-4"><Link href={`/services/${row.slug}`} className="text-teal-700 font-semibold hover:underline">{row.service}</Link></td>
                    <td className="py-3 px-4 text-slate-600">{row.scope}</td>
                    <td className="py-3 pl-4 text-slate-600">{row.pricing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>All estimates are based on the standard rate of $99/hour. For projects requiring parts, fixtures, materials, or permits, those costs are itemized up front before any work begins. Larger projects are quoted as complete written scopes rather than strictly hourly — you see the full project cost before committing. <Link href="/book" className="text-teal-700 font-semibold hover:underline">Book now</Link> or <a href={SMS_HREF} className="text-teal-700 font-semibold hover:underline">text us</a> for a quick estimate based on your specific job.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">No Hidden Fees, No Surprises</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Every Fee That Does Not Exist on Our Invoices</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We don&apos;t do surcharges, add-ons, or &ldquo;oh we forgot to mention&rdquo; line items. Here&apos;s what you won&apos;t see on an invoice from Home Services Co.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>No weekend or holiday surcharges.</strong> Saturday morning, Sunday afternoon, Fourth of July — same starting rate of $99/hour.</p>
            <p><strong>No &ldquo;shop fees.&rdquo;</strong> Some home service companies add 5–15% &ldquo;shop fees&rdquo; to invoices without explanation. We don&apos;t.</p>
            <p><strong>No &ldquo;fuel surcharges.&rdquo;</strong> Fuel is part of doing business, not a surprise line item.</p>
            <p><strong>No mystery diagnostic fees that don&apos;t apply to repair.</strong> When we charge for diagnostics (e.g., HVAC, appliance repair), the fee applies toward the repair if you proceed.</p>
            <p><strong>No &ldquo;while we were here&rdquo; add-ons.</strong> If additional work comes up during the job, we stop and get your approval before continuing. No surprises on the final invoice.</p>
            <p><strong>No contracts or recurring charges</strong> unless you specifically set up a recurring service account. Every one-time job is standalone.</p>
            <p><strong>No &ldquo;emergency rate&rdquo; that quadruples the hourly.</strong> Emergency same-day dispatch has a clearly disclosed dispatch line item on top of the $99/hour rate — not a bundled multiplier that obscures what you&apos;re paying for.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Same Rate in Every City We Serve</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Home Services Pricing in {CITY_COUNT} Cities — Same Rate, Local Technicians</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Starting at $99/hour in every market. Local technicians with local knowledge, backed by consistent national pricing. Find your city on our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations page</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>The starting rate is the same everywhere we operate — New York, Los Angeles, rural Vermont, the Arizona desert. What varies is the technician&apos;s local knowledge: the building codes, the permit processes, the supply houses, and the regional quirks that keep jobs moving. Consistent pricing, local execution.</p>
            <p>Same-day booking available in most cities for calls placed before noon. <Link href="/book" className="text-teal-700 font-semibold hover:underline">Book online</Link> or call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a>. The scheduler will confirm the rate, clarify any job specifics, and lock in your appointment.</p>
          </div>
        </div>
      </section>

      {/* ===== WHY PRICING TRANSPARENCY MATTERS ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Why We Price This Way</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Pricing Problem Most of the Industry Created</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Pricing opacity is the single biggest customer complaint in home services. Here&apos;s why — and why <Link href="/about" className="text-teal-700 font-semibold hover:underline">we decided to operate differently</Link> from day one.</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The home services industry built its pricing model around two goals: maximize per-job revenue, and minimize customer price comparison. That sounds harsh, but it&apos;s the honest description of how &ldquo;flat-rate pricing&rdquo; spread through HVAC, plumbing, and electrical starting in the 1990s. The pitch: &ldquo;We give you a fixed price so you know exactly what you&apos;re paying.&rdquo; The reality: the fixed price is calculated from a proprietary book that marks up labor 3-5× and parts 4-8×, structured so that the same repair costs wildly different amounts at different companies with no way for customers to tell why.</p>
            <p>Hourly pricing with itemized parts has the opposite property: it&apos;s comparable. $99/hour at our company is comparable to $120/hour somewhere else. Parts at cost plus disclosed markup is comparable to parts at some other markup. When pricing is comparable, customers can shop. When customers can shop, companies compete on actual value — not on the cleverness of their book.</p>
            <p>There is a reason most of the industry dislikes this transparency. It forces real competition. It pulls back the curtain on markups that were designed to be invisible. And it makes the ugly math of &ldquo;this $40 part is on your invoice at $320&rdquo; visible in a way that flat-rate pricing specifically hides. We think that transparency is the right direction. Customers do too — which is why our repeat-customer rate runs meaningfully ahead of the industry average across <Link href="/services" className="text-teal-700 font-semibold hover:underline">every trade we offer</Link>.</p>
            <p>You do not have to take our word for any of this. Call a local HVAC company and ask for their hourly rate. Most will refuse to give one — they&apos;ll tell you the technician has to see the job first, then quote a flat-rate number. Call us and ask: it&apos;s $99/hour starting rate. That difference, repeated across a million service calls, is why so many homeowners end up frustrated with the industry — and why the <Link href="/blog" className="text-teal-700 font-semibold hover:underline">Know Before You Hire series</Link> exists.</p>
          </div>
        </div>
      </section>

      {/* ===== WHAT'S NOT INCLUDED ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Honest About What&apos;s Labor vs What&apos;s Not</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What the $99 Covers — And What It Doesn&apos;t</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">The $99/hour rate is the labor rate for a licensed technician. Here&apos;s exactly what that covers and what is billed separately (always itemized on the written estimate before any work begins).</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Included at $99/hour:</strong> A licensed technician&apos;s time while they are actively working on the job at your property. Diagnostic time, hands-on work time, clean-up time, and the walk-through at the end. Standard tools and consumables (tape, fasteners, basic materials the technician carries on the truck). Professional protective gear and drop cloths. The scheduler&apos;s time booking the job, the dispatcher&apos;s time routing the technician, and the back-office support that runs estimates, invoicing, and the 24-hour COI turnaround.</p>
            <p><strong>Billed separately (itemized on the estimate):</strong> Parts and materials used on the job — fixtures, replacement components, paint, flooring, specific supplies. Permits required by your local jurisdiction. Specialty equipment rentals for non-standard jobs (e.g., scaffolding, lift rentals). Subcontracted specialty work (e.g., gas line certification, low-voltage specialists, structural engineering when required). Disposal fees for trades where materials require licensed disposal (HVAC refrigerant, hazardous materials). Emergency after-hours dispatch fees for calls requiring immediate response outside standard dispatch windows — always disclosed upfront on the call, never added to the invoice after the fact.</p>
            <p><strong>Not billed at all:</strong> Travel time to and from your property. Drive-time between jobs. Vehicle fuel (we do not do fuel surcharges). Shop fees (we do not do shop fees). Weekend or holiday premiums (we do not charge more on Saturday than Tuesday). Credit card processing (we absorb it — not added to your total). Any fee that was not disclosed on the written estimate before work began.</p>
            <p>The simple rule: if it&apos;s not on the estimate, it is not on the invoice. Compare that to the industry baseline, where &ldquo;fuel surcharges,&rdquo; &ldquo;shop fees,&rdquo; and weekend premiums routinely add 12-25% to final invoices that were never quoted upfront. See the broader industry comparison in our <Link href="/blog/how-home-service-pricing-works" className="text-teal-700 font-semibold hover:underline">pricing guide</Link> or <Link href="/blog/hidden-fees-homeowners-miss" className="text-teal-700 font-semibold hover:underline">hidden fees article</Link>.</p>
          </div>
        </div>
      </section>

      {/* ===== COMMERCIAL PRICING ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Commercial, Multi-Location, and Franchise Pricing</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Pricing for Businesses and Property Managers</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Commercial and multi-location accounts use the same $99/hour starting rate, with additional structures (retainers, flat-rate projects, master service agreements) layered on. See our <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial page</Link> for the full service menu, and <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property manager program</Link> for portfolio pricing.</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Standard hourly at published rate.</strong> For commercial accounts with irregular service needs, the $99/hour published rate applies the same way it does for residential. No minimum commitment, no monthly retainer required. Best for small businesses, storefronts, and occasional facility needs.</p>
            <p><strong>Flat-rate project pricing.</strong> For scoped commercial projects — a full-office paint job, storefront pressure wash and window-clean cycle, warehouse concrete repair — we bid a fixed total before work begins. You see labor, materials, permits, and subcontracted specialties itemized, then a single total. Scope changes go through formal written change orders.</p>
            <p><strong>Monthly retainer (recurring service agreement).</strong> For businesses with steady, predictable service needs — nightly cleaning, weekly landscaping, monthly preventive HVAC — we structure a fixed monthly retainer with a defined scope of work. Consolidated monthly invoicing, priority dispatch, dedicated account manager. Work outside the retainer scope is billed at $99/hour with priority scheduling.</p>
            <p><strong>Master service agreement (portfolio accounts).</strong> For property managers, multi-location retailers, hospitality groups, and other portfolio owners, we use a master service agreement that covers pricing, insurance, compliance, and response-time commitments across the full portfolio. One contract, any number of properties, consolidated invoicing per entity. Contact us through <Link href="/contact" className="text-teal-700 font-semibold hover:underline">our contact form</Link> or <Link href="/book" className="text-teal-700 font-semibold hover:underline">booking</Link> to start the MSA conversation.</p>
          </div>
        </div>
      </section>

      {/* ===== PRICING FAQ ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Pricing Questions We Get Most Often</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Pricing FAQ</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">More in our full <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link>, or dive deeper with the <Link href="/blog" className="text-teal-700 font-semibold hover:underline">Know Before You Hire series</Link>.</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-6">
            {[
              { q: "Is there a minimum charge?", a: "There is a one-hour minimum on scheduled service calls. Shorter jobs (a single light fixture swap, a single toilet flapper) are still billed at the one-hour minimum of $99 plus any parts. For routine recurring service agreements, the minimum does not apply because the visit schedule is already fixed." },
              { q: "How does diagnostic pricing work?", a: "For trades where diagnosis is distinct from repair (HVAC, appliance repair, some electrical troubleshooting), the first hour of diagnostic time is at the standard $99 rate. If you approve the repair quote, that diagnostic charge applies toward the repair total. If you decline the repair, you pay for the diagnostic time only — no trap where the diagnostic fee evaporates if you proceed and then reappears if you don&apos;t." },
              { q: "What about weekends, evenings, and holidays?", a: "Same rate. $99/hour on Saturday morning, Sunday afternoon, Christmas Eve, July 4th — any day, any hour within our scheduled dispatch windows. The industry-standard practice of doubling rates on weekends is not something we do. For true emergency dispatch (same-day, outside normal windows, urgent response), a disclosed emergency dispatch fee is added to the standard hourly — always disclosed upfront, never on the invoice for the first time." },
              { q: "How are parts and materials priced?", a: "Parts and materials are billed at our cost with a disclosed markup. The markup covers sourcing, warranty handling, and return risk — it is not 400-800% like some flat-rate shops run. Every item is itemized on the written estimate before work begins, and the invoice lines match the estimate." },
              { q: "Do you offer financing?", a: "For larger projects (roof replacement, HVAC system replacement, kitchen or bathroom remodels, solar installation), we offer financing through third-party partners. Terms depend on credit qualification. For standard hourly services under a few thousand dollars, customers typically pay at time of service with card, check, or ACH. We do not require financing applications for routine service." },
              { q: "Can I get a quote without scheduling a visit?", a: "For simple, well-defined jobs (a single electrical outlet, a specific faucet replacement, a known plumbing leak), yes — call or <a href=\"/book\" class=\"text-teal-700 font-semibold hover:underline\">book online</a> and the scheduler will give you a rate plus estimated duration. For more complex jobs, an on-site estimate is more accurate — and free. The written estimate is locked in before any work begins." },
              { q: "What if I think the final invoice is wrong?", a: "You call the account manager (or the scheduler if you do not have an account manager), we review the estimate versus the invoice line by line with you, and we correct any discrepancy. The invoice matching the estimate is a hard standard — if it does not, we fix it. This happens very rarely because the written estimate is the contract, but when it does, the answer is always the same: we correct, not argue." },
              { q: "Does pricing vary by city or state?", a: "The starting rate is $99/hour in every market we operate. What varies is the technician&apos;s local knowledge (building codes, permit processes, supply houses) and the availability of certain specialty services in smaller markets. See our <a href=\"/locations\" class=\"text-teal-700 font-semibold hover:underline\">full city list</a> to find your market." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.q}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: item.a }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Starting at $99/Hour. Upfront Pricing. No Hidden Fees.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            40 home services, same-day availability, licensed and insured technicians. One vendor, one invoice, one standard of service.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/book">
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Book Now</span>
            </Link>
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Text {PHONE}</span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {PHONE}</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
