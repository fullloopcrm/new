// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, EMAIL } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import FreeEstimateClient from "./FreeEstimateClient";

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Get a Free Landscaping Estimate",
  description: "Request a free on-site landscaping estimate from experienced NYC landscaping professionals.",
  url: `${SITE_DOMAIN}/get-a-free-estimate`,
  mainEntity: {
    "@type": "LocalBusiness",
    name: SITE_NAME,
    telephone: "+1-212-470-9637",
    email: EMAIL,
    areaServed: { "@type": "City", name: "New York" },
    serviceType: "Landscaping Services",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free on-site landscaping estimate with detailed written proposal",
    },
  },
};

export const metadata: Metadata = {
  title: "Get a Free Landscaping Estimate — No Obligation",
  description:
    "Free on-site landscaping estimate for NYC properties. Get a detailed proposal with pricing, timeline, and recommendations from experienced NYC landscaping professionals.",
  alternates: { canonical: `${SITE_DOMAIN}/get-a-free-estimate` },
};

export default function FreeEstimatePage() {
  return (
    <>
      <JsonLd data={webPageSchema("Get a Free Estimate", "Request a free NYC landscaping estimate.", `${SITE_DOMAIN}/get-a-free-estimate`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "Free Estimate", url: `${SITE_DOMAIN}/get-a-free-estimate` },
      ])} />
      <JsonLd data={contactSchema} />
      <FreeEstimateClient />
    </>
  );
}
