// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  findBoroughBySlug,
  findNeighborhoodBySlug,
  getNeighborhoodsByBorough,
  services,
  clientTypes,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
} from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

interface Props {
  params: Promise<{ borough: string; neighborhood: string }>;
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, neighborhood } = await params;
  const b = findBoroughBySlug(borough);
  const n = findNeighborhoodBySlug(borough, neighborhood);
  if (!b || !n) return {};
  return {
    title: `Stretch Therapist Jobs ${n.name} | $50/hr | Stretch NYC`,
    description: `Stretch service therapist jobs in ${n.name}, ${b.name}. $50/hr, flexible schedule 7AM-10PM, fast payment. Join the Stretch NYC team. Apply now.`,
    alternates: { canonical: `${SITE_URL}/jobs/${b.slug}/${n.slug}` },
  };
}

export default async function NeighborhoodJobsPage({ params }: Props) {
  const { borough, neighborhood } = await params;
  const b = findBoroughBySlug(borough);
  const n = findNeighborhoodBySlug(borough, neighborhood);
  if (!b || !n) notFound();

  const siblingNeighborhoods = getNeighborhoodsByBorough(borough).filter(
    (sn) => sn.slug !== n.slug
  );

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Stretch Therapist Jobs in ${n.name}, ${b.name}`,
          `Hiring stretch therapists in ${n.name}, ${b.name}. $50/hr, flexible schedule.`,
          `${SITE_URL}/jobs/${b.slug}/${n.slug}`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
          { name: b.name, url: `${SITE_URL}/jobs/${b.slug}` },
          { name: n.name, url: `${SITE_URL}/jobs/${b.slug}/${n.slug}` },
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
            /{" "}
            <Link href={`/jobs/${b.slug}`} className="hover:text-white">
              {b.name}
            </Link>
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service Jobs in{" "}
            <span className="text-teal-200">{n.name}</span>, {b.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Stretch NYC needs mobile stretch therapists to serve clients in{" "}
            {n.name}. Starting at $50/hour with flexible scheduling and payment
            within 30 minutes.
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
              href="mailto:jobs@stretchny.com?subject=Stretch%20Therapist%20Application%20-%20{n.name}"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
            >
              Email jobs@stretchny.com
            </a>
          </div>
        </div>
      </section>

      {/* About the Neighborhood */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            About {n.name}
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            {n.description}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            <strong>Vibe:</strong> {n.vibe}
          </p>
          {n.landmarks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Nearby Landmarks
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {n.landmarks.map((lm) => (
                  <span
                    key={lm}
                    className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700"
                  >
                    {lm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Position Details */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">
              Now Hiring in {n.name}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">
              Part-Time Mobile Stretch Therapist
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
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We have clients in {n.name} booking assisted stretching sessions
              regularly. As a {n.name} stretchologist, you&apos;ll visit clients
              at their homes, offices, and local spots to deliver professional
              stretch therapy. Bring your own mat, show up on time with a great
              attitude, and we handle everything else — marketing, booking,
              payment processing, and client relationships.
            </p>
          </div>
        </div>
      </section>

      {/* Services Needed */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Services in Demand in {n.name}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            {n.name} clients book all 11 stretch modalities. Here are the
            services you&apos;ll deliver:
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.slug}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md"
              >
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {s.shortDesc}
                </p>
                <Link
                  href={`/jobs/service/${s.slug}`}
                  className="mt-3 inline-block text-xs font-semibold text-teal-600 font-cta"
                >
                  Learn More &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Types */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Client Types in {n.name}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            You&apos;ll work with a diverse range of clients in this
            neighborhood.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {clientTypes.map((ct) => (
              <Link
                key={ct.slug}
                href={`/jobs/specialty/${ct.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md"
              >
                <span className="text-2xl">{ct.emoji}</span>
                <h3 className="mt-2 text-sm font-bold text-slate-900 font-heading">
                  {ct.name}
                </h3>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                  {ct.shortDesc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements & Pay */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Requirements &amp; Pay
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                What You Need
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  "Experienced in assisted stretching, PNF, or related bodywork",
                  "Carry your own mat to every session",
                  "Must be able to travel to " + n.name + ", " + b.name,
                  "Punctual — clients expect you on time, every time",
                  "Positive attitude and passion for wellness",
                  "Strong anatomy knowledge",
                ].map((req) => (
                  <div key={req} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">
                      &#10003;
                    </span>
                    <p className="text-sm text-slate-700">{req}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                What You Get
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  "Starting $50/hour — competitive pay in the wellness industry",
                  "Paid within 30 minutes of session completion",
                  "Flexible schedule — 7AM to 10PM, pick your own hours",
                  "Established client base in " + n.name + " ready for you",
                  "We handle marketing, sales, scheduling, and payments",
                  "Work near home — choose neighborhoods that suit you",
                ].map((perk) => (
                  <div key={perk} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">
                      &#9733;
                    </span>
                    <p className="text-sm text-slate-700">{perk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Neighborhood Jobs */}
      {siblingNeighborhoods.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              More {b.name} Jobs
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Also hiring in these {b.name} neighborhoods:
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {siblingNeighborhoods.map((sn) => (
                <Link
                  key={sn.slug}
                  href={`/jobs/${b.slug}/${sn.slug}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md"
                >
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    {sn.name}
                  </h3>
                  <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">
                    View Jobs &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Apply CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">
            Apply to Stretch {n.name}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Join the Stretch NYC team and start earning $50/hour serving clients
            in {n.name}, {b.name}. Fast payment, flexible schedule, established
            client base.
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
