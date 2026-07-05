"use client";

import { useState } from "react";
import Link from "next/link";
import { getAllBoroughs, PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

interface Props {
  faqs: { question: string; answer: string }[];
}

const roomTypes = [
  { label: "Kitchen", value: "kitchen", low: 150, high: 450 },
  { label: "Bathroom", value: "bathroom", low: 200, high: 600 },
  { label: "Living Room", value: "living-room", low: 50, high: 150 },
  { label: "Bedroom", value: "bedroom", low: 40, high: 120 },
  { label: "Full Home", value: "full-home", low: 80, high: 250 },
  { label: "Commercial", value: "commercial", low: 75, high: 200 },
];

const complexityOptions = [
  { label: "Basic", value: "basic", multiplier: 1.0, desc: "Paint, furniture, accessories — no construction" },
  { label: "Standard", value: "standard", multiplier: 1.5, desc: "New finishes, lighting, some fixture upgrades" },
  { label: "Premium", value: "premium", multiplier: 2.2, desc: "Custom cabinetry, layout changes, high-end materials" },
  { label: "Luxury", value: "luxury", multiplier: 3.0, desc: "Gut renovation, custom everything, architect-level design" },
];

const boroughMultipliers: Record<string, number> = {
  manhattan: 1.25,
  brooklyn: 1.1,
  queens: 1.0,
  bronx: 0.95,
  "staten-island": 0.95,
  "long-island": 1.05,
  westchester: 1.1,
  "new-jersey": 1.0,
};

export default function EstimateClient({ faqs }: Props) {
  const allBoroughs = getAllBoroughs();
  const [sqft, setSqft] = useState(500);
  const [roomType, setRoomType] = useState("living-room");
  const [borough, setBorough] = useState("");
  const [complexity, setComplexity] = useState("standard");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const room = roomTypes.find((r) => r.value === roomType) || roomTypes[2];
  const complexityMult = complexityOptions.find((c) => c.value === complexity)?.multiplier || 1.5;
  const boroughMult = borough ? (boroughMultipliers[borough] || 1.0) : 1.0;

  const lowEstimate = Math.round(sqft * room.low * complexityMult * boroughMult);
  const highEstimate = Math.round(sqft * room.high * complexityMult * boroughMult);

  const getLabel = () => {
    if (highEstimate < 15000) return "Small Project";
    if (highEstimate < 50000) return "Medium Project";
    if (highEstimate < 150000) return "Large Project";
    return "Major Project";
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-200">
            Free Tool &bull; Updated for 2026
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Interior Design Cost <span className="text-blue-200">Estimator</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Get an instant ballpark estimate for your NYC interior design project. Enter your project details and see a price range based on typical NYC costs.
          </p>
        </div>
      </section>

      {/* Estimator */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
            {/* Inputs */}
            <div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Project Details</h2>
                <p className="mt-1 text-sm text-slate-500">Enter your project information to get an estimated cost range.</p>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Room Type *</label>
                    <select
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      {roomTypes.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Square Footage *</label>
                    <p className="text-xs text-slate-400 mb-1">Approximate area of the room or space</p>
                    <input
                      type="number"
                      value={sqft}
                      onChange={(e) => setSqft(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      min={25}
                      max={10000}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Borough / Area</label>
                    <select
                      value={borough}
                      onChange={(e) => setBorough(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select borough...</option>
                      {allBoroughs.map((b) => (
                        <option key={b.slug} value={b.slug}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Complexity</label>
                    <div className="mt-2 space-y-2">
                      {complexityOptions.map((opt) => (
                        <label key={opt.value} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${complexity === opt.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
                          <input
                            type="radio"
                            name="complexity"
                            value={opt.value}
                            checked={complexity === opt.value}
                            onChange={(e) => setComplexity(e.target.value)}
                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                            <p className="text-xs text-slate-500">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div>
              <div className="sticky top-28 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                  <h2 className="text-lg font-bold text-slate-900">Estimated Cost Range</h2>

                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
                    <p className="text-3xl font-bold text-blue-700">
                      ${lowEstimate.toLocaleString()} - ${highEstimate.toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-blue-600">{getLabel()}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    This is a ballpark range based on typical NYC pricing. Actual costs depend on material selections, existing conditions, and project-specific details.
                  </p>

                  <div className="mt-6 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Room Type</span>
                      <span className="font-semibold text-slate-900">{room.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Square Footage</span>
                      <span className="font-semibold text-slate-900">{sqft.toLocaleString()} sq ft</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Base Cost/sq ft</span>
                      <span className="font-semibold text-slate-900">${room.low} - ${room.high}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Complexity</span>
                      <span className="font-semibold text-slate-900">{complexityOptions.find((c) => c.value === complexity)?.label}</span>
                    </div>
                    {borough && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Borough Adjustment</span>
                        <span className="font-semibold text-slate-900">{((boroughMult - 1) * 100).toFixed(0)}%{boroughMult >= 1 ? " premium" : " savings"}</span>
                      </div>
                    )}
                  </div>

                  <Link href="/get-a-free-consultation" className="mt-6 block w-full rounded-lg bg-blue-600 px-6 py-3 text-center text-base font-semibold text-white hover:bg-gray-700 transition-colors">
                    Get an Exact Quote — Free
                  </Link>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Want to talk?</p>
                  <a href={SMS_HREF} className="mt-3 block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors">
                    Text Us
                  </a>
                  <a href={PHONE_HREF} className="mt-2 block text-sm font-bold text-blue-800 hover:text-blue-900">
                    Call {PHONE}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Guide */}
      <section className="bg-blue-50/50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            NYC Interior Design Cost Guide — 2026
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Typical price ranges for popular interior design services in New York City.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { service: "Kitchen Renovation", range: "$25,000 - $150,000+", note: "Small galley kitchen refresh: $25-50K. Mid-range renovation: $50-100K. High-end custom kitchen: $100-150K+. Custom cabinetry, countertops, appliances, lighting." },
              { service: "Bathroom Renovation", range: "$15,000 - $75,000+", note: "Basic refresh: $15-25K. Mid-range: $25-50K. Luxury spa bathroom: $50-75K+. Tile, fixtures, vanity, shower/tub, lighting." },
              { service: "Living Room Design", range: "$10,000 - $75,000", note: "Furniture and styling refresh: $10-25K. Full redesign with custom pieces: $25-50K. High-end with built-ins: $50-75K." },
              { service: "Full Apartment Design", range: "$50,000 - $500,000+", note: "Cosmetic refresh: $50-100K. Moderate renovation: $100-250K. Gut renovation 2BR: $250-500K+. Includes design, materials, and installation." },
              { service: "Home Staging", range: "$5,000 - $25,000", note: "Per-month rental staging: $5-10K/mo. Full staging with furniture rental: $10-25K. Luxury staging for high-end listings: $25K+." },
              { service: "Color Consultation", range: "$500 - $3,000", note: "Single room: $500-1,000. Whole home: $1,500-3,000. Includes paint specifications, sample testing, and coordination with design." },
              { service: "Space Planning", range: "$1,500 - $8,000", note: "Single room layout: $1,500-3,000. Full apartment: $3,000-8,000. Includes floor plans, furniture specs, and 3D renderings." },
              { service: "Renovation Management", range: "15-25% of project cost", note: "Full project management including contractor coordination, permits, scheduling, and quality control. Minimum $10,000." },
            ].map((item) => (
              <div key={item.service} className="rounded-xl border border-blue-200/60 bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-base font-bold text-slate-900">{item.service}</span>
                  <span className="text-base font-bold text-blue-700 font-mono">{item.range}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips to Save */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            7 Ways to Save on NYC Interior Design
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Smart strategies to maximize your design budget without sacrificing quality.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              { num: "1", title: "Plan During Off-Season", detail: "Book your project in January-February. Contractors and designers offer off-season pricing (10-15% savings) and you get priority scheduling. Spring and fall are the busiest seasons." },
              { num: "2", title: "Phase Your Renovation", detail: "Do the kitchen this year, bathrooms next year, bedrooms the year after. This spreads cost over time and lets you live with decisions before committing to the next phase." },
              { num: "3", title: "Mix High and Low", detail: "Invest in statement pieces (sofa, dining table, lighting) and save on accent items. A $5,000 sofa surrounded by affordable accessories looks better than all mid-range everything." },
              { num: "4", title: "Keep Plumbing Where It Is", detail: "Moving plumbing is the single most expensive change in NYC renovations. Keeping sinks, toilets, and tubs in their current locations can save $10,000-$50,000 on a kitchen or bath renovation." },
              { num: "5", title: "Refinish Instead of Replace", detail: "Refinishing existing hardwood floors, reglazing bathtubs, and painting existing cabinetry costs a fraction of replacement. Quality refinishing looks like new at 30-50% of the cost." },
              { num: "6", title: "Use Your Designer's Trade Pricing", detail: "Professional designers get 20-40% off retail at trade showrooms. Their design fee often pays for itself through purchasing savings on furniture and materials alone." },
              { num: "7", title: "Get Multiple Quotes", detail: "Always get 3+ written contractor estimates for renovation work. We have seen 30-50% price variation for the same scope. Compare scope, materials, timeline, and references — not just price." },
            ].map((tip) => (
              <div key={tip.num} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white font-mono">
                  {tip.num}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tip.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-blue-50/50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Cost Estimator FAQ
          </h2>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-blue-200/60 bg-white transition-colors hover:border-blue-300">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="pr-4 text-base font-semibold text-slate-800">{faq.question}</span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-blue-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-links */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Continue Exploring
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "All 18 Services", desc: "Browse our full service lineup", href: "/services" },
              { title: "Browse NYC Areas", desc: "Find designers in your neighborhood", href: "/areas" },
              { title: "Kitchen Design", desc: "Custom kitchen renovations", href: "/services/kitchen-design" },
              { title: "Bathroom Design", desc: "Luxury bathroom transformations", href: "/services/bathroom-design" },
              { title: "Full-Home Design", desc: "Complete interior transformations", href: "/services/full-home-interior-design" },
              { title: "Staging & Styling", desc: "Real estate staging services", href: "/services/staging-styling" },
              { title: "Lighting Design", desc: "Professional lighting plans", href: "/services/lighting-design" },
              { title: "Space Planning", desc: "Optimize your floor plan", href: "/services/space-planning" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="group h-full rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gray-800 py-16">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-10" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready for an Exact Quote?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Call us or request a free consultation for accurate pricing on your project.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-800 shadow-lg transition-colors hover:bg-blue-50">
              Text Us
            </a>
            <a href={PHONE_HREF} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60">
              Call {PHONE}
            </a>
            <Link href="/get-a-free-consultation" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
