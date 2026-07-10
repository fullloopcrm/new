import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL } from "@/app/site/the-home-services-company/_data/content";
import { STATES, getStateBySlug } from "@/app/site/the-home-services-company/_data/cities";
import { getOfficeByState } from "@/app/site/the-home-services-company/_data/offices";
import { OfficeBlock } from "@/app/site/the-home-services-company/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { JobApplicationForm } from "@/app/site/the-home-services-company/_components/JobApplicationForm";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return {};
  return {
    title: `Home Services Jobs in ${state.name} — We're Hiring in ${state.cities.length} Cities`,
    description: `Join Home Services Co in ${state.name}. Hiring crew members in ${state.cities.length} cities across ${state.abbreviation}. Competitive pay, tips, benefits, growth. Apply today.`,
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
            Home Services Jobs in <span className="gradient-text">{state.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Join the home services company consolidating 40 trades under one brand. We&apos;re hiring licensed technicians, team leads, and drivers across {state.name}.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Crew Member Positions in {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why Work for Home Services Co in {state.name}?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We&apos;re the consolidation play for the fragmented home services industry. One brand, 40 licensed trades, consistent pricing. Review our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing model</Link>, browse <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 40 services</Link> you could deliver, and see our <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} office</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Working for Home Services Co in {state.name} means joining a team that runs a different playbook. We handle marketing, dispatch, scheduling, payments, and customer service — you focus on the trade you&apos;re licensed in. Upfront pricing on every job means no haggling, no surprises, and more repeat work. That consistency makes every day better — better tips, better reviews, better job satisfaction.</p>
            <p>We&apos;re growing fast in {state.name}. With {state.cities.length} cities served and more launching every month, there are constant opportunities for advancement — from technician to lead tech to market manager. We promote from within and reward performance.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "$50/Hour", desc: "Crew members earn $50/hr from day one. No experience required — we train you. That's $400/day on a standard 8-hour shift." },
              { title: "Tips on Top", desc: "Customers tip well when you save them money. Average crew members earn $50–$150/day in tips on top of hourly pay." },
              { title: "Paid Training", desc: "Full paid onboarding on our scheduling system, pricing model, customer service standards, and job workflow. You earn while you learn." },
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Job Requirements in {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Requirements — What You Need to Apply</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            No prior home services experience needed. We provide full paid training. Here&apos;s what you do need. See our <Link href="/about" className="text-teal-700 font-semibold hover:underline">company values</Link> and <Link href="/services" className="text-teal-700 font-semibold hover:underline">the services you&apos;ll deliver</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-2xl grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { req: "Valid driver's license", detail: "Clean driving record required" },
              { req: "Lift 50+ lbs repeatedly", detail: "This is a physical job — all day, every day" },
              { req: "Reliable transportation", detail: "To get to the dispatch location on time" },
              { req: "Smartphone with data plan", detail: "For scheduling, navigation, and job updates" },
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

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How {state.name} Careers Work</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Working as a Technician in {state.name}</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Licensed technicians in {state.name} join our {state.abbreviation} operation through one of two paths — direct employment (W-2 or 1099) or as a preferred contractor partner through our <Link href={`/partnerships/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} partnerships program</Link>. The direct employment path fits technicians who want steady routes, a predictable schedule, and back-office support for scheduling, dispatch, and payment processing. You bring your license and your trade skill. We bring the pipeline, the scheduling system, the customer service layer, and the billing infrastructure.</p>
            <p>{state.name} licensing requirements apply for regulated trades. For <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, and <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link> work in {state.abbreviation}, you will need current state licensing appropriate to the level of work (journeyman, master, apprentice with sponsorship). For unregulated trades like <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">cleaning</Link>, <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman services</Link>, <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>, and <Link href="/services/landscaping" className="text-teal-700 font-semibold hover:underline">landscaping</Link>, we focus on practical skill assessment and customer service aptitude during onboarding.</p>
            <p>The {state.name} markets we serve include {state.cities.slice(0, 5).map((c) => c.name).join(", ")}, and {state.cities.length - 5} other {state.abbreviation} cities. Each market has active hiring across every trade we operate in. If you prefer a specific {state.abbreviation} city, <Link href={`/careers/${state.slug}/${state.cities[0]?.slug || ""}`} className="text-teal-700 font-semibold hover:underline">click through to that city&apos;s careers page</Link> for the local trade list. If you are flexible across markets, apply through the state-level form and we will route you to the nearest open route that matches your trade.</p>
            <p>Related pages for {state.name}: our <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} service areas</Link> show every city we operate in; <Link href={`/partnerships/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} partnerships</Link> is the contracting-business path into the network; the <Link href="/about" className="text-teal-700 font-semibold hover:underline">company story</Link> covers our operating philosophy; and the <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise program</Link> is the market-ownership path for experienced operations leaders in {state.name}.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">{state.name} Market Details</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Job Volume and Seasonal Patterns in {state.abbreviation}</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Job volume across {state.name} follows predictable seasonal cycles that technicians should understand when planning their year. HVAC demand peaks in summer for cooling and winter for heating, with spring and fall tune-up windows that our scheduling team pushes customers toward to smooth out the peaks. Exterior trades — roofing, siding, deck, fence, landscaping, lawn care — concentrate in spring and summer across most {state.abbreviation} climates, with a fall push for preventive maintenance before winter. Interior trades run year-round with modest seasonal lifts around holidays and tax-refund season.</p>
            <p>Volume distribution across trades in {state.name} roughly mirrors the national pattern. House cleaning, handyman services, HVAC, plumbing, and electrical are the top five by call volume in most {state.abbreviation} markets. Appliance repair, garage door repair, carpet cleaning, landscaping, and lawn care round out the top ten. Project trades like kitchen remodeling, bathroom remodeling, and full roof replacement are lower volume but higher per-job revenue, which usually works out to competitive annualized earnings for technicians who specialize.</p>
            <p>Scheduling flexibility varies by route type. Technicians on short-repair routes in {state.abbreviation} usually handle three to six jobs per day. Technicians on recurring-service routes (cleaning, lawn care, pool service) build up a fixed weekly cadence that stabilizes both income and schedule. Technicians on project work handle longer-duration jobs that can span multiple days. Most new hires start on mixed routes during onboarding and specialize into a preferred route type as they learn the market.</p>
            <p>For technicians relocating to {state.name} from another state, we can often coordinate a transfer through our market-to-market transfer program. Credentials that transfer across state lines (like EPA 608) carry over. Credentials that are state-specific (most trade licenses) need to be reissued in {state.abbreviation}, and we provide guidance on the state&apos;s reciprocity rules and application process. For technicians local to {state.abbreviation} looking for immediate route assignment, the city-specific pages for {state.cities.slice(0, 3).map((c) => c.name).join(", ")}, and our other {state.abbreviation} markets have real-time opening listings.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Getting Started as a {state.name} Technician</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The path from initial interest to active route work in {state.name} takes about two to three weeks for candidates with current credentials. The first step is the <Link href="#apply" className="text-teal-700 font-semibold hover:underline">application form</Link>, which collects basic information about your trade, location, availability, and credentials. Applications get initial review within one to two business days, and qualified candidates move to a phone screen with a recruiter — typically 15-20 minutes to confirm fit and answer basic questions.</p>
            <p>Technical interviews with a lead technician or trade manager happen next for candidates who pass the phone screen. These conversations go into real scenarios specific to your trade — not generic behavioral questions. For HVAC candidates, the interview covers diagnostics, refrigerant handling, and common service scenarios. For plumbing candidates, pipe repairs, fixture installation, water heater work, and emergency leak response. For electrical, outlet and fixture work, panel upgrades, code compliance, and EV charger installs. For other trades, the technical conversation is similarly specific to what the work actually involves.</p>
            <p>Credential verification runs in parallel. We pull license status directly from the {state.name} state licensing authority. We verify insurance coverage with your carrier. We run background checks, driving records, and drug screens through standard consumer reporting agencies. Candidates with clean credentials typically clear this stage within 3-5 business days. Candidates with complications get individualized review — many experienced technicians have something in their past worth discussing, and we evaluate case by case rather than rejecting automatically.</p>
            <p>Final conversation happens with the {state.name} market operations manager. This is the fit check on both sides — confirming the candidate understands what the work involves in our operating model, confirming the market can support the routes the candidate needs to be successful, and answering remaining questions about compensation, benefits, scheduling, or culture. Offers typically go out within 1-2 business days of the final conversation for candidates who want to proceed.</p>
            <p>Onboarding takes one to two weeks after offer acceptance. You meet dispatch, scheduling, customer service, and the other technicians in your market. You complete technician app training. You shadow a lead technician on actual appointments for a few days before taking independent routes. You work through the operating-standards documentation. By the end of the second week, most new technicians are handling full routes independently. For {state.abbreviation} candidates who want to understand the specifics before applying, call {PHONE} and ask to speak with our recruiting team — we can walk through the specific questions for your situation before you commit to the application process.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The {state.name} Technician Experience Over Time</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Technicians who stay with us long-term in {state.name} generally follow a predictable trajectory. The first few months are onboarding and ramp-up — learning our dispatch system, building comfort with the tech app, meeting quality standards on initial routes, and establishing customer-service patterns that match our operating norms. Most new hires hit full productivity within 60-90 days depending on trade complexity and prior experience. Partners who join with strong prior experience in licensed trades typically ramp faster than those joining from general handyman or unlicensed backgrounds.</p>
            <p>Months six through twelve in {state.name} are where most technicians see their biggest income growth. Tips accumulate because customer reviews build up favorable patterns. Route efficiency improves because you know the metros, the supply houses, and the repeat customers. Cross-trade certifications start paying off because multi-trade technicians capture more routed appointments. Year-one annualized compensation for technicians who execute consistently on our operating standards typically outpaces the equivalent technician at a flat-rate shop in the same {state.abbreviation} market.</p>
            <p>Years two and beyond in {state.name} often involve specialization into a preferred route type (same-day emergency dispatch, project work, recurring maintenance routes, cross-trade combination routes), movement into a lead-technician role, or transition into market operations. Experienced {state.name} technicians who have been with us for multiple years often become the mentors for newer hires coming in, and the lead-technician promotion carries a pay lift and route flexibility that most {state.abbreviation} technicians value.</p>
            <p>For {state.name} technicians considering whether to leave their current situation for us, the honest comparison includes things most job-ads gloss over. How many unpaid hours per week does your current job actually require? (Small-shop technicians often work 50-60 paid hours but are &quot;on call&quot; for another 15-20 unpaid hours.) What is your actual take-home after commission clawbacks, equipment costs, and other deductions? (Flat-rate shops often present a gross number that looks great and nets substantially lower.) What is your schedule reliability — can you plan your week in advance, or does it shift constantly? (Independent contractors often have the worst schedule unpredictability.) Our {state.abbreviation} technician compensation compares favorably on all of these dimensions, not just the headline hourly rate.</p>
            <p>For contractor business owners in {state.name} reading the careers page because you are considering transitioning to become a W-2 technician, the alternative worth considering is our <Link href={`/partnerships/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} partnerships program</Link>. Partnership keeps you as an independent business while adding routed volume. For some former business owners, partnership is the better fit than direct employment because it preserves the business-ownership experience and crew you have built, while giving you a pipeline that removes the sales and marketing burden that was consuming your time.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Trades and Compensation Specifics in {state.name}</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Licensed trades like <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, and <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link> in {state.abbreviation} pay at the higher end of the trade rate bands because the licensing itself is a scarce qualification. Unlicensed trades like <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link>, <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>, <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>, and <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman services</Link> pay at local market rates specific to each {state.abbreviation} city where we operate. Specialty trades like <Link href="/services/appliance-repair" className="text-teal-700 font-semibold hover:underline">appliance repair</Link>, <Link href="/services/garage-door-repair" className="text-teal-700 font-semibold hover:underline">garage door repair</Link>, <Link href="/services/locksmith-services" className="text-teal-700 font-semibold hover:underline">locksmith services</Link>, and <Link href="/services/home-security-installation" className="text-teal-700 font-semibold hover:underline">security installation</Link> pay on their own specialty-skill bands.</p>
            <p>For {state.name} technicians with multi-trade skills, cross-trade bonus programs reward technicians who can handle more than one specialty. A technician licensed in both HVAC and plumbing, for example, gets priority scheduling for cross-trade jobs and a bonus rate applied to the second-trade work. This is designed to encourage technicians to expand their credential portfolio over time rather than lock into a single specialty permanently.</p>
            <p>Benefits for W-2 full-time technicians in {state.name} include health insurance (medical, dental, vision), paid time off that grows with tenure, 401(k) with a company match, continuing education funding, and paid time to complete continuing-education requirements tied to trade license renewals. Benefits for 1099 contractors are not the same package, but 1099 pay bands are calibrated to compensate. Which structure fits depends on your personal tax planning and health-coverage situation.</p>
            <p>The tools and equipment {state.name} technicians need vary by trade, and we supply what the company can provide more efficiently than the technician can individually — truck, diagnostic equipment, specialized tools that are too expensive for individuals to justify, and proprietary software and apps. Hand tools are typically technician-supplied, with an allowance for initial tool purchase for new hires and a replacement allowance for wear-and-tear over time. {state.abbreviation} technicians on the tools-heavy trades get larger allowances than those on tools-light trades.</p>
            <p>For {state.name} technicians looking at us versus the alternatives in the state — independent operation, working for a local shop, working for a national franchise, working for a private-equity-backed roll-up — the economics depend on the specific trade and the specific {state.abbreviation} market. We can walk through a real comparison during the initial interview process.</p>
            <p>Additional practical considerations for {state.name} candidates worth knowing up front: we verify credentials directly with the state licensing authority rather than trusting documentation at face value, which means candidates with expired or problematic licenses should not plan to rely on our verification missing an issue; we run background checks at standard consumer-reporting-agency depth, which is stricter than most marketplaces but well within what any reputable employer would do; and we take drug screens as a baseline requirement rather than skipping that step. Candidates who meet these bars typically move through the process in 2-3 weeks.</p>
            <p>For {state.name} technicians ready to apply, the form at the bottom of this page captures the information we need to route your application to the right market team. Initial response time is 24-48 hours during business days. Phone interviews schedule within another few days. Technical interviews and credential verification run in parallel afterward. The final conversation with the market manager happens once all other stages clear. Offers typically go out within 1-2 business days of the final conversation. Total timeline from submission to route assignment runs 2-3 weeks for candidates with current credentials in {state.abbreviation}.</p>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Apply for $50/hr Home Services Jobs in {state.name}</p>
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
