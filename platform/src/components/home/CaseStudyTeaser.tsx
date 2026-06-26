import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";
import { getCaseStudyStats } from "@/lib/caseStudyStats";

interface Stat {
  value: string;
  label: string;
}

// Compact NYC Maid case-study TEASER for the homepage. The full case study
// lives on /case-study/the-nyc-maid — this only summarizes and links out.
// Live stats with static fallback.
export default async function CaseStudyTeaser() {
  const live = await getCaseStudyStats();

  const stats: Stat[] = [
    { value: live ? live.clients.toLocaleString() : "685", label: "Real clients" },
    { value: live ? live.bookingsCompleted.toLocaleString() : "451", label: "Jobs completed" },
    { value: live ? live.revenueRangeYtd : "$100k–$110k", label: "Revenue since Feb 2026" },
    { value: "4.9★", label: "70 reviews on Google" },
  ];

  return (
    <section style={{ background: C.ink, color: C.cream }}>
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          dark
          label="Home service CRM case study"
          heading="The First Home Service Business to Run Autonomously — Live on Full Loop CRM"
          description={
            <>
              The NYC Maid isn&apos;t a customer. It&apos;s a real home service company Full Loop
              built and runs in the open &mdash; managed by one person in about an hour a day,
              with the back end on display, live.
            </>
          }
        />

        <p className="mt-8 max-w-3xl" style={{ ...proseStyle, color: "#D8D8D2" }}>
          No office. No managers overseeing the crew. Nobody collecting payments. Nobody
          chasing reviews. The lead generation, the sales, the scheduling, the dispatch,
          the billing, the payouts, the review requests &mdash; all of it runs on autopilot. One
          person spends about an hour a day on the parts that genuinely need a human. And
          every client above was earned through organic search &mdash;{" "}
          <strong style={{ color: C.cream }}>not a single dollar on ads or purchased leads,
          in under six months.</strong> We believe it&apos;s the first home service business to
          run autonomously at the management level &mdash; and we&apos;re wiring its back end
          straight into this site so the numbers below update themselves, live.
        </p>

        {/* How it's run — the autonomy facts */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4" style={{ border: `1px solid #2E2E2E` }}>
          {[
            { v: "1", l: "person managing it" },
            { v: "~1 hr", l: "per day, total" },
            { v: "~40", l: "services a week & growing" },
            { v: "0", l: "admins · managers · collectors" },
          ].map((s, i) => (
            <div key={s.l} className="px-5 py-7" style={{ borderRight: i < 3 ? `1px solid #2E2E2E` : "none" }}>
              <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(28px, 3.2vw, 40px)", letterSpacing: "-0.025em", color: "#6FB58A", fontVariantNumeric: "tabular-nums" }}>
                {s.v}
              </div>
              <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted2, marginTop: "8px", lineHeight: 1.4 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* Stat bar — hairline divided */}
        <div
          className="mt-12 grid grid-cols-2 sm:grid-cols-4"
          style={{ border: `1px solid #2E2E2E` }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="px-5 py-7"
              style={{
                borderRight: i < stats.length - 1 ? `1px solid #2E2E2E` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 500,
                  fontSize: "clamp(30px, 3.4vw, 44px)",
                  letterSpacing: "-0.025em",
                  color: C.cream,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: "10px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: C.muted2,
                  marginTop: "8px",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-3xl" style={{ ...proseStyle, color: "#D8D8D2" }}>
          The full case study breaks down how the AI sales agent converts inquiries
          into booked jobs, how multi-domain organic SEO generates leads with{" "}
          <strong style={{ color: C.cream }}>zero paid ad spend</strong>, how GPS
          dispatch and auto-payouts run the field operation, and the exact economics
          behind the growth &mdash; stage by stage, with the queries to back it up.
        </p>

        {/* Dark-surface variant of the closer */}
        <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <a
            href="/case-study/the-nyc-maid"
            className="inline-flex items-center gap-2 transition-colors hover:opacity-70"
            style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6FB58A", fontWeight: 500 }}
          >
            Read the full NYC Maid case study <span aria-hidden>→</span>
          </a>
          <a
            href="#lead-form"
            className="inline-flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink, background: C.cream, padding: "12px 22px", borderRadius: "2px", fontWeight: 500, width: "fit-content" }}
          >
            Check My Territory →
          </a>
        </div>
      </div>
    </section>
  );
}
