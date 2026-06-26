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

// Comparison content block — long-tail head + bold description + content with
// inner links. Full Loop vs. the alternatives operators currently use.
export default function WhyFullLoop() {
  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Home service CRM comparison"
          heading="Full Loop CRM vs. Traditional Home Service Software, Point Solutions, and Lead Marketplaces"
          description={
            <>
              How Full Loop stacks up against home service software like ServiceTitan,
              Jobber, and Housecall Pro &mdash; and against lead marketplaces. It replaces
              renting leads, a stitched-together tool stack, and office labor with one
              full-cycle CRM you own and your competitors can&apos;t touch.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            Full Loop vs. lead marketplaces like Angi, Thumbtack, and Google Local Services
          </h3>
          <p>
            Lead marketplaces sell you demand by the click &mdash; and they sell the same lead
            to three or four of your competitors at the same time. You pay forever, you
            race rivals to the phone, and you never build anything that&apos;s yours. The day
            you stop paying, the leads stop cold. Full Loop is the opposite model: the{" "}
            <Link href="/full-loop-crm-service-features" style={link}>lead generation engine</Link>{" "}
            produces organic leads that belong to you, the AI sales agent converts them
            automatically, and retention keeps the customer in your world for the next job.
            You stop paying a toll on every job and start building an asset &mdash; organic
            rankings, a review moat, and a recurring client base &mdash; that compounds in your
            favor and is locked to one operator per trade per city.
          </p>

          <h3 style={subhead}>
            Full Loop vs. a stitched-together stack of point solutions
          </h3>
          <p>
            The typical established operator runs a website from one vendor, a scheduler
            from another, a separate invoicing app, a review-request tool, and a
            spreadsheet to tie it all together &mdash; then spends evenings being the
            integration layer that holds the whole thing in place. Every tool is fine on
            its own; the seams between them are where leads fall through, quotes never get
            sent, jobs get double-booked, and reviews never get asked for. Full Loop is the
            only{" "}
            <Link href="/full-loop-crm-service-features" style={link}>full-cycle home service CRM</Link>{" "}
            that owns all seven stages end to end, so there are no seams to leak through and
            no monthly stack of subscriptions to reconcile.
          </p>

          <h3 style={subhead}>
            Full Loop vs. hiring office staff to run the back office
          </h3>
          <p>
            The other way to get the office work done is to hire for it &mdash; a dispatcher, a
            CSR to answer leads, a bookkeeper to chase payments. That&apos;s real payroll,
            real management, and real turnover, and it still doesn&apos;t cover nights and
            weekends when half your leads come in. Full Loop runs the repetitive office
            work automatically, around the clock, so a solo operator gets the back office
            they can&apos;t yet afford and an established company stops scaling headcount just to
            keep up with volume. See the full side-by-side in{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" style={link}>
              why operators choose Full Loop
            </Link>.
          </p>

          <h3 style={subhead}>
            The one thing none of the alternatives offer: exclusivity
          </h3>
          <p>
            Every other option is available to all your competitors too. Anyone can buy the
            same leads, subscribe to the same tools, or hire the same staff. Full Loop is
            licensed to one operator per trade per city &mdash; so when you hold it, the lead
            engine, the SEO network, and the AI sales floor work for you and are off-limits
            to everyone else in your market. That&apos;s not a feature you can add to the other
            models; it&apos;s the structural advantage that only exists here. Check whether your{" "}
            <Link href="/full-loop-crm-service-business-industries" style={link}>trade</Link>{" "}
            and{" "}
            <Link href="/home-service-crm-locations" style={link}>city</Link> are still open.
          </p>
        </div>

        <SectionCloser
          href="/why-you-should-choose-full-loop-crm-for-your-business"
          label="See the full comparison" formLabel="Make the Switch — Apply"
        />
      </div>
    </section>
  );
}
