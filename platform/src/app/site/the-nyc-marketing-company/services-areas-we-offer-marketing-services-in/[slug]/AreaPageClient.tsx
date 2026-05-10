// @ts-nocheck
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

/* ── Types ───────────────────────────────────────────────────── */
interface Area { name: string; slug: string; region: string; type: string }
interface FAQ { question: string; answer: string }
interface SubService { name: string; slug: string; shortDesc: string }
interface ServiceCategory { name: string; slug: string; tagline: string; shortDesc: string; description: string; icon: string; features: string[]; subServices: SubService[] }

/* ── Inner link helper ───────────────────────────────────────── */
const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

/* ── Top industries for cross-linking ────────────────────────── */
const topIndustries = [
  { name: "Plumbers", slug: "plumber-marketing" },
  { name: "Dentists", slug: "dental-practice-marketing" },
  { name: "Restaurants", slug: "restaurant-food-service-marketing" },
  { name: "HVAC Companies", slug: "hvac-company-marketing" },
  { name: "Law Firms", slug: "law-firm-marketing" },
  { name: "Contractors", slug: "contractor-marketing" },
  { name: "Landscapers", slug: "landscaping-company-marketing" },
  { name: "Real Estate Agents", slug: "real-estate-agent-marketing" },
  { name: "Electricians", slug: "electrician-marketing" },
  { name: "Roofing Companies", slug: "roofing-company-marketing" },
  { name: "Auto Repair Shops", slug: "auto-repair-shop-marketing" },
  { name: "Medical Practices", slug: "medical-practice-marketing" },
];

/* ── Guarantees ──────────────────────────────────────────────── */
const guarantees = [
  { num: "01", title: "No Contracts", desc: "Month-to-month. We earn your business every single month." },
  { num: "02", title: "Transparent Pricing", desc: "No hidden fees. $950/month SEO. $4,600 websites. Published publicly." },
  { num: "03", title: "Senior Strategists Only", desc: "25+ years experience. No junior account managers. No outsourcing." },
  { num: "04", title: "Real Results or We Fix It", desc: "Monthly reporting with real numbers. If it's not working, we pivot fast." },
];

export default function AreaPageClient({
  area,
  siblings,
  areaFaqs,
  serviceCategories,
}: {
  area: Area;
  siblings: Area[];
  areaFaqs: FAQ[];
  serviceCategories: ServiceCategory[];
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const regionLabel = area.region === area.name ? area.name : area.region;

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-400/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-[0.2em] uppercase text-teal-300 bg-teal-900/40 rounded-full mb-6 font-cta">
              {area.region === area.name ? area.type : `${area.type} · ${area.region}`}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 font-heading leading-tight">
              {area.name}{" "}
              <span className="text-teal-400">Marketing Company</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto mb-4">
              Local <L href="/nyc-marketing-company-services-list">SEO</L>, <L href="/nyc-marketing-company-services-list">web design</L>, <L href="/nyc-marketing-company-services-list">branding</L>, and <L href="/artificial-intelligence-marketing-services-offered">AI automation</L> for businesses in {area.name}. We know this market. We know the competition. We know how to get you to page one.
            </p>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-8">
              <L href="/nyc-marketing-pricing-guide">$950/month SEO</L> &middot; <L href="/nyc-marketing-pricing-guide">$4,600 custom websites</L> &middot; No contracts &middot; <L href="/nyc-marketing-company-portfolio">$15.2M+ revenue generated</L>
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-white/40 font-cta mb-8">
              <span>25+ Years Experience</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>100+ Industries</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>80+ Neighborhoods</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>No Contracts</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Get a Free {area.name} Strategy Session
              </Link>
              <Link
                href="/nyc-marketing-pricing-guide"
                className="inline-block px-8 py-4 text-base font-bold text-white/80 rounded-lg border border-white/20 hover:bg-white/5 transition-colors font-cta"
              >
                See Pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<>Every borough has its own personality, its own search patterns, and its own competition. We don&apos;t just &ldquo;target NYC&rdquo; — we target <strong>your neighborhood</strong>, your blocks, <strong>your customers</strong>.</>}
      />

      {/* ── WHY {AREA} BUSINESSES NEED LOCAL SEO ─────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex-1"
            >
              <span className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-3 block font-cta">
                Local Marketing in {area.name}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6 font-heading">
                Why {area.name} Businesses Need{" "}
                <span className="text-teal-600">Hyper-Local Marketing</span>
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  When someone in {area.name} searches for a <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist</L>, <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurant</L>, or <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">lawyer</L> — they&apos;re not browsing. They&apos;re ready to buy. The business that shows up first gets the call. If that&apos;s not you, it&apos;s your competitor down the block.
                </p>
                <p>
                  {area.name} has its own competitive landscape, its own search patterns, and its own customer behavior. A generic &ldquo;NYC marketing&rdquo; strategy doesn&apos;t cut it here. You need keyword research specific to {area.name}, content that references the neighborhoods your customers actually live in, and a <L href="/nyc-marketing-company-services-list">Google Business Profile</L> optimized for this exact market.
                </p>
                <p>
                  That&apos;s what we build. Our <L href="/nyc-marketing-pricing-guide">$950/month SEO</L> includes {area.name}-specific keyword targeting, local citation building, review management, and content that positions you as THE go-to business in {area.name}. Combined with a <L href="/nyc-marketing-company-services-list">custom website</L> engineered for conversion, you get a marketing system that turns local searches into revenue.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-block mt-8 px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta"
              >
                Get Started in {area.name}
              </Link>
            </motion.div>

            {/* Pricing sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:w-[380px] w-full lg:sticky lg:top-32"
            >
              <div className="rounded-xl bg-slate-900 p-6">
                <h3 className="text-sm font-bold text-white mb-4 font-heading">
                  {area.name} Marketing Pricing
                </h3>
                <div className="grid grid-cols-3 gap-1 text-xs mb-1">
                  <span className="text-white/40"></span>
                  <span className="text-white/40 text-right font-cta">Ours</span>
                  <span className="text-white/40 text-right font-cta">NYC Avg</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center py-3 border-t border-white/10">
                  <span className="text-white/60 text-sm">Monthly SEO</span>
                  <span className="text-white font-bold font-mono text-right">$950/mo</span>
                  <span className="text-white/40 font-mono text-right line-through text-sm">$2,500/mo</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center py-3 border-t border-white/10">
                  <span className="text-white/60 text-sm">Custom Website</span>
                  <span className="text-white font-bold font-mono text-right">$4,600+</span>
                  <span className="text-white/40 font-mono text-right line-through text-sm">$12,000+</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center py-3 border-t border-white/10 mb-4">
                  <span className="text-white/60 text-sm">GBP Setup</span>
                  <span className="text-white font-bold font-mono text-right">Included</span>
                  <span className="text-white/40 font-mono text-right line-through text-sm">$500+</span>
                </div>
                <Link
                  href="/nyc-marketing-pricing-guide"
                  className="block text-center text-teal-400 text-xs font-bold font-cta hover:underline"
                >
                  See Full Pricing Guide &rarr;
                </Link>
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 text-center">
                  <p className="text-2xl font-extrabold text-teal-600 font-mono">25+</p>
                  <p className="text-slate-600 text-[10px] font-cta mt-1">Years Experience</p>
                </div>
                <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 text-center">
                  <p className="text-2xl font-extrabold text-teal-600 font-mono">$15M+</p>
                  <p className="text-slate-600 text-[10px] font-cta mt-1">Revenue Generated</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SERVICES AVAILABLE IN {AREA} ────────────────────── */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Services in {area.name}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Everything Your {area.name} Business Needs to{" "}
              <span className="text-teal-600">Dominate Online</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Six core <L href="/nyc-marketing-company-services-list">marketing services</L> — each tailored to the {area.name} market. Every service amplifies the others.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.slice(0, 6).map((svc, i) => (
              <motion.div
                key={svc.slug}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  href={`/services/${svc.slug}`}
                  className="block h-full rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-400 transition-all p-6 group"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors mb-2 font-heading">
                    {svc.name}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {svc.shortDesc} Tailored for {area.name} businesses and the {regionLabel} market.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {svc.features.slice(0, 4).map((f) => (
                      <span key={f} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-cta">
                        {f}
                      </span>
                    ))}
                  </div>
                  <span className="text-teal-600 text-sm font-semibold group-hover:underline font-cta">
                    Learn More &rarr;
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES WE SERVE IN {AREA} ───────────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Industries in {area.name}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Marketing for <L href="/industries-we-offer-marketing-services-for">100+ Industries</L> in{" "}
              <span className="text-teal-600">{area.name}</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbers</L> to <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">law firms</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L> to <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L> — we&apos;ve driven results for every type of business in the {regionLabel} market.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {topIndustries.map((ind, i) => (
              <motion.div
                key={ind.slug}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: (i % 8) * 0.04 }}
              >
                <Link
                  href={`/industries-we-offer-marketing-services-for/${ind.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-sm transition-all p-4 group"
                >
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors font-heading">
                    {ind.name}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-1 font-cta">
                    in {area.name} &rarr;
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/industries-we-offer-marketing-services-for"
              className="text-teal-600 text-sm font-bold font-cta hover:underline"
            >
              See All 100+ Industries &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── GUARANTEES ───────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Our Guarantees to {area.name} Businesses
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {guarantees.map((g, i) => (
              <motion.div
                key={g.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl bg-white border border-slate-200 p-6"
              >
                <span className="text-4xl font-extrabold text-teal-100 font-mono block mb-3">{g.num}</span>
                <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">{g.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{g.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEARBY AREAS ─────────────────────────────────────── */}
      {siblings.length > 0 && (
        <section className="py-20 sm:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
                Also Serving Nearby{" "}
                <span className="text-teal-600">{area.region}</span> Areas
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                We build hyper-local strategies for every neighborhood. Each area gets its own keyword research, competitor analysis, and <L href="/nyc-marketing-company-services-list">SEO plan</L>.
              </p>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-2">
              {siblings.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services-areas-we-offer-marketing-services-in/${s.slug}`}
                  className="inline-block text-[11px] font-medium px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 hover:border-teal-400 transition-all font-cta"
                >
                  {s.name}
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link
                href="/services-areas-we-offer-marketing-services-in"
                className="text-teal-600 text-sm font-bold font-cta hover:underline"
              >
                See All 80+ Service Areas &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              {area.name} Marketing{" "}
              <span className="text-teal-600">FAQ</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Common questions about marketing services for {area.name} businesses. More answers at our <L href="/nyc-marketing-company-faqs">full FAQ page (100 questions)</L>.
            </p>
          </motion.div>

          <div className="space-y-3">
            {areaFaqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-slate-900 font-semibold text-sm pr-4 font-heading">{faq.question}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-teal-600 text-xl flex-shrink-0"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-5 pb-4">
                          <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CROSS-LINKS ─────────────────────────────────────── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 font-heading">Services</h3>
              <div className="space-y-2">
                {[
                  { label: "SEO Services", href: "/services/search-engine-optimization-seo-nyc" },
                  { label: "Web Design", href: "/services/web-design-nyc" },
                  { label: "Brand Strategy", href: "/services/brand-strategy-identity-in-nyc" },
                  { label: "AI Automation", href: "/services/analytics-technology-in-nyc" },
                  { label: "All Services", href: "/nyc-marketing-company-services-list" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4 font-heading">Resources</h3>
              <div className="space-y-2">
                {[
                  { label: "Transparent Pricing", href: "/nyc-marketing-pricing-guide" },
                  { label: "Portfolio & Results", href: "/nyc-marketing-company-portfolio" },
                  { label: "100 FAQs Answered", href: "/nyc-marketing-company-faqs" },
                  { label: "Marketing 101 Guide", href: "/nyc-marketing-101-guide" },
                  { label: "What's Working Now", href: "/whats-working-in-marketing" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4 font-heading">Explore</h3>
              <div className="space-y-2">
                {[
                  { label: "100+ Industries", href: "/industries-we-offer-marketing-services-for" },
                  { label: "80+ Service Areas", href: "/services-areas-we-offer-marketing-services-in" },
                  { label: "About The NYC Marketing Company", href: "/about" },
                  { label: "Free SEO Audit", href: "/the-free-human+ai-seo-marketing-review" },
                  { label: "Contact Us", href: "/contact" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Ready to Dominate {area.name}?{" "}
              <span className="text-teal-600">Let&apos;s Talk.</span>
            </h2>
            <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto">
              Free strategy session. We&apos;ll audit your {area.name} competition, identify the keywords you should own, and build a roadmap — whether you hire us or not.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Get My Free {area.name} Strategy
              </Link>
              <a
                href="tel:+12122029220"
                className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
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
