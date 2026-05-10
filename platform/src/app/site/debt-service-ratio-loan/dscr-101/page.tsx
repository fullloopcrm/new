// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import DSCR101Client from "./DSCR101Client";

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "DSCR 101 — Complete Guide to Debt Service Coverage Ratio Loans",
  description: "Free comprehensive course walking through every aspect of DSCR loans — what they are, who they're for, who they're NOT for, how to qualify, and how to close.",
  provider: {
    "@type": "Organization",
    name: "DebtServiceRatioLoan.com",
    url: "https://www.debtserviceratioloan.com",
  },
  isAccessibleForFree: true,
  educationalLevel: "Beginner",
  about: ["DSCR Loans", "Real Estate Investing", "Investment Property Financing"],
};

const dscr101Faqs = [
  { question: "Do I need to be a US citizen to get a DSCR loan?", answer: "No. DSCR loans are available to foreign nationals, permanent residents, and US citizens. Foreign national programs typically require 25-30% down and a US bank account, but no SSN is needed with select lenders." },
  { question: "Can I get a DSCR loan on my first investment property?", answer: "Yes. There's no requirement to have prior investment experience. First-time investors qualify just like veterans with 50+ doors. The property's cash flow is what matters, not your track record." },
  { question: "Do DSCR loans show up on my credit report?", answer: "Yes, DSCR loans are reported to credit bureaus like any mortgage. They appear as a mortgage tradeline and affect your credit score. However, they do NOT count toward conventional DTI calculations since they're on investment properties." },
  { question: "Can I refinance a conventional loan into a DSCR loan?", answer: "Yes. Many investors refinance existing conventional or hard money loans into DSCR loans. This is especially common when you've maxed out conventional financing at 10 properties and need to free up room for more." },
  { question: "What's the maximum loan amount for a DSCR loan?", answer: "Most DSCR lenders go up to $2–3 million on single-asset loans. Some offer up to $5 million. Portfolio/blanket DSCR loans can exceed $10 million for multiple properties. There's no standard cap — it varies by lender." },
  { question: "Are there prepayment penalties on DSCR loans?", answer: "Most DSCR loans include a prepayment penalty — typically a 3-year or 5-year declining structure (e.g., 5/4/3/2/1%). Choosing a longer prepay gets you a lower rate. No-prepay options exist but add 0.75-1.0% to the rate." },
];

export const metadata: Metadata = {
  title: "DSCR 101 — The Complete Beginner's Guide to DSCR Loans (2026)",
  description:
    "DSCR 101: Everything you need to know about debt service coverage ratio loans in plain English. Who it's for, who it's NOT for, step-by-step process, real examples, common mistakes, and expert tips.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/dscr-101" },
  keywords: [
    "dscr 101",
    "what is a dscr loan",
    "dscr loans explained",
    "dscr loan for beginners",
    "how dscr loans work",
    "dscr loan guide",
    "debt service coverage ratio explained",
  ],
};

export default function DSCR101Page() {
  return (
    <>
      <JsonLd data={webPageSchema("DSCR 101", "The complete beginner's guide to DSCR loans.", "https://www.debtserviceratioloan.com/dscr-101")} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://www.debtserviceratioloan.com" },
        { name: "DSCR 101", url: "https://www.debtserviceratioloan.com/dscr-101" },
      ])} />
      <JsonLd data={courseSchema} />
      <JsonLd data={faqSchema(dscr101Faqs)} />
      <DSCR101Client faqs={dscr101Faqs} />
    </>
  );
}
