import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_DOMAIN } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import EstimateClient from "./EstimateClient";

const estimateFaqs = [
  { question: "How accurate is this cost estimator?", answer: "This tool provides a ballpark range based on typical NYC interior design costs. Actual pricing depends on room complexity, material selections, existing conditions, and project-specific details. For an accurate quote, request a free consultation — we will assess your space and provide a detailed written proposal." },
  { question: "Why is interior design in NYC more expensive than other areas?", answer: "NYC interior design costs are higher due to: limited building access (freight elevators, delivery windows), higher labor costs, co-op/condo board requirements, DOB permit fees, building insurance requirements, and the complexity of working in pre-war and high-rise buildings. Building logistics alone can add 15-30% to costs." },
  { question: "What factors affect interior design cost the most?", answer: "The biggest cost drivers are: (1) room type and scope (kitchen/bathroom renovations cost more than living room refreshes), (2) material and finish selections (custom vs. stock), (3) whether structural or plumbing changes are involved, (4) co-op/condo board requirements, and (5) borough — Manhattan projects typically cost 15-25% more than outer boroughs." },
  { question: "Does the estimate include design fees?", answer: "Design fees are typically separate from materials and installation. Our design fees range from $150-$350/hour or 15-25% of the total project budget, depending on scope. For projects over $25,000, design fees are often included in the overall project cost." },
  { question: "How much does a typical NYC apartment renovation cost?", answer: "A cosmetic refresh (paint, lighting, furniture) runs $15,000-$50,000. A moderate renovation (kitchen, bathroom, some layout changes) runs $75,000-$200,000. A gut renovation of a 2-bedroom apartment typically runs $200,000-$500,000+. Luxury gut renovations in Manhattan can exceed $1M." },
  { question: "Do you offer payment plans?", answer: "We offer phased payment schedules for projects over $25,000. Typical terms: 30% design deposit, 40% at material procurement, 30% on completion. For larger projects, we can arrange customized payment schedules. We accept all major credit cards, checks, and wire transfers." },
];

const estimatorSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NYC Interior Design Cost Estimator",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description: "Free online interior design cost estimator for NYC properties. Get a ballpark range for your project based on room type, complexity, square footage, and borough.",
  url: `${SITE_DOMAIN}/estimate`,
};

export const metadata: Metadata = {
  title: "Free NYC Interior Design Cost Estimator — Get a Price Range (2026)",
  description:
    "Free interior design cost estimator for NYC properties. Enter your project details to instantly see an estimated price range. Covers all boroughs and 18 service types.",
  alternates: { canonical: `${SITE_DOMAIN}/estimate` },
  keywords: [
    "nyc interior design cost",
    "interior design cost estimator",
    "renovation price calculator nyc",
    "kitchen renovation cost nyc",
    "bathroom renovation cost nyc",
    "apartment renovation cost nyc",
  ],
};

export default function EstimatePage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "NYC Interior Design Cost Estimator",
          "Estimate your NYC interior design project cost instantly.",
          `${SITE_DOMAIN}/estimate`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Cost Estimator", url: `${SITE_DOMAIN}/estimate` },
        ])}
      />
      <JsonLd data={estimatorSchema} />
      <JsonLd data={faqSchema(estimateFaqs)} />
      <EstimateClient faqs={estimateFaqs} />
    </>
  );
}
