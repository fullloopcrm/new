import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, SMS_HREF, EMAIL } from "@/app/site/we-pay-you-junk/_data/content";
import { getTopCitiesPerState, getCityBySlug } from "@/app/site/we-pay-you-junk/_data/cities";
import { SERVICES } from "@/app/site/we-pay-you-junk/_data/services";
import { getOfficeByState } from "@/app/site/we-pay-you-junk/_data/offices";
import { OfficeBlock } from "@/app/site/we-pay-you-junk/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { JobApplicationForm } from "@/app/site/we-pay-you-junk/_components/JobApplicationForm";
import { JsonLd } from "@/app/site/we-pay-you-junk/_components/JsonLd";
import { jobPostingLd, SITE_URL } from "@/app/site/we-pay-you-junk/_lib/schema";

export const dynamicParams = true;

export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return {};
  return {
    title: `Junk Removal Partner in ${result.city.name}, ${result.state.abbreviation} — Now Recruiting`,
    description: `Become a junk removal partner in ${result.city.name}, ${result.state.abbreviation}. 1099 role — $100/hr + $50/hr per extra laborer + 60% resale. Bring your own truck, license, and insurance. Apply today.`,
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
      <JsonLd
        data={jobPostingLd({
          title: `Junk Removal Operator Partner — ${city.name}, ${state.abbreviation}`,
          description:
            "1099 partner opportunity: run junk removal in your territory under the We Pay You Junk Removal brand. $100/hr as the lead with your truck + $50/hr per additional laborer + 60% resale. Bring your own truck (or a vehicle with a trailer), a valid license, and insurance. No drug test, no benefits, no training.",
          url: `${SITE_URL}/careers/${stateSlug}/${citySlug}`,
          city: city.name,
          state: state.abbreviation,
        })}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring in {city.name}, {state.abbreviation}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Junk Removal Jobs in <span className="gradient-text">{city.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Join the only junk removal company that pays customers for their stuff. We&apos;re hiring crew members in {city.name}, {state.abbreviation}.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Crew Jobs in {city.name}, {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What It&apos;s Like Working in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Our {city.name} crews handle <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">all {SERVICES.length} junk removal services</Link> — from <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">furniture pickup</Link> to <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">full estate cleanouts</Link>. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">how our pricing works</Link> and <Link href="/about" className="text-teal-700 font-semibold hover:underline">why we&apos;re different</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>As a partner in {city.name}, you&apos;ll work directly with local homeowners, businesses, and property managers. You&apos;ll load items, identify resale value, present appraisals to customers, and deliver an experience that gets 5-star reviews. As a {city.name} partner you know the neighborhoods, the dump sites, the recycling centers, and the local resale market — that knowledge makes every job faster and every appraisal more accurate.</p>
            <p>The job is physical — lifting, carrying, loading, driving. But it&apos;s also a thinking job. You&apos;ll learn to tell the difference between a $50 IKEA bookshelf and a $500 Pottery Barn one. You&apos;ll know which appliances hold value and which electronics have active resale markets. That appraisal skill is what makes this job different from every other hauling gig in {city.name}.</p>
            <p>You earn $100/hr as the lead with your truck, $50/hr for each additional laborer you bring, and 60% of the resale value on items you haul. It&apos;s a 1099 partner role — no drug test, no benefits, no training. We guide your local branding and growth under the brand, with a path to becoming the sole We Pay You Junk provider for your territory.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Requirements for {city.name} Junk Removal Jobs</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What We&apos;re Looking For in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            This is a 1099 partner role — you bring the truck and equipment. Here&apos;s what you need to apply. See our <Link href="/careers" className="text-teal-700 font-semibold hover:underline">main careers page</Link> for full details.
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
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Junk Removal Jobs Near {city.name}, {state.abbreviation}</h2>
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
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Apply to Become a Junk Removal Partner in {city.name}</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Apply Now — {city.name}, {state.abbreviation}</h2>
              <p className="mt-4 text-base text-slate-600">Fill out the form and we&apos;ll call you within 48 hours.</p>
              <div className="mt-6 space-y-3">
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">$100/hr</p>
                  <p className="text-sm text-slate-600">You, the lead with the truck — dump fees included</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-teal-700 font-heading">+$50/hr &bull; +60% resale</p>
                  <p className="text-sm text-slate-600">Per additional laborer, plus your resale share</p>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>✓ Your own truck (or a vehicle with a trailer)</p>
                  <p>✓ Valid driver&apos;s license</p>
                  <p>✓ Vehicle insurance</p>
                  <p>✓ A dry storage area for resale items</p>
                  <p>✓ Lift 50+ lbs repeatedly</p>
                  <p>✓ 18+ years old</p>
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
