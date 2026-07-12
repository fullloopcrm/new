import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import MarketingChecklist from "./ChecklistClient";

const title = "Master Marketing Checklist 2026 | SEO, Web Design & More";
const description =
  "The complete marketing checklist for NYC businesses — SEO foundations, Google Business Profile, web design, content strategy, analytics, and more. Updated for 2026. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/master-marketing-checklist-last-updated-2026";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "marketing checklist 2026",
    "SEO checklist NYC",
    "web design checklist",
    "web design checklist",
    "Google Business Profile checklist",
    "content strategy checklist",
    "NYC business marketing guide",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "Consortium NYC",
    type: "website",
    images: [{ url: "/og-consortium.jpg", width: 1200, height: 630, alt: "Consortium NYC" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-consortium.jpg"],
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.consortiumnyc.com" },
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
