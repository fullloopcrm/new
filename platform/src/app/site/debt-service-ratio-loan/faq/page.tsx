// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import { homeFAQs } from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import FAQClient from "./FAQClient";

export const metadata: Metadata = {
  title: "DSCR Loan FAQ — Frequently Asked Questions About DSCR Loans",
  description: "Answers to the most common questions about DSCR loans, including qualification, rates, requirements, and how the debt service coverage ratio works.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/faq" },
};

export default function FAQPage() {
  return (
    <>
      <JsonLd data={webPageSchema("DSCR Loan FAQ", "Frequently asked questions about DSCR loans.", "https://www.debtserviceratioloan.com/faq")} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://www.debtserviceratioloan.com" },
        { name: "FAQ", url: "https://www.debtserviceratioloan.com/faq" },
      ])} />
      <JsonLd data={faqSchema(homeFAQs)} />
      <FAQClient />
    </>
  );
}
