"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { services } from "@/app/site/consortium-nyc/_lib/siteData";
import { type ReactNode } from "react";

const serviceImages: Record<string, { src: string; alt: string }> = {
  "search-engine-optimization-seo-nyc": { src: "/images/services/consortium-nyc-seo-services.png", alt: "SEO services for NYC businesses — keyword research, link building, and local search optimization" },
  "web-design-nyc": { src: "/images/services/consortium-nyc-web-design-services.png", alt: "Web design services for NYC businesses — responsive websites on desktop, tablet, and mobile" },
  "brand-strategy-identity-in-nyc": { src: "/images/services/consortium-nyc-branding-services.png", alt: "Brand identity and strategy services for NYC businesses — build your brand" },
  "analytics-technology-in-nyc": { src: "/images/services/consortium-nyc-ai-automation-services.png", alt: "AI automation and technology services for NYC businesses — robotic process automation" },
  "business-strategy-consulting-in-nyc": { src: "/images/services/consortium-nyc-marketing-strategy-services.png", alt: "Marketing strategy and consulting services for NYC businesses" },
  "marketing-manager-consulting-in-nyc": { src: "/images/services/consortium-nyc-marketing-manager-services.png", alt: "Outsourced marketing manager services for NYC businesses" },
};

const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

const deepDiveContent: Record<
  string,
  { headline: string; paragraphs: ReactNode[] }
> = {
  "search-engine-optimization-seo-nyc": {
    headline: "SEO That Brings Local Customers to Your Door",
    paragraphs: [
      <span key="seo1">When someone in your neighborhood searches for a <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist</L>, <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurant</L>, or <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC company</L> — you need to be the first name they see. Our <L href="/nyc-marketing-company-services-list">SEO strategies</L> are built from the ground up around one question: how do we get your local business found by customers who are ready to buy? We start with aggressive competitive analysis to find the gaps your competitors are leaving wide open, then we exploit them with technical optimization, conversion-focused content, and authority-building backlinks.</span>,
      <span key="seo2">For local businesses in <L href="/services-areas-we-offer-marketing-services-in">NYC, Long Island, and Westchester</L>, local SEO is a battleground. You&apos;re competing against hundreds of businesses for the same &apos;near me&apos; searches. We&apos;ve put <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbers on page one in Brooklyn</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentists at the top of Queens searches</L>, and <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants dominating their neighborhood results</L> — and kept them there. Our local SEO playbook includes <L href="/nyc-marketing-company-services-list">Google Business Profile domination</L>, hyper-local content strategies, and citation building that establishes your authority in every neighborhood you serve. All for <L href="/nyc-marketing-pricing-guide">$950/month</L>.</span>,
      <span key="seo3">SEO doesn&apos;t work in a vacuum. Every ranking we earn feeds your <L href="/nyc-marketing-company-services-list">website conversion rates</L>, strengthens your reputation, and fills your phone with calls from real customers. That&apos;s the <L href="/about-digital-marketing-agency-consortium-nyc">The NYC Marketing Company difference</L> — SEO as part of an integrated system that turns searches into revenue. See our <L href="/nyc-marketing-company-portfolio">real results</L> or <L href="/contact-nyc-marketing-company-consortium-nyc">schedule a free strategy session</L>.</span>,
    ],
  },
  "web-design-nyc": {
    headline: "Websites That Turn Visitors Into Customers",
    paragraphs: [
      <span key="web1">A beautiful website that doesn&apos;t generate leads is an expensive digital brochure. We build websites for <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service businesses</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L>, <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, <L href="/industries-we-offer-marketing-services-for/landscaping-company-marketing">landscapers</L>, <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">law firms</L> — engineered for conversion from the first wireframe. Every layout decision, every call-to-action placement, every page flow is informed by data. Custom websites starting at <L href="/nyc-marketing-pricing-guide">$4,600</L>.</span>,
      <span key="web2">Speed matters. Our sites load in under 2 seconds, score 90+ on Core Web Vitals, and are built with <L href="/nyc-marketing-company-services-list">SEO architecture</L> baked into every page. For local businesses competing in <L href="/services-areas-we-offer-marketing-services-in">NYC, Long Island, and Westchester</L>, your website is often the first impression a potential customer has of your business. We make sure that impression converts. Mobile-first design isn&apos;t optional — over 70% of local searches happen on phones, and our responsive builds are tested across every device.</span>,
      <span key="web3">Your website connects directly to your <L href="/nyc-marketing-company-services-list">SEO rankings</L> and integrates with your booking and lead capture systems. When a local customer lands on your site, they enter a conversion ecosystem — not a dead end. From lead capture forms to click-to-call buttons to online booking, every element works together. See how it all fits into our <L href="/nyc-marketing-pricing-guide">marketing packages</L> or check out <L href="/nyc-marketing-company-portfolio">websites we&apos;ve built</L>.</span>,
    ],
  },
  "brand-strategy-identity-in-nyc": {
    headline: "Brand Identity That Makes You the Obvious Choice",
    paragraphs: [
      <span key="brand1">When a homeowner needs a <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L> or a patient needs a <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist</L>, they pick the business that looks the most trustworthy and professional. Your brand is the reason someone picks you over the competitor down the block. We build brands for <L href="/industries-we-offer-marketing-services-for">100+ industries</L> that cut through noise — visual identities, messaging, and brand voices that make customers stop scrolling and start calling.</span>,
      <span key="brand2">Our <L href="/nyc-marketing-company-services-list">branding process</L> starts with strategy, not aesthetics. We dig into your local market positioning, your competitive landscape, and what your customers actually care about before we touch a single design file. The result is a brand identity that communicates trust instantly — whether someone finds you on Google, sees your truck, or visits your <L href="/nyc-marketing-company-services-list">website</L>. For local businesses in <L href="/services-areas-we-offer-marketing-services-in">NYC, Long Island, and Westchester</L>, a strong brand is the foundation of every other marketing effort.</span>,
      <span key="brand3">Your brand amplifies every other service we provide. A strong visual identity increases click-through rates, boosts <L href="/nyc-marketing-company-services-list">website conversions</L>, and makes your business more memorable. When your branding, website, and <L href="/nyc-marketing-company-services-list">SEO</L> all speak the same language, the compounding effect on leads and revenue is massive. Read about <L href="/whats-working-in-marketing">what&apos;s working in marketing</L> right now.</span>,
    ],
  },
  "business-strategy-consulting-in-nyc": {
    headline: "A Clear Plan to Get More Local Customers",
    paragraphs: [
      <span key="strat1">Most agencies skip strategy and jump straight to tactics. That&apos;s why most agencies fail. We start every engagement with deep local market research — analyzing the other <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbers</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentists</L>, or <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L> in your area, mapping how your customers search, and building a roadmap that turns your marketing dollars into real leads. No guesswork. No gut feelings. Just data from your actual market.</span>,
      <span key="strat2">The <L href="/services-areas-we-offer-marketing-services-in">NYC metro area</L> is uniquely complex. A homeowner searching for <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC repair in Queens</L> behaves differently than one in <L href="/services-areas-we-offer-marketing-services-in">Westchester</L>. A <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurant in Brooklyn</L> faces different competition than one on <L href="/services-areas-we-offer-marketing-services-in">Long Island</L>. Our strategies account for these nuances with hyper-targeted approaches for each neighborhood and market segment. We develop custom KPIs that map directly to your business goals — not vanity metrics.</span>,
      <span key="strat3">Digital strategy is the connective tissue between all our <L href="/nyc-marketing-company-services-list">services</L>. It determines which local keywords drive the most calls, how your website should convert visitors, and where <L href="/artificial-intelligence-marketing-services-offered">AI automation</L> can save you time. Without strategy, you&apos;re just throwing money at tactics and hoping something sticks. See our <L href="/nyc-marketing-pricing-guide">transparent pricing</L> or <L href="/contact-nyc-marketing-company-consortium-nyc">schedule a strategy session</L>.</span>,
    ],
  },
  "marketing-manager-consulting-in-nyc": {
    headline: "Your Outsourced Marketing Department",
    paragraphs: [
      <span key="mgr1">Traffic without a system to capture and convert it is wasted traffic. We build lead capture systems for <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service businesses</L>, <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC companies</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L>, <L href="/industries-we-offer-marketing-services-for/landscaping-company-marketing">landscapers</L>, <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">law firms</L> — that turn website visitors into phone calls, form submissions, and booked appointments. Every lead gets captured and routed to you at exactly the right moment.</span>,
      <span key="mgr2">For <L href="/industries-we-offer-marketing-services-for">service businesses</L> across <L href="/services-areas-we-offer-marketing-services-in">NYC, Long Island, and Westchester</L>, we&apos;ve built systems that generate consistent new customers month after month. Landing pages optimized for your specific services and neighborhoods, follow-up sequences that build trust, and simple CRM workflows that make sure no lead falls through the cracks. You focus on doing the work — we make sure the phone keeps ringing.</span>,
      <span key="mgr3">Your outsourced marketing manager ties directly into your <L href="/nyc-marketing-company-services-list">website</L> (where leads convert), your <L href="/nyc-marketing-company-services-list">SEO</L> (which drives traffic), and your <L href="/nyc-marketing-company-services-list">brand</L> (which builds trust). When these systems work together, your cost per new customer drops and your revenue grows predictably. That&apos;s how we&apos;ve helped local businesses generate over <L href="/nyc-marketing-company-portfolio">$15.2M in attributable revenue</L>.</span>,
    ],
  },
  "analytics-technology-in-nyc": {
    headline: "AI Automation That Runs Your Business While You Sleep",
    paragraphs: [
      <span key="auto1">You didn&apos;t start your <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbing company</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practice</L>, or <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurant</L> to spend your days chasing leads and sending follow-up emails. Our <L href="/artificial-intelligence-marketing-services-offered">AI automation systems</L> handle lead follow-up, appointment scheduling, review requests, and workflow management — so you can focus on serving customers. We&apos;ve saved local business owners over 20 hours per week with intelligent automation that runs 24/7.</span>,
      <span key="auto2">When a potential customer fills out your contact form or requests a quote, automation kicks in immediately — sending a confirmation, notifying your team, and following up if they don&apos;t respond. No more lost leads because you were on a job site or with a patient. For busy <L href="/industries-we-offer-marketing-services-for">local business owners</L> across <L href="/services-areas-we-offer-marketing-services-in">NYC and Long Island</L> who can&apos;t be glued to their phone all day, this is a game-changer.</span>,
      <span key="auto3"><L href="/artificial-intelligence-marketing-services-offered">AI automation</L> is the force multiplier for every other service. Your <L href="/nyc-marketing-company-services-list">SEO</L> generates leads — automation follows up. Your <L href="/nyc-marketing-company-services-list">website</L> captures information — automation routes it to you instantly. This is how small local businesses compete with big chains without hiring a big staff. See <L href="/nyc-marketing-pricing-guide">what it costs</L> or <L href="/contact-nyc-marketing-company-consortium-nyc">talk to us about automation</L>.</span>,
    ],
  },
};

export default function ServiceDeepDives() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            SEO, Web Design &amp; Branding
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            How We Grow Businesses Across{" "}
            <span className="text-teal-600">NYC, Long Island &amp; Beyond</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto">
            Every service is designed to amplify the others. <L href="/nyc-marketing-company-services-list">SEO</L> feeds your website. Your website feeds your pipeline. Your pipeline feeds your revenue. See how our <L href="/nyc-marketing-pricing-guide">marketing packages</L> work together or explore <L href="/industries-we-offer-marketing-services-for">100+ industries we serve</L>.
          </p>
        </motion.div>

        {/* Alternating blocks */}
        <div className="space-y-24">
          {services.map((service, i) => {
            const content = deepDiveContent[service.slug];
            if (!content) return null;
            const isEven = i % 2 === 0;

            return (
              <motion.div
                key={service.slug}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col lg:flex-row gap-10 lg:gap-16 items-start ${
                  isEven ? "" : "lg:flex-row-reverse"
                }`}
              >
                {/* Text block */}
                <div className="flex-1">
                  <span className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-3 block">
                    {service.name}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading">
                    {content.headline}
                  </h3>
                  <div className="space-y-4">
                    {content.paragraphs.map((p, j) => (
                      <p key={j} className="text-slate-600 leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-block mt-8 px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta"
                  >
                    Get Started with {service.name}
                  </Link>
                </div>

                {/* Service image */}
                <div className="flex-1 w-full">
                  {serviceImages[service.slug] ? (
                    <Image
                      src={serviceImages[service.slug].src}
                      alt={serviceImages[service.slug].alt}
                      width={560}
                      height={420}
                      className="w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <span className="text-slate-300 text-sm font-medium">
                        {service.name} Visual
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
