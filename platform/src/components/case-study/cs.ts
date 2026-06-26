// Case-study design system — extends the locked editorial tokens (editorial.ts)
// with the long-form "rendered from the build record" treatment used only on
// the NYC Maid case study. Single source of truth so all chapter components
// stay visually consistent across a 20k-word document.
import { C, display, mono, body } from "@/components/home/editorial";

export { C, display, mono, body };

// Chapter / part numbering label — mono, uppercase, green, with a hairline.
export const partLabel: React.CSSProperties = {
  fontFamily: mono,
  fontSize: "11px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: C.good,
  display: "inline-block",
};

// Big chapter heading — Fraunces, tight, the spine of each Part.
export const chapterTitle: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  lineHeight: 1.02,
  color: C.ink,
  fontSize: "clamp(30px, 4.2vw, 56px)",
};

// Sub-section heading inside a chapter.
export const sectionTitle: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  lineHeight: 1.12,
  color: C.ink,
  fontSize: "clamp(22px, 2.4vw, 32px)",
};

// Minor heading (teardown sub-points).
export const minorTitle: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  lineHeight: 1.2,
  color: C.ink,
  fontSize: "clamp(18px, 1.8vw, 23px)",
};

// Long-form body prose — slightly larger line-height for sustained reading.
export const prose: React.CSSProperties = {
  fontFamily: body,
  fontWeight: 400,
  fontSize: "17.5px",
  lineHeight: 1.78,
  color: C.graphite,
  letterSpacing: "-0.003em",
};

// Lead paragraph that opens a chapter — display serif, larger, ink.
export const leadIn: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 400,
  fontSize: "clamp(20px, 2vw, 27px)",
  lineHeight: 1.4,
  color: C.ink,
  letterSpacing: "-0.01em",
};

// Pull-quote — the editorial accent that breaks up long sections.
export const pullQuote: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 500,
  fontStyle: "italic",
  fontSize: "clamp(24px, 3vw, 38px)",
  lineHeight: 1.22,
  letterSpacing: "-0.02em",
};

// Mono caption / data-source line.
export const caption: React.CSSProperties = {
  fontFamily: mono,
  fontSize: "11px",
  letterSpacing: "0.05em",
  color: C.muted,
  lineHeight: 1.6,
};

// Inline mono token (route names, table names, tool names).
export const codeToken: React.CSSProperties = {
  fontFamily: mono,
  fontSize: "0.86em",
  background: "rgba(31,77,44,0.07)",
  color: C.good,
  padding: "1px 6px",
  borderRadius: "3px",
  // Long inline commit strings must wrap on narrow screens — nowrap here was
  // overflowing the mobile viewport and widening the whole page.
  overflowWrap: "break-word",
  wordBreak: "break-word",
};

// A green inline link.
export const csLink: React.CSSProperties = {
  color: C.good,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

// Section frame widths — long-form is narrower than the home page for
// readability; data bands run wider.
export const READ_WIDTH = "max-w-3xl";
export const WIDE_WIDTH = "max-w-5xl";

// The chapters, in order — the single source of truth for the sticky TOC and
// for the in-page anchor ids. Keep ids stable; they are deep-link targets.
export type Chapter = { id: string; part: string; title: string; nav: string };

export const CHAPTERS: Chapter[] = [
  { id: "premise", part: "Part I", title: "The Premise", nav: "The Premise" },
  { id: "day-zero", part: "Part II", title: "Day Zero", nav: "Day Zero" },
  { id: "build-log", part: "Part III", title: "The Build Log", nav: "The Build Log" },
  { id: "problem", part: "Part IV", title: "The Problem", nav: "The Problem" },
  { id: "anatomy", part: "Part V", title: "Anatomy of the System", nav: "Anatomy of the System" },
  { id: "results", part: "Part VI", title: "The Results", nav: "The Results" },
  { id: "platform", part: "Part VII", title: "From a Business to a Platform", nav: "Business → Platform" },
  { id: "whats-next", part: "Part VIII", title: "Where This Goes Next", nav: "Where This Goes Next" },
  { id: "industry", part: "Part IX", title: "The Industry, Rewritten", nav: "The Industry, Rewritten" },
  { id: "proves", part: "Part X", title: "What This Proves", nav: "What This Proves" },
];
