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
    "Pricing | Full Loop CRM — Plans Starting at $199/mo for Home Service Businesses",
  description:
    "4 simple tiers, all features included. Full Loop CRM replaces 9+ tools — CRM, website, SEO, AI booking agent, team portal, review automation and more. Plans from $199/mo. No contracts.",
  keywords: [
    "home service CRM pricing",
    "field service CRM cost",
    "CRM for service businesses pricing",
    "home service business CRM",
    "all-in-one CRM pricing",
    "Full Loop CRM pricing",
    "affordable home service CRM",
  ],
  alternates: { canonical: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing" },
  openGraph: {
    title: "Pricing | Full Loop CRM — All Features, Every Tier",
    description:
      "4 tiers starting at $199/mo. Every plan gets the same platform, same Selena AI, same website, same CRM. The only difference is team size. No contracts.",
    url: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing",
    siteName: "Full Loop CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | Full Loop CRM — All Features, Every Tier",
    description:
      "4 tiers starting at $199/mo. Every plan gets the same platform. No contracts, cancel anytime.",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Pricing", url: "https://homeservicesbusinesscrm.com/full-loop-crm-pricing" },
];

const tiers = [
  {
    name: "Starter",
    price: "$199",
    period: "/mo",
    revenue: "$0 – $100K revenue",
    teamMembers: "1 team member (solo)",
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$499",
    period: "/mo",
    revenue: "$100K – $250K revenue",
    teamMembers: "Up to 5 team members",
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$999",
    period: "/mo",
    revenue: "$250K – $1M revenue",
    teamMembers: "Unlimited team members",
    cta: "Get Started",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "Get Pricing",
    period: "",
    revenue: "$1M+ revenue",
    teamMembers: "Unlimited + multi-location",
    cta: "Contact Us",
    highlighted: false,
  },
];

const includedFeatures = [
  "Custom Next.js website with auto-generated pages (services + areas + hiring)",
  "Selena AI booking agent (SMS + web chat, bilingual EN/ES)",
  "Full CRM (clients, bookings, calendar, finance)",
  "Team portal (GPS check-in/out, video walkthroughs, 15-min heads up, earnings)",
  "Hiring pages with Google Jobs schema — applications flow to dashboard",
  "Review automation and referral program",
  "SMS + email campaigns",
  "Client portal",
  "Full SEO management",
  "White-glove onboarding ($999 setup — we do it all)",
];

const traditionalCosts = [
  { item: "Receptionist / answering service", cost: "$2,400" },
  { item: "CRM software (Jobber, Housecall Pro, etc.)", cost: "$1,800" },
  { item: "Website design + hosting", cost: "$6,000" },
  { item: "SEO agency", cost: "$12,000" },
  { item: "SMS / phone system", cost: "$1,200" },
  { item: "Review management software", cost: "$1,200" },
  { item: "Email marketing platform", cost: "$1,200" },
  { item: "Team scheduling / GPS tracking", cost: "$2,400" },
  { item: "Hiring / job board postings", cost: "$3,600" },
];

const pricingFaqs = [
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
      "$999 one-time, same for every tier. This covers white-glove onboarding: we build your custom website, configure Selena AI for your trade, import your existing clients, set up your service areas and pricing, and test everything end-to-end before you go live. You don't lift a finger.",
  },
  {
    question: "Do I own my client data?",
    answer:
      "Yes, always. Your client data is yours from the moment it enters the system. You can export a full CSV anytime — no fees, no waiting, no hoops. If you cancel, we export everything for free as part of the offboarding process.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function PricingPage() {
  const traditionalTotal = traditionalCosts.reduce((sum, { cost }) => {
    return sum + parseInt(cost.replace(/[$,]/g, ""), 10);
  }, 0);

  return (
    <>
      {/* -- Schema ------------------------------------------------- */}
      <JsonLd
        data={webPageSchema(
          "Pricing | Full Loop CRM",
          "4 simple tiers, all features included. Full Loop CRM replaces 9+ tools for home service businesses. Plans from $199/mo. No contracts.",
          "https://homeservicesbusinesscrm.com/full-loop-crm-pricing",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(pricingFaqs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />
      <JsonLd data={softwareApplicationSchema("199", "USD")} />

      {/* -- 1. Hero ------------------------------------------------ */}
      <section className="bg-slate-900 py-24 px-6 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-mono uppercase tracking-widest text-teal-400">
            Home Service CRM Pricing
          </p>
          <h1 className="text-4xl font-extrabold font-heading text-white sm:text-5xl lg:text-6xl">
            All Features. Every Tier.{" "}
            <span className="text-yellow-300">No Upsells.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 sm:text-xl max-w-2xl mx-auto">
            Every tier gets the same platform. Same Selena AI. Same website.
            Same CRM. Same everything. The only difference is how many team
            members you need.
          </p>
          <p className="mt-4 text-sm font-mono text-teal-400 tracking-wide">
            No contracts. Month to month. Cancel anytime.
          </p>
        </div>
      </section>

      {/* -- 2. Pricing Tiers --------------------------------------- */}
      <section className="py-20 px-6 bg-white" id="pricing-tiers">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-6">
            <p className="text-sm font-mono uppercase tracking-widest text-teal-600 mb-2">
              $999 one-time setup fee — same for every tier
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 p-8 flex flex-col ${
                  tier.highlighted
                    ? "border-teal-600 shadow-xl scale-[1.02] bg-white"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                    {tier.badge}
                  </span>
                )}

                <h3 className="text-lg font-bold font-heading text-slate-900">
                  {tier.name}
                </h3>

                <p className="mt-4 flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-extrabold font-heading ${
                      tier.highlighted ? "text-teal-600" : "text-slate-900"
                    }`}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-base text-slate-500">
                      {tier.period}
                    </span>
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-500">{tier.revenue}</p>

                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xs"
                    aria-hidden="true"
                  >
                    &#10003;
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {tier.teamMembers}
                  </span>
                </div>

                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  All features included — same platform as every other tier.
                </p>

                <div className="mt-auto pt-6">
                  <Link
                    href="/crm-partnership-request-form"
                    className={`block w-full rounded-lg px-6 py-3 text-center text-sm font-cta font-semibold shadow-sm transition-colors ${
                      tier.highlighted
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            No contracts. Month to month. Cancel anytime. $999 one-time setup
            included with every tier.
          </p>
          <p className="mt-3 text-center">
            <Link href="/agreement" className="text-teal-600 underline underline-offset-2 hover:text-teal-700 text-sm font-medium">
              See Transparent Terms &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* -- 3. What Every Tier Includes ----------------------------- */}
      <section className="py-20 px-6 bg-slate-50" id="whats-included">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-600">
              Zero Feature Gates
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 sm:text-4xl">
              What Every Tier Includes
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              There are no premium features behind a paywall. Every single
              tenant on Full Loop gets the complete platform from day one.
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

      {/* -- 6. What You're Replacing -------------------------------- */}
      <section className="py-20 px-6 bg-slate-900" id="cost-comparison">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="mb-2 text-sm font-mono uppercase tracking-widest text-teal-400">
              The Math
            </p>
            <h2 className="text-3xl font-extrabold font-heading text-white sm:text-4xl">
              9 Tools You're Replacing
            </h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              Most home service businesses cobble together a stack of tools that
              don't talk to each other. Full Loop replaces all of them.
            </p>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-300">
                    Tool You're Replacing
                  </th>
                  <th className="px-5 py-3 font-semibold text-slate-300 text-right">
                    Typical Cost / yr
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
                    Total without Full Loop
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
                Without Full Loop
              </p>
              <p className="text-3xl font-extrabold font-heading text-red-400">
                ${traditionalTotal.toLocaleString()}
                <span className="text-base text-slate-500">/yr</span>
              </p>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-slate-800 p-6">
              <p className="text-sm text-teal-400 mb-1 font-mono uppercase tracking-wider">
                Full Loop Starter
              </p>
              <p className="text-3xl font-extrabold font-heading text-teal-400">
                $2,388
                <span className="text-base text-teal-600">/yr</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-800 p-6">
              <p className="text-sm text-yellow-300 mb-1 font-mono uppercase tracking-wider">
                You Save Up To
              </p>
              <p className="text-3xl font-extrabold font-heading text-yellow-300">
                ${(traditionalTotal - 2_388).toLocaleString()}
                <span className="text-base text-yellow-400">/yr</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -- 7. FAQ ------------------------------------------------- */}
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
            No contracts. No feature gates. No upsells. Just the full platform
            from day one — starting at $199/mo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block rounded-lg bg-yellow-300 px-8 py-4 text-lg font-cta font-semibold text-slate-900 shadow-md hover:bg-yellow-400 transition-colors"
            >
              Get Started Today
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
