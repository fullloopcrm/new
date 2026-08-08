// Update Log — dated, honest notes on what's changed since the narrative
// below was written. Placed early, before the reader gets into Part V's
// AI-agent teardown, so the historical build record isn't read as current
// operational fact by accident. We don't rewrite the record when something
// changes; we log the change and leave the record intact.
import { Band, Column, ChapterHead, H4, P } from "./Primitives";
import { C, mono } from "./cs";

type UpdateEntry = { date: string; title: string; body: React.ReactNode };

const UPDATES: UpdateEntry[] = [
  {
    date: "Aug 2026",
    title: "The front office is human again",
    body: (
      <>
        For the first several months, voice and text were answered by Yinez, an AI agent (see Part V — that teardown describes the system exactly as it was built and run, and we&apos;re leaving it intact rather than editing history). In practice, clients didn&apos;t respond to it the way we&apos;d hoped, so we retired the AI voice/text agent and moved The NYC Maid&apos;s front office to trained virtual assistants instead. Every new Full Loop CRM tenant now gets VAs standard from day one — $8/hr, trained on the CRM, answering customers <em>and</em> available to help the owner directly, not just a support line. Where the sections below describe Yinez answering calls and texts in the present tense, read that as &ldquo;how it worked then,&rdquo; not &ldquo;how it works today.&rdquo;
      </>
    ),
  },
  {
    date: "Aug 2026",
    title: "Cleaner payouts are now instant",
    body: (
      <>
        Payouts used to run in batches. As of a recent release, a cleaner tapping &ldquo;checkout&rdquo; triggers their Stripe payout directly — the live figure in Part VI is a median of a few seconds from checkout to payout, computed from the same production data as the rest of this page, not typed in once and left to go stale.
      </>
    ),
  },
  {
    date: "Aug 2026",
    title: "This page is actually live again",
    body: (
      <>
        The stats on this page are pulled hourly from The NYC Maid&apos;s production database inside Full Loop CRM, now that The NYC Maid is fully migrated onto the platform. Before this update, the page was still pointing at NYC Maid&apos;s old standalone site, which had been retired — so the &ldquo;live&rdquo; numbers had quietly gone stale without anyone noticing. They&apos;re current again, and the endpoint keeps them that way going forward.
      </>
    ),
  },
];

export default function Updates() {
  return (
    <Band id="updates" tone="cream">
      <Column className="py-16 sm:py-20">
        <ChapterHead
          part="Update Log"
          title="What's Changed Since This Was Written"
          standfirst={
            <>
              This page renders from the live record — that includes when something we tried didn&apos;t work. We don&apos;t quietly rewrite the story below when reality changes; we log the change here, dated, and leave the original record intact.
            </>
          }
        />
        <div>
          {UPDATES.map((u) => (
            <div key={u.title} className="py-7" style={{ borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.good }}>{u.date}</div>
              <H4>{u.title}</H4>
              <P>{u.body}</P>
            </div>
          ))}
        </div>
      </Column>
    </Band>
  );
}
