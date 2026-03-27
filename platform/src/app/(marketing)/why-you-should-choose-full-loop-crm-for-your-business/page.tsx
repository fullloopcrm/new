import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

/* ------------------------------------------------------------------ */
/*  SEO metadata                                                      */
/* ------------------------------------------------------------------ */
export const metadata: Metadata = {
  title:
    "Why Full Loop CRM | The Only CRM That Closes the Loop for Home Service Businesses",
  description:
    "Full Loop CRM replaces 9+ disconnected tools with one AI-powered platform — organic lead generation, automated sales, scheduling, GPS ops, payments, reviews, and retargeting. See how it compares to Jobber, Housecall Pro, and ServiceTitan.",
  keywords: [
    "why full loop CRM",
    "best home service CRM",
    "automated field service CRM",
    "CRM comparison",
    "home service CRM comparison",
    "Jobber alternative",
    "Housecall Pro alternative",
    "ServiceTitan alternative",
    "AI CRM for contractors",
    "full cycle CRM",
  ],
  alternates: {
    canonical: "https://homeservicesbusinesscrm.com/why-you-should-choose-full-loop-crm-for-your-business",
  },
  openGraph: {
    title: "Why Full Loop CRM | The Only CRM That Closes the Loop",
    description:
      "From first click to five-star review — one platform handles every stage of your home service business. No integrations. No patchwork. Just results.",
    url: "https://homeservicesbusinesscrm.com/why-you-should-choose-full-loop-crm-for-your-business",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why Full Loop CRM | The Only CRM That Closes the Loop",
    description:
      "From first click to five-star review — one platform handles every stage of your home service business. No integrations. No patchwork. Just results.",
  },
};

/* ------------------------------------------------------------------ */
/*  Breadcrumbs                                                       */
/* ------------------------------------------------------------------ */
const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Why Full Loop", url: "https://homeservicesbusinesscrm.com/why-you-should-choose-full-loop-crm-for-your-business" },
];

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
const stages = [
  {
    number: "1",
    name: "Lead Generation",
    desc: "Organic SEO sites, Google Business profiles, and paid ads bring qualified leads directly into your pipeline — no bought lists, no cold calls.",
  },
  {
    number: "2",
    name: "AI Sales & Booking",
    desc: "Selenas AI answers every inquiry in under 60 seconds, qualifies the lead, quotes the job, and books it on your calendar — 24/7/365.",
  },
  {
    number: "3",
    name: "Smart Scheduling",
    desc: "Route-optimized calendars, crew assignments, and automatic customer confirmations keep your day tight and your no-show rate near zero.",
  },
  {
    number: "4",
    name: "GPS Field Operations",
    desc: "Real-time technician tracking, geo-fenced check-in/check-out, time logs, and photo documentation — all from a mobile app.",
  },
  {
    number: "5",
    name: "Invoicing & Payments",
    desc: "Auto-generated invoices, on-site card payments, ACH, and financing options. Get paid the same day the job is done.",
  },
  {
    number: "6",
    name: "Reviews & Reputation",
    desc: "Automated review requests sent at the perfect moment. Monitor, respond, and showcase five-star reviews across Google and social.",
  },
  {
    number: "7",
    name: "Retargeting & Rebooking",
    desc: "Lifecycle-based email/SMS campaigns, seasonal reminders, and referral tracking turn one-time customers into recurring revenue.",
  },
];

const differentiators = [
  {
    title: "Organic Lead Generation",
    desc: "No other CRM generates leads for you. Full Loop builds and manages SEO-optimized microsites, Google Business profiles, and local landing pages that rank — so leads flow in before you spend a dollar on ads.",
    highlight: "No other CRM does this.",
  },
  {
    title: "Selenas AI",
    desc: "Your AI-powered receptionist, salesperson, and customer service rep rolled into one. Selenas answers calls, texts, and web inquiries instantly, qualifies leads, sends quotes, and books jobs — replacing roles that cost $121,000/year in payroll.",
    highlight: "Replaces $121K in staff costs.",
  },
  {
    title: "Exclusive Territory",
    desc: "We accept one partner per trade per metro area. Your competitor can't buy the same system. Your territory is yours alone — guaranteed in writing.",
    highlight: "Your market. Protected.",
  },
  {
    title: "Full Autonomy Mode",
    desc: "Flip one switch and your business runs itself. Lead capture, sales, booking, dispatching, invoicing, follow-ups, reviews, and rebooking all happen without you touching a screen.",
    highlight: "One switch. Fully autonomous.",
  },
  {
    title: "Built by an Operator",
    desc: "Full Loop was built by someone who has spent 20+ years running home service businesses — not by Silicon Valley engineers guessing what contractors need. Every feature exists because it solved a real problem in the field.",
    highlight: "20+ years in the trades.",
  },
];

const comparisonRows = [
  { feature: "Organic lead generation", fullloop: true, jobber: false, housecall: false, servicetitan: false },
  { feature: "AI-powered sales agent", fullloop: true, jobber: false, housecall: false, servicetitan: false },
  { feature: "Smart scheduling", fullloop: true, jobber: true, housecall: true, servicetitan: true },
  { feature: "GPS field operations", fullloop: true, jobber: false, housecall: false, servicetitan: true },
  { feature: "Invoicing & payments", fullloop: true, jobber: true, housecall: true, servicetitan: true },
  { feature: "Automated review management", fullloop: true, jobber: false, housecall: false, servicetitan: false },
  { feature: "Retargeting & lifecycle campaigns", fullloop: true, jobber: false, housecall: false, servicetitan: false },
  { feature: "Exclusive territory protection", fullloop: true, jobber: false, housecall: false, servicetitan: false },
  { feature: "Starting price", fullloop: "$199/mo", jobber: "$49/mo", housecall: "$49/mo", servicetitan: "Custom" },
];

const autonomousRuns = [
  "Lead tracking & attribution",
  "AI-powered sales conversations",
  "Appointment booking & confirmations",
  "Customer reminders & follow-ups",
  "Recurring service scheduling",
  "GPS check-in / check-out",
  "Technician pay calculation",
  "Post-job review requests",
  "Lifecycle stage updates",
  "Referral tracking & rewards",
];

const humanDecisions = [
  "Hiring decisions",
  "Service quality standards",
  "Pricing strategy",
  "Growth planning & expansion",
];

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function WhyFullLoopPage() {
  return (
    <>
      {/* Schema */}
      <JsonLd
        data={webPageSchema(
          "Why Full Loop CRM | The Only CRM That Closes the Loop",
          "Full Loop CRM replaces 9+ disconnected tools with one AI-powered platform for home service businesses. Organic leads, AI sales, scheduling, GPS ops, payments, reviews, retargeting.",
          "https://homeservicesbusinesscrm.com/why-you-should-choose-full-loop-crm-for-your-business",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* ============================================================ */}
      {/*  1. HERO                                                     */}
      {/* ============================================================ */}
      <section className="bg-slate-900 py-24 px-6 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-sm uppercase tracking-widest text-teal-400 mb-4">
            Why Full Loop CRM
          </p>
          <h1 className="font-heading text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl mb-6">
            The Only CRM That Closes&nbsp;the&nbsp;Loop
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            From first click to five-star review — one platform handles every
            stage of your home service business. No integrations. No patchwork.
            Just results.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/partner-with-full-loop-crm"
              className="font-cta inline-block rounded-lg bg-teal-400 px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-lg hover:bg-teal-300 transition-colors"
            >
              Request Partnership
            </Link>
            <Link
              href="/full-loop-crm-service-features"
              className="font-cta inline-block rounded-lg border border-slate-600 px-8 py-3.5 text-sm font-semibold text-slate-300 hover:border-teal-400 hover:text-teal-400 transition-colors"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  2. THE PROBLEM                                              */}
      {/* ============================================================ */}
      <section className="bg-white py-20 px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="font-mono text-sm uppercase tracking-widest text-teal-600 mb-3">
              The Problem
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
              Your Business Is Held Together with Duct Tape
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Most home service companies run on a patchwork of disconnected
              tools that don&rsquo;t talk to each other. The result? Lost leads,
              wasted money, and zero visibility into what&rsquo;s actually
              working.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {[
              {
                stat: "9+",
                label: "Disconnected tools",
                desc: "The average home service business juggles 9 or more separate apps — CRM, scheduling, invoicing, reviews, marketing, GPS, payments, and more.",
              },
              {
                stat: "$178,800",
                label: "Wasted annually",
                desc: "Between front-office staff, software subscriptions, and ad spend with no attribution, you're bleeding money every month.",
              },
              {
                stat: "37%",
                label: "Leads fall through cracks",
                desc: "When your lead source doesn't connect to your CRM, and your CRM doesn't connect to your scheduler, leads disappear between tools.",
              },
              {
                stat: "0%",
                label: "Marketing attribution",
                desc: "You don't know which marketing channel brought each customer — so you can't double down on what works or cut what doesn't.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-8"
              >
                <p className="font-heading text-4xl font-extrabold text-teal-600 mb-1">
                  {item.stat}
                </p>
                <p className="font-semibold text-slate-900 mb-2">
                  {item.label}
                </p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center mt-12 text-slate-500">
            Sound familiar?{" "}
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              Learn what a true full-cycle CRM should do&nbsp;&rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  3. THE FULL LOOP SOLUTION — 7 STAGES                       */}
      {/* ============================================================ */}
      <section className="bg-slate-50 py-20 px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="font-mono text-sm uppercase tracking-widest text-teal-600 mb-3">
              The Solution
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
              7 Stages. One Platform. Zero Integrations.
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Full Loop CRM replaces every tool in your stack with a single,
              connected system. Each stage feeds the next — so nothing falls
              through the cracks.
            </p>
          </div>

          <div className="space-y-6">
            {stages.map((stage) => (
              <div
                key={stage.number}
                className="flex items-start gap-5 rounded-xl bg-white border border-slate-200 p-6 sm:p-8"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 font-heading text-sm font-bold text-white">
                  {stage.number}
                </span>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 mb-1">
                    {stage.name}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-12">
            <Link
              href="/full-loop-crm-service-features"
              className="font-cta inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-sm font-semibold text-white shadow hover:bg-teal-700 transition-colors"
            >
              See All Features in Detail&nbsp;&rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  4. WHAT MAKES FULL LOOP DIFFERENT                           */}
      {/* ============================================================ */}
      <section className="bg-white py-20 px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="font-mono text-sm uppercase tracking-widest text-teal-600 mb-3">
              The Difference
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
              What Makes Full Loop Different
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Other CRMs manage jobs. Full Loop runs your entire business —
              from generating the lead to earning the review to rebooking the
              customer next season.
            </p>
          </div>

          <div className="space-y-8">
            {differentiators.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-bold text-slate-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <span className="font-mono shrink-0 rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white whitespace-nowrap self-start">
                    {item.highlight}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/about-full-loop-crm"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              Meet the founder&nbsp;&rarr;
            </Link>
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              See 50+ supported industries&nbsp;&rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5. COMPARISON TABLE                                         */}
      {/* ============================================================ */}
      <section className="bg-slate-50 py-20 px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="font-mono text-sm uppercase tracking-widest text-teal-600 mb-3">
              Side by Side
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
              Full Loop vs. the Competition
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Other platforms handle pieces of the puzzle. Full Loop is the
              whole picture.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-900 text-white">
                  <th className="px-6 py-4 font-heading font-semibold">
                    Feature
                  </th>
                  <th className="px-6 py-4 font-heading font-semibold text-teal-400">
                    Full Loop
                  </th>
                  <th className="px-6 py-4 font-heading font-semibold">
                    Jobber
                  </th>
                  <th className="px-6 py-4 font-heading font-semibold">
                    Housecall Pro
                  </th>
                  <th className="px-6 py-4 font-heading font-semibold">
                    ServiceTitan
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i % 2 === 0
                        ? "border-b border-slate-100"
                        : "border-b border-slate-100 bg-slate-50"
                    }
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4">
                      {typeof row.fullloop === "boolean" ? (
                        row.fullloop ? (
                          <span className="text-teal-600 font-bold text-lg">
                            &#10003;
                          </span>
                        ) : (
                          <span className="text-slate-300 text-lg">
                            &mdash;
                          </span>
                        )
                      ) : (
                        <span className="font-semibold text-teal-600">
                          {row.fullloop}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {typeof row.jobber === "boolean" ? (
                        row.jobber ? (
                          <span className="text-slate-700 text-lg">
                            &#10003;
                          </span>
                        ) : (
                          <span className="text-slate-300 text-lg">
                            &mdash;
                          </span>
                        )
                      ) : (
                        <span className="text-slate-600">{row.jobber}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {typeof row.housecall === "boolean" ? (
                        row.housecall ? (
                          <span className="text-slate-700 text-lg">
                            &#10003;
                          </span>
                        ) : (
                          <span className="text-slate-300 text-lg">
                            &mdash;
                          </span>
                        )
                      ) : (
                        <span className="text-slate-600">{row.housecall}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {typeof row.servicetitan === "boolean" ? (
                        row.servicetitan ? (
                          <span className="text-slate-700 text-lg">
                            &#10003;
                          </span>
                        ) : (
                          <span className="text-slate-300 text-lg">
                            &mdash;
                          </span>
                        )
                      ) : (
                        <span className="text-slate-600">
                          {row.servicetitan}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center mt-8 text-slate-500 text-sm">
            <Link
              href="/full-loop-crm-pricing"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              See Full Loop pricing details&nbsp;&rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. 100% AUTONOMOUS MODE                                     */}
      {/* ============================================================ */}
      <section className="bg-slate-900 py-20 px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="font-mono text-sm uppercase tracking-widest text-teal-400 mb-3">
              Full Autonomy
            </p>
            <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl mb-4">
              100% Autonomous Mode
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto text-lg leading-relaxed">
              Flip one switch. Your business runs itself. Full Loop handles
              every repetitive task so you can focus on growth, quality, and
              the work you actually enjoy.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Runs without you */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-8">
              <h3 className="font-heading text-lg font-bold text-teal-400 mb-6">
                What Runs Without You
              </h3>
              <ul className="space-y-3">
                {autonomousRuns.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-slate-300 text-sm"
                  >
                    <span className="text-teal-400 font-bold mt-0.5">
                      &#10003;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Still needs you */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-8">
              <h3 className="font-heading text-lg font-bold text-yellow-300 mb-6">
                What Still Needs You
              </h3>
              <ul className="space-y-3">
                {humanDecisions.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-slate-300 text-sm"
                  >
                    <span className="text-yellow-300 font-bold mt-0.5">
                      &#9679;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-slate-400 text-sm leading-relaxed">
                These are the strategic decisions that only you can make. Full
                Loop frees you from everything else so these get the attention
                they deserve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  7. FINAL CTA                                                */}
      {/* ============================================================ */}
      <section className="bg-white py-20 px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
            Ready to Close the Loop?
          </h2>
          <p className="text-slate-600 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            One platform. One partner per territory. Full autonomy from day
            one. See if your market is still available.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/partner-with-full-loop-crm"
              className="font-cta inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-teal-700 transition-colors"
            >
              Request Partnership
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="font-cta inline-block rounded-lg border border-slate-300 px-8 py-3.5 text-sm font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-600 transition-colors"
            >
              View Pricing
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              Features
            </Link>
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              Industries
            </Link>
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              CRM 101
            </Link>
            <Link
              href="/about-full-loop-crm"
              className="text-teal-600 font-semibold underline underline-offset-2 hover:text-teal-700"
            >
              About
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
