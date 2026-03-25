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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return { title: "Area" };

  const areas = await getTenantAreas(tenant.id);
  const area = areas.find((a) => toSlug(a) === slug);
  if (!area) return { title: "Area Not Found" };

  const industry = tenant.industry || "Professional Services";

  return {
    title: `${industry} in ${area} | ${tenant.name}`,
    description: `${tenant.name} provides professional ${industry.toLowerCase()} in ${area}. Book online or call today.`,
  };
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const areas = await getTenantAreas(tenant.id);
  const area = areas.find((a) => toSlug(a) === slug);

  if (!area) {
    // Try to reconstruct from slug as fallback
    const reconstructed = fromSlug(slug);
    const match = areas.find(
      (a) => a.toLowerCase() === reconstructed.toLowerCase()
    );
    if (!match) notFound();
    // If we found a match by reconstruction, use it
    return renderAreaPage(tenant, match);
  }

  return renderAreaPage(tenant, area);
}

async function renderAreaPage(
  tenant: {
    id: string;
    name?: string;
    phone?: string;
    industry?: string;
  },
  area: string
) {
  const services = await getTenantServices(tenant.id);
  const industry = tenant.industry || "Professional Services";
  const phone = tenant.phone || "";
  const businessName = tenant.name || "Our Business";

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-[var(--brand)] uppercase tracking-wider mb-3">
            Serving {area}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            {industry} in{" "}
            <span className="text-[var(--brand)]">{area}</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {businessName} is proud to serve the {area} community with
            professional, reliable {industry.toLowerCase()}. Book online or
            call us today.
          </p>
        </div>
      </section>

      {/* Services in this area */}
      {services.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Our Services in {area}
            </h2>
            <p className="text-slate-600 mb-8">
              All of our professional services are available to {area}{" "}
              residents and businesses.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map(
                (service: {
                  id: string;
                  name: string;
                  description?: string;
                  base_rate?: number;
                }) => (
                  <Link
                    key={service.id}
                    href={`/site/areas/${toSlug(area)}/${toSlug(service.name)}`}
                    className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all group"
                  >
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-[var(--brand)] transition-colors">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                    {service.base_rate != null && (
                      <p className="mt-3 text-sm font-semibold text-[var(--brand)]">
                        From ${service.base_rate}
                      </p>
                    )}
                  </Link>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Why Choose {businessName} in {area}?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                title: "Local Team",
                desc: `Our team members live and work in ${area}, so we know the community and can respond quickly.`,
              },
              {
                title: "Licensed & Insured",
                desc: "Fully licensed, bonded, and insured for your complete peace of mind.",
              },
              {
                title: "Transparent Pricing",
                desc: "No surprise charges. You'll know exactly what you're paying before we start.",
              },
              {
                title: "Satisfaction Guaranteed",
                desc: "Not happy with our work? We'll come back and make it right, free of charge.",
              },
            ].map((item) => (
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

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Get Started in {area} Today
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Book online in minutes or call us to schedule your first
            appointment.
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
