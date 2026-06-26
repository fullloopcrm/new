// "The owner's hour" — concretely decomposes what the ~1 hour/day of human
// work actually is, so "autonomous" doesn't read as a hand-wave.
import { Band, Column, P, Quote, Source } from "./Primitives";
import { C, display, mono, partLabel, sectionTitle, codeToken } from "./cs";

type Block = { time: string; t: string; b: string };

const BLOCKS: Block[] = [
  { time: "Morning · ~15 min", t: "Read the briefing", b: "A cron job has already assembled the daily summary — yesterday&apos;s jobs, today&apos;s schedule, anything flagged. The owner reads it the way you&apos;d skim a dashboard, not the way you&apos;d reconstruct a day from scattered texts." },
  { time: "~10 min", t: "Clear the escalations", b: "The handful of things Yinez deliberately didn&apos;t handle alone: a callback she opened on a low rating, an unusual request, a payment flagged as not-clean. These are judgment calls — the work that should reach a human." },
  { time: "~10 min", t: "Glance at the crew & schedule", b: "Confirm the day&apos;s dispatch looks right, eyeball any gaps the schedule-monitor surfaced, approve a cleaner application or a time-off request. Most days there&apos;s nothing to change." },
  { time: "Throughout · ~15 min", t: "The occasional human touch", b: "A VIP client who deserves a personal reply, a crew member who needs a word, a one-off decision. Spread across the day in spare minutes, not a block of desk time." },
  { time: "Not on the list", t: "Everything else", b: "Answering routine inquiries, quoting, booking, reminding, dispatching, collecting, paying out, asking for reviews, posting jobs, following up on warm leads — none of it. That&apos;s the software&apos;s shift, and it runs 24 hours, not one." },
];

export default function OwnersDay() {
  return (
    <Band tone="ink">
      <Column className="py-20 sm:py-24">
        <span style={{ ...partLabel, color: "#6FB58A" }}>Part VI · continued</span>
        <h3 style={{ ...sectionTitle, color: C.cream, fontSize: "clamp(24px, 3vw, 42px)" }} className="mt-4">What the one hour actually contains</h3>
        <P dark>The honest caveat first: an hour is the steady-state average, not a guarantee about every single day. A crew emergency, a billing dispute that needs a real conversation, a hiring push — some days run longer, the way any business has heavier days. What&apos;s changed isn&apos;t that hard days vanished; it&apos;s that the ordinary day, the one that used to eat from morning to night, now genuinely fits in an hour, because the relentless operational baseline that filled it is gone. The number describes the floor the business now sits on, not a ceiling no day ever crosses.</P>

        <P dark>&ldquo;An hour a day&rdquo; invites a fair question: an hour doing <em>what?</em> Vague autonomy claims usually fall apart here, so here is the hour, broken down. It&apos;s deliberately unglamorous — which is the point. What&apos;s left for the human is judgment, not labor.</P>

        <ol className="mt-12" style={{ borderLeft: `2px solid #2E2E2E`, marginLeft: "6px" }}>
          {BLOCKS.map((b) => (
            <li key={b.t} className="relative pl-8 sm:pl-10 pb-10 last:pb-0">
              <span aria-hidden style={{ position: "absolute", left: "-8px", top: "5px", width: 14, height: 14, borderRadius: 9999, background: "#6FB58A", border: `3px solid ${C.ink}` }} />
              <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6FB58A" }}>{b.time}</div>
              <h4 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(18px, 1.9vw, 24px)", letterSpacing: "-0.015em", color: C.cream, marginTop: "6px" }}>{b.t}</h4>
              <p style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "16.5px", lineHeight: 1.7, color: "#D0D0CB", marginTop: "8px" }}>{b.b}</p>
            </li>
          ))}
        </ol>

        <P dark>What this frees up is not just time but attention, which is the scarcer resource. The reason a working owner can&apos;t think strategically — can&apos;t evaluate a new market, a new service line, a new hire — is that the operational present consumes every spare cycle. Remove the operational present, and the same person suddenly has the one thing entrepreneurship actually runs on: room to think about what&apos;s next instead of what&apos;s now. The hour-a-day figure understates the real shift, which is from reactive to deliberate. The owner stops being the busiest employee and starts being the only one who gets to plan.</P>

        <Quote dark attribution="The shape of autonomous work">
          The owner&apos;s job stopped being &ldquo;run the operation&rdquo; and became &ldquo;supervise the operation that runs itself.&rdquo; That&apos;s a different job, and it fits in the cracks of a day.
        </Quote>

        <P dark>Compare that to the day this same business would demand under the traditional model. The morning would start with a stack of overnight voicemails and texts to answer before the first crew rolls out. Mid-morning is dispatch and the inevitable &ldquo;where am I going&rdquo; calls. The afternoon is quoting new inquiries between everything else. The evening is invoicing, chasing the balances that didn&apos;t come in, and — if there&apos;s any energy left — asking a client or two for a review. That&apos;s not an hour; that&apos;s a day that eats the night, every day, and it&apos;s the day most home service owners actually live. The hour isn&apos;t a productivity hack on top of that day. It&apos;s what&apos;s left after software absorbed the rest of it.</P>

        <P dark>This is also why the model scales past one cleaning company. If overseeing a five-hundred-client business takes an hour, the same person&apos;s remaining time isn&apos;t spent on overhead — it&apos;s free to start or supervise the next one. An hour a day per business is the unit that makes a portfolio of autonomously-run businesses thinkable, which is precisely where Parts VII and VIII go.</P>

        <Source>The breakdown reflects the real daily workflow: the <span style={codeToken}>daily-summary</span> cron briefing, escalations opened by Yinez (callbacks, flagged payments), and the <span style={codeToken}>schedule-monitor</span> / application-approval flows described in Part V.</Source>
      </Column>
    </Band>
  );
}
