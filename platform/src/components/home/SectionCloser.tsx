import Link from "next/link";
import { C, mono } from "./editorial";

interface SectionCloserProps {
  /** Full-page destination for "Learn more". */
  href: string;
  /** Label for the learn-more link, e.g. "Read the full feature breakdown". */
  label: string;
  /** Optional loud-CTA label. Defaults to the application CTA. */
  formLabel?: string;
}

// Every homepage section ends here: a LOUD primary application CTA + a lighter
// secondary "learn more" button to the section's full page.
export default function SectionCloser({
  href,
  label,
  formLabel = "I Want This — Submit Application",
}: SectionCloserProps) {
  return (
    <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* LOUD primary CTA */}
      <a
        href="#lead-form"
        className="inline-flex items-center justify-center transition-transform hover:-translate-y-0.5"
        style={{
          fontFamily: mono,
          fontSize: "14px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.cream,
          background: C.good,
          padding: "18px 32px",
          borderRadius: "2px",
          fontWeight: 700,
          boxShadow: "0 2px 0 rgba(0,0,0,0.18)",
          width: "fit-content",
        }}
      >
        {formLabel} →
      </a>
      {/* Lighter secondary button */}
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-2 transition-colors hover:bg-[rgba(0,0,0,0.04)]"
        style={{
          fontFamily: mono,
          fontSize: "12px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.ink,
          background: "transparent",
          border: `1px solid ${C.line}`,
          padding: "16px 24px",
          borderRadius: "2px",
          fontWeight: 500,
          width: "fit-content",
        }}
      >
        {label} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
