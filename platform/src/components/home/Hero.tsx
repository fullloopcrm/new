import Link from "next/link";

const trustBadges = [
  { label: "One Trade Per City — Exclusive", href: "#lead-form" },
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
      className="relative"
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

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10 pb-20">
        {/* Welcome eyebrow */}
        <p
          className="mb-6"
          style={{
            fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          Welcome to Full Loop CRM
        </p>

        {/* Masthead h1 — Fraunces, big, ink */}
        <h1
          style={{
            fontFamily: "var(--display, 'Fraunces', serif)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 0.98,
            color: C.ink,
            fontSize: "clamp(38px, 5.6vw, 78px)",
          }}
          className="mb-6"
        >
          The Home Service CRM <span style={{ fontStyle: "italic" }}>that runs your business</span>{" "}
          <span style={{ textDecoration: "underline" }}>itself</span>
          <em style={{ fontStyle: "italic", fontWeight: 400, color: C.muted2 }}>.</em>
        </h1>

        {/* H2 — italic accent line */}
        <h2
          style={{
            fontFamily: "var(--body, system-ui, sans-serif)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: C.graphite,
            fontSize: "clamp(22px, 2.8vw, 40px)",
          }}
          className="mb-10"
        >
          Autonomous lead gen. Autonomous sales.
          <br />
          Autonomous operations. Autonomous payments. Autonomous reviews.{" "}
          <span style={{ color: "#2563EB" }}>Autonomous Leads To Reviews.</span>
        </h2>

        {/* Pricing line */}
        <p
          className="mb-2"
          style={{
            fontFamily: "var(--display, 'Fraunces', serif)",
            fontSize: "56px",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: C.ink,
            fontWeight: 500,
          }}
        >
          $2,500/month: unlimited users
          <br />
          $25,000: full suite website
        </p>
        <p
          className="mb-10"
          style={{
            fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
            fontSize: "13px",
            letterSpacing: "0.02em",
            color: C.muted,
          }}
        >
          ($2,500/mo covers unlimited users and unlimited territories. The
          $25K website connects directly to the CRM backend &mdash; strongly
          suggested if full automation is what you&apos;re after. One website
          per territory. The website generates both leads and job
          applications.{" "}
          <strong style={{ color: C.ink, fontWeight: 700 }}>
            You own the website 100%.
          </strong>
          )
        </p>

        {/* Subhead */}
        <p
          className="mb-10"
          style={{
            fontFamily: "var(--body, system-ui, sans-serif)",
            fontWeight: 400,
            fontSize: "clamp(16px, 1.3vw, 19px)",
            lineHeight: 1.55,
            color: C.graphite,
            letterSpacing: "-0.005em",
          }}
        >
          The first full-loop automation platform for home service businesses —
          licensed to one operator per trade per city. AI generates your leads,
          books your jobs, dispatches your team, collects payment, and earns
          reviews.{" "}
          <strong style={{ color: C.ink, fontWeight: 600 }}>
            You own the business. The platform runs it.
          </strong>
        </p>


        {/* Access strip */}
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
            Now accepting
            <span style={{ fontSize: "0.45em", color: C.muted, marginLeft: "0.5em", letterSpacing: "0" }}>
              applications
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
            One Trade &middot; One City &middot; One Operator
          </span>
        </div>

        {/* CTAs — ink, masthead-style, no glow */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <a
            href="#lead-form"
            className="inline-flex items-center justify-center font-cta transition-transform hover:-translate-y-0.5"
            style={{
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "15px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "20px 34px",
              background: C.good,
              color: C.cream,
              borderRadius: "2px",
              fontWeight: 700,
              boxShadow: "0 2px 0 rgba(0,0,0,0.18)",
            }}
          >
            Join Waitlist →
          </a>
          <a
            href="tel:+18445667276"
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
            className="inline-flex flex-col items-center justify-center font-cta leading-tight"
          >
            <span>Call 844-LOOP-CRM</span>
            <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: C.muted, marginTop: "2px" }}>(844) 566-7276</span>
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
