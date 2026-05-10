// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Google Business Profile Optimization NYC",
  description:
    "Google Business Profile optimization for NYC businesses. GBP management, Map Pack rankings, review strategy, and local visibility. 25+ years experience.",
  keywords: [
    "Google Business Profile optimization NYC",
    "GBP management New York City",
    "Google Maps ranking NYC",
    "local pack optimization",
    "Google 3-pack ranking",
    "Google Business Profile management",
    "GBP optimization service",
    "Google Maps SEO NYC",
    "local SEO Google Maps",
    "review management NYC",
    "Google Posts management",
    "NAP consistency",
    "Google Business Profile agency NYC",
  ],
  openGraph: {
    title: "Google Business Profile Optimization NYC",
    description:
      "GBP optimization for NYC businesses. Map Pack rankings, review strategy, and local visibility. 25+ years.",
    url: `${SITE_URL}/services/google-business-profile`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/google-business-profile` },
};

const faqs = [
  {
    q: "What is Google Business Profile and why does it matter for my NYC business?",
    a: "Google Business Profile (formerly Google My Business) is a free listing that controls how your business appears in Google Maps and the local map pack — the top three business results that appear when someone searches for a service near them. For NYC service businesses, GBP is the single most important local ranking factor. When someone searches 'plumber near me' or 'dentist Midtown Manhattan,' the local pack is the first thing they see — above organic results, above ads in many cases. If your GBP is not optimized, you are invisible in the highest-converting real estate in local search. Over 42% of local search clicks go to the map pack, and 76% of people who search for a local business visit one within 24 hours.",
  },
  {
    q: "How much does Google Business Profile optimization cost?",
    a: "Our standalone GBP optimization and management service ranges from $1,000 to $2,500 per month depending on the number of locations, competition level, and scope of review management and posting cadence. For businesses that need comprehensive local visibility, we recommend our full SEO campaigns starting at $3,500 per month, which include GBP optimization as part of an integrated local SEO strategy. Every dollar goes directly into optimization, content creation, review management, and performance tracking — no fluff, no vanity metrics.",
  },
  {
    q: "How long does it take to rank in the Google Maps 3-pack?",
    a: "Most businesses see measurable improvements in map pack visibility within 60 to 90 days of full GBP optimization. However, breaking into the top 3 in highly competitive NYC markets — personal injury law, HVAC, plumbing — can take 3 to 6 months depending on your starting point, review count, and the strength of your competitors. The key factors are GBP completeness, review volume and velocity, NAP consistency, and proximity to the searcher. We focus on the factors you can control and build momentum month over month.",
  },
  {
    q: "What is the Google local pack (3-pack) and how do I get into it?",
    a: "The local pack — also called the Google 3-pack or map pack — is the box of three business listings that appears at the top of Google search results for local queries, accompanied by a map. Getting into the 3-pack requires a combination of GBP optimization (complete profile, correct categories, regular posts), review quantity and quality, NAP consistency across the web, local citation signals, on-site SEO signals from your website, and behavioral signals like clicks and calls from your listing. We optimize all of these factors systematically.",
  },
  {
    q: "How do reviews affect my Google Business Profile ranking?",
    a: "Reviews are one of the top three ranking factors for the local map pack. Google considers your total review count, average star rating, review velocity (how frequently you receive new reviews), and the content of reviews — especially when reviewers mention your services and location naturally. Responding to every review — positive and negative — also sends ranking signals. Our review management strategy uses Full Loop CRM to automate feedback collection, encourage satisfied customers to leave reviews, and ensure you respond to every review promptly and professionally.",
  },
  {
    q: "What are Google Posts and should I be using them?",
    a: "Google Posts are short updates that appear directly on your Google Business Profile listing. They can include text, images, videos, CTAs, and links. Posting regularly signals to Google that your business is active and engaged, which contributes to local ranking. We publish 4 to 8 Google Posts per month for each client covering promotions, seasonal tips, before-and-after project highlights, and company news. Each post is optimized with relevant keywords and a clear call-to-action. Posts expire after 7 days, so consistency is critical.",
  },
  {
    q: "What is NAP consistency and why does it matter?",
    a: "NAP stands for Name, Address, Phone number. NAP consistency means your business name, address, and phone number are identical across every listing on the internet — your website, Google Business Profile, Yelp, Facebook, industry directories, BBB, and dozens of other platforms. Inconsistent NAP data confuses Google and dilutes your local ranking signals. Even small differences — '150 W 47th St' versus '150 West 47th Street' — can hurt you. We audit every citation, correct inconsistencies, and build new citations on authoritative directories to strengthen your NAP signals.",
  },
  {
    q: "Can you manage multiple Google Business Profile locations?",
    a: "Yes. We manage multi-location GBP strategies for businesses with two to twenty-plus locations across the NYC metro area. Each location gets its own optimized profile with location-specific descriptions, categories, photos, posts, and review management. We ensure each listing targets the right service area without cannibalizing the others, and we use a centralized dashboard to monitor all locations simultaneously. Multi-location management starts at $2,000 per month plus $500 per additional location.",
  },
  {
    q: "What GBP categories should I choose for my business?",
    a: "Choosing the right primary and secondary categories is one of the most impactful things you can do for your GBP ranking. Your primary category should be the most specific term that describes your core service — 'Emergency Plumber' ranks differently than 'Plumber,' and 'Personal Injury Attorney' ranks differently than 'Lawyer.' You can add up to 10 secondary categories. We research which categories your top-ranking competitors use, which categories drive the most visibility for your services, and which combinations produce the best results in your specific market.",
  },
  {
    q: "How do I handle negative reviews on Google?",
    a: "Negative reviews happen to every business. The key is how you respond. We craft professional, empathetic responses to every negative review within 24 hours. We address the customer's concern specifically, offer to resolve the issue offline, and demonstrate to future readers that you take customer satisfaction seriously. Google does not remove legitimate negative reviews, but a professional response can actually increase trust — 45% of consumers say they are more likely to visit a business that responds to negative reviews. If a review violates Google's policies — fake, spam, or from someone who was never a customer — we flag it for removal.",
  },
  {
    q: "What is the difference between GBP optimization and local SEO?",
    a: "GBP optimization is one component of local SEO. Local SEO encompasses everything that affects your visibility in local search — Google Business Profile, local citations, on-site location pages, local link building, review management, and localized content. GBP optimization focuses specifically on your Google Business Profile listing — categories, description, photos, posts, Q&A, reviews, and attributes. For maximum local visibility, you need both. Our standalone GBP service is ideal for businesses that already have a strong website. Our full SEO campaigns include GBP optimization plus website optimization, citation building, and content creation.",
  },
  {
    q: "How do GBP attributes and service areas work?",
    a: "GBP attributes are checkboxes that describe your business — things like 'women-owned,' 'veteran-owned,' 'wheelchair accessible,' 'free estimates,' or 'emergency service available.' These attributes appear on your listing and can influence which searches your profile appears for. Service areas define the geographic regions you serve. For service-area businesses that travel to customers — plumbers, electricians, cleaners — you set service areas instead of (or in addition to) a physical address. We configure both attributes and service areas strategically to maximize your visibility for the searches that matter most.",
  },
  {
    q: "What photos should I add to my Google Business Profile?",
    a: "Businesses with photos receive 42% more requests for directions and 35% more click-throughs to their websites. We optimize your GBP with high-quality photos across every category Google supports — logo, cover photo, exterior, interior, team members, at-work photos, and before-and-after project images. Each photo is geotagged with your business location metadata, properly sized, and labeled with descriptive filenames. We recommend uploading 3 to 5 new photos per month to signal freshness and activity to Google's algorithm.",
  },
  {
    q: "Do you help with Google Business Profile Q&A?",
    a: "Yes. The Q&A section of your GBP is an often-overlooked ranking opportunity. Anyone can ask or answer questions on your listing — including you. We proactively seed your Q&A section with common questions your customers ask, provide detailed answers that include relevant keywords naturally, and monitor for new questions so we can respond quickly. This section also feeds AI search platforms with structured question-and-answer data about your business.",
  },
  {
    q: "What is GBP Insights and how do you use it?",
    a: "GBP Insights (now part of Google Business Profile Performance) tracks how customers find and interact with your listing — search queries used, direct versus discovery searches, phone calls, direction requests, website clicks, photo views, and more. We analyze this data monthly to identify which searches drive the most engagement, which photos perform best, which posts generate the most clicks, and where there are opportunities to improve. This data directly informs our optimization strategy and is included in your monthly report.",
  },
  {
    q: "Can you help me set up a new Google Business Profile from scratch?",
    a: "Absolutely. We handle the entire GBP setup process — creating the listing, verifying the business (including video verification if required), writing an optimized business description, selecting primary and secondary categories, configuring service areas, adding attributes, uploading photos, setting business hours, adding services and products, writing initial posts, seeding the Q&A section, and connecting your appointment booking link. Most new GBP setups are live and fully optimized within 7 to 14 days.",
  },
  {
    q: "How does Full Loop CRM help with review management?",
    a: "Full Loop CRM is our integrated customer relationship management platform that automates the review collection process. After a service is completed, Full Loop automatically sends a feedback request to the customer. Satisfied customers are directed to leave a review on Google. Customers with concerns are routed to an internal feedback form so you can address issues before they become public reviews. This automated system increases review volume by 3x to 5x compared to manual review requests, and it filters negative experiences before they hit your public profile.",
  },
];

export default function GBPPage() {
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
    name: "The NYC SEO — Google Business Profile Optimization",
    url: `${SITE_URL}/services/google-business-profile`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$1,000 - $15,000/mo",
    description:
      "Google Business Profile optimization and management for local service businesses in NYC, NJ, Long Island, and Westchester. Map pack rankings, review management, Google Posts, and local search visibility.",
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
      reviewCount: "147",
      bestRating: "5",
      worstRating: "1",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Google Business Profile Optimization Services",
    description:
      "Comprehensive Google Business Profile optimization including profile setup, category selection, review management, Google Posts, Q&A management, photo optimization, NAP consistency, citation building, and local map pack ranking for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/google-business-profile`,
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
      name: "Google Business Profile Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "GBP Profile Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Maps Ranking" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Review Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Posts Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Q&A Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Photo & Video Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "NAP Consistency & Citation Building" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "GBP Insights & Reporting" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Multi-Location GBP Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Category & Attribute Optimization" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our Google Business Profile Optimization Process Works",
    description: "Our proven 6-step process for optimizing Google Business Profiles and ranking NYC service businesses in the local map pack.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "GBP Audit & Competitive Analysis",
        text: "We audit your current Google Business Profile, analyze your competitors' listings, review your citation landscape, and identify every gap and opportunity. We assess category selection, review velocity, photo quality, post frequency, and NAP consistency across the web.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Full Profile Optimization",
        text: "We optimize every field in your GBP — business description, primary and secondary categories, attributes, service areas, appointment links, products and services, business hours, and special hours. Every element is tuned for maximum local search visibility.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Review Strategy & Automation",
        text: "We implement a systematic review generation strategy using Full Loop CRM to automate feedback collection, route satisfied customers to Google reviews, and intercept negative experiences before they become public. We craft professional responses to every existing review.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Content & Google Posts Strategy",
        text: "We create and publish 4 to 8 Google Posts per month with optimized content, images, and CTAs. We seed your Q&A section with common customer questions and detailed keyword-rich answers. We upload geotagged photos monthly to signal business activity.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Citation Alignment & NAP Consistency",
        text: "We audit every citation across 80+ directories, correct NAP inconsistencies, suppress duplicate listings, and build new citations on authoritative local and industry-specific directories. Consistent NAP data across the web is a foundational local ranking signal.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Performance Tracking & Monthly Reporting",
        text: "We monitor GBP Insights data — search queries, customer actions, photo views, direction requests, and call tracking. Every month, you receive a detailed report showing map pack positions, review growth, post engagement, and lead attribution with actionable recommendations.",
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
      name: "The NYC SEO — Google Business Profile Optimization",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Anthony M." },
    reviewBody:
      "The NYC SEO completely overhauled our Google Business Profile and within 3 months we went from invisible in Maps to showing up in the top 3 for every major keyword in our area. Our review count tripled thanks to their automated system and we are getting 40% more calls directly from our GBP listing. Best investment we have made in marketing.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Google Business Profile", url: "/services/google-business-profile" },
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
            {/* Left — Copy */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                Google Business Profile Agency &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Google Business Profile Optimization
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  That Dominates the Map Pack
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Your Google Business Profile is the first thing customers see when they search for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local services</Link>{" "}
                in Google Maps and the local 3-pack. We optimize every field, build systematic review generation strategies, publish weekly Google Posts, manage your Q&amp;A section, align your citations, and turn your GBP into a lead-generating machine. Combined with your{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">organic SEO</Link>,{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>, and{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>{" "}
                — this creates total local dominance across every way a customer can find you.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Full GBP setup, verification & optimization",
                "Google Maps & local 3-pack ranking strategy",
                "Automated review generation via Full Loop CRM",
                "Weekly Google Posts with optimized content",
                "Q&A seeding with keyword-rich answers",
                "Photo & video optimization with geotagging",
                "NAP consistency audit across 80+ directories",
                "Monthly GBP Insights reporting & analysis",
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
          SECTION 2: WHAT IS GOOGLE BUSINESS PROFILE
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is Google Business Profile and Why Is It the #1 Local Ranking Factor?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Google Business Profile — formerly known as Google My Business — is the free listing that controls how your business appears in Google Maps and the local map pack. When someone in{" "}
              <Link href="/plumber/upper-east-side" className="text-[#5CB8FF] hover:text-[#8DD0FF]">the Upper East Side</Link>{" "}
              searches &ldquo;plumber near me&rdquo; or a homeowner in{" "}
              <Link href="/electrician/park-slope" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Park Slope</Link>{" "}
              searches &ldquo;electrician Brooklyn,&rdquo; the first thing they see is the local 3-pack — three business listings with star ratings, phone numbers, hours, and a click-to-call button, all sitting above the organic search results. That 3-pack is powered entirely by Google Business Profile. If your GBP is not optimized, you are invisible in the most valuable real estate in local search.
            </p>
            <p>
              The numbers tell the story. Over 42% of all clicks on local search results go to the map pack. 76% of people who perform a local search on their phone visit a physical location within 24 hours. 28% of those searches result in a purchase. And according to Google&apos;s own data, businesses with complete GBP listings are 70% more likely to attract location visits and 50% more likely to lead to a purchase. For NYC service businesses —{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/hvac" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC contractors</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>{" "}
              — these are not vanity metrics. This is the difference between a phone that rings and one that does not.
            </p>
            <p>
              Google uses three primary factors to determine local map pack rankings: relevance (how well your profile matches the search query), distance (how close you are to the searcher), and prominence (how well-known and trusted your business is online). Prominence is where optimization matters most — it encompasses your review count and ratings, your{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website SEO signals</Link>, your citation consistency, the quality of your GBP content, and your overall online authority. Every aspect of our GBP optimization service is designed to maximize your prominence signals so Google ranks you above your competitors in the map pack.
            </p>
            <p>
              And here is what most businesses miss: your GBP does not exist in isolation. It works in concert with your{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">organic SEO</Link>, your{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>, your{" "}
              <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website</Link>, and your entire online presence. Google connects signals across all of these channels. A strong GBP with a weak website will not rank. A great website with a neglected GBP will not appear in Maps. We optimize the entire ecosystem — not just one piece of it.
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
            Our 6-Step Google Business Profile Optimization Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every GBP campaign follows our proven framework — adapted to your industry, your competition, and the neighborhoods you serve.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "GBP Audit & Competitive Analysis",
                body: "We start by auditing your current Google Business Profile from top to bottom — every field, every category, every photo, every review, every post. Then we audit your top 10 competitors in the map pack for each of your target keywords. We analyze their category selections, review counts and velocity, posting cadence, photo quality, Q&A sections, and citation profiles. We cross-reference your NAP data across 80+ directories to identify inconsistencies. We check your GBP Insights data to understand how customers are currently finding and interacting with your listing. This audit typically takes 8 to 12 hours and produces a detailed gap analysis that becomes the foundation of your entire optimization strategy. Most agencies skip this step and jump straight into surface-level changes. We invest the time upfront because the diagnosis determines the treatment.",
              },
              {
                step: "02",
                title: "Full Profile Optimization",
                body: "We optimize every single field in your Google Business Profile. This starts with selecting the most effective primary category — and this matters more than most businesses realize. 'Emergency Plumber' ranks differently than 'Plumber.' 'Personal Injury Attorney' ranks differently than 'Lawyer.' We research which primary and secondary categories drive the most visibility in your specific market. Then we write a keyword-rich business description that reads naturally while targeting your top search queries. We configure your service areas strategically, add every relevant attribute, set up appointment links, add your services with descriptions and pricing, configure business hours and special hours, and ensure your profile is 100% complete. An incomplete GBP is a ranking liability — Google explicitly rewards complete profiles with higher visibility.",
              },
              {
                step: "03",
                title: "Review Strategy & Automation",
                body: "Reviews are the second most important local ranking factor after GBP relevance. We implement a systematic, automated review generation strategy using Full Loop CRM — our integrated platform that sends feedback requests to customers after every service call. Satisfied customers receive a direct link to leave a Google review. Customers with concerns are routed to a private feedback form, giving you a chance to resolve issues before they become public reviews. This system typically increases review volume by 3x to 5x within the first 90 days. We also craft professional responses to every existing review on your profile — both positive and negative — because Google tracks response rate and speed as ranking signals. Every response is personalized, mentions your services naturally, and reinforces your brand voice.",
              },
              {
                step: "04",
                title: "Content, Google Posts & Q&A Strategy",
                body: "We create and publish 4 to 8 Google Posts per month, each with optimized content, high-quality images, and clear CTAs. Posts cover seasonal tips, project highlights, promotions, company updates, and industry news — all written to include relevant keywords naturally. Google Posts signal business activity and freshness, both of which contribute to local rankings. We also proactively seed your Q&A section with the 15 to 20 most common questions your customers ask. Each answer is detailed, keyword-rich, and written to serve both human readers and search engines. This Q&A content also feeds AI search platforms like ChatGPT and Perplexity with structured data about your business, improving your visibility in AI-powered recommendations.",
              },
              {
                step: "05",
                title: "Citation Alignment & NAP Consistency",
                body: "NAP (Name, Address, Phone) consistency across the web is a foundational local ranking signal. We audit your existing citations across 80+ directories — Yelp, Facebook, BBB, Yellow Pages, Angi, industry-specific directories, data aggregators, and local business associations. We correct every inconsistency, no matter how small. We suppress duplicate listings that dilute your signals. And we build new citations on authoritative directories you are not yet listed on. We also submit your accurate NAP data to the four major data aggregators — Data Axle, Localeze, Foursquare, and Factual — which feed information to hundreds of smaller directories. This creates a cascade of consistent data across the web that strengthens your local authority with Google.",
              },
              {
                step: "06",
                title: "Performance Tracking & Monthly Reporting",
                body: "We monitor your GBP Insights data continuously — search queries that trigger your listing, customer actions (calls, direction requests, website clicks), photo views versus competitors, and post engagement metrics. We track your map pack positions for every target keyword across every neighborhood you serve. We measure review growth velocity and average rating trends. Every month, you receive a comprehensive report covering all of these metrics, with a recorded walkthrough explaining what happened, what is working, what needs adjustment, and exactly what we are doing next month. We tie every metric back to business outcomes — are you getting more calls, more direction requests, and more qualified leads this month than last month? That is the only question that matters.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our GBP Optimization Service</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is included in our monthly GBP management. No hidden fees. No surprise upsells. Everything your profile needs to rank.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Profile Optimization",
                items: ["Business description with target keywords", "Primary & secondary category selection", "Attribute configuration (20+ attributes)", "Service area mapping & optimization", "Appointment link & booking setup", "Services & products with descriptions", "Business hours & special hours", "Complete profile scoring to 100%"],
              },
              {
                title: "Review Management",
                items: ["Full Loop CRM automated review requests", "Review response within 24 hours", "Negative review mitigation strategy", "Review monitoring & alerts", "Competitor review analysis", "Review velocity tracking & optimization"],
              },
              {
                title: "Google Posts",
                items: ["4-8 posts per month", "Seasonal & promotional content", "Before-and-after project highlights", "Custom images with brand consistency", "CTA optimization (call, learn more, book)", "Post performance tracking"],
              },
              {
                title: "Q&A Management",
                items: ["15-20 pre-seeded questions & answers", "Keyword-rich answer optimization", "Weekly monitoring for new questions", "Competitive Q&A analysis", "AI search data optimization", "Spam & misinformation flagging"],
              },
              {
                title: "Photo & Media Optimization",
                items: ["Geotagged photo uploads (3-5/month)", "Logo & cover photo optimization", "Team, interior & exterior photos", "Before-and-after project photos", "Photo category organization", "Competitor photo benchmarking"],
              },
              {
                title: "Reporting & Insights",
                items: ["Monthly GBP Insights report", "Map pack position tracking", "Search query analysis", "Call & direction request tracking", "Photo view comparison vs competitors", "Review growth velocity metrics", "Recorded monthly walkthrough"],
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who GBP Optimization Is For</h2>
          <p className="mt-4 text-zinc-400">
            If your customers find you by searching for your service on Google Maps or in the local pack, you need a fully optimized Google Business Profile. We work exclusively with local service businesses.
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
          SECTION 7: GBP vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">GBP Optimization vs. Other Local Marketing Channels</h2>
          <p className="mt-4 text-zinc-400">
            Every marketing channel has trade-offs. Here is how a fully optimized Google Business Profile compares to the alternatives NYC service businesses typically consider.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">GBP Optimization vs. Google Ads (PPC)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Google Ads puts you at the top of the page immediately, but you pay $15 to $85 per click for service keywords in NYC — and the moment you stop paying, you disappear. A fully optimized GBP gets you into the local 3-pack, which appears above organic results and often receives more clicks than ads because consumers trust map pack results more. GBP clicks are free. Once you rank in the map pack, every call, every direction request, and every website click costs you nothing. Over a 12-month period, GBP optimization delivers 8x to 15x better ROI than PPC for local service businesses. The smartest approach is to run{" "}
                <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Ads alongside SEO</Link>{" "}
                for immediate visibility while your GBP builds momentum, then scale ads down as your map pack rankings solidify.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">GBP Optimization vs. Yelp, Angi & HomeAdvisor</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Lead aggregators charge $30 to $100+ per lead, share those leads with 3 to 5 competitors, and give you zero control over lead quality or customer experience. Your Google Business Profile is yours. When a customer finds you in the map pack, they see your reviews, your photos, your posts, your hours — and they call you directly. No shared leads. No middleman. No per-lead fees. The leads from GBP are also higher quality because the customer has already evaluated your profile, read your reviews, and decided you are the right fit before they pick up the phone. Yelp and Angi have their place, but GBP should always be your primary local visibility channel.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">GBP Optimization vs. Organic SEO Alone</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Organic SEO</Link>{" "}
                gets you into the traditional &ldquo;10 blue links&rdquo; below the map pack. GBP optimization gets you into the map pack itself — which appears first, includes your star rating, and has a click-to-call button. You need both. Organic SEO signals (your website, backlinks, content) directly influence your GBP rankings, and your GBP signals (reviews, categories, NAP consistency) influence your organic rankings. They are not separate strategies — they are two halves of the same local search strategy. Businesses that optimize both see 3x to 5x more total local search traffic than businesses that focus on only one.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">GBP Optimization vs. Doing Nothing</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                If you have not touched your GBP, you are actively losing money. An unclaimed or unoptimized profile means you are invisible in Maps for 42% of local search clicks. Your competitors with 50+ reviews are getting the calls that should be yours. Your missing photos, blank description, and wrong categories are telling Google — and customers — that your business is not worth ranking. Every month you delay GBP optimization is a month of lost leads, lost revenue, and lost ground to competitors who are investing in their local presence. The businesses that dominate the map pack today are not smarter than you — they just started optimizing sooner.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Real GBP Results for NYC Service Businesses</h2>
          <p className="mt-4 text-zinc-400">
            We do not deal in vanity metrics. Here is what happens when Google Business Profile optimization is done right.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "Top 3", label: "Map Pack Rankings for Primary Keywords" },
              { stat: "3x–5x", label: "Review Count Increase in 90 Days" },
              { stat: "340%", label: "Average Increase in GBP Views" },
              { stat: "40%+", label: "More Calls Directly from GBP" },
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
              &ldquo;The NYC SEO completely overhauled our Google Business Profile and within 3 months we went from invisible in Maps to showing up in the top 3 for every major keyword in our area. Our review count went from 12 to 67 thanks to their automated Full Loop CRM system, and we are getting 40% more calls directly from our GBP listing. We used to pay $4,000 a month on Angi leads — now most of our calls come from Google Maps for free. Best investment we have made in marketing.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Anthony M., Plumbing Company Owner, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We had a Google Business Profile but never did anything with it — no posts, no photos, and only 8 reviews in 3 years. The NYC SEO team optimized everything, set up their review system, and started posting every week. Within 4 months our GBP views went from 800 to over 3,500 per month and we are consistently in the local 3-pack for our target neighborhoods. The monthly reports show exactly where every lead comes from. Could not recommend them more.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Rachel K., Dental Practice Manager, Upper West Side</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Google Business Profile Mistakes That Kill Your Map Pack Rankings
          </h2>
          <p className="mt-4 text-zinc-400">
            We see these mistakes on almost every GBP we audit. Each one is costing you visibility, calls, and revenue.
          </p>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Choosing the wrong primary category",
                fix: "Your primary category is the single most important ranking factor on your GBP. 'Plumber' and 'Emergency Plumber' are different categories with different ranking results. 'Lawyer' and 'Personal Injury Attorney' target different search queries. We research which primary category your top-ranking competitors use and which one drives the most visibility for your specific services. Then we add up to 9 secondary categories to maximize your reach across related searches.",
              },
              {
                mistake: "Having few or no Google reviews",
                fix: "Businesses in the local 3-pack in competitive NYC markets typically have 50 to 200+ reviews. If you have 5 to 10 reviews, you are not going to outrank them — no matter how good your GBP is otherwise. We implement Full Loop CRM's automated review collection system that sends feedback requests after every service call, routing happy customers to Google and catching concerns privately. Most clients triple their review count within 90 days.",
              },
              {
                mistake: "Not responding to reviews — positive or negative",
                fix: "Google tracks whether you respond to reviews and how quickly. Businesses that respond to reviews are seen as more trustworthy by both Google and customers. 45% of consumers say they are more likely to use a business that responds to negative reviews. We respond to every review within 24 hours with personalized, professional responses that reinforce your brand and naturally include relevant service keywords.",
              },
              {
                mistake: "Never publishing Google Posts",
                fix: "Google Posts signal that your business is active and engaged. Businesses that post weekly see higher engagement, more profile views, and stronger ranking signals. Posts expire after 7 days, so consistency is critical. We publish 4 to 8 posts per month with optimized content, high-quality images, and clear CTAs — covering seasonal tips, project highlights, promotions, and company updates.",
              },
              {
                mistake: "Using low-quality, blurry, or stock photos",
                fix: "Businesses with photos receive 42% more direction requests and 35% more website clicks. But low-quality or generic stock photos hurt more than they help — they signal that you do not care about your presentation. We ensure every photo is high-quality, properly sized, geotagged with your business location, and categorized correctly. We upload 3 to 5 fresh photos monthly to signal ongoing activity to Google.",
              },
              {
                mistake: "Inconsistent NAP data across the web",
                fix: "If your business name is 'ABC Plumbing LLC' on Google but 'ABC Plumbing' on Yelp and 'A.B.C. Plumbing LLC' on Facebook, Google cannot confidently connect those listings to the same business. Even small variations — '150 W 47th St' versus '150 West 47th Street' — dilute your signals. We audit every citation across 80+ directories, correct every inconsistency, and submit accurate data to the four major data aggregators.",
              },
              {
                mistake: "Ignoring the Q&A section entirely",
                fix: "Anyone can ask — and answer — questions on your GBP listing. If you are not proactively managing this section, customers or competitors could be posting misleading information. We seed your Q&A with 15 to 20 common customer questions and detailed, keyword-rich answers. We monitor for new questions weekly and respond quickly with accurate, professional answers.",
              },
              {
                mistake: "Using a generic or incomplete business description",
                fix: "Your GBP description is 750 characters of prime keyword real estate. A generic description like 'We are a local plumbing company serving NYC' wastes this opportunity. We write descriptions that naturally incorporate your target service keywords, mention the specific neighborhoods you serve, highlight your unique differentiators, and compel searchers to choose you over competitors.",
              },
              {
                mistake: "Not configuring service areas correctly",
                fix: "Service-area businesses that travel to customers — plumbers, electricians, cleaners, movers — need properly configured service areas. Setting your service area too broadly dilutes your ranking signals. Setting it too narrowly limits your visibility. We research the optimal service area configuration for your specific market and competition level, ensuring maximum visibility in the neighborhoods that matter most to your business.",
              },
              {
                mistake: "Setting up GBP once and never touching it again",
                fix: "GBP optimization is not a one-time project — it is an ongoing process. Google rewards businesses that are consistently active with fresh posts, new photos, growing reviews, and updated information. Your competitors are not standing still, and neither should your GBP. We manage your profile monthly with fresh content, review responses, photo uploads, performance analysis, and strategic adjustments based on data.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">GBP Optimization & Local SEO Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into optimization, content, review management, and performance tracking. 20+ years of results behind every campaign.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {[
              {
                tier: "GBP Starter",
                price: "$1,000",
                period: "/month",
                description: "Standalone GBP management for single-location businesses with low-to-moderate competition.",
                features: [
                  "Full GBP audit & optimization",
                  "Primary & secondary category selection",
                  "4 Google Posts per month",
                  "Review response management",
                  "Basic citation audit (top 20 directories)",
                  "Monthly GBP Insights report",
                  "Photo uploads (3/month)",
                  "Q&A section setup",
                ],
                cta: "Get Started",
              },
              {
                tier: "GBP Growth",
                price: "$2,500",
                period: "/month",
                description: "Comprehensive GBP management with automated review generation and aggressive content strategy.",
                features: [
                  "Everything in GBP Starter, plus:",
                  "Full Loop CRM review automation",
                  "8 Google Posts per month",
                  "Full citation audit & cleanup (80+ directories)",
                  "NAP consistency across data aggregators",
                  "Competitor GBP monitoring",
                  "Photo uploads (5/month) with geotagging",
                  "Q&A management with weekly monitoring",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Full SEO + GBP",
                price: "$3,500",
                period: "/month",
                description: "Complete local SEO with GBP optimization, on-page SEO, and organic ranking strategy.",
                features: [
                  "Everything in GBP Growth, plus:",
                  "Full on-page SEO optimization",
                  "Technical SEO & Core Web Vitals",
                  "Local citation building (50+ directories)",
                  "Schema markup (5+ types per page)",
                  "Location-specific landing pages",
                  "Monthly reporting with lead attribution",
                  "Hosting included",
                ],
                cta: "Get Started",
              },
              {
                tier: "Domination",
                price: "$7,500+",
                period: "/month",
                description: "Multi-location GBP management plus full-scale organic SEO for total local market control.",
                features: [
                  "Everything in Full SEO + GBP, plus:",
                  "Multi-location GBP management",
                  "Programmatic page generation (1,000+ pages)",
                  "Off-page link building (15+ links/month)",
                  "AI search optimization (GEO)",
                  "Content creation (4 articles/month)",
                  "Bi-weekly strategy calls",
                  "Dedicated account strategist",
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
            All plans include a free initial GBP audit. Enterprise and multi-location plans available.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            including project-based and hourly consulting rates.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO for GBP Optimization</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full Loop CRM — Automated Review Collection That Actually Works</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most agencies tell you to &ldquo;ask customers for reviews&rdquo; and leave it at that. We built something better.{" "}
                <a href="https://www.fullloopcrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                automatically sends feedback requests after every service call. Happy customers get a direct link to leave a Google review. Unhappy customers get routed to a private feedback form so you can resolve issues before they go public. The system runs on autopilot — no manual follow-ups, no awkward conversations, no missed opportunities. Our clients see 3x to 5x increases in review volume within the first 90 days. More reviews means higher map pack rankings, more trust, and more calls. It is the single most impactful thing you can do for your GBP.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Local Search Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has been building websites and ranking local businesses since before Google Maps existed. We have optimized hundreds of Google Business Profiles across every major service industry in New York City. We have seen every Google algorithm update, every interface change, every new feature launch. That depth of experience means we do not guess — we know what works because we have tested it across thousands of campaigns over two decades. When Google changes the rules, we have already adapted.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Integrated SEO — Not Just GBP in a Vacuum</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Your GBP does not rank in isolation. Google connects signals from your website, your backlinks, your citations, your content, and your structured data to determine your map pack position. An agency that only optimizes your GBP without touching your{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website SEO</Link>{" "}
                is leaving ranking factors on the table. We offer standalone GBP management for businesses that have their website handled, but our most successful clients use our{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">full SEO campaigns</Link>{" "}
                that combine GBP optimization with on-page SEO, technical SEO, citation building,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                for total local dominance.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Modern Tech Stack — Built for Performance</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                — not WordPress. We deploy on Vercel. We use Supabase for data management, Resend for transactional email, and Telnyx for call tracking. Our entire stack is built for speed, reliability, and performance. When your website loads in under 1 second and scores 95+ on Core Web Vitals, it sends strong quality signals to Google that directly boost your GBP rankings. Your website performance and your GBP performance are connected — we optimize both sides of the equation with a modern infrastructure that most agencies cannot match.
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
            Google Business Profile optimization works best as part of an integrated local search strategy. These services complement and amplify your GBP rankings.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service organic SEO that strengthens every GBP ranking signal." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic foundation that drives every local search decision." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered for sub-1-second loads and perfect Core Web Vitals." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and other AI platforms." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content that builds authority and supports local rankings." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of location pages at scale for total market coverage." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track GBP performance, call attribution, and ROI across all channels." },
              { name: "AI Agent Development", href: "/services/ai-agent-development", desc: "AI chatbots that qualify leads 24/7 using your GBP and website data." },
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
          <h2 className="text-3xl font-bold sm:text-4xl">GBP Optimization Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We optimize Google Business Profiles for service businesses across the entire NYC metropolitan area — every borough, every neighborhood, every suburb.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                region: "Manhattan",
                areas: [
                  { name: "Midtown", href: "/hvac/midtown" },
                  { name: "Upper East Side", href: "/plumber/upper-east-side" },
                  { name: "Upper West Side", href: "/electrician/upper-west-side" },
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
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Google Business Profile Optimization</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about Google Business Profile management and local map pack rankings.
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
