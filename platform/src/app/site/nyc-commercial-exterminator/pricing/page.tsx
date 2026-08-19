import Link from "next/link";
import type { Metadata } from "next";
import { PHONE, SITE_URL } from "@/app/site/nyc-commercial-exterminator/_lib/seo";
import { getFAQPageSchema, getBreadcrumbSchema } from "@/app/site/nyc-commercial-exterminator/_lib/seo";
import CTAGroup from "@/app/site/nyc-commercial-exterminator/_components/CTAGroup";

export const metadata: Metadata = {
  title:
    "Pricing | $249/hr Fully Inclusive | The Only NYC Pest Control That Bills Hourly",
  description:
    "$249/hr (fully inclusive — save money). The only NYC pest control service that bills fully inclusive hourly. Labor, products, treatment, follow-up — all in the rate. Pay only when the job is done. No contracts. No deposits. No catches. We bill for the time your problem actually takes, not for a bloated flat-rate quote built around the worst case. Call or text 212-202-8545.",
  keywords:
    "hourly exterminator NYC, NYC exterminator pricing, $249 per hour exterminator, fully inclusive pest control pricing, no contract pest control NYC, pay on completion exterminator, transparent pest control pricing, hourly pest control rate NYC",
  openGraph: {
    title: "Pricing | $249/hr Fully Inclusive | The Only NYC Pest Control That Bills Hourly",
    description:
      "$249/hr (fully inclusive — save money). The only NYC pest control service that bills fully inclusive hourly. Pay only when the job is done. No contracts. No deposits. No catches.",
    url: `${SITE_URL}/pricing`,
  },
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
};

const phonePlain = PHONE.replace(/-/g, "");

const pricingFaqs = [
  {
    q: "What does $249/hour actually include?",
    a: "Everything needed to solve your pest problem. Labor, EPA-registered products, treatment methods (chemical, gel bait, traps, heat, exclusion materials), entry-point sealing, written treatment plan, and the free re-treatment visit if pests come back inside the guarantee window. There are no per-room fees, no chemical surcharges, no trip fees, no inspection fees, no contract minimums, no weekend rates, no holiday rates. The hour is the hour.",
  },
  {
    q: "Why hourly instead of a flat-rate quote like every other NYC exterminator?",
    a: "Flat-rate quotes are priced for the worst-case version of your problem the company has never inspected. If your actual job is simpler, you still pay the inflated number — the company keeps the difference. Hourly bills you for the time your specific problem actually takes. A small ant trail might be 30 minutes ($125 all-in). A serious roach infestation might be 90 minutes ($375). You pay for time, not for the company's guess at a worst case. We built this site as the only fully inclusive hourly exterminator pricing platform in NYC because the flat-rate model is built to overcharge most customers.",
  },
  {
    q: "Do I pay anything upfront?",
    a: "No. Nothing upfront. No deposit. No card-on-file required to schedule. The free inspection is free. The hourly clock doesn't start until you approve the treatment plan. The invoice goes out after the work is done. If you're not satisfied, you don't pay.",
  },
  {
    q: "Are there any contracts?",
    a: "No. Zero. No monthly minimums. No auto-renewals. No 'maintenance plan' lock-in. You book one visit. We solve the problem. You pay for that hour (or fraction of an hour) and we're done. If you want a follow-up later, you book another single visit at the same $249/hour rate. That's it.",
  },
  {
    q: "What's the catch?",
    a: "There isn't one. We were tired of NYC pest control being a 'call for a quote' black box where the price is whatever the company thinks you'll pay. $249/hour, billed in 15-minute increments after the first hour, fully inclusive, pay on completion. That's the entire pricing model. No hidden fees, no chemical surcharges, no upsells, no bait-and-switch.",
  },
  {
    q: "How is the hour timed? When does the clock start?",
    a: "The clock starts when treatment begins, after the free inspection is complete and you've approved the plan. It stops when the technician finishes the work. Travel time, the inspection itself, and writing the treatment plan are not billed. The first hour is the minimum; after that we bill in 15-minute increments ($62.25 per quarter hour), rounded honestly to actual time worked.",
  },
  {
    q: "Is hourly really cheaper than a flat-rate quote?",
    a: "For most NYC jobs, yes — meaningfully cheaper. A typical small commercial cockroach treatment takes 45-60 minutes ($187-$249 with us, all-in). The same job flat-rate elsewhere quotes at $300-$500, then often adds chemical and trip fees. Mouse exclusion on a small office or retail unit runs 60-90 minutes ($249-$374). Flat-rate elsewhere: $400-$700+ before add-ons. Bigger jobs — multi-room bed bug heat treatment, large commercial accounts — can run longer with hourly, but you still pay only for actual time. Either way, you know the model is honest because the rate is the rate.",
  },
  {
    q: "What about emergencies, weekends, holidays?",
    a: "Same $249/hour rate. No surcharges. We don't think 'your roach problem at 9pm on Saturday' should cost double what it costs Monday at 2pm.",
  },
  {
    q: "What's the guarantee?",
    a: "If the pests come back inside the guarantee window for the service you booked, we return at no charge. No 'gotcha' clauses. No requirement to sign a maintenance plan to qualify. The free re-treatment is included in the original $249/hour rate.",
  },
  {
    q: "What if the job takes less than an hour?",
    a: "The first hour is the minimum — $249 — same as any tradesperson with truck-roll and setup costs. After that hour, you only pay for the time actually used, in 15-minute increments.",
  },
  {
    q: "Multi-unit buildings, commercial accounts, restaurants — same rate?",
    a: "Same $249/hour rate, same fully inclusive model, same pay-on-completion. Larger jobs simply take more hours. For ongoing commercial accounts where DOH-compliant documentation and scheduled visits are needed, the visits are still billed hourly with no contract — you choose when to book the next one.",
  },
  {
    q: "Payment methods?",
    a: "Credit card, debit card, ACH, Zelle, or check. Payment is due on completion. We don't require deposits. For commercial accounts with recurring visits, net-30 invoicing is available.",
  },
];

export default function PricingPage() {
  const breadcrumbSchema = getBreadcrumbSchema([{ name: "Pricing", url: "/pricing" }]);
  const faqSchema = getFAQPageSchema(pricingFaqs);

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
            NYC&apos;s Only Fully Inclusive Hourly Exterminator Pricing Platform
          </p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              $249/hour
            </span>
            . Flat.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-zinc-300">
            Save money on <span className="italic font-semibold text-white">time</span>{" "}
            &mdash; not on bloated quotes, and not on set pricing built around a problem
            nobody&apos;s even seen yet.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            Fully inclusive. No contracts. No catches. No deposits. Pay only when the job is done.
            One honest hourly rate for every pest service we offer &mdash; cockroaches, bed bugs,
            rats, mice, termites, ants, wasps, wildlife, commercial. The pest doesn&apos;t change
            the price. Only how long the job actually takes.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/schedule-service"
              className="inline-flex items-center justify-center rounded-xl bg-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-500 hover:-translate-y-0.5 transition-all"
            >
              Schedule a $249/hr Service &rarr;
            </Link>
            <a
              href={`tel:${phonePlain}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-white/5 px-8 py-4 text-base font-bold text-white hover:border-zinc-500 hover:bg-white/10"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ── THE RATE CARD ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border-2 border-green-700/50 bg-gradient-to-br from-green-950/40 to-zinc-900/60 p-10 text-center shadow-2xl shadow-green-900/20">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
              The Entire Price List
            </p>
            <p className="mt-6 text-7xl font-extrabold text-white">
              $249<span className="text-2xl font-medium text-zinc-400">/hr</span>
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              Billed in 15-minute increments after the first hour. First hour is the minimum.
            </p>

            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-lg border border-green-700/40 bg-black/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-400">Included</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  <li>&#10003; All labor</li>
                  <li>&#10003; All EPA-registered products</li>
                  <li>&#10003; All treatment methods</li>
                  <li>&#10003; Entry-point sealing materials</li>
                  <li>&#10003; Written treatment plan</li>
                  <li>&#10003; Free re-treatment if pests return</li>
                  <li>&#10003; Free on-site inspection (off the clock)</li>
                </ul>
              </div>
              <div className="rounded-lg border border-red-900/40 bg-black/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Never Charged</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  <li>&times; Per-room fees</li>
                  <li>&times; Square-foot fees</li>
                  <li>&times; Chemical surcharges</li>
                  <li>&times; Trip fees / fuel fees</li>
                  <li>&times; Weekend / holiday rates</li>
                  <li>&times; Deposit or upfront payment</li>
                  <li>&times; Contracts or auto-renewal</li>
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/schedule-service"
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-500"
              >
                Schedule Now &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY HOURLY WINS ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Why Hourly Is{" "}
            <span className="text-green-400">Better for the Customer</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
            Every flat-rate quote in NYC is priced for a worst-case scenario you may not have.
            Hourly is the only pricing model where the customer&apos;s incentive and the
            company&apos;s incentive line up.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-lg font-bold text-green-400">1. Pay for your job, not for someone else&apos;s</p>
              <p className="mt-3 text-sm text-zinc-300">
                Flat-rate &ldquo;cockroach treatment: $400&rdquo; means the customer with the easy
                30-minute job subsidizes the customer with the brutal 90-minute job. Hourly bills
                everyone for their own time. Honest, simple, fair.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-lg font-bold text-green-400">2. No incentive to oversell</p>
              <p className="mt-3 text-sm text-zinc-300">
                Flat-rate companies make more profit on fast jobs &mdash; so the incentive is to
                quote high, finish fast, leave. Hourly companies make the same per hour either way.
                The incentive is to actually solve your problem and stop returning.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-lg font-bold text-green-400">3. No upsells, no add-ons</p>
              <p className="mt-3 text-sm text-zinc-300">
                Flat-rate quotes hide profit in add-ons &mdash; chemical fees, sealing fees, per-room
                fees, trip fees. We don&apos;t need add-ons because we&apos;re billing by the hour.
                Everything is included in the rate. No surprises on the invoice.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-lg font-bold text-green-400">4. No quote built around a problem nobody&apos;s seen</p>
              <p className="mt-3 text-sm text-zinc-300">
                Calling for a flat quote means a stranger guesses your job over the phone, prices for
                the worst case to protect themselves, then locks you in. Hourly means we inspect for
                free, you approve the plan, and you only pay for actual time spent.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-lg font-bold text-green-400">5. Pay on completion. No deposit. No card on file.</p>
              <p className="mt-3 text-sm text-zinc-300">
                We bill you after the work is done and you can see the result. If the job
                doesn&apos;t go right, you don&apos;t pay. Try getting that from a company that took
                a $200 deposit at booking.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-lg font-bold text-green-400">6. No contracts. Ever.</p>
              <p className="mt-3 text-sm text-zinc-300">
                Most NYC pest companies push a recurring &ldquo;maintenance plan&rdquo; you have to
                cancel. We don&apos;t. Book a single visit at $249/hr when you need us. Don&apos;t,
                when you don&apos;t. That&apos;s the whole relationship.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL JOB EXAMPLES ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            What Typical NYC Jobs <span className="text-green-400">Actually Cost</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
            Honest typical times for common NYC pest jobs at $249/hour, fully inclusive.
            Your job might be faster or slower &mdash; the rate doesn&apos;t change either way.
          </p>

          <div className="mt-10 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/80 text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Typical Time</th>
                  <th className="px-4 py-3">Total (all-in)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  ["Studio / 1-BR ant or spider treatment", "30 min", "$125"],
                  ["Studio / 1-BR cockroach treatment", "45-60 min", "$187-$249"],
                  ["1-BR mouse exclusion + traps", "60-90 min", "$249-$374"],
                  ["2-BR cockroach treatment", "60-75 min", "$249-$312"],
                  ["1-BR bed bug chemical treatment (1 room)", "60-90 min", "$249-$374"],
                  ["Rat exterior baiting + entry seal (brownstone)", "90-120 min", "$374-$498"],
                  ["Whole-unit bed bug heat (small commercial)", "3-4 hrs", "$747-$996"],
                  ["Restaurant general pest (single visit)", "60-90 min", "$249-$374"],
                  ["Wasp nest removal", "30-45 min", "$125-$187"],
                  ["Termite spot treatment", "90-120 min", "$374-$498"],
                ].map(([job, time, total]) => (
                  <tr key={job} className="text-zinc-300">
                    <td className="px-4 py-3 font-medium text-white">{job}</td>
                    <td className="px-4 py-3 text-zinc-400">{time}</td>
                    <td className="px-4 py-3 font-bold text-green-400">{total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            All totals include labor, products, equipment, entry-point sealing, written plan, and the
            free re-treatment if pests return inside the guarantee. No add-ons. No deposit. Pay on
            completion.
          </p>
        </div>
      </section>

      {/* ── COMPARISON TO FLAT-RATE ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Us vs. <span className="text-green-400">Flat-Rate NYC Pest Control</span>
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-red-400">
                Flat-rate exterminator (everyone else)
              </p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li>&times; Priced for the worst-case version of your problem</li>
                <li>&times; You pay the inflated number even if your job is simple</li>
                <li>&times; Per-room and per-square-foot fees inflate the total</li>
                <li>&times; Chemical surcharges, trip fees, weekend rates added later</li>
                <li>&times; Deposit due before the technician even arrives</li>
                <li>&times; Maintenance contract pressure to lock you in</li>
                <li>&times; &ldquo;Set pricing&rdquo; on a problem nobody&apos;s even seen yet</li>
              </ul>
            </div>

            <div className="rounded-xl border border-green-700/40 bg-green-950/30 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-green-400">
                $249/hr fully inclusive (us)
              </p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li>&#10003; Pay for the exact time your job actually takes</li>
                <li>&#10003; Simple problem = small bill. No worst-case math</li>
                <li>&#10003; No per-room fees, no square-foot fees, no add-ons</li>
                <li>&#10003; Products, equipment, sealing, follow-up all included</li>
                <li>&#10003; Pay on completion. Nothing upfront. No card on file</li>
                <li>&#10003; No contracts. No auto-renewals. Book when you need it</li>
                <li>&#10003; Free re-treatment if pests return inside the guarantee</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CTAGroup variant="mid" />

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Pricing <span className="text-green-400">Questions Answered</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
            Everything about how $249/hour fully inclusive works &mdash; what&apos;s in, what&apos;s
            never charged, when you pay, and why the catch you&apos;re looking for doesn&apos;t exist.
          </p>
          <div className="mt-10 space-y-4">
            {pricingFaqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
              >
                <h3 className="text-base font-semibold text-white">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
