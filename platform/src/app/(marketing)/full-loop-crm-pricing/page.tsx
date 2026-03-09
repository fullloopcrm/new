import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema,
  softwareApplicationSchema,
} from "@/lib/schema";

/* ------------------------------------------------------------------ */
/*  SEO metadata                                                       */
/* ------------------------------------------------------------------ */
export const metadata: Metadata = {
  title:
    "Pricing | Full Loop CRM — $2,500/mo All-Inclusive Home Service CRM",
  description:
    "One flat price, zero tiers, zero upsells. Full Loop CRM replaces your receptionist, salesperson, CRM, website, SEO, review management, and retargeting for $2,500/mo. Compare to $178,800/yr the traditional way.",
  keywords: [
    "home service CRM pricing",
    "field service CRM cost",
    "CRM for service businesses pricing",
    "home service business CRM",
    "all-in-one CRM pricing",
    "Full Loop CRM pricing",
  ],
  alternates: { canonical: "https://fullloopcrm.com/full-loop-crm-pricing" },
  openGraph: {
    title: "Pricing | Full Loop CRM — $2,500/mo All-Inclusive",
    description:
      "One flat price. No tiers, no upsells, no hidden fees. Everything your home service business needs for $2,500/mo.",
    url: "https://fullloopcrm.com/full-loop-crm-pricing",
    siteName: "Full Loop CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | Full Loop CRM — $2,500/mo All-Inclusive",
    description:
      "One flat price. No tiers, no upsells, no hidden fees. Everything your home service business needs for $2,500/mo.",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const breadcrumbs = [
  { name: "Home", url: "https://fullloopcrm.com" },
  { name: "Pricing", url: "https://fullloopcrm.com/full-loop-crm-pricing" },
];

const includedFeatures = [
  "Selenas AI — 24/7 receptionist, sales closer & follow-up engine",
  "Organic lead generation across 10+ branded domains",
  "Full SEO site — built, hosted & managed by Full Loop",
  "Google Business Profile creation & optimization",
  "CRM dashboard — leads, jobs, invoices, payments",
  "Smart scheduling with GPS-based field routing",
  "Automated quoting & invoicing",
  "Integrated payments (credit card, ACH, Zelle)",
  "Business phone number via Telnyx (you own the account)",
  "Business email via Resend (you own the account)",
  "Two-way SMS & email follow-ups",
  "Automated review requests & monitoring",
  "Retargeting & win-back campaigns",
  "Monthly performance reports",
  "Dedicated partnership manager",
  "Territory exclusivity — one partner per industry per zone",
];

const traditionalCosts = [
  { item: "Receptionist / Office Manager", cost: "$38,000" },
  { item: "Salesperson / Lead Closer", cost: "$48,000" },
  { item: "Customer Service Rep", cost: "$35,000" },
  { item: "Website + SEO Agency", cost: "$18,000" },
  { item: "Google Ads / Paid Lead Gen", cost: "$24,000" },
  { item: "CRM / Scheduling Software", cost: "$3,600" },
  { item: "SMS / Phone System", cost: "$2,400" },
  { item: "Review Management Software", cost: "$1,800" },
  { item: "Retargeting / Email Marketing", cost: "$3,600" },
  { item: "Bookkeeping / Invoicing Tools", cost: "$4,400" },
];

const youOwn = [
  "Your Telnyx phone account & number",
  "Your Resend email account",
  "Your business name / LLC",
  "Any $500 microsites you purchase",
  "Full SEO site (if buyout is completed)",
];

const fullLoopOwns = [
  "CRM platform & Selenas AI engine",
  "Full SEO site & domain (until buyout)",
  "Google Business Profiles we create",
  "All website code & templates",
  "SEO architecture & strategy IP",
];

const pricingFaqs = [
  {
    question: "Why is there only one price?",
    answer:
      "We intentionally avoid tiered pricing because every home service partner deserves the full stack — lead generation, AI sales, scheduling, payments, reviews, and retargeting. Tiers create a race to the bottom where the cheapest plan gets a hobbled product. One price means every partner gets everything, and we succeed only when you succeed.",
  },
  {
    question: "Are there any setup fees or contracts?",
    answer:
      "There are no setup fees. Your partnership is month-to-month after the first 90 days. We ask for a 90-day minimum because it takes time to build your SEO presence, configure Selenas AI for your trade, and start generating organic leads. After that, you can cancel anytime.",
  },
  {
    question: "What happens to my leads and data if I cancel?",
    answer:
      "You keep your Telnyx phone number, Resend email account, business name, and any microsites you purchased. We export your customer list and job history in CSV format. The CRM platform, full SEO site, Google Business Profiles we created, and lead network remain with Full Loop.",
  },
  {
    question: "Can I buy the SEO site and domain outright?",
    answer:
      "Yes. We offer a buyout schedule based on accrued SEO value: $25,000 in Year 1, $35,000 in Year 2, $45,000 in Year 3, $55,000 in Year 4, and $65,000 in Year 5+. This reflects the compounding value of aged domains, backlink profiles, and organic rankings we build over time.",
  },
  {
    question: "Do I need to pay for ads or buy leads separately?",
    answer:
      "No. Full Loop generates leads organically through multi-domain SEO, Google Business Profiles, and content marketing. You never pay for Google Ads, Thumbtack, Angi, or any other pay-per-lead platform. When you stop paying those platforms, leads stop. With Full Loop, organic leads keep compounding.",
  },
  {
    question: "What is territory exclusivity?",
    answer:
      "We accept only one partner per industry per geographic zone. If you're a plumber in Brooklyn, no other plumber in Brooklyn can join Full Loop. This means every lead in your territory goes to you — zero competition from within our own network.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function PricingPage() {
  const traditionalTotal = 178_800;
  const fullLoopTotal = 30_000;
  const savings = traditionalTotal - fullLoopTotal;
  const savingsPct = Math.round((savings / traditionalTotal) * 100);

  return (
    <>
      {/* ── Schema ─────────────────────────────────────────────── */}
      <JsonLd
        data={webPageSchema(
          "Pricing | Full Loop CRM",
          "One flat price, zero tiers, zero upsells. Full Loop CRM replaces your receptionist, salesperson, CRM, website, SEO, review management, and retargeting for $2,500/mo.",
          "https://fullloopcrm.com/full-loop-crm-pricing",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(pricingFaqs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />
      <JsonLd data={softwareApplicationSchema("2500", "USD")} />

      {/* ── 1. Hero ────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-24 px-6 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-mono uppercase tracking-widest text-teal-400">
            Home Service CRM Pricing
          </p>
          <h1 className="text-4xl font-extrabold font-heading text-white sm:text-5xl lg:text-6xl">
            One Price. One Partner.{" "}
            <span className="text-yellow-300">Full Loop.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 sm:text-xl max-w-2xl mx-auto">
            No tiers, no upsells, no hidden fees. Everything your home service
            business needs to generate leads, close sales, and grow — in one
            flat monthly partnership.
          </p>
        </div>
      </section>

      {/* ── 2. Main Pricing Card ───────────────────────────────── */}
      <section className="py-20 px-6 bg-white" id="pricing-card">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border-2 border-teal-600 shadow-xl overflow-hidden">
            {/* Card header */}
            <div className="bg-teal-600 px-8 py-8 text-center text-white">
              <p className="text-sm font-mono uppercase tracking-widest text-teal-100">
                The Full Loop Partnership
              </p>
              <p className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-6xl font-extrabold font-heading">
                  $2,500
                </span>
                <span className="text-xl text-teal-100">/mo</span>
              </p>
              <p className="mt-2 text-teal-100">
                $30,000/year &middot; billed monthly &middot; no contracts after
                90&nbsp;days
              </p>
            </div>

            {/* Features list */}
            <div className="px-8 py-10">
              <p className="text-lg font-semibold text-slate-900 font-heading mb-6">
                Everything included:
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {includedFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-slate-700"
                  >
                    <span
                      className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600"
                      aria-hidden="true"
                    >
                      &#10003;
                    </span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-10 text-center">
                <Link
                  href="/crm-partnership-request-form"
                  className="inline-block rounded-lg bg-teal-600 px-8 py-4 text-lg font-cta font-semibold text-white shadow-md hover:bg-teal-700 transition-colors"
                >
                  Request Your Partnership
                </Link>
                <p className="mt-3 text-sm text-slate-500">
                  90-day minimum &middot; cancel anytime after
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Add-Ons ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50" id="add-ons">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              Optional Add-Ons
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              Expand Your Digital Footprint
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Microsites */}
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
                Microsites
              </h3>
              <p className="text-3xl font-extrabold font-heading text-teal-600 mb-1">
                $500
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  /site &middot; one-time
                </span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    <strong>You own the domain</strong> — exact-match domain
                    (EMD) registered in your name
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    Built, designed & optimized by Full Loop
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    Hosting included in first year; <strong>$60/yr</strong>{" "}
                    thereafter
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    Yours to keep even if you cancel
                  </span>
                </li>
              </ul>
            </div>

            {/* Full SEO site */}
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
                Full SEO Site &amp; Domain
              </h3>
              <p className="text-3xl font-extrabold font-heading text-teal-600 mb-1">
                Included
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  in partnership
                </span>
              </p>
              <p className="text-sm text-slate-600 mt-2 mb-4">
                Full Loop builds, owns & operates your primary SEO site. Want to
                own it outright? Buyout is available:
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="px-4 py-2 font-semibold text-slate-700">
                        Year
                      </th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-right">
                        Buyout Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["Year 1", "$25,000"],
                      ["Year 2", "$35,000"],
                      ["Year 3", "$45,000"],
                      ["Year 4", "$55,000"],
                      ["Year 5+", "$65,000"],
                    ].map(([year, price]) => (
                      <tr key={year}>
                        <td className="px-4 py-2 text-slate-700">{year}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">
                          {price}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                +$10,000/yr reflects accrued SEO value (aged domain, backlinks,
                rankings).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Ownership Transparency ──────────────────────────── */}
      <section className="py-20 px-6 bg-white" id="ownership">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              Full Transparency
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              Who Owns What
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              We believe you should know exactly what you own from day one. No
              surprises, no lock-in games.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* You Own */}
            <div className="rounded-xl border-2 border-teal-600 bg-teal-50/40 p-8">
              <h3 className="text-lg font-bold font-heading text-teal-700 mb-5">
                You Own
              </h3>
              <ul className="space-y-3">
                {youOwn.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-slate-700">
                    <span
                      className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xs font-bold"
                      aria-hidden="true"
                    >
                      &#10003;
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Full Loop Owns */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
              <h3 className="text-lg font-bold font-heading text-slate-700 mb-5">
                Full Loop Owns
              </h3>
              <ul className="space-y-3">
                {fullLoopOwns.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-slate-700">
                    <span
                      className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs font-bold"
                      aria-hidden="true"
                    >
                      &#8594;
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Cost Comparison ─────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900" id="cost-comparison">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-400">
              The Math
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-white sm:text-4xl">
              Traditional Costs vs. Full Loop
            </h2>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-300">
                    Expense
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-300 text-right">
                    Traditional / yr
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {traditionalCosts.map(({ item, cost }) => (
                  <tr key={item}>
                    <td className="px-5 py-3 text-slate-300">{item}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-400">
                      {cost}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700 bg-slate-800">
                  <td className="px-5 py-3 font-semibold text-white">
                    Traditional Total
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-red-400">
                    ${traditionalTotal.toLocaleString()}/yr
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Savings callout */}
          <div className="mt-10 grid gap-6 sm:grid-cols-3 text-center">
            <div className="rounded-xl bg-slate-800 p-6">
              <p className="text-sm text-slate-400 mb-1 font-mono uppercase tracking-wider">
                Traditional
              </p>
              <p className="text-3xl font-extrabold font-heading text-red-400">
                ${traditionalTotal.toLocaleString()}
                <span className="text-base text-slate-500">/yr</span>
              </p>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-slate-800 p-6">
              <p className="text-sm text-teal-400 mb-1 font-mono uppercase tracking-wider">
                Full Loop
              </p>
              <p className="text-3xl font-extrabold font-heading text-teal-400">
                ${fullLoopTotal.toLocaleString()}
                <span className="text-base text-teal-600">/yr</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-800 p-6">
              <p className="text-sm text-yellow-300 mb-1 font-mono uppercase tracking-wider">
                You Save
              </p>
              <p className="text-3xl font-extrabold font-heading text-yellow-300">
                ${savings.toLocaleString()}
                <span className="text-base text-yellow-400">
                  /yr ({savingsPct}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. What Happens If I Cancel ────────────────────────── */}
      <section className="py-20 px-6 bg-white" id="cancellation">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              No Lock-In
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              What Happens If I Cancel?
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              We want partners, not hostages. Here is exactly what happens if
              you decide to part ways.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* You keep */}
            <div className="rounded-xl border-2 border-teal-600 bg-teal-50/40 p-8">
              <h3 className="text-lg font-bold font-heading text-teal-700 mb-5">
                You Keep
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  "Your phone number (Telnyx account is yours)",
                  "Your email account (Resend account is yours)",
                  "Your business name & LLC",
                  "Any microsites you purchased ($500 each)",
                  "Exported customer list & job history (CSV)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xs font-bold"
                      aria-hidden="true"
                    >
                      &#10003;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Full Loop keeps */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
              <h3 className="text-lg font-bold font-heading text-slate-700 mb-5">
                Full Loop Keeps
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  "CRM platform access & Selenas AI",
                  "Full SEO site & domain (unless buyout completed)",
                  "Google Business Profiles we created",
                  "Lead generation network & pipeline",
                  "All website code, templates & IP",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs font-bold"
                      aria-hidden="true"
                    >
                      &#8594;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
            <p className="text-slate-700 text-sm">
              <strong>Want to buy the full SEO site?</strong> You can exercise
              the buyout option at appraised value based on the{" "}
              <a href="#add-ons" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">
                buyout schedule above
              </a>
              . After cancellation your territory opens for the next partner in
              your industry.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50" id="faq">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              Pricing FAQ
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              Common Questions
            </h2>
          </div>

          <dl className="space-y-8">
            {pricingFaqs.map(({ question, answer }) => (
              <div
                key={question}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <dt className="text-base font-semibold font-heading text-slate-900">
                  {question}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-slate-600">
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 8. Final CTA ───────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold font-heading text-white sm:text-4xl">
            Ready to Close the Loop?
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-xl mx-auto">
            One price. One partner. Everything your home service business needs
            to dominate your territory.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block rounded-lg bg-yellow-300 px-8 py-4 text-lg font-cta font-semibold text-slate-900 shadow-md hover:bg-yellow-400 transition-colors"
            >
              Request Your Partnership
            </Link>
            <a
              href="tel:+12122029220"
              className="inline-block rounded-lg border border-slate-600 px-8 py-4 text-lg font-cta font-semibold text-white hover:border-slate-400 transition-colors"
            >
              Call 212-202-9220
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Or text us anytime at{" "}
            <a
              href="sms:+12122029220"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              212-202-9220
            </a>
          </p>
          <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              Features
            </Link>
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              Why Full Loop
            </Link>
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              Industries
            </Link>
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              CRM 101
            </Link>
          </nav>
        </div>
      </section>
    </>
  );
}
