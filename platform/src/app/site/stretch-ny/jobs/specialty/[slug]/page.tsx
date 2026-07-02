// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  clientTypes,
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
  const ct = clientTypes.find((c) => c.slug === slug);
  if (!ct) return {};
  return {
    title: `Become a ${ct.name} Stretch Specialist — Stretch NYC Jobs | $50/hr`,
    description: `Stretch NYC is hiring therapists who specialize in working with ${ct.name.toLowerCase()}. $50/hr, flexible schedule, fast payment. ${ct.shortDesc}`,
    alternates: { canonical: `${SITE_URL}/jobs/specialty/${ct.slug}` },
  };
}

export default async function SpecialtyJobPage({ params }: Props) {
  const { slug } = await params;
  const ct = clientTypes.find((c) => c.slug === slug);
  if (!ct) notFound();

  const otherClientTypes = clientTypes.filter((c) => c.slug !== ct.slug);

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Become a ${ct.name} Stretch Specialist — Stretch NYC Jobs`,
          `Hiring therapists specializing in ${ct.name.toLowerCase()}. $50/hr, flexible schedule.`,
          `${SITE_URL}/jobs/specialty/${ct.slug}`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
          {
            name: ct.name,
            url: `${SITE_URL}/jobs/specialty/${ct.slug}`,
          },
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
            / Client Specialty
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            <span className="mr-3 text-4xl sm:text-5xl">{ct.emoji}</span>
            Become a{" "}
            <span className="text-teal-200">{ct.name}</span> Stretch Specialist
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {ct.shortDesc} Join Stretch NYC and help this population move better,
            feel better, and live better. Starting at $50/hour.
          </p>
        </div>
      </section>

      {/* About This Client Type */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            About Working With {ct.name}
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            {ct.shortDesc} As a stretch therapist specializing in{" "}
            {ct.name.toLowerCase()}, you&apos;ll develop deep expertise in
            addressing the specific mobility challenges, pain patterns, and
            wellness goals of this population. This is rewarding work — your
            clients will see and feel measurable improvement from every session
            you deliver.
          </p>
        </div>
      </section>

      {/* Pain Points You'll Address */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Pain Points You&apos;ll Address
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            These are the most common issues your clients will present. You
            should be confident addressing all of them.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ct.painPoints.map((pp) => (
              <div
                key={pp}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <span className="mt-0.5 text-teal-600 font-bold">
                  &#10003;
                </span>
                <p className="text-sm text-slate-700">{pp}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Needed */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Skills Needed for This Specialty
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Required Experience
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  `Experience working with ${ct.name.toLowerCase()}`,
                  "Strong knowledge of anatomy and common conditions for this population",
                  "Ability to modify techniques based on client limitations",
                  "Excellent communication and empathy skills",
                  "Carry your own mat and arrive punctually to every session",
                  "Positive, encouraging attitude that builds client confidence",
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
                Preferred Qualifications
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  "Certified Stretch Therapist (CST) or equivalent",
                  "Licensed Massage Therapist (LMT)",
                  "Experience in physical therapy or rehabilitation settings",
                  "Training in PNF, myofascial release, or related modalities",
                  "CPR / First Aid certified",
                  "Knowledge of common medications and their effects on flexibility",
                ].map((qual) => (
                  <div key={qual} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">
                      &#9733;
                    </span>
                    <p className="text-sm text-slate-700">{qual}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Where This Specialty Is in Demand */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Where This Specialty Is in Demand
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We need {ct.name.toLowerCase()} specialists in every borough.
            Here&apos;s where clients are waiting:
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
                    {bNeighborhoods.slice(0, 10).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/jobs/${b.slug}/${n.slug}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700"
                      >
                        {n.name}
                      </Link>
                    ))}
                    {bNeighborhoods.length > 10 && (
                      <Link
                        href={`/jobs/${b.slug}`}
                        className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"
                      >
                        +{bNeighborhoods.length - 10} more
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
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">
              Position Details
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">
              Part-Time Mobile Stretch Therapist — {ct.name} Specialist
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
              We&apos;re looking for therapists who are experienced and
              passionate about working with {ct.name.toLowerCase()}. You&apos;ll
              deliver mobile stretch therapy sessions tailored to this
              population&apos;s unique needs. Bring your own mat, show up on
              time with positive energy, and we handle marketing, scheduling,
              and payments.
            </p>
          </div>
        </div>
      </section>

      {/* Other Client Specialties */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Other Client Specialties
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherClientTypes.map((oc) => (
              <Link
                key={oc.slug}
                href={`/jobs/specialty/${oc.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <span className="text-2xl">{oc.emoji}</span>
                <h3 className="mt-2 text-sm font-bold text-slate-900 font-heading">
                  {oc.name}
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
            Apply as a {ct.name} Specialist
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Use your expertise with {ct.name.toLowerCase()} to earn $50/hour
            with Stretch NYC. Flexible schedule, fast payment, and clients
            already booked for you.
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
              href="mailto:jobs@stretchny.com?subject=Stretch%20Therapist%20Application"
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
