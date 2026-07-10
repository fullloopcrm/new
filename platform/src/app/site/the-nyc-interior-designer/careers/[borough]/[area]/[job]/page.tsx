import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  findAreaBySlug,
  getAreasByBorough,
  SITE_DOMAIN,
  SITE_NAME,
  PHONE,
  PHONE_HREF,
  EMAIL,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { findJobBySlug, jobs } from "@/app/site/the-nyc-interior-designer/_lib/jobs";

interface Props {
  params: Promise<{ borough: string; area: string; job: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, area: areaSlug, job: jobSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  const job = findJobBySlug(jobSlug);
  if (!area || !job) return {};

  const title = `${job.title} in ${area.name}, ${area.borough} — Apply Now | ${SITE_NAME}`;
  const description = `Now hiring: ${job.title} in ${area.name}, ${area.borough}. ${job.payType === "hourly" ? `$${job.payMin}-$${job.payMax}/hr` : `$${(job.payMin / 1000).toFixed(0)}K-$${(job.payMax / 1000).toFixed(0)}K/yr`}. ${job.shortDesc} Apply today.`;

  return {
    title,
    description,
    keywords: [
      `${job.title.toLowerCase()} ${area.name}`,
      `interior design jobs ${area.name}`,
      `${job.slug.replace(/-/g, " ")} hiring ${area.borough}`,
      `${area.name} designer employment`,
      `design jobs ${area.name} NYC`,
    ],
    alternates: { canonical: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}/${jobSlug}` },
    openGraph: {
      title: `${job.title} in ${area.name} — Now Hiring`,
      description,
      url: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}/${jobSlug}`,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

export default async function JobPage({ params }: Props) {
  const { borough, area: areaSlug, job: jobSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  const job = findJobBySlug(jobSlug);
  if (!area || !job) notFound();

  const today = new Date().toISOString().split("T")[0];
  const validThrough = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const payDisplay = job.payType === "hourly"
    ? `$${job.payMin}-$${job.payMax}/hr`
    : `$${(job.payMin / 1000).toFixed(0)}K-$${(job.payMax / 1000).toFixed(0)}K/yr`;

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: `${job.slug}-${areaSlug}-${borough}`,
    },
    datePosted: today,
    validThrough,
    employmentType: job.type,
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_DOMAIN,
      logo: `${SITE_DOMAIN}/icon`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: area.name,
        addressRegion: "NY",
        addressCountry: "US",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: job.payCurrency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.payMin,
        maxValue: job.payMax,
        unitText: job.payUnit,
      },
    },
    qualifications: job.qualifications.join(". "),
    responsibilities: job.responsibilities.join(". "),
    jobBenefits: job.benefits.join(". "),
    industry: "Interior Design",
    occupationalCategory: "27-1025.00",
    directApply: true,
    applicationContact: {
      "@type": "ContactPoint",
      email: EMAIL,
      telephone: PHONE,
    },
  };

  const breadcrumbSchemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_DOMAIN },
      { "@type": "ListItem", position: 2, name: "Careers", item: `${SITE_DOMAIN}/careers` },
      { "@type": "ListItem", position: 3, name: area.borough, item: `${SITE_DOMAIN}/careers/${borough}` },
      { "@type": "ListItem", position: 4, name: area.name, item: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}` },
      { "@type": "ListItem", position: 5, name: job.title, item: `${SITE_DOMAIN}/careers/${borough}/${areaSlug}/${jobSlug}` },
    ],
  };

  const nearbyAreas = getAreasByBorough(borough).filter((a) => a.slug !== areaSlug).slice(0, 6);
  const otherJobs = jobs.filter((j) => j.slug !== jobSlug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchemaData) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-800 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <nav className="mb-6 flex flex-wrap items-center justify-center gap-1.5 text-xs text-gray-400">
            <Link href="/careers" className="hover:text-white">Careers</Link>
            <span>/</span>
            <Link href={`/careers/${borough}`} className="hover:text-white">{area.borough}</Link>
            <span>/</span>
            <Link href={`/careers/${borough}/${areaSlug}`} className="hover:text-white">{area.name}</Link>
            <span>/</span>
            <span className="text-white">{job.title}</span>
          </nav>

          <span className="inline-block mb-4 rounded-full bg-blue-400/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-200">
            Full-Time &middot; {payDisplay}
          </span>

          <h1 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl leading-tight">
            {job.title} in{" "}
            <span className="text-blue-300">{area.name}, {area.borough}</span>
          </h1>

          <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {job.shortDesc}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/apply"
              className="inline-block rounded-lg bg-white px-8 py-4 text-base font-bold text-blue-800 shadow-lg hover:bg-blue-50 transition-colors"
            >
              Apply Now
            </Link>
            <a
              href={PHONE_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* Job Details */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <div className="rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pay</p>
              <p className="text-2xl font-extrabold text-blue-700 font-mono">{payDisplay}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Type</p>
              <p className="text-2xl font-extrabold text-slate-900">Full-Time</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Location</p>
              <p className="text-2xl font-extrabold text-slate-900">{area.name}</p>
            </div>
          </div>

          {/* About the Role */}
          <div className="mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">About This Role</h2>
            <p className="text-slate-700 leading-relaxed">{job.description}</p>
          </div>

          {/* Responsibilities */}
          <div className="mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Responsibilities</h2>
            <ul className="space-y-2">
              {job.responsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                  <span className="text-blue-600 mt-1 shrink-0 font-bold">&#10003;</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Qualifications */}
          <div className="mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Qualifications</h2>
            <ul className="space-y-2">
              {job.qualifications.map((q, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                  <span className="text-blue-600 mt-1 shrink-0">&#9679;</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits */}
          <div className="mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What We Offer</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {job.benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 p-4">
                  <span className="text-blue-600 mt-0.5 shrink-0 font-bold">&#10003;</span>
                  <span className="text-sm text-slate-700">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Physical Requirements */}
          <div className="mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Physical Requirements</h2>
            <ul className="space-y-2">
              {job.physical.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                  <span className="text-slate-400 mt-1 shrink-0">&#9679;</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Schedule & Experience */}
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-2">Schedule</h3>
              <p className="text-sm text-slate-600">{job.schedule}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-2">Experience</h3>
              <p className="text-sm text-slate-600">{job.experience}</p>
            </div>
          </div>

          {/* Apply CTA */}
          <div className="rounded-2xl bg-gray-800 p-8 text-center">
            <h2 className="text-2xl font-extrabold text-white mb-3">
              Ready to Apply?
            </h2>
            <p className="text-gray-300 mb-6">
              Upload your resume and share your portfolio. We respond within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/apply"
                className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-bold text-blue-800 hover:bg-blue-50 transition-colors"
              >
                Apply Now
              </Link>
              <a
                href={PHONE_HREF}
                className="inline-block rounded-lg border-2 border-white/30 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                Call {PHONE}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Other Positions */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Other Open Positions in {area.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {otherJobs.map((j) => (
              <Link
                key={j.slug}
                href={`/careers/${borough}/${areaSlug}/${j.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-400 hover:shadow-md"
              >
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600">{j.title}</h3>
                <p className="mt-1 text-sm text-blue-700 font-mono font-bold">
                  {j.payType === "hourly" ? `$${j.payMin}-$${j.payMax}/hr` : `$${(j.payMin / 1000).toFixed(0)}K-$${(j.payMax / 1000).toFixed(0)}K/yr`}
                </p>
                <p className="mt-2 text-xs text-slate-500">{j.shortDesc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Same Job, Nearby Areas */}
      {nearbyAreas.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
              {job.title} in Nearby {area.borough} Neighborhoods
            </h2>
            <div className="flex flex-wrap gap-3">
              {nearbyAreas.map((a) => (
                <Link
                  key={a.slug}
                  href={`/careers/${borough}/${a.slug}/${jobSlug}`}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors"
                >
                  {a.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Links */}
      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/careers" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">All Careers</Link>
          <Link href={`/careers/${borough}`} className="text-blue-600 underline underline-offset-2 hover:text-blue-700">{area.borough} Jobs</Link>
          <Link href={`/careers/${borough}/${areaSlug}`} className="text-blue-600 underline underline-offset-2 hover:text-blue-700">All Jobs in {area.name}</Link>
          <Link href={`/areas/${borough}/${areaSlug}`} className="text-blue-600 underline underline-offset-2 hover:text-blue-700">{area.name} Services</Link>
          <Link href="/services" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">Our Services</Link>
          <Link href="/get-a-free-consultation" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">Book — $20 Off</Link>
        </div>
      </section>
    </>
  );
}
