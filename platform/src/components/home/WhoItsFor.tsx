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

// Audience-segment content block — long-tail head + bold description + content.
export default function WhoItsFor() {
  return (
    <section style={{ background: C.canvas, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Who it's built for"
          heading="Who Full Loop CRM Is For: Solo Operators, Growing Crews, and Multi-Truck Home Service Companies"
          description={
            <>
              The loop is the same at every size &mdash; what changes is what it replaces. The
              common thread is an owner who wants the business to run without living inside
              it.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            For the solo operator: the office staff you can&apos;t afford yet
          </h3>
          <p>
            When you&apos;re the owner, the technician, the dispatcher, and the bookkeeper, the
            jobs you do during the day are the leads you miss in the moment. Full Loop gives
            a one-truck operator the back office a much bigger company has: an{" "}
            <Link href="/full-loop-crm-service-features" style={link}>AI sales agent</Link>{" "}
            answering and booking leads while you&apos;re on a job, automatic scheduling and
            invoicing, and a lead engine bringing work in &mdash; without a single new hire. It&apos;s
            the fastest way to stop choosing between doing the work and growing the business.
          </p>

          <h3 style={subhead}>
            For the growing crew: consolidate the stack and add a sales floor
          </h3>
          <p>
            Once you have a few crews, the problem flips from &ldquo;not enough leads&rdquo; to &ldquo;too
            many things to keep straight.&rdquo; Schedules collide, payments slip, reviews go
            unasked, and the tool stack you cobbled together starts working against you.
            Full Loop consolidates the website, scheduler, invoicing, dispatch, and review
            tools into one system and adds an AI sales floor on top, so growth stops meaning
            chaos. Find how it maps to{" "}
            <Link href="/full-loop-crm-service-business-industries" style={link}>your specific trade</Link>.
          </p>

          <h3 style={subhead}>
            For the multi-truck company: own your market, not just operate in it
          </h3>
          <p>
            Established companies don&apos;t just want efficiency &mdash; they want a defensible
            position. Because Full Loop is licensed to one operator per trade per city, a
            multi-truck operator can lock down the lead engine, the local SEO network, and
            the AI sales agent for their entire market, leaving competitors without access
            to the platform at all. Combined with{" "}
            <Link href="/home-service-crm-locations" style={link}>local lead generation in your metro</Link>,
            that turns operational leverage into market ownership. The{" "}
            <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>{" "}
            shows the model at that scale.
          </p>
        </div>

        <SectionCloser href="/full-loop-crm-service-business-industries" label="Find your fit by trade" formLabel="This Is Me — Apply Now" />
      </div>
    </section>
  );
}
