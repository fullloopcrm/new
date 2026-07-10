"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { serviceCategories } from "@/app/site/the-nyc-marketing-company/_lib/siteData";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

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

/* ── Inner link helper ───────────────────────────────────────── */
const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

/* ── Icon map ────────────────────────────────────────────────── */
const iconMap: Record<string, React.ReactNode> = {
  search: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  layout: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>,
  palette: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>,
  "file-text": <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  share: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>,
  "dollar-sign": <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  mail: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>,
  shield: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  "bar-chart": <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  target: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  "trending-up": <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
  user: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
  cpu: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>,
  layers: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25" /></svg>,
  database: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
  "map-pin": <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
};

/* ── Stats ────────────────────────────────────────────────────── */
const stats = [
  { prefix: "$", value: 15.2, suffix: "M+", label: "Revenue Generated" },
  { prefix: "", value: 10, suffix: "K+", label: "Page 1 Rankings" },
  { prefix: "", value: 500, suffix: "%+", label: "Average Client ROI" },
  { prefix: "", value: 150, suffix: "+", label: "Businesses Served" },
];

/* ── Pricing quick facts ─────────────────────────────────────── */
const pricingQuick = [
  { service: "Custom Website", price: "$4,600+", note: "one-time" },
  { service: "Monthly SEO", price: "$950/mo", note: "month-to-month" },
  { service: "AI Automation", price: "$1K/mo", note: "after $25K setup" },
  { service: "Custom CRM", price: "$25K+", note: "you own everything" },
  { service: "Marketing Manager", price: "$1K/mo", note: "outsourced dept" },
  { service: "GBP Setup", price: "$500", note: "one-time" },
];

/* ══════════════════════════════════════════════════════════════ */
export default function ServicesListClient() {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });

  // Count services + sub-services
  const totalServices = serviceCategories.reduce(
    (acc, cat) => acc + 1 + cat.subServices.length, 0
  );

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
            NYC Marketing Company Services
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 font-heading leading-[1.1]"
          >
            Everything Your Business Needs to{" "}
            <span className="text-teal-400">Dominate Online</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed mb-4"
          >
            From <Link href="/services/search-engine-optimization-seo-nyc" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">SEO</Link> and <Link href="/services/web-design-nyc" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">custom web design</Link> to <Link href="/services/ai-automation-services-in-nyc" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">AI automation</Link> and <Link href="/services/custom-crm-development-in-nyc" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">custom CRM development</Link> — {totalServices} services delivered by the same person with 25 years of experience.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-300 text-sm mb-10 max-w-2xl mx-auto"
          >
            No handoffs. No juniors. No outsourcing. No contracts. See our <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">transparent pricing</Link> or check <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">real results</Link>.
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
              Schedule a Free Strategy Session
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
            {["25+ Years Experience", "No Contracts", "You Own Everything", `${totalServices} Services`].map((badge) => (
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
        tip={<>You don&apos;t need every service on this list. Most businesses need <strong>two or three things done really well</strong>. The trick is knowing which ones <strong>move the needle</strong> for your specific situation.</>}
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

      {/* ── QUICK NAV JUMP LINKS ─────────────────────────────── */}
      <section className="py-8 bg-white border-b border-slate-100 sticky top-[72px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {serviceCategories.map((cat) => (
              <a
                key={cat.slug}
                href={`#${cat.slug}`}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-full border border-slate-200 hover:border-teal-300 transition-all font-cta"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICE CATEGORIES ───────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-28">
            {serviceCategories.map((cat, catIndex) => (
              <div key={cat.slug} id={cat.slug}>
                {/* ── Category block ── */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6 }}
                  className={`flex flex-col lg:flex-row gap-10 lg:gap-16 items-start ${catIndex % 2 !== 0 ? "lg:flex-row-reverse" : ""}`}
                >
                  {/* Text side */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                        {iconMap[cat.icon] || iconMap.search}
                      </div>
                      <span className="text-teal-600 text-xs font-bold tracking-[0.15em] uppercase font-cta">
                        {cat.tagline}
                      </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
                      {cat.name} <span className="text-teal-600">Services</span>
                    </h2>

                    <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-6">
                      {cat.description}
                    </p>

                    {/* Features */}
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-8">
                      {cat.features.map((f) => (
                        <div key={f} className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </div>
                          <span className="text-slate-700 text-sm">{f}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={`/services/${cat.slug}`}
                      className="inline-block px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta"
                    >
                      Get Started with {cat.name} &rarr;
                    </Link>
                  </div>

                  {/* Visual side — stats card + quick info */}
                  <div className="flex-1 w-full">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                      {/* Card header */}
                      <div className="bg-slate-900 p-6">
                        <h3 className="text-white text-lg font-bold font-heading mb-1">{cat.name}</h3>
                        <p className="text-white/60 text-sm">{cat.shortDesc}</p>
                      </div>
                      {/* Features in card */}
                      <div className="p-6 space-y-3">
                        {cat.features.slice(0, 4).map((f) => (
                          <div key={f} className="flex items-center justify-between">
                            <span className="text-slate-600 text-sm">{f}</span>
                            <span className="text-teal-600 text-xs font-bold">&#x2713;</span>
                          </div>
                        ))}
                        {cat.features.length > 4 && (
                          <p className="text-slate-400 text-xs font-cta">+ {cat.features.length - 4} more included</p>
                        )}
                      </div>
                      {/* Card footer */}
                      <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                        <Link
                          href={`/services/${cat.slug}`}
                          className="text-teal-600 text-sm font-bold hover:underline font-cta"
                        >
                          Learn More &rarr;
                        </Link>
                        <Link
                          href="https://www.thenycmarketingcompany.com/nyc-marketing-pricing-guide"
                          className="text-slate-400 text-xs hover:text-slate-600 font-cta"
                        >
                          See Pricing
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ── Sub-services grid ── */}
                {cat.subServices.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="mt-10"
                  >
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1 font-cta">
                      {cat.name} Sub-Services
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {cat.subServices.map((sub, i) => (
                        <motion.div
                          key={sub.slug}
                          initial={{ opacity: 0, y: 15 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                        >
                          <Link
                            href={`/services/${sub.slug}`}
                            className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-5 h-full transition-all hover:shadow-md"
                          >
                            <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 font-heading group-hover:text-teal-600 transition-colors">
                              {sub.name}
                            </h3>
                            <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-3">
                              {sub.shortDesc}
                            </p>
                            <span className="text-teal-600 text-xs font-semibold group-hover:underline font-cta">
                              Learn more &rarr;
                            </span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING QUICK REFERENCE ──────────────────────────── */}
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
              Transparent Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
              What It Costs —{" "}
              <span className="text-teal-600">No Surprises</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              We publish our prices because we believe informed clients make better decisions. No one should have to &ldquo;book a call&rdquo; just to find out if they can afford you. See our full <L href="/nyc-marketing-pricing-guide">pricing guide</L>.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {pricingQuick.map((item, i) => (
              <motion.div
                key={item.service}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl bg-white border border-slate-200 p-6 flex items-center justify-between hover:border-teal-300 transition-all"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">{item.service}</h3>
                  <p className="text-slate-400 text-xs mt-0.5 font-cta">{item.note}</p>
                </div>
                <span className="text-teal-600 text-xl font-extrabold font-mono">{item.price}</span>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="https://www.thenycmarketingcompany.com/nyc-marketing-pricing-guide"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
            >
              See Full Pricing Guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── GUARANTEES ───────────────────────────────────────── */}
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
              What We Promise Every{" "}
              <span className="text-teal-600">NYC Business</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                num: "01",
                title: "One Person. 25 Years.",
                desc: "Every service on this page is delivered by the same person. Not outsourced overseas. Not handed to a junior. Direct communication, direct execution, direct accountability.",
              },
              {
                num: "02",
                title: "You Own Everything",
                desc: "Code, designs, content, domains, accounts, data — it's all yours. No proprietary platforms, no lock-in. Leave anytime and take everything with you.",
              },
              {
                num: "03",
                title: "No Long-Term Contracts",
                desc: "Month-to-month. We earn your business every 30 days. If we're not delivering results, you walk. That's the pressure that keeps us sharp.",
              },
              {
                num: "04",
                title: "100% Transparency",
                desc: "Full access to every metric, every report, every decision. No black boxes. You see exactly what we do, why we do it, and what it produces.",
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

      {/* ── WHAT WE WON'T DO ─────────────────────────────────── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold mb-6 font-heading">What We Won&apos;t Do</h3>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  "Guarantee page 1 rankings",
                  "Promise results in 30 days",
                  "Hide behind vanity metrics",
                  "Lock you into a contract",
                  "Outsource your work overseas",
                  "Disappear after you sign",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1">
              <h3 className="text-white text-xl font-bold mb-6 font-heading">What We Will Do</h3>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  "Give you a brutally honest audit — free",
                  "Show you real results from real businesses",
                  "Tell you if you're not ready for marketing yet",
                  "Publish our prices so you're never blindsided",
                  "Deliver everything you can verify yourself",
                  "Earn your business every single month",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-teal-400 shrink-0">&#x2713;</span>
                    {item}
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
                Not Sure What You Need?
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
                Let&apos;s Figure It Out Together
              </h2>
              <p className="text-white/60 text-base mb-10 max-w-2xl mx-auto">
                Book a free strategy session. We&apos;ll audit your current situation, analyze your competitors, and tell you exactly which services will move the needle — whether you hire us or not. Check our <Link href="/nyc-marketing-pricing-guide" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">pricing guide</Link>, see <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">real results</Link>, or explore <Link href="/industries-we-offer-marketing-services-for" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">100+ industries we serve</Link>.
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