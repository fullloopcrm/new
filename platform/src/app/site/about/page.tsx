import { getTenantFromHeaders, getTenantTeamCount } from "@/lib/tenant-site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  return {
    title: tenant ? `About — ${tenant.name}` : "About",
    description: tenant ? `Learn more about ${tenant.name}.` : "About us.",
  };
}

const values = [
  { title: "Quality First", description: "We never cut corners. Every job is completed to the highest standard, period." },
  { title: "Reliability", description: "We show up on time, every time. You can count on us to deliver consistently." },
  { title: "Transparency", description: "No hidden fees, no surprises. Clear pricing and honest communication always." },
  { title: "Customer Focus", description: "Your satisfaction drives everything we do. We listen, adapt, and go the extra mile." },
];

export default async function AboutPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const teamCount = await getTenantTeamCount(tenant.id);
  const businessName = tenant.name || "Our Business";
  const tagline = tenant.tagline || "";

  // Calculate years in business
  const createdAt = tenant.created_at ? new Date(tenant.created_at) : new Date();
  const yearsInBusiness = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));

  return (
    <div>
      {/* Company Story */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-slate-900">About {businessName}</h1>
            {tagline && (
              <p className="mt-4 text-xl text-[var(--brand)] font-medium">{tagline}</p>
            )}
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              For {yearsInBusiness === 1 ? "the past year" : `over ${yearsInBusiness} years`}, {businessName} has
              been dedicated to providing honest, high-quality service that people can rely on.
              {teamCount > 0 && (
                <> Our team of {teamCount} professional{teamCount !== 1 ? "s" : ""} is fully trained and passionate about what they do.</>
              )}
            </p>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              We believe that every customer deserves professional-grade service at a fair price.
              When you choose {businessName}, you&apos;re choosing peace of mind.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white">{yearsInBusiness}+</div>
              <div className="mt-1 text-sm text-white/80">{yearsInBusiness === 1 ? "Year" : "Years"} in Business</div>
            </div>
            {teamCount > 0 && (
              <div>
                <div className="text-4xl font-bold text-white">{teamCount}</div>
                <div className="mt-1 text-sm text-white/80">Team Member{teamCount !== 1 ? "s" : ""}</div>
              </div>
            )}
            <div>
              <div className="text-4xl font-bold text-white">100%</div>
              <div className="mt-1 text-sm text-white/80">Satisfaction Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values / Mission */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Our Values</h2>
            <p className="mt-3 text-slate-600">The principles that guide everything we do.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-[var(--brand)]">{value.title}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
