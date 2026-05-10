// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllBoroughs,
  getAreasByBorough,
  SITE_DOMAIN,
  SITE_NAME,
  PHONE,
  PHONE_HREF,
  SMS_HREF,
  EMAIL,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, breadcrumbSchema, organizationSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

interface Props {
  params: Promise<{ borough: string }>;
}

export async function generateStaticParams() {
  return getAllBoroughs().map((b) => ({ borough: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough } = await params;
  const neighborhoods = getAreasByBorough(borough);
  if (neighborhoods.length === 0) return {};

  const boroughName = neighborhoods[0].borough;
  return {
    title: `Interior Design Jobs in ${boroughName} — Hiring Designers in ${boroughName}`,
    description: `Now hiring interior designers, project managers, design assistants, home stagers, and specialists in ${boroughName}. ${neighborhoods.length} neighborhoods with open positions. Competitive pay and benefits from ${SITE_NAME}.`,
    keywords: [
      `interior design jobs ${boroughName}`,
      `hiring designers ${boroughName}`,
      `designer jobs ${boroughName}`,
      `design careers ${boroughName}`,
      `${boroughName} interior design employment`,
    ],
    alternates: { canonical: `${SITE_DOMAIN}/careers/${borough}` },
    openGraph: {
      title: `Interior Design Jobs in ${boroughName} — Now Hiring`,
      description: `Join ${SITE_NAME} in ${boroughName}. Open positions for designers, project managers, and specialists across ${neighborhoods.length} neighborhoods.`,
      url: `${SITE_DOMAIN}/careers/${borough}`,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

const boroughDescriptions: Record<string, string> = {
  manhattan:
    "Manhattan is the epicenter of NYC interior design. From pre-war co-ops on the Upper East Side to modern condos in Hudson Yards, our Manhattan team tackles the most prestigious and creative projects in the city. If you thrive in high-end residential and commercial design, Manhattan is your borough.",
  brooklyn:
    "Brooklyn offers an incredible range of design work. Brownstone renovations in Park Slope, loft conversions in Williamsburg, new-construction condos in DUMBO, and townhouse restorations in Brooklyn Heights keep our team busy year-round. The borough's diverse architecture and client base make every project unique.",
  queens:
    "Queens provides a diverse mix of residential design opportunities. From the sleek condos of Long Island City to the Tudor homes of Forest Hills, our Queens team works on a wide range of property types. Queens is ideal for designers who enjoy both modern and traditional design challenges.",
  bronx:
    "The Bronx combines urban and suburban design opportunities. From the stately homes of Riverdale to the emerging creative spaces of Mott Haven, our team handles everything from full-home renovations to commercial design projects. Bronx positions offer variety and meaningful community impact.",
  "staten-island":
    "Staten Island offers classic residential design with more space to work. Larger homes, dedicated rooms, and homeowners who invest in quality interiors make Staten Island ideal for designers who enjoy full-scale residential projects with real creative scope.",
  "long-island":
    "Long Island is home to some of the most prestigious residential properties in the region. Estate-level interior design, luxury kitchen renovations, and high-end custom work define our Long Island operations. These positions suit experienced designers who deliver premium results.",
  westchester:
    "Westchester combines suburban elegance with proximity to NYC, attracting homeowners who invest heavily in their interiors. Our Westchester team handles large-scale renovations, estate design, and custom homes from Scarsdale to Tarrytown. Ideal for designers seeking high-quality, sophisticated work.",
  "new-jersey":
    "Northern New Jersey offers excellent design opportunities just across the Hudson. From luxury high-rises in Jersey City and Hoboken to classic homes in Englewood and Fort Lee, our NJ team works on projects that blend city sophistication with suburban comfort.",
};

const boroughPositions: Record<string, { title: string; pay: string; type: string }[]> = {
  manhattan: [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
  brooklyn: [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
  queens: [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
  bronx: [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
  "staten-island": [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
  "long-island": [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
  westchester: [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
  "new-jersey": [
    { title: "Interior Designer", pay: "$55K-$90K/yr", type: "Full-Time" },
    { title: "Project Manager", pay: "$65K-$100K/yr", type: "Full-Time" },
    { title: "Design Assistant", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Home Stager / Stylist", pay: "$25-$40/hr", type: "Full-Time" },
    { title: "Procurement Specialist", pay: "$50K-$75K/yr", type: "Full-Time" },
    { title: "Client Relations Coordinator", pay: "$20-$32/hr", type: "Full-Time" },
  ],
};

const today = new Date().toISOString().split("T")[0];
const validThrough = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

export default async function BoroughCareersPage({ params }: Props) {
  const { borough } = await params;
  const neighborhoods = getAreasByBorough(borough);
  if (neighborhoods.length === 0) notFound();

  const boroughName = neighborhoods[0].borough;
  const sorted = [...neighborhoods].sort((a, b) => a.name.localeCompare(b.name));
  const desc = boroughDescriptions[borough] ?? `Join our interior design team in ${boroughName}. We are hiring across ${neighborhoods.length} neighborhoods with competitive pay and benefits.`;
  const positions = boroughPositions[borough] ?? boroughPositions.manhattan;

  const crumbs = [
    { name: "Home", url: SITE_DOMAIN },
    { name: "Careers", url: `${SITE_DOMAIN}/careers` },
    { name: boroughName, url: `${SITE_DOMAIN}/careers/${borough}` },
  ];

  const jobPostingSchemas = positions.map((pos) => {
    const isYearly = pos.pay.includes("K");
    const nums = pos.pay.match(/\d+/g)?.map(Number) ?? [0, 0];
    const minVal = isYearly ? nums[0] * 1000 : nums[0];
    const maxVal = isYearly ? nums[1] * 1000 : nums[1];

    return {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: pos.title,
      description: `${pos.title} position with ${SITE_NAME} in ${boroughName}, NY. ${pos.pay}. ${pos.type}.`,
      datePosted: today,
      validThrough,
      employmentType: "FULL_TIME",
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
          addressLocality: boroughName,
          addressRegion: "NY",
          addressCountry: "US",
        },
      },
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: {
          "@type": "QuantitativeValue",
          minValue: minVal,
          maxValue: maxVal,
          unitText: isYearly ? "YEAR" : "HOUR",
        },
      },
    };
  });

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
            Now Hiring in {boroughName}
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl leading-tight">
            Interior Design Jobs in {boroughName}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            {SITE_NAME} is hiring across {neighborhoods.length} neighborhoods in{" "}
            {boroughName}. Competitive pay, benefits, and room to grow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#positions"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-800 shadow-lg transition hover:bg-blue-50"
            >
              View {boroughName} Positions
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

      {/* About Working in Borough */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Why Work in {boroughName}?
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">{desc}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-5 text-center">
              <p className="text-3xl font-bold text-blue-700">{neighborhoods.length}</p>
              <p className="mt-1 text-sm text-gray-600">Neighborhoods</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-5 text-center">
              <p className="text-3xl font-bold text-blue-700">{positions.length}</p>
              <p className="mt-1 text-sm text-gray-600">Open Positions</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-5 text-center">
              <p className="text-3xl font-bold text-blue-700">Year-Round</p>
              <p className="mt-1 text-sm text-gray-600">Employment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Positions */}
      <section id="positions" className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Open Positions in {boroughName}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            All positions include competitive pay, health benefits for full-time roles, paid
            training, and opportunities for advancement.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {positions.map((pos, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <h3 className="font-bold text-gray-900">{pos.title}</h3>
                <p className="mt-2 text-lg font-semibold text-blue-600">{pos.pay}</p>
                <span className="mt-2 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {pos.type}
                </span>
                <div className="mt-4">
                  <Link
                    href="/apply"
                    className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhoods Hiring */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Hiring in {neighborhoods.length} {boroughName} Neighborhoods
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Select a neighborhood to see specific openings and learn about design work
            in that area.
          </p>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((n) => (
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

      {/* CTA */}
      <section className="bg-blue-600 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to Join Our {boroughName} Team?
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
        </div>
      </section>

      {/* Internal Links */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/careers" className="text-blue-600 hover:text-blue-700 transition font-medium">
              All NYC Careers
            </Link>
            {getAllBoroughs()
              .filter((b) => b.slug !== borough)
              .map((b) => (
                <Link
                  key={b.slug}
                  href={`/careers/${b.slug}`}
                  className="text-blue-600 hover:text-blue-700 transition"
                >
                  {b.name} Jobs
                </Link>
              ))}
            <Link href={`/areas/${borough}`} className="text-blue-600 hover:text-blue-700 transition">
              {boroughName} Design Services
            </Link>
            <Link href="/get-a-free-consultation" className="text-blue-600 hover:text-blue-700 transition">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>

      {/* Breadcrumb Nav */}
      <nav className="bg-white py-4 border-t border-gray-100" aria-label="Breadcrumb">
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
            <li className="font-medium text-gray-900">{boroughName}</li>
          </ol>
        </div>
      </nav>
    </>
  );
}
