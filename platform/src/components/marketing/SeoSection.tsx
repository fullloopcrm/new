import Link from "next/link";
import {
  industries,
  metros,
  generateIndustrySlug,
  generateLocationSlug,
} from "@/lib/marketing/combos";
import type { LocationSection } from "@/lib/marketing/locationContent";

// ---------------------------------------------------------------------------
// SectionBlock — renders one content section: badge (short-tail keyword) +
// title (long-tail keyword) + description (mixed) + body + optional bullets.
// Shared by the location and combo templates.
// ---------------------------------------------------------------------------
export function SectionBlock({ section, alt }: { section: LocationSection; alt: boolean }) {
  return (
    <section className={`py-16 px-6 ${alt ? "bg-slate-50" : "bg-white"}`}>
      <div className="mx-auto max-w-4xl">
        <SeoBadge>{section.badge}</SeoBadge>
        <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">
          {section.title}
        </h2>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          {section.description}
        </p>
        {section.paragraphs.map((p, i) => (
          <p key={i} className="text-slate-700 leading-relaxed mb-4">
            {p}
          </p>
        ))}
        {section.bullets && (
          <ul className="mt-4 space-y-3">
            {section.bullets.map((b, i) => (
              <li key={i} className="flex gap-3 text-slate-700 leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SeoBadge — short-tail keyword pill placed above a section heading, so every
// section carries a badge (short-tail) + title (long-tail) + description.
// ---------------------------------------------------------------------------
export function SeoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block mb-4 font-mono text-xs uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1">
      {children}
    </span>
  );
}

const linkCls =
  "text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm";

// ---------------------------------------------------------------------------
// RelatedLinksHub — a deep internal-link block (industries + cities + hubs)
// dropped at the foot of industry/combo pages so each page carries 40+
// crawlable internal links into the rest of the network.
// ---------------------------------------------------------------------------
export function RelatedLinksHub({
  excludeIndustrySlug,
  excludeLocationSlug,
}: {
  excludeIndustrySlug?: string;
  excludeLocationSlug?: string;
}) {
  const inds = industries
    .filter((i) => generateIndustrySlug(i) !== excludeIndustrySlug)
    .slice(0, 24);
  const cities = metros
    .filter((m) => generateLocationSlug(m) !== excludeLocationSlug)
    .slice(0, 24);

  const hubs: { href: string; label: string }[] = [
    { href: "/", label: "Home Service CRM" },
    { href: "/full-loop-crm-service-features", label: "All Features" },
    { href: "/full-loop-crm-service-business-industries", label: "All Industries" },
    { href: "/home-service-crm-locations", label: "All Locations" },
    { href: "/full-loop-crm-pricing", label: "Pricing" },
    { href: "/case-study/the-nyc-maid", label: "NYC Maid Case Study" },
    { href: "/why-you-should-choose-full-loop-crm-for-your-business", label: "Why Full Loop" },
    { href: "/full-loop-crm-frequently-asked-questions", label: "FAQ" },
  ];

  return (
    <section className="py-16 px-6 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-6xl">
        <SeoBadge>Explore Full Loop CRM</SeoBadge>
        <h2 className="text-2xl font-bold text-slate-900 font-heading mb-3">
          Home Service CRM by Industry &amp; City
        </h2>
        <p className="text-slate-600 mb-10 max-w-2xl">
          One operator per trade per city. Browse the full-cycle home service CRM
          by industry or by market, or dive into features, pricing, and the live
          case study.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-4">
              CRM by Industry
            </div>
            <div className="grid grid-cols-1 gap-2">
              {inds.map((i) => (
                <Link key={i.slug} href={`/industry/${generateIndustrySlug(i)}`} className={linkCls}>
                  {i.name} CRM
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-4">
              CRM by City
            </div>
            <div className="grid grid-cols-1 gap-2">
              {cities.map((m) => (
                <Link key={m.slug} href={`/location/${generateLocationSlug(m)}`} className={linkCls}>
                  {m.city}, {m.stateAbbr}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-4">
              Platform
            </div>
            <div className="grid grid-cols-1 gap-2">
              {hubs.map((h) => (
                <Link key={h.href} href={h.href} className={linkCls}>
                  {h.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
