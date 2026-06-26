// Part V — Anatomy (3 of 4): comms infrastructure, the 24 cron jobs, the
// cleaner experience, and the client experience.
import { Band, Column, P, H3, H4, Quote, Callout, DataTable, Source, LogEntry } from "./Primitives";
import { C, codeToken, sectionTitle, partLabel } from "./cs";

const CRONS: { date: string; msg: string }[] = [
  { date: "confirmation-reminder", msg: "nudges clients to confirm upcoming jobs" },
  { date: "reminders", msg: "day-before and day-of appointment reminders" },
  { date: "late-check-in", msg: "alerts when a cleaner hasn't checked in on time" },
  { date: "payment-reminder", msg: "follows up on outstanding balances" },
  { date: "payment-followup-daily", msg: "daily sweep of unpaid jobs" },
  { date: "post-job-followup", msg: "checks in after a completed clean" },
  { date: "rating-prompt", msg: "asks for a rating at the right moment" },
  { date: "sync-google-reviews", msg: "pulls in new Google reviews nightly" },
  { date: "generate-recurring", msg: "creates the next instances of recurring bookings" },
  { date: "retention", msg: "win-back and re-engagement touches" },
  { date: "sales-follow-ups", msg: "chases warm leads that didn't book" },
  { date: "daily-summary", msg: "the owner's morning briefing" },
  { date: "schedule-monitor", msg: "watches for scheduling gaps and conflicts" },
  { date: "comms-monitor / email-monitor", msg: "watches inbound channels" },
  { date: "health-check / health-monitor", msg: "system + integration health" },
  { date: "anthropic-health", msg: "checks the AI provider is responding" },
  { date: "backup", msg: "automated daily database backup" },
  { date: "outreach", msg: "organic outreach + job-posting refresh" },
];

export default function Anatomy2() {
  return (
    <>
      {/* COMMS */}
      <Band tone="cream">
        <Column className="py-20 sm:py-24">
          <span style={{ ...partLabel }}>Part V · continued</span>
          <h3 style={{ ...sectionTitle, fontSize: "clamp(24px, 3vw, 40px)" }} className="mt-4">5 · The communications layer</h3>
          <P>Every interaction in the business flows over one comms layer: SMS through Telnyx (including programmable voice via WebRTC), transactional email through Resend, web-push notifications, and a Telegram channel for the owner. The modules — <span style={codeToken}>sms.ts</span>, <span style={codeToken}>notify.ts</span>, <span style={codeToken}>push.ts</span>, <span style={codeToken}>email.ts</span>, <span style={codeToken}>telegram.ts</span> — give every other system a single way to reach a human.</P>
          <P>This is what lets Yinez be truly omnichannel and lets the cron jobs below actually do anything: a reminder, a payment nudge, a rating request, a crew broadcast all resolve to the same delivery primitives, with delivery confirmations and per-recipient preferences. A unified cleaner-notification system (shipped Feb 24) gives the crew in-app history, preferences, and confirmation that a message was received — so &ldquo;I never got the address&rdquo; stops being a thing that happens.</P>
          <Callout title="A hard rule, encoded">
            Mass messaging is deliberately constrained. Broadcasts are owner-gated and bounded by recency and idempotency rules, because the fastest way to destroy a real business&apos;s reputation (and its phone-number deliverability) is an automated system that fans out a message to everyone. Restraint is a feature.
          </Callout>

          <P>The choice of Telnyx for both SMS and programmable voice is itself a tell about ambition. SMS alone would cover the front office as it exists today; carrying voice as well means the same comms layer can answer and place calls, not just texts — the foundation for an operation where a phone call is handled by the same brain that handles a text, with the same access to the same live data. The business runs on text today because text is what its customers prefer, but the layer underneath was built without painting itself into that corner. Deliverability, consent, and per-recipient preferences are first-class throughout, because a service business that loses its phone number to spam complaints loses its lifeline.</P>
        </Column>
      </Band>

      {/* CRONS */}
      <Band tone="ink">
        <Column className="py-20 sm:py-24">
          <span style={{ ...partLabel, color: "#6FB58A" }}>Part V · continued</span>
          <h3 style={{ ...sectionTitle, color: C.cream, fontSize: "clamp(24px, 3vw, 40px)" }} className="mt-4">6 · The 24 jobs that run the business while no one&apos;s looking</h3>
          <P dark>Autonomy isn&apos;t one feature; it&apos;s the sum of many small scheduled jobs that each do what an employee would otherwise have to remember. The platform runs <strong style={{ color: C.cream }}>24 cron jobs</strong>. Together they are the night shift, the office manager, and the collections clerk — all of it, every day, without a human in the loop.</P>
          <div className="mt-8" style={{ border: "1px solid #262626", padding: "4px 16px 12px", background: "#141414" }}>
            {CRONS.map((c) => <LogEntry key={c.date} date={c.date} msg={c.msg} dark />)}
          </div>
          <P dark>What&apos;s striking is how mundane each one is and how much they matter in aggregate. Individually, none of these jobs is impressive — any competent employee could send a reminder or chase a balance. The point is that no employee does all of them, every day, without fail, for free, at 2am on a holiday. Reliability at boring tasks is precisely the thing humans are worst at and software is best at, and a business is mostly boring tasks done reliably. The cron list is where that truth becomes the operation&apos;s competitive advantage.</P>

          <P dark>Read that list as a job description. A reminder service so clients show up. A late-check-in watcher so a no-show cleaner is caught in real time, not at the end of the day. A collections function that chases balances daily. A reputation engine that asks for a rating at the right moment and syncs new Google reviews nightly. A retention program and a sales-follow-up program that together keep the funnel full. A daily summary that hands the owner a briefing each morning. And underneath, health monitors and automated backups keeping the whole thing honest.</P>
          <Quote dark attribution="What the cron list really is">
            This is the part of a business that&apos;s normally invisible labor — the follow-ups, the reminders, the chasing, the &ldquo;did anyone check on that?&rdquo; Twenty-four scheduled jobs is what &ldquo;runs itself&rdquo; actually decomposes into.
          </Quote>

          <P dark>What&apos;s easy to miss is that several of these crons are <em>revenue</em> functions, not housekeeping. <span style={codeToken}>payment-followup-daily</span> and <span style={codeToken}>payment-reminder</span> recover money that would otherwise slip through the cracks — every operator knows the balance they meant to chase and never did. <span style={codeToken}>sales-follow-ups</span> works the warm leads that didn&apos;t book on the first touch, the ones a busy owner forgets by Tuesday. <span style={codeToken}>retention</span> brings lapsed clients back. <span style={codeToken}>rating-prompt</span> and <span style={codeToken}>sync-google-reviews</span> compound the reputation that feeds acquisition. A meaningful slice of the business&apos;s revenue exists because a scheduled function did the diligent, boring follow-up that humans skip when they&apos;re tired — which, running a business alone, is always.</P>
        </Column>
      </Band>

      {/* CLEANER EXPERIENCE */}
      <Band tone="cream">
        <Column className="py-20 sm:py-24">
          <span style={{ ...partLabel }}>Part V · continued</span>
          <h3 style={{ ...sectionTitle, fontSize: "clamp(24px, 3vw, 40px)" }} className="mt-4">7 · The cleaner&apos;s experience: apply → onboard → check in → get paid</h3>
          <P>The crew side is a full product of its own, because crew retention is where home service businesses quietly die. It starts before hiring: an application flow (<span style={codeToken}>cleaner-applications</span>) that the owner — or Yinez — can review, approve, or reject, with approval auto-provisioning the cleaner into the system.</P>
          <DataTable rows={[
            ["portal", "mobile-first, PIN login, bilingual (EN/ES), no client pricing shown"],
            ["the job", "route, address, client notes, prep details — everything needed, nothing extra"],
            ["check-in / out", "GPS-verified, so billed time reflects actual time on site"],
            ["completion", "photos sent back automatically"],
            ["pay", "computed on the 15-min rule, paid via Stripe Connect on job close — 99%+ automatic"],
          ]} />
          <P>The throughline is respect for the cleaner&apos;s time and trust: they see exactly what they need, their hours are recorded by GPS rather than disputed, and they&apos;re paid fast and correctly without asking. That combination — clarity and prompt, accurate pay — is precisely what keeps a crew loyal, and loyalty is what lets the business take more work.</P>

          <P>This is an underrated lever. In home service, crew churn is a hidden tax: every cleaner who quits takes their reliability, their client rapport, and the cost of recruiting and training a replacement with them. The two things that drive cleaners away most are pay that&apos;s late or wrong, and feeling jerked around by disorganized dispatch — and the platform is built to remove both. Fast, exact, automatic pay and a portal that always knows where they&apos;re going aren&apos;t just conveniences; they&apos;re a retention strategy encoded as software. A business that keeps its crew can keep its promises to clients, which is where the 4.9★ ultimately comes from.</P>
        </Column>
      </Band>

      {/* CLIENT EXPERIENCE */}
      <Band tone="canvas">
        <Column className="py-20 sm:py-24">
          <span style={{ ...partLabel }}>Part V · continued</span>
          <h3 style={{ ...sectionTitle, fontSize: "clamp(24px, 3vw, 40px)" }} className="mt-4">8 · The client&apos;s experience: book → reschedule → feedback → refer</h3>
          <P>The customer never sees any of the machinery. They find the business on Google, ask a question and get an instant, accurate answer from Yinez at any hour, and book — by chat, on the site, or by text. They get a confirmation email carrying policies, prep tips, a map, payment instructions, and their cleaner&apos;s photo. They can log into a portal with just their email (no password to forget), see availability, and reschedule themselves.</P>
          <P>The passwordless, email-only portal login is a small detail that reveals the whole philosophy. Most businesses bolt on an account system with a password the customer will forget, a reset flow they&apos;ll resent, and a login wall that quietly loses the people who can&apos;t be bothered. The NYC Maid removed the friction entirely: identify yourself with the email you already booked with, and you&apos;re in. Every such decision across the client experience is made the same way — remove a step, remove a reason to give up, remove a thing the customer has to do to give the business money. The cumulative effect is a funnel that leaks far less than the industry norm, which is a meaningful part of why the conversion from inquiry to booking is high enough to grow a business on organic traffic alone.</P>

          <P>After the job, the loop keeps turning on its own: a post-job follow-up, a rating prompt timed to the right moment, and — for happy clients — a path into the <span style={codeToken}>referral</span> program with tracked commissions. Unhappy signals are caught too: a low rating doesn&apos;t get argued with, it opens a callback and flags the owner. Multi-address clients are handled natively — a single client can have several properties, each with its own details, so a building manager or a family with two homes isn&apos;t forced into separate accounts.</P>
          <P>The referral program, in place since the second day, is worth dwelling on because it&apos;s where the growth loop becomes self-propelling on the customer side. A satisfied client isn&apos;t just a retained client; with tracked referral commissions, they become a tiny, motivated acquisition channel. Combined with organic search and the review flywheel, it means the business has three compounding, zero-paid sources of new customers — search brings strangers, reviews convert them, and happy customers bring their friends — all instrumented and all running without the owner orchestrating any of it. That&apos;s the difference between growth you buy and growth that grows itself.</P>

          <Callout title="The loop, from the customer's side">
            Found organically → answered instantly → booked → served → followed up → asked for a review → invited to refer. Each step feeds the next, and the only one that ever required the owner&apos;s attention is the cleaning itself.
          </Callout>
          <Source>Systems described from production routes and modules: <span style={codeToken}>sms.ts</span>, <span style={codeToken}>notify.ts</span>, <span style={codeToken}>push.ts</span>, the <span style={codeToken}>cron/*</span> routes, <span style={codeToken}>cleaner-applications</span>, <span style={codeToken}>client</span> portal routes, <span style={codeToken}>client-properties.ts</span>, and the <span style={codeToken}>referral</span> system.</Source>
        </Column>
      </Band>
    </>
  );
}
