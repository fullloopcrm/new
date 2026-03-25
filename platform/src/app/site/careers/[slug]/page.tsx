import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTenantFromHeaders,
  getTenantAreas,
  toSlug,
} from "@/lib/tenant-site";
import { supabaseAdmin } from "@/lib/supabase";
import CareerApplicationForm from "../CareerApplicationForm";

async function getAverageHourlyRate(tenantId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("team_members")
    .select("hourly_rate")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (!data || data.length === 0) return null;
  const rates = data
    .map((m: { hourly_rate?: number }) => m.hourly_rate)
    .filter((r): r is number => r != null && r > 0);
  if (rates.length === 0) return null;
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return { title: "Careers" };

  const areas = await getTenantAreas(tenant.id);
  const area = areas.find((a) => toSlug(a) === slug);
  if (!area) return { title: "Careers" };

  const industry = tenant.industry || "Professional Services";

  return {
    title: `${industry} Jobs in ${area} | ${tenant.name}`,
    description: `Now hiring ${industry.toLowerCase()} professionals in ${area}. Flexible hours, weekly pay, growth opportunities. Apply today at ${tenant.name}.`,
  };
}

export default async function AreaCareerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const areas = await getTenantAreas(tenant.id);
  const area = areas.find((a) => toSlug(a) === slug);
  if (!area) notFound();

  const businessName = tenant.name || "Our Business";
  const industry = tenant.industry || "Professional Services";
  const avgRate = await getAverageHourlyRate(tenant.id);

  const jobTitle = `${industry} Professional`;
  const minPay = avgRate ? Math.max(15, avgRate - 5) : 18;
  const maxPay = avgRate ? avgRate + 10 : 35;

  return (
    <div>
      {/* Google Jobs JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "JobPosting",
            title: `${jobTitle} — ${area}`,
            description: `${businessName} is hiring ${industry.toLowerCase()} professionals in ${area}. Flexible schedule, weekly pay, and growth opportunities.`,
            hiringOrganization: {
              "@type": "Organization",
              name: businessName,
              sameAs: tenant.website || undefined,
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: area,
                addressRegion: tenant.state || undefined,
                addressCountry: "US",
              },
            },
            baseSalary: {
              "@type": "MonetaryAmount",
              currency: "USD",
              value: {
                "@type": "QuantitativeValue",
                minValue: minPay,
                maxValue: maxPay,
                unitText: "HOUR",
              },
            },
            employmentType: ["FULL_TIME", "PART_TIME"],
            datePosted: new Date().toISOString().split("T")[0],
            validThrough: new Date(
              Date.now() + 90 * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split("T")[0],
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-[var(--brand)] uppercase tracking-wider mb-3">
            Now Hiring
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
            {industry} Jobs in{" "}
            <span className="text-[var(--brand)]">{area}</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {businessName} is looking for motivated professionals to join our
            team in {area}. No experience required — we train you.
          </p>
        </div>
      </section>

      {/* Job Details */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                The Role
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  As a {jobTitle} at {businessName}, you&apos;ll provide
                  top-quality {industry.toLowerCase()} services to our clients
                  in {area} and surrounding neighborhoods.
                </p>
                <p>
                  You&apos;ll work with a supportive, professional team and
                  have access to all the equipment and supplies you need. We
                  value reliability, attention to detail, and a positive
                  attitude.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-4">
                What You&apos;ll Do
              </h3>
              <ul className="space-y-2">
                {[
                  `Deliver professional ${industry.toLowerCase()} services to residential and commercial clients`,
                  "Maintain high standards of quality and customer satisfaction",
                  "Communicate professionally with clients and team members",
                  "Follow safety guidelines and company procedures",
                  "Report to scheduled appointments on time",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
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
                    <span className="text-sm text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pay & Benefits */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Pay &amp; Benefits
              </h2>

              {/* Pay Range */}
              <div className="bg-[var(--brand)] rounded-xl p-6 text-white mb-6">
                <div className="text-sm font-medium text-white/80">
                  Pay Range
                </div>
                <div className="text-3xl font-bold mt-1">
                  ${minPay} — ${maxPay}/hr
                </div>
                <div className="text-sm text-white/70 mt-1">
                  Based on experience and role
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "Flexible Schedule",
                    desc: "Full-time, part-time, and weekend shifts available",
                  },
                  {
                    title: "Weekly Pay",
                    desc: "Direct deposit every week, never wait for your money",
                  },
                  {
                    title: "Bilingual Team",
                    desc: "English and Spanish spoken — everyone is welcome",
                  },
                  {
                    title: "Growth Path",
                    desc: "Advance to lead, trainer, or management roles",
                  },
                  {
                    title: "Training Provided",
                    desc: "Paid training for all new team members",
                  },
                  {
                    title: "Supplies Included",
                    desc: "All equipment and materials provided by us",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3"
                  >
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
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-sm text-slate-600">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Apply for {area}
          </h2>
          <p className="text-slate-600 mb-8">
            Fill out the form below and we&apos;ll be in touch within 24-48
            hours.
          </p>
          <CareerApplicationForm tenantId={tenant.id} area={area} />
        </div>
      </section>
    </div>
  );
}
