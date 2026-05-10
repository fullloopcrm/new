// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ServicesListClient from "./ServicesListClient";

const title = "NYC Marketing Services | SEO, Web Design, AI, Branding & More";
const description =
  "The best organic marketing company in NYC. Every marketing service your business needs under one roof — SEO, web design, branding, AI automation, programmatic SEO, CRM development, and more. Pricing starting at $100/hr. No contracts. Call/text 212.202.9220.";
const url = "https://www.thenycmarketingcompany.com/nyc-marketing-company-services-list";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing company services",
    "SEO services NYC",
    "web design NYC",
    "AI marketing automation",
    "branding services NYC",
    "programmatic SEO",
    "CRM development NYC",
    "digital marketing services list",
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
  { name: "Services List", url },
];

export default function ServicesListPage() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <ServicesListClient />
    </>
  );
}
