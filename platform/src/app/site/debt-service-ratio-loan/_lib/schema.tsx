import { safeJsonLd } from '@/lib/escape-html'
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.debtserviceratioloan.com/#organization",
  name: "DebtServiceRatioLoan.com",
  url: "https://www.debtserviceratioloan.com",
  logo: {
    "@type": "ImageObject",
    url: "https://www.debtserviceratioloan.com/logo.png",
    width: 600,
    height: 60,
  },
  image: "https://www.debtserviceratioloan.com/og-image.jpg",
  description:
    "DebtServiceRatioLoan.com was built by a consortium of DSCR loan professionals with over 100 combined years of experience. We offer expert guides, calculators, and lender connections for real estate investors across 650+ cities nationwide.",
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "477 Madison Ave",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10022",
      addressCountry: "US",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "5901 NW 183rd St",
      addressLocality: "Miami Gardens",
      addressRegion: "FL",
      postalCode: "33015",
      addressCountry: "US",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "1100 Poydras St Building",
      addressLocality: "New Orleans",
      addressRegion: "LA",
      postalCode: "70163",
      addressCountry: "US",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "7457 Harwin Dr",
      addressLocality: "Houston",
      addressRegion: "TX",
      postalCode: "77036",
      addressCountry: "US",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "801 S Figueroa St",
      addressLocality: "Los Angeles",
      addressRegion: "CA",
      postalCode: "90017",
      addressCountry: "US",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "254 Commercial St",
      addressLocality: "Portland",
      addressRegion: "ME",
      postalCode: "04101",
      addressCountry: "US",
    },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-855-300-3727",
    contactType: "sales",
    areaServed: "US",
    availableLanguage: "English",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  knowsAbout: [
    "DSCR Loans",
    "Debt Service Coverage Ratio",
    "Investment Property Financing",
    "Real Estate Investing",
    "Rental Property Loans",
    "Commercial Real Estate Loans",
    "No Income Verification Mortgages",
    "Real Estate Portfolio Lending",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.debtserviceratioloan.com/#website",
  url: "https://www.debtserviceratioloan.com",
  name: "DebtServiceRatioLoan.com",
  description: "DSCR Loans | Debt Service Coverage Ratio Loan Guide & Resources",
  publisher: {
    "@id": "https://www.debtserviceratioloan.com/#organization",
  },
};

export function cityPageSchema(city: string, state: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `https://www.debtserviceratioloan.com/dscr-loans-${city.toLowerCase().replace(/\s+/g, "-")}-${state.toLowerCase()}/#webpage`,
    name: `DSCR Loans in ${city}, ${state.toUpperCase()}`,
    description: `Everything you need to know about DSCR loans in ${city}, ${state.toUpperCase()}. Rates, requirements, lenders, and tips for real estate investors.`,
    url: `https://www.debtserviceratioloan.com/dscr-loans-${city.toLowerCase().replace(/\s+/g, "-")}-${state.toLowerCase()}`,
    isPartOf: { "@id": "https://www.debtserviceratioloan.com/#website" },
    about: { "@id": "https://www.debtserviceratioloan.com/#organization" },
    inLanguage: "en-US",
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function webPageSchema(
  title: string,
  description: string,
  url: string,
  breadcrumbs?: { name: string; url: string }[]
) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}/#webpage`,
    url,
    name: title,
    description,
    isPartOf: { "@id": "https://www.debtserviceratioloan.com/#website" },
    about: { "@id": "https://www.debtserviceratioloan.com/#organization" },
    datePublished: "2026-03-23",
    dateModified: new Date().toISOString().split("T")[0],
    inLanguage: "en-US",
  };

  if (breadcrumbs) {
    schema.breadcrumb = breadcrumbSchema(breadcrumbs);
  }

  return schema;
}

export function articleSchema(
  title: string,
  description: string,
  url: string,
  datePublished: string,
  dateModified: string,
  image?: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: image || "https://www.debtserviceratioloan.com/og-image.jpg",
    datePublished,
    dateModified,
    author: {
      "@id": "https://www.debtserviceratioloan.com/#organization",
    },
    publisher: {
      "@id": "https://www.debtserviceratioloan.com/#organization",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "en-US",
  };
}

/* ─── Office locations for LocalBusiness schema ─── */

const offices = [
  {
    id: "new-york",
    name: "DebtServiceRatioLoan.com — New York",
    streetAddress: "477 Madison Ave",
    city: "New York",
    state: "NY",
    zip: "10022",
    regions: ["Northeast", "Mid-Atlantic"],
  },
  {
    id: "miami",
    name: "DebtServiceRatioLoan.com — Miami",
    streetAddress: "5901 NW 183rd St",
    city: "Miami Gardens",
    state: "FL",
    zip: "33015",
    regions: ["Southeast"],
  },
  {
    id: "new-orleans",
    name: "DebtServiceRatioLoan.com — New Orleans",
    streetAddress: "1100 Poydras St Building",
    city: "New Orleans",
    state: "LA",
    zip: "70163",
    regions: ["South"],
  },
  {
    id: "houston",
    name: "DebtServiceRatioLoan.com — Houston",
    streetAddress: "7457 Harwin Dr",
    city: "Houston",
    state: "TX",
    zip: "77036",
    regions: ["Southwest", "South Central"],
  },
  {
    id: "los-angeles",
    name: "DebtServiceRatioLoan.com — Los Angeles",
    streetAddress: "801 S Figueroa St",
    city: "Los Angeles",
    state: "CA",
    zip: "90017",
    regions: ["West", "Pacific"],
  },
  {
    id: "portland",
    name: "DebtServiceRatioLoan.com — Portland",
    streetAddress: "254 Commercial St",
    city: "Portland",
    state: "ME",
    zip: "04101",
    regions: ["New England", "Midwest"],
  },
];

function getOfficeForRegion(region: string) {
  return (
    offices.find((o) => o.regions.includes(region)) || offices[0]
  );
}

export function localBusinessSchema(
  cityName: string,
  stateAbbr: string,
  stateName: string,
  region: string
) {
  const office = getOfficeForRegion(region);
  return {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "@id": `https://www.debtserviceratioloan.com/#office-${office.id}`,
    name: office.name,
    description: `DSCR loan experts serving ${cityName}, ${stateAbbr} and the ${region} region. Rates, requirements, calculators, and lender connections for real estate investors.`,
    url: "https://www.debtserviceratioloan.com",
    telephone: "+1-855-300-3727",
    image: "https://www.debtserviceratioloan.com/og-image.jpg",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: office.streetAddress,
      addressLocality: office.city,
      addressRegion: office.state,
      postalCode: office.zip,
      addressCountry: "US",
    },
    areaServed: [
      {
        "@type": "City",
        name: cityName,
        containedInPlace: {
          "@type": "State",
          name: stateName,
        },
      },
      {
        "@type": "State",
        name: stateName,
      },
    ],
    parentOrganization: {
      "@id": "https://www.debtserviceratioloan.com/#organization",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    sameAs: ["https://www.debtserviceratioloan.com"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "DSCR Loan Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "DSCR Loans",
            description: "Investment property loans based on rental income, not personal income.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "DSCR Cash-Out Refinance",
            description: "Access equity from investment properties without income verification.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "DSCR Portfolio Loans",
            description: "Finance multiple investment properties under a single blanket loan.",
          },
        },
      ],
    },
  };
}

export function allOfficesSchema() {
  return offices.map((office) => ({
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "@id": `https://www.debtserviceratioloan.com/#office-${office.id}`,
    name: office.name,
    description: `DSCR loan experts serving the ${office.regions.join(" and ")} region.`,
    url: "https://www.debtserviceratioloan.com",
    telephone: "+1-855-300-3727",
    address: {
      "@type": "PostalAddress",
      streetAddress: office.streetAddress,
      addressLocality: office.city,
      addressRegion: office.state,
      postalCode: office.zip,
      addressCountry: "US",
    },
    parentOrganization: {
      "@id": "https://www.debtserviceratioloan.com/#organization",
    },
  }));
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data).replace(/</g, "\\u003c") }}
    />
  );
}
