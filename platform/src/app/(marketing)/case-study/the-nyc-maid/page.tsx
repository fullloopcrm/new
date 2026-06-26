import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, webPageSchema, breadcrumbSchema, articleSchema } from "@/lib/schema";
import { C, display, mono, proseStyle, barLabel, h2Style } from "@/components/home/editorial";
import SectionHead from "@/components/home/SectionHead";
import Reviews from "@/components/home/Reviews";
import { getCaseStudyStats, formatGeneratedAt } from "@/lib/caseStudyStats";

const PAGE_URL = "https://homeservicesbusinesscrm.com/case-study/the-nyc-maid";
const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Case Study — The NYC Maid", url: PAGE_URL },
];

export const metadata: Metadata = {
  title: "The NYC Maid Case Study: A Home Service Business Run Almost Autonomously on Full Loop CRM",
  description:
    "How The NYC Maid grew to 700+ clients in under six months on $0 of ads — and now runs almost autonomously: one person, about an hour a day, 4.9★ across 70 Google reviews. The live proof behind Full Loop CRM.",
  keywords: [
    "Full Loop CRM case study",
    "home service CRM results",
    "autonomous home service business",
    "AI-run cleaning business",
    "organic lead generation case study",
    "The NYC Maid",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "The NYC Maid Case Study | Run Almost Autonomously on Full Loop CRM",
    description:
      "700+ clients in under six months on $0 of ads. Run by one person, about an hour a day. The live business behind Full Loop CRM.",
    url: PAGE_URL,
    type: "article",
    publishedTime: "2026-02-01T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "The NYC Maid Case Study | Run Almost Autonomously on Full Loop CRM",
    description: "700+ clients in under six months on $0 of ads. Run by one person, about an hour a day.",
  },
};

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };
const subhead: React.CSSProperties = {
  fontFamily: display, fontWeight: 500, fontSize: "clamp(20px, 2vw, 27px)",
  letterSpacing: "-0.015em", lineHeight: 1.15, color: C.ink, marginTop: "8px", marginBottom: "2px",
};

const stages: { num: string; title: string; body: string }[] = [
  { num: "01", title: "Lead generation — organic, multi-domain SEO", body: "A network of organic, SEO-optimized sites ranks for real NYC cleaning searches and feeds every inquiry into the pipeline. No ad budget, no purchased leads — a UTM audit shows zero paid sources. Every one of the 700+ clients was earned organically." },
  { num: "02", title: "AI sales — Yinez answers and books, 24/7", body: "One AI agent works SMS, web chat, and email with full memory, qualifying leads, quoting from real pricing, and booking jobs at any hour — in English and Spanish. It only ever speaks from live data, never invents a quote or a time, and escalates the genuine edge cases." },
  { num: "03", title: "Booking & recurring revenue", body: "Jobs land on the calendar automatically with the right cleaner, price, and cadence. Recurring clients rebook themselves; one-time jobs get nudged toward standing appointments — the engine behind a predictable, growing book of business." },
  { num: "04", title: "Dispatch & GPS field operations", body: "Cleaners work from a bilingual mobile portal with routes, job details, and GPS-verified check-in/out — so billing and payroll reflect what actually happened, and the owner isn't the dispatcher fielding 'where do I go next?' all morning." },
  { num: "05", title: "Payments & auto payouts", body: "Payment is collected automatically and reconciled. More than 99% of cleaner payouts run through Stripe Connect the moment a job closes — the right amount, to the right person, with no Friday check-cutting." },
  { num: "06", title: "Reviews & local SEO", body: "Completed, paid jobs trigger a review request at the right moment; new reviews sync nightly. The result is a 4.9★ rating across 70 Google reviews that feeds local rankings — which generate the next organic lead." },
  { num: "07", title: "Retention & retargeting", body: "Automated rebooking, seasonal touches, and win-back campaigns keep customers in the loop. Acquisition stays at $0 while lifetime value climbs — the machine feeds itself." },
];

const milestones: { when: string; title: string; body: string }[] = [
  { when: "Feb 2026 · Day 0", title: "A business built to prove a point", body: "The NYC Maid launches on Full Loop CRM — a real New York cleaning company created for the sole purpose of proving the platform could run a business. $0 ad budget from day one." },
  { when: "First weeks", title: "Organic lead engine switches on", body: "A multi-domain SEO network starts ranking for real NYC cleaning searches. The first leads arrive — every one organic, none purchased." },
  { when: "Early on", title: "The AI takes the front office", body: "Yinez, the AI agent, begins handling SMS, web chat, and email — qualifying leads, quoting from real pricing, and booking jobs 24/7 in English and Spanish." },
  { when: "Scaling", title: "Payments and payouts go hands-off", body: "Stripe Connect crew payouts pass 99% automatic on job completion. Collections and check-cutting stop being anyone's job." },
  { when: "Ongoing", title: "Reputation compounds", body: "Automated review requests build a 4.9★ rating across 70 Google reviews — feeding local rankings that generate the next organic lead." },
  { when: "Under 6 months", title: "700+ clients, $0 spent on ads", body: "The client base passes 700 in under six months, entirely through organic search — no ads, no purchased leads." },
  { when: "Now", title: "Management goes autonomous", body: "The business runs on about one hour a day from one person. No admins, no managers overseeing the crew, nobody collecting payment, nobody chasing reviews." },
  { when: "Next", title: "Rolling out to operators", body: "The proven system is being extended to home service operators — one trade per city — with The NYC Maid moving fully into the Full Loop platform." },
];

export default async function TheNYCMaidCaseStudy() {
  const live = await getCaseStudyStats();
  const numbers = [
    { v: live ? live.clients.toLocaleString() : "685", l: "Clients", s: "in the live system" },
    { v: live ? live.bookingsCompleted.toLocaleString() : "451", l: "Jobs completed", s: "marked done & paid" },
    { v: live ? live.revenueRangeYtd : "$100k–$110k", l: "Revenue", s: "since launch (Feb 2026)" },
    { v: "4.9★", l: "Google rating", s: "across 70 reviews" },
    { v: live ? live.teamSize.toLocaleString() : "11", l: "Active cleaners", s: "on the platform" },
    { v: live ? live.conversations.toLocaleString() : "1,626", l: "AI conversations", s: "handled by Yinez" },
  ];
  const autonomy = [
    { v: "1", l: "person managing it" },
    { v: "~1 hr", l: "per day, total" },
    { v: "~40", l: "services a week & growing" },
    { v: "$0", l: "spent on ads or leads" },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(metadata.title as string, metadata.description as string, PAGE_URL, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={articleSchema(metadata.title as string, metadata.description as string, PAGE_URL, "2026-02-01T00:00:00Z", "2026-06-26T00:00:00Z")} />

      {/* Hero */}
      <section style={{ background: C.ink, color: C.cream }}>
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 pt-16 pb-20">
          <span style={{ ...barLabel, color: "#6FB58A", borderBottom: `1px solid ${C.cream}` }}>Live case study · The NYC Maid</span>
          <h1 style={{ ...h2Style, color: C.cream, fontSize: "clamp(40px, 6vw, 84px)" }} className="mt-6 max-w-4xl">
            The first home service business to run autonomously.
          </h1>
          <p className="mt-8 max-w-3xl" style={{ ...proseStyle, color: "#D8D8D2", fontSize: "clamp(17px, 1.5vw, 21px)" }}>
            Full Loop didn&apos;t test on a spreadsheet. We built a real NYC cleaning company &mdash; The
            NYC Maid &mdash; and ran it on the platform until it ran itself. <strong style={{ color: C.cream }}>700+
            clients in under six months on $0 of ads</strong>, now managed by one person about an hour a
            day. No office, no managers, nobody collecting payment, nobody chasing reviews.
          </p>
          <p className="mt-5 max-w-3xl" style={{ fontFamily: display, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(17px, 1.5vw, 22px)", lineHeight: 1.4, color: "#6FB58A" }}>
            It may be the first company ever created for the sole purpose of proving a platform
            could run a business &mdash; a live proof of concept, with the back end on display.
          </p>
          <a href="/#lead-form" className="inline-flex items-center justify-center mt-10 transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: mono, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink, background: "#6FB58A", padding: "18px 32px", borderRadius: "2px", fontWeight: 700 }}>
            I Want This — Submit Application →
          </a>
        </div>
      </section>

      {/* The numbers — live */}
      <section style={{ background: C.cream, color: C.ink }} className="border-t">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
          <SectionHead label="Live results & proof" heading="The NYC Maid By the Numbers: Real, Live Results From a Business Run on Full Loop CRM"
            description={<>These update from the live production system; the rating is the company&apos;s real public Google score. No marketing slides.</>} />
          {live && (
            <div className="mt-6 inline-flex items-center gap-2" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.good }}>
              <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: 9999, background: C.good, display: "inline-block" }} />
              Live from The NYC Maid · updated {formatGeneratedAt(live.generatedAt)}
            </div>
          )}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3" style={{ border: `1px solid ${C.line}` }}>
            {numbers.map((s, i) => (
              <div key={s.l} className="px-5 py-8" style={{ borderRight: i % 3 !== 2 ? `1px solid ${C.line}` : "none", borderTop: i >= 3 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(30px, 3.4vw, 46px)", letterSpacing: "-0.025em", color: C.ink, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.good, marginTop: "10px" }}>{s.l}</div>
                <div style={{ fontFamily: mono, fontSize: "11px", color: C.muted, marginTop: "4px" }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Autonomy */}
      <section style={{ background: C.ink, color: C.cream }}>
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
          <SectionHead dark label="How it's run" heading="Run by One Person, About an Hour a Day: What Management-Level Autonomy Actually Looks Like"
            description={<>No admins. No managers overseeing the crew. Nobody collecting payments. Nobody chasing reviews. The office work runs itself.</>} />
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4" style={{ border: "1px solid #2E2E2E" }}>
            {autonomy.map((s, i) => (
              <div key={s.l} className="px-5 py-7" style={{ borderRight: i < 3 ? "1px solid #2E2E2E" : "none" }}>
                <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(28px, 3.2vw, 40px)", letterSpacing: "-0.025em", color: "#6FB58A", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted2, marginTop: "8px", lineHeight: 1.4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vertical timeline */}
      <section style={{ background: C.cream, color: C.ink }} className="border-t">
        <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
          <SectionHead label="Milestones" heading="The NYC Maid Timeline: From Proof-of-Concept Launch to an Autonomously Run Business"
            description={<>Every milestone, from a company built to prove the platform to a business that now runs itself.</>} />
          <ol className="mt-14" style={{ borderLeft: `2px solid ${C.line}`, marginLeft: "8px" }}>
            {milestones.map((m) => (
              <li key={m.title} className="relative pl-8 sm:pl-10 pb-12 last:pb-0">
                <span aria-hidden style={{ position: "absolute", left: "-9px", top: "4px", width: 16, height: 16, borderRadius: 9999, background: C.good, border: `3px solid ${C.cream}` }} />
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.good }}>{m.when}</div>
                <h3 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(20px, 2vw, 27px)", letterSpacing: "-0.015em", color: C.ink, marginTop: "6px" }}>{m.title}</h3>
                <p style={proseStyle} className="mt-2 max-w-2xl">{m.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How the loop ran */}
      <section style={{ background: C.canvas, color: C.ink }} className="border-t">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
          <SectionHead label="How the loop ran" heading="The Seven Stages of Full Loop CRM, As They Actually Ran The NYC Maid"
            description={<>Every stage of the loop &mdash; from organic lead generation to automatic crew payouts &mdash; running on one platform, in production.</>} />
          <div className="mt-14 space-y-10">
            {stages.map((s) => (
              <div key={s.num} className="grid grid-cols-1 sm:grid-cols-[70px_1fr] gap-3 sm:gap-8 pb-10" style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ fontFamily: mono, fontSize: "13px", letterSpacing: "0.12em", color: C.good, paddingTop: "6px" }}>{s.num}</div>
                <div>
                  <h2 style={subhead}>{s.title}</h2>
                  <p style={proseStyle} className="max-w-2xl mt-2">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Financials */}
      <section style={{ background: C.cream, color: C.ink }} className="border-t">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
          <SectionHead label="The financials" heading="The Economics of an Autonomously Run Home Service Business"
            description={<>Revenue earned entirely through organic search, with the cost lines most operators carry &mdash; ads, office staff, collections &mdash; stripped out by automation.</>} />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4" style={{ border: `1px solid ${C.line}` }}>
            {[
              { v: live ? live.revenueRangeYtd : "$100k–$110k", l: "Revenue since Feb 2026" },
              { v: "$0", l: "Spent on ads or leads" },
              { v: "99%+", l: "Crew payouts automated" },
              { v: "$0", l: "Admin / manager payroll" },
            ].map((s, i) => (
              <div key={s.l} className="px-5 py-7" style={{ borderRight: i < 3 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(26px, 3vw, 40px)", letterSpacing: "-0.025em", color: C.ink }}>{s.v}</div>
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.good, marginTop: "8px", lineHeight: 1.4 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 max-w-3xl space-y-5" style={proseStyle}>
            <p>Most home service companies bleed margin in three places: paying for leads, paying office staff to chase the work, and losing money to slow or missed collections. The NYC Maid runs with none of that. Every client was earned through{" "}
              <Link href="/full-loop-crm-service-features" style={link}>organic lead generation</Link> &mdash; a verified $0 on ads or purchased leads. The back office that would normally be a payroll line is software. And payment plus crew payouts run automatically, so cash moves the moment a job closes.</p>
            <p>The result is a cost structure a traditional operator can&apos;t match: revenue scales with jobs, while the overhead that usually scales alongside it simply doesn&apos;t.</p>
          </div>
        </div>
      </section>

      {/* Clients & growth */}
      <section style={{ background: C.canvas, color: C.ink }} className="border-t">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
          <SectionHead label="Clients & growth" heading="From Zero to 700+ Clients in Under Six Months — Every One Earned Organically"
            description={<>No ad budget, no purchased leads, no cold outreach &mdash; a client base built entirely on organic search and an AI that never lets an inquiry go cold.</>} />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4" style={{ border: `1px solid ${C.line}` }}>
            {[
              { v: live ? live.clients.toLocaleString() : "685", l: "Clients in the system" },
              { v: "<6 mo", l: "From launch to 700+" },
              { v: "100%", l: "Organic acquisition" },
              { v: "4.9★", l: "70 Google reviews" },
            ].map((s, i) => (
              <div key={s.l} className="px-5 py-7" style={{ borderRight: i < 3 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(26px, 3vw, 40px)", letterSpacing: "-0.025em", color: C.ink }}>{s.v}</div>
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.good, marginTop: "8px", lineHeight: 1.4 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 max-w-3xl space-y-5" style={proseStyle}>
            <p>Growth came from the loop, not a budget. Organic pages rank for the searches NYC homeowners actually make; the AI agent answers and books every inquiry within seconds, day or night, in English and Spanish; and the review flywheel keeps local rankings climbing &mdash; which brings the next wave of leads. The model is built to compound: recurring clients rebook themselves, and one-time jobs get nudged toward standing appointments.</p>
            <p>That&apos;s how a brand-new company crossed 700 clients in under six months without spending a dollar to acquire them.</p>
          </div>
        </div>
      </section>

      {/* Team & operations */}
      <section style={{ background: C.cream, color: C.ink }} className="border-t">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
          <SectionHead label="Team & operations" heading="How a Lean Crew Runs 40+ Jobs a Week With One Hour of Management a Day"
            description={<>A bilingual field team, GPS-verified operations, and automatic payouts &mdash; coordinated by software, not a back office.</>} />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4" style={{ border: `1px solid ${C.line}` }}>
            {[
              { v: live ? live.teamSize.toLocaleString() : "11", l: "Active cleaners" },
              { v: "~40", l: "Services a week & growing" },
              { v: "1", l: "Person managing it" },
              { v: "EN / ES", l: "Bilingual portal" },
            ].map((s, i) => (
              <div key={s.l} className="px-5 py-7" style={{ borderRight: i < 3 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(26px, 3vw, 40px)", letterSpacing: "-0.025em", color: C.ink }}>{s.v}</div>
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.good, marginTop: "8px", lineHeight: 1.4 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 max-w-3xl space-y-5" style={proseStyle}>
            <p>The crew works from a bilingual mobile portal: each cleaner sees their route, job details, and customer notes, checks in and out with GPS verification, and sends completion photos back automatically. Dispatch and routing are handled by the platform, not a dispatcher. When a job closes, payout runs through Stripe Connect &mdash; over 99% automatic &mdash; so cleaners are paid fast and correctly, which is one of the biggest reasons crews stay.</p>
            <p>Everything that would normally require a manager, a dispatcher, a bookkeeper, and a customer-service rep is handled by the system. What&apos;s left for a human is about an hour a day of judgment calls.</p>
          </div>
        </div>
      </section>

      {/* Real reviews */}
      <Reviews />

      {/* Closing CTA */}
      <section style={{ background: C.ink, color: C.cream }} className="border-t">
        <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-24 text-center">
          <h2 style={{ ...h2Style, color: C.cream }} className="max-w-3xl mx-auto">
            Want the machine that runs The NYC Maid working in your market?
          </h2>
          <p className="mt-6 max-w-2xl mx-auto" style={{ ...proseStyle, color: "#D8D8D2" }}>
            One operator per trade per city. If yours is still open, the next step is a short application.
          </p>
          <a href="/#lead-form" className="inline-flex items-center justify-center mt-10 transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: mono, fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink, background: "#6FB58A", padding: "18px 32px", borderRadius: "2px", fontWeight: 700 }}>
            I Want This — Submit Application →
          </a>
          <div className="mt-8">
            <Link href="/full-loop-crm-service-features" style={{ ...link, color: "#6FB58A", fontFamily: mono, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              See how the platform works →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
