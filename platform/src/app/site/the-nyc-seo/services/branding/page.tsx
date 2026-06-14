// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "NYC Branding & Brand Identity Services",
  description:
    "NYC branding services for service businesses. Brand identity, logo design, visual systems, messaging, and competitive positioning. Built to rank and convert.",
  keywords: [
    "NYC branding services",
    "brand identity agency New York City",
    "logo design NYC",
    "branding for service businesses",
    "visual identity design NYC",
    "brand strategy New York",
    "brand guidelines NYC",
    "branding agency near me",
    "competitive brand positioning NYC",
    "brand voice development",
    "color psychology branding",
    "typography branding agency",
    "NYC brand consultant",
    "professional branding New York",
    "trust signal design NYC",
  ],
  openGraph: {
    title: "NYC Branding & Brand Identity Services",
    description:
      "Branding for NYC service businesses. Brand identity, logo design, visual systems, messaging, and competitive positioning.",
    url: `${SITE_URL}/services/branding`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/branding` },
};

const faqs = [
  {
    q: "How much does branding cost for a service business in NYC?",
    a: "Our branding projects range from $5,000 to $15,000 depending on scope, complexity, and deliverables. A foundational brand identity package — logo, color palette, typography system, and basic brand guidelines — starts at $5,000. Comprehensive brand identity systems that include brand voice development, competitive positioning strategy, full brand guidelines, collateral design, and digital asset libraries range from $8,000 to $15,000. Every dollar goes into strategy and design — no fluff, no filler. We also offer ongoing branding support as part of our monthly retainer plans starting at $3,500 per month.",
  },
  {
    q: "How long does a branding project take from start to finish?",
    a: "Most branding projects take 4 to 8 weeks from kickoff to final delivery. Discovery and strategy take the first 1 to 2 weeks. Concept development and initial design take 2 to 3 weeks. Revisions and refinement take 1 to 2 weeks. Final asset production and brand guidelines documentation take the final week. Rush timelines are available for an additional fee. We never rush the strategy phase — getting the foundation right is what makes everything else work.",
  },
  {
    q: "What is included in a brand identity package?",
    a: "Our brand identity packages include logo design (primary, secondary, and icon variations), color palette with hex, RGB, and CMYK values, typography system (primary and secondary typefaces), brand guidelines document, business card design, letterhead and envelope design, social media profile templates, email signature design, and a complete digital asset library in all necessary file formats. Comprehensive packages also include brand voice guidelines, messaging framework, tagline development, competitive positioning strategy, and collateral templates.",
  },
  {
    q: "Do I need branding before I build a website?",
    a: "Yes — and this is one of the most common mistakes service businesses make. Building a website without a brand identity is like building a house without blueprints. Your brand defines your colors, typography, voice, imagery style, and positioning. Without these decisions made first, your web designer is guessing. We always recommend completing branding before moving to web design and development. The brand informs every design decision on the website, from the hero section to the footer. Our branding-to-web pipeline ensures seamless continuity from identity to live site.",
  },
  {
    q: "What is the difference between a logo and a brand identity?",
    a: "A logo is one element of your brand identity — it is the mark or symbol that represents your business visually. A brand identity is the complete visual and verbal system that defines how your business looks, sounds, and feels across every touchpoint. This includes your logo, color palette, typography, imagery style, brand voice, messaging framework, positioning statement, and brand guidelines. A logo without a brand identity is like a name without a personality. We build complete brand identities so every customer interaction reinforces who you are and what you stand for.",
  },
  {
    q: "Can you rebrand an existing service business without losing customers?",
    a: "Absolutely — and we do it regularly. Rebranding does not mean starting over. It means evolving your visual identity and positioning to better reflect where your business is today and where it is going. We approach rebrands strategically, often retaining recognizable elements while modernizing the overall system. We plan the rollout across all touchpoints — website, Google Business Profile, social media, signage, vehicles, uniforms — so the transition feels intentional and cohesive, not abrupt. Most of our rebrand clients see increased customer confidence and higher conversion rates within 90 days of the rebrand launch.",
  },
  {
    q: "How does branding affect my SEO and search rankings?",
    a: "Branding affects SEO in three critical ways. First, a strong brand increases click-through rates in search results — when your business looks professional and trustworthy, more people click. Higher CTR signals to Google that your result is relevant, which improves rankings. Second, consistent branding across your website, Google Business Profile, local citations, and social profiles builds entity authority — Google trusts businesses with coherent, consistent information. Third, brand recognition drives branded searches — people searching your business name directly — which is one of the strongest ranking signals in Google's algorithm. Branding and SEO are not separate strategies. They amplify each other.",
  },
  {
    q: "Why does branding matter more in NYC than other markets?",
    a: "New York City is the most competitive market in the country for virtually every service category. When a customer searches for a plumber, electrician, or lawyer in NYC, they see dozens of options in seconds. In smaller markets, being adequate is enough. In NYC, you need to be exceptional — or at least look exceptional — to get the click. NYC customers are sophisticated, skeptical, and spoiled for choice. They make snap judgments based on visual quality, perceived professionalism, and brand coherence. A generic logo and inconsistent colors signal amateur. A cohesive brand identity signals established, trustworthy, worth calling. That is the difference between winning and losing in this market.",
  },
  {
    q: "Do you design logos for service businesses specifically?",
    a: "Yes — we specialize in branding for local service businesses. Logo design for a plumber is fundamentally different from logo design for a tech startup or a fashion brand. Service business logos need to communicate trust, professionalism, and reliability. They need to work on a truck wrap at 50 feet, on a business card at arm's length, and as a 32-pixel favicon in a browser tab. They need to reproduce cleanly in one color for embroidery on uniforms. We design logos that work in every context a service business operates in — not just on a Dribbble portfolio.",
  },
  {
    q: "What is brand voice and why does my service business need one?",
    a: "Brand voice is how your business sounds in writing — on your website, in emails, on social media, in proposals, and in advertising. Most service businesses have no defined brand voice, which means their messaging is inconsistent. One page sounds professional, another sounds casual, a third sounds like it was written by a different company entirely. We develop a brand voice framework that defines your tone, vocabulary, personality, and communication principles. This ensures every piece of written content — whether created by you, your team, or your marketing agency — sounds like the same business. Consistency builds trust. Trust generates leads.",
  },
  {
    q: "How do you handle brand guidelines and deliverables?",
    a: "Every branding project concludes with a comprehensive brand guidelines document — typically 20 to 40 pages — that covers logo usage rules, clear space requirements, color specifications, typography hierarchy, imagery guidelines, brand voice principles, and application examples. We deliver all assets in production-ready formats: AI, EPS, SVG, PNG, and PDF for logos; web-optimized versions for digital; CMYK versions for print. Everything is organized in a shared drive with clear naming conventions. The brand guidelines become the rulebook for everyone who touches your brand — your web designer, your printer, your social media manager, your sign maker.",
  },
  {
    q: "What is competitive positioning and how do you develop it?",
    a: "Competitive positioning is the strategic decision about how your business differentiates itself from competitors in the minds of customers. We develop positioning through a rigorous competitive audit — analyzing every competitor in your market, their branding, messaging, pricing, reviews, and online presence. We identify gaps in the market, underserved customer needs, and positioning opportunities. Then we craft a positioning statement that defines your unique value proposition, your target customer, and the specific benefit you deliver better than anyone else. This positioning drives every branding decision — from your tagline to your color palette to the imagery on your website.",
  },
  {
    q: "Can you match my branding across my website, Google Business Profile, and social media?",
    a: "That is exactly what we do. Brand consistency across every digital touchpoint is not optional — it is the entire point of having a brand identity. We design assets specifically for your website, Google Business Profile cover photo and posts, Facebook and Instagram profiles and posts, LinkedIn company page, Yelp business photos, email marketing templates, and any other platform your business uses. We also provide templates so your team can create on-brand social posts and marketing materials without a designer. Every touchpoint reinforces the same brand — same colors, same typography, same voice, same feeling.",
  },
  {
    q: "What makes The NYC SEO different from other branding agencies?",
    a: "Three things. First, we specialize in service businesses — not tech startups, not e-commerce, not fashion brands. We understand what plumbers, lawyers, dentists, and contractors need from a brand because we have been building brands for these businesses for over 20 years. Second, we build brands that work for SEO — our branding decisions are informed by search behavior, click-through psychology, and AI search visibility. Third, we are a full-service agency — branding flows directly into web design, SEO, content marketing, and AI search optimization. There is no handoff to another agency, no lost context, no brand dilution. One team, one vision, one system.",
  },
  {
    q: "Do you offer ongoing brand management after the initial project?",
    a: "Yes. Many of our branding clients transition into ongoing retainer relationships where we manage their brand across all channels. This includes creating new marketing collateral, designing seasonal promotions, updating website graphics, managing brand consistency across new hires and locations, and evolving the brand as the business grows. Ongoing brand management is included in our Foundation, Growth, and Domination monthly plans. The brand you launch today needs to be protected and evolved — we make sure it stays sharp, consistent, and competitive.",
  },
];

export default function BrandingPage() {
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
    name: "The NYC SEO — Branding Services",
    url: `${SITE_URL}/services/branding`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$5,000 - $15,000",
    description:
      "Premium branding agency for local service businesses in NYC, NJ, Long Island, and Westchester. Brand identity, logo design, visual identity systems, brand voice, competitive positioning, color psychology, typography, and comprehensive brand guidelines.",
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
      latitude: "40.7590",
      longitude: "-73.9845",
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
    name: "Branding & Brand Identity Services",
    description:
      "Comprehensive branding services including brand identity design, logo design, visual identity systems, brand voice development, competitive positioning, color psychology, typography systems, trust signal design, and brand guidelines for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/branding`,
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
      name: "Branding Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Brand Identity Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Logo Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Visual Identity Systems" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Brand Voice Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Competitive Positioning Strategy" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Color Psychology & Palette Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Typography Systems" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Brand Guidelines Documentation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Trust Signal Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Brand Collateral Design" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our NYC Branding Process Works",
    description: "Our proven 6-step branding process for building brand identities that win in the most competitive market in the country.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Discovery & Brand Audit",
        text: "We audit your existing brand assets, competitive landscape, customer perceptions, and market positioning. We interview stakeholders, review competitor branding, and identify gaps and opportunities in your market.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Competitive Positioning Strategy",
        text: "We analyze every competitor in your market and identify positioning opportunities. We define your unique value proposition, target customer profile, and the specific differentiation that will set you apart in NYC.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Visual Identity Design",
        text: "We design your logo, color palette, typography system, and visual language. Every element is chosen with intention — color psychology, typographic hierarchy, and visual weight all influence how customers perceive your brand.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Brand Voice & Messaging",
        text: "We develop your brand voice framework, messaging hierarchy, tagline, elevator pitch, and content guidelines. Your brand voice ensures every piece of communication sounds like the same business.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Brand Guidelines & Asset Production",
        text: "We compile everything into a comprehensive brand guidelines document and produce all assets in production-ready formats for web, print, signage, and embroidery. Every file organized, labeled, and ready to use.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Brand Rollout & Integration",
        text: "We implement your brand across your website, Google Business Profile, social media, email templates, and all customer-facing touchpoints. The rollout is coordinated so every platform updates simultaneously.",
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
      name: "The NYC SEO — Branding Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Rachel M." },
    reviewBody:
      "We hired The NYC SEO to rebrand our plumbing company and the difference was immediate. The old logo looked like clip art. The new brand identity made us look like we had been around for decades — which we have. Within two months of launching the new brand across our website and Google Business Profile, our call volume increased by 40%. Customers told us they called because we looked more professional than the other options. That is exactly what branding is supposed to do.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Branding", url: "/services/branding" },
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
                NYC Branding Agency &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Branding That Wins
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  in the Most Competitive Market on Earth
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Your brand is the reason a customer picks you over the three other{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service businesses</Link>{" "}
                that show up in the same Google search result. It is the split-second judgment that happens before they read a single word on your website. In New York City — where every{" "}
                <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link>,{" "}
                <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electrician</Link>,{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyer</Link>, and{" "}
                <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentist</Link>{" "}
                is competing for the same customers — a generic logo and inconsistent colors are not just unprofessional. They are costing you money. We build brand identities that make{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search rankings</Link>{" "}
                convert into phone calls, and phone calls convert into customers who remember your name.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right -- Feature Checklist */}
            <div className="space-y-4">
              {[
                "Brand identity design & strategy",
                "Logo design (primary, secondary & icon)",
                "Color psychology & palette development",
                "Typography systems & hierarchy",
                "Brand voice & messaging framework",
                "Competitive positioning strategy",
                "Trust signal design for search results",
                "Comprehensive brand guidelines (20-40 pages)",
                "Cross-platform brand consistency",
                "SEO-informed branding decisions",
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
          SECTION 2: WHAT IS BRANDING & WHY IT MATTERS IN NYC
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is Branding and Why Does It Matter More in NYC Than Anywhere Else?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Branding is the complete system of visual and verbal elements that define how your business is perceived by customers. It includes your logo, color palette, typography, imagery style, brand voice, messaging framework, competitive positioning, and the guidelines that govern how all of these elements are used across every touchpoint — from your{" "}
              <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website</Link>{" "}
              to your{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
              to the side of your work van.
            </p>
            <p>
              Most service businesses treat branding as an afterthought. They pick a logo from a freelancer on Fiverr, choose colors they personally like, and use whatever font their website template defaulted to. In a small town, that might be fine. In New York City, it is a competitive disadvantage that compounds every single day.
            </p>
            <p>
              Here is why. When a homeowner in{" "}
              <Link href="/plumber/park-slope" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Park Slope</Link>{" "}
              searches &ldquo;plumber near me,&rdquo; Google shows them a map pack with three results, followed by ten organic listings. That is 13 businesses competing for one customer&apos;s attention. The customer does not read every listing carefully. They glance. They scan. They make a snap judgment based on visual quality, perceived professionalism, and brand coherence. The business that looks like a real company gets the click. The one that looks like a side hustle gets scrolled past.
            </p>
            <p>
              NYC is the most competitive service market in the United States. There are over 10,000 licensed plumbers, 8,000 licensed electricians, 180,000 licensed attorneys, and 30,000 dentists in the metropolitan area. Every one of them wants the same customers you do. In a market this saturated, the quality of your work alone is not enough to win — because your potential customers cannot evaluate your work quality from a search result. They can evaluate your brand. And they do, in under three seconds.
            </p>
            <p>
              Consider what happens when a customer searches for an{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electrician</Link>{" "}
              in Manhattan. They see three businesses in the Google Maps pack. One has a clean, professional logo, consistent branding across its photos, and a polished description that immediately communicates what they specialize in. The second has a blurry photo, a name that is hard to read, and a description that sounds like it was copied from a template. The third has no logo at all — just a generic Google pin. The customer does not need to read reviews or compare pricing. They have already made their decision based on visual perception alone. The professionally branded business gets the click, the call, and the job. The other two never had a chance. This scenario plays out thousands of times every day across every service category in New York City.
            </p>
            <p>
              The financial impact of poor branding in NYC is staggering. A{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">well-ranked</Link>{" "}
              service business with weak branding might convert 5% of its search traffic into phone calls. The same business with professional branding typically converts 12% to 18%. For a business generating 2,000 organic visits per month, that is the difference between 100 calls and 300 calls — from the exact same traffic. You do not need more visitors. You need visitors who trust you enough to pick up the phone. That trust starts with your brand. Every element — your logo quality, your color consistency, your messaging clarity, your visual professionalism — either builds trust or erodes it. There is no neutral ground.
            </p>
            <p>
              Branding is not a luxury for NYC service businesses. It is the first filter customers apply when deciding who to call. Every dollar you spend on{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>, and{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
              works harder when it drives traffic to a brand that looks professional, feels trustworthy, and stands out from the competition. Branding is the multiplier that makes everything else in your marketing stack more effective.
            </p>
            <p>
              There is also a compounding effect that most business owners do not consider. A strong brand generates word-of-mouth referrals more effectively because people remember you. When a homeowner in{" "}
              <Link href="/electrician/upper-west-side" className="text-[#5CB8FF] hover:text-[#8DD0FF]">the Upper West Side</Link>{" "}
              has a great experience with an electrician, they want to recommend that electrician to their neighbor. But if the brand is forgettable — a generic name, a forgettable logo, no distinctive visual identity — the referral dies. The homeowner cannot remember the company name. They cannot describe the logo. They cannot find the website. A strong brand is memorable by design. Your company name, your logo mark, your color palette — they stick in the customer&apos;s mind. When that customer recommends you, they can recall your name, describe your brand, and even find your website to send a link. Branding turns satisfied customers into effective ambassadors. In a city where word of mouth travels through building boards, neighborhood Facebook groups, and WhatsApp chats, that memorability translates directly into referral revenue that costs you nothing to acquire.
            </p>
            <p>
              And then there is the pricing dimension. Businesses with strong brands can charge more — and customers pay without hesitation. A service business with a polished, professional brand identity signals premium quality before a word is spoken about pricing. When your brand looks like you are the best in the business, customers expect to pay more, and they accept higher prices as confirmation of quality. A weak brand invites price shopping. Customers assume you are interchangeable with every other option and default to choosing the cheapest one. Strategic branding is not just about getting more customers — it is about getting better customers who value quality, pay on time, and leave five-star reviews on your{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: BRAND IDENTITY DEEP DIVE
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Anatomy of a Winning Brand Identity for Service Businesses
          </h2>
          <p className="mt-4 text-zinc-400">
            A brand identity is not a logo. It is a system. Here is every component we build — and why each one matters for your bottom line.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Logo Design That Works Everywhere",
                body: "Your logo needs to work in more contexts than a tech startup logo ever will. It needs to be legible on a truck wrap at 60 miles per hour, recognizable as a 32-pixel favicon in a browser tab, crisp on a business card, reproducible in single-color embroidery on a uniform, and professional enough to anchor your website hero section. We design three logo variations for every client — a primary logo for full-size applications, a secondary logo for horizontal or vertical constraints, and an icon mark for small-scale and social media use. Every variation is tested across real-world applications before delivery. We do not design logos that look good on a Dribbble portfolio and fall apart on a yard sign.",
              },
              {
                step: "02",
                title: "Color Psychology & Strategic Palette Design",
                body: "Color is the most powerful tool in branding because it bypasses rational thought and triggers emotional responses. Blue communicates trust and reliability — which is why it dominates financial services and healthcare. Green signals growth, health, and environmental responsibility. Red creates urgency and energy. Orange communicates warmth and accessibility. Black and dark grays signal premium quality and sophistication. We do not pick colors because they look nice. We pick colors because they trigger the specific emotional response your target customer needs to feel in order to choose you over a competitor. Every palette we build includes primary, secondary, and accent colors with hex values for web, RGB for digital, CMYK for print, and Pantone matches for exact reproduction. We also test color combinations for accessibility compliance (WCAG 2.1 AA standards) and contrast ratios to ensure your brand is readable for every customer.",
              },
              {
                step: "03",
                title: "Typography Systems & Visual Hierarchy",
                body: "Typography is the voice of your brand before anyone reads a word. A serif font communicates tradition, authority, and established credibility — ideal for law firms, medical practices, and financial advisors. A sans-serif font communicates modernity, clarity, and approachability — strong for contractors, cleaning services, and tech-forward businesses. We select a primary typeface for headings and a secondary typeface for body text, then define a complete typographic hierarchy — H1 through H4 heading sizes, body text size, caption size, button text size, and line heights. This hierarchy is not arbitrary. It is designed to guide the reader's eye through your content in the exact order that maximizes the chance they pick up the phone. Typography directly impacts readability, perceived professionalism, and time-on-page — all of which affect your search rankings and conversion rates.",
              },
              {
                step: "04",
                title: "Brand Voice & Messaging Framework",
                body: "Your brand voice is how your business sounds in writing — on your website, in emails, in proposals, on social media, and in advertising. Most service businesses have no defined brand voice, which means their messaging is inconsistent. One page on the website sounds formal, the next sounds casual, the about page reads like it was written by a completely different company. We develop a brand voice framework that defines four dimensions: tone (professional vs. casual), personality (authoritative vs. friendly), vocabulary (technical vs. plain language), and communication principles (what you always say, what you never say). We also create a messaging hierarchy — your brand positioning statement, your tagline, your elevator pitch, your service descriptions, and your proof points. This framework ensures every piece of content your business produces sounds like the same company — whether it is written by you, your office manager, or your marketing agency.",
              },
              {
                step: "05",
                title: "Competitive Positioning & Differentiation",
                body: "Positioning is the strategic decision about what space your brand occupies in the customer's mind relative to your competitors. It is not about being better — it is about being different in a way that matters. We develop positioning through a rigorous competitive audit. We analyze every significant competitor in your market — their branding, messaging, pricing, reviews, website quality, and online presence. We identify gaps in the market where no competitor has staked a clear position. We find underserved customer needs that competitors are ignoring. Then we craft a positioning strategy that defines exactly what makes your business the obvious choice for a specific type of customer. Positioning answers the question every customer asks: why should I choose you instead of the other options? If your brand cannot answer that question clearly and instantly, you lose to the competitor whose brand can.",
              },
              {
                step: "06",
                title: "Trust Signal Design for Search & AI",
                body: "Trust signals are the visual and verbal cues that tell customers your business is legitimate, established, and safe to hire. In search results, trust signals include your logo quality, your review stars, your business description, and the overall visual coherence of your listing. On your website, trust signals include professional imagery, consistent branding, clear contact information, visible certifications, insurance badges, and social proof. In AI search platforms like ChatGPT, Perplexity, and Gemini, trust signals are embedded in your structured data — your schema markup, your consistent NAP (name, address, phone) information across the web, and the clarity of your entity associations. We design trust signals for all three contexts — traditional search, website conversion, and AI recommendation — because your customers discover you across all three channels.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our Branding Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is produced to production-ready standards. No stock logos. No template designs. No shortcuts.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Logo & Mark Design",
                items: ["Primary logo (full lockup)", "Secondary logo (horizontal/vertical variant)", "Icon mark for small-scale use", "Monochrome versions for print", "Reversed versions for dark backgrounds", "Favicon and app icon versions"],
              },
              {
                title: "Color & Typography",
                items: ["Strategic color palette (hex, RGB, CMYK, Pantone)", "Primary and accent color definitions", "Color psychology documentation", "Primary typeface selection", "Secondary typeface selection", "Complete typographic hierarchy (H1-H4, body, caption)"],
              },
              {
                title: "Brand Voice & Messaging",
                items: ["Brand voice framework (tone, personality, vocabulary)", "Brand positioning statement", "Tagline development", "Elevator pitch script", "Messaging hierarchy", "Content guidelines (what to say, what not to say)"],
              },
              {
                title: "Brand Guidelines",
                items: ["Comprehensive guidelines document (20-40 pages)", "Logo usage rules and clear space", "Color application examples", "Typography usage rules", "Imagery style guidelines", "Brand misuse examples (what not to do)"],
              },
              {
                title: "Digital Assets",
                items: ["Website hero graphics and section backgrounds", "Social media profile and cover templates", "Email signature design", "Google Business Profile visual assets", "Digital ad templates", "Presentation deck template"],
              },
              {
                title: "Print & Collateral",
                items: ["Business card design", "Letterhead and envelope design", "Invoice and proposal templates", "Vehicle wrap design direction", "Signage specifications", "Uniform and embroidery guidelines"],
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who Our Branding Services Are For</h2>
          <p className="mt-4 text-zinc-400">
            We build brands for local service businesses — the companies that live and die by customer trust, word of mouth, and showing up when someone searches for what they do. If any of the following describe you, we are your agency.
          </p>
          <div className="mt-10 space-y-6 text-zinc-300 leading-relaxed">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">New Service Businesses Launching in NYC</h3>
              <p className="mt-3">
                You are starting a{" "}
                <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contracting company</Link>,{" "}
                <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning service</Link>,{" "}
                <Link href="/landscaper" className="text-[#5CB8FF] hover:text-[#8DD0FF]">landscaping business</Link>, or{" "}
                <Link href="/locksmith" className="text-[#5CB8FF] hover:text-[#8DD0FF]">trade service</Link>{" "}
                and you want to launch with a brand that looks like you have been in business for 20 years. You know that first impressions matter in NYC and you do not want to waste your first year looking like an amateur while you figure out your brand on the fly. Starting with a professional brand identity from day one means every marketing dollar you spend — on{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content</Link>, or{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
                — works harder from the start.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Established Businesses Ready to Level Up</h3>
              <p className="mt-3">
                You have been running your business for 5, 10, or 20 years. You are great at what you do but your brand still looks like it was designed in 2005 — because it was. Your logo is pixelated, your colors are inconsistent across your website and your truck, and your brand voice changes depending on who writes the email. A rebrand does not erase your reputation. It amplifies it. We take your established credibility and give it a visual identity that matches the quality of your work. Most of our rebrand clients see measurable increases in conversion rates within 90 days because customers finally perceive them the way they deserve to be perceived.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Multi-Location Businesses Needing Brand Consistency</h3>
              <p className="mt-3">
                You have multiple locations, multiple trucks, multiple crews — and your brand looks different at every touchpoint. Your Manhattan location uses one shade of blue, your Brooklyn office uses another, and your Westchester team prints business cards with a slightly different logo. This inconsistency erodes trust. We create a unified brand system with strict guidelines that ensure every location, every vehicle, every uniform, every webpage, and every{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
                reinforces the same professional identity.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Businesses Investing in SEO or a New Website</h3>
              <p className="mt-3">
                You are about to spend $5,000 to $15,000 or more on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web design and development</Link>{" "}
                or an ongoing{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO campaign</Link>. Building a website without a defined brand is like painting a house before fixing the foundation. The website is where your brand comes to life — if your brand is not defined first, your designer is making brand decisions for you, and those decisions may not serve your business strategically. Brand first, then website, then SEO. That is the order that works.
              </p>
            </div>
          </div>
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
          SECTION 6: OUR BRANDING PROCESS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our 6-Step Branding Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every branding engagement follows the same proven framework — adapted to your industry, your competitive landscape, and your business goals. This is not a template. It is a strategic process that produces a brand built to win in your specific market.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Discovery & Brand Audit",
                body: "We start by understanding everything about your business, your customers, and your competitive landscape. If you have existing brand assets, we audit them for consistency, quality, and strategic alignment. We interview key stakeholders to understand your values, your goals, and how you want customers to perceive you. We analyze your online reviews to understand what customers already say about you — because your brand should amplify your genuine strengths, not fabricate new ones. We also audit your top competitors' branding to identify patterns, gaps, and opportunities. This phase typically takes 1 to 2 weeks and involves 3 to 5 hours of direct collaboration with your team. The output is a brand brief that becomes the strategic foundation for everything we design.",
              },
              {
                step: "02",
                title: "Competitive Positioning & Strategy",
                body: "With the brand brief in hand, we develop your competitive positioning strategy. We map every significant competitor in your market on a positioning matrix — plotting them by price point, perceived quality, brand sophistication, and market positioning. We identify the white space — the positions no competitor has claimed. Then we define your unique positioning: the specific combination of attributes that makes you the obvious choice for your ideal customer. This is not vague differentiation language like 'we provide quality service.' This is a precise strategic position: 'the premium plumbing company for pre-war buildings in brownstone Brooklyn' or 'the only HVAC contractor in Queens that offers same-day emergency service with upfront flat-rate pricing.' Positioning drives every visual and verbal brand decision that follows.",
              },
              {
                step: "03",
                title: "Visual Identity Design",
                body: "With positioning defined, we design your visual identity. We present 2 to 3 distinct logo concepts, each exploring a different visual direction grounded in your positioning strategy. After selecting a direction, we refine the chosen concept through 2 rounds of revisions. Simultaneously, we develop your color palette (primary, secondary, and accent colors with complete specifications), typography system (heading and body typefaces with size hierarchy), and supporting visual elements (patterns, textures, icon styles, photography direction). Every visual decision is deliberate — colors chosen for their psychological impact on your target customer, typefaces selected for their personality alignment with your brand voice, and logo forms designed for maximum versatility across every context your service business operates in.",
              },
              {
                step: "04",
                title: "Brand Voice & Messaging Development",
                body: "Visual identity gets you noticed. Brand voice gets you remembered. We develop a comprehensive voice framework that defines how your business communicates in every context — website copy, email responses, social media posts, proposals, invoices, and advertising. We define your tone spectrum (where you fall between formal and casual), your personality traits (3 to 5 adjectives that describe how you sound), your vocabulary rules (technical terms you use, jargon you avoid), and your communication principles (promises you always make, claims you never make). We also create core messaging assets — your positioning statement, tagline, elevator pitch, about us narrative, and service descriptions. These become the copy building blocks for your website, your Google Business Profile, and all future marketing materials.",
              },
              {
                step: "05",
                title: "Brand Guidelines & Asset Production",
                body: "Everything comes together in a comprehensive brand guidelines document — typically 20 to 40 pages — that serves as the operating manual for your brand. The guidelines cover logo usage rules (minimum sizes, clear space, prohibited modifications), color specifications (with exact values for every medium), typography hierarchy (with size, weight, and spacing specifications), imagery guidelines (photography style, illustration direction, icon standards), brand voice principles (with examples of on-brand and off-brand copy), and application examples showing the brand in real-world contexts. We also produce every asset in production-ready formats — AI, EPS, SVG, PNG, and PDF for logos; web-optimized versions for digital; CMYK versions for print; and single-color versions for embroidery and engraving. Everything is organized in a shared asset library with clear naming conventions.",
              },
              {
                step: "06",
                title: "Brand Rollout & Cross-Platform Implementation",
                body: "A brand that lives in a PDF guidelines document is worthless. We implement your brand across every customer-facing touchpoint. Your website gets a visual overhaul (or feeds directly into a full site build if you are pairing branding with our web design service). Your Google Business Profile gets updated cover photos, profile images, and branded posts. Your social media profiles get new profile photos, cover images, and post templates. Your email signatures get standardized. Your business cards, letterheads, and invoices get printed. If you have vehicles, we provide wrap design specifications. If you have uniforms, we provide embroidery specifications. The rollout is coordinated so everything updates within the same window — no awkward period where half your touchpoints look old and half look new.",
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
          SECTION 7: BRANDING & SEO CONNECTION
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">How Branding Directly Impacts Your SEO & Search Rankings</h2>
          <p className="mt-4 text-zinc-400">
            Most agencies treat branding and SEO as separate disciplines. They are not. Your brand is a ranking factor — here is exactly how.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Click-Through Rate in Search Results</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                When your business appears in Google search results, customers see your business name, your meta description, and — in the map pack — your logo and review stars. A professional, recognizable brand gets more clicks than a generic one, even if both occupy the same position on the page. Click-through rate (CTR) is a confirmed ranking signal — Google promotes results that users click on and demotes results they skip. A strong brand identity directly increases your CTR, which directly improves your rankings, which generates even more clicks. It is a compounding advantage. The businesses with the strongest brands in your market are getting a ranking boost that has nothing to do with backlinks or content — it is pure brand equity translating into search performance. Our{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
                and branding services work together to maximize this effect.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Entity Authority & Brand Consistency</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Google builds entity profiles for businesses — associating your business name with your address, phone number, website, services, and reviews across the entire web. When your brand is consistent across your website, your{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>, your{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local citations</Link>, your social media profiles, and your{" "}
                <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">backlinks</Link>{" "}
                — Google gains confidence in your entity. Confidence translates to higher rankings. When your brand is inconsistent — different names, different logos, different phone numbers — Google loses confidence and your rankings suffer. Brand consistency is not just a design principle. It is a ranking factor.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Branded Search Volume</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                When customers search for your business by name — &ldquo;Consortium NYC&rdquo; or &ldquo;The NYC SEO&rdquo; — that is a branded search. Branded search volume is one of the strongest signals Google uses to assess business authority and relevance. A strong brand generates more branded searches because people remember your name. More branded searches tell Google your business is legitimate, established, and trusted. This lifts your rankings across all of your keywords, not just your brand name. Investing in branding is investing in a ranking signal that most of your competitors are completely ignoring.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">AI Search Recommendations</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                When someone asks ChatGPT, Perplexity, or Gemini for a{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service provider recommendation</Link>, AI models favor businesses with clear, consistent, well-structured brand information. AI parses your structured data, your website content, your reviews, and your entity associations to determine which businesses to recommend. A business with a coherent brand identity — clear name, consistent descriptions, defined services, and strong entity associations — is significantly more likely to be recommended than a business with fragmented, inconsistent information. Your brand clarity directly impacts your{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Conversion Rate & Bounce Rate</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Branding affects what happens after the click. When a customer lands on a website with professional branding — clean design, consistent colors, clear messaging, trustworthy imagery — they stay longer, explore more pages, and are more likely to call. When they land on a website with inconsistent branding — mismatched colors, generic stock photos, unclear messaging — they bounce. Time on site, pages per session, and bounce rate are all user experience signals that influence rankings. A well-branded website keeps users engaged, which tells Google your site provides a good experience, which lifts your rankings. Branding improves your{" "}
                <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">conversion metrics</Link>{" "}
                and your SEO metrics simultaneously.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7B: COMPETITIVE DIFFERENTIATION THROUGH BRANDING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Competitive Differentiation: How NYC Branding Works Differently</h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              In smaller markets — say, a suburb in Ohio or a mid-size city in the Carolinas — a service business can succeed with a decent logo and a basic website. Competition is manageable. There might be five or ten plumbers serving the area. Customers choose based on proximity, word of mouth, and availability. Branding matters, but it is not the deciding factor.
            </p>
            <p>
              New York City is a fundamentally different beast. There are more licensed service providers per square mile than any other city in the country. A single ZIP code in Brooklyn might have 40 plumbers, 25 electricians, and 15 HVAC contractors all competing for the same homeowners. Manhattan is even more intense — with commercial and residential properties stacked on top of each other, the service density is off the charts. In this environment, being good at your job is table stakes. Every one of your competitors is also good at their job. The differentiator is not skill — it is perception. And perception is branding.
            </p>
            <p>
              NYC customers are also uniquely sophisticated. They are bombarded with marketing messages from the moment they step out their front door — subway ads, storefront signage, digital billboards, sponsored social posts. They have developed a highly tuned filter for quality. They can spot a generic brand in milliseconds. A logo that looks like it came from a template site. Colors that feel random rather than intentional. A website that looks like it was built by a cousin on the weekend. These signals register subconsciously, and they translate directly into lost business.
            </p>
            <p>
              We approach NYC branding differently because we understand this market. We do not build brands that look &ldquo;nice.&rdquo; We build brands that outperform. Every color selection is tested against competitors in your specific market. Every typography choice is evaluated for readability at mobile scale — because 70% of local searches in NYC happen on phones, often while people are walking, riding the subway, or standing in their kitchen dealing with a leaking pipe. Every positioning decision is grounded in a competitive audit that identifies what your competitors are doing and, more importantly, what they are not doing. The goal is not just to look professional. The goal is to be the most compelling option on the page — whether that page is a Google search result, a{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Maps listing</Link>, or an{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search recommendation</Link>.
            </p>
            <p>
              The businesses that dominate in NYC share a common trait: their branding makes the decision easy for the customer. When everything about your visual identity signals &ldquo;established, professional, trustworthy,&rdquo; the customer does not need to comparison-shop. They do not need to read 15 reviews. They do not need to call three companies for quotes. Your brand has already done the selling. By the time they dial your number, they have already decided you are the one. That is the power of strategic branding in the most competitive market on earth.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: BRANDING MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Branding Mistakes NYC Service Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Using a $50 Fiverr logo as their entire brand identity",
                fix: "A logo is not a brand. We build complete brand identity systems — logo, colors, typography, voice, positioning, and guidelines — that work as an integrated system across every customer touchpoint. The difference between a logo and a brand identity is the difference between a name tag and a reputation.",
              },
              {
                mistake: "Choosing colors because the owner personally likes them",
                fix: "Color selection should be strategic, not personal. We use color psychology to select palettes that trigger the emotional responses your target customers need to feel — trust for financial services, urgency for emergency services, warmth for home services. Your favorite color might be purple, but if you are a roofing contractor targeting homeowners who value reliability, blue and dark gray will outperform purple every time.",
              },
              {
                mistake: "Using a different logo on every platform",
                fix: "We see this constantly — one logo on the website, a slightly different one on the Google Business Profile, a cropped version on Facebook, and a completely different one on the truck. Every inconsistency erodes trust. We create a logo system with specific versions for every platform and strict usage guidelines that ensure consistency everywhere.",
              },
              {
                mistake: "No defined brand voice — every page sounds different",
                fix: "Without a brand voice framework, your website copy, social media posts, and customer emails all sound like they come from different companies. We develop a defined voice with tone guidelines, vocabulary rules, and messaging templates that ensure consistency across every communication channel.",
              },
              {
                mistake: "Copying a competitor's brand instead of differentiating",
                fix: "If your brand looks like your competitor's brand, customers have no reason to choose you over them. We develop competitive positioning strategies that identify market gaps and stake a unique position your competitors cannot easily replicate. Differentiation is not optional in NYC — it is survival.",
              },
              {
                mistake: "Ignoring mobile-first brand design in a city where 70%+ of searches are mobile",
                fix: "Your logo, colors, and typography need to work on a 6-inch phone screen before they work anywhere else. We design mobile-first — testing every brand element at mobile scale to ensure it is legible, recognizable, and professional on the device most of your customers use to find you.",
              },
              {
                mistake: "No brand guidelines document — everyone interprets the brand differently",
                fix: "Without guidelines, your printer uses the wrong blue, your web developer picks the wrong font, and your sign maker stretches your logo. We deliver 20-to-40-page brand guidelines with exact specifications for every element — so everyone who touches your brand knows exactly what to do and what not to do.",
              },
              {
                mistake: "Building a website before defining the brand",
                fix: "Your website should be an expression of your brand, not the other way around. When you build a site without a defined brand, the designer makes brand decisions by default — and those decisions may not serve your business strategically. Brand first, then website. Always.",
              },
              {
                mistake: "Treating branding as a one-time project instead of an ongoing system",
                fix: "Your brand needs to evolve as your business grows — new services, new locations, new market conditions. We offer ongoing brand management as part of our retainer plans, ensuring your brand stays current, consistent, and competitive year after year.",
              },
              {
                mistake: "Ignoring how the brand appears in search results and AI recommendations",
                fix: "Your brand lives in search results — your logo in the map pack, your business name in organic listings, your structured data in AI platforms. We design brands with search visibility in mind, ensuring your brand elements work in the contexts where customers actually discover you.",
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
          SECTION 9: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Branding Pricing for NYC Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Branding projects range from $5,000 to $15,000 depending on scope. Ongoing branding support is included in our monthly retainer plans. 20+ years of results behind every brand we build.
            </p>
          </div>

          {/* Project-Based Branding */}
          <div className="mt-12">
            <h3 className="mb-6 text-center text-xl font-semibold text-[#EFF70A]">Project-Based Branding: $5,000 &ndash; $15,000</h3>
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
              {[
                {
                  tier: "Essential Brand",
                  price: "$5,000",
                  period: " project",
                  description: "Foundational brand identity for new or early-stage service businesses.",
                  features: [
                    "Logo design (primary + icon)",
                    "Color palette (primary + accent)",
                    "Typography selection (1 typeface)",
                    "Basic brand guidelines (8-12 pages)",
                    "Business card design",
                    "Social media profile graphics",
                    "Digital asset delivery (all formats)",
                  ],
                  cta: "Get Started",
                },
                {
                  tier: "Professional Brand",
                  price: "$8,500",
                  period: " project",
                  description: "Complete brand identity for established businesses ready to level up.",
                  features: [
                    "Everything in Essential, plus:",
                    "Logo system (primary, secondary, icon)",
                    "Full color palette with psychology docs",
                    "Typography system (2 typefaces + hierarchy)",
                    "Brand voice framework",
                    "Competitive positioning strategy",
                    "Comprehensive guidelines (20-30 pages)",
                    "Letterhead, envelope & invoice design",
                  ],
                  cta: "Get Started",
                  featured: true,
                },
                {
                  tier: "Premium Brand",
                  price: "$12,000 - $15,000",
                  period: " project",
                  description: "Full-spectrum brand identity for businesses that want to dominate their market.",
                  features: [
                    "Everything in Professional, plus:",
                    "Complete messaging framework",
                    "Tagline & elevator pitch development",
                    "Collateral system (10+ templates)",
                    "Vehicle wrap design direction",
                    "Signage & environmental specs",
                    "Brand guidelines (30-40 pages)",
                    "Brand rollout coordination",
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
          </div>

          {/* Monthly Retainer Plans */}
          <div className="mt-16">
            <h3 className="mb-6 text-center text-xl font-semibold text-[#EFF70A]">Monthly Retainer Plans (Branding + SEO + Web)</h3>
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
              {[
                {
                  tier: "Foundation",
                  price: "$3,500",
                  period: "/month",
                  description: "For single-location service businesses building their brand and online presence.",
                  features: [
                    "Brand management & consistency",
                    "SEO campaign (on-page + technical)",
                    "Google Business Profile optimization",
                    "Monthly content creation",
                    "Brand asset updates as needed",
                    "Monthly reporting",
                  ],
                  cta: "Get Started",
                },
                {
                  tier: "Growth",
                  price: "$7,500",
                  period: "/month",
                  description: "For multi-service businesses scaling across boroughs and suburbs.",
                  features: [
                    "Everything in Foundation, plus:",
                    "Programmatic page generation",
                    "Off-page link building",
                    "AI search optimization",
                    "Brand collateral production",
                    "Competitor brand monitoring",
                    "Bi-weekly strategy calls",
                  ],
                  cta: "Get Started",
                  featured: true,
                },
                {
                  tier: "Domination",
                  price: "$15,000+",
                  period: "/month",
                  description: "For businesses that want to own their brand and their market completely.",
                  features: [
                    "Everything in Growth, plus:",
                    "Full brand evolution & management",
                    "Unlimited programmatic pages",
                    "Aggressive link building",
                    "Full Next.js site build or migration",
                    "AI agent development",
                    "Dedicated account strategist",
                    "Weekly strategy calls",
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
          </div>

          <p className="mt-8 text-center text-sm text-zinc-500">
            All branding projects include a free initial consultation. Custom scopes available.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            for all services.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: RESULTS / TESTIMONIALS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results from Real NYC Service Businesses</h2>
          <p className="mt-4 text-zinc-400">
            Branding is not abstract. It produces measurable outcomes. Here is what happens when a service business invests in professional brand identity.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "40%", label: "Average Increase in Call Volume Post-Rebrand" },
              { stat: "3x", label: "Higher CTR in Search Results vs. Unbranded Competitors" },
              { stat: "20+", label: "Years of Branding Experience" },
              { stat: "90 Days", label: "Average Time to See Measurable Brand Impact" },
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
              &ldquo;We hired The NYC SEO to rebrand our plumbing company and the difference was immediate. The old logo looked like clip art from 2003. The new brand identity made us look like we had been around for decades — which we have. Within two months of launching the new brand across our website and Google Business Profile, our call volume increased by 40%. Customers literally told us they called because we looked more professional than the other options in the search results. That is exactly what branding is supposed to do.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Rachel M., Plumbing Company Owner, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We had been in business for 15 years with a logo my cousin made in Microsoft Word. The NYC SEO did a full rebrand — logo, colors, voice, the works — and then rolled it out across our website, Google listing, trucks, and uniforms. For the first time, everything looked like it belonged to the same company. Our close rate on estimates went up because customers trusted us before we even walked in the door. Best investment we have made outside of hiring great technicians.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Tony D., HVAC Contractor, Queens</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;As a personal injury attorney, brand perception is everything. Potential clients are evaluating whether they can trust me with their case based on how professional my online presence looks. The NYC SEO rebuilt my brand from scratch — new logo, new color palette, new messaging, new website. The positioning work was especially valuable. They helped me differentiate from the hundreds of PI attorneys competing in Manhattan by focusing on my specific strength: construction accident cases. Within six months, I was ranking for construction accident attorney keywords and my consultation requests tripled. The brand made the SEO work. I could not have gotten these results with my old branding.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— James K., Personal Injury Attorney, Manhattan</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Service Businesses Choose The NYC SEO for Branding</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Branding Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has been building brands for over two decades. We have designed brand identities for service businesses across every industry — from{" "}
                <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbing companies</Link>{" "}
                to{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">law firms</Link>{" "}
                to{" "}
                <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dental practices</Link>. We have seen what works, what does not, and what separates brands that generate leads from brands that sit in a folder and collect dust. That depth of experience means we do not experiment with your brand. We apply proven principles refined across hundreds of projects.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Specialize in Service Businesses — Not Startups, Not E-Commerce</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Branding a service business is fundamentally different from branding a tech startup or an e-commerce brand. Service business brands need to communicate trust, reliability, and professionalism to local customers who are often making urgent decisions. They need to work on a truck at highway speed, not just on a laptop screen. They need to resonate with homeowners, building managers, and HR directors — not venture capitalists. We understand these requirements because service businesses are the only businesses we work with. Our{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170+ service categories</Link>{" "}
                give us unmatched pattern recognition for what works in these markets.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Branding Informed by SEO Data, Not Just Design Trends</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most branding agencies design based on aesthetics. We design based on data. We know which colors drive higher click-through rates in search results for your specific industry. We know which messaging angles generate more phone calls based on{" "}
                <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">conversion data</Link>{" "}
                from hundreds of service business websites. We know how{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                parse and present brand information. Our branding decisions are grounded in search behavior and conversion psychology — not just what looks good in a portfolio presentation.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full-Service Agency — No Handoffs, No Brand Dilution</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                When you hire a standalone branding agency, they hand you a PDF and wish you luck implementing it. Your web developer interprets the brand differently. Your SEO agency ignores it. Your social media manager never saw the guidelines. By the time the brand reaches customers, it has been diluted through three handoffs. With us, branding flows directly into{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web design and development</Link>,{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI optimization</Link>. One team designs the brand and builds the website and runs the SEO. Zero handoffs. Zero dilution. Perfect execution from brand strategy to ranked page.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Modern Tech Stack — Not Templates, Not WordPress Themes</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Your brand deserves a website built to match it. We build on Next.js — deployed on Vercel, backed by Supabase, with{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">automated workflows</Link>{" "}
                powered by Resend and Telnyx, and CRM integration through{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>. This is not a WordPress theme with your logo swapped in. This is a custom-engineered platform where every pixel reflects your brand identity. Sub-1-second load times. Perfect Core Web Vitals. Complete control over every visual and structural element. Your brand is premium — your tech stack should be too.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">NYC-Based — We Understand This Market Personally</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We are not a remote agency guessing about what works in New York City. Our office is at 150 W 47th St, New York, NY 10036 — in the heart of Midtown Manhattan. We walk past the same storefronts, ride the same subways, and live in the same neighborhoods as your customers. We know that a brand that works in{" "}
                <Link href="/plumber/brooklyn-heights" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Brooklyn Heights</Link>{" "}
                needs a different tone than one targeting{" "}
                <Link href="/hvac/astoria" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Astoria</Link>. We understand the visual language of NYC — the typography on subway signage, the color palettes of brownstone neighborhoods, the design sensibility of a city that produced some of the most iconic brands in the world. That local fluency is not something you can fake from a co-working space in Austin or a home office in Boise. It comes from decades of building brands in this city for businesses that serve this city. You can call us at{" "}
                <a href={`tel:${PHONE.replace(/-/g, "")}`} className="text-[#5CB8FF] hover:text-[#8DD0FF]">{PHONE}</a>{" "}
                or email us at{" "}
                <a href="mailto:hi@consortiumnyc.com" className="text-[#5CB8FF] hover:text-[#8DD0FF]">hi@consortiumnyc.com</a>{" "}
                — we respond within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 12: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services That Amplify Your Brand</h2>
          <p className="mt-4 text-zinc-400">
            Branding is the foundation. These services build on that foundation to turn your brand into a lead-generating system.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Your brand becomes a live, ranking Next.js website." },
              { name: "SEO Services", href: "/services/seo", desc: "Drive qualified traffic to your newly branded website." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic plan that guides every optimization decision." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get your brand recommended by ChatGPT, Perplexity, and Gemini." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Your brand identity applied to the local map pack." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "On-brand content that ranks and converts." },
              { name: "Local SEO", href: "/services/local-seo", desc: "Dominate every neighborhood you serve with consistent branding." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Measure the ROI of your branding investment with real data." },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-5 transition-colors hover:border-[#0080FE]"
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
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Branding Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We provide branding services for service businesses across the entire NYC metropolitan area — every borough, every suburb, every neighborhood.
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
            we serve across the NYC metro area.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 14: FAQ
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About NYC Branding Services</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about branding, brand identity, and how it all connects to search performance.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6">
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
      <CTAGroup variant="final" />
    </div>
  );
}
