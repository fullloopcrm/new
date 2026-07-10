import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import AboutPage from "./AboutClient";

const title = "About The NYC Marketing Company | 25+ Years of NYC Marketing";
const description =
  "NYC marketing company with 25+ years experience and over $15.2M in attributable revenue for local businesses. No junior account managers, no outsourcing — senior strategists only. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/about";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "about The NYC Marketing Company",
    "NYC marketing company",
    "NYC marketing team",
    "about us marketing agency",
    "senior marketing strategists NYC",
    "NYC digital marketing agency",
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
  { name: "About", url },
];

export default function Page() {
  return (
    <>
      <JsonLd data={webPageSchema(title, description, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <AboutPage />
    </>
  );
}
