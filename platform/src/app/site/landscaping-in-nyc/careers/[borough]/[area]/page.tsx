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
  EMAIL,
} from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, breadcrumbSchema, organizationSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

interface Props {
  params: Promise<{ borough: string; area: string }>;
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, area: areaSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  if (!area) return {};

  return {
    title: `Landscaping Jobs in ${area.name}, ${area.borough} — Now Hiring`,
    description: `Now hiring landscapers, designers, irrigation technicians, tree care specialists, and crew leaders in ${area.name}, ${area.borough}. Competitive pay from $18-$42/hr. Apply today with ${SITE_NAME}.`,
    keywords: [
      `landscaping jobs ${area.name}`,
      `landscaper hiring ${area.name} ${area.borough}`,
      `landscape careers ${area.name}`,
      `${area.name} landscaping employment`,
      `hiring landscapers ${area.borough}`,
      `outdoor jobs ${area.name} NYC`,
    ],
    alternates: { canonical: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}` },
    openGraph: {
      title: `Landscaping Jobs in ${area.name}, ${area.borough}`,
      description: `Join ${SITE_NAME} in ${area.name}. 6 open positions with competitive pay and benefits.`,
      url: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}`,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

const positions = [
  {
    title: "Landscaper / Landscape Technician",
    slug: "landscaper",
    payRange: "$18 - $28 / hour",
    payMin: 18,
    payMax: 28,
    unitText: "HOUR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Perform hands-on landscaping work including planting, mulching, edging, mowing, and garden bed maintenance. Work outdoors with a dedicated crew serving residential and commercial clients.",
    qualifications: [
      "1+ year of landscaping or grounds maintenance experience",
      "Ability to operate mowers, trimmers, blowers, and hand tools",
      "Comfortable working outdoors in all seasons",
      "Reliable transportation to job sites",
      "Valid driver's license preferred",
    ],
    responsibilities: [
      "Install plants, shrubs, trees, and ground cover per design plans",
      "Maintain lawns, garden beds, and hardscape areas",
      "Operate and maintain landscaping equipment safely",
      "Load and unload materials and equipment",
      "Follow crew leader instructions and schedules",
    ],
  },
  {
    title: "Landscape Designer",
    slug: "designer",
    payRange: "$55,000 - $85,000 / year",
    payMin: 55000,
    payMax: 85000,
    unitText: "YEAR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Create custom landscape designs for residential and commercial properties. Work with clients from concept through installation, producing detailed plans, plant palettes, and 3D renderings.",
    qualifications: [
      "Bachelor's degree in Landscape Architecture or related field",
      "3+ years of landscape design experience",
      "Proficiency in AutoCAD, SketchUp, and Adobe Suite",
      "Strong knowledge of Northeast-adapted plants",
      "Excellent client communication skills",
    ],
    responsibilities: [
      "Conduct on-site consultations and property assessments",
      "Develop concept plans, planting plans, and construction documents",
      "Create 3D renderings and presentation packages",
      "Select plants and materials appropriate for the area",
      "Coordinate with installation crews during build-out",
    ],
  },
  {
    title: "Irrigation Technician",
    slug: "irrigation",
    payRange: "$22 - $35 / hour",
    payMin: 22,
    payMax: 35,
    unitText: "HOUR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Design, install, repair, and maintain irrigation systems for residential and commercial landscapes. Work with drip systems, spray zones, smart controllers, and backflow prevention devices.",
    qualifications: [
      "2+ years of irrigation installation and repair experience",
      "Knowledge of drip, spray, and rotor systems",
      "Familiarity with smart controllers (Rachio, Hunter, Rain Bird)",
      "Backflow preventer certification preferred",
      "Valid driver's license",
    ],
    responsibilities: [
      "Install new irrigation systems per design specifications",
      "Diagnose and repair leaks, breaks, and controller issues",
      "Perform seasonal winterization and spring startup",
      "Program smart controllers for optimal water usage",
      "Maintain service records for all client systems",
    ],
  },
  {
    title: "Tree Care Specialist",
    slug: "tree-care",
    payRange: "$20 - $32 / hour",
    payMin: 20,
    payMax: 32,
    unitText: "HOUR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Provide professional tree and shrub care including pruning, feeding, pest management, and health assessments. Work with certified arborists to maintain the health of urban trees.",
    qualifications: [
      "2+ years of tree care or arboriculture experience",
      "ISA Certified Arborist credential preferred",
      "Experience with pruning, cabling, and bracing",
      "Comfortable working at heights with climbing gear",
      "Valid driver's license and clean driving record",
    ],
    responsibilities: [
      "Perform structural and aesthetic pruning",
      "Apply deep root fertilization treatments",
      "Diagnose and treat pest infestations and diseases",
      "Conduct tree health assessments with written reports",
      "Operate bucket trucks, chippers, and chainsaws safely",
    ],
  },
  {
    title: "Snow Removal Crew",
    slug: "snow-removal",
    payRange: "$20 - $30 / hour",
    payMin: 20,
    payMax: 30,
    unitText: "HOUR",
    employmentType: "TEMPORARY",
    typeLabel: "Seasonal (Nov-Mar)",
    description:
      "Join our winter snow removal team serving residential and commercial properties. Work on-call during snow events to clear sidewalks, driveways, parking lots, and building entrances.",
    qualifications: [
      "Ability to perform heavy physical labor in cold weather",
      "Reliable transportation and on-call availability",
      "Experience with snow plows or snow blowers preferred",
      "Available within 2 hours of a snow event call",
      "Prior snow removal or landscaping experience a plus",
    ],
    responsibilities: [
      "Shovel and clear snow from sidewalks, steps, and entrances",
      "Apply salt and ice melt products per specifications",
      "Operate snow plows and snow blowers",
      "Respond to dispatch calls within required timeframe",
      "Document completed work and report any issues",
    ],
  },
  {
    title: "Crew Leader / Foreman",
    slug: "crew-leader",
    payRange: "$28 - $42 / hour",
    payMin: 28,
    payMax: 42,
    unitText: "HOUR",
    employmentType: "FULL_TIME",
    typeLabel: "Full-Time",
    description:
      "Lead a landscaping crew of 3-6 members on installation and maintenance projects. Manage daily operations, ensure quality standards, and mentor junior crew members.",
    qualifications: [
      "5+ years of professional landscaping experience",
      "2+ years in a supervisory or crew lead role",
      "Strong knowledge of plants, materials, and techniques",
      "Ability to read landscape design plans",
      "Bilingual (English/Spanish) strongly preferred",
    ],
    responsibilities: [
      "Lead daily crew operations on job sites",
      "Ensure all work meets quality standards",
      "Manage schedules, timesheets, and progress reports",
      "Train and mentor junior landscapers",
      "Enforce safety protocols on every project",
    ],
  },
];

const neighborhoodWorkDescriptions: Record<string, Record<string, string>> = {
  manhattan: {
    default:
      "Manhattan landscaping work is fast-paced and creative. You will work on rooftop gardens, brownstone courtyards, building entrances, and terrace installations. Every project is unique, and the work environment changes daily as you move between some of the most iconic neighborhoods in the world.",
  },
  brooklyn: {
    default:
      "Brooklyn offers incredible variety for landscapers. One day you might be building a bluestone patio in Park Slope, the next installing a green roof in Williamsburg. Brooklyn crews work with brownstones, townhouses, new developments, and community spaces across the borough.",
  },
  queens: {
    default:
      "Queens provides a mix of suburban-style yards and urban landscaping. Larger lots mean more lawn care, full garden installations, and room for creative hardscape projects. The diverse communities and property types keep the work interesting and challenging.",
  },
  bronx: {
    default:
      "Working in the Bronx means combining urban landscaping skills with suburban property maintenance. From Riverdale's estates to emerging green spaces in the South Bronx, you will handle a wide range of projects that make a real difference in the community.",
  },
  "staten-island": {
    default:
      "Staten Island offers traditional residential landscaping with more space to work. Larger yards, real lawns, and homeowners who invest in their outdoor spaces make this borough ideal for landscapers who enjoy full-scale residential projects.",
  },
  "long-island": {
    default:
      "Long Island landscaping means premium residential work. Estate-level properties, manicured lawns, and clients who expect the best. Our Long Island crews deliver luxury results across the North Shore, South Shore, and everything in between.",
  },
  westchester: {
    default:
      "Westchester offers some of the most beautiful residential properties in the region. Large lots, mature trees, and homeowners who value quality landscaping make Westchester an excellent place to build a landscaping career.",
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
    `${area.name} in ${area.borough} offers excellent landscaping career opportunities. Our crews work on a variety of residential and commercial projects throughout the neighborhood, providing stable employment with competitive pay.`;

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
      <section className="relative bg-green-700 text-white">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-24 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200">
            Now Hiring in {area.name}
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl leading-tight">
            Landscaping Jobs in {area.name}, {area.borough}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-green-100">
            {SITE_NAME} is hiring landscaping professionals in {area.name}. {positions.length}{" "}
            open positions with pay ranging from $18/hr to $85K/year. Apply today.
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

      {/* Why Work in Neighborhood */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Why Work in {area.name}?
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">{workDesc}</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            As a member of our {area.name} crew, you will gain experience across a range of
            landscaping disciplines — from seasonal plantings and lawn maintenance to
            hardscape installations and irrigation systems. {area.name} properties offer the
            kind of varied, hands-on work that helps you build real skills and advance your
            career quickly.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">6</p>
              <p className="text-sm text-gray-600">Open Positions</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">$18-42</p>
              <p className="text-sm text-gray-600">Hourly Pay Range</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">Benefits</p>
              <p className="text-sm text-gray-600">Health, PTO, Training</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">Year-Round</p>
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
                      <span className="font-semibold text-green-600">{pos.payRange}</span>
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {pos.typeLabel}
                      </span>
                      <span>{area.name}, {area.borough}</span>
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
                    <h4 className="font-semibold text-gray-900 text-sm">Qualifications</h4>
                    <ul className="mt-2 space-y-1">
                      {pos.qualifications.map((q) => (
                        <li key={q} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
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

      {/* What You Will Do */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            What Landscaping Work Looks Like in {area.name}
          </h2>
          <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
            <p>
              Our {area.name} crews handle a full range of landscaping services throughout the
              neighborhood. A typical week might include garden bed maintenance at a residential
              property, a hardscape installation for a new patio, irrigation system repairs, and
              seasonal planting rotations. No two days are the same, and the variety is what
              keeps our team members engaged and growing.
            </p>
            <p>
              {area.borough} properties have their own character and challenges. Whether you
              are working with limited urban spaces or larger suburban lots, you will develop
              skills that make you a more versatile and valuable landscaper. Our crew leaders
              mentor newer team members on the job, so you are always learning.
            </p>
            <p>
              We serve both residential and commercial clients in {area.name}, which means you
              will gain experience with homeowner consultations, property management
              coordination, and commercial grounds maintenance. This breadth of experience
              accelerates your career growth and opens doors to leadership roles.
            </p>
          </div>
          <div className="mt-8 rounded-xl border-2 border-dashed border-green-300 bg-green-50/60 p-5">
            <h3 className="font-bold text-green-900">Services You Will Work On</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {services.slice(0, 12).map((s) => (
                <Link
                  key={s.slug}
                  href={getServiceUrl(s)}
                  className="rounded-full bg-white px-3 py-1 text-sm text-green-700 border border-green-200 hover:bg-green-100 transition"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Apply for Landscaping Jobs in {area.name}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-green-100">
            Upload your resume and a short selfie video. We review every application and respond within 48 hours.
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
                className="group rounded-lg border border-gray-200 bg-white px-4 py-3 text-center transition hover:border-green-300 hover:shadow-sm"
              >
                <span className="font-medium text-gray-900 group-hover:text-green-700 transition">
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
            <Link href="/careers" className="text-green-600 hover:text-green-700 transition font-medium">
              All NYC Careers
            </Link>
            <Link href={`/careers/${borough}`} className="text-green-600 hover:text-green-700 transition">
              {area.borough} Jobs
            </Link>
            <Link href={getAreaUrl(area)} className="text-green-600 hover:text-green-700 transition">
              {area.name} Landscaping Services
            </Link>
            <Link href="/services" className="text-green-600 hover:text-green-700 transition">
              All Services
            </Link>
            <Link href="/estimate" className="text-green-600 hover:text-green-700 transition">
              Free Estimate
            </Link>
            <Link href="/contact" className="text-green-600 hover:text-green-700 transition">
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
              <Link href="/" className="hover:text-green-600 transition">Home</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li>
              <Link href="/careers" className="hover:text-green-600 transition">Careers</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li>
              <Link href={`/careers/${borough}`} className="hover:text-green-600 transition">
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
