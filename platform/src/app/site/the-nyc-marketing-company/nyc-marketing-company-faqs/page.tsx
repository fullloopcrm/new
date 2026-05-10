// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import FAQPageClient from "./FAQPageClient";

export const metadata: Metadata = {
  title: "100 Marketing FAQs for NYC Businesses | SEO, Web Design, Pricing",
  description:
    "100 answers to the most common questions about hiring a marketing company in NYC. The best organic marketing company in NYC. SEO pricing, web design costs, local SEO timelines, and more. Pricing starting at $100/hr. Call/text 212.202.9220.",
  alternates: { canonical: "https://www.thenycmarketingcompany.com/nyc-marketing-company-faqs" },
  openGraph: {
    title: "100 Marketing FAQs for NYC Businesses | SEO, Web Design, Pricing",
    description: "100 answers to the most common questions about hiring a marketing company in NYC. Pricing starting at $100/hr. Call/text 212.202.9220.",
    url: "https://www.thenycmarketingcompany.com/nyc-marketing-company-faqs",
    siteName: "The NYC Marketing Company",
    type: "website",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "100 Marketing FAQs for NYC Businesses | SEO, Web Design, Pricing",
    description: "100 answers to the most common questions about hiring a marketing company in NYC. Call/text 212.202.9220.",
  },
  keywords: [
    "NYC marketing company FAQ",
    "how much does SEO cost in NYC",
    "best marketing agency for small business NYC",
    "local SEO questions NYC",
    "web design pricing New York",
    "marketing company Long Island",
    "Westchester marketing agency",
    "Google Business Profile optimization NYC",
    "AI automation for small business",
    "digital marketing FAQ",
  ],
};

const breadcrumbs = [
  { name: "Home", url: "https://www.thenycmarketingcompany.com" },
  { name: "FAQ", url: "https://www.thenycmarketingcompany.com/nyc-marketing-company-faqs" },
];

/* Plain-text versions for structured data (first 50 for schema — Google caps at ~100 anyway) */
const schemaFaqs = [
  { question: "How much does SEO cost for a small business in NYC?", answer: "Monthly SEO for NYC small businesses starts at $950/month with The NYC Marketing Company. The NYC average is $2,000–$5,000/month. Our pricing includes technical SEO, content optimization, local SEO, Google Business Profile management, link building, and monthly reporting." },
  { question: "What is the best marketing company in NYC for local businesses?", answer: "The NYC Marketing Company specializes exclusively in local business marketing across NYC, Long Island, and Westchester. We've generated over $15.2M in attributable revenue for local businesses including plumbers, dentists, restaurants, law firms, HVAC companies, and more." },
  { question: "How long does it take for SEO to work in New York City?", answer: "Most NYC businesses see meaningful organic traffic improvements within 3–6 months. Competitive industries like personal injury law or dentistry in Manhattan may take 6–9 months. Less competitive niches in Staten Island, the Bronx, or Westchester often see faster results." },
  { question: "What is local SEO and why does my NYC business need it?", answer: "Local SEO optimizes your online presence for location-based searches like 'plumber near me' or 'best dentist in Brooklyn.' It includes Google Business Profile optimization, local citations, review management, and geo-targeted content. For NYC businesses, local SEO is critical because customers search by neighborhood." },
  { question: "How much does a custom website cost in New York?", answer: "Custom websites built by The NYC Marketing Company start at $4,600. The NYC average for a custom business website is $12,000–$25,000. Our sites are built on Next.js and React, score 90+ on Core Web Vitals, and are engineered for SEO and conversion from day one." },
  { question: "Do you offer marketing services on Long Island?", answer: "Yes. We serve businesses throughout Nassau County and Suffolk County including Garden City, Great Neck, Huntington, Babylon, Hempstead, Massapequa, Levittown, Hicksville, and more. Every Long Island market gets its own keyword strategy and local SEO plan." },
  { question: "What industries does The NYC Marketing Company work with?", answer: "We've served 100+ industries over 25 years. Our biggest verticals include home services (plumbing, HVAC, electrical, roofing), law firms, dental practices, restaurants, real estate, medical practices, landscaping, and professional services. Our data-driven approach adapts to any industry." },
  { question: "Can you help my business rank on Google Maps in NYC?", answer: "Yes — Google Maps rankings are one of our specialties. We optimize your Google Business Profile, build citations across 80+ directories, manage your reviews, and create hyper-local content for every neighborhood you serve. The map pack is where most local leads come from." },
  { question: "What is Google Business Profile optimization?", answer: "Google Business Profile (formerly Google My Business) optimization includes completing every field, selecting the right categories, adding photos, posting regular updates, managing reviews, building local citations, and optimizing your profile for your target keywords and service areas." },
  { question: "Do you require long-term contracts?", answer: "No. We never lock clients into contracts. Most SEO clients stay 12+ months because results compound over time, not because they're trapped. We earn your business every month. If we're not delivering, you should leave." },
];

export default function FAQPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "100 Marketing FAQs for NYC Businesses | The NYC Marketing Company",
          "100 answers to the most common questions about hiring a marketing company in NYC.",
          "https://www.thenycmarketingcompany.com/nyc-marketing-company-faqs",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(schemaFaqs)} />
      <FAQPageClient />
    </>
  );
}
