// @ts-nocheck
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import { BrandLink } from "@/app/site/the-nyc-marketing-company/_lib/brand";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

/* ------------------------------------------------------------------ */
/*  Values data                                                        */
/* ------------------------------------------------------------------ */
const values = [
  {
    title: "Data-Driven",
    description:
      "Every decision we make is backed by real analytics and market research. No guesswork, no gut feelings -- just measurable insights that drive strategy.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Results-Focused",
    description:
      "We don't chase vanity metrics. Our focus is on the numbers that actually move the needle for your business -- revenue, leads, and market share.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: "Transparent",
    description:
      "No black boxes. You'll always know exactly what we're doing, why we're doing it, and what results we're seeing. Full reporting, full access, always.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Innovative",
    description:
      "Digital marketing evolves fast. We stay ahead of the curve with cutting-edge tools, AI-driven automation, and strategies that give you a competitive edge.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Process steps                                                      */
/* ------------------------------------------------------------------ */
const processSteps = [
  {
    step: "01",
    title: "Discovery",
    description:
      "We audit your current digital presence, analyze your competitors, and identify the gaps and opportunities in your market.",
  },
  {
    step: "02",
    title: "Strategy",
    description:
      "We build a custom roadmap tailored to your business goals, budget, and timeline -- no cookie-cutter templates.",
  },
  {
    step: "03",
    title: "Execute",
    description:
      "Our team implements the strategy with precision -- from technical SEO to brand design to automation workflows.",
  },
  {
    step: "04",
    title: "Optimize",
    description:
      "We continuously monitor performance, A/B test, and refine every element to maximize your ROI month over month.",
  },
];

/* ================================================================== */
/*  ABOUT PAGE                                                         */
/* ================================================================== */
export default function AboutPage() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "About Consortium NYC (Now The NYC Marketing Company)",
          "Learn about Consortium NYC (Now The NYC Marketing Company), a data-driven NYC marketing company. We help businesses across NYC, Long Island, and Westchester grow with SEO, branding, web design, and automation.",
          "https://www.thenycmarketingcompany.com/about"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.thenycmarketingcompany.com" },
          { name: "About", url: "https://www.thenycmarketingcompany.com/about" },
        ])}
      />

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-6 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full bg-violet/20 blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-electric/20 blur-3xl animate-blob animation-delay-2000" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            Built <span className="gradient-text">Different</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg sm:text-xl text-warm-gray max-w-2xl mx-auto"
          >
            A data-driven NYC marketing company born in New York City.
            We don&apos;t follow playbooks -- we write them.
          </motion.p>
        </div>
      </section>

      <TipBlurb
        tip={<>Most agencies hide behind <strong>layers of account managers</strong> and you never talk to the person doing the work. Here, you talk directly to the person with <strong>25 years of experience</strong>. No middlemen. No runaround.</>}
      />

      {/* ============================================================ */}
      {/*  OUR STORY                                                   */}
      {/* ============================================================ */}
      <section className="py-24 sm:py-32 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-bold">
              Our <span className="gradient-text">Story</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6 text-warm-gray text-lg leading-relaxed"
          >
            <p>
              <BrandLink /> was founded with a simple belief: digital marketing
              should be measurable, transparent, and relentlessly focused on
              results. Too many agencies hide behind jargon and vanity metrics.
              We built something different -- an agency where every strategy is
              rooted in data, every campaign is tied to real business outcomes,
              and every client knows exactly where their investment is going.
            </p>
            <p>
              Based in the heart of New York City, we work with businesses
              across all five boroughs, Long Island, and Westchester County.
              From local service providers looking to dominate their neighborhood
              in search, to growing brands ready to scale across the tri-state
              area, we bring the same intensity and precision to every project.
              We understand the competitive landscape of the New York market
              because we live and operate in it every day.
            </p>
            <p>
              Our team combines deep expertise in SEO, web design, branding,
              business development, and marketing automation to build integrated
              growth systems -- not one-off campaigns. We think long-term,
              execute fast, and obsess over the details that actually move the
              needle. If you are looking for an agency that treats your business
              like their own, you are in the right place.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  VALUES                                                      */}
      {/* ============================================================ */}
      <section className="py-24 sm:py-32 px-6 bg-charcoal/50">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold">
              What We <span className="gradient-text">Stand For</span>
            </h2>
            <p className="mt-4 text-warm-gray text-lg max-w-xl mx-auto">
              The principles that guide every decision we make.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="gradient-border bg-midnight p-8 rounded-xl"
              >
                <div className="text-electric mb-4">{value.icon}</div>
                <h3 className="text-xl font-semibold text-cream mb-2">
                  {value.title}
                </h3>
                <p className="text-warm-gray leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  OUR APPROACH / PROCESS                                      */}
      {/* ============================================================ */}
      <section className="py-24 sm:py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold">
              Our <span className="gradient-text">Approach</span>
            </h2>
            <p className="mt-4 text-warm-gray text-lg max-w-xl mx-auto">
              A proven process that turns strategy into measurable growth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="gradient-border bg-charcoal p-8 rounded-xl relative"
              >
                <span className="text-5xl font-bold text-white/[0.05] absolute top-4 right-6">
                  {step.step}
                </span>
                <div className="mb-4">
                  <span className="text-sm font-mono text-electric uppercase tracking-wider">
                    Step {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-cream mb-3">
                  {step.title}
                </h3>
                <p className="text-warm-gray text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <section className="py-24 sm:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-dim/20 via-midnight to-electric/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold">
            Ready to Work With a Team That{" "}
            <span className="gradient-text">Gets It</span>?
          </h2>
          <p className="mt-6 text-warm-gray text-lg max-w-xl mx-auto">
            Let&apos;s talk about your goals and build a strategy that actually
            delivers. No fluff, no long-term contracts -- just results.
          </p>
          <div className="mt-10">
            <Link
              href="https://www.thenycmarketingcompany.com/contact"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-electric via-violet to-hot-pink px-10 py-5 text-lg font-semibold text-midnight transition-transform hover:scale-105"
            >
              Get Your Free Consultation
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}