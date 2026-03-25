import Link from "next/link";
import { getTenantFromHeaders, getTenantServices } from "@/lib/tenant-site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  return {
    title: tenant ? `Services — ${tenant.name}` : "Services",
    description: tenant ? `Professional services offered by ${tenant.name}.` : "Our services.",
  };
}

export default async function ServicesPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const services = await getTenantServices(tenant.id);

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-slate-900">Our Services</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            We offer a full range of professional services to meet your needs.
            All services include a satisfaction guarantee.
          </p>
        </div>

        {/* Services Grid */}
        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service: {
              id: string;
              name: string;
              description?: string;
              default_hourly_rate?: number;
              default_duration_hours?: number;
            }) => (
              <div
                key={service.id}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all flex flex-col"
              >
                <h2 className="text-xl font-semibold text-slate-900">{service.name}</h2>
                {service.description && (
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed flex-1">{service.description}</p>
                )}
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    {service.default_hourly_rate != null && (
                      <span className="text-lg font-bold text-[var(--brand)]">
                        ${service.default_hourly_rate}/hr
                      </span>
                    )}
                    {service.default_duration_hours != null && (
                      <span className="ml-2 text-sm text-slate-500">
                        · ~{service.default_duration_hours} {service.default_duration_hours === 1 ? "hour" : "hours"}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/site/book"
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p>Services coming soon. Contact us for more information.</p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-slate-50 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-slate-900">Not sure which service you need?</h2>
          <p className="mt-3 text-slate-600">
            Contact us for a free consultation. We&apos;ll recommend the perfect service for your needs.
          </p>
          <Link
            href="/site/contact"
            className="mt-6 inline-flex items-center px-6 py-3 text-sm font-semibold text-[var(--brand)] border-2 border-[var(--brand)] hover:bg-[var(--brand)] hover:text-white rounded-lg transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  );
}
