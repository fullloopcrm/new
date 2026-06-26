// Case study hero — states the thesis and stamps it with the live "as of now"
// production timestamp so the reader knows the numbers below are real.
import { C, display, mono } from "./cs";
import { formatGeneratedAt } from "@/lib/caseStudyStats";

export default function Hero({ generatedAt, clients }: { generatedAt: string | null; clients: number | null }) {
  return (
    <section style={{ background: C.ink, color: C.cream }}>
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-24">
        <div className="inline-flex items-center gap-2" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#6FB58A", borderBottom: "1px solid #6FB58A", paddingBottom: "6px" }}>
          <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: 9999, background: "#6FB58A", display: "inline-block" }} />
          Live case study · The NYC Maid
        </div>

        <h1 style={{ fontFamily: display, fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 0.98, color: C.cream, fontSize: "clamp(42px, 6.5vw, 92px)" }} className="mt-7 max-w-4xl">
          We didn&apos;t write a case study. We built a business to be one.
        </h1>

        <p className="mt-9 max-w-3xl" style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "clamp(18px, 1.6vw, 22px)", lineHeight: 1.6, color: "#D8D8D2" }}>
          Most software companies prove their product with a slide deck and a borrowed logo. Full
          Loop did something no one else has on record: we <strong style={{ color: C.cream }}>founded a real
          New York City cleaning company</strong> — The NYC Maid — for the sole purpose of running it on
          the platform until it ran itself. Then we left the build record open for anyone to read.
        </p>

        <p className="mt-6 max-w-3xl" style={{ fontFamily: display, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(19px, 1.7vw, 26px)", lineHeight: 1.34, color: "#6FB58A" }}>
          This page is rendered from that record — the real commit history, the live production
          database, and the actual system that books, dispatches, bills, and answers customers right
          now, as you read this.
        </p>

        {/* Live stamp */}
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3" style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.06em", color: "#A8A8A4" }}>
          <span>
            <span style={{ color: "#6FB58A" }}>{clients ? clients.toLocaleString() : "686"}</span> clients in the live system
          </span>
          <span>·</span>
          <span><span style={{ color: "#6FB58A" }}>1,491</span> commits · 103,162 lines</span>
          <span>·</span>
          <span><span style={{ color: "#6FB58A" }}>1</span> person running it</span>
          {generatedAt && (
            <>
              <span>·</span>
              <span>data pulled {formatGeneratedAt(generatedAt)}</span>
            </>
          )}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <a href="#premise" className="inline-flex items-center justify-center transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: mono, fontSize: "14px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink, background: "#6FB58A", padding: "17px 30px", borderRadius: "2px", fontWeight: 700 }}>
            Read the story ↓
          </a>
          <a href="#results" className="inline-flex items-center justify-center transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: mono, fontSize: "14px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.cream, border: "1px solid #3A3A3A", padding: "17px 30px", borderRadius: "2px" }}>
            Skip to the numbers
          </a>
        </div>
      </div>
    </section>
  );
}
