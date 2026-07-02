// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  boroughs,
  findBoroughBySlug,
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
  params: Promise<{ borough: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough } = await params;
  const b = findBoroughBySlug(borough);
  if (!b) return {};
  const bNeighborhoods = getNeighborhoodsByBorough(borough);
  return {
    title: `Stretch Therapist Jobs ${b.name} | $50/hr | Stretch NYC`,
    description: `Stretch service therapist jobs across ${bNeighborhoods.length} ${b.name} neighborhoods. $50/hr, flexible schedule 7AM-10PM, fast payment. Apply at stretchjobs.com.`,
    alternates: { canonical: `${SITE_URL}/jobs/${b.slug}` },
  };
}

export default async function BoroughJobsPage({ params }: Props) {
  const { borough } = await params;
  const b = findBoroughBySlug(borough);
  if (!b) notFound();

  const bNeighborhoods = getNeighborhoodsByBorough(borough);

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Stretch Therapist Jobs in ${b.name}`,
          `Hiring mobile stretch therapists across ${bNeighborhoods.length} ${b.name} neighborhoods. $50/hr.`,
          `${SITE_URL}/jobs/${b.slug}`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
          { name: b.name, url: `${SITE_URL}/jobs/${b.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Now Hiring in {b.name} &mdash; $50/hr | Flexible Hours
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service Jobs in{" "}
            <span className="text-teal-200">{b.shortName}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Mobile stretch therapist positions across {bNeighborhoods.length} {b.name} neighborhoods. $50/hr starting, flexible scheduling, fast payment. Join the Stretch NYC team.
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
              href="mailto:jobs@stretchny.com?subject=Stretch%20Therapist%20Application%20-%20{b.name}"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
            >
              Email jobs@stretchny.com
            </a>
          </div>
        </div>
      </section>

      {/* Position Overview */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">
              Now Hiring in {b.name}
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
              Stretch NYC needs experienced stretch therapists to serve our
              growing {b.name} client base. You&apos;ll travel to clients in{" "}
              {b.name} — their homes, offices, hotels, and outdoor spots —
              delivering personalized assisted stretching sessions. Bring your
              own mat, bring your energy, and we handle the rest: marketing,
              scheduling, payment processing, and client acquisition.
            </p>
          </div>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {b.name} Neighborhoods Hiring
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We need stretchologists in every {b.name} neighborhood. Pick the
            area closest to you.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {bNeighborhoods.map((n) => (
              <Link
                key={n.slug}
                href={`/jobs/${b.slug}/${n.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  {n.name}
                </h3>
                <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">
                  View Jobs &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Services Needing Coverage */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Services We Need Covered in {b.name}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Our {b.name} clients book all 11 stretch modalities. We need
            therapists skilled in each one.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/jobs/service/${s.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md"
              >
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {s.shortDesc}
                </p>
                <span className="mt-3 inline-block text-xs font-semibold text-teal-600 font-cta">
                  Learn More &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Client Types Needing Coverage */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Client Specialties in {b.name}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            {b.name} has a diverse client base. We need therapists experienced
            with every population.
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
                <span className="mt-2 inline-block text-xs font-semibold text-teal-600 font-cta">
                  View Specialty &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            What We&apos;re Looking For
          </h2>
          <div className="mt-10 space-y-3">
            {[
              "Experienced in assisted stretching, PNF, massage therapy, or related bodywork",
              "Carry your own mat to every session",
              "Must be located in or able to travel to " + b.name,
              "Punctual — clients expect you on time, every time",
              "Positive attitude and genuine passion for helping people move better",
              "Strong knowledge of anatomy and human movement",
            ].map((req) => (
              <div
                key={req}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <span className="mt-0.5 text-teal-600 font-bold">
                  &#10003;
                </span>
                <p className="text-sm text-slate-700">{req}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Why Stretchologists Love Working Here
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Starting $50/Hour",
                desc: "Competitive pay with no cap on sessions.",
              },
              {
                title: "Paid in 30 Minutes",
                desc: "Get paid within 30 minutes of finishing your session.",
              },
              {
                title: "Established Clients",
                desc: "We have clients in " + b.name + " ready and booked.",
              },
              {
                title: "Flexible Schedule",
                desc: "Work any time between 7AM and 10PM, 7 days a week.",
              },
              {
                title: "We Handle the Rest",
                desc: "Marketing, sales, scheduling, payments — all handled.",
              },
              {
                title: "Work Near Home",
                desc: "Choose " + b.name + " neighborhoods convenient to you.",
              },
            ].map((perk) => (
              <div
                key={perk.title}
                className="rounded-xl border border-teal-200/60 bg-white p-6"
              >
                <h3 className="text-lg font-bold text-teal-700 font-heading">
                  {perk.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">
            Ready to Stretch {b.name}?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Apply today and start earning $50/hour as a {b.name} stretchologist.
            We have clients waiting and a team ready to support you.
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
