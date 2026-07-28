import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema,
  softwareApplicationSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/schema";

/* ------------------------------------------------------------------ */
/*  SEO metadata                                                       */
/* ------------------------------------------------------------------ */
export const metadata: Metadata = {
  title:
    "$2,500/Month Flat, Unlimited Users | Full Loop CRM — One Trade Per City",
  description:
    "$2,500/month flat, unlimited users. $25,000 one-time setup. You own everything we build — your website, its code, and your domain are yours from day one. Cancel anytime and keep it all. AI sales (Yinez), full CRM, GPS field ops, bookkeeping, e-signature, route optimization, reviews, referrals, custom website + SEO.",
  keywords: [
    "Full Loop CRM pricing",
    "home service CRM flat rate pricing",
    "exclusive territory CRM",
    "one trade per city CRM",
    "all-in-one home service platform",
    "AI receptionist CRM",
  ],
  alternates: { canonical: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing" },
  openGraph: {
    title: "$2,500/Month Flat, Unlimited Users — One Trade Per City",
    description:
      "One flat monthly rate. Unlimited users. Every feature, no tiers. Exclusive territory in your city. The first full-cycle CRM with an AI receptionist that books while you sleep.",
    url: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing",
    siteName: "Full Loop CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$2,500/Month Flat, Unlimited Users — One Trade Per City",
    description:
      "One operator per trade per city. $2,500/month flat, unlimited users, every feature included. Claim the license before a competitor does.",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Pricing", url: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing" },
];

const MONTHLY_PRICE = 2500; // flat, unlimited users
const SETUP_FEE = 25000;

const includedFeatures = [
  "Custom Next.js website with auto-generated services + service-area + neighborhood + careers pages",
  "Yinez AI agent on SMS, web chat, AND inbound email — same brain, 17 intents, bilingual EN/ES",
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
  "White-glove onboarding ($25,000 one-time setup — we do the entire build)",
];

const pricingFaqs = [
  {
    question: "Why $2,500/month flat?",
    answer:
      "That one number covers the whole platform — the AI receptionist that books leads at 11pm, the automated bookkeeping engine, the CRM, dispatch, e-signature, route optimizer, review machine, and per-tenant SEO website network. Yinez alone replaces a $300–$400/mo answering service. It doesn't change based on how many admins or field team members you add — the price is the price.",
  },
  {
    question: "Is there a contract?",
    answer:
      "No. Full Loop is month-to-month from day one. No annual commitments, no early termination fees. You stay because the platform works, not because you're locked in.",
  },
  {
    question: "What if I cancel?",
    answer:
      "Give us 30 days notice and walk away clean — no fees, no penalties, no hard feelings. Everything we built for you is yours to keep: your website, its code, and your domain go with you. We export all your client data for free (CSV, always yours). The only thing that stops is the CRM platform and Yinez AI — that's the software you were subscribing to.",
  },
  {
    question: "Do I own my website?",
    answer:
      "Yes — completely, from day one, at no extra charge. Your custom Next.js site, its code, and its domain are yours. There's no buyout, no ransom, no clawback. If you ever cancel, the website and everything we built for you stays with you. You're paying for the platform and the people running it — not renting your own site back from us.",
  },
  {
    question: "What's the setup fee?",
    answer:
      "$25,000 one-time. This covers white-glove onboarding: we build your custom website, configure Yinez AI for your trade, import your existing clients, set up your service areas and pricing, integrate payments and your phone/email, and test everything end-to-end before you go live. You don't lift a finger — you get a fully operational business platform on day one.",
  },
  {
    question: "Do I own my client data?",
    answer:
      "Yes, always. Your client data is yours from the moment it enters the system. You can export a full CSV anytime — no fees, no waiting, no hoops. If you cancel, we export everything for free as part of the offboarding process.",
  },
  {
    question: "What happens when I add a new team member?",
    answer:
      "Add them in your Team page. Users are unlimited, so your invoice doesn't change — no per-seat charge, no tier upgrades, no renegotiation, no feature gates.",
  },
  {
    question: "What if my trade is already claimed in my city?",
    answer:
      "Then that specific license is gone — Full Loop only ever runs one operator per trade per city, so there's no version of the platform where two competitors in the same trade share the same market. You can check nearby markets, join the waitlist in case the current license holder churns, or look at a different trade you also operate in. There's no negotiating a second license into an already-claimed city.",
  },
  {
    question: "How does $2,500/month compare to hiring for the same roles?",
    answer:
      "A single answering service alone typically runs $300–$400/month and only covers the phone. Add a part-time office admin for scheduling and follow-up, a bookkeeper for reconciliation and payroll, and a marketing person for reviews and social — and the fully-loaded monthly cost of those roles is usually several times $2,500, before benefits, before turnover, before the person who quits and needs replacing. The platform doesn't call in sick, doesn't need training, and runs the same way at 11pm as it does at 11am.",
  },
  {
    question: "Is HR included in the $2,500?",
    answer:
      "The HR module exists in the dashboard today, but it's genuinely the newest and least-built-out piece of the platform — team documents and onboarding paperwork, not yet a full automated HR agent. It's included at no extra cost, and it's actively being built out, but it shouldn't be the reason you sign up. The booking, dispatch, payments, AI front office, and acquisition engine are the mature, load-bearing parts of what $2,500/month buys today.",
  },
  {
    question: "Can I run more than one location or brand on one subscription?",
    answer:
      "Each subscription is scoped to one trade in one city — that's the exclusivity the license is built around. Operators who want to run a second trade, or the same trade in a second city, apply for that as a separate license, subject to the same one-per-city rule everyone else operates under.",
  },
  {
    question: "How am I billed, and when does the setup fee happen?",
    answer:
      "The $25,000 setup fee is billed once, up front, and covers the entire white-glove build before you go live. The $2,500/month subscription starts once your platform is live and begins running your business — you're not paying the monthly fee while your site and AI agent are still being configured.",
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
          "$2,500/month flat, unlimited users. $25,000 one-time setup. You own everything we build — website, code, and domain are yours from day one. Cancel anytime and keep it all. One operator per trade per city.",
          "https://homeservicesbusinesscrm.com/full-loop-crm-pricing",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(pricingFaqs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />
      <JsonLd data={softwareApplicationSchema(String(MONTHLY_PRICE), "USD")} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />

      {/* -- 1. Hero ------------------------------------------------ */}
      <section className="bg-slate-900 py-24 px-6 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-mono uppercase tracking-widest text-teal-400">
            One Trade. One City. One License.
          </p>
          <h1 className="text-4xl font-extrabold font-heading text-white sm:text-5xl lg:text-6xl">
            $2,500 a month.{" "}
            {/* Explicit color, not the text-yellow-300 utility class — that
                class is globally remapped to a brown "warn" tone in
                globals.css for other contexts, which read wrong here on a
                dark hero where it needs to actually read as yellow. */}
            <span style={{ color: "#FDE047" }}>Unlimited users.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 sm:text-xl max-w-2xl mx-auto">
            One simple model: $2,500/mo flat, no matter how many admins or
            field team members you add. The whole platform from day one —
            Yinez AI, full CRM, GPS field operations, bookkeeping, e-signature,
            routes, reviews, referrals, and your custom site network. No
            per-seat fees, no tiers, no feature gates.
          </p>
          <p className="mt-4 text-base text-white font-semibold max-w-2xl mx-auto">
            You own everything we build — your website, its code, and your domain
            are yours from day one. Cancel anytime and you keep all of it.
          </p>
          <p className="mt-4 text-sm font-mono text-teal-400 tracking-wide">
            No contracts. Month to month. But once a territory is claimed it&apos;s off the board.
          </p>
        </div>
      </section>

      {/* -- 2. Single flat price ------------------------------------ */}
      <section className="py-20 px-6 bg-white" id="pricing">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-600 mb-2">
              $25,000 one-time setup &middot; All features included
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              One Price. Unlimited Users. Every Feature.
            </h2>
          </div>

          {/* Headline price */}
          <div className="mx-auto max-w-md rounded-2xl border-2 border-teal-600 bg-white p-10 shadow-xl text-center">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-600 mb-2">
              Flat monthly rate
            </p>
            <p className="flex items-baseline justify-center gap-1">
              <span className="text-6xl font-extrabold font-heading text-slate-900">
                ${MONTHLY_PRICE.toLocaleString()}
              </span>
              <span className="text-xl text-slate-500">/mo</span>
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Every feature included. Add admins and field team members at no
              extra cost — the price doesn&apos;t change. No gates, no upgrades,
              no per-seat billing.
            </p>
            <Link
              href="/waitlist"
              className="mt-6 block w-full rounded-lg bg-teal-600 px-6 py-3 text-center text-sm font-cta font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
            >
              Inquire
            </Link>
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            No contracts. Month to month. Cancel anytime. ${SETUP_FEE.toLocaleString()} one-time setup.
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
                    Yours to keep even if you cancel
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
                    <strong>Yours from day one</strong> — no buyout, no extra fee
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    We build, host &amp; manage it while you&apos;re with us
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    Cancel anytime — the site, code &amp; domain go with you
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
                  <span className="text-teal-600 mt-0.5 font-bold" aria-hidden="true">&#10003;</span>
                  <span>
                    Yours to keep if you leave — it&apos;s your profile
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

      {/* -- 5b. What $2,500/month actually runs, module by module -- */}
      <section className="py-20 px-6 bg-white" id="whats-included">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              What You&apos;re Actually Paying For
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              Every Dashboard Module, Included
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              This isn&apos;t a feature list written for a sales page — it&apos;s the actual dashboard nav
              an operator logs into, at no extra cost per module.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "The Loop", desc: "Executive home — revenue, today's jobs, hot leads, conversion, system status." },
              { name: "Clients", desc: "All clients, SMS inbox, per-client feedback, lifecycle status, lifetime value." },
              { name: "ComHub", desc: "Every conversation surface in one hub, including Loop Connect's Slack-style channels." },
              { name: "Sales", desc: "Leads, pipeline, quotes, e-signature, invoices — plus Catalog, Sales Partners, and Referrals." },
              { name: "Production", desc: "Bookings, multi-day Projects, Schedule, Crews, staffing lookup, announcements." },
              { name: "Finance", desc: "Ledger, bank-import reconciliation, P&L, AR aging, payroll, 1099-ready exports." },
              { name: "HR", desc: "Team documents and onboarding — the newest module, still actively expanding." },
              { name: "Marketing", desc: "Campaigns, reviews, social, Google Business Profile, your website, analytics." },
              { name: "Platform", desc: "Onboarding checklist, settings, users, the AI agent's own admin surface, legal." },
            ].map((m) => (
              <div key={m.name} className="rounded-xl border border-slate-200 p-6">
                <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">{m.name}</h3>
                <p className="text-sm text-slate-600">{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-500 max-w-2xl mx-auto">
            No module here is a paid add-on or a higher-tier unlock. The $2,500/month price includes
            all nine, for every user you add, from day one.
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
              Why It&apos;s Priced This Way
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
                What Yinez alone replaces
              </p>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li>📞 Answering service / receptionist — <span className="font-mono text-white">$300–$400/mo</span></li>
                <li>💬 24/7 SMS + web chat coverage — <span className="font-mono text-white">$200–$500/mo</span></li>
                <li>🌍 Bilingual EN/ES dispatcher — <span className="font-mono text-white">$1,500+/mo</span></li>
                <li>🧠 Lead-qualification specialist — <span className="font-mono text-white">$2,000+/mo</span></li>
              </ul>
              <p className="mt-5 pt-5 border-t border-slate-700 text-sm text-teal-300">
                Yinez replaces a <strong>$4,000+/mo</strong> front office. Books while you sleep, never asks for time off.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-8">
              <p className="text-sm font-mono uppercase tracking-widest text-teal-400 mb-3">
                What every field team member gets — unlimited, included
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
                Every team member is a fully-equipped field operator — not just a CRM login. Add as many as you need.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-xl border-2 border-teal-400 bg-slate-800 p-8 text-center">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-400 mb-2">
              The category doesn&apos;t have a comparison
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold font-heading text-white max-w-3xl mx-auto leading-snug">
              Yinez + the website + GPS + bookkeeping + e-sign + routes + reviews + referrals + Google + social — in one platform, with exclusive territory — doesn&apos;t exist anywhere else, at any price.
            </p>
            <p className="mt-4 text-yellow-300 font-cta uppercase tracking-widest text-sm">
              $2,500/month flat, unlimited users, is the floor.
            </p>
          </div>
        </div>
      </section>

      {/* -- 7. How $2,500 Pays for Itself --------------------------- */}
      <section className="py-20 px-6 bg-white" id="cheap-math">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              The Receipt
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              Why This Is Cheap
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
                  <td className="px-5 py-3 font-bold text-teal-700">Full Loop CRM — unlimited users, all of it included</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-teal-700">$2,500/mo</td>
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
              <li>✦ Yinez replying to inbound <strong>email</strong> leads automatically — no off-shelf product does this</li>
              <li>✦ IMAP-monitored Zelle / Venmo / Apple Pay / Cash App auto-match to bookings — bespoke build, ~$50K of engineering</li>
              <li>✦ 100% closed-loop attribution: visit → text → booking, source domain known per row</li>
              <li>✦ Stripe Connect crew auto-payouts the moment a job closes — no other field-service CRM ships this</li>
              <li>✦ Per-tenant Yinez persona (24 fields) + custom intent router — your business&apos;s voice, not a generic chatbot</li>
              <li>✦ Mobile team + client portals as PWA today, native app on the roadmap — included, never an upcharge</li>
              <li>✦ Exclusive territory: nobody in your trade in your city can sign up after you</li>
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
                <p className="mt-1 text-xs text-slate-600 leading-snug">conversion rate when you respond in &lt;60 sec vs &gt;5 min (HBR study). Yinez does it in seconds, 24/7.</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold font-heading text-slate-900">30–50%</p>
                <p className="mt-1 text-xs text-slate-600 leading-snug">of inbound leads arrive after-hours. Without Yinez, they call the next operator. With Yinez, they book you.</p>
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
              The real question isn&apos;t <em className="text-slate-500 font-normal">&quot;why $2,500?&quot;</em>
            </p>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold font-heading text-teal-600 max-w-3xl mx-auto leading-snug">
              It&apos;s how is it not $5,000.
            </p>
          </div>
        </div>
      </section>

      {/* -- 7b. What the $25,000 setup actually buys, week by week -- */}
      <section className="py-20 px-6 bg-slate-50" id="onboarding-timeline">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              White-Glove Onboarding
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              What Happens Before You Go Live
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              The $25,000 setup fee isn&apos;t a black box — here&apos;s the actual sequence between
              signing and your first AI-booked job.
            </p>
          </div>
          <div className="space-y-6">
            {[
              {
                week: "Week 1",
                title: "Territory lock + intake",
                detail:
                  "Your trade and city are confirmed exclusive the moment your license is signed — no other operator in that trade can claim your city afterward. We collect your service areas, pricing, existing client list, and brand assets.",
              },
              {
                week: "Week 2",
                title: "Website + AI agent build",
                detail:
                  "Your custom Next.js marketing site goes into production — services, service-area, neighborhood, and careers pages generated for your specific trade and territory. Yinez is configured with your price book, your service rules, and your business's actual policies, not a generic template.",
              },
              {
                week: "Week 3",
                title: "Integration + data import",
                detail:
                  "Payments, phone, and email get connected. Your existing client list is imported into the CRM so you're not starting from zero. Your team is set up with mobile portal access, PIN logins, and GPS check-in configured for your service radius.",
              },
              {
                week: "Week 4",
                title: "End-to-end test, then go live",
                detail:
                  "We run a full test of the loop — a lead comes in, Yinez answers it, a job gets booked, dispatched, completed, and paid — before your real customers ever touch it. Once it passes, you're live, and the $2,500/month subscription begins.",
              },
            ].map((step) => (
              <div key={step.week} className="flex gap-6 bg-white border border-slate-200 rounded-lg p-6">
                <div className="shrink-0 w-24">
                  <p className="font-mono text-xs uppercase tracking-widest text-teal-600">{step.week}</p>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
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
            One trade per city. Once a territory is claimed, it&apos;s off the
            board — but every operator who claims one runs the same complete
            platform from day one. ${MONTHLY_PRICE.toLocaleString()}/month flat, unlimited users, every feature included.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block rounded-lg bg-yellow-300 px-8 py-4 text-lg font-cta font-semibold text-slate-900 shadow-md hover:bg-yellow-400 transition-colors"
            >
              Inquire
            </Link>
            <a
              href="tel:+18445667276"
              className="inline-flex flex-col items-center rounded-lg border border-slate-600 px-8 py-4 font-cta font-semibold text-white hover:border-slate-400 transition-colors"
            >
              <span className="text-lg">Call 1-844-LOOP-CRM</span>
              <span className="text-sm text-slate-300">(844) 566-7276</span>
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Or text us anytime at{" "}
            <a
              href="sms:+18445667276"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              1-844-LOOP-CRM
            </a>{" "}
            <a
              href="sms:+18445667276"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              (844) 566-7276
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
