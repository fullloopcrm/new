import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  organizationSchema,
} from "@/lib/schema";

const URL = "https://homeservicesbusinesscrm.com";

const breadcrumbs = [{ name: "Home", url: URL }];

export const metadata: Metadata = {
  title: "Full Loop — The platform behind The NYC Maid",
  description:
    "An end-to-end operating system for vertical service businesses. Currently powering The NYC Maid. Inquire about the platform.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Full Loop — The platform behind The NYC Maid",
    description: "An end-to-end operating system for vertical service businesses.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Full Loop — The platform behind The NYC Maid",
    description: "An end-to-end operating system for vertical service businesses.",
  },
  robots: { index: true, follow: true },
};

const capabilities = [
  "AI receptionist that books leads around the clock",
  "End-to-end booking, dispatch, and field operations",
  "Automated billing, payments, and tip handling",
  "GPS-tracked job execution and team accountability",
  "Multi-channel review capture and reputation",
  "Programmatic SEO that compounds without ad spend",
  "Bookkeeping, payroll, and 1099 workflow built in",
  "Per-vertical sites that scale across cities",
];

export default function Home() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Full Loop — The platform behind The NYC Maid",
          "An end-to-end operating system for vertical service businesses.",
          URL,
          breadcrumbs,
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={organizationSchema} />

      {/* Hero */}
      <section className="bg-slate-900 min-h-[80vh] flex items-center px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-teal-400 mb-6">
            Operating Platform
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white font-heading mb-6 leading-tight">
            The platform behind{" "}
            <Link
              href="/case-study/the-nyc-maid"
              className="text-teal-400 hover:text-teal-300 underline underline-offset-4 decoration-2"
            >
              The NYC Maid
            </Link>
            .
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            An end-to-end operating system for vertical service businesses.
            Currently building it out across more cities and trades — under one roof.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-md bg-white px-8 py-4 font-mono text-xs uppercase tracking-[0.25em] text-slate-900 transition-colors hover:bg-slate-100"
          >
            Inquire about the platform
          </Link>
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-slate-950 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-teal-400 mb-6">
            What it does
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white font-heading mb-12">
            Eight functions, one system.
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
            {capabilities.map((c) => (
              <li
                key={c}
                className="flex items-start gap-3 text-slate-200 text-base md:text-lg leading-relaxed"
              >
                <span className="text-teal-400 mt-1.5 flex-shrink-0" aria-hidden>
                  ▸
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Posture */}
      <section className="bg-slate-900 border-t border-slate-800 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-10">
            We&apos;re not selling seats. The platform is being deployed across
            our own portfolio of vertical brands, one city and trade at a time.
            Acquisition, partnership, and press inquiries welcome.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-md border border-teal-500 px-8 py-3 font-mono text-xs uppercase tracking-[0.25em] text-teal-400 transition-colors hover:bg-teal-500 hover:text-slate-900"
          >
            Inquire
          </Link>
        </div>
      </section>
    </>
  );
}