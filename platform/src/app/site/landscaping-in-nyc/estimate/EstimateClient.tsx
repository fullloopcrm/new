// @ts-nocheck
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { services, getAllBoroughs, PHONE, PHONE_HREF } from "@/app/site/landscaping-in-nyc/_lib/siteData";

interface Props {
  faqs: { question: string; answer: string }[];
}

const complexityOptions = [
  { label: "Basic", value: "basic", multiplier: 1.0, desc: "Simple planting, mulching, or basic maintenance" },
  { label: "Standard", value: "standard", multiplier: 1.5, desc: "Garden design, patio installation, or moderate project" },
  { label: "Complex", value: "complex", multiplier: 2.2, desc: "Multi-element design, hardscaping + planting" },
  { label: "Premium", value: "premium", multiplier: 3.0, desc: "Full transformation, rooftop garden, or high-end materials" },
];

// Base cost per sq ft by service category
const serviceCosts: Record<string, { low: number; high: number }> = {
  "landscape-design": { low: 15, high: 45 },
  "garden-installation": { low: 12, high: 35 },
  "lawn-care-maintenance": { low: 3, high: 8 },
  "tree-services": { low: 10, high: 30 },
  "hardscaping": { low: 25, high: 65 },
  "outdoor-lighting": { low: 8, high: 25 },
  "irrigation-systems": { low: 5, high: 15 },
  "seasonal-planting": { low: 8, high: 20 },
  "rooftop-gardens": { low: 40, high: 100 },
  "snow-removal": { low: 2, high: 6 },
  "fence-installation": { low: 20, high: 55 },
  "water-features": { low: 30, high: 80 },
  "outdoor-kitchens": { low: 50, high: 150 },
  "drainage-solutions": { low: 10, high: 30 },
  "commercial-landscaping": { low: 10, high: 40 },
  "sustainable-landscaping": { low: 12, high: 35 },
  "container-gardens": { low: 15, high: 40 },
  "pest-weed-management": { low: 3, high: 10 },
};

const defaultCost = { low: 12, high: 35 };

// Borough multiplier
const boroughMultipliers: Record<string, number> = {
  manhattan: 1.25,
  brooklyn: 1.1,
  queens: 1.0,
  bronx: 0.95,
  "staten-island": 0.95,
  nassau: 1.05,
  westchester: 1.1,
};

export default function EstimateClient({ faqs }: Props) {
  const allBoroughs = getAllBoroughs();
  const [sqft, setSqft] = useState(500);
  const [serviceSlug, setServiceSlug] = useState("");
  const [borough, setBorough] = useState("");
  const [complexity, setComplexity] = useState("standard");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const baseCost = serviceSlug ? (serviceCosts[serviceSlug] || defaultCost) : defaultCost;
  const complexityMult = complexityOptions.find((c) => c.value === complexity)?.multiplier || 1.5;
  const boroughMult = borough ? (boroughMultipliers[borough] || 1.0) : 1.0;

  const lowEstimate = Math.round(sqft * baseCost.low * complexityMult * boroughMult);
  const highEstimate = Math.round(sqft * baseCost.high * complexityMult * boroughMult);

  const getLabel = () => {
    if (highEstimate < 5000) return "Small Project";
    if (highEstimate < 15000) return "Medium Project";
    if (highEstimate < 50000) return "Large Project";
    return "Major Project";
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-lime-500/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta">
            Free Tool &bull; Updated for 2026
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Landscaping Cost <span className="text-green-200">Estimator</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Get an instant ballpark estimate for your NYC landscaping project. Enter your project details and see a price range based on typical NYC costs.
          </motion.p>
        </div>
      </section>

      {/* Estimator */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
            {/* Inputs */}
            <div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 font-heading">Project Details</h2>
                <p className="mt-1 text-sm text-slate-500">Enter your project information to get an estimated cost range.</p>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Property Size (sq ft) *</label>
                    <p className="text-xs text-slate-400 mb-1">Approximate area to be landscaped</p>
                    <input
                      type="number"
                      value={sqft}
                      onChange={(e) => setSqft(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      min={50}
                      max={50000}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
                    <select
                      value={serviceSlug}
                      onChange={(e) => setServiceSlug(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    >
                      <option value="">Select service...</option>
                      {services.map((s) => (
                        <option key={s.slug} value={s.slug}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Borough / Area</label>
                    <select
                      value={borough}
                      onChange={(e) => setBorough(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
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
                        <label key={opt.value} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${complexity === opt.value ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-green-300"}`}>
                          <input
                            type="radio"
                            name="complexity"
                            value={opt.value}
                            checked={complexity === opt.value}
                            onChange={(e) => setComplexity(e.target.value)}
                            className="mt-0.5 text-green-600 focus:ring-green-500"
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
                {/* Main Result */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                  <h2 className="text-lg font-bold text-slate-900 font-heading">Estimated Cost Range</h2>

                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                    <p className="text-3xl font-bold font-heading text-green-700">
                      ${lowEstimate.toLocaleString()} – ${highEstimate.toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-green-600">{getLabel()}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    This is a ballpark range based on typical NYC pricing. Actual costs depend on site access, materials chosen, and project-specific details.
                  </p>

                  {/* Breakdown */}
                  <div className="mt-6 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Project Area</span>
                      <span className="font-semibold text-slate-900">{sqft.toLocaleString()} sq ft</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Base Cost/sq ft</span>
                      <span className="font-semibold text-slate-900">${baseCost.low} – ${baseCost.high}</span>
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

                  <Link href="/get-a-free-estimate" className="mt-6 block w-full rounded-lg bg-green-600 px-6 py-3 text-center text-base font-semibold text-white hover:bg-green-700 font-cta transition-colors">
                    Get an Exact Quote — Free
                  </Link>
                </div>

                {/* Call CTA */}
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">Want to talk?</p>
                  <a href={PHONE_HREF} className="mt-2 block text-lg font-bold text-green-800 hover:text-green-900 font-heading">
                    {PHONE}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Guide by Service */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            NYC Landscaping Cost Guide — 2026
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Typical price ranges for popular landscaping services in New York City.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { service: "Lawn Care & Maintenance", range: "$200 – $500/month", note: "Weekly mowing, edging, seasonal cleanup. Price depends on lawn size and frequency." },
              { service: "Garden Design & Installation", range: "$5,000 – $25,000", note: "Design, soil prep, planting, mulching. Small gardens start at $5K; medium backyards $10-25K." },
              { service: "Patio Installation", range: "$25 – $65/sq ft", note: "Bluestone: $40-65/sq ft. Pavers: $25-40/sq ft. Concrete: $15-25/sq ft. Includes base prep." },
              { service: "Rooftop Garden", range: "$50,000 – $200,000+", note: "Includes structural engineering, waterproofing protection, lightweight soil, planting, irrigation, permits." },
              { service: "Irrigation System", range: "$2,500 – $8,000", note: "Drip system for garden beds. Smart controller included. More for rooftop or large properties." },
              { service: "Landscape Lighting", range: "$3,000 – $12,000", note: "Low-voltage LED system. 10-20 fixtures typical for a backyard. Includes design and installation." },
              { service: "Tree Planting", range: "$500 – $3,000/tree", note: "Price depends on size — 2\" caliper tree installed. Larger specimen trees cost significantly more." },
              { service: "Fence Installation", range: "$20 – $55/linear ft", note: "Wood: $20-35/ft. Composite: $30-50/ft. Metal panels: $35-55/ft. Includes posts and installation." },
              { service: "Snow Removal", range: "$100 – $300/visit", note: "Per-visit or seasonal contract. Seasonal contracts: $2,000-$6,000 depending on property size." },
            ].map((item) => (
              <div key={item.service} className="rounded-xl border border-green-200/60 bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-base font-bold text-slate-900 font-heading">{item.service}</span>
                  <span className="text-base font-bold text-green-700 font-mono">{item.range}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips to Save */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            7 Ways to Save on NYC Landscaping
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Smart strategies to maximize your landscaping budget without sacrificing quality.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              { num: "1", title: "Plan During Winter", detail: "Book your spring project in January-February. Landscapers offer off-season pricing (10-15% savings) and you get priority scheduling. Spring is the busiest season — prices peak and wait times grow." },
              { num: "2", title: "Phase Your Project", detail: "Break large projects into phases. Do hardscaping this year, planting next year, lighting the year after. This spreads cost over time and lets you adjust plans based on how the landscape evolves." },
              { num: "3", title: "Choose Native Plants", detail: "Native plants cost less to maintain long-term. They need less water, fewer fertilizers, and resist local pests. The upfront cost is similar but the 5-year total cost is 30-50% less than exotic plantings." },
              { num: "4", title: "Consider Permeable Pavers", detail: "NYC offers tax incentives and rebates for stormwater management. Permeable pavers qualify for green infrastructure credits that can offset 10-20% of hardscaping costs." },
              { num: "5", title: "Maintain What You Have", detail: "Regular maintenance is always cheaper than replacement. A $200/month maintenance plan prevents $5,000+ in plant replacement costs. Preventive care saves money every year." },
              { num: "6", title: "Use Existing Materials", detail: "Existing stone, brick, or healthy plants can be incorporated into a new design. Recycling on-site materials reduces both material and disposal costs significantly." },
              { num: "7", title: "Get Multiple Quotes", detail: "Always get 3+ written estimates for projects over $5,000. We've seen 40-60% price variation for the same scope. Compare scope, materials, warranty, and timeline — not just bottom-line price." },
            ].map((tip) => (
              <div key={tip.num} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-sm font-bold text-white font-mono">
                  {tip.num}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{tip.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Cost Estimator FAQ
          </h2>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-green-200/60 bg-white transition-colors hover:border-green-300">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="pr-4 text-base font-semibold text-slate-800 font-heading">{faq.question}</span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-green-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-links */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            Continue Exploring
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "All 18 Services", desc: "Browse our full service lineup", href: "/services" },
              { title: "Browse NYC Areas", desc: "Find landscaping in your neighborhood", href: "/areas" },
              { title: "Landscape Design", desc: "Custom garden and outdoor design", href: "/services/landscape-design" },
              { title: "Rooftop Gardens", desc: "NYC's rooftop garden specialists", href: "/services/rooftop-gardens" },
              { title: "Hardscaping", desc: "Patios, walkways, retaining walls", href: "/services/patio-hardscape-design" },
              { title: "Outdoor Lighting", desc: "LED landscape lighting systems", href: "/services/landscape-lighting" },
              { title: "Irrigation Systems", desc: "Smart watering solutions", href: "/services/irrigation-systems" },
              { title: "Snow Removal", desc: "Commercial & residential snow services", href: "/services/snow-removal" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="group h-full rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-green-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-green-600 font-heading">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-green-700 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready for an Exact Quote?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Call us or request a free on-site estimate for accurate pricing on your project.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={PHONE_HREF}>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta"
              >
                {PHONE}
              </motion.span>
            </a>
            <Link href="/get-a-free-estimate">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
              >
                Get a Free Estimate
              </motion.span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
