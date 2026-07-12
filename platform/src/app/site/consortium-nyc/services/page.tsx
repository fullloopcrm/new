import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import ServicesPage from "./ServicesClient";

const title = "NYC Web Design & Website Design Services";
const description =
  "Full-service web design for NYC businesses. SEO from $950/mo, custom websites from $4,600, branding, AI automation, and Google Business Profile optimization. No contracts. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/services";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "NYC web design services",
    "SEO services NYC",
    "web design NYC",
    "branding NYC",
    "AI marketing automation",
    "Google Business Profile optimization",
    "NYC web design",
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
