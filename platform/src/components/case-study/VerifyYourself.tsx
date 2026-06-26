// "Don't take our word for it" — a row of real, external, verifiable links so
// any reader can check every claim in this document for themselves. The whole
// premise is that the business is real and on the record; this makes that
// checkable in one click.
import { C, display, mono } from "./cs";

const LINKS: { label: string; href: string; what: string; external?: boolean }[] = [
  { label: "Search “nyc maid” on Google", href: "https://www.google.com/search?q=nyc+maid", what: "We rank #1 organically. 4.9★, 73 reviews. No ads.", external: true },
  { label: "The live business", href: "https://www.thenycmaid.com", what: "thenycmaid.com — book a real cleaning right now.", external: true },
  { label: "Talk to Yinez yourself", href: "https://www.thenycmaid.com/chat-with-yinez", what: "The actual AI agent that runs the front office, live.", external: true },
  { label: "The raw live stats (JSON)", href: "https://www.thenycmaid.com/api/public/case-study-stats", what: "The exact production numbers this page reads from.", external: true },
];

export default function VerifyYourself() {
  return (
    <section style={{ background: C.good, color: C.cream }}>
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-14">
        <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFE3CC" }}>
          Don&apos;t take our word for it
        </div>
        <h2 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(24px, 3vw, 38px)", letterSpacing: "-0.02em", lineHeight: 1.1, color: C.cream }} className="mt-3 max-w-3xl">
          Everything in this case study is real and public. Go check it.
        </h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.18)" }}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block px-6 py-6 transition-colors"
              style={{ background: C.good }}
            >
              <div className="flex items-center justify-between gap-3">
                <span style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(17px, 1.6vw, 21px)", letterSpacing: "-0.01em", color: C.cream }}>
                  {l.label}
                </span>
                <span aria-hidden style={{ fontFamily: mono, fontSize: "16px", color: "#BFE3CC" }} className="transition-transform group-hover:translate-x-1">↗</span>
              </div>
              <p className="mt-2" style={{ fontFamily: mono, fontSize: "12px", lineHeight: 1.5, color: "#BFE3CC" }}>{l.what}</p>
            </a>
          ))}
        </div>
        <p className="mt-6" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.04em", color: "#BFE3CC" }}>
          Or call it: (212) 202-9030 — a real line, answered by the system you&apos;re reading about.
        </p>
      </div>
    </section>
  );
}
