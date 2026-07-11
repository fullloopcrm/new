import type { Metadata } from "next";
import { JsonLd, organizationSchema, websiteSchema, faqSchema, breadcrumbSchema, allOfficesSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import { homeFAQs } from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import HomeClient from "./HomeClient";

const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "FinancialService",
  name: "DebtServiceRatioLoan.com",
  url: "https://www.debtserviceratioloan.com",
  telephone: "+1-855-300-3727",
  address: [
    { "@type": "PostalAddress", streetAddress: "477 Madison Ave", addressLocality: "New York", addressRegion: "NY", postalCode: "10022", addressCountry: "US" },
    { "@type": "PostalAddress", streetAddress: "5901 NW 183rd St", addressLocality: "Miami Gardens", addressRegion: "FL", postalCode: "33015", addressCountry: "US" },
    { "@type": "PostalAddress", streetAddress: "1100 Poydras St Building", addressLocality: "New Orleans", addressRegion: "LA", postalCode: "70163", addressCountry: "US" },
    { "@type": "PostalAddress", streetAddress: "7457 Harwin Dr", addressLocality: "Houston", addressRegion: "TX", postalCode: "77036", addressCountry: "US" },
    { "@type": "PostalAddress", streetAddress: "801 S Figueroa St", addressLocality: "Los Angeles", addressRegion: "CA", postalCode: "90017", addressCountry: "US" },
    { "@type": "PostalAddress", streetAddress: "254 Commercial St", addressLocality: "Portland", addressRegion: "ME", postalCode: "04101", addressCountry: "US" },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Get a DSCR Loan for an Investment Property",
  description: "Step-by-step process for qualifying and closing a DSCR loan on a rental property without income verification.",
  totalTime: "PT21D",
  step: [
    { "@type": "HowToStep", position: 1, name: "Find a Cash-Flowing Property", text: "Identify an investment property where the rental income exceeds the expected mortgage payment (PITIA). Target a DSCR of 1.25 or higher for the best loan terms." },
    { "@type": "HowToStep", position: 2, name: "Calculate Your DSCR", text: "Use a DSCR calculator to divide the monthly rental income by the total PITIA. Ensure the ratio meets minimum lender requirements (typically 1.0+)." },
    { "@type": "HowToStep", position: 3, name: "Prepare Documentation", text: "Gather credit report, bank statements (for reserves), property details, and entity documents (if closing in LLC). No tax returns or W-2s needed." },
    { "@type": "HowToStep", position: 4, name: "Apply with a DSCR Lender", text: "Submit your application to a DSCR-specialized lender. The underwriting process focuses on the property's income, not yours." },
    { "@type": "HowToStep", position: 5, name: "Appraisal & Rent Verification", text: "The lender orders an appraisal with a 1007 rent schedule to verify the property value and market rent." },
    { "@type": "HowToStep", position: 6, name: "Close & Fund", text: "Close in your name or LLC. Most DSCR loans close in 14-21 days — significantly faster than conventional mortgages." },
  ],
};

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "What is a DSCR Loan? — Explained in 3 Minutes",
  description: "Quick overview of how DSCR loans work, who they're for, and how to qualify based on rental property income instead of personal income.",
  uploadDate: "2026-01-15",
  thumbnailUrl: "https://www.debtserviceratioloan.com/og-image.jpg",
  contentUrl: "https://www.debtserviceratioloan.com",
};

export const metadata: Metadata = {
  title: "DSCR Loans — Qualify on Rental Income, Not Your W-2 (2026)",
  description:
    "The #1 DSCR loan resource. 18 loan programs, 650+ cities, free calculator. Qualify on rental income — no W-2s or tax returns. Call (855) 300-DSCR.",
  keywords: [
    "dscr loan",
    "debt service coverage ratio loan",
    "dscr mortgage",
    "dscr rental loan",
    "investment property loan no income verification",
    "dscr loan rates 2026",
    "dscr loan requirements",
    "dscr calculator",
    "dscr loan for airbnb",
    "dscr loan for rental property",
    "no doc investment property loan",
    "dscr lenders near me",
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      {allOfficesSchema().map((office, i) => (
        <JsonLd key={i} data={office} />
      ))}
      <JsonLd data={reviewSchema} />
      <JsonLd data={howToSchema} />
      <JsonLd data={videoSchema} />
      <JsonLd data={faqSchema(homeFAQs)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
        ])}
      />
      <HomeClient />
    </>
  );
}
