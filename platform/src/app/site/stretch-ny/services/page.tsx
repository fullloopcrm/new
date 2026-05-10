// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "Stretch Service NYC | All 11 Types | $99/hr Mobile",
  description: "Professional mobile stretch service across NYC. 11 types including assisted, PNF, myofascial release & more. $99/hr, 10% off weekly. Same-day available 7AM-10PM.",
  alternates: { canonical: `${SITE_URL}/services` },
};

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={webPageSchema("NYC Stretching Services", "All professional stretching services offered by Stretch NYC.", `${SITE_URL}/services`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Services", url: `${SITE_URL}/services` },
      ])} />

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">11 Professional Stretch Types | $99/hr Mobile | NYC-Wide</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            NYC Mobile Stretch Service
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {services.length} professional stretching techniques delivered to your home, office, hotel, or any NYC location by certified stretch therapists.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h2>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.tagline}</p>
                  <p className="mt-3 text-sm text-slate-600">{s.shortDesc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.idealFor.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Not Sure Which Stretch Service You Need?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">Text us and our team will recommend the perfect stretch for your specific needs.</p>
          <a href={SITE_SMS_LINK} className="mt-6 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
            Text {SITE_PHONE}
          </a>
        </div>
      </section>
    </>
  );
}
