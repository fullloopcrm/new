// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCities, getCityBySlug } from "@/app/site//_data/cities";
import { SERVICES } from "@/app/site//_data/services";
import { getOfficeByState } from "@/app/site//_data/offices";
import { OfficeBlock } from "@/app/site/nyc-tow/_components/OfficeBlock";
import { JobApplicationForm } from "@/app/site/nyc-tow/_components/JobApplicationForm";
import { JsonLd, breadcrumbSchema, jobPostingSchema, localBusinessSchemaPerOffice } from "@/app/site/nyc-tow/_lib/schema";

export const dynamicParams = true;

export function generateStaticParams() {
  return getAllCities().map(({ state, city }) => ({ state: state.slug, city: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return {};
  return {
    title: `Tow Driver Jobs in ${result.city.name}, ${result.state.name} — Now Hiring`,
    description: `Hiring tow drivers, dispatchers, and roadside technicians in ${result.city.name}, ${result.state.name}. W-2 employment, full benefits, competitive pay. CDL welcome.`,
    alternates: { canonical: `/careers/${stateSlug}/${citySlug}` },
  };
}

export default async function CityJobsPage({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state: stateSlug, city: citySlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) notFound();

  const { state, city } = result;
  const office = getOfficeByState(stateSlug);
  const nearbyCities = state.cities.filter((c) => c.slug !== citySlug).slice(0, 8);

  const cityJobsSchemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Careers", url: "/careers" },
      { name: state.name, url: `/careers/${stateSlug}` },
      { name: city.name, url: `/careers/${stateSlug}/${citySlug}` },
    ]),
    jobPostingSchema({
      title: `Tow Truck Driver — ${city.name}, ${state.name}`,
      description: `Tow truck driver and dispatcher roles covering ${city.name}, ${state.name}. W-2 employment, full benefits for full-time, paid training, competitive pay plus overtime. CDL holders welcome for heavy-duty work.`,
      url: `/careers/${stateSlug}/${citySlug}`,
      stateSlug,
      citySlug,
      cityName: city.name,
      employmentType: "FULL_TIME",
      baseSalaryMin: 22,
      baseSalaryMax: 45,
      baseSalaryUnit: "HOUR",
      office,
    }),
  ];
  if (office) cityJobsSchemas.push(localBusinessSchemaPerOffice(office));

  return (
    <>
      <JsonLd schema={cityJobsSchemas} />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring — {city.name}, {state.name}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{city.name} Tow Truck Driver Jobs</span> Hiring Now — W-2, Full Benefits
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Drivers dispatched from our {state.name} hub cover {city.name} every day. W-2 employment, full benefits, competitive pay, and paid training.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Driving Looks Like in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Our {city.name} runs cover <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">all {SERVICES.length} services</Link> — light-duty tows, flatbed, roadside, accident recovery, and commercial. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing model</Link> and <Link href="/about" className="text-teal-700 font-semibold hover:underline">company details</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Drivers assigned to {city.name} routes learn the local streets, building clearances, and parking enforcement patterns. The job is equal parts technical (proper tie-downs, AWD handling, EV procedures, lockout tools that don&apos;t fry airbag modules) and customer-facing (you&apos;re often the first calm person someone talks to after a breakdown).</p>
            <p>Daily dispatch mix in {city.name} includes dead-battery roadside calls (especially winter), flat-tire changes, lockouts, jump starts, light-duty tows to local shops, flatbed tows for AWD and EV vehicles, and accident recovery when collisions happen. You won&apos;t repeat the same job twice in a shift.</p>
            <p>W-2 employment — not gig. Paid training, competitive hourly plus overtime at time-and-a-half, performance bonuses, branded truck and equipment provided. Full benefits (health, PTO, 401k with match) for full-time.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Requirements for {city.name} Roles</h2>
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Valid NY license (CDL for heavy-duty)",
                "Clean driving record",
                "Pass background check + drug screen",
                "21+ years old",
                "Smartphone for dispatch",
                "Available overnight / weekend shifts",
                "Physically able to handle tow equipment",
                "US W-2 employment eligible",
              ].map((req) => (
                <div key={req} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-teal-600 mt-0.5 shrink-0">✓</span>
                  <span>{req}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {office && <OfficeBlock office={office} cityName={city.name} />}

      {nearbyCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Also Hiring Near {city.name}, {state.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              See <Link href={`/careers/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">all {state.name} positions</Link>.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {nearbyCities.map((c) => (
                <Link key={c.slug} href={`/careers/${stateSlug}/${c.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">Now hiring</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Application form */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Apply — {city.name}, {state.name}</h2>
              <p className="mt-4 text-base text-slate-600">Fill out the form and we&apos;ll call within 48 hours. Current openings across light-duty, heavy-duty, and dispatch roles.</p>
              <div className="mt-6 space-y-3">
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-lg font-bold text-teal-700 font-heading">W-2 Employment</p>
                  <p className="text-sm text-slate-600">Not gig. Proper benefits, proper payroll.</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-lg font-bold text-teal-700 font-heading">Paid Training</p>
                  <p className="text-sm text-slate-600">Learn on the clock. Overtime at time-and-a-half.</p>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>✓ Valid NY license (CDL for heavy-duty)</p>
                  <p>✓ Clean driving record</p>
                  <p>✓ Smartphone for dispatch</p>
                  <p>✓ Pass background check</p>
                  <p>✓ 21+ years old</p>
                  <p>✓ Overnight / weekend availability</p>
                </div>
              </div>
            </div>
            <div>
              <JobApplicationForm city={city.name} state={state.name} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
