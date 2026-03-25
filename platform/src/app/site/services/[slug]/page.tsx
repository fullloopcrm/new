import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantAreas,
  toSlug,
} from "@/lib/tenant-site";

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
  );
  if (!service) return { title: "Service Not Found" };

  return {
    title: `${service.name} | ${tenant.name}`,
    description:
      service.description ||
      `Professional ${service.name} service by ${tenant.name}.`,
  };
}

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
  ) as {
    id: string;
    name: string;
    description?: string;
    base_rate?: number;
    duration_minutes?: number;
  } | undefined;

  if (!service) notFound();

  const areas = await getTenantAreas(tenant.id);
  const phone = tenant.phone || "";

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            {service.name}
          </h1>
          {service.description && (
            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {service.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {service.base_rate != null && (
              <div className="bg-white border border-slate-200 rounded-xl px-6 py-3 shadow-sm">
                <span className="text-sm text-slate-500">Starting at</span>
                <span className="ml-2 text-2xl font-bold text-[var(--brand)]">
                  ${service.base_rate}
                </span>
              </div>
            )}
            {service.duration_minutes != null && (
              <div className="bg-white border border-slate-200 rounded-xl px-6 py-3 shadow-sm">
                <span className="text-sm text-slate-500">Duration</span>
                <span className="ml-2 text-2xl font-bold text-slate-900">
                  {service.duration_minutes} min
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            What&apos;s Included
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Professional-grade equipment and supplies",
              "Experienced, background-checked team members",
              "Satisfaction guarantee on every visit",
              "Flexible scheduling to fit your needs",
              "Transparent pricing with no hidden fees",
              "Dedicated support before and after service",
            ].map((item) => (
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

      {/* Service Areas */}
      {areas.length > 0 && (
        <section className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {service.name} Available In
            </h2>
            <p className="text-slate-600 mb-8">
              We proudly offer {service.name.toLowerCase()} in the following
              areas.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {areas.map((area) => (
                <Link
                  key={area}
                  href={`/site/areas/${toSlug(area)}/${toSlug(service.name)}`}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-center"
                >
                  {area}
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
            Schedule your appointment online in minutes or give us a call.
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
