import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ROICalculator from "./ROICalculatorClient";

const title = "Marketing ROI Calculator | See Your Potential Revenue";
const description =
  "Calculate your marketing ROI with our free tool. See how SEO and web design can generate leads and revenue for your NYC business. SEO from $950/mo. Call/text (212) 202-9220.";
const url = "https://www.thenycmarketingcompany.com/annual-marketing-spend-roi-calculator";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "marketing ROI calculator",
    "SEO ROI calculator",
    "marketing spend calculator",
    "NYC marketing budget",
    "digital marketing ROI",
    "annual marketing spend",
    "marketing investment calculator",
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
  { name: "Home", url: "https://www.thenycmarketingcompany.com" },
  { name: "ROI Calculator", url },
];

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <ROICalculator />
    </>
  );
}