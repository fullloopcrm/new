// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import CalculatorClient from "./CalculatorClient";

const calculatorFaqs = [
  { question: "What is a good DSCR ratio?", answer: "A DSCR of 1.25 or higher is considered strong and will qualify you for the best interest rates. A DSCR of 1.0 means your rental income exactly covers the mortgage payment (break-even). Some lenders accept DSCR as low as 0.75, but expect higher rates and larger down payments." },
  { question: "How do lenders calculate DSCR?", answer: "Lenders divide the property's gross monthly rental income by the total monthly PITIA payment (Principal + Interest + Taxes + Insurance + HOA). For long-term rentals, they use the market rent from the appraisal's 1007 rent schedule. For short-term rentals, they may use AirDNA projections or actual booking history." },
  { question: "Does DSCR use gross rent or net rent?", answer: "Most DSCR lenders use gross rental income (before expenses like property management, maintenance, or vacancy). They do NOT subtract operating expenses. The only deductions factored in are the PITIA components of the mortgage payment itself." },
  { question: "What if my DSCR is below 1.0?", answer: "A DSCR below 1.0 means the property's rent doesn't fully cover the mortgage. Some lenders still approve these loans but require a larger down payment (typically 30-35%), higher credit scores (700+), and charge a rate premium of 0.5-1.0% above standard DSCR pricing." },
  { question: "Can I improve my DSCR ratio?", answer: "Yes. You can improve DSCR by: (1) increasing rent before applying, (2) making a larger down payment to reduce the mortgage, (3) choosing interest-only payments, (4) shopping for lower insurance rates, (5) buying in areas with lower property tax rates, or (6) choosing a property with no HOA." },
  { question: "Is vacancy factored into the DSCR calculation?", answer: "Most DSCR lenders do NOT factor in vacancy when calculating the ratio. They use the full market rent or actual rent from the lease. However, some lenders apply a 5-10% vacancy factor on certain property types, particularly short-term rentals." },
];

// SoftwareApplication schema for the calculator tool
const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DSCR Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description: "Free online DSCR calculator for real estate investors. Calculate your debt service coverage ratio instantly to determine if your investment property qualifies for a DSCR loan.",
  url: "https://www.debtserviceratioloan.com/calculator",
};

// HowTo schema for calculating DSCR
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Calculate Your DSCR (Debt Service Coverage Ratio)",
  description: "Step-by-step guide to calculating the debt service coverage ratio for an investment property to determine DSCR loan eligibility.",
  totalTime: "PT2M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Determine Monthly Rental Income",
      text: "Find the property's monthly rental income. For long-term rentals, use the market rent from a comparable rent analysis or appraisal. For short-term rentals, use projected monthly income from AirDNA or actual booking history.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Calculate Monthly PITIA",
      text: "Add up all components of the monthly mortgage payment: Principal + Interest + Property Taxes + Homeowner's Insurance + HOA dues (if applicable). This total is your monthly debt service or PITIA.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Divide Rent by PITIA",
      text: "Divide the monthly rental income by the monthly PITIA. For example: $2,500 rent ÷ $2,000 PITIA = 1.25 DSCR. This means the property generates 25% more income than needed to cover the mortgage.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Evaluate Your Result",
      text: "A DSCR of 1.25+ qualifies for the best rates. 1.0-1.24 qualifies with most lenders. Below 1.0 may still qualify with select lenders but requires higher down payment and credit score.",
    },
  ],
};

export const metadata: Metadata = {
  title: "Free DSCR Calculator — Check Your Ratio Instantly (2026)",
  description:
    "Free DSCR calculator. Enter rent and mortgage details to instantly see your debt service coverage ratio. Tips, thresholds, and rate guidance included.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/calculator" },
  keywords: [
    "dscr calculator",
    "debt service coverage ratio calculator",
    "dscr loan calculator",
    "rental property dscr calculator",
    "investment property calculator",
    "dscr ratio calculator free",
  ],
};

export default function CalculatorPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Free DSCR Calculator 2026",
          "Calculate your debt service coverage ratio instantly. Free tool for real estate investors.",
          "https://www.debtserviceratioloan.com/calculator"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "DSCR Calculator", url: "https://www.debtserviceratioloan.com/calculator" },
        ])}
      />
      <JsonLd data={calculatorSchema} />
      <JsonLd data={howToSchema} />
      <JsonLd data={faqSchema(calculatorFaqs)} />
      <CalculatorClient faqs={calculatorFaqs} />
    </>
  );
}
