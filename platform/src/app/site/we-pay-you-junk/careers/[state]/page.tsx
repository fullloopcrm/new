import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, SMS_HREF, EMAIL } from "@/app/site/we-pay-you-junk/_data/content";
import { STATES, getStateBySlug } from "@/app/site/we-pay-you-junk/_data/cities";
import { getOfficeByState } from "@/app/site/we-pay-you-junk/_data/offices";
import { OfficeBlock } from "@/app/site/we-pay-you-junk/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { JobApplicationForm } from "@/app/site/we-pay-you-junk/_components/JobApplicationForm";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return {};
  return {
    title: `Junk Removal Jobs in ${state.name} — We're Hiring in ${state.cities.length} Cities`,
    description: `Become a We Pay You Junk partner in ${state.name}. 1099 role across ${state.cities.length} cities in ${state.abbreviation} — $100/hr + $50/hr per extra laborer + 60% resale. Bring your own truck, license, and insurance. Apply today.`,
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
            Junk Removal Jobs in <span className="gradient-text">{state.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Join the only junk removal company that pays customers. We&apos;re hiring crew members, team leads, and drivers across {state.name}.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Crew Member Positions in {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why Work for We Pay You Junk Removal in {state.name}?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We&apos;re not your typical hauling company. Our crews are trained appraisers who identify value in every item. Learn about our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing model</Link>, explore <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 34 services</Link> you&apos;ll deliver, and see our <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} office</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Working for We Pay You Junk Removal in {state.name} means joining a team that does things differently. Our crew members don&apos;t just haul junk — they&apos;re trained to spot value, appraise items fairly, and deliver an experience that makes customers say &quot;I can&apos;t believe a junk company just paid me.&quot; That positive energy makes every day better — better tips, better reviews, better job satisfaction.</p>
            <p>We&apos;re growing fast in {state.name}. With {state.cities.length} cities served and more launching every month, there&apos;s room to grow — expand your territory, add your own crews, and become the sole We Pay You Junk provider across more of the state.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "$100/hr + $50/Extra", desc: "You're the lead at $100/hr with your truck. Each additional laborer you bring is $50/hr. Dump fees included in your rate." },
              { title: "60% Resale Share", desc: "Keep 60% of what the items you haul resell for — a second income stream on top of your hourly." },
              { title: "Own Your Territory", desc: "Grow into the sole We Pay You Junk provider for your area — and more of the state over time." },
              { title: "Your Own Schedule", desc: "You're a 1099 partner running your own operation. Pick your days. Customers book 7AM–8PM, 7 days a week." },
              { title: "Free Franchising", desc: "We guide your local branding and business growth under the brand — a form of free franchising." },
              { title: "What You Bring", desc: "Your own truck (or a vehicle with a trailer), valid license, and insurance. No drug test, no training — you operate." },
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
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Click your city to see the local listing and apply. Partner territories are open across every city.</p>
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Job Requirements in {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Requirements — What You Need to Apply</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            This is a 1099 partner role — you bring the truck and equipment. Here&apos;s what you need. See our <Link href="/about" className="text-teal-700 font-semibold hover:underline">company values</Link> and <Link href="/services" className="text-teal-700 font-semibold hover:underline">the services you&apos;ll deliver</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-2xl grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { req: "Your own truck or trailer", detail: "A pickup, box truck, or a vehicle with a trailer" },
              { req: "Valid driver's license", detail: "Current and valid" },
              { req: "Vehicle insurance", detail: "Required for a 1099 partner role" },
              { req: "A dry storage area", detail: "To hold resale inventory until it sells" },
              { req: "Lift 50+ lbs repeatedly", detail: "This is a physical job — all day, every day" },
              { req: "Smartphone with data plan", detail: "For scheduling, navigation, and appraisal tools" },
              { req: "Customer service attitude", detail: "Friendly, professional, communicative" },
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
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Apply to Become a Junk Removal Partner in {state.name}</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Apply Now — {state.name}</h2>
              <p className="mt-4 text-base text-slate-600">
                Fill out the form and we&apos;ll call you within 48 hours. No resume needed. Bring your own truck and you&apos;re ready to operate.
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">$100/hr</p>
                  <p className="text-sm text-slate-600">You, the lead with the truck — dump fees included</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">+$50/hr</p>
                  <p className="text-sm text-slate-600">For each additional laborer you bring</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">+60%</p>
                  <p className="text-sm text-slate-600">Resale share on items you haul</p>
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
