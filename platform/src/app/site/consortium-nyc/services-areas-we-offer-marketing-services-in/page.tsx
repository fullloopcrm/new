import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import ServiceAreasClient from "./ServiceAreasClient";

const title = "Service Areas | NYC, Long Island & Westchester Web Design";
const description =
  "Marketing services across 80+ neighborhoods in NYC, Long Island, Westchester, and New Jersey. SEO, web design, branding, AI automation, and more for local businesses in the tri-state area. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing service areas",
    "Long Island web design company",
    "Westchester web design company",
    "NJ web design company",
    "tri-state marketing services",
    "NYC neighborhood marketing",
    "local marketing NYC",
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
