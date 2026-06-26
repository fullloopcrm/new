"use client";
// Sticky long-form navigation for the case study: a top reading-progress bar
// plus a desktop left-rail table of contents that highlights the active
// chapter via IntersectionObserver. Compositor-friendly (transform/opacity),
// respects reduced motion, and collapses to just the progress bar on mobile.
import { useEffect, useState } from "react";
import { C, mono, CHAPTERS } from "./cs";

export default function ReadingNav() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<string>(CHAPTERS[0]?.id ?? "");

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - doc.clientHeight;
        setProgress(scrollable > 0 ? Math.min(1, doc.scrollTop / scrollable) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const ids = CHAPTERS.map((c) => c.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Top progress bar */}
      <div aria-hidden style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", background: "transparent", zIndex: 60 }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: C.good, transformOrigin: "left", transition: "width 80ms linear" }} />
      </div>

      {/* Desktop left-rail TOC */}
      <nav
        aria-label="Case study contents"
        className="hidden xl:block"
        style={{ position: "fixed", top: "120px", left: "max(24px, calc((100vw - 1024px) / 2 - 220px))", width: "200px", zIndex: 40 }}
      >
        <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: "14px" }}>
          Contents
        </div>
        <ol className="space-y-2.5">
          {CHAPTERS.map((c) => {
            const on = active === c.id;
            return (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  style={{
                    fontFamily: mono, fontSize: "11.5px", lineHeight: 1.35,
                    color: on ? C.ink : C.muted,
                    fontWeight: on ? 600 : 400,
                    display: "block", paddingLeft: "12px",
                    borderLeft: `2px solid ${on ? C.good : "transparent"}`,
                    transition: "color 150ms, border-color 150ms",
                  }}
                >
                  <span style={{ color: on ? C.good : C.muted2 }}>{c.part}</span><br />
                  {c.nav}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
