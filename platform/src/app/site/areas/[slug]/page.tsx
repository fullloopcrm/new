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
  if (!tenant) return { title: "Area" };

  const areas = await getTenantAreas(tenant.id);
  const area = areas.find((a) => toSlug(a) === slug) || fromSlug(slug);
  const industry = tenant.industry || "Professional Services";

  return {
    title: `${industry} in ${area} | ${tenant.name}`,
    description: `${tenant.name} provides professional ${industry.toLowerCase()} in ${area}. Licensed, insured team with transparent pricing. Book online or call today for a free quote.`,
    alternates: { canonical: `/site/areas/${slug}` },
  };
}

/* ---------- Page ---------- */
export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const areas = await getTenantAreas(tenant.id);
  let area = areas.find((a) => toSlug(a) === slug);

  if (!area) {
    const reconstructed = fromSlug(slug);
    const match = areas.find(
      (a) => a.toLowerCase() === reconstructed.toLowerCase()
    );
    if (!match) notFound();
    area = match;
  }

  const services = (await getTenantServices(tenant.id)) as Service[];
  const industry = tenant.industry || "Professional Services";
  const phone = tenant.phone || "";
  const businessName = tenant.name || "Our Business";
  const siteUrl = tenant.domain
    ? `https://${tenant.domain}`
    : "https://fullloopcrm.com";

  const content = generateContent(industry, businessName, { area });
  const otherAreas = areas.filter((a) => a !== area);

  /* FAQ */
  const faqs = [
    {
      q: `Do you serve ${area}?`,
      a: `Yes! ${businessName} proudly serves ${area} and the surrounding neighborhoods. Our local team knows the area and can respond quickly to booking requests.`,
    },
    {
      q: `How much does ${industry.toLowerCase()} cost in ${area}?`,
      a:
        services.some((s) => s.base_rate != null)
          ? `Our rates in ${area} start at $${Math.min(
              ...services
                .filter((s) => s.base_rate != null)
                .map((s) => s.base_rate!)
            )}/hr. Exact pricing depends on the service and scope of work. We provide upfront quotes with no hidden fees.`
          : `Pricing depends on the specific service and scope of work. Contact us for a free, no-obligation quote for your ${area} property.`,
    },
    {
      q: `How do I book in ${area}?`,
      a: `You can book online through our website in just a few minutes, or call us${
        phone ? ` at ${phone}` : ""
      }. We'll confirm availability for your ${area} location and send a reminder before the appointment.`,
    },
    {
      q: `What ${industry.toLowerCase()} services do you offer in ${area}?`,
      a: `We offer ${services
        .map((s) => s.name.toLowerCase())
        .join(", ")} in ${area}. All services include our satisfaction guarantee and are performed by licensed, insured professionals.`,
    },
  ];

  /* Schema */
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: businessName,
    ...(phone && { telephone: phone }),
    areaServed: {
      "@type": "Place",
      name: area,
    },
    ...(services.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${industry} Services in ${area}`,
        itemListElement: services.map((s) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: s.name,
            ...(s.description && { description: s.description }),
          },
          ...(s.base_rate != null && {
            price: s.base_rate,
            priceCurrency: "USD",
          }),
        })),
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
    ],
  };

  return (
    <div>
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            localBusinessSchema,
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
            <span className="text-slate-900 font-medium">{area}</span>
          </nav>

          <p className="text-sm font-semibold text-[var(--brand)] uppercase tracking-wider mb-3">
            Serving {area}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            {industry} in{" "}
            <span className="text-[var(--brand)]">{area}</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {businessName} is proud to serve the {area} community with
            professional, reliable {industry.toLowerCase()}. Book online or call
            us today for a free quote.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:opacity-90 rounded-lg transition-colors shadow-lg"
            >
              Book Now in {area}
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

      {/* Services Available */}
      {services.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Our Services in {area}
            </h2>
            <p className="text-slate-600 mb-8">
              All of our professional {industry.toLowerCase()} services are
              available to {area} residents and businesses.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/site/areas/${toSlug(area!)}/${toSlug(service.name)}`}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all group"
                >
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-[var(--brand)] transition-colors">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    {service.base_rate != null && (
                      <span className="text-sm font-semibold text-[var(--brand)]">
                        From ${service.base_rate}/hr
                      </span>
                    )}
                    <span className="text-sm font-medium text-[var(--brand)] group-hover:underline">
                      Book {service.name} in {area} &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Area */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            About Our {industry} in {area}
          </h2>
          <div className="prose prose-slate max-w-none">
            {content.aboutParagraphs.map((p, i) => (
              <p key={i} className="text-slate-600 leading-relaxed mb-4">
                {p}
              </p>
            ))}
            <p className="text-slate-600 leading-relaxed">
              We&apos;re proud to serve {area} with professional{" "}
              {industry.toLowerCase()} services. Our team knows the area and
              provides reliable, high-quality service to homes and businesses
              throughout {area}.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Why Choose {businessName} in {area}?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {content.whyChoose.map((item) => (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-xl p-6"
              >
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Frequently Asked Questions — {area}
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

      {/* Other Areas */}
      {otherAreas.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Other Areas We Serve
            </h2>
            <p className="text-slate-600 mb-8">
              We also provide {industry.toLowerCase()} across these
              neighborhoods.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {otherAreas.map((a) => (
                <Link
                  key={a}
                  href={`/site/areas/${toSlug(a)}`}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-center"
                >
                  {a}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hiring */}
      <section className="py-12 lg:py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            We&apos;re Hiring in {area}!
          </h2>
          <p className="mt-2 text-slate-600">
            Join our growing team and work in your own neighborhood. Competitive
            pay, flexible hours, and a supportive work environment.
          </p>
          <Link
            href={`/site/careers/${toSlug(area!)}`}
            className="mt-4 inline-flex items-center px-6 py-2.5 text-sm font-semibold text-[var(--brand)] border-2 border-[var(--brand)] hover:bg-[var(--brand)] hover:text-white rounded-lg transition-colors"
          >
            View Open Positions in {area}
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Get Started in {area} Today
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Book online in minutes or call us to schedule your first
            appointment. No hidden fees, satisfaction guaranteed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-[var(--brand)] bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-lg"
            >
              Book Now in {area}
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
