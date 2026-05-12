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
  PHONE_HREF,
  SMS_HREF,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

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
    title: `Interior Design in ${boroughName} — ${neighborhoods.length} Neighborhoods, Services & Tips`,
    description: `Professional interior design in ${boroughName}. ${neighborhoods.length} neighborhoods with local guides, 18 services, and expert designers. Free consultations available.`,
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
      "Manhattan interior design is all about maximizing limited space with impeccable style. From pre-war apartments with original moldings to sleek new-construction condos, our Manhattan designers specialize in creating stunning interiors that work within the most challenging urban footprints. We handle everything from co-op board approvals to custom millwork.",
    brooklyn:
      "Brooklyn has become one of the most exciting interior design markets in NYC. Brownstone renovations, loft conversions, modern townhouse interiors, and creative live-work spaces are transforming neighborhoods from Park Slope to DUMBO. Our Brooklyn team understands the unique character of each neighborhood and designs interiors that complement the local architecture.",
    queens:
      "Queens offers diverse residential design opportunities across a wide range of property types. From the Tudor homes of Forest Hills to the modern condos of Long Island City, Queens homeowners are investing in professional interior design to elevate their living spaces. Our Queens designers deliver full-service design for kitchens, bathrooms, and whole-home renovations.",
    bronx:
      "The Bronx is home to some of NYC's most beautiful residential neighborhoods, from the grand homes of Riverdale to the emerging arts district of Mott Haven. Our Bronx interior design team provides comprehensive design services tailored to the borough's unique mix of housing types, from co-ops and condos to single-family homes.",
    "staten-island":
      "Staten Island's suburban character means larger homes, more rooms to design, and more extensive renovation projects. From Todt Hill's elegant estates to Tottenville's waterfront properties, our Staten Island designers handle everything from full-home design to kitchen and bathroom renovations with a focus on livability and style.",
    "long-island":
      "Long Island is home to some of the most prestigious residential properties in the New York metro area. From the Gold Coast estates of the North Shore to the beach communities of the South Shore, our Long Island designers deliver luxury interior design, whole-home renovations, and custom finishes at the highest level.",
    westchester:
      "Westchester County combines suburban elegance with proximity to Manhattan, making it one of the most desirable residential markets in the region. Our Westchester design team specializes in estate-level interiors, traditional and transitional design, and creating sophisticated living environments that match the area's refined aesthetic.",
    "new-jersey":
      "The New Jersey waterfront communities across the Hudson from Manhattan are experiencing a design renaissance. From luxury condos in Hoboken and Jersey City to classic homes in Englewood and Fort Lee, our New Jersey designers bring Manhattan-caliber design to properties with more space and stunning skyline views.",
  };

  const boroughHighlights: Record<string, { label: string; value: string }[]> = {
    manhattan: [
      { label: "Specialty", value: "Pre-War Design" },
      { label: "Avg Project", value: "$25K-$150K" },
      { label: "Top Service", value: "Full-Home Design" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    brooklyn: [
      { label: "Specialty", value: "Brownstone Interiors" },
      { label: "Avg Project", value: "$15K-$100K" },
      { label: "Top Service", value: "Kitchen Design" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    queens: [
      { label: "Specialty", value: "Full-Home Design" },
      { label: "Avg Project", value: "$10K-$60K" },
      { label: "Top Service", value: "Kitchen & Bath" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    bronx: [
      { label: "Specialty", value: "Modern Renovations" },
      { label: "Avg Project", value: "$8K-$45K" },
      { label: "Top Service", value: "Space Planning" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    "staten-island": [
      { label: "Specialty", value: "Family Homes" },
      { label: "Avg Project", value: "$12K-$65K" },
      { label: "Top Service", value: "Full-Home Design" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    "long-island": [
      { label: "Specialty", value: "Luxury Interiors" },
      { label: "Avg Project", value: "$20K-$200K" },
      { label: "Top Service", value: "Whole-Home Design" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    westchester: [
      { label: "Specialty", value: "Estate Design" },
      { label: "Avg Project", value: "$25K-$175K" },
      { label: "Top Service", value: "Custom Interiors" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
    "new-jersey": [
      { label: "Specialty", value: "Waterfront Condos" },
      { label: "Avg Project", value: "$15K-$80K" },
      { label: "Top Service", value: "Modern Design" },
      { label: "Neighborhoods", value: String(neighborhoods.length) },
    ],
  };

  const boroughFaqs = [
    {
      question: `What interior design services are available in ${boroughName}?`,
      answer: `We offer all 18 of our professional interior design services in ${boroughName}, including full-home design, kitchen and bathroom design, space planning, color consultation, furniture selection, lighting design, renovation management, staging, and more. Each service is tailored to the unique property types and architectural styles found in ${boroughName} neighborhoods.`,
    },
    {
      question: `How much does interior design cost in ${boroughName}?`,
      answer: `Interior design costs in ${boroughName} vary based on the scope of work, property size, and materials selected. Color consultations start around $500-$1,500, single-room designs range from $5,000 to $25,000, and full-home design projects typically range from $15,000 to $200,000+. We provide free consultations for all ${boroughName} projects — contact us for a personalized quote.`,
    },
    {
      question: `Do you serve all neighborhoods in ${boroughName}?`,
      answer: `Yes — we serve all ${neighborhoods.length} neighborhoods listed on this page, plus surrounding areas within ${boroughName}. If your specific neighborhood isn't listed, we still likely cover it. Contact us at ${PHONE} to confirm service availability for your address.`,
    },
    {
      question: `How do I get started with interior design in ${boroughName}?`,
      answer: `Getting started is easy: (1) Browse our ${neighborhoods.length} ${boroughName} neighborhood pages to see services available near you, (2) Contact us for a free consultation, (3) We'll visit your property and discuss your vision, (4) You receive a detailed design proposal. Most consultations are scheduled within one week.`,
    },
    {
      question: `Can you handle co-op and condo board approvals in ${boroughName}?`,
      answer: `Absolutely. Our team regularly coordinates with co-op boards, condo associations, and building management companies throughout ${boroughName}. We prepare professional alteration agreement packages including detailed plans, material specifications, timelines, and insurance documentation. This is especially common for our Manhattan and Brooklyn renovation projects.`,
    },
    {
      question: `Do you work with my existing furniture and decor in ${boroughName}?`,
      answer: `Yes — we can work with your existing pieces or start completely fresh. Many clients prefer a mix: keeping beloved furniture and artwork while updating the overall design scheme. During your consultation, we assess what you already have and recommend what to keep, what to reupholster or refinish, and what to replace.`,
    },
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} — ${boroughName} Interior Design`,
    description: `Professional interior design services for ${neighborhoods.length} neighborhoods in ${boroughName}. Design, renovation, and styling.`,
    url: boroughUrl,
    telephone: "+1-917-473-2013",
    areaServed: {
      "@type": "AdministrativeArea",
      name: boroughName,
    },
    parentOrganization: {
      "@id": `${SITE_DOMAIN}/#organization`,
    },
    serviceType: "Interior Design",
    priceRange: "$$-$$$$",
  };

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Interior Design in ${boroughName}`,
          `Professional interior design for ${neighborhoods.length} neighborhoods in ${boroughName}. 18 services available.`,
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
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-20 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full border border-blue-300/40 bg-slate-800/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300 font-cta">
            {neighborhoods.length} Neighborhoods &bull; 18 Design Services &bull; Updated 2026
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Interior Design in <span className="text-blue-300">{boroughName}</span> — Professional Design Services for {neighborhoods.length} Neighborhoods
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            {boroughDescriptions[borough] || `Professional interior design services across ${neighborhoods.length} neighborhoods in ${boroughName}. Our experienced designers deliver residential and commercial interiors tailored to the unique character of ${boroughName} properties.`}
            {" "}Browse our <Link href="/services" className="text-blue-300 underline underline-offset-2 hover:text-white">18 design services</Link> or call <a href={SMS_HREF} className="text-blue-300 underline underline-offset-2 hover:text-white">{PHONE}</a> for a free consultation.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={SMS_HREF} className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/contact" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      {boroughHighlights[borough] && (
        <section className="bg-section-alt py-12">
          <div className="mx-auto max-w-4xl px-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {boroughHighlights[borough].map((stat, i) => (
                <div key={i} className="rounded-xl border border-slate-200/60 bg-white p-5 text-center shadow-sm">
                  <p className="text-2xl font-bold text-blue-700 font-heading">{stat.value}</p>
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
            Our most active service areas in {boroughName}. Click any neighborhood for a full guide with all 18 design services tailored to that area.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {featuredNeighborhoods.map((area) => (
              <Link key={area.slug} href={getAreaUrl(area)}>
                <div className="group rounded-xl border border-slate-200/60 bg-white p-4 text-center transition-all hover:border-blue-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 font-heading">{area.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Neighborhoods */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            All {neighborhoods.length} Neighborhoods in {boroughName}
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Full interior design services available in every neighborhood listed below. Click for local guides and service details.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((area) => (
              <Link key={area.slug} href={getAreaUrl(area)}>
                <div className="group flex items-center justify-between rounded-xl border border-slate-200/60 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-md">
                  <div>
                    <p className="text-base font-bold text-slate-900 group-hover:text-blue-700 font-heading">
                      {area.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">18 services available</p>
                  </div>
                  <span className="text-blue-500 group-hover:text-blue-700 text-lg">&rarr;</span>
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
            18 Interior Design Services in {boroughName}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every {boroughName} neighborhood has access to our full suite of professional design services. Click any service to learn more, or browse a specific neighborhood to see service + area combination pages.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getServiceUrl(service)}>
                <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    <span className="text-blue-700 text-sm font-bold">&rarr;</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-800">{service.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About Interior Design in {boroughName}
          </h2>
          <div className="mt-8 space-y-4">
            {boroughFaqs.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-slate-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-blue-800 font-heading">
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
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Transform Your {boroughName} Property?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free consultation for any of our 18 design services. Our {boroughName} designers are ready to bring your vision to life.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/contact" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
