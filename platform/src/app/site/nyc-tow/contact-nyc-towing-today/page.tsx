// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { PHONE, PHONE_HREF, EMAIL, HOURS } from "@/app/site//_data/content";
import { OFFICES } from "@/app/site//_data/offices";
import { JsonLd, breadcrumbSchema, allOfficeLocalBusinessSchemas, SITE_URL, BRAND_NAME } from "@/app/site/nyc-tow/_lib/schema";

const OFFICE_BUILDING_NAMES: Record<string, string> = {
  manhattan: "Empire State Building",
  brooklyn: "MetroTech Center",
  queens: "One Court Square",
  bronx: "BankNote Building",
  "staten-island": "Corporate Park of Staten Island",
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      type: "contact" as const,
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || "n/a"),
      details: `${String(fd.get("subject") || "")}: ${String(fd.get("message") || "")}`,
      source: typeof window !== "undefined" ? window.location.pathname : "",
    };
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(`${msg}. Please email ${EMAIL} instead.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Contact", url: "/contact-nyc-towing-today" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            url: `${SITE_URL}/contact-nyc-towing-today`,
            name: `Contact ${BRAND_NAME}`,
            description:
              "Contact The NYC Towing Service — dispatch hubs in every NYC borough, 24/7 phone and text, email, and a service request form.",
            mainEntity: {
              "@type": "TowingService",
              "@id": `${SITE_URL}/#organization`,
              name: BRAND_NAME,
            },
          },
          ...allOfficeLocalBusinessSchemas(),
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Get in Touch</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">Contact NYC Tow Truck Service</span> — 24/7 Dispatch in All 5 Boroughs
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            For immediate tow or roadside dispatch, call <a href={PHONE_HREF} className="underline text-white hover:text-teal-200">{PHONE}</a> — the phone is always fastest. For questions, partnerships, fleet accounts, or media, use the form below. For service requests, use the <Link href="/book-towing-service-today" className="underline text-white hover:text-teal-200">request page</Link>.
          </p>
        </div>
      </section>

      {/* 5 NYC Dispatch Hubs */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-100 inline-block px-3 py-1 rounded-full font-cta">5 Borough Hubs</p>
          <h2 className="mt-4 text-center text-3xl font-bold text-slate-900 font-heading">
            Five NYC Dispatch Hubs — Manhattan, Brooklyn, Queens, the Bronx, and Staten Island
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Each borough has its own dispatch hub, phone line, and email. Browse <Link href="/locations" className="text-teal-700 font-semibold hover:underline">all coverage areas</Link>, call the borough nearest you, or <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">request a tow</Link> right from the web.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {OFFICES.map((office) => {
              const building = OFFICE_BUILDING_NAMES[office.stateSlug] ?? office.city;
              return (
                <div key={office.stateSlug} className="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-lg font-bold text-slate-900 font-heading">{office.state}</p>
                  <p className="mt-1 text-sm font-semibold text-teal-700 font-cta">{building}</p>
                  <p className="mt-3 text-sm text-slate-700">{office.address}</p>
                  <p className="text-sm text-slate-700">{office.city}, {office.stateAbbr} {office.zip}</p>
                  <p className="mt-3 text-sm">
                    <a href={office.phoneHref} className="font-semibold text-teal-700 hover:underline">{office.phone}</a>
                  </p>
                  <p className="text-sm">
                    <a href={`mailto:${office.email}`} className="text-slate-600 hover:text-teal-700 break-all">{office.email}</a>
                  </p>
                  <p className="mt-3 text-xs text-slate-500 leading-relaxed">{office.directions}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={office.mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-teal-700 hover:underline font-cta">Get Directions →</a>
                    <Link href={`/locations/${office.stateSlug}`} className="text-xs font-bold text-teal-700 hover:underline font-cta">Borough Page →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Left — contact info */}
            <div>
              <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Get in Touch</h2>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Phone</p>
                  <a href={PHONE_HREF} className="mt-1 block text-xl font-bold text-slate-900 hover:text-teal-700 transition-colors">{PHONE}</a>
                  <p className="mt-0.5 text-sm text-slate-500">Call or text</p>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Email</p>
                  <a href={`mailto:${EMAIL}`} className="mt-1 block text-lg font-bold text-slate-900 hover:text-teal-700 transition-colors">{EMAIL}</a>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Service Area</p>
                  <p className="mt-1 text-base text-slate-700">All 5 NYC boroughs — Manhattan, Brooklyn, Queens, the Bronx, Staten Island</p>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Hours</p>
                  <p className="mt-1 text-base text-slate-700">{HOURS}</p>
                </div>

                <div className="mt-8 rounded-xl border-2 border-accent/30 bg-accent/5 p-5">
                  <p className="text-sm font-bold text-accent font-cta">Need a tow right now?</p>
                  <p className="mt-1 text-sm text-slate-600">This form is for questions, partnerships, fleet accounts, and media. For service, call dispatch or use the request page.</p>
                  <Link href="/book-towing-service-today" className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-dark font-cta">
                    Request a Tow →
                  </Link>
                </div>
              </div>
            </div>

            {/* Right — contact form ONLY */}
            <div>
              <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Send Us a Message</h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">Questions, feedback, partnerships, media — we&apos;ll get back to you within 24 hours.</p>

              {submitted ? (
                <div className="mt-6 rounded-xl bg-teal-50 border border-teal-200 p-8 text-center">
                  <p className="text-xl font-bold text-teal-700 font-heading">Message sent!</p>
                  <p className="mt-2 text-sm text-slate-600">We&apos;ll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
                    <input type="text" name="name" required placeholder="Your name" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                    <input type="email" name="email" required placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                    <input type="tel" name="phone" placeholder="(555) 555-5555" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subject *</label>
                    <select name="subject" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
                      <option value="">Select a topic...</option>
                      <option value="question">General Question</option>
                      <option value="pricing">Pricing Question</option>
                      <option value="fleet">Fleet / Commercial Account</option>
                      <option value="property-manager">Property Manager / Private Tow Account</option>
                      <option value="insurance">Insurance Carrier Inquiry</option>
                      <option value="partnership">Partnership / Referral</option>
                      <option value="media">Media / Press</option>
                      <option value="careers">Careers / Jobs</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Message *</label>
                    <textarea name="message" required rows={5} placeholder="How can we help?" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  {error && (
                    <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
                  )}
                  <button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 py-3.5 text-base font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 font-cta">
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Need a Tow Right Now?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Call dispatch at {PHONE} — 24/7, any borough, any hour.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
