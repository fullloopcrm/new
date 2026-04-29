import type { Metadata } from "next";
import PartnershipForm from "@/components/PartnershipForm";

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
    url: "https://homeservicesbusinesscrm.com/waitlist",
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
  name: "Join the Full Loop CRM Waitlist",
  description:
    "Request to join the Full Loop CRM waitlist. One partner per trade per city.",
  url: "https://homeservicesbusinesscrm.com/waitlist",
  publisher: {
    "@type": "Organization",
    name: "Full Loop CRM",
    url: "https://homeservicesbusinesscrm.com",
  },
};

export default function WaitlistPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PartnershipForm />
    </>
  );
}
