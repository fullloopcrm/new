import Link from "next/link";
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantAreas,
  toSlug,
} from "@/lib/tenant-site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  const industry = tenant?.industry || "Professional Services";
  return {
    title: tenant ? `${industry} Services | ${tenant.name}` : "Services",
    description: tenant
      ? `Browse all professional ${industry.toLowerCase()} services offered by ${tenant.name}. Transparent pricing, licensed team, satisfaction guaranteed. Book online today.`
      : "Our services.",
    alternates: { canonical: "/site/services" },
  };
}

export default async function ServicesPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const services = await getTenantServices(tenant.id);
  const areas = await getTenantAreas(tenant.id);
  const industry = tenant.industry || "Professional Services";
  const businessName = tenant.name || "Our Business";

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-slate-900">Our Services</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            {businessName} offers a full range of professional{" "}
            {industry.toLowerCase()} services. All services include transparent
            pricing and a satisfaction guarantee.
          </p>
        </div>

        {/* Services Grid */}
        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(
              (service: {
                id: string;
                name: string;
                description?: string;
                base_rate?: number;
                duration_minutes?: number;
              }) => (
                <Link
                  key={service.id}
                  href={`/site/services/${toSlug(service.name)}`}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all flex flex-col group"
                >
                  <h2 className="text-xl font-semibold text-slate-900 group-hover:text-[var(--brand)] transition-colors">
                    {service.name}
                  </h2>
                  {service.description && (
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed flex-1">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      {service.base_rate != null && (
                        <span className="text-lg font-bold text-[var(--brand)]">
                          ${service.base_rate}/hr
                        </span>
                      )}
                      {service.duration_minutes != null && (
                        <span className="ml-2 text-sm text-slate-500">
                          &middot; ~{service.duration_minutes} min
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[var(--brand)] group-hover:opacity-90 rounded-lg transition-colors">
                      Learn More
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p>Services coming soon. Contact us for more information.</p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-slate-50 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Not sure which service you need?
          </h2>
          <p className="mt-3 text-slate-600">
            Contact us for a free consultation. We&apos;ll recommend the perfect
            service for your needs.
          </p>
          <Link
            href="/site/contact"
            className="mt-6 inline-flex items-center px-6 py-3 text-sm font-semibold text-[var(--brand)] border-2 border-[var(--brand)] hover:bg-[var(--brand)] hover:text-white rounded-lg transition-colors"
          >
            Get in Touch
          </Link>
        </div>

        {/* Area Links */}
        {areas.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
              Service Areas
            </h2>
            <p className="text-slate-600 text-center mb-8">
              We offer our services across {areas.length} neighborhoods.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {areas.map((area) => (
                <Link
                  key={area}
                  href={`/site/areas/${toSlug(area)}`}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-center"
                >
                  {area}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
