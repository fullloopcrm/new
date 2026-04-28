"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { areas } from "@/lib/siteData";

const TriStateMap = dynamic(() => import("@/app/areas/TriStateMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] sm:h-[500px] rounded-2xl bg-[#FAF9F5] animate-pulse flex items-center justify-center">
      <span className="text-[#6F6F6B] text-sm font-cta">Loading map...</span>
    </div>
  ),
});

const regions = [
  { name: "Manhattan", filter: "Manhattan" },
  { name: "Brooklyn", filter: "Brooklyn" },
  { name: "Queens", filter: "Queens" },
  { name: "The Bronx", filter: "Bronx" },
  { name: "Staten Island", filter: "Staten Island" },
  { name: "Long Island", filter: "Long Island" },
  { name: "Westchester", filter: "Westchester" },
  { name: "New Jersey", filter: "New Jersey" },
];

export default function AreasServed() {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Company Service Areas
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Local Marketing Across{" "}
            <span className="text-[#1F4D2C]">80+ Neighborhoods &amp; Cities</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-3xl mx-auto">
            Hyper-local marketing strategies for businesses in every neighborhood across NYC, Long Island, Westchester, and Northern New Jersey. Every location gets its own keyword strategy, competitor analysis, and <Link href="/nyc-marketing-company-services-list" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">local SEO plan</Link>. See our <Link href="/full-loop-crm-service-business-industries" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">100+ industries served</Link> or <Link href="/nyc-marketing-pricing-guide" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">transparent pricing</Link>.
          </p>
        </motion.div>

        {/* Interactive Map */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <TriStateMap
            activeRegion={activeRegion}
            onRegionHover={setActiveRegion}
            onRegionClick={(region) => {
              const el = document.getElementById(`home-region-${region}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            height="h-[420px] sm:h-[500px]"
          />
          <p className="text-center text-[#6F6F6B] text-xs mt-3 font-cta">
            Hover pins to see areas &middot; Click a region to jump below
          </p>
        </motion.div>

        {/* Region Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {regions.map((region, i) => {
            const regionAreas = areas.filter((a) => a.region === region.filter);
            const isActive = activeRegion === region.filter;
            return (
              <motion.div
                key={region.name}
                id={`home-region-${region.filter}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
                onMouseEnter={() => setActiveRegion(region.filter)}
                onMouseLeave={() => setActiveRegion(null)}
                className={`rounded-xl bg-white border shadow-sm hover:shadow-md p-5 transition-all ${
                  isActive ? "border-[#1F4D2C] shadow-md" : "border-slate-200 hover:border-[#1F4D2C]"
                }`}
              >
                <h3 className="text-sm font-bold text-slate-900 font-heading mb-3">
                  {region.name}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {regionAreas.map((area) => (
                    <Link
                      key={area.slug}
                      href={`/areas/${area.slug}`}
                      className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F4F4F1] text-[#1F4D2C] border border-teal-200 hover:bg-teal-100 hover:border-[#1F4D2C] transition-all font-cta"
                    >
                      {area.name}
                    </Link>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-[#3A3A3A] text-lg mb-6">
            Every neighborhood is a market. Every market has keywords your competitors aren&apos;t targeting. We find them and we own them.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/areas"
              className="inline-block px-8 py-4 text-base font-bold text-[#1F4D2C] rounded-lg bg-white border-2 border-[#1F4D2C] hover:bg-[#F4F4F1] transition-colors shadow-lg font-cta"
            >
              See All Service Areas
            </Link>
            <Link
              href="/contact-nyc-marketing-company-consortium-nyc"
              className="inline-block px-8 py-4 text-base font-bold text-[#1C1C1C] rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
            >
              I&apos;m Ready to Talk
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
