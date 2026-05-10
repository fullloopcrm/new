// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import FreeSEOAudit from "./FreeReviewClient";

const title = "Free Human+AI SEO & Marketing Review | The NYC Marketing Company";
const description =
  "Get a free SEO and marketing review powered by human expertise and AI analysis. We audit your website, Google Business Profile, competitors, and local rankings — then deliver a custom action plan. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/the-free-human+ai-seo-marketing-review";

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
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "The NYC Marketing Company" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.jpg"],
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.consortiumnyc.com" },
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
