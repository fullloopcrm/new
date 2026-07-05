import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";
import { SITE_DOMAIN } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import EstimateClient from "./EstimateClient";

const estimateFaqs = [
  { question: "How accurate is this cost estimator?", answer: "This tool provides a ballpark range based on typical NYC landscaping costs. Actual pricing depends on site conditions, access complexity, material choices, and project-specific details. For an accurate quote, request a free on-site estimate — we'll assess your property and provide a detailed written proposal." },
  { question: "Why is NYC landscaping more expensive than other areas?", answer: "NYC landscaping costs are higher due to: limited parking and delivery access (materials often need to be hand-carried), higher labor costs, permit requirements, disposal fees for debris removal, building-specific insurance requirements, and the complexity of working in dense urban environments. Access alone can add 20-40% to costs." },
  { question: "What factors affect landscaping cost the most?", answer: "The biggest cost drivers are: (1) project size and scope, (2) material choices (natural stone vs. pavers vs. concrete), (3) site access difficulty, (4) whether permits are needed, (5) demolition/removal of existing landscape, and (6) borough — Manhattan projects typically cost 15-25% more than outer boroughs due to access challenges." },
  { question: "Does the estimate include design fees?", answer: "For projects over $10,000, we include design consultation in the project cost. For smaller projects, design is straightforward and included. Separate landscape architecture plans (required for rooftop gardens and structural projects) run $2,000-$10,000 depending on complexity." },
  { question: "How much does ongoing maintenance cost?", answer: "Maintenance plans range from $200/month for small gardens to $1,000+/month for large properties. Plans typically include seasonal cleanup, planting, pruning, mowing, watering management, and winter services. Most clients spend 10-15% of their initial installation cost on annual maintenance." },
  { question: "Do you offer financing?", answer: "We offer payment plans for projects over $10,000. Typical terms: 30% deposit, 40% at midpoint, 30% on completion. For larger projects, we can arrange 6-12 month payment schedules. We accept all major credit cards, checks, and ACH transfers." },
];

const estimatorSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NYC Landscaping Cost Estimator",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description: "Free online landscaping cost estimator for NYC properties. Get a ballpark range for your project based on size, service type, borough, and complexity.",
  url: `${SITE_DOMAIN}/estimate`,
};

export const metadata: Metadata = {
  title: "Free NYC Landscaping Cost Estimator — Get a Price Range (2026)",
  description:
    "Free landscaping cost estimator for NYC properties. Enter your project details to instantly see an estimated price range. Covers all boroughs and 18 service types.",
  alternates: { canonical: `${SITE_DOMAIN}/estimate` },
  keywords: [
    "nyc landscaping cost",
    "landscaping cost estimator",
    "landscaping price calculator",
    "nyc garden cost",
    "backyard landscaping cost nyc",
    "rooftop garden cost nyc",
  ],
};

export default function EstimatePage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "NYC Landscaping Cost Estimator",
          "Estimate your NYC landscaping project cost instantly.",
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
