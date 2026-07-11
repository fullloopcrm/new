import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Fractional Marketing Manager NYC",
  description:
    "Fractional marketing manager for NYC service businesses. Part-time marketing leadership, team management, and strategic execution without full-time salary.",
  keywords: [
    "fractional marketing manager NYC",
    "part-time marketing manager New York",
    "outsourced marketing director NYC",
    "fractional CMO NYC",
    "marketing leadership service businesses",
    "fractional marketing services",
    "marketing manager for hire NYC",
    "part-time CMO New York City",
    "outsourced marketing manager",
    "fractional marketing director",
    "marketing management services NYC",
    "affordable marketing leadership",
    "marketing manager retainer NYC",
  ],
  openGraph: {
    title: "Fractional Marketing Manager NYC",
    description:
      "Part-time marketing leadership for NYC service businesses. Team management and strategic execution without full-time salary.",
    url: `${SITE_URL}/services/marketing-manager`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/marketing-manager` },
};

const faqs = [
  {
    q: "What is a fractional marketing manager?",
    a: "A fractional marketing manager is a senior marketing leader who works with your business on a part-time or retainer basis instead of as a full-time employee. You get the strategic thinking, campaign oversight, vendor management, and performance accountability of a marketing director — without the $150,000 to $200,000 annual salary, benefits, equity, and overhead that comes with a full-time hire. Fractional marketing managers typically work with 3 to 5 clients simultaneously, which means you get experienced leadership at a fraction of the cost. For service businesses doing $500K to $10M in revenue, this is the sweet spot — enough marketing complexity to need real leadership, but not enough to justify a full-time executive.",
  },
  {
    q: "How much does a fractional marketing manager cost in NYC?",
    a: "Our fractional marketing manager retainers range from $5,000 to $10,000 per month depending on scope, hours, and complexity. The Operator tier at $5,000 per month includes 20 hours of dedicated marketing leadership monthly. The Strategist tier at $7,500 per month includes 30 hours plus vendor and agency management. The full Marketing Director tier at $10,000 per month includes 40+ hours, full-stack marketing leadership, and team coordination. Compare this to a full-time marketing manager salary in NYC — $120,000 to $180,000 per year plus benefits, taxes, equipment, and management overhead. You save 60% to 75% with a fractional model and get more experienced talent.",
  },
  {
    q: "How is this different from hiring a marketing agency?",
    a: "A marketing agency executes specific deliverables — they run your ads, write your content, or manage your SEO. A fractional marketing manager leads your entire marketing function. They set the strategy, manage the agencies, allocate the budget, measure the results, and make sure every channel is working together toward the same business goals. Think of it this way: agencies are the players, and the fractional marketing manager is the coach. Without a coach, your agencies operate in silos, duplicate effort, contradict each other, and waste your budget. We coordinate everything into a unified system that actually drives revenue.",
  },
  {
    q: "What does a fractional marketing manager actually do day-to-day?",
    a: "On a typical week, your fractional marketing manager reviews campaign performance across all channels, coordinates with any agencies or freelancers you use, updates your content calendar, manages your marketing budget and spend allocation, prepares reports for ownership, identifies new opportunities and threats in your market, ensures brand consistency across all touchpoints, troubleshoots underperforming campaigns, and plans upcoming launches or promotions. They attend your team meetings, join vendor calls, and serve as the single point of accountability for all marketing results. Everything an in-house marketing director does — condensed into the hours your business actually needs.",
  },
  {
    q: "How many hours per month will my fractional marketing manager work?",
    a: "Hours depend on your tier. The Operator tier includes approximately 20 hours per month — enough for weekly strategy sessions, campaign oversight, and monthly reporting. The Strategist tier includes approximately 30 hours per month — adding vendor management, content planning, and bi-weekly team coordination. The Marketing Director tier includes 40 or more hours per month — full marketing department leadership with daily availability. Most service businesses in the $1M to $5M revenue range find that 20 to 30 hours per month is the right amount. We can always scale up or down based on seasonal needs or campaign launches.",
  },
  {
    q: "Can a fractional marketing manager manage my existing agencies?",
    a: "Absolutely — this is one of the primary functions. Many service businesses hire an SEO agency, a PPC agency, a social media manager, and a designer, but have no one coordinating them. The result is duplicated effort, conflicting messaging, wasted budget, and no unified strategy. Your fractional marketing manager becomes the single point of oversight for all vendors. They set KPIs for each agency, review deliverables, hold agencies accountable, ensure messaging consistency, and reallocate budget based on what is actually working. Most clients save 20% to 30% on their total marketing spend within 90 days just from better vendor coordination.",
  },
  {
    q: "Do you also execute marketing campaigns or just manage them?",
    a: "Both. As an agency that offers fractional marketing management, we have the unique advantage of being able to both lead strategy and execute it. If you need SEO, we handle it in-house. If you need web development, we build on Next.js. If you need content, our team writes it. If you need CRM setup, we deploy Full Loop CRM. For channels outside our core expertise, we manage your existing vendors or bring in trusted partners from our network. The result is a single accountable leader who can both direct the orchestra and play the instruments when needed.",
  },
  {
    q: "What industries do you serve as a fractional marketing manager?",
    a: "We specialize in local service businesses across the NYC metro area — the same industries we serve for SEO, web development, and digital marketing. This includes plumbers, electricians, HVAC companies, general contractors, lawyers, dentists, therapists, cleaning services, salons, landscapers, and over 150 additional service categories. We understand the unique marketing challenges service businesses face: seasonality, local competition, review management, lead attribution, and the need to generate phone calls — not just website traffic. Our strategies are built specifically for businesses that serve customers in defined geographic areas.",
  },
  {
    q: "How quickly can a fractional marketing manager start producing results?",
    a: "You will see organizational improvements within the first 30 days — clearer strategy, better vendor coordination, consolidated reporting, and identified waste in your current spend. Measurable performance improvements typically appear within 60 to 90 days as optimized campaigns take effect. By month 4 to 6, most clients see a 25% to 40% improvement in marketing ROI from the combination of strategic realignment, budget optimization, and better execution. The fastest wins usually come from fixing what is broken — we consistently find that new clients are wasting 20% to 40% of their marketing budget on underperforming channels, duplicated tools, or misaligned agency work.",
  },
  {
    q: "What marketing tools and platforms do you work with?",
    a: "We work with the entire modern marketing stack. For analytics: Google Analytics 4, Google Search Console, Google Tag Manager, and custom dashboards. For SEO: Ahrefs, Screaming Frog, Semrush, and proprietary tools. For paid ads: Google Ads, Meta Ads Manager, and Microsoft Advertising. For CRM: Full Loop CRM — our own full-cycle CRM built for service businesses — plus HubSpot, Salesforce, and GoHighLevel if you are already on one. For email: Resend, Mailchimp, or Klaviyo. For communication: Telnyx for SMS and voice. For development: Next.js, Vercel, Supabase. We are technology-agnostic but opinionated — we will tell you which tools are worth paying for and which ones are wasting your money.",
  },
  {
    q: "How do you measure and report on marketing performance?",
    a: "Every client receives a comprehensive monthly marketing report covering all active channels — organic search rankings and traffic, paid ad performance and ROAS, social media engagement and conversions, email open and click rates, lead volume by source, cost per lead by channel, and overall marketing ROI. We track phone calls, form submissions, and booked appointments attributed to specific campaigns and keywords. Reports include a recorded video walkthrough explaining what the numbers mean, what we did this month, and what we are doing next. No vanity metrics. No fluff. Just the data that tells you whether your marketing investment is working.",
  },
  {
    q: "What is the minimum commitment for fractional marketing management?",
    a: "We recommend a minimum 6-month engagement to see meaningful results. Marketing strategy takes time to implement and optimize — anyone who promises overnight transformation is not being honest. That said, we do not lock you into long-term contracts. After the initial 6-month period, you can continue month-to-month, scale up, scale down, or pause. Most clients stay with us for 12 to 24 months because the ROI is clear and compounding. We earn your business every month — not through contract terms, but through results.",
  },
  {
    q: "Can you help build a marketing team as we grow?",
    a: "Yes. One of the natural evolution paths of fractional marketing management is helping you build and hire your internal marketing team when the business is ready. We help you define roles, write job descriptions, interview candidates, onboard new hires, and create the processes and playbooks they will follow. Many of our clients start with a fractional marketing manager, grow their revenue 30% to 50%, and then bring on a junior marketing coordinator or content specialist to handle day-to-day execution while we continue providing strategic oversight. We are not threatened by this — it means we did our job.",
  },
  {
    q: "What happens during the onboarding process?",
    a: "Onboarding takes 2 to 3 weeks and is thorough. We start with a deep-dive discovery session covering your business goals, revenue targets, current marketing channels, past performance, competitive landscape, and customer journey. We then audit everything — your website, SEO, paid ads, social media, email marketing, CRM, vendor contracts, and marketing spend. We interview key team members and review your sales process. The output is a comprehensive marketing audit document and a 90-day strategic plan with specific priorities, KPIs, and action items. From there, we hit the ground running with clear direction and measurable milestones.",
  },
  {
    q: "Do you work on-site or remotely?",
    a: "Primarily remote, with regular in-person meetings for NYC-area clients. Most of our collaboration happens through scheduled video calls, Slack or Teams, shared project management tools, and monthly in-person strategy sessions at our Midtown Manhattan office near Times Square. For major campaign launches, annual planning, or team workshops, we come to your office. The hybrid model gives you the flexibility of remote work with the personal connection of face-to-face meetings. Our address is 150 W 47th St, New York, NY 10036 — right in the heart of Midtown.",
  },
  {
    q: "Why should I hire The NYC SEO as my fractional marketing manager instead of an independent consultant?",
    a: "An independent consultant gives you one person with one perspective. When you hire us, you get a marketing leader backed by a full agency — SEO specialists, web developers, content writers, designers, CRM engineers, and AI specialists. If your fractional marketing manager identifies that you need a new website, we build it. If you need an AI chatbot for lead qualification, we develop it. If you need 500 location pages for SEO, we generate them programmatically. An independent consultant would need to outsource all of that — adding cost, complexity, and communication overhead. With us, strategy and execution live under the same roof.",
  },
];

export default function MarketingManagerPage() {
  /* ---------- Schema Markup ---------- */
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    email: "hi@consortiumnyc.com",
    sameAs: ["https://www.consortiumnyc.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "The NYC SEO — Fractional Marketing Manager Services",
    url: `${SITE_URL}/services/marketing-manager`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$5,000 - $10,000/mo",
    description:
      "Fractional marketing manager services for local service businesses in NYC, NJ, Long Island, and Westchester. Campaign management, vendor oversight, content strategy, budget management, and performance reporting. 20+ years experience.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "40.7580",
      longitude: "-73.9855",
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Fractional Marketing Manager Services",
    description:
      "Part-time, senior-level marketing leadership for service businesses. Includes campaign management, vendor and agency oversight, content calendar planning, budget management, performance tracking, and team leadership — without the cost of a full-time marketing executive.",
    url: `${SITE_URL}/services/marketing-manager`,
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Fractional Marketing Manager Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Campaign Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Vendor & Agency Oversight" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Calendar Planning" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Marketing Budget Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Performance Tracking & Reporting" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Marketing Team Leadership" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Marketing Strategy Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Brand Consistency Management" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our Fractional Marketing Manager Engagement Works",
    description: "Our proven 6-step process for embedding senior marketing leadership into your service business.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Discovery & Onboarding",
        text: "We conduct a deep-dive discovery session covering your business goals, revenue targets, current marketing channels, competitive landscape, and customer journey. We meet your team, review your sales process, and understand what success looks like for your business.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Full Marketing Audit",
        text: "We audit every active marketing channel — your website, SEO performance, paid advertising, social media, email marketing, CRM, vendor contracts, and total marketing spend. We identify what is working, what is wasting money, and where the biggest opportunities are hiding.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Strategy & 90-Day Roadmap",
        text: "We build a comprehensive marketing strategy and prioritized 90-day roadmap with specific KPIs, action items, and milestones. This becomes the playbook that aligns every marketing activity with your business revenue goals.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Execution & Campaign Management",
        text: "We begin executing the strategy — launching campaigns, optimizing existing channels, creating content, managing paid ad spend, and coordinating with any agencies or freelancers on your team. Every initiative ties back to the roadmap.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Team & Vendor Coordination",
        text: "We serve as the single point of accountability for all marketing activities. We manage agency relationships, set vendor KPIs, review deliverables, ensure brand consistency, and eliminate the silos that waste budget and create confusion.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Performance Reporting & Optimization",
        text: "We deliver comprehensive monthly reports covering every channel, every campaign, and every dollar spent. We analyze what is working, kill what is not, reallocate budget to high-performing channels, and continuously refine the strategy to maximize ROI.",
      },
    ],
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
      "@type": "ProfessionalService",
      name: "The NYC SEO — Fractional Marketing Manager Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Rachel M." },
    reviewBody:
      "We were spending $12,000 a month across three different agencies with no one driving the bus. Within 90 days of bringing on The NYC SEO as our fractional marketing manager, they cut $4,000 in wasted spend, consolidated our reporting, and increased our qualified leads by 35%. Best marketing decision we ever made.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Fractional Marketing Manager", url: "/services/marketing-manager" },
  ];

  return (
    <div className="text-white">
      {/* Schema Markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left -- Copy */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                Fractional Marketing Leadership &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Fractional Marketing
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Manager
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Get a dedicated marketing leader for your{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service business</Link>{" "}
                without the $150,000+ salary. Our fractional marketing managers bring 20+ years of experience in{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>,{" "}
                <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">analytics</Link>, and{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing automation</Link>{" "}
                — coordinating every channel, managing every vendor, and holding every dollar accountable. Senior marketing leadership, on a retainer that makes sense for businesses doing $500K to $10M in revenue.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right -- Feature Checklist */}
            <div className="space-y-4">
              {[
                "Campaign management across all marketing channels",
                "Vendor & agency oversight with KPI accountability",
                "Content calendar planning & editorial management",
                "Marketing budget allocation & spend optimization",
                "Performance tracking with lead attribution reporting",
                "Team leadership & cross-functional coordination",
                "Brand consistency across every customer touchpoint",
                "90-day strategic roadmaps with measurable milestones",
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
          SECTION 2: WHAT IS A FRACTIONAL MARKETING MANAGER
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is a Fractional Marketing Manager and Why Does Your Business Need One?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Every growing service business reaches the same inflection point. You are spending money on marketing — maybe an{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO agency</Link>, a{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content writer</Link>, a{" "}
              social media freelancer, Google Ads — but no one is driving the bus. No one is looking at the full picture, connecting the dots between channels, holding vendors accountable, or tying marketing spend back to actual revenue. You need a marketing leader. But a full-time marketing director in New York City costs $150,000 to $200,000 per year in salary alone, before benefits, payroll taxes, equipment, and management overhead. For a service business doing $1M to $5M in revenue, that is a brutal line item.
            </p>
            <p>
              A fractional marketing manager solves this problem. You get an experienced, senior-level marketing leader who works with your business 20 to 40 hours per month on a retainer basis. They set the strategy, build the roadmap, manage your agencies and freelancers, allocate your budget, track performance, and report directly to ownership. They are your marketing department head — they just are not on your payroll full-time. The fractional model works because most service businesses do not need 40 hours per week of marketing leadership. They need 20 to 30 hours of the right leadership — someone who has managed millions in ad spend, launched hundreds of campaigns, and knows exactly which levers to pull for{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>, and{" "}
              <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contractors</Link>{" "}
              in the NYC metro area.
            </p>
            <p>
              The difference between a business with marketing leadership and one without is the difference between a coordinated growth machine and a collection of disconnected tactics that hemorrhage money. When you have a fractional marketing manager, every campaign serves the strategy. Every vendor is held to KPIs. Every dollar is tracked. When you do not, you get agencies that operate in silos, content that does not support your SEO, ads that send traffic to pages that do not convert, and a total marketing spend that nobody can justify with real numbers.
            </p>
            <p>
              At{" "}
              <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, we have been providing marketing leadership to service businesses for over 20 years. Our fractional marketing managers are not generalists reading marketing blogs — they are operators who have built and scaled marketing programs for businesses across every service category in the NYC metro. They understand the local competitive dynamics, the seasonality of service businesses, the importance of{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
              and local visibility, and how to turn marketing spend into booked jobs and signed clients.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: OUR PROCESS (HowTo)
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our 6-Step Fractional Marketing Manager Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every engagement follows the same proven framework — adapted to your business, your market, and your growth goals.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Discovery & Onboarding",
                body: "We start with a comprehensive discovery session that goes far beyond surface-level. We map your entire business — revenue goals, customer acquisition costs, lifetime customer value, current marketing channels, historical performance, competitive landscape, and team structure. We interview key stakeholders, review your sales process from first touch to closed deal, and identify every gap in your current marketing operation. This is not a 30-minute intake call. This is 8 to 10 hours of deep-dive work that ensures we understand your business as well as you do. The onboarding process takes 2 to 3 weeks and produces a complete picture of where you are and where you need to go.",
              },
              {
                step: "02",
                title: "Full Marketing Audit",
                body: "We audit every active marketing channel with surgical precision. Your website gets a full technical and conversion audit — page speed, mobile experience, SEO health, user flow, and conversion rate by page. Your paid advertising gets a spend-efficiency analysis — cost per lead, cost per acquisition, and ROAS by campaign. Your SEO gets a rankings and visibility assessment. Your social media, email marketing, CRM utilization, and offline channels all get evaluated. We also audit your vendor relationships — what you are paying each agency or freelancer, what they are delivering, and whether the ROI justifies the spend. The result is a comprehensive marketing audit document that identifies every dollar being wasted and every opportunity being missed.",
              },
              {
                step: "03",
                title: "Strategy & 90-Day Roadmap",
                body: "Based on the audit findings, we build a prioritized marketing strategy and 90-day execution roadmap. This is not a vague PowerPoint with buzzwords — it is a specific, actionable plan with clear KPIs, assigned owners, deadlines, and budget allocations for each initiative. We identify the 3 to 5 highest-impact opportunities and focus resources there first. The roadmap includes channel priorities, content themes, campaign timelines, vendor restructuring recommendations, technology stack changes, and projected outcomes. Every recommendation ties directly back to your revenue goals. You approve the plan, and we begin execution immediately.",
              },
              {
                step: "04",
                title: "Execution & Campaign Management",
                body: "This is where strategy becomes reality. We launch new campaigns, optimize existing ones, create and publish content according to the editorial calendar, manage paid ad spend across platforms, update your website, implement tracking and attribution systems, and ensure every marketing activity is on-schedule and on-budget. For channels we handle in-house — like SEO, web development, content creation, and CRM setup — we execute directly. For channels managed by external vendors, we provide briefs, review deliverables, and ensure quality standards are met. Nothing ships without strategic alignment and quality control.",
              },
              {
                step: "05",
                title: "Team & Vendor Coordination",
                body: "We become the central hub of your marketing operation. Weekly coordination calls with your internal team. Regular check-ins with each agency and freelancer. Shared project management boards that give everyone visibility into what is happening and what is coming next. We set clear KPIs for every vendor, review performance monthly, and make changes when results fall short. We ensure messaging consistency across channels — your SEO content, your ad copy, your social posts, and your email campaigns all speak with one voice and drive toward the same goals. No silos. No confusion. One unified marketing machine.",
              },
              {
                step: "06",
                title: "Performance Reporting & Optimization",
                body: "At the end of each month, we deliver a comprehensive marketing performance report covering every active channel. Organic traffic and rankings from your SEO investment. ROAS and cost-per-lead from paid advertising. Engagement and conversion metrics from social media and email. Total leads by source, cost per lead by channel, and marketing-attributed revenue. Each report includes a recorded video walkthrough explaining the data, highlighting wins, diagnosing underperformance, and previewing next month&apos;s priorities. We do not just report numbers — we interpret them, make decisions based on them, and continuously optimize your entire marketing operation for maximum ROI.",
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
          SECTION 4: WHAT'S INCLUDED
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Fractional Marketing Management</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is included in our fractional marketing manager retainers. This is what real marketing leadership looks like.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Campaign Management",
                items: ["Multi-channel campaign planning & execution", "Paid advertising management (Google, Meta)", "SEO campaign oversight & optimization", "Email marketing strategy & deployment", "Social media strategy & coordination", "Campaign A/B testing & optimization"],
              },
              {
                title: "Vendor & Agency Oversight",
                items: ["Agency performance reviews & KPI tracking", "Vendor contract negotiation & management", "Freelancer coordination & quality control", "Deliverable review & approval workflows", "Budget allocation across vendors", "Agency replacement & onboarding when needed"],
              },
              {
                title: "Content Calendar",
                items: ["Editorial calendar creation & management", "Content strategy aligned to SEO targets", "Blog, social, email & video content planning", "Brand voice & messaging guidelines", "Content performance tracking", "Seasonal & promotional content scheduling"],
              },
              {
                title: "Budget Management",
                items: ["Total marketing budget planning & allocation", "Channel-by-channel spend optimization", "ROI analysis by campaign & channel", "Waste identification & elimination", "Quarterly budget forecasting", "Cost-per-lead & cost-per-acquisition tracking"],
              },
              {
                title: "Performance Tracking",
                items: ["Google Analytics 4 setup & monitoring", "Custom marketing dashboards", "Lead attribution by source & campaign", "Phone call tracking & recording setup", "Monthly performance reports with walkthroughs", "Competitive benchmarking & market analysis"],
              },
              {
                title: "Team Leadership",
                items: ["Weekly marketing team meetings", "Cross-functional coordination (sales + marketing)", "Marketing hire planning & job descriptions", "Onboarding & training for new team members", "Process documentation & playbook creation", "Strategic alignment with business ownership"],
              },
            ].map((category) => (
              <div key={category.title} className="rounded-2xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold text-[#0080FE]">{category.title}</h3>
                <ul className="mt-4 space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: WHO THIS IS FOR
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Who Fractional Marketing Management Is For</h2>
          <p className="mt-4 text-zinc-400">
            Our fractional marketing managers specialize in local service businesses. If you serve customers in the NYC metro area and need marketing leadership without a full-time hire, this is built for you.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { name: "Plumbers & Pipe Fitters", href: "/plumber" },
              { name: "Electricians", href: "/electrician" },
              { name: "HVAC Contractors", href: "/hvac" },
              { name: "Roofers", href: "/roofer" },
              { name: "General Contractors", href: "/general-contractor" },
              { name: "Personal Injury Lawyers", href: "/personal-injury-lawyer" },
              { name: "Dentists & Oral Surgeons", href: "/dentist" },
              { name: "Therapists & Counselors", href: "/therapist" },
              { name: "House Cleaning Services", href: "/house-cleaner" },
              { name: "Landscapers & Tree Services", href: "/landscaper" },
              { name: "Painters", href: "/painter" },
              { name: "Locksmiths", href: "/locksmith" },
            ].map((industry) => (
              <Link
                key={industry.name}
                href={industry.href}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#0A0A0A] p-4 transition-colors hover:border-[#0080FE] hover:bg-[#0A0A0A]/80"
              >
                <span className="text-[#0080FE]">&rarr;</span>
                <span className="text-sm font-medium text-zinc-300">{industry.name}</span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            We serve over{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170 service categories</Link>{" "}
            across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
            in the NYC metro area. If your industry is not listed above,{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link>{" "}
            — we almost certainly cover it.
          </p>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 7: FRACTIONAL MM vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Fractional Marketing Manager vs. Other Options</h2>
          <p className="mt-4 text-zinc-400">
            There are several ways to handle marketing leadership. Here is how a fractional marketing manager compares to the alternatives service businesses typically consider.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Fractional Marketing Manager vs. Full-Time CMO</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                A full-time Chief Marketing Officer in NYC commands a salary of $180,000 to $300,000 per year — plus benefits, equity, bonuses, and management overhead. Total cost: $250,000 to $400,000 annually. For a service business doing $2M to $10M in revenue, that is 5% to 20% of your top line just for one person. A fractional marketing manager delivers the same strategic leadership, vendor oversight, and accountability for $60,000 to $120,000 per year. You get 80% of the value at 30% of the cost. The math makes sense until your business grows large enough to justify — and fully utilize — a full-time executive. For most service businesses, that inflection point is $10M to $15M in annual revenue.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Fractional Marketing Manager vs. DIY Marketing</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Many service business owners try to manage marketing themselves. The problem is clear: you are an expert at your trade, not at marketing. DIY marketing leads to random acts of marketing — a Facebook post here, a Google Ad there, a website that has not been updated in two years. There is no strategy, no measurement, and no accountability. The owner spends 10 to 15 hours per week on marketing tasks they are not qualified to do, which means 10 to 15 hours per week not spent on operations, sales, or client delivery. A fractional marketing manager frees the owner to focus on what they do best while ensuring marketing is handled by someone who has done it hundreds of times before. The ROI is not just financial — it is the owner&apos;s time and sanity.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Fractional Marketing Manager vs. Marketing Agency Only</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Hiring a marketing agency without marketing leadership is like hiring a construction crew without a general contractor. The agency will execute their specific scope — run your{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>, manage your ads, write your content — but they will not coordinate with your other vendors, manage your overall budget, align messaging across channels, or hold themselves accountable to business outcomes instead of activity metrics. A fractional marketing manager sits above the agencies, ensuring every vendor is pulling in the same direction. They catch duplicated effort, identify conflicting strategies, reallocate budget from underperforming channels, and create a unified marketing operation instead of a collection of disconnected services. The agencies are the specialists. The fractional marketing manager is the general.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Fractional Marketing Manager vs. Junior In-House Hire</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Some businesses try to solve the leadership gap by hiring a junior marketing coordinator or social media manager for $50,000 to $70,000 per year. The problem is that a junior hire needs direction — they need someone to tell them what to do, review their work, and set the strategy. Without senior oversight, they default to tactical busywork that looks like marketing but does not move the needle. A fractional marketing manager costs slightly more per month but brings 15 to 20 years of experience, strategic thinking, and the ability to manage agencies, coordinate teams, and make high-stakes budget decisions. The junior hire should come later — after the fractional marketing manager has built the strategy, systems, and playbooks they will follow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: RESULTS / CASE STUDY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results From Fractional Marketing Leadership</h2>
          <p className="mt-4 text-zinc-400">
            Here is what happens when service businesses get real marketing leadership without the full-time price tag.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "35%", label: "Average Lead Increase (90 Days)" },
              { stat: "28%", label: "Average Reduction in Wasted Spend" },
              { stat: "4.2x", label: "Average Marketing ROI Improvement" },
              { stat: "60%", label: "Cost Savings vs. Full-Time Hire" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-700 bg-[#141414] p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{item.stat}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We were spending $12,000 a month across three different agencies with no one driving the bus. Our SEO agency did not talk to our PPC agency. Our social media person had never seen our content calendar. Within 90 days of bringing on The NYC SEO as our fractional marketing manager, they cut $4,000 in wasted spend, consolidated our reporting into a single dashboard, and increased our qualified leads by 35%. We should have done this two years ago.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Rachel M., Dental Practice Owner, Upper East Side</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;As a general contractor, I was spending 15 hours a week trying to manage my own marketing. I was posting on social media randomly, running Google Ads with no tracking, and had a WordPress site that loaded in 8 seconds. My fractional marketing manager from The NYC SEO completely rebuilt our marketing stack — migrated us to a fast Next.js site, restructured our ad campaigns, built a content calendar, and set up real tracking so I can see exactly which channels produce leads. My marketing spend is the same, but we are getting 3x more qualified leads. And I got 15 hours of my week back.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Anthony T., General Contractor, Brooklyn</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Marketing Mistakes Businesses Make Without a Marketing Leader
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Letting agencies operate in silos with no coordination",
                fix: "Your SEO agency, PPC agency, social media manager, and content writer should all be executing the same strategy. Without a marketing leader, each vendor optimizes for their own metrics with no connection to your business goals. A fractional marketing manager unifies every vendor under a single strategy with shared KPIs and regular coordination.",
              },
              {
                mistake: "No marketing strategy — just random acts of marketing",
                fix: "A Facebook post here, a Google Ad there, a blog article that nobody reads. Without a documented strategy and 90-day roadmap, marketing becomes a collection of disconnected activities that feel productive but produce nothing. We build the strategy first, then execute systematically against it.",
              },
              {
                mistake: "Spending money on marketing with no lead attribution",
                fix: "If you cannot tell which marketing channels produce leads and which waste money, you are flying blind. We implement full lead attribution — tracking phone calls, form submissions, and booked appointments back to specific campaigns, keywords, and pages. Every dollar gets measured.",
              },
              {
                mistake: "The business owner managing marketing instead of the business",
                fix: "You did not start a plumbing company to manage Google Ads. Every hour you spend on marketing is an hour not spent on operations, sales, or client delivery. A fractional marketing manager takes the marketing burden off your plate completely, so you can focus on what generates revenue.",
              },
              {
                mistake: "No content calendar or editorial planning",
                fix: "Content published without a plan is content that does not rank, does not convert, and does not support your business goals. We build 90-day editorial calendars that align every piece of content — blog posts, social media, email, video — with your SEO targets and seasonal opportunities.",
              },
              {
                mistake: "Overspending on tools and platforms you do not use",
                fix: "Most service businesses are paying for 5 to 10 marketing tools and only using 2 of them properly. We audit your entire tool stack, eliminate redundancies, and ensure every platform is configured correctly and actually contributing to results. Clients typically save $500 to $2,000 per month on tool consolidation alone.",
              },
              {
                mistake: "Inconsistent brand messaging across channels",
                fix: "Your website says one thing, your ads say another, and your social media says something else entirely. Inconsistent messaging confuses potential customers and dilutes your brand. A fractional marketing manager creates messaging guidelines and ensures every touchpoint speaks with one voice.",
              },
              {
                mistake: "No competitive intelligence or market awareness",
                fix: "Your competitors are running campaigns, ranking for keywords, and winning customers that should be yours — and you have no visibility into what they are doing. We monitor competitor marketing activity monthly and use those insights to find opportunities and stay ahead.",
              },
              {
                mistake: "Measuring vanity metrics instead of business outcomes",
                fix: "Impressions, likes, followers, and website visits are not business outcomes. Revenue, leads, cost per acquisition, and customer lifetime value are. Without a marketing leader who understands the difference, you celebrate metrics that do not pay the bills while ignoring the ones that do.",
              },
              {
                mistake: "No process for testing, learning, and improving",
                fix: "Marketing without iteration is gambling. Without a structured process for testing different approaches, measuring results, and optimizing based on data, you repeat the same mistakes month after month. We build test-and-learn frameworks into every campaign so performance compounds over time.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-sm font-bold text-red-400">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{item.mistake}</h3>
                  <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{item.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Fractional Marketing Manager Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into senior marketing leadership, strategy, and execution — not overhead. 20+ years of results behind every engagement.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Operator",
                price: "$5,000",
                period: "/month",
                description: "For service businesses that need part-time marketing leadership and campaign oversight.",
                features: [
                  "~20 hours/month of dedicated marketing leadership",
                  "Full marketing audit & strategy development",
                  "Campaign management across active channels",
                  "Monthly performance reporting with walkthrough",
                  "Content calendar creation & management",
                  "Basic vendor coordination",
                  "Marketing budget oversight",
                  "Bi-monthly strategy calls with ownership",
                ],
                cta: "Get Started",
              },
              {
                tier: "Strategist",
                price: "$7,500",
                period: "/month",
                description: "For growing businesses that need hands-on marketing leadership plus vendor and agency management.",
                features: [
                  "Everything in Operator, plus:",
                  "~30 hours/month of dedicated leadership",
                  "Full vendor & agency oversight with KPI tracking",
                  "Multi-channel campaign coordination",
                  "Content strategy & editorial direction",
                  "Competitive intelligence & market monitoring",
                  "Marketing tool stack optimization",
                  "Weekly strategy calls with ownership",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Marketing Director",
                price: "$10,000",
                period: "/month",
                description: "For businesses that need full-stack marketing department leadership and team coordination.",
                features: [
                  "Everything in Strategist, plus:",
                  "40+ hours/month — near full-time availability",
                  "Team hiring, onboarding & management",
                  "Cross-functional coordination (sales + ops + marketing)",
                  "Brand strategy & messaging architecture",
                  "Quarterly business reviews & annual planning",
                  "Process documentation & playbook creation",
                  "Daily availability via Slack or Teams",
                ],
                cta: "Talk to Us",
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-2xl border p-8 ${
                  plan.featured
                    ? "border-[#0080FE] bg-[#0080FE]/5 ring-1 ring-[#0080FE]"
                    : "border-zinc-700 bg-[#141414]"
                }`}
              >
                {plan.featured && (
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#0080FE]">Most Popular</p>
                )}
                <h3 className="text-2xl font-bold">{plan.tier}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#0080FE]">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partnership-request-form"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold ${
                    plan.featured
                      ? "bg-[#0080FE] text-white hover:bg-[#0070E0]"
                      : "border border-zinc-600 text-white hover:border-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            All plans include a complimentary marketing audit. Custom plans and project-based engagements available.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            or{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link>{" "}
            to discuss your needs.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose Us for Fractional Marketing Management</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Strategy and Execution Under One Roof</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most fractional marketing managers are consultants — they build strategy decks and hand them off for someone else to execute. We are different. As a full-service agency owned by{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, we can both lead strategy and execute it. Need{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>? We do it in-house. Need a{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">new website</Link>? We build it on Next.js. Need a{" "}
                <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">CRM</Link>? We deploy{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>. Need an{" "}
                <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agent</Link>? We build it. One accountable partner for everything.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Service Business Expertise</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not market SaaS companies, e-commerce brands, or tech startups. We market{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service businesses</Link>{" "}
                — plumbers, electricians, lawyers, dentists, contractors, and over 170 service categories across the NYC metro area. We understand the seasonality, the local competition, the importance of phone calls over form fills, and the marketing channels that actually move the needle for businesses that serve customers in person. This specialization means we do not experiment with your budget — we apply proven playbooks that we have refined over two decades.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Modern Tech Stack — Not Legacy Tools</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                and Vercel — not WordPress. We deploy on Supabase — not shared hosting. We send communications through Resend and Telnyx — not outdated email platforms. We use{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                — our own full-cycle CRM built specifically for service businesses, customizable for any industry. We optimize for{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                — not just Google. Your fractional marketing manager brings the most modern marketing infrastructure available, not the same tools every agency has been using since 2015.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Radical Transparency and Accountability</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not hide behind vague reports and vanity metrics. Every month, you see exactly where every dollar went, what it produced, and whether it was worth it. If a channel is underperforming, we tell you — and we fix it or kill it. If an agency is not delivering, we hold them accountable or replace them. We track cost per lead by channel, marketing-attributed revenue, and overall ROI. You will never wonder whether your marketing is working. The numbers are clear, the reports are detailed, and the video walkthroughs leave nothing ambiguous. We earn your trust through transparency, not contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            Fractional marketing management works best when integrated with the right execution services. These complement and amplify your marketing leadership.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service search engine optimization to dominate organic search." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered to convert visitors into leads." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content that ranks, engages, and converts." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and other AI platforms." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Dominate the local map pack and Google Maps results." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track every lead, every channel, and every dollar." },
              { name: "Marketing Consulting", href: "/services/marketing-consulting", desc: "Strategic marketing advisory for complex business challenges." },
              { name: "Full Loop CRM", href: "/services/fullloopcrm", desc: "Full-cycle CRM built for service businesses. Customizable for any industry." },
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
          SECTION 13: SERVICE AREAS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Fractional Marketing Manager Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We provide fractional marketing management across the entire NYC metropolitan area — every borough, every neighborhood, every suburb.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                region: "Manhattan",
                areas: [
                  { name: "Midtown", href: "/hvac/midtown" },
                  { name: "Upper East Side", href: "/dentist/upper-east-side" },
                  { name: "Upper West Side", href: "/therapist/upper-west-side" },
                  { name: "Chelsea", href: "/general-contractor/chelsea" },
                  { name: "Financial District", href: "/personal-injury-lawyer/financial-district" },
                ],
              },
              {
                region: "Brooklyn",
                areas: [
                  { name: "Brooklyn Heights", href: "/plumber/brooklyn-heights" },
                  { name: "Park Slope", href: "/electrician/park-slope" },
                  { name: "Williamsburg", href: "/painter/williamsburg" },
                  { name: "DUMBO", href: "/general-contractor/dumbo" },
                  { name: "Bushwick", href: "/house-cleaner/bushwick" },
                ],
              },
              {
                region: "Queens",
                areas: [
                  { name: "Astoria", href: "/hvac/astoria" },
                  { name: "Long Island City", href: "/electrician/long-island-city" },
                  { name: "Flushing", href: "/dentist/flushing" },
                  { name: "Jackson Heights", href: "/personal-injury-lawyer/jackson-heights" },
                  { name: "Forest Hills", href: "/landscaper/forest-hills" },
                ],
              },
              {
                region: "Bronx, Staten Island & Beyond",
                areas: [
                  { name: "Riverdale", href: "/roofer/riverdale" },
                  { name: "Staten Island", href: "/general-contractor/staten-island" },
                  { name: "Hoboken, NJ", href: "/plumber/hoboken" },
                  { name: "Garden City, LI", href: "/electrician/garden-city" },
                  { name: "White Plains", href: "/hvac/white-plains" },
                ],
              },
            ].map((region) => (
              <div key={region.region}>
                <h3 className="text-lg font-semibold text-[#EFF70A]">{region.region}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {region.areas.map((area) => (
                    <Link
                      key={area.name}
                      href={area.href}
                      className="rounded-full border border-zinc-700 bg-[#141414] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                    >
                      {area.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            Browse all{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
            we cover across the NYC metro area.
          </p>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 14: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Fractional Marketing Management</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about fractional marketing manager services.
          </p>
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
          SECTION 15: FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
