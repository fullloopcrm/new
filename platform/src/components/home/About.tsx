import Link from "next/link";
import { C, display, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };

// "About" — long-tail heading + bold description + keyword-rich content with
// inner links. What Full Loop is, who built it, and the one-trade-per-city rule.
export default function About() {
  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Home service CRM software"
          heading="What Is Full Loop CRM? The All-in-One Home Service Business Software Built by a 20-Year Operator"
          description={
            <>
              Full Loop CRM is the first full-cycle home service CRM &mdash; one platform that
              generates your leads, closes them with AI, books and dispatches the work,
              collects payment, earns the review, and wins the customer back &mdash; licensed
              to one operator per trade per city.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            Why most home service software was built by people who never ran a service business
          </h3>
          <p>
            Most home service software is written by product teams who have never answered
            a 7&nbsp;a.m. cancellation, never chased an unpaid invoice, and never watched a
            lead go cold because nobody replied for three hours. Full Loop CRM started from
            the opposite end. It was built by an operator who ran home service companies
            for more than twenty years &mdash; and every feature in the platform exists because
            of a problem that cost real money on a real route. That is the difference
            between software that demos well and software that actually runs the day.
          </p>

          <h3 style={subhead}>
            What &ldquo;full-cycle home service CRM&rdquo; actually means
          </h3>
          <p>
            The result isn&apos;t another scheduling app with a chat widget bolted on. It is
            the first{" "}
            <Link href="/full-loop-crm-service-features" style={link}>full-cycle home service CRM</Link>:
            a single platform that generates your leads, answers and closes them with an AI
            sales agent, books the job, dispatches and GPS-tracks your crew, collects
            payment, requests the review, and then retargets the customer for the next
            booking. Seven stages of a service business, one system, zero integrations to
            wire together. That&apos;s the &ldquo;loop&rdquo; &mdash; lead to paid to repeat &mdash; and the platform
            runs all of it instead of leaving you to duct-tape five tools together.
          </p>

          <h3 style={subhead}>
            One operator per trade per city: how Full Loop&apos;s exclusive territory model works
          </h3>
          <p>
            Here is the part that makes operators lean in: we license Full Loop to{" "}
            <strong style={{ color: C.ink }}>one operator per trade per city</strong>. One
            house cleaning company in your metro. One HVAC company. One plumber. When you
            hold the license for your trade in your city, every competitor in that trade is
            locked out of this platform &mdash; out of the AI lead engine, the multi-domain SEO
            network, the autonomous sales agent, all of it. You are not buying a seat in a
            tool your competitors also use. You are claiming a territory. Check whether
            yours is open across the{" "}
            <Link href="/full-loop-crm-service-business-industries" style={link}>50+ industries we serve</Link>{" "}
            and the{" "}
            <Link href="/home-service-crm-locations" style={link}>cities we cover</Link>.
          </p>
          <p>
            We can make that promise because Full Loop isn&apos;t a generic SaaS chasing
            sign-up volume. It is closer to a franchise without the franchise fee: a proven
            operating system handed to one serious operator in each market. You keep your
            brand, your customers, and your margins. The platform supplies the machine that
            most home service businesses never get &mdash; the lead generation, the instant
            follow-up, the dispatch logic, the payment rails, the review flywheel &mdash;
            running around the clock whether you&apos;re on a job or asleep.
          </p>

          <h3 style={subhead}>
            Proven on a real business before it was offered to anyone else
          </h3>
          <p>
            None of this is theory. Full Loop was proven on a live company before it was
            offered to anyone else. The NYC Maid runs entirely on this platform, in
            production, with real clients, real crews, and real money moving through it
            every day. We didn&apos;t mock up a demo &mdash; we operated a business on the system
            until it could run itself, and the{" "}
            <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>{" "}
            shows the numbers. When you evaluate Full Loop, you&apos;re looking at a machine
            that already works, not a roadmap of what it might do someday. Read the{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" style={link}>
              full breakdown of why operators choose Full Loop
            </Link>{" "}
            for the side-by-side against the tools you&apos;re probably using now.
          </p>

          <h3 style={subhead}>
            The philosophy: you own the business, the platform runs it
          </h3>
          <p>
            The idea underneath it is simple:{" "}
            <em style={{ fontFamily: display, fontStyle: "italic", color: C.ink }}>
              you own the business, the platform runs it.
            </em>{" "}
            You shouldn&apos;t have to choose between growing your company and working in it.
            You shouldn&apos;t lose a booking because you were under a sink when the call came
            in. And you shouldn&apos;t hand 25% of every job to a lead-reseller who sends the
            same &ldquo;exclusive&rdquo; lead to four of your competitors. Full Loop generates leads
            that belong to you, converts them automatically, and keeps the customer in your
            world for the next job and the one after that.
          </p>
          <p>
            Whether you run a one-truck operation or a multi-crew company across a metro,
            the loop is the same. The difference is that the office work &mdash; the part that
            eats your evenings &mdash; stops being your job. To see exactly how the seven stages
            fit together, read the{" "}
            <Link href="/full-loop-crm-service-features" style={link}>full feature breakdown</Link>,
            browse{" "}
            <Link href="/full-loop-crm-101-educational-tips" style={link}>Full Loop 101 for home service operators</Link>,
            or look at the{" "}
            <Link href="/full-loop-crm-service-business-industries" style={link}>industries the platform is built for</Link>.
            If your trade and city are still open, the next thing worth your time is the
            case study &mdash; proof before pitch.
          </p>
        </div>

        <SectionCloser href="/about-full-loop-crm" label="Read the full Full Loop story" formLabel="Claim My Territory — Apply" />
      </div>
    </section>
  );
}

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
