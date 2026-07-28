import Link from "next/link";

// Same exact visual system as the homepage Hero (src/components/home/Hero.tsx)
// — hairline grid, mono topbar, Fraunces masthead, italic accent line, access
// strip, CTA. Content (topbar right label, headline, badges) is page-specific;
// the chrome/style is identical everywhere per design direction.
const C = {
  cream: "#F4F4F1",
  ink: "#1C1C1C",
  graphite: "#3A3A3A",
  muted: "#6F6F6B",
  muted2: "#A8A8A4",
  line: "#C8C5BC",
  good: "#1F4D2C",
};

const mono = "var(--mono, 'JetBrains Mono', monospace)";
const display = "var(--display, 'Fraunces', serif)";

export interface PageHeroBadge {
  label: string;
  href: string;
}

export function PageHero({
  topbarRight,
  preHeadline,
  h1,
  h1Accent,
  h2,
  subhead,
  proofLine,
  ctaText,
  ctaHref = "/waitlist",
  badges,
}: {
  topbarRight: string;
  preHeadline: string;
  h1: React.ReactNode;
  h1Accent?: string;
  h2?: React.ReactNode;
  subhead: React.ReactNode;
  proofLine?: React.ReactNode;
  ctaText: string;
  ctaHref?: string;
  badges: PageHeroBadge[];
}) {
  return (
    <section className="relative" style={{ background: C.cream, color: C.ink }}>
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${C.ink} 1px, transparent 1px), linear-gradient(90deg, ${C.ink} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10 pb-20">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-12">
          <span style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
            Full Loop CRM <span style={{ color: C.line }}>&middot;</span> The First Business Automation Platform
          </span>
          <span style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
            {topbarRight}
          </span>
        </div>

        {/* Pre-headline */}
        <p className="mb-6" style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.good }}>
          {preHeadline}
        </p>

        {/* Masthead h1 */}
        <h1
          style={{ fontFamily: display, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 0.98, color: C.ink, fontSize: "clamp(38px, 5.5vw, 76px)" }}
          className="mb-6 max-w-5xl"
        >
          {h1}
          {h1Accent && <em style={{ fontStyle: "italic", fontWeight: 400, color: C.muted2 }}>{h1Accent}</em>}
        </h1>

        {h2 && (
          <h2
            style={{ fontFamily: display, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05, color: C.graphite, fontSize: "clamp(22px, 2.8vw, 38px)" }}
            className="mb-10 max-w-5xl"
          >
            {h2}
          </h2>
        )}

        {/* Subhead */}
        <p className="max-w-3xl mb-10" style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontWeight: 400, fontSize: "clamp(16px, 1.3vw, 19px)", lineHeight: 1.55, color: C.graphite, letterSpacing: "-0.005em" }}>
          {subhead}
        </p>

        {proofLine && (
          <p className="max-w-3xl mb-10" style={{ fontFamily: display, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(17px, 1.6vw, 22px)", lineHeight: 1.35, letterSpacing: "-0.01em", color: C.ink }}>
            {proofLine}
          </p>
        )}

        {/* Access strip */}
        <div className="flex items-baseline flex-wrap gap-x-6 gap-y-2 mb-10 pb-8" style={{ borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(32px, 4vw, 52px)", color: C.ink, letterSpacing: "-0.02em" }}>
            Now accepting
            <span style={{ fontSize: "0.45em", color: C.muted, marginLeft: "0.5em", letterSpacing: "0" }}>applications</span>
          </span>
          <span style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted }}>
            One Trade &middot; One City &middot; One Operator
          </span>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center font-cta transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: mono, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "20px 34px", background: C.good, color: C.cream, borderRadius: "2px", fontWeight: 700, boxShadow: "0 2px 0 rgba(0,0,0,0.18)" }}
          >
            {ctaText} &rarr;
          </Link>
          <span style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", color: C.muted }} className="ml-0 sm:ml-2">
            One license per trade per city. Once claimed, off the board.
          </span>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {badges.map((badge) => (
            <Link
              key={badge.label}
              href={badge.href}
              style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 14px", color: C.graphite, border: `1px solid ${C.line}`, borderRadius: "999px", background: "transparent" }}
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
