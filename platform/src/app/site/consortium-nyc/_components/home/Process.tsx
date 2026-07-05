"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const steps = [
  {
    time: "Week 1",
    title: "Discovery & Honest Audit",
    desc: "We rip apart your digital presence — no sugarcoating. You'll get a brutally honest assessment of where you stand, what your competitors are doing, and what it actually takes to compete in your market. Most businesses are shocked at what they find. That's the point.",
    reality: "This is where we tell you what other agencies won't. If your expectations are unrealistic, we'll say so. If you need a website before SEO makes sense, we'll say that too.",
    spend: "Free — this is on us.",
  },
  {
    time: "Week 2–3",
    title: "Strategy & Roadmap",
    desc: "Custom roadmap built on your actual market data — not a recycled template. We map your keywords, competitors, and the fastest path to revenue. Every dollar gets allocated with a reason behind it.",
    reality: "No, we can't guarantee page 1 in 30 days. Anyone who says that is lying. We give you a real timeline based on your competition, your domain authority, and your budget.",
    spend: "Included in your monthly or project fee.",
  },
  {
    time: "Month 1–2",
    title: "Build & Launch",
    desc: "Website goes live. Technical SEO gets implemented. Google Business Profile gets optimized. Content pipeline starts. Everything is built with SEO architecture from day one — not bolted on after.",
    reality: "Google doesn't index on your schedule. Crawling and indexing can take days to weeks. Algorithm updates happen. Competitors don't sit still. This is a marathon, not a sprint.",
    spend: "Website: $4,600 one-time. SEO: $950/mo starts here.",
  },
  {
    time: "Month 2–4",
    title: "The Grind — Where Most Agencies Quit",
    desc: "This is where the real work happens. Content gets published. Backlinks get built. Rankings start moving — slowly at first. You'll see traffic ticking up, but leads might still be inconsistent. This is normal.",
    reality: "SEO is not instant. Google tests your site. Rankings fluctuate. You'll have weeks where it feels like nothing is happening. That's the algorithm doing its thing. Trust the process.",
    spend: "$950/mo. This is where consistency pays off.",
  },
  {
    time: "Month 4–6",
    title: "Momentum Builds",
    desc: "Rankings start locking in. Phone starts ringing more. Lead volume becomes predictable. The content you published months ago starts compounding. Your cost per lead drops and keeps dropping.",
    reality: "Not every keyword wins on the first try. We adjust, pivot, and double down on what's working. Some pages rank fast, others take longer. The businesses that win are the ones that don't panic at month 3.",
    spend: "$950/mo. ROI starts becoming measurable.",
  },
  {
    time: "Month 6–12",
    title: "Domination — And the Haters Arrive",
    desc: "Top rankings locked in. Consistent leads every month. Competitors start noticing. You become the business to beat. Revenue compounds. Marketing spend as a percentage of revenue drops every quarter.",
    reality: "Here's what nobody tells you: when you start winning, the copycats come. Competitors copy your content, your strategy, your messaging. You'll get fake reviews from jealous competitors. Google will roll out updates that temporarily shake things up. This is the cost of being #1 — and we've seen it all.",
    spend: "By now, most clients spend under 10% of revenue on marketing. The machine runs itself.",
  },
  {
    time: "Year 2+",
    title: "Compounding Growth — The Payoff",
    desc: "This is where the 5–8% compounding growth kicks in hard. The content library you built generates traffic on autopilot. Your domain authority makes new pages rank faster. New competitors can't catch you because you have a 12-month head start they can't buy.",
    reality: "Marketing never stops. But the work gets easier and cheaper. The businesses that stay consistent for 2+ years are the ones that become untouchable in their market.",
    spend: "Same $950/mo — but generating 10x what it did in month 1.",
  },
];

export default function Process() {
  return (
    <section className="py-20 sm:py-28 bg-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Process
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            How Our NYC Marketing Company Gets You{" "}
            <span className="text-teal-600">Real Results — Honestly</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto">
            No fake promises. No &ldquo;page 1 in 30 days&rdquo; BS. Here&apos;s exactly what happens, what it costs, and what to really expect when you invest in <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">marketing for your NYC business</Link>.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: Timeline — 70% */}
          <div className="lg:w-[70%]">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-teal-300" />

              <div className="space-y-10">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.time}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="relative pl-14"
                  >
                    {/* Dot */}
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xs font-mono">{i + 1}</span>
                    </div>

                    <div>
                      <span className="text-teal-600 text-xs font-bold tracking-[0.1em] uppercase font-cta">{step.time}</span>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 mb-2 font-heading">
                        {step.title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed mb-3">{step.desc}</p>

                      {/* Reality check */}
                      <div className="rounded-lg bg-white border border-slate-200 p-4 mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-cta">Real Talk</p>
                        <p className="text-slate-600 text-sm leading-relaxed">{step.reality}</p>
                      </div>

                      {/* Spend */}
                      <p className="text-teal-600 text-xs font-semibold font-cta">
                        Investment: {step.spend}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Expectations sidebar — 30% */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-[30%]"
          >
            <div className="lg:sticky lg:top-32 space-y-6">
              {/* What to expect */}
              <div className="rounded-xl bg-white border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-4 font-heading">What to Actually Expect</h4>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    Month 1–2: Foundation. Not much visible yet.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    Month 3–4: Rankings move. Traffic grows.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    Month 5–6: Leads become consistent.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    Month 6–12: ROI becomes undeniable.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    Year 2+: Compounding growth kicks in.
                  </li>
                </ul>
              </div>

              {/* The BS we won't do */}
              <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                <h4 className="text-sm font-bold text-white mb-4 font-heading">What We Won&apos;t Do</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Guarantee page 1 rankings
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Promise results in 30 days
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Hide behind vanity metrics
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Lock you into a contract
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Outsource your work overseas
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Disappear after you sign
                  </li>
                </ul>
              </div>

              {/* The ugly truth */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 font-heading">The Ugly Truth About Success</h4>
                <p className="text-slate-600 text-sm leading-relaxed mb-3">
                  When you start dominating your market, competitors get desperate. Expect:
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>&bull; Copycats stealing your content</li>
                  <li>&bull; Fake 1-star reviews from competitors</li>
                  <li>&bull; Negative SEO attempts</li>
                  <li>&bull; Google algorithm shakeups</li>
                  <li>&bull; Haters in your inbox</li>
                </ul>
                <p className="text-slate-700 text-sm font-semibold mt-3">
                  We&apos;ve handled all of it. That&apos;s what a real marketing partner does.
                </p>
              </div>

              {/* CTA */}
              <Link
                href="/contact-nyc-marketing-company-consortium-nyc"
                className="block w-full text-center px-6 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Start With a Real Conversation
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
