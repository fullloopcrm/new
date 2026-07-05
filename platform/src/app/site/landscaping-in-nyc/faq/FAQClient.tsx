"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface FAQ {
  question: string;
  answer: React.ReactNode;
  category: string;
}

const faqs: FAQ[] = [
  // ── General ──
  {
    category: "General",
    question: "What areas do you serve?",
    answer: (
      <>
        We serve all five NYC boroughs — <Link href="/areas/manhattan" className="text-green-600 underline underline-offset-2 hover:text-green-700">Manhattan</Link>, <Link href="/areas/brooklyn" className="text-green-600 underline underline-offset-2 hover:text-green-700">Brooklyn</Link>, <Link href="/areas/queens" className="text-green-600 underline underline-offset-2 hover:text-green-700">Queens</Link>, <Link href="/areas/bronx" className="text-green-600 underline underline-offset-2 hover:text-green-700">Bronx</Link>, and <Link href="/areas/staten-island" className="text-green-600 underline underline-offset-2 hover:text-green-700">Staten Island</Link> — plus <Link href="/areas/long-island" className="text-green-600 underline underline-offset-2 hover:text-green-700">Long Island</Link> and <Link href="/areas/westchester" className="text-green-600 underline underline-offset-2 hover:text-green-700">Westchester</Link>. Over 137 neighborhoods total. <Link href="/areas" className="text-green-600 underline underline-offset-2 hover:text-green-700">Browse all service areas &rarr;</Link>
      </>
    ),
  },
  {
    category: "General",
    question: "Are you licensed and insured?",
    answer: (
      <>
        Yes. We carry full general liability insurance, workers&rsquo; compensation, and all required NYC business licenses. We handle <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-700">DOB permits for landscape design</Link> projects that require them.
      </>
    ),
  },
  {
    category: "General",
    question: "How long have you been in business?",
    answer: (
      <>
        Our founder has been in horticulture and landscaping his entire life — starting at age 8 selling flowers in Queens with his grandfather. Professional experience spans Brickman Landscaping, a $6M NYC park featured in Landscape Architecture Magazine, and decades of urban landscape design. <Link href="/about" className="text-green-600 underline underline-offset-2 hover:text-green-700">Read our full story &rarr;</Link>
      </>
    ),
  },
  {
    category: "General",
    question: "Do you handle both residential and commercial?",
    answer: (
      <>
        Yes. We do everything from <Link href="/services/residential-landscaping" className="text-green-600 underline underline-offset-2 hover:text-green-700">residential backyards</Link> and brownstone gardens to <Link href="/services/commercial-landscaping" className="text-green-600 underline underline-offset-2 hover:text-green-700">commercial properties</Link>, HOA communities, and multi-site portfolios. Same quality, different scale.
      </>
    ),
  },
  {
    category: "General",
    question: "What makes you different from other NYC landscapers?",
    answer: (
      <>
        Three generations of horticultural experience, institutional-grade project management (we&rsquo;ve run $6M+ park projects), design-build under one roof, year-round service including <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-700">snow removal</Link>, and we actually know NYC — born and raised in Queens. <Link href="/about" className="text-green-600 underline underline-offset-2 hover:text-green-700">Learn more about us &rarr;</Link>
      </>
    ),
  },

  // ── Pricing ──
  {
    category: "Pricing",
    question: "How much does landscaping cost in NYC?",
    answer: (
      <>
        It depends on the service and borough. Lawn maintenance starts at $150/visit, landscape design from $2,500, rooftop gardens from $15,000+. Manhattan projects typically cost 1.3–1.5x more due to access logistics. <Link href="/pricing" className="text-green-600 underline underline-offset-2 hover:text-green-700">See our full pricing guide &rarr;</Link>
      </>
    ),
  },
  {
    category: "Pricing",
    question: "Do you charge for estimates?",
    answer: (
      <>
        Never. Every estimate is free with no obligation. We visit your property, discuss your vision, and provide a detailed written quote within 48 hours. <Link href="/contact" className="text-green-600 underline underline-offset-2 hover:text-green-700">Request your free estimate &rarr;</Link>
      </>
    ),
  },
  {
    category: "Pricing",
    question: "How do payments work?",
    answer: (
      <>
        Maintenance clients are billed monthly. Design-build projects follow a 30/40/30 structure — 30% deposit, 40% at midpoint, 30% on completion. We&rsquo;re flexible on larger projects. <Link href="/pricing" className="text-green-600 underline underline-offset-2 hover:text-green-700">Full payment details &rarr;</Link>
      </>
    ),
  },
  {
    category: "Pricing",
    question: "Why does Manhattan cost more than Queens?",
    answer: (
      <>
        Access. Getting materials to a <Link href="/areas/manhattan" className="text-green-600 underline underline-offset-2 hover:text-green-700">Manhattan</Link> rooftop requires crane rentals, freight elevators, DOB permits, and sometimes DOT street closure permits. The work quality is identical — the logistics add cost. <Link href="/pricing" className="text-green-600 underline underline-offset-2 hover:text-green-700">See borough pricing multipliers &rarr;</Link>
      </>
    ),
  },
  {
    category: "Pricing",
    question: "Do you offer seasonal contracts?",
    answer: (
      <>
        Yes. Seasonal maintenance contracts include priority scheduling, locked-in pricing, year-round service including <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-700">snow removal</Link>, and save 10–15% versus per-visit pricing. <Link href="/contact" className="text-green-600 underline underline-offset-2 hover:text-green-700">Ask about seasonal plans &rarr;</Link>
      </>
    ),
  },

  // ── Services ──
  {
    category: "Services",
    question: "What landscaping services do you offer?",
    answer: (
      <>
        We offer 18 professional services including <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-700">landscape design</Link>, <Link href="/services/rooftop-gardens" className="text-green-600 underline underline-offset-2 hover:text-green-700">rooftop gardens</Link>, <Link href="/services/irrigation-systems" className="text-green-600 underline underline-offset-2 hover:text-green-700">irrigation</Link>, <Link href="/services/landscape-lighting" className="text-green-600 underline underline-offset-2 hover:text-green-700">lighting</Link>, <Link href="/services/lawn-garden-maintenance" className="text-green-600 underline underline-offset-2 hover:text-green-700">maintenance</Link>, <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-700">snow removal</Link>, <Link href="/services/patio-hardscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-700">hardscaping</Link>, <Link href="/services/tree-shrub-care" className="text-green-600 underline underline-offset-2 hover:text-green-700">tree care</Link>, and more. <Link href="/services" className="text-green-600 underline underline-offset-2 hover:text-green-700">View all 18 services &rarr;</Link>
      </>
    ),
  },
  {
    category: "Services",
    question: "Can you build a rooftop garden in Manhattan?",
    answer: (
      <>
        Absolutely — it&rsquo;s one of our specialties. We handle structural assessment coordination, waterproofing, lightweight soil systems, wind-tolerant plant selection, irrigation, and DOB permits. <Link href="/services/rooftop-gardens" className="text-green-600 underline underline-offset-2 hover:text-green-700">Learn about rooftop gardens &rarr;</Link>
      </>
    ),
  },
  {
    category: "Services",
    question: "Do you do snow removal?",
    answer: (
      <>
        Yes. We offer per-visit and seasonal <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-700">snow removal</Link> contracts for residential and commercial properties. Includes plowing, shoveling, salting, and ice management. 24/7 response during storms.
      </>
    ),
  },
  {
    category: "Services",
    question: "What plants grow best in NYC?",
    answer: (
      <>
        NYC is USDA Zone 7a/7b. We recommend native species like Eastern Redbud, Sweetspire, Black-Eyed Susan, and Switchgrass for low-maintenance gardens. For shade: hostas, ferns, astilbe. For rooftops: sedums, ornamental grasses, and wind-tolerant shrubs. <Link href="/services/planting-garden-beds" className="text-green-600 underline underline-offset-2 hover:text-green-700">Planting services &rarr;</Link> | <Link href="/landscaping-101" className="text-green-600 underline underline-offset-2 hover:text-green-700">NYC Landscaping 101 Guide &rarr;</Link>
      </>
    ),
  },
  {
    category: "Services",
    question: "Do you install irrigation systems?",
    answer: (
      <>
        Yes. We design and install drip irrigation, spray systems, and smart controllers with rain sensors. Proper <Link href="/services/irrigation-systems" className="text-green-600 underline underline-offset-2 hover:text-green-700">irrigation</Link> is critical in NYC where summer heat and rooftop exposure can stress plants quickly.
      </>
    ),
  },
  {
    category: "Services",
    question: "Can you install landscape lighting?",
    answer: (
      <>
        Yes. We do path lighting, accent lighting, security lighting, and architectural uplighting — all low-voltage LED. <Link href="/services/landscape-lighting" className="text-green-600 underline underline-offset-2 hover:text-green-700">See our lighting services &rarr;</Link>
      </>
    ),
  },
  {
    category: "Services",
    question: "What about drainage problems?",
    answer: (
      <>
        NYC properties are notorious for drainage issues — especially brownstone backyards and below-grade patios. We install French drains, dry wells, regrading, and channel drains. <Link href="/services/drainage-solutions" className="text-green-600 underline underline-offset-2 hover:text-green-700">Drainage solutions &rarr;</Link>
      </>
    ),
  },
  {
    category: "Services",
    question: "Do you handle seasonal flower rotations?",
    answer: (
      <>
        Yes — we swap out plantings 3–4 times per year to keep your property looking fresh through every season. Spring bulbs, summer annuals, fall mums, winter evergreens. <Link href="/services/seasonal-flower-rotations" className="text-green-600 underline underline-offset-2 hover:text-green-700">Seasonal rotations &rarr;</Link>
      </>
    ),
  },

  // ── Process ──
  {
    category: "Process",
    question: "How does the process work?",
    answer: (
      <>
        1) Free on-site consultation. 2) Detailed written estimate within 48 hours. 3) Design phase with 3D renderings for design-build projects. 4) Scheduled installation. 5) Walkthrough and approval. 6) Optional ongoing <Link href="/services/lawn-garden-maintenance" className="text-green-600 underline underline-offset-2 hover:text-green-700">maintenance plan</Link>. <Link href="/contact" className="text-green-600 underline underline-offset-2 hover:text-green-700">Start with a free estimate &rarr;</Link>
      </>
    ),
  },
  {
    category: "Process",
    question: "How long does a typical project take?",
    answer: (
      <>
        Maintenance visits: same day. Small installations (plantings, sod): 1–3 days. Full <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-700">landscape design</Link> projects: 2–6 weeks depending on scope. <Link href="/services/rooftop-gardens" className="text-green-600 underline underline-offset-2 hover:text-green-700">Rooftop gardens</Link>: 4–12 weeks. Large <Link href="/services/patio-hardscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-700">hardscape</Link> projects: 3–8 weeks.
      </>
    ),
  },
  {
    category: "Process",
    question: "Do I need permits for landscaping in NYC?",
    answer: (
      <>
        It depends. Basic plantings and maintenance don&rsquo;t need permits. Structural work (retaining walls, rooftop gardens, fences over 6&rsquo;) may require DOB permits. Tree removal on city property requires Parks Department approval. We handle all permitting. <Link href="/landscaping-101" className="text-green-600 underline underline-offset-2 hover:text-green-700">NYC permit guide in our 101 &rarr;</Link>
      </>
    ),
  },
  {
    category: "Process",
    question: "What happens in winter?",
    answer: (
      <>
        We don&rsquo;t disappear. Winter services include <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-700">snow removal</Link>, ice management, winter pruning, evergreen care, holiday lighting, and spring prep planning. Year-round clients get priority scheduling.
      </>
    ),
  },
  {
    category: "Process",
    question: "Can I phase my project over multiple seasons?",
    answer: (
      <>
        Absolutely. Many clients start with hardscaping in fall, plant in spring, add <Link href="/services/irrigation-systems" className="text-green-600 underline underline-offset-2 hover:text-green-700">irrigation</Link> and <Link href="/services/landscape-lighting" className="text-green-600 underline underline-offset-2 hover:text-green-700">lighting</Link> in summer. We&rsquo;ll build a phased plan that fits your budget. <Link href="/pricing" className="text-green-600 underline underline-offset-2 hover:text-green-700">See pricing &rarr;</Link>
      </>
    ),
  },

  // ── Careers ──
  {
    category: "Careers",
    question: "Are you hiring?",
    answer: (
      <>
        Yes — we&rsquo;re always looking for experienced landscapers, designers, irrigation technicians, tree care specialists, and crew leaders across all boroughs. <Link href="/careers" className="text-green-600 underline underline-offset-2 hover:text-green-700">View open positions &rarr;</Link>
      </>
    ),
  },
  {
    category: "Careers",
    question: "What do landscaping jobs pay in NYC?",
    answer: (
      <>
        Landscaping technicians earn $18–28/hr, crew leaders $28–42/hr, designers $55K–85K/yr. We offer competitive pay, consistent work, and growth opportunities. <Link href="/careers" className="text-green-600 underline underline-offset-2 hover:text-green-700">See all positions and pay ranges &rarr;</Link>
      </>
    ),
  },

  // ── Specific Scenarios ──
  {
    category: "Specific Scenarios",
    question: "I have a tiny Brooklyn backyard. Is it worth landscaping?",
    answer: (
      <>
        100%. Some of our best work is in small spaces — <Link href="/areas/brooklyn/park-slope" className="text-green-600 underline underline-offset-2 hover:text-green-700">Park Slope</Link>, <Link href="/areas/brooklyn/cobble-hill" className="text-green-600 underline underline-offset-2 hover:text-green-700">Cobble Hill</Link>, <Link href="/areas/brooklyn/brooklyn-heights" className="text-green-600 underline underline-offset-2 hover:text-green-700">Brooklyn Heights</Link>. A well-designed 200 sq ft backyard can feel like an oasis. We specialize in maximizing small urban spaces.
      </>
    ),
  },
  {
    category: "Specific Scenarios",
    question: "Can you work on a co-op or condo building?",
    answer: (
      <>
        Yes. We work with building management and co-op boards regularly. We carry the insurance requirements most buildings require and handle all coordination with building staff for access, freight elevators, and scheduling.
      </>
    ),
  },
  {
    category: "Specific Scenarios",
    question: "I manage multiple commercial properties. Can you handle all of them?",
    answer: (
      <>
        Yes. We manage multi-site <Link href="/services/commercial-landscaping" className="text-green-600 underline underline-offset-2 hover:text-green-700">commercial landscaping</Link> portfolios with dedicated account managers, custom schedules, and volume pricing. <Link href="/contact" className="text-green-600 underline underline-offset-2 hover:text-green-700">Request a commercial proposal &rarr;</Link>
      </>
    ),
  },
  {
    category: "Specific Scenarios",
    question: "My yard floods every time it rains. Can you fix it?",
    answer: (
      <>
        Yes — that&rsquo;s a common NYC problem, especially in <Link href="/areas/queens" className="text-green-600 underline underline-offset-2 hover:text-green-700">Queens</Link> and <Link href="/areas/brooklyn" className="text-green-600 underline underline-offset-2 hover:text-green-700">Brooklyn</Link>. We install French drains, regrade slopes, add dry wells, and design rain gardens that solve drainage permanently. <Link href="/services/drainage-solutions" className="text-green-600 underline underline-offset-2 hover:text-green-700">Drainage solutions &rarr;</Link>
      </>
    ),
  },
  {
    category: "Specific Scenarios",
    question: "Can you build an outdoor kitchen or fire pit?",
    answer: (
      <>
        Yes. We design and build custom <Link href="/services/outdoor-living-spaces" className="text-green-600 underline underline-offset-2 hover:text-green-700">outdoor living spaces</Link> including kitchens, fire pits, pergolas, and dining areas. Gas line and electrical coordination included.
      </>
    ),
  },
  {
    category: "Specific Scenarios",
    question: "Do you work in Westchester and Long Island?",
    answer: (
      <>
        Yes. We serve <Link href="/areas/westchester" className="text-green-600 underline underline-offset-2 hover:text-green-700">Westchester</Link> towns like Scarsdale, Bronxville, Rye, and Larchmont, and <Link href="/areas/long-island" className="text-green-600 underline underline-offset-2 hover:text-green-700">Long Island</Link> including Garden City, Great Neck, Manhasset, Huntington, and more.
      </>
    ),
  },
];

const categories = [...new Set(faqs.map((f) => f.category))];

export default function FAQClient() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading"
          >
            NYC Landscaping FAQ —{" "}
            <span className="text-green-200">{faqs.length} Answers</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-white/80"
          >
            Everything NYC homeowners, property managers, and building owners ask about{" "}
            <Link href="/services" className="text-green-200 underline underline-offset-2 hover:text-white">landscaping services</Link>,{" "}
            <Link href="/pricing" className="text-green-200 underline underline-offset-2 hover:text-white">pricing</Link>, and working with a professional landscaper.
          </motion.p>
        </div>
      </section>

      {/* Category Nav */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <a
              key={cat}
              href={`#${cat.toLowerCase().replace(/ /g, "-")}`}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
            >
              {cat} ({faqs.filter((f) => f.category === cat).length})
            </a>
          ))}
        </div>
      </section>

      {/* FAQ Grid by Category */}
      {categories.map((cat) => {
        const catFaqs = faqs.filter((f) => f.category === cat);
        return (
          <section
            key={cat}
            id={cat.toLowerCase().replace(/ /g, "-")}
            className="bg-white py-14 border-b border-slate-100"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading mb-8">
                {cat}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {catFaqs.map((faq) => {
                  const globalIdx = faqs.indexOf(faq);
                  return (
                    <div
                      key={globalIdx}
                      className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-green-300"
                    >
                      <button
                        onClick={() => toggle(globalIdx)}
                        className="flex w-full items-center justify-between px-6 py-5 text-left"
                      >
                        <span className="pr-4 text-base font-semibold text-slate-800 font-heading">
                          {faq.question}
                        </span>
                        <svg
                          className={`h-5 w-5 shrink-0 text-green-500 transition-transform duration-200 ${
                            openItems.has(globalIdx) ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {openItems.has(globalIdx) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Internal Links Grid */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading mb-8">
            Explore More
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[
              { title: "Pricing Guide", href: "/pricing" },
              { title: "All 18 Services", href: "/services" },
              { title: "Cost Estimator", href: "/estimate" },
              { title: "Free Estimate", href: "/contact" },
              { title: "Landscaping 101", href: "/landscaping-101" },
              { title: "Our Story", href: "/about" },
              { title: "NYC Blog", href: "/blog" },
              { title: "All Areas", href: "/areas" },
              { title: "Manhattan", href: "/areas/manhattan" },
              { title: "Brooklyn", href: "/areas/brooklyn" },
              { title: "Queens", href: "/areas/queens" },
              { title: "Bronx", href: "/areas/bronx" },
              { title: "Long Island", href: "/areas/long-island" },
              { title: "Westchester", href: "/areas/westchester" },
              { title: "We're Hiring", href: "/careers" },
              { title: "Rooftop Gardens", href: "/services/rooftop-gardens" },
              { title: "Snow Removal", href: "/services/snow-removal" },
              { title: "Landscape Design", href: "/services/landscape-design" },
              { title: "Irrigation", href: "/services/irrigation-systems" },
              { title: "Hardscaping", href: "/services/patio-hardscape-design" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-green-400 hover:shadow-md text-center">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-green-600 font-heading">
                    {item.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-700 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl font-heading">
            Still Have Questions?
          </h2>
          <p className="mt-3 text-green-100/80">
            Call, text, or email us. We respond within the hour during business hours.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors font-cta"
            >
              Contact Us
            </Link>
            <a
              href="tel:2124709637"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              (212) 470-9637
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
