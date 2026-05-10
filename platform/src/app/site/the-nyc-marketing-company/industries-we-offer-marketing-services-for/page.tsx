// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import IndustriesListClient from "./IndustriesListClient";

const title = "Industries We Serve | NYC Marketing for 100+ Industries";
const description =
  "The best organic marketing company in NYC. Marketing services for 100+ industries across NYC, Long Island, and the tri-state area. Home services, law firms, restaurants, medical practices, and more. Pricing starting at $100/hr. Call/text 212.202.9220.";
const url = "https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing by industry",
    "industry marketing services",
    "home service marketing NYC",
    "law firm marketing NYC",
    "restaurant marketing NYC",
    "medical practice marketing NYC",
    "contractor marketing NYC",
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
  { name: "Industries", url },
];

export default function IndustriesPage() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <IndustriesListClient />
    </>
  );
}
