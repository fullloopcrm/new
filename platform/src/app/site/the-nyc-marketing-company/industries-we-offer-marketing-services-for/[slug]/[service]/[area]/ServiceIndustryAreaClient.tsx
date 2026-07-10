"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

interface Service { name: string; slug: string; tagline: string; shortDesc: string; description: string; icon: string; features: string[]; }
interface Industry { name: string; slug: string; badge: string; desc: string; }
interface Area { name: string; slug: string; region: string; type: string; }
interface SubService { name: string; slug: string; shortDesc: string; }

const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-teal-600 hover:text-teal-700 underline underline-offset-2 font-medium">{children}</Link>
);

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

const PHONE = "212.202.9220";
const PHONE_HREF = "tel:+12122029220";

export default function ServiceIndustryAreaClient({
  service, industry, area, regionLabel, h1, h1Label: label, pageFaqs, siblingAreas, otherServices, relatedIndustries, subServices,
}: {
  service: Service;
  industry: Industry;
  area: Area;
  regionLabel: string;
  h1: string;
  h1Label: string;
  pageFaqs: { question: string; answer: string }[];
  siblingAreas: Area[];
  otherServices: Service[];
  relatedIndustries: Industry[];
  subServices: SubService[];
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const sn = service.name.toLowerCase();
  const lb = label.toLowerCase();

  // URL helper for this 3-dimensional route
  const siaUrl = (indSlug: string, svcSlug: string, areaSlug: string) =>
    `/industries-we-offer-marketing-services-for/${indSlug}/${svcSlug}/${areaSlug}`;

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.12),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb trail */}
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/industries-we-offer-marketing-services-for" className="hover:text-white/70 transition-colors">Industries</Link>
            <span>/</span>
            <Link href={`/industries-we-offer-marketing-services-for/${industry.slug}`} className="hover:text-white/70 transition-colors">{industry.badge}</Link>
            <span>/</span>
            <Link href={`/services/${service.slug}`} className="hover:text-white/70 transition-colors">{service.name}</Link>
            <span>/</span>
            <span className="text-white/60">{area.name}</span>
          </nav>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.5 }}>
            <span className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold tracking-widest uppercase mb-6 font-cta">
              {industry.badge} + {service.name} + {area.name}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 font-heading">
              {h1}
            </h1>
            <p className="text-white/70 text-lg sm:text-xl max-w-3xl mb-4">
              Data-driven {sn} strategies built specifically for {lb} companies in {area.name}{area.region !== area.name ? `, ${regionLabel}` : ""}. We know your market, your competition, and exactly what it takes to rank.
            </p>
            <p className="text-white/50 text-sm mb-8">
              Local SEO from <span className="text-teal-400 font-bold">$950/mo</span> &middot; Custom websites from <span className="text-teal-400 font-bold">$4,600</span> &middot; No contracts &middot; <span className="text-teal-400 font-bold">$15.2M+</span> revenue generated
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link href="https://www.thenycmarketingcompany.com/contact" className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta">
                Get a Free {industry.badge} Marketing Strategy
              </Link>
              <Link href="https://www.thenycmarketingcompany.com/nyc-marketing-pricing-guide" className="inline-block px-8 py-4 text-base font-bold text-white/90 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors font-cta">
                View Pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<>This page exists because someone in your area is searching for <strong>exactly this service</strong> in exactly this industry. If your business isn&apos;t showing up here, <strong>your competitor is</strong>.</>}
      />

      {/* ── DEEP DIVE CONTENT ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_340px] gap-12">
            {/* Main content */}
            <div className="prose prose-slate max-w-none">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={fadeUp} transition={{ duration: 0.5 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading">
                  Why {label} Businesses in {area.name} Need Professional {service.name}
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  If you run a {lb} business in {area.name}, you already know the competition is fierce. Every day, potential customers in {area.name} and surrounding {regionLabel} areas are searching Google for exactly what you offer. The question is: are they finding you, or your competitors? <L href={`/services/${service.slug}`}>Professional {sn}</L> is the difference between being invisible and being the first call.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  At <L href="/">Consortium NYC (Now The NYC Marketing Company)</L>, we specialize in <L href={`/industries-we-offer-marketing-services-for/${industry.slug}`}>{lb} marketing</L> across the tri-state area. We&apos;ve spent 25+ years studying how local customers find and choose {lb} businesses in markets like {area.name}. Our <L href={`/services/${service.slug}/${area.slug}`}>{sn} strategies for {area.name}</L> are built on real competitive data — not guesswork.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  The {lb} market in {area.name} has unique characteristics that require a tailored approach. Search behavior varies by neighborhood, seasonal demand shifts differently across {regionLabel}, and the competitive landscape is constantly evolving. A generic {sn} strategy won&apos;t cut it. You need a partner who understands both the {lb} industry and the {area.name} market at a granular level.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  We build {sn} campaigns for {lb} businesses that target the exact terms your customers search: &ldquo;{lb} near {area.name},&rdquo; &ldquo;best {lb} in {area.name},&rdquo; and dozens of long-tail variations that drive high-intent traffic. Combined with <L href="/services/google-business-profile-management-in-nyc">Google Business Profile optimization</L>, <L href={`/services-areas-we-offer-marketing-services-in/${area.slug}`}>hyper-local content for {area.name}</L>, and technical SEO that search engines love, we create a compounding growth engine for your {lb} business.
                </p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading mt-12">
                  What Our {service.name} Includes for {label} Companies
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Every {sn} engagement for {lb} businesses in {area.name} includes a comprehensive strategy tailored to your specific goals, budget, and competitive landscape. We don&apos;t do cookie-cutter packages — we build custom campaigns based on competitive intelligence specific to {lb} businesses in the {regionLabel} market.
                </p>
                <ul className="space-y-3 mb-6">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                      <span className="text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Every strategy is backed by transparent <L href="/nyc-marketing-pricing-guide">pricing</L> and monthly reporting. You&apos;ll know exactly where your investment goes and what results it drives. No contracts means we earn your business every month. Explore our full <L href="/nyc-marketing-company-services-list">service offerings</L> or see how we approach <L href={`/services/${service.slug}`}>{sn}</L> across all our clients.
                </p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading mt-12">
                  The {area.name} Market for {label} Businesses
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {area.name} is one of the most dynamic markets in {regionLabel} for {lb} businesses. The local customer base is highly engaged, digitally savvy, and actively searching for services like yours. But that also means competition is intense — and the businesses that invest in professional {sn} are the ones capturing the lion&apos;s share of leads.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  We track search volume, competitor rankings, and market trends for {lb} businesses across every neighborhood we serve — from <L href={`/services-areas-we-offer-marketing-services-in/${area.slug}`}>{area.name}</L> to {siblingAreas.length > 0 && <><L href={`/services-areas-we-offer-marketing-services-in/${siblingAreas[0].slug}`}>{siblingAreas[0].name}</L>{siblingAreas.length > 1 && <> and <L href={`/services-areas-we-offer-marketing-services-in/${siblingAreas[1].slug}`}>{siblingAreas[1].name}</L></>}</>}. This granular data informs every decision we make, from keyword targeting to content strategy to link building.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Whether you&apos;re an established {lb} business looking to dominate local search in {area.name} or a new operation building visibility from scratch, we have the playbook. Read our <L href="/nyc-marketing-101-guide">Marketing 101 Guide</L> for foundational strategies, or check out our <L href="/nyc-marketing-company-faqs">FAQ page</L> for answers to the most common questions about {sn} for local businesses.
                </p>
              </motion.div>
            </div>

            {/* Sticky sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                {/* Pricing card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 font-cta">{industry.badge} {service.name} Pricing</h3>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-end justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500 text-sm">Monthly SEO</span>
                      <div className="text-right">
                        <span className="text-teal-600 text-xl font-extrabold font-mono">$950</span>
                        <span className="text-slate-400 text-xs">/mo</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500 text-sm">Custom Website</span>
                      <div className="text-right">
                        <span className="text-teal-600 text-xl font-extrabold font-mono">$4,600</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-slate-500 text-sm">Brand Identity</span>
                      <div className="text-right">
                        <span className="text-teal-600 text-xl font-extrabold font-mono">$2,400</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">NYC avg: <span className="line-through">$2,000-$5,000/mo</span> SEO &middot; <span className="line-through">$12K-$25K</span> websites</p>
                  <Link href="https://www.thenycmarketingcompany.com/contact" className="block w-full text-center px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta">
                    Get {industry.badge} Proposal
                  </Link>
                </div>

                {/* Features checklist */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 font-cta">What You Get</h3>
                  <ul className="space-y-2.5">
                    {["No contracts — cancel anytime", "25+ years of experience", "Senior strategists only", `${industry.badge}-specific strategy`, `${area.name} market intelligence`, "Monthly ROI reporting", "Direct phone & email access", "$15.2M+ revenue generated"].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-900 p-6 text-center">
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-2 font-cta">Call Now</p>
                  <a href={PHONE_HREF} className="text-white text-xl font-extrabold font-mono hover:text-teal-400 transition-colors">{PHONE}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUB-SERVICES GRID ── */}
      {subServices.length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mb-4">
                {service.name} Services for {label} Businesses
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto">
                Specialized {sn} capabilities we deploy for {lb} companies in {area.name}.
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {subServices.map((sub, i) => (
                <motion.div key={sub.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
                  <Link href={`/services/${sub.slug}`} className="group block rounded-2xl bg-white border border-slate-200 hover:border-teal-400 p-6 transition-all shadow-sm hover:shadow-md h-full">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors mb-2 font-heading">{sub.name}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{sub.shortDesc}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RELATED INDUSTRIES ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mb-4">
              {service.name} for Other Industries in {area.name}
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              We serve 100+ industries across {regionLabel}. Every strategy is built for the specific competitive landscape.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedIndustries.map((ri, i) => (
              <motion.div key={ri.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.35, delay: i * 0.04 }}>
                <Link href={siaUrl(ri.slug, service.slug, area.slug)} className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-4 transition-all shadow-sm hover:shadow-md">
                  <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-teal-600 font-cta">{ri.badge}</span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors mt-1 font-heading">
                    {service.name} for {ri.badge} in {area.name}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/industries-we-offer-marketing-services-for" className="text-teal-600 hover:text-teal-700 text-sm font-semibold underline underline-offset-2 font-cta">
              View All 100+ Industries We Serve
            </Link>
          </div>
        </div>
      </section>

      {/* ── DARK: OTHER SERVICES + NEARBY AREAS ── */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Other services for this industry in this area */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
              <h2 className="text-xl font-extrabold text-white mb-6 font-heading">
                Other Services for {industry.badge} in {area.name}
              </h2>
              <div className="space-y-3">
                {otherServices.map((os) => (
                  <Link key={os.slug} href={siaUrl(industry.slug, os.slug, area.slug)} className="group flex items-center justify-between rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/40 px-5 py-3.5 transition-all">
                    <span className="text-white/80 group-hover:text-white text-sm font-medium">{os.name} for {industry.badge} in {area.name}</span>
                    <svg className="w-4 h-4 text-white/30 group-hover:text-teal-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* This service + industry in nearby areas */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <h2 className="text-xl font-extrabold text-white mb-6 font-heading">
                {service.name} for {industry.badge} Near {area.name}
              </h2>
              {siblingAreas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {siblingAreas.map((sa) => (
                    <Link key={sa.slug} href={siaUrl(industry.slug, service.slug, sa.slug)} className="rounded-full bg-white/5 border border-white/10 hover:border-teal-500/40 hover:bg-white/10 px-4 py-2 text-white/70 hover:text-white text-sm transition-all">
                      {sa.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-sm">This is the primary area in {regionLabel}.</p>
              )}
              <div className="mt-8">
                <Link href={`/services-areas-we-offer-marketing-services-in/${area.slug}`} className="text-teal-400 hover:text-teal-300 text-sm font-semibold underline underline-offset-2 font-cta">
                  All Services in {area.name}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mb-4">
              {service.name} FAQs for {label} Businesses in {area.name}
            </h2>
          </motion.div>
          <div className="space-y-3">
            {pageFaqs.map((faq, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }} className="rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex items-center justify-between w-full px-6 py-4 text-left">
                  <span className="text-sm font-bold text-slate-900 pr-4">{faq.question}</span>
                  <svg className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CROSS-LINKS ── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              { label: `All ${service.name} Services`, href: `/services/${service.slug}` },
              { label: `${industry.badge} Marketing`, href: `/industries-we-offer-marketing-services-for/${industry.slug}` },
              { label: `Marketing in ${area.name}`, href: `/services-areas-we-offer-marketing-services-in/${area.slug}` },
              { label: "All Service Areas", href: "/services-areas-we-offer-marketing-services-in" },
              { label: "Pricing Guide", href: "/nyc-marketing-pricing-guide" },
              { label: "Marketing 101 Guide", href: "/nyc-marketing-101-guide" },
              { label: "100 FAQs", href: "/nyc-marketing-company-faqs" },
              { label: "Contact Us", href: "/contact-nyc-marketing-company-consortium-nyc" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/30 px-4 py-3 text-white/60 hover:text-white transition-all text-center">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-20 bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 font-heading">
              Ready to Dominate {service.name} for {label} Businesses in {area.name}?
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              Free strategy session. No pitch decks, no fluff — just a real conversation about what it takes to win the {lb} market in {area.name}.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="https://www.thenycmarketingcompany.com/contact" className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta">
                Get My Free {industry.badge} Strategy
              </Link>
              <a href={PHONE_HREF} className="inline-block px-8 py-4 text-base font-bold text-white/90 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors font-cta">
                {PHONE}
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}