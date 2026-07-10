import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import ResultsClient from "./ResultsClient";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */
const title = "What's Working | Results & Case Studies | Consortium NYC";
const description = "Real results for real NYC businesses. See how Consortium NYC helped local businesses go from invisible to page 1, generating dozens of leads per month with SEO and web design. Call/text (212) 202-9220.";
const url = "https://www.consortiumnyc.com/results";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  keywords: [
    "nyc marketing results",
    "seo case studies nyc",
    "marketing company results",
    "nyc seo before after",
    "web design case studies new york",
    "local seo results nyc",
    "marketing roi examples",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "Consortium NYC",
    type: "website",
    images: [{ url: "/og-consortium.jpg", width: 1200, height: 630, alt: "Consortium NYC Results" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-consortium.jpg"],
  },
};

/* ================================================================== */
/*  RESULTS PAGE (Server wrapper)                                      */
/* ================================================================== */
export default function ResultsPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "What's Working | Results & Case Studies",
          "Real results for real NYC businesses. See how Consortium NYC helped local businesses go from invisible to page 1.",
          "https://www.consortiumnyc.com/results"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.consortiumnyc.com" },
          { name: "Results", url: "https://www.consortiumnyc.com/results" },
        ])}
      />
      <ResultsClient />
    </>
  );
}
