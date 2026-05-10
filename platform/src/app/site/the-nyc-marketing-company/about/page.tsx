// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import AboutPage from "./AboutClient";

const title = "About Us | 25+ Years of NYC Marketing";
const description =
  "The best organic marketing company in NYC — 25+ years experience and over $15.2M in attributable revenue for local businesses. No junior account managers, no outsourcing — senior strategists only. Pricing starting at $100/hr. Call/text 212.202.9220.";
const url = "https://www.thenycmarketingcompany.com/about";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "about The NYC Marketing Company",
    "NYC marketing company",
    "NYC marketing team",
    "about us marketing agency",
    "senior marketing strategists NYC",
    "NYC digital marketing agency",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "The NYC Marketing Company",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.thenycmarketingcompany.com" },
  { name: "About", url },
];

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <AboutPage />
    </>
  );
}
