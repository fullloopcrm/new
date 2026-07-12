import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";
import ContactLandingClient from "./ContactLandingClient";

export const metadata: Metadata = {
  title: "Contact NYC Web Design Company — Free Strategy Session",
  description:
    "Schedule a free strategy session with Consortium NYC, New York's top-rated web design company. SEO, web design, branding, and automation. Call (212) 202-9220.",
  alternates: { canonical: "https://www.consortiumnyc.com/contact-nyc-marketing-company-consortium-nyc" },
  keywords: [
    "contact nyc web design company",
    "nyc web design agency free consultation",
    "web design consultation new york",
    "hire web design agency nyc",
    "seo consultation new york city",
    "free strategy session marketing nyc",
    "consortium nyc contact",
    "best web design company new york",
  ],
  openGraph: {
    title: "Contact NYC Web Design Company — Free Strategy Session",
    description:
      "Schedule a free strategy session with Consortium NYC. SEO, web design, branding, automation. Call (212) 202-9220.",
    url: "https://www.consortiumnyc.com/contact-nyc-marketing-company-consortium-nyc",
    images: [{ url: "/og-consortium.jpg", width: 1200, height: 630, alt: "Contact Consortium NYC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact NYC Web Design Company — Free Strategy Session",
    description: "Free strategy session. SEO, web design, branding. Call (212) 202-9220.",
    images: ["/og-consortium.jpg"],
  },
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Contact NYC Web Design Company — Free Strategy Session",
          "Schedule a free strategy session with Consortium NYC. SEO, web design, branding, and automation for NYC businesses. Call (212) 202-9220.",
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
