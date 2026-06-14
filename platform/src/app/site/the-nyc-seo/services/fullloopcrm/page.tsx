// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Full Loop CRM | Home Service Business CRM",
  description:
    "Full Loop CRM — the first full-cycle CRM for home service businesses. Lead gen to service completion and retargeting. Territory exclusive. By Consortium NYC.",
  keywords: [
    "Full Loop CRM",
    "CRM for home service businesses",
    "home service CRM",
    "field service CRM",
    "cleaning business CRM",
    "HVAC CRM",
    "plumbing CRM",
    "contractor CRM",
    "full cycle CRM",
    "lead generation CRM",
    "AI sales assistant",
    "service business software",
    "Consortium NYC CRM",
  ],
  openGraph: {
    title: "Full Loop CRM | Home Service Business CRM",
    description:
      "Full-cycle CRM for home service businesses. Lead gen to service completion and retargeting. Territory exclusive. By Consortium NYC.",
    url: `${SITE_URL}/services/fullloopcrm`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/fullloopcrm` },
};

const faqs = [
  {
    q: "What is Full Loop CRM?",
    a: "Full Loop CRM is the first full-cycle CRM built specifically for home service businesses. It covers every stage of your business — from organic lead generation and AI-powered sales to scheduling, GPS-tracked field operations, payments, client feedback, and retargeting. One platform replaces Jobber, Housecall Pro, ServiceTitan, Mailchimp, SimpleTexting, Google Analytics, QuickBooks, and more. Built by Consortium NYC, the same team behind The NYC SEO.",
  },
  {
    q: "How much does Full Loop CRM cost?",
    a: "The platform license is $25,000 per year. This includes all 7 business stages, the AI sales assistant (Selenas), all client and team portals, lead tracking, GPS operations, financial tools, and core updates. Installation and setup ranges from $5,000 to $15,000 depending on your business size. Optional monthly support retainers start at $750 per month. Every dollar goes into real infrastructure — not per-seat fees or per-lead charges.",
  },
  {
    q: "What does territory exclusivity mean?",
    a: "Full Loop CRM locks one service provider per trade per metropolitan area on a first-come, first-serve basis. If you are the cleaning company on Full Loop CRM in your metro, no other cleaning company in your market can access the same platform, the same leads, or the same organic domains. This prevents platform-based competition and gives you a permanent advantage. Once your territory is claimed, it is yours.",
  },
  {
    q: "What tools does Full Loop CRM replace?",
    a: "Full Loop CRM replaces 9+ traditional tools: Jobber (scheduling), Housecall Pro (field management), ServiceTitan (operations), Mailchimp (email marketing), SimpleTexting (SMS), Google Analytics (tracking), QuickBooks (finance), ReferralCandy (referrals), and any lead generation service you currently pay for. One login, zero integrations, no per-lead costs.",
  },
  {
    q: "What is the AI sales assistant (Selenas)?",
    a: "Selenas is a 24/7 bilingual AI chatbot that engages leads via SMS the moment they come in. She qualifies prospects by location, service type, home size, and budget. She answers 12+ common questions about pricing, insurance, cancellation policies, and scheduling. She handles rescheduling and complaint escalation for existing clients. Full conversation transcripts are stored in every client profile. Selenas handles 80% of receptionist duties automatically — your phone stops ringing for questions that do not need you.",
  },
  {
    q: "How does lead generation work in Full Loop CRM?",
    a: "Full Loop CRM includes a multi-domain SEO strategy with neighborhood-specific websites. We build and manage 100+ domains targeting organic search across Google, Bing, ChatGPT, Claude, and DuckDuckGo. The attribution engine maps client addresses to domains with confidence scoring so you know exactly which neighborhood website generated each lead. No per-lead costs. No Google Ads dependency. Pure organic lead generation built into the platform.",
  },
  {
    q: "Does Full Loop CRM work for my type of business?",
    a: "Full Loop CRM is built for any home service or field service business — cleaning services, carpet cleaning, window cleaning, pressure washing, landscaping, lawn care, handyman, pest control, HVAC, plumbing, electrical, painting, junk removal, pool cleaning, and more. If your business sends teams to customer locations on a scheduled or on-demand basis, Full Loop CRM is built for you.",
  },
  {
    q: "How does GPS tracking work?",
    a: "Team members check in and out of jobs using the bilingual team portal. GPS verification confirms they are within 528 feet of the job site. The system automatically calculates actual hours worked for payroll. You see real-time location of your teams in the admin dashboard. Emergency jobs can be broadcast to all available staff with one click.",
  },
  {
    q: "Is there bilingual support?",
    a: "Yes. The entire team portal is available in English and Spanish with PIN-based login. The AI sales assistant Selenas is fully bilingual. Client communications can be sent in either language. This is critical for home service businesses in markets like NYC where bilingual operations are not optional — they are a competitive requirement.",
  },
  {
    q: "How does Full Loop CRM compare to ServiceTitan or Jobber?",
    a: "ServiceTitan and Jobber are operational tools — they help you schedule and dispatch. They do not generate leads. Full Loop CRM starts with lead generation and follows the customer through every stage: AI-powered sales, booking, field operations, payments, feedback, and retargeting. You do not need to bolt on Mailchimp, Thumbtack, or Google Ads to fill your schedule. The leads come from your own organic domains, owned by you, exclusive to your territory.",
  },
  {
    q: "What is the tech stack behind Full Loop CRM?",
    a: "Full Loop CRM is built on the same modern stack we use for all Consortium NYC products — Next.js for the frontend, Supabase for the database and authentication, Vercel for hosting and deployment, Resend for transactional email, and Telnyx for SMS and voice. No WordPress. No legacy code. No plugin dependencies. This stack delivers sub-1-second load times, 99.9% uptime, and the ability to scale to thousands of concurrent users without performance degradation.",
  },
  {
    q: "Who built Full Loop CRM?",
    a: "Full Loop CRM is built and owned by Consortium NYC — the same company behind The NYC SEO. We have 25+ years of experience in home services, web development, SEO, and business growth strategy. We built Full Loop CRM because every CRM we tried was missing the most important piece: lead generation. So we built one that starts with leads and handles everything that comes after.",
  },
];

export default function FullLoopCRMPage() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Full Loop CRM",
    url: "https://homeservicesbusinesscrm.com",
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Full Loop CRM",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://homeservicesbusinesscrm.com",
    description:
      "The first full-cycle CRM for home service businesses. Lead generation, AI sales, scheduling, GPS field operations, payments, reviews, and retargeting in one platform.",
    offers: {
      "@type": "Offer",
      price: "25000",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "25000",
        priceCurrency: "USD",
        unitText: "YEAR",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "25",
      bestRating: "5",
      worstRating: "1",
    },
    provider: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: "Full Loop CRM",
    },
    reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    author: { "@type": "Person", name: "Verified Customer" },
    reviewBody:
      "I went on vacation for a week and the business ran itself. Selenas handled every lead, the schedule stayed full, and I came back to more revenue than if I had been working. Full Loop CRM changed how I run my company.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Full Loop CRM", url: "/services/fullloopcrm" },
  ];

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                By Consortium NYC &middot; Territory Exclusive
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Full Loop CRM
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Lead Generation to Reviews
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                The first full-cycle CRM built for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">home service businesses</Link>.
                Organic lead generation,{" "}
                <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI-powered sales</Link>, scheduling, GPS field operations, payments, client feedback, and retargeting — one platform replaces 9+ tools. No per-lead costs. No Google Ads dependency. Your territory, your leads, your data. Built by{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>{" "}
                on the same stack that powers{" "}
                <Link href="/" className="text-[#5CB8FF] hover:text-[#8DD0FF]">The NYC SEO</Link>.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="space-y-4">
              {[
                "Organic lead generation — 100+ domains, zero ad spend",
                "AI sales assistant (Selenas) — 24/7 bilingual SMS",
                "Scheduling & booking with automated reminders",
                "GPS check-in/out with payroll automation",
                "Real-time revenue, P&L, and expense tracking",
                "Client retention & automated retargeting",
                "Territory exclusivity — one provider per trade per metro",
                "Built on Next.js, Supabase, Vercel, Resend, Telnyx",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#141414] p-4">
                  <span className="text-green-400">&#10003;</span>
                  <span className="text-sm text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: THE PROBLEM
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Problem With Every Other CRM
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Most CRMs are glorified scheduling tools. Jobber helps you dispatch. Housecall Pro helps you invoice. ServiceTitan helps you manage operations. But none of them answer the most important question:{" "}
              <strong className="text-white">where do the leads come from?</strong>{" "}
              Without a real{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              or{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing engine</Link>{" "}
              baked into your CRM, you are always dependent on rented traffic.
            </p>
            <p>
              So you end up paying Thumbtack $50 per lead — shared with 4 competitors. You run Google Ads at $30 to $85 per click. You list on Yelp and pray. You bolt together 9 different tools with 9 different logins, 9 different bills, and zero integration between them. Your leads go into one system, your schedule lives in another, your payments in a third, and you have no idea which marketing dollar actually produced which customer. Without proper{" "}
              <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">analytics and reporting</Link>, you are flying blind.
            </p>
            <p>
              Full Loop CRM was built because we lived this problem. After 25+ years of building{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO systems</Link>{" "}
              and{" "}
              <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web platforms</Link>{" "}
              for home service businesses, we knew the CRM market was broken. Every tool solved one piece. None solved the full loop. So we built one that does — from the first Google search to the five-star review.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: THE 7 STAGES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            7 Stages. One Platform. Zero Gaps.
          </h2>
          <p className="mt-4 text-zinc-400">
            Full Loop CRM covers every stage of the home service business lifecycle — from the moment a customer searches for your service to the moment they leave a review and refer a friend. It combines{" "}
            <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">automation</Link>,{" "}
            <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agents</Link>, and{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            into a single closed-loop system.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Lead Generation",
                body: "Full Loop CRM includes a multi-domain SEO strategy with neighborhood-specific websites. We build and manage 100+ domains targeting organic search across Google, Bing, ChatGPT, Claude, and DuckDuckGo. The attribution engine maps every lead to the exact domain and neighborhood that generated it. No per-lead costs. No ad spend. Pure organic leads flowing directly into your CRM — not shared with competitors, not marked up by a middleman. This is the same programmatic SEO approach we use at The NYC SEO, now built directly into your CRM.",
              },
              {
                step: "02",
                title: "AI-Powered Sales (Selenas)",
                body: "The moment a lead comes in, Selenas — our bilingual AI sales assistant — engages them via SMS. She qualifies prospects by location, service type, home size, and budget. She answers 12+ common questions about pricing, insurance, cancellation policies, and availability. She handles rescheduling and complaint escalation for existing clients. Full conversation transcripts are stored in every client profile. Selenas handles 80% of what a receptionist does — 24 hours a day, 7 days a week, in English and Spanish. Your phone stops ringing for questions that do not need you.",
              },
              {
                step: "03",
                title: "Scheduling & Booking",
                body: "Clients book through a self-service portal with real-time availability. The system supports 7 recurring patterns — daily, weekly, biweekly, monthly, and custom intervals. Automated 4-stage reminder cascade (7 days, 3 days, 1 day, 2 hours) virtually eliminates no-shows. Drag-and-drop calendar management with automatic price recalculation when services or schedules change. Your schedule stays full without you manually confirming every appointment.",
              },
              {
                step: "04",
                title: "Field Operations",
                body: "Team members check in and out of jobs using the bilingual team portal with GPS verification — confirming they are within 528 feet of the job site. Real-time earnings dashboards keep teams motivated. Emergency jobs can be broadcast to all available staff with one click. Automatic payroll calculation from actual hours worked eliminates timesheet disputes. PIN-based login means no app downloads, no passwords, no friction for your crew.",
              },
              {
                step: "05",
                title: "Financial Management",
                body: "Real-time revenue tracking — today, this week, this month, year-to-date. Per-team-member payroll with one-click payment marking. 9-category expense tracking with receipt uploads. P&L reporting with gross and net margin analysis. Tax-ready 1099 contractor reports generated automatically. You see exactly how much money is coming in, going out, and staying in your pocket — without opening QuickBooks.",
              },
              {
                step: "06",
                title: "Client Retention & Retargeting",
                body: "Automated thank-you emails and SMS go out 3 days after every first service. Anonymous feedback collection catches problems before they become bad reviews. AI-powered complaint detection triggers phone escalation immediately. Lifecycle status tracking (New, Active, At-Risk, Churned) shows you exactly which clients need attention. Built-in referral program with 10% commission tracking turns your best customers into your best salespeople.",
              },
              {
                step: "07",
                title: "Admin & Analytics Dashboard",
                body: "11 purpose-built pages covering every aspect of your operations. Executive dashboard with revenue cards and 10-month forecasting. Client management with lifecycle status. Team management with GPS tracking history. Lead analytics across your entire domain portfolio. Notification center with 20+ event types. In-app technical documentation covering 25 sections. One login. One dashboard. Complete visibility into every corner of your business.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0080FE] text-lg font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{item.title}</h3>
                  <p className="mt-3 text-zinc-300 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: REPLACES 9+ TOOLS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">One Platform Replaces 9+ Tools</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Stop paying for a patchwork of disconnected software. Full Loop CRM does what all of these tools do — in one place, with zero integrations needed. See our{" "}
              <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pricing page</Link>{" "}
              for a full breakdown of what is included.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { replaces: "Jobber", with: "Scheduling & dispatch" },
              { replaces: "Housecall Pro", with: "Field management & GPS" },
              { replaces: "ServiceTitan", with: "Operations & workflow" },
              { replaces: "Mailchimp", with: "Email marketing & retargeting" },
              { replaces: "SimpleTexting", with: "SMS & AI conversations" },
              { replaces: "Google Analytics", with: "Lead & revenue attribution" },
              { replaces: "QuickBooks", with: "P&L, payroll & expenses" },
              { replaces: "ReferralCandy", with: "Referral program & tracking" },
              { replaces: "Thumbtack / Angi", with: "Organic lead generation" },
            ].map((item) => (
              <div key={item.replaces} className="rounded-xl border border-zinc-700 bg-[#141414] p-5">
                <p className="text-sm font-medium text-red-400 line-through">{item.replaces}</p>
                <p className="mt-1 text-sm text-green-400">{item.with}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 5: WHO IT'S FOR
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Who Full Loop CRM Is Built For</h2>
          <p className="mt-4 text-zinc-400">
            Any home service or field service business that sends teams to customer locations. Whether you are a{" "}
            <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link>,{" "}
            <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electrician</Link>, or{" "}
            <Link href="/hvac" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC contractor</Link>{" "}
            — if you have a schedule, a crew, and customers who find you through search, this is your platform.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Cleaning Services", href: "/house-cleaner" },
              { name: "HVAC Contractors", href: "/hvac" },
              { name: "Plumbers", href: "/plumber" },
              { name: "Electricians", href: "/electrician" },
              { name: "Landscapers", href: "/landscaper" },
              { name: "Painters", href: "/painter" },
              { name: "General Contractors", href: "/general-contractor" },
              { name: "Pest Control", href: "/pest-control" },
              { name: "Carpet Cleaners", href: "/carpet-cleaner" },
              { name: "Window Cleaners", href: "/window-cleaner" },
              { name: "Roofers", href: "/roofer" },
              { name: "Handyman Services", href: "/handyman" },
            ].map((industry) => (
              <Link
                key={industry.name}
                href={industry.href}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#0A0A0A] p-4 transition-colors hover:border-[#0080FE]"
              >
                <span className="text-[#0080FE]">&rarr;</span>
                <span className="text-sm font-medium text-zinc-300">{industry.name}</span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            We support{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170+ service categories</Link>{" "}
            across the NYC metro area. If your industry is not listed,{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link> — Full Loop CRM is{" "}
            <strong className="text-white">customizable for any business</strong>{" "}
            and built to adapt to any field service operation, workflow, or market. Our{" "}
            <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing consulting</Link>{" "}
            team can help determine the right configuration and{" "}
            <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link>{" "}
            for your business.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 6: TERRITORY EXCLUSIVITY
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Territory Exclusivity: Your Market. Locked.</h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              This is the single biggest differentiator between Full Loop CRM and every other platform on the market. When you sign up for Full Loop CRM, we lock your trade in your metropolitan area. If you are a cleaning company in NYC — no other cleaning company in NYC gets access to Full Loop CRM, its lead generation system, or its organic domains.
            </p>
            <p>
              On Thumbtack, you compete with every other provider on the platform. On Google Ads, you bid against every competitor in real time. On ServiceTitan, your competitor could be using the exact same tool with the exact same playbook. On Full Loop CRM, your competitor cannot even sign up. Your leads are your leads. Your domains are your domains. Your territory is yours. Combined with a strong{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
              and{" "}
              <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">off-page SEO</Link>{" "}
              presence, you own the search results in your market from every angle.
            </p>
            <p>
              Territories are assigned on a first-come, first-serve basis. Once claimed, they are permanent as long as your license is active. We are currently accepting applications for metros across{" "}
              <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC, New Jersey, Long Island, and Westchester</Link>{" "}
              — and expanding nationally.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: THE TECH STACK
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Built on the Best Stack in the Industry</h2>
          <p className="mt-4 text-zinc-400">
            Full Loop CRM runs on the same modern infrastructure we use for every Consortium NYC product — the same stack behind our{" "}
            <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web design and development</Link>{" "}
            work and our{" "}
            <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
            infrastructure. No WordPress. No legacy code. No compromises.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Next.js", desc: "React framework for sub-1-second page loads, server-side rendering, and static generation. The same tech behind The NYC SEO's 54,000+ page platform." },
              { name: "Supabase", desc: "PostgreSQL database with real-time subscriptions, row-level security, and built-in authentication. Your data is yours — not locked in a proprietary system." },
              { name: "Vercel", desc: "Edge deployment with 99.99% uptime, automatic scaling, and global CDN. Your CRM is fast no matter where your team or clients are located." },
              { name: "Resend", desc: "Transactional email with 99%+ deliverability. Automated reminders, thank-you messages, feedback requests, and retargeting campaigns." },
              { name: "Telnyx", desc: "Enterprise-grade SMS and voice infrastructure. Powers the Selenas AI assistant, appointment reminders, and all client communications." },
              { name: "Git & CI/CD", desc: "Every change is version-controlled, tested, and deployed automatically. No manual updates. No downtime. Continuous improvement built into the platform." },
            ].map((tech) => (
              <div key={tech.name} className="rounded-2xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold text-[#0080FE]">{tech.name}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Full Loop CRM Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              No per-seat fees. No per-lead charges. No surprise invoices. One platform license, everything included. Need a custom quote?{" "}
              <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Contact us</Link>{" "}
              or{" "}
              <Link href="/partnership-request-form" className="text-[#5CB8FF] hover:text-[#8DD0FF]">submit a partnership request</Link>{" "}
              to get started.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-2xl font-bold">Platform License</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#0080FE]">$25,000</span>
                <span className="text-zinc-400">/year</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">Territory-exclusive. All 7 stages included.</p>
              <ul className="mt-6 space-y-3">
                {[
                  "All 7 business stages",
                  "AI sales assistant (Selenas)",
                  "All client, team & admin portals",
                  "Lead tracking & attribution",
                  "GPS operations & payroll",
                  "Financial tools & reporting",
                  "Core platform updates",
                  "Territory exclusivity lock",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 text-green-400">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#0080FE] bg-[#0080FE]/5 p-8 ring-1 ring-[#0080FE]">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#0080FE]">One-Time Setup</p>
              <h3 className="text-2xl font-bold">Installation & Setup</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#0080FE]">$5,000</span>
                <span className="text-zinc-400">- $15,000</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">Based on business size and revenue.</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Under $500K revenue: $5,000",
                  "$500K - $1M revenue: $7,500",
                  "$1M - $3M revenue: $10,000",
                  "$3M+ revenue: $15,000+",
                  "System configuration",
                  "Data import & migration",
                  "AI assistant setup & training",
                  "Workflow design & go-live prep",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 text-green-400">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-2xl font-bold">Optional Support</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#0080FE]">$750</span>
                <span className="text-zinc-400">- $6,000/mo</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">Monthly retainers. Cancel anytime.</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Light (0.5% of revenue): $750-$1,500/mo",
                  "Active (1%): $1,500-$3,000/mo",
                  "Growth (2%): $3,000-$6,000+/mo",
                  "Ad-hoc support: $199/hour",
                  "Custom development: $299/hour",
                  "Domain network: $500-$1,000/domain",
                  "Cancel retainers anytime",
                  "You own all domains permanently",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 text-green-400">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: RESULTS / TESTIMONIALS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What Full Loop CRM Customers Say</h2>
          <div className="mt-10 space-y-8">
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-lg text-yellow-400">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
                &ldquo;I went on vacation for a week and the business ran itself. Selenas handled every lead, the schedule stayed full, and I came back to more revenue than if I had been working. I have never used a tool that actually makes me less necessary to my own company — in the best possible way.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— Cleaning Service Owner, NYC</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-lg text-yellow-400">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
                &ldquo;I turned off my ads the next day. The organic domains were already generating more leads than I was getting from Google Ads — and they were higher quality because people found us through real search, not a sponsored result. My cost per lead dropped from $85 to essentially zero.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— HVAC Company Owner, New Jersey</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-lg text-yellow-400">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
                &ldquo;The territory exclusivity sold me. I am the only landscaper in my metro on Full Loop CRM. My competitors cannot access the same leads, the same domains, or the same tools. That kind of competitive moat does not exist anywhere else.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— Landscaping Company Owner, Long Island</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: HOW IT CONNECTS TO THE NYC SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Full Loop CRM + The NYC SEO = Total Market Control</h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Full Loop CRM and The NYC SEO are both built and owned by{" "}
              <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>.
              They share the same technology stack, the same{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO methodology</Link>, and the same team. This is not a partnership — it is one integrated ecosystem.
            </p>
            <p>
              The NYC SEO builds the organic search infrastructure —{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">strategy</Link>,{" "}
              <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">technical SEO</Link>,{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content</Link>,{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>, and{" "}
              <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic page generation</Link>.
              Full Loop CRM turns that traffic into booked jobs, managed operations, collected payments, and retained customers.
            </p>
            <p>
              Together, they create a closed loop that no competitor can replicate: organic search generates leads,{" "}
              <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI-generated content</Link>{" "}
              scales your online presence, AI qualifies your leads, your schedule fills automatically, your team completes the work, the customer leaves a review, and that review powers more organic search visibility. A{" "}
              <Link href="/services/marketing-manager" className="text-[#5CB8FF] hover:text-[#8DD0FF]">fractional marketing manager</Link>{" "}
              can oversee the entire system so you stay focused on operations. Every stage feeds the next. Nothing leaks.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Organic search infrastructure that drives leads into Full Loop CRM." },
              { name: "AI Search Optimization", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and other AI platforms." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js sites that rank — the same stack Full Loop CRM runs on." },
              { name: "AI Agent Development", href: "/services/ai-agent-development", desc: "Custom AI agents built on top of your Full Loop CRM data." },
              { name: "Marketing Consulting", href: "/services/marketing-consulting", desc: "Strategic guidance on growth, positioning, and market expansion." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track performance across SEO, CRM, and every marketing channel." },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-semibold text-[#0080FE]">{service.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{service.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 11: FAQ
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Full Loop CRM</h2>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
