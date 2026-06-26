import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import LeadForm from "./LeadForm";

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };

// "Thank you" section — gratitude + the lead form (id="lead-form", the target
// every section CTA scrolls to). ~700 words.
export default function ThankYou() {
  return (
    <section
      id="lead-form"
      style={{ background: C.cream, color: C.ink, scrollMarginTop: "80px" }}
      className="border-t"
    >
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — the thank-you copy */}
          <div>
            <SectionHead
              label="Check your territory"
              heading="Check If Your Trade and City Are Still Available — Claim Your Full Loop CRM Territory"
              description={
                <>
                  One operator per trade per city. Tell us your trade and your market, and
                  we&apos;ll tell you straight whether your exclusive territory is still open.
                </>
              }
            />

            <div className="mt-8 space-y-5 max-w-xl" style={proseStyle}>
              <p>
                Most people skim a homepage and bounce. You read it &mdash; which tells us you&apos;re
                serious about getting the office work off your plate and putting a real
                machine behind your business. So, genuinely: thank you for the time.
              </p>
              <p>
                Here&apos;s the honest pitch. Full Loop isn&apos;t for everyone, and we don&apos;t want it
                to be &mdash; one operator per trade per city is the whole point. The next step is
                simple and costs you nothing: tell us your trade and your city, and we&apos;ll
                check whether your territory is still open. If it is, we&apos;ll show you exactly
                how the loop would run for your business. If it&apos;s already claimed, we&apos;ll tell
                you straight.
              </p>
              <p>
                Want more proof before you reach out? Read the{" "}
                <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>,
                see the{" "}
                <Link href="/full-loop-crm-service-features" style={link}>full feature set</Link>,
                or find{" "}
                <Link href="/full-loop-crm-service-business-industries" style={link}>your trade</Link>{" "}
                and{" "}
                <Link href="/home-service-crm-locations" style={link}>your city</Link>. When
                you&apos;re ready, the form is right here.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href="tel:+18445667276"
                style={{ fontFamily: mono, fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink, border: `1px solid ${C.ink}`, padding: "13px 22px", borderRadius: "2px", fontWeight: 500 }}
                className="inline-flex flex-col items-center leading-tight transition-colors hover:bg-[rgba(0,0,0,0.04)]"
              >
                <span>Call 844-LOOP-CRM</span>
                <span style={{ fontSize: "10px", letterSpacing: "0.08em", color: C.muted, marginTop: "2px" }}>(844) 566-7276</span>
              </a>
              <span style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.06em", color: C.muted }}>
                One license per trade per city. Once claimed, off the board.
              </span>
            </div>
          </div>

          {/* Right — the form */}
          <div
            className="p-6 sm:p-8"
            style={{ background: C.canvas, border: `1px solid ${C.line}`, borderRadius: "2px" }}
          >
            <h3
              style={{ fontFamily: display, fontWeight: 500, fontSize: "26px", letterSpacing: "-0.02em", color: C.ink, marginBottom: "6px" }}
            >
              Submit your application
            </h3>
            <p style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, marginBottom: "24px" }}>
              Tell us your trade and city — we qualify one operator per market
            </p>
            <LeadForm />
          </div>
        </div>
      </div>
    </section>
  );
}
