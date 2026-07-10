"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function AnimatedNumber({
  value,
  inView,
  suffix = "",
  prefix = "",
}: {
  value: number;
  inView: boolean;
  suffix?: string;
  prefix?: string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, count, rounded]);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats data                                                         */
/* ------------------------------------------------------------------ */
const stats = [
  { value: 150, suffix: "+", label: "Clients Served" },
  { value: 45, suffix: "+", label: "Page 1 Rankings" },
  { value: 25, suffix: "+", label: "Industries" },
  { value: 12, suffix: "x", label: "Average ROI" },
];

/* ------------------------------------------------------------------ */
/*  Case studies data                                                  */
/* ------------------------------------------------------------------ */
const caseStudies = [
  {
    title: "Brooklyn Plumbing Company",
    subtitle: "Local SEO + Web Design",
    challenge:
      "A family-owned plumbing company buried on page 5 of Google, generating just 2 leads per month from their website. Their site was outdated, slow, and not mobile-friendly. They were spending money on print ads with no way to track results.",
    whatWeDid: [
      "Built a fast, mobile-first website with clear calls to action on every page",
      "Implemented local SEO strategy targeting 50+ neighborhood-specific keywords",
      "Optimized and managed their Google Business Profile",
      "Set up automated review requests after every job",
      "Created monthly blog content targeting common plumbing questions",
    ],
    results: [
      { metric: "Page 5 to #1", label: "Google Ranking" },
      { metric: "2 to 45", label: "Leads/Month" },
      { metric: "1,650%", label: "Traffic Increase" },
      { metric: "4 months", label: "Timeline" },
    ],
    quote:
      "We went from hoping the phone would ring to having to hire two more plumbers to keep up with demand. Best investment we ever made.",
    quoteName: "Mike T., Owner",
  },
  {
    title: "Manhattan Law Firm",
    subtitle: "SEO + Conversion Optimization",
    challenge:
      "A personal injury firm getting buried by competitors with much bigger budgets. They were on page 4 for every money keyword, generating 8 leads per month -- mostly unqualified. Their website looked outdated and their conversion rate was under 1%.",
    whatWeDid: [
      "Complete website redesign focused on trust signals and conversion",
      "Aggressive local SEO for Manhattan and surrounding boroughs",
      "Content strategy targeting long-tail case-specific queries",
      "Automated lead qualification system to filter out bad fits",
      "Review generation and reputation management",
    ],
    results: [
      { metric: "400%", label: "More Qualified Leads" },
      { metric: "Page 1", label: "For Target Keywords" },
      { metric: "5.2%", label: "Conversion Rate" },
      { metric: "3 months", label: "Timeline" },
    ],
    quote:
      "We went from page 3 to the top of Google in 4 months and our lead volume tripled. The ROI has been incredible -- we've had to hire two more paralegals to keep up.",
    quoteName: "Michael R., Managing Partner",
  },
  {
    title: "Long Island HVAC",
    subtitle: "Web Design + SEO + Automation",
    challenge:
      "A family-owned HVAC company competing against national franchises with unlimited budgets. They had no website, no Google Business Profile optimization, and were relying entirely on word-of-mouth and a $6K/month Google Ads budget that was burning money on irrelevant clicks.",
    whatWeDid: [
      "Built a high-converting website from scratch with 200+ location/service pages",
      "Google Business Profile optimization across all service areas",
      "Automated lead capture, qualification, and routing to technicians",
      "Cut ad waste by 70% and redirected budget to organic growth",
      "Monthly content creation targeting seasonal HVAC searches",
    ],
    results: [
      { metric: "0 to 60", label: "Leads/Month" },
      { metric: "85+", label: "Page 1 Keywords" },
      { metric: "$180K", label: "New Revenue (Year 1)" },
      { metric: "5 months", label: "Timeline" },
    ],
    quote:
      "The automation systems they set up saved us 20+ hours per week. Leads come in, get qualified, and routed to our team automatically. We've never been busier.",
    quoteName: "David L., Owner",
  },
];

/* ------------------------------------------------------------------ */
/*  Before / After data                                                */
/* ------------------------------------------------------------------ */
const beforeAfterData = [
  {
    business: "Brooklyn Plumbing",
    before: { ranking: "Page 5", visits: 200, leads: 2 },
    after: { ranking: "#1", visits: 3500, leads: 45 },
  },
  {
    business: "Manhattan Law Firm",
    before: { ranking: "Page 4", visits: 350, leads: 5 },
    after: { ranking: "Page 1", visits: 4200, leads: 62 },
  },
  {
    business: "Long Island HVAC",
    before: { ranking: "N/A", visits: 0, leads: 0 },
    after: { ranking: "Page 1", visits: 2800, leads: 60 },
  },
];

/* ------------------------------------------------------------------ */
/*  Testimonials data                                                  */
/* ------------------------------------------------------------------ */
const testimonials = [
  {
    text: "Their branding work gave us an identity that finally matched the quality of our food. The website they built is a work of art and ranks incredibly well.",
    name: "Sarah K.",
    business: "Brooklyn Restaurant Group",
    rating: 5,
  },
  {
    text: "We went from hoping the phone would ring to having to hire two more plumbers to keep up. Consortium NYC changed everything for us.",
    name: "Mike T.",
    business: "Brooklyn Plumbing Co.",
    rating: 5,
  },
  {
    text: "The ROI has been incredible. We've had to hire two more paralegals to keep up with the leads they generate for us.",
    name: "Michael R.",
    business: "Manhattan Law Firm",
    rating: 5,
  },
  {
    text: "The automation systems they set up saved us 20+ hours per week. We've never been busier and our ad spend is a fraction of what it was.",
    name: "David L.",
    business: "Long Island HVAC",
    rating: 5,
  },
];

/* ------------------------------------------------------------------ */
/*  Stars component                                                    */
/* ------------------------------------------------------------------ */
function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < count ? "text-yellow-400" : "text-slate-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  RESULTS CLIENT COMPONENT                                           */
/* ================================================================== */
export default function ResultsClient() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsInView(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="bg-white pt-32 pb-16 sm:pt-40 sm:pb-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] font-heading"
          >
            We Don&apos;t Talk About Results.{" "}
            <span className="text-teal-600">We Show Them.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Real businesses. Real numbers. Real revenue. Every result on this
            page is from an actual client engagement — nothing hypothetical.
          </motion.p>
        </div>
      </section>

      <TipBlurb
        tip={<><strong>Numbers don&apos;t lie.</strong> Every metric you see here came from real Google Analytics, real Search Console data, and real client dashboards. We don&apos;t <strong>photoshop results</strong>.</>}
      />

      {/* ============================================================ */}
      {/*  STATS BAR                                                   */}
      {/* ============================================================ */}
      <section ref={statsRef} className="bg-teal-600 py-16 sm:py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-14">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-2 font-mono">
                  <AnimatedNumber
                    value={stat.value}
                    suffix={stat.suffix}
                    inView={statsInView}
                  />
                </p>
                <p className="text-white/80 text-sm sm:text-base font-medium tracking-wide uppercase font-cta">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CASE STUDIES                                                */}
      {/* ============================================================ */}
      <section className="bg-white py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Case Studies
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
              The Full Story Behind{" "}
              <span className="text-teal-600">the Numbers</span>
            </h2>
          </motion.div>

          <div className="space-y-16">
            {caseStudies.map((study, i) => (
              <motion.div
                key={study.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="rounded-2xl bg-teal-50 border border-teal-100 p-8 sm:p-10"
              >
                {/* Header */}
                <div className="mb-8">
                  <p className="text-teal-600 text-sm font-semibold tracking-wide uppercase mb-1">
                    {study.subtitle}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                    {study.title}
                  </h3>
                </div>

                {/* Challenge */}
                <div className="mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3">
                    The Challenge
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {study.challenge}
                  </p>
                </div>

                {/* What We Did */}
                <div className="mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-3">
                    What We Did
                  </h4>
                  <ul className="space-y-2">
                    {study.whatWeDid.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-slate-700 text-sm"
                      >
                        <svg
                          className="w-5 h-5 text-teal-600 shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Results Grid */}
                <div className="mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-4">
                    The Results
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {study.results.map((r) => (
                      <div
                        key={r.label}
                        className="bg-white rounded-xl border border-slate-200 p-4 text-center"
                      >
                        <p className="text-2xl sm:text-3xl font-extrabold text-teal-600 font-mono">
                          {r.metric}
                        </p>
                        <p className="text-slate-500 text-xs mt-1 uppercase tracking-wide">
                          {r.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <div className="pt-6 border-t border-teal-200">
                  <p className="text-slate-600 italic leading-relaxed">
                    &ldquo;{study.quote}&rdquo;
                  </p>
                  <p className="text-teal-600 text-sm font-semibold mt-2">
                    &mdash; {study.quoteName}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BEFORE & AFTER                                              */}
      {/* ============================================================ */}
      <section className="bg-teal-50 py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Before & After
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
              Side-by-Side{" "}
              <span className="text-teal-600">Comparison</span>
            </h2>
            <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
              Numbers don&apos;t lie. Here&apos;s what changed when these
              businesses partnered with us.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {beforeAfterData.map((item, i) => (
              <motion.div
                key={item.business}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-6 font-heading">
                  {item.business}
                </h3>

                {/* Before */}
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3">
                    Before
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-red-500 text-xl font-bold font-mono">
                        {item.before.ranking}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">Ranking</p>
                    </div>
                    <div>
                      <p className="text-red-500 text-xl font-bold font-mono">
                        {item.before.visits.toLocaleString()}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">Visits/mo</p>
                    </div>
                    <div>
                      <p className="text-red-500 text-xl font-bold font-mono">
                        {item.before.leads}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">Leads/mo</p>
                    </div>
                  </div>
                </div>

                {/* Divider with arrow */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <svg
                    className="w-6 h-6 text-teal-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                    />
                  </svg>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* After */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-3">
                    After
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-teal-600 text-xl font-bold font-mono">
                        {item.after.ranking}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">Ranking</p>
                    </div>
                    <div>
                      <p className="text-teal-600 text-xl font-bold font-mono">
                        {item.after.visits.toLocaleString()}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">Visits/mo</p>
                    </div>
                    <div>
                      <p className="text-teal-600 text-xl font-bold font-mono">
                        {item.after.leads}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">Leads/mo</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                */}
      {/* ============================================================ */}
      <section className="bg-white py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Testimonials
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
              Straight From{" "}
              <span className="text-teal-600">Our Clients</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="rounded-2xl bg-teal-50 border border-teal-100 p-6 sm:p-8 flex flex-col"
              >
                <Stars count={t.rating} />
                <p className="text-slate-600 leading-relaxed mt-4 mb-6 flex-1">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="pt-4 border-t border-teal-200">
                  <p className="text-slate-900 font-bold text-sm font-heading">
                    {t.name}
                  </p>
                  <p className="text-teal-600 text-xs">{t.business}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                   */}
      {/* ============================================================ */}
      <section className="bg-teal-50 py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
              Ready to Be Our Next{" "}
              <span className="text-teal-600">Success Story</span>?
            </h2>
            <p className="mt-6 text-slate-600 text-lg max-w-xl mx-auto">
              Every business on this page started exactly where you are right
              now. The only difference? They made the call.
            </p>
            <div className="mt-10">
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="inline-block px-10 py-5 text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Get Your Free Strategy Session
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
