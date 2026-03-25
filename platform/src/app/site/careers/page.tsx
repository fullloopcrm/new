import Link from "next/link";
import type { Metadata } from "next";
import {
  getTenantFromHeaders,
  getTenantAreas,
  toSlug,
} from "@/lib/tenant-site";
import CareerApplicationForm from "./CareerApplicationForm";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  return {
    title: tenant ? `Careers | ${tenant.name}` : "Careers",
    description: tenant
      ? `Join the ${tenant.name} team. We're hiring professionals across all service areas.`
      : "Career opportunities available.",
  };
}

export default async function CareersPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const areas = await getTenantAreas(tenant.id);
  const businessName = tenant.name || "Our Business";
  const industry = tenant.industry || "Professional Services";

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            Join the{" "}
            <span className="text-[var(--brand)]">{businessName}</span> Team
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We&apos;re always looking for motivated, reliable professionals to
            join our growing team. If you take pride in your work and want to
            be part of something great, we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Why Work With Us
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                title: "Flexible Schedule",
                desc: "Choose shifts that work for your life. We offer full-time, part-time, and weekend availability.",
              },
              {
                title: "Weekly Pay",
                desc: "Get paid every week via direct deposit. No waiting around for your paycheck.",
              },
              {
                title: "Growth Opportunities",
                desc: "We promote from within. Top performers can advance to lead and management roles.",
              },
              {
                title: "Supportive Team",
                desc: "Join a bilingual, diverse team that supports each other and celebrates wins together.",
              },
              {
                title: "Training Provided",
                desc: "No experience? No problem. We provide hands-on training so you can hit the ground running.",
              },
              {
                title: "Equipment & Supplies",
                desc: "We provide everything you need to do the job right. Just show up ready to work.",
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

      {/* Hiring Areas */}
      {areas.length > 0 && (
        <section className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Now Hiring In
            </h2>
            <p className="text-slate-600 mb-8">
              We have open positions for {industry.toLowerCase()} professionals
              in the following areas.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {areas.map((area) => (
                <Link
                  key={area}
                  href={`/site/careers/${toSlug(area)}`}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors text-center"
                >
                  {area}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Application Form */}
      <section className="py-16 lg:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Apply Now
          </h2>
          <p className="text-slate-600 mb-8">
            Fill out the form below and we&apos;ll be in touch within 24-48
            hours.
          </p>
          <CareerApplicationForm tenantId={tenant.id} />
        </div>
      </section>
    </div>
  );
}
