// Closing CTA — the application ask, plus one more set of verify-it-yourself links.
import Link from "next/link";
import { C, display, mono } from "./cs";

export default function Cta() {
  return (
    <section style={{ background: C.ink, color: C.cream }} className="border-t">
      <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-24 text-center">
        <h2 style={{ fontFamily: display, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.04, color: C.cream, fontSize: "clamp(32px, 4.4vw, 60px)" }} className="max-w-3xl mx-auto">
          Want the machine that runs The NYC Maid working in your market?
        </h2>
        <p className="mt-7 max-w-2xl mx-auto" style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "clamp(17px, 1.5vw, 20px)", lineHeight: 1.6, color: "#D8D8D2" }}>
          One operator per trade per city. You&apos;d start where The NYC Maid is now — the booking engine, the AI front office, the dispatch, the payments and payouts, the acquisition machine, already built and already proven. If your market is still open, the next step is a short application.
        </p>

        <div className="mt-11 flex flex-wrap justify-center gap-4">
          <a href="/#lead-form" className="inline-flex items-center justify-center transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: mono, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink, background: "#6FB58A", padding: "18px 34px", borderRadius: "2px", fontWeight: 700 }}>
            I Want This — Submit Application →
          </a>
          <Link href="/full-loop-crm-service-features" className="inline-flex items-center justify-center transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: mono, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.cream, border: "1px solid #3A3A3A", padding: "18px 34px", borderRadius: "2px" }}>
            See how the platform works →
          </Link>
        </div>

        <p className="mt-12" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7E7E7A" }}>
          Verify everything first ·{" "}
          <a href="https://www.google.com/search?q=nyc+maid" target="_blank" rel="noopener noreferrer" style={{ color: "#6FB58A", textDecoration: "underline" }}>Google &ldquo;nyc maid&rdquo;</a>{" · "}
          <a href="https://www.thenycmaid.com" target="_blank" rel="noopener noreferrer" style={{ color: "#6FB58A", textDecoration: "underline" }}>the live site</a>{" · "}
          <a href="https://www.thenycmaid.com/chat-with-yinez" target="_blank" rel="noopener noreferrer" style={{ color: "#6FB58A", textDecoration: "underline" }}>talk to Yinez</a>{" · "}
          <a href="https://www.thenycmaid.com/api/public/case-study-stats" target="_blank" rel="noopener noreferrer" style={{ color: "#6FB58A", textDecoration: "underline" }}>the raw numbers</a>
        </p>
      </div>
    </section>
  );
}
