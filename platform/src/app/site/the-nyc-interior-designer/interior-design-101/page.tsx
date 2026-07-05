import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_NAME, SITE_DOMAIN } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import InteriorDesign101Client from "./InteriorDesign101Client";

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Interior Design 101 — Complete Guide to NYC Interior Design",
  description: "Free comprehensive guide covering every aspect of interior design in New York City — understanding your space, working with designers, co-op/condo considerations, material selection, color theory, lighting, budgeting, and more.",
  provider: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_DOMAIN,
  },
  isAccessibleForFree: true,
  educationalLevel: "Beginner",
  about: ["NYC Interior Design", "Home Renovation", "Space Planning", "Color Theory"],
};

const designFaqs = [
  { question: "Do I need an interior designer or can I do it myself?", answer: "Small updates like paint colors, accessories, and furniture rearrangement are great DIY projects. However, for renovations involving layout changes, custom cabinetry, material selection across multiple rooms, or any work requiring permits, a professional designer saves you time, money, and costly mistakes. NYC-specific challenges like co-op board requirements and building logistics make professional help especially valuable." },
  { question: "How much does it cost to hire an interior designer in NYC?", answer: "Interior designers typically charge $150-$350/hour, a flat fee per room ($2,000-$15,000), or a percentage of the total project budget (15-25%). Many designers offer a free initial consultation. For a full apartment redesign, expect to invest $15,000-$75,000+ in design fees depending on scope and complexity." },
  { question: "How long does an interior design project take?", answer: "A single room refresh takes 4-8 weeks. A full apartment redesign takes 3-6 months. A gut renovation takes 6-18 months. Lead times for custom furniture (8-16 weeks) and contractor scheduling are the biggest factors. NYC co-op board approval alone can add 1-3 months to the timeline." },
  { question: "What is the difference between an interior designer and an interior decorator?", answer: "Interior designers handle space planning, construction documents, material specifications, and project management — they can reconfigure layouts, specify custom millwork, and coordinate with architects and contractors. Interior decorators focus on the decorative elements: furniture, color, accessories, and styling. For NYC renovations, you want a designer." },
  { question: "How do I prepare for an interior design consultation?", answer: "Gather inspiration images (Pinterest boards, magazine clippings), know your budget range, list your must-haves and nice-to-haves, understand your timeline, and be honest about how you actually live. Designers need to know your daily routines, storage needs, entertaining habits, and any specific requirements (home office, pet areas, children's needs)." },
  { question: "What are the best interior design styles for NYC apartments?", answer: "Popular NYC styles include: modern/contemporary (clean lines, minimal clutter), transitional (blend of traditional and modern), mid-century modern (vintage-inspired with warmth), industrial (exposed elements, raw materials), and classic pre-war (preserving architectural details). The best style is one that reflects your personality while working with your apartment's architecture." },
];

export const metadata: Metadata = {
  title: "Interior Design 101 — The Complete NYC Interior Design Guide (2026)",
  description:
    "Interior Design 101: Everything you need to know about interior design in New York City. Space planning, working with designers, co-op considerations, materials, color theory, lighting, and budgeting tips.",
  alternates: { canonical: `${SITE_DOMAIN}/interior-design-101` },
  keywords: [
    "nyc interior design guide",
    "interior design 101",
    "nyc apartment design",
    "co-op renovation nyc",
    "interior design tips nyc",
    "apartment renovation guide",
    "nyc design styles",
  ],
};

export default function InteriorDesign101Page() {
  return (
    <>
      <JsonLd data={webPageSchema("Interior Design 101", "The complete guide to interior design in NYC.", `${SITE_DOMAIN}/interior-design-101`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "Interior Design 101", url: `${SITE_DOMAIN}/interior-design-101` },
      ])} />
      <JsonLd data={courseSchema} />
      <JsonLd data={faqSchema(designFaqs)} />
      <InteriorDesign101Client faqs={designFaqs} />
    </>
  );
}
