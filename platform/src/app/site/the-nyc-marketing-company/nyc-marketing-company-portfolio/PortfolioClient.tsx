// @ts-nocheck
"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import type { PortfolioBrand } from "@/app/site/the-nyc-marketing-company/_lib/portfolio";

/* ── Animated counter ─────────────────────────────────── */
function StatCounter({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white font-mono tracking-tight">
        {value}
      </p>
      <p className="text-teal-300 text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] mt-2 font-cta">
        {label}
      </p>
    </div>
  );
}

/* ── Brand card (full-width band) ─────────────────────── */
function BrandBand({ brand, index }: { brand: PortfolioBrand; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isEven = index % 2 === 0;

  // Pick the top 3 stats to display
  const statEntries = Object.entries(brand.stats).filter(([, v]) => v).slice(0, 4);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={`py-16 sm:py-20 ${isEven ? "bg-white" : "bg-slate-50"}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Order number + category */}
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-600 text-white text-sm font-bold font-mono">
            {String(brand.order).padStart(2, "0")}
          </span>
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-[0.15em] font-cta">
            {brand.category}
          </span>
        </div>

        {/* Brand name + tagline */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-heading">
            {brand.name}
          </h2>
          <p className="text-teal-600 text-base sm:text-lg font-semibold mt-1">
            {brand.tagline}
          </p>
        </div>

        {/* Two-column: summary + stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Summary */}
          <div className="md:col-span-2">
            <p className="text-slate-600 text-base leading-relaxed">
              {brand.summary}
            </p>

            {/* Service pills */}
            <div className="flex flex-wrap gap-2 mt-5">
              {brand.services.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-4">
            {statEntries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-cta">
                  {formatStatLabel(key)}
                </span>
                <span className="text-slate-900 text-lg font-bold font-mono">
                  {val}
                </span>
              </div>
            ))}
            {brand.siteCount > 1 && (
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-cta">
                  Sites
                </span>
                <span className="text-slate-900 text-lg font-bold font-mono">
                  {brand.siteCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: domain + CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <a
            href={`https://www.${brand.primaryDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 text-sm font-mono hover:text-teal-600 transition-colors"
          >
            {brand.primaryDomain} &rarr;
          </a>
          {brand.googleSearch && (
            <a
              href={brand.googleSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 text-sm font-semibold hover:underline font-cta"
            >
              Google It Right Now
            </a>
          )}
          <Link
            href={`/nyc-marketing-company-portfolio/${brand.slug}`}
            className="inline-block px-6 py-2.5 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta sm:ml-auto"
          >
            Read the Full Case Study
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Stat label formatter ─────────────────────────────── */
function formatStatLabel(key: string): string {
  const map: Record<string, string> = {
    rankings: "Pg 1 Rankings",
    traffic: "Monthly Traffic",
    leads: "Monthly Leads",
    revenue: "Revenue",
    growth: "Growth",
    customers: "Customers",
    neighborhoods: "Neighborhoods",
    pages: "Pages Built",
  };
  return map[key] || key;
}

/* ── Main component ───────────────────────────────────── */
interface Props {
  brands: PortfolioBrand[];
  totals: {
    totalSites: number;
    totalBrands: number;
    totalProgrammaticPages: string;
    totalCustomers: string;
    totalNeighborhoods: string;
    yearsExperience: string;
    languages: string;
  };
}

export default function PortfolioClient({ brands, totals }: Props) {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 bg-slate-900 overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-6 font-cta"
          >
            The Portfolio
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] font-heading mb-6"
          >
            {totals.totalSites} Websites.{" "}
            <span className="text-teal-400">{totals.totalBrands} Brands.</span>
            <br className="hidden sm:block" />
            <span className="block mt-2 text-3xl sm:text-4xl md:text-5xl text-white/80">
              Every One Built by Us.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/60 text-lg sm:text-xl max-w-3xl mx-auto mb-14 leading-relaxed"
          >
            No stock photos. No anonymized case studies. Every business below is live &mdash; visit
            their website and Google them right now to verify. From residential cleaning to SaaS to
            finance to fashion &mdash; these are the results our{" "}
            <Link
              href="/nyc-marketing-company-services-list"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
            >
              SEO, web design, and marketing services
            </Link>{" "}
            deliver.
          </motion.p>

          {/* Counter stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 max-w-4xl mx-auto"
          >
            <StatCounter label="Live Websites" value={String(totals.totalSites)} />
            <StatCounter label="Programmatic Pages" value={totals.totalProgrammaticPages} />
            <StatCounter label="Customers Served" value={totals.totalCustomers} />
            <StatCounter label="Neighborhoods" value={totals.totalNeighborhoods} />
          </motion.div>
        </div>
      </section>

      {/* ── STRATEGY MANIFESTO ────────────────────────── */}
      <section className="py-16 sm:py-24 bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-teal-100 text-sm font-bold uppercase tracking-[0.2em] mb-6 font-cta">
              Before You Scroll — Read This
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight mb-8 font-heading"
            >
              Why We Built 158 Websites Instead of One
            </h2>
            <div className="space-y-6 text-white/90 text-base sm:text-lg leading-relaxed" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              <p>
                Most marketing companies build one website per client and run ads to it. We
                don&apos;t run ads. We build systems that compound.
              </p>
              <p>
                Every domain you see below is a standalone SEO asset. <strong className="text-white">thenycmaid.com</strong> ranks
                for &ldquo;NYC maid.&rdquo; <strong className="text-white">harlemmaid.com</strong> ranks for &ldquo;Harlem
                maid.&rdquo; <strong className="text-white">tribecamaid.com</strong> ranks for &ldquo;Tribeca maid.&rdquo;
                86 domains. 86 ranking opportunities. One phone number.
              </p>
              <p>
                That&apos;s the model. <strong className="text-white">One city, one neighborhood, one solution.</strong> Each
                domain targets a hyper-specific audience &mdash; a neighborhood + a service type.
                Instead of competing for &ldquo;cleaning service NYC&rdquo; against every agency in
                the city, we own the long tail. We own the map. We own the neighborhoods.
              </p>
              <p>
                Then we applied the same thinking to finance (<strong className="text-white">600+ city pages</strong> for
                DSCR loans), to local discovery (<strong className="text-white">25,000 programmatic pages</strong> on
                Moodap), and to this marketing company itself (<strong className="text-white">54,696 pages</strong> on
                thenycseo.com).
              </p>
              <p>
                We built all of it with AI &mdash; Claude, specifically. We&apos;re not hiding that.
                Because the point was never the tool. The point was{" "}
                <strong className="text-white">building things that actually work.</strong> Every site below is
                live. Every number is real. Google any of them right now.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: "No Ads", sub: "100% organic traffic" },
                { label: "No Contracts", sub: "Cancel anytime" },
                { label: "AI-Built", sub: "Claude-powered" },
                { label: "Verifiable", sub: "Google it right now" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-white text-xl sm:text-2xl font-extrabold font-heading">
                    {item.label}
                  </p>
                  <p className="text-teal-200 text-xs font-medium mt-1 font-cta">{item.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BRAND BANDS ──────────────────────────────── */}
      {brands.map((brand, i) => (
        <BrandBand key={brand.slug} brand={brand} index={i} />
      ))}

      {/* ── AGGREGATE PROOF SECTION ──────────────────── */}
      <section className="py-16 sm:py-24 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              The Numbers
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
              What {totals.totalSites} Websites Look Like
            </h2>
            <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mb-12">
              Every number below is from live, verifiable websites. Not projections. Not
              &ldquo;potential reach.&rdquo; Real sites, real traffic, real customers.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 max-w-4xl mx-auto mb-14">
              <StatCounter label="Live Websites" value={String(totals.totalSites)} />
              <StatCounter label="Brands" value={String(totals.totalBrands)} />
              <StatCounter label="Years Experience" value={totals.yearsExperience} />
              <StatCounter label="Languages Served" value={totals.languages} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── KEY STRATEGIES ───────────────────────────── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              How We Did It
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-12 font-heading">
              The Strategies Behind the Results
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Exact Match Domains",
                body: "harlemmaid.com ranks for 'Harlem maid.' fidimaid.com ranks for 'FiDi maid.' Each domain is a surgical strike on a specific search intent. 86 domains = 86 ranking positions.",
              },
              {
                title: "Programmatic SEO",
                body: "54,696 pages on thenycseo.com. 25,000 on Moodap. 600+ on DSCR Loan. Each page targets a specific trade + city or neighborhood + service combination. Built by AI, verified by humans.",
              },
              {
                title: "Multilingual Targeting",
                body: "7+ languages across the Queens maid sites alone — English, Spanish, Mandarin, Cantonese, Tagalog, Bengali, Korean, Russian, Hindi, Greek. Each site speaks the neighborhood's language.",
              },
              {
                title: "AI Search Optimization",
                body: "Multiple brands are explicitly optimized for ChatGPT, Perplexity, Gemini, and Claude — not just Google. AI search converts at 4-5x the rate of traditional search.",
              },
              {
                title: "Cross-Brand Synergy",
                body: "NYC homeowners who need cleaning also need landscaping, handyman, interior design, pest control, and laundry. Every brand feeds the others. One customer, multiple services.",
              },
              {
                title: "Geographic Expansion",
                body: "Local (NYC) → Regional (FL, DMV) → National (USA Maid, Assisted Stretch). The playbook: prove it in one market, then replicate. NYC Maid → Florida Maid → USA Maid.",
              },
            ].map((strategy) => (
              <motion.div
                key={strategy.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="border border-slate-200 rounded-xl p-6 hover:border-teal-300 transition-colors"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-3 font-heading">
                  {strategy.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{strategy.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Ready?
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
              Your Brand Could Be on This Page
            </h2>
            <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mb-10">
              Every brand above started at zero. No rankings, no traffic, no leads. We built it all
              from scratch &mdash; no ads, no shortcuts. Check our{" "}
              <Link
                href="/nyc-marketing-pricing-guide"
                className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
              >
                transparent pricing
              </Link>{" "}
              or use the{" "}
              <Link
                href="/annual-marketing-spend-roi-calculator"
                className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
              >
                ROI calculator
              </Link>{" "}
              to see what&apos;s possible.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-block px-8 py-4 text-base font-bold text-slate-900 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta"
              >
                Schedule a Free Strategy Session
              </Link>
              <a
                href="tel:+12122029220"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors font-cta"
              >
                Call (212) 202-9220
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
