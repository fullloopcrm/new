// "By Comparison" — the typical new cleaning business vs. The NYC Maid, across
// the dimensions that actually decide whether a startup survives. The left
// column is general industry norms (labeled as such, not a cited study); the
// right column is The NYC Maid's real figures.
import { Band, Column, P, Quote, Source } from "./Primitives";
import { C, display, mono, partLabel, sectionTitle } from "./cs";

type Row = { dim: string; avg: string; maid: string };

const ROWS: Row[] = [
  { dim: "Time to a full operating system", avg: "Most never build one — phone, spreadsheet, group text", maid: "A complete platform, live on Day 0" },
  { dim: "Cost to acquire customers", avg: "$30–$100+ per lead; hundreds to thousands / month on ads", maid: "$0 — 100% organic" },
  { dim: "After-hours inquiry response", avg: "Voicemail; many leads go cold by morning", maid: "Answered in seconds, 24/7, in EN & ES" },
  { dim: "Who works the front office", avg: "The owner, or a hired rep on payroll", maid: "Yinez, an AI agent — no payroll line" },
  { dim: "Cleaner payouts", avg: "Manual weekly checks / transfers", maid: "99%+ automatic on job completion" },
  { dim: "Staff needed to reach ~500 clients", avg: "Typically 1–3 office hires (dispatch, books, support)", maid: "Zero back-office hires" },
  { dim: "Reviews in the first ~5 months", avg: "A handful, gathered by hand", maid: "73 Google reviews at 4.9★, on autopilot" },
  { dim: "Domain Rating after ~5 months", avg: "Usually low single digits for a new site", maid: "58 — with 19K backlinks, 107 linking sites" },
  { dim: "Time to rank #1 for a head term", avg: "Often 1–3 years, if ever", maid: "#1 for “nyc maid” inside the first months" },
  { dim: "Owner’s time to run it", avg: "Full-time and then some", maid: "~1 hour a day" },
];

export default function Comparison() {
  return (
    <Band tone="cream">
      <Column wide className="py-20 sm:py-28">
        <span style={{ ...partLabel }}>Part VI · continued</span>
        <h3 style={{ ...sectionTitle, fontSize: "clamp(26px, 3.4vw, 46px)" }} className="mt-4">
          By comparison: the average cleaning startup vs. The NYC Maid
        </h3>
        <P>It&apos;s a strange thing to compare a real company against a category average, so let&apos;s be careful about it. The right column below is one specific business&apos;s real figures; the left is the honest central tendency of new cleaning startups — not the worst, not a caricature, but the ordinary case. The point of laying them side by side isn&apos;t to dunk on anyone. It&apos;s to make visible how much of what a normal startup struggles with isn&apos;t inherent to the work at all — it&apos;s an artifact of the tools. Change the tools and a long list of &ldquo;that&apos;s just how this business is&rdquo; problems quietly stop being true.</P>

        <P>The numbers in the last section only land if you know what normal looks like. Here is the honest typical path of a new cleaning business — the way the overwhelming majority actually operate — next to what The NYC Maid did on the platform. The left column isn&apos;t a strawman; it&apos;s the default, and it&apos;s why most independents never scale.</P>

        {/* Header */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr]" style={{ border: `1px solid ${C.line}` }}>
          <div className="px-5 py-4" style={{ background: C.ink }}>
            <span style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted2 }}>Dimension</span>
          </div>
          <div className="px-5 py-4" style={{ background: C.ink, borderLeft: "1px solid #2E2E2E" }}>
            <span style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A27A" }}>Typical new cleaning business</span>
          </div>
          <div className="px-5 py-4" style={{ background: C.good, borderLeft: "1px solid #2E2E2E" }}>
            <span style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#BFE3CC" }}>The NYC Maid</span>
          </div>

          {/* Rows */}
          {ROWS.map((r, i) => (
            <div key={r.dim} className="contents">
              <div className="px-5 py-5" style={{ borderTop: `1px solid ${C.line}`, background: i % 2 ? "rgba(0,0,0,0.015)" : C.canvas }}>
                <span style={{ fontFamily: display, fontWeight: 500, fontSize: "16px", letterSpacing: "-0.01em", color: C.ink, lineHeight: 1.3 }}>{r.dim}</span>
              </div>
              <div className="px-5 py-5" style={{ borderTop: `1px solid ${C.line}`, borderLeft: `1px solid ${C.lineSoft}`, background: i % 2 ? "rgba(0,0,0,0.015)" : C.canvas }}>
                <span style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "14.5px", lineHeight: 1.5, color: C.muted }}>{r.avg}</span>
              </div>
              <div className="px-5 py-5" style={{ borderTop: `1px solid ${C.line}`, borderLeft: `1px solid ${C.lineSoft}`, background: i % 2 ? "rgba(31,77,44,0.06)" : "rgba(31,77,44,0.035)" }}>
                <span style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "14.5px", lineHeight: 1.5, color: C.ink, fontWeight: 500 }}>{r.maid}</span>
              </div>
            </div>
          ))}
        </div>

        <Quote attribution="The comparison, in one line">
          The typical startup spends money to be found, time to answer, and payroll to grow. The NYC Maid spent none of the three — and outranks companies that have been at it for years.
        </Quote>

        <P>Read down the right column and notice that none of it required a breakthrough — no proprietary algorithm, no unfair advantage, no capital the average operator couldn&apos;t access. Every entry is the result of building a system instead of doing a task by hand. The typical startup isn&apos;t losing because its owner is lazy or its market is bad; it&apos;s losing because the default tools force the owner to <em>be</em> the system, and a person doesn&apos;t scale. The gap between the two columns isn&apos;t effort or talent. It&apos;s leverage — and leverage is exactly what software is for.</P>

        <P>That last point is the one worth sitting with. In the business&apos;s own Google data, it surfaces for searches like <em>&ldquo;the maids&rdquo;</em> — a national chain&apos;s brand — and <em>&ldquo;maid service nyc.&rdquo;</em> A five-month-old company is showing up on competitors&apos; names. That doesn&apos;t happen by accident or by budget. It happens because the acquisition machine and the operations machine are the same system, each feeding the other.</P>

        <P>And the comparison is, if anything, generous to the typical operator. The left column assumes a competent, hard-working owner doing everything right by conventional standards — answering when they can, buying leads that convert, paying crew on time. It is not a comparison against a bad business; it&apos;s a comparison against a <em>good</em> one operating with conventional tools. The NYC Maid&apos;s edge doesn&apos;t come from outworking that operator. It comes from not having to do most of the work at all. That&apos;s the uncomfortable part for the industry and the exciting part for anyone willing to adopt the model: the gap isn&apos;t closed by effort, so effort can&apos;t close it back.</P>

        <Source>The right column is real, from the live system, Google Business Profile, and Ahrefs. The left column reflects general, widely-observed industry norms for new home service businesses — presented as the typical case, not as a single cited statistic. Your mileage, and any given competitor&apos;s, will vary.</Source>
      </Column>
    </Band>
  );
}
