"use client";

import { useState, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import Link from "next/link";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";

/* ── Inner link helper ───────────────────────────────────────── */
const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-teal-600 underline underline-offset-2 hover:text-teal-700">{children}</Link>
);

/* ── Animated counter ────────────────────────────────────────── */
function CountUp({ value, suffix, inView }: { value: number; suffix?: string; inView: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState("0");
  useState(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  });
  return <span>{display}{suffix}</span>;
}

/* ── FAQ Category defs ───────────────────────────────────────── */
const categories = [
  { id: "seo", label: "SEO & Rankings" },
  { id: "pricing", label: "Pricing & Costs" },
  { id: "web", label: "Web Design" },
  { id: "local", label: "Local & Maps" },
  { id: "gbp", label: "Google Business Profile" },
  { id: "industries", label: "Industries" },
  { id: "areas", label: "Service Areas" },
  { id: "branding", label: "Branding" },
  { id: "ai", label: "AI & Automation" },
  { id: "process", label: "Process & Reporting" },
  { id: "technical", label: "Technical" },
  { id: "general", label: "General" },
];

/* ── 100 FAQs — all unique, not on home page ────────────────── */
const faqs: { category: string; question: string; answer: ReactNode }[] = [
  // ─── SEO & Rankings (1–10) ───
  {
    category: "seo",
    question: "How much does SEO cost for a small business in NYC?",
    answer: <span>Monthly <L href="/nyc-marketing-company-services-list">SEO</L> for NYC small businesses starts at <L href="/nyc-marketing-pricing-guide">$950/month</L> with The NYC Marketing Company. The NYC average is $2,000–$5,000/month. Our pricing includes technical SEO, content optimization, <L href="/nyc-marketing-company-services-list">local SEO</L>, Google Business Profile management, link building, and monthly reporting. Every dollar goes to work that moves your rankings.</span>,
  },
  {
    category: "seo",
    question: "What is the difference between local SEO and national SEO for NYC businesses?",
    answer: <span>Local SEO targets geographic searches like &ldquo;<L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber in Brooklyn</L>&rdquo; through Google Business Profile, local citations, and neighborhood content. National SEO targets broader terms without geographic intent. For most <L href="/industries-we-offer-marketing-services-for">NYC service businesses</L>, local SEO delivers a higher ROI because your customers search by neighborhood. Read our <L href="/the-marketing-blog/local-seo-vs-national-seo">local vs. national SEO guide</L>.</span>,
  },
  {
    category: "seo",
    question: "How do backlinks affect SEO rankings for NYC businesses?",
    answer: <span>Backlinks are one of Google&apos;s top three ranking factors. For <L href="/services-areas-we-offer-marketing-services-in">NYC businesses</L>, local backlinks from industry directories, local news sites, neighborhood blogs, and business associations carry extra weight. We build authority through strategic link acquisition — not spammy link farms. Quality always beats quantity.</span>,
  },
  {
    category: "seo",
    question: "What keywords should a plumber in Brooklyn target for SEO?",
    answer: <span>A <L href="/industries-we-offer-marketing-services-for/plumber-marketing">Brooklyn plumber</L> should target hyper-local terms: &ldquo;emergency plumber <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L>,&rdquo; &ldquo;plumber near me Brooklyn,&rdquo; &ldquo;drain cleaning <L href="/services-areas-we-offer-marketing-services-in/park-slope-marketing-company">Park Slope</L>,&rdquo; &ldquo;water heater repair <L href="/services-areas-we-offer-marketing-services-in/williamsburg-marketing-company">Williamsburg</L>,&rdquo; and service-specific long-tails. We perform full keyword research mapping every service to every neighborhood you serve.</span>,
  },
  {
    category: "seo",
    question: "Can SEO help my restaurant get more customers in NYC?",
    answer: <span>Absolutely. <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">Restaurant SEO</L> targets searches like &ldquo;best Italian restaurant <L href="/services-areas-we-offer-marketing-services-in/astoria-marketing-company">Astoria</L>&rdquo; and &ldquo;brunch near me <L href="/services-areas-we-offer-marketing-services-in/williamsburg-marketing-company">Williamsburg</L>.&rdquo; Combined with <L href="/nyc-marketing-company-services-list">Google Business Profile optimization</L>, menu schema markup, and review management, SEO drives consistent reservations and foot traffic without paying for ads.</span>,
  },
  {
    category: "seo",
    question: "What is programmatic SEO and is it right for my business?",
    answer: <span>Programmatic SEO creates hundreds of optimized pages at scale — like a service page for every neighborhood you serve. A <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">Queens HVAC company</L> could have dedicated landing pages for <L href="/services-areas-we-offer-marketing-services-in/astoria-marketing-company">Astoria</L>, <L href="/services-areas-we-offer-marketing-services-in/flushing-marketing-company">Flushing</L>, <L href="/services-areas-we-offer-marketing-services-in/jamaica-queens-marketing-company">Jamaica</L>, and every neighborhood. We build these with <L href="/nyc-marketing-company-services-list">custom templates and real local data</L> — not thin, duplicate content.</span>,
  },
  {
    category: "seo",
    question: "How does content marketing support SEO for NYC businesses?",
    answer: <span>Content establishes topical authority and captures long-tail searches your competitors miss. A <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist in Queens</L> publishing &ldquo;best toothpaste for sensitive teeth&rdquo; or &ldquo;what to expect at a dental cleaning&rdquo; attracts patients who are actively researching. We tie every content piece to <L href="/nyc-marketing-company-services-list">your service pages</L> and local landing pages for maximum SEO impact.</span>,
  },
  {
    category: "seo",
    question: "What is a technical SEO audit and do I need one?",
    answer: <span>A technical SEO audit identifies issues hurting your rankings: slow page speed, broken links, missing schema, crawl errors, duplicate content, and poor mobile usability. Every new <L href="/nyc-marketing-pricing-guide">client engagement</L> starts with a full technical audit. If your site was built years ago or by a cheap agency, there are almost certainly technical issues costing you rankings.</span>,
  },
  {
    category: "seo",
    question: "How do Google algorithm updates affect my NYC business?",
    answer: <span>Google updates reward sites with genuine expertise, quality content, and strong technical foundations. Businesses that relied on shortcuts — keyword stuffing, link schemes, thin content — get hit hardest. Our <L href="/nyc-marketing-company-services-list">SEO strategies</L> are built on Google&apos;s guidelines, not against them. That&apos;s why our clients gain traffic during updates while competitors lose it.</span>,
  },
  {
    category: "seo",
    question: "Is SEO worth it for a brand new NYC business with no online presence?",
    answer: <span>Yes — starting SEO from day one is actually easier and cheaper than fixing a poorly built site later. We&apos;ve launched startups from zero to <L href="/nyc-marketing-company-portfolio">2,000+ page 1 rankings in 2 months</L>. The key is building the right SEO architecture from the start: proper site structure, keyword mapping, technical foundation, and local optimization from <L href="/services-areas-we-offer-marketing-services-in">every area you serve</L>.</span>,
  },

  // ─── Pricing & Costs (11–20) ───
  {
    category: "pricing",
    question: "Why is The NYC Marketing Company's SEO pricing lower than other NYC agencies?",
    answer: <span>We don&apos;t have a Manhattan office lease, 50-person staff, or investor overhead. You work directly with senior strategists — no junior account managers burning your budget learning on your dime. Our <L href="/nyc-marketing-pricing-guide">$950/month SEO</L> delivers more value than most agencies charging $3,000+ because every dollar goes to actual work, not overhead.</span>,
  },
  {
    category: "pricing",
    question: "What is the total cost to launch a website and SEO campaign together?",
    answer: <span>A custom <L href="/nyc-marketing-company-services-list">website</L> starts at <L href="/nyc-marketing-pricing-guide">$4,600</L> (one-time) plus <L href="/nyc-marketing-pricing-guide">$950/month</L> for ongoing SEO. That&apos;s $5,550 to launch and $950/month ongoing. Many competitors charge $15,000+ for a website alone. We bundle these because your website and SEO should be engineered as one system from the start.</span>,
  },
  {
    category: "pricing",
    question: "Are there hidden fees in your marketing packages?",
    answer: <span>No. Our <L href="/nyc-marketing-pricing-guide">pricing</L> includes everything listed — no surprise invoices for &ldquo;extra revisions,&rdquo; &ldquo;hosting fees,&rdquo; or &ldquo;reporting charges.&rdquo; The price we quote is the price you pay. Period. We publish our pricing publicly because we have nothing to hide.</span>,
  },
  {
    category: "pricing",
    question: "Do you offer payment plans for website design?",
    answer: <span>Yes. We offer flexible payment options for <L href="/nyc-marketing-company-services-list">custom website projects</L>. Typical structure is 50% upfront and 50% at launch, but we work with businesses at every stage. <L href="/contact-nyc-marketing-company-consortium-nyc">Contact us</L> to discuss what works for your budget.</span>,
  },
  {
    category: "pricing",
    question: "How much does Google Ads management cost on top of SEO?",
    answer: <span>We focus on organic SEO and <L href="/nyc-marketing-company-services-list">earned marketing channels</L> rather than paid ads. However, if you need PPC management alongside SEO, we can discuss it during your <L href="/contact-nyc-marketing-company-consortium-nyc">strategy session</L>. Our philosophy: invest in SEO that compounds over time rather than ads that stop the moment you stop paying.</span>,
  },
  {
    category: "pricing",
    question: "What ROI should I expect from a $950/month SEO investment?",
    answer: <span>It depends on your industry, but our clients typically see 5–8% compounding traffic growth month over month. A <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L> getting 30 leads/month at $500 average job value generates $15K/month from a $950 investment — a 15:1 ROI. See <L href="/nyc-marketing-company-portfolio">real results</L> from businesses we work with across <L href="/services-areas-we-offer-marketing-services-in">80+ neighborhoods</L>.</span>,
  },
  {
    category: "pricing",
    question: "How much does branding cost for a NYC small business?",
    answer: <span><L href="/nyc-marketing-company-services-list">Brand identity packages</L> — logo, color palette, typography, brand guidelines, and visual assets — vary based on scope. We build branding as part of your <L href="/nyc-marketing-pricing-guide">website project</L> or as a standalone engagement. Either way, it&apos;s a fraction of what Manhattan branding agencies charge for comparable work.</span>,
  },
  {
    category: "pricing",
    question: "Is there a minimum commitment for monthly SEO?",
    answer: <span>No minimum contract. We recommend at least 6 months to see meaningful SEO results, but you can cancel anytime. Most clients stay 12–24+ months because the results keep compounding. See our <L href="/nyc-marketing-pricing-guide">transparent pricing</L> — what you see is what you get.</span>,
  },
  {
    category: "pricing",
    question: "What does ongoing website maintenance cost?",
    answer: <span>Basic maintenance (hosting, SSL, security updates, uptime monitoring) is included in our <L href="/nyc-marketing-pricing-guide">SEO packages</L>. If you need a standalone website with no SEO, maintenance runs $150–$300/month depending on complexity. Our sites are built on <L href="/nyc-marketing-company-services-list">modern infrastructure</L> that requires minimal maintenance compared to WordPress.</span>,
  },
  {
    category: "pricing",
    question: "Do you charge extra for mobile optimization?",
    answer: <span>Never. Every <L href="/nyc-marketing-company-services-list">website we build</L> is mobile-first by default. Over 70% of local searches happen on phones — mobile optimization isn&apos;t an add-on, it&apos;s foundational. Our sites are responsive across every device and score 90+ on <L href="/nyc-marketing-company-services-list">Core Web Vitals</L>.</span>,
  },

  // ─── Web Design (21–30) ───
  {
    category: "web",
    question: "What technology stack do you use to build websites?",
    answer: <span>We build on Next.js, React, and Tailwind CSS — hosted on Vercel with edge-optimized delivery. For databases we use Supabase, for email Resend. No WordPress, no page builders, no bloat. This is the same tech used by Vercel, Netflix, and Fortune 500 companies — and we bring it to <L href="/industries-we-offer-marketing-services-for">local businesses</L> at a fraction of the cost.</span>,
  },
  {
    category: "web",
    question: "Why don't you use WordPress for business websites?",
    answer: <span>WordPress sites are slow, vulnerable to security exploits, and require constant plugin updates. Our <L href="/nyc-marketing-company-services-list">Next.js websites</L> load in under 2 seconds, are virtually unhackable (no admin login to exploit), and require zero plugin maintenance. For <L href="/industries-we-offer-marketing-services-for">local businesses</L> that depend on their website for leads, reliability and speed aren&apos;t optional.</span>,
  },
  {
    category: "web",
    question: "How long does it take to build a custom business website?",
    answer: <span>Most <L href="/nyc-marketing-company-services-list">custom websites</L> launch in 3–5 weeks. Complex projects with custom integrations, booking systems, or e-commerce may take 6–8 weeks. We move fast because we don&apos;t use templates — we&apos;ve built the process to be efficient. You&apos;ll see design mockups within the first week.</span>,
  },
  {
    category: "web",
    question: "Will my website work well on phones and tablets?",
    answer: <span>Every site we build is mobile-first — designed for phones first, then scaled up. We test across iPhones, Android devices, iPads, and every major browser. With 70%+ of <L href="/services-areas-we-offer-marketing-services-in">NYC searches</L> happening on mobile, your site must load fast and convert on small screens. Our sites score 90+ on mobile Core Web Vitals.</span>,
  },
  {
    category: "web",
    question: "Can you redesign my existing website without losing SEO rankings?",
    answer: <span>Yes — and this is where most agencies mess up. We map every existing URL, set up proper 301 redirects, preserve your meta data, and maintain your <L href="/nyc-marketing-company-services-list">SEO architecture</L>. A redesign done right actually improves your rankings because of better speed, structure, and user experience. We&apos;ve done this for businesses across <L href="/industries-we-offer-marketing-services-for">dozens of industries</L>.</span>,
  },
  {
    category: "web",
    question: "Do you build e-commerce websites for NYC businesses?",
    answer: <span>Yes. We build custom e-commerce solutions for <L href="/industries-we-offer-marketing-services-for/retail-store-marketing">retail businesses</L> and product companies. Our stack supports inventory management, payment processing, and <L href="/nyc-marketing-company-services-list">SEO-optimized product pages</L>. For local NYC retailers, we also integrate local pickup, delivery zones, and Google Shopping feeds.</span>,
  },
  {
    category: "web",
    question: "What is Core Web Vitals and why does it matter for my website?",
    answer: <span>Core Web Vitals are Google&apos;s metrics for page experience: loading speed (LCP), interactivity (INP), and visual stability (CLS). Sites that score poorly get penalized in rankings. Every <L href="/nyc-marketing-company-services-list">website we build</L> scores 90+ on all three metrics. Most WordPress sites score 40–60. This directly affects your <L href="/nyc-marketing-company-services-list">SEO rankings</L> and conversion rates.</span>,
  },
  {
    category: "web",
    question: "Can you add online booking or appointment scheduling to my website?",
    answer: <span>Yes. We integrate booking systems directly into your <L href="/nyc-marketing-company-services-list">website</L> — whether it&apos;s Calendly, Acuity, or a custom solution. For <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L>, <L href="/industries-we-offer-marketing-services-for/personal-trainer-marketing">personal trainers</L>, <L href="/industries-we-offer-marketing-services-for/salon-spa-marketing">salons</L>, and <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service businesses</L>, online booking reduces friction and captures leads 24/7.</span>,
  },
  {
    category: "web",
    question: "Do you provide website hosting or do I need to buy my own?",
    answer: <span>Hosting is included. Our sites are deployed on Vercel&apos;s edge network — the same infrastructure used by major tech companies. You get automatic SSL, global CDN, 99.99% uptime, and zero server maintenance. No cPanel, no shared hosting, no downtime during traffic spikes. It&apos;s all included in our <L href="/nyc-marketing-pricing-guide">pricing</L>.</span>,
  },
  {
    category: "web",
    question: "Can I update my website content myself after launch?",
    answer: <span>Yes. We build sites with a content management layer so you can update text, images, and blog posts. For more complex changes, we handle them as part of your <L href="/nyc-marketing-pricing-guide">monthly SEO retainer</L>. We also provide a training walkthrough at launch so your team is comfortable making basic updates.</span>,
  },

  // ─── Local & Maps (31–40) ───
  {
    category: "local",
    question: "How do I rank in the Google Map Pack for my NYC neighborhood?",
    answer: <span>Map Pack rankings depend on three factors: relevance, distance, and prominence. We optimize all three through <L href="/nyc-marketing-company-services-list">Google Business Profile optimization</L>, local citation building, review generation, and geo-targeted content for every <L href="/services-areas-we-offer-marketing-services-in">neighborhood you serve</L>. Most businesses only optimize for one — we attack all three simultaneously.</span>,
  },
  {
    category: "local",
    question: "What are local citations and why do they matter for SEO?",
    answer: <span>Local citations are mentions of your business name, address, and phone number (NAP) across the web — Yelp, BBB, industry directories, local chambers of commerce. Consistent citations across 80+ directories tell Google your business is legitimate and located where you say. We build and manage citations for every <L href="/services-areas-we-offer-marketing-services-in">service area</L> you target.</span>,
  },
  {
    category: "local",
    question: "How do online reviews affect my local SEO rankings in NYC?",
    answer: <span>Reviews are a direct ranking factor for local SEO. Businesses with more positive reviews rank higher in the map pack and get higher click-through rates. We implement review generation systems for <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service businesses</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L>, and <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L> that systematically build your review count on Google, Yelp, and industry-specific platforms.</span>,
  },
  {
    category: "local",
    question: "Can I rank in multiple NYC neighborhoods at the same time?",
    answer: <span>Yes — that&apos;s one of our specialties. We create dedicated landing pages for each neighborhood with unique, locally-relevant content. A <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L> in <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L> can rank in <L href="/services-areas-we-offer-marketing-services-in/park-slope-marketing-company">Park Slope</L>, <L href="/services-areas-we-offer-marketing-services-in/williamsburg-marketing-company">Williamsburg</L>, <L href="/services-areas-we-offer-marketing-services-in/bushwick-marketing-company">Bushwick</L>, <L href="/services-areas-we-offer-marketing-services-in/bed-stuy-marketing-company">Bed-Stuy</L>, and every neighborhood they serve — each with its own optimized page.</span>,
  },
  {
    category: "local",
    question: "How do I compete with bigger companies in NYC search results?",
    answer: <span>Local SEO is the great equalizer. A <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">solo HVAC tech</L> can outrank a national chain in <L href="/services-areas-we-offer-marketing-services-in/queens-marketing-company">Queens</L> with the right <L href="/nyc-marketing-company-services-list">local SEO strategy</L>. We focus on hyper-local content, neighborhood-level targeting, and Google Business Profile dominance — areas where big companies are too slow to compete. See our <L href="/nyc-marketing-company-portfolio">portfolio</L> for proof.</span>,
  },
  {
    category: "local",
    question: "Should my business have separate pages for each service area?",
    answer: <span>Yes — if done right. Each <L href="/services-areas-we-offer-marketing-services-in">service area page</L> needs unique content, local references, area-specific testimonials, and genuine value. Thin, templated pages with just the city name swapped out can hurt you. We build programmatic landing pages with real local data, neighborhood-specific keywords, and unique content for each area.</span>,
  },
  {
    category: "local",
    question: "What is 'near me' SEO and how do I optimize for it?",
    answer: <span>&ldquo;Near me&rdquo; searches have grown 500%+ in five years. Google determines &ldquo;near me&rdquo; results based on your Google Business Profile location, local citations, and on-page signals. We optimize all three for <L href="/industries-we-offer-marketing-services-for">every industry</L> across <L href="/services-areas-we-offer-marketing-services-in">every neighborhood</L>. A strong <L href="/nyc-marketing-company-services-list">local SEO foundation</L> means you show up for &ldquo;near me&rdquo; automatically.</span>,
  },
  {
    category: "local",
    question: "How important is NAP consistency for local SEO?",
    answer: <span>Critical. NAP (Name, Address, Phone) must be identical everywhere — your website, Google Business Profile, Yelp, Facebook, industry directories, and every citation. Even small differences (like &ldquo;St.&rdquo; vs &ldquo;Street&rdquo;) can confuse Google and dilute your local authority. We audit and fix NAP consistency across all platforms as part of our <L href="/nyc-marketing-pricing-guide">SEO service</L>.</span>,
  },
  {
    category: "local",
    question: "Can you help a business without a physical storefront rank locally?",
    answer: <span>Yes. Service-area businesses (SABs) like <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbers</L>, <L href="/industries-we-offer-marketing-services-for/electrician-marketing">electricians</L>, <L href="/industries-we-offer-marketing-services-for/landscaping-company-marketing">landscapers</L>, and <L href="/industries-we-offer-marketing-services-for/cleaning-service-marketing">cleaning services</L> can rank in the map pack by setting service areas in Google Business Profile instead of a storefront address. We optimize SAB profiles across <L href="/services-areas-we-offer-marketing-services-in">every neighborhood</L> you serve.</span>,
  },
  {
    category: "local",
    question: "What is geo-targeted content and how does it help local SEO?",
    answer: <span>Geo-targeted content includes neighborhood names, local landmarks, and area-specific information in your <L href="/nyc-marketing-company-services-list">website pages</L>. A <L href="/industries-we-offer-marketing-services-for/roofing-company-marketing">roofer in Long Island</L> would reference specific neighborhoods like <L href="/services-areas-we-offer-marketing-services-in/huntington-marketing-company">Huntington</L> or <L href="/services-areas-we-offer-marketing-services-in/babylon-marketing-company">Babylon</L> with locally relevant details. This signals to Google that your business genuinely serves these areas.</span>,
  },

  // ─── Google Business Profile (41–48) ───
  {
    category: "gbp",
    question: "How often should I post on Google Business Profile?",
    answer: <span>We recommend 2–4 posts per week for active <L href="/industries-we-offer-marketing-services-for">local businesses</L>. Posts keep your profile fresh, signal activity to Google, and provide additional content for potential customers. We handle GBP posting as part of our <L href="/nyc-marketing-pricing-guide">monthly SEO service</L> — including photos, offers, updates, and event posts.</span>,
  },
  {
    category: "gbp",
    question: "How do I get more Google reviews for my NYC business?",
    answer: <span>We implement automated review request systems that trigger after service completion. For <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service businesses</L>, we send SMS follow-ups. For <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L>, we use email sequences. For <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, we use QR codes. The key is making it frictionless — one click to leave a review. Our clients see 3–5x more reviews within the first 3 months.</span>,
  },
  {
    category: "gbp",
    question: "Should I respond to negative Google reviews?",
    answer: <span>Always. Responding professionally to negative reviews shows potential customers you care. It also gives Google a positive signal. We help craft responses and implement <L href="/nyc-marketing-company-services-list">review management strategies</L> that turn negative experiences into demonstrations of your professionalism. Never argue — acknowledge, apologize, and offer to fix it offline.</span>,
  },
  {
    category: "gbp",
    question: "Can I have multiple Google Business Profiles for different locations?",
    answer: <span>If you have genuine physical locations in multiple <L href="/services-areas-we-offer-marketing-services-in">neighborhoods</L>, yes. Each location gets its own GBP. But creating fake listings violates Google&apos;s terms and can get all your profiles suspended. Service-area businesses should have one profile with multiple service areas listed. We manage multi-location GBP strategies for businesses across <L href="/services-areas-we-offer-marketing-services-in">NYC, Long Island, and Westchester</L>.</span>,
  },
  {
    category: "gbp",
    question: "What Google Business Profile categories should my business use?",
    answer: <span>Your primary category is the most important ranking factor for map pack results. We research which categories drive the most visibility for your <L href="/industries-we-offer-marketing-services-for">industry</L> and location. A <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L> might use &ldquo;Plumber&rdquo; as primary with &ldquo;Water Heater Installation Service&rdquo; and &ldquo;Drain Cleaning Service&rdquo; as secondary. Getting this wrong costs rankings.</span>,
  },
  {
    category: "gbp",
    question: "How do Google Business Profile photos affect local rankings?",
    answer: <span>Businesses with 100+ photos get 520% more calls than average. Photos signal an active, legitimate business. We recommend uploading team photos, project photos, before/after shots, and storefront images weekly. For <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, food photos are critical. For <L href="/industries-we-offer-marketing-services-for/contractor-marketing">contractors</L>, project portfolios. We manage photo uploads as part of our <L href="/nyc-marketing-pricing-guide">SEO service</L>.</span>,
  },
  {
    category: "gbp",
    question: "What are Google Business Profile Q&As and should I use them?",
    answer: <span>GBP Q&amp;A lets anyone ask questions on your profile. You should proactively seed questions and answers with your most common customer questions — hours, pricing, services, coverage areas. This provides additional keyword-rich content on your profile and prevents competitors or trolls from posting misleading answers.</span>,
  },
  {
    category: "gbp",
    question: "How do I track leads coming from my Google Business Profile?",
    answer: <span>We set up call tracking numbers, UTM-tagged website links, and conversion tracking specifically for GBP traffic. This lets you see exactly how many calls, direction requests, and website clicks come from your profile each month. It&apos;s all included in our <L href="/nyc-marketing-pricing-guide">monthly reporting</L>.</span>,
  },

  // ─── Industries (49–58) ───
  {
    category: "industries",
    question: "What marketing strategies work best for plumbers in NYC?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/plumber-marketing">Plumber marketing</L> in NYC requires aggressive local SEO targeting every neighborhood you serve, a fast-loading <L href="/nyc-marketing-company-services-list">website</L> with click-to-call, strong <L href="/nyc-marketing-company-services-list">Google Business Profile</L> optimization, and review generation. Emergency plumbing searches have the highest conversion rates — we make sure you own those terms in <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L>, <L href="/services-areas-we-offer-marketing-services-in/queens-marketing-company">Queens</L>, and wherever you operate.</span>,
  },
  {
    category: "industries",
    question: "How can a dental practice get more patients through SEO in NYC?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">Dental SEO</L> targets searches like &ldquo;dentist near me,&rdquo; &ldquo;teeth whitening <L href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company">Manhattan</L>,&rdquo; and &ldquo;emergency dentist <L href="/services-areas-we-offer-marketing-services-in/astoria-marketing-company">Astoria</L>.&rdquo; We build service-specific pages for each procedure (implants, cleanings, cosmetic dentistry), optimize your GBP with before/after photos, and implement patient review systems. <L href="/nyc-marketing-company-portfolio">See our dental marketing results</L>.</span>,
  },
  {
    category: "industries",
    question: "What digital marketing do HVAC companies in NYC need?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC companies</L> need seasonal SEO strategies — AC repair content dominates summer searches, heating repair in winter. We build landing pages for every service and <L href="/services-areas-we-offer-marketing-services-in">neighborhood</L>, optimize your GBP for emergency searches, and implement <L href="/artificial-intelligence-marketing-services-offered">AI automation</L> for after-hours lead capture. The businesses that pick up the phone first win the job.</span>,
  },
  {
    category: "industries",
    question: "How should a law firm in NYC approach digital marketing?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/law-firm-marketing">Law firm marketing</L> requires EEAT-focused content (Experience, Expertise, Authoritativeness, Trustworthiness), practice area landing pages, attorney bio optimization, and local SEO for each <L href="/services-areas-we-offer-marketing-services-in">borough</L> you serve. <L href="/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing">Personal injury</L>, <L href="/industries-we-offer-marketing-services-for/criminal-defense-lawyer-marketing">criminal defense</L>, and <L href="/industries-we-offer-marketing-services-for/family-law-attorney-marketing">family law</L> are the most competitive — and where we specialize.</span>,
  },
  {
    category: "industries",
    question: "What marketing does a landscaping company need in the NYC area?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/landscaping-company-marketing">Landscaping SEO</L> targets seasonal searches across <L href="/services-areas-we-offer-marketing-services-in/long-island-marketing-company">Long Island</L>, <L href="/services-areas-we-offer-marketing-services-in/westchester-marketing-company">Westchester</L>, and the outer boroughs. We build service pages for lawn care, hardscaping, tree removal, and snow removal with neighborhood-specific content. Your <L href="/nyc-marketing-company-services-list">Google Business Profile</L> needs project photos updated regularly — before/after shots drive calls.</span>,
  },
  {
    category: "industries",
    question: "How can a real estate agent in NYC use SEO to get more listings?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/real-estate-agent-marketing">Real estate SEO</L> targets neighborhood-specific searches: &ldquo;homes for sale in <L href="/services-areas-we-offer-marketing-services-in/park-slope-marketing-company">Park Slope</L>,&rdquo; &ldquo;condos <L href="/services-areas-we-offer-marketing-services-in/long-island-city-marketing-company">Long Island City</L>,&rdquo; &ldquo;<L href="/services-areas-we-offer-marketing-services-in/scarsdale-marketing-company">Scarsdale</L> real estate agent.&rdquo; We build neighborhood guides, market report content, and property-focused landing pages that position you as the local expert.</span>,
  },
  {
    category: "industries",
    question: "What marketing works for auto repair shops in NYC?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/auto-repair-shop-marketing">Auto repair marketing</L> depends on &ldquo;near me&rdquo; searches and emergency queries. We optimize for &ldquo;oil change near me,&rdquo; &ldquo;brake repair <L href="/services-areas-we-offer-marketing-services-in/bay-ridge-marketing-company">Bay Ridge</L>,&rdquo; &ldquo;auto mechanic <L href="/services-areas-we-offer-marketing-services-in/astoria-marketing-company">Astoria</L>,&rdquo; and every service you offer in every neighborhood. <L href="/nyc-marketing-company-services-list">Google Business Profile</L> with regular photo updates and review management is critical.</span>,
  },
  {
    category: "industries",
    question: "How should a gym or fitness studio market itself in NYC?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/gym-fitness-marketing">Gym and fitness marketing</L> targets hyper-local searches since people won&apos;t commute far to work out. We optimize for &ldquo;gym near me <L href="/services-areas-we-offer-marketing-services-in/chelsea-marketing-company">Chelsea</L>,&rdquo; &ldquo;CrossFit <L href="/services-areas-we-offer-marketing-services-in/williamsburg-marketing-company">Williamsburg</L>,&rdquo; and class-specific terms. Review management, Instagram integration, class schedule schema markup, and <L href="/nyc-marketing-company-services-list">local SEO</L> drive consistent new memberships.</span>,
  },
  {
    category: "industries",
    question: "Do you work with medical practices and healthcare providers?",
    answer: <span>Yes. We serve <L href="/industries-we-offer-marketing-services-for/medical-practice-marketing">medical practices</L>, <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental offices</L>, <L href="/industries-we-offer-marketing-services-for/physical-therapy-marketing">physical therapy clinics</L>, <L href="/industries-we-offer-marketing-services-for/mental-health-practice-marketing">mental health practices</L>, <L href="/industries-we-offer-marketing-services-for/veterinarian-marketing">veterinary clinics</L>, and other healthcare providers. Medical SEO requires EEAT compliance, HIPAA-aware content strategies, and patient review management — we know the nuances.</span>,
  },
  {
    category: "industries",
    question: "What marketing strategies work for contractors and construction companies?",
    answer: <span><L href="/industries-we-offer-marketing-services-for/contractor-marketing">Contractor marketing</L> relies on project portfolio content, service-area landing pages, and <L href="/nyc-marketing-company-services-list">strong Google Business Profile presence</L>. We build pages for every service (kitchen remodeling, bathroom renovation, additions) and every <L href="/services-areas-we-offer-marketing-services-in">neighborhood</L> you serve. Before/after project galleries and video testimonials convert better than any ad.</span>,
  },

  // ─── Service Areas (59–66) ───
  {
    category: "areas",
    question: "Do you serve businesses in Westchester County?",
    answer: <span>Yes. We work with businesses throughout <L href="/services-areas-we-offer-marketing-services-in/westchester-marketing-company">Westchester County</L> including <L href="/services-areas-we-offer-marketing-services-in/white-plains-marketing-company">White Plains</L>, <L href="/services-areas-we-offer-marketing-services-in/yonkers-marketing-company">Yonkers</L>, <L href="/services-areas-we-offer-marketing-services-in/new-rochelle-marketing-company">New Rochelle</L>, <L href="/services-areas-we-offer-marketing-services-in/scarsdale-marketing-company">Scarsdale</L>, <L href="/services-areas-we-offer-marketing-services-in/rye-marketing-company">Rye</L>, <L href="/services-areas-we-offer-marketing-services-in/mamaroneck-marketing-company">Mamaroneck</L>, <L href="/services-areas-we-offer-marketing-services-in/tarrytown-marketing-company">Tarrytown</L>, <L href="/services-areas-we-offer-marketing-services-in/dobbs-ferry-marketing-company">Dobbs Ferry</L>, and <L href="/services-areas-we-offer-marketing-services-in/larchmont-marketing-company">Larchmont</L>. Each Westchester market has different competition — we build strategies specific to each town.</span>,
  },
  {
    category: "areas",
    question: "Can you help businesses in Northern New Jersey?",
    answer: <span>Yes. We serve businesses in <L href="/services-areas-we-offer-marketing-services-in/jersey-city-marketing-company">Jersey City</L>, <L href="/services-areas-we-offer-marketing-services-in/hoboken-marketing-company">Hoboken</L>, <L href="/services-areas-we-offer-marketing-services-in/newark-marketing-company">Newark</L>, <L href="/services-areas-we-offer-marketing-services-in/fort-lee-marketing-company">Fort Lee</L>, and <L href="/services-areas-we-offer-marketing-services-in/edgewater-marketing-company">Edgewater</L>. Northern NJ businesses often compete with NYC businesses for the same searches — we know how to position you effectively in both markets.</span>,
  },
  {
    category: "areas",
    question: "What neighborhoods in Brooklyn do you serve?",
    answer: <span>All of them. <L href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company">Brooklyn</L> including <L href="/services-areas-we-offer-marketing-services-in/williamsburg-marketing-company">Williamsburg</L>, <L href="/services-areas-we-offer-marketing-services-in/bushwick-marketing-company">Bushwick</L>, <L href="/services-areas-we-offer-marketing-services-in/park-slope-marketing-company">Park Slope</L>, <L href="/services-areas-we-offer-marketing-services-in/dumbo-marketing-company">DUMBO</L>, <L href="/services-areas-we-offer-marketing-services-in/downtown-brooklyn-marketing-company">Downtown Brooklyn</L>, <L href="/services-areas-we-offer-marketing-services-in/bay-ridge-marketing-company">Bay Ridge</L>, <L href="/services-areas-we-offer-marketing-services-in/flatbush-marketing-company">Flatbush</L>, <L href="/services-areas-we-offer-marketing-services-in/bensonhurst-marketing-company">Bensonhurst</L>, <L href="/services-areas-we-offer-marketing-services-in/sunset-park-marketing-company">Sunset Park</L>, <L href="/services-areas-we-offer-marketing-services-in/crown-heights-marketing-company">Crown Heights</L>, <L href="/services-areas-we-offer-marketing-services-in/bed-stuy-marketing-company">Bed-Stuy</L>, and <L href="/services-areas-we-offer-marketing-services-in/greenpoint-marketing-company">Greenpoint</L>. Each Brooklyn neighborhood has unique search patterns and competition.</span>,
  },
  {
    category: "areas",
    question: "Do you work with businesses in Queens?",
    answer: <span>Yes — <L href="/services-areas-we-offer-marketing-services-in/queens-marketing-company">Queens</L> is one of our strongest markets. We serve businesses in <L href="/services-areas-we-offer-marketing-services-in/astoria-marketing-company">Astoria</L>, <L href="/services-areas-we-offer-marketing-services-in/flushing-marketing-company">Flushing</L>, <L href="/services-areas-we-offer-marketing-services-in/long-island-city-marketing-company">Long Island City</L>, <L href="/services-areas-we-offer-marketing-services-in/forest-hills-marketing-company">Forest Hills</L>, <L href="/services-areas-we-offer-marketing-services-in/jamaica-queens-marketing-company">Jamaica</L>, <L href="/services-areas-we-offer-marketing-services-in/bayside-marketing-company">Bayside</L>, <L href="/services-areas-we-offer-marketing-services-in/jackson-heights-marketing-company">Jackson Heights</L>, <L href="/services-areas-we-offer-marketing-services-in/ridgewood-marketing-company">Ridgewood</L>, <L href="/services-areas-we-offer-marketing-services-in/woodside-marketing-company">Woodside</L>, and more. Queens&apos; diversity means multilingual SEO strategies deliver huge advantages.</span>,
  },
  {
    category: "areas",
    question: "How is marketing different for businesses on Long Island vs NYC?",
    answer: <span><L href="/services-areas-we-offer-marketing-services-in/long-island-marketing-company">Long Island</L> customers search differently — more suburban, more car-based, more &ldquo;best [service] near me&rdquo; than specific neighborhood searches. Competition is often lighter than Manhattan or Brooklyn, meaning faster SEO results. We serve <L href="/services-areas-we-offer-marketing-services-in/nassau-county-marketing-company">Nassau</L> and <L href="/services-areas-we-offer-marketing-services-in/suffolk-county-marketing-company">Suffolk County</L> with strategies built for suburban search behavior.</span>,
  },
  {
    category: "areas",
    question: "Can you target specific Manhattan neighborhoods for my business?",
    answer: <span>Absolutely. We build dedicated pages for <L href="/services-areas-we-offer-marketing-services-in/midtown-manhattan-marketing-company">Midtown</L>, <L href="/services-areas-we-offer-marketing-services-in/lower-manhattan-marketing-company">Lower Manhattan</L>, <L href="/services-areas-we-offer-marketing-services-in/upper-east-side-marketing-company">Upper East Side</L>, <L href="/services-areas-we-offer-marketing-services-in/upper-west-side-marketing-company">Upper West Side</L>, <L href="/services-areas-we-offer-marketing-services-in/harlem-marketing-company">Harlem</L>, <L href="/services-areas-we-offer-marketing-services-in/soho-marketing-company">SoHo</L>, <L href="/services-areas-we-offer-marketing-services-in/chelsea-marketing-company">Chelsea</L>, <L href="/services-areas-we-offer-marketing-services-in/east-village-marketing-company">East Village</L>, <L href="/services-areas-we-offer-marketing-services-in/tribeca-marketing-company">Tribeca</L>, and more. Manhattan is the most competitive market in the country — but with the right <L href="/nyc-marketing-company-services-list">strategy</L>, we get results.</span>,
  },
  {
    category: "areas",
    question: "Do you offer marketing services for Staten Island businesses?",
    answer: <span>Yes. <L href="/services-areas-we-offer-marketing-services-in/staten-island-marketing-company">Staten Island</L> is often overlooked by NYC agencies, which means less SEO competition and faster results. We serve businesses in <L href="/services-areas-we-offer-marketing-services-in/st-george-marketing-company">St. George</L>, <L href="/services-areas-we-offer-marketing-services-in/tottenville-marketing-company">Tottenville</L>, <L href="/services-areas-we-offer-marketing-services-in/new-dorp-marketing-company">New Dorp</L>, and <L href="/services-areas-we-offer-marketing-services-in/great-kills-marketing-company">Great Kills</L>. Staten Island businesses can dominate local search with the right <L href="/nyc-marketing-pricing-guide">investment</L>.</span>,
  },
  {
    category: "areas",
    question: "What about businesses in the Bronx — do you serve that market?",
    answer: <span>Yes. <L href="/services-areas-we-offer-marketing-services-in/bronx-marketing-company">The Bronx</L> is a growing market with increasing search demand. We serve businesses in <L href="/services-areas-we-offer-marketing-services-in/riverdale-marketing-company">Riverdale</L>, <L href="/services-areas-we-offer-marketing-services-in/fordham-marketing-company">Fordham</L>, <L href="/services-areas-we-offer-marketing-services-in/pelham-bay-marketing-company">Pelham Bay</L>, <L href="/services-areas-we-offer-marketing-services-in/mott-haven-marketing-company">Mott Haven</L>, <L href="/services-areas-we-offer-marketing-services-in/kingsbridge-marketing-company">Kingsbridge</L>, and <L href="/services-areas-we-offer-marketing-services-in/throgs-neck-marketing-company">Throgs Neck</L>. Bronx SEO competition is often 50% lower than Brooklyn or Manhattan — making it an incredible opportunity for local businesses.</span>,
  },

  // ─── Branding (67–72) ───
  {
    category: "branding",
    question: "Why does my small business need professional branding?",
    answer: <span>Your brand is why someone picks you over the competitor down the block. When a homeowner needs a <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumber</L> or a patient needs a <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dentist</L>, they pick the business that looks the most trustworthy and professional. <L href="/nyc-marketing-company-services-list">Professional branding</L> increases click-through rates, boosts conversions, and makes every other marketing effort more effective.</span>,
  },
  {
    category: "branding",
    question: "What is included in a brand identity package?",
    answer: <span>Our <L href="/nyc-marketing-company-services-list">brand identity packages</L> include logo design (primary, secondary, icon), color palette, typography system, brand guidelines document, business card design, social media templates, and brand voice guide. Everything you need for a cohesive, professional presence across your <L href="/nyc-marketing-company-services-list">website</L>, truck wraps, signage, and social media.</span>,
  },
  {
    category: "branding",
    question: "How does branding affect my SEO and online marketing?",
    answer: <span>Strong branding increases click-through rates in search results (people click what looks professional), reduces bounce rates (consistent branding builds trust immediately), and improves conversion rates on your <L href="/nyc-marketing-company-services-list">website</L>. When your brand, website, and <L href="/nyc-marketing-company-services-list">SEO</L> all speak the same language, the compounding effect on leads is massive. Read about <L href="/whats-working-in-marketing">what&apos;s working in marketing</L>.</span>,
  },
  {
    category: "branding",
    question: "Can you rebrand an existing business without losing customer recognition?",
    answer: <span>Yes. A strategic rebrand evolves your identity rather than abandoning it. We keep elements your customers recognize while modernizing the look and feel. For businesses across <L href="/services-areas-we-offer-marketing-services-in">NYC</L> that have outgrown their original DIY branding, a professional refresh signals growth and credibility to both existing and new customers.</span>,
  },
  {
    category: "branding",
    question: "How long does the branding process take?",
    answer: <span>Standalone branding projects take 2–3 weeks from discovery to final delivery. When bundled with a <L href="/nyc-marketing-company-services-list">website project</L>, branding is completed in the first week so it informs every design decision. We don&apos;t drag it out with 10 rounds of revisions — we get it right based on strategy, not guessing.</span>,
  },
  {
    category: "branding",
    question: "Do you design truck wraps, signage, and print materials?",
    answer: <span>Yes. Your brand should be consistent everywhere — <L href="/nyc-marketing-company-services-list">website</L>, Google Business Profile, truck wraps, business cards, signage, uniforms, and social media. We design all print and physical materials using your brand guidelines. For <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service businesses</L>, a branded truck is one of the best local marketing investments you can make.</span>,
  },

  // ─── AI & Automation (73–80) ───
  {
    category: "ai",
    question: "What is AI automation for small businesses?",
    answer: <span><L href="/artificial-intelligence-marketing-services-offered">AI automation</L> handles repetitive tasks — lead follow-up, appointment scheduling, review requests, customer communication — 24/7 without human intervention. For <L href="/industries-we-offer-marketing-services-for">local business owners</L> who can&apos;t be glued to their phone all day, automation ensures no lead falls through the cracks and every customer gets a timely response.</span>,
  },
  {
    category: "ai",
    question: "Can AI chatbots really help my NYC business get more leads?",
    answer: <span>Yes. We build custom <L href="/artificial-intelligence-marketing-services-offered">AI chatbots</L> that qualify leads, answer common questions, and book appointments while you&apos;re on a job site, with a patient, or sleeping. For <L href="/industries-we-offer-marketing-services-for/home-service-business-marketing">home service businesses</L>, an AI agent that responds in 30 seconds vs. a competitor who takes 2 hours means you win the job. Speed to lead is everything.</span>,
  },
  {
    category: "ai",
    question: "How does automated lead follow-up work?",
    answer: <span>When someone fills out your <L href="/nyc-marketing-company-services-list">website</L> contact form, our system instantly sends a personalized confirmation, notifies your team via text/email, and starts a follow-up sequence if they don&apos;t respond. For <L href="/industries-we-offer-marketing-services-for/plumber-marketing">plumbers</L>, <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC techs</L>, and other busy owners, this means never losing a lead because you were on a job. It&apos;s included in our <L href="/artificial-intelligence-marketing-services-offered">AI automation packages</L>.</span>,
  },
  {
    category: "ai",
    question: "Can you automate review requests for my business?",
    answer: <span>Yes. Our <L href="/artificial-intelligence-marketing-services-offered">automated review system</L> sends review requests via SMS or email after service completion. It times requests perfectly — not too soon, not too late. For <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L> and <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L>, we can trigger requests based on appointment completion or check-out. Clients typically see review counts triple within 3 months.</span>,
  },
  {
    category: "ai",
    question: "What is a CRM and does my small business need one?",
    answer: <span>A CRM (Customer Relationship Management) system tracks every lead, customer interaction, and deal in one place. For businesses generating 20+ leads/month, a CRM prevents leads from falling through cracks. We build lightweight, <L href="/nyc-marketing-company-services-list">custom CRM solutions</L> that integrate with your website and <L href="/artificial-intelligence-marketing-services-offered">automation systems</L> — not bloated enterprise software you&apos;ll never use.</span>,
  },
  {
    category: "ai",
    question: "How much time can AI automation save my business?",
    answer: <span>Our <L href="/artificial-intelligence-marketing-services-offered">AI automation clients</L> save an average of 15–20 hours per week on manual tasks — lead follow-up, appointment reminders, review requests, and customer communications. For a busy <L href="/industries-we-offer-marketing-services-for/contractor-marketing">contractor</L> or <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">practice owner</L>, that&apos;s half a work week back. The systems run 24/7, including nights and weekends when you&apos;re off the clock.</span>,
  },
  {
    category: "ai",
    question: "Can AI write content for my website and blog?",
    answer: <span>AI assists our content process but doesn&apos;t replace human strategy and editing. We use AI tools to research topics, draft outlines, and generate initial content — then our team refines everything with local expertise, brand voice, and <L href="/nyc-marketing-company-services-list">SEO optimization</L>. Google rewards helpful, human-reviewed content. Pure AI content without expertise signals gets filtered out.</span>,
  },
  {
    category: "ai",
    question: "Do you integrate with existing business tools and software?",
    answer: <span>Yes. Our <L href="/artificial-intelligence-marketing-services-offered">automation systems</L> integrate with popular tools — Google Calendar, QuickBooks, Mailchimp, Twilio, Slack, and custom APIs. For <L href="/industries-we-offer-marketing-services-for/dental-practice-marketing">dental practices</L> on Dentrix, <L href="/industries-we-offer-marketing-services-for/law-firm-marketing">law firms</L> on Clio, or <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">restaurants</L> on Toast — we build integrations that connect your marketing to your operations.</span>,
  },

  // ─── Process & Reporting (81–90) ───
  {
    category: "process",
    question: "What does the onboarding process look like at The NYC Marketing Company?",
    answer: <span>After your <L href="/contact-nyc-marketing-company-consortium-nyc">free strategy session</L>, onboarding takes less than a week. We conduct a full digital audit, perform competitive research in your <L href="/services-areas-we-offer-marketing-services-in">local market</L>, and deliver a strategic roadmap within two weeks. Implementation starts immediately. You&apos;ll have direct access to your strategist from day one — no layers, no handoffs.</span>,
  },
  {
    category: "process",
    question: "How do you report on SEO progress and results?",
    answer: <span>Monthly reports include: keyword rankings (with positions and changes), organic traffic data, lead volume from <L href="/nyc-marketing-company-services-list">SEO</L>, conversion rates, Google Business Profile insights, and a summary of work completed. We also include a plan for the next month. Every number ties to your bottom line — not vanity metrics. All for <L href="/nyc-marketing-pricing-guide">$950/month</L>.</span>,
  },
  {
    category: "process",
    question: "Who will I work with at The NYC Marketing Company?",
    answer: <span>You work directly with senior strategists who have 25+ years of experience. No junior account managers, no interns, no overseas outsourcing. When you call, the person who picks up is the same person working on your <L href="/nyc-marketing-company-services-list">SEO</L>, your <L href="/nyc-marketing-company-services-list">website</L>, and your strategy. That&apos;s the <L href="/about-digital-marketing-agency-consortium-nyc">The NYC Marketing Company difference</L>.</span>,
  },
  {
    category: "process",
    question: "How quickly can you start working on my SEO?",
    answer: <span>We can begin within 48 hours of signing on. The first week includes a full technical audit and competitive analysis. By week two, we&apos;re implementing optimizations. By month one, you&apos;ll see measurable improvements in your <L href="/nyc-marketing-company-services-list">technical SEO foundation</L>. <L href="/contact-nyc-marketing-company-consortium-nyc">Schedule a call</L> and we can start this week.</span>,
  },
  {
    category: "process",
    question: "What happens if I'm not happy with the results?",
    answer: <span>No contracts means you can leave anytime. But before that — we talk. If something isn&apos;t working, we adjust strategy immediately. We have a 90%+ client retention rate because we communicate proactively and pivot when needed. We&apos;d rather fix a problem than lose a client. See <L href="/nyc-marketing-company-portfolio">our track record</L>.</span>,
  },
  {
    category: "process",
    question: "Do you provide competitor analysis reports?",
    answer: <span>Yes — detailed competitor analysis is included in every engagement. We analyze your top 5–10 <L href="/industries-we-offer-marketing-services-for">local competitors</L>: their keyword rankings, backlink profiles, content strategies, GBP presence, and website performance. This reveals gaps we can exploit and strategies we can beat. Your initial audit includes this at no extra cost.</span>,
  },
  {
    category: "process",
    question: "How often do you communicate with clients?",
    answer: <span>As often as needed. Most clients hear from us weekly with quick updates and monthly with full reports. But we&apos;re always reachable — phone, email, text. We respond same-day, usually within hours. You&apos;ll never wonder what we&apos;re doing with your <L href="/nyc-marketing-pricing-guide">$950/month</L>.</span>,
  },
  {
    category: "process",
    question: "Can I see examples of your work before hiring you?",
    answer: <span>Yes. Our <L href="/nyc-marketing-company-portfolio">portfolio</L> shows real results from real businesses — rankings gained, traffic growth, revenue attributed. We don&apos;t use stock photo case studies or anonymized data. We show you actual businesses we&apos;ve helped across <L href="/industries-we-offer-marketing-services-for">100+ industries</L> in <L href="/services-areas-we-offer-marketing-services-in">80+ neighborhoods</L>.</span>,
  },
  {
    category: "process",
    question: "What metrics do you track for local businesses?",
    answer: <span>We track metrics that matter: keyword rankings by <L href="/services-areas-we-offer-marketing-services-in">neighborhood</L>, organic traffic, phone calls from Google, form submissions, direction requests, GBP impressions, conversion rates, and cost per lead. Vanity metrics like social media followers don&apos;t pay your bills — we focus on the numbers that do.</span>,
  },
  {
    category: "process",
    question: "Do you offer a free SEO audit?",
    answer: <span>Yes. Our <L href="/contact-nyc-marketing-company-consortium-nyc">free audit</L> covers your current rankings, website technical health, Google Business Profile status, local citation consistency, competitor landscape, and specific opportunities we see in your <L href="/services-areas-we-offer-marketing-services-in">market</L>. It&apos;s a genuine analysis — not a sales pitch disguised as an audit. We&apos;ll tell you the truth even if it means you don&apos;t need us.</span>,
  },

  // ─── Technical (91–95) ───
  {
    category: "technical",
    question: "What is schema markup and why does my website need it?",
    answer: <span>Schema markup is structured data that tells Google exactly what your business does, where you&apos;re located, your hours, services, reviews, and more. It enables rich results (star ratings, FAQ dropdowns, business info) in search. Every <L href="/nyc-marketing-company-services-list">website we build</L> includes LocalBusiness, FAQ, Service, and BreadcrumbList schema for maximum search visibility.</span>,
  },
  {
    category: "technical",
    question: "How important is website speed for SEO and conversions?",
    answer: <span>A 1-second delay in page load reduces conversions by 7%. Google uses page speed as a ranking factor. Our <L href="/nyc-marketing-company-services-list">Next.js websites</L> load in under 2 seconds — compared to the 4–6 second average for WordPress sites. For <L href="/industries-we-offer-marketing-services-for">local businesses</L> where a customer&apos;s next option is one click away, speed isn&apos;t optional.</span>,
  },
  {
    category: "technical",
    question: "What is HTTPS and does my business website need SSL?",
    answer: <span>HTTPS encrypts data between your website and visitors. Google has flagged non-HTTPS sites as &ldquo;Not Secure&rdquo; since 2018, and it&apos;s a confirmed ranking factor. Every <L href="/nyc-marketing-company-services-list">website we build</L> includes automatic SSL through our hosting infrastructure. If your current site doesn&apos;t have HTTPS, it&apos;s hurting your rankings and scaring away customers.</span>,
  },
  {
    category: "technical",
    question: "What is a sitemap and why does my website need one?",
    answer: <span>A sitemap is an XML file that tells Google every page on your website and how they&apos;re connected. It helps Google discover and index your content faster — especially important for sites with <L href="/services-areas-we-offer-marketing-services-in">dozens of service area pages</L> and <L href="/industries-we-offer-marketing-services-for">industry pages</L>. We auto-generate sitemaps on every site we build and submit them to Google Search Console.</span>,
  },
  {
    category: "technical",
    question: "How do I know if my website has technical SEO problems?",
    answer: <span>Common signs: slow load times, pages not appearing in Google, thin content warnings in Search Console, mobile usability issues, or declining traffic. Our <L href="/contact-nyc-marketing-company-consortium-nyc">free audit</L> identifies every technical issue and prioritizes them by impact. Most businesses we audit have 10–20 fixable issues costing them rankings.</span>,
  },

  // ─── General (96–100) ───
  {
    category: "general",
    question: "What is the best marketing strategy for a new NYC business?",
    answer: <span>Start with three things: a fast, conversion-focused <L href="/nyc-marketing-company-services-list">website</L>, <L href="/nyc-marketing-company-services-list">local SEO</L> targeting your immediate <L href="/services-areas-we-offer-marketing-services-in">neighborhood</L>, and an optimized <L href="/nyc-marketing-company-services-list">Google Business Profile</L>. These build a foundation that compounds over time. Skip the paid ads until organic channels are working. See our <L href="/nyc-marketing-pricing-guide">startup pricing</L>.</span>,
  },
  {
    category: "general",
    question: "How do I know if my current marketing company is doing a good job?",
    answer: <span>Ask: What keywords am I ranking for? How many leads did marketing generate last month? What&apos;s my cost per lead? If they can&apos;t answer with specific numbers, that&apos;s your answer. We offer an <L href="/contact-nyc-marketing-company-consortium-nyc">honest free audit</L> — we&apos;ll tell you exactly where you stand, no obligation, no pitch.</span>,
  },
  {
    category: "general",
    question: "Is social media marketing important for NYC local businesses?",
    answer: <span>It depends on your <L href="/industries-we-offer-marketing-services-for">industry</L>. <L href="/industries-we-offer-marketing-services-for/restaurant-food-service-marketing">Restaurants</L> and <L href="/industries-we-offer-marketing-services-for/salon-spa-marketing">salons</L> get significant business from Instagram. <L href="/industries-we-offer-marketing-services-for/plumber-marketing">Plumbers</L> and <L href="/industries-we-offer-marketing-services-for/hvac-company-marketing">HVAC companies</L> don&apos;t. We recommend investing in channels with the highest ROI first — usually <L href="/nyc-marketing-company-services-list">SEO</L> and <L href="/nyc-marketing-company-services-list">Google Business Profile</L>. Social media is a supplement, not a foundation.</span>,
  },
  {
    category: "general",
    question: "What is the difference between a marketing agency and a marketing consultant?",
    answer: <span>Agencies have teams, overhead, and often junior staff doing the work. Consultants have expertise but limited execution capacity. The NYC Marketing Company is the best of both — you get <L href="/about-digital-marketing-agency-consortium-nyc">senior-level strategy AND execution</L> without the agency markup. We build, implement, and manage everything in-house.</span>,
  },
  {
    category: "general",
    question: "How do I get started with The NYC Marketing Company?",
    answer: <span><L href="/contact-nyc-marketing-company-consortium-nyc">Schedule a free strategy session</L>. We&apos;ll review your current situation, audit your competitors, and give you a clear roadmap — whether you hire us or not. No pitch decks, no pressure. Just a real conversation about what it takes to win in your <L href="/services-areas-we-offer-marketing-services-in">local market</L>. You can also call us at (212) 202-9220.</span>,
  },
];

/* ── Stats ────────────────────────────────────────────────────── */
const stats = [
  { value: 100, suffix: "+", label: "FAQs Answered" },
  { value: 12, suffix: "", label: "Categories" },
  { value: 25, suffix: "+", label: "Years Experience" },
  { value: 100, suffix: "+", label: "Industries Served" },
];

export default function FAQPageClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true });

  const filtered = activeCategory
    ? faqs.filter((f) => f.category === activeCategory)
    : faqs;

  const midpoint = Math.ceil(filtered.length / 2);
  const leftColumn = filtered.slice(0, midpoint);
  const rightColumn = filtered.slice(midpoint);

  const renderFAQ = (faq: typeof faqs[0], i: number, globalIndex: number) => {
    const isOpen = openIndex === globalIndex;
    return (
      <motion.div
        key={`${faq.category}-${globalIndex}`}
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: (i % 6) * 0.03 }}
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

  // Track original indices for open/close state
  const getOriginalIndex = (faq: typeof faqs[0]) => faqs.indexOf(faq);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-400/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-[0.2em] uppercase text-teal-300 bg-teal-900/40 rounded-full mb-6 font-cta">
              100 Marketing Questions Answered
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 font-heading leading-tight">
              NYC Marketing Company{" "}
              <span className="text-teal-400">FAQ</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto mb-8">
              Honest answers to 100 questions about <L href="/nyc-marketing-company-services-list">SEO</L>, <L href="/nyc-marketing-company-services-list">web design</L>, <L href="/nyc-marketing-pricing-guide">pricing</L>, <L href="/artificial-intelligence-marketing-services-offered">AI automation</L>, and hiring a marketing company for your <L href="/services-areas-we-offer-marketing-services-in">NYC</L> business. No fluff. No sales pitch. Just truth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact-nyc-marketing-company-consortium-nyc"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Skip to Free Strategy Session
              </Link>
              <Link
                href="/nyc-marketing-pricing-guide"
                className="inline-block px-8 py-4 text-base font-bold text-white/80 rounded-lg border border-white/20 hover:bg-white/5 transition-colors font-cta"
              >
                See Pricing First
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<>The best question you can ask a marketing company is <strong>&ldquo;show me the data.&rdquo;</strong> If they can&apos;t tell you exactly how many leads they generated last month, <strong>that tells you everything</strong>.</>}
      />

      {/* ── STATS TICKER ────────────────────────────────────── */}
      <section ref={statsRef} className="bg-teal-600 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  <CountUp value={stat.value} suffix={stat.suffix} inView={statsInView} />
                </p>
                <p className="text-teal-100 text-xs font-medium font-cta mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY FILTER ─────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-b border-slate-100 sticky top-[72px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => { setActiveCategory(null); setOpenIndex(null); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all font-cta ${
                !activeCategory
                  ? "bg-teal-600 text-white border-teal-600"
                  : "text-slate-600 hover:text-teal-600 hover:bg-teal-50 border-slate-200 hover:border-teal-300"
              }`}
            >
              All 100
            </button>
            {categories.map((cat) => {
              const count = faqs.filter((f) => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id === activeCategory ? null : cat.id); setOpenIndex(null); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all font-cta ${
                    activeCategory === cat.id
                      ? "bg-teal-600 text-white border-teal-600"
                      : "text-slate-600 hover:text-teal-600 hover:bg-teal-50 border-slate-200 hover:border-teal-300"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ GRID ────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 font-heading">
              {activeCategory
                ? `${categories.find((c) => c.id === activeCategory)?.label} Questions`
                : "All 100 Marketing FAQs"}
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {activeCategory
                ? `${filtered.length} questions about ${categories.find((c) => c.id === activeCategory)?.label.toLowerCase()} for NYC businesses.`
                : "Everything you need to know about hiring a marketing company in NYC, Long Island, and Westchester."}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="space-y-3">
              {leftColumn.map((faq, i) => renderFAQ(faq, i, getOriginalIndex(faq)))}
            </div>
            <div className="space-y-3">
              {rightColumn.map((faq, i) => renderFAQ(faq, i, getOriginalIndex(faq)))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CROSS-LINKS ─────────────────────────────────────── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 font-heading">Explore Our Services</h3>
              <div className="space-y-2">
                {[
                  { label: "SEO Services", href: "/services/search-engine-optimization-seo-nyc" },
                  { label: "Web Design", href: "/services/web-design-nyc" },
                  { label: "Brand Strategy", href: "/services/brand-strategy-identity-in-nyc" },
                  { label: "AI Automation", href: "/services/analytics-technology-in-nyc" },
                  { label: "Marketing Strategy", href: "/services/business-strategy-consulting-in-nyc" },
                  { label: "Marketing Manager", href: "/services/marketing-manager-consulting-in-nyc" },
                  { label: "All Services", href: "/nyc-marketing-company-services-list" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-4 font-heading">More Resources</h3>
              <div className="space-y-2">
                {[
                  { label: "Transparent Pricing Guide", href: "/nyc-marketing-pricing-guide" },
                  { label: "Portfolio & Results", href: "/nyc-marketing-company-portfolio" },
                  { label: "100+ Industries We Serve", href: "/industries-we-offer-marketing-services-for" },
                  { label: "80+ Service Areas", href: "/services-areas-we-offer-marketing-services-in" },
                  { label: "What's Working in Marketing", href: "/whats-working-in-marketing" },
                  { label: "About The NYC Marketing Company", href: "/about-digital-marketing-agency-consortium-nyc" },
                  { label: "Free Strategy Session", href: "/contact-nyc-marketing-company-consortium-nyc" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors">
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 font-heading">
              Still Have Questions?{" "}
              <span className="text-teal-600">We Pick Up the Phone.</span>
            </h2>
            <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto">
              100 FAQs can&apos;t replace a real conversation about your business. Schedule a free strategy session and get honest answers about your specific <L href="/services-areas-we-offer-marketing-services-in">market</L>, <L href="/industries-we-offer-marketing-services-for">industry</L>, and goals.
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
    </>
  );
}
