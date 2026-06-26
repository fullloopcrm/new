// Editorial palette + shared style helpers — matches /dashboard locked design
// system (cream + ink, Fraunces + JetBrains Mono). Single source of truth for
// the rebuilt homepage sections so nothing drifts from Hero.tsx / tokens.md.

export const C = {
  cream: "#F4F4F1",
  canvas: "#FFFFFF",
  ink: "#1C1C1C",
  graphite: "#3A3A3A",
  muted: "#6F6F6B",
  muted2: "#A8A8A4",
  line: "#C8C5BC",
  lineSoft: "#E4E2DC",
  good: "#1F4D2C",
  warn: "#8B4513",
} as const;

export const display = "var(--display, 'Fraunces', Georgia, serif)";
export const mono = "var(--mono, 'JetBrains Mono', monospace)";
export const body = "var(--body, system-ui, sans-serif)";

// mono 10px uppercase bar-label, underlined on a 100px slug — the locked
// section-label pattern from tokens.md.
export const barLabel: React.CSSProperties = {
  fontFamily: mono,
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: C.good,
  paddingBottom: "6px",
  borderBottom: `1px solid ${C.ink}`,
  display: "inline-block",
  width: "fit-content",
};

export const h2Style: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 500,
  letterSpacing: "-0.03em",
  lineHeight: 1.0,
  color: C.ink,
  fontSize: "clamp(34px, 4.4vw, 62px)",
};

export const leadStyle: React.CSSProperties = {
  fontFamily: body,
  fontWeight: 400,
  fontSize: "clamp(17px, 1.4vw, 21px)",
  lineHeight: 1.55,
  color: C.graphite,
  letterSpacing: "-0.005em",
};

export const proseStyle: React.CSSProperties = {
  fontFamily: body,
  fontWeight: 400,
  fontSize: "17px",
  lineHeight: 1.7,
  color: C.graphite,
};
