import Link from "next/link";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { PricingCalculator } from "@/app/site/theroadsidehelper/_components/PricingCalculator";
import { PHONE, PHONE_HREF, PRICING, CITY_COUNT, STATE_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "Roadside Assistance Pricing Near Me — $149/hr Flat 24/7 | (888) 944-3001",
  description:
    "Roadside assistance pricing: flat $149/hr with 1-hour minimum, same rate overnights/weekends/holidays. No memberships, no surcharges. Call (888) 944-3001 nationwide.",
  keywords: [
    "roadside assistance pricing",
    "roadside cost near me",
    "$149/hr roadside",
    "flat rate roadside",
    "no membership roadside",
    "cheap roadside assistance",
  ],
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">Pricing</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Roadside Assistance Pricing — <span className="text-amber-300">Flat $149/hr, 24/7, No Membership</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One flat rate. 1-hour minimum. Same overnight, weekends, holidays. No memberships, no surcharges, no contracts.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="bg-section-white py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <PricingCalculator />
        </div>
      </section>

      {/* The Rate */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">How It Bills</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Rate Structure — Plain and Simple</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>The base rate:</strong> $149 per hour. 1-hour minimum. Most roadside calls — jump-starts, tire changes, lockouts — finish inside that minimum, which means the minimum is also the maximum for the typical job. If your situation is more complex, the technician quotes the additional time before continuing.</p>
            <p><strong>What&apos;s included:</strong> the dispatch and arrival, the time on scene to perform the service, standard equipment (commercial jump pack, breaker bar, lockout tools, fuel container — whatever fits the service), and the post-service confirmation that the vehicle is running.</p>
            <p><strong>What&apos;s billed separately at cost:</strong> tow mileage past 5 miles (billed at the local per-mile rate, no markup), fuel for fuel-delivery calls (billed at pump price), replacement batteries (billed at retail price plus install time). Nothing inflated.</p>
            <p><strong>When you call:</strong> the dispatcher confirms the rate before the technician rolls. When the tech arrives, they confirm the rate again before starting work. Nothing is added to your bill that wasn&apos;t agreed to first.</p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Service Tiers</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Same Rate, Different Service Types</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => {
              const isPopular = "popular" in tier && tier.popular;
              return (
                <div key={key} className={`relative rounded-xl border bg-white p-6 ${isPopular ? "border-emerald-700 ring-2 ring-emerald-700/30" : "border-slate-200"}`}>
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white font-cta">Most Common</span>
                  )}
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{tier.label}</h3>
                  <p className="mt-3 text-4xl font-bold text-slate-900 font-heading">{tier.price}</p>
                  <p className="text-xs text-slate-500">{tier.unit}</p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-emerald-700 mt-0.5">✓</span>
                        <span className="text-slate-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Real-world examples */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Real-World Examples</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Actual Roadside Calls Cost</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Real call scenarios with actual costs. No marketing fluff.</p>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                title: "Jump-Start, Dead Battery",
                location: "Austin, TX — 7am, freezing",
                time: "25 minutes on scene",
                billed: "1-hour minimum",
                total: "$149",
                note: "Technician ran an alternator check after the jump — alternator was fine. No additional cost.",
              },
              {
                title: "Flat Tire, Spare Swap",
                location: "Brooklyn, NY — Saturday afternoon",
                time: "35 minutes on scene",
                billed: "1-hour minimum",
                total: "$149",
                note: "Standard rate. No weekend surcharge.",
              },
              {
                title: "Car Lockout",
                location: "Denver, CO — Sunday night, 9pm",
                time: "12 minutes on scene",
                billed: "1-hour minimum",
                total: "$149",
                note: "Same rate Sunday night as Tuesday afternoon. No after-hours fee.",
              },
              {
                title: "Fuel Delivery, 3 Gallons",
                location: "Phoenix, AZ — Highway shoulder",
                time: "20 minutes on scene",
                billed: "1-hour minimum + $11 fuel",
                total: "$111",
                note: "Fuel at local pump price ($3.65/gal). No emergency markup.",
              },
              {
                title: "Local Tow, 7 Miles",
                location: "Chicago, IL — Monday morning",
                time: "55 minutes",
                billed: "1-hour minimum + 2 miles past 5 included",
                total: "$108",
                note: "$4 per additional mile past the 5-mile included distance.",
              },
              {
                title: "On-Site Battery Replacement",
                location: "Miami, FL — Tuesday evening",
                time: "30 minutes",
                billed: "1-hour minimum + $159 battery",
                total: "$259",
                note: "Group 35 battery at retail price ($159). No markup. Old battery recycled at no cost.",
              },
              {
                title: "Winch-Out, Soft Shoulder",
                location: "Seattle, WA — After heavy rain",
                time: "30 minutes on scene",
                billed: "1-hour minimum",
                total: "$149",
                note: "Standard rate covers winch service. No 'recovery fee.'",
              },
              {
                title: "RV Roadside, Flat Tire",
                location: "Atlanta, GA — Vacation route",
                time: "55 minutes (larger tire)",
                billed: "1-hour minimum",
                total: "$149",
                note: "RV-trained tech, RV-sized tools, no specialty surcharge.",
              },
            ].map((ex) => (
              <div key={ex.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{ex.title}</h3>
                <p className="text-xs text-slate-500">{ex.location}</p>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>On scene</span>
                    <span className="font-semibold">{ex.time}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Billed</span>
                    <span>{ex.billed}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-bold text-emerald-700">
                    <span>Total</span>
                    <span>{ex.total}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">{ex.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No surcharges */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">What&apos;s Not on the Bill</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">No Surcharges, Ever</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {[
              "No annual membership dues",
              "No per-call trip fee to your location",
              "No after-hours surcharge",
              "No weekend surcharge",
              "No holiday premium",
              "No 'emergency dispatch' fee",
              "No fuel-delivery markup beyond pump price",
              "No 'specialty vehicle' surcharge",
              "No locking-lug-nut fee",
              "No contract early-termination fee (we don't have contracts)",
              "No autoplay-renew surprises",
              "No quality-fee deductions",
            ].map((s) => (
              <div key={s} className="rounded-lg border border-slate-200 bg-white p-4 flex items-start gap-2">
                <span className="text-emerald-700 shrink-0 mt-0.5">✗</span>
                <span className="text-slate-700">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auto-club comparison */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">vs. Auto Clubs</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Pay-As-You-Go Beats Annual Dues</h2>
          <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-cta text-slate-600">&nbsp;</th>
                  <th className="px-4 py-3 text-center font-cta text-emerald-700">The Roadside Helper</th>
                  <th className="px-4 py-3 text-center font-cta text-slate-500">Typical Auto Club</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {[
                  ["Annual fee", "$0", "$80–$120/year"],
                  ["Per-call rate", "$149 flat/hour", "Included (after dues)"],
                  ["Calls per year", "Unlimited", "3–4 before overages"],
                  ["Tow mileage included", "5 miles", "5–10 miles"],
                  ["After-hours surcharge", "$0", "Sometimes"],
                  ["Holiday surcharge", "$0", "Often"],
                  ["Real human dispatcher", "Yes", "Auto-menu first"],
                  ["Average response", "Under 60 min", "2–3 hours"],
                  ["Annual auto-renew", "N/A — no membership", "Yes (until cancelled)"],
                  ["Cost if you never call", "$0", "Lost dues"],
                ].map(([label, us, them]) => (
                  <tr key={label} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-700">{label}</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{us}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-slate-500">
            For a driver who needs roadside help once every two years, two years of auto-club dues ($200) costs roughly twice our one-call price ($149). Pay-as-you-go saves money for the vast majority of drivers.
          </p>
        </div>
      </section>

      {/* Coverage */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Coverage</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Same Rate in All {STATE_COUNT} States</h2>
          <p className="mx-auto mt-6 max-w-2xl text-center text-base text-slate-600">
            $149/hr flat applies in every one of our {CITY_COUNT}+ cities. Same in New York, Los Angeles, rural Wyoming, downtown Miami, suburban Dallas. <Link href="/locations" className="text-emerald-700 font-semibold hover:underline">See all locations</Link>.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Call?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Flat $149/hr, 24/7 dispatch. <a href={PHONE_HREF} className="text-amber-300 hover:underline">{PHONE}</a>
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}