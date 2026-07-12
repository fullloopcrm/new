"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { ServiceCategory } from "@/app/site/consortium-nyc/_lib/siteData";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";

interface Industry { name: string; slug: string; badge: string; desc: string; }
interface Area { name: string; slug: string; region: string; type: string; }

const PHONE = "212.202.9220";
const PHONE_HREF = "tel:+12122029220";

const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-teal-600 hover:text-teal-700 underline underline-offset-2 font-medium">{children}</Link>
);

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export default function IndustryPageClient({
  industry,
  label,
  serviceCategories,
  topAreas,
  relatedIndustries,
  pageFaqs,
}: {
  industry: Industry;
  label: string;
  serviceCategories: ServiceCategory[];
  topAreas: Area[];
  relatedIndustries: Industry[];
  pageFaqs: { question: string; answer: string }[];
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const lb = label.toLowerCase();
  const badge = industry.badge;

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.12),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/industries-we-offer-marketing-services-for" className="hover:text-white/70 transition-colors">Industries</Link>
            <span>/</span>
            <span className="text-white/60">{badge}</span>
          </nav>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.5 }}>
            <span className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold tracking-widest uppercase mb-6 font-cta">
              {badge} Marketing
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 font-heading">
              {industry.name}
            </h1>
            <p className="text-white/70 text-lg sm:text-xl max-w-3xl mb-4">
              {industry.desc}
            </p>
            <p className="text-white/50 text-sm mb-8">
              SEO from <span className="text-teal-400 font-bold">$950/mo</span> &middot; Websites from <span className="text-teal-400 font-bold">$4,600</span> &middot; AI Automation from <span className="text-teal-400 font-bold">$1,000/mo</span> &middot; <span className="text-teal-400 font-bold">No contracts</span>
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-10">
              <Link href="https://www.thenycmarketingcompany.com/contact" className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta">
                Get a Free {badge} Strategy
              </Link>
              <a href={PHONE_HREF} className="inline-block px-8 py-4 text-base font-bold text-white/90 rounded-lg border border-white/20 hover:bg-white/10 transition-colors font-cta">
                Call {PHONE}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {["25+ Years Experience", "$15.2M+ Revenue Generated", "No Contracts", "You Own Everything"].map((b) => (
                <span key={b} className="px-4 py-2 text-xs font-medium text-white/80 border border-white/15 rounded-full bg-white/5 font-cta">{b}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<>Your industry has <strong>specific keywords, specific competitors, and specific customers</strong>. Generic marketing won&apos;t cut it. You need a strategy built for <strong>exactly what you do</strong> and exactly where you do it.</>}
      />

      {/* ── STATS BAR ── */}
      <section className="py-10 bg-teal-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { val: "$15.2M+", label: "Revenue Generated" },
              { val: "10K+", label: "Page 1 Rankings" },
              { val: "25+", label: "Years of Experience" },
              { val: "100+", label: "Industries Served" },
            ].map((s, i) => (
              <motion.div key={s.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mb-1">{s.val}</p>
                <p className="text-white/80 text-xs sm:text-sm font-cta">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY {BADGE} BUSINESSES NEED MARKETING ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_340px] gap-12">
            <div className="prose prose-slate max-w-none">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.5 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading">
                  Why {label} Businesses Need Professional Marketing in 2026
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  The {lb} industry has changed. Ten years ago, word-of-mouth and a Yellow Pages ad were enough. Today, <strong>97% of consumers search online before making a purchasing decision</strong>, and if your {lb} business doesn&apos;t show up on the first page of Google, you&apos;re invisible to the customers who need you most. Your competitors are investing in <L href="/services/search-engine-optimization-seo-nyc">SEO</L>, <L href="/services/web-design-nyc">professional websites</L>, and <L href="/artificial-intelligence-marketing-services-offered">AI automation</L> — and they&apos;re capturing the leads that should be yours.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  At <L href="/">Consortium NYC</L>, we specialize in marketing for {lb} businesses across <L href="/services-areas-we-offer-marketing-services-in">NYC, Long Island, Westchester, and Northern New Jersey</L>. We&apos;ve spent 25+ years studying how local customers find, evaluate, and choose {lb} companies. We know which keywords drive revenue, which content converts, and which strategies compound over time. This isn&apos;t theory — we&apos;ve generated over <strong>$15.2 million in attributable revenue</strong> for local businesses.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  The {lb} market is uniquely competitive. Customers searching for {lb} services often have <strong>urgent, high-intent needs</strong> — they need help now, not next week. That means the business that shows up first on Google captures the call, the appointment, and the revenue. Second place gets nothing. Our <L href="/services/search-engine-optimization-seo-nyc">SEO strategies</L> are built to win that first-position battle in every neighborhood you serve.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  But ranking on Google is only half the equation. When a potential customer finds your {lb} business, what do they see? If your website is slow, outdated, or doesn&apos;t clearly communicate your value, they&apos;ll bounce to a competitor in seconds. Our <L href="/services/web-design-nyc">custom websites</L> are built for conversion — fast-loading, mobile-first, and engineered to turn visitors into paying customers. Starting at <L href="/nyc-marketing-pricing-guide">$4,600</L>, our sites outperform the $12K-$25K NYC average.
                </p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading mt-12">
                  The Complete Marketing System for {label} Businesses
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Most marketing agencies sell {lb} businesses a single service — maybe SEO, maybe a website — and call it a day. We build <strong>complete marketing systems</strong> where every component amplifies the others. Your <L href="/services/search-engine-optimization-seo-nyc">SEO</L> drives traffic to your <L href="/services/web-design-nyc">website</L>, which converts visitors into leads, which are instantly followed up by your <L href="/artificial-intelligence-marketing-services-offered">AI text bot</L>, which books appointments and requests <L href="/services/review-request-automation-in-nyc">reviews</L>, which boost your <L href="/services/google-business-profile-management-in-nyc">Google Business Profile</L>, which drives more SEO traffic. It&apos;s a compounding flywheel.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  For {lb} businesses specifically, this integrated approach matters more than most industries. Your customers are searching with <strong>high commercial intent</strong> — they&apos;re not browsing, they&apos;re buying. Every touchpoint in the customer journey needs to be optimized: from the moment they type a search query, to the website they land on, to the first follow-up message, to the review they leave after service. We optimize every step.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  We also understand the <strong>seasonal patterns</strong> that affect {lb} businesses. Search volume fluctuates throughout the year, and your marketing strategy needs to account for peak periods, slow seasons, and emerging opportunities. We build campaigns that capitalize on high-demand periods while building the foundation during quieter months so you&apos;re ready when demand spikes.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Every {lb} marketing engagement starts with a <strong>competitive analysis</strong> of your specific market. We study your top competitors — what they rank for, where they&apos;re vulnerable, what their websites look like, how fast they respond to leads. Then we build a strategy that exploits every gap. This isn&apos;t generic marketing advice — it&apos;s a custom playbook built on real data from your specific {lb} market.
                </p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading mt-12">
                  Local SEO for {label} Businesses: Own Your Market
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Local SEO is the backbone of {lb} marketing. When someone in your area searches for {lb} services, you need to appear in three places: the <strong>Google Map Pack</strong> (the top 3 map results), the <strong>organic results</strong> below the map, and the <strong>paid ads</strong> above everything. We focus on the first two because organic traffic is free, compounds over time, and converts at a higher rate than paid ads.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Our <L href="/services/local-seo-in-nyc">local SEO strategy</L> for {lb} businesses includes <L href="/services/google-business-profile-management-in-nyc">Google Business Profile optimization</L>, local citation building across 80+ directories, hyper-local content creation, review generation and management, and technical SEO that ensures Google can crawl and index every page on your site. We also build <L href="/services/programmatic-seo-services-in-nyc">programmatic SEO pages</L> that target every service you offer in every neighborhood you serve.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  The result? Your {lb} business appears first when potential customers search — whether they&apos;re in <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L>, <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L>, <L href="/services-areas-we-offer-marketing-services-in/queens-marketing-company">Queens</L>, <L href="/services-areas-we-offer-marketing-services-in/long-island-marketing-company">Long Island</L>, or <L href="/services-areas-we-offer-marketing-services-in/westchester-marketing-company">Westchester</L>. Every search is an opportunity, and we make sure you capture it. Check our <L href="/nyc-marketing-company-portfolio">portfolio</L> for real ranking screenshots from Google Search Console.
                </p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading mt-12">
                  Web Design That Converts {label} Leads Into Revenue
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Your website is your digital storefront. For {lb} businesses, it&apos;s often the first — and only — impression a potential customer gets before deciding to call you or your competitor. A beautiful site that doesn&apos;t generate leads is an expensive brochure. Our <L href="/services/web-design-nyc">custom websites</L> are built for one purpose: <strong>converting visitors into paying customers</strong>.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Every {lb} website we build includes click-to-call buttons, mobile-optimized contact forms, service pages targeting your highest-value keywords, trust signals (reviews, certifications, years in business), and <L href="/services/search-engine-optimization-seo-nyc">SEO architecture</L> baked into every page. Our sites load in under 2 seconds, score 90+ on Core Web Vitals, and are built on Next.js — not WordPress, not Wix, not Squarespace.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Custom websites for {lb} businesses start at <L href="/nyc-marketing-pricing-guide">$4,600</L>. That&apos;s a fraction of the NYC average ($12,000-$25,000) and you own 100% of the code, design, and content. No proprietary platforms, no monthly hosting ransom, no vendor lock-in. If you ever leave, you take everything with you. That&apos;s how confident we are in our work.
                </p>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading mt-12">
                  AI Automation: Never Miss a {label} Lead Again
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  How many leads does your {lb} business lose because you didn&apos;t respond fast enough? Studies show businesses that respond to leads within 5 minutes are <strong>100x more likely to make contact</strong> than those that wait 30 minutes. Our <L href="/artificial-intelligence-marketing-services-offered">AI automation</L> responds in under 10 seconds — 24 hours a day, 7 days a week.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Our AI text bot, <strong>Selena</strong>, handles lead qualification, appointment booking, customer questions, and <L href="/services/review-request-automation-in-nyc">review requests</L> — all via SMS. She&apos;s trained on your specific {lb} business, your services, and your pricing. When a customer texts your number at 2am about a problem, Selena responds instantly, collects the details, and books a service call — all before you wake up.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  AI automation is built on real infrastructure — <strong>Claude AI</strong> for intelligence, <strong>Telnyx</strong> for SMS, <strong>Supabase</strong> for data. Not a chatbot widget. Not a plugin. A custom-built system that you own. <L href="/artificial-intelligence-marketing-services-offered">See how it works</L> or call <a href={PHONE_HREF} className="text-teal-600 hover:text-teal-700 underline underline-offset-2 font-medium">{PHONE}</a> for a live demo.
                </p>
              </motion.div>
            </div>

            {/* Sticky sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 font-cta">{badge} Marketing Pricing</h3>
                  <div className="space-y-4 mb-6">
                    {[
                      { label: "Monthly SEO", price: "$950", suffix: "/mo" },
                      { label: "Custom Website", price: "$4,600", suffix: "" },
                      { label: "Brand Identity", price: "$2,400", suffix: "" },
                      { label: "AI Automation", price: "$1,000", suffix: "/mo" },
                    ].map((p) => (
                      <div key={p.label} className="flex items-end justify-between border-b border-slate-100 pb-3 last:border-0">
                        <span className="text-slate-500 text-sm">{p.label}</span>
                        <div className="text-right">
                          <span className="text-teal-600 text-xl font-extrabold font-mono">{p.price}</span>
                          {p.suffix && <span className="text-slate-400 text-xs">{p.suffix}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">NYC avg: <span className="line-through">$2K-$5K/mo</span> SEO &middot; <span className="line-through">$12K-$25K</span> websites</p>
                  <Link href="https://www.thenycmarketingcompany.com/contact" className="block w-full text-center px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta">
                    Get {badge} Proposal
                  </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 font-cta">Why Us</h3>
                  <ul className="space-y-2.5">
                    {["No contracts — cancel anytime", "25+ years of experience", "Senior strategists only", `${badge}-specific strategy`, "Monthly ROI reporting", "You own everything", "Direct phone & email access", "$15.2M+ revenue generated"].map((item) => (
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

      {/* ── SERVICES FOR THIS INDUSTRY ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Our Services</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mb-4">
              Web Design Services for {label} Businesses
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Every service is tailored to the {lb} industry. No generic templates — custom strategy based on your competitive landscape.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.map((cat, i) => (
              <motion.div key={cat.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <Link href={`/services/${cat.slug}`} className="group block rounded-2xl bg-white border border-slate-200 hover:border-teal-400 p-6 transition-all shadow-sm hover:shadow-md h-full">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors mb-2 font-heading">{cat.name}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">{cat.shortDesc}</p>
                  <ul className="space-y-1.5 mb-4">
                    {cat.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <span className="text-teal-600 text-sm font-bold font-cta group-hover:underline">Learn More &rarr;</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AREAS SERVED ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Coverage</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mb-4">
              {label} Marketing Across the Tri-State Area
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              We serve {lb} businesses in 81+ neighborhoods across NYC, Long Island, Westchester, and Northern New Jersey.
            </p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-3">
            {topAreas.map((area) => (
              <Link key={area.slug} href={`/industries-we-offer-marketing-services-for/${industry.slug}/${serviceCategories[0].slug}/${area.slug}`} className="rounded-full bg-slate-100 border border-slate-200 hover:border-teal-400 hover:bg-teal-50 px-5 py-2.5 text-slate-700 hover:text-teal-700 text-sm font-medium transition-all">
                {area.name}
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/services-areas-we-offer-marketing-services-in" className="text-teal-600 hover:text-teal-700 text-sm font-semibold underline underline-offset-2 font-cta">
              View All 81+ Service Areas
            </Link>
          </div>
        </div>
      </section>

      {/* ── GUARANTEES ── */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mb-4">
              Consortium NYC Guarantee
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              We don&apos;t hide behind contracts. We earn your business every month.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "No Contracts", desc: "Month-to-month. If we're not delivering, you walk. That pressure keeps us sharp." },
              { title: "You Own Everything", desc: "Code, designs, content, domains, accounts — all yours. No proprietary platforms, no lock-in." },
              { title: "One Strategist", desc: "Every aspect of your marketing is handled by a senior strategist with 25+ years of experience." },
              { title: "Transparent Pricing", desc: "No surprise invoices. Check our pricing guide before we even talk. Informed clients make better decisions." },
            ].map((g, i) => (
              <motion.div key={g.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 h-full">
                  <h3 className="text-base font-bold text-white mb-3 font-heading">{g.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{g.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mb-4">
              Our {label} Marketing Process
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Competitive Analysis", desc: `We study your top ${lb} competitors — what they rank for, where they're weak, and exactly how to beat them.` },
              { num: "02", title: "Custom Strategy", desc: `A roadmap built on real data from your ${lb} market. Every dollar gets allocated with a reason behind it.` },
              { num: "03", title: "Build & Launch", desc: "Website, SEO, content, and AI automation go live. Technical optimization and conversion tracking start immediately." },
              { num: "04", title: "Momentum Builds", desc: `Rankings lock in. Your phone rings more. Lead volume becomes predictable. Content compounds.` },
              { num: "05", title: "Domination", desc: `Top positions locked. Consistent leads. Revenue compounds. Your marketing spend as a percentage of revenue drops.` },
              { num: "06", title: "Scale & Expand", desc: `Expand into new neighborhoods, new services, new markets. The foundation supports unlimited growth.` },
            ].map((step, i) => (
              <motion.div key={step.num} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 h-full">
                  <span className="text-teal-600 text-2xl font-extrabold font-mono">{step.num}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2 mb-2 font-heading">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RELATED INDUSTRIES ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mb-4">
              Related Industries
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              We serve 100+ industries. Every strategy is custom-built for the specific competitive landscape.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedIndustries.map((ri, i) => (
              <motion.div key={ri.slug} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.3, delay: i * 0.03 }}>
                <Link href={`/industries-we-offer-marketing-services-for/${ri.slug}`} className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-4 transition-all shadow-sm hover:shadow-md">
                  <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-teal-600 font-cta">{ri.badge}</span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors mt-1 font-heading">{ri.name}</h3>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/industries-we-offer-marketing-services-for" className="text-teal-600 hover:text-teal-700 text-sm font-semibold underline underline-offset-2 font-cta">
              View All 100+ Industries
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Questions</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
              {label} Marketing FAQs
            </h2>
          </motion.div>
          <div className="space-y-3">
            {pageFaqs.map((faq, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.3, delay: i * 0.04 }} className="rounded-xl border border-slate-200 overflow-hidden">
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
              { label: "All Industries", href: "/industries-we-offer-marketing-services-for" },
              { label: "All Services", href: "/nyc-marketing-company-services-list" },
              { label: "Service Areas", href: "/services-areas-we-offer-marketing-services-in" },
              { label: "AI Automation", href: "/artificial-intelligence-marketing-services-offered" },
              { label: "Pricing Guide", href: "/nyc-marketing-pricing-guide" },
              { label: "Marketing 101", href: "/nyc-marketing-101-guide" },
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
              Ready to Dominate {label} Marketing?
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              Free strategy session. We&apos;ll audit your current situation, analyze your competitors, and show you exactly how to capture more {lb} leads — whether you hire us or not.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="https://www.thenycmarketingcompany.com/contact" className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta">
                Get My Free {badge} Strategy
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
