import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "NYC Web Design & Development",
  description:
    "Custom Next.js web design and development for NYC service businesses. Sub-1-second loads, programmatic SEO, Core Web Vitals optimized. Built to rank.",
  keywords: [
    "NYC web design",
    "web development New York City",
    "Next.js web design NYC",
    "custom website development NYC",
    "web design agency New York",
    "React web development NYC",
    "SEO web design NYC",
    "mobile-first web design",
    "WordPress alternative NYC",
    "fast website development",
    "Core Web Vitals optimization",
    "programmatic SEO website",
    "Vercel deployment NYC",
    "Tailwind CSS web design",
    "custom web application NYC",
    "web design for SEO",
    "server-side rendering website",
    "static site generation NYC",
    "WordPress migration NYC",
    "web design near me",
  ],
  openGraph: {
    title: "NYC Web Design & Development",
    description:
      "Custom Next.js web design for NYC service businesses. Sub-1-second loads, programmatic SEO, Core Web Vitals optimized.",
    url: `${SITE_URL}/services/web-design-development`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/web-design-development` },
};

const faqs = [
  {
    q: "How much does a custom website cost in NYC?",
    a: "Our custom Next.js website projects start at $10,000 for a streamlined service business site (10-20 pages) and scale to $50,000+ for full-scale SEO platforms with programmatic page generation, custom CRM integration, and AI agent functionality. WordPress migration projects start at $7,500 and range up to $35,000 depending on site size and complexity. Every project is scoped individually based on your business needs, the number of pages required, integration complexity, and whether you need programmatic SEO at scale. We provide a detailed, line-item proposal before any work begins — no surprise costs, no hidden fees.",
  },
  {
    q: "Why do you build on Next.js instead of WordPress?",
    a: "WordPress powers roughly 43% of the internet, but that does not make it the best choice for businesses that depend on search rankings. WordPress sites average 3-5 second load times, suffer from plugin bloat and security vulnerabilities, struggle with Core Web Vitals, and cannot efficiently generate thousands of programmatic SEO pages. Next.js delivers sub-1-second page loads through static generation, scores 95-100 on PageSpeed Insights, has zero plugin dependencies, and scales to 54,000+ pages without performance degradation. For businesses where organic search is the primary growth channel, the framework you build on is a direct competitive advantage. We chose Next.js because it eliminates the technical SEO problems that WordPress creates.",
  },
  {
    q: "How long does it take to build a custom website?",
    a: "A standard service business website (15-30 pages) takes 4 to 6 weeks from kickoff to launch. Larger projects with programmatic page generation, CRM integration, and custom functionality take 8 to 12 weeks. WordPress migration projects take 3 to 6 weeks depending on site complexity and content volume. We work in two-week sprints with regular check-ins so you see progress throughout the build, not just at the end. Rush timelines are available for an additional fee.",
  },
  {
    q: "What is static site generation and why does it matter for SEO?",
    a: "Static site generation (SSG) pre-renders every page of your website as pure HTML at build time. When a user visits your site, the server delivers a pre-built HTML file instantly — no database queries, no server-side processing, no waiting. This is why our sites load in under 1 second. Google has confirmed that page speed is a direct ranking factor, and Core Web Vitals — which heavily reward fast-loading pages — directly influence where your site appears in search results. WordPress generates pages dynamically on every request, which is inherently slower. Next.js gives us the option to statically generate pages, server-side render them, or use incremental static regeneration — we choose the right approach for each page based on how frequently the content changes.",
  },
  {
    q: "What are Core Web Vitals and why do they matter?",
    a: "Core Web Vitals are three specific metrics Google uses to evaluate user experience: Largest Contentful Paint (LCP) measures loading performance, First Input Delay / Interaction to Next Paint (INP) measures interactivity, and Cumulative Layout Shift (CLS) measures visual stability. Since 2021, these metrics directly influence Google rankings. Sites that pass Core Web Vitals get a ranking boost; sites that fail get penalized. Every website we build is engineered to pass all three metrics with room to spare. Our average LCP is under 1.2 seconds, our INP is under 100ms, and our CLS is near zero. Most WordPress sites fail at least one Core Web Vital out of the box.",
  },
  {
    q: "Can you migrate my WordPress site to Next.js?",
    a: "Yes. WordPress migration is one of our most requested services. We handle the entire process — content migration, URL mapping and 301 redirects, design recreation or redesign, structured data implementation, and post-launch monitoring to ensure zero ranking loss. Migration projects start at $7,500 for smaller sites and range up to $35,000 for large, complex WordPress installations with custom post types, WooCommerce, or extensive plugin dependencies. Most clients see measurable performance improvements within 30 days of migration — faster load times, better Core Web Vitals, and improved crawl efficiency.",
  },
  {
    q: "What is programmatic SEO and how does it work with web design?",
    a: "Programmatic SEO uses data and code to generate hundreds or thousands of unique, optimized pages at scale. For a plumber serving 50 neighborhoods and offering 8 services, that is 400 unique landing pages — each targeting a real search query like 'emergency plumber Park Slope' or 'water heater installation Astoria.' Building those pages manually would take months. Our Next.js platform generates them programmatically using structured data, dynamic templates, and location-specific content. Each page is unique, each page is optimized, and each page targets a real keyword with real search volume. This is how we build 54,000+ page platforms that a traditional agency could not produce in a decade.",
  },
  {
    q: "Do you offer website maintenance and hosting?",
    a: "Yes. Every site we build is deployed on Vercel, which provides global edge hosting, automatic SSL certificates, instant rollbacks, and 99.99% uptime. Monthly maintenance plans include security monitoring, performance optimization, content updates, dependency updates, uptime monitoring, and priority support. Maintenance plans start at $500 per month for standard sites and scale based on site complexity and update frequency. Hosting is included in all maintenance plans.",
  },
  {
    q: "What is server-side rendering and when do you use it?",
    a: "Server-side rendering (SSR) generates a page on the server at the moment a user requests it. Unlike static generation — which pre-builds pages at deploy time — SSR produces a fresh page for every request. We use SSR for pages that need real-time data: search results, personalized content, dynamic pricing, or pages that change frequently. The key advantage over WordPress is that Next.js SSR pages still load significantly faster because Next.js renders the initial HTML on the server and then hydrates it with React on the client. WordPress does server-side rendering too, but it does it through a PHP/MySQL stack that is inherently slower and less efficient.",
  },
  {
    q: "What is Vercel and why do you deploy there?",
    a: "Vercel is the platform built by the creators of Next.js. It deploys your website to a global edge network — meaning your site is served from the data center closest to each visitor, reducing latency to near zero. Vercel provides instant deployments, automatic preview URLs for every code change, built-in analytics, serverless functions, and enterprise-grade infrastructure. For NYC businesses, Vercel serves your site from edge nodes in the northeast United States, delivering sub-100ms time-to-first-byte for local visitors. We deploy exclusively on Vercel because it is the fastest, most reliable hosting platform for Next.js applications.",
  },
  {
    q: "Do you build e-commerce websites?",
    a: "Our primary focus is service business websites engineered for SEO and lead generation. We do not build Shopify or WooCommerce stores. If your business needs a transactional component — appointment booking, quote request forms, payment processing — we build those features as custom integrations within your Next.js site using Supabase for the backend and Stripe for payments. For full e-commerce operations, we recommend working with an agency that specializes in that vertical.",
  },
  {
    q: "What is Supabase and why do you use it?",
    a: "Supabase is an open-source backend platform that provides a PostgreSQL database, authentication, real-time subscriptions, file storage, and serverless edge functions. We use Supabase instead of traditional backend solutions because it integrates seamlessly with Next.js, scales automatically, and gives us complete control over the data layer without the overhead of managing servers. For our clients, Supabase powers contact forms, CRM functionality through Full Loop CRM, lead tracking, analytics dashboards, and any custom business logic your site needs. It is the same technology stack that powers our own platform at thenycseo.com.",
  },
  {
    q: "What is Tailwind CSS and why does it matter?",
    a: "Tailwind CSS is a utility-first CSS framework that lets us build custom designs without writing bloated stylesheets. Unlike WordPress themes that load 200-500KB of unused CSS, Tailwind only ships the styles your site actually uses — typically 10-30KB after compression. Less CSS means faster page loads, which means better Core Web Vitals, which means higher Google rankings. Tailwind also ensures design consistency across every page and makes it easy to build fully responsive layouts that look perfect on every screen size from mobile to desktop.",
  },
  {
    q: "Can you build a custom CRM into my website?",
    a: "Yes. Full Loop CRM is our custom CRM platform built on the same Next.js, Supabase, and Vercel stack we use for client websites. It handles lead capture, pipeline management, automated follow-ups via Resend (email) and Telnyx (SMS), appointment scheduling, review request automation, and detailed analytics. Full Loop CRM can be integrated directly into your website or deployed as a standalone application. It is fully customizable for any business type and does not charge per-seat fees like Salesforce or HubSpot.",
  },
  {
    q: "How do your websites handle structured data and schema markup?",
    a: "Every website we build includes comprehensive JSON-LD structured data — typically 6 to 10 schema types per page. This includes Organization, LocalBusiness, ProfessionalService, Service with OfferCatalog, FAQPage, HowTo, Review, AggregateRating, BreadcrumbList, and WebSite schemas. We implement this at the code level in Next.js, which means structured data is embedded directly in the page HTML — not injected by a plugin that can break or conflict with other plugins. This structured data is what Google uses for rich results and what AI search platforms use to understand and recommend your business.",
  },
  {
    q: "What happens to my SEO rankings when I redesign my website?",
    a: "This is the question that keeps business owners up at night — and it is the reason most agencies do more harm than good during a redesign. When we rebuild a website, we map every existing URL to its new equivalent, implement 301 redirects for any URL changes, preserve all existing structured data and schema markup, maintain internal linking architecture, and monitor Google Search Console daily for 90 days after launch. Our goal is zero ranking disruption. In practice, most of our redesign clients see rankings improve within 30 to 60 days because the new Next.js site loads faster, has cleaner code, and passes Core Web Vitals — all direct ranking factors.",
  },
  {
    q: "Do you design logos and brand identity?",
    a: "Yes. Our parent company, Consortium NYC, has provided branding services for over 20 years. We offer logo design, brand identity systems, color palettes, typography selection, and brand guidelines as standalone services or as part of a website project. Visit our branding services page for more details.",
  },
];

export default function WebDesignPage() {
  /* ---------- Schema Markup ---------- */
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
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
    name: "The NYC SEO — Web Design & Development",
    url: `${SITE_URL}/services/web-design-development`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$10,000 - $50,000+",
    description:
      "Custom Next.js web design and development agency for service businesses in NYC. Mobile-first, sub-1-second load times, programmatic SEO at scale, Core Web Vitals optimized, Vercel edge deployment, Supabase backend. No WordPress. No templates.",
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "89",
      bestRating: "5",
      worstRating: "1",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Custom Web Design & Development Services",
    description:
      "Custom Next.js web design and development for service businesses. Mobile-first responsive design, sub-1-second load times, programmatic SEO page generation, Core Web Vitals optimization, Vercel edge deployment, Supabase backend integration, Tailwind CSS, structured data implementation, and WordPress migration.",
    url: `${SITE_URL}/services/web-design-development`,
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
      name: "Web Design & Development Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Custom Next.js Website Design & Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "WordPress to Next.js Migration" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Programmatic SEO Page Generation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Core Web Vitals Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Mobile-First Responsive Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Vercel Edge Deployment & Hosting" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Supabase Backend Integration" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Full Loop CRM Integration" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "JSON-LD Structured Data Implementation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Website Maintenance & Support" } },
      ],
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "10000",
      highPrice: "50000",
      priceCurrency: "USD",
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our Web Design & Development Process Works",
    description: "Our proven 6-step process for building custom Next.js websites engineered to rank in Google, Bing, and AI search platforms.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Discovery & Strategy",
        text: "We audit your current website, analyze your competitive landscape, map your service areas and keyword targets, and define the technical requirements for your new platform. Every decision is grounded in search data.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Information Architecture & SEO Planning",
        text: "We design your site architecture around your keyword strategy — mapping every page to a target keyword, building internal linking structures, and planning programmatic page templates for location and service coverage.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "UI/UX Design",
        text: "We design mobile-first, conversion-optimized layouts in Figma. Every page is designed for both human users and search engine crawlers — clean hierarchy, clear CTAs, and structured content that machines can parse.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Next.js Development",
        text: "We build your site in Next.js with React components, Tailwind CSS, and server-side rendering or static generation depending on the page type. Structured data, meta tags, and semantic HTML are coded directly into every template.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Testing, QA & Launch",
        text: "We test across devices, browsers, and screen sizes. We validate structured data, check Core Web Vitals, verify 301 redirects, and run full accessibility audits before deploying to Vercel and going live.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Post-Launch Optimization",
        text: "We monitor Google Search Console, track indexation, verify rankings, and optimize based on real performance data for 90 days after launch. Your site gets faster and ranks higher over time.",
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
      name: "The NYC SEO — Web Design & Development",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "James K." },
    reviewBody:
      "We came from a WordPress site that took 4 seconds to load and had terrible mobile experience. The NYC SEO rebuilt us on Next.js and the difference was immediate — sub-1-second loads, perfect Core Web Vitals, and our organic traffic doubled within 3 months. The programmatic pages they built for every neighborhood we serve are generating leads we never would have gotten from our old site. Worth every penny.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Web Design & Development", url: "/services/web-design-development" },
  ];

  return (
    <div className="text-white">
      {/* Schema Markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema).replace(/</g, '\\u003c') }} />

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
                Service 03 of 11 &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Web Design Built
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  to Rank, Not Just Look Good
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                We build fast, mobile-first websites on{" "}
                <strong className="text-white">Next.js</strong> that are engineered to rank in Google, Bing, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                from day one. Every page is designed for conversion — from your homepage to your 54,000th{" "}
                <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic landing page</Link>. No WordPress. No templates. No page builders. Code-level{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
                React server components, static generation, Vercel edge deployment, and{" "}
                <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">custom CRM integration</Link>{" "}
                — built by{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, a premium NYC agency with over two decades of experience. Your website is not a brochure. It is the engine that drives every lead, every ranking, and every dollar of organic revenue your business earns.
              </p>
              <CTAGroup variant="hero" title="Build My Website" subtitle="" />
            </div>

            {/* Right -- Feature Checklist */}
            <div className="space-y-4">
              {[
                "Next.js / React — no WordPress, ever",
                "Sub-1-second page load times (static HTML)",
                "Core Web Vitals: 95-100 PageSpeed scores",
                "Programmatic SEO — 54,000+ pages at scale",
                "Vercel global edge deployment",
                "Supabase backend & Full Loop CRM",
                "Tailwind CSS — zero bloat, fully responsive",
                "6+ JSON-LD schema types per page",
                "Mobile-first responsive design",
                "AI-parseable structured data for GEO",
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
          SECTION 2: WHY YOUR WEBSITE IS YOUR MOST IMPORTANT ASSET
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Your Website Is the Foundation Everything Else Is Built On
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Every marketing channel you invest in — <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>,{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>,{" "}
              Google Ads, social media — drives traffic to one place: your website. If that website loads slowly, looks broken on mobile, lacks structured data, and cannot scale beyond 50 pages without collapsing under its own weight, every marketing dollar you spend is partially wasted. Your website is not a cost center. It is the single most important revenue-generating asset your business owns.
            </p>
            <p>
              Most NYC service businesses are running websites built on WordPress themes from 2018. They load in 3 to 5 seconds. They fail Core Web Vitals. They have 15 plugins fighting with each other. They have no structured data, no internal linking strategy, and no ability to generate the hundreds of location-specific pages needed to compete in a market as dense and competitive as New York City. These businesses are leaving tens of thousands of dollars per month on the table — and they do not even know it.
            </p>
            <p>
              We build websites differently. Every site we create is a custom{" "}
              <strong className="text-white">Next.js</strong> application — hand-coded in React, styled with Tailwind CSS, deployed on Vercel&apos;s global edge network, and backed by Supabase for any data or CRM needs. These are not WordPress sites with a fresh coat of paint. These are purpose-built{" "}
              <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
              engineered to load in under one second, pass every Core Web Vital, scale to tens of thousands of pages, and feed structured data to both traditional search engines and AI models. When we say your website is built to rank, we mean it at the code level — not the theme level.
            </p>
            <p>
              This is what separates us from every other web design agency in New York. We do not build pretty websites that happen to have SEO bolted on afterward. We build SEO-first platforms that also happen to look incredible. The architecture, the URL structure, the internal linking, the schema markup, the page speed, the rendering strategy — every technical decision is made with search performance as the primary constraint. Design serves the user experience. Engineering serves the search engine. Both serve your bottom line.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: NEXT.JS vs WORDPRESS (THE BIG COMPARISON)
          ============================================================ */}
      <section className="bg-[#0080FE] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">Next.js vs. WordPress: The Technical Reality</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-blue-100">
            WordPress is familiar. Next.js is faster. Here is what that difference means for your search rankings, your page speed, your security, and your revenue.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl bg-white/10 p-8 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-blue-200">WordPress (What Most Agencies Build)</h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-100">
                <li><strong className="text-white">Load Time:</strong> 3-5 seconds average (database queries on every request)</li>
                <li><strong className="text-white">Core Web Vitals:</strong> Most sites fail LCP and CLS out of the box</li>
                <li><strong className="text-white">PageSpeed Score:</strong> 30-60 typical for WordPress themes</li>
                <li><strong className="text-white">Security:</strong> 13,000+ known plugin vulnerabilities. 90% of hacked CMS sites are WordPress</li>
                <li><strong className="text-white">Scalability:</strong> Performance degrades noticeably past 500 pages</li>
                <li><strong className="text-white">CSS Payload:</strong> 200-500KB of unused CSS from theme bloat</li>
                <li><strong className="text-white">Rendering:</strong> Server-side PHP rendering with no caching by default</li>
                <li><strong className="text-white">Structured Data:</strong> Plugin-dependent, often broken or incomplete</li>
                <li><strong className="text-white">Programmatic SEO:</strong> Extremely limited — custom post types max out quickly</li>
                <li><strong className="text-white">Maintenance:</strong> Constant plugin updates, compatibility issues, security patches</li>
              </ul>
            </div>
            <div className="rounded-xl bg-white/10 p-8 backdrop-blur-sm border border-white/20">
              <h3 className="text-lg font-semibold text-[#EFF70A]">Next.js (What We Build)</h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-100">
                <li><strong className="text-white">Load Time:</strong> Sub-1-second (pre-rendered static HTML served from edge)</li>
                <li><strong className="text-white">Core Web Vitals:</strong> 95-100 on every metric, every page, every time</li>
                <li><strong className="text-white">PageSpeed Score:</strong> 95-100 on Google PageSpeed Insights</li>
                <li><strong className="text-white">Security:</strong> Zero plugins, zero database exposure, zero attack surface</li>
                <li><strong className="text-white">Scalability:</strong> 54,000+ pages with zero performance degradation</li>
                <li><strong className="text-white">CSS Payload:</strong> 10-30KB with Tailwind CSS (only ships what you use)</li>
                <li><strong className="text-white">Rendering:</strong> SSG, SSR, or ISR — right strategy for each page type</li>
                <li><strong className="text-white">Structured Data:</strong> Coded directly into page components — never breaks</li>
                <li><strong className="text-white">Programmatic SEO:</strong> Unlimited pages via dynamic routes and data sources</li>
                <li><strong className="text-white">Maintenance:</strong> Minimal — no plugins, no CMS updates, no compatibility nightmares</li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-lg text-blue-100">
            Speed is a direct ranking factor. Google&apos;s Core Web Vitals heavily favor fast sites. Our{" "}
            <Link href="/pricing" className="text-white underline hover:text-blue-200">SEO platforms</Link>{" "}
            are built on the fastest framework available — and{" "}
            <Link href="/services/ai-search-optimization" className="text-white underline hover:text-blue-200">AI search models</Link>{" "}
            prefer clean, fast, structured pages too. The framework you build on is not a cosmetic choice — it is a competitive advantage that compounds every single day.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: OUR TECH STACK (DEEP DIVE)
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Technology Stack Behind Every Site We Build
          </h2>
          <p className="mt-4 text-zinc-400">
            We do not pick tools because they are popular. We pick them because they produce the fastest, most rankable, most maintainable websites possible. Here is exactly what powers every site we build — and why.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                name: "Next.js (React Framework)",
                description: "Next.js is the React framework created by Vercel that enables static site generation (SSG), server-side rendering (SSR), and incremental static regeneration (ISR) — all within the same application. For SEO, this means every page can be pre-rendered as pure HTML at build time, served instantly from the edge, and indexed immediately by search engines. React server components allow us to build complex, interactive interfaces while keeping the JavaScript payload minimal. App Router gives us nested layouts, streaming, and granular caching. This is the framework that powers Hulu, TikTok, Nike, and the Washington Post — and every single website we build for our clients.",
              },
              {
                name: "Vercel (Edge Deployment)",
                description: "Vercel is the hosting platform built by the same team that created Next.js. It deploys your site to a global network of edge nodes — your site is served from the data center closest to each visitor, reducing latency to near zero. For NYC businesses, that means sub-100ms time-to-first-byte for visitors in the tri-state area. Vercel provides automatic HTTPS, instant rollbacks, preview deployments for every code change, serverless functions for API routes, and built-in Web Analytics. Deployment is instantaneous — push code to GitHub, and your site is live worldwide in seconds. No FTP. No server management. No downtime.",
              },
              {
                name: "React (Component Architecture)",
                description: "React is the JavaScript library that powers Next.js and over 40% of the modern web. We build every page as a tree of reusable React components — headers, CTAs, service cards, FAQ accordions, structured data blocks — that can be composed, tested, and maintained independently. This component architecture means your site is modular, predictable, and easy to extend. Need to add 50 new location pages? We build a template component once and generate all 50 pages from data. Need to update your phone number across 500 pages? Change it in one constant file and every page updates automatically. This is the level of control WordPress simply cannot provide.",
              },
              {
                name: "Tailwind CSS (Utility-First Styling)",
                description: "Tailwind CSS replaces bloated CSS theme files with atomic utility classes. Instead of loading 500KB of pre-built styles (most of which your pages never use), Tailwind scans your code at build time and only ships the CSS your site actually needs — typically 10-30KB after compression. The result is faster page loads, better Core Web Vitals, and perfectly consistent design across every page. Tailwind also makes responsive design effortless — every utility class has mobile, tablet, and desktop variants built in. Our sites are mobile-first by default, not as an afterthought.",
              },
              {
                name: "Supabase (Backend & Database)",
                description: "Supabase is an open-source backend platform built on PostgreSQL. We use it for everything that requires server-side logic — contact form submissions, lead tracking, CRM data, user authentication, file storage, and real-time analytics. Supabase scales automatically, provides row-level security, and integrates natively with Next.js through server actions and API routes. For clients who need CRM functionality, Supabase powers our Full Loop CRM platform — handling lead capture, pipeline management, automated follow-ups, and detailed reporting. No WordPress database. No phpMyAdmin. No security nightmares.",
              },
              {
                name: "Resend & Telnyx (Communications)",
                description: "Resend handles transactional email — form confirmations, lead notifications, automated follow-up sequences, and monthly reports. Telnyx handles SMS — text message notifications, two-way texting with leads, and appointment reminders. Both integrate directly with our Next.js applications through API routes and server actions. No third-party plugins. No Zapier duct tape. Direct, reliable, code-level integrations that work every time.",
              },
            ].map((tech) => (
              <div key={tech.name}>
                <h3 className="text-xl font-semibold text-[#EFF70A]">{tech.name}</h3>
                <p className="mt-3 text-zinc-300 leading-relaxed">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup
        variant="mid"
        title="Still Running on WordPress? Let&rsquo;s Talk."
        subtitle="Most NYC service businesses are leaving thousands in organic revenue on the table because their website is too slow, too bloated, and too limited to compete. We fix that."
      />

      {/* ============================================================
          SECTION 5: OUR PROCESS (HowTo)
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our 6-Step Web Design & Development Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every website project follows the same proven framework. No guesswork. No scope creep. No surprises. Just a structured process that produces websites engineered to rank from the day they launch.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Discovery & Strategy",
                body: "Every project begins with deep discovery. We audit your current website (if you have one), analyze your competitive landscape, research your target keywords using Ahrefs and Google Search Console, map your service areas across every neighborhood you serve, and define the technical requirements for your new platform. We identify how many pages you need, which pages should be statically generated versus server-rendered, what structured data each page requires, and how the internal linking architecture should be designed. This phase typically takes 1 to 2 weeks and produces a detailed project specification that becomes the blueprint for everything that follows. Most agencies skip discovery and jump straight into design. We spend 15 to 20 hours on it because getting the architecture right is infinitely more important than getting the colors right.",
              },
              {
                step: "02",
                title: "Information Architecture & SEO Planning",
                body: "With discovery complete, we design your site architecture around your keyword strategy. Every page is mapped to a target keyword (or keyword cluster). We define the URL structure, build the internal linking map, design the breadcrumb hierarchy, plan the programmatic page templates for location and service coverage, and specify the JSON-LD structured data for each page type. For a plumber serving 50 neighborhoods with 8 services, this means planning 400+ unique landing pages, 8 service hub pages, 50 area pages, plus your core pages (home, about, contact, pricing). The architecture document we produce at this stage is typically 15 to 30 pages long. It is the single most important deliverable of the entire project because the structure of your site determines what you can rank for.",
              },
              {
                step: "03",
                title: "UI/UX Design",
                body: "We design mobile-first, conversion-optimized layouts in Figma. Every page is designed for both human users and search engine crawlers — clean heading hierarchy (H1 through H4), clear calls-to-action above and below the fold, structured content blocks that machines can parse, and visual hierarchy that guides visitors toward the phone call or form submission. We design responsive breakpoints for mobile, tablet, and desktop. We select typography that is fast-loading and highly readable. We build color systems that meet WCAG accessibility standards. You see full mockups of every page template before a single line of code is written, and we iterate until you are completely satisfied.",
              },
              {
                step: "04",
                title: "Next.js Development & Integration",
                body: "This is where the engineering happens. We build your site in Next.js with React components, Tailwind CSS, and the appropriate rendering strategy for each page type — static generation for your service and location pages (where content rarely changes), server-side rendering for dynamic pages (search, filtered results), and incremental static regeneration for pages that need periodic updates. We code JSON-LD structured data directly into each page component — Organization, LocalBusiness, Service, FAQPage, HowTo, Review, BreadcrumbList, and more. We implement comprehensive meta tags, Open Graph data, canonical URLs, XML sitemaps, and robots directives at the code level. We integrate Supabase for form submissions, lead tracking, and CRM functionality. We connect Resend for email notifications and Telnyx for SMS. Every line of code is written with SEO as the primary constraint.",
              },
              {
                step: "05",
                title: "Testing, QA & Launch",
                body: "Before launch, we test everything. Cross-browser testing on Chrome, Safari, Firefox, and Edge. Cross-device testing on iPhone, Android, iPad, and desktop. We validate all structured data through Google Rich Results Test. We verify Core Web Vitals using Lighthouse and PageSpeed Insights — targeting 95+ on every metric. We run full accessibility audits against WCAG 2.1 standards. For WordPress migration projects, we verify every 301 redirect, confirm no broken links, and ensure zero content is lost. We deploy to Vercel, configure custom domains and DNS, set up SSL, and go live. Launch day is anticlimactic by design — because every risk has already been eliminated during QA.",
              },
              {
                step: "06",
                title: "Post-Launch Optimization & Monitoring",
                body: "Your site does not stop improving after launch. For 90 days post-launch, we monitor Google Search Console daily — tracking indexation, crawl errors, Core Web Vitals, and keyword position changes. We monitor Vercel Analytics for real-user performance data. We submit sitemaps to Google and Bing. We verify structured data is rendering correctly in search results. For WordPress migration clients, we track ranking stability and flag any issues immediately. After the 90-day monitoring period, we transition to ongoing maintenance — or hand off to your team with full documentation. Many clients continue with our monthly SEO campaigns, where the website we built becomes the platform for continuous optimization.",
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
          SECTION 6: WHAT'S INCLUDED
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Every Website We Build</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is standard on every project. No add-on fees. No surprise upsells. You get the full stack because anything less would compromise your search performance.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Next.js Development",
                items: [
                  "Custom React components (no templates)",
                  "App Router with nested layouts",
                  "Static generation (SSG) for speed",
                  "Server-side rendering (SSR) where needed",
                  "Incremental static regeneration (ISR)",
                  "TypeScript for code reliability",
                ],
              },
              {
                title: "SEO Engineering",
                items: [
                  "Code-level meta tags & Open Graph",
                  "JSON-LD structured data (6+ types)",
                  "XML sitemap generation",
                  "Canonical URLs & robots directives",
                  "Internal linking architecture",
                  "Programmatic SEO page templates",
                ],
              },
              {
                title: "Core Web Vitals",
                items: [
                  "LCP under 1.2 seconds",
                  "INP under 100ms",
                  "CLS near zero",
                  "95-100 PageSpeed Insights score",
                  "Image optimization & lazy loading",
                  "Code splitting & tree shaking",
                ],
              },
              {
                title: "Design & UX",
                items: [
                  "Mobile-first responsive design",
                  "Tailwind CSS (zero bloat)",
                  "WCAG 2.1 accessibility compliance",
                  "Conversion-optimized layouts",
                  "Custom Figma mockups",
                  "Dark/light mode support (optional)",
                ],
              },
              {
                title: "Backend & Integrations",
                items: [
                  "Supabase PostgreSQL database",
                  "Contact form with lead tracking",
                  "Resend email notifications",
                  "Telnyx SMS notifications",
                  "Full Loop CRM integration (optional)",
                  "API routes for custom functionality",
                ],
              },
              {
                title: "Deployment & Hosting",
                items: [
                  "Vercel global edge deployment",
                  "Automatic SSL/HTTPS",
                  "Custom domain & DNS configuration",
                  "Instant rollbacks",
                  "Preview deployments per branch",
                  "99.99% uptime SLA",
                ],
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
          SECTION 7: PROGRAMMATIC SEO DEEP DIVE
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Programmatic SEO at Scale: 54,000+ Pages and Counting
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Here is the math that most web design agencies never do. A plumber in NYC offers 8 services — drain cleaning, pipe repair, water heater installation, sewer line repair, faucet repair, toilet installation, gas line repair, and emergency plumbing. That plumber serves 50 neighborhoods across Brooklyn, Queens, and Manhattan. That is 400 unique keyword combinations — each representing a real search query with real search volume. &ldquo;Drain cleaning Park Slope.&rdquo; &ldquo;Water heater installation Astoria.&rdquo; &ldquo;Emergency plumber Upper West Side.&rdquo;
            </p>
            <p>
              Building 400 unique, optimized landing pages manually would take a traditional agency months — and cost tens of thousands of dollars in content creation alone. With our Next.js platform, we build a template once, connect it to a data source, and generate all 400 pages programmatically. Each page has unique content, proper heading structure, location-specific details, relevant{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
              elements, JSON-LD structured data, internal links to related pages, and a clear call-to-action. Every page is pre-rendered as static HTML at build time, served from Vercel&apos;s edge network, and loads in under one second.
            </p>
            <p>
              This is how we built <Link href="/" className="text-[#5CB8FF] hover:text-[#8DD0FF]">thenycseo.com</Link> itself — 170+ service categories across 318 neighborhoods generating over 54,000 unique pages. Every page is indexed. Every page targets a real keyword. Every page loads in under a second. WordPress cannot do this. Wix cannot do this. Squarespace cannot do this. This is what a purpose-built Next.js SEO platform makes possible.
            </p>
            <p>
              For our clients, programmatic SEO means dominating the long-tail keywords that drive the highest-converting traffic. When someone searches &ldquo;emergency plumber Park Slope at 2am,&rdquo; they are not browsing — they have a flooded apartment and they need help now. Having a dedicated, optimized page for that exact query means you show up first, and you get the call. Multiply that across every service, every neighborhood, and every variation of how customers search — and you have a lead generation engine that no amount of Google Ads can match.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "54,000+", label: "Pages Built & Indexed" },
              { stat: "170+", label: "Service Categories" },
              { stat: "318", label: "Neighborhoods Covered" },
              { stat: "< 1s", label: "Page Load Time" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{item.stat}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: CORE WEB VITALS & PERFORMANCE DEEP DIVE
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Core Web Vitals: Why Page Speed Is a Ranking Factor
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              In 2021, Google made Core Web Vitals a direct ranking signal. That means the speed, interactivity, and visual stability of your website directly influence where you appear in search results. This is not a suggestion from Google — it is a measurable part of their algorithm. Faster sites rank higher. Slower sites get pushed down. The data is unambiguous.
            </p>
            <p>
              Core Web Vitals consist of three metrics. <strong className="text-white">Largest Contentful Paint (LCP)</strong> measures how quickly the main content of your page loads — Google wants this under 2.5 seconds, we target under 1.2 seconds. <strong className="text-white">Interaction to Next Paint (INP)</strong> measures how quickly your site responds to user interactions — Google wants this under 200ms, we target under 100ms. <strong className="text-white">Cumulative Layout Shift (CLS)</strong> measures visual stability — whether elements on the page jump around as it loads. Google wants this under 0.1, we target near zero.
            </p>
            <p>
              The average WordPress site fails at least one Core Web Vital. The average site we build passes all three with room to spare. This is not because we are better designers — it is because Next.js and our tech stack are fundamentally faster than WordPress. Static HTML served from Vercel&apos;s edge network will always be faster than dynamically generated PHP pages served from a shared hosting account. Tailwind CSS (10-30KB) will always be lighter than a WordPress theme (200-500KB). React server components will always be more efficient than jQuery plugins fighting over the DOM.
            </p>
            <p>
              For our clients, this performance advantage translates directly into higher rankings, better click-through rates, and more leads. A one-second improvement in page speed can increase conversions by 7%. When your competitors are loading in 4 seconds and you are loading in 0.8 seconds, that performance gap compounds into a significant competitive advantage — not just in rankings, but in the user experience that turns visitors into customers.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { metric: "LCP", target: "< 1.2s", description: "Largest Contentful Paint — main content loads in under 1.2 seconds" },
              { metric: "INP", target: "< 100ms", description: "Interaction to Next Paint — instant response to user clicks and taps" },
              { metric: "CLS", target: "~ 0", description: "Cumulative Layout Shift — zero visual jank, zero content jumping" },
            ].map((item) => (
              <div key={item.metric} className="rounded-xl border border-zinc-700 bg-[#141414] p-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">{item.metric}</p>
                <p className="mt-2 text-3xl font-extrabold text-[#EFF70A]">{item.target}</p>
                <p className="mt-3 text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: PRICING
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Web Design & Development Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent, project-based pricing. Every dollar goes into engineering, design, and SEO architecture — not overhead. 20+ years of results behind every build.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Starter Platform",
                price: "$10,000",
                period: " - $20,000",
                description: "For service businesses that need a fast, modern, SEO-ready website with 10-30 pages.",
                features: [
                  "Custom Next.js development",
                  "Mobile-first responsive design",
                  "Up to 30 pages (static generation)",
                  "Core Web Vitals optimization",
                  "JSON-LD structured data (6+ types)",
                  "Contact form with lead tracking",
                  "Vercel deployment & hosting setup",
                  "Google Search Console integration",
                  "90-day post-launch monitoring",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth Platform",
                price: "$20,000",
                period: " - $35,000",
                description: "For businesses that need programmatic SEO, CRM integration, and hundreds of optimized pages.",
                features: [
                  "Everything in Starter, plus:",
                  "Programmatic SEO page generation",
                  "Up to 1,000+ pages at scale",
                  "Supabase backend integration",
                  "Full Loop CRM setup",
                  "Resend email & Telnyx SMS integration",
                  "WordPress migration (if applicable)",
                  "AI-parseable structured data for GEO",
                  "Content migration & 301 redirects",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Enterprise Platform",
                price: "$35,000",
                period: " - $50,000+",
                description: "For businesses that want to own their entire market — every keyword, every neighborhood, at scale.",
                features: [
                  "Everything in Growth, plus:",
                  "Unlimited programmatic pages",
                  "AI agent development & integration",
                  "Custom API & third-party integrations",
                  "Multi-location / multi-brand architecture",
                  "Advanced analytics dashboard",
                  "Dedicated project manager",
                  "Priority support & SLA",
                  "Ongoing maintenance included (12 months)",
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
                <div className="mt-2 flex items-baseline gap-0">
                  <span className="text-4xl font-extrabold text-[#0080FE]">{plan.price}</span>
                  <span className="text-xl font-bold text-zinc-400">{plan.period}</span>
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
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              WordPress migration projects start at $7,500. Monthly maintenance from $500/month.{" "}
              <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
              including hourly rates and add-on services.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: WHY CHOOSE US / DIFFERENTIATORS
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose Us Over Every Other Agency</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Experience — We Were Here Before Google</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has been building websites and brands since the early days of the commercial internet. We have built on every platform that has ever existed — and we chose Next.js because it is the best framework available for websites that need to rank. Twenty years of experience means we have seen every algorithm update, every framework trend, and every technology hype cycle. We do not chase shiny objects. We build with tools that produce measurable results.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">No WordPress. No Wix. No Squarespace. No Exceptions.</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not build on WordPress. We do not build on Wix. We do not build on Squarespace, Webflow, or any other template-based platform. Every website we build is a custom Next.js application, hand-coded in React, styled with Tailwind CSS, deployed on Vercel, and backed by Supabase. This is not elitism — it is pragmatism. Template platforms impose technical constraints that limit your SEO ceiling. Custom code removes those constraints entirely. When your competitors are fighting with WordPress plugin conflicts, your Next.js site is loading in under one second and ranking on page one.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">SEO Is Not an Add-On — It Is the Architecture</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most web design agencies build a pretty website and then hand it off to an SEO agency to &ldquo;optimize.&rdquo; That is backwards. At The NYC SEO, the{" "}
                <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
                drives the architecture. The keyword research determines the page structure. The{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
                requirements determine the URL hierarchy. The{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
                best practices determine the component design. Every technical decision — from rendering strategy to internal linking to structured data — is made with search performance as the primary constraint. You cannot bolt SEO onto a bad architecture. You have to build the architecture around SEO.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Build What We Use</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                <Link href="/" className="text-[#5CB8FF] hover:text-[#8DD0FF]">TheNYCSEO.com</Link> itself is built on the same stack we use for every client — Next.js, Vercel, Supabase, Tailwind CSS, Resend, Telnyx. Our own platform has 54,000+ pages, loads in under one second, and scores 95+ on PageSpeed Insights. Our{" "}
                <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</Link>{" "}
                is built on the same stack. We are not recommending technology we have not battle-tested ourselves at massive scale.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Built for AI Search From Day One</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Over 100 million people use ChatGPT monthly. Millions more use Perplexity, Gemini, and Claude to find service providers. AI search models do not read your website the way humans do — they parse your structured data, evaluate your content clarity, and assess your entity relationships. Every website we build includes comprehensive JSON-LD schema markup (6+ types per page), clean semantic HTML, and content structured for{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>. When an AI model needs to recommend a service provider in your area, your site gives it exactly the data it needs to recommend you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: RESULTS / TESTIMONIALS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results From Real Projects</h2>
          <p className="mt-4 text-zinc-400">
            We do not deal in vanity metrics. Here is what happens when a service business moves from WordPress to a purpose-built Next.js platform.
          </p>
          <div className="mt-10 space-y-8">
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
                &ldquo;We came from a WordPress site that took 4 seconds to load and had terrible mobile experience. The NYC SEO rebuilt us on Next.js and the difference was immediate — sub-1-second loads, perfect Core Web Vitals, and our organic traffic doubled within 3 months. The programmatic pages they built for every neighborhood we serve are generating leads we never would have gotten from our old site. Worth every penny.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— James K., Plumbing Company Owner, Brooklyn</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
                &ldquo;Our previous agency built us a WordPress site with a premium theme and 23 plugins. It looked decent but loaded in 5 seconds and our PageSpeed score was 34. The NYC SEO rebuilt everything on Next.js — same design, completely different performance. PageSpeed went from 34 to 98. We started ranking for keywords we had never appeared for before. Three months in, we cut our Google Ads budget by 40% because organic was outperforming paid.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— Sarah M., HVAC Company Owner, Queens</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
                &ldquo;We needed 300+ location pages for every neighborhood we serve. Our WordPress developer quoted us 6 months and $45,000 to build them manually. The NYC SEO built the entire thing programmatically in 5 weeks for a fraction of the cost. Every page is unique, every page ranks, and every page generates leads. This is how web development should work.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— Michael T., General Contractor, Manhattan</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            Your website is the foundation. These services turn that foundation into a complete lead generation system that ranks across every search platform and converts visitors into customers.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service search engine optimization layered on top of your new platform." },
              { name: "Search Engine Optimization", href: "/services/search-engine-optimization", desc: "Comprehensive on-page, off-page, and technical SEO for maximum visibility." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, Gemini, and Claude." },
              { name: "On-Page SEO", href: "/services/on-page-seo", desc: "Title tags, meta descriptions, heading hierarchy, and content optimization." },
              { name: "Off-Page SEO & Link Building", href: "/services/off-page-seo", desc: "Strategic backlink acquisition, citations, and digital PR." },
              { name: "Local SEO", href: "/services/local-seo", desc: "Google Maps, local pack, and neighborhood-specific ranking strategies." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Optimize your GBP listing to dominate the local map pack." },
              { name: "Full Loop CRM", href: "/services/fullloopcrm", desc: "Custom CRM built on the same stack — lead capture, pipeline, automation." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized blog content, guides, and resources that rank and convert." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of optimized pages at scale with data-driven templates." },
              { name: "AI Agent Development", href: "/services/ai-agent-development", desc: "AI chatbots that qualify leads 24/7 using your website data." },
              { name: "AI Content Generation", href: "/services/ai-content-generation", desc: "AI-assisted content creation with human editorial oversight." },
              { name: "Branding & Identity", href: "/services/branding", desc: "Logo design, brand systems, and visual identity from Consortium NYC." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track rankings, traffic, Core Web Vitals, and lead attribution." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "Data-driven strategic planning that guides every optimization decision." },
              { name: "Marketing Consulting", href: "/services/marketing-consulting", desc: "Executive-level marketing strategy for growth-focused businesses." },
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
          SECTION 13: PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup
        variant="preFaq"
        title="20+ Years. Hundreds of Websites Built. Yours Is Next."
        subtitle="We have been building websites since before CSS existed. Your competitors wish they had this kind of engineering on their side."
      />

      {/* ============================================================
          SECTION 14: FAQ
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Web Design & Development</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC businesses about custom web design, Next.js development, WordPress migration, and building websites that rank.
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
          FINAL CTA
          ============================================================ */}
      <CTAGroup
        variant="final"
        title="Let&rsquo;s Build a Website That Actually Generates Revenue."
        subtitle="Tell us about your business and we will tell you exactly what we would build, how long it would take, and what it would cost. No commitment. No sales pitch. Just a real conversation about what your website should be."
      />
    </div>
  );
}
