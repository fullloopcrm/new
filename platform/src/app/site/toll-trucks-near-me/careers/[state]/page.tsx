// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL } from "@/app/site/toll-trucks-near-me/_data/content";
import { STATES, getStateBySlug } from "@/app/site/toll-trucks-near-me/_data/cities";
import { getOfficeByState } from "@/app/site/toll-trucks-near-me/_data/offices";
import { OfficeBlock } from "@/app/site/toll-trucks-near-me/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";
import { JobApplicationForm } from "@/app/site/toll-trucks-near-me/_components/JobApplicationForm";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return {};
  return {
    title: `Tow Truck Dispatch Jobs in ${state.name} — We're Hiring in ${state.cities.length} Cities`,
    description: `Join Toll Trucks Near Me in ${state.name}. Hiring crew members in ${state.cities.length} cities across ${state.abbreviation}. Competitive pay, tips, benefits, growth. Apply today.`,
    alternates: { canonical: `/careers/${stateSlug}` },
  };
}

export default async function StateJobsPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) notFound();
  const office = getOfficeByState(stateSlug);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring in {state.cities.length} {state.abbreviation} Cities</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Tow Truck Dispatch Jobs in <span className="gradient-text">{state.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Join the only tow truck company that pays customers. We&apos;re hiring crew members, team leads, and drivers across {state.name}.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Tow Truck Dispatch Crew Member Positions in {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why Work for Toll Trucks Near Me in {state.name}?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We&apos;re not your typical hauling company. Our crews are trained appraisers who identify value in every item. Learn about our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing model</Link>, explore <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 34 services</Link> you&apos;ll deliver, and see our <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} office</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Working for Toll Trucks Near Me in {state.name} means joining a team that does things differently. Our crew members don&apos;t just tow vehicles — they&apos;re trained to spot value, appraise items fairly, and deliver an experience that makes customers say &quot;I can&apos;t believe a tow operator just paid me.&quot; That positive energy makes every day better — better tips, better reviews, better job satisfaction.</p>
            <p>We&apos;re growing fast in {state.name}. With {state.cities.length} cities served and more launching every month, there are constant opportunities for advancement — from crew member to team lead to operations manager. We promote from within and reward performance.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "$50/Hour", desc: "Crew members earn $50/hr from day one. No experience required — we train you. That's $400/day on a standard 8-hour shift." },
              { title: "Tips on Top", desc: "Customers tip well when you save them money. Average crew members earn $50–$150/day in tips on top of hourly pay." },
              { title: "Paid Training", desc: "Full paid training covering safe handling, item appraisal, customer service, and truck operations. You earn while you learn." },
              { title: "Flexible Schedule", desc: "Full-time and part-time available. Pick your days. We operate 7AM–8PM, 7 days a week." },
              { title: "Growth Path", desc: "Crew Member → Team Lead ($60/hr) → Operations Manager (salary). We promote from within, always." },
              { title: "Full Benefits", desc: "Health insurance, paid time off, and 401k for full-time employees. Part-time gets flexible scheduling and tips." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Hiring in {state.cities.length} {state.name} Cities</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Cities Hiring in {state.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Click your city to see the local job listing and apply. Every city has positions available for crew members and drivers.</p>
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

      {/* Requirements */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Tow Truck Dispatch Job Requirements in {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Requirements — What You Need to Apply</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            No prior tow truck service experience needed. We provide full paid training. Here&apos;s what you do need. See our <Link href="/about" className="text-teal-700 font-semibold hover:underline">company values</Link> and <Link href="/services" className="text-teal-700 font-semibold hover:underline">the services you&apos;ll deliver</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-2xl grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { req: "Valid driver's license", detail: "Clean driving record required" },
              { req: "Lift 50+ lbs repeatedly", detail: "This is a physical job — all day, every day" },
              { req: "Reliable transportation", detail: "To get to the dispatch location on time" },
              { req: "Smartphone with data plan", detail: "For scheduling, navigation, and appraisal tools" },
              { req: "Pass background check", detail: "You'll be entering customers' homes" },
              { req: "Customer service attitude", detail: "Friendly, professional, communicative" },
              { req: "Available weekends", detail: "Our busiest days — at least 1 weekend day" },
              { req: "18+ years old", detail: "Must be legally eligible to work in the US" },
            ].map((item) => (
              <div key={item.req} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="text-teal-600 mt-0.5 shrink-0">✓</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.req}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {office && <OfficeBlock office={office} />}

      {/* Application form */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Apply for $50/hr Tow Truck Dispatch Jobs in {state.name}</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Apply Now — {state.name}</h2>
              <p className="mt-4 text-base text-slate-600">
                Fill out the form and we&apos;ll call you within 48 hours. No resume needed. No experience required.
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">$50/hr</p>
                  <p className="text-sm text-slate-600">Starting pay for all crew members</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">$50–$150/day</p>
                  <p className="text-sm text-slate-600">Average tips on top of hourly pay</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">$60/hr</p>
                  <p className="text-sm text-slate-600">Team Lead promotion rate</p>
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
