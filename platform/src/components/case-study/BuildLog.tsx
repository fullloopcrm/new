// Part III — The Build Log. The five-month chronology, Feb→Jun 2026, drawn
// straight from commit history. Real velocity, real milestone commits.
import { Band, Column, ChapterHead, P, H3, H4, BarChart, LogEntry, Source, Quote } from "./Primitives";
import { C, codeToken } from "./cs";

const VELOCITY = [
  { label: "Feb 2026", value: 664, note: "commits" },
  { label: "Mar 2026", value: 204, note: "commits" },
  { label: "Apr 2026", value: 376, note: "commits" },
  { label: "May 2026", value: 139, note: "commits" },
  { label: "Jun 2026", value: 108, note: "commits" },
];

const MILESTONES: { date: string; msg: string }[] = [
  { date: "02-02", msg: "v1 — dashboard, calendar, bookings, two portals, email, backups, GPS check-in (62 commits)" },
  { date: "02-03", msg: "Referral program — referrers, commissions, portal, admin dashboard" },
  { date: "02-05", msg: "Emergency job broadcast for same-day bookings (94 commits — busiest day in history)" },
  { date: "02-14", msg: "First AI chatbot goes in (the “Selena” era begins)" },
  { date: "02-24", msg: "Unified cleaner notification system — in-app history, preferences, delivery confirmations" },
  { date: "03-23", msg: "Error monitoring wired across the entire system" },
  { date: "04-16", msg: "payments + cleaner_payouts tables — full financial tracking" },
  { date: "04-28", msg: "Yinez — single agent across web + SMS + admin, 56 tools, zero-hallucination guard" },
  { date: "06-26", msg: "Check-in GPS toggled per field conditions — still shipping, still tuning" },
];

export default function BuildLog() {
  return (
    <Band id="build-log" tone="cream">
      <Column className="py-20 sm:py-28">
        <ChapterHead
          part="Part III"
          title="The Build Log"
          standfirst={<>From the first commit on February 2nd to today, the repository holds 1,491 commits and 103,162 lines of code. The shape of those commits over time tells the story of the business better than any narrative could — because it is the narrative, timestamped.</>}
        />

        <H3>Five months, in commits</H3>
        <P>The build didn&apos;t happen at a constant pace. It happened in a violent opening sprint, a consolidation, a second surge when the money systems and the AI went in, and then a long tail of refinement as the business shifted from &ldquo;build it&rdquo; to &ldquo;run it.&rdquo; The monthly commit counts trace that arc exactly:</P>

        <BarChart data={VELOCITY} />
        <Source>Commits per month from <span style={codeToken}>git log</span> on the production repository. Total: 1,491 commits, 2026-02-02 → 2026-06-26.</Source>

        <P><strong>February (664 commits)</strong> was the genesis sprint — the entire operational core, plus referrals, emergency dispatch, and the first AI experiments. Five of the ten busiest days in the project&apos;s entire history fall in the first two weeks of February. <strong>March (204)</strong> was consolidation: hardening, error monitoring, and the unglamorous work of making the February sprint reliable. <strong>April (376)</strong> was the second surge — the financial system (payments and automated payouts) and the leap from a simple chatbot to <span style={codeToken}>Yinez</span>, the unified AI agent. <strong>May and June (139 and 108)</strong> are the signature of a business that now mostly runs: tuning, edge cases, and the beginning of turning one company into a platform.</P>

        <H3>The milestones that mattered</H3>
        <p className="mb-2" style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.good }}>
          git log · milestone commits · 2026
        </p>
        <div style={{ border: `1px solid ${C.line}`, padding: "4px 16px 12px", background: C.canvas }}>
          {MILESTONES.map((e) => <LogEntry key={e.msg} date={e.date} msg={e.msg} />)}
        </div>

        <H4>February 3 — the loop starts closing</H4>
        <P>A referral program landed on day two: referrers, commission tracking, a referral portal, and an admin dashboard to manage it. This is a tell about how the business was conceived. Before it had customers, it had a mechanism for customers to bring other customers — the first piece of the compounding-growth loop that would later replace an ad budget entirely.</P>

        <H4>February 5 — the busiest day ever</H4>
        <P>Ninety-four commits landed on a single day, the most in the project&apos;s history, and among them was the <span style={codeToken}>emergency job broadcast system for same-day bookings</span> — the ability to push an urgent job to the crew and let it be claimed. That&apos;s a logistics primitive most cleaning companies handle with a frantic group text. Here it became a feature in week one.</P>

        <H4>February 14 → April 28 — from chatbot to colleague</H4>
        <P>The AI front office didn&apos;t arrive fully formed. It started in mid-February as a conventional chatbot (internally, the &ldquo;Selena&rdquo; line). It took until April 28th — and a great deal of hard-won understanding about what an AI can and cannot be trusted to do with real customers and real money — for it to become <span style={codeToken}>Yinez</span>: a single agent operating across web chat, SMS, email, and the owner&apos;s admin channel, wielding 56 tools, bound by hard rules and a zero-hallucination guard. The gap between those two dates is the most important two and a half months in the build, and Part V takes the AI apart in detail.</P>

        <H4>April — the second surge</H4>
        <P>April&apos;s 376 commits are the project&apos;s second wind, and they&apos;re where the business crossed from &ldquo;working&rdquo; to &ldquo;autonomous.&rdquo; Two things landed in the same month: the financial system that let money move without the owner, and Yinez, the agent that let the front office run without the owner. Those are the two heaviest pieces of human labor in any service business — handling money and handling customers — and automating both in a single month is what turned a well-built app into a business that could be left alone. It&apos;s no coincidence that the autonomy claims in this case study date from after April, not before.</P>

        <H4>April 16 — money becomes a system</H4>
        <P>The commit <span style={codeToken}>Add payments + cleaner_payouts tables for full financial tracking</span> marks the point where cash stopped being something the owner tracked by hand and became something the platform tracked by default. Everything downstream — automated collection, reconciliation, and crew payouts on job completion — depends on that schema going in.</P>

        <H4>March — the unglamorous month that mattered most</H4>
        <P>February&apos;s 664 commits get the attention, but March&apos;s 204 are arguably more important. A genesis sprint produces a system that works in a demo; it does not produce a system that survives contact with five hundred real customers. March was when error monitoring went in across the whole platform, when edge cases got handled, when the things that worked &ldquo;usually&rdquo; were made to work &ldquo;always.&rdquo; The drop from 664 to 204 isn&apos;t a slowdown — it&apos;s the shift from writing features to hardening them, which is the phase most solo projects skip and most solo projects regret skipping.</P>

        <H4>May and June — the shape of a business that runs</H4>
        <P>The tail of the curve is the quiet proof. A project still being held together by its owner doesn&apos;t taper to 139 then 108 commits a month — it spikes every time something breaks. A gently declining, steady commit rate, with the business serving more clients than ever, is the signature of a system that has stopped needing constant intervention. The work shifted from &ldquo;keep it alive&rdquo; to &ldquo;make it general,&rdquo; which is exactly the transition that turns one business into a platform — the subject of Part VII.</P>

        <Quote attribution="What the build log shows">
          You can&apos;t fake a commit history. The dates, the volume, and the order in which systems appeared are a forensic record of how a real business was actually built — not how a marketing team later wished it had been.
        </Quote>

        <P>One more thing the record makes plain: this was continuous, not a launch followed by a long quiet. There is no month with zero commits, no stretch where the business was set down and forgotten. Even June, the lightest month, carries 108 commits — a business still being actively improved while it runs itself. That continuity is its own kind of proof. A demo gets built and abandoned; a real business gets tended every week because real customers keep finding the edges. The commit history isn&apos;t the story of a project. It&apos;s the heartbeat of an operating company, and it hasn&apos;t stopped.</P>

        <Source>Milestone entries are real commit subjects, abbreviated for readability. Day-level commit counts (62 on Feb 2, 94 on Feb 5) are from the commit timestamps.</Source>
      </Column>
    </Band>
  );
}
