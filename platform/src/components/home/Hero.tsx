import Link from "next/link";

const trustBadges = [
  { label: "One Trade Per City — Exclusive", href: "/full-loop-crm-pricing" },
  { label: "50+ Service Industries", href: "/full-loop-crm-service-business-industries" },
  { label: "All-in-One Full-Cycle CRM", href: "/full-loop-crm-service-features" },
  { label: "AI-Powered Automation", href: "/why-you-should-choose-full-loop-crm-for-your-business" },
  { label: "Available in Every US Metro", href: "/full-loop-crm-service-business-industries" },
];

// Editorial palette — matches /dashboard locked design system
const C = {
  cream: "#F4F4F1",
  ink: "#1C1C1C",
  graphite: "#3A3A3A",
  muted: "#6F6F6B",
  muted2: "#A8A8A4",
  line: "#C8C5BC",
  good: "#1F4D2C",
};

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center"
      style={{ background: C.cream, color: C.ink }}
    >
      {/* Hairline grid */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${C.ink} 1px, transparent 1px), linear-gradient(90deg, ${C.ink} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-24">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-12">
          <span
            style={{
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Full Loop CRM <span style={{ color: C.line }}>·</span> The First Business Automation Platform
          </span>
          <span
            style={{
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Live · NYC
          </span>
        </div>

        {/* Pre-headline */}
        <p
          className="mb-6"
          style={{
            fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
            fontSize: "12px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: C.good,
          }}
        >
          One Trade Per City &middot; One Operator Gets Everything
        </p>

        {/* Masthead h1 — Fraunces, big, ink, italic period accent */}
        <h1
          style={{
            fontFamily: "var(--display, 'Fraunces', serif)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 0.98,
            color: C.ink,
            fontSize: "clamp(48px, 8vw, 110px)",
          }}
          className="mb-8"
        >
          Your city.
          <br />
          Your trade<em style={{ fontStyle: "italic", fontWeight: 400, color: C.muted2 }}>.</em>{" "}
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>Nobody else.</em>
        </h1>

        {/* Subhead */}
        <p
          className="max-w-3xl mb-10"
          style={{
            fontFamily: "var(--display, 'Fraunces', serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(18px, 1.6vw, 22px)",
            lineHeight: 1.45,
            color: C.graphite,
            letterSpacing: "-0.005em",
          }}
        >
          The first true full-loop business automation platform — licensed to one
          operator per trade per city. When you claim the license, every AI-generated
          lead in your city routes to you. Every competitor in your trade is locked
          out of this platform — forever.
        </p>

        {/* Price strip */}
        <div
          className="flex items-baseline flex-wrap gap-x-6 gap-y-2 mb-10 pb-8"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <span
            style={{
              fontFamily: "var(--display, 'Fraunces', serif)",
              fontWeight: 500,
              fontSize: "clamp(40px, 5vw, 64px)",
              color: C.ink,
              letterSpacing: "-0.02em",
            }}
          >
            $1,000
            <span style={{ fontSize: "0.45em", color: C.muted, marginLeft: "0.25em", letterSpacing: "0" }}>
              /user/month
            </span>
          </span>
          <span
            style={{
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Flat &middot; Every Feature &middot; No Tiers
          </span>
        </div>

        {/* CTAs — ink, masthead-style, no glow */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <Link
            href="/crm-partnership-request-form"
            className="inline-flex items-center justify-center font-cta"
            style={{
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "16px 28px",
              background: C.ink,
              color: C.cream,
              borderRadius: "2px",
              fontWeight: 500,
            }}
          >
            Check My Territory →
          </Link>
          <a
            href="tel:+12122029220"
            style={{
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "15px 26px",
              background: "transparent",
              color: C.ink,
              border: `1px solid ${C.ink}`,
              borderRadius: "2px",
              fontWeight: 500,
            }}
            className="inline-flex items-center justify-center font-cta"
          >
            Call (212) 202-9220
          </a>
          <span
            style={{
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: C.muted,
            }}
            className="ml-0 sm:ml-2"
          >
            One license per trade per city. Once claimed, off the board.
          </span>
        </div>

        {/* Trust badges — hairline pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {trustBadges.map((badge) => (
            <Link
              key={badge.label}
              href={badge.href}
              style={{
                fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "8px 14px",
                color: C.graphite,
                border: `1px solid ${C.line}`,
                borderRadius: "999px",
                background: "transparent",
              }}
              className="inline-block transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            >
              {badge.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
