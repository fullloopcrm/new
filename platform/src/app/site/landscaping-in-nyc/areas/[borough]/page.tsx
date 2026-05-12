// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllBoroughs,
  getAreasByBorough,
  getAreaUrl,
  getBoroughUrl,
  getServiceUrl,
  services,
  SITE_DOMAIN,
  SITE_NAME,
  PHONE,
  SMS_HREF,
} from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

interface Props {
  params: Promise<{ borough: string }>;
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough } = await params;
  const neighborhoods = getAreasByBorough(borough);
  if (neighborhoods.length === 0) return {};

  const boroughName = neighborhoods[0].borough;
  return {
    title: `Landscaping in ${boroughName} — ${neighborhoods.length} Neighborhoods, Services & Tips`,
    description: `Professional landscaping in ${boroughName}. ${neighborhoods.length} neighborhoods with local guides, 18 services, and expert crews. Free estimates available.`,
    alternates: { canonical: `${SITE_DOMAIN}${getBoroughUrl(borough)}` },
  };
}

export default async function BoroughPage({ params }: Props) {
  const { borough } = await params;
  const neighborhoods = getAreasByBorough(borough);
  if (neighborhoods.length === 0) notFound();

  const boroughName = neighborhoods[0].borough;
  const sorted = [...neighborhoods].sort((a, b) => a.name.localeCompare(b.name));
  const boroughUrl = `${SITE_DOMAIN}${getBoroughUrl(borough)}`;

  const featuredNeighborhoods = sorted.slice(0, 5);

  const boroughDescriptions: Record<string, string> = {
    manhattan:
      "Manhattan landscaping is all about maximizing limited space. From rooftop terraces with skyline views to intimate townhouse gardens and building entrance plantings, our Manhattan crews specialize in creating stunning outdoor environments in the most challenging urban settings. We handle everything from DOB permits to co-op board approvals.",
    brooklyn:
      "Brooklyn has become one of the most exciting landscaping markets in NYC. Brownstone backyards, community gardens, green roofs, and modern outdoor living spaces are transforming neighborhoods from Park Slope to Williamsburg. Our Brooklyn teams understand the unique character of each neighborhood and design landscapes that complement the local architecture.",
    queens:
      "Queens offers the most diverse residential landscaping opportunities in NYC. From the tree-lined streets of Forest Hills to the waterfront properties of Astoria, Queens homeowners enjoy larger lots and more outdoor space than most of the city. Our Queens crews deliver full-service lawn care, garden design, and hardscape installation.",
    bronx:
      "The Bronx is home to some of NYC's most beautiful residential neighborhoods, from the grand estates of Riverdale to the waterfront charm of City Island. Our Bronx landscaping teams provide comprehensive grounds maintenance, tree care, and property beautification services tailored to the borough's unique mix of urban and suburban settings.",
    "staten-island":
      "Staten Island's suburban character means larger properties, bigger yards, and more extensive landscaping projects. From Todt Hill's hilltop estates to Tottenville's waterfront properties, our Staten Island crews handle everything from complete landscape installations to year-round maintenance programs.",
    "long-island":
      "Long Island is home to some of the most prestigious residential properties in the New York metro area. From the Gold Coast estates of the North Shore to the beach communities of the South Shore, our Long Island teams deliver luxury landscape design, installation, and maintenance at the highest level.",
    westchester:
      "Westchester County combines suburban elegance with proximity to Manhattan, making it one of the most desirable residential markets in the region. Our Westchester landscaping teams specialize in estate-level design, large property management, and creating outdoor living spaces that match the area's sophisticated aesthetic.",
  };

  const boroughHighlights: Record<string, { label: string; value: string }[]> = {
    manhattan: [
      { label: "Specialty", value: "Rooftop Gardens" },
      { label: "Avg Project", value: "$15K-$75K" },
      { label: "Top Service", value: "Container Design" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    brooklyn: [
      { label: "Specialty", value: "Brownstone Yards" },
      { label: "Avg Project", value: "$8K-$45K" },
      { label: "Top Service", value: "Garden Design" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    queens: [
      { label: "Specialty", value: "Full Lawn Care" },
      { label: "Avg Project", value: "$5K-$30K" },
      { label: "Top Service", value: "Maintenance Plans" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    bronx: [
      { label: "Specialty", value: "Tree & Shrub Care" },
      { label: "Avg Project", value: "$4K-$25K" },
      { label: "Top Service", value: "Property Cleanup" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    "staten-island": [
      { label: "Specialty", value: "Large Properties" },
      { label: "Avg Project", value: "$6K-$35K" },
      { label: "Top Service", value: "Hardscaping" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    "long-island": [
      { label: "Specialty", value: "Estate Landscaping" },
      { label: "Avg Project", value: "$10K-$80K" },
      { label: "Top Service", value: "Outdoor Living" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    westchester: [
      { label: "Specialty", value: "Luxury Landscapes" },
      { label: "Avg Project", value: "$12K-$60K" },
      { label: "Top Service", value: "Design & Build" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
  };

  const boroughFaqs = [
    {
      question: `What landscaping services are available in ${boroughName}?`,
      answer: `We offer all 18 of our professional landscaping services in ${boroughName}, including landscape design, rooftop gardens, irrigation systems, lawn maintenance, hardscape installation, tree and shrub care, seasonal plantings, snow removal, and more. Each service is tailored to the unique conditions and property types found in ${boroughName} neighborhoods.`,
    },
    {
      question: `How much does landscaping cost in ${boroughName}?`,
      answer: `Landscaping costs in ${boroughName} vary based on the scope of work, property size, and materials selected. Basic maintenance plans start around $200-$500/month, while full landscape design and installation projects typically range from $5,000 to $75,000+. We provide free estimates for all ${boroughName} projects — contact us for an accurate quote tailored to your property.`,
    },
    {
      question: `Do you serve all neighborhoods in ${boroughName}?`,
      answer: `Yes — we serve all ${neighborhoods.length} neighborhoods listed on this page, plus surrounding areas within ${boroughName}. If your specific neighborhood isn't listed, we still likely cover it. Contact us at ${PHONE} to confirm service availability for your address.`,
    },
    {
      question: `How do I get started with landscaping in ${boroughName}?`,
      answer: `Getting started is easy: (1) Browse our ${neighborhoods.length} ${boroughName} neighborhood pages to see services available near you, (2) Contact us for a free on-site consultation and estimate, (3) We'll design a custom plan for your property, (4) Our crews handle installation and ongoing maintenance. Most consultations are scheduled within 48 hours.`,
    },
    {
      question: `Do you offer year-round maintenance in ${boroughName}?`,
      answer: `Absolutely. Our ${boroughName} maintenance programs cover all four seasons: spring cleanup and planting, summer lawn care and garden maintenance, fall leaf removal and winterization, and winter snow removal. We offer weekly, biweekly, and monthly service frequencies with customizable plans for residential and commercial properties.`,
    },
    {
      question: `Can you handle permits and co-op/condo board approvals in ${boroughName}?`,
      answer: `Yes — our team regularly coordinates with NYC DOB for permits on retaining walls, fences, and structural rooftop installations. We also prepare professional presentation packages for co-op and condo board approvals, including detailed plans, material specifications, and insurance documentation. This is especially common for our Manhattan and Brooklyn rooftop and terrace projects.`,
    },
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} — ${boroughName} Landscaping`,
    description: `Professional landscaping services for ${neighborhoods.length} neighborhoods in ${boroughName}. Design, installation, and maintenance.`,
    url: boroughUrl,
    telephone: "+1-212-470-9637",
    areaServed: {
      "@type": "AdministrativeArea",
      name: boroughName,
    },
    parentOrganization: {
      "@id": `${SITE_DOMAIN}/#organization`,
    },
    serviceType: "Landscaping",
    priceRange: "$$-$$$$",
  };

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Landscaping in ${boroughName}`,
          `Professional landscaping for ${neighborhoods.length} neighborhoods in ${boroughName}. 18 services available.`,
          boroughUrl
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Areas", url: `${SITE_DOMAIN}/areas` },
          { name: boroughName, url: boroughUrl },
        ])}
      />
      <JsonLd data={faqSchema(boroughFaqs)} />
      <JsonLd data={localBusinessSchema} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-20 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full border border-green-300/40 bg-green-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green-200 font-cta">
            {neighborhoods.length} Neighborhoods &bull; 18 Landscaping Services &bull; Updated 2026
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Landscaping in <span className="text-green-200">{boroughName}</span> — Professional Outdoor Services for {neighborhoods.length} Neighborhoods
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            {boroughDescriptions[borough] || `Professional landscaping services across ${neighborhoods.length} neighborhoods in ${boroughName}. Our experienced crews deliver landscape design, installation, and year-round maintenance tailored to the unique character of ${boroughName} properties.`}
            {" "}Browse our <Link href="/services" className="text-green-200 underline underline-offset-2 hover:text-white">18 landscaping services</Link> or call <a href={SMS_HREF} className="text-green-200 underline underline-offset-2 hover:text-white">{PHONE}</a> for a free estimate.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={SMS_HREF} className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg hover:bg-green-50 font-cta">
              {PHONE} | Text Us
            </a>
            <Link href="/contact" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Estimate
            </Link>
            <Link href="/services" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              All 18 Services
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      {boroughHighlights[borough] && (
        <section className="bg-section-green py-12">
          <div className="mx-auto max-w-4xl px-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {boroughHighlights[borough].map((stat, i) => (
                <div key={i} className="rounded-xl border border-green-200/60 bg-white p-5 text-center shadow-sm">
                  <p className="text-2xl font-bold text-green-700 font-heading">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Neighborhoods */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Featured {boroughName} Neighborhoods
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our most active service areas in {boroughName}. Click any neighborhood for a full guide with all 18 landscaping services tailored to that area.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {featuredNeighborhoods.map((area) => (
              <Link key={area.slug} href={getAreaUrl(area)}>
                <div className="group rounded-xl border border-green-200/60 bg-white p-4 text-center transition-all hover:border-green-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-green-600 font-heading">{area.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Neighborhoods */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            All {neighborhoods.length} Neighborhoods in {boroughName}
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Full landscaping services available in every neighborhood listed below. Click for local guides and service details.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((area) => (
              <Link key={area.slug} href={getAreaUrl(area)}>
                <div className="group flex items-center justify-between rounded-xl border border-green-200/60 bg-white p-4 transition-all hover:border-green-400 hover:shadow-md">
                  <div>
                    <p className="text-base font-bold text-slate-900 group-hover:text-green-600 font-heading">
                      {area.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">18 services available</p>
                  </div>
                  <span className="text-green-400 group-hover:text-green-600 text-lg">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Services Available */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            18 Landscaping Services in {boroughName}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every {boroughName} neighborhood has access to our full suite of professional landscaping services. Click any service to learn more, or browse a specific neighborhood to see service + area combination pages.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getServiceUrl(service)}>
                <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-green-400 hover:shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                    <span className="text-green-600 text-sm font-bold">&rarr;</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-green-700">{service.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About Landscaping in {boroughName}
          </h2>
          <div className="mt-8 space-y-4">
            {boroughFaqs.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-green-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-green-700 font-heading">
                  {faq.question}
                </summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-green-700 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Transform Your {boroughName} Property?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free estimate for any of our 18 landscaping services. Our {boroughName} crews are ready to bring your outdoor vision to life.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg hover:bg-green-50 font-cta">
              {PHONE} | Text Us
            </a>
            <Link href="/contact" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Get a Free Estimate
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
