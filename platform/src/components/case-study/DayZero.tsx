// Part II — Day Zero. The first 24 hours: 62 commits, an entire operating
// platform, shipped before the business had a single customer.
import { Band, Column, ChapterHead, P, H3, Quote, LogEntry, Source, StatGrid } from "./Primitives";
import { C, codeToken } from "./cs";

const DAY0_LOG: { date: string; msg: string }[] = [
  { date: "02-02 09:xx", msg: "NYC Maid v1 — Dashboard, Calendar, Bookings, Clients, Team with edit functionality" },
  { date: "02-02", msg: "Calendar: click event to edit, drag to move, drag edge to resize" },
  { date: "02-02", msg: "Add complete email system, daily backup, vercel cron config" },
  { date: "02-02", msg: "Deployed to Vercel — all systems working" },
  { date: "02-02", msg: "Add mobile-first team portal with GPS check-in/out" },
  { date: "02-02", msg: "Add cleaner portal with PIN login, dashboard, no pricing" },
  { date: "02-02", msg: "Add complete client portal with email login, booking, availability, reschedule" },
  { date: "02-02", msg: "Add security hardening — middleware, secure cookies, rate limiting, logout" },
  { date: "02-02", msg: "Update client emails with policies, prep tips, payment info, cleaner photo support" },
  { date: "02-02", msg: "Add recurring booking options like Square — weekly, biweekly, monthly, custom" },
  { date: "02-02", msg: "Add day-of-month recurring (3rd Monday, 4th Friday, etc.)" },
];

export default function DayZero() {
  return (
    <Band id="day-zero" tone="ink">
      <Column className="py-20 sm:py-28">
        <ChapterHead
          dark
          part="Part II"
          title="Day Zero"
          standfirst={<>February 2nd, 2026. Before the business had a phone number that rang, it had a dashboard, a calendar, a booking engine, two separate login systems, an email pipeline, automated backups, and a GPS-verified field portal. All of it shipped in a single day, across 62 commits.</>}
        />

        <P dark>Most businesses open with a sign on the door and a notebook. The NYC Maid opened with a deployed, production application. The very first commit — timestamped February 2nd — reads <span style={codeToken}>NYC Maid v1 — Dashboard, Calendar, Bookings, Clients, Team with edit functionality</span>. By the end of that same calendar day, sixty-one more commits had landed on top of it, and the company had a functioning operational spine that many cleaning businesses never build at all.</P>

        <StatGrid
          dark
          cols={4}
          items={[
            { v: "62", l: "Commits", s: "in 24 hours" },
            { v: "2", l: "Login systems", s: "cleaner + client" },
            { v: "1", l: "Deploy", s: "live on Vercel by EOD" },
            { v: "0", l: "Customers yet", s: "the platform came first" },
          ]}
        />

        <H3 dark>What shipped before the first customer</H3>

        <P dark>The Day-Zero build was not a landing page with a &ldquo;coming soon&rdquo; form. It was the machine. An <strong style={{ color: C.cream }}>operations dashboard</strong> for the owner. A <strong style={{ color: C.cream }}>full calendar</strong> where a job could be clicked to edit, dragged to move, and resized at the edge to change its duration. A <strong style={{ color: C.cream }}>booking engine</strong> that could create a client inline, check for duplicates, and apply uniform formatting. A <strong style={{ color: C.cream }}>recurring-appointment system</strong> modeled on Square — weekly, biweekly, monthly, and even calendar-aware patterns like &ldquo;the third Monday of every month.&rdquo;</P>

        <P dark>It had two distinct front doors for two distinct audiences. Cleaners got a <strong style={{ color: C.cream }}>mobile-first field portal</strong> with PIN login, their job list, and GPS-verified check-in and check-out — and deliberately no pricing, because a cleaner shouldn&apos;t see what the client pays. Clients got their own <strong style={{ color: C.cream }}>portal</strong> with passwordless email login, the ability to book, see availability, and reschedule themselves. Behind both sat a <strong style={{ color: C.cream }}>complete email system</strong> with templated confirmations carrying policies, prep tips, payment instructions, map links, and the assigned cleaner&apos;s photo.</P>

        <P dark>And it was already being treated like production infrastructure on the first day. <span style={codeToken}>Add security hardening — middleware, secure cookies, rate limiting, logout.</span> <span style={codeToken}>Add complete email system, daily backup, vercel cron config.</span> Rate limiting, secure session cookies, and automated daily backups are not things most businesses think about in year one — they were in place before the company had taken a single booking.</P>

        <H3 dark>The first day, as the record shows it</H3>
        <p className="mb-2" style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#6FB58A" }}>
          git log · 2026-02-02 · excerpt
        </p>
        <div style={{ border: "1px solid #262626", padding: "4px 16px 12px", background: "#141414" }}>
          {DAY0_LOG.map((e) => <LogEntry key={e.msg} date={e.date} msg={e.msg} dark />)}
        </div>

        <Quote dark attribution="What Day Zero proved">
          The platform wasn&apos;t going to be assembled around the business as it grew. The business was going to be poured into a platform that already existed.
        </Quote>

        <P dark>It&apos;s worth pausing on the sheer compression of it. Sixty-two commits in a day isn&apos;t frantic typing; it&apos;s a clear picture of the whole business held in one head and poured out at once. The features that landed weren&apos;t discovered incrementally — they were the parts of a cleaning operation that the builder already knew had to exist: a calendar because jobs have times, two portals because there are two audiences, recurring bookings because cleaning is a habit not a one-off, GPS check-in because billed time has to be true, backups and rate limiting because this was going to be real. Day Zero looks superhuman in the log, but it&apos;s really the signature of starting with the end in mind: not &ldquo;let&apos;s see what we need,&rdquo; but &ldquo;here is what a service business is, built.&rdquo;</P>

        <P dark>This matters for the rest of the story. When a founder builds features only when a customer screams for them, the system becomes a patchwork of reactions. The NYC Maid inverted that. The operational backbone — scheduling, dispatch, two-sided portals, comms, backups, security — existed on day one, which meant every customer who arrived afterward landed in a system that was already whole. Growth didn&apos;t require rebuilding. It required turning things on.</P>

        <P dark>The two-portal decision on Day Zero deserves a second look, because it&apos;s a tell about the whole project&apos;s seriousness. Building one interface is the obvious move; building two — a client portal and a separate cleaner portal, each with its own login model, each showing deliberately different information — is what you do when you already understand that a service business has two distinct audiences with conflicting needs. The cleaner must not see client pricing. The client must not see crew logistics. Most businesses discover this the hard way, months in, after showing the wrong person the wrong thing. Here it was a Day-Zero assumption, baked into the architecture before a single real user touched it.</P>

        <Source>All entries above are verbatim (lightly truncated) commit subjects from 2026-02-02, the repository&apos;s first day. 62 commits landed on this date — the single second-busiest day in the project&apos;s history.</Source>
      </Column>
    </Band>
  );
}
