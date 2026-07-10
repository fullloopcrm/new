import Link from "next/link";
import { C, display, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };

const subhead: React.CSSProperties = {
  fontFamily: display,
  fontWeight: 500,
  fontSize: "clamp(20px, 2vw, 27px)",
  letterSpacing: "-0.015em",
  lineHeight: 1.15,
  color: C.ink,
  marginTop: "8px",
  marginBottom: "2px",
};

// "Problems solved" content block — long-tail head + bold description + content
// with inner links. Maps real operator pain points to the loop.
export default function ProblemsSolved() {
  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Home service operator problems"
          heading="The Home Service Business Problems Full Loop CRM Was Built to Solve"
          description={
            <>
              Every feature in the platform traces back to a problem that cost a real
              operator real money. Here are the ones that quietly drain home service
              businesses &mdash; and how the loop closes each gap.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            &ldquo;I lose leads because I can&apos;t answer the phone on a job&rdquo;
          </h3>
          <p>
            The leads you miss are the jobs you do. When you&apos;re under a sink or up a
            ladder, the call goes to voicemail and the customer dials the next company.
            Full Loop&apos;s{" "}
            <Link href="/full-loop-crm-service-features" style={link}>AI sales agent</Link>{" "}
            answers the phone live and every text and chat the instant it arrives, qualifies it,
            quotes it, and books it &mdash; so missing the phone stops meaning missing the job.
          </p>

          <h3 style={subhead}>
            &ldquo;I pay for leads that get sold to my competitors too&rdquo;
          </h3>
          <p>
            Lead marketplaces resell the same &ldquo;exclusive&rdquo; lead to several companies and
            charge you forever. Full Loop generates organic leads that belong to you and
            licenses the engine to one operator per trade per city, so the demand it creates
            is yours alone. See the difference in the{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" style={link}>
              comparison against lead resellers
            </Link>.
          </p>

          <h3 style={subhead}>
            &ldquo;My schedule and invoices live in three different places&rdquo;
          </h3>
          <p>
            A scheduler here, an invoicing app there, a spreadsheet to reconcile it &mdash; and
            you in the middle holding it together. Full Loop puts booking, dispatch,
            payments, and records in one system where each stage hands off to the next
            automatically, so nothing falls through the seams between tools.
          </p>

          <h3 style={subhead}>
            &ldquo;I chase payments and cut crew checks every Friday&rdquo;
          </h3>
          <p>
            Collections shouldn&apos;t be a weekly ritual. Full Loop collects payment
            automatically and runs crew payouts on job completion &mdash; on the NYC Maid, over
            99% of payouts went out via Stripe Connect with no manual math. Cash flow
            becomes a background process instead of a Friday fire drill.
          </p>

          <h3 style={subhead}>
            &ldquo;I never get around to asking for reviews&rdquo;
          </h3>
          <p>
            Reviews are the cheapest lead source you have, and the easiest to neglect. Full
            Loop requests a review automatically the moment a job is completed and paid, then
            feeds your reputation back into the{" "}
            <Link href="/home-service-crm-locations" style={link}>local search rankings</Link>{" "}
            that generate your next lead &mdash; turning reputation into a compounding asset.
          </p>

          <h3 style={subhead}>
            &ldquo;Customers book once and I never hear from them again&rdquo;
          </h3>
          <p>
            Without a system, every job ends cold. Full Loop&apos;s retention and retargeting
            automatically rebook recurring clients, run win-back campaigns for lapsed ones,
            and turn one-time jobs into standing accounts &mdash; the difference between starting
            from zero every month and building a book of business that grows. It works
            across all{" "}
            <Link href="/full-loop-crm-service-business-industries" style={link}>50+ trades we serve</Link>.
          </p>

          <h3 style={subhead}>
            &ldquo;The business can&apos;t run without me in it&rdquo;
          </h3>
          <p>
            The deepest problem of all: you don&apos;t own a business, you own a job that owns
            you. Full Loop runs the office work end to end so the company keeps closing,
            delivering, and collecting whether or not you&apos;re at a desk. That&apos;s the whole
            promise &mdash; you own the business, the platform runs it. See it proven in the{" "}
            <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>.
          </p>
        </div>

        <SectionCloser href="/full-loop-crm-service-features" label="See how the loop solves each one" formLabel="Fix This — Apply Now" />
      </div>
    </section>
  );
}
