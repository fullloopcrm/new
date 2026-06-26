// Part V capstone — one lead's journey through the entire loop, end to end, so
// the reader sees how the ten systems actually hand off to each other in a
// single real-world flow.
import { Band, Column, P, Quote, Source } from "./Primitives";
import { C, display, mono, partLabel, sectionTitle, codeToken } from "./cs";

type Step = { n: string; t: string; b: string };

const STEPS: Step[] = [
  { n: "11:42 PM, Saturday", t: "The search", b: "A Brooklyn renter, fed up after a move, searches “nyc maid” on her phone. The NYC Maid is the first organic result, in the map pack, 4.9★. She taps through — no ad in the way." },
  { n: "+8 seconds", t: "The answer", b: "She opens the chat and types “how much for a 1-bed move-out cleaning this week?” Yinez answers in seconds — not with a canned range, but with a real quote pulled from the live pricing engine, plus the next genuinely open slots from the real calendar." },
  { n: "+2 minutes", t: "The booking", b: "She picks Thursday. Yinez creates the booking, and the smart-schedule engine assigns the cleaner who's already working nearby that morning — least travel, gets home on time, covers the zone. A confirmation email goes out with policies, prep tips, a map, and the cleaner's photo. No human has touched any of this." },
  { n: "Wednesday", t: "The reminder", b: "A cron job sends a day-before reminder. She confirms with a tap. The cleaner's portal already shows the job, the address, and the notes." },
  { n: "Thursday, on site", t: "The work", b: "The cleaner checks in with GPS verification, does the job, sends completion photos, and checks out. Billed time reflects actual time on site — no dispute, no guesswork." },
  { n: "+30 minutes", t: "The money", b: "Payment is collected through Stripe and verified as actually landed. The cleaner's pay is computed on the 15-minute rule and pushed via Stripe Connect automatically. She tipped $20 on top — the system routes the overage straight to the cleaner as a tip." },
  { n: "Friday", t: "The review", b: "A rating prompt arrives at the right moment. She replies “5.” Yinez thanks her warmly and, because the rating is high, invites her into the referral program. That night, the new review syncs to Google." },
  { n: "The next search", t: "The loop closes", b: "That review nudges the local ranking a little higher. Higher ranking surfaces the listing for the next person searching at 11:42 PM. The loop that started with one lead just made the next one cheaper to win — at a cost of $0." },
];

export default function LeadJourney() {
  return (
    <Band tone="ink">
      <Column className="py-20 sm:py-28">
        <span style={{ ...partLabel, color: "#6FB58A" }}>Part V · the loop, end to end</span>
        <h3 style={{ ...sectionTitle, color: C.cream, fontSize: "clamp(26px, 3.2vw, 44px)" }} className="mt-4">
          One lead&apos;s journey, all the way through
        </h3>
        <P dark>Systems described one at a time can sound like a feature list. The truth of a platform is in the seams — whether the handoffs actually connect, or whether each system is an island the owner has to ferry information between. The whole value of this build is that the seams are welded shut. Watch one lead travel the entire length of it and you can see there are no manual bridges, no &ldquo;and then someone copies it into the other tool,&rdquo; no step where the chain quietly depends on the owner remembering to act.</P>

        <P dark>The ten systems above are easier to believe when you watch them hand off in a single real flow. Here is what actually happens when one person searches for a cleaner late on a Saturday night — every step handled by the platform, with the owner asleep the entire time.</P>

        <ol className="mt-12" style={{ borderLeft: `2px solid #2E2E2E`, marginLeft: "6px" }}>
          {STEPS.map((s) => (
            <li key={s.n} className="relative pl-8 sm:pl-10 pb-11 last:pb-0">
              <span aria-hidden style={{ position: "absolute", left: "-8px", top: "5px", width: 14, height: 14, borderRadius: 9999, background: "#6FB58A", border: `3px solid ${C.ink}` }} />
              <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6FB58A" }}>{s.n}</div>
              <h4 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(19px, 2vw, 25px)", letterSpacing: "-0.015em", color: C.cream, marginTop: "6px" }}>{s.t}</h4>
              <p style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "16.5px", lineHeight: 1.7, color: "#D0D0CB", marginTop: "8px" }}>{s.b}</p>
            </li>
          ))}
        </ol>

        <Quote dark attribution="Why the walkthrough matters">
          Every step in that chain is a place a traditional business loses the customer — the unanswered text, the slow quote, the dispatch scramble, the missed reminder, the payment that never gets chased, the review that never gets asked for. The platform doesn&apos;t do any one of these brilliantly and the rest by hand. It does the whole chain, every time, automatically.
        </Quote>

        <P dark>Notice what the owner did in that entire journey: nothing. Not because the business is small — it ran this exact flow alongside dozens of others that week — but because each handoff that would normally demand a human was instead a function call: <span style={codeToken}>create_booking</span>, <span style={codeToken}>smart-schedule</span>, a reminder cron, a GPS check-in, the payment processor, a rating prompt, the review sync. The loop from Part I isn&apos;t a metaphor. It&apos;s an execution path you can trace.</P>

        <P dark>Now run the same journey through a typical operator for contrast. The 11:42 PM text goes to a phone that&apos;s off; by the time it&apos;s seen Monday, she&apos;s booked someone else. If it had been answered, the quote would be a guess and the scheduling a back-and-forth. The cleaner assignment would be whoever&apos;s free, travel be damned. The reminder wouldn&apos;t go out, so a no-show is live. Payment would be chased for a week. The payout would wait for Friday. The review would never be requested. Every single handoff that the platform completes silently is, in the default world, a place the customer, the money, or the reputation leaks away. The walkthrough isn&apos;t impressive because any one step is clever. It&apos;s impressive because the chain never breaks.</P>

        <Source>Composite walkthrough of the real systems described in Part V; timings reflect how the live flow operates. The specific customer is illustrative; the mechanics, tools, and automated steps are exactly as built.</Source>
      </Column>
    </Band>
  );
}
