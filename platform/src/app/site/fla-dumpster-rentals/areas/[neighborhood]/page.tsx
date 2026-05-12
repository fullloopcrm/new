// @ts-nocheck
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllNeighborhoods,
  getAllServices,
  getNeighborhoodBySlug,
  getServicesByCategory,
  getNearbyNeighborhoods,
  getCategories,
} from "@/app/site/fla-dumpster-rentals/_lib/data";
import {
  getNeighborhoodHubMeta,
  getOrganizationSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  PHONE,
  SITE_URL,
  SITE_NAME,
} from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getAreaContent } from "@/app/site/fla-dumpster-rentals/_lib/areaContent";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

interface PageProps {
  params: Promise<{ neighborhood: string }>;
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() { return [] }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { neighborhood: slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);
  if (!neighborhood) return {};

  const meta = getNeighborhoodHubMeta(neighborhood);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.canonical,
    },
  };
}

export default async function NeighborhoodHubPage({ params }: PageProps) {
  const { neighborhood: slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);
  if (!neighborhood) notFound();

  const allServices = getAllServices();
  const servicesByCategory = getServicesByCategory();
  const categories = getCategories();
  const nearbyNeighborhoods = getNearbyNeighborhoods(neighborhood, 12);
  const totalServices = allServices.length;

  const phonePlain = PHONE.replace(/-/g, "");
  const areaContent = getAreaContent(neighborhood);

  const faqItems = [
    {
      q: `How much does dumpster rental cost in ${neighborhood.name}?`,
      a: `Dumpster rental in ${neighborhood.name} starts at $275 for a 10 yard, $350 for a 20 yard, and $450 for a 30 yard. Every rental includes delivery, pickup, a 7-day rental period, and disposal up to the weight limit. No hidden fees.`,
    },
    {
      q: `Do you offer same-day dumpster delivery in ${neighborhood.name}?`,
      a: `Yes. Same-day delivery is available in ${neighborhood.name} when you order before noon. Next-day delivery is guaranteed for all orders placed by 5 PM. Text us for the fastest response.`,
    },
    {
      q: `What size dumpster do I need for my project in ${neighborhood.name}?`,
      a: "For small cleanouts and garage declutters, a 10 yard is perfect. Kitchen and bathroom renovations typically need a 20 yard. Large construction, whole-home renovation, and demolition projects call for a 30 yard. Text us your project details and we will recommend the right size.",
    },
    {
      q: `Do I need a permit for a dumpster in ${neighborhood.name}?`,
      a: `If the dumpster sits on your private driveway or property, no permit is needed in most cases. If it needs to go on a public street or right-of-way, a permit may be required. We know the specific rules for ${neighborhood.name} and will tell you exactly what you need when you book.`,
    },
    {
      q: `What materials can I put in a dumpster in ${neighborhood.name}?`,
      a: "Most household and construction debris is accepted: furniture, appliances, drywall, roofing, lumber, concrete, yard waste, carpet, and general junk. Hazardous materials, tires, batteries, paint, and freon-containing items require special handling. When in doubt, ask us.",
    },
    {
      q: `How long can I keep the dumpster in ${neighborhood.name}?`,
      a: "Every rental includes a 7-day rental period. If you need more time, extra days are available at $10-15 per day depending on the dumpster size. Just call or text us to extend — no paperwork required.",
    },
  ];

  const organizationSchema = getOrganizationSchema();

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} - ${neighborhood.name}`,
    description: `Dumpster rental service in ${neighborhood.name}, ${neighborhood.region}. 10, 20 & 30 yard roll-off containers.`,
    url: `${SITE_URL}/areas/${neighborhood.slug}`,
    telephone: PHONE,
    areaServed: {
      "@type": "Place",
      name: `${neighborhood.name}, Florida`,
    },
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Service Areas", url: "/areas" },
    { name: neighborhood.name, url: `/areas/${neighborhood.slug}` },
  ]);

  const faqSchema = getFAQPageSchema(faqItems);

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="bg-stone-950 pb-16 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Service Areas", url: "/areas" },
              { name: neighborhood.name, url: `/areas/${neighborhood.slug}` },
            ]}
          />

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              {neighborhood.region}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Dumpster Rental in{" "}
              <span className="text-orange-500">{neighborhood.name}</span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              {areaContent.heroDescription}
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {areaContent.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-2xl font-bold text-white">
                  {section.heading}
                </h2>
                <p className="mt-4 leading-7 text-stone-300">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Dumpster Pricing in {neighborhood.name}
          </h2>
          <p className="mt-3 max-w-3xl text-stone-400">
            Flat-rate pricing. No hidden fees. The price we quote is the price you pay.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
              <p className="text-sm font-semibold text-orange-500">10 Yard Dumpster</p>
              <p className="mt-2 text-3xl font-extrabold text-white">$275</p>
              <p className="mt-1 text-xs text-stone-500">starting price</p>
              <ul className="mt-4 space-y-2 text-sm text-stone-400">
                <li>Holds ~4 pickup truck loads</li>
                <li>2 ton weight limit included</li>
                <li>7-day rental period</li>
                <li>Garage cleanouts, small renos</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-orange-600 bg-stone-900/50 p-6">
              <p className="text-sm font-semibold text-orange-500">20 Yard Dumpster — Most Popular</p>
              <p className="mt-2 text-3xl font-extrabold text-white">$350</p>
              <p className="mt-1 text-xs text-stone-500">starting price</p>
              <ul className="mt-4 space-y-2 text-sm text-stone-400">
                <li>Holds ~8 pickup truck loads</li>
                <li>3 ton weight limit included</li>
                <li>7-day rental period</li>
                <li>Renovations, roofing, cleanouts</li>
              </ul>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
              <p className="text-sm font-semibold text-orange-500">30 Yard Dumpster</p>
              <p className="mt-2 text-3xl font-extrabold text-white">$450</p>
              <p className="mt-1 text-xs text-stone-500">starting price</p>
              <ul className="mt-4 space-y-2 text-sm text-stone-400">
                <li>Holds ~12 pickup truck loads</li>
                <li>4 ton weight limit included</li>
                <li>7-day rental period</li>
                <li>Construction, demolition, large jobs</li>
              </ul>
            </div>
          </div>
          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
            >
              View Full Pricing Details &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Services Available */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            All Dumpster Services in {neighborhood.name}
          </h2>
          <p className="mt-3 max-w-3xl text-stone-400">
            {totalServices} dumpster rental services available with delivery to {neighborhood.name}.
          </p>

          {categories.map((category) => {
            const services = servicesByCategory[category] || [];
            if (services.length === 0) return null;
            return (
              <div key={category} className="mt-8">
                <h3 className="text-lg font-semibold text-white">{category}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/${service.slug}/${neighborhood.slug}`}
                      className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-2.5 text-sm text-stone-300 transition-colors hover:border-orange-600 hover:text-white"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mid CTA */}
      <CTAGroup variant="mid" />

      {/* FAQ */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Dumpster Rental FAQ for {neighborhood.name}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-stone-800 bg-stone-900/50 p-6"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Areas */}
      {nearbyNeighborhoods.length > 0 && (
        <section className="bg-stone-900 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">
              Nearby {neighborhood.region} Areas
            </h2>
            <p className="mt-3 text-stone-400">
              We also deliver dumpsters throughout {neighborhood.region}.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {nearbyNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/areas/${n.slug}`}
                  className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-2.5 text-sm text-stone-300 transition-colors hover:border-orange-600 hover:text-white"
                >
                  {n.name}
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/areas"
                className="text-sm text-orange-500 hover:text-white"
              >
                View all service areas &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      <ProTip
        tips={[
          {
            title: "Know Your Local Permit Rules",
            body: `Dumpster on your driveway in ${neighborhood.name}? No permit needed. On the street? You may need a right-of-way permit. Text us your address and we'll tell you exactly what's required.`,
          },
          {
            title: "Delivery Access Matters",
            body: "We need about 60 feet of clearance and 23 feet of overhead. Low-hanging trees, narrow gates, and overhead wires are the usual suspects. If you're not sure, text us a photo of your driveway.",
          },
          {
            title: "Your Neighbors Will Thank You",
            body: "A dumpster in the driveway beats a pile of debris on the curb every time. Most of our customers say their neighbors actually appreciate how clean the project stays.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
