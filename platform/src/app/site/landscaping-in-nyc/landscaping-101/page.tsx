// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";
import { SITE_NAME, SITE_DOMAIN } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import Landscaping101Client from "./Landscaping101Client";

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Landscaping 101 — Complete Guide to NYC Landscaping",
  description: "Free comprehensive guide covering every aspect of landscaping in New York City — plant selection, permits, seasonal care, rooftop gardens, hardscaping, and more.",
  provider: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_DOMAIN,
  },
  isAccessibleForFree: true,
  educationalLevel: "Beginner",
  about: ["NYC Landscaping", "Garden Design", "Urban Landscaping", "Rooftop Gardens"],
};

const landscaping101Faqs = [
  { question: "Do I need a landscape architect or a landscape designer?", answer: "For most NYC residential projects — gardens, patios, plantings — a landscape designer is sufficient. You need a licensed landscape architect for structural work like rooftop gardens, retaining walls over 4 feet, grading changes, or projects requiring DOB permits. We have both on staff." },
  { question: "How much does a basic backyard makeover cost in NYC?", answer: "A basic backyard makeover (new plantings, mulch, cleanup, minor hardscaping) runs $5,000-$15,000. A mid-range redesign with a patio, garden beds, and lighting runs $15,000-$40,000. Premium transformations with custom hardscaping, water features, and outdoor kitchens start at $40,000+." },
  { question: "Can I landscape my property myself?", answer: "Small projects like container gardening, annual planting, and basic mulching are great DIY projects. However, hardscaping, drainage work, irrigation installation, tree removal, and rooftop gardens should be done by professionals. NYC code requirements, underground utilities, and structural considerations make professional help essential for larger projects." },
  { question: "What's the ROI on landscaping in NYC?", answer: "Professional landscaping typically returns 100-200% on investment for NYC properties. Curb appeal improvements can increase property value by 5-15%. Well-maintained landscapes also reduce time on market when selling. For commercial properties, quality landscaping increases tenant satisfaction and retention." },
  { question: "How do I prepare my garden for winter in NYC?", answer: "Fall prep includes: cut back perennials after first frost, mulch beds with 3-4 inches of organic mulch, wrap tender shrubs in burlap, drain and shut off irrigation systems, plant spring-blooming bulbs, and remove annual plants. Container plants should be moved indoors or wrapped with insulation." },
  { question: "What are the best low-maintenance plants for NYC?", answer: "Top low-maintenance picks: hostas (shade), daylilies (sun), ornamental grasses (any light), boxwood (evergreen structure), hydrangeas (partial shade), and native sedums for green roofs. These all handle NYC's heat, cold, and variable moisture without constant attention." },
];

export const metadata: Metadata = {
  title: "Landscaping 101 — The Complete NYC Landscaping Guide (2026)",
  description:
    "Landscaping 101: Everything you need to know about landscaping in New York City. Plant selection for zone 7a/7b, permits, rooftop gardens, seasonal care, hardscaping, and expert tips.",
  alternates: { canonical: `${SITE_DOMAIN}/landscaping-101` },
  keywords: [
    "nyc landscaping guide",
    "landscaping 101",
    "nyc garden design",
    "rooftop garden nyc",
    "nyc plants zone 7",
    "landscaping permits nyc",
    "urban landscaping guide",
  ],
};

export default function Landscaping101Page() {
  return (
    <>
      <JsonLd data={webPageSchema("Landscaping 101", "The complete guide to landscaping in NYC.", `${SITE_DOMAIN}/landscaping-101`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "Landscaping 101", url: `${SITE_DOMAIN}/landscaping-101` },
      ])} />
      <JsonLd data={courseSchema} />
      <JsonLd data={faqSchema(landscaping101Faqs)} />
      <Landscaping101Client faqs={landscaping101Faqs} />
    </>
  );
}
