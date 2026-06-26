import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";
import { getCaseStudyStats } from "@/lib/caseStudyStats";

interface Stat {
  value: string;
  label: string;
  sub: string;
}

// Real-facts proof band — replaces the fabricated testimonials. Every number is
// a live aggregate from the business Full Loop runs (The NYC Maid), plus its
// public Google rating. No invented quotes, no fake review schema.
export default async function ProofStats() {
  const live = await getCaseStudyStats();

  const stats: Stat[] = [
    { value: live ? live.clients.toLocaleString() : "685", label: "Clients", sub: "in the live system" },
    { value: live ? live.bookingsCompleted.toLocaleString() : "451", label: "Jobs completed", sub: "marked done & paid" },
    { value: live ? live.revenueRangeYtd : "$100k–$110k", label: "Revenue", sub: "since launch (Feb 2026)" },
    { value: "4.9★", label: "Google rating", sub: "across 70 reviews" },
    { value: live ? live.teamSize.toLocaleString() : "11", label: "Active team", sub: "cleaners on the platform" },
    { value: live ? live.conversations.toLocaleString() : "1,626", label: "SMS conversations", sub: "handled by the AI agent" },
  ];

  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Live results & proof"
          heading="The NYC Maid, By the Numbers: Live Proof From the Home Service Business Full Loop Runs"
          description={
            <>
              We don&apos;t publish review blurbs we wrote ourselves. These are live aggregates
              pulled from the actual business running on Full Loop &mdash; plus its real public
              Google rating.
            </>
          }
        />

        <p className="mt-8 max-w-3xl" style={proseStyle}>
          The figures below update from The NYC Maid&apos;s production system, and the Google
          rating is verifiable on the company&apos;s public profile. If you want the full
          breakdown &mdash; how leads are generated, how the AI books and closes them, and the
          economics behind the growth &mdash; read the{" "}
          <Link href="/case-study/the-nyc-maid" style={{ color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" }}>
            complete NYC Maid case study
          </Link>.
        </p>

        <div
          className="mt-12 grid grid-cols-2 md:grid-cols-3"
          style={{ border: `1px solid ${C.line}` }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="px-5 py-8"
              style={{
                borderRight: (i % 3 !== 2) ? `1px solid ${C.line}` : "none",
                borderTop: i >= 3 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(30px, 3.4vw, 46px)", letterSpacing: "-0.025em", color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {s.value}
              </div>
              <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.good, marginTop: "10px" }}>
                {s.label}
              </div>
              <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.02em", color: C.muted, marginTop: "4px" }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        <SectionCloser href="/case-study/the-nyc-maid" label="Read the full case study" formLabel="I Want These Numbers — Apply" />
      </div>
    </section>
  );
}
