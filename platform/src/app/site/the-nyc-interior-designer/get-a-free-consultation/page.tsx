import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, EMAIL } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import FreeConsultationClient from "./FreeConsultationClient";

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Get a Free Interior Design Consultation",
  description: "Request a free interior design consultation from experienced NYC design professionals.",
  url: `${SITE_DOMAIN}/get-a-free-consultation`,
  mainEntity: {
    "@type": "LocalBusiness",
    name: SITE_NAME,
    telephone: "+1-917-473-2013",
    email: EMAIL,
    areaServed: { "@type": "City", name: "New York" },
    serviceType: "Interior Design Services",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free interior design consultation with detailed proposal and recommendations",
    },
  },
};

export const metadata: Metadata = {
  title: "Get a Free Interior Design Consultation — No Obligation",
  description:
    "Free interior design consultation for NYC properties. Get a personalized proposal with design recommendations, pricing, and timeline from experienced NYC interior designers.",
  alternates: { canonical: `${SITE_DOMAIN}/get-a-free-consultation` },
};

export default function FreeConsultationPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Get a Free Consultation", "Request a free NYC interior design consultation.", `${SITE_DOMAIN}/get-a-free-consultation`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "Free Consultation", url: `${SITE_DOMAIN}/get-a-free-consultation` },
      ])} />
      <JsonLd data={contactSchema} />
      <FreeConsultationClient />
    </>
  );
}
