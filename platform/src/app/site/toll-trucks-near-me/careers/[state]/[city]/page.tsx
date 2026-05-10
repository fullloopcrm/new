// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL } from "@/app/site/toll-trucks-near-me/_data/content";
import { getTopCitiesPerState, getCityBySlug } from "@/app/site/toll-trucks-near-me/_data/cities";
import { SERVICES } from "@/app/site/toll-trucks-near-me/_data/services";
import { getOfficeByState } from "@/app/site/toll-trucks-near-me/_data/offices";
import { OfficeBlock } from "@/app/site/toll-trucks-near-me/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";
import { JobApplicationForm } from "@/app/site/toll-trucks-near-me/_components/JobApplicationForm";

export const dynamicParams = true;

export function generateStaticParams() {
  return getTopCitiesPerState(1).map(({ state, city }) => ({ state: state.slug, city: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return {};
  return {
    title: `Tow Truck Dispatch Jobs in ${result.city.name}, ${result.state.abbreviation} — Now Hiring`,
    description: `Hiring tow truck service crew members in ${result.city.name}, ${result.state.abbreviation}. Competitive pay, tips, benefits, paid training, growth opportunities. Apply today.`,
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

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring in {city.name}, {state.abbreviation}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Tow Truck Dispatch Jobs in <span className="gradient-text">{city.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Join the only tow truck company that pays customers for their stuff. We&apos;re hiring crew members in {city.name}, {state.abbreviation}.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Tow Truck Dispatch Crew Jobs in {city.name}, {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What It&apos;s Like Working in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Our {city.name} crews handle <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">all {SERVICES.length} tow truck services</Link> — from <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">furniture pickup</Link> to <Link href="/services/long-distance-towing" className="text-teal-700 font-semibold hover:underline">full estate cleanouts</Link>. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">how our pricing works</Link> and <Link href="/about" className="text-teal-700 font-semibold hover:underline">why we&apos;re different</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>As a crew member in {city.name}, you&apos;ll work directly with local homeowners, businesses, and property managers. You&apos;ll load items, identify resale value, present appraisals to customers, and deliver an experience that gets 5-star reviews. Our {city.name} crews know the neighborhoods, the dump sites, the recycling centers, and the local resale market — that knowledge makes every job faster and every appraisal more accurate.</p>
            <p>The job is physical — lifting, carrying, loading, driving. But it&apos;s also a thinking job. You&apos;ll learn to tell the difference between a $50 IKEA bookshelf and a $500 Pottery Barn one. You&apos;ll know which appliances hold value and which electronics have active resale markets. That appraisal skill is what makes this job different from every other hauling gig in {city.name}.</p>
            <p>We provide paid training, competitive hourly pay, tips (customers tip well when you save them money), quarterly bonuses, and a clear path from crew member to team lead to operations manager. Full-time positions include health insurance, PTO, and 401k.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Requirements for {city.name} Tow Truck Dispatch Jobs</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What We&apos;re Looking For in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            No experience required — we train you on everything. Here&apos;s what you need to apply. See our <Link href="/careers" className="text-teal-700 font-semibold hover:underline">main careers page</Link> for full details.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Valid driver's license & clean record",
                "Ability to lift 50+ lbs repeatedly",
                "Reliable transportation to dispatch",
                "Strong customer service skills",
                "Smartphone with data plan",
                "Pass background check",
                "Available weekends (our busiest days)",
                "Positive attitude & willingness to learn",
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
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Also Hiring Near {city.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Tow Truck Dispatch Jobs Near {city.name}, {state.abbreviation}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              We&apos;re hiring across {state.name}. See <Link href={`/careers/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">all {state.name} positions</Link>.
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
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Apply for $50/hr Tow Truck Dispatch Jobs in {city.name}</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Apply Now — {city.name}, {state.abbreviation}</h2>
              <p className="mt-4 text-base text-slate-600">Fill out the form and we&apos;ll call you within 48 hours.</p>
              <div className="mt-6 space-y-3">
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">$50/hr</p>
                  <p className="text-sm text-slate-600">Starting pay — no experience required</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">$50–$150/day tips</p>
                  <p className="text-sm text-slate-600">On top of hourly pay</p>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>✓ Valid driver&apos;s license &amp; clean record</p>
                  <p>✓ Lift 50+ lbs repeatedly</p>
                  <p>✓ Smartphone with data plan</p>
                  <p>✓ Pass background check</p>
                  <p>✓ 18+ years old</p>
                  <p>✓ Available weekends</p>
                </div>
              </div>
            </div>
            <div>
              <JobApplicationForm city={city.name} state={state.abbreviation} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
