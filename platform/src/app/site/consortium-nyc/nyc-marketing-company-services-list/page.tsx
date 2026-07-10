import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import ServicesListClient from "./ServicesListClient";

const title = "NYC Marketing Company Services | SEO, Web Design, AI, Branding & More | Consortium NYC";
const description =
  "Every marketing service your NYC business needs under one roof. SEO, custom web design, branding, AI automation, programmatic SEO, CRM development, and more. No contracts. Transparent pricing. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/nyc-marketing-company-services-list";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC marketing company services",
    "SEO services NYC",
    "web design NYC",
    "AI marketing automation",
    "branding services NYC",
    "programmatic SEO",
    "CRM development NYC",
    "digital marketing services list",
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
  { name: "Services List", url },
];

export default function ServicesListPage() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <ServicesListClient />
    </>
  );
}
