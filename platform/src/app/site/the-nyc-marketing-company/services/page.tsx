// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ServicesPage from "./ServicesClient";

const title = "NYC Marketing Services | SEO, Web Design, Branding & More";
const description =
  "The best organic marketing company in NYC. Full-service marketing — SEO from $950/mo, custom websites from $4,600, branding, AI automation, and Google Business Profile optimization. Pricing starting at $100/hr. No contracts. Call/text 212.202.9220.";
const url = "https://www.thenycmarketingcompany.com/services";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing services",
    "SEO services NYC",
    "web design NYC",
    "branding NYC",
    "AI marketing automation",
    "Google Business Profile optimization",
    "NYC digital marketing",
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
  { name: "Services", url },
];

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <ServicesPage />
    </>
  );
}
