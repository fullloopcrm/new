import type { Metadata } from "next";
import PartnershipForm from "@/components/PartnershipForm";
import { JsonLd, breadcrumbSchema, organizationSchema, websiteSchema } from "@/lib/schema";

const URL = "https://homeservicecrm.ai/waitlist";
const breadcrumbs = [
  { name: "Home", url: "https://homeservicecrm.ai" },
  { name: "Waitlist", url: URL },
];

export const metadata: Metadata = {
  title: "Join the Waitlist | Full Loop CRM",
  description:
    "Request to join the Full Loop CRM waitlist. One partner per trade per city. Full Loop CRM handles leads, scheduling, invoicing, reviews, and more for home service businesses.",
  keywords: [
    "Full Loop CRM waitlist",
    "home service CRM waitlist",
    "join CRM waitlist",
    "exclusive CRM territory",
    "home service business CRM",
    "field service CRM",
  ],
  openGraph: {
    title: "Join the Waitlist | Full Loop CRM",
    description:
      "One partner per trade per city. Request to join the Full Loop CRM waitlist.",
    url: "https://homeservicecrm.ai/waitlist",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join the Waitlist | Full Loop CRM",
    description:
      "One partner per trade per city. Request to join the Full Loop CRM waitlist.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${URL}/#webpage`,
  name: "Join the Full Loop CRM Waitlist",
  description:
    "Request to join the Full Loop CRM waitlist. One partner per trade per city.",
  url: URL,
  isPartOf: { "@id": "https://homeservicecrm.ai/#website" },
  about: { "@id": "https://homeservicecrm.ai/#organization" },
};

export default function WaitlistPage() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <PartnershipForm />
    </>
  );
}
