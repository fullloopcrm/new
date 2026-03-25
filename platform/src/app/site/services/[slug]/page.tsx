import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantAreas,
  toSlug,
  generateContent,
  getChecklistForService,
} from "@/lib/tenant-site";

/* ---------- Types ---------- */
interface Service {
  id: string;
  name: string;
  description?: string;
  base_rate?: number;
  duration_minutes?: number;
}

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return { title: "Service" };

  const services = await getTenantServices(tenant.id);
  const service = services.find(
    (s: { name: string }) => toSlug(s.name) === slug
  ) as Service | undefined;
  if (!service) return { title: "Service Not Found" };

  const industry = tenant.industry || "Professional Services";
  const desc =
    service.description ||
    `Professional ${service.name.toLowerCase()} by ${tenant.name}. ${
      service.base_rate != null ? `Starting at $${service.base_rate}/hr. ` : ""
    }Serving ${industry.toLowerCase()} clients with licensed, insured teams. Book online or call today.`;

  return {
    title: `${service.name} | ${tenant.name}`,
    description: desc.slice(0, 300),
    alternates: { canonical: `/site/services/${slug}` },
  };
}

/* ---------- Page ---------- */
export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const services = await getTenantServices(tenant.id);
  const service = services.find(
    (s: { name: string }) => toSlug(s.name) === slug
  ) as Service | undefined;

  if (!service) notFound();

  const areas = await getTenantAreas(tenant.id);
  const industry = tenant.industry || "Professional Services";
  const phone = tenant.phone || "";
  const businessName = tenant.name || "Our Business";
  const siteUrl = tenant.domain
    ? `https://${tenant.domain}`
    : "https://fullloopcrm.com";

  const checklist = getChecklistForService(service.name, industry);
  const content = generateContent(industry, businessName, {
    service: service.name,
  });
  const otherServices = services.filter(
    (s: { id: string }) => s.id !== service.id
  ) as Service[];

  const rate = service.base_rate;
  const duration = service.duration_minutes;
  const typicalCostLow =
    rate != null && duration != null
      ? Math.round((rate * duration) / 60)
      : null;
  const typicalCostHigh = typicalCostLow != null ? Math.round(typicalCostLow * 1.5) : null;

  /* FAQ data */
  const faqs = [
    {
      q: `How much does ${service.name.toLowerCase()} cost?`,
      a:
        rate != null
          ? `Our ${service.name.toLowerCase()} starts at $${rate}/hr. ${
              typicalCostLow != null
                ? `A typical session costs between $${typicalCostLow} and $${typicalCostHigh}.`
                : ""
            } Final pricing depends on the size and scope of the job.`
          : `Pricing for ${service.name.toLowerCase()} depends on the size and scope of the job. Contact us for a free, no-obligation quote.`,
    },
    {
      q: `How long does ${service.name.toLowerCase()} take?`,
      a:
        duration != null
          ? `A typical ${service.name.toLowerCase()} session takes approximately ${duration} minutes, though this varies based on the size of the space and specific requirements.`
          : `Duration depends on the size of the space and specific requirements. We'll provide a time estimate when you book.`,
    },
    {
      q: `What's included in ${service.name.toLowerCase()}?`,
      a: `Our ${service.name.toLowerCase()} includes ${checklist
        .slice(0, 4)
        .map((c) => c.toLowerCase())
        .join(", ")}, and more. Every service comes with a satisfaction guarantee.`,
    },
    {
      q: `Do I need to be home for ${service.name.toLowerCase()}?`,
      a: `It depends on the service and your preference. Many clients provide access instructions so we can complete the work while they're away. We're fully insured and background-checked for your peace of mind.`,
    },
    {
      q: `How do I book ${service.name.toLowerCase()}?`,
      a: `You can book online through our website in just a few minutes, or call us directly${
        phone ? ` at ${phone}` : ""
      }. We'll confirm your appointment and send a reminder before the scheduled date.`,
    },
    {
      q: `Do you offer recurring ${service.name.toLowerCase()}?`,
      a: `Yes! We offer weekly, biweekly, and monthly recurring ${service.name.toLowerCase()} plans. Recurring clients enjoy priority scheduling and consistent quality from the same team.`,
    },
  ];

  /* Schema */
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description:
      service.description ||
      `Professional ${service.name.toLowerCase()} by ${businessName}.`,
    provider: {
      "@type": "LocalBusiness",
      name: businessName,
      ...(phone && { telephone: phone }),
    },
    ...(areas.length > 0 && {
      areaServed: areas.map((a) => ({ "@type": "Place", name: a })),
    }),
    ...(rate != null && {
      offers: {
        "@type": "Offer",
        price: rate,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: rate,
          priceCurrency: "USD",
          unitText: "HOUR",
        },
      },
    }),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/site`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: `${siteUrl}/site/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: service.name,
        item: `${siteUrl}/site/services/${slug}`,
      },
    ],
  };

  return (
    <div>
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([serviceSchema, faqSchema, breadcrumbSchema]),
        }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <nav className="mb-6 text-sm text-slate-500">
            <Link href="/site" className="hover:text-[var(--brand)]">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/site/services" className="hover:text-[var(--brand)]">
              Services
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 font-medium">{service.name}</span>
          </nav>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            {service.name}
          </h1>

          {service.description && (
            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {service.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {rate != null && (
              <div className="bg-white border border-slate-200 rounded-xl px-6 py-3 shadow-sm">
                <span className="text-sm text-slate-500">Starting from</span>
                <span className="ml-2 text-2xl font-bold text-[var(--brand)]">
                  ${rate}/hr
                </span>
              </div>
            )}
            {duration != null && (
              <div className="bg-white border border-slate-200 rounded-xl px-6 py-3 shadow-sm">
                <span className="text-sm text-slate-500">Estimated</span>
                <span className="ml-2 text-2xl font-bold text-slate-900">
                  {duration} min
                </span>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:opacity-90 rounded-lg transition-colors shadow-lg"
            >
              Book {service.name}
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-slate-700 border-2 border-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)] rounded-lg transition-colors"
              >
                Call {phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            What&apos;s Included
          </h2>
          <p className="text-slate-600 mb-8">
            Every {service.name.toLowerCase()} appointment includes the
            following as standard.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {checklist.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-[var(--brand)] shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Breakdown */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Pricing Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-[var(--brand)]">
                {rate != null ? `$${rate}/hr` : "Custom"}
              </div>
              <div className="mt-1 text-sm text-slate-600">Hourly Rate</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-[var(--brand)]">
                {duration != null ? `${duration} min` : "Varies"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Estimated Duration
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-[var(--brand)]">
                {typicalCostLow != null
                  ? `$${typicalCostLow}–$${typicalCostHigh}`
                  : "Call Us"}
              </div>
              <div className="mt-1 text-sm text-slate-600">Typical Cost</div>
            </div>
          </div>
          {otherServices.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Compare Our Rates
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">
                        Service
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-700">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 bg-[var(--brand)]/5">
                      <td className="px-4 py-3 font-medium text-[var(--brand)]">
                        {service.name}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--brand)]">
                        {rate != null ? `$${rate}/hr` : "Custom"}
                      </td>
                    </tr>
                    {otherServices.slice(0, 5).map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/site/services/${toSlug(s.name)}`}
                            className="text-slate-700 hover:text-[var(--brand)] transition-colors"
                          >
                            {s.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {s.base_rate != null ? `$${s.base_rate}/hr` : "Custom"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Service Areas */}
      {areas.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              We Offer {service.name} In
            </h2>
            <p className="text-slate-600 mb-8">
              Book {service.name.toLowerCase()} in any of these service areas.
              Click an area to see local pricing and details.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {areas.map((a) => (
                <Link
                  key={a}
                  href={`/site/areas/${toSlug(a)}/${toSlug(service.name)}`}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-center"
                >
                  {a}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="bg-white border border-slate-200 rounded-xl group"
              >
                <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-900 hover:text-[var(--brand)] transition-colors list-none flex items-center justify-between">
                  {faq.q}
                  <svg
                    className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-slate-600 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related Services */}
      {otherServices.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              Related Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherServices.map((s) => (
                <Link
                  key={s.id}
                  href={`/site/services/${toSlug(s.name)}`}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all group"
                >
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-[var(--brand)] transition-colors">
                    {s.name}
                  </h3>
                  {s.base_rate != null && (
                    <p className="mt-2 text-sm font-semibold text-[var(--brand)]">
                      From ${s.base_rate}/hr
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to Book {service.name}?
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Schedule your appointment online in minutes or give us a call. No
            hidden fees, no commitment — just quality{" "}
            {service.name.toLowerCase()}.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-[var(--brand)] bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-lg"
            >
              Book {service.name}
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/50 hover:bg-white/10 rounded-lg transition-colors"
              >
                Call {phone}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
