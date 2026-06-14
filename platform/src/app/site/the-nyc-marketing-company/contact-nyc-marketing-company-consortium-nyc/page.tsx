// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ContactLandingClient from "./ContactLandingClient";

export const metadata: Metadata = {
  title: "Contact NYC Marketing Company — Free Strategy Session",
  description:
    "Schedule a free strategy session with Consortium NYC (Now The NYC Marketing Company), New York's top-rated marketing company. SEO, web design, branding, and automation. Call (212) 202-9220.",
  alternates: { canonical: "https://www.consortiumnyc.com/contact-nyc-marketing-company-consortium-nyc" },
  keywords: [
    "contact nyc marketing company",
    "nyc marketing agency free consultation",
    "digital marketing consultation new york",
    "hire marketing agency nyc",
    "seo consultation new york city",
    "free strategy session marketing nyc",
    "consortium nyc contact",
    "best marketing company new york",
  ],
  openGraph: {
    title: "Contact NYC Marketing Company — Free Strategy Session",
    description:
      "Schedule a free strategy session with Consortium NYC (Now The NYC Marketing Company). SEO, web design, branding, automation. Call (212) 202-9220.",
    url: "https://www.consortiumnyc.com/contact-nyc-marketing-company-consortium-nyc",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Contact Consortium NYC (Now The NYC Marketing Company)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact NYC Marketing Company — Free Strategy Session",
    description: "Free strategy session. SEO, web design, branding. Call (212) 202-9220.",
    images: ["/og-image.jpg"],
  },
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Contact NYC Marketing Company — Free Strategy Session",
          "Schedule a free strategy session with Consortium NYC (Now The NYC Marketing Company). SEO, web design, branding, and automation for NYC businesses. Call (212) 202-9220.",
          "https://www.consortiumnyc.com/contact-nyc-marketing-company-consortium-nyc"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.consortiumnyc.com" },
          { name: "Contact", url: "https://www.consortiumnyc.com/contact-nyc-marketing-company-consortium-nyc" },
        ])}
      />
      <ContactLandingClient />
    </>
  );
}