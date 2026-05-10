// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_NAME,
  SITE_DOMAIN,
  PHONE,
  PHONE_HREF,
  EMAIL,
  ADDRESS,
  getAllBoroughs,
  services,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, breadcrumbSchema, organizationSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

export const metadata: Metadata = {
  title: "Interior Design Jobs NYC — Now Hiring Designers Across New York City",
  description:
    "Join The NYC Interior Designer team. We are hiring interior designers, project managers, design assistants, home stagers, procurement specialists, and client coordinators across all five boroughs, Long Island, Westchester, and New Jersey. Competitive pay and benefits.",
  keywords: [
    "interior design jobs NYC",
    "interior designer hiring NYC",
    "design careers New York",
    "home stager jobs NYC",
    "hiring interior designers NYC",
    "design assistant jobs NYC",
    "project manager interior design NYC",
    "procurement specialist design NYC",
    "client coordinator design NYC",
    "renovation manager jobs NYC",
  ],
  alternates: { canonical: `${SITE_DOMAIN}/careers` },
  openGraph: {
    title: "Interior Design Jobs NYC — Now Hiring Designers",
    description:
      "Join The NYC Interior Designer team. Competitive pay, benefits, and growth opportunities for design professionals across New York City.",
    url: `${SITE_DOMAIN}/careers`,
    siteName: SITE_NAME,
    type: "website",
  },
};

const positions = [
  {
    title: "Interior Designer",
    slug: "interior-designer",
    pay: "$55,000 - $90,000 / year",
    type: "FULL_TIME",
    description:
      "Create custom interior designs for residential and commercial properties across NYC. Work with clients from concept through installation, producing detailed plans, mood boards, and 3D renderings for projects ranging from co-op apartments to brownstone renovations.",
    requirements: [
      "Bachelor's degree in Interior Design, Architecture, or related field",
      "3+ years of interior design experience in an urban market",
      "Proficiency in AutoCAD, SketchUp, and/or Revit",
      "Strong knowledge of materials, finishes, and furniture sources",
      "Excellent client communication and presentation skills",
      "Portfolio of completed residential and/or commercial projects",
    ],
    responsibilities: [
      "Conduct on-site consultations and space assessments",
      "Develop design concepts, floor plans, and 3D renderings",
      "Select furniture, materials, finishes, and fixtures",
      "Coordinate with contractors and vendors during execution",
      "Manage multiple concurrent design projects",
      "Present designs to clients and incorporate feedback",
    ],
  },
  {
    title: "Project Manager / Renovation Coordinator",
    slug: "project-manager",
    pay: "$65,000 - $100,000 / year",
    type: "FULL_TIME",
    description:
      "Manage interior design and renovation projects across NYC. Coordinate between designers, contractors, vendors, building management, and clients to ensure projects are completed on time, on budget, and to our quality standards.",
    requirements: [
      "4+ years of project management in design or construction",
      "Deep knowledge of NYC renovation logistics and building codes",
      "Experience with co-op/condo alteration agreements",
      "Strong organizational and communication skills",
      "Proficiency in project management software",
      "NYC-specific renovation experience required",
    ],
    responsibilities: [
      "Manage 5-10 concurrent design and renovation projects",
      "Coordinate between designers, contractors, and clients",
      "Handle co-op/condo board submissions and DOB permits",
      "Manage material ordering and delivery logistics",
      "Conduct quality inspections and punch list management",
      "Communicate project status to clients weekly",
    ],
  },
  {
    title: "Design Assistant",
    slug: "design-assistant",
    pay: "$22 - $35 / hour",
    type: "FULL_TIME",
    description:
      "Support senior designers with material sourcing, sample management, showroom visits, client presentation preparation, and on-site styling. An excellent entry point into the NYC interior design industry with mentorship from experienced designers.",
    requirements: [
      "1+ year of interior design or related experience",
      "Bachelor's degree in Interior Design or related field preferred",
      "Familiarity with design software (SketchUp, AutoCAD, or similar)",
      "Strong organizational skills and attention to detail",
      "Knowledge of furniture, textiles, and material sources",
      "Interest in NYC architecture and design trends",
    ],
    responsibilities: [
      "Research and source materials, finishes, and furniture",
      "Manage sample library and coordinate sample deliveries",
      "Prepare mood boards and client presentations",
      "Assist with on-site measurements and photography",
      "Coordinate deliveries and installations with vendors",
      "Support senior designers during client meetings",
    ],
  },
  {
    title: "Home Stager / Stylist",
    slug: "home-stager",
    pay: "$25 - $40 / hour",
    type: "FULL_TIME",
    description:
      "Stage and style NYC properties for real estate sales, photography, and client installations. Create aspirational spaces that photograph beautifully using furniture rental inventory, accessories, and art. Navigate freight elevators, building schedules, and tight NYC spaces.",
    requirements: [
      "2+ years of home staging, styling, or visual merchandising",
      "Strong eye for composition, color, and spatial arrangement",
      "Knowledge of NYC real estate market and buyer preferences",
      "Experience working in NYC buildings (freight elevators, schedules)",
      "Physical ability to move furniture and accessories",
      "Portfolio of staged properties",
    ],
    responsibilities: [
      "Stage vacant and occupied properties for real estate listings",
      "Style rooms for photography and open house events",
      "Select and arrange furniture, art, and accessories",
      "Coordinate furniture rental deliveries and pickups",
      "Install final accessories for completed design projects",
      "Handle post-sale de-staging and furniture returns",
    ],
  },
  {
    title: "Procurement Specialist",
    slug: "procurement-specialist",
    pay: "$50,000 - $75,000 / year",
    type: "FULL_TIME",
    description:
      "Source, order, and manage delivery of furniture, materials, and fixtures for interior design projects. Coordinate ordering, tracking, delivery scheduling, and building logistics across multiple concurrent projects throughout NYC.",
    requirements: [
      "2+ years of procurement, purchasing, or logistics experience",
      "Experience with interior design trade vendors preferred",
      "Strong organizational skills and attention to detail",
      "Proficiency in spreadsheets and procurement software",
      "Knowledge of NYC delivery logistics and building requirements",
      "Excellent negotiation and communication skills",
    ],
    responsibilities: [
      "Source and procure furniture, materials, and fixtures per specifications",
      "Manage relationships with trade vendors and showrooms",
      "Process purchase orders and track order status",
      "Coordinate delivery logistics including building schedules",
      "Inspect received items for quality and accuracy",
      "Negotiate pricing and payment terms with vendors",
    ],
  },
  {
    title: "Client Relations Coordinator",
    slug: "client-relations",
    pay: "$20 - $32 / hour",
    type: "FULL_TIME",
    description:
      "Serve as the primary point of contact between our design team and clients. Manage scheduling, communications, follow-ups, and administrative tasks that keep projects running smoothly. Be the voice of our brand for every client interaction.",
    requirements: [
      "1+ years of client-facing or administrative experience",
      "Exceptional verbal and written communication skills",
      "Strong organizational skills and attention to detail",
      "Proficiency in CRM software and Google Workspace",
      "Professional phone manner and email etiquette",
      "Interest in interior design and the NYC market",
    ],
    responsibilities: [
      "Manage client communications, calls, and scheduling",
      "Coordinate initial consultations and follow-up meetings",
      "Maintain CRM records and client project files",
      "Prepare design proposals, contracts, and invoices",
      "Follow up on leads and nurture prospective clients",
      "Support marketing efforts and social media",
    ],
  },
];

const benefits = [
  { icon: "\u{1F4B0}", title: "Competitive Pay", desc: "Industry-leading wages with raises based on performance and project success" },
  { icon: "\u{1F3E5}", title: "Health Benefits", desc: "Medical, dental, and vision insurance for full-time employees after 90 days" },
  { icon: "\u{1F334}", title: "Paid Time Off", desc: "Paid holidays, vacation days, and sick leave that increase with tenure" },
  { icon: "\u{1F4DA}", title: "Training & Growth", desc: "Paid certifications, showroom training, and clear paths to senior design roles" },
  { icon: "\u{1F3E0}", title: "Trade Access", desc: "Access to exclusive trade showrooms, designer pricing, and vendor relationships" },
  { icon: "\u{1F4BB}", title: "Tools Provided", desc: "Design software licenses, company laptop, and professional development budget" },
  { icon: "\u{1F4AA}", title: "Team Culture", desc: "Collaborative creative environment where talent is recognized and rewarded" },
  { icon: "\u{1F310}", title: "NYC Coverage", desc: "Work across diverse neighborhoods and property types — no two projects are the same" },
];

const today = new Date().toISOString().split("T")[0];
const validThrough = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

function buildJobPostingSchema(pos: (typeof positions)[number]) {
  const isYearly = pos.pay.includes("year");
  const nums = pos.pay.match(/[\d,]+/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10)) ?? [0, 0];

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: pos.title,
    description: pos.description,
    datePosted: today,
    validThrough,
    employmentType: pos.type,
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_DOMAIN,
      logo: `${SITE_DOMAIN}/logo.png`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: "150 W 47th St",
        addressLocality: "New York",
        addressRegion: "NY",
        postalCode: "10036",
        addressCountry: "US",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: nums[0],
        maxValue: nums[1],
        unitText: isYearly ? "YEAR" : "HOUR",
      },
    },
    qualifications: pos.requirements.join("; "),
    responsibilities: pos.responsibilities.join("; "),
  };
}

export default function CareersPage() {
  const boroughs = getAllBoroughs();

  const crumbs = [
    { name: "Home", url: SITE_DOMAIN },
    { name: "Careers", url: `${SITE_DOMAIN}/careers` },
  ];

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {positions.map((pos) => (
        <JsonLd key={pos.slug} data={buildJobPostingSchema(pos)} />
      ))}

      {/* Hero */}
      <section className="relative bg-gray-800 text-white">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-200">
            Now Hiring
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl leading-tight">
            Interior Design Jobs in NYC
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            Join the {SITE_NAME} team. We are hiring skilled designers, project managers, and
            specialists across all five boroughs, Long Island, Westchester, and New Jersey. Competitive
            pay, benefits, and year-round work.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#positions"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-800 shadow-lg transition hover:bg-blue-50"
            >
              View Open Positions
            </a>
            <Link
              href="/apply"
              className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Why Work With {SITE_NAME}?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            We invest in our people because great design starts with a great team.
            Here is what you get when you join us.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-blue-100 bg-blue-50/40 p-6 text-center"
              >
                <span className="text-3xl">{b.icon}</span>
                <h3 className="mt-3 font-bold text-gray-900">{b.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Open Positions
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            We are actively hiring for the following roles across New York City. Click any
            position to learn more, or scroll down to find openings in your borough.
          </p>
          <div className="mt-12 space-y-6">
            {positions.map((pos) => (
              <div
                key={pos.slug}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{pos.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-blue-600 font-semibold">{pos.pay}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Full-Time
                      </span>
                      <span>New York City</span>
                    </div>
                  </div>
                  <Link
                    href="/apply"
                    className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    Apply Now
                  </Link>
                </div>
                <p className="mt-4 text-gray-600">{pos.description}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Requirements</h4>
                    <ul className="mt-2 space-y-1">
                      {pos.requirements.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Responsibilities</h4>
                    <ul className="mt-2 space-y-1">
                      {pos.responsibilities.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hiring by Borough */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Find Jobs by Borough
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            We have teams and open positions across the entire NYC metro area. Select your
            borough to see neighborhood-specific openings.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boroughs.map((b) => (
              <Link
                key={b.slug}
                href={`/careers/${b.slug}`}
                className="group rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition">
                  {b.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {b.count} neighborhoods hiring
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  View openings &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="bg-blue-600 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Apply?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-300">
            Upload your resume and share your portfolio. Tell us which position interests you,
            your experience, and which borough you prefer to work in. We review every application
            and respond within 48 hours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/apply"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              Apply Now
            </Link>
            <a
              href={PHONE_HREF}
              className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Call {PHONE}
            </a>
          </div>
          <p className="mt-6 text-sm text-blue-200">
            {SITE_NAME} is an equal opportunity employer. We celebrate diversity and are
            committed to creating an inclusive environment for all employees.
          </p>
        </div>
      </section>

      {/* Breadcrumb Nav */}
      <nav className="bg-gray-50 py-4" aria-label="Breadcrumb">
        <div className="mx-auto max-w-6xl px-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li className="font-medium text-gray-900">Careers</li>
          </ol>
        </div>
      </nav>
    </>
  );
}
