// Part V — Anatomy of the System (1 of 4): chapter intro, the booking &
// scheduling engine, pricing & billing, payments & payouts.
import { Band, Column, ChapterHead, P, H3, H4, Quote, Callout, DataTable, Source, StatGrid } from "./Primitives";
import { C, codeToken } from "./cs";

export default function Anatomy1() {
  return (
    <Band id="anatomy" tone="cream">
      <Column className="py-20 sm:py-28">
        <ChapterHead
          part="Part V"
          title="Anatomy of the System"
          standfirst={<>This is the long part, on purpose. Ten systems, taken apart one at a time, that together turn four chronic operational leaks into things the owner never touches. None of it is theoretical — every system below is running in production right now, and the route names, tables, and rules are real.</>}
        />

        <P>A quick orientation before the teardown, because the numbers can read as bragging when they&apos;re actually context. Each figure below maps to a kind of work the business no longer pays a human to do: routes are the things the system can do on request, modules are the logic that decides how, and the cron jobs are the work that happens on a schedule with no request at all. Read that way, the size isn&apos;t impressive for its own sake — it&apos;s a measure of how much of a company has been moved into software.</P>

        <P>The platform is large: <strong>232 API routes</strong>, <strong>302 TypeScript modules</strong>, <strong>187 components</strong>, and <strong>24 scheduled jobs</strong>, totaling just over a hundred thousand lines. But size isn&apos;t the point — coordination is. The systems below are interesting because of how they hand off to each other: a lead becomes a conversation, a conversation becomes a booking, a booking becomes a dispatched job, a job becomes a payment, a payment becomes a payout and a review, and a review becomes the next lead. The loop is the product. Here is each link in it.</P>

        <StatGrid
          cols={4}
          items={[
            { v: "232", l: "API routes", s: "in production" },
            { v: "302", l: "TS modules", s: "src/" },
            { v: "24", l: "Cron jobs", s: "running the business" },
            { v: "103,162", l: "Lines of code", s: "and counting" },
          ]}
        />

        {/* ---------------- BOOKING & SCHEDULING ---------------- */}
        <H3>1 · The booking &amp; scheduling engine</H3>
        <P>A booking is the atom of the business, so it was the first thing built and the most heavily refined. From Day Zero the calendar supported click-to-edit, drag-to-move, and drag-to-resize, and the booking flow could create a client inline, detect duplicates, and normalize formatting. But the part that actually removes work from the owner is what happens <em>after</em> a booking is requested: assigning the right cleaner to it.</P>

        <P>Most operators do this in their head, and it&apos;s genuinely hard — you&apos;re solving a small traveling-salesman problem under time-window constraints every time. The platform does it with a scoring engine (<span style={codeToken}>smart-schedule.ts</span>) that ranks every cleaner for a given slot against the factors a good dispatcher actually weighs:</P>

        <DataTable rows={[
          ["geographic proximity", "distance from the cleaner's other jobs to this address"],
          ["route clustering", "less total travel across their day = higher score"],
          ["can_make_home", "will this job let them get home on time afterward?"],
          ["zone_match / has_car", "is the job in a zone they cover, and do they need a car for it?"],
          ["is_preferred", "the client's preferred cleaner — the strongest single signal"],
        ]} />

        <P>The engine geocodes addresses, estimates transit time between consecutive jobs, and produces human-readable reasoning (&ldquo;9:00 AM Sarah J → this job → 4:00 PM Mike R, gets home by 6&rdquo;) so the assignment is explainable, not a black box. Recurring bookings — weekly, biweekly, monthly, and calendar-aware patterns like &ldquo;the third Monday&rdquo; — regenerate themselves on a schedule, which is where a large share of the book of business renews without anyone lifting a finger.</P>

        <P>That recurring-revenue mechanic is quietly the financial backbone of the whole business. A one-time clean is a transaction; a recurring client is an annuity. The platform is built to convert the former into the latter — nudging one-off jobs toward standing appointments and making it effortless for happy clients to lock in a cadence — so that each month opens with a base of already-booked, already-assigned work rather than a blank calendar to fill from scratch. Predictable revenue is what lets a small operator plan crew, and it&apos;s generated here by the booking engine rather than by the owner&apos;s sales hustle. The compounding client base in the results section isn&apos;t just new customers piling up; it&apos;s recurring relationships that renew themselves on a cron.</P>

        <Callout title="Why this matters">
          Dispatch is the task that forces an owner to become a full-time coordinator the moment they have more than one crew. Turning it into a scored, explainable assignment is what lets the same person manage eleven cleaners and forty-plus jobs a week in about an hour a day.
        </Callout>

        <P>The harder cases are where the engine earns its keep. A same-day cancellation reshuffles a cleaner&apos;s route, and the next assignment should account for where they now actually are, not where they were supposed to be. A new booking near an existing job should slot in to minimize dead travel rather than scatter a cleaner across boroughs. A client&apos;s preferred cleaner being unavailable should degrade gracefully to the next-best fit, with the reason visible, not silently swap in a stranger. None of these are exotic — they happen every week in any real operation — and each one is the kind of decision that, done by a tired human at 7am, produces the late arrivals and grumpy crews that quietly bleed a cleaning business. Done by a scoring function, they&apos;re just arithmetic.</P>

        {/* ---------------- PRICING & BILLING ---------------- */}
        <H3>2 · Pricing &amp; billing</H3>
        <P>Pricing in cleaning is deceptively fiddly. The NYC Maid runs an hourly model with published rates, a two-hour minimum, and rules for crew size and short-notice jobs. The interesting engineering isn&apos;t the rate card — it&apos;s the rounding, because that&apos;s where money quietly leaks or where customers feel nickel-and-dimed.</P>

        <P>There is one file, <span style={codeToken}>billing-hours.ts</span>, that every billing and pay calculation in the entire application must call. It encodes a deliberate asymmetry:</P>

        <DataTable rows={[
          ["client billing", "rounds up to the next half hour only PAST 10 minutes over"],
          ["cleaner pay", "rounds up to the next half hour only PAST 15 minutes over"],
          ["granularity", "always half-hour blocks — .0 or .5, never odd minutes"],
        ]} />

        <P>The asymmetry is intentional and pro-fairness in both directions: a client who runs eight minutes long isn&apos;t charged for a whole extra half hour, and a cleaner who runs a few minutes over doesn&apos;t earn a full extra half hour they didn&apos;t really work. The file&apos;s own comments are blunt about why it exists: earlier, the rule was copy-pasted across the codebase, the copies drifted, and cleaners got overpaid. Consolidating it into a single source of truth is a small thing that, multiplied across hundreds of jobs, is the difference between a margin that holds and one that erodes invisibly.</P>

        <P>Pricing also has to hold a few business rules that protect the operation from unprofitable work: a two-hour minimum so a tiny job doesn&apos;t cost more in coordination than it earns, sensible handling of multi-cleaner crews, and short-notice considerations. The important design choice is that these rules live in the system and are applied consistently — by the booking flow, by the admin, and by Yinez when she quotes — rather than living in the owner&apos;s memory and being applied inconsistently depending on how busy or tired they are. A price that means the same thing no matter who or what quoted it is a small kind of integrity that customers feel, and it&apos;s only possible when the rule has exactly one home.</P>

        <Quote attribution="The principle under the billing code">
          The places a business leaks money are rarely dramatic. They&apos;re a few minutes of rounding, repeated a thousand times, in code nobody re-reads. The fix is to make that rule exist in exactly one place.
        </Quote>

        {/* ---------------- PAYMENTS & PAYOUTS ---------------- */}
        <H3>3 · Payments, payouts &amp; tips</H3>
        <P>This is leak number four from the previous chapter — slow money in both directions — closed. The system collects from clients, reconciles what actually arrived, pays the cleaner automatically, and routes any overage as a tip, with the owner involved in none of it on the happy path.</P>

        <H4>Collection and reconciliation</H4>
        <P>Payment is collected through Stripe, and the platform treats &ldquo;the client says they paid&rdquo; and &ldquo;the money actually landed&rdquo; as two different facts — a distinction most small businesses blur and lose money on. The payment processor verifies the real transfer before anything downstream fires. It also handles partial payments explicitly: anything under a <span style={codeToken}>95%</span> threshold of the expected balance is flagged as partial rather than silently marked paid, so short payments surface instead of vanishing.</P>

        <P>The discipline of separating the claim from the fact is worth underlining, because it&apos;s where good intentions usually fail. It is genuinely tempting to mark a job paid the moment a customer says they paid — it feels friendly, it clears the dashboard, it avoids an awkward follow-up. And it&apos;s exactly how businesses lose money: on the small fraction of claims that aren&apos;t true, compounded over hundreds of jobs. By treating the customer&apos;s word and the verified transfer as two separate states, the system stays friendly in conversation while staying rigorous in the ledger. Yinez can warmly say &ldquo;thank you&rdquo; and the books can still wait for the money to actually land. Both things are true at once, which is the whole trick.</P>

        <H4>Automatic cleaner payout</H4>
        <P>When a payment is confirmed, the processor computes the cleaner&apos;s pay from the billed hours (using the 15-minute rule above), and — for cleaners onboarded to Stripe Connect — pushes the payout automatically. In the live business, more than <strong>99% of crew payouts run automatically</strong> on job completion. The Friday check-cutting ritual simply doesn&apos;t exist. As the team chapter explains, fast and correct pay is one of the biggest reasons cleaners stay.</P>

        <H4>Tips, the right way</H4>
        <P>If a client sends more than they owe, the system does the math and treats the difference as a tip to the cleaner rather than a balance or an error: <em>&ldquo;$X covers your bill, the extra $Y goes to your cleaner as a tip.&rdquo;</em> The cleaner gets the tip; the books stay clean.</P>

        <P>Put the three pieces together and the entire cash cycle of the business runs without a human in it on the normal path. Money comes in, is verified as real, is split correctly between the business and the cleaner under rules that live in exactly one place, and lands in the cleaner&apos;s account on completion — with overpayments handled as tips and underpayments surfaced as exceptions. The owner&apos;s involvement in the typical transaction is zero. Their involvement in the atypical one — a genuine dispute, an odd partial — is exactly where a human should be, and nowhere else. That&apos;s the difference between automating the money and abdicating it.</P>

        <Callout title="A note on honesty in the money path">
          The payment system was deliberately narrowed over time. Non-Stripe methods and an email-based payment monitor existed earlier and were retired in favor of Stripe as the single confirmable source of truth — because an automated system that might mark a job paid on a misread email is worse than no automation at all. The safe failure mode is &ldquo;flag it for a human,&rdquo; not &ldquo;guess.&rdquo;
        </Callout>

        <Source>Details from <span style={codeToken}>billing-hours.ts</span>, <span style={codeToken}>payment-processor.ts</span>, and <span style={codeToken}>smart-schedule.ts</span> in the production codebase. The 99%+ automatic-payout figure is from the live business&apos;s payout records.</Source>
      </Column>
    </Band>
  );
}
