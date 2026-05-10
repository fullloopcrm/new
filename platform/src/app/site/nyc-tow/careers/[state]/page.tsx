// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATES, getStateBySlug } from "@/app/site//_data/cities";
import { getOfficeByState } from "@/app/site//_data/offices";
import { OfficeBlock } from "@/app/site/nyc-tow/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { JobApplicationForm } from "@/app/site/nyc-tow/_components/JobApplicationForm";
import { JsonLd, breadcrumbSchema, localBusinessSchemaPerOffice } from "@/app/site/nyc-tow/_lib/schema";

export function generateStaticParams() {
  return STATES.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return {};
  return {
    title: `Tow Driver Jobs in ${state.name}, NYC — The NYC Towing Service`,
    description: `Hiring tow drivers, dispatchers, and heavy-duty operators in ${state.name} across ${state.cities.length} neighborhoods. W-2 employment, full benefits, CDL welcome.`,
    alternates: { canonical: `/careers/${stateSlug}` },
  };
}

export default async function StateJobsPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) notFound();
  const office = getOfficeByState(stateSlug);

  const careersStateSchemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Careers", url: "/careers" },
      { name: `${state.name} Jobs`, url: `/careers/${stateSlug}` },
    ]),
  ];
  if (office) careersStateSchemas.push(localBusinessSchemaPerOffice(office));

  return (
    <>
      <JsonLd schema={careersStateSchemas} />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring — {state.cities.length} {state.name} Neighborhoods</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{state.name} Tow Truck Driver Jobs</span> Hiring Now — W-2, Full Benefits
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Tow drivers, dispatchers, and heavy-duty operators for our {state.name} hub. W-2 employment, full benefits for full-time, competitive pay. CDL holders welcome.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why Drive for Us in {state.name}?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Our {state.name} operation dispatches from a local hub with trucks staged for {state.cities.length}+ neighborhoods. Drivers run a known territory with a consistent dispatcher. Check <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">coverage areas</Link> or see <Link href="/apply-for-towing-job" className="text-teal-700 font-semibold hover:underline">application details</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "W-2 Employment", desc: "Not gig. Proper tax withholding, workers&apos; comp, and full benefits for full-time roles. Consistent paychecks, predictable schedule." },
              { title: "Competitive Pay", desc: "Hourly plus overtime at time-and-a-half. Heavy-duty and specialty (EV, luxury, long-distance) pay at premium. Performance bonuses." },
              { title: "Paid Training", desc: "Every driver goes through our training program. Tie-down procedures, NYC-specific hazards, AWD/EV handling, lockout techniques. Earn while you learn." },
              { title: "Consistent Routes", desc: "Drivers run a known {state.name} territory with a consistent dispatcher. You learn the streets, the building clearances, the access patterns." },
              { title: "Growth Path", desc: "Entry-level → heavy-duty → specialty → senior driver → dispatch. Most of our dispatchers are former drivers. Operations management is the next step." },
              { title: "Full Benefits", desc: "Health insurance, PTO, 401(k) with match for full-time. Branded truck and equipment provided. Overtime at time-and-a-half." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: item.desc }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Neighborhoods We&apos;re Dispatching To</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">{state.cities.length} neighborhoods covered from our {state.name} hub. Click a neighborhood to see local service details.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {state.cities.map((city) => (
              <Link key={city.slug} href={`/careers/${stateSlug}/${city.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{city.name}</p>
                <p className="mt-0.5 text-xs text-teal-600">Now hiring</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Requirements</h2>
          <div className="mx-auto mt-8 max-w-2xl grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { req: "Valid NY license (CDL for heavy-duty)", detail: "Clean driving record, no major violations in 3 years" },
              { req: "Pass background check", detail: "Pre-employment drug screen included" },
              { req: "21+ years old", detail: "Required for commercial tow insurance" },
              { req: "Smartphone for dispatch", detail: "Navigation, photos, digital paperwork" },
              { req: "Available overnight / weekend / holiday", detail: "We run 24/7 — same rate every shift" },
              { req: "Physically able to handle equipment", detail: "Tie-downs, lug nuts, tow hooks" },
              { req: "Customer communication skills", detail: "You&apos;re often the first calm person someone talks to after a breakdown" },
              { req: "US W-2 employment eligible", detail: "No 1099 or gig arrangements" },
            ].map((item) => (
              <div key={item.req} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="text-teal-600 mt-0.5 shrink-0">✓</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.req}</p>
                  <p className="text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: item.detail }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {office && <OfficeBlock office={office} />}

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Apply for {state.name} Roles</h2>
              <p className="mt-4 text-base text-slate-600">
                Fill out the form and we&apos;ll call within 48 hours. Current openings: light-duty driver, heavy-duty (CDL) driver, dispatcher, and flatbed specialist.
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-lg font-bold text-teal-700 font-heading">Light-Duty Driver</p>
                  <p className="text-sm text-slate-600">Wheel-lift and flatbed operator. Full training if you have a clean record.</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-lg font-bold text-teal-700 font-heading">Heavy-Duty Operator</p>
                  <p className="text-sm text-slate-600">CDL required. Premium pay for Cross Bronx / Deegan / bridge corridor work.</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-lg font-bold text-teal-700 font-heading">Dispatcher</p>
                  <p className="text-sm text-slate-600">NYC street knowledge required. Phone skills required. Former drivers preferred.</p>
                </div>
              </div>
            </div>
            <div>
              <JobApplicationForm state={state.name} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
