"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function WhatIsDigitalMarketing() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Guide
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
              What Is Marketing? A 2026 Guide for{" "}
              <span className="text-teal-600">NYC &amp; Long Island Businesses</span>
          </h2>
          <p className="text-slate-600 text-lg">
            Everything you need to know about growing your business online. Read our full <Link href="/nyc-marketing-101-guide" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Marketing 101 guide</Link> or explore <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">our services</Link> — from
            a team that does it every single day.
          </p>
        </motion.div>

        <div className="space-y-12 text-slate-600 leading-relaxed">
          {/* Section 1 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              Digital Marketing in 2026: More Critical Than Ever
            </h3>
            <p className="mb-4">
              Digital marketing is the practice of reaching, engaging, and
              converting customers through online channels — search engines,
              social media, email, paid advertising, content, and your website
              itself. It&apos;s not a nice-to-have anymore. In 2026, it&apos;s the
              foundation of every successful business strategy.
            </p>
            <p className="mb-4">
              Here&apos;s the reality: 93% of all online experiences start with a
              search engine. 81% of consumers research online before making a
              purchase. If your business isn&apos;t showing up when people search for
              what you sell, you&apos;re handing customers to your competitors. Every
              single day.
            </p>
            <p>
              For NYC businesses specifically, the stakes are even higher. You&apos;re
              competing in one of the most saturated, aggressive markets on the
              planet. There are 230,000+ small businesses in New York City alone.
              The ones that win? They&apos;re the ones with a digital marketing
              strategy that actually works.
            </p>
          </motion.div>

          {/* Section 2 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              How AI and Search Changes Affect NYC Businesses
            </h3>
            <p className="mb-4">
              Google has fundamentally changed. AI Overviews, Search Generative
              Experience, and zero-click searches now dominate the results page.
              In 2026, nearly 65% of Google searches result in zero clicks —
              meaning users get their answer without ever visiting a website.
            </p>
            <p className="mb-4">
              What does this mean for your business? It means old-school SEO is
              dead. Stuffing keywords into a blog post and hoping for the best
              doesn&apos;t cut it anymore. You need a strategy built for the AI era:
              structured data, topical authority, E-E-A-T signals, and content
              that Google&apos;s AI wants to surface.
            </p>
            <p>
              Local search has evolved too. Google Business Profiles, local pack
              rankings, and review signals carry more weight than ever. For a
              business in Manhattan, Brooklyn, Queens, or anywhere in the five
              boroughs, local SEO isn&apos;t optional — it&apos;s survival.
            </p>
          </motion.div>

          {/* Section 3 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              The Key Channels That Drive Real Results
            </h3>
            <p className="mb-4">
              <strong className="text-teal-600">
                Search Engine Optimization (SEO):
              </strong>{" "}
              The highest-ROI digital marketing channel, period. Organic search
              drives 53% of all website traffic and produces leads that convert
              at 14.6% — compared to 1.7% for outbound methods. SEO compounds
              over time. Every month you invest, your returns grow.
            </p>
            <p className="mb-4">
              <strong className="text-teal-600">
                Paid Advertising (PPC):
              </strong>{" "}
              Google Ads and Meta Ads put you in front of buyers immediately.
              While SEO builds your foundation, paid ads deliver revenue now.
              The average ROI on Google Ads is 200% — $2 back for every $1
              spent. When managed properly, paid media is a cash machine.
            </p>
            <p className="mb-4">
              <strong className="text-teal-600">Social Media Marketing:</strong>{" "}
              Brand awareness, community building, and direct response — all in
              one channel. In 2026, short-form video dominates, but strategic
              organic content and paid social still drive massive results for
              local businesses.
            </p>
            <p className="mb-4">
              <strong className="text-slate-900">Email Marketing:</strong>{" "}
              Still the highest ROI channel dollar for dollar — $36 for every $1
              spent. Email nurtures leads, drives repeat purchases, and keeps
              your brand top of mind. If you&apos;re not building a list, you&apos;re
              leaving money on the table.
            </p>
            <p className="mb-4">
              <strong className="text-slate-900">Content Marketing:</strong>{" "}
              Authority-building content positions you as the expert in your
              industry. Blog posts, case studies, videos, and guides that answer
              your customers&apos; questions before they even pick up the phone.
            </p>
            <p>
              <strong className="text-slate-900">Web Design &amp; Development:</strong>{" "}
              Your website is your 24/7 salesperson. If it&apos;s slow, ugly, or
              confusing, you&apos;re losing customers every day. A conversion-optimized
              website built on modern tech (like Next.js) is the foundation
              everything else is built on.
            </p>
          </motion.div>

          {/* Section 4 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              Why Integrated Strategies Beat Single-Channel Approaches
            </h3>
            <p className="mb-4">
              Businesses that use three or more digital marketing channels see
              287% higher purchase rates than single-channel businesses. That&apos;s
              not a typo. The data is overwhelming: integrated strategies
              dominate.
            </p>
            <p className="mb-4">
              Think about how your customers actually behave. They might discover
              you through a Google search, check your reviews, visit your
              Instagram, read a blog post, then finally call you two weeks later.
              That&apos;s five touchpoints across four channels — and if you&apos;re only
              investing in one, you&apos;re missing the other three chances to close
              the deal.
            </p>
            <p>
              An integrated strategy means every channel reinforces the others.
              SEO drives organic traffic. Paid ads capture high-intent searches.
              Email nurtures the leads that aren&apos;t ready to buy yet. Social
              builds trust. Content establishes authority. Together, they create
              a system that generates revenue predictably and at scale.
            </p>
          </motion.div>

          {/* Section 5 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              How Local Businesses in NYC, Long Island &amp; Westchester Can Win
            </h3>
            <p className="mb-4">
              The NYC metro area — including Long Island, Westchester, and
              northern New Jersey — is home to over 20 million people. That&apos;s one
              of the largest addressable markets in the world, and it&apos;s sitting
              right outside your door.
            </p>
            <p className="mb-4">
              Local digital marketing is the great equalizer. A well-optimized
              local business can outrank national chains in Google Maps and local
              search results. We&apos;ve seen it happen hundreds of times: a
              restaurant in Astoria outranking Yelp. A law firm in Midtown
              dominating Google&apos;s local pack. A contractor on Long Island
              generating 40+ leads per month from organic search alone.
            </p>
            <p className="mb-4">
              The playbook for local businesses in 2026 is clear: optimize your
              Google Business Profile, build real reviews from real customers,
              create location-specific content, earn local backlinks, and invest
              in a website that converts visitors into calls and form
              submissions.
            </p>
            <p>
              That&apos;s exactly what The NYC Marketing Company does. We&apos;ve been doing it for
              over a decade, exclusively for businesses in the New York metro
              area. We know this market because we live in it, work in it, and
              dominate it — every day.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-16"
        >
          <Link
            href="/contact"
            className="inline-block px-10 py-4 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-500 transition-colors duration-300 font-cta"
          >
            Ready to Dominate Digital? Talk to Us.
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
