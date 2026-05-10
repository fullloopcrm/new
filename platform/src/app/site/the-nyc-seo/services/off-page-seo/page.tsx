// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Off-Page SEO & Link Building NYC",
  description:
    "Off-page SEO and link building for NYC businesses. Backlinks, citations, digital PR, and authority building. Results-driven. 25+ years experience.",
  keywords: [
    "off-page SEO NYC",
    "link building services New York",
    "backlink agency NYC",
    "local citation building NYC",
    "digital PR agency New York",
    "domain authority building",
    "link building company NYC",
    "off-page SEO agency",
    "NYC link building",
    "backlink acquisition services",
    "review management NYC",
    "brand mention optimization",
    "referring domains strategy",
    "anchor text optimization NYC",
    "competitor backlink analysis",
  ],
  openGraph: {
    title: "Off-Page SEO & Link Building NYC",
    description:
      "Off-page SEO and link building for NYC businesses. Backlinks, citations, digital PR, and authority building. 25+ years.",
    url: `${SITE_URL}/services/off-page-seo`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/off-page-seo` },
};

const faqs = [
  {
    q: "What is off-page SEO and why does it matter for NYC businesses?",
    a: "Off-page SEO refers to everything you do outside your own website to improve your search rankings. This includes earning backlinks from other websites, building local citations in business directories, managing online reviews, generating brand mentions, and establishing your business as an authority in your industry. For NYC service businesses, off-page SEO is critical because Google uses these external signals to determine how trustworthy and authoritative your business is. A plumber with 200 high-quality backlinks and consistent citations across 80 directories will almost always outrank a plumber with zero backlinks and inconsistent business listings — even if the second plumber has better on-page SEO. In competitive NYC markets, off-page SEO is often the deciding factor between page one and page five.",
  },
  {
    q: "How many backlinks does my NYC business need to rank on page one?",
    a: "There is no universal number — it depends entirely on your industry, your target keywords, and what your competitors have built. A plumber targeting 'plumber Upper East Side' might need 30 to 50 quality backlinks to reach page one. A personal injury lawyer targeting 'personal injury lawyer NYC' might need 300 to 500. We analyze your specific competitive landscape during our free backlink audit and tell you exactly what it will take. What matters far more than quantity is quality. Ten links from authoritative, relevant websites are worth more than 1,000 links from low-quality directories or link farms. We focus on building the right links, not the most links.",
  },
  {
    q: "How long does link building take to improve rankings?",
    a: "Link building is not an overnight strategy. Most NYC service businesses see measurable ranking improvements from link building within 60 to 120 days. High-authority links from reputable publications or industry-specific websites can move the needle within 30 days. Local citations typically take 4 to 8 weeks to fully propagate across search engines. The compounding effect is where link building becomes powerful — after 6 to 12 months of consistent link acquisition, your domain authority grows to a level where new pages rank faster and with less effort. This is why we treat link building as an ongoing campaign, not a one-time project.",
  },
  {
    q: "What is the difference between white-hat and black-hat link building?",
    a: "White-hat link building earns links through legitimate means — creating valuable content that others want to reference, building genuine relationships with publishers, earning media coverage through digital PR, and listing your business in reputable directories. Black-hat link building tries to manipulate search rankings through purchased links, private blog networks (PBNs), link exchanges, automated link spam, and other tactics that violate Google's guidelines. We exclusively practice white-hat link building. Black-hat tactics might deliver short-term gains, but they inevitably lead to Google penalties that can destroy your rankings and take months to recover from. We have cleaned up link profiles for businesses that hired cheap link building agencies and paid the price. Do it right the first time.",
  },
  {
    q: "What are local citations and why do they matter?",
    a: "Local citations are mentions of your business name, address, and phone number (NAP) on websites other than your own — directories like Yelp, Google Business Profile, Apple Maps, BBB, industry-specific directories, and local NYC business listings. Citations serve two purposes: they drive direct referral traffic and they signal to search engines that your business is legitimate and geographically relevant. NAP consistency is critical — if your address appears as '150 W 47th St' on one directory and '150 West 47th Street' on another, search engines may treat them as different businesses. We audit and standardize your citations across 80+ directories to ensure perfect consistency.",
  },
  {
    q: "How much do off-page SEO services cost in NYC?",
    a: "Our off-page SEO campaigns start at $3,500 per month as part of our Foundation package, which includes local citation building across 50+ directories, Google Business Profile optimization, review strategy, and basic link acquisition. Our Growth package at $7,500 per month adds aggressive link building with 15+ quality backlinks per month, digital PR outreach, competitor backlink analysis, and brand mention monitoring. Our Domination package at $15,000+ per month includes 30+ links per month, full-scale digital PR campaigns, industry authority building, and toxic link remediation. Hourly consulting for link building strategy starts at $150 per hour.",
  },
  {
    q: "Can bad backlinks hurt my website's rankings?",
    a: "Absolutely. Toxic backlinks — links from spammy websites, link farms, PBNs, or irrelevant foreign-language sites — can trigger manual penalties or algorithmic suppression in Google. If a previous SEO agency built cheap links for your site, those links could be actively suppressing your rankings right now. We perform a comprehensive toxic backlink audit using Ahrefs, SEMrush, and Google Search Console, identify every harmful link, and submit disavow files to Google. We have helped dozens of NYC businesses recover from link-related penalties, and the ranking improvements after cleanup are often dramatic — some clients see 30 to 50 position jumps within weeks of a successful disavow.",
  },
  {
    q: "What is digital PR and how does it help with SEO?",
    a: "Digital PR is the practice of earning media coverage, press mentions, and high-authority backlinks through newsworthy content, expert commentary, data-driven stories, and journalist outreach. When a reputable publication like the New York Times, Gothamist, or an industry trade publication mentions your business and links to your website, that single link can be worth more than 50 directory listings combined. We create linkable assets — original research, NYC-specific data studies, expert guides, and newsworthy stories — and pitch them to journalists and publishers who cover your industry. Digital PR builds both links and brand authority simultaneously.",
  },
  {
    q: "What is domain authority and how do you increase it?",
    a: "Domain authority (DA) is a metric developed by Moz that predicts how likely a website is to rank in search results on a scale of 1 to 100. While Google does not use DA directly, the factors that increase DA — high-quality backlinks, diverse referring domains, strong content, and clean technical SEO — are the same factors Google uses to rank websites. We increase your domain authority by earning backlinks from high-DA websites, building citations across authoritative directories, creating linkable content that naturally attracts links, and cleaning up any toxic links that drag your score down. Most NYC service businesses start with a DA of 10 to 25. Our goal is to push you above 40, which is typically enough to compete for top positions in local service searches.",
  },
  {
    q: "How do you build backlinks without buying them?",
    a: "We use a multi-channel approach to earn backlinks legitimately. First, we create linkable assets — comprehensive guides, original data, infographics, and tools that publishers and bloggers want to reference. Second, we do digital PR outreach — pitching expert commentary and data-driven stories to journalists covering NYC business and real estate. Third, we pursue strategic guest contributions on industry-relevant websites and local publications. Fourth, we identify unlinked brand mentions — instances where someone mentions your business without linking to you — and request the link. Fifth, we analyze competitor backlinks and pursue the same sources. Sixth, we leverage local partnerships, sponsorships, and community involvement to earn links from NYC-based organizations.",
  },
  {
    q: "What is anchor text and why does it matter for link building?",
    a: "Anchor text is the clickable text in a hyperlink. When another website links to you using the text 'best plumber in Brooklyn,' that anchor text tells Google what your page is about. Anchor text strategy is critical because over-optimization — having too many links with exact-match keyword anchors — looks unnatural to Google and can trigger penalties. We maintain a natural anchor text profile that includes branded anchors ('The NYC SEO'), naked URLs, generic anchors ('click here,' 'learn more'), partial-match anchors, and a carefully controlled percentage of exact-match keyword anchors. This natural distribution signals to Google that your links were earned organically, not manufactured.",
  },
  {
    q: "How do online reviews impact off-page SEO?",
    a: "Online reviews are one of the strongest off-page SEO signals for local businesses. Google considers review quantity, quality, velocity, and diversity when determining local search rankings. A business with 200 Google reviews averaging 4.8 stars will almost always outrank a business with 15 reviews in the local map pack. We build review generation systems that make it easy for satisfied customers to leave reviews on Google, Yelp, and industry-specific platforms. We also implement review management protocols so negative reviews are addressed promptly and professionally. Review signals account for roughly 15% of local pack ranking factors — ignoring them means leaving rankings on the table.",
  },
  {
    q: "What is competitor backlink analysis and how do you use it?",
    a: "Competitor backlink analysis involves examining every website that links to your competitors, identifying which links are driving their rankings, and then pursuing those same link sources for your business. If your competitor has a backlink from a local NYC business directory, we get you listed there too. If they earned a link from a trade publication, we pitch a better story to the same publication. We use Ahrefs and SEMrush to reverse-engineer your top five competitors' entire backlink profiles, identify their strongest links, find gaps in their strategy, and build a link acquisition plan that systematically closes the authority gap. This is one of the fastest ways to level the playing field in competitive NYC markets.",
  },
  {
    q: "Do you offer one-time link building or only monthly retainers?",
    a: "We offer both, but we strongly recommend monthly retainers because link building is most effective as an ongoing campaign. One-time projects work for specific needs — a backlink audit, toxic link cleanup, or initial citation building. But search engines reward consistent, natural link growth over time. A website that earns 10 quality links every month for 12 months will outperform a website that earns 120 links in one month and then stops. Our monthly retainers include ongoing link acquisition, citation management, review monitoring, competitor tracking, and monthly reporting on new referring domains, anchor text distribution, and domain authority growth.",
  },
  {
    q: "How do you report on off-page SEO progress?",
    a: "Every month, you receive a detailed off-page SEO report covering new backlinks acquired (with source URLs and domain authority scores), total referring domains, anchor text distribution, domain authority trend, citation audit status, review velocity, brand mention tracking, and competitor comparison metrics. We also track how off-page improvements correlate with ranking changes for your target keywords. Reports are delivered with a recorded walkthrough so you understand exactly what each metric means and how our link building efforts are translating into ranking improvements and leads.",
  },
  {
    q: "Can you help if my previous SEO agency built spammy backlinks?",
    a: "Yes — toxic link cleanup is one of our core competencies. We see this constantly with NYC businesses that hired cheap offshore SEO agencies. The symptoms are clear: rankings that suddenly dropped, a manual action notification in Google Search Console, or hundreds of backlinks from irrelevant foreign-language sites. We perform a full backlink audit, categorize every link as beneficial, neutral, or toxic, attempt manual removal of the worst offenders, and submit a comprehensive disavow file to Google. Recovery typically takes 4 to 12 weeks after the disavow is processed. We have successfully recovered rankings for businesses that were effectively invisible on Google due to toxic link profiles.",
  },
];

export default function OffPageSEOPage() {
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
    sameAs: ["https://www.consortiumnyc.com", "https://www.fullloopcrm.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "The NYC SEO — Off-Page SEO & Link Building Services",
    url: `${SITE_URL}/services/off-page-seo`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$3,500 - $15,000+/mo",
    description:
      "Premium off-page SEO and link building agency for local service businesses in NYC, NJ, Long Island, and Westchester. Backlink acquisition, local citations, digital PR, review management, brand mentions, and domain authority growth.",
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
    name: "Off-Page SEO & Link Building Services",
    description:
      "Comprehensive off-page SEO services including backlink acquisition, local citation building, digital PR, review management, brand mention optimization, competitor backlink analysis, anchor text strategy, and toxic link disavow for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/off-page-seo`,
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
      name: "Off-Page SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Backlink Acquisition & Outreach" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local Citation Building" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Digital PR & Media Outreach" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Review Management & Generation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Brand Mention Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Competitor Backlink Analysis" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Anchor Text Strategy" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Toxic Link Audit & Disavow" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Domain Authority Building" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Referring Domain Diversification" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our Off-Page SEO & Link Building Process Works",
    description: "Our proven 6-step off-page SEO process for building domain authority, earning high-quality backlinks, and growing organic visibility for NYC service businesses.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Backlink Audit & Competitive Analysis",
        text: "We audit your entire backlink profile — every referring domain, every anchor text, every toxic link. We analyze your top competitors' backlink profiles to identify exactly which links are driving their rankings and where the gaps are in your off-page strategy.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Off-Page Strategy & Link Prospecting",
        text: "We build a prioritized link acquisition roadmap based on your competitive gaps, industry vertical, and service areas. We identify high-value link prospects including local NYC publications, industry directories, trade associations, and digital PR opportunities.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Citation Building & NAP Standardization",
        text: "We audit and standardize your business name, address, and phone number across 80+ directories. We build new citations on high-authority platforms, correct inconsistencies, and remove duplicate listings that confuse search engines.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Backlink Acquisition & Digital PR",
        text: "We execute multi-channel link acquisition through digital PR outreach, guest content placements, linkable asset creation, unlinked brand mention reclamation, and strategic relationship building with NYC-area publishers and industry authorities.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Review Management & Brand Mentions",
        text: "We implement review generation systems, monitor and respond to reviews across platforms, track brand mentions across the web, and convert unlinked mentions into backlinks. We build your online reputation as a core component of off-page authority.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Monitoring, Reporting & Continuous Growth",
        text: "We track new referring domains, domain authority trends, anchor text distribution, citation accuracy, review velocity, and the correlation between off-page improvements and ranking changes. Every month, we refine our approach and scale what works.",
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
      name: "The NYC SEO — Off-Page SEO & Link Building Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Michael T." },
    reviewBody:
      "Our domain authority went from 12 to 38 in eight months. The NYC SEO earned us backlinks from publications we never thought possible — local news sites, industry trade magazines, even a mention in a NY Post small business feature. Our organic traffic tripled and the leads coming in are significantly higher quality than anything we got from paid ads. Best investment we have made in our business.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Off-Page SEO & Link Building", url: "/services/off-page-seo" },
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
                NYC Link Building Agency &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Off-Page SEO &amp; Link Building
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  That Builds Real Authority
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Premium off-page SEO and link building for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
                in New York City, New Jersey, Long Island, and Westchester. Backlink acquisition, local citations, digital PR, review management, brand mentions, and domain authority growth — all earned through white-hat strategies that Google rewards. We do not buy links. We do not use PBNs. We do not take shortcuts. We build the kind of off-page authority that makes your competitors wonder what happened. Every link we earn is from a real website, run by real people, with real editorial standards. That is why our clients&apos; rankings stick — and why their competitors&apos; rankings built on cheap links eventually collapse.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "High-authority backlink acquisition & outreach",
                "Local citation building across 80+ directories",
                "Digital PR & media placements in NYC publications",
                "Review management & generation strategy",
                "Brand mention monitoring & link reclamation",
                "Competitor backlink analysis & gap identification",
                "Toxic link audit & Google disavow filing",
                "Monthly reporting on referring domains & DA growth",
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
          SECTION 2: WHAT IS OFF-PAGE SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is Off-Page SEO and Why Does Your NYC Business Need It?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Off-page SEO is everything that happens outside your website to improve your search engine rankings. While{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
              optimizes the content and structure of your site, off-page SEO builds the external signals — backlinks, citations, reviews, brand mentions, and social proof — that tell Google your business is trustworthy, authoritative, and relevant. Think of on-page SEO as building a great restaurant. Off-page SEO is getting Michelin stars, rave reviews in the New York Times, and word-of-mouth from every neighborhood in the city. Both matter, but without off-page authority, even a perfectly optimized website can struggle to rank in competitive NYC markets.
            </p>
            <p>
              The core of off-page SEO is link building — the process of earning hyperlinks from other websites back to yours. Each quality backlink acts as a vote of confidence. When the Brooklyn Chamber of Commerce links to your{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbing business</Link>, or when a NYC real estate blog references your{" "}
              <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">general contracting</Link>{" "}
              expertise, Google interprets those links as endorsements. The more high-quality endorsements you earn, the higher Google ranks you. But quality is paramount — a single link from the New York Times is worth more than 10,000 links from random blog comment spam. Google&apos;s algorithms have become extraordinarily sophisticated at distinguishing earned links from manufactured ones, and the penalty for getting caught with unnatural links can be devastating.
            </p>
            <p>
              Beyond link building, off-page SEO encompasses local citation management — ensuring your business name, address, and phone number appear consistently across directories like Google Business Profile, Yelp, Apple Maps, and dozens of industry-specific platforms. It includes digital PR — earning media coverage and high-authority mentions through newsworthy content and journalist relationships. It includes review management — building and maintaining a strong review profile that influences both rankings and customer trust. And it includes brand mention optimization — tracking every time someone mentions your business online and converting those mentions into links and authority signals.
            </p>
            <p>
              For NYC service businesses — <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/hvac" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC companies</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>{" "}
              — the competition for local search visibility is fierce. There are thousands of businesses fighting for the same keywords in the same neighborhoods. The businesses that invest in systematic, white-hat off-page SEO are the ones that break through the noise. The ones that ignore off-page SEO, or worse, cut corners with cheap link schemes, inevitably find themselves stuck on page two — or penalized by Google entirely. We have been building off-page authority for NYC businesses for over 20 years. We know exactly what works, what does not, and what will get you in trouble.
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
            Our 6-Step Off-Page SEO &amp; Link Building Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every off-page campaign follows this proven framework — adapted to your industry, competition level, and the specific authority gaps holding your rankings back.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Backlink Audit & Competitive Analysis",
                body: "Before we build a single link, we need to understand where you stand. We pull your complete backlink profile from Ahrefs and SEMrush — every referring domain, every anchor text, every link quality score. We identify toxic links that could be suppressing your rankings and flag them for disavow. Then we reverse-engineer your top five competitors' backlink profiles to see exactly where their authority comes from. We map every link source they have that you do not, calculate the authority gap, and prioritize the opportunities that will move the needle fastest. This audit typically reveals 20 to 50 high-value link opportunities that your competitors have and you are missing. That competitive intelligence becomes the foundation of your entire off-page strategy.",
              },
              {
                step: "02",
                title: "Off-Page Strategy & Link Prospecting",
                body: "With the audit data in hand, we build a prioritized link acquisition roadmap. We categorize prospects by link type — editorial placements, local directories, industry associations, digital PR targets, guest content opportunities, and resource page links. We assign authority scores and difficulty ratings to each prospect. We plan anchor text distribution to maintain a natural profile — roughly 40% branded, 20% naked URL, 15% generic, 15% partial-match, and 10% exact-match keyword anchors. We set monthly link velocity targets based on what your competitive landscape demands. The strategy document becomes your off-page SEO playbook for the next 6 to 12 months, with clear milestones and measurable targets at every stage.",
              },
              {
                step: "03",
                title: "Citation Building & NAP Standardization",
                body: "We audit your existing business listings across 80+ directories — Google Business Profile, Yelp, Apple Maps, Bing Places, BBB, Foursquare, Yellow Pages, Citysearch, Superpages, and dozens of industry-specific platforms relevant to your vertical. We identify inconsistencies in your name, address, and phone number (NAP) and correct every single one. We build new citations on high-authority directories you are missing. We suppress duplicate listings that confuse search engines. For NYC businesses, we also target hyper-local directories — borough-specific business associations, neighborhood blogs, local chambers of commerce, and NYC-focused platforms like Brownstoner, The Infatuation, and TimeOut New York. Citation consistency is the foundation of local search authority — without it, link building delivers diminished returns.",
              },
              {
                step: "04",
                title: "Backlink Acquisition & Digital PR Execution",
                body: "This is where the real work happens. We execute link acquisition across multiple channels simultaneously. We create linkable assets — original NYC-specific data studies, comprehensive industry guides, interactive tools, and expert resources that publishers and bloggers want to reference. We pitch digital PR stories to local NYC media, trade publications, and industry blogs. We build relationships with journalists who cover your vertical. We identify unlinked brand mentions — instances where someone mentions your business without linking to you — and reclaim those as backlinks. We pursue strategic guest content placements on high-authority, editorially reviewed websites. Every link we build comes from a real website with genuine traffic and editorial standards. We never use PBNs, link farms, paid link schemes, or any tactic that puts your site at risk.",
              },
              {
                step: "05",
                title: "Review Management & Brand Authority Building",
                body: "Reviews are one of the most powerful off-page signals for local businesses, and most NYC businesses are not managing them strategically. We implement automated review request systems that make it effortless for satisfied customers to leave reviews on Google, Yelp, and industry-specific platforms. We build review response protocols so every review — positive and negative — gets a professional, timely response. We monitor brand mentions across the web using tools like Brand24 and Google Alerts, tracking every instance where your business is mentioned in forums, social media, blog posts, and news articles. We convert unlinked mentions into backlinks and address any negative mentions proactively. Over time, this systematic approach to review management and brand monitoring builds an online reputation that reinforces your search authority from every angle.",
              },
              {
                step: "06",
                title: "Monitoring, Reporting & Continuous Growth",
                body: "Off-page SEO is never done. We track new referring domains weekly, monitor domain authority trends monthly, audit anchor text distribution quarterly, and verify citation accuracy on an ongoing basis. We watch for new toxic backlinks that appear organically and disavow them before they cause damage. We monitor competitor link building activity so we can respond to their moves. Every month, you receive a comprehensive report covering new backlinks earned (with URLs and DA scores), total referring domains, domain authority trend, citation health score, review velocity, brand mention volume, and the correlation between off-page improvements and your keyword ranking changes. We refine the strategy based on what the data tells us, double down on link sources that deliver results, and continuously find new opportunities to grow your authority.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our Off-Page SEO Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is part of our off-page SEO campaigns. Transparent scope. No hidden fees. No vanity metrics.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Backlink Acquisition",
                items: ["Editorial link placements on high-DA sites", "Guest content on industry publications", "Resource page link building", "Broken link reclamation campaigns", "Unlinked brand mention outreach", "HARO & journalist query responses"],
              },
              {
                title: "Local Citations",
                items: ["NAP audit & standardization (80+ directories)", "New citation building on missing platforms", "Duplicate listing suppression", "Industry-specific directory submissions", "NYC local directory listings", "Ongoing citation monitoring & correction"],
              },
              {
                title: "Digital PR",
                items: ["Linkable asset creation (guides, data, tools)", "NYC media outreach & journalist pitching", "Expert commentary placement", "Press release distribution (when warranted)", "Newsjacking & trending topic coverage", "Industry trade publication outreach"],
              },
              {
                title: "Review Management",
                items: ["Automated review request system setup", "Google & Yelp review generation strategy", "Review response protocol & templates", "Negative review management & mitigation", "Review velocity tracking & optimization", "Industry-specific review platform targeting"],
              },
              {
                title: "Competitive Intelligence",
                items: ["Competitor backlink profile analysis", "Link gap identification & prioritization", "Competitor link velocity monitoring", "New competitor link source alerts", "Anchor text distribution benchmarking", "Domain authority comparison tracking"],
              },
              {
                title: "Reporting & Analytics",
                items: ["Monthly new backlink report with DA scores", "Referring domain growth tracking", "Domain authority trend analysis", "Anchor text distribution monitoring", "Citation accuracy audit reports", "Toxic link monitoring & disavow management"],
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who Our Off-Page SEO Services Are For</h2>
          <p className="mt-4 text-zinc-400">
            We build off-page authority for local service businesses that compete on search visibility. If you need more backlinks, better citations, and stronger domain authority to outrank your NYC competitors, this is for you.
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
            in the NYC metro area. Every industry has different off-page requirements — a{" "}
            <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury lawyer</Link>{" "}
            needs different link sources than a{" "}
            <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link>. We tailor every campaign to your specific vertical and competitive landscape.
          </p>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 7: OFF-PAGE SEO vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Earned Links vs. Link Building Shortcuts</h2>
          <p className="mt-4 text-zinc-400">
            Not all link building is created equal. Here is how our approach compares to the tactics that cheap SEO agencies use — and why the difference determines whether your rankings grow or collapse.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Earned Editorial Links vs. Buying Links</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Buying links is the most common shortcut in the SEO industry — and the most dangerous. Cheap agencies will sell you &ldquo;50 backlinks for $500&rdquo; from websites that exist solely to sell links. Google&apos;s algorithms are specifically designed to detect purchased links, and the penalty can remove your site from search results entirely. We earn editorial links through content quality, journalist relationships, and genuine value. When the Brooklyn Eagle links to your contracting business because we pitched a compelling story about NYC renovation trends, that is a link Google rewards. When you buy a link from a random blog that links to 500 other businesses, that is a link Google punishes. The cost difference is significant — earned links require more time and expertise — but the ROI difference is orders of magnitude higher.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Real Outreach vs. Private Blog Networks (PBNs)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Private blog networks are collections of websites owned by a single entity, created specifically to manipulate search rankings through interlinked backlinks. In the early 2010s, PBNs worked. Today, Google identifies and devalues PBN links with frightening accuracy. When a PBN gets flagged — and they all eventually do — every site it links to takes a ranking hit. We have cleaned up the aftermath for multiple NYC businesses that hired PBN-based link builders. The recovery process takes months and costs far more than doing it right from the beginning. Our outreach targets real websites with real audiences, real editorial standards, and genuine domain authority. Every link we build can withstand any algorithm update because it was earned legitimately.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Strategic Citation Building vs. Mass Directory Submissions</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Some agencies blast your business information to 500 directories at once, many of which are low-quality or irrelevant. The result is inconsistent NAP data, duplicate listings, and citations on directories that Google does not trust. Our approach is surgical. We identify the 80 to 100 directories that matter for your industry and geography — the directories Google actually checks when verifying local business information. We ensure perfect NAP consistency across every one. We target NYC-specific directories, industry-specific platforms, and the high-authority general directories that carry the most weight. Quality and accuracy beat quantity every time.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Systematic Review Strategy vs. Fake Reviews</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Buying fake reviews is a growing problem — and Google, Yelp, and the FTC are all cracking down aggressively. Businesses caught with fake reviews face review removal, profile suspension, and in some cases, legal action. We build legitimate review generation systems that make it easy for real customers to share their experience. We implement post-service email and SMS sequences, create QR code review cards, train your staff on when and how to ask for reviews, and build a consistent review velocity that Google interprets as a healthy, active business. Our clients average 40% to 60% more reviews per quarter after we implement our system — all from real customers with real experiences.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Off-Page SEO Results for NYC Service Businesses</h2>
          <p className="mt-4 text-zinc-400">
            Domain authority does not lie. Here is what happens when off-page SEO is done right — with patience, strategy, and zero shortcuts.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "340%", label: "Average Increase in Referring Domains" },
              { stat: "28+", label: "Average DA Increase (12 Months)" },
              { stat: "80+", label: "Directories per Citation Campaign" },
              { stat: "15-30", label: "Quality Backlinks Earned Monthly" },
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
              &ldquo;Our domain authority went from 12 to 38 in eight months. The NYC SEO earned us backlinks from publications we never thought possible — local news sites, industry trade magazines, even a mention in a NY Post small business feature. Our organic traffic tripled and the leads coming in are significantly higher quality than anything we got from paid ads. We were skeptical about link building after a bad experience with our last agency, but these guys do it completely differently. Every link is real. Every report shows exactly where the links came from and why they matter.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Michael T., HVAC Company Owner, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We had a previous agency that built 400 backlinks for us in two months. Sounds great, right? Our rankings tanked. Turns out they were all from junk sites. The NYC SEO cleaned up our toxic backlink profile, submitted the disavow, and within 6 weeks our rankings started recovering. Then they built real links — 12 to 15 per month from legitimate sources. Within a year we were ranking higher than we ever had before, and the traffic converts because people are finding us through trusted channels. If you have been burned by cheap link building, these are the people who fix it.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Sarah L., Personal Injury Attorney, Manhattan</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Link Building Mistakes NYC Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Buying cheap backlinks from overseas link farms",
                fix: "Purchased links from link farms are the fastest way to a Google penalty. We have seen NYC businesses lose 80% of their organic traffic overnight because their agency bought $200 worth of links from a link farm. We earn every link through genuine outreach, quality content, and editorial relationships. Every link we build comes from a website you would be proud to be associated with.",
              },
              {
                mistake: "Using private blog networks (PBNs) for link building",
                fix: "PBNs are networks of fake websites designed to pass link juice. Google has become devastatingly effective at identifying and devaluing PBN links. When the network is discovered — and it always is — every business linked from it takes a hit. We build links exclusively from real websites with real traffic, real editorial standards, and real domain authority that will never be devalued.",
              },
              {
                mistake: "Over-optimizing anchor text with exact-match keywords",
                fix: "If 60% of your backlinks use the anchor text 'best plumber NYC,' Google knows those links were manufactured. Natural backlink profiles have diverse anchor text — branded terms, naked URLs, generic phrases, and a small percentage of keyword-rich anchors. We maintain a natural anchor text distribution that mirrors what an organically popular website would have.",
              },
              {
                mistake: "Ignoring local citations or allowing NAP inconsistencies",
                fix: "If Google finds your business listed as 'ABC Plumbing LLC' at '150 W 47th St' on one directory and 'ABC Plumbing' at '150 West 47th Street' on another, it may treat them as separate businesses — diluting your authority. We audit and standardize your NAP across 80+ directories so every listing reinforces the same consistent signal.",
              },
              {
                mistake: "Never checking for or disavowing toxic backlinks",
                fix: "Toxic backlinks accumulate over time — from spam attacks, scraper sites, negative SEO, or previous agencies. Left unchecked, they drag your domain authority down and can trigger algorithmic penalties. We perform quarterly toxic link audits and submit updated disavow files to Google, keeping your backlink profile clean and your authority growing.",
              },
              {
                mistake: "Building links only to the homepage",
                fix: "Your homepage is not the only page that needs authority. Service pages, location pages, and blog content all benefit from targeted backlinks. We build deep links to the specific pages targeting your highest-value keywords — a link to your 'emergency plumber Brooklyn' page directly boosts that page's ability to rank for that exact query.",
              },
              {
                mistake: "Ignoring review signals as an off-page ranking factor",
                fix: "Reviews account for roughly 15% of local pack ranking factors. A business with 200 Google reviews averaging 4.8 stars dominates the map pack. We implement automated review generation systems, build response protocols, and track review velocity as a core KPI of our off-page campaigns.",
              },
              {
                mistake: "Not tracking competitor backlink activity",
                fix: "Your competitors are building links too. If they earn a link from a high-authority NYC publication and you do not, the authority gap widens. We monitor your top five competitors' backlink profiles continuously, alert you to new link sources they acquire, and pursue those same opportunities for your business.",
              },
              {
                mistake: "Treating link building as a one-time project instead of an ongoing campaign",
                fix: "Building 50 links in one month and then stopping looks unnatural to Google — and your competitors will eventually overtake you. Consistent, steady link acquisition signals to search engines that your business is actively growing in authority. We build links every single month at a natural velocity that Google rewards.",
              },
              {
                mistake: "Not leveraging digital PR and newsworthy content for links",
                fix: "The highest-authority backlinks come from earned media coverage. Most service businesses never pursue digital PR because they do not think they are 'newsworthy.' We create stories that are — NYC-specific data studies, expert commentary on industry trends, community involvement features, and seasonal service guides that journalists actually want to cover. One digital PR placement can earn a DA 70+ backlink that would be impossible to get through any other channel.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">Off-Page SEO &amp; Link Building Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into real link acquisition, citation building, and authority growth — not inflated reports about links that do not move the needle. 20+ years of results behind every campaign.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses building their off-page foundation in one borough or region.",
                features: [
                  "Full backlink audit & toxic link cleanup",
                  "Local citation building (50+ directories)",
                  "NAP standardization & monitoring",
                  "Google Business Profile optimization",
                  "Review generation strategy & setup",
                  "5-8 quality backlinks per month",
                  "Competitor backlink analysis (top 3)",
                  "Monthly off-page SEO report",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-service businesses aggressively building authority across multiple boroughs or the full NYC metro.",
                features: [
                  "Everything in Foundation, plus:",
                  "15+ quality backlinks per month",
                  "Digital PR outreach & media placements",
                  "Linkable asset creation (monthly)",
                  "Competitor monitoring (top 5 competitors)",
                  "Brand mention tracking & link reclamation",
                  "Anchor text optimization & diversification",
                  "Bi-weekly strategy calls",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want to own the authority game in their market — outlink every competitor, dominate every directory.",
                features: [
                  "Everything in Growth, plus:",
                  "30+ quality backlinks per month",
                  "Full-scale digital PR campaigns",
                  "Industry authority & thought leadership",
                  "Custom linkable asset production",
                  "80+ directory citation management",
                  "Dedicated link building strategist",
                  "Weekly strategy calls & reporting",
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
            All plans include a free initial backlink audit. Custom plans available for multi-location businesses.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            including project-based and hourly rates ($150-$500/hr).
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose Us for Off-Page SEO</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of NYC Link Building Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has been building digital authority for New York businesses for over two decades. We have relationships with NYC publishers, journalists, business associations, and industry platforms that take years to develop. Those relationships translate directly into link opportunities that newer agencies simply cannot access. We know the NYC media landscape, the local business directories that matter, and the industry-specific platforms that carry the most authority for every vertical we serve.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">100% White-Hat — Zero Exceptions</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We have never bought a link. We have never used a PBN. We have never used link exchanges, blog comment spam, or any tactic that violates Google&apos;s guidelines. Every single link in our portfolio was earned through quality content, genuine outreach, and editorial merit. This is not a marketing claim — it is a principle we have built our reputation on. Our clients&apos; backlink profiles can withstand any algorithm update because they were built the right way. When Google launches its next link spam update, our clients gain ground while their competitors lose it.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Integrated Off-Page + On-Page + Technical SEO</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Off-page SEO does not exist in a vacuum. A backlink to a page with poor{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
                delivers diminished returns. A citation strategy without proper{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
                optimization is incomplete. We integrate off-page SEO with our{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">full SEO service</Link>{" "}
                — on-page optimization, technical SEO,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                — so every link you earn delivers maximum ranking impact.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full Transparency — Every Link, Every Source</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Many link building agencies refuse to tell you where your links are coming from. That is a red flag. We provide complete transparency — every link we build is reported with the source URL, domain authority score, traffic estimate, anchor text used, and the page it links to on your site. You can verify every link yourself. Our reporting also tracks the ranking impact of our off-page work, correlating new backlinks with keyword position changes so you can see exactly how link building translates into visibility and leads. No black boxes. No mystery links. Just documented, verifiable authority growth.
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
            Off-page SEO delivers the best results when paired with these complementary services. Authority building works hardest when every other element of your digital presence is optimized.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services (Full-Service)", href: "/services/seo", desc: "Comprehensive SEO — on-page, off-page, technical, local, and AI search optimization." },
              { name: "On-Page SEO", href: "/services/on-page-seo", desc: "Optimize the pages your backlinks point to for maximum ranking impact." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Dominate the local map pack alongside your off-page authority." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "Create linkable assets and content that naturally attracts backlinks." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and other AI platforms." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered for speed, SEO, and conversion." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track the full impact of off-page SEO on rankings, traffic, and leads." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic framework that aligns on-page and off-page efforts." },
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
          <h2 className="text-3xl font-bold sm:text-4xl">Off-Page SEO Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We build off-page authority for service businesses across the entire NYC metropolitan area. Our citation building, local link acquisition, and digital PR campaigns are geo-targeted to the neighborhoods and boroughs your business serves.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                region: "Manhattan",
                areas: [
                  { name: "Upper East Side", href: "/plumber/upper-east-side" },
                  { name: "Upper West Side", href: "/electrician/upper-west-side" },
                  { name: "Midtown", href: "/hvac/midtown" },
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
            we cover across the NYC metro area. Our off-page SEO campaigns target the specific boroughs and neighborhoods where your customers search.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Off-Page SEO &amp; Link Building</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about backlink building, citation management, domain authority, and off-page optimization strategy.
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
