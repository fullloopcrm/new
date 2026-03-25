import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantAreas,
  toSlug,
  fromSlug,
} from "@/lib/tenant-site";

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
  );
  const serviceName = svc?.name || fromSlug(serviceSlug);

  return {
    title: `${serviceName} in ${area} | ${tenant.name}`,
    description: `Book professional ${serviceName.toLowerCase()} in ${area} from ${tenant.name}. Experienced team, transparent pricing, satisfaction guaranteed.`,
  };
}

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

  const services = await getTenantServices(tenant.id);
  const service = services.find(
    (s: { name: string }) => toSlug(s.name) === serviceSlug
  ) as {
    id: string;
    name: string;
    description?: string;
    base_rate?: number;
    duration_minutes?: number;
  } | undefined;
  if (!service) notFound();

  const phone = tenant.phone || "";
  const businessName = tenant.name || "Our Business";

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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

      {/* About this service in this area */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            About Our {service.name} in {area}
          </h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed">
              {businessName} provides expert {service.name.toLowerCase()}{" "}
              services to homes and businesses throughout {area}. Our trained,
              professional team delivers consistent, high-quality results
              every time.
            </p>
            <p className="text-slate-600 leading-relaxed mt-4">
              We understand that every space in {area} is unique. That&apos;s
              why we customize our {service.name.toLowerCase()} approach to
              meet your specific needs, preferences, and schedule.
            </p>
          </div>

          {/* Details grid */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-[var(--brand)]">
                {service.base_rate != null ? `$${service.base_rate}` : "Call"}
              </div>
              <div className="mt-1 text-sm text-slate-600">Starting Rate</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-[var(--brand)]">
                {service.duration_minutes != null
                  ? `${service.duration_minutes} min`
                  : "Varies"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Estimated Duration
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-[var(--brand)]">
                100%
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Satisfaction Guaranteed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other services in this area */}
      {services.length > 1 && (
        <section className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Other Services in {area}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {services
                .filter((s: { id: string }) => s.id !== service.id)
                .map((s: { id: string; name: string }) => (
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

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Book {service.name} in {area}
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Schedule your appointment online in just a few minutes.
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
