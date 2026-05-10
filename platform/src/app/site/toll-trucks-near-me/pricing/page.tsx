// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF, PRICING, CITY_COUNT, STATE_COUNT } from "@/app/site/toll-trucks-near-me/_data/content";

export const metadata: Metadata = {
  title: "Tow Truck Pricing — Light-Duty $95, Medium $150, Heavy $350 Hookup, Flat Per-Mile",
  description: "Tow truck pricing explained. Light-duty $95 + $3.50/mi. Medium-duty $150 + $5/mi. Heavy-duty $350 + $7/mi. Roadside assists $75 flat. Emergency Priority +$50 with 30-minute arrival guarantee. Direct-bill with every major insurance and auto club. No surprise surcharges.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">The Only Tow Truck Dispatch Company That Pays You Back</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Tow Truck Dispatch Pricing<br /><span className="gradient-text">Starting at $95 hookup — That&apos;s It</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One rate. Everything included. Your valuable items earn you money back. Here&apos;s exactly how it works — no fine print, no gotchas.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* ===== THE RATE ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Three Tow Truck Dispatch Plans With Dump Fees Included</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Pick Your Crew — starting at $95 hookup, $150/hr, or $200/hr Emergency</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">1 person crew for small jobs, 2 person crew for most work, or emergency same-day for last-minute deadlines. Every plan includes dump fees and flat upfront pricing. See all <Link href="/services" className="text-teal-700 font-semibold hover:underline">34 services</Link> these plans cover.</p>
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
                <Link href="/book-tow-truck-now" className={`mt-6 inline-block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors font-cta ${"popular" in tier && tier.popular ? "bg-accent text-white hover:bg-accent-dark" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
                  Book Now
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our pricing is straightforward. $95 hookup for a 1-person crew. $150 hookup for a 2-person crew. $200/person/hr for emergency same-day. Not $100 plus a fuel surcharge. Not $100 plus dump fees. Not $100 base with a $50 &quot;heavy item fee&quot; when we pick up your fridge. Our crew pulls up, works the job, and the clock runs at your flat rate from the moment they start loading until they finish the walkthrough. If it takes 47 minutes, you pay the 1 hour minimum. If it takes 2 hours and 15 minutes with a 1-person crew, you pay $225. Simple.</p>
            <p>This is the opposite of how companies like random-number tow operators price things. They look at your stuff, estimate how much truck space it&apos;ll take, and quote you $200-$800. You have no way to verify their volume estimate — and they have every reason to round up. Our model? You watch the clock. There&apos;s nothing to estimate, nothing to dispute, nothing to game. Time is time.</p>
          </div>
        </div>
      </section>

      {/* ===== THE CREDIT ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How the flat upfront pricing Reduces Your Bill</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">flat upfront pricing — Your Stuff Has Value and You Deserve a Cut</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every other tow operator takes your items and resells the good ones for profit. We split the value with you — 50/50. Here&apos;s how the appraisal works, what items qualify, and why this saves you money on every <Link href="/services" className="text-teal-700 font-semibold hover:underline">service we offer</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>As our crew loads your items, they&apos;re trained to spot value. Not just the obvious stuff — yes, your <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">Pottery Barn dining table</Link> has value. But so does that DeWalt drill in the tool drawer, the working <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">dishwasher</Link> you&apos;re replacing, and the <Link href="/services/motorcycle-towing" className="text-teal-700 font-semibold hover:underline">Bowflex</Link> in the corner of the basement. Our crew knows what sells in your local market because they live here and do this every day.</p>
            <p>When they find something with value, they appraise it right there — not in a warehouse later, not behind closed doors. You see the item, you see the comparable sales data, you see the appraised value, and you approve the credit before it goes on your invoice. 50% of the appraised value comes off your bill. A $400 leather sofa = $200 credit. A $300 working fridge = $150 credit. A $200 set of power tools = $100 credit. Credits stack — the more valuable stuff in your cleanout, the less you pay.</p>
            <p>If your credits add up to more than the hours your crew worked, we don&apos;t just zero out the bill. We hand you a check or send you a digital payment — right there, same day. This happens more than you&apos;d think, especially on <Link href="/services/long-distance-towing" className="text-teal-700 font-semibold hover:underline">estate cleanouts</Link> and <Link href="/services/fleet-vehicle-towing" className="text-teal-700 font-semibold hover:underline">office cleanouts</Link> where the density of valuable items is high.</p>
          </div>
        </div>
      </section>

      {/* ===== REAL EXAMPLES ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Real Tow Truck Dispatch Jobs and What They Actually Cost</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Tow Truck Dispatch Cost Examples — See the Math on Real Customer Jobs</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">These aren&apos;t made-up scenarios. These are based on actual jobs our crews handle every week. <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">Garage cleanouts</Link>, <Link href="/services/long-distance-towing" className="text-teal-700 font-semibold hover:underline">estate clearing</Link>, <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">furniture pickup</Link> — here&apos;s what customers actually pay after credits.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                title: "Garage Cleanout",
                location: "Austin, TX",
                crew: "1 Person",
                hours: "2 hrs",
                cost: "$200",
                items: [
                  { name: "Workbench", resale: "$120", credit: "$60" },
                  { name: "Power tools", resale: "$180", credit: "$90" },
                  { name: "Bikes", resale: "$60", credit: "$30" },
                ],
                totalCredits: "$180",
                result: "You pay: $20",
                payout: false,
                compare: "Other companies quoted $450 for the same job",
              },
              {
                title: "Estate Cleanout",
                location: "Brooklyn, NY",
                crew: "2 Person",
                hours: "4 hrs",
                cost: "$1,000",
                items: [
                  { name: "Furniture sets", resale: "$1,800", credit: "$900" },
                  { name: "Appliances", resale: "$600", credit: "$300" },
                  { name: "Electronics & tools", resale: "$1,100", credit: "$550" },
                ],
                totalCredits: "$1,750",
                result: "We pay you: $750",
                payout: true,
                compare: "Other companies quoted $3,500+ and kept all resale value",
              },
            ].map((ex) => (
              <div key={ex.title} className={`rounded-xl border ${ex.payout ? "border-accent" : "border-slate-200"} bg-white p-6`}>
                <h3 className="text-lg font-bold text-slate-900 font-heading">{ex.title}</h3>
                <p className="text-xs text-slate-500">{ex.location}</p>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>{ex.crew} · {ex.hours}</span>
                    <span className="font-bold text-slate-900">{ex.cost}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    {ex.items.map((item) => (
                      <div key={item.name} className="flex justify-between text-slate-600">
                        <span>{item.name} · resale {item.resale}</span>
                        <span className="font-semibold text-teal-700">−{item.credit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-teal-700">
                    <span>Total credits</span>
                    <span>{ex.totalCredits}</span>
                  </div>
                  <div className={`border-t-2 ${ex.payout ? "border-accent" : "border-slate-900"} pt-2 flex justify-between text-lg font-bold ${ex.payout ? "text-accent" : "text-slate-900"}`}>
                    <span>{ex.result.split(":")[0]}</span>
                    <span>{ex.result.split(": ")[1]}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">{ex.compare}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>The garage cleanout is one of our most common jobs — 2 hours of work, a handful of items with resale value, and the customer walks away paying $20 for a job that flat-rate companies quote at $350-$500. The estate cleanout shows what happens when a property is full of quality items — the family didn&apos;t just avoid a $2,000+ bill, they received a $750 check. That&apos;s a $2,750 swing compared to calling random-number tow operators.</p>
            <p>Even on jobs with zero resale value — pure non-running, broken items, construction debris, yard waste — our starting at $95 hookup rate is still competitive or cheaper than flat-rate pricing. A 1-hour job costs $100. A 2-hour job costs $200. Try getting a flat-rate company to clear the same amount for that price. The math always works in your favor.</p>
          </div>
        </div>
      </section>

      {/* ===== ESTIMATED PRICING BY SERVICE ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Estimated Tow Truck Dispatch Cost by Service Type</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Much Does Tow Truck Dispatch Cost? — Estimated Pricing for Every Service</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Based on our average job times and typical upfront quotes across thousands of jobs. Actual cost depends on volume, item value, and crew size. All estimates assume flat upfront pricing applied. <Link href="/services" className="text-teal-700 font-semibold hover:underline">View all 34 services</Link>.</p>

          {/* Residential Cleanouts */}
          <h3 className="mt-10 text-xl font-bold text-slate-900 font-heading">Residential Cleanout Pricing</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Service</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Time</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Crew</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Before Credit</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Credit</th>
                  <th className="py-3 pl-4 font-bold text-teal-700">You Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { service: "Full-Service Tow Truck Dispatch", slug: "emergency-towing", time: "1.5–3 hrs", crew: "1–2 person", before: "$150–$750", credit: "$50–$300", pay: "$100–$450" },
                  { service: "Garage Cleanout", slug: "flatbed-towing", time: "2–3 hrs", crew: "2 person", before: "$500–$750", credit: "$100–$350", pay: "$150–$500" },
                  { service: "Basement Cleanout", slug: "basement-cleanouts", time: "2–4 hrs", crew: "2 person", before: "$500–$1,000", credit: "$100–$400", pay: "$200–$600" },
                  { service: "Attic Cleanout", slug: "attic-cleanouts", time: "1.5–3 hrs", crew: "2 person", before: "$375–$750", credit: "$50–$200", pay: "$175–$550" },
                  { service: "Estate Cleanout", slug: "long-distance-towing", time: "4–8 hrs", crew: "2 person", before: "$1,000–$2,000", credit: "$500–$2,000+", pay: "$0–$1,000*" },
                  { service: "Hoarder Cleanout", slug: "accident-recovery", time: "6–12 hrs", crew: "2 person", before: "$1,500–$3,000", credit: "$200–$800", pay: "$700–$2,200" },
                  { service: "Storage Unit Cleanout", slug: "long-distance-towing", time: "1–2 hrs", crew: "1–2 person", before: "$100–$500", credit: "$50–$200", pay: "$50–$300" },
                ].map((row) => (
                  <tr key={row.slug} className="hover:bg-white/50">
                    <td className="py-3 pr-4"><Link href={`/services/${row.slug}`} className="text-teal-700 font-semibold hover:underline">{row.service}</Link></td>
                    <td className="py-3 px-4 text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 text-slate-600">{row.crew}</td>
                    <td className="py-3 px-4 text-slate-600">{row.before}</td>
                    <td className="py-3 px-4 text-teal-600">{row.credit}</td>
                    <td className="py-3 pl-4 font-bold text-slate-900">{row.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">* Estate cleanouts frequently result in payouts to the customer when item credits exceed the bill.</p>

          {/* Item-Specific */}
          <h3 className="mt-10 text-xl font-bold text-slate-900 font-heading">Single Item &amp; Specialty Removal Pricing</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Service</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Time</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Crew</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Before Credit</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Credit</th>
                  <th className="py-3 pl-4 font-bold text-teal-700">You Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { service: "Furniture Removal", slug: "flatbed-towing", time: "1 hr", crew: "1–2 person", before: "$100–$250", credit: "$50–$200", pay: "$50–$100" },
                  { service: "Appliance Removal", slug: "flatbed-towing", time: "1 hr", crew: "1–2 person", before: "$100–$250", credit: "$75–$250", pay: "$0–$100*" },
                  { service: "Mattress Removal", slug: "mattress-removal", time: "1 hr", crew: "1 person", before: "$100", credit: "$0–$50", pay: "$50–$100" },
                  { service: "Refrigerator Removal", slug: "refrigerator-removal", time: "1 hr", crew: "1–2 person", before: "$100–$250", credit: "$100–$300", pay: "$0–$100*" },
                  { service: "TV & Electronics", slug: "luxury-exotic-towing", time: "1 hr", crew: "1 person", before: "$100", credit: "$25–$200", pay: "$0–$75" },
                  { service: "Exercise Equipment", slug: "motorcycle-towing", time: "1 hr", crew: "1–2 person", before: "$100–$250", credit: "$50–$500", pay: "$0–$100*" },
                  { service: "Piano Removal", slug: "motorcycle-towing", time: "1–2 hrs", crew: "2 person", before: "$250–$500", credit: "$50–$500", pay: "$0–$400" },
                  { service: "Hot Tub Removal", slug: "heavy-duty-towing", time: "2–4 hrs", crew: "2 person", before: "$500–$1,000", credit: "$0", pay: "$500–$1,000" },
                  { service: "Pool Table Removal", slug: "pool-table-removal", time: "1.5–2 hrs", crew: "2 person", before: "$375–$500", credit: "$50–$300", pay: "$75–$450" },
                  { service: "Tire Removal", slug: "tire-removal", time: "1 hr", crew: "1 person", before: "$100", credit: "$0", pay: "$100" },
                ].map((row) => (
                  <tr key={row.slug} className="hover:bg-white/50">
                    <td className="py-3 pr-4"><Link href={`/services/${row.slug}`} className="text-teal-700 font-semibold hover:underline">{row.service}</Link></td>
                    <td className="py-3 px-4 text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 text-slate-600">{row.crew}</td>
                    <td className="py-3 px-4 text-slate-600">{row.before}</td>
                    <td className="py-3 px-4 text-teal-600">{row.credit}</td>
                    <td className="py-3 pl-4 font-bold text-slate-900">{row.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">* Working appliances and quality equipment frequently generate credits that cover the entire bill.</p>

          {/* Structure Removal */}
          <h3 className="mt-10 text-xl font-bold text-slate-900 font-heading">Structure Demolition &amp; Removal Pricing</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Service</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Time</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Crew</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Before Credit</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Credit</th>
                  <th className="py-3 pl-4 font-bold text-teal-700">You Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { service: "Shed Removal", slug: "equipment-transport", time: "2–4 hrs", crew: "2 person", before: "$500–$1,000", credit: "$0–$50", pay: "$450–$1,000" },
                  { service: "Fence Removal", slug: "fence-removal", time: "2–4 hrs", crew: "2 person", before: "$500–$1,000", credit: "$25–$100", pay: "$400–$975" },
                  { service: "Deck Removal", slug: "deck-removal", time: "3–6 hrs", crew: "2 person", before: "$750–$1,500", credit: "$0–$50", pay: "$700–$1,500" },
                  { service: "Trampoline Removal", slug: "trampoline-removal", time: "1–2 hrs", crew: "1–2 person", before: "$100–$500", credit: "$0–$25", pay: "$75–$500" },
                ].map((row) => (
                  <tr key={row.slug} className="hover:bg-white/50">
                    <td className="py-3 pr-4"><Link href={`/services/${row.slug}`} className="text-teal-700 font-semibold hover:underline">{row.service}</Link></td>
                    <td className="py-3 px-4 text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 text-slate-600">{row.crew}</td>
                    <td className="py-3 px-4 text-slate-600">{row.before}</td>
                    <td className="py-3 px-4 text-teal-600">{row.credit}</td>
                    <td className="py-3 pl-4 font-bold text-slate-900">{row.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Construction & Specialty */}
          <h3 className="mt-10 text-xl font-bold text-slate-900 font-heading">Construction &amp; Specialty Removal Pricing</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Service</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Time</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Crew</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Before Credit</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Credit</th>
                  <th className="py-3 pl-4 font-bold text-teal-700">You Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { service: "Construction Debris", slug: "heavy-duty-towing", time: "1–3 hrs", crew: "1–2 person", before: "$100–$750", credit: "$0–$50", pay: "$100–$700" },
                  { service: "Renovation Waste", slug: "renovation-waste-removal", time: "1–3 hrs", crew: "1–2 person", before: "$100–$750", credit: "$25–$150", pay: "$75–$600" },
                  { service: "Yard Waste", slug: "equipment-transport", time: "1–2 hrs", crew: "1–2 person", before: "$100–$500", credit: "$0–$25", pay: "$75–$500" },
                  { service: "Carpet & Flooring", slug: "carpet-flooring-removal", time: "2–4 hrs", crew: "2 person", before: "$500–$1,000", credit: "$0–$200", pay: "$300–$1,000" },
                  { service: "Scrap Metal", slug: "scrap-metal-removal", time: "1–2 hrs", crew: "1–2 person", before: "$100–$500", credit: "$50–$300", pay: "$0–$300*" },
                ].map((row) => (
                  <tr key={row.slug} className="hover:bg-white/50">
                    <td className="py-3 pr-4"><Link href={`/services/${row.slug}`} className="text-teal-700 font-semibold hover:underline">{row.service}</Link></td>
                    <td className="py-3 px-4 text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 text-slate-600">{row.crew}</td>
                    <td className="py-3 px-4 text-slate-600">{row.before}</td>
                    <td className="py-3 px-4 text-teal-600">{row.credit}</td>
                    <td className="py-3 pl-4 font-bold text-slate-900">{row.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">* Scrap metal jobs with high copper/aluminum content regularly result in credits exceeding the bill.</p>

          {/* Commercial */}
          <h3 className="mt-10 text-xl font-bold text-slate-900 font-heading">Commercial Tow Truck Dispatch Pricing</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Service</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Time</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Crew</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Before Credit</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Avg Credit</th>
                  <th className="py-3 pl-4 font-bold text-teal-700">You Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { service: "Office Cleanout", slug: "fleet-vehicle-towing", time: "4–10 hrs", crew: "2 person", before: "$1,000–$2,500", credit: "$500–$5,000+", pay: "$0–$1,500*" },
                  { service: "Foreclosure Cleanout", slug: "foreclosure-cleanouts", time: "2–4 hrs", crew: "2 person", before: "$500–$1,000", credit: "$100–$500", pay: "$200–$700" },
                  { service: "Retail Cleanout", slug: "retail-cleanouts", time: "3–6 hrs", crew: "2 person", before: "$750–$1,500", credit: "$200–$800", pay: "$200–$1,000" },
                  { service: "Warehouse Cleanout", slug: "warehouse-cleanouts", time: "6–12 hrs", crew: "2 person", before: "$1,500–$3,000", credit: "$300–$1,500", pay: "$500–$2,000" },
                  { service: "Hotel Cleanout", slug: "hotel-cleanouts", time: "4–8 hrs", crew: "2 person", before: "$1,000–$2,000", credit: "$300–$1,000", pay: "$300–$1,200" },
                  { service: "Property Management", slug: "property-management-cleanouts", time: "1–3 hrs", crew: "1–2 person", before: "$100–$750", credit: "$50–$300", pay: "$50–$450" },
                  { service: "Church / Nonprofit", slug: "church-nonprofit-cleanouts", time: "3–6 hrs", crew: "2 person", before: "$750–$1,500", credit: "$200–$800", pay: "$200–$1,000" },
                  { service: "School / University", slug: "school-university-cleanouts", time: "4–8 hrs", crew: "2 person", before: "$1,000–$2,000", credit: "$300–$1,200", pay: "$200–$1,200" },
                ].map((row) => (
                  <tr key={row.slug} className="hover:bg-white/50">
                    <td className="py-3 pr-4"><Link href={`/services/${row.slug}`} className="text-teal-700 font-semibold hover:underline">{row.service}</Link></td>
                    <td className="py-3 px-4 text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 text-slate-600">{row.crew}</td>
                    <td className="py-3 px-4 text-slate-600">{row.before}</td>
                    <td className="py-3 px-4 text-teal-600">{row.credit}</td>
                    <td className="py-3 pl-4 font-bold text-slate-900">{row.pay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">* Office cleanouts with quality furniture (Herman Miller, Steelcase) regularly result in payouts to the business.</p>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>All estimates are based on the 1 person crew rate of starting at $95 hookup or 2 person crew rate of $150 hookup. Emergency same-day pricing is $200/person/hr. Actual costs vary by volume, weight, access, and the resale value of your specific items. The &quot;Avg Credit&quot; column reflects what typical customers receive in value-focused dispatch — your actual credit depends on what items you have and their condition. <Link href="/book-tow-truck-now" className="text-teal-700 font-semibold hover:underline">Book now</Link> or <a href={SMS_HREF} className="text-teal-700 font-semibold hover:underline">text us</a> for a quick estimate based on your specific job.</p>
          </div>
        </div>
      </section>

      {/* ===== RATE STIPULATIONS ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Important Pricing Details and Weight Limits</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Rate Stipulations — What&apos;s Included, Weight Limits, and Fine Print</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We keep it simple, but there are a few things to know about each rate. Read this before you <Link href="/book-tow-truck-now" className="text-teal-700 font-semibold hover:underline">book</Link> so there are zero surprises on the day of your pickup.</p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">1 Person Crew — starting at $95 hookup</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>1 hour minimum</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Single items up to 150 lbs</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Best for: furniture, electronics, small cleanouts, single appliances</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Items over 150 lbs require 2 person crew</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Standard scheduling — same-day when available</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Includes 1 truck load</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-accent bg-white p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white">MOST POPULAR</div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">2 Person Crew — $150 hookup</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>1 hour minimum</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Items up to 500 lbs (pianos, safes, hot tubs)</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Best for: full cleanouts, estates, heavy items, demolition</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Items over 500 lbs — call for custom quote</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Standard scheduling — same-day when available</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Includes up to 2 truck loads</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Stair carries, tight access, and disassembly included</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Emergency Same-Day — $200/person/hr</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>1 hour minimum per person</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Guaranteed arrival within 2 hours</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Crew size matched to job (1–3 people)</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Same weight limits as standard crews</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Available evenings, weekends, holidays</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>Best for: move-out deadlines, evictions, last-minute closings</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">•</span>All dump fees and upfront quotes still apply</li>
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Weight limits:</strong> Our 1 person crew handles items up to 150 lbs — that covers most furniture, appliances, and electronics. For items 150–500 lbs (pianos, safes, cast iron tubs, commercial equipment), the 2 person crew is required. Items over 500 lbs need a custom quote — call us and we&apos;ll figure out the best approach.</p>
            <p><strong>Truck loads:</strong> The 1 person crew rate includes 1 truck load per job. The 2 person crew includes up to 2 loads. If your job requires additional loads beyond what&apos;s included, we continue at the same flat rate — no surcharge. We&apos;ll let you know before starting a second trip so there are no surprises.</p>
            <p><strong>Time billing:</strong> We bill in 15-minute increments after the first hour minimum. A job that takes 1 hour and 10 minutes is billed as 1.25 hours. We round to the nearest 15 minutes — never up to the next full hour. The clock starts when we begin loading and stops when we complete the final walkthrough.</p>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE DON'T TAKE ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Hazardous Materials and Items We Cannot Remove</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What&apos;s Not Included — Items We Can&apos;t Haul</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We take almost everything, but federal and state regulations prohibit us from handling certain hazardous materials. Here&apos;s what we can&apos;t remove — and where to take it instead. For everything else, <Link href="/services" className="text-teal-700 font-semibold hover:underline">we&apos;ve got you covered</Link>.</p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-red-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">We Cannot Remove</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Hazardous chemicals &amp; solvents</strong> — paint thinner, acetone, acids, pesticides, pool chemicals</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Asbestos-containing materials</strong> — requires licensed abatement contractor</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Wet paint &amp; lacquers</strong> — dried/solidified paint cans are OK</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Biological &amp; medical waste</strong> — blood, needles, pharmaceuticals, biohazard materials</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Oil drums &amp; fuel tanks</strong> — above-ground and underground storage tanks</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Full propane tanks</strong> — empty tanks are OK</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Ammunition &amp; explosives</strong> — fireworks, flares, gunpowder</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Compressed gas cylinders</strong> — oxygen, acetylene, nitrogen (empty tanks OK)</div></li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✕</span><div><strong>Radioactive materials</strong> — smoke detectors in small quantities are OK</div></li>
              </ul>
            </div>
            <div className="rounded-xl border border-teal-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Where to Dispose of Hazardous Items</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">→</span><div><strong>Household chemicals &amp; paint</strong> — your local HHW (Household Hazardous Waste) collection center. Most counties offer free drop-off days.</div></li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">→</span><div><strong>Asbestos</strong> — contact a licensed asbestos abatement contractor. Required by law in all 50 states.</div></li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">→</span><div><strong>Medical waste</strong> — contact your local health department or use a licensed medical waste hauler.</div></li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">→</span><div><strong>Propane tanks</strong> — many hardware stores and propane dealers accept empties for exchange or recycling.</div></li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">→</span><div><strong>Ammunition</strong> — contact your local police department for safe disposal options.</div></li>
                <li className="flex items-start gap-2"><span className="text-teal-600 mt-0.5">→</span><div><strong>Not sure?</strong> Call us at <a href={PHONE_HREF} className="text-teal-700 font-semibold">{PHONE}</a>. We&apos;ll tell you if we can take it or point you to the right resource.</div></li>
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>If you&apos;re not sure whether an item qualifies, just ask. Our crew will identify any items we can&apos;t take during the walkthrough and let you know before work begins. We&apos;ll never charge you for items we can&apos;t remove. And for everything that&apos;s not on the hazardous list — <Link href="/services/emergency-towing" className="text-teal-700 font-semibold hover:underline">furniture</Link>, <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">appliances</Link>, <Link href="/services/heavy-duty-towing" className="text-teal-700 font-semibold hover:underline">construction debris</Link>, <Link href="/services/equipment-transport" className="text-teal-700 font-semibold hover:underline">yard waste</Link>, <Link href="/services/luxury-exotic-towing" className="text-teal-700 font-semibold hover:underline">electronics</Link>, and everything else — we handle it all.</p>
          </div>
        </div>
      </section>

      {/* ===== VS OTHER COMPANIES ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Tow Truck Dispatch Price Comparison — Us vs Everyone Else</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why starting at $95 hookup Beats Volume-Based Pricing Every Single Time</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">The tow truck service industry has a dirty secret: they&apos;ve been charging you for the service AND keeping 35%+ of your items to resell for profit. Here&apos;s the math on why <Link href="/services" className="text-teal-700 font-semibold hover:underline">our model</Link> always wins — and why theirs was never fair to begin with.</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Every tow truck company in America — random-number tow operators, local tow yards, generic haulers, every local hauler — runs the same play. They charge you $200-$800 per truckload, haul everything away, then sort through your items at their facility. <strong>35% or more of what they took from you gets resold for profit.</strong> Your working fridge, your quality furniture, your power tools — they charged you to take these items and then sold them. You got nothing. They got paid twice. This has been the industry standard for decades, and nobody talked about it until we came along.</p>
            <p>Let&apos;s break down a real scenario. You&apos;ve got a <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">garage full of stuff</Link> — old furniture, tools, a working fridge, some electronics, and general roadside debris. A flat-rate company shows up, eyeballs it, and says &quot;that&apos;s about three-quarters of a truck — $550.&quot; You can&apos;t argue with their estimate because it&apos;s their truck and their judgment. They load it all, drive away, and sell your fridge for $400, your tools for $300, and your furniture for $500. Their take: $550 removal fee + $1,200 in resale = $1,750. Your take: -$550.</p>
            <p>Same garage, same stuff, you call us instead. Our crew takes 2 hours = $200. They appraise the fridge ($400 resale, $200 credit to you), the tools ($300, $150 credit), the furniture ($500, $250 credit). Your credits: $600. Your bill: $200 - $600 = we pay you $400. Your take: +$400. That&apos;s a $950 swing on the exact same job.</p>
            <p>Even when there&apos;s nothing valuable — pure <Link href="/services/heavy-duty-towing" className="text-teal-700 font-semibold hover:underline">construction debris</Link>, <Link href="/services/equipment-transport" className="text-teal-700 font-semibold hover:underline">yard waste</Link>, broken items — 2 hours starting at $95 hookup ($200) beats a flat-rate quote of $350-$500 for the same volume. There is literally no scenario where the other model is cheaper.</p>
          </div>
        </div>
      </section>

      {/* ===== WHAT QUALIFIES FOR CREDIT ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Items That Earn You Money Back During Tow Truck Dispatch</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Items Earn Upfront Quote — And How Much They&apos;re Worth</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Not everything has resale value, but you&apos;d be surprised how much of your roadside issue is actually worth money. Here&apos;s what our crews look for during <Link href="/services/emergency-towing" className="text-teal-700 font-semibold hover:underline">every tow driver job</Link> — and what it typically earns you in your local market.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Furniture ($50-$2,000+ resale):</strong> Solid wood dressers, dining sets, desks, bed frames, bookshelves, leather couches. Brand names like Pottery Barn, West Elm, Restoration Hardware, and Ethan Allen hold 30-60% of retail value. Even mid-range stuff in good condition has buyers. Your credit: 50% of resale = $25-$1,000+ per piece.</p>
            <p><strong>Appliances ($75-$600+ resale):</strong> Working fridges, washers, dryers, ovens, dishwashers. Stainless steel commands higher prices. Landlords and flippers are always buying. <Link href="/services/refrigerator-removal" className="text-teal-700 font-semibold hover:underline">A working Samsung fridge</Link> is worth $300-$600 — that&apos;s $150-$300 back to you.</p>
            <p><strong>Electronics ($25-$800+ resale):</strong> <Link href="/services/luxury-exotic-towing" className="text-teal-700 font-semibold hover:underline">Flat screen TVs</Link> under 5 years, gaming consoles, computers, monitors, audio equipment. Apple products hold value exceptionally well.</p>
            <p><strong>Tools ($25-$500+ resale):</strong> DeWalt, Milwaukee, Makita power tools hold 40-70% of retail for years. Full tool sets, shop equipment, and <Link href="/services/equipment-transport" className="text-teal-700 font-semibold hover:underline">lawn equipment</Link> all have active buyers in your area.</p>
            <p><strong>Everything else:</strong> <Link href="/services/motorcycle-towing" className="text-teal-700 font-semibold hover:underline">Exercise equipment</Link> (Pelotons hold $500+), <Link href="/services/motorcycle-towing" className="text-teal-700 font-semibold hover:underline">musical instruments</Link>, outdoor furniture, grills, bikes, antiques, collectibles — if it has a buyer, you get credit.</p>
            <p><strong>No credit (still removed):</strong> Broken furniture, stained mattresses, construction debris, yard waste, household trash. These still get hauled as part of your starting at $95 hookup — they just don&apos;t generate credit.</p>
          </div>
        </div>
      </section>

      {/* ===== NO HIDDEN FEES ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Zero Hidden Fees, Zero Contracts, Zero Surprises</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">No Hidden Tow Truck Dispatch Fees — What We Quote Is What You Pay</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We don&apos;t do surcharges, add-ons, or &quot;oh we forgot to mention&quot; line items. Here&apos;s every fee that doesn&apos;t exist when you <Link href="/book-tow-truck-now" className="text-teal-700 font-semibold hover:underline">book with us</Link> — and why other companies charge them.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>No dump fees:</strong> Included. Transfer station costs, landfill fees, recycling fees — all baked into the starting at $95 hookup.</p>
            <p><strong>No heavy item surcharge:</strong> Fridges, pianos, safes, hot tubs — same rate. Other companies charge $50-$200 extra for heavy items.</p>
            <p><strong>No stair fee:</strong> Third-floor walkup? Basement? Attic with a pull-down ladder? Same starting at $95 hookup.</p>
            <p><strong>No distance fee:</strong> Doesn&apos;t matter if the dump is 5 miles or 30 miles from your house.</p>
            <p><strong>No minimum truck load:</strong> Got one lamp and a bag of clothes? $100 for the 1 hour minimum. Other companies won&apos;t show up for less than a quarter-truck fee of $150-$250.</p>
            <p><strong>No contracts:</strong> Every job is standalone. No recurring charges, no subscriptions, no cancellation penalties. Call us when you need us. That&apos;s it.</p>
            <p><strong>No weekend/holiday markup:</strong> Saturday morning? Sunday afternoon? Fourth of July? Same starting at $95 hookup. We work 7AM-8PM, 7 days a week, 365 days a year at the same rate.</p>
          </div>
        </div>
      </section>

      {/* ===== AVAILABLE EVERYWHERE ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Same starting at $95 hookup Rate in Every City We Serve</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Tow Truck Dispatch Pricing in {CITY_COUNT}+ Cities — Same Rate, Local Crew, Every Time</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Whether you&apos;re in New York or Nebraska, LA or Little Rock — the rate is starting at $95 hookup. Your local crew knows your area, your dump sites, your resale market. Same pricing, local execution. Find your city on our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations page</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>We don&apos;t charge more in expensive markets or less in rural areas. starting at $95 hookup everywhere. What does vary is your crew&apos;s local knowledge — they know which items sell best in your market, which recycling centers are closest, which charities accept donations in your area. That local expertise means faster jobs and more accurate appraisals, which means lower bills and higher credits for you.</p>
            <p>Same-day booking available in most cities for calls placed before noon. <Link href="/book-tow-truck-now" className="text-teal-700 font-semibold hover:underline">Book online</Link> or call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a>. We&apos;ll confirm pricing, explain the 1 hour minimum, and schedule your pickup. That&apos;s it — no sales pitch, no upsell, no &quot;let me put you on hold while I check with my manager.&quot;</p>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">starting at $95 hookup. Dump Fees Included. flat upfront pricing. Book Now.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Same-day available. No hidden fees. No contracts. Your stuff has value — let us prove it.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/book-tow-truck-now">
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
