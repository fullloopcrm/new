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

// The AI agent — the crown-jewel capability. Based on the real Yinez agent
// running NYC Maid: one agent, all channels, full memory, grounded in live data.
export default function AIAgent() {
  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="AI sales agent software"
          heading="The AI Agent Behind Full Loop CRM: One Assistant Across Phone, SMS, Web Chat & Email That Books, Quotes, and Collects"
          description={
            <>
              Not a chatbot that says &ldquo;we&apos;ll get back to you&rdquo; &mdash; and not a voicemail box.
              The AI sales agent for home service businesses that answers the phone live, works
              SMS, web chat, and email, remembers every customer, and only ever speaks from your
              real data.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            One agent across phone, SMS, web chat, and email &mdash; with full memory
          </h3>
          <p>
            Most &ldquo;AI&rdquo; bolt-ons are a single web-chat widget that forgets you the moment
            you leave the page. Full Loop&apos;s agent is one assistant working every channel at
            once &mdash; phone, text, web chat, and email &mdash; with complete memory of the customer,
            their past jobs, their address, their balance, and the last thing you said to them. A
            lead who calls on Monday and emails on Thursday is the same conversation, not two
            cold starts. That continuity is what lets it actually close and keep customers
            instead of just deflecting tickets.
          </p>

          <h3 style={subhead}>
            It answers the phone &mdash; a real voice agent, 24/7, never dead air
          </h3>
          <p>
            When a customer calls, they don&apos;t hit voicemail &mdash; they reach a warm, natural
            voice agent that picks up on the first ring, day or night. On the call it checks
            your live calendar for real open slots and books the job, recognizes returning
            callers by their number and pulls up their past and upcoming jobs, quotes from your
            real rates, checks whether a payment landed, and captures every caller as a lead
            with name and number even if they don&apos;t book. It takes notes to the customer&apos;s
            record &mdash; access codes, allergies, preferences &mdash; and it never fake-books or
            invents a time. Genuine edge cases like refunds, damage, or a demand to speak to a
            manager are escalated straight to you for an async callback instead of the agent
            freelancing. Every call is recorded and transcribed into a single customer thread,
            and if the agent is ever unavailable the call falls back to ring and voicemail &mdash;
            never a dropped line.
          </p>

          <h3 style={subhead}>
            What it actually does &mdash; the full front office, not a script
          </h3>
          <p>
            The agent qualifies new leads and captures them on the first message, quotes
            from your real price book, points customers to the booking flow, reschedules and
            cancels jobs, sends PINs and confirmations, verifies payments (including doing
            the math when a customer says &ldquo;I sent $180&rdquo;), prompts for reviews, and escalates
            the genuine edge cases to you instead of guessing. It works in English and
            Spanish, and it knows the difference between a client and the owner &mdash; sensitive
            actions are gated so it never exposes business data on a customer channel. This
            is the{" "}
            <Link href="/full-loop-crm-service-features" style={link}>AI sales and operations engine</Link>{" "}
            that the seven-stage loop runs on.
          </p>

          <h3 style={subhead}>
            It only speaks from real data &mdash; by design
          </h3>
          <p>
            Here is the part most AI tools can&apos;t claim: the agent is built with a hard rule
            against making things up. It never quotes a price, a date, a balance, or a fact
            unless it just pulled that data from your system in real time. If it doesn&apos;t
            know, it looks it up &mdash; it doesn&apos;t invent. For a business where a wrong quote or
            a wrong appointment time costs you money and trust, an AI that refuses to guess
            is the difference between leverage and liability. See it proven across thousands
            of real conversations in the{" "}
            <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>, or
            read{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" style={link}>
              why operators trust it with the front office
            </Link>.
          </p>
        </div>

        <SectionCloser href="/full-loop-crm-service-features" label="See how the AI agent works" formLabel="I Want This AI — Apply" />
      </div>
    </section>
  );
}
