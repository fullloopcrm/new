import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import Marketing101Client from "./Marketing101Client";

const title = "Marketing 101: 101 Lessons From Startup to 25-Year Veteran | NYC Marketing Guide | Consortium NYC";
const description = "101 marketing lessons every business owner needs — from day-one startup basics to advanced strategies used by 25-year veterans. SEO, web design, branding, local marketing, AI automation, and more for NYC businesses. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/nyc-marketing-101-guide";

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
    siteName: "Consortium NYC",
    type: "website",
    images: [{ url: "/og-consortium.jpg", width: 1200, height: 630, alt: "Consortium NYC Marketing 101 Guide" }],
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
  { name: "Marketing 101", url: "https://www.consortiumnyc.com/nyc-marketing-101-guide" },
];

export default function Marketing101Page() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Marketing 101: 101 Lessons From Startup to 25-Year Veteran | Consortium NYC",
          "101 marketing lessons every business owner needs — from startup basics to advanced strategies.",
          "https://www.consortiumnyc.com/nyc-marketing-101-guide",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Marketing101Client />
    </>
  );
}
