import { C, display, barLabel, h2Style } from "./editorial";

interface SectionHeadProps {
  /** mono eyebrow label */
  label: string;
  /** Long-tail, keyword-rich H2 (SEO heading). */
  heading: string;
  /** Bold one-to-two sentence description directly under the heading. */
  description: React.ReactNode;
  /** Dark-surface variant (ink background sections). */
  dark?: boolean;
}

// Shared SEO section header: long-tail H2 + a bold heading description. Used by
// every homepage section so the structure is consistent — heading, bold
// description, then content with inner links follows in each section.
export default function SectionHead({ label, heading, description, dark = false }: SectionHeadProps) {
  const headColor = dark ? C.cream : C.ink;
  const descColor = dark ? "#E4E2DC" : C.graphite;
  const accent = dark ? "#6FB58A" : C.good;
  return (
    <header>
      <span
        style={{
          ...barLabel,
          color: accent,
          borderBottom: `1px solid ${dark ? C.cream : C.ink}`,
        }}
      >
        {label}
      </span>
      <h2 style={{ ...h2Style, color: headColor }} className="mt-6 max-w-4xl">
        {heading}
      </h2>
      <p
        className="mt-6 max-w-3xl"
        style={{
          fontFamily: display,
          fontWeight: 500,
          fontStyle: "italic",
          fontSize: "clamp(19px, 1.7vw, 24px)",
          lineHeight: 1.4,
          letterSpacing: "-0.01em",
          color: descColor,
        }}
      >
        {description}
      </p>
    </header>
  );
}
