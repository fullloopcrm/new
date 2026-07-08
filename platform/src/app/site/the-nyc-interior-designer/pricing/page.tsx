import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF, services } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

export const metadata: Metadata = {
  title: `NYC Interior Design Prices & Cost Guide 2026 — What Interior Design Really Costs in New York City | ${SITE_NAME}`,
  description:
    "Complete 2026 NYC interior design pricing guide. Color consultations from $500, single-room design from $5,000, full-home design from $25,000. Borough-by-borough cost breakdowns, service-by-service pricing, and budget tips. Free consultations.",
  keywords: [
    "nyc interior design prices",
    "interior design cost nyc",
    "how much does interior design cost in nyc",
    "interior designer cost new york",
    "kitchen design cost nyc",
    "bathroom design cost nyc",
    "home staging cost nyc",
    "renovation management cost nyc",
    "manhattan interior design cost",
    "brooklyn interior design prices",
    "space planning cost nyc",
    "color consultation nyc price",
    "furniture selection service cost",
    "lighting design nyc pricing",
  ],
  alternates: { canonical: `${SITE_DOMAIN}/pricing` },
  openGraph: {
    title: `NYC Interior Design Prices & Cost Guide 2026 | ${SITE_NAME}`,
    description:
      "Transparent interior design pricing for NYC. Service-by-service costs, borough multipliers, and budget-friendly tips. Free consultations, no hidden fees.",
    url: `${SITE_DOMAIN}/pricing`,
    siteName: SITE_NAME,
    type: "website",
  },
};

/* --- Data --- */

const pricingTiers = [
  {
    name: "Consultation",
    price: "From $500",
    period: "/session",
    desc: "Targeted advice for specific design challenges. Our consultation packages include color consultations, space planning sessions, and design direction meetings. Perfect for homeowners who want professional guidance but plan to handle execution themselves.",
    features: [
      "In-home assessment (2-3 hours)",
      "Color palette recommendations",
      "Furniture layout suggestions",
      "Shopping list with sourcing guidance",
      "Written summary with action items",
    ],
  },
  {
    name: "Single Room Design",
    price: "From $5,000",
    period: "/room",
    desc: "Complete design for one room — living room, bedroom, kitchen, bathroom, or home office. Includes concept development, material selection, furniture specification, and a detailed design package. Procurement and installation services available as add-ons.",
    features: [
      "Concept development with mood boards",
      "Floor plan and furniture layout",
      "Material and finish selections",
      "Furniture and fixture specifications",
      "3D renderings of proposed design",
      "Procurement coordination (optional)",
    ],
  },
  {
    name: "Full-Home Design",
    price: "From $25,000",
    period: "/project",
    desc: "Comprehensive design for your entire home — every room, every detail, from concept through styled installation. Our flagship service includes space planning, custom furniture sourcing, lighting design, art curation, and full project management.",
    features: [
      "Every room designed as a cohesive whole",
      "Custom furniture sourcing and procurement",
      "Material and finish specification throughout",
      "Lighting design for every room",
      "Window treatment design",
      "Art curation and accessory styling",
      "Full project management",
      "Installation day coordination",
    ],
  },
  {
    name: "Renovation Management",
    price: "From $15,000",
    period: "/project",
    desc: "End-to-end management of your NYC renovation — contractor selection, permit filing, co-op board coordination, construction oversight, budget tracking, and quality control. Combined with our design service for a seamless experience.",
    features: [
      "Contractor vetting and selection",
      "NYC DOB permit filing",
      "Co-op/condo board coordination",
      "Construction schedule management",
      "Budget tracking and change orders",
      "Quality inspections and punch lists",
      "Material ordering and delivery",
      "Weekly progress reporting",
    ],
  },
];

const servicePricing = [
  { service: "Full-Home Interior Design", range: "$25,000 - $150,000+", note: "Varies by apartment size and scope" },
  { service: "Kitchen Design", range: "$8,000 - $35,000", note: "Design fees only; renovation costs additional" },
  { service: "Bathroom Design", range: "$5,000 - $20,000", note: "Design fees only; renovation costs additional" },
  { service: "Living Room Design", range: "$5,000 - $25,000", note: "Includes furniture specification" },
  { service: "Bedroom Design", range: "$4,000 - $18,000", note: "Includes closet planning" },
  { service: "Home Office Design", range: "$3,000 - $12,000", note: "Ergonomic and tech integration" },
  { service: "Commercial Interior Design", range: "$15,000 - $100,000+", note: "Per project; varies by square footage" },
  { service: "Space Planning & Layout", range: "$1,500 - $5,000", note: "Floor plans and furniture placement" },
  { service: "Color Consultation", range: "$500 - $2,500", note: "Whole-home palette development" },
  { service: "Furniture Selection & Procurement", range: "$3,000 - $15,000", note: "Fees plus cost of furniture" },
  { service: "Lighting Design", range: "$2,000 - $10,000", note: "Layered lighting plan and specification" },
  { service: "Custom Closet Design", range: "$2,000 - $8,000", note: "Design and specification" },
  { service: "Renovation Management", range: "$15,000 - $50,000+", note: "Percentage of construction cost" },
  { service: "Window Treatment Design", range: "$1,500 - $8,000", note: "Design plus materials and installation" },
  { service: "Art Curation & Styling", range: "$2,000 - $20,000+", note: "Curation fees plus cost of artwork" },
  { service: "Staging & Styling", range: "$5,000 - $25,000", note: "Includes furniture rental (2-3 months)" },
  { service: "Wallpaper & Wall Treatments", range: "$2,000 - $12,000", note: "Design plus materials and installation" },
  { service: "Smart Home Integration", range: "$3,000 - $25,000+", note: "Design and system specification" },
];

const boroughMultipliers = [
  { borough: "Manhattan", multiplier: "1.0x (baseline)", note: "Highest demand, most complex logistics" },
  { borough: "Brooklyn", multiplier: "0.9x - 1.0x", note: "Brownstone and loft projects near Manhattan pricing" },
  { borough: "Queens", multiplier: "0.8x - 0.9x", note: "Good value, growing design demand" },
  { borough: "Bronx", multiplier: "0.75x - 0.85x", note: "Competitive pricing, excellent value" },
  { borough: "Staten Island", multiplier: "0.8x - 0.9x", note: "Suburban-scale projects" },
  { borough: "Long Island", multiplier: "0.9x - 1.1x", note: "Estate projects can exceed Manhattan rates" },
  { borough: "Westchester", multiplier: "0.9x - 1.1x", note: "Luxury market, comparable to Manhattan" },
  { borough: "New Jersey", multiplier: "0.85x - 0.95x", note: "Waterfront premium in Hoboken/JC" },
];

const pricingFaqs = [
  {
    question: "How do interior designers in NYC charge for their services?",
    answer: "NYC interior designers typically use one of three fee structures: (1) Flat fee per project or per room — you pay a set design fee covering concept through specification. (2) Hourly rate — typically $150-$400/hour depending on the designer's experience. (3) Cost-plus — the designer charges retail prices on all furnishings and takes a percentage markup (usually 20-35%). We use a flat-fee structure because it is the most transparent and predictable for clients.",
  },
  {
    question: "What is NOT included in interior design fees?",
    answer: "Design fees cover the creative and management work — concepts, drawings, specifications, sourcing, and project management. They do NOT typically include the cost of furniture, materials, fixtures, contractor labor, permits, or delivery/installation fees. These costs are separate and itemized so you know exactly where your money goes. We provide detailed budgets upfront so there are no surprises.",
  },
  {
    question: "How much should I budget for furniture in an NYC apartment?",
    answer: "A general rule of thumb: budget $15,000-$30,000 for a well-furnished one-bedroom apartment, $30,000-$60,000 for a two-bedroom, and $50,000-$150,000+ for a three-bedroom or larger. These ranges cover quality, long-lasting furniture from mid-to-high-end sources. Custom and luxury furnishings will increase these numbers significantly.",
  },
  {
    question: "Is hiring an interior designer worth the cost in NYC?",
    answer: "Yes, for several reasons: (1) Designers prevent expensive mistakes — buying the wrong sofa, choosing the wrong paint color, or selecting materials that don't work together. (2) Trade-only access means better pricing on furniture and materials. (3) Professional project management saves time and reduces renovation stress. (4) Well-designed interiors increase property value — studies show professionally designed homes sell faster and for 5-15% more than comparable undesigned properties.",
  },
  {
    question: "Can I hire a designer on a limited budget?",
    answer: "Absolutely. Our consultation packages start at $500 and provide professional guidance you can execute yourself. Single-room designs start at $5,000. We also offer phased design plans where we design the entire home but implement it over time — one room per quarter, for example. This spreads the investment while maintaining a cohesive overall design.",
  },
  {
    question: "How much does a kitchen renovation cost in NYC?",
    answer: "NYC kitchen renovation costs include design fees ($8,000-$35,000) plus construction costs. A cosmetic refresh runs $15,000-$30,000. A mid-range gut renovation costs $40,000-$75,000. A high-end luxury kitchen renovation can exceed $100,000-$200,000+. These figures include cabinetry, countertops, appliances, flooring, lighting, plumbing, and electrical work.",
  },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "NYC Interior Design Pricing Guide 2026",
          "Complete pricing guide for interior design services in New York City. Service-by-service costs and borough comparisons.",
          `${SITE_DOMAIN}/pricing`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Pricing", url: `${SITE_DOMAIN}/pricing` },
        ])}
      />
      <JsonLd data={faqSchema(pricingFaqs)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300 font-cta">
            Transparent Pricing &bull; No Hidden Fees &bull; Free Consultations
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            NYC Interior Design <span className="text-blue-300">Prices &amp; Cost Guide</span> — 2026
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            What interior design really costs in New York City. Service-by-service pricing, borough comparisons, and budget tips from our team of experienced designers.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={SMS_HREF} className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/get-a-free-consultation" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Interior Design Service Tiers</h2>
          <p className="mt-2 text-base text-slate-600">Four engagement levels to match every project scope and budget.</p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <div key={tier.name} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-blue-700">{tier.price}</span>
                  <span className="text-sm text-slate-500">{tier.period}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500 flex-1">{tier.desc}</p>
                <ul className="mt-4 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-0.5 text-blue-500 shrink-0">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service-by-Service Pricing Table */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Service-by-Service Pricing</h2>
          <p className="mt-2 text-base text-slate-600">Design fees for each of our 18 interior design services. Furniture, materials, and contractor costs are separate.</p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 pr-4 font-bold text-slate-900">Service</th>
                  <th className="py-3 pr-4 font-bold text-slate-900">Price Range</th>
                  <th className="py-3 font-bold text-slate-900">Note</th>
                </tr>
              </thead>
              <tbody>
                {servicePricing.map((row, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-3 pr-4 font-medium text-slate-800">{row.service}</td>
                    <td className="py-3 pr-4 font-semibold text-blue-700 whitespace-nowrap">{row.range}</td>
                    <td className="py-3 text-slate-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Borough Multipliers */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Borough &amp; Region Cost Factors</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Interior design costs vary by location due to differences in logistics, property types, building requirements, and market demand. Manhattan serves as the baseline. Here is how other boroughs and regions compare:
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {boroughMultipliers.map((b) => (
              <div key={b.borough} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">{b.borough}</p>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{b.multiplier}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{b.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hourly vs Flat Rate */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Hourly vs. Flat-Rate: Which Fee Structure Is Best?</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Hourly Rate</h3>
              <p className="mt-2 text-sm text-slate-600">Typically $150-$400/hour in NYC. Works well for small, defined tasks like a color consultation or furniture selection session. Less predictable for larger projects where scope can evolve.</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-blue-500 shrink-0">+</span> Pay only for time used</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 shrink-0">+</span> Good for small tasks</li>
                <li className="flex items-start gap-2"><span className="text-red-400 shrink-0">&minus;</span> Hard to predict total cost</li>
                <li className="flex items-start gap-2"><span className="text-red-400 shrink-0">&minus;</span> Can incentivize slow work</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-blue-400 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Flat Fee <span className="ml-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Our Approach</span></h3>
              <p className="mt-2 text-sm text-slate-600">A set fee per room or per project, agreed upon before work begins. The most transparent and predictable structure for clients. You know exactly what design will cost from day one.</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-blue-500 shrink-0">+</span> Predictable, transparent costs</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 shrink-0">+</span> Aligns designer and client incentives</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 shrink-0">+</span> Easy to budget</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 shrink-0">+</span> Scope defined upfront</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About Interior Design Pricing
          </h2>
          <div className="mt-8 space-y-4">
            {pricingFaqs.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-slate-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-blue-800 font-heading">
                  {faq.question}
                </summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Services Cross-link */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Explore Our 18 Design Services</h2>
          <p className="mt-2 text-base text-slate-600">Each service page includes detailed process information, features, and local guides.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {services.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-800 transition-colors">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Get a Personalized Quote for Your Project
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Every project is unique. Contact us for a free consultation and receive a detailed, no-obligation proposal with transparent pricing tailored to your specific goals and budget.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/get-a-free-consultation" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
