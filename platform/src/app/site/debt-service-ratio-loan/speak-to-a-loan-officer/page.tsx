import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import SpeakToLOClient from "./SpeakToLOClient";

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Speak to a DSCR Loan Officer",
  description: "Request a free consultation with an experienced DSCR loan officer in your city.",
  url: "https://www.debtserviceratioloan.com/speak-to-a-loan-officer",
  mainEntity: {
    "@type": "FinancialService",
    name: "DebtServiceRatioLoan.com",
    telephone: "+1-855-300-3727",
    email: "hello@debtserviceratioloan.com",
    areaServed: { "@type": "Country", name: "United States" },
    serviceType: "DSCR Loan Consultation",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free DSCR loan consultation with an experienced loan officer",
    },
  },
};

export const metadata: Metadata = {
  title: "Speak to a DSCR Loan Officer — Free Consultation",
  description:
    "Free consultation with a DSCR loan officer who knows your market. Get personalized rates, requirements, and loan options for your investment property.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/speak-to-a-loan-officer" },
};

export default function SpeakToLOPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Speak to a DSCR Loan Officer", "Request a free DSCR loan consultation.", "https://www.debtserviceratioloan.com/speak-to-a-loan-officer")} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://www.debtserviceratioloan.com" },
        { name: "Speak to a Loan Officer", url: "https://www.debtserviceratioloan.com/speak-to-a-loan-officer" },
      ])} />
      <JsonLd data={contactSchema} />
      <SpeakToLOClient />
    </>
  );
}
