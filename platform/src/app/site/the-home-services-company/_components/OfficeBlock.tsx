// @ts-nocheck
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site//_data/content";
import type { Office } from "@/app/site//_data/offices";

export function OfficeBlock({ office, cityName }: { office: Office; cityName?: string }) {
  return (
    <section className="bg-section-teal py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-bold text-slate-900 font-heading">
          Our {office.state} Office{cityName ? ` — Serving ${cityName}` : ""}
        </h2>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">{office.address}</h3>
              <p className="text-base text-slate-700">{office.city}, {office.stateAbbr} {office.zip}</p>
              <p className="mt-1 text-sm text-slate-500">{PHONE}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={SMS_HREF} className="inline-block rounded-md bg-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 font-cta">Text Us</a>
                <a href={PHONE_HREF} className="inline-block rounded-md border border-teal-700 px-4 py-2 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-50 font-cta">Call Us</a>
                <Link href="/book" className="inline-block rounded-md bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-dark font-cta">Book Now</Link>
              </div>
            </div>
            <div className="sm:max-w-xs sm:text-right">
              <p className="text-sm text-slate-600 leading-relaxed">{office.directions}</p>
              <a href={office.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold text-teal-700 hover:underline font-cta">Get Directions →</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
