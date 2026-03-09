import type { Metadata } from "next";
import PartnershipForm from "@/components/PartnershipForm";

export const metadata: Metadata = {
  title: "CRM Partnership Request | Full Loop CRM",
  description:
    "Apply for an exclusive CRM territory. One partner per trade per metro area. Full Loop CRM handles leads, scheduling, invoicing, reviews, and more for home service businesses.",
  keywords: [
    "CRM partnership request",
    "home service CRM application",
    "apply for CRM territory",
    "exclusive CRM partnership",
    "home service business CRM",
    "field service CRM",
  ],
  openGraph: {
    title: "Request Your CRM Partnership | Full Loop CRM",
    description:
      "One partner per trade per metro. Apply to lock your exclusive territory with Full Loop CRM.",
    url: "https://fullloopcrm.com/crm-partnership-request-form",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "CRM Partnership Request Form",
  description:
    "Apply for an exclusive CRM territory. One partner per trade per metro area.",
  url: "https://fullloopcrm.com/crm-partnership-request-form",
  publisher: {
    "@type": "Organization",
    name: "Full Loop CRM",
    url: "https://fullloopcrm.com",
  },
};

export default function CRMPartnershipRequestFormPage() {
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
