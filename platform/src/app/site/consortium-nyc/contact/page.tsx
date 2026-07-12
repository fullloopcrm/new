import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us — Schedule a Free Strategy Session",
  description:
    "Get in touch with Consortium NYC. Schedule a free strategy consultation for SEO, web design, branding, and web design in NYC, Long Island, and Westchester. Call (212) 202-9220.",
  alternates: { canonical: "https://www.consortiumnyc.com/contact" },
  keywords: [
    "contact consortium nyc",
    "nyc web design agency contact",
    "free strategy session nyc",
    "web design consultation new york",
    "seo consultation nyc",
    "web design quote nyc",
    "marketing rfp new york",
    "hire web design agency nyc",
  ],
  openGraph: {
    title: "Contact Consortium NYC — Free Strategy Session",
    description:
      "Schedule a free strategy consultation for SEO, web design, branding, and web design in NYC. Call (212) 202-9220.",
    url: "https://www.consortiumnyc.com/contact",
    images: [{ url: "/og-consortium.jpg", width: 1200, height: 630, alt: "Contact Consortium NYC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Consortium NYC — Free Strategy Session",
    description:
      "Schedule a free strategy consultation. SEO, web design, branding, web design. Call (212) 202-9220.",
    images: ["/og-consortium.jpg"],
  },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Contact Us — Schedule a Free Strategy Session",
          "Get in touch with Consortium NYC. Schedule a free strategy consultation for SEO, web design, branding, and web design in NYC, Long Island, and Westchester. Call (212) 202-9220.",
          "https://www.consortiumnyc.com/contact"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.consortiumnyc.com" },
          { name: "Contact", url: "https://www.consortiumnyc.com/contact" },
        ])}
      />
      <ContactPageClient />
    </>
  );
}
