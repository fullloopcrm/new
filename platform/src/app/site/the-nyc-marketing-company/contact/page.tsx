import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us — Schedule a Free Strategy Session",
  description:
    "Get in touch with Consortium NYC (Now The NYC Marketing Company). Schedule a free strategy consultation for SEO, web design, branding, and digital marketing in NYC, Long Island, and Westchester. Call (212) 202-9220.",
  alternates: { canonical: "https://www.thenycmarketingcompany.com/contact" },
  keywords: [
    "contact consortium nyc",
    "nyc marketing agency contact",
    "free strategy session nyc",
    "digital marketing consultation new york",
    "seo consultation nyc",
    "web design quote nyc",
    "marketing rfp new york",
    "hire marketing agency nyc",
  ],
  openGraph: {
    title: "Contact Consortium NYC (Now The NYC Marketing Company) — Free Strategy Session",
    description:
      "Schedule a free strategy consultation for SEO, web design, branding, and digital marketing in NYC. Call (212) 202-9220.",
    url: "https://www.thenycmarketingcompany.com/contact",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Contact Consortium NYC (Now The NYC Marketing Company)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Consortium NYC (Now The NYC Marketing Company) — Free Strategy Session",
    description:
      "Schedule a free strategy consultation. SEO, web design, branding, digital marketing. Call (212) 202-9220.",
    images: ["/og-image.jpg"],
  },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Contact Us — Schedule a Free Strategy Session",
          "Get in touch with Consortium NYC (Now The NYC Marketing Company). Schedule a free strategy consultation for SEO, web design, branding, and digital marketing in NYC, Long Island, and Westchester. Call (212) 202-9220.",
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