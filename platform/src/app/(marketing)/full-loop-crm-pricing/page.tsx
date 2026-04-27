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
    "$1,000 per user / month | Full Loop CRM — One Trade Per Metro",
  description:
    "Flat $1,000 per user / month. Every feature included. One operator per trade per metro holds the license. AI sales (Selena), full CRM, GPS field ops, bookkeeping, e-signature, route optimization, reviews, referrals, custom website + SEO. The category doesn't have a comparison.",
  keywords: [
    "Full Loop CRM pricing",
    "home service CRM per user pricing",
    "exclusive territory CRM",
    "one trade per metro CRM",
    "all-in-one home service platform",
    "AI receptionist CRM",
  ],
  alternates: { canonical: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing" },
  openGraph: {
    title: "$1,000 per user / month — One Trade Per Metro",
    description:
      "Flat per-user pricing. Every feature, every tier. Exclusive territory in your city. The first full-cycle CRM with an AI receptionist that books while you sleep.",
    url: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing",
    siteName: "Full Loop CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$1,000 per user / month — One Trade Per Metro",
    description:
      "One operator per trade per metro. Flat per-user pricing, every feature included. Claim the license before a competitor does.",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Pricing", url: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing" },
];

const PRICE_PER_USER = 1000;
const SETUP_FEE = 999;

const seatExamples = [
  { label: "Solo operator", users: 1 },
  { label: "Small crew", users: 3 },
  { label: "Standard team", users: 5 },
  { label: "Mid-size", users: 10 },
  { label: "Multi-crew", users: 25 },
  { label: "Scale", users: 50 },
];

const includedFeatures = [
  "Custom Next.js website with auto-generated services + service-area + neighborhood + careers pages",
  "Selena AI agent on SMS, web chat, AND inbound email — same brain, 17 intents, bilingual EN/ES",
  "Full CRM (clients, bookings, calendar, recurring schedules, smart-schedule scoring)",
  "Sales suite: leads, deals + pipeline, quotes, e-signature documents, invoices, route optimization",
  "Mobile team portal (PIN login, GPS check-in/out with 528ft validation, before/after video walkthroughs, 30-min heads-up)",
  "Stripe Connect crew payouts — auto-pay your team the moment a job closes",
  "IMAP email monitor — auto-matches Zelle / Apple Pay / Venmo / Cash App receipts to bookings",
  "Full bookkeeping — bank import, ML-suggested transaction matching, chart of accounts, P&L, AR aging, cash flow, payroll, 1099-ready exports, CPA portal",
  "Review automation, negative-sentiment detection, AI escalation before bad reviews go public",
  "Win-back campaigns + referral program with commission tracking",
  "Google Business Profile + Facebook + Instagram posting from one place",
  "Slack-style 'Connect' channels — your team, each client, each crew member",
  "Hiring pages with Google Jobs schema — applications flow into your admin queue",
  "Per-tenant SEO management (sitemap, IndexNow, JSON-LD, OG images)",
  "White-glove onboarding ($999 one-time setup — we do the entire build)",
];

const pricingFaqs = [
  {
    question: "Why $1,000 per user?",
    answer:
      "Because nothing else in this category exists. You're not buying a CRM — you're buying an AI receptionist that books leads at 11pm, an automated bookkeeping engine, a GPS field operations platform, an e-signature workflow, a route optimizer, a multi-channel review machine, and a per-tenant SEO website network. Selena alone replaces a $300–$400/mo answering service. Each user seat unlocks the GPS team portal, video walkthroughs, payroll line, and earnings tracker — every seat is worth more than $1,000 of operational lift per month.",
  },
  {
    question: "Is there a contract?",
    answer:
      "No. Full Loop is month-to-month from day one. No annual commitments, no early termination fees. You stay because the platform works, not because you're locked in.",
  },
  {
    question: "What if I cancel?",
    answer:
      "Give us 30 days notice. We export all your client data for free (CSV format, always yours). Your website goes dark and your Selena AI stops responding, but your data walks out the door with you — no fees, no games.",
  },
  {
    question: "Can I buy my website?",
    answer:
      "Yes. You can buy your custom Next.js site from day one for $5,000 and own it outright. If you don't buy upfront, the site is included in your subscription. You can buy it later at a buyout price of $20,000 + 10%/mo compound — this reflects the accrued SEO value we build over time (aged domain, backlinks, rankings).",
  },
  {
    question: "What's the setup fee?",
    answer:
      "$999 one-time. This covers white-glove onboarding: we build your custom website, configure Selena AI for your trade, import your existing clients, set up your service areas and pricing, and test everything end-to-end before you go live. You don't lift a finger.",
  },
  {
    question: "Do I own my client data?",
    answer:
      "Yes, always. Your client data is yours from the moment it enters the system. You can export a full CSV anytime — no fees, no waiting, no hoops. If you cancel, we export everything for free as part of the offboarding process.",
  },
  {
    question: "What happens when I add a new team member?",
    answer:
      "Add them in your Team page and the next month's invoice picks up the additional seat. No tier upgrades, no renegotiation, no feature gates. Remove a seat the same way and your invoice drops the next cycle.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function PricingPage() {
  return (
    <>
      {/* -- Schema ------------------------------------------------- */}
      <JsonLd
        data={webPageSchema(
          "Pricing | Full Loop CRM",
          "Flat $1,000 per user / month. Every feature included. One operator per trade per metro. The category doesn't have a comparison.",
          "https://homeservicesbusinesscrm.com/full-loop-crm-pricing",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(pricingFaqs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />
      <JsonLd data={softwareApplicationSchema(String(PRICE_PER_USER), "USD")} />

      {/* -- 1. Hero ------------------------------------------------ */}
      <section className="bg-slate-900 py-24 px-6 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-mono uppercase tracking-widest text-teal-400">
            One Trade. One Metro. One License.
          </p>
          <h1 className="text-4xl font-extrabold font-heading text-white sm:text-5xl lg:text-6xl">
            $1,000 per user.{" "}
            <span className="text-yellow-300">Every feature. No tiers.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 sm:text-xl max-w-2xl mx-auto">
            Flat per-user pricing. The whole platform from day one — Selena AI,
            full CRM, GPS field operations, bookkeeping, e-signature, routes,
            reviews, referrals, and your custom site network. Add a seat, your
            invoice goes up. Remove a seat, it goes down.
          </p>
          <p className="mt-4 text-sm font-mono text-teal-400 tracking-wide">
            No contracts. Month to month. But once a territory is claimed it&apos;s off the board.
          </p>
        </div>
      </section>

      {/* -- 2. Single-price card + seat calculator ------------------ */}
      <section className="py-20 px-6 bg-white" id="pricing">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-600 mb-2">
              $999 one-time setup &middot; All features included
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              One Price. Every Seat.
            </h2>
          </div>

          {/* Headline price */}
          <div className="mx-auto max-w-md rounded-2xl border-2 border-teal-600 bg-white p-10 shadow-xl text-center">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-600 mb-2">
              Per user / per month
            </p>
            <p className="flex items-baseline justify-center gap-1">
              <span className="text-6xl font-extrabold font-heading text-slate-900">
                ${PRICE_PER_USER.toLocaleString()}
              </span>
              <span className="text-xl text-slate-500">/user/mo</span>
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Every feature, every seat, every tenant. No gates, no upgrades.
            </p>
            <Link
              href="/crm-partnership-request-form"
              className="mt-6 block w-full rounded-lg bg-teal-600 px-6 py-3 text-center text-sm font-cta font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
            >
              Claim Your Territory
            </Link>
          </div>

          {/* Seat calculator strip */}
          <div className="mt-12">
            <p className="text-center text-sm font-mono uppercase tracking-widest text-slate-600 mb-6">
              What that looks like by team size
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-5 py-3 font-semibold text-slate-700">Team</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 text-right">Users</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 text-right">Per month</th>
                    <th className="px-5 py-3 font-semibold text-slate-700 text-right">Per year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {seatExamples.map(({ label, users }) => {
                    const monthly = users * PRICE_PER_USER;
                    const yearly = monthly * 12;
                    return (
                      <tr key={users}>
                        <td className="px-5 py-3 text-slate-700 font-medium">{label}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500">{users}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-900">${monthly.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500">${yearly.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              50+ users? <Link href="/crm-partnership-request-form" className="text-teal-600 underline underline-offset-2">Talk to us</Link> — same flat rate, custom onboarding for multi-location operations.
            </p>
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            No contracts. Month to month. Cancel anytime. ${SETUP_FEE} one-time setup.
          </p>
          <p className="mt-3 text-center">
            <Link href="/agreement" className="text-teal-600 underline underline-offset-2 hover:text-teal-700 text-sm font-medium">
              See Transparent Terms &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* -- 3. What Every Seat Includes ----------------------------- */}
      <section className="py-20 px-6 bg-slate-50" id="whats-included">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              Zero Feature Gates
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              What You Get From Day 1
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Every operator on Full Loop runs the same complete platform. There
              is no premium plan, no add-on shelf, no &quot;upgrade to unlock.&quot;
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
            <ul className="grid gap-4 sm:grid-cols-2">
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
          </div>
        </div>
      </section>

      {/* -- 4. Add-Ons --------------------------------------------- */}
      <section className="py-20 px-6 bg-white" id="add-ons">
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
            {/* EMD Microsites */}
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
                EMD Micro Sites
              </h3>
              <p className="text-3xl font-extrabold font-heading text-teal-600 mb-1">
                $500
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  build + $99/yr
                </span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    <strong>You own the domain</strong> — exact-match domain
                    registered in your name
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>Built, designed &amp; optimized by Full Loop</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    $99/yr hosting &amp; maintenance after build
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>Yours to keep even if you cancel</span>
                </li>
              </ul>
            </div>

            {/* GMB Setup */}
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
                Google Business Profile Setup
              </h3>
              <p className="text-3xl font-extrabold font-heading text-teal-600 mb-1">
                $999
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  one-time
                </span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    Full GMB creation, verification &amp; optimization
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>Service area setup, categories, photos, posts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>Connected to your CRM for review automation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>
                    Buyout: $999 + 10%/mo compound if you leave
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -- 5. Asset Ownership ------------------------------------- */}
      <section className="py-20 px-6 bg-slate-50" id="ownership">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              Full Transparency
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              Asset Ownership
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              We believe you should know exactly what you own, what you can buy,
              and what happens if you leave. No surprises.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Website */}
            <div className="rounded-xl border-2 border-teal-600 bg-teal-50/40 p-8">
              <h3 className="text-lg font-bold font-heading text-teal-700 mb-4">
                Your Website
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    <strong>Buy now: $5,000</strong> — own it from day one
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    Included in subscription — we build, host &amp; manage
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5" aria-hidden="true">&#8594;</span>
                  <span>
                    Later buyout: $20,000 + 10%/mo compound (reflects accrued
                    SEO value)
                  </span>
                </li>
              </ul>
            </div>

            {/* GMB */}
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-lg font-bold font-heading text-slate-700 mb-4">
                Google Business Profile
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    We set up &amp; manage it as an add-on ($999)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5" aria-hidden="true">&#8594;</span>
                  <span>
                    Buyout if you leave: $999 + 10%/mo compound
                  </span>
                </li>
              </ul>
            </div>

            {/* Client Data */}
            <div className="rounded-xl border-2 border-teal-600 bg-teal-50/40 p-8">
              <h3 className="text-lg font-bold font-heading text-teal-700 mb-4">
                Your Client Data
              </h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    <strong>Always yours</strong> — from the moment it enters
                    the system
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>Free CSV export anytime — no fees, no waiting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    Full export included in offboarding if you cancel
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-10 text-center">
            <Link href="/agreement" className="text-teal-600 underline underline-offset-2 hover:text-teal-700 text-sm font-medium">
              Read the full ownership terms in plain language &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* -- 6. Why this price ------------------------------------- */}
      <section className="py-20 px-6 bg-slate-900" id="why-this-price">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-400">
              The Math
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-white sm:text-4xl">
              Why $1,000 Per User
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              No other CRM in this category exists. Jobber, Housecall Pro,
              ServiceTitan — they ship 30–40% of the surface area Full Loop
              ships. We don&apos;t price against them. We price against the value.
            </p>
          </div>

          {/* Value stack */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-8">
              <p className="text-sm font-mono uppercase tracking-widest text-teal-400 mb-3">
                What Selena alone replaces
              </p>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li>📞 Answering service / receptionist — <span className="font-mono text-white">$300–$400/mo</span></li>
                <li>💬 24/7 SMS + web chat coverage — <span className="font-mono text-white">$200–$500/mo</span></li>
                <li>🌍 Bilingual EN/ES dispatcher — <span className="font-mono text-white">$1,500+/mo</span></li>
                <li>🧠 Lead-qualification specialist — <span className="font-mono text-white">$2,000+/mo</span></li>
              </ul>
              <p className="mt-5 pt-5 border-t border-slate-700 text-sm text-teal-300">
                Selena replaces a <strong>$4,000+/mo</strong> front office. Books while you sleep, never asks for time off.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-8">
              <p className="text-sm font-mono uppercase tracking-widest text-teal-400 mb-3">
                What each user seat unlocks
              </p>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li>📍 GPS-verified field portal (528ft validation)</li>
                <li>🎥 Before/after video walkthroughs (proof of service)</li>
                <li>⏱️ Smart half-hour rounding + auto-pay calc</li>
                <li>📲 30-min heads-up + running-late SMS</li>
                <li>💵 Stripe Connect auto-payout on job complete</li>
                <li>📊 Earnings tracker + 1099-ready records</li>
                <li>💬 Direct line into the team Connect channels</li>
                <li>📱 Mobile team + client portals (PWA today, native app shipping)</li>
              </ul>
              <p className="mt-5 pt-5 border-t border-slate-700 text-sm text-teal-300">
                Each seat is a fully-equipped field operator — not just a CRM login.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-xl border-2 border-teal-400 bg-slate-800 p-8 text-center">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-400 mb-2">
              The category doesn&apos;t have a comparison
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold font-heading text-white max-w-3xl mx-auto leading-snug">
              Selena + the website + GPS + bookkeeping + e-sign + routes + reviews + referrals + Google + social — in one platform, with exclusive territory — doesn&apos;t exist anywhere else, at any price.
            </p>
            <p className="mt-4 text-yellow-300 font-cta uppercase tracking-widest text-sm">
              $1,000 per user is the floor.
            </p>
          </div>
        </div>
      </section>

      {/* -- 7. How $1,000 Pays for Itself --------------------------- */}
      <section className="py-20 px-6 bg-white" id="cheap-math">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              The Receipt
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              Why $1,000 Per User Is Cheap
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Build this stack à la carte and you spend more in software alone
              than Full Loop charges all-in. Then add the staff hours, the leads
              you stop losing, and the things you literally cannot buy off any
              shelf.
            </p>
          </div>

          {/* À la carte stack table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-700">If you tried to build this stack à la carte</th>
                  <th className="px-5 py-3 font-semibold text-slate-700 text-right">Typical cost / mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr><td className="px-5 py-2.5">AI receptionist that books 24/7 (Ruby, Smith.ai)</td><td className="px-5 py-2.5 text-right font-mono">$400–$700</td></tr>
                <tr><td className="px-5 py-2.5">Field service CRM (Jobber Grow, 5 users)</td><td className="px-5 py-2.5 text-right font-mono">$494</td></tr>
                <tr><td className="px-5 py-2.5">Bookkeeping software + bookkeeper retainer</td><td className="px-5 py-2.5 text-right font-mono">$390+</td></tr>
                <tr><td className="px-5 py-2.5">SEO agency + custom website maintenance</td><td className="px-5 py-2.5 text-right font-mono">$1,500</td></tr>
                <tr><td className="px-5 py-2.5">Review management (Podium, NiceJob, Birdeye)</td><td className="px-5 py-2.5 text-right font-mono">$300</td></tr>
                <tr><td className="px-5 py-2.5">Lead attribution / call tracking (CallRail + Hyros)</td><td className="px-5 py-2.5 text-right font-mono">$400</td></tr>
                <tr><td className="px-5 py-2.5">E-signature for quotes + work orders (DocuSign, 5 seats)</td><td className="px-5 py-2.5 text-right font-mono">$200</td></tr>
                <tr><td className="px-5 py-2.5">GPS time tracking + payroll seat (TSheets, 5 users)</td><td className="px-5 py-2.5 text-right font-mono">$125</td></tr>
                <tr><td className="px-5 py-2.5">Route optimization (Routific, 5 drivers)</td><td className="px-5 py-2.5 text-right font-mono">$250</td></tr>
                <tr><td className="px-5 py-2.5">SMS + email marketing (Twilio + Mailchimp)</td><td className="px-5 py-2.5 text-right font-mono">$200</td></tr>
                <tr><td className="px-5 py-2.5">Google Business Profile management</td><td className="px-5 py-2.5 text-right font-mono">$300</td></tr>
                <tr><td className="px-5 py-2.5">Hiring funnel (ZipRecruiter / Indeed sponsored)</td><td className="px-5 py-2.5 text-right font-mono">$300</td></tr>
                <tr><td className="px-5 py-2.5">Dispatch / front-office salary (1 person, allocated)</td><td className="px-5 py-2.5 text-right font-mono">$2,500+</td></tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td className="px-5 py-3 font-bold text-slate-900">Total stack cost — 5-tech operation</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-red-600">~$7,400+/mo</td>
                </tr>
                <tr className="bg-teal-50">
                  <td className="px-5 py-3 font-bold text-teal-700">Full Loop CRM — 5 users, all of it included</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-teal-700">$5,000/mo</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500 text-center">
            Software costs reflect 2026 list prices. Dispatcher allocation = 50% of one full-time salary.
          </p>

          {/* Things you cannot buy */}
          <div className="mt-12 rounded-xl border border-slate-300 bg-slate-50 p-8">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-700 mb-3">
              And the things you literally cannot buy off any shelf
            </p>
            <ul className="space-y-2.5 text-slate-700 text-sm">
              <li>✦ Selena replying to inbound <strong>email</strong> leads automatically — no off-shelf product does this</li>
              <li>✦ IMAP-monitored Zelle / Venmo / Apple Pay / Cash App auto-match to bookings — bespoke build, ~$50K of engineering</li>
              <li>✦ 100% closed-loop attribution: visit → text → booking, source domain known per row</li>
              <li>✦ Stripe Connect crew auto-payouts the moment a job closes — no other field-service CRM ships this</li>
              <li>✦ Per-tenant Selena persona (24 fields) + custom intent router — your business&apos;s voice, not a generic chatbot</li>
              <li>✦ Mobile team + client portals as PWA today, native app on the roadmap — included, never an upcharge</li>
              <li>✦ Exclusive territory: nobody in your trade in your metro can sign up after you</li>
            </ul>
          </div>

          {/* Revenue capture */}
          <div className="mt-8 rounded-xl border-2 border-teal-600 bg-white p-8">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-600 mb-3">
              Plus the leads you stop losing
            </p>
            <div className="grid gap-6 sm:grid-cols-3 text-center">
              <div>
                <p className="text-3xl font-extrabold font-heading text-slate-900">7×</p>
                <p className="mt-1 text-xs text-slate-600 leading-snug">conversion rate when you respond in &lt;60 sec vs &gt;5 min (HBR study). Selena does it in seconds, 24/7.</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-heading text-slate-900">30–50%</p>
                <p className="mt-1 text-xs text-slate-600 leading-snug">of inbound leads arrive after-hours. Without Selena, they call the next operator. With Selena, they book you.</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-heading text-slate-900">$2.5K–$8K</p>
                <p className="mt-1 text-xs text-slate-600 leading-snug">of additional monthly revenue captured by a typical operator from leads previously lost to slow response.</p>
              </div>
            </div>
          </div>

          {/* Closing line */}
          <div className="mt-12 text-center">
            <p className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 max-w-3xl mx-auto leading-snug">
              The real question isn&apos;t <em className="text-slate-500 font-normal">&quot;why $1,000?&quot;</em>
            </p>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold font-heading text-teal-600 max-w-3xl mx-auto leading-snug">
              It&apos;s how is it not $2,000.
            </p>
          </div>
        </div>
      </section>

      {/* -- 8. FAQ ------------------------------------------------- */}
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

      {/* -- 8. Final CTA ------------------------------------------- */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold font-heading text-white sm:text-4xl">
            Ready to Close the Loop?
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-xl mx-auto">
            One trade per metro. Once a territory is claimed, it&apos;s off the
            board — but every operator who claims one runs the same complete
            platform from day one. ${PRICE_PER_USER.toLocaleString()} per user, every feature included.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block rounded-lg bg-yellow-300 px-8 py-4 text-lg font-cta font-semibold text-slate-900 shadow-md hover:bg-yellow-400 transition-colors"
            >
              Claim Your Territory
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
            <Link
              href="/agreement"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              See Transparent Terms
            </Link>
          </nav>
        </div>
      </section>
    </>
  );
}
