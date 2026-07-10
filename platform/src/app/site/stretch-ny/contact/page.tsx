import Link from "next/link";
import Logo from "@/app/site/stretch-ny/_components/Logo";
import LeadForm from "@/app/site/stretch-ny/_components/LeadForm";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK, SITE_EMAIL } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";

export const metadata: Metadata = {
  title: "Contact Stretch NYC | Book Your Stretch Service",
  description: "Contact Stretch NYC for mobile stretch service. Text or call 212-202-7080. $99/hr, same-day available. Manhattan, Brooklyn, Queens, Bronx & Staten Island.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Contact Stretch NYC", "Contact us to book mobile assisted stretching in NYC.", `${SITE_URL}/contact`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Contact", url: `${SITE_URL}/contact` },
      ])} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Get In Touch</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Contact Stretch NYC
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Ready to book a session or have a question? Reach out by phone, text, or email. We respond quickly.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <a href={SITE_SMS_LINK} className="group rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-3xl">💬</p>
              <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">Text Us</h2>
              <p className="mt-2 text-base font-semibold text-teal-700">{SITE_PHONE}</p>
              <p className="mt-1 text-sm text-slate-500">Fastest way to book</p>
            </a>
            <a href={SITE_PHONE_LINK} className="group rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-3xl">📞</p>
              <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">Call Us</h2>
              <p className="mt-2 text-base font-semibold text-teal-700">{SITE_PHONE}</p>
              <p className="mt-1 text-sm text-slate-500">7AM - 10PM daily</p>
            </a>
            <a href={`mailto:${SITE_EMAIL}`} className="group rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-3xl">✉️</p>
              <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">Email Us</h2>
              <p className="mt-2 text-base font-semibold text-teal-700">{SITE_EMAIL}</p>
              <p className="mt-1 text-sm text-slate-500">We reply within hours</p>
            </a>
          </div>
        </div>
      </section>

      {/* Details + Form */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            {/* Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Business Information</h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-teal-200/60 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Address</h3>
                  <p className="mt-1 text-base text-slate-700">150 W 47th Street<br />New York, NY 10036</p>
                </div>
                <div className="rounded-xl border border-teal-200/60 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Hours</h3>
                  <p className="mt-1 text-base text-slate-700">7:00 AM &ndash; 10:00 PM<br />7 days a week</p>
                </div>
                <div className="rounded-xl border border-teal-200/60 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Service Area</h3>
                  <p className="mt-1 text-base text-slate-700">Manhattan, Brooklyn, Queens, Bronx &amp; Staten Island<br />We come to your location</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Send Us a Message</h2>
              <LeadForm />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Prefer to Book Directly?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Text is the fastest way to book. Send us your preferred date, time, and location and we&apos;ll confirm within minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Text {SITE_PHONE} — Book Now
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>
      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">374 Neighborhoods</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">132 Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/services/assisted-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
            <Link href="/locations/manhattan" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Manhattan</Link>
            <Link href="/locations/brooklyn" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Brooklyn</Link>
            <Link href="/locations/queens" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Queens</Link>
          </div>
        </div>
      </section>

    </>
  );
}
