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

// "What's automated vs. what you control" content block.
export default function AutomationScope() {
  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Home service business automation"
          heading="Home Service Business Automation: What Full Loop CRM Runs for You and What You Still Control"
          description={
            <>
              Home service business automation should remove the busywork, not the judgment.
              Full Loop runs the repetitive office work end to end while you keep your hands
              on pricing, standards, and the customer relationship.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            What the platform automates so you never touch it again
          </h3>
          <p>
            The work that eats an operator&apos;s evenings is repetitive, rule-based, and
            relentless &mdash; which is exactly what software is good at. Full Loop automates
            the full chain:{" "}
            <Link href="/full-loop-crm-service-features" style={link}>lead capture and instant follow-up</Link>,
            quoting from your price book, booking and rebooking, crew dispatch and routing,
            GPS-verified check-in and check-out, payment collection and reconciliation,
            crew payouts, review requests, and win-back campaigns for lapsed customers. None
            of that needs your attention once it&apos;s configured. It runs at 2&nbsp;a.m. on a
            holiday weekend the same way it runs on a Tuesday morning, which is the whole
            point: the business keeps closing and delivering work whether or not you&apos;re at
            a desk.
          </p>

          <h3 style={subhead}>
            What stays in your hands &mdash; because it should
          </h3>
          <p>
            Automation is not the same as handing over the wheel. You set your pricing and
            your service standards. You decide which jobs and clients you want. You own the
            brand, the customer relationships, and the final say on anything that needs a
            human&apos;s judgment. The AI sales agent works from your rules, not its own
            opinions, and escalates the edge cases that genuinely need you instead of
            guessing. The result is leverage without loss of control &mdash; the machine
            handles volume and consistency, you handle direction and the moments that
            actually require a person.
          </p>

          <h3 style={subhead}>
            Why &ldquo;you own the business, the platform runs it&rdquo; is the whole design
          </h3>
          <p>
            Every decision in Full Loop comes back to one principle: you should be able to
            step away from the office work without the business slowing down, and step in
            on the decisions that matter without fighting the software. That&apos;s what
            separates real automation from another dashboard you have to babysit. To see
            how the seven stages run on their own &mdash; and where you stay in the loop &mdash; read
            the{" "}
            <Link href="/full-loop-crm-service-features" style={link}>feature breakdown</Link>{" "}
            or the practical guidance in{" "}
            <Link href="/full-loop-crm-101-educational-tips" style={link}>Full Loop 101</Link>.
          </p>
        </div>

        <SectionCloser
          href="/full-loop-crm-service-features"
          label="See exactly what's automated" formLabel="Automate My Business — Apply"
        />
      </div>
    </section>
  );
}
