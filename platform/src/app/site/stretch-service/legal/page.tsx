// @ts-nocheck
import Logo from "@/app/site/stretch-service/_components/Logo";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-service/_lib/schema";

const pageTitle = "Legal | Stretch Service Mobile Stretch Service";
const pageDescription =
  "Legal information for Stretch Service mobile stretch service. Terms, privacy policy, refund policy, and liability information.";
const pageUrl = `${SITE_URL}/legal`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
};

const legalPages = [
  {
    title: "Terms & Conditions",
    href: "/terms",
    description:
      "The terms governing your use of Stretch Service services, including booking, payment, liability, and service agreements.",
  },
  {
    title: "Privacy Policy",
    href: "/privacy-policy",
    description:
      "How we collect, use, and protect your personal information when you use our website and services.",
  },
  {
    title: "Refund Policy",
    href: "/refund-policy",
    description:
      "Our cancellation and refund policies, including the 24-hour cancellation window and late cancellation procedures.",
  },
];

export default function LegalPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema(pageTitle, pageDescription, pageUrl, [
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: pageUrl },
          ]),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: pageUrl },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-14 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Legal
          </h1>
          <p className="text-lg text-teal-100 max-w-2xl mx-auto">
            Review our legal documents, policies, and service agreements.
          </p>
        </div>
      </section>

      {/* Legal Pages List */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="space-y-6">
            {legalPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="block bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors group"
              >
                <h2 className="font-heading text-xl md:text-2xl font-bold text-gray-900 group-hover:text-teal-700 transition-colors mb-2">
                  {page.title} &rarr;
                </h2>
                <p className="text-gray-600">{page.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Locations</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/contact" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Contact</Link>
          </div>
        </div>
      </section>

    </>
  );
}
