import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  services,
  findServiceBySlug,
  boroughs,
  getNeighborhoodsByBorough,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
} from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = findServiceBySlug(slug);
  if (!s) return {};
  return {
    title: `Become a ${s.name} Specialist — Stretch NYC Jobs | $50/hr`,
    description: `Stretch NYC is hiring ${s.name} specialists across all 5 NYC boroughs. $50/hr, flexible schedule, fast payment. ${s.shortDesc}`,
    alternates: { canonical: `${SITE_URL}/jobs/service/${s.slug}` },
  };
}

export default async function ServiceJobPage({ params }: Props) {
  const { slug } = await params;
  const s = findServiceBySlug(slug);
  if (!s) notFound();

  const otherServices = services.filter((os) => os.slug !== s.slug);

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Become a ${s.name} Specialist — Stretch NYC Jobs`,
          `Hiring ${s.name} specialists across NYC. $50/hr, flexible schedule.`,
          `${SITE_URL}/jobs/service/${s.slug}`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
          { name: s.name, url: `${SITE_URL}/jobs/service/${s.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/jobs" className="hover:text-white">
              Jobs
            </Link>{" "}
            / Service Specialty
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Become a <span className="text-teal-200">{s.name}</span> Specialist
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {s.tagline}. Join Stretch NYC and deliver expert {s.name.toLowerCase()}{" "}
            sessions across all five boroughs. Starting at $50/hour.
          </p>
        </div>
      </section>

      {/* About This Service */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            About {s.name}
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            {s.description}
          </p>
        </div>
      </section>

      {/* What You Need to Know */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            What a {s.name} Specialist Does
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            As a {s.name.toLowerCase()} specialist with Stretch NYC, you&apos;ll
            deliver these key elements in every session:
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {s.features.map((feat) => (
              <div
                key={feat}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <span className="mt-0.5 text-teal-600 font-bold">
                  &#10003;
                </span>
                <p className="text-sm text-slate-700">{feat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal Client Types */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Clients You&apos;ll Work With
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            {s.name} is most popular with these client types. You should be
            comfortable working with all of them.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {s.idealFor.map((client) => (
              <span
                key={client}
                className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700"
              >
                {client}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Skills & Certifications */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Skills &amp; Qualifications for {s.name}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Required Skills
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  `Hands-on experience performing ${s.name.toLowerCase()} techniques`,
                  "Strong knowledge of anatomy, kinesiology, and biomechanics",
                  "Ability to assess client mobility and customize sessions",
                  "Clear communication to explain techniques to clients",
                  "Carry your own mat and arrive on time to every session",
                ].map((skill) => (
                  <div key={skill} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">
                      &#10003;
                    </span>
                    <p className="text-sm text-slate-700">{skill}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Preferred Certifications
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  "Certified Stretch Therapist (CST) or equivalent",
                  "Licensed Massage Therapist (LMT)",
                  "NASM, ACE, or NSCA Personal Training Certification",
                  "Physical Therapy Assistant or related degree",
                  "CPR / First Aid certified",
                ].map((cert) => (
                  <div key={cert} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">
                      &#9733;
                    </span>
                    <p className="text-sm text-slate-700">{cert}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Where This Service Is in Demand */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Where {s.name} Is in Demand
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We need {s.name.toLowerCase()} specialists in every borough. Here
            are the neighborhoods with open positions:
          </p>
          <div className="mt-10 space-y-8">
            {boroughs.map((b) => {
              const bNeighborhoods = getNeighborhoodsByBorough(b.slug);
              return (
                <div key={b.slug}>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    <Link
                      href={`/jobs/${b.slug}`}
                      className="text-teal-700 hover:text-teal-900"
                    >
                      {b.shortName}
                    </Link>{" "}
                    <span className="text-sm font-normal text-slate-500">
                      ({bNeighborhoods.length} neighborhoods)
                    </span>
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bNeighborhoods.slice(0, 12).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/jobs/${b.slug}/${n.slug}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700"
                      >
                        {n.name}
                      </Link>
                    ))}
                    {bNeighborhoods.length > 12 && (
                      <Link
                        href={`/jobs/${b.slug}`}
                        className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"
                      >
                        +{bNeighborhoods.length - 12} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Job Details */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">
              Position Details
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">
              Part-Time Mobile Stretch Therapist — {s.name} Specialist
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                Starting $50/hr
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                Part-Time / Flexible
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                7AM - 10PM Daily
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                Paid Within 30 Min
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                All 5 Boroughs
              </span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We&apos;re looking for therapists with strong{" "}
              {s.name.toLowerCase()} skills to join our growing team. You&apos;ll
              deliver mobile {s.name.toLowerCase()} sessions to clients across
              NYC. Bring your own mat, bring your expertise, and we handle
              marketing, scheduling, and payments.
            </p>
          </div>
        </div>
      </section>

      {/* Other Service Specialties */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Other Service Specialties
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {otherServices.map((os) => (
              <Link
                key={os.slug}
                href={`/jobs/service/${os.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  {os.name}
                </h3>
                <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">
                  View Jobs &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">
            Apply as a {s.name} Specialist
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Put your {s.name.toLowerCase()} expertise to work. $50/hour,
            flexible schedule, fast payment, and clients already waiting for you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://stretchjobs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta"
            >
              Apply at stretchjobs.com
            </a>
            <a
              href="mailto:jobs@stretchny.com?subject=Stretch%20Therapist%20Application%20-%20{s.name}"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
            >
              Email jobs@stretchny.com
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">
            Or call/text us at{" "}
            <a href={SITE_SMS_LINK} className="underline hover:text-white">
              {SITE_PHONE}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
