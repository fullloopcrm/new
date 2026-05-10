// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF, EMAIL, services } from "@/app/site/landscaping-in-nyc/_lib/siteData";

export const metadata: Metadata = {
  title: `NYC Landscaping Prices & Cost Guide 2026 — What Landscaping Really Costs in New York City | ${SITE_NAME}`,
  description:
    "Complete 2026 NYC landscaping pricing guide. Lawn maintenance from $150/visit, landscape design from $2,500, rooftop gardens from $15,000. Borough-by-borough cost breakdowns, seasonal pricing calendar, and money-saving tips. Free estimates for all five boroughs, Long Island & Westchester.",
  keywords: [
    "nyc landscaping prices",
    "landscaping cost nyc",
    "how much does landscaping cost in nyc",
    "landscape design cost new york",
    "lawn care pricing nyc",
    "rooftop garden cost nyc",
    "snow removal pricing nyc",
    "commercial landscaping rates nyc",
    "manhattan landscaping cost",
    "brooklyn landscaping prices",
    "queens landscaping cost",
    "bronx landscaping prices",
    "staten island landscaping cost",
    "long island landscaping prices",
    "westchester landscaping cost",
    "nyc lawn maintenance cost",
    "patio installation cost nyc",
    "hardscape pricing new york",
    "irrigation system cost nyc",
    "landscape lighting pricing nyc",
    "retaining wall cost nyc",
    "drainage solutions pricing nyc",
    "tree planting cost new york city",
    "seasonal flower rotation cost nyc",
    "commercial snow removal nyc pricing",
    "outdoor kitchen cost nyc",
    "fence installation pricing nyc",
  ],
  alternates: { canonical: `${SITE_DOMAIN}/pricing` },
  openGraph: {
    title: `NYC Landscaping Prices & Cost Guide 2026 | ${SITE_NAME}`,
    description:
      "Transparent landscaping pricing for NYC. Service-by-service costs, borough multipliers, seasonal calendar, and money-saving tips. Free estimates, no hidden fees.",
    url: `${SITE_DOMAIN}/pricing`,
    siteName: SITE_NAME,
    type: "website",
  },
};

/* ─── Data ─── */

const pricingTiers = [
  {
    name: "Maintenance",
    price: "From $150",
    period: "/visit",
    desc: "Ongoing lawn, garden, and property care for homes, brownstones, and small commercial lots. Our maintenance plans keep your landscape looking sharp week after week with consistent, professional attention. Choose weekly or biweekly visits based on your property size and needs. Every maintenance client gets a dedicated crew that learns your property inside and out.",
    features: [
      "Weekly or bi-weekly visits",
      "Mowing, edging & blowing",
      "Weeding & bed maintenance",
      "Seasonal flower rotations",
      "Shrub & hedge trimming",
      "Debris removal & cleanup",
      "Monthly property reports",
      "Priority scheduling",
      "Spring & fall cleanup included in annual plans",
      "Fertilization & weed control programs",
    ],
    cta: "Get a Quote",
    href: "/contact",
  },
  {
    name: "Design & Build",
    price: "From $2,500",
    period: "/project",
    desc: "Full-service landscape design and installation — from initial consultation through final walkthrough. Our design-build process starts with a thorough site analysis, moves through custom 3D renderings, and finishes with expert installation by our own crews. We handle every detail: plant selection for NYC's Zone 7a/7b climate, hardscape engineering, irrigation, lighting, permits, and project management.",
    features: [
      "On-site consultation & survey",
      "Custom 3D landscape design",
      "Plant selection for Zone 7a/7b",
      "Hardscaping & patios",
      "Irrigation system installation",
      "Landscape lighting design",
      "Sod & turf installation",
      "Retaining walls & drainage",
      "NYC DOB permit handling",
      "Project management start to finish",
    ],
    highlighted: true,
    cta: "Get a Free Estimate",
    href: "/estimate",
  },
  {
    name: "Commercial",
    price: "Custom",
    period: "pricing",
    desc: "Comprehensive grounds management for property managers, HOAs, retail centers, office buildings, restaurants, and hotels. We build custom service plans around your property portfolio — whether that is a single building or twenty sites across the metro area. Dedicated account managers, 24/7 emergency response, and the consistency your tenants and visitors expect.",
    features: [
      "Dedicated account manager",
      "Custom maintenance schedules",
      "Snow & ice management",
      "Seasonal color programs",
      "Irrigation monitoring & repair",
      "Tree & shrub healthcare",
      "24/7 emergency response",
      "Multi-property discounts",
      "Monthly performance reports",
      "Budget forecasting & planning",
    ],
    cta: "Request Proposal",
    href: "/contact",
  },
];

const servicePricing = [
  { service: "Lawn Maintenance (per visit)", range: "$150 – $500", note: "Based on lot size — 500 sq ft yard vs 5,000+ sq ft property", link: "/services/lawn-garden-maintenance" },
  { service: "Landscape Design (residential)", range: "$2,500 – $15,000", note: "Includes site analysis, 3D renderings, planting plans", link: "/services/landscape-design" },
  { service: "Landscape Design (commercial)", range: "$5,000 – $50,000+", note: "Master planning, phased installation, permit coordination", link: "/services/commercial-landscaping" },
  { service: "Rooftop Garden Design & Build", range: "$15,000 – $100,000+", note: "Structural assessment, waterproofing, containers, irrigation", link: "/services/rooftop-gardens" },
  { service: "Patio & Hardscape Installation", range: "$5,000 – $40,000", note: "Bluestone $25–$40/sq ft, pavers $15–$30/sq ft, concrete $10–$20/sq ft", link: "/services/patio-hardscape-design" },
  { service: "Irrigation System Installation", range: "$2,500 – $12,000", note: "Drip or spray zones, smart WiFi controllers, rain sensors", link: "/services/irrigation-systems" },
  { service: "Landscape Lighting", range: "$2,000 – $15,000", note: "LED path, accent, uplighting, smart timers, 8–20 fixtures typical", link: "/services/landscape-lighting" },
  { service: "Tree & Shrub Planting", range: "$200 – $2,500/tree", note: "2-inch caliper shade tree ~$500–$800 installed, specimen trees higher", link: "/services/tree-shrub-care" },
  { service: "Sod & Turf Installation", range: "$3 – $8/sq ft", note: "Includes soil prep, grading, starter fertilizer. Artificial turf $8–$14/sq ft", link: "/services/sod-turf-installation" },
  { service: "Retaining Walls", range: "$50 – $150/sq ft", note: "Natural stone higher, segmental block lower. Engineering for walls 4ft+", link: "/services/retaining-walls" },
  { service: "Drainage Solutions", range: "$1,500 – $10,000", note: "French drains, dry wells, regrading, catch basins", link: "/services/drainage-solutions" },
  { service: "Seasonal Flower Rotations", range: "$300 – $2,000/rotation", note: "Spring, summer, fall — 3 to 4 rotations per year recommended", link: "/services/seasonal-flower-rotations" },
  { service: "Snow Removal (per visit)", range: "$200 – $1,500", note: "Residential driveways to large commercial lots, salt included", link: "/services/snow-removal" },
  { service: "Snow Removal (seasonal contract)", range: "$2,000 – $15,000", note: "Unlimited visits Nov–Apr, de-icing, sidewalk compliance", link: "/services/snow-removal" },
  { service: "Fence & Gate Installation", range: "$3,000 – $20,000", note: "Cedar $30–$50/lin ft, aluminum $40–$70/lin ft, vinyl $25–$45/lin ft", link: "/services/fence-gate-installation" },
  { service: "Outdoor Kitchen / Fire Pit", range: "$8,000 – $50,000+", note: "Custom design, gas hookup, stone, countertops, appliances", link: "/services/outdoor-living-spaces" },
  { service: "Power Washing", range: "$300 – $1,500", note: "Patios, walkways, facades, decks — by square footage", link: "/services/power-washing-cleanup" },
  { service: "Full Property Cleanup", range: "$500 – $3,000", note: "Spring or fall cleanups, debris hauling, bed prep", link: "/services/power-washing-cleanup" },
];

const boroughMultipliers = [
  { borough: "Manhattan", slug: "manhattan", multiplier: "1.3x – 1.5x", note: "Rooftop access logistics, crane rentals, freight elevators, DOB permits, street closure permits, limited staging area. Materials must be hoisted or hand-carried in many buildings. Parking for crew vehicles adds daily cost." },
  { borough: "Brooklyn", slug: "brooklyn", multiplier: "1.1x – 1.3x", note: "Brownstone access through narrow side gates, limited equipment staging on tight streets, double-parking fees. Brownstone backyards often require hand-carrying all materials through the building." },
  { borough: "Queens", slug: "queens", multiplier: "1.0x (base)", note: "Standard NYC pricing baseline. Larger residential lots, driveway access for equipment, and street parking make Queens our most efficient borough to service." },
  { borough: "Bronx", slug: "bronx", multiplier: "1.0x – 1.1x", note: "Generally larger lots with easier truck and equipment access. Riverdale estates and Pelham Bay properties often have suburban-style driveways and staging areas." },
  { borough: "Staten Island", slug: "staten-island", multiplier: "0.9x – 1.0x", note: "Suburban-style lots with the best equipment access in NYC. Larger properties, wider streets, and dedicated driveways reduce logistics costs significantly." },
  { borough: "Long Island", slug: "long-island", multiplier: "1.0x – 1.2x", note: "Varies widely by town. North Shore estates in Old Westbury or Brookville run higher. South Shore communities like Massapequa closer to base pricing. Travel time factored in." },
  { borough: "Westchester", slug: "westchester", multiplier: "1.1x – 1.3x", note: "Estate-scale properties in Scarsdale and Bronxville command premium pricing due to size and material expectations. Larger crews and longer project timelines typical." },
];

const seasonalCalendar = [
  { month: "January", demand: "Low", pricing: "Lowest", bestFor: "Planning & design consultations, signing seasonal contracts, booking spring projects early", tip: "Best time to lock in annual maintenance pricing" },
  { month: "February", demand: "Low", pricing: "Low", bestFor: "Hardscape planning, material selection, permit applications", tip: "Design-build deposits now secure priority spring scheduling" },
  { month: "March", demand: "Rising", pricing: "Moderate", bestFor: "Spring cleanup, early planting, irrigation spring startup", tip: "Crews fill fast — book spring cleanup by early March" },
  { month: "April", demand: "High", pricing: "High", bestFor: "Planting, sod installation, patio construction begins", tip: "Peak booking month — expect 2-3 week lead times" },
  { month: "May", demand: "Peak", pricing: "Highest", bestFor: "Full landscape installations, flower rotations, irrigation", tip: "Our busiest month. Book 4+ weeks ahead" },
  { month: "June", demand: "Peak", pricing: "Highest", bestFor: "Design-build projects, outdoor living spaces, lighting", tip: "Premium scheduling. Evening/weekend work available at surcharge" },
  { month: "July", demand: "High", pricing: "High", bestFor: "Hardscape projects, summer flower rotation, maintenance", tip: "Heat slows planting — focus on hardscape and structures" },
  { month: "August", demand: "Moderate", pricing: "Moderate", bestFor: "Late summer planting, irrigation repairs, design planning", tip: "Good time to plan fall projects and get ahead of the rush" },
  { month: "September", demand: "High", pricing: "High", bestFor: "Fall planting (ideal for trees/shrubs), overseeding, aeration", tip: "Best month for tree and shrub planting in NYC" },
  { month: "October", demand: "Moderate", pricing: "Moderate", bestFor: "Fall cleanup, winterization, late hardscape work", tip: "Last chance for hardscape before ground freezes" },
  { month: "November", demand: "Low", pricing: "Low", bestFor: "Fall cleanup, snow contracts, winter prep, irrigation blowout", tip: "Sign snow removal contracts before first storm" },
  { month: "December", demand: "Lowest", pricing: "Lowest", bestFor: "Holiday lighting, snow removal, planning for next year", tip: "Best discounts on design-build deposits for spring" },
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `NYC Landscaping Prices & Cost Guide 2026 | ${SITE_NAME}`,
            url: `${SITE_DOMAIN}/pricing`,
            description: metadata.description,
            mainEntity: {
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "How much does landscaping cost in NYC?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "NYC landscaping costs range from $150/visit for basic lawn maintenance to $100,000+ for full rooftop garden installations. Most residential design-build projects fall between $5,000 and $25,000. Costs vary by borough, property size, materials, and project complexity.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Why is Manhattan landscaping more expensive?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Manhattan landscaping runs 30-50% more than outer boroughs due to rooftop access logistics, crane rentals, freight elevator scheduling, DOB permits, street closure permits, and limited material staging areas.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Do you offer free landscaping estimates in NYC?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Every estimate is free with no obligation. We visit your property, discuss your vision, and deliver a detailed written quote within 48 hours.",
                  },
                },
              ],
            },
            provider: {
              "@type": "LocalBusiness",
              name: SITE_NAME,
              url: SITE_DOMAIN,
              telephone: "(212) 470-9637",
              email: EMAIL,
              address: {
                "@type": "PostalAddress",
                streetAddress: "150 W 47th St",
                addressLocality: "New York",
                addressRegion: "NY",
                postalCode: "10036",
                addressCountry: "US",
              },
            },
          }),
        }}
      />

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green-200">
            Transparent Pricing &middot; No Hidden Fees &middot; Free Estimates
          </p>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl font-heading leading-tight">
            NYC Landscaping Prices{" "}
            <span className="text-green-300">&amp; Cost Guide 2026</span>
          </h1>
          <p className="mt-6 text-lg text-green-100/80 max-w-2xl mx-auto leading-relaxed">
            What does landscaping actually cost in New York City? This is the most comprehensive pricing guide for NYC landscaping services you will find anywhere. Real numbers, borough-by-borough breakdowns, seasonal pricing trends, and everything you need to budget your next outdoor project. Every project we take on starts with a free, detailed written estimate — no surprises, no hidden line items.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/estimate"
              className="inline-block rounded-lg bg-white px-8 py-4 text-base font-bold text-green-700 shadow-lg hover:bg-green-50 transition-colors font-cta"
            >
              Get a Free Estimate
            </Link>
            <a
              href={PHONE_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Call {PHONE}
            </a>
            <a
              href={SMS_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Text Us
            </a>
          </div>
          <p className="mt-6 text-sm text-green-200/60">
            Serving <Link href="/areas/manhattan" className="underline hover:text-white">Manhattan</Link>, <Link href="/areas/brooklyn" className="underline hover:text-white">Brooklyn</Link>, <Link href="/areas/queens" className="underline hover:text-white">Queens</Link>, <Link href="/areas/bronx" className="underline hover:text-white">Bronx</Link>, <Link href="/areas/staten-island" className="underline hover:text-white">Staten Island</Link>, <Link href="/areas/long-island" className="underline hover:text-white">Long Island</Link> &amp; <Link href="/areas/westchester" className="underline hover:text-white">Westchester</Link>
          </p>
        </div>
      </section>

      {/* ═══════════════════════ PRICING TIERS ═══════════════════════ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              Three Ways to Work With Us
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Whether you need <Link href="/services/lawn-garden-maintenance" className="text-green-600 hover:text-green-700 underline underline-offset-2">weekly maintenance</Link>, a full <Link href="/services/landscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">design-build project</Link>, or <Link href="/services/commercial-landscaping" className="text-green-600 hover:text-green-700 underline underline-offset-2">commercial property management</Link> — we have a plan that fits your property and budget.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border-2 p-8 flex flex-col ${
                  tier.highlighted
                    ? "border-green-600 bg-white shadow-lg scale-[1.02]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {tier.highlighted && (
                  <span className="inline-block mb-3 self-start rounded-full bg-green-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                    Most Popular
                  </span>
                )}
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider font-cta">
                  {tier.name}
                </p>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono mt-2">
                  {tier.price}
                  <span className="text-lg text-slate-400 font-medium">{tier.period}</span>
                </div>
                <p className="text-slate-500 text-sm mt-2 mb-6 leading-relaxed">{tier.desc}</p>
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-green-600 mt-0.5 shrink-0">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`mt-8 block rounded-lg px-6 py-3 text-center text-sm font-bold transition-colors font-cta ${
                    tier.highlighted
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            All prices are estimates. Final pricing based on property size, scope, materials, and borough. <Link href="/estimate" className="text-green-600 hover:text-green-700 underline underline-offset-2">Free on-site estimates</Link> for all projects. Read our <Link href="/faq" className="text-green-600 hover:text-green-700 underline underline-offset-2">FAQ</Link> for more details on how we price projects.
          </p>
        </div>
      </section>

      {/* ═══════════════════════ SERVICE-BY-SERVICE PRICING TABLE ═══════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              Service-by-Service Pricing Guide
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Real NYC landscaping costs, updated for 2026. These ranges reflect typical residential projects in the NYC metro area. <Link href="/services/commercial-landscaping" className="text-green-600 hover:text-green-700 underline underline-offset-2">Commercial pricing</Link> varies by scope and is quoted per property. Click any service to learn more about what is included.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="px-6 py-4 font-semibold">Service</th>
                  <th className="px-6 py-4 font-semibold">Price Range</th>
                  <th className="px-6 py-4 font-semibold hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {servicePricing.map((row, i) => (
                  <tr
                    key={row.service}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      <Link href={row.link} className="text-green-600 hover:text-green-700 underline underline-offset-2">
                        {row.service}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-bold text-green-700">{row.range}</td>
                    <td className="px-6 py-3.5 text-slate-500 hidden sm:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Prices reflect NYC metro area averages for 2026. Actual costs vary by property size, access, materials, borough, and season. <Link href="/estimate" className="text-green-600 hover:text-green-700 underline underline-offset-2">Request a free estimate</Link> for exact pricing on your project.
          </p>
        </div>
      </section>

      {/* ═══════════════════════ BOROUGH COST MULTIPLIERS ═══════════════════════ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              Borough-by-Borough Cost Multipliers
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Where you live in the NYC metro area has a direct impact on what you pay for landscaping. A <Link href="/services/rooftop-gardens" className="text-green-600 hover:text-green-700 underline underline-offset-2">rooftop garden</Link> in <Link href="/areas/manhattan" className="text-green-600 hover:text-green-700 underline underline-offset-2">Manhattan</Link> involves fundamentally different logistics than a backyard project in <Link href="/areas/staten-island" className="text-green-600 hover:text-green-700 underline underline-offset-2">Staten Island</Link>. Here is how location affects your estimate.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-green-700 text-white">
                  <th className="px-6 py-4 font-semibold">Borough / Region</th>
                  <th className="px-6 py-4 font-semibold">Cost Multiplier</th>
                  <th className="px-6 py-4 font-semibold hidden sm:table-cell">What Drives the Cost</th>
                </tr>
              </thead>
              <tbody>
                {boroughMultipliers.map((row, i) => (
                  <tr
                    key={row.borough}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      <Link href={`/areas/${row.slug}`} className="text-green-600 hover:text-green-700 underline underline-offset-2">
                        {row.borough}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-700">{row.multiplier}</td>
                    <td className="px-6 py-3.5 text-slate-500 hidden sm:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-xl bg-green-50 border border-green-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">How to Read These Multipliers</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              If a service costs $10,000 at our base rate (Queens pricing), the same project in Manhattan would run $13,000 to $15,000 — a 1.3x to 1.5x multiplier. This is not a markup on profit. It reflects real, additional costs: crane rentals can run $2,000 to $5,000 per day, freight elevator reservations must be scheduled and paid for, DOB permits for rooftop work cost $1,000+, and street closure permits (when needed for material delivery) add another $500 to $2,000. In <Link href="/areas/brooklyn" className="text-green-600 hover:text-green-700 underline underline-offset-2">Brooklyn</Link>, brownstone access often means hand-carrying hundreds of pounds of soil, stone, and plants through narrow hallways or side gates — that takes more labor hours, which means higher cost. In <Link href="/areas/staten-island" className="text-green-600 hover:text-green-700 underline underline-offset-2">Staten Island</Link> or suburban <Link href="/areas/long-island" className="text-green-600 hover:text-green-700 underline underline-offset-2">Long Island</Link>, we can back a truck right up to the work area and unload with a skid steer — that efficiency saves you money.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ WHAT AFFECTS LANDSCAPING COST ═══════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              What Affects Landscaping Cost in NYC
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Landscaping in New York City is not like landscaping anywhere else. Here are the factors that determine what your project will cost — and why NYC prices are different from national averages.
            </p>
          </div>

          <div className="prose prose-slate max-w-none">
            <div className="space-y-10">
              {/* Property Size and Access */}
              <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">Property Size and Access</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  The single biggest factor in any landscaping estimate is the size of the area being worked on — but in NYC, access is equally important. A 2,000 square foot backyard in <Link href="/areas/queens" className="text-green-600 hover:text-green-700 underline underline-offset-2">Forest Hills, Queens</Link> with a driveway and wide side gate is a completely different job than a 2,000 square foot <Link href="/services/rooftop-gardens" className="text-green-600 hover:text-green-700 underline underline-offset-2">rooftop terrace</Link> on the <Link href="/areas/manhattan" className="text-green-600 hover:text-green-700 underline underline-offset-2">Upper East Side</Link> that requires a freight elevator and DOB permits.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  For ground-level properties, we measure the actual landscapable area — not the total lot size. A 4,000 square foot lot with a 2,000 square foot house has roughly 2,000 square feet of landscape area, and that is what we price. We also assess equipment access: can we get a mini excavator through your gate? Will we need to hand-dig? Can a dump truck park within 50 feet of the work area, or will we be wheelbarrowing materials 200 feet through a narrow side yard? Every one of these factors affects labor hours and therefore cost.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  For rooftop and terrace projects, the square footage of the space is just the starting point. We need to know the building&rsquo;s freight elevator capacity (if it has one), the floor the terrace is on, whether crane access is available, and what the structural load capacity is. A 500 square foot rooftop garden that requires crane delivery of materials can easily cost more than a 2,000 square foot ground-level project with good truck access.
                </p>
              </div>

              {/* Borough and Neighborhood */}
              <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">Borough and Neighborhood</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  As shown in our borough multiplier table above, location matters. But it is not just about boroughs — specific neighborhoods within each borough have their own cost dynamics. In <Link href="/areas/brooklyn" className="text-green-600 hover:text-green-700 underline underline-offset-2">Brooklyn</Link>, a <Link href="/services/patio-hardscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">patio installation</Link> in a <Link href="/areas/brooklyn" className="text-green-600 hover:text-green-700 underline underline-offset-2">Park Slope</Link> brownstone with a narrow side gate costs more than the same patio in a <Link href="/areas/brooklyn" className="text-green-600 hover:text-green-700 underline underline-offset-2">Bay Ridge</Link> house with a driveway, even though both are in Brooklyn.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Neighborhood also affects parking availability for our crews and trucks. In dense areas like <Link href="/areas/manhattan" className="text-green-600 hover:text-green-700 underline underline-offset-2">Midtown Manhattan</Link> or <Link href="/areas/brooklyn" className="text-green-600 hover:text-green-700 underline underline-offset-2">Williamsburg</Link>, we may need to pay for parking or factor in the cost of alternate-side compliance. In <Link href="/areas/westchester" className="text-green-600 hover:text-green-700 underline underline-offset-2">Scarsdale</Link> or <Link href="/areas/long-island" className="text-green-600 hover:text-green-700 underline underline-offset-2">Garden City</Link>, parking is never an issue. These are small costs individually, but they add up over multi-day projects.
                </p>
              </div>

              {/* Materials */}
              <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">Materials: Bluestone vs Pavers vs Concrete, Native vs Exotic Plants</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Material selection is the area where you have the most control over your project cost. For <Link href="/services/patio-hardscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">hardscape projects</Link>, the difference between materials is substantial. Natural bluestone (the gold standard for NYC patios) runs $25 to $40 per square foot installed, while concrete pavers come in at $15 to $30 per square foot, and poured concrete with a decorative finish is $10 to $20 per square foot. For a 400 square foot patio, that is the difference between $4,000 and $16,000 in materials alone.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  For <Link href="/services/planting-garden-beds" className="text-green-600 hover:text-green-700 underline underline-offset-2">planting projects</Link>, native plants adapted to NYC&rsquo;s Zone 7a/7b climate (like black-eyed susans, switchgrass, inkberry holly, and red maple) are generally less expensive and require less maintenance than exotic or specimen plants. A native perennial garden bed costs roughly $12 to $20 per square foot installed, while a bed featuring Japanese maples, ornamental specimen trees, and imported cultivars can run $30 to $60+ per square foot.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We always present material options at multiple price points so you can make informed decisions. Our <Link href="/services/landscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">design team</Link> will show you what different materials look like in your specific space and help you find the best balance of aesthetics, durability, and budget. Visit our <Link href="/landscaping-101" className="text-green-600 hover:text-green-700 underline underline-offset-2">Landscaping 101</Link> guide for more on choosing the right materials.
                </p>
              </div>

              {/* Season */}
              <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">Season: Spring Rush vs Winter Discounts</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Landscaping in NYC follows a predictable seasonal pricing curve. The peak season runs from mid-April through late June, when everyone wants their yard done for summer. During this window, demand outstrips supply and lead times stretch to 3 to 4 weeks. Prices are at their highest because our crews are fully booked and material suppliers are charging peak-season rates.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The smartest move? Book your project during the off-season. January through March is the best time to sign a design-build contract — you will get our full attention during the design phase, and we can schedule your installation for early spring before the rush hits. Fall (September through November) is another excellent window, especially for <Link href="/services/tree-shrub-care" className="text-green-600 hover:text-green-700 underline underline-offset-2">tree and shrub planting</Link>, which actually performs better in fall than spring. See our seasonal pricing calendar below for a month-by-month breakdown.
                </p>
              </div>

              {/* Complexity */}
              <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">Complexity: Flat Yard vs Sloped, Rooftop vs Ground Level</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  A flat, rectangular backyard is the simplest and most cost-effective type of project. Add slopes, and you need <Link href="/services/retaining-walls" className="text-green-600 hover:text-green-700 underline underline-offset-2">retaining walls</Link> ($50 to $150 per square foot of wall face) and potentially engineered drainage solutions. Multi-level terracing on a steep hillside property — common in <Link href="/areas/bronx" className="text-green-600 hover:text-green-700 underline underline-offset-2">Riverdale</Link> and parts of <Link href="/areas/westchester" className="text-green-600 hover:text-green-700 underline underline-offset-2">Westchester</Link> — can double or triple the cost compared to flat terrain.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  <Link href="/services/rooftop-gardens" className="text-green-600 hover:text-green-700 underline underline-offset-2">Rooftop gardens</Link> represent the highest complexity tier. Every pound of soil, every planter, every plant must be lifted to the roof. Structural engineers must certify load capacity. Waterproofing must be protected or installed. Wind exposure at elevation requires different plant selection and anchoring systems. Irrigation requires dedicated water supply lines. The complexity premium for rooftop work is typically 2x to 3x compared to an equivalent ground-level project.
                </p>
              </div>

              {/* Permits */}
              <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">Permits and Regulations</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  New York City has more regulatory requirements for outdoor construction than almost any other city in America. <Link href="/services/retaining-walls" className="text-green-600 hover:text-green-700 underline underline-offset-2">Retaining walls</Link> over 4 feet require DOB permits and engineered drawings. Rooftop installations require DOB approval and often co-op or condo board sign-off. <Link href="/services/fence-gate-installation" className="text-green-600 hover:text-green-700 underline underline-offset-2">Fences</Link> over 6 feet need permits. Any work near a city street tree requires NYC Parks Department approval.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Permit costs range from a few hundred dollars for simple applications to $2,000+ for complex DOB filings that require professional engineering stamps. We handle all permit coordination as part of our <Link href="/services/landscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">design-build service</Link> — it is built into the project cost, not a surprise add-on. Learn more about NYC landscaping regulations on our <Link href="/faq" className="text-green-600 hover:text-green-700 underline underline-offset-2">FAQ page</Link>.
                </p>
              </div>

              {/* Drainage and Soil */}
              <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">Drainage and Soil Conditions</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  NYC soil is notoriously variable. Some areas of <Link href="/areas/queens" className="text-green-600 hover:text-green-700 underline underline-offset-2">Queens</Link> and <Link href="/areas/long-island" className="text-green-600 hover:text-green-700 underline underline-offset-2">Long Island</Link> have sandy, well-draining soil that is easy to work with. Much of <Link href="/areas/brooklyn" className="text-green-600 hover:text-green-700 underline underline-offset-2">Brooklyn</Link> and the <Link href="/areas/bronx" className="text-green-600 hover:text-green-700 underline underline-offset-2">Bronx</Link> sits on heavy clay that drains poorly and is difficult to dig. And some Manhattan properties have virtually no natural soil at all — just rubble fill from centuries of construction.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Poor drainage adds cost in two ways: first, you may need <Link href="/services/drainage-solutions" className="text-green-600 hover:text-green-700 underline underline-offset-2">drainage solutions</Link> (French drains, dry wells, regrading) before any planting can happen. Second, heavy clay soil takes longer to excavate, which means more labor hours. If your property has standing water after rain, expect to add $1,500 to $10,000 for drainage work depending on the severity. We assess drainage during every initial consultation so there are no surprises.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ RESIDENTIAL VS COMMERCIAL ═══════════════════════ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              Residential vs Commercial Landscaping Pricing
            </h2>
          </div>

          <div className="space-y-8">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">How Residential Pricing Works</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                <Link href="/services/residential-landscaping" className="text-green-600 hover:text-green-700 underline underline-offset-2">Residential landscaping</Link> is priced per project or per visit. For <Link href="/services/lawn-garden-maintenance" className="text-green-600 hover:text-green-700 underline underline-offset-2">maintenance services</Link>, you pay per visit ($150 to $500 depending on property size) or on a monthly contract that averages your annual cost into equal monthly payments. Monthly contracts typically save 10 to 15 percent compared to per-visit pricing because they guarantee us consistent work and allow us to plan crew schedules efficiently.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                For <Link href="/services/landscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">design-build projects</Link>, residential pricing is based on a detailed scope of work with a fixed price. We quote the total project cost upfront — materials, labor, equipment, permits, everything. No hourly billing, no surprise change orders. If something unexpected comes up during the project (we hit a buried oil tank, the soil is contaminated, the existing irrigation is not where the plans show it), we discuss it with you before any additional cost is incurred.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">How Commercial Pricing Works</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                <Link href="/services/commercial-landscaping" className="text-green-600 hover:text-green-700 underline underline-offset-2">Commercial landscaping</Link> is structured differently. Most commercial clients sign annual service contracts that cover grounds maintenance, <Link href="/services/seasonal-flower-rotations" className="text-green-600 hover:text-green-700 underline underline-offset-2">seasonal color rotations</Link>, <Link href="/services/snow-removal" className="text-green-600 hover:text-green-700 underline underline-offset-2">snow removal</Link>, and <Link href="/services/irrigation-systems" className="text-green-600 hover:text-green-700 underline underline-offset-2">irrigation management</Link> under a single monthly fee. This gives property managers predictable budgeting with no seasonal spikes.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                For property management companies and HOAs that manage multiple sites, we offer portfolio pricing. Instead of pricing each property individually, we quote the entire portfolio at a blended rate — which typically saves 15 to 25 percent compared to individual property pricing. The more properties in the portfolio, the better the rate. We assign a dedicated account manager to every commercial client who handles scheduling, quality inspections, and monthly reporting.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Commercial seasonal contracts typically run on a calendar year or fiscal year basis. A typical full-service commercial contract includes 30 to 35 maintenance visits (April through November), 3 seasonal flower rotations, spring and fall cleanups, irrigation management (startup, monitoring, winterization), and unlimited snow removal from November through April. Annual contract values range from $15,000 for a small retail property to $150,000+ for large multi-building complexes.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Interested in commercial service? <Link href="/contact" className="text-green-600 hover:text-green-700 underline underline-offset-2">Request a proposal</Link> or call us at <a href={PHONE_HREF} className="text-green-600 hover:text-green-700 underline underline-offset-2">{PHONE}</a>. We will schedule a property walk-through within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ ROOFTOP GARDEN PRICING DEEP DIVE ═══════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              Rooftop Garden Pricing: A Deep Dive
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              <Link href="/services/rooftop-gardens" className="text-green-600 hover:text-green-700 underline underline-offset-2">Rooftop gardens</Link> are the most complex and costly type of landscaping project in NYC — and also the most transformative. Here is exactly where your money goes.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Structural Assessment: $1,500 – $5,000</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Before a single plant goes on a roof, a structural engineer must certify that the building can support the weight. Soil alone weighs 100 to 120 pounds per cubic foot when wet. A 12-inch deep planting bed across 500 square feet adds over 50,000 pounds to the roof. The structural assessment determines load capacity, identifies reinforcement needs, and produces the documentation required for DOB permit applications. This is non-negotiable — it protects both the building and our license.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Waterproofing and Root Barriers: $3,000 – $15,000</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                The existing roof membrane must be protected from root penetration and the additional weight and moisture of a garden. In many cases, we install a secondary waterproof membrane, root barrier layer, and drainage mat system on top of the existing roof. If the existing membrane is old or compromised, it may need to be replaced before garden construction begins — that is a roofing contractor cost, not a landscaping cost, but we coordinate it as part of the project. Waterproofing failure on a rooftop garden is catastrophic (think: water pouring into the penthouse below), so we do not cut corners here.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Lightweight Soil and Container Systems: $5,000 – $25,000</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Standard garden soil is too heavy for rooftops. We use engineered lightweight growing media that weighs 40 to 60 percent less than traditional soil while providing proper drainage and nutrition. Custom planters — typically fiberglass, aluminum, or composite — are designed to distribute weight evenly across the roof structure. Planter costs alone can run $500 to $5,000 per unit depending on size and material. For a typical 800 square foot rooftop garden, expect $8,000 to $15,000 in containers and growing media.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Access and Logistics: $2,000 – $20,000</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                This is the cost that surprises people most. Getting materials to a rooftop in Manhattan often requires crane rental ($2,000 to $5,000 per day), street closure permits ($500 to $2,000), DOB permits for the crane ($1,000+), and coordination with the building&rsquo;s management company. If a freight elevator is available, we can avoid crane costs — but elevator access must be scheduled, often during off-hours, and building staff may need to be present (at your cost). Some buildings charge a move-in/move-out fee for large material deliveries. For buildings without freight elevators or crane access, manual carry-up is the only option — dramatically increasing labor hours.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Plants, Irrigation, and Finishing: $5,000 – $30,000+</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Wind-resistant plants for high elevations, automated <Link href="/services/irrigation-systems" className="text-green-600 hover:text-green-700 underline underline-offset-2">drip irrigation</Link> with dedicated water supply, <Link href="/services/landscape-lighting" className="text-green-600 hover:text-green-700 underline underline-offset-2">landscape lighting</Link>, custom seating, pergolas, and decorative elements complete the garden. Plant selection for rooftops is specialized — we choose species that tolerate wind, sun exposure, and the temperature extremes of an elevated, exposed environment. Rooftop <Link href="/services/irrigation-systems" className="text-green-600 hover:text-green-700 underline underline-offset-2">irrigation systems</Link> must account for wind-driven evaporation, which can double water needs compared to ground level.
              </p>
            </div>

            <p className="text-sm text-slate-500 text-center">
              Total rooftop garden projects typically range from $15,000 for a small terrace with container plantings to $100,000+ for a full rooftop transformation with built-in structures. <Link href="/estimate" className="text-green-600 hover:text-green-700 underline underline-offset-2">Request a rooftop consultation</Link> to get a detailed estimate for your building.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ MAINTENANCE PLAN PRICING ═══════════════════════ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              Maintenance Plan Pricing
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Consistent, professional <Link href="/services/lawn-garden-maintenance" className="text-green-600 hover:text-green-700 underline underline-offset-2">lawn and garden maintenance</Link> is the foundation of a great-looking property. Here is exactly what our maintenance plans include and what they cost.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">Weekly Service</h3>
              <p className="text-2xl font-extrabold text-green-700 font-mono mb-3">$150 – $500<span className="text-sm text-slate-400 font-medium">/visit</span></p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Best for properties with active-use lawns, high-visibility commercial sites, and clients who want their property looking immaculate at all times. Weekly visits during the growing season (April through November) ensure grass never gets ahead of us, beds stay weed-free, and hedges maintain clean lines.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong>Included:</strong> Mowing, edging, blowing, weeding, bed maintenance, shrub trimming (monthly), debris removal. <strong>Add-ons:</strong> Fertilization program ($400–$800/season), aeration and overseeding ($300–$600), <Link href="/services/seasonal-flower-rotations" className="text-green-600 hover:text-green-700 underline underline-offset-2">seasonal flower rotations</Link> ($300–$2,000/rotation).
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">Biweekly Service</h3>
              <p className="text-2xl font-extrabold text-green-700 font-mono mb-3">$150 – $500<span className="text-sm text-slate-400 font-medium">/visit</span></p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                A cost-effective option for smaller properties, low-traffic areas, or budget-conscious homeowners. Every-other-week visits keep your property looking good without the premium of weekly service. We recommend biweekly for properties under 2,000 square feet of landscape area or those with drought-tolerant, low-growth plantings.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong>Included:</strong> Same services as weekly. Biweekly clients get 18 to 20 visits per season vs 30 to 35 for weekly. <strong>Annual savings:</strong> Roughly 40 percent less than weekly service on a per-season basis.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-green-50 border border-green-200 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Seasonal Add-On Services</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Spring Cleanup</h4>
                <p className="text-sm text-slate-600">$500 – $2,000. Remove winter debris, cut back perennials, edge all beds, first mow, apply pre-emergent. Gets your property ready for the growing season.</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Fall Cleanup</h4>
                <p className="text-sm text-slate-600">$500 – $2,500. Leaf removal (multiple rounds), bed cutback, final mow, <Link href="/services/irrigation-systems" className="text-green-600 hover:text-green-700 underline underline-offset-2">irrigation winterization</Link>, winter mulch application.</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Snow Removal</h4>
                <p className="text-sm text-slate-600">$2,000 – $15,000/season. Maintenance clients get priority <Link href="/services/snow-removal" className="text-green-600 hover:text-green-700 underline underline-offset-2">snow removal</Link> scheduling and 10% off seasonal contracts.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW TO READ A LANDSCAPING ESTIMATE ═══════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              How to Read a Landscaping Estimate
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Whether you are comparing quotes from multiple companies or reviewing our estimate, here is what to look for — and what red flags to watch out for.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">What Every Line Item Should Tell You</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                A professional landscaping estimate breaks the project into clear line items. Each line should include: what is being done (scope), what materials are being used (with specifics — not just &ldquo;pavers&rdquo; but &ldquo;Belgard Bergerac pavers in Victorian&rdquo;), the quantity (square feet, linear feet, number of plants), and the cost. Our estimates include unit prices so you can see exactly what you are paying per square foot, per plant, or per fixture.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Common line item categories include: site preparation and demolition, materials (broken down by type), labor, equipment rental, permit fees, delivery charges, and project management. If an estimate lumps everything into one number with no breakdown, that is a red flag. You should always be able to see where your money is going.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Red Flags in Landscaping Estimates</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>No written estimate at all — just a verbal number</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>A single lump-sum price with no line item breakdown</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>Vague material descriptions (&ldquo;pavers&rdquo; instead of specific product and color)</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>No mention of permits when the project clearly requires them</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>Price that is 40%+ below other quotes (they are cutting corners somewhere)</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>Demand for full payment upfront before any work begins</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>No proof of insurance or willingness to provide a certificate</li>
                <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5 shrink-0 font-bold">&times;</span>No timeline or project schedule included</li>
              </ul>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Questions to Ask Before Signing</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5 shrink-0 font-bold">?</span>What happens if the project goes over budget? (Our answer: we eat it — our fixed-price estimates are fixed.)</li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5 shrink-0 font-bold">?</span>Are you licensed and insured? Can I see a certificate of insurance?</li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5 shrink-0 font-bold">?</span>Who will actually be on my property doing the work? (Subcontractors vs in-house crews)</li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5 shrink-0 font-bold">?</span>What is your payment schedule?</li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5 shrink-0 font-bold">?</span>What warranty or guarantee do you offer on materials and workmanship?</li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5 shrink-0 font-bold">?</span>Do you handle permits, or is that my responsibility?</li>
              </ul>
              <p className="text-sm text-slate-500 mt-4">
                Have more questions? Visit our <Link href="/faq" className="text-green-600 hover:text-green-700 underline underline-offset-2">FAQ page</Link> or <Link href="/contact" className="text-green-600 hover:text-green-700 underline underline-offset-2">get in touch</Link> directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ SEASONAL PRICING CALENDAR ═══════════════════════ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              Seasonal Pricing Calendar
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              When you book matters almost as much as what you book. This calendar shows demand levels, relative pricing, and the best time to schedule each type of service throughout the year.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold">Demand</th>
                  <th className="px-4 py-3 font-semibold">Pricing</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Best For</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Pro Tip</th>
                </tr>
              </thead>
              <tbody>
                {seasonalCalendar.map((row, i) => (
                  <tr
                    key={row.month}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{row.month}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        row.demand === "Peak" ? "bg-red-100 text-red-700" :
                        row.demand === "High" ? "bg-orange-100 text-orange-700" :
                        row.demand === "Rising" ? "bg-yellow-100 text-yellow-700" :
                        row.demand === "Moderate" ? "bg-green-100 text-green-700" :
                        row.demand === "Low" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {row.demand}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        row.pricing === "Highest" ? "bg-red-100 text-red-700" :
                        row.pricing === "High" ? "bg-orange-100 text-orange-700" :
                        row.pricing === "Moderate" ? "bg-yellow-100 text-yellow-700" :
                        row.pricing === "Low" ? "bg-green-100 text-green-700" :
                        "bg-green-200 text-green-800"
                      }`}>
                        {row.pricing}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell text-xs">{row.bestFor}</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs">{row.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Book during low-demand months (November through February) for the best pricing and fastest scheduling. <Link href="/contact" className="text-green-600 hover:text-green-700 underline underline-offset-2">Contact us</Link> to lock in off-season rates.
          </p>
        </div>
      </section>

      {/* ═══════════════════════ COST SAVINGS TIPS ═══════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              10 Ways to Save Money on NYC Landscaping
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Smart planning saves real money. These are specific, actionable tips based on our experience doing thousands of projects across the NYC metro area.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                num: "1",
                title: "Book During the Off-Season",
                text: "Sign your design-build contract in January or February and schedule installation for early spring. You will get our best pricing, priority scheduling, and more design revision rounds because we have bandwidth. Projects booked in May or June often pay 10 to 20 percent more due to peak demand.",
              },
              {
                num: "2",
                title: "Choose Native Plants Over Exotics",
                text: "Native plants like black-eyed susan, switchgrass, inkberry holly, and Eastern red cedar cost less upfront, require less water and fertilizer, and survive NYC winters without babying. Over 5 years, a native plant garden costs roughly 40 percent less to maintain than an exotic garden. Our design team specializes in beautiful native plant designs — visit our landscape design page to learn more.",
              },
              {
                num: "3",
                title: "Sign an Annual Maintenance Contract",
                text: "Annual contracts save 10 to 15 percent compared to per-visit pricing. You also get priority scheduling, locked-in rates, and consistent service from a crew that knows your property. Month-to-month clients pay more per visit and get scheduled after contract clients during busy periods.",
              },
              {
                num: "4",
                title: "Phase Your Project Over Multiple Seasons",
                text: "You do not have to do everything at once. A phased approach lets you spread the cost over 2 to 3 years. Year one: hardscape and structural elements. Year two: planting and irrigation. Year three: lighting and finishing touches. Our designers create phased plans at no extra charge.",
              },
              {
                num: "5",
                title: "Invest in Irrigation to Reduce Long-Term Costs",
                text: "A properly designed irrigation system pays for itself within 2 to 3 seasons by reducing plant replacement, eliminating hand-watering labor, and using water more efficiently. Smart controllers with rain sensors cut water usage by 30 to 50 percent compared to manual watering.",
              },
              {
                num: "6",
                title: "Bundle Services for Volume Discounts",
                text: "Clients who combine maintenance, snow removal, and seasonal color under one contract receive bundled pricing that saves 15 to 20 percent compared to hiring different vendors for each service. One vendor, one relationship, one invoice.",
              },
              {
                num: "7",
                title: "Consider Concrete Pavers Instead of Bluestone",
                text: "Modern concrete pavers from manufacturers like Belgard and Unilock are beautiful, durable, and cost 30 to 50 percent less than natural bluestone. They come in dozens of colors and patterns, require no sealing, and individual pavers can be replaced if damaged. For patios over 300 square feet, the savings are significant.",
              },
              {
                num: "8",
                title: "Improve Drainage First",
                text: "Skipping drainage work to save money upfront is the most expensive mistake we see. Poor drainage kills plants, cracks hardscape, and creates standing water that breeds mosquitoes and undermines foundations. Spending $2,000 to $5,000 on proper drainage can save you $10,000+ in plant replacements and hardscape repairs over the next decade.",
              },
              {
                num: "9",
                title: "Right-Size Your Lawn",
                text: "Do you actually use all that turf? Replacing underused lawn areas with mulched beds, ground cover, or gravel paths reduces mowing costs and water usage. A 3,000 square foot lawn reduced to 1,500 square feet cuts your maintenance cost nearly in half while creating space for lower-maintenance planting beds.",
              },
              {
                num: "10",
                title: "Get Multiple Quotes — But Compare Apples to Apples",
                text: "We encourage you to get 2 to 3 quotes for any project over $5,000. But compare them carefully. The cheapest quote often omits permit costs, uses lower-grade materials, or plans to use subcontractors instead of in-house crews. Make sure every quote specifies the same materials, scope, and timeline before comparing the bottom line.",
              },
            ].map((tip) => (
              <div key={tip.num} className="rounded-xl bg-white border border-slate-200 p-6 flex gap-4">
                <span className="text-2xl font-extrabold text-green-600 font-mono shrink-0 w-8">{tip.num}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading mb-2">{tip.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            Want personalized cost-saving advice for your property? <Link href="/estimate" className="text-green-600 hover:text-green-700 underline underline-offset-2">Request a free estimate</Link> and we will identify the smartest way to maximize your budget. Also check out our <Link href="/landscaping-101" className="text-green-600 hover:text-green-700 underline underline-offset-2">Landscaping 101</Link> guide for more homeowner tips.
          </p>
        </div>
      </section>

      {/* ═══════════════════════ WHAT'S ALWAYS INCLUDED ═══════════════════════ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading">
              What&rsquo;s Always Included
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-xl mx-auto">
              Every project — from a $150 maintenance visit to a $100,000 rooftop garden — includes these as standard. No add-on fees, no upsells.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Free on-site consultation and estimate",
              "Detailed written scope of work with line items",
              "Licensed and fully insured crews",
              "NYC DOT and DOB permit handling (design-build)",
              "Professional-grade materials with product specs",
              "Post-project walkthrough and punch list",
              "Photo documentation of work (before, during, after)",
              "Satisfaction guarantee on all workmanship",
              "Clean job site — we leave it better than we found it",
              "Dedicated project manager for design-build projects",
              "48-hour estimate turnaround after site visit",
              "Written warranty on plantings and hardscape",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-200 p-4">
                <span className="text-green-600 mt-0.5 shrink-0 font-bold">&#10003;</span>
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            Want to know more about how we work? Visit our <Link href="/about" className="text-green-600 hover:text-green-700 underline underline-offset-2">About page</Link> or read our <Link href="/faq" className="text-green-600 hover:text-green-700 underline underline-offset-2">FAQ</Link>.
          </p>
        </div>
      </section>

      {/* ═══════════════════════ PRICING FAQ ═══════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading mb-4 text-center">
            Pricing FAQ
          </h2>
          <p className="text-center text-slate-600 text-lg max-w-xl mx-auto mb-10">
            Common questions about what landscaping costs in NYC. For more, visit our full <Link href="/faq" className="text-green-600 hover:text-green-700 underline underline-offset-2">FAQ page</Link>.
          </p>

          <div className="space-y-6">
            {[
              {
                q: "How much does landscaping cost in NYC?",
                a: <>NYC landscaping ranges from $150 per visit for basic <Link href="/services/lawn-garden-maintenance" className="text-green-600 hover:text-green-700 underline underline-offset-2">lawn maintenance</Link> to $100,000+ for a full <Link href="/services/rooftop-gardens" className="text-green-600 hover:text-green-700 underline underline-offset-2">rooftop garden installation</Link>. Most residential design-build projects fall between $5,000 and $25,000. The biggest factors are property size, access, materials, and borough. Use the service-by-service pricing table above for detailed ranges on every service we offer.</>,
              },
              {
                q: "Do you charge for estimates?",
                a: <>Never. Every estimate is free with no obligation. We visit your property, discuss your vision, and deliver a detailed written quote within 48 hours. <Link href="/estimate" className="text-green-600 hover:text-green-700 underline underline-offset-2">Request your free estimate here</Link>.</>,
              },
              {
                q: "How do you structure payments?",
                a: <>For <Link href="/services/lawn-garden-maintenance" className="text-green-600 hover:text-green-700 underline underline-offset-2">maintenance</Link>: monthly billing or per-visit invoicing. For design-build projects: typically 30% deposit to start, 40% at midpoint, 30% on completion. For projects over $25,000, we offer customized payment schedules. We accept checks, credit cards, and ACH transfers.</>,
              },
              {
                q: "Why is Manhattan landscaping more expensive than other boroughs?",
                a: <>It is not the landscaping that costs more — it is the logistics. Getting materials to a <Link href="/areas/manhattan" className="text-green-600 hover:text-green-700 underline underline-offset-2">Manhattan</Link> rooftop requires crane rentals ($2,000–$5,000/day), freight elevator scheduling, DOB permits ($1,000+), and sometimes street closure permits ($500–$2,000). Labor takes longer because everything is hand-carried through lobbies and elevators instead of unloaded from a truck. The work quality is identical — the access costs are what add 30 to 50 percent.</>,
              },
              {
                q: "Do you offer seasonal contracts?",
                a: <>Yes. Our maintenance clients get priority scheduling, locked-in pricing, and year-round service including <Link href="/services/snow-removal" className="text-green-600 hover:text-green-700 underline underline-offset-2">snow removal</Link>. Seasonal contracts save 10 to 15 percent versus per-visit pricing and guarantee your property is covered from spring cleanup through winter snow management. <Link href="/contact" className="text-green-600 hover:text-green-700 underline underline-offset-2">Contact us</Link> to build a custom annual plan.</>,
              },
              {
                q: "Can I start small and add services later?",
                a: <>Absolutely. Many clients start with <Link href="/services/lawn-garden-maintenance" className="text-green-600 hover:text-green-700 underline underline-offset-2">maintenance</Link> and add <Link href="/services/landscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">design-build projects</Link> over time. We create phased plans that fit your budget and timeline. Starting with maintenance also lets us learn your property before designing — we identify drainage issues, sun and shade patterns, and soil conditions that inform better design decisions.</>,
              },
              {
                q: "Do you match competitors' prices?",
                a: <>We compete on quality, reliability, and results — not price. That said, our pricing is competitive for the level of service, materials, and expertise we provide. If you have a lower quote from another company, we are happy to review it and explain the differences in scope, materials, and approach. Often the &ldquo;cheaper&rdquo; quote is cheaper for a reason.</>,
              },
              {
                q: "What areas do you serve?",
                a: <>We serve all five NYC boroughs (<Link href="/areas/manhattan" className="text-green-600 hover:text-green-700 underline underline-offset-2">Manhattan</Link>, <Link href="/areas/brooklyn" className="text-green-600 hover:text-green-700 underline underline-offset-2">Brooklyn</Link>, <Link href="/areas/queens" className="text-green-600 hover:text-green-700 underline underline-offset-2">Queens</Link>, <Link href="/areas/bronx" className="text-green-600 hover:text-green-700 underline underline-offset-2">Bronx</Link>, <Link href="/areas/staten-island" className="text-green-600 hover:text-green-700 underline underline-offset-2">Staten Island</Link>) plus <Link href="/areas/long-island" className="text-green-600 hover:text-green-700 underline underline-offset-2">Long Island</Link> and <Link href="/areas/westchester" className="text-green-600 hover:text-green-700 underline underline-offset-2">Westchester County</Link>. That covers over 130 neighborhoods. Check our <Link href="/areas/manhattan" className="text-green-600 hover:text-green-700 underline underline-offset-2">areas pages</Link> for neighborhood-specific information.</>,
              },
              {
                q: "How far in advance should I book?",
                a: <>During peak season (April through June), book 3 to 4 weeks ahead. During off-season (November through February), we can often start within 1 to 2 weeks. For large design-build projects, start the design process 2 to 3 months before your desired installation date. See our seasonal pricing calendar above for month-by-month guidance.</>,
              },
              {
                q: "What happens if weather delays my project?",
                a: <>Weather delays happen — this is New York. We build weather contingency into every project schedule. If rain or snow delays your installation, we reschedule at the next available window at no additional cost. Your contract price is fixed regardless of weather delays. We communicate proactively about any schedule changes.</>,
              },
              {
                q: "Do you handle NYC permits?",
                a: <>Yes. We handle all NYC Department of Buildings (DOB), Department of Transportation (DOT), and Parks Department permits as part of our <Link href="/services/landscape-design" className="text-green-600 hover:text-green-700 underline underline-offset-2">design-build service</Link>. Permit costs are included in your estimate — never a surprise add-on. For <Link href="/services/rooftop-gardens" className="text-green-600 hover:text-green-700 underline underline-offset-2">rooftop projects</Link>, we also coordinate with co-op and condo boards and their management companies.</>,
              },
              {
                q: "Do you offer financing?",
                a: <>For projects over $10,000, we offer phased payment plans and can structure milestones to spread payments over the project duration. We do not currently offer third-party financing, but our phased installation approach lets you break a large project into smaller, separately funded phases over multiple seasons.</>,
              },
              {
                q: "What is your cancellation policy?",
                a: <>For maintenance: cancel anytime with 30 days notice. For design-build: deposits are refundable up until design approval. After design approval and material ordering, a cancellation fee may apply to cover materials already purchased and time invested. Full details are in every contract.</>,
              },
              {
                q: "Are you licensed and insured?",
                a: <>Yes. We carry full general liability insurance, workers compensation, and all required NYC business licenses. We provide certificates of insurance to every client and their building management company upon request. Learn more on our <Link href="/about" className="text-green-600 hover:text-green-700 underline underline-offset-2">About page</Link>.</>,
              },
            ].map((faq, i) => (
              <div key={i} className="border-b border-slate-200 pb-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{faq.q}</h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ BOTTOM CTA ═══════════════════════ */}
      <section className="bg-green-700 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl font-heading">
            Get Your Free Estimate Today
          </h2>
          <p className="mt-4 text-green-100/80 text-lg max-w-xl mx-auto">
            No pressure, no obligation, no hidden fees. Tell us about your property and we will provide a detailed
            written estimate within 48 hours. Serving all five boroughs, Long Island, and Westchester.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/estimate"
              className="inline-block rounded-lg bg-white px-8 py-4 text-base font-bold text-green-700 shadow-lg hover:bg-green-50 transition-colors font-cta"
            >
              Get a Free Estimate
            </Link>
            <a
              href={PHONE_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Call {PHONE}
            </a>
            <a
              href={SMS_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Text Us
            </a>
          </div>
          <p className="mt-6 text-sm text-green-200/60">
            <a href={`mailto:${EMAIL}`} className="underline hover:text-white">{EMAIL}</a> &middot; <a href={PHONE_HREF} className="underline hover:text-white">{PHONE}</a> &middot; 150 W 47th St, New York, NY 10036
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-green-200/80">
            <Link href="/services/landscape-design" className="underline hover:text-white">Landscape Design</Link>
            <Link href="/services/rooftop-gardens" className="underline hover:text-white">Rooftop Gardens</Link>
            <Link href="/services/lawn-garden-maintenance" className="underline hover:text-white">Maintenance</Link>
            <Link href="/services/commercial-landscaping" className="underline hover:text-white">Commercial</Link>
            <Link href="/services/snow-removal" className="underline hover:text-white">Snow Removal</Link>
            <Link href="/about" className="underline hover:text-white">About Us</Link>
            <Link href="/faq" className="underline hover:text-white">FAQ</Link>
            <Link href="/careers" className="underline hover:text-white">Careers</Link>
            <Link href="/landscaping-101" className="underline hover:text-white">Landscaping 101</Link>
          </div>
        </div>
      </section>
    </>
  );
}
