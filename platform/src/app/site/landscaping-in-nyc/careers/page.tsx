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
} from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, breadcrumbSchema, organizationSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

export const metadata: Metadata = {
  title: "Landscaping Jobs NYC — Now Hiring Landscapers Across New York City",
  description:
    "Join the Landscaping In NYC team. We are hiring landscapers, designers, irrigation technicians, tree care specialists, and crew leaders across all five boroughs, Long Island, and Westchester. Competitive pay and benefits.",
  keywords: [
    "landscaping jobs NYC",
    "landscaper hiring NYC",
    "landscaping careers New York",
    "landscape technician jobs",
    "hiring landscapers NYC",
    "landscape designer jobs NYC",
    "irrigation technician jobs NYC",
    "tree care jobs NYC",
    "snow removal jobs NYC",
    "crew leader landscaping NYC",
  ],
  alternates: { canonical: `${SITE_DOMAIN}/careers` },
  openGraph: {
    title: "Landscaping Jobs NYC — Now Hiring Landscapers",
    description:
      "Join the Landscaping In NYC team. Competitive pay, benefits, and growth opportunities for landscaping professionals across New York City.",
    url: `${SITE_DOMAIN}/careers`,
    siteName: SITE_NAME,
    type: "website",
  },
};

const positions = [
  {
    title: "Landscaper / Landscape Technician",
    slug: "landscaper",
    pay: "$18 - $28 / hour",
    type: "FULL_TIME",
    description:
      "Perform hands-on landscaping work including planting, mulching, edging, mowing, and garden bed maintenance across NYC properties. Work outdoors year-round with a dedicated crew serving residential and commercial clients.",
    requirements: [
      "1+ year of landscaping or grounds maintenance experience",
      "Ability to operate mowers, trimmers, blowers, and hand tools",
      "Comfortable working outdoors in all seasons",
      "Reliable transportation to job sites across NYC",
      "Valid driver's license preferred",
      "Bilingual (English/Spanish) a plus",
    ],
    responsibilities: [
      "Install plants, shrubs, trees, and ground cover per design plans",
      "Maintain lawns, garden beds, and hardscape areas",
      "Operate and maintain landscaping equipment safely",
      "Load and unload materials and equipment from trucks",
      "Follow crew leader instructions and project schedules",
      "Maintain a clean and safe work environment",
    ],
  },
  {
    title: "Landscape Designer",
    slug: "designer",
    pay: "$55,000 - $85,000 / year",
    type: "FULL_TIME",
    description:
      "Create custom landscape designs for residential and commercial properties across NYC. Work with clients from concept through installation, producing detailed plans, plant palettes, and 3D renderings for projects ranging from brownstone backyards to rooftop terraces.",
    requirements: [
      "Bachelor's degree in Landscape Architecture, Horticulture, or related field",
      "3+ years of landscape design experience in an urban market",
      "Proficiency in AutoCAD, SketchUp, and Adobe Creative Suite",
      "Strong knowledge of Northeast-adapted plants and materials",
      "Excellent client communication and presentation skills",
      "Portfolio of completed residential and/or commercial projects",
    ],
    responsibilities: [
      "Conduct on-site consultations and property assessments",
      "Develop concept plans, planting plans, and construction documents",
      "Create 3D renderings and presentation packages for clients",
      "Select plants, materials, and hardscape elements appropriate for NYC",
      "Coordinate with installation crews during project build-out",
      "Manage multiple design projects simultaneously",
    ],
  },
  {
    title: "Irrigation Technician",
    slug: "irrigation",
    pay: "$22 - $35 / hour",
    type: "FULL_TIME",
    description:
      "Design, install, repair, and maintain irrigation systems for residential and commercial landscapes throughout NYC. Work with drip systems, spray zones, smart controllers, and backflow prevention devices across rooftops, gardens, and large properties.",
    requirements: [
      "2+ years of irrigation installation and repair experience",
      "Knowledge of drip, spray, and rotor irrigation systems",
      "Familiarity with smart controllers (Rachio, Hunter, Rain Bird)",
      "Backflow preventer certification preferred",
      "Ability to read and interpret irrigation design plans",
      "Valid NYC driver's license",
    ],
    responsibilities: [
      "Install new irrigation systems per design specifications",
      "Diagnose and repair system leaks, breaks, and controller issues",
      "Perform seasonal winterization and spring startup services",
      "Program and adjust smart controllers for optimal water usage",
      "Install and test backflow prevention devices",
      "Maintain accurate service records for all client systems",
    ],
  },
  {
    title: "Tree Care Specialist",
    slug: "tree-care",
    pay: "$20 - $32 / hour",
    type: "FULL_TIME",
    description:
      "Provide professional tree and shrub care services including pruning, feeding, pest management, and health assessments for properties across New York City. Work with certified arborists to maintain the health and beauty of urban trees in challenging city environments.",
    requirements: [
      "2+ years of tree care or arboriculture experience",
      "ISA Certified Arborist credential preferred",
      "Experience with pruning, cabling, and bracing techniques",
      "Knowledge of common NYC tree species and their care needs",
      "Comfortable working at heights with climbing gear and lifts",
      "Valid driver's license and clean driving record",
    ],
    responsibilities: [
      "Perform structural and aesthetic pruning on trees and large shrubs",
      "Apply deep root fertilization and soil conditioning treatments",
      "Diagnose and treat pest infestations and tree diseases",
      "Conduct tree health assessments and provide written reports",
      "Coordinate with NYC Parks Department when permits are required",
      "Operate bucket trucks, chippers, and chainsaws safely",
    ],
  },
  {
    title: "Snow Removal Crew",
    slug: "snow-removal",
    pay: "$20 - $30 / hour",
    type: "TEMPORARY",
    description:
      "Join our winter snow removal team serving residential and commercial properties across NYC. Work on-call during snow events to clear sidewalks, driveways, parking lots, and building entrances. Seasonal position from November through March with potential for year-round landscaping employment.",
    requirements: [
      "Ability to perform heavy physical labor in cold weather conditions",
      "Reliable transportation and availability for on-call shifts",
      "Experience operating snow plows, salt spreaders, or snow blowers preferred",
      "Must be available within 2 hours of a snow event call",
      "Valid driver's license with clean record",
      "Prior snow removal or landscaping experience a plus",
    ],
    responsibilities: [
      "Shovel and clear snow from sidewalks, steps, and building entrances",
      "Apply salt and ice melt products per property specifications",
      "Operate snow plows and snow blowers on driveways and parking lots",
      "Respond to dispatch calls within the required timeframe",
      "Document completed work and report any property damage",
      "Follow all safety protocols for winter operations",
    ],
  },
  {
    title: "Crew Leader / Foreman",
    slug: "crew-leader",
    pay: "$28 - $42 / hour",
    type: "FULL_TIME",
    description:
      "Lead a landscaping crew of 3-6 team members on installation and maintenance projects across NYC. Manage daily operations, ensure quality standards, coordinate with the office, and mentor junior crew members. This role requires strong leadership, technical landscaping skills, and the ability to manage multiple projects efficiently.",
    requirements: [
      "5+ years of professional landscaping experience",
      "2+ years in a supervisory or crew lead role",
      "Strong knowledge of plants, hardscape materials, and installation techniques",
      "Ability to read and interpret landscape design plans",
      "Valid CDL or willingness to obtain one within 6 months",
      "Bilingual (English/Spanish) strongly preferred",
      "OSHA 10 or 30 certification a plus",
    ],
    responsibilities: [
      "Lead daily crew operations on installation and maintenance sites",
      "Ensure all work meets company quality standards and client expectations",
      "Manage crew schedules, timesheets, and daily progress reports",
      "Coordinate material deliveries and equipment needs with the office",
      "Train and mentor junior landscapers and new hires",
      "Enforce safety protocols and maintain a safe work environment",
      "Communicate project status and issues to management",
    ],
  },
];

const benefits = [
  { icon: "\u{1F4B0}", title: "Competitive Pay", desc: "Industry-leading wages with regular raises based on performance and certifications" },
  { icon: "\u{1F3E5}", title: "Health Benefits", desc: "Medical, dental, and vision insurance for full-time employees after 90 days" },
  { icon: "\u{1F334}", title: "Paid Time Off", desc: "Paid holidays, vacation days, and sick leave that increase with tenure" },
  { icon: "\u{1F4DA}", title: "Training & Growth", desc: "Paid certifications, skills training, and clear paths to crew leader and management roles" },
  { icon: "\u{1F69A}", title: "Company Vehicles", desc: "Crew leaders and senior techs get access to company trucks and equipment" },
  { icon: "\u{2744}\uFE0F}", title: "Year-Round Work", desc: "Landscaping in spring through fall, snow removal and indoor projects in winter" },
  { icon: "\u{1F4AA}", title: "Team Culture", desc: "Supportive crew environment where hard work is recognized and rewarded" },
  { icon: "\u{1F310}", title: "NYC Coverage", desc: "Work across diverse neighborhoods — no two days or job sites are the same" },
];

const today = new Date().toISOString().split("T")[0];
const validThrough = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

function buildJobPostingSchema(pos: typeof positions[number]) {
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
      <section className="relative bg-green-700 text-white">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200">
            Now Hiring
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl leading-tight">
            Landscaping Jobs in NYC
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-green-100">
            Join the {SITE_NAME} team. We are hiring skilled landscapers, designers, and
            specialists across all five boroughs, Long Island, and Westchester. Competitive
            pay, benefits, and year-round work.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#positions"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-green-700 shadow-lg transition hover:bg-green-50"
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
            We invest in our people because great landscaping starts with a great team.
            Here is what you get when you join us.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-green-100 bg-green-50/40 p-6 text-center"
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
                        <span className="text-green-600 font-semibold">{pos.pay}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {pos.type === "TEMPORARY" ? "Seasonal" : "Full-Time"}
                      </span>
                      <span>New York City</span>
                    </div>
                  </div>
                  <Link
                    href="/apply"
                    className="shrink-0 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
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
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
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
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
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
            We have crews and open positions across the entire NYC metro area. Select your
            borough to see neighborhood-specific openings.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boroughs.map((b) => (
              <Link
                key={b.slug}
                href={`/careers/${b.slug}`}
                className="group rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:border-green-300 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition">
                  {b.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {b.count} neighborhoods hiring
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-green-600 group-hover:text-green-700">
                  View openings &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="bg-green-600 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Apply?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-green-100">
            Upload your resume and a short selfie video telling us about yourself. Tell us which
            position interests you, your experience, and which borough you prefer to work in.
            We review every application and respond within 48 hours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/apply"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-green-700 shadow-lg transition hover:bg-green-50"
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
          <p className="mt-6 text-sm text-green-200">
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
              <Link href="/" className="hover:text-green-600 transition">Home</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li className="font-medium text-gray-900">Careers</li>
          </ol>
        </div>
      </nav>
    </>
  );
}
