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

// Pricing-model content block — long-tail head + bold description + content.
export default function PricingModel() {
  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Home service CRM pricing"
          heading="Home Service CRM Pricing: $2,500/Month Flat, Unlimited Users"
          description={
            <>
              Home service CRM pricing, done differently: Full Loop isn&apos;t a per-seat app,
              because it doesn&apos;t do what a per-seat app does. It replaces your lead-gen spend,
              your whole software stack, and a chunk of office labor at once &mdash; so it&apos;s one
              flat monthly rate, $25,000 one-time setup, no matter how many admins or field
              team members you add.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            Why per-seat SaaS pricing is the wrong model for a full-cycle CRM
          </h3>
          <p>
            Per-seat software charges you more as your team grows, which punishes exactly
            the thing you&apos;re trying to do &mdash; scale. Worse, the per-seat price only covers a
            slice of the job: you still pay separately for lead generation, for a booking
            tool, for invoicing, for review software, and you still carry the office labor
            to operate all of it. Add it up and the &ldquo;cheap&rdquo; per-seat tool is the most
            expensive line on the board once you count everything bolted around it. Full
            Loop collapses that entire stack into one{" "}
            <Link href="/full-loop-crm-service-features" style={link}>full-cycle system</Link>,
            so you&apos;re paying for outcomes &mdash; booked, paid, repeat jobs &mdash; not for logins.
          </p>

          <h3 style={subhead}>
            What you stop paying for when the loop replaces your stack
          </h3>
          <p>
            The real comparison isn&apos;t Full Loop versus one tool &mdash; it&apos;s Full Loop versus
            everything it replaces. Stop renting leads from{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" style={link}>marketplaces</Link>{" "}
            that resell the same lead to your competitors. Stop stacking subscriptions for a
            website, a scheduler, an invoicing app, and a review service. Stop paying for
            the hours your team spends answering leads, chasing payments, and asking for
            reviews by hand. When one platform does all of that, the math changes: the
            question becomes how much the loop returns, not how much a seat costs.
          </p>

          <h3 style={subhead}>
            One flat number, whether you&apos;re solo or running five crews
          </h3>
          <p>
            $25,000 one-time setup, then $2,500/month flat &mdash; unlimited admins, unlimited
            field team members, every feature included. The number doesn&apos;t change as your
            team grows, which is the opposite of the per-seat SaaS you&apos;re used to. What does
            stay exclusive is the territory: Full Loop is licensed to one operator per trade
            per city, so claiming your city locks competitors out of the platform in your
            market. Start with an{" "}
            <a href="#lead-form" style={link}>application</a> to check territory availability,
            or read{" "}
            <Link href="/about-full-loop-crm" style={link}>how the partnership model works</Link>{" "}
            first.
          </p>
        </div>

        <SectionCloser href="/about-full-loop-crm" label="Understand the partnership model" formLabel="See Pricing & Apply" />
      </div>
    </section>
  );
}
