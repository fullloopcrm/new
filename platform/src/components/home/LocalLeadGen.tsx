import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";
import { metros, generateLocationSlug } from "@/lib/marketing/combos";

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

// Local / city content block — long-tail head + bold description + content with
// inner links, then a city-link grid (slugs from combos.generateLocationSlug).
export default function LocalLeadGen() {
  const cities = metros.slice(0, 48);
  return (
    <section style={{ background: C.canvas, color: C.ink }} className="border-t">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Local SEO lead generation"
          heading="Home Service CRM by City: Local Lead Generation and Map-Pack Rankings in Every US Metro"
          description={
            <>
              Home service is a local game won in the map pack and the &ldquo;near me&rdquo; search.
              Full Loop is built to rank and convert in your specific city &mdash; with one
              operator per trade per market.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <h3 style={subhead}>
            Why local SEO and the Google map pack decide who wins home service jobs
          </h3>
          <p>
            Homeowners don&apos;t shop nationally for a plumber or a cleaning crew &mdash; they
            search &ldquo;near me,&rdquo; they tap the map pack, and they call one of the first three
            results. That means the entire game is won or lost at the local level: your
            rankings in your city, your reviews on your Google profile, your response time
            when the lead comes in. Full Loop is engineered for exactly that fight. The{" "}
            <Link href="/full-loop-crm-service-features" style={link}>lead generation engine</Link>{" "}
            builds location-specific pages that rank for your trade in your market, and the{" "}
            <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>{" "}
            shows the model producing organic local leads at scale with no paid spend.
          </p>

          <h3 style={subhead}>
            One operator per city: local exclusivity that competitors can&apos;t buy past
          </h3>
          <p>
            Because Full Loop licenses one operator per trade per city, the local advantage
            isn&apos;t shared. When you hold cleaning in your metro, the local lead engine, the
            review flywheel, and the AI sales agent all work for you alone &mdash; and the next
            operator in your trade who wants in is told the market is taken. In a business
            decided by local rankings, that exclusivity is the difference between competing
            on a level field and owning the field. Browse{" "}
            <Link href="/home-service-crm-locations" style={link}>every city we cover</Link>{" "}
            or find{" "}
            <Link href="/full-loop-crm-service-business-industries" style={link}>your trade</Link>{" "}
            to start.
          </p>

          <h3 style={subhead}>
            Available across every major US metro
          </h3>
          <p>
            Full Loop is built for operators in every major market in the country. Find your
            city below to see local availability, or run a territory check to confirm
            whether your trade is still open where you operate &mdash; availability is specific
            to each trade in each city, so the only way to know is to ask.
          </p>
        </div>

        {/* City link grid */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1.5">
          {cities.map((m) => (
            <Link
              key={m.slug}
              href={`/location/${generateLocationSlug(m)}`}
              style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.02em", color: C.graphite, lineHeight: 1.9 }}
              className="transition-colors hover:text-[#1F4D2C]"
            >
              {m.city}, {m.stateAbbr}
            </Link>
          ))}
        </div>

        <SectionCloser
          href="/home-service-crm-locations"
          label="Browse all locations we cover" formLabel="Own My City — Apply"
        />
      </div>
    </section>
  );
}
