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
    "Flat $1,000 per user / month, every feature included. $999 one-time setup. Month-to-month, no contract. One operator per trade per city holds the license — AI sales, full CRM, GPS field ops, bookkeeping, reviews, and a custom SEO site.",
  keywords: [
    "Full Loop CRM pricing",
    "home service CRM pricing",
    "per user CRM pricing",
    "one trade per city CRM",
    "all-in-one home service platform pricing",
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
const SETUP_FEE = 999;

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
  "White-glove onboarding — we build the entire thing for you",
];

const pricingFaqs = [
  {
    q: "Why $1,000 per user?",
    a: "Because nothing else in this category exists. You're not buying a CRM — you're buying an AI receptionist that books leads at 11pm, an automated bookkeeping engine, a GPS field operations platform, an e-signature workflow, a route optimizer, a multi-channel review machine, and a per-tenant SEO website network. Yinez alone replaces a $300–$400/mo answering service. Every seat is worth more than $1,000 of operational lift per month.",
  },
  {
    q: "Is there a contract?",
    a: "No. Full Loop is month-to-month from day one. No annual commitments, no early termination fees. You stay because the platform works, not because you're locked in.",
  },
  {
    q: "What's the setup fee?",
    a: "$999 one-time. This covers white-glove onboarding: we build your custom website, configure Yinez AI for your trade, import your existing clients, set up your service areas and pricing, and test everything end-to-end before you go live. You don't lift a finger.",
  },
  {
    q: "What if I cancel?",
    a: "Give us 30 days notice. We export all your client data for free (CSV, always yours). Your website goes dark and Yinez stops responding, but your data walks out the door with you — no fees, no games.",
  },
  {
    q: "Do I own my client data?",
    a: "Yes, always. Your client data is yours from the moment it enters the system. Export a full CSV anytime — no fees, no waiting. If you cancel, we export everything for free as part of offboarding.",
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
            style={{
              fontFamily: display,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.0,
              fontSize: "clamp(40px, 6vw, 78px)",
            }}
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

      {/* 2. The number */}
      <section style={{ background: C.ink, color: C.cream }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p style={eyebrowStyle(C.muted2)} className="mb-4">
              The price
            </p>
            <div className="flex items-baseline gap-3">
              <span style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(64px, 10vw, 120px)", lineHeight: 0.9, letterSpacing: "-0.03em" }}>
                ${PRICE_PER_USER.toLocaleString()}
              </span>
            </div>
            <p style={{ fontFamily: mono, color: C.muted2, letterSpacing: "0.08em" }} className="uppercase text-sm mt-3">
              Per user &middot; per month
            </p>
          </div>
          <ul className="space-y-4">
            {[
              `$${SETUP_FEE} one-time setup — white-glove, we build everything`,
              "Month-to-month — no contract, no early-termination fees",
              "Every feature included on every seat — no tiers",
              "Cancel anytime and export all your data for free",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3" style={{ fontSize: "16px", lineHeight: 1.5 }}>
                <span style={{ color: C.good, marginTop: 2 }} aria-hidden>
                  &#10003;
                </span>
                <span style={{ color: C.cream }}>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Seat examples */}
      <section style={{ background: C.cream, color: C.ink }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-3">
            What it costs at your size
          </p>
          <h2 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.02em" }} className="mb-10">
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
            Plus a one-time ${SETUP_FEE} setup. 50+ seats?{" "}
            <Link href="/contact" style={{ color: C.good, textDecoration: "underline" }}>
              Talk to us
            </Link>{" "}
            — same flat rate, custom onboarding for multi-location operations.
          </p>
        </div>
      </section>

      {/* 4. What's included */}
      <section style={{ background: C.canvas, color: C.ink, borderTop: `1px solid ${C.line}` }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-3">
            Included on every seat
          </p>
          <h2 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.02em" }} className="mb-10">
            Everything. Not a starter tier.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
            {includedFeatures.map((f) => (
              <div key={f} className="flex items-start gap-3" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: "14px" }}>
                <span style={{ color: C.good, marginTop: 2 }} aria-hidden>
                  &#10003;
                </span>
                <span style={{ color: C.graphite, fontSize: "15px", lineHeight: 1.45 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section style={{ background: C.cream, color: C.ink }} className="px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <p style={eyebrowStyle(C.good)} className="mb-3">
            Pricing questions
          </p>
          <h2 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.02em" }} className="mb-10">
            The honest answers.
          </h2>
          <div className="space-y-3">
            {pricingFaqs.map((f) => (
              <details key={f.q} style={{ background: C.canvas, border: `1px solid ${C.line}` }} className="rounded-xl group">
                <summary
                  style={{ fontFamily: display, fontWeight: 500, color: C.ink, fontSize: "18px" }}
                  className="px-6 py-4 cursor-pointer list-none flex items-center justify-between"
                >
                  <span>{f.q}</span>
                  <span style={{ color: C.good }} className="text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-6 pb-5">
                  <p style={{ color: C.graphite, fontSize: "15px", lineHeight: 1.6 }}>{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Final CTA */}
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
