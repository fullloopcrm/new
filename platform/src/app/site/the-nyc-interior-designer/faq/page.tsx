import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_DOMAIN } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { interiorDesignFAQs } from "@/app/site/the-nyc-interior-designer/_lib/interiorDesignFAQs";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "NYC Interior Design FAQ — Frequently Asked Questions",
  description: "Answers to the most common questions about interior design in New York City, including costs, co-op board approvals, renovation timelines, furniture sourcing, and design process.",
  alternates: { canonical: `${SITE_DOMAIN}/faq` },
};

export default function FAQPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Interior Design FAQ", "Frequently asked questions about interior design in NYC.", `${SITE_DOMAIN}/faq`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "FAQ", url: `${SITE_DOMAIN}/faq` },
      ])} />
      <JsonLd data={faqSchema(interiorDesignFAQs)} />
      <FAQClient />
    </>
  );
}
