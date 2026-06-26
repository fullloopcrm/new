import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";
import { industries, generateIndustrySlug } from "@/lib/marketing/combos";

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

// "Industries we work with" — long-tail head + bold description + content with
// inner links, then a chip grid linking to every industry CRM page (slugs from
// combos.generateIndustrySlug so they match the routes exactly).
export default function IndustriesWeServe() {
  return (
    <section style={{ background: C.cream, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Industries we serve"
          heading="Home Service CRM Software for 50+ Field Service Industries — One Operator Per Trade Per City"
          description={
            <>
              From house cleaning and HVAC to plumbing, landscaping, pest control, and the
              restoration trades, Full Loop is tuned to how each home service business
              actually runs &mdash; and only one operator per trade per city gets it.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            The same loop in every trade &mdash; with the details that make each one different
          </h3>
          <p>
            The loop is the same in every trade, but the details aren&apos;t. A{" "}
            <Link href="/industry/crm-for-house-cleaning-businesses" style={link}>house cleaning company</Link>{" "}
            lives on recurring schedules and crew dispatch. A{" "}
            <Link href="/industry/crm-for-plumbing-businesses" style={link}>plumber</Link>{" "}
            lives on emergency speed-to-lead at 2&nbsp;a.m. A{" "}
            <Link href="/industry/crm-for-roofing-businesses" style={link}>roofer</Link>{" "}
            lives on storm-season surges and insurance follow-up. Full Loop is tuned for
            the way each of these businesses actually runs &mdash; the pricing logic, the
            booking cadence, the field workflow, the seasonal patterns &mdash; instead of
            forcing a generic template on all of them.
          </p>

          <h3 style={subhead}>
            Trade-specific home service CRM pages for every industry we serve
          </h3>
          <p>
            That&apos;s why the platform ships with deep, trade-specific pages for more than
            fifty industries, from{" "}
            <Link href={`/industry/${generateIndustrySlug(industries[0])}`} style={link}>
              cleaning services
            </Link>{" "}
            and{" "}
            <Link href="/industry/crm-for-hvac-businesses" style={link}>HVAC</Link> to{" "}
            <Link href="/industry/crm-for-pest-control-businesses" style={link}>pest control</Link>,{" "}
            <Link href="/industry/crm-for-landscaping-businesses" style={link}>landscaping</Link>,{" "}
            <Link href="/industry/crm-for-junk-removal-businesses" style={link}>junk removal</Link>,
            and the restoration and specialty trades. Each page shows how the seven stages
            of the loop &mdash; lead generation, AI sales, booking, dispatch, payments, reviews,
            and retention &mdash; map to the specific economics of that business.
          </p>

          <h3 style={subhead}>
            Why exclusivity matters more in some trades than others
          </h3>
          <p>
            Whatever you run, the rule is the same: one license per trade per city. When
            you claim cleaning in your metro, the next cleaning company that wants Full Loop
            in your city is told it&apos;s already taken. In high-competition trades &mdash; cleaning,
            HVAC, plumbing, pest control &mdash; that exclusivity is the difference between a
            tool everyone has and a structural advantage only you have. The lead engine,
            the SEO network, and the AI sales floor all work for one operator per market,
            and that operator is whoever claims it first.
          </p>
          <p>
            Find your trade in the list below &mdash; each links to its dedicated home service
            CRM page &mdash; or browse the full directory of{" "}
            <Link href="/full-loop-crm-service-business-industries" style={link}>industries we serve</Link>{" "}
            and the{" "}
            <Link href="/home-service-crm-locations" style={link}>cities we cover across every US metro</Link>.
          </p>
        </div>

        {/* Industry chip grid — every industry CRM page */}
        <div className="mt-12 flex flex-wrap gap-2.5">
          {industries.map((ind) => (
            <Link
              key={ind.slug}
              href={`/industry/${generateIndustrySlug(ind)}`}
              style={{
                fontFamily: mono,
                fontSize: "11px",
                letterSpacing: "0.06em",
                color: C.graphite,
                border: `1px solid ${C.line}`,
                borderRadius: "999px",
                padding: "8px 14px",
                background: "transparent",
              }}
              className="inline-block transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            >
              {ind.name}
            </Link>
          ))}
        </div>

        <SectionCloser
          href="/full-loop-crm-service-business-industries"
          label="Browse all industries we serve" formLabel="Claim My Trade — Apply"
        />
      </div>
    </section>
  );
}
