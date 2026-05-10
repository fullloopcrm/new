// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import MarketingChecklist from "./ChecklistClient";

const title = "Master Marketing Checklist 2026 | SEO, Web Design & More";
const description =
  "The complete marketing checklist for NYC businesses — SEO foundations, Google Business Profile, web design, content strategy, analytics, and more. The best organic marketing company in NYC. Pricing starting at $100/hr. Updated for 2026. Call/text 212.202.9220.";
const url = "https://www.thenycmarketingcompany.com/master-marketing-checklist-last-updated-2026";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "marketing checklist 2026",
    "SEO checklist NYC",
    "digital marketing checklist",
    "web design checklist",
    "Google Business Profile checklist",
    "content strategy checklist",
    "NYC business marketing guide",
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
  { name: "Marketing Checklist", url },
];

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <MarketingChecklist />
    </>
  );
}
