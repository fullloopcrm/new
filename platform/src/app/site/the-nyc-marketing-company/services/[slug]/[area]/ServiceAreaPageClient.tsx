// @ts-nocheck
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

/* ── Types ───────────────────────────────────────────────────── */
interface Service { name: string; slug: string; tagline: string; shortDesc: string; description: string; icon: string; features: string[] }
interface SubService { name: string; slug: string; shortDesc: string }
interface Area { name: string; slug: string; region: string; type: string }
interface FAQ { question: string; answer: string }

/* ── Inner link helper ───────────────────────────────────────── */
const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

/* ── Top industries ──────────────────────────────────────────── */
const topIndustries = [
  { name: "Plumbers", slug: "plumber-marketing" },
  { name: "Dentists", slug: "dental-practice-marketing" },
  { name: "Restaurants", slug: "restaurant-food-service-marketing" },
  { name: "HVAC Companies", slug: "hvac-company-marketing" },
  { name: "Law Firms", slug: "law-firm-marketing" },
  { name: "Contractors", slug: "contractor-marketing" },
  { name: "Landscapers", slug: "landscaping-company-marketing" },
  { name: "Real Estate", slug: "real-estate-agent-marketing" },
];

export default function ServiceAreaPageClient({
  service,
  area,
  regionLabel,
  pageFaqs,
  siblingAreas,
  otherServices,
  subServices,
}: {
  service: Service;
  area: Area;
  regionLabel: string;
  pageFaqs: FAQ[];
  siblingAreas: Area[];
  otherServices: Service[];
  subServices: SubService[];
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            {/* Breadcrumb */}
            <div className="flex items-center justify-center gap-2 text-xs text-white/40 mb-6 font-cta">
              <Link href="/nyc-marketing-company-services-list" className="hover:text-white/60">Services</Link>
              <span>/</span>
              <Link href={`/services/${service.slug}`} className="hover:text-white/60">{service.name}</Link>
              <span>/</span>
              <Link href={`/services-areas-we-offer-marketing-services-in/${area.slug}`} className="hover:text-white/60">{area.name}</Link>
            </div>

            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-[0.2em] uppercase text-teal-300 bg-teal-900/40 rounded-full mb-6 font-cta">
              {service.name} &middot; {area.region === area.name ? area.name : `${area.name}, ${area.region}`}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 font-heading leading-tight">
              {service.name} in{" "}
              <span className="text-teal-400">{area.name}</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto mb-4">
              {service.description} Tailored specifically for businesses in {area.name}{area.region !== area.name ? ` and the ${area.region} market` : ""}.
            </p>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-8">
              <L href="/nyc-marketing-pricing-guide">$950/month SEO</L> &middot; <L href="/nyc-marketing-pricing-guide">$4,600 custom websites</L> &middot; No contracts &middot; 25+ years experience
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Get {service.name} in {area.name}
              </Link>
              <Link
                href={`/services/${service.slug}`}
                className="inline-block px-8 py-4 text-base font-bold text-white/80 rounded-lg border border-white/20 hover:bg-white/5 transition-colors font-cta"
              >
                Learn About {service.name}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<><strong>Local SEO isn&apos;t one-size-fits-all.</strong> What works in one neighborhood doesn&apos;t always work in the next. We build strategies <strong>block by block</strong> because that&apos;s how New York works.</>}
      />

      {/* ── DEEP DIVE CONTENT ────────────────────────────────── */}
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
                {service.name} for {area.name}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6 font-heading">
                Why {area.name} Businesses Need{" "}
                <span className="text-teal-600">{service.name}</span>
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  {area.name} is a competitive market. Whether you&apos;re a <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist</L>, <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurant</L>, or <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">law firm</L> — your customers in {area.name} are searching online before they pick up the phone. If your business doesn&apos;t show up first, your competitor gets the call. {service.name} is how you make sure that doesn&apos;t happen.
                </p>
                <p>
                  Our <L href="/nyc-marketing-company-services-list">{service.name} strategies</L> are built from the ground up for {area.name}. We research what people in this {area.type.toLowerCase()} actually search for, analyze your local competitors, and build a plan that targets the exact keywords and search patterns unique to the {regionLabel} market. No generic templates. No one-size-fits-all approaches.
                </p>
                <p>
                  The {area.name} market has nuances that generic agencies miss. Search behavior here is different from <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L> and different from <L href="/services-areas-we-offer-marketing-services-in/long-island-marketing-company">Long Island</L>. Customer expectations, competition density, and buying patterns all vary by neighborhood. We account for every one of these factors in your <L href="/nyc-marketing-pricing-guide">$950/month strategy</L>.
                </p>
                <p>
                  {service.name} doesn&apos;t work in isolation. It connects to your <L href="/nyc-marketing-company-services-list">website</L>, your <L href="/nyc-marketing-company-services-list">Google Business Profile</L>, your <L href="/nyc-marketing-company-services-list">brand identity</L>, and your <L href="/artificial-intelligence-marketing-services-offered">automation systems</L>. When all of these work together, the compounding effect on leads and revenue is massive. That&apos;s the <L href="/about-digital-marketing-agency-consortium-nyc">Consortium NYC (Now The NYC Marketing Company) difference</L> — integrated systems, not disconnected tactics. See our <L href="/nyc-marketing-company-portfolio">real results</L>.
                </p>
              </div>
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="inline-block mt-8 px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta"
              >
                Get Started in {area.name}
              </Link>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:w-[380px] w-full lg:sticky lg:top-32 space-y-4"
            >
              {/* Pricing card */}
              <div className="rounded-xl bg-slate-900 p-6">
                <h3 className="text-sm font-bold text-white mb-4 font-heading">
                  {service.name} Pricing
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
                <div className="grid grid-cols-3 gap-1 items-center py-3 border-t border-white/10 mb-4">
                  <span className="text-white/60 text-sm">Custom Website</span>
                  <span className="text-white font-bold font-mono text-right">$4,600+</span>
                  <span className="text-white/40 font-mono text-right line-through text-sm">$12,000+</span>
                </div>
                <Link
                  href="https://www.thenycmarketingcompany.com/nyc-marketing-pricing-guide"
                  className="block text-center text-teal-400 text-xs font-bold font-cta hover:underline"
                >
                  See Full Pricing Guide &rarr;
                </Link>
              </div>

              {/* Features checklist */}
              <div className="rounded-xl bg-white border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 font-heading">
                  What&apos;s Included
                </h3>
                <div className="space-y-2">
                  {service.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <span className="text-teal-500 mt-0.5 shrink-0">&#10003;</span>
                      <span className="text-slate-600 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SUB-SERVICES ─────────────────────────────────────── */}
      {subServices.length > 0 && (
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
                {service.name} Services Available in{" "}
                <span className="text-teal-600">{area.name}</span>
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subServices.map((sub, i) => (
                <motion.div
                  key={sub.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link
                    href={`/services/${sub.slug}`}
                    className="block rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all p-5 group h-full"
                  >
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors font-heading mb-2">
                      {sub.name}
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      {sub.shortDesc}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── INDUSTRIES IN {AREA} ─────────────────────────────── */}
      <section className={`py-20 sm:py-28 ${subServices.length > 0 ? "bg-white" : "bg-slate-50"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              {service.name} for <L href="/industries-we-offer-marketing-services-for">Every Industry</L> in{" "}
              <span className="text-teal-600">{area.name}</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We&apos;ve delivered {service.name.toLowerCase()} for <L href="/industries-we-offer-marketing-services-for">100+ industries</L> across <L href="/services-areas-we-offer-marketing-services-in">80+ neighborhoods</L>. Here are some of the businesses we serve in {area.name}.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    {service.name} in {area.name} &rarr;
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OTHER SERVICES + NEARBY AREAS ────────────────────── */}
      <section className="py-20 sm:py-28 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Other services in this area */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-xl font-bold text-white mb-6 font-heading">
                Other Services in {area.name}
              </h3>
              <div className="space-y-3">
                {otherServices.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/services/${s.slug}/${area.slug}`}
                    className="block rounded-lg border border-white/10 hover:border-teal-400/40 p-4 transition-all group"
                  >
                    <p className="text-white font-semibold text-sm group-hover:text-teal-400 transition-colors font-heading">
                      {s.name} in {area.name}
                    </p>
                    <p className="text-white/40 text-xs mt-1">{s.shortDesc}</p>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* This service in nearby areas */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h3 className="text-xl font-bold text-white mb-6 font-heading">
                {service.name} in Nearby {area.region} Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {siblingAreas.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/services/${service.slug}/${a.slug}`}
                    className="inline-block text-[11px] font-medium px-3 py-1.5 rounded-full bg-white/5 text-white/70 border border-white/10 hover:bg-teal-900/40 hover:text-teal-300 hover:border-teal-400/40 transition-all font-cta"
                  >
                    {a.name}
                  </Link>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/services-areas-we-offer-marketing-services-in" className="text-teal-400 text-sm font-bold font-cta hover:underline">
                  See All 80+ Service Areas &rarr;
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

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
              {service.name} in {area.name}{" "}
              <span className="text-teal-600">FAQ</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Common questions about {service.name.toLowerCase()} for {area.name} businesses. More at our <L href="/nyc-marketing-company-faqs">100 FAQ page</L>.
            </p>
          </motion.div>

          <div className="space-y-3">
            {pageFaqs.map((faq, i) => {
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
                  { label: `More About ${area.name}`, href: `/services-areas-we-offer-marketing-services-in/${area.slug}` },
                  { label: "100+ Industries", href: "/industries-we-offer-marketing-services-for" },
                  { label: "80+ Service Areas", href: "/services-areas-we-offer-marketing-services-in" },
                  { label: "About Consortium NYC (Now The NYC Marketing Company)", href: "/about-digital-marketing-agency-consortium-nyc" },
                  { label: "Contact Us", href: "/contact-nyc-marketing-company-consortium-nyc" },
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
              Ready for {service.name} in {area.name}?{" "}
              <span className="text-teal-600">Let&apos;s Talk.</span>
            </h2>
            <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto">
              Free strategy session. We&apos;ll audit your {area.name} competition, identify the keywords you should own, and build a {service.name.toLowerCase()} roadmap — whether you hire us or not.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
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