// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import FreeSEOAudit from "./FreeReviewClient";

const title = "Free Human+AI SEO & Marketing Review";
const description =
  "Get a free SEO and marketing review powered by human expertise and AI analysis. We audit your website, Google Business Profile, competitors, and local rankings — then deliver a custom action plan. The best organic marketing company in NYC. Pricing starting at $100/hr. Call/text 212.202.9220.";
const url = "https://www.thenycmarketingcompany.com/the-free-human+ai-seo-marketing-review";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "free SEO audit NYC",
    "free marketing review",
    "SEO analysis NYC",
    "website audit free",
    "Google Business Profile audit",
    "AI SEO review",
    "free SEO report",
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
  { name: "Free SEO & Marketing Review", url },
];

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <FreeSEOAudit />
    </>
  );
}
