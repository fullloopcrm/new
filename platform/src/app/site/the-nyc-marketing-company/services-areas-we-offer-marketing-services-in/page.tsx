// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ServiceAreasClient from "./ServiceAreasClient";

const title = "Service Areas | NYC, Long Island, Westchester & NJ Marketing Company | Consortium NYC (Now The NYC Marketing Company)";
const description =
  "Marketing services across 80+ neighborhoods in NYC, Long Island, Westchester, and New Jersey. SEO, web design, branding, AI automation, and more for local businesses in the tri-state area. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing service areas",
    "Long Island marketing company",
    "Westchester marketing company",
    "NJ marketing company",
    "tri-state marketing services",
    "NYC neighborhood marketing",
    "local marketing NYC",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "Consortium NYC (Now The NYC Marketing Company)",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Consortium NYC (Now The NYC Marketing Company)" }],
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
  { name: "Service Areas", url },
];

export default function AreasPage() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <ServiceAreasClient />
    </>
  );
}