import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Contact", url: "https://homeservicesbusinesscrm.com/contact" },
];

export const metadata: Metadata = {
  title: "Contact Full Loop CRM | Get in Touch",
  description:
    "Contact Full Loop CRM to learn about exclusive territory partnerships for your home service business. Call, text, or email us today.",
  keywords: [
    "contact full loop CRM",
    "home service CRM contact",
    "CRM partnership inquiry",
    "full loop CRM phone number",
  ],
  alternates: { canonical: "https://homeservicesbusinesscrm.com/contact" },
  openGraph: {
    title: "Contact Full Loop CRM | Get in Touch",
    description:
      "Contact Full Loop CRM to learn about exclusive territory partnerships for your home service business.",
    url: "https://homeservicesbusinesscrm.com/contact",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Full Loop CRM | Get in Touch",
    description:
      "Contact Full Loop CRM to learn about exclusive territory partnerships for your home service business.",
  },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Contact Full Loop CRM | Get in Touch",
          "Contact Full Loop CRM to learn about exclusive territory partnerships for your home service business.",
          "https://homeservicesbusinesscrm.com/contact",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-teal-400 font-mono text-sm tracking-widest uppercase mb-4">
            Get in Touch
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            Contact{" "}
            <span className="text-teal-400">Full Loop CRM</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            Ready to lock your territory? Have questions about the platform?
            We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Call */}
            <div className="rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-heading mb-2">
                Call Us
              </h2>
              <p className="text-slate-600 mb-4 text-sm">
                Speak directly with our partnership team.
              </p>
              <a
                href="tel:+12122029220"
                className="text-teal-600 font-bold text-lg hover:text-teal-700 transition-colors"
              >
                (212) 202-9220
              </a>
            </div>

            {/* Text */}
            <div className="rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-heading mb-2">
                Text Us
              </h2>
              <p className="text-slate-600 mb-4 text-sm">
                Send us a text anytime — we respond fast.
              </p>
              <a
                href="sms:+12122029220"
                className="text-teal-600 font-bold text-lg hover:text-teal-700 transition-colors"
              >
                (212) 202-9220
              </a>
            </div>

            {/* Email */}
            <div className="rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-heading mb-2">
                Email Us
              </h2>
              <p className="text-slate-600 mb-4 text-sm">
                For partnership inquiries and support.
              </p>
              <a
                href="mailto:hello@homeservicesbusinesscrm.com"
                className="text-teal-600 font-bold text-lg hover:text-teal-700 transition-colors"
              >
                hello@homeservicesbusinesscrm.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Office */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">
            Our Office
          </h2>
          <p className="text-slate-600 mb-2 text-lg">
            150 W 47th St, New York, NY 10036
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Located in Midtown Manhattan. Available by appointment.
          </p>
          <Link
            href="/waitlist"
            className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Request to Join Waitlist
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Ready to Lock Your Territory?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Check if your market is still
            available.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Apply Now
            </Link>
            <a
              href="tel:+12122029220"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              Call (212) 202-9220
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
