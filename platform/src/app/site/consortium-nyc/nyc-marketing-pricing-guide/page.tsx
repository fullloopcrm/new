import Link from "next/link";
import type { Metadata } from "next";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";

const title = "NYC Web Design Company Pricing Guide | Honest Costs, No Hidden Fees | Consortium NYC";
const description = "How much does a web design company in NYC actually cost? Real pricing for SEO, web design, branding, and AI automation. Plus the mistakes 85% of business owners make that cost them thousands. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/nyc-marketing-pricing-guide";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "nyc marketing pricing",
    "web design company cost nyc",
    "seo pricing new york",
    "web design cost nyc",
    "marketing agency pricing guide",
    "affordable marketing nyc",
    "seo cost per month nyc",
    "branding agency pricing new york",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "Consortium NYC",
    type: "website",
    images: [{ url: "/og-consortium.jpg", width: 1200, height: 630, alt: "Consortium NYC Pricing Guide" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-consortium.jpg"],
  },
};

/* ------------------------------------------------------------------ */
/*  Check icon                                                         */
/* ------------------------------------------------------------------ */
function Check() {
  return (
    <svg className="w-4.5 h-4.5 text-teal-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function X() {
  return (
    <svg className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const websiteFeatures = [
  "Custom design — no templates, no page builders",
  "Next.js + Tailwind CSS (Fortune 500 tech stack)",
  "Mobile-first responsive on all devices",
  "SEO architecture baked in from day one",
  "90+ Core Web Vitals score guaranteed",
  "Google Business Profile setup & optimization",
  "Contact forms, click-to-call, lead capture",
  "Hosted on Vercel — global CDN, instant deploys",
  "2 rounds of revisions included",
  "Launch in 4-6 weeks",
];

const seoFeatures = [
  "Keyword research & competitive analysis",
  "On-page optimization (titles, metas, schema, internal links)",
  "Google Business Profile management & posting",
  "Monthly content creation (2-4 pieces)",
  "Local citation building across 80+ directories",
  "Review management & automated review requests",
  "Link building & digital PR",
  "Monthly reporting with real numbers — leads, traffic, rankings",
  "Direct access to your strategist (no junior account managers)",
  "No long-term contracts — month-to-month",
];

const addOns = [
  { name: "Marketing Manager", price: "Starting at $1,000/mo", desc: "Your outsourced marketing department. Strategy, execution, reporting — we run it all." },
  { name: "Brand Strategy & Identity", price: "$2,500", desc: "Logo, brand guide, visual identity, messaging framework." },
  { name: "AI Automation", price: "$1,000/mo after $25K startup", desc: "Chatbots, AI text bots, lead follow-up, review requests, appointment booking — 24/7. Custom-built on our stack." },
  { name: "Hourly Consulting", price: "$100-$250/hr", desc: "Strategy sessions, audits, training, second opinions — by the hour." },
  { name: "Custom CRM", price: "Starts at $25K", desc: "Full management & automation platform. Lead tracking, AI text bots, scheduling, review management — built from scratch for your business." },
  { name: "Micro Site (EMD Strategy)", price: "Starting at $1,000", desc: "Exact match domain micro site built to rank page 1 in days. Targeted keyword, fast site, 10-20 pages — leads funnel to your main business." },
  { name: "Programmatic SEO", price: "Starting at $5,000", desc: "Hundreds or thousands of keyword-targeted pages deployed at scale. The same strategy that got Moodap\u2122 2,000 page 1 rankings in 2 months." },
  { name: "GBP Creation & Verification", price: "$500", desc: "Google Business Profile creation, full optimization, and verification submission. Verification not guaranteed — Google controls the process." },
];

const mistakes = [
  {
    title: "Signing 12-month contracts",
    detail: "68% of business owners who sign long-term contracts regret it within the first 3 months. If an agency needs to lock you in, it's because they know you'd leave once you saw the results — or lack of them.",
  },
  {
    title: "Paying for \"proprietary dashboards\" instead of Google Analytics",
    detail: "Some agencies build custom dashboards that show inflated numbers. When you leave, you lose access to your own data. Always demand Google Analytics and Search Console access — it's your data, not theirs.",
  },
  {
    title: "Choosing the cheapest option",
    detail: "$299/month SEO doesn't exist. At that price, you're getting automated reports and zero human work. The average NYC business that hires a cheap agency spends $3,500 before realizing nothing happened — then has to start over.",
  },
  {
    title: "Not knowing who's doing the work",
    detail: "72% of agencies outsource client work to white-label companies overseas. You're paying NYC prices for offshore work. Ask directly: who touches my account? What's their experience? Where are they located?",
  },
  {
    title: "Paying for services they don't need",
    detail: "Agencies love bundling social media management, paid ads, and email marketing into packages — even when your business doesn't need them yet. A plumber in Queens doesn't need a TikTok strategy. They need local SEO.",
  },
  {
    title: "No ownership of their website",
    detail: "Some agencies build your site on their hosting, their domain registrar, their CMS. When you leave, they hold your website hostage. You should own your domain, your hosting, and your code — period.",
  },
];

export default function PricingGuidePage() {
  const breadcrumbs = [
    { name: "Home", url: "https://www.consortiumnyc.com" },
    { name: "Pricing Guide", url },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {/* Hero */}
      <section className="pt-32 pb-12 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            NYC Web Design Pricing
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
            How Much Does Web Design in{" "}
            <span className="text-teal-400">NYC Actually Cost?</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Transparent pricing from a <Link href="/about-digital-marketing-agency-consortium-nyc" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">web design company with 25 years of experience</Link>. No hidden fees. No surprise invoices. No contracts. Plus the real talk about pricing that nobody else will give you.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>If a web design company <strong>won&apos;t tell you what things cost upfront</strong>, that&apos;s a red flag. We publish our pricing because we believe you deserve to know <strong>what you&apos;re paying for</strong> before you ever get on a call.</>}
      />

      {/* The Problem — 85% stat */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-slate-900 p-8 sm:p-12 text-center">
            <p className="text-red-400 text-6xl sm:text-7xl font-extrabold font-mono mb-4">85%</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 font-heading">
              of business owners have been taken advantage of by a web design company
            </h2>
            <p className="text-white/60 text-sm max-w-2xl mx-auto leading-relaxed">
              According to industry surveys, the vast majority of small business owners feel they&apos;ve overpaid for marketing services that didn&apos;t deliver. The problem isn&apos;t that marketing doesn&apos;t work — it&apos;s that most business owners weren&apos;t informed enough to know what they were buying, what it should cost, and what results to expect. This page exists to fix that.
            </p>
          </div>
        </div>
      </section>

      {/* Common Mistakes */}
      <section className="py-16 bg-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Before You Spend a Dollar
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              The 6 Biggest Pricing Mistakes Business Owners Make
            </h2>
            <p className="text-slate-600 text-base mt-4 max-w-2xl mx-auto">
              We&apos;ve seen thousands of businesses waste money on marketing. These are the patterns we see over and over — and exactly how to avoid them.
            </p>
          </div>

          <div className="space-y-4">
            {mistakes.map((m, i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 p-6">
                <div className="flex items-start gap-3">
                  <X />
                  <div>
                    <h3 className="text-slate-900 font-bold text-sm mb-1.5 font-heading">{m.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{m.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-xs text-center mt-6">
            Read more in our blog: <Link href="/the-marketing-blog/how-to-choose-digital-marketing-agency" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">How to Choose a Web Design Company (Without Getting Burned)</Link>
          </p>
        </div>
      </section>

      {/* What Marketing Should Actually Cost */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Industry Reality Check
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              What Marketing Actually Costs in NYC (And What You Should Expect)
            </h2>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 font-bold text-slate-900 font-heading">Service</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-900 font-heading">NYC Average</th>
                  <th className="text-left px-6 py-4 font-bold text-teal-600 font-heading">Our Avg Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 text-slate-700">Custom Website</td>
                  <td className="px-6 py-4 text-slate-500">$8,000 - $25,000+</td>
                  <td className="px-6 py-4 text-teal-600 font-bold font-mono">Starting at $4,600</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-700">Monthly SEO</td>
                  <td className="px-6 py-4 text-slate-500">$1,500 - $5,000/mo</td>
                  <td className="px-6 py-4 text-teal-600 font-bold font-mono">Starting at $950/mo</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-700">Branding Package</td>
                  <td className="px-6 py-4 text-slate-500">$5,000 - $15,000</td>
                  <td className="px-6 py-4 text-teal-600 font-bold font-mono">$2,500</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-700">Marketing Manager</td>
                  <td className="px-6 py-4 text-slate-500">$4,000 - $8,000/mo</td>
                  <td className="px-6 py-4 text-teal-600 font-bold font-mono">Starting at $1,000/mo</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-700">AI Automation</td>
                  <td className="px-6 py-4 text-slate-500">$1,000 - $3,000/mo</td>
                  <td className="px-6 py-4 text-teal-600 font-bold font-mono">$1,000/mo + $25K startup</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-700">Hourly Consulting</td>
                  <td className="px-6 py-4 text-slate-500">$200 - $500/hr</td>
                  <td className="px-6 py-4 text-teal-600 font-bold font-mono">$100-$250/hr</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-700">Custom CRM <span className="text-slate-400 text-xs">(full management &amp; automation)</span></td>
                  <td className="px-6 py-4 text-slate-500">$50,000 - $150,000+</td>
                  <td className="px-6 py-4 text-teal-600 font-bold font-mono">Starts at $25K</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-slate-500 text-xs mt-4 text-center">
            NYC averages based on Clutch.co, Agency Analytics, and SEMrush industry reports. Our pricing reflects 25 years of operational efficiency and zero overhead waste.
          </p>
        </div>
      </section>

      {/* Why We're Cheaper — Not Lower Quality */}
      <section className="py-16 bg-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Why Our Prices Are Lower
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Lower Prices. Better Results. Here&apos;s How.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: "No office overhead", detail: "We don't pay $15K/month for a Midtown office to impress you during a pitch meeting. That savings goes directly to your bottom line." },
              { title: "No junior account managers", detail: "You work directly with the person doing the work. No layers, no handoffs, no paying for someone to relay messages between you and the actual strategist." },
              { title: "No outsourcing", detail: "Everything is done in-house. We don't white-label your work to a $5/hour overseas team while charging you NYC rates." },
              { title: "We built our own tools", detail: "Our tech stack — Next.js, Supabase, Resend, Telnyx, Full Loop CRM — means we don't pay monthly fees for 12 different SaaS tools that most agencies pass on to you." },
              { title: "25 years of efficiency", detail: "We've done this long enough to know exactly what works, what doesn't, and how to get results without wasting time or money on tactics that don't move the needle." },
              { title: "No contracts = accountability", detail: "When you can leave anytime, we have to deliver every single month. That pressure makes us better — and it means you never pay for work that isn't producing results." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-white border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <Check />
                  <div>
                    <h3 className="text-slate-900 font-bold text-sm mb-1 font-heading">{item.title}</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Our Pricing
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Simple. Transparent. No Surprises.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Custom Website */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 sm:p-10 flex flex-col">
              <p className="text-teal-600 text-xs font-bold tracking-[0.15em] uppercase mb-2 font-cta">One-Time Project</p>
              <h3 className="text-2xl font-extrabold text-slate-900 font-heading">Custom Website</h3>
              <div className="mt-4 mb-6">
                <span className="text-5xl font-extrabold text-slate-900 font-mono">$4,600</span>
                <span className="text-slate-500 text-base ml-2">one-time</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {websiteFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-slate-700 text-sm">
                    <Check />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="block w-full text-center px-8 py-4 text-base font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
              >
                Start Your Project
              </Link>
              <p className="text-slate-400 text-xs text-center mt-3">50% deposit. 50% at launch. No surprises.</p>
            </div>

            {/* Monthly SEO */}
            <div className="rounded-2xl bg-white border-2 border-teal-600 shadow-lg p-8 sm:p-10 flex flex-col relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-teal-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full font-cta">
                  Most Popular
                </span>
              </div>
              <p className="text-teal-600 text-xs font-bold tracking-[0.15em] uppercase mb-2 font-cta">Ongoing Growth</p>
              <h3 className="text-2xl font-extrabold text-slate-900 font-heading">Monthly SEO</h3>
              <div className="mt-4 mb-6">
                <span className="text-5xl font-extrabold text-slate-900 font-mono">$950</span>
                <span className="text-slate-500 text-base ml-2">/month</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {seoFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-slate-700 text-sm">
                    <Check />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="block w-full text-center px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Start Ranking
              </Link>
              <p className="text-slate-400 text-xs text-center mt-3">Month-to-month. Cancel anytime. 30-day notice.</p>
            </div>
          </div>

          {/* Bundle */}
          <div className="mt-10 rounded-2xl bg-slate-900 p-8 sm:p-10 text-center">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3 font-heading">
              Bundle & Save — Website + SEO
            </h3>
            <p className="text-white/70 text-base mb-2">
              Custom website + monthly SEO for{" "}
              <span className="font-bold text-teal-400 font-mono">$5,200</span> startup +{" "}
              <span className="font-bold text-teal-400 font-mono">$950/month</span>
            </p>
            <p className="text-white/40 text-xs mb-6">
              Most popular for <Link href="/industries-we-offer-marketing-services-for/home-service-business-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">home service businesses</Link>, <Link href="/industries-we-offer-marketing-services-for/dental-practice-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">dental practices</Link>, <Link href="/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">law firms</Link>, and <Link href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">restaurants</Link> across <Link href="/services-areas-we-offer-marketing-services-in" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">all five boroughs</Link>.
            </p>
            <Link
              href="https://www.thenycmarketingcompany.com/contact"
              className="inline-block px-8 py-4 text-base font-bold text-slate-900 rounded-lg bg-white hover:bg-slate-100 transition-colors font-cta"
            >
              Get the Bundle
            </Link>
          </div>
        </div>
      </section>

      {/* Add-Ons */}
      <section className="py-16 bg-teal-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Scale When You&apos;re Ready
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Add-On Services
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {addOns.map((a) => (
              <div key={a.name} className="rounded-xl bg-white border border-slate-200 p-6 flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 mb-2 font-heading">{a.name}</h3>
                <p className="text-xl font-extrabold text-teal-600 mb-2 font-mono">{a.price}</p>
                <p className="text-slate-500 text-xs leading-relaxed flex-1">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              The Math Behind the Investment
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              What Does $950/Month Actually Get You?
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-6 text-center">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1 font-cta">Avg Leads/Month</p>
              <p className="text-3xl font-extrabold text-slate-900 font-mono">30-60</p>
              <p className="text-slate-500 text-xs mt-1">for local service businesses</p>
            </div>
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-6 text-center">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1 font-cta">Typical ROI</p>
              <p className="text-3xl font-extrabold text-teal-600 font-mono">8-15x</p>
              <p className="text-slate-500 text-xs mt-1">within 12 months</p>
            </div>
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-6 text-center">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1 font-cta">Marketing as % of Revenue</p>
              <p className="text-3xl font-extrabold text-slate-900 font-mono">&lt;10%</p>
              <p className="text-slate-500 text-xs mt-1">by year 3-5</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-600 text-sm mb-4">
              A <Link href="/industries-we-offer-marketing-services-for/plumber-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">plumber</Link> investing $950/month who gets 30 leads/month at a $500 average job value is generating <strong className="text-slate-900">$15K/month</strong> from a <strong className="text-slate-900">$950 investment</strong>. That&apos;s a <strong className="text-teal-600">15:1 ROI</strong>.
            </p>
            <Link
              href="/annual-marketing-spend-roi-calculator"
              className="inline-block px-6 py-3 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              Calculate Your ROI
            </Link>
          </div>
        </div>
      </section>

      {/* What You Own */}
      <section className="py-16 bg-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Your Business, Your Assets
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Everything We Build — You Own
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Your domain name — registered in YOUR name",
              "Your website code — full source code delivered",
              "Your Google Analytics — your property, your data",
              "Your Google Search Console — your access, always",
              "Your Google Business Profile — your account",
              "Your content — every page, every blog post, every image",
              "Your backlinks — earned for your domain, not ours",
              "Your rankings — they stay with your domain if you leave",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 bg-white rounded-lg border border-slate-200 px-4 py-3">
                <Check />
                <span className="text-slate-700 text-sm">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-xs text-center mt-6">
            If you ever leave, you take everything with you. That&apos;s how it should be. Read more about <Link href="/whats-working-in-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">our approach</Link>.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4 font-heading">
            Not Sure What You Need?
          </h2>
          <p className="text-slate-600 text-base max-w-xl mx-auto mb-8">
            Book a free strategy session. We&apos;ll look at your current setup, audit your competitors, and recommend exactly what will move the needle — whether you hire us or not. See <Link href="/nyc-marketing-company-portfolio" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">real results from real businesses</Link> or get a <Link href="/the-free-human+ai-seo-marketing-review" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">free SEO audit</Link> first.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://www.thenycmarketingcompany.com/contact"
              className="inline-block px-10 py-5 text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Schedule a Free Strategy Session
            </Link>
            <a
              href="tel:+12122029220"
              className="inline-block px-10 py-5 text-lg font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              Call (212) 202-9220
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
