// @ts-nocheck
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import { BrandLink } from "@/app/site/the-nyc-marketing-company/_lib/brand";

const title = "What's Working in Marketing Right Now | Consortium NYC (Now The NYC Marketing Company)";
const description =
  "Real-time notes, updates, and observations from the team at Consortium NYC (Now The NYC Marketing Company). What's actually working in SEO, web design, and digital marketing — no fluff, no theory. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/whats-working-in-marketing";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "what works in marketing 2026",
    "SEO strategies NYC",
    "marketing updates",
    "digital marketing trends",
    "NYC marketing insights",
    "SEO tips NYC businesses",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "Consortium NYC (Now The NYC Marketing Company)",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Consortium NYC (Now The NYC Marketing Company)" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.jpg"],
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.consortiumnyc.com" },
  { name: "What's Working in Marketing", url },
];

const updates = [
  {
    pinned: true,
    date: "March 6, 2026",
    title: "Moodap\u2122 Launches with 25,000 Pages — 2,000 on Page 1 in 2 Months",
    content: (
      <>
        <p>
          <a href="https://www.moodap.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Moodap&trade;</a> just launched with 25,000 pages. Not 25. Not 250. Twenty-five thousand. And within 2 months, over 2,000 of those pages hit page 1 on Google. Traffic went from zero to 1,000+ monthly visits. Growth: 3,490%.
        </p>
        <p>
          How? Programmatic SEO at scale. Every page is unique, keyword-targeted, and built to match real search intent. No AI-generated filler. No duplicate content with swapped city names. Every page has a reason to exist and a keyword it&apos;s built to rank for.
        </p>
        <p>
          The tech stack made this possible. Try deploying 25,000 pages on WordPress — it would crawl. On our <strong>Next.js + Vercel</strong> stack, every page loads in under 2 seconds, gets server-rendered for SEO, and deploys globally on edge servers. Google indexed thousands of pages in the first week because the site was fast, clean, and structured correctly.
        </p>
        <p>
          Moodap is pre-revenue — this is pure organic growth with zero ad spend. The foundation is set. When monetization kicks in, the traffic is already there.
        </p>
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm my-6">
          <Image src="/images/proof/moodap-google-console-magic-run.png" alt="Moodap Google Search Console — 699 clicks, 50.7K impressions, explosive growth curve" width={800} height={450} className="w-full h-auto" />
          <div className="bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            <strong className="text-slate-700">Google Search Console</strong> — Moodap&trade; 16-month view. 699 clicks, 50.7K impressions, hockey stick growth starting Feb 2026.
          </div>
        </div>
        <p>
          This is what we mean when we say we build businesses, not just websites. See the <Link href="/nyc-marketing-company-portfolio" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">full case study</Link>.
        </p>
      </>
    ),
    tags: ["Case Study", "SEO", "Programmatic", "Startups"],
  },
  {
    pinned: true,
    date: "March 5, 2026",
    title: "Micro Sites with Exact Match Domains Are Killing It",
    content: (
      <>
        <p>
          We&apos;ve been testing micro sites on exact match domains (EMDs) and the results are insane. Page 1 rankings in 7 days. Not 7 months. Seven days.
        </p>
        <p>
          The strategy: buy an exact match domain for a hyper-specific keyword — like <a href="https://www.thenycseo.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">thenycseo.com</a>, <a href="https://www.thenycmobilesalon.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">thenycmobilesalon.com</a>, or <a href="https://www.thenycmaid.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">thenycmaid.com</a>. Build a fast, focused site on our stack. Publish 10-20 highly targeted pages. Submit to Google. Watch it index and rank within the first week.
        </p>
        <p>
          Google supposedly &ldquo;devalued&rdquo; EMDs years ago. That&apos;s not what we&apos;re seeing. When you combine an exact match domain with a lightning-fast site, strong on-page SEO, and content that actually matches search intent — EMDs still have a massive edge. The domain itself signals relevance before Google even crawls the first page.
        </p>
        <p>
          Results from our latest micro sites:
        </p>
        <ul>
          <li><strong>The NYC SEO</strong> — 500 page 1 rankings in 15 days</li>
          <li><strong>The NYC Mobile Salon</strong> — 500 page 1 rankings in under 15 days</li>
          <li><strong>The NYC Classifieds</strong> — 10+ page 1 rankings in under 10 days</li>
        </ul>
        <p>
          We&apos;re now building micro sites as part of our <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">SEO strategy</Link> for clients in competitive industries. Instead of fighting for one domain to rank for everything, we deploy targeted micro sites that dominate specific niches fast — then funnel the leads back to the main business.
        </p>
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm my-6">
          <Image src="/images/proof/nyc-maid-emd-website-.png" alt="thenycmaid.com EMD ranking #1 and #2 on Google for UES maid" width={800} height={450} className="w-full h-auto" />
          <div className="bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            <strong className="text-slate-700">EMD Proof</strong> — thenycmaid.com owns positions #1 and #2 on Google for &ldquo;UES maid&rdquo; plus dominates the map pack. Exact match domain + fast site + strong SEO = page 1 in days.
          </div>
        </div>
      </>
    ),
    tags: ["SEO", "EMD", "Strategy", "Quick Wins"],
  },
  {
    pinned: true,
    date: "January 15, 2026",
    title: "The NYC Maid Hit 500+ Page 1 Rankings",
    content: (
      <>
        <p>
          One of our startup clients, <a href="https://www.thenycmaid.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">The NYC Maid</a>, just crossed 500 page 1 rankings in 6 months from launch. 60 leads/month. $68K in revenue. From zero.
        </p>
        <p>
          What worked: hyper-local neighborhood pages for every area they serve across <Link href="/services-areas-we-offer-marketing-services-in/manhattan-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Manhattan</Link>, <Link href="/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Brooklyn</Link>, and <Link href="/services-areas-we-offer-marketing-services-in/queens-marketing-company" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Queens</Link>. Service-specific pages for every cleaning type. Internal linking between everything. Fast site on our custom stack. And a Google Business Profile managed like it matters — because it does.
        </p>
        <p>
          No ads. No social media. Just SEO done right.
        </p>
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm my-6">
          <Image src="/images/proof/nyc-mail-google-console-huge-growth.png" alt="The NYC Maid Google Search Console — 151 clicks, 25.3K impressions, massive growth" width={800} height={450} className="w-full h-auto" />
          <div className="bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            <strong className="text-slate-700">Search Console</strong> — 151 clicks, 25.3K impressions in 3 months. Growth accelerating.
          </div>
        </div>
      </>
    ),
    tags: ["Case Study", "SEO", "Startups"],
  },
  {
    date: "March 7, 2026",
    title: "Meet Selena — Our First AI Sales & Customer Service Text Bot",
    content: (
      <>
        <p>
          We just launched Selena — a fully custom AI-powered text bot built for sales and customer service. She handles inbound inquiries, qualifies leads, answers questions, books appointments, and follows up automatically via SMS. All in a natural, conversational tone that doesn&apos;t feel like a bot.
        </p>
        <p>
          Selena runs on our own infrastructure — <strong>Telnyx</strong> for SMS, <strong>Supabase</strong> for conversation history and lead tracking, and <strong>Claude AI</strong> for natural language understanding. She&apos;s not a chatbot widget on a website. She&apos;s a real phone number that texts back like a human, 24/7.
        </p>
        <p>
          Early results: response times went from hours to seconds. Lead-to-appointment conversion jumped 40%. And business owners stopped losing after-hours leads to competitors who picked up the phone first.
        </p>
        <p>
          Selena is the first product from our new platform, <a href="https://homeservicesbusinesscrm.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Full Loop CRM</a>. More on that below.
        </p>
      </>
    ),
    tags: ["AI", "Automation", "Product Launch"],
  },
  {
    date: "March 7, 2026",
    title: "We Launched Full Loop CRM",
    content: (
      <>
        <p>
          <a href="https://homeservicesbusinesscrm.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Full Loop CRM</a> is live. It&apos;s our own CRM platform built specifically for small businesses that are tired of paying $300/month for tools they use 10% of.
        </p>
        <p>
          Full Loop combines lead tracking, automated follow-up, AI-powered text bots (like Selena), appointment scheduling, review management, and reporting — all in one platform. Built on the same stack we use for everything: <strong>Next.js</strong>, <strong>Supabase</strong>, <strong>Resend</strong>, and <strong>Telnyx</strong>.
        </p>
        <p>
          This isn&apos;t a white-labeled version of someone else&apos;s software. We built it from scratch because every CRM we tried was either too bloated, too expensive, or missing the <Link href="/artificial-intelligence-marketing-services-offered" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">AI automation</Link> features our clients actually need. Now our clients get it bundled into their <Link href="/nyc-marketing-pricing-guide" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">marketing packages</Link>.
        </p>
        <p>
          Full loop: marketing drives the lead, AI qualifies and books it, CRM tracks it, automation follows up, review system closes the loop. That&apos;s why it&apos;s called Full Loop.
        </p>
      </>
    ),
    tags: ["Product Launch", "CRM", "AI", "Automation"],
  },
  {
    date: "September 12, 2025",
    title: "We Abandoned All CMS Platforms. Here's Why.",
    content: (
      <>
        <p>
          As of this week, <BrandLink /> has fully abandoned WordPress, Webflow, Squarespace, and every other CMS platform. Every client site — including this one — now runs on our custom stack:
        </p>
        <ul>
          <li><strong>Next.js</strong> — React framework for server-rendered, SEO-optimized pages</li>
          <li><strong>Vercel</strong> — Edge hosting with global CDN, instant deploys</li>
          <li><strong>Supabase</strong> — Postgres database, auth, real-time subscriptions</li>
          <li><strong>Resend</strong> — Transactional email that actually lands in inboxes</li>
          <li><strong>Telnyx</strong> — Programmable voice, SMS, and communication APIs</li>
        </ul>
        <p>
          Why? Because CMS platforms are bloated, slow, and full of security vulnerabilities. WordPress sites average 3-5 second load times. Ours load in under 2 seconds. WordPress sites get hacked constantly — ours don&apos;t have a database exposed to the internet.
        </p>
        <p>
          The result: every site we build scores 90+ on Core Web Vitals, deploys in seconds, and costs less to host than a WordPress site with 12 plugins. This is the same tech stack Fortune 500 companies use — and we bring it to local businesses at <Link href="/nyc-marketing-pricing-guide" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">small business pricing</Link>.
        </p>
        <p>
          If your current marketing company is still building on WordPress in 2026, ask them why.
        </p>
      </>
    ),
    tags: ["Web Design", "Tech Stack", "Performance"],
  },
  {
    date: "October 3, 2025",
    title: "Google's October 2025 Core Update: What We're Seeing",
    content: (
      <>
        <p>
          Google rolled out another core update this month. Here&apos;s what we&apos;re seeing across our client portfolio:
        </p>
        <ul>
          <li>Sites with original, experience-based content are gaining. Rewritten AI slop is getting crushed.</li>
          <li>Page speed matters more than ever. Clients on our custom stack saw zero negative impact. Clients we audited on WordPress lost 10-20% traffic.</li>
          <li>Local signals are getting stronger. <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Google Business Profile</Link> activity, review velocity, and local citations are carrying more weight in map pack rankings.</li>
          <li>Internal linking is being rewarded. Sites with strong topical clusters and cross-linked service/industry/area pages are outperforming flat site structures.</li>
        </ul>
        <p>
          Our takeaway: keep doing what works. Build real content from real experience. Make your site fast. Link everything together. The fundamentals haven&apos;t changed — Google is just getting better at enforcing them.
        </p>
      </>
    ),
    tags: ["SEO", "Google Updates", "Strategy"],
  },
  {
    date: "November 8, 2025",
    title: "AI Chatbots Are Replacing Contact Forms",
    content: (
      <>
        <p>
          We&apos;re seeing a clear trend across our <Link href="/industries-we-offer-marketing-services-for/home-service-business-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">home service</Link> and <Link href="/industries-we-offer-marketing-services-for/dental-practice-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">dental</Link> clients: AI chatbots are converting 2-3x better than traditional contact forms.
        </p>
        <p>
          Why? Because people don&apos;t want to fill out a form and wait. They want to ask a question and get an answer. Our <Link href="/artificial-intelligence-marketing-services-offered" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">AI automation</Link> agents qualify leads, answer FAQs, book appointments, and hand off to the business owner — all in real time, 24/7.
        </p>
        <p>
          The businesses that adopt this now have a massive advantage. The ones that wait will be playing catch-up in 12 months.
        </p>
      </>
    ),
    tags: ["AI", "Lead Generation", "Automation"],
  },
  {
    date: "December 2, 2025",
    title: "Long-Tail Industry Pages Are SEO Gold",
    content: (
      <>
        <p>
          We just rolled out <Link href="/industries-we-offer-marketing-services-for" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">105 industry-specific pages</Link> on this site. Not generic &ldquo;we serve restaurants&rdquo; pages — deep, long-tail pages like <Link href="/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">personal injury law firm marketing</Link> and <Link href="/industries-we-offer-marketing-services-for/hvac-company-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">HVAC company marketing</Link>.
        </p>
        <p>
          Within 2 weeks, we&apos;re already seeing indexation and early ranking signals for dozens of these pages. The strategy is simple: every industry someone searches for + &ldquo;marketing company&rdquo; should land on a dedicated, optimized page on your site. Not a blog post. Not a generic services page. A real page built for that exact search.
        </p>
        <p>
          This is the same approach we used to get <Link href="/nyc-marketing-company-portfolio" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Moodap&trade; to 2,000 page 1 rankings in 2 months</Link>. Programmatic SEO at scale.
        </p>
      </>
    ),
    tags: ["SEO", "Content Strategy", "Industries"],
  },
  {
    date: "February 21, 2026",
    title: "Review Velocity Is the New Backlink",
    content: (
      <>
        <p>
          We&apos;re tracking a strong correlation between review velocity (how fast you get new Google reviews) and map pack rankings. Businesses that get 5+ new reviews per month are consistently outranking competitors with more total reviews but slower growth.
        </p>
        <p>
          Our automated review request system — triggered after service completion via <Link href="/artificial-intelligence-marketing-services-offered" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">AI automation</Link> — is generating 3-5x more reviews than manual ask-for-a-review approaches. The key is timing: ask within 2 hours of service, make it one tap, and follow up once if they don&apos;t respond.
        </p>
        <p>
          If you&apos;re not actively managing your review pipeline, you&apos;re losing to competitors who are.
        </p>
      </>
    ),
    tags: ["Local SEO", "Reviews", "Automation"],
  },
];

export default function WhatsWorking() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {/* Hero */}
      <section className="pt-32 pb-12 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            From the Marketing Trenches
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
            What&apos;s Actually Working in{" "}
            <span className="text-teal-400">Marketing Right Now</span>
          </h1>
          <p className="text-white/70 text-lg mb-6">
            We believe in helping each other. This page exists because too many business owners get bad advice from people who don&apos;t do the work. We do the work — every day, for real businesses across <Link href="/services-areas-we-offer-marketing-services-in" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">NYC, Long Island, and beyond</Link>.
          </p>
          <p className="text-white/50 text-base">
            These are our real-time notes from the field — what we&apos;re testing, what&apos;s moving the needle, and what we&apos;re seeing across our <Link href="/nyc-marketing-company-portfolio" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">client portfolio</Link>. No gatekeeping. No paywalls. Just honest observations from 25 years of doing this, shared so every business owner can make smarter decisions — whether they hire us or not.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>What worked in marketing two years ago <strong>might be hurting you today</strong>. The businesses winning right now adapted. The ones struggling didn&apos;t. Here&apos;s <strong>what&apos;s actually working</strong>.</>}
      />

      {/* Updates feed */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-0">
            {updates.map((update, i) => (
              <div key={i} className={`relative pl-8 pb-12 last:pb-0 ${update.pinned ? "-ml-4 -mr-4 pl-12 pr-4 pt-5 mb-4 rounded-2xl bg-teal-50/60 border border-teal-200/60" : ""}`}>
                {/* Timeline line */}
                {i < updates.length - 1 && (
                  <div className={`absolute ${update.pinned ? "left-[27px]" : "left-[11px]"} top-6 bottom-0 w-px bg-slate-200`} />
                )}
                {/* Timeline dot */}
                <div className={`absolute ${update.pinned ? "left-4" : "left-0"} top-${update.pinned ? "[25px]" : "[6px]"} w-[23px] h-[23px] rounded-full border-[3px] ${update.pinned ? "border-teal-600 bg-teal-100" : "border-teal-500 bg-white"}`} />

                {/* Pinned badge */}
                {update.pinned && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                    <span className="text-teal-600 text-xs font-bold uppercase tracking-wider font-cta">Pinned</span>
                  </div>
                )}

                {/* Date */}
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
                  {update.date}
                </p>

                {/* Title */}
                <h2 className={`text-xl font-bold mb-4 font-heading ${update.pinned ? "text-slate-900" : "text-slate-900"}`}>
                  {update.title}
                </h2>

                {/* Content */}
                <div className="prose-sm text-slate-600 leading-relaxed space-y-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_li]:text-slate-600 [&_strong]:text-slate-900">
                  {update.content}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {update.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${update.pinned ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-slate-600 text-lg mb-6">
              Want these strategies applied to your business?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Schedule a Free Strategy Session
              </Link>
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
              >
                Get a Free SEO Audit
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}