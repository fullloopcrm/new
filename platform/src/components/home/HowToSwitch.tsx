import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };

interface Step {
  num: string;
  title: string;
  body: React.ReactNode;
}

const steps: Step[] = [
  {
    num: "01",
    title: "Submit your application",
    body: (
      <>
        It starts with one question: is your trade still open in your city? Tell us your
        trade and market and we confirm availability. Because Full Loop is licensed to one
        operator per trade per city, this is the gate &mdash; once a territory is claimed, it&apos;s
        off the board. The fastest way to find out is the{" "}
        <a href="#lead-form" style={link}>application form</a>.
      </>
    ),
  },
  {
    num: "02",
    title: "Load your pricing, services, and team",
    body: (
      <>
        Once your territory is confirmed, we set up your real price book, your service
        menu, your service area, and your crew. The AI sales agent quotes from your actual
        pricing, the calendar reflects your real availability, and the crew portal is keyed
        to your team &mdash; so the platform behaves like your business from day one, not a
        generic template.
      </>
    ),
  },
  {
    num: "03",
    title: "Turn on the lead engine",
    body: (
      <>
        The organic{" "}
        <Link href="/full-loop-crm-service-features" style={link}>lead generation network</Link>{" "}
        goes to work ranking for your trade in your city and routing inquiries into your
        pipeline, where the AI sales agent answers and books them automatically. This is
        the part that compounds &mdash; rankings and reviews build month over month and keep
        producing without ongoing ad spend.
      </>
    ),
  },
  {
    num: "04",
    title: "Run the loop and watch it close itself",
    body: (
      <>
        Leads convert, jobs get dispatched and GPS-verified, payment and payouts process
        automatically, reviews get requested, and lapsed customers get won back &mdash; the full
        loop, running on its own. You move from doing the office work to overseeing a
        machine that does it, and you reclaim the evenings you used to spend on it. The{" "}
        <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link> shows
        what that looks like at scale.
      </>
    ),
  },
];

// "How to switch / onboarding" content block — pairs with the HowTo schema.
export default function HowToSwitch() {
  return (
    <section style={{ background: C.canvas, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Onboarding & setup"
          heading="How to Switch to Full Loop CRM: Onboarding and Setup for Home Service Businesses"
          description={
            <>
              Full Loop CRM onboarding is four steps, not a six-month implementation. Here is
              exactly how a home service operator switches from a stitched-together tool stack
              to one full-cycle system that runs itself.
            </>
          }
        />

        <div className="mt-12 space-y-10">
          {steps.map((s) => (
            <div
              key={s.num}
              className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-3 sm:gap-8 pb-10"
              style={{ borderBottom: `1px solid ${C.lineSoft}` }}
            >
              <div style={{ fontFamily: mono, fontSize: "13px", letterSpacing: "0.12em", color: C.good, paddingTop: "6px" }}>
                {s.num}
              </div>
              <div>
                <h3
                  style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(22px, 2.2vw, 30px)", letterSpacing: "-0.02em", color: C.ink, marginBottom: "10px" }}
                >
                  {s.title}
                </h3>
                <p style={proseStyle} className="max-w-2xl">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <SectionCloser href="/about-full-loop-crm" label="Learn how onboarding works" formLabel="Start My Onboarding — Apply" />
      </div>
    </section>
  );
}
