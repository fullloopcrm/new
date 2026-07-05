import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  serviceSchema,
  faqSchema,
  localBusinessSchema,
} from "@/lib/schema";
import {
  features,
  getFeature,
  getRelatedFeatures,
  featureUrl,
} from "@/lib/marketing/features";

const SITE = "https://homeservicesbusinesscrm.com";

// ~20 pages — cheap to pre-render, and pre-rendering is best for SEO.
export function generateStaticParams() {
  return features.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return {};

  const url = featureUrl(feature.slug);
  return {
    title: feature.title,
    description: feature.metaDescription,
    keywords: feature.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: feature.title,
      description: feature.metaDescription,
      url,
      siteName: "Full Loop CRM",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: feature.title,
      description: feature.metaDescription,
    },
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();

  const url = featureUrl(feature.slug);
  const related = getRelatedFeatures(feature);
  const isRoadmap = feature.status === "in-progress";

  const breadcrumbs = [
    { name: "Home", url: SITE },
    { name: "Features", url: `${SITE}/full-loop-crm-service-features` },
    { name: feature.name, url },
  ];

  return (
    <>
      {/* Structured data */}
      <JsonLd data={webPageSchema(feature.title, feature.metaDescription, url, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={serviceSchema(
          `${feature.name} — Full Loop CRM`,
          `feature/${feature.slug}`,
          feature.metaDescription
        )}
      />
      <JsonLd data={faqSchema(feature.faqs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* ── Hero ── */}
      <section className="bg-slate-900 py-24 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 font-mono text-xs text-slate-400">
            <Link href="/" className="hover:text-teal-300">Home</Link>
            <span className="mx-2 text-slate-600">/</span>
            <Link href="/full-loop-crm-service-features" className="hover:text-teal-300">Features</Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">{feature.name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-mono text-sm uppercase tracking-widest text-teal-400">
              {feature.eyebrow}
            </span>
            {isRoadmap && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-amber-300">
                In development
              </span>
            )}
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
            {feature.h1}
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mb-8">
            {feature.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Link
              href="/waitlist"
              className="font-cta inline-block rounded-lg bg-teal-400 px-8 py-4 text-lg font-bold text-slate-900 hover:bg-teal-300 transition-colors"
            >
              Request Your Partnership
            </Link>
            <Link
              href="/full-loop-crm-service-features"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 font-cta text-lg py-4"
            >
              See all features
            </Link>
          </div>
        </div>
      </section>

      {/* ── Intro ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-xl text-slate-700 leading-relaxed">{feature.intro}</p>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="bg-slate-50 py-20 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-3xl font-extrabold text-slate-900 mb-6">
            {feature.problem.heading}
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">{feature.problem.body}</p>
        </div>
      </section>

      {/* ── Capability blocks ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-12 text-center">
            How {feature.name} Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {feature.blocks.map((block) => (
              <div key={block.heading} className="rounded-xl border border-slate-200 p-6">
                <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
                  {block.heading}
                </h3>
                <p className="text-slate-600 leading-relaxed">{block.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Outcome ── */}
      <section className="bg-slate-900 py-20 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white mb-6">
            {feature.outcome.heading}
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed">{feature.outcome.body}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-20 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-10 text-center">
            {feature.name} — Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            {feature.faqs.map((faq) => (
              <div key={faq.question} className="border-b border-slate-200 pb-6">
                <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related features (inner links) ── */}
      {related.length > 0 && (
        <section className="bg-slate-50 py-20 px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 mb-10 text-center">
              Related Features
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/feature/${r.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-teal-300"
                >
                  <p className="font-mono text-xs uppercase tracking-widest text-teal-600 mb-2">
                    {r.category}
                  </p>
                  <h3 className="font-heading text-lg font-bold text-slate-900 group-hover:text-teal-700">
                    {r.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">{r.heroSub}</p>
                </Link>
              ))}
            </div>
            <p className="mt-10 text-center text-slate-600">
              Or browse the{" "}
              <Link
                href="/full-loop-crm-service-features"
                className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
              >
                full feature overview
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="bg-slate-900 py-24 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mb-6">
            Ready to Put {feature.name} to Work?
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Full Loop CRM is built for your business from the ground up — one platform that
            generates leads, closes them, books the work, and runs the back office. Limited
            partnerships available.
          </p>
          <Link
            href="/waitlist"
            className="font-cta inline-block rounded-lg bg-teal-400 px-8 py-4 text-lg font-bold text-slate-900 hover:bg-teal-300 transition-colors"
          >
            Request Your Partnership
          </Link>
        </div>
      </section>
    </>
  );
}
