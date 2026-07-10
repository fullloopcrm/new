"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, type ReactNode } from "react";
import Link from "next/link";

const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "How much does a marketing company in NYC cost?",
    answer: <span>Our <L href="/nyc-marketing-pricing-guide">pricing</L> is transparent and built for real small businesses. Custom websites start at $4,600. Monthly <L href="/nyc-marketing-company-services-list">SEO</L> is $950/month. Hourly consulting ranges from $100–$250/hr depending on scope. No hidden fees, no surprise invoices. We walk you through exactly what you get during your <L href="/contact-nyc-marketing-company-consortium-nyc">free strategy session</L>. Every dollar has a reason behind it.</span>,
  },
  {
    question: "How long does SEO take to work for NYC businesses?",
    answer: <span>Honestly, 3–6 months for meaningful results. Competitive industries in <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L> or <L href="/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing">personal injury law</L> can take longer. Less competitive niches in <L href="/services-areas-we-offer-marketing-services-in/staten-island-marketing-company">Staten Island</L> or <L href="/services-areas-we-offer-marketing-services-in/westchester-marketing-company">Westchester</L> often see faster wins. We provide monthly reporting from day one so you can track every improvement. Anyone promising page 1 in 30 days is lying. Read more about <L href="/whats-working-in-marketing">what&apos;s actually working in marketing</L> right now.</span>,
  },
  {
    question: "Do you require long-term contracts?",
    answer: <span>No. We never lock you into contracts — because that only benefits the one trying to lock you in. Most <L href="/nyc-marketing-company-services-list">SEO</L> clients stay 12+ months because the results compound over time, not because they&apos;re trapped. We earn your business every single month. If we&apos;re not delivering, you should leave. See our <L href="/nyc-marketing-pricing-guide">pricing structure</L> for details.</span>,
  },
  {
    question: "What areas in NYC do you serve?",
    answer: <span>All five boroughs — <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L>, <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L>, <L href="/services-areas-we-offer-marketing-services-in/queens-marketing-company">Queens</L>, <L href="/services-areas-we-offer-marketing-services-in/bronx-marketing-company">The Bronx</L>, <L href="/services-areas-we-offer-marketing-services-in/staten-island-marketing-company">Staten Island</L> — plus <L href="/services-areas-we-offer-marketing-services-in/long-island-marketing-company">Long Island</L> (Nassau &amp; Suffolk), <L href="/services-areas-we-offer-marketing-services-in/westchester-marketing-company">Westchester County</L>, and <L href="/services-areas-we-offer-marketing-services-in/jersey-city-marketing-company">Northern New Jersey</L>. We serve <L href="/services-areas-we-offer-marketing-services-in">80+ neighborhoods</L> with hyper-local strategies built for each market&apos;s specific competition and search behavior.</span>,
  },
  {
    question: "What industries do you work with?",
    answer: <span>We&apos;ve served <L href="/industries-we-offer-marketing-services-for">100+ industries</L> over 25 years. Our biggest verticals are <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home services</L>, <L href="/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing">law firms</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L>, <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, <L href="/industries-we-offer-marketing-services-for/real-estate-agent-marketing">real estate</L>, <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC</L>, <L href="/industries-we-offer-marketing-services-for/roofing-company-marketing">roofing</L>, and <L href="/industries-we-offer-marketing-services-for/contractor-marketing">contractors</L>. But if people search for it on Google, we can rank it. Our data-driven approach works across verticals because we build from actual market data, not templates.</span>,
  },
  {
    question: "What makes The NYC Marketing Company different from other marketing companies?",
    answer: <span>You work directly with someone who has 25 years of experience in the exact seat they sit in. No junior account managers, no layers, no runaround. We pick up the phone. We respond same-day. We don&apos;t outsource your work overseas. We don&apos;t lock you into contracts. And we show you <L href="/nyc-marketing-company-portfolio">real results from real businesses</L> — not stock photo case studies. Read more <L href="/about-digital-marketing-agency-consortium-nyc">about us</L>.</span>,
  },
  {
    question: "Do you build websites or just do SEO?",
    answer: <span>Both — and they&apos;re built to work together. Our <L href="/nyc-marketing-company-services-list">custom websites</L> start at $4,600 and are engineered for speed, SEO, and conversion from day one. Every site scores 90+ on Core Web Vitals, is mobile-first, and includes SEO architecture baked in. We also redesign existing sites that look good but don&apos;t generate leads. Your <L href="/nyc-marketing-company-services-list">website</L> is the foundation — <L href="/nyc-marketing-company-services-list">SEO</L> drives the traffic to it.</span>,
  },
  {
    question: "What is local SEO and why does my NYC business need it?",
    answer: <span>Local SEO optimizes your visibility for searches like &ldquo;<L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber near me</L>&rdquo; or &ldquo;<L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">best dentist in Brooklyn</L>.&rdquo; It includes <L href="/nyc-marketing-company-services-list">Google Business Profile optimization</L>, local citations, review management, and geo-targeted content. If your customers come from a specific area — and in NYC they absolutely do — local SEO is how they find you instead of your competitor. See our <L href="/nyc-marketing-company-portfolio">results</L> for proof.</span>,
  },
  {
    question: "How do you measure success and report results?",
    answer: <span>We track what matters: organic traffic, keyword rankings, lead volume, conversion rates, and revenue impact. You get a transparent monthly report with real data. No vanity metrics, no fluff — just numbers tied to your bottom line. We also show you exactly what we did that month and what we&apos;re doing next. If something isn&apos;t working, we tell you and pivot. That&apos;s what <L href="/nyc-marketing-pricing-guide">$950/month</L> gets you.</span>,
  },
  {
    question: "Can you help with Google Business Profile optimization?",
    answer: <span>Yes — it&apos;s one of the most impactful things we do for <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">local service businesses</L>. Your Google Business Profile is often the first thing customers see. We optimize every field, manage your reviews, post updates, and build local citations that strengthen your <L href="/nyc-marketing-company-services-list">map pack rankings</L>. For <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbers</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentists</L>, and any business with a physical location — GBP optimization is non-negotiable.</span>,
  },
  {
    question: "Do you offer AI automation and chatbots for businesses?",
    answer: <span>Yes. Our <L href="/artificial-intelligence-marketing-services-offered">AI automation services</L> handle lead follow-up, appointment scheduling, review requests, and customer communication 24/7. We build custom chatbots and AI agents that qualify leads, answer questions, and book appointments while you sleep. This is how small businesses compete with big chains without hiring a big staff. See our <L href="/nyc-marketing-pricing-guide">pricing tiers</L> that include AI services.</span>,
  },
  {
    question: "What does your onboarding process look like?",
    answer: <span>After your <L href="/contact-nyc-marketing-company-consortium-nyc">free strategy session</L>, onboarding takes less than a week. We conduct a full audit of your digital presence, perform competitive research, and deliver a strategic roadmap within the first two weeks. Implementation starts immediately — no wasted time. You&apos;ll have direct access to your strategist from day one. No layers, no handoffs.</span>,
  },
  {
    question: "Can you help my business rank on Google Maps?",
    answer: <span>That&apos;s one of our specialties. Google Maps (the local map pack) is where most <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service</L> and <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">local business</L> leads come from. We optimize your Google Business Profile, build local citations across 80+ directories, manage your reviews, and create hyper-local content targeting every <L href="/services-areas-we-offer-marketing-services-in">neighborhood you serve</L>. The result: your business showing up in the map pack when customers search nearby.</span>,
  },
  {
    question: "How do I know if my current marketing company is doing a good job?",
    answer: <span>Ask them three questions: What keywords am I ranking for? How many leads did marketing generate last month? What&apos;s my cost per lead? If they can&apos;t answer with specific numbers, that&apos;s your answer. We offer a <L href="/contact-nyc-marketing-company-consortium-nyc">free honest audit</L> — we&apos;ll tell you exactly where you stand, what&apos;s working, what&apos;s not, and what your competitors are doing. No obligation, no pitch.</span>,
  },
  {
    question: "What is the ROI of SEO for a local NYC business?",
    answer: <span>It varies by industry, but here&apos;s reality: our clients typically see 5–8% compounding growth year over year. By years 3–5, most spend under 10% of revenue on marketing. A <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L> investing $950/month in SEO who gets 30 leads/month at a $500 average job value is generating $15K/month from a $950 investment. That&apos;s a 15:1 ROI. See <L href="/nyc-marketing-company-portfolio">real numbers from real businesses</L> we work with.</span>,
  },
  {
    question: "Do you work with startups or only established businesses?",
    answer: <span>Both. We&apos;ve launched multiple startups from zero — <L href="/nyc-marketing-company-portfolio">Moodap&trade;</L> hit 2,000 page 1 rankings in 2 months. The NYC Classifieds got 10+ page 1 rankings in under 10 days. Startups need smart SEO architecture from day one so they&apos;re not rebuilding later. We build the foundation right the first time. See our <L href="/nyc-marketing-pricing-guide">pricing</L> — it&apos;s built for businesses at every stage.</span>,
  },
  {
    question: "What CMS or technology do you build websites on?",
    answer: <span>We build on Next.js, React, and Tailwind CSS — hosted on <L href="/nyc-marketing-company-services-list">Vercel</L> with Supabase for databases and Resend for email. No WordPress, no page builders, no bloat. Our sites load in under 2 seconds and score 90+ on Core Web Vitals because they&apos;re custom-coded, not dragged and dropped. This is the same tech stack used by Fortune 500 companies — and we bring it to local businesses.</span>,
  },
  {
    question: "How do I get started with The NYC Marketing Company?",
    answer: <span><L href="/contact-nyc-marketing-company-consortium-nyc">Schedule a free strategy session</L>. We&apos;ll review your current situation, audit your competitors, and give you a clear roadmap — whether you hire us or not. No pitch decks, no pressure. Just a real conversation about what it takes to win in your market. You can also call us directly at (212) 202-9220. We pick up the phone.</span>,
  },
];

export default function ExpandedFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const midpoint = Math.ceil(faqs.length / 2);
  const leftColumn = faqs.slice(0, midpoint);
  const rightColumn = faqs.slice(midpoint);

  const renderFAQ = (faq: typeof faqs[0], i: number, globalIndex: number) => {
    const isOpen = openIndex === globalIndex;
    return (
      <motion.div
        key={globalIndex}
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: (i % 5) * 0.05 }}
        className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
      >
        <button
          onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-slate-900 font-semibold text-sm pr-4 font-heading">
            {faq.question}
          </span>
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
                <p className="text-slate-600 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

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
            Marketing Company FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Frequently Asked Questions About{" "}
            <span className="text-teal-600">Hiring a NYC Marketing Company</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto">
            Honest answers to the most common questions about working with a marketing company in New York City. From <L href="/nyc-marketing-pricing-guide">pricing</L> and contracts to <L href="/nyc-marketing-company-services-list">services</L>, timelines, and what to realistically expect. No BS.
          </p>
        </motion.div>

        {/* Two-column accordion */}
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="space-y-3">
            {leftColumn.map((faq, i) => renderFAQ(faq, i, i))}
          </div>
          <div className="space-y-3">
            {rightColumn.map((faq, i) => renderFAQ(faq, i, i + midpoint))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-14"
        >
          <p className="text-slate-600 text-lg mb-6">
            Still have questions? We pick up the phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact-nyc-marketing-company-consortium-nyc"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Schedule a Free Strategy Session
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
  );
}
