// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us — Schedule a Free Strategy Session",
  description:
    "Schedule a free strategy consultation for SEO, web design, branding, and digital marketing in NYC, Long Island, and Westchester. The best organic marketing company in NYC. Pricing starting at $100/hr. Call/text 212.202.9220.",
  alternates: { canonical: "https://www.thenycmarketingcompany.com/contact" },
  keywords: [
    "contact the nyc marketing company",
    "nyc marketing agency contact",
    "free strategy session nyc",
    "digital marketing consultation new york",
    "seo consultation nyc",
    "web design quote nyc",
    "marketing rfp new york",
    "hire marketing agency nyc",
  ],
  openGraph: {
    title: "Contact Us — Free Strategy Session",
    description:
      "Schedule a free strategy consultation for SEO, web design, branding, and digital marketing in NYC. Pricing starting at $100/hr. Call/text 212.202.9220.",
    url: "https://www.thenycmarketingcompany.com/contact",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us — Free Strategy Session",
    description:
      "Schedule a free strategy consultation. SEO, web design, branding, digital marketing. Pricing starting at $100/hr. Call/text 212.202.9220.",
  },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Contact Us — Schedule a Free Strategy Session",
          "Get in touch with The NYC Marketing Company. Schedule a free strategy consultation for SEO, web design, branding, and digital marketing in NYC, Long Island, and Westchester. Call (212) 202-9220.",
          "https://www.thenycmarketingcompany.com/contact"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.thenycmarketingcompany.com" },
          { name: "Contact", url: "https://www.thenycmarketingcompany.com/contact" },
        ])}
      />
      <ContactPageClient />
    </>
  );
}
