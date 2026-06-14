// @ts-nocheck
"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { industries } from "@/app/site/the-nyc-marketing-company/_lib/siteData";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";
import { BrandLink } from "@/app/site/the-nyc-marketing-company/_lib/brand";

/* ── Animated counter ────────────────────────────────────────── */
function CountUp({ value, prefix, suffix, inView }: { value: number; prefix?: string; suffix?: string; inView: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    value % 1 !== 0 ? v.toFixed(1) : Math.round(v).toLocaleString()
  );
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [inView, value, count, rounded]);

  return <span>{prefix}{display}{suffix}</span>;
}

/* ── Industry groups ─────────────────────────────────────────── */
const groupDefs: { label: string; badges: string[] }[] = [
  {
    label: "Home Services & Contractors",
    badges: ["Home Services", "HVAC", "Roofing", "Plumbers", "Electricians", "Solar", "Contractors", "Kitchen Remodel", "Bathroom Remodel", "Pool Builders", "Garage Doors", "Water Damage", "Mold Removal", "Foundation Repair", "Pest Control", "Fencing", "Paving", "Tree Service", "Painters", "Flooring", "Windows & Doors", "Junk Removal", "Pressure Washing", "Landscaping", "Cleaning", "Dumpster Rental", "Appliance Repair", "Locksmiths", "Home Inspection", "Construction"],
  },
  {
    label: "Legal",
    badges: ["Personal Injury", "Criminal Defense", "Family Law", "Immigration Law", "Bankruptcy Law", "Estate Planning", "Workers Comp", "Bail Bonds"],
  },
  {
    label: "Medical & Healthcare",
    badges: ["Plastic Surgery", "Dentists", "Medical", "Orthopedics", "Dermatology", "Fertility", "Urgent Care", "Eye Care", "Veterinary", "Chiropractic", "Physical Therapy", "Cosmetic Dentistry", "Orthodontics", "Senior Care", "Weight Loss", "Mental Health", "Dental Labs", "Med Devices"],
  },
  {
    label: "Real Estate & Finance",
    badges: ["Real Estate", "Financial Advisors", "Insurance", "Property Mgmt", "Mortgage", "Title Companies", "Commercial RE", "Accountants", "FinTech"],
  },
  {
    label: "Automotive",
    badges: ["Auto Dealers", "Auto Body", "Auto Repair", "Towing"],
  },
  {
    label: "Food & Hospitality",
    badges: ["Restaurants", "Catering", "Hotels", "Wedding Venues", "Event Venues"],
  },
  {
    label: "Retail & E-Commerce",
    badges: ["E-Commerce", "Jewelry", "Furniture", "Luxury", "Fashion", "Cannabis", "Supplements"],
  },
  {
    label: "Technology & SaaS",
    badges: ["SaaS", "IT / MSP", "Cybersecurity"],
  },
  {
    label: "Professional Services",
    badges: ["Staffing", "Movers", "Architecture", "Interior Design", "Printing", "Signs", "Security", "Trucking", "Courier", "Storage"],
  },
  {
    label: "Education & Family",
    badges: ["Private Schools", "Childcare", "Tutoring"],
  },
  {
    label: "Health & Wellness",
    badges: ["Salons & Spas", "Fitness", "Martial Arts"],
  },
  {
    label: "Other Industries",
    badges: ["Rehab Centers", "Funeral Homes", "Manufacturing", "Wholesale"],
  },
];

function groupIndustries() {
  const assigned = new Set<string>();
  const groups: { label: string; items: typeof industries }[] = [];

  for (const def of groupDefs) {
    const badgeSet = new Set(def.badges);
    const items = industries.filter((ind) => {
      if (badgeSet.has(ind.badge) && !assigned.has(ind.slug)) {
        assigned.add(ind.slug);
        return true;
      }
      return false;
    });
    if (items.length > 0) {
      groups.push({ label: def.label, items });
    }
  }

  // Catch anything ungrouped
  const remaining = industries.filter((ind) => !assigned.has(ind.slug));
  if (remaining.length > 0) {
    const other = groups.find((g) => g.label === "Other Industries");
    if (other) {
      other.items.push(...remaining);
    } else {
      groups.push({ label: "Other Industries", items: remaining });
    }
  }

  return groups;
}

/* ── Stats ────────────────────────────────────────────────────── */
const stats = [
  { prefix: "", value: 105, suffix: "+", label: "Industries Served" },
  { prefix: "", value: 25, suffix: "+", label: "Years Experience" },
  { prefix: "$", value: 15, suffix: "M+", label: "Revenue Generated" },
  { prefix: "", value: 10, suffix: "K+", label: "Page 1 Rankings" },
];

/* ── Featured top industries ─────────────────────────────────── */
const featuredSlugs = [
  "home-service-business-marketing",
  "personal-injury-law-firm-marketing",
  "dental-practice-marketing",
  "plastic-surgery-med-spa-marketing",
  "hvac-company-marketing",
  "roofing-company-marketing",
  "real-estate-agent-marketing",
  "plumber-marketing",
  "restaurant-food-service-marketing",
  "ecommerce-business-marketing",
  "electrician-marketing",
  "contractor-marketing",
];

/* ══════════════════════════════════════════════════════════════ */
export default function IndustriesListClient() {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });
  const groups = groupIndustries();
  const featured = featuredSlugs.map((slug) => industries.find((i) => i.slug === slug)!).filter(Boolean);

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
            Industries We Serve
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 font-heading leading-[1.1]"
          >
            Marketing for{" "}
            <span className="text-teal-400">105+ Industries</span>{" "}
            Across NYC
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed mb-4"
          >
            From <Link href="/industries-we-offer-marketing-services-for/plumber-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">plumbers</Link> and <Link href="/industries-we-offer-marketing-services-for/dental-practice-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">dentists</Link> to <Link href="/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">law firms</Link> and <Link href="/industries-we-offer-marketing-services-for/ecommerce-business-marketing" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">e-commerce</Link> — if people search for it, we dominate it. Every industry page includes a custom strategy breakdown, keyword opportunities, and what to realistically expect.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-300 text-sm mb-10 max-w-2xl mx-auto"
          >
            25+ years of experience across every vertical. See our <Link href="/nyc-marketing-company-services-list" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">full service list</Link>, <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">transparent pricing</Link>, or <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">real results</Link>.
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
              Tell Us Your Industry
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
            {["105+ Industries", "25+ Years", "No Contracts", "Transparent Pricing"].map((badge) => (
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
        tip={<>A dentist and a plumber both need SEO, but <strong>the strategy is completely different</strong>. The keywords, the competition, the customer intent — it all changes by industry. That&apos;s why <strong>we don&apos;t use templates</strong>.</>}
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
                <div className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-1 font-mono ${stat.prefix === "$" ? "text-yellow-300" : "text-white"}`}>
                  <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} inView={statsInView} />
                </div>
                <div className="text-white/80 text-sm font-medium font-cta">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED INDUSTRIES (top 12) ─────────────────────── */}
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
              Most Requested
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
              Top Industries We{" "}
              <span className="text-teal-600">Dominate</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              These are the industries where we&apos;ve generated the most revenue, rankings, and leads for our clients. Each one links to a full strategy breakdown.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {featured.map((ind, i) => (
              <motion.div
                key={ind.slug}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
              >
                <Link
                  href={`/industries-we-offer-marketing-services-for/${ind.slug}`}
                  className="group block rounded-2xl bg-white border border-slate-200 hover:border-teal-400 p-6 h-full transition-all hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-teal-600 font-cta">
                      {ind.badge}
                    </span>
                    <span className="text-teal-600 group-hover:translate-x-1 transition-transform">
                      &rarr;
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-2 font-heading group-hover:text-teal-600 transition-colors">
                    {ind.name}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                    {ind.desc}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GROUPED NAVIGATION JUMP LINKS ────────────────────── */}
      <section className="py-6 bg-slate-50 border-y border-slate-100 sticky top-[72px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {groups.map((group) => (
              <a
                key={group.label}
                href={`#${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-full border border-slate-200 hover:border-teal-300 transition-all font-cta"
              >
                {group.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL INDUSTRIES GROUPED ───────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              All 105+ Industries
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Find Your Industry
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Don&apos;t see yours? We&apos;ve probably done it. Our data-driven approach works across verticals because we build custom strategies from your actual market data.
            </p>
          </motion.div>

          <div className="space-y-16">
            {groups.map((group) => (
              <div key={group.label} id={group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-4 mb-6"
                >
                  <h3 className="text-xl font-extrabold text-slate-900 font-heading shrink-0">
                    {group.label}
                  </h3>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs font-bold text-slate-400 font-mono shrink-0">
                    {group.items.length}
                  </span>
                </motion.div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {group.items.map((ind, i) => (
                    <motion.div
                      key={ind.slug}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: (i % 10) * 0.03 }}
                    >
                      <Link
                        href={`/industries-we-offer-marketing-services-for/${ind.slug}`}
                        className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-4 h-full transition-all hover:shadow-md"
                      >
                        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-teal-600 font-cta">
                          {ind.badge}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors mt-1 mb-1.5 font-heading leading-snug">
                          {ind.name}
                        </h4>
                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                          {ind.desc}
                        </p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US FOR YOUR INDUSTRY ─────────────────────────── */}
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
              Why <BrandLink />
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Why We Work Across{" "}
              <span className="text-teal-600">Every Industry</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Marketing isn&apos;t about knowing your industry better than you do. It&apos;s about knowing how people search, what makes them click, and what makes them convert. That&apos;s universal.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "Data, Not Guesswork",
                desc: "We don't guess what keywords work for your industry — we research them. Competitor analysis, search volume data, and conversion patterns specific to your market.",
              },
              {
                num: "02",
                title: "25 Years of Patterns",
                desc: "After 10,000+ businesses, we've seen what works across every vertical. The strategies that rank plumbers also rank dentists — with industry-specific tweaks.",
              },
              {
                num: "03",
                title: "Custom Strategy Every Time",
                desc: "No recycled templates. Every industry engagement starts with a fresh competitive analysis, keyword universe research, and custom roadmap for your specific market.",
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
              <h3 className="text-white text-xl font-bold mb-6 font-heading">Every Industry Gets</h3>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  "Custom SEO strategy & keyword research",
                  "Conversion-optimized website design",
                  "Google Business Profile optimization",
                  "Content marketing & blogging",
                  "Local SEO for your service area",
                  "Monthly reporting with real metrics",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-teal-400 shrink-0">&#x2713;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold mb-6 font-heading">Add-On Services</h3>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  { text: "AI Automation & Text Bots", href: "/services/ai-automation-services-in-nyc" },
                  { text: "Programmatic SEO at Scale", href: "/services/programmatic-seo-services-in-nyc" },
                  { text: "Custom CRM Development", href: "/services/custom-crm-development-in-nyc" },
                  { text: "Micro Site EMD Strategy", href: "/services/micro-site-emd-strategy-in-nyc" },
                  { text: "Branding & Identity", href: "/services/branding-identity-services-nyc" },
                  { text: "Outsourced Marketing Manager", href: "/services/marketing-manager-consulting-in-nyc" },
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
                Don&apos;t See Your Industry?
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
                We&apos;ve Probably Done It
              </h2>
              <p className="text-white/60 text-base mb-10 max-w-2xl mx-auto">
                After 25 years and 10,000+ businesses, there isn&apos;t an industry we haven&apos;t touched. Tell us what you do and we&apos;ll show you exactly what&apos;s possible. Check our <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">pricing guide</Link>, see <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">real results</Link>, or explore our <Link href="/nyc-marketing-company-services-list" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">full service list</Link>.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="https://www.thenycmarketingcompany.com/contact"
                  className="inline-block px-10 py-5 text-lg font-bold text-slate-900 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta"
                >
                  Tell Us Your Industry
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