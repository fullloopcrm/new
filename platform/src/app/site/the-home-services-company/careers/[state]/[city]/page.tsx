// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL } from "@/app/site//_data/content";
import { getTopCitiesPerState, getCityBySlug } from "@/app/site//_data/cities";
import { SERVICES } from "@/app/site//_data/services";
import { getOfficeByState } from "@/app/site//_data/offices";
import { OfficeBlock } from "@/app/site/the-home-services-company/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { JobApplicationForm } from "@/app/site/the-home-services-company/_components/JobApplicationForm";
import { getPostedLabel, getDatePostedISO, getValidThroughISO } from "@/app/site/the-home-services-company/_lib/freshness";

export const dynamicParams = true;
export const revalidate = 86400; // regenerate daily so job dates auto-refresh within the 15-day window

export function generateStaticParams() {
  return getTopCitiesPerState(1).map(({ state, city }) => ({ state: state.slug, city: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return {};
  return {
    title: `Home Services Jobs in ${result.city.name}, ${result.state.abbreviation} — Now Hiring`,
    description: `Hiring home services crew members in ${result.city.name}, ${result.state.abbreviation}. Competitive pay, tips, benefits, paid training, growth opportunities. Apply today.`,
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

  const seed = `careers-${state.slug}-${city.slug}`;
  const posted = getPostedLabel(seed);
  const datePostedISO = getDatePostedISO(seed);
  const validThroughISO = getValidThroughISO(seed);

  const jobPostings = SERVICES.map((s) => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `${s.title} Technician — ${city.name}, ${state.abbreviation}`,
    description: `Licensed ${s.title.toLowerCase()} technician needed in ${city.name}, ${state.abbreviation}. Home Services Co handles marketing, dispatch, and payment collection — you focus on the trade. Full-time, part-time, and flexible routes available.`,
    datePosted: datePostedISO,
    validThrough: validThroughISO,
    employmentType: ["FULL_TIME", "PART_TIME", "CONTRACTOR"],
    hiringOrganization: {
      "@type": "Organization",
      name: "Home Services Co",
      sameAs: "https://www.thehomeservicescompany.com",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: city.name,
        addressRegion: state.abbreviation,
        addressCountry: "US",
      },
    },
    directApply: true,
  }));

  return (
    <>
      {jobPostings.map((jp, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jp) }}
        />
      ))}

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{posted} — Now Hiring in {city.name}, {state.abbreviation}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services Jobs in <span className="gradient-text">{city.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Join the home services company consolidating 40 trades under one brand. We&apos;re hiring licensed technicians in {city.name}, {state.abbreviation}.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Crew Jobs in {city.name}, {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What It&apos;s Like Working in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Our {city.name} technicians cover <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">all {SERVICES.length} home services</Link> — from <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link> and <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link> to <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">cleaning</Link> and <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman work</Link>. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">how our pricing works</Link> and <Link href="/about" className="text-teal-700 font-semibold hover:underline">why we&apos;re different</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>As a technician in {city.name}, you work directly with local homeowners, businesses, and property managers. You execute the job scope, log notes and photos in the tech app, and collect payment on the spot. Our {city.name} technicians know the neighborhoods, the supply houses, the permit offices, and the local market — that knowledge keeps jobs efficient and customers happy.</p>
            <p>The job is a mix of hands-on trade work and customer interaction. You&apos;ll handle scoped jobs in your trade, communicate clearly with customers about what you&apos;re doing and why, and leave every job site clean. Upfront pricing at $99/hour means no haggling — you quote the job, you do the job, you get paid.</p>
            <p>We provide paid onboarding, competitive pay, tips (customers tip well for quality work), quarterly bonuses, and a clear path from technician to lead tech to market manager. Full-time positions include health insurance, PTO, and 401(k).</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Route Structure and Daily Workflow in {city.name}</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Daily routes in {city.name} are assembled by our dispatch system overnight and published to the technician app before the morning start time. Route composition depends on your trade — high-volume trades like <Link href={`/locations/${stateSlug}/${citySlug}/hvac-services`} className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href={`/locations/${stateSlug}/${citySlug}/plumbing`} className="text-teal-700 font-semibold hover:underline">plumbing</Link>, and <Link href={`/locations/${stateSlug}/${citySlug}/electrical`} className="text-teal-700 font-semibold hover:underline">electrical</Link> typically run 4-6 appointments per day with moderate job-to-job travel. Lower-volume specialty trades may cover a wider {city.name} geography with 2-3 appointments per day but longer durations per job.</p>
            <p>Scheduling density in {city.name} is a function of both customer demand and your technician capacity. Dispatch builds routes that keep you busy without overcramming, which means realistic drive times, realistic job durations, and buffer built in for unexpected scope changes or customer delays. If you finish a job early, the next appointment often moves up. If a job runs long, downstream adjustments happen in real time rather than forcing you to rush through the rest of the day.</p>
            <p>Appointment variety in {city.name} depends on your trade and your route preferences. New technicians typically start on mixed routes that give exposure to different customer types — homeowners, renters, small businesses, property-managed units — and different job types — repair, maintenance, project work. Over time, technicians who prefer a specific type of work can specialize into routes focused on that type. Recurring-service routes (cleaning, lawn care, pool service) stabilize into a weekly or biweekly rhythm. Emergency-dispatch routes handle reactive work where response time matters more than scheduling density. Project-work routes handle longer-duration jobs that span multiple visits.</p>
            <p>Communication touch points through the day in {city.name} include pre-appointment customer confirmations that fire automatically from our system, in-appointment scope confirmation via the tech app, post-appointment completion documentation including photos and notes, payment processing through the app at the end of each job, and end-of-day route close-out. Most of this happens through the app rather than requiring paper forms or calls back to dispatch, which keeps the administrative overhead per job low.</p>
            <p>End-of-day responsibilities in {city.name} include uploading final photos and completion notes, closing out payment processing, reporting any issues that need follow-up, and cleaning the truck for the next day. The typical end-of-day close-out takes 15-30 minutes depending on route complexity. Once close-out is complete, the work day ends — no expected after-hours phone answering, no on-call rotations unless you specifically opt into emergency dispatch for additional pay, and no unpaid administrative work that extends into personal time.</p>
            <p>For {city.name} technicians considering whether the route structure matches their lifestyle, the honest comparison is with flat-rate franchise shops (tend toward overscheduling and commission-pressured upselling), independent operation (tend toward unpredictable scheduling and heavy admin burden), and general handyman platforms (tend toward lead-quality variability and customer disputes). Our structure occupies a distinct niche: predictable daily routes with low administrative overhead, no sales-pressure component, and operational support that lets you focus on the trade work.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Technicians Stay in {city.name}</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Technicians who stay with us long-term in {city.name} consistently cite the same three reasons: route predictability, operational support, and the absence of doorstep-sales pressure. Each of these is a quality-of-life improvement more than a pay improvement, and collectively they account for why our voluntary technician turnover in {city.name} runs well below the industry average for home services. The home services industry as a whole loses technicians to burnout, scheduling chaos, and the emotional toll of aggressive upselling models. Our operating structure is specifically designed to eliminate those friction points.</p>
            <p>Route predictability means a technician in {city.name} knows at the start of the day what jobs are coming, where they are, and approximately how long each will take. Dispatch builds routes around realistic capacity rather than cramming appointments to hit quota. If a job runs long, downstream appointments adjust. If a job finishes early, the next one moves up. This is how scheduling should work in a service business, and it is how our {city.name} dispatch actually operates. Technicians who have worked at flat-rate franchise shops describe the scheduling difference as the single biggest daily improvement.</p>
            <p>Operational support means the non-trade work that eats up a small contractor&apos;s time in {city.name} — phone answering, appointment booking, customer communication, invoicing, payment processing, collection follow-up, warranty handling, and dispute resolution — happens centrally rather than falling on the technician. For technicians who entered the trade to do the trade work, this support is what lets you actually do the trade work during your paid hours instead of splitting your time between billable work and business admin.</p>
            <p>The absence of doorstep-sales pressure is the least-discussed but most important quality-of-life factor for technicians in {city.name}. Flat-rate franchise models use commission structures that pay technicians higher when they upsell at the appointment, which turns every customer interaction into a sales pitch. Customers resent it. Technicians resent it. Our upfront pricing model — customer has already agreed to the price before the technician arrives — removes that dynamic entirely. Technicians in {city.name} show up, do the work, collect payment, move on to the next appointment. No sales pressure, no commission conflicts, no ethical gray areas.</p>
            <p>For {city.name} technicians considering the move from flat-rate franchise work, from independent operation, or from general handyman platforms, the transition is usually an immediate quality-of-life improvement with competitive-to-better pay. The initial interview process walks through the specific economics for your trade and current situation so you can evaluate the change with real numbers rather than marketing claims. Apply through the form below or call the phone number above.</p>
            <p>The {city.name} trades currently hiring most actively include HVAC, plumbing, electrical, handyman services, house cleaning, and appliance repair — the six trades that generate the highest customer call volume across most {state.abbreviation} markets. Technicians in these trades typically find immediate route availability once credentials clear. Specialty trades like locksmith, garage door repair, pest control, and tree services are also hiring but at lower volume proportional to market demand. Whatever your trade, the first step is the application form or a direct phone call.</p>
            <p>For {city.name} candidates comparing this role against other options in the local market, the right lens is total compensation plus schedule reliability plus administrative overhead — not just hourly rate. Flat-rate shops often quote higher headline pay but capture back value through commission clawbacks and overscheduling. Independent operation skips the middleman cut but adds unpaid admin time that consumes a meaningful share of the week. General handyman platforms can work for gig-style income but come with lead-quality variability and dispute risk. Our model produces competitive total compensation, predictable scheduling, and low administrative overhead, and those combined advantages are what most {city.name} technicians who have tried alternatives point to when asked why they stay.</p>
            <p>Application volume in {city.name} runs strongest through the application form on this page and through direct phone inquiries to our recruiting team. For the fastest path, submit the form with accurate credential information and availability, and expect initial contact within 48 hours during business days. For candidates who prefer a phone conversation first, call our recruiting line directly and ask specifically for {city.name} opportunities. Either path lands with the same market recruiting team.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">{posted} — All 40 Trades Open in {city.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Now Hiring Across All 40 Home Services Trades in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Pick the trade you are licensed in. Every role below is open in {city.name}, {state.abbreviation} right now.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.slug} className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{s.title} Technician</p>
                  <p className="text-xs text-slate-500">{city.name}, {state.abbreviation} &bull; {posted}</p>
                </div>
                <a
                  href="#apply"
                  className="inline-block rounded-md bg-accent px-4 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-accent-dark font-cta"
                >
                  Apply Now
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Requirements for {city.name} Home Services Jobs</p>
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
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Home Services Jobs Near {city.name}, {state.abbreviation}</h2>
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

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Working in {city.name} — Local Context</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Routes in {city.name} are structured around typical driving distances in the metro. Our dispatch algorithm assigns appointments in geographic clusters so your day runs efficiently rather than criss-crossing {city.name} in response to random booking order. Route density varies by trade — high-volume trades like <Link href={`/locations/${stateSlug}/${citySlug}/hvac-services`} className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href={`/locations/${stateSlug}/${citySlug}/plumbing`} className="text-teal-700 font-semibold hover:underline">plumbing</Link>, and <Link href={`/locations/${stateSlug}/${citySlug}/house-cleaning`} className="text-teal-700 font-semibold hover:underline">house cleaning</Link> typically produce tight routes with minimal drive time between stops. Lower-volume specialty trades may cover a wider geography with more travel per day.
            </p>
            <p>
              {city.name} building codes, permit processes, and inspection requirements are specific to the jurisdiction, and technicians working here build practical familiarity with the local offices quickly. For <Link href={`/locations/${stateSlug}/${citySlug}/electrical`} className="text-teal-700 font-semibold hover:underline">electrical</Link>, <Link href={`/locations/${stateSlug}/${citySlug}/plumbing`} className="text-teal-700 font-semibold hover:underline">plumbing</Link>, <Link href={`/locations/${stateSlug}/${citySlug}/roofing`} className="text-teal-700 font-semibold hover:underline">roofing</Link>, and other trades requiring permits, our central support handles the paperwork flow so technicians can focus on the work rather than bureaucratic friction.
            </p>
            <p>
              The {city.name} customer base is a mix of homeowners, renters, landlords, property managers, small businesses, and occasional commercial clients. Technicians rotate through these customer types based on their trade and schedule rather than being locked to a single customer segment, which keeps the work varied and builds transferable experience. The dispatch app shows customer context before each appointment so you know what kind of property and customer you are heading into.
            </p>
            <p>
              Local supply houses, parts distributors, and tool suppliers across {city.name} are integrated into our procurement systems so technicians can source materials efficiently without lengthy detours. For trades that commonly need parts mid-job, we maintain trucks stocked for the typical scenarios and coordinate emergency parts runs when needed. This is one of the overlooked operational benefits of a larger company — the supply infrastructure that small independents have to improvise every day is already built.
            </p>
            <p>
              For context on the broader {state.name} operation, see the <Link href={`/careers/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} careers page</Link>. For the local services side, the <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">{city.name} services hub</Link> shows every trade we book locally. For contractors interested in partnering rather than working as employees, the <Link href={`/partnerships/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">{city.name} partnerships page</Link> covers that path. For the full national context, the <Link href="/about" className="text-teal-700 font-semibold hover:underline">company story</Link> is on the about page.
            </p>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="bg-section-white py-16 scroll-mt-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Apply for $50/hr Home Services Jobs in {city.name}</p>
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
