import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  softwareApplicationSchema,
} from "@/lib/schema";

/* ------------------------------------------------------------------ */
/*  SEO metadata                                                       */
/* ------------------------------------------------------------------ */
const URL = "https://homeservicesbusinesscrm.com/full-loop-crm-pricing";

export const metadata: Metadata = {
  title: "Pricing — $1,000 per user / month | Full Loop CRM",
  description:
    "Flat $1,000 per user / month, every feature included. $10,000 full setup + onboarding. Month-to-month, no contract. One operator per trade per city. Own your data; the website, domain + SEO are licensed with a clear buyout.",
  keywords: [
    "Full Loop CRM pricing",
    "home service CRM pricing",
    "per user CRM pricing",
    "one trade per city CRM",
    "home service CRM buyout",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Pricing — $1,000 per user / month | Full Loop CRM",
    description:
      "Flat per-user pricing, every feature included. Exclusive territory — one operator per trade per city.",
    url: URL,
    siteName: "Full Loop CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — $1,000 per user / month | Full Loop CRM",
    description:
      "Flat per-user pricing, every feature included. One operator per trade per city.",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const PRICE_PER_USER = 1000;
const SETUP_FEE = 10000;
const WEBSITE_BUYOUT = 20000;

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Pricing", url: URL },
];

const seatExamples = [
  { label: "Solo operator", users: 1 },
  { label: "Small crew", users: 3 },
  { label: "Standard team", users: 5 },
  { label: "Mid-size", users: 10 },
  { label: "Multi-crew", users: 25 },
  { label: "Scale", users: 50 },
];

const setupIncludes = [
  "Custom Next.js website — services, service-area, neighborhood + careers pages",
  "Exact-match domain registered + configured",
  "Yinez AI configured for your trade (SMS, web chat, email)",
  "Your existing clients imported",
  "Service areas, pricing + scheduling rules set up",
  "Google Business Profile setup — categories, photos, posts",
  "End-to-end tested before you go live",
];

const includedFeatures = [
  "Custom Next.js website with auto-generated services, service-area, neighborhood + careers pages",
  "Yinez AI agent on SMS, web chat, AND inbound email — one brain, 17 intents, bilingual EN/ES",
  "Full CRM — clients, bookings, calendar, recurring schedules, smart-schedule scoring",
  "Sales suite — leads, deals + pipeline, quotes, e-signature documents, invoices, route optimization",
  "Mobile team portal — PIN login, GPS check-in/out, before/after video walkthroughs, 30-min heads-up",
  "Stripe Connect crew payouts — auto-pay your team the moment a job closes",
  "Payment monitor — auto-matches Zelle / Apple Pay / Venmo / Cash App receipts to bookings",
  "Full bookkeeping — bank import, ML transaction matching, P&L, AR aging, cash flow, payroll, 1099 + CPA portal",
  "Review automation — negative-sentiment detection + AI escalation before bad reviews go public",
  "Win-back campaigns + referral program with commission tracking",
  "Google Business Profile + Facebook + Instagram posting from one place",
  "Slack-style 'Connect' channels — your team, each client, each crew member",
  "Hiring pages with Google Jobs schema — applications flow into your admin queue",
  "Per-tenant SEO management — sitemap, IndexNow, JSON-LD, OG images",
  "Ongoing platform updates + support",
];

const youOwn = [
  "Your full client list, contacts & history",
  "Your Google reviews & reputation",
  "Your Google Business Profile",
  "Every dollar you earn from every job",
  "Free CSV export of all your data — anytime, no fees",
];

const licensed = [
  "The custom website we build for you",
  "The exact-match domain we register",
  "The SEO content network + accrued rankings",
  "Yinez AI + the full CRM platform",
  "The lead-routing phone numbers",
];

const pricingFaqs = [
  {
    q: "Why $1,000 per user?",
    a: "You're not buying a CRM — you're buying an AI receptionist that books leads at 11pm, an automated bookkeeping engine, a GPS field-operations platform, an e-signature workflow, a route optimizer, a multi-channel review machine, and a per-tenant SEO website network. Yinez alone replaces a $300–$400/mo answering service. Every seat is worth more than $1,000 of operational lift per month.",
  },
  {
    q: "What does the $10,000 setup cover?",
    a: "Everything needed to go live: we build your custom website, register and configure your exact-match domain, configure Yinez AI for your trade, import your existing clients, set up your service areas and pricing, build out your Google Business Profile, and test it all end-to-end. One fee, the entire build and onboarding — you don't lift a finger.",
  },
  {
    q: "Is there a contract?",
    a: "No. Full Loop is month-to-month from day one. No annual commitments, no early-termination fees. You stay because the platform works, not because you're locked in.",
  },
  {
    q: "What do I own, and what's licensed?",
    a: "You own everything that's yours: your client list and history, your reviews, your Google Business Profile, and every dollar you earn — exportable for free anytime. The website, domain, SEO network, Yinez AI, and platform are things we build and license to you. They're included while you subscribe.",
  },
  {
    q: "Can I buy out my website + domain?",
    a: "Yes. Your $10,000 setup builds the site, domain, and SEO foundation, and it's licensed to you while you subscribe. If you ever leave and want to keep it, the buyout is $20,000 + 10%/mo compound — that reflects the SEO value built over time (aged domain, backlinks, rankings). Everything we create for you is buyable; nothing is held hostage.",
  },
  {
    q: "What happens if I cancel?",
    a: "Give us 30 days notice. We export all your client data for free (CSV, always yours). Your website goes dark and Yinez stops responding — unless you've bought out your site + domain, in which case they're yours to keep. No games.",
  },
  {
    q: "What happens when I add a team member?",
    a: "Add them in your Team page and the next month's invoice picks up the additional seat. No tier upgrades, no renegotiation, no feature gates. Remove a seat the same way and your invoice drops the next cycle.",
  },
  {
    q: "Why only one operator per trade per city?",
    a: "Because the platform generates leads through an SEO network for your market. If two cleaning companies in the same city both ran it, they'd compete for the same leads. Exclusivity means every lead the system generates in your territory is yours.",
  },
];

/* ------------------------------------------------------------------ */
/*  Editorial palette — matches the homepage / dashboard design system */
/* ------------------------------------------------------------------ */
const C = {
  cream: "#F4F4F1",
  canvas: "#FBFBF8",
  ink: "#1C1C1C",
  graphite: "#3A3A3A",
  muted: "#6F6F6B",
  muted2: "#A8A8A4",
  line: "#C8C5BC",
  good: "#1F4D2C",
};

const display = "var(--display, 'Fraunces', serif)";
const mono = "var(--mono, 'JetBrains Mono', monospace)";

function eyebrowStyle(color: string) {
  return {
    fontFamily: mono,
    fontSize: "12px",
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color,
  };
}

const h2Style = {
  fontFamily: display,
  fontWeight: 500,
  fontSize: "clamp(28px, 4vw, 44px)",
  letterSpacing: "-0.02em",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PricingPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pricingFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Pricing — $1,000 per user / month | Full Loop CRM",
          "Flat per-user pricing, every feature included. One operator per trade per city.",
          URL,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={faqLd} />

      {/* 1. Hero */}
      <section style={{ background: C.cream, color: C.ink }} className="px-6 sm:px-8 lg:px-12 pt-16 pb-20">
        <div className="max-w-5xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-6">
            Pricing &middot; One Trade Per City
          </p>
          <h1
            style={{ fontFamily: display, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.0, fontSize: "clamp(40px, 6vw, 78px)" }}
            className="mb-6 max-w-3xl"
          >
            One price. Every feature. The whole platform.
          </h1>
          <p
            style={{ fontFamily: "var(--body, system-ui, sans-serif)", color: C.graphite, fontSize: "clamp(16px, 1.3vw, 19px)", lineHeight: 1.55 }}
            className="max-w-2xl mb-8"
          >
            Flat per-user pricing — no tiers, no feature gates, no add-ons. One
            operator holds the exclusive license for their trade in their city.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link
              href="/contact"
              style={{ backgroundColor: C.ink, color: C.cream, fontFamily: mono, letterSpacing: "0.08em" }}
              className="inline-block rounded-lg px-8 py-3.5 text-sm uppercase font-semibold hover:opacity-90 transition-opacity text-center"
            >
              Join the Waiting List
            </Link>
            <span style={{ fontFamily: mono, fontSize: "12px", color: C.muted }} className="uppercase tracking-wider">
              Currently in private beta
            </span>
          </div>
        </div>
      </section>

      {/* 2. The two numbers */}
      <section style={{ background: C.ink, color: C.cream }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div style={{ borderRight: `1px solid ${C.graphite}` }} className="md:pr-10">
            <p style={eyebrowStyle(C.muted2)} className="mb-4">Monthly</p>
            <span style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(56px, 9vw, 104px)", lineHeight: 0.9, letterSpacing: "-0.03em" }}>
              ${PRICE_PER_USER.toLocaleString()}
            </span>
            <p style={{ fontFamily: mono, color: C.muted2, letterSpacing: "0.08em" }} className="uppercase text-sm mt-3">
              Per user &middot; per month
            </p>
            <p style={{ color: C.line, fontSize: "15px", lineHeight: 1.5 }} className="mt-4">
              Every feature, every seat. Add or remove seats anytime — the next invoice adjusts.
            </p>
          </div>
          <div>
            <p style={eyebrowStyle(C.muted2)} className="mb-4">One-time setup</p>
            <span style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(56px, 9vw, 104px)", lineHeight: 0.9, letterSpacing: "-0.03em" }}>
              ${SETUP_FEE.toLocaleString()}
            </span>
            <p style={{ fontFamily: mono, color: C.muted2, letterSpacing: "0.08em" }} className="uppercase text-sm mt-3">
              The complete build
            </p>
            <ul className="mt-4 space-y-2">
              {setupIncludes.map((s) => (
                <li key={s} className="flex items-start gap-2.5" style={{ color: C.line, fontSize: "14px", lineHeight: 1.45 }}>
                  <span style={{ color: C.good, marginTop: 1 }} aria-hidden>&#10003;</span>
                  <span style={{ color: C.cream }}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p style={{ color: C.muted2, fontSize: "13px" }} className="max-w-5xl mx-auto mt-8">
          Month-to-month. No contract, no early-termination fees. Cancel anytime and export your data for free.
        </p>
      </section>

      {/* 3. Seat examples */}
      <section style={{ background: C.cream, color: C.ink }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-3">What it costs at your size</p>
          <h2 style={h2Style} className="mb-10">
            Simple math — seats &times; ${PRICE_PER_USER.toLocaleString()}.
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {seatExamples.map((s) => (
              <div key={s.label} style={{ background: C.canvas, border: `1px solid ${C.line}` }} className="rounded-xl p-6">
                <p style={{ fontFamily: mono, color: C.muted, fontSize: "11px", letterSpacing: "0.1em" }} className="uppercase mb-2">
                  {s.label} &middot; {s.users} {s.users === 1 ? "seat" : "seats"}
                </p>
                <p style={{ fontFamily: display, fontWeight: 500, fontSize: "30px", color: C.ink }}>
                  ${(s.users * PRICE_PER_USER).toLocaleString()}
                  <span style={{ fontFamily: mono, fontSize: "13px", color: C.muted }}> /mo</span>
                </p>
              </div>
            ))}
          </div>
          <p style={{ color: C.muted, fontSize: "13px" }} className="mt-6">
            Plus the one-time ${SETUP_FEE.toLocaleString()} setup. 50+ seats?{" "}
            <Link href="/contact" style={{ color: C.good, textDecoration: "underline" }}>Talk to us</Link>{" "}
            — same flat rate, custom onboarding for multi-location operations.
          </p>
        </div>
      </section>

      {/* 4. What's included */}
      <section style={{ background: C.canvas, color: C.ink, borderTop: `1px solid ${C.line}` }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-3">Included on every seat</p>
          <h2 style={h2Style} className="mb-10">Everything. Not a starter tier.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
            {includedFeatures.map((f) => (
              <div key={f} className="flex items-start gap-3" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: "14px" }}>
                <span style={{ color: C.good, marginTop: 2 }} aria-hidden>&#10003;</span>
                <span style={{ color: C.graphite, fontSize: "15px", lineHeight: 1.45 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Ownership & Buyout */}
      <section style={{ background: C.cream, color: C.ink }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-3">Ownership, in plain English</p>
          <h2 style={h2Style} className="mb-4">What you own. What&apos;s licensed. How to buy it out.</h2>
          <p style={{ color: C.graphite, fontSize: "16px", lineHeight: 1.55 }} className="max-w-2xl mb-10">
            No hostages. Everything that&apos;s yours stays yours and exports free.
            Everything we build is licensed while you subscribe — and you can buy
            it outright whenever you want.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div style={{ background: C.canvas, border: `1px solid ${C.line}` }} className="rounded-xl p-7">
              <p style={{ fontFamily: mono, color: C.good, fontSize: "12px", letterSpacing: "0.1em" }} className="uppercase mb-4">
                You own — keep forever
              </p>
              <ul className="space-y-3">
                {youOwn.map((i) => (
                  <li key={i} className="flex items-start gap-2.5" style={{ color: C.graphite, fontSize: "15px", lineHeight: 1.45 }}>
                    <span style={{ color: C.good, marginTop: 1 }} aria-hidden>&#10003;</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: C.ink, color: C.cream }} className="rounded-xl p-7">
              <p style={{ fontFamily: mono, color: C.muted2, fontSize: "12px", letterSpacing: "0.1em" }} className="uppercase mb-4">
                Licensed — buy out to keep
              </p>
              <ul className="space-y-3">
                {licensed.map((i) => (
                  <li key={i} className="flex items-start gap-2.5" style={{ color: C.line, fontSize: "15px", lineHeight: 1.45 }}>
                    <span style={{ color: C.muted2, marginTop: 1 }} aria-hidden>&bull;</span>
                    <span style={{ color: C.cream }}>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ border: `1px solid ${C.line}`, background: C.canvas }} className="rounded-xl p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p style={{ fontFamily: mono, color: C.muted, fontSize: "11px", letterSpacing: "0.1em" }} className="uppercase mb-2">If you leave — buy it out</p>
              <p style={{ fontFamily: display, fontWeight: 500, fontSize: "44px", color: C.ink }}>
                ${WEBSITE_BUYOUT.toLocaleString()}<span style={{ fontFamily: mono, fontSize: "16px", color: C.muted }}> + 10%/mo compound</span>
              </p>
            </div>
            <p style={{ color: C.graphite, fontSize: "14px", lineHeight: 1.5 }} className="max-w-sm">
              Keep the site, domain + SEO asset we built. The price compounds with
              the value — aged domain, backlinks, rankings — so the longer it works,
              the more it&apos;s worth.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section style={{ background: C.canvas, color: C.ink, borderTop: `1px solid ${C.line}` }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-3">Pricing questions</p>
          <h2 style={h2Style} className="mb-10">The honest answers.</h2>
          <div className="space-y-3">
            {pricingFaqs.map((f) => (
              <details key={f.q} style={{ background: C.cream, border: `1px solid ${C.line}` }} className="rounded-xl group">
                <summary
                  style={{ fontFamily: display, fontWeight: 500, color: C.ink, fontSize: "18px" }}
                  className="px-6 py-4 cursor-pointer list-none flex items-center justify-between gap-4"
                >
                  <span>{f.q}</span>
                  <span style={{ color: C.good }} className="text-xl group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <div className="px-6 pb-5">
                  <p style={{ color: C.graphite, fontSize: "15px", lineHeight: 1.6 }}>{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section style={{ background: C.ink, color: C.cream }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(30px, 5vw, 52px)", letterSpacing: "-0.02em" }} className="mb-4">
            One trade per city. Claim yours.
          </h2>
          <p style={{ color: C.muted2, fontSize: "17px" }} className="mb-8">
            Once a territory is claimed, it&apos;s off the board. Join the
            waiting list and we&apos;ll reach out as we open spots in your market.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              style={{ backgroundColor: C.cream, color: C.ink, fontFamily: mono, letterSpacing: "0.08em" }}
              className="inline-block rounded-lg px-8 py-3.5 text-sm uppercase font-semibold hover:opacity-90 transition-opacity"
            >
              Join the Waiting List
            </Link>
            <a
              href="tel:+18445667276"
              style={{ color: C.cream, fontFamily: mono, letterSpacing: "0.08em" }}
              className="text-sm uppercase hover:opacity-80 transition-opacity"
            >
              Call 844.Loop.CRM
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
