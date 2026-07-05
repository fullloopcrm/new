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
  EMAIL,
} from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, breadcrumbSchema, organizationSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

interface Props {
  params: Promise<{ borough: string }>;
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough } = await params;
  const neighborhoods = getAreasByBorough(borough);
  if (neighborhoods.length === 0) return {};

  const boroughName = neighborhoods[0].borough;
  return {
    title: `Landscaping Jobs in ${boroughName} — Hiring Landscapers in ${boroughName}`,
    description: `Now hiring landscapers, designers, irrigation technicians, tree care specialists, and crew leaders in ${boroughName}. ${neighborhoods.length} neighborhoods with open positions. Competitive pay and benefits from ${SITE_NAME}.`,
    keywords: [
      `landscaping jobs ${boroughName}`,
      `hiring landscapers ${boroughName}`,
      `landscaper jobs ${boroughName}`,
      `landscape careers ${boroughName}`,
      `${boroughName} landscaping employment`,
    ],
    alternates: { canonical: `${SITE_DOMAIN}/careers/${borough}` },
    openGraph: {
      title: `Landscaping Jobs in ${boroughName} — Now Hiring`,
      description: `Join ${SITE_NAME} in ${boroughName}. Open positions for landscapers, designers, and specialists across ${neighborhoods.length} neighborhoods.`,
      url: `${SITE_DOMAIN}/careers/${borough}`,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

const boroughDescriptions: Record<string, string> = {
  manhattan:
    "Manhattan offers some of the most unique landscaping work in the world. From rooftop terraces overlooking Central Park to brownstone courtyard gardens in the West Village, our Manhattan crews tackle creative challenges every day. If you thrive in fast-paced urban environments and enjoy transforming tight spaces into green retreats, Manhattan is your borough.",
  brooklyn:
    "Brooklyn is booming with landscaping opportunities. Brownstone backyards, green roofs, community garden projects, and new residential developments keep our Brooklyn crews busy year-round. The borough's diverse architecture and neighborhood character mean every project is different. Experienced landscapers love working in Brooklyn for the variety and creativity.",
  queens:
    "Queens offers the most diverse range of residential landscaping work in NYC. Larger lots, suburban-style yards, and a mix of property types from Astoria's row houses to Forest Hills' Tudor estates give our crews exposure to a wide range of projects. Queens is ideal for landscapers who enjoy both lawn care and full-scale installations.",
  bronx:
    "The Bronx combines urban and suburban landscaping opportunities. From the grand properties of Riverdale to the emerging green spaces of the South Bronx, our crews handle everything from estate maintenance to community beautification projects. Bronx positions are great for landscapers who want variety and meaningful neighborhood impact.",
  "staten-island":
    "Staten Island offers the closest thing to suburban landscaping within NYC city limits. Larger yards, more lawn space, and an active homeowner community mean consistent, high-quality work for our crews. If you prefer traditional residential landscaping with room to work, Staten Island positions are an excellent fit.",
  "long-island":
    "Long Island is home to some of the most prestigious residential properties in the region. Estate-level landscape maintenance, luxury installations, and high-end design work define our Long Island operations. These positions suit experienced landscapers who take pride in delivering premium results for discerning clients.",
  westchester:
    "Westchester combines suburban elegance with proximity to NYC, attracting homeowners who invest heavily in their outdoor spaces. Our Westchester crews handle large-scale design projects, estate maintenance, and seasonal programs for beautiful properties from Scarsdale to Tarrytown. Ideal for landscapers seeking year-round, high-quality work.",
};

const boroughPositions: Record<string, { title: string; pay: string; type: string }[]> = {
  manhattan: [
    { title: "Rooftop Garden Specialist", pay: "$22-$32/hr", type: "Full-Time" },
    { title: "Landscape Designer", pay: "$55K-$85K/yr", type: "Full-Time" },
    { title: "Container Garden Technician", pay: "$18-$26/hr", type: "Full-Time" },
    { title: "Irrigation Technician", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Snow Removal Crew", pay: "$20-$30/hr", type: "Seasonal" },
    { title: "Crew Leader / Foreman", pay: "$28-$42/hr", type: "Full-Time" },
  ],
  brooklyn: [
    { title: "Landscaper / Landscape Technician", pay: "$18-$28/hr", type: "Full-Time" },
    { title: "Landscape Designer", pay: "$55K-$85K/yr", type: "Full-Time" },
    { title: "Hardscape Installer", pay: "$20-$30/hr", type: "Full-Time" },
    { title: "Tree Care Specialist", pay: "$20-$32/hr", type: "Full-Time" },
    { title: "Snow Removal Crew", pay: "$20-$30/hr", type: "Seasonal" },
    { title: "Crew Leader / Foreman", pay: "$28-$42/hr", type: "Full-Time" },
  ],
  queens: [
    { title: "Landscaper / Landscape Technician", pay: "$18-$28/hr", type: "Full-Time" },
    { title: "Lawn Care Specialist", pay: "$18-$26/hr", type: "Full-Time" },
    { title: "Irrigation Technician", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Tree Care Specialist", pay: "$20-$32/hr", type: "Full-Time" },
    { title: "Snow Removal Crew", pay: "$20-$30/hr", type: "Seasonal" },
    { title: "Crew Leader / Foreman", pay: "$28-$42/hr", type: "Full-Time" },
  ],
  bronx: [
    { title: "Landscaper / Landscape Technician", pay: "$18-$28/hr", type: "Full-Time" },
    { title: "Tree Care Specialist", pay: "$20-$32/hr", type: "Full-Time" },
    { title: "Lawn & Garden Maintenance Tech", pay: "$18-$26/hr", type: "Full-Time" },
    { title: "Irrigation Technician", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Snow Removal Crew", pay: "$20-$30/hr", type: "Seasonal" },
    { title: "Crew Leader / Foreman", pay: "$28-$42/hr", type: "Full-Time" },
  ],
  "staten-island": [
    { title: "Landscaper / Landscape Technician", pay: "$18-$28/hr", type: "Full-Time" },
    { title: "Lawn Care Specialist", pay: "$18-$26/hr", type: "Full-Time" },
    { title: "Hardscape Installer", pay: "$20-$30/hr", type: "Full-Time" },
    { title: "Irrigation Technician", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Snow Removal Crew", pay: "$20-$30/hr", type: "Seasonal" },
    { title: "Crew Leader / Foreman", pay: "$28-$42/hr", type: "Full-Time" },
  ],
  "long-island": [
    { title: "Landscaper / Landscape Technician", pay: "$18-$28/hr", type: "Full-Time" },
    { title: "Landscape Designer", pay: "$55K-$85K/yr", type: "Full-Time" },
    { title: "Irrigation Technician", pay: "$22-$35/hr", type: "Full-Time" },
    { title: "Tree Care Specialist", pay: "$20-$32/hr", type: "Full-Time" },
    { title: "Snow Removal Crew", pay: "$20-$30/hr", type: "Seasonal" },
    { title: "Crew Leader / Foreman", pay: "$28-$42/hr", type: "Full-Time" },
  ],
  westchester: [
    { title: "Landscaper / Landscape Technician", pay: "$18-$28/hr", type: "Full-Time" },
    { title: "Landscape Designer", pay: "$55K-$85K/yr", type: "Full-Time" },
    { title: "Estate Grounds Maintenance Lead", pay: "$25-$38/hr", type: "Full-Time" },
    { title: "Tree Care Specialist", pay: "$20-$32/hr", type: "Full-Time" },
    { title: "Snow Removal Crew", pay: "$20-$30/hr", type: "Seasonal" },
    { title: "Crew Leader / Foreman", pay: "$28-$42/hr", type: "Full-Time" },
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
  const desc = boroughDescriptions[borough] ?? `Join our landscaping team in ${boroughName}. We are hiring across ${neighborhoods.length} neighborhoods with competitive pay and benefits.`;
  const positions = boroughPositions[borough] ?? boroughPositions.brooklyn;

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
      employmentType: pos.type === "Seasonal" ? "TEMPORARY" : "FULL_TIME",
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
      <section className="relative bg-green-700 text-white">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-24 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200">
            Now Hiring in {boroughName}
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl leading-tight">
            Landscaping Jobs in {boroughName}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-green-100">
            {SITE_NAME} is hiring across {neighborhoods.length} neighborhoods in{" "}
            {boroughName}. Competitive pay, benefits, and room to grow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#positions"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-green-700 shadow-lg transition hover:bg-green-50"
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
            <div className="rounded-lg bg-green-50 p-5 text-center">
              <p className="text-3xl font-bold text-green-700">{neighborhoods.length}</p>
              <p className="mt-1 text-sm text-gray-600">Neighborhoods</p>
            </div>
            <div className="rounded-lg bg-green-50 p-5 text-center">
              <p className="text-3xl font-bold text-green-700">{positions.length}</p>
              <p className="mt-1 text-sm text-gray-600">Open Positions</p>
            </div>
            <div className="rounded-lg bg-green-50 p-5 text-center">
              <p className="text-3xl font-bold text-green-700">Year-Round</p>
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
                <p className="mt-2 text-lg font-semibold text-green-600">{pos.pay}</p>
                <span className="mt-2 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  {pos.type}
                </span>
                <div className="mt-4">
                  <Link
                    href="/apply"
                    className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
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
            Select a neighborhood to see specific openings and learn about landscaping work
            in that area.
          </p>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((n) => (
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

      {/* CTA */}
      <section className="bg-green-600 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to Join Our {boroughName} Team?
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
        </div>
      </section>

      {/* Internal Links */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/careers" className="text-green-600 hover:text-green-700 transition font-medium">
              All NYC Careers
            </Link>
            {getAllBoroughs()
              .filter((b) => b.slug !== borough)
              .map((b) => (
                <Link
                  key={b.slug}
                  href={`/careers/${b.slug}`}
                  className="text-green-600 hover:text-green-700 transition"
                >
                  {b.name} Jobs
                </Link>
              ))}
            <Link href={`/areas/${borough}`} className="text-green-600 hover:text-green-700 transition">
              {boroughName} Landscaping Services
            </Link>
            <Link href="/estimate" className="text-green-600 hover:text-green-700 transition">
              Free Estimate
            </Link>
          </div>
        </div>
      </section>

      {/* Breadcrumb Nav */}
      <nav className="bg-white py-4 border-t border-gray-100" aria-label="Breadcrumb">
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
            <li className="font-medium text-gray-900">{boroughName}</li>
          </ol>
        </div>
      </nav>
    </>
  );
}
