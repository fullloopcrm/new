// Reusable presentational primitives for the NYC Maid case study. Server
// components (no client JS) — pure layout/typography built on cs.ts tokens.
import React from "react";
import {
  C, display, mono, partLabel, chapterTitle, sectionTitle, minorTitle,
  prose, leadIn, pullQuote, caption, READ_WIDTH,
} from "./cs";

/** A full-bleed chapter band. `tone` sets the background rhythm. */
export function Band({
  id, tone = "cream", children, className = "",
}: {
  id?: string; tone?: "cream" | "canvas" | "ink"; children: React.ReactNode; className?: string;
}) {
  const bg = tone === "ink" ? C.ink : tone === "canvas" ? C.canvas : C.cream;
  const fg = tone === "ink" ? C.cream : C.ink;
  return (
    <section id={id} style={{ background: bg, color: fg, scrollMarginTop: "80px" }} className={`border-t ${className}`}>
      {children}
    </section>
  );
}

/** Centered reading column for long-form prose. */
export function Column({ children, wide = false, className = "" }: { children: React.ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className={`w-full ${wide ? "max-w-5xl" : "max-w-3xl"} mx-auto px-6 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  );
}

/** Chapter opener: part label + big title + optional standfirst. */
export function ChapterHead({
  part, title, standfirst, dark = false,
}: { part: string; title: string; standfirst?: React.ReactNode; dark?: boolean }) {
  return (
    <header className="pb-10">
      <span style={{ ...partLabel, color: dark ? "#6FB58A" : C.good }}>{part}</span>
      <h2 style={{ ...chapterTitle, color: dark ? C.cream : C.ink }} className="mt-4">{title}</h2>
      {standfirst && (
        <p className="mt-6" style={{ ...leadIn, color: dark ? "#E7E7E2" : C.ink }}>{standfirst}</p>
      )}
    </header>
  );
}

/** Sub-section heading within a chapter. */
export function H3({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <h3 style={{ ...sectionTitle, color: dark ? C.cream : C.ink }} className="mt-14 mb-4">{children}</h3>;
}

/** Minor heading. */
export function H4({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <h4 style={{ ...minorTitle, color: dark ? C.cream : C.ink }} className="mt-9 mb-3">{children}</h4>;
}

/** Body paragraph. */
export function P({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p style={{ ...prose, color: dark ? "#D6D6D1" : C.graphite }} className="mt-5">{children}</p>;
}

/** Editorial pull-quote that interrupts the column. */
export function Quote({ children, attribution, dark = false }: { children: React.ReactNode; attribution?: string; dark?: boolean }) {
  return (
    <figure className="my-12" style={{ borderLeft: `3px solid ${C.good}`, paddingLeft: "clamp(18px,3vw,32px)" }}>
      <blockquote style={{ ...pullQuote, color: dark ? C.cream : C.ink }}>{children}</blockquote>
      {attribution && (
        <figcaption className="mt-4" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: dark ? "#6FB58A" : C.good }}>
          {attribution}
        </figcaption>
      )}
    </figure>
  );
}

/** A stat callout grid — bordered cells, tabular figures. */
export function StatGrid({
  items, cols = 4, dark = false,
}: { items: { v: string; l: string; s?: string }[]; cols?: 2 | 3 | 4; dark?: boolean }) {
  const line = dark ? "#2E2E2E" : C.line;
  const colClass = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4";
  return (
    <div className={`mt-10 grid ${colClass}`} style={{ border: `1px solid ${line}` }}>
      {items.map((s, i) => {
        const perRow = cols === 2 ? 2 : cols === 3 ? 3 : 4;
        const notLastInRow = (i % perRow) !== perRow - 1;
        const notFirstRow = i >= perRow;
        return (
          <div key={s.l + i} className="px-5 py-7" style={{ borderRight: notLastInRow ? `1px solid ${line}` : "none", borderTop: notFirstRow ? `1px solid ${line}` : "none" }}>
            <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(26px, 3vw, 42px)", letterSpacing: "-0.025em", color: dark ? "#6FB58A" : C.ink, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
            <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: dark ? C.muted2 : C.good, marginTop: "10px", lineHeight: 1.4 }}>{s.l}</div>
            {s.s && <div style={{ fontFamily: mono, fontSize: "11px", color: dark ? "#7E7E7A" : C.muted, marginTop: "4px" }}>{s.s}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** A mono data table — the "teardown" look. rows = [label, value]. */
export function DataTable({ rows, dark = false }: { rows: [string, string][]; dark?: boolean }) {
  const line = dark ? "#2E2E2E" : C.lineSoft;
  return (
    <div className="my-8" style={{ border: `1px solid ${dark ? "#2E2E2E" : C.line}` }}>
      {rows.map(([k, v], i) => (
        <div key={k + i} className="flex items-baseline justify-between gap-4 px-4 py-3" style={{ borderTop: i ? `1px solid ${line}` : "none" }}>
          <span style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.04em", color: dark ? "#9A9A96" : C.muted }}>{k}</span>
          <span style={{ fontFamily: mono, fontSize: "12.5px", color: dark ? C.cream : C.ink, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** A single commit-log style entry: timestamp + message, monospace. */
export function LogEntry({ date, msg, dark = false }: { date: string; msg: string; dark?: boolean }) {
  return (
    <div className="flex gap-4 py-2.5" style={{ borderTop: `1px solid ${dark ? "#262626" : C.lineSoft}` }}>
      <span style={{ fontFamily: mono, fontSize: "11.5px", color: dark ? "#6FB58A" : C.good, whiteSpace: "nowrap", paddingTop: "1px" }}>{date}</span>
      <span style={{ fontFamily: mono, fontSize: "12.5px", color: dark ? "#CFCFCA" : C.graphite, lineHeight: 1.5 }}>{msg}</span>
    </div>
  );
}

/** Source-of-truth caption under data — reinforces "this is real". */
export function Source({ children }: { children: React.ReactNode }) {
  return <p className="mt-4" style={caption}>↳ {children}</p>;
}

/** A callout box for an aside / "why it matters". */
export function Callout({ title, children, dark = false }: { title?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <aside className="my-10 px-6 py-6" style={{ background: dark ? "#171717" : "rgba(31,77,44,0.04)", borderLeft: `3px solid ${C.good}` }}>
      {title && <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "#6FB58A" : C.good, marginBottom: "8px" }}>{title}</div>}
      <div style={{ ...prose, color: dark ? "#D6D6D1" : C.graphite, fontSize: "16px" }}>{children}</div>
    </aside>
  );
}

/** Horizontal bar chart for the build-velocity figure. */
export function BarChart({ data, dark = false }: { data: { label: string; value: number; note?: string }[]; dark?: boolean }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="my-10 space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-4">
          <span style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", color: dark ? "#9A9A96" : C.muted, width: "84px", textAlign: "right" }}>{d.label}</span>
          <div className="flex-1 flex items-center gap-3">
            <div style={{ height: "22px", width: `${(d.value / max) * 100}%`, minWidth: "2px", background: dark ? "#6FB58A" : C.good, borderRadius: "1px" }} />
            <span style={{ fontFamily: mono, fontSize: "12px", color: dark ? C.cream : C.ink, fontVariantNumeric: "tabular-nums" }}>{d.value}{d.note ? ` ${d.note}` : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
