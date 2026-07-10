"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import type { ServiceCategory, SubService } from "@/app/site/the-nyc-marketing-company/_lib/siteData";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";
import { serviceDeepContent } from "@/app/site/the-nyc-marketing-company/_lib/serviceContent";

/* ── Animated number counter ─────────────────────────────────── */
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

/* ── FAQ accordion item ─────────────────────────────────────── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-lg font-semibold text-slate-900 hover:text-teal-600 transition-colors font-heading"
      >
        {question}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-4 text-2xl text-teal-600 shrink-0"
        >
          +
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-slate-600 leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  );
}

/* ── Inner link helper ──────────────────────────────────────── */
const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

/* deepContent is now imported from @/app/site/the-nyc-marketing-company/_lib/serviceContent */

/* ── Portfolio stats for the proof section ──────────────────── */
const proofStats = [
  { prefix: "$", value: 15, suffix: "M+", label: "Revenue Generated" },
  { prefix: "", value: 10, suffix: "K+", label: "Page 1 Rankings" },
  { prefix: "", value: 500, suffix: "%+", label: "Average ROI" },
  { prefix: "", value: 150, suffix: "+", label: "Businesses Served" },
];

/* ── Process steps ──────────────────────────────────────────── */
const processSteps = [
  { time: "Week 1", title: "Discovery & Honest Audit", desc: "We rip apart your digital presence — no sugarcoating. You get a brutally honest assessment of where you stand and what it takes to compete." },
  { time: "Week 2–3", title: "Strategy & Roadmap", desc: "Custom roadmap built on your actual market data. Every dollar gets allocated with a reason behind it." },
  { time: "Month 1–2", title: "Build & Launch", desc: "Everything goes live with SEO architecture baked in from day one. Technical optimization, content pipeline, and conversion tracking start immediately." },
  { time: "Month 3–6", title: "Momentum Builds", desc: "Rankings lock in. Phone starts ringing more. Lead volume becomes predictable. The content you published months ago starts compounding." },
  { time: "Month 6–12", title: "Domination", desc: "Top rankings locked. Consistent leads every month. Revenue compounds. Marketing spend as a percentage of revenue drops every quarter." },
];

/* ══════════════════════════════════════════════════════════════ */
export default function ServicePageClient({
  category,
  subService,
  serviceFaqs,
}: {
  category: ServiceCategory;
  subService: SubService | null;
  serviceFaqs: { question: string; answer: string }[];
}) {
  const isSubService = !!subService;
  const name = isSubService ? subService.name : category.name;
  const description = isSubService ? subService.shortDesc : category.description;
  const tagline = category.tagline;
  const features = category.features;
  const deepDive = serviceDeepContent[category.slug];

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 bg-slate-900 overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-teal-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Breadcrumb */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/40 mb-6 font-cta">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/nyc-marketing-company-services-list" className="hover:text-white/60 transition-colors">Services</Link>
            {isSubService && (
              <>
                <span>/</span>
                <Link href={`/services/${category.slug}`} className="hover:text-white/60 transition-colors">{category.name}</Link>
              </>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block bg-teal-600 text-white text-xs sm:text-sm font-bold tracking-[0.15em] uppercase px-5 py-2.5 mb-6 font-cta"
          >
            {tagline}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 font-heading leading-[1.1]"
          >
            {name}{" "}
            <span className="text-teal-400">in NYC</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed mb-4"
          >
            {description}
          </motion.p>

          {/* Social proof line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-300 text-sm mb-10 max-w-2xl mx-auto"
          >
            <strong className="text-white">10,000+ businesses</strong> over <strong className="text-white">25 years</strong> — delivering{" "}
            <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">real, verifiable results</Link>{" "}
            for <Link href="/industries-we-offer-marketing-services-for" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">100+ industries</Link>.
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
              Get Started with {name}
            </Link>
            <a
              href="tel:+12122029220"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg border border-white/30 hover:bg-white/10 transition-colors font-cta"
            >
              Call (212) 202-9220
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {["25+ Years Experience", "No Contracts", "You Own Everything"].map((badge) => (
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
        tip={<>The businesses that <strong>dominate their market</strong> don&apos;t just &ldquo;do marketing.&rdquo; They invest in the right service at the right time. If this is the service you need, <strong>do it properly</strong> — half-measures waste money.</>}
      />

      {/* ── STATS TICKER BAR ─────────────────────────────────── */}
      <section ref={statsRef} className="py-10 sm:py-12 bg-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {proofStats.map((stat, i) => (
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

      {/* ── WHAT'S INCLUDED (features grid) ──────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              What&apos;s Included
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
              Everything You Need for{" "}
              <span className="text-teal-600">{name}</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Comprehensive {name.toLowerCase()} services delivered by one person with 25 years of experience. No handoffs. No juniors. No outsourcing. See our <L href="/nyc-marketing-pricing-guide">transparent pricing</L>.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex items-start gap-4 p-6 rounded-xl border border-slate-100 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/30 transition-all"
              >
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                </div>
                <span className="text-slate-900 text-base font-semibold">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUB-SERVICES (category pages only) ───────────────── */}
      {!isSubService && category.subServices.length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
                Specialized Services
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
                {category.name}{" "}
                <span className="text-teal-600">Sub-Services</span>
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Each sub-service gets the same depth, strategy, and execution as the parent service. Click through for details.
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.subServices.map((sub, i) => (
                <motion.div
                  key={sub.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Link
                    href={`/services/${sub.slug}`}
                    className="group block rounded-2xl border border-slate-200 bg-white hover:border-teal-300 shadow-sm hover:shadow-md p-8 transition-all h-full"
                  >
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-600 transition-colors mb-3 font-heading">
                      {sub.name}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                      {sub.shortDesc}
                    </p>
                    <span className="text-teal-600 text-sm font-bold font-cta group-hover:underline">
                      Learn More &rarr;
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DEEP DIVE CONTENT (category pages with content) ──── */}
      {deepDive && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-4 font-cta">
                {name} in NYC
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-8 font-heading">
                {deepDive.headline}
              </h2>
              {/* Intro paragraphs */}
              <div className="space-y-5 mb-14">
                {deepDive.intro.map((p, i) => (
                  <p key={i} className="text-slate-600 text-base sm:text-lg leading-relaxed">{p}</p>
                ))}
              </div>
              {/* H3 sections */}
              {deepDive.sections.map((section, si) => (
                <motion.div
                  key={si}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: si * 0.03 }}
                  className="mb-12"
                >
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5 font-heading border-l-4 border-teal-500 pl-4">
                    {section.title}
                  </h3>
                  <div className="space-y-4">
                    {section.content.map((p, pi) => (
                      <p key={pi} className="text-slate-600 text-base sm:text-lg leading-relaxed">{p}</p>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── BACK TO PARENT (sub-service pages only) ─────────── */}
      {isSubService && (
        <section className="py-10 bg-teal-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm">
              This is part of our{" "}
              <Link href={`/services/${category.slug}`} className="text-teal-600 font-bold underline underline-offset-2 hover:text-teal-500">
                {category.name}
              </Link>{" "}
              services.
            </p>
            <Link
              href={`/services/${category.slug}`}
              className="inline-block px-6 py-3 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-300 hover:border-teal-500 hover:bg-white transition-all font-cta"
            >
              &larr; View All {category.name} Services
            </Link>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS (process timeline) ──────────────────── */}
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
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Our {name}{" "}
              <span className="text-teal-600">Process</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              No fake promises. No &ldquo;page 1 in 30 days.&rdquo; Here&apos;s exactly what happens when you invest in {name.toLowerCase()} for your business.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Timeline */}
            <div className="lg:w-[65%]">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-teal-300" />
                <div className="space-y-8">
                  {processSteps.map((step, i) => (
                    <motion.div
                      key={step.time}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      className="relative pl-14"
                    >
                      <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs font-mono">{i + 1}</span>
                      </div>
                      <span className="text-teal-600 text-xs font-bold tracking-[0.1em] uppercase font-cta">{step.time}</span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2 font-heading">{step.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:w-[35%]"
            >
              <div className="lg:sticky lg:top-32 space-y-6">
                {/* What we won't do */}
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                  <h4 className="text-sm font-bold text-white mb-4 font-heading">What We Won&apos;t Do</h4>
                  <ul className="space-y-3 text-sm text-white/70">
                    {[
                      "Guarantee page 1 rankings",
                      "Promise results in 30 days",
                      "Hide behind vanity metrics",
                      "Lock you into a contract",
                      "Outsource your work overseas",
                      "Disappear after you sign",
                    ].map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-red-400 shrink-0">&#x2717;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pricing quick reference */}
                <div className="rounded-xl bg-white border border-slate-200 p-6">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 font-heading">Quick Pricing</h4>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex justify-between">
                      <span>Custom Website</span>
                      <span className="font-bold text-slate-900 font-mono">$4,600+</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Monthly SEO</span>
                      <span className="font-bold text-slate-900 font-mono">$950/mo</span>
                    </li>
                    <li className="flex justify-between">
                      <span>AI Automation</span>
                      <span className="font-bold text-slate-900 font-mono">$1K/mo</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Custom CRM</span>
                      <span className="font-bold text-slate-900 font-mono">$25K+</span>
                    </li>
                  </ul>
                  <Link
                    href="https://www.thenycmarketingcompany.com/nyc-marketing-pricing-guide"
                    className="block mt-4 text-center text-teal-600 text-xs font-bold font-cta hover:underline"
                  >
                    See Full Pricing Guide &rarr;
                  </Link>
                </div>

                {/* CTA */}
                <Link
                  href="https://www.thenycmarketingcompany.com/contact"
                  className="block w-full text-center px-6 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
                >
                  Start With a Real Conversation
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US (guarantees) ───────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
              Our Guarantee
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              What Makes Us{" "}
              <span className="text-teal-600">Different</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                num: "01",
                title: "One Person. 25 Years.",
                desc: `Every aspect of your ${name.toLowerCase()} is handled by the same person — not outsourced overseas, not handed to a junior. Direct communication. Direct execution. Direct accountability.`,
              },
              {
                num: "02",
                title: "You Own Everything",
                desc: "Code, designs, content, domains, accounts — it's all yours. No proprietary platforms, no lock-in, no hostage situations. Leave anytime and take everything with you.",
              },
              {
                num: "03",
                title: "No Long-Term Contracts",
                desc: "Month-to-month. We earn your business every 30 days. If we're not delivering, you walk. That's the kind of pressure that keeps us sharp.",
              },
              {
                num: "04",
                title: "Transparent Pricing",
                desc: "No surprise invoices. No scope creep. Check our pricing guide before we even talk. We believe informed clients make better decisions.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-8 transition-all hover:border-teal-300"
              >
                <div className="flex items-start gap-6">
                  <div className="shrink-0 w-14 h-14 rounded-full bg-teal-600 flex items-center justify-center">
                    <span className="text-white text-lg font-black font-mono">{item.num}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 font-heading">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      {serviceFaqs.length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
                Frequently Asked Questions
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
                {name} <span className="text-teal-600">FAQs</span>
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8"
            >
              {serviceFaqs.map((faq) => (
                <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ──────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-slate-900 p-12 sm:p-16 text-center overflow-hidden">
            {/* Decorative orbs */}
            <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-teal-600/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-teal-400/10 blur-3xl" />

            <div className="relative z-10">
              <p className="text-teal-400 text-sm font-semibold tracking-wider uppercase mb-3 font-cta">
                Ready to Get Started?
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
                Let&apos;s Talk About {name} for Your Business
              </h2>
              <p className="text-white/60 text-base mb-10 max-w-2xl mx-auto">
                Book a free strategy session. We&apos;ll audit your current situation, analyze your competitors, and map out exactly how {name.toLowerCase()} can grow your business — whether you hire us or not. See our{" "}
                <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">
                  transparent pricing
                </Link>{" "}
                or check out{" "}
                <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">
                  real results
                </Link>{" "}
                first.
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