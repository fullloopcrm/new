// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  areas,
  services,
  findAreaBySlug,
  getAreaUrl,
  getAreasByBorough,
  getServiceUrl,
  getAllBoroughs,
  SITE_DOMAIN,
  SITE_NAME,
  PHONE,
  PHONE_HREF,
  SMS_HREF,
  EMAIL,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, breadcrumbSchema, organizationSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

interface Props {
  params: Promise<{ borough: string; area: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, area: areaSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  if (!area) return {};

  return {
    title: `Interior Design Jobs in ${area.name}, ${area.borough} — Now Hiring`,
    description: `Now hiring interior designers, project managers, design assistants, home stagers, and specialists in ${area.name}, ${area.borough}. Competitive pay from $20/hr to $100K/year. Apply today with ${SITE_NAME}.`,
    keywords: [
      `interior design jobs ${area.name}`,
      `designer hiring ${area.name} ${area.borough}`,
      `design careers ${area.name}`,
      `${area.name} interior design employment`,
      `hiring designers ${area.borough}`,
      `design jobs ${area.name} NYC`,
    ],
    alternates: { canonical: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}` },
    openGraph: {
      title: `Interior Design Jobs in ${area.name}, ${area.borough}`,
      description: `Join ${SITE_NAME} in ${area.name}. 6 open positions with competitive pay and benefits.`,
      url: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}`,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

const positions = [
  {
    title: "Interior Designer",
    slug: "interior-designer",
    payRange: "$55,000 - $90,000 / year",
    payMin: 55000,
    payMax: 90000,
    unitText: "YEAR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Create custom interior designs for residential and commercial properties. Work with clients from concept through installation, producing detailed plans, mood boards, and 3D renderings.",
    qualifications: [
      "Bachelor's degree in Interior Design or related field",
      "3+ years of interior design experience",
      "Proficiency in AutoCAD, SketchUp, and/or Revit",
      "Strong knowledge of materials, finishes, and furniture",
      "Excellent client communication skills",
    ],
    responsibilities: [
      "Conduct on-site consultations and space assessments",
      "Develop design concepts, floor plans, and renderings",
      "Select furniture, materials, and finishes",
      "Coordinate with contractors during execution",
      "Manage multiple concurrent projects",
    ],
  },
  {
    title: "Project Manager / Renovation Coordinator",
    slug: "project-manager",
    payRange: "$65,000 - $100,000 / year",
    payMin: 65000,
    payMax: 100000,
    unitText: "YEAR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Manage interior design and renovation projects from planning through completion. Coordinate designers, contractors, vendors, and building management to deliver on time and on budget.",
    qualifications: [
      "4+ years of project management in design or construction",
      "Deep knowledge of NYC renovation logistics",
      "Experience with co-op/condo alteration agreements",
      "Strong organizational and communication skills",
      "NYC renovation experience required",
    ],
    responsibilities: [
      "Manage 5-10 concurrent projects",
      "Coordinate between designers, contractors, and clients",
      "Handle board submissions and DOB permits",
      "Manage material ordering and delivery logistics",
      "Conduct quality inspections and punch lists",
    ],
  },
  {
    title: "Design Assistant",
    slug: "design-assistant",
    payRange: "$22 - $35 / hour",
    payMin: 22,
    payMax: 35,
    unitText: "HOUR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Support senior designers with material sourcing, sample management, showroom visits, client presentation preparation, and on-site styling. Excellent entry point into NYC interior design.",
    qualifications: [
      "1+ year of interior design or related experience",
      "Familiarity with design software",
      "Strong organizational skills and attention to detail",
      "Knowledge of furniture and material sources",
      "Interest in NYC design trends",
    ],
    responsibilities: [
      "Research and source materials and furniture",
      "Manage sample library and deliveries",
      "Prepare mood boards and presentations",
      "Assist with measurements and photography",
      "Support senior designers at client meetings",
    ],
  },
  {
    title: "Home Stager / Stylist",
    slug: "home-stager",
    payRange: "$25 - $40 / hour",
    payMin: 25,
    payMax: 40,
    unitText: "HOUR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Stage and style NYC properties for real estate sales, photography, and client installations. Create aspirational spaces that photograph beautifully using furniture, accessories, and art.",
    qualifications: [
      "2+ years of home staging or styling experience",
      "Strong eye for composition and color",
      "Knowledge of NYC real estate market",
      "Experience in NYC buildings (freight elevators, schedules)",
      "Portfolio of staged properties",
    ],
    responsibilities: [
      "Stage properties for real estate listings",
      "Style rooms for photography and open houses",
      "Select and arrange furniture and accessories",
      "Coordinate furniture rental deliveries",
      "Handle post-sale de-staging",
    ],
  },
  {
    title: "Procurement Specialist",
    slug: "procurement-specialist",
    payRange: "$50,000 - $75,000 / year",
    payMin: 50000,
    payMax: 75000,
    unitText: "YEAR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Source, order, and manage delivery of furniture, materials, and fixtures for design projects. Coordinate ordering, tracking, and building logistics across multiple concurrent projects.",
    qualifications: [
      "2+ years of procurement or logistics experience",
      "Experience with design trade vendors preferred",
      "Strong organizational skills",
      "Knowledge of NYC delivery logistics",
      "Excellent negotiation skills",
    ],
    responsibilities: [
      "Source and procure materials per specifications",
      "Manage vendor relationships and showroom accounts",
      "Process purchase orders and track status",
      "Coordinate delivery and building logistics",
      "Inspect items for quality and accuracy",
    ],
  },
  {
    title: "Client Relations Coordinator",
    slug: "client-relations",
    payRange: "$20 - $32 / hour",
    payMin: 20,
    payMax: 32,
    unitText: "HOUR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Serve as the primary point of contact between our design team and clients. Manage scheduling, communications, and administrative tasks that keep projects running smoothly.",
    qualifications: [
      "1+ years of client-facing experience",
      "Exceptional communication skills",
      "Strong organizational skills",
      "Proficiency in CRM software",
      "Interest in interior design",
    ],
    responsibilities: [
      "Manage client communications and scheduling",
      "Coordinate consultations and meetings",
      "Maintain CRM records and project files",
      "Prepare proposals, contracts, and invoices",
      "Follow up on leads and prospects",
    ],
  },
];

const neighborhoodWorkDescriptions: Record<string, Record<string, string>> = {
  manhattan: {
    default:
      "Manhattan interior design work is fast-paced and prestigious. You will work on co-op renovations, condo transformations, brownstone restorations, and commercial spaces. Every project is unique, and the work environment changes daily as you move between some of the most iconic residences and buildings in the world.",
  },
  brooklyn: {
    default:
      "Brooklyn offers incredible variety for interior designers. One day you might be designing a kitchen in a Park Slope brownstone, the next styling a loft in Williamsburg. Brooklyn teams work with pre-war buildings, new developments, and historic townhouses across the borough.",
  },
  queens: {
    default:
      "Queens provides a diverse mix of design work. From modern condos in Long Island City to traditional homes in Forest Hills, the variety of property types and client preferences keeps the work interesting and creatively challenging.",
  },
  bronx: {
    default:
      "Working in the Bronx means combining classic residential design with emerging creative opportunities. From Riverdale's stately homes to Mott Haven's new developments, you will handle a wide range of projects that make a real difference in the community.",
  },
  "staten-island": {
    default:
      "Staten Island offers residential design work with real creative scope. Larger rooms, dedicated spaces, and homeowners who value quality interiors make this borough ideal for designers who enjoy full-scale residential projects.",
  },
  "long-island": {
    default:
      "Long Island design means premium residential work. Estate-level properties, luxury renovations, and clients who expect the best. Our Long Island team delivers sophisticated results across the North Shore, South Shore, and everything in between.",
  },
  westchester: {
    default:
      "Westchester offers some of the most beautiful residential properties in the region. Large homes, historic architecture, and homeowners who value quality design make Westchester an excellent place to build an interior design career.",
  },
  "new-jersey": {
    default:
      "Northern New Jersey design work combines city sophistication with suburban comfort. From luxury high-rises in Jersey City to elegant homes in Englewood, our NJ team works on diverse and rewarding projects.",
  },
};

const today = new Date().toISOString().split("T")[0];
const validThrough = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

export default async function AreaCareersPage({ params }: Props) {
  const { borough, area: areaSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  if (!area) notFound();

  const nearbyAreas = getAreasByBorough(area.boroughSlug)
    .filter((a) => a.slug !== area.slug)
    .slice(0, 8);

  const canonicalUrl = `${SITE_DOMAIN}/careers/${borough}/${areaSlug}`;
  const workDesc =
    neighborhoodWorkDescriptions[borough]?.[areaSlug] ??
    neighborhoodWorkDescriptions[borough]?.default ??
    `${area.name} in ${area.borough} offers excellent interior design career opportunities. Our team works on a variety of residential and commercial projects throughout the neighborhood, providing stable employment with competitive pay.`;

  const crumbs = [
    { name: "Home", url: SITE_DOMAIN },
    { name: "Careers", url: `${SITE_DOMAIN}/careers` },
    { name: area.borough, url: `${SITE_DOMAIN}/careers/${borough}` },
    { name: area.name, url: canonicalUrl },
  ];

  const jobPostingSchemas = positions.map((pos) => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `${pos.title} - ${area.name}, ${area.borough}`,
    description: `${pos.description} Position located in ${area.name}, ${area.borough}, NY.`,
    datePosted: today,
    validThrough,
    employmentType: pos.employmentType,
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
        addressLocality: area.name,
        addressRegion: "NY",
        addressCountry: "US",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: pos.payMin,
        maxValue: pos.payMax,
        unitText: pos.unitText,
      },
    },
    qualifications: pos.qualifications.join("; "),
    responsibilities: pos.responsibilities.join("; "),
  }));

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {jobPostingSchemas.map((schema, i) => (
        <JsonLd key={i} data={schema} />
      ))}

      {/* Hero */}
      <section className="relative bg-gray-800 text-white">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-24 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-200">
            Now Hiring in {area.name}
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl leading-tight">
            Interior Design Jobs in {area.name}, {area.borough}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            {SITE_NAME} is hiring design professionals in {area.name}. {positions.length}{" "}
            open positions with pay ranging from $20/hr to $100K/year. Apply today.
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

      {/* Why Work in Neighborhood */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Why Work in {area.name}?
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">{workDesc}</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            As a member of our {area.name} team, you will gain experience across a range of
            interior design disciplines — from full-home renovations and kitchen designs to
            staging and commercial spaces. {area.name} properties offer the kind of varied,
            hands-on work that helps you build real skills and advance your career quickly.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">6</p>
              <p className="text-sm text-gray-600">Open Positions</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">$20-100K</p>
              <p className="text-sm text-gray-600">Pay Range</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">Benefits</p>
              <p className="text-sm text-gray-600">Health, PTO, Training</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">Year-Round</p>
              <p className="text-sm text-gray-600">Stable Employment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Open Positions in {area.name}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            All positions include competitive pay, benefits for full-time roles, paid
            training, and advancement opportunities. Work in and around {area.name},{" "}
            {area.borough}.
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
                      <span className="font-semibold text-blue-600">{pos.payRange}</span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {pos.typeLabel}
                      </span>
                      <span>{area.name}, {area.borough}</span>
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
                    <h4 className="font-semibold text-gray-900 text-sm">Qualifications</h4>
                    <ul className="mt-2 space-y-1">
                      {pos.qualifications.map((q) => (
                        <li key={q} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          {q}
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

      {/* Services You Will Work On */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            What Design Work Looks Like in {area.name}
          </h2>
          <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
            <p>
              Our {area.name} team handles a full range of interior design services throughout the
              neighborhood. A typical week might include a kitchen consultation at a residential
              property, a staging installation for a real estate listing, material selections at a
              trade showroom, and a client presentation for a full-home renovation. No two days
              are the same, and the variety keeps our team members engaged and growing.
            </p>
            <p>
              {area.borough} properties have their own character and challenges. Whether you
              are working with pre-war co-ops or modern new construction, you will develop
              skills that make you a more versatile and valuable designer. Our senior designers
              mentor newer team members on the job, so you are always learning.
            </p>
          </div>
          <div className="mt-8 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 p-5">
            <h3 className="font-bold text-blue-900">Services You Will Work On</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {services.slice(0, 12).map((s) => (
                <Link
                  key={s.slug}
                  href={getServiceUrl(s)}
                  className="rounded-full bg-white px-3 py-1 text-sm text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Apply for Design Jobs in {area.name}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-300">
            Upload your resume and share your portfolio. We review every application and respond within 48 hours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={SMS_HREF}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              Text Us
            </a>
            <a
              href={PHONE_HREF}
              className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Call {PHONE}
            </a>
            <Link
              href="/apply"
              className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Apply Now
            </Link>
          </div>
          <p className="mt-6 text-sm text-blue-200">
            {SITE_NAME} is an equal opportunity employer.
          </p>
        </div>
      </section>

      {/* Nearby Neighborhoods */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Also Hiring Nearby in {area.borough}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {nearbyAreas.map((n) => (
              <Link
                key={n.slug}
                href={`/careers/${borough}/${n.slug}`}
                className="group rounded-lg border border-gray-200 bg-white px-4 py-3 text-center transition hover:border-blue-300 hover:shadow-sm"
              >
                <span className="font-medium text-gray-900 group-hover:text-blue-700 transition">
                  {n.name}
                </span>
                <span className="mt-1 block text-xs text-gray-500">View jobs &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="bg-white py-8 border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/careers" className="text-blue-600 hover:text-blue-700 transition font-medium">
              All NYC Careers
            </Link>
            <Link href={`/careers/${borough}`} className="text-blue-600 hover:text-blue-700 transition">
              {area.borough} Jobs
            </Link>
            <Link href={getAreaUrl(area)} className="text-blue-600 hover:text-blue-700 transition">
              {area.name} Design Services
            </Link>
            <Link href="/services" className="text-blue-600 hover:text-blue-700 transition">
              All Services
            </Link>
            <Link href="/get-a-free-consultation" className="text-blue-600 hover:text-blue-700 transition">
              Free Consultation
            </Link>
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 transition">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Breadcrumb Nav */}
      <nav className="bg-gray-50 py-4 border-t border-gray-100" aria-label="Breadcrumb">
        <div className="mx-auto max-w-6xl px-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li>
              <Link href="/careers" className="hover:text-blue-600 transition">Careers</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li>
              <Link href={`/careers/${borough}`} className="hover:text-blue-600 transition">
                {area.borough}
              </Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li className="font-medium text-gray-900">{area.name}</li>
          </ol>
        </div>
      </nav>
    </>
  );
}
