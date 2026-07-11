"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { areas } from "@/app/site/consortium-nyc/_lib/siteData";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";
import dynamic from "next/dynamic";

const TriStateMap = dynamic(() => import("./TriStateMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] sm:h-[750px] rounded-2xl bg-slate-800 animate-pulse flex items-center justify-center">
      <span className="text-slate-500 text-sm font-cta">Loading map...</span>
    </div>
  ),
});

/* ── Animated counter ────────────────────────────────────────── */
function CountUp({ value, prefix, suffix, inView }: { value: number; prefix?: string; suffix?: string; inView: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [inView, value, count, rounded]);

  return <span>{prefix}{display}{suffix}</span>;
}

/* ── Region definitions ──────────────────────────────────────── */
const regionDefs = [
  { key: "Manhattan", label: "Manhattan", color: "#0d9488" },
  { key: "Brooklyn", label: "Brooklyn", color: "#0f766e" },
  { key: "Queens", label: "Queens", color: "#14b8a6" },
  { key: "Bronx", label: "The Bronx", color: "#115e59" },
  { key: "Staten Island", label: "Staten Island", color: "#134e4a" },
  { key: "Long Island", label: "Long Island", color: "#0d9488" },
  { key: "Westchester", label: "Westchester", color: "#0f766e" },
  { key: "New Jersey", label: "New Jersey", color: "#115e59" },
];

function getRegionAreas(regionKey: string) {
  return areas.filter((a) => a.region === regionKey);
}

/* ── Stats ────────────────────────────────────────────────────── */
const stats = [
  { prefix: "", value: 80, suffix: "+", label: "Neighborhoods" },
  { prefix: "", value: 8, suffix: "", label: "Regions" },
  { prefix: "", value: 5, suffix: "", label: "NYC Boroughs" },
  { prefix: "", value: 25, suffix: "+", label: "Years Local" },
];

/* ══════════════════════════════════════════════════════════════ */
export default function ServiceAreasClient() {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  const scrollToRegion = (regionKey: string) => {
    setActiveRegion(regionKey);
    const el = document.getElementById(`region-${regionKey.toLowerCase().replace(/\s+/g, "-")}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 bg-slate-900 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-teal-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block bg-teal-600 text-white text-xs sm:text-sm font-bold tracking-[0.15em] uppercase px-5 py-2.5 mb-6 font-cta"
          >
            NYC Web Design Service Areas
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 font-heading leading-[1.1]"
          >
            Marketing for{" "}
            <span className="text-teal-400">80+ Neighborhoods</span>{" "}
            Across the Tri-State
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed mb-4"
          >
            Every neighborhood has its own competitive landscape. A <Link href="/industries-we-offer-marketing-services-for/plumber-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">plumber in Brooklyn</Link> faces different competition than one in <Link href="/services-areas-we-offer-marketing-services-in/long-island-marketing-company" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">Long Island</Link>. We build hyper-local <Link href="/services/search-engine-optimization-seo-nyc" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">SEO</Link> and <Link href="/nyc-marketing-company-services-list" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">marketing strategies</Link> for each one.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-300 text-sm mb-10 max-w-2xl mx-auto"
          >
            Manhattan, Brooklyn, Queens, The Bronx, Staten Island, Long Island, Westchester &amp; New Jersey. See our <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">transparent pricing</Link> or <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">real results</Link>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Link
              href="https://www.thenycmarketingcompany.com/contact"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta"
            >
              Find Your Neighborhood
            </Link>
            <a
              href="tel:+12122029220"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg border border-white/30 hover:bg-white/10 transition-colors font-cta"
            >
              Call (212) 202-9220
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {["80+ Neighborhoods", "8 Regions", "5 Boroughs", "No Contracts"].map((badge) => (
              <span
                key={badge}
                className="px-4 py-2 text-xs font-medium text-white/90 border border-white/20 rounded-full bg-white/10 backdrop-blur-sm font-cta"
              >
                {badge}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<>Marketing in <strong>Midtown Manhattan</strong> is a completely different game than marketing in <strong>Bay Ridge or Astoria</strong>. Cookie-cutter strategies don&apos;t work here. Every neighborhood has its own search behavior, competition, and customer mindset.</>}
      />

      {/* ── STATS TICKER ─────────────────────────────────────── */}
      <section ref={statsRef} className="py-10 sm:py-12 bg-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-1 font-mono text-white">
                  <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} inView={statsInView} />
                </div>
                <div className="text-white/80 text-sm font-medium font-cta">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE MAP + REGION NAV ──────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Tri-State Coverage
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
              Click a Region to{" "}
              <span className="text-teal-600">Explore</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Hover over the map or click a region to jump to its neighborhoods. Every area has a dedicated page with local SEO strategies for your market.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            {/* Map */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:w-[60%] w-full"
            >
              <TriStateMap
                activeRegion={activeRegion}
                onRegionHover={setActiveRegion}
                onRegionClick={scrollToRegion}
              />
              <p className="text-center text-slate-400 text-xs mt-3 font-cta">
                Hover pins to see areas &middot; Click to jump to neighborhoods below
              </p>
            </motion.div>

            {/* Region quick nav */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:w-[40%] w-full lg:sticky lg:top-32"
            >
              <div className="space-y-3">
                {regionDefs.map((region) => {
                  const regionAreas = getRegionAreas(region.key);
                  const isActive = activeRegion === region.key;
                  return (
                    <button
                      key={region.key}
                      onMouseEnter={() => setActiveRegion(region.key)}
                      onMouseLeave={() => setActiveRegion(null)}
                      onClick={() => scrollToRegion(region.key)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        isActive
                          ? "border-teal-400 bg-teal-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-teal-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-base font-bold font-heading ${isActive ? "text-teal-600" : "text-slate-900"}`}>
                            {region.label}
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {regionAreas.filter((a) => a.type === "Borough" || a.type === "Region" || a.type === "County").length > 0
                              ? `${regionAreas.length} areas`
                              : `${regionAreas.length} neighborhoods`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-extrabold font-mono ${isActive ? "text-teal-600" : "text-slate-300"}`}>
                            {regionAreas.length}
                          </span>
                          <span className={`transition-transform ${isActive ? "text-teal-600 translate-x-1" : "text-slate-300"}`}>
                            &rarr;
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick pricing */}
              <div className="mt-6 rounded-xl bg-slate-900 p-6">
                <h4 className="text-sm font-bold text-white mb-3 font-heading">Local SEO for Any Neighborhood</h4>
                <div className="grid grid-cols-3 gap-1 text-xs mb-1">
                  <span className="text-white/40"></span>
                  <span className="text-white/40 text-right font-cta">Ours</span>
                  <span className="text-white/40 text-right font-cta">NYC Avg</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center py-2 border-t border-white/10">
                  <span className="text-white/60 text-sm">Monthly SEO</span>
                  <span className="text-white font-bold font-mono text-right">$950/mo</span>
                  <span className="text-white/40 font-mono text-right line-through text-sm">$2,500/mo</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center py-2 border-t border-white/10 mb-4">
                  <span className="text-white/60 text-sm">Custom Website</span>
                  <span className="text-white font-bold font-mono text-right">$4,600+</span>
                  <span className="text-white/40 font-mono text-right line-through text-sm">$12,000+</span>
                </div>
                <Link
                  href="/nyc-marketing-pricing-guide"
                  className="block text-center text-teal-400 text-xs font-bold font-cta hover:underline"
                >
                  See Full Pricing Guide &rarr;
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STICKY JUMP NAV ──────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-y border-slate-100 sticky top-[72px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {regionDefs.map((region) => (
              <button
                key={region.key}
                onClick={() => scrollToRegion(region.key)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-full border border-slate-200 hover:border-teal-300 transition-all font-cta"
              >
                {region.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL AREAS BY REGION ──────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {regionDefs.map((region) => {
              const regionAreas = getRegionAreas(region.key);
              if (regionAreas.length === 0) return null;
              const boroughs = regionAreas.filter((a) => a.type === "Borough" || a.type === "Region" || a.type === "County");
              const neighborhoods = regionAreas.filter((a) => a.type === "Neighborhood" || a.type === "City");

              return (
                <div key={region.key} id={`region-${region.key.toLowerCase().replace(/\s+/g, "-")}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-4 mb-8"
                  >
                    <div className="w-3 h-3 rounded-full bg-teal-600 shrink-0" />
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                      {region.label}
                    </h2>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-sm font-bold text-slate-400 font-mono shrink-0">
                      {regionAreas.length} areas
                    </span>
                  </motion.div>

                  {/* Borough/Region-level cards */}
                  {boroughs.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                      {boroughs.map((area, i) => (
                        <motion.div
                          key={area.slug}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                          <Link
                            href={`/services-areas-we-offer-marketing-services-in/${area.slug}`}
                            className="group block rounded-2xl bg-slate-900 hover:bg-slate-800 p-6 transition-all h-full"
                          >
                            <span className="text-teal-400 text-[10px] font-bold tracking-[0.15em] uppercase font-cta">
                              {area.type}
                            </span>
                            <h3 className="text-xl font-bold text-white mt-1 mb-2 font-heading group-hover:text-teal-400 transition-colors">
                              {area.name}
                            </h3>
                            <p className="text-white/60 text-sm leading-relaxed mb-3">
                              SEO, web design &amp; marketing services for businesses in {area.name}.
                            </p>
                            <span className="text-teal-400 text-sm font-bold font-cta group-hover:underline">
                              View Services &rarr;
                            </span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Neighborhood cards */}
                  {neighborhoods.length > 0 && (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {neighborhoods.map((area, i) => (
                        <motion.div
                          key={area.slug}
                          initial={{ opacity: 0, y: 15 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: (i % 10) * 0.03 }}
                        >
                          <Link
                            href={`/services-areas-we-offer-marketing-services-in/${area.slug}`}
                            className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-4 h-full transition-all hover:shadow-md"
                          >
                            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-teal-600 font-cta">
                              {area.type}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors mt-1 mb-1 font-heading">
                              {area.name}
                            </h4>
                            <p className="text-slate-500 text-xs leading-relaxed">
                              Marketing in {area.name}
                            </p>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY LOCAL MATTERS ────────────────────────────────── */}
      <section className="py-20 bg-teal-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Why Hyper-Local Matters
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Every Neighborhood Is a{" "}
              <span className="text-teal-600">Different Market</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              A homeowner searching for an <Link href="/industries-we-offer-marketing-services-for/hvac-company-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">HVAC company in Queens</Link> behaves differently than one in <Link href="/services-areas-we-offer-marketing-services-in/westchester-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Westchester</Link>. We build custom strategies for each.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "Different Competition",
                desc: "Your top 3 competitors in Astoria are completely different from your top 3 in Bay Ridge. We research each market individually.",
              },
              {
                num: "02",
                title: "Different Search Behavior",
                desc: "\"Plumber near me\" in Manhattan returns completely different results than Long Island. We optimize for each neighborhood's unique search landscape.",
              },
              {
                num: "03",
                title: "Different Demographics",
                desc: "Income levels, languages spoken, buying behavior — every neighborhood has its own profile. We tailor messaging and targeting accordingly.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 hover:border-teal-300 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center mb-5">
                  <span className="text-white text-lg font-black font-mono">{item.num}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 font-heading">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES CROSS-LINK ──────────────────────────────── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold mb-6 font-heading">Every Area Page Includes</h3>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  "Local keyword research for your neighborhood",
                  "Competitor analysis specific to your area",
                  "Google Business Profile optimization",
                  "Neighborhood-targeted content strategy",
                  "Local citation building & NAP consistency",
                  "Hyper-local link building opportunities",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-teal-400 shrink-0">&#x2713;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold mb-6 font-heading">Services Available Everywhere</h3>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  { text: "SEO & Local SEO", href: "/services/search-engine-optimization-seo-nyc" },
                  { text: "Custom Web Design", href: "/services/web-design-nyc" },
                  { text: "AI Automation & Text Bots", href: "/services/ai-automation-services-in-nyc" },
                  { text: "Programmatic SEO at Scale", href: "/services/programmatic-seo-services-in-nyc" },
                  { text: "Custom CRM Development", href: "/services/custom-crm-development-in-nyc" },
                  { text: "Google Business Profile", href: "/services/google-business-profile-services-in-nyc" },
                ].map((item) => (
                  <li key={item.text} className="flex gap-2.5">
                    <span className="text-teal-400 shrink-0">+</span>
                    <Link href={item.href} className="text-teal-400 underline underline-offset-2 hover:text-teal-300">
                      {item.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-slate-900 p-12 sm:p-16 text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-teal-600/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-teal-400/10 blur-3xl" />

            <div className="relative z-10">
              <p className="text-teal-400 text-sm font-semibold tracking-wider uppercase mb-3 font-cta">
                Don&apos;t See Your Area?
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
                We Cover the Entire Tri-State
              </h2>
              <p className="text-white/60 text-base mb-10 max-w-2xl mx-auto">
                If your business serves customers in the NYC metro area, we can build a local SEO strategy that dominates your neighborhood. Check our <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">pricing guide</Link>, see <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">real results</Link>, or explore <Link href="/industries-we-offer-marketing-services-for" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">100+ industries</Link>.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="https://www.thenycmarketingcompany.com/contact"
                  className="inline-block px-10 py-5 text-lg font-bold text-slate-900 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta"
                >
                  Schedule a Free Strategy Session
                </Link>
                <a
                  href="tel:+12122029220"
                  className="inline-block px-10 py-5 text-lg font-bold text-white rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors font-cta"
                >
                  Call (212) 202-9220
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
