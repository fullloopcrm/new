import Link from "next/link";
import { C, mono, barLabel } from "./editorial";
import {
  industries,
  metros,
  generateIndustrySlug,
  generateLocationSlug,
  generateComboSlug,
} from "@/lib/marketing/combos";

const colTitle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: "10px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: "14px",
};

const linkStyle: React.CSSProperties = {
  fontFamily: mono,
  fontSize: "12px",
  letterSpacing: "0.02em",
  color: C.graphite,
  lineHeight: 1.9,
  display: "block",
};

// Hub / section pages.
const hubs: { href: string; label: string }[] = [
  { href: "/about-full-loop-crm", label: "About Full Loop" },
  { href: "/full-loop-crm-service-features", label: "All Features" },
  { href: "/full-loop-crm-service-business-industries", label: "All Industries" },
  { href: "/home-service-crm-locations", label: "All Locations" },
  { href: "/case-study/the-nyc-maid", label: "NYC Maid Case Study" },
  { href: "/full-loop-crm-frequently-asked-questions", label: "FAQ" },
  { href: "/why-you-should-choose-full-loop-crm-for-your-business", label: "Why Full Loop" },
  { href: "/full-loop-crm-101-educational-tips", label: "Full Loop 101" },
  { href: "/home-service-business-blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "#lead-form", label: "Submit Application" },
];

// Curated combos: first 5 industries × first 4 metros = 20 valid combo pages.
const comboLinks = industries.slice(0, 5).flatMap((ind) =>
  metros.slice(0, 4).map((m) => ({
    href: `/${generateComboSlug(ind, m)}`,
    label: `${ind.name} · ${m.city}`,
  }))
);

// Inner-link matrix: ~110 crawlable internal links into the industry, location,
// and combo network. All slugs come from the same helpers the routes use.
export default function InnerLinks() {
  const cityLinks = metros.slice(0, 36);

  return (
    <section style={{ background: C.ink, color: C.cream }}>
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-20">
        <span style={{ ...barLabel, color: "#6FB58A", borderBottom: `1px solid ${C.cream}` }}>
          Explore Full Loop
        </span>
        <p
          className="mt-6 mb-12 max-w-2xl"
          style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.04em", color: C.cream, lineHeight: 1.7 }}
        >
          A full-cycle home service CRM for every trade, in every market &mdash; one operator
          per trade per city. Find your industry, your city, or your exact combination
          below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-12">
          {/* Industries — all 51 */}
          <div className="md:col-span-2">
            <div style={colTitle}>Industry CRMs ({industries.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              {industries.map((ind) => (
                <Link
                  key={ind.slug}
                  href={`/industry/${generateIndustrySlug(ind)}`}
                  style={linkStyle}
                  className="transition-colors hover:text-[#6FB58A]"
                >
                  {ind.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Cities */}
          <div>
            <div style={colTitle}>Home Service CRM by City</div>
            {cityLinks.map((m) => (
              <Link
                key={m.slug}
                href={`/location/${generateLocationSlug(m)}`}
                style={linkStyle}
                className="transition-colors hover:text-[#6FB58A]"
              >
                {m.city}, {m.stateAbbr}
              </Link>
            ))}
          </div>

          {/* Combos + hubs */}
          <div>
            <div style={colTitle}>Popular Combinations</div>
            {comboLinks.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                style={linkStyle}
                className="transition-colors hover:text-[#6FB58A]"
              >
                {c.label}
              </Link>
            ))}

            <div style={{ ...colTitle, marginTop: "32px" }}>Platform</div>
            {hubs.map((h) => (
              <Link
                key={h.href}
                href={h.href}
                style={linkStyle}
                className="transition-colors hover:text-[#6FB58A]"
              >
                {h.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
