// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ServicesPage from "./ServicesClient";

const title = "NYC Marketing Services | SEO, Web Design, Branding & More";
const description =
  "Full-service marketing for NYC businesses. SEO from $950/mo, custom websites from $4,600, branding, AI automation, and Google Business Profile optimization. No contracts. Call/text (212) 202-9220.";
const url = "https://www.thenycmarketingcompany.com/services";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing services",
    "SEO services NYC",
    "web design NYC",
    "branding NYC",
    "AI marketing automation",
    "Google Business Profile optimization",
    "NYC digital marketing",
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
  { name: "Home", url: "https://www.thenycmarketingcompany.com" },
  { name: "Services", url },
];

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <ServicesPage />
    </>
  );
}