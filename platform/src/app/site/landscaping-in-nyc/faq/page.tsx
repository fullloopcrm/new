import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";
import { SITE_DOMAIN } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { landscapingFAQs } from "@/app/site/landscaping-in-nyc/_lib/landscapingFAQs";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "NYC Landscaping FAQ — Frequently Asked Questions",
  description: "Answers to the most common questions about landscaping in New York City, including costs, permits, seasonal care, rooftop gardens, and maintenance.",
  alternates: { canonical: `${SITE_DOMAIN}/faq` },
};

export default function FAQPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Landscaping FAQ", "Frequently asked questions about landscaping in NYC.", `${SITE_DOMAIN}/faq`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "FAQ", url: `${SITE_DOMAIN}/faq` },
      ])} />
      <JsonLd data={faqSchema(landscapingFAQs)} />
      <FAQClient />
    </>
  );
}
