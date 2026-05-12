// @ts-nocheck
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllServices,
  getAllNeighborhoods,
  getServiceBySlug,
  getNeighborhoodBySlug,
  getRelatedServices,
  getCrossCategoryServices,
  getNearbyNeighborhoods,
} from "@/app/site/fla-dumpster-rentals/_lib/data";
import {
  getMoneyPageMeta,
  getLocalBusinessSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  PHONE,
  SITE_URL,
} from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getMoneyPageContent } from "@/app/site/fla-dumpster-rentals/_lib/moneyPageContent";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

interface PageProps {
  params: Promise<{ service: string; neighborhood: string }>;
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() { return [] }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { service: serviceSlug, neighborhood: neighborhoodSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  const neighborhood = getNeighborhoodBySlug(neighborhoodSlug);
  if (!service || !neighborhood) return {};

  const meta = getMoneyPageMeta(service, neighborhood);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function MoneyPage({ params }: PageProps) {
  const { service: serviceSlug, neighborhood: neighborhoodSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  const neighborhood = getNeighborhoodBySlug(neighborhoodSlug);

  if (!service || !neighborhood) notFound();

  const nearbyNeighborhoods = getNearbyNeighborhoods(neighborhood, 8);
  const relatedServices = getRelatedServices(service, 6);
  const crossCategoryServices = getCrossCategoryServices(service, 4);

  const phonePlain = PHONE.replace(/-/g, "");
  const nameLower = service.name.toLowerCase();
  const pageContent = getMoneyPageContent(service, neighborhood);

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: service.name, url: `/${service.slug}` },
    { name: neighborhood.name, url: `/${service.slug}/${neighborhood.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getLocalBusinessSchema(service, neighborhood)
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFAQPageSchema(service.faqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* Hero */}
      <section className="bg-stone-950 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: service.name, url: `/${service.slug}` },
              {
                name: neighborhood.name,
                url: `/${service.slug}/${neighborhood.slug}`,
              },
            ]}
            dark
          />

          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              {neighborhood.region}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {service.name} in {neighborhood.name}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              {pageContent.heroDescription}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href={`sms:${phonePlain}`}
              className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
            >
              Text Us for a Quote
            </a>
            <a
              href={`tel:${phonePlain}`}
              className="inline-flex items-center justify-center rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-stone-900"
            >
              Call {PHONE}
            </a>
            <Link
              href="/schedule-dumpster-rental-form"
              className="inline-flex items-center justify-center rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-stone-900"
            >
              Book Online
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-10">
              {pageContent.sections.map((section, i) => (
                <div key={i}>
                  <h2 className="text-2xl font-bold text-white">
                    {section.heading}
                  </h2>
                  <p className="mt-4 leading-7 text-stone-300">
                    {section.content}
                  </p>
                </div>
              ))}

              {/* Common Uses */}
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Common Uses for {service.name}
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {service.commonServices.map((cs) => (
                    <div key={cs} className="flex items-center gap-3">
                      <svg
                        className="h-4 w-4 shrink-0 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      <span className="text-sm text-stone-300">{cs}</span>
                    </div>
                  ))}
                </div>
              </div>

              {service.recommendedSize && (
                <div className="rounded-lg border border-orange-600/30 bg-orange-600/5 p-5">
                  <p className="text-stone-300">
                    <span className="font-semibold text-orange-400">
                      Recommended Size for {service.name}:
                    </span>{" "}
                    {service.recommendedSize}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside>
              <div className="sticky top-8 space-y-6">
                <div className="rounded-xl border border-stone-700 bg-stone-800 p-6">
                  <h3 className="text-lg font-semibold text-white">
                    Get a Free Quote
                  </h3>
                  <p className="mb-4 mt-2 text-sm text-stone-400">
                    Need a dumpster for your {nameLower} project in{" "}
                    {neighborhood.name}? Text or call for an instant quote.
                  </p>
                  <a
                    href={`sms:${phonePlain}`}
                    className="block w-full rounded-lg bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-700"
                  >
                    Text Us for a Quote
                  </a>
                  <a
                    href={`tel:${phonePlain}`}
                    className="mt-3 block w-full rounded-lg border border-stone-600 py-3 text-center text-sm font-semibold text-white hover:border-stone-400"
                  >
                    Call {PHONE}
                  </a>
                  <Link
                    href="/schedule-dumpster-rental-form"
                    className="mt-3 block w-full rounded-lg border border-stone-600 py-3 text-center text-sm font-semibold text-orange-400 hover:border-orange-500 hover:text-white"
                  >
                    Book Online
                  </Link>
                </div>

                <div className="rounded-xl border border-stone-700 bg-stone-800 p-6">
                  <h3 className="text-lg font-semibold text-white">
                    Quick Pricing
                  </h3>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-400">10 Yard</span>
                      <span className="text-sm font-semibold text-white">
                        From $275
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-400">20 Yard</span>
                      <span className="text-sm font-semibold text-white">
                        From $350
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-400">30 Yard</span>
                      <span className="text-sm font-semibold text-white">
                        From $450
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/pricing"
                    className="mt-4 block text-center text-sm text-orange-500 hover:text-white"
                  >
                    View full pricing &rarr;
                  </Link>
                </div>

                {nearbyNeighborhoods.length > 0 && (
                  <div className="rounded-xl border border-stone-700 bg-stone-800 p-6">
                    <h3 className="text-lg font-semibold text-white">
                      {service.name} Nearby
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {nearbyNeighborhoods.map((n) => (
                        <li key={n.slug}>
                          <Link
                            href={`/${service.slug}/${n.slug}`}
                            className="text-sm text-orange-500 hover:text-white"
                          >
                            {n.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {service.name} FAQ for {neighborhood.name}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {service.faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-stone-800 bg-stone-900/50 p-6"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <section className="bg-stone-900 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white">
              Related Services in {neighborhood.name}
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {relatedServices.map((rs) => (
                <Link
                  key={rs.slug}
                  href={`/${rs.slug}/${neighborhood.slug}`}
                  className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 hover:border-orange-600/50"
                >
                  <h3 className="font-medium text-white">{rs.name}</h3>
                  <p className="mt-1 text-xs text-stone-500">
                    in {neighborhood.name}
                  </p>
                </Link>
              ))}
            </div>

            {crossCategoryServices.length > 0 && (
              <>
                <h3 className="mt-10 text-xl font-semibold text-white">
                  Other Services in {neighborhood.name}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {crossCategoryServices.map((cs) => (
                    <Link
                      key={cs.slug}
                      href={`/${cs.slug}/${neighborhood.slug}`}
                      className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 hover:border-orange-600/50"
                    >
                      <h3 className="font-medium text-white">{cs.name}</h3>
                      <p className="mt-1 text-xs text-stone-500">
                        {cs.category}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <ProTip
        tips={[
          {
            title: `${neighborhood.name} Pro Tip`,
            body: `Every area in Florida has different access situations. If you're in ${neighborhood.name}, just text us your address and we'll confirm the best dumpster placement before delivery day. No surprises, no wasted trips.`,
          },
          {
            title: "Don't Guess on Size — Ask Us",
            body: `For ${nameLower} projects, the right dumpster size depends on what you're tossing. Drywall and furniture are bulky but light. Concrete and tile are small but heavy. Tell us your materials and we'll nail the size the first time.`,
          },
          {
            title: "Schedule Pickup When YOU'RE Ready",
            body: "Your rental period is flexible. If you finish early, text us and we'll grab it sooner — no charge. If you need a few extra days, just let us know. We work on your timeline, not the other way around.",
          },
        ]}
      />

      <CTAGroup variant="final" />
    </>
  );
}
