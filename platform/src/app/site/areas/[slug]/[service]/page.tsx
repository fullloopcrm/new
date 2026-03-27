import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantAreas,
  toSlug,
  fromSlug,
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
  params: Promise<{ slug: string; service: string }>;
}): Promise<Metadata> {
  const { slug, service: serviceSlug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return { title: "Service" };

  const areas = await getTenantAreas(tenant.id);
  const area = areas.find((a) => toSlug(a) === slug) || fromSlug(slug);

  const services = await getTenantServices(tenant.id);
  const svc = services.find(
    (s: { name: string }) => toSlug(s.name) === serviceSlug
  ) as Service | undefined;
  const serviceName = svc?.name || fromSlug(serviceSlug);

  const rateStr =
    svc?.base_rate != null ? ` Starting at $${svc.base_rate}/hr.` : "";

  return {
    title: `${serviceName} in ${area} | ${tenant.name}`,
    description: `Book professional ${serviceName.toLowerCase()} in ${area} from ${tenant.name}.${rateStr} Experienced, insured team with transparent pricing and satisfaction guarantee.`,
    alternates: { canonical: `/site/areas/${slug}/${serviceSlug}` },
  };
}

/* ---------- Page ---------- */
export default async function AreaServicePage({
  params,
}: {
  params: Promise<{ slug: string; service: string }>;
}) {
  const { slug, service: serviceSlug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const areas = await getTenantAreas(tenant.id);
  const area = areas.find((a) => toSlug(a) === slug);
  if (!area) notFound();

  const services = (await getTenantServices(tenant.id)) as Service[];
  const service = services.find(
    (s) => toSlug(s.name) === serviceSlug
  );
  if (!service) notFound();

  const phone = tenant.phone || "";
  const businessName = tenant.name || "Our Business";
  const industry = tenant.industry || "Professional Services";
  const siteUrl = tenant.domain
    ? `https://${tenant.domain}`
    : "https://homeservicesbusinesscrm.com";

  const content = generateContent(industry, businessName, {
    service: service.name,
    area,
  });
  const checklist = getChecklistForService(service.name, industry);

  const rate = service.base_rate;
  const duration = service.duration_minutes;
  const typicalCostLow =
    rate != null && duration != null
      ? Math.round((rate * duration) / 60)
      : null;
  const typicalCostHigh =
    typicalCostLow != null ? Math.round(typicalCostLow * 1.5) : null;

  const otherServicesInArea = services.filter((s) => s.id !== service.id);
  const otherAreas = areas.filter((a) => a !== area);

  /* FAQ */
  const faqs = [
    {
      q: `How much does ${service.name.toLowerCase()} cost in ${area}?`,
      a:
        rate != null
          ? `${service.name} in ${area} starts at $${rate}/hr. ${
              typicalCostLow != null
                ? `A typical session costs between $${typicalCostLow} and $${typicalCostHigh}, depending on the size and scope of the job.`
                : ""
            } We provide upfront pricing with no hidden fees.`
          : `Pricing for ${service.name.toLowerCase()} in ${area} depends on the size and scope of the job. Contact us for a free, no-obligation quote.`,
    },
    {
      q: `Do you offer ${service.name.toLowerCase()} in ${area}?`,
      a: `Yes! ${businessName} provides professional ${service.name.toLowerCase()} throughout ${area}. Our team is local, background-checked, and ready to serve you.`,
    },
    {
      q: `How do I book ${service.name.toLowerCase()} in ${area}?`,
      a: `Book online through our website in just a few clicks, or call us${
        phone ? ` at ${phone}` : ""
      }. We'll confirm availability for your ${area} location and send appointment reminders.`,
    },
    {
      q: `How long does ${service.name.toLowerCase()} take in ${area}?`,
      a:
        duration != null
          ? `A typical ${service.name.toLowerCase()} session in ${area} takes approximately ${duration} minutes. Duration may vary based on the size of the space and specific requirements.`
          : `Duration depends on the size and scope of the job. We'll provide a time estimate when you book your ${area} appointment.`,
    },
    {
      q: `Is your ${area} team insured?`,
      a: `Absolutely. All ${businessName} team members are fully licensed, bonded, and insured. We also conduct background checks on every team member for your peace of mind.`,
    },
  ];

  /* Schema */
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} in ${area}`,
    description: `Professional ${service.name.toLowerCase()} in ${area} by ${businessName}.`,
    provider: {
      "@type": "LocalBusiness",
      name: businessName,
      ...(phone && { telephone: phone }),
      areaServed: { "@type": "Place", name: area },
    },
    areaServed: { "@type": "Place", name: area },
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
        name: "Areas",
        item: `${siteUrl}/site/areas`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: area,
        item: `${siteUrl}/site/areas/${slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: service.name,
        item: `${siteUrl}/site/areas/${slug}/${serviceSlug}`,
      },
    ],
  };

  return (
    <div>
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            serviceSchema,
            faqSchema,
            breadcrumbSchema,
          ]),
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
            <Link href="/site/areas" className="hover:text-[var(--brand)]">
              Areas
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/site/areas/${slug}`}
              className="hover:text-[var(--brand)]"
            >
              {area}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 font-medium">{service.name}</span>
          </nav>

          <p className="text-sm font-semibold text-[var(--brand)] uppercase tracking-wider mb-3">
            {area}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            {service.name} in{" "}
            <span className="text-[var(--brand)]">{area}</span>
          </h1>

          {service.description && (
            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {service.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {rate != null && (
              <div className="bg-white border border-slate-200 rounded-xl px-6 py-3 shadow-sm">
                <span className="text-sm text-slate-500">Starting at</span>
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
              Book {service.name} in {area}
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

      {/* About This Service */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            About {service.name} in {area}
          </h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed mb-4">
              {service.name} in {area} starts at{" "}
              {rate != null ? `$${rate}/hr` : "competitive rates"}.{" "}
              {content.aboutParagraphs[0]}
            </p>
            <p className="text-slate-600 leading-relaxed">
              {content.aboutParagraphs[1]} Our team is local,
              background-checked, and ready to help.
            </p>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            What to Expect
          </h2>
          <div className="space-y-6">
            {content.processSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--brand)] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div className="pt-2">
                  <p className="text-slate-700 leading-relaxed">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            {service.name} Pricing in {area}
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
              <div className="mt-1 text-sm text-slate-600">
                Typical Cost in {area}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            {service.name} in {area} — FAQ
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

      {/* Other Services in This Area */}
      {otherServicesInArea.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Other Services in {area}
            </h2>
            <p className="text-slate-600 mb-8">
              We also offer these services throughout {area}.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {otherServicesInArea.map((s) => (
                <Link
                  key={s.id}
                  href={`/site/areas/${toSlug(area)}/${toSlug(s.name)}`}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-center"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Same Service in Other Areas */}
      {otherAreas.length > 0 && (
        <section className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {service.name} in Other Areas
            </h2>
            <p className="text-slate-600 mb-8">
              We also offer {service.name.toLowerCase()} in these neighborhoods.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {otherAreas.map((a) => (
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

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Book {service.name} in {area}
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Schedule your {service.name.toLowerCase()} appointment online in
            minutes. No hidden fees, satisfaction guaranteed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-[var(--brand)] bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-lg"
            >
              Book Now
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
