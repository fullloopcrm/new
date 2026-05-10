// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import { brands, portfolioTotals } from "@/app/site/the-nyc-marketing-company/_lib/portfolio";
import PortfolioClient from "./PortfolioClient";

const title = "Our Portfolio | 158 Websites. 16 Brands. Built by The NYC Marketing Company";
const description =
  "See what we've built: 158 live websites across 16 brands — cleaning, SaaS, finance, wellness, fashion, real estate, and more. Every site is real. Every result is verifiable. No stock photos, no fake case studies. This is what an NYC marketing company actually looks like.";
const url = "https://www.thenycmarketingcompany.com/nyc-marketing-company-portfolio";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing company portfolio",
    "marketing case studies NYC",
    "SEO results proof",
    "web design portfolio NYC",
    "real marketing results",
    "programmatic SEO case study",
    "NYC business marketing examples",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "The NYC Marketing Company",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

const breadcrumbs = [
  { name: "Home", url: "https://www.thenycmarketingcompany.com" },
  { name: "Portfolio", url },
];

export default function PortfolioPage() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <PortfolioClient brands={brands} totals={portfolioTotals} />
    </>
  );
}
