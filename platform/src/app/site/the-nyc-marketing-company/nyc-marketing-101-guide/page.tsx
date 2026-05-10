// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import Marketing101Client from "./Marketing101Client";

const title = "Marketing 101: 101 Lessons From Startup to 25-Year Veteran | NYC Marketing Guide";
const description = "101 marketing lessons every business owner needs — from day-one startup basics to advanced strategies used by 25-year veterans. The best organic marketing company in NYC. SEO, web design, branding, local marketing, AI automation, and more. Pricing starting at $100/hr. Call/text 212.202.9220.";
const url = "https://www.thenycmarketingcompany.com/nyc-marketing-101-guide";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "marketing 101 guide",
    "marketing for small business NYC",
    "how to market my business in NYC",
    "SEO basics for beginners",
    "local marketing guide NYC",
    "digital marketing tips small business",
    "marketing strategy for startups",
    "NYC small business marketing guide",
    "how to get customers NYC",
    "marketing lessons for business owners",
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
  { name: "Marketing 101", url: "https://www.thenycmarketingcompany.com/nyc-marketing-101-guide" },
];

export default function Marketing101Page() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Marketing 101: 101 Lessons From Startup to 25-Year Veteran | The NYC Marketing Company",
          "101 marketing lessons every business owner needs — from startup basics to advanced strategies.",
          "https://www.thenycmarketingcompany.com/nyc-marketing-101-guide",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Marketing101Client />
    </>
  );
}
