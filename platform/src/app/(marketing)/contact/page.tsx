import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
} from "@/lib/schema";
import { InquiryForm } from "@/components/InquiryForm";

const URL = "https://homeservicesbusinesscrm.com/contact";

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Contact", url: URL },
];

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach out about the platform — acquisition, partnership, or press inquiries.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Contact",
    description: "Reach out about the platform.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact",
    description: "Reach out about the platform.",
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Contact",
          "Reach out about the platform.",
          URL,
          breadcrumbs,
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />

      <section className="bg-slate-900 min-h-screen py-20 px-6">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <p className="text-teal-400 font-mono text-xs tracking-widest uppercase mb-3">
              Inquire
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white font-heading mb-4">
              One channel, by design.
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
              Acquisition, partnership, or press — fill out the form. We respond to serious inquiries within a few business days.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8">
            <InquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
