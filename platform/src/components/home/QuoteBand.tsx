import { C, display, mono } from "./editorial";

interface QuoteBandProps {
  quote: React.ReactNode;
  /** Optional small line under the quote (mono eyebrow). */
  sub?: string;
  /** Dark (ink) variant; default is cream. */
  dark?: boolean;
}

// Full-width editorial statement band — big Fraunces pull-quote that breaks up
// the content sections and carries a brand claim.
export default function QuoteBand({ quote, sub, dark = false }: QuoteBandProps) {
  const bg = dark ? C.ink : C.cream;
  const fg = dark ? C.cream : C.ink;
  const accent = dark ? "#6FB58A" : C.good;
  return (
    <section style={{ background: bg, color: fg }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-24 sm:py-32 text-center">
        <span aria-hidden style={{ fontFamily: display, fontSize: "64px", lineHeight: 0.5, color: accent, display: "block", marginBottom: "8px" }}>
          &ldquo;
        </span>
        <p
          style={{
            fontFamily: display,
            fontWeight: 500,
            fontStyle: "italic",
            letterSpacing: "-0.025em",
            lineHeight: 1.08,
            color: fg,
            fontSize: "clamp(30px, 4.4vw, 58px)",
          }}
          className="max-w-4xl mx-auto"
        >
          {quote}
        </p>
        {sub && (
          <p
            style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginTop: "28px" }}
          >
            {sub}
          </p>
        )}
      </div>
    </section>
  );
}
