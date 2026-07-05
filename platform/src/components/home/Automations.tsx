import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };

interface Job {
  name: string;
  detail: string;
}

// Real always-on automations, grouped. Based on NYC Maid's ~20 scheduled jobs.
const groups: { title: string; jobs: Job[] }[] = [
  {
    title: "Filling the calendar",
    jobs: [
      { name: "Auto-rebook recurring clients", detail: "regenerates standing appointments on cadence" },
      { name: "Appointment reminders", detail: "hourly reminders so clients show up" },
      { name: "Confirmation chasers", detail: "nudges unconfirmed jobs every few minutes" },
      { name: "Weekly outreach", detail: "re-engages quiet customers on a schedule" },
    ],
  },
  {
    title: "Getting you paid",
    jobs: [
      { name: "Payment reminders", detail: "follows up on balances every few minutes" },
      { name: "Multi-touch payment follow-ups", detail: "daily sequence until paid" },
      { name: "Auto crew payouts", detail: "Stripe Connect payout on job completion" },
    ],
  },
  {
    title: "Reputation & reviews",
    jobs: [
      { name: "Rating prompts", detail: "asks happy clients at the right moment" },
      { name: "Google review sync", detail: "pulls in new reviews nightly" },
    ],
  },
  {
    title: "Growth & SEO",
    jobs: [
      { name: "SEO opportunity scan", detail: "reads Google Search Console daily, finds pages a click from page one" },
      { name: "Auto title & meta rewrites", detail: "drafts higher-ranking titles and descriptions, ranked by commercial value" },
      { name: "Winner protection", detail: "freezes pages already ranking so nothing that works gets touched" },
    ],
  },
  {
    title: "Field operations",
    jobs: [
      { name: "Late check-in alerts", detail: "flags crews not on site on time" },
      { name: "Schedule monitoring", detail: "catches conflicts and gaps automatically" },
      { name: "Sales follow-ups", detail: "works leads that haven't booked yet" },
    ],
  },
  {
    title: "Keeping it healthy",
    jobs: [
      { name: "Daily summary", detail: "the whole business in one morning brief" },
      { name: "Comms & health monitoring", detail: "watches the system around the clock" },
      { name: "Nightly backups", detail: "your data, protected every night" },
    ],
  },
];

export default function Automations() {
  return (
    <section style={{ background: C.canvas, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Automated workflows & jobs"
          heading="Always-On Home Service Automation: The Background Jobs That Run Your Business While You Sleep"
          description={
            <>
              Home service automation isn&apos;t one big button &mdash; it&apos;s dozens of automated
              workflows running on schedule, day and night, so the office work that used to
              eat your evenings simply happens on its own.
            </>
          }
        />

        <div className="mt-10 max-w-3xl" style={proseStyle}>
          <p>
            Behind the scenes, Full Loop runs a stack of scheduled automations &mdash; the same
            ones proven on{" "}
            <Link href="/case-study/the-nyc-maid" style={link}>The NYC Maid</Link> &mdash; that
            chase payments, rebook recurring clients, request reviews, monitor the schedule,
            optimize your search rankings, and keep the whole operation healthy without anyone
            pressing a button. Here is a sample of what&apos;s running while you&apos;re on a job
            or asleep.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: C.line, border: `1px solid ${C.line}` }}>
          {groups.map((g) => (
            <div key={g.title} className="p-6" style={{ background: C.canvas }}>
              <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.good, marginBottom: "14px" }}>
                {g.title}
              </div>
              <ul className="space-y-3">
                {g.jobs.map((j) => (
                  <li key={j.name}>
                    <div style={{ fontFamily: display, fontWeight: 500, fontSize: "16px", letterSpacing: "-0.01em", color: C.ink }}>
                      {j.name}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: "11px", color: C.muted, lineHeight: 1.5, marginTop: "2px" }}>
                      {j.detail}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <SectionCloser href="/full-loop-crm-service-features" label="See everything the platform automates" formLabel="Put Me on Autopilot — Apply" />
      </div>
    </section>
  );
}
