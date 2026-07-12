import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, EMAIL } from "@/app/site/the-home-services-company/_data/content";
import { STATES, getStateBySlug } from "@/app/site/the-home-services-company/_data/cities";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { PartnershipForm } from "@/app/site/the-home-services-company/_components/PartnershipForm";
import { getPostedLabel, getDatePostedISO, getValidThroughISO } from "@/app/site/the-home-services-company/_lib/freshness";

export const revalidate = 2592000; // regenerate daily

export const dynamicParams = true

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return {};
  return {
    title: `Contractor Partnerships in ${state.name} — Partner With Home Services Co`,
    description: `Partner with Home Services Co in ${state.name}. Licensed contractors across ${state.cities.length} ${state.abbreviation} cities and all 40 trades. Steady work, central dispatch, payment processing, no lead fees.`,
    alternates: { canonical: `/partnerships/${stateSlug}` },
  };
}

export default async function StatePartnershipsPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) notFound();

  const posted = getPostedLabel(`partnerships-${state.slug}`);
  const datePostedISO = getDatePostedISO(`partnerships-${state.slug}`);
  const validThroughISO = getValidThroughISO(`partnerships-${state.slug}`);

  const jobPostings = SERVICES.map((s) => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `${s.title} Contractor Partnership — ${state.name}`,
    description: `Preferred contractor partnership for ${s.title.toLowerCase()} in ${state.name}. Licensed and insured contractors get steady routed jobs, central dispatch, and payment processing. ${state.cities.length} ${state.abbreviation} cities served.`,
    datePosted: datePostedISO,
    validThrough: validThroughISO,
    employmentType: ["CONTRACTOR", "FULL_TIME", "PART_TIME"],
    hiringOrganization: {
      "@type": "Organization",
      name: "Home Services Co",
      sameAs: "https://www.thehomeservicescompany.com",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: state.cities[0]?.name || state.name,
        addressRegion: state.abbreviation,
        addressCountry: "US",
      },
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: "USA",
    },
    directApply: true,
  }));

  return (
    <>
      {jobPostings.map((jp, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jp) }}
        />
      ))}

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{posted} — Open across {state.cities.length} {state.abbreviation} cities</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Contractor Partnerships in <span className="gradient-text">{state.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Licensed contractors and crews in {state.name}: partner with Home Services Co and get routed, pre-scheduled jobs across all {state.cities.length} {state.abbreviation} cities we serve.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">The {state.name} Contractor Market</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>For {state.name} contractors who have tried lead marketplaces, franchise buy-ins, or private-equity acquisition offers and come away disappointed with the economics, our partnership program offers a genuinely different structure. Lead marketplaces fail because close rates on purchased leads run so low that per-closed-job marketing costs often exceed fifteen percent of revenue. Franchise buy-ins require upfront capital (typical fees run $30,000 to $150,000+), multi-year exclusive contracts, royalty payments on gross revenue (five to ten percent), and required equipment and marketing spend minimums. Private-equity acquisitions convert your equity into their equity on terms designed to benefit the acquirer; most selling contractors regret the deal within eighteen months. Our partnership avoids each of these pitfalls by structuring the relationship as ongoing routed volume at transparent economics rather than a financial lock-in.</p>
            <p>The specific trades in {state.name} where partnership demand currently exceeds our supply include HVAC, plumbing, electrical, roofing, and kitchen/bathroom remodeling — any trade where licensed credentialing creates a meaningful barrier to entry. Partners in these trades typically ramp up to steady routed volume within the first ninety days. Less-credentialed trades like cleaning, handyman, lawn care, and landscaping have more partner saturation in most {state.abbreviation} markets, so new partners in these trades sometimes wait longer before reaching target routing volume.</p>
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The contracting market in {state.name} includes thousands of licensed small businesses across home service trades, and most of them face the same structural challenges. Variable month-to-month volume makes payroll planning difficult. Marketing and lead generation eat into margin. Customer acquisition costs run higher than most contractors acknowledge when they total up the real hours spent closing jobs. Collections and payment disputes consume time that should go into the work itself. Seasonal swings leave crews under-utilized in slow months and overwhelmed in peak periods. The cumulative effect is that most {state.abbreviation} contracting businesses operate below the profit-per-hour they could achieve with more stable demand and lower admin overhead.</p>
            <p>Our partnership program is designed around these specific pain points. Routed volume from our dispatch smooths the month-to-month variability that independent contractors experience. Because we handle marketing and lead generation at the company level, partners avoid the per-lead costs that compound across thousands of ${state.abbreviation} independent contractors competing on the same marketplaces. Because we collect payment through our system, partners skip the collections work that consumes hours per week at small shops. Because our scheduling flexes across peak and off-peak periods, partners can share capacity with us during slow seasons and focus on direct work during peak seasons.</p>
            <p>Partnership tiers in {state.name} are structured so partners can start small and scale up as the relationship demonstrates value. An introductory partner might start by accepting 10-20 routed jobs per month to test how the economics work with their operation. A preferred partner at full engagement might accept 40-80+ routed jobs per month across their {state.abbreviation} service area. Exclusive territory partners in underserved {state.abbreviation} markets commit to higher volume and quality standards in exchange for geographic exclusivity for their trade.</p>
            <p>The economic comparison to alternatives matters more than any marketing pitch. Against lead marketplaces, we typically add 2-4x more margin per partner-hour because marketplace close rates are so low. Against continuing independent operation, we typically add 20-40% volume without adding proportional admin overhead. Against franchise ownership, we provide most of the brand and pipeline benefits without the upfront capital outlay or multi-year contract. The specific numbers for your {state.abbreviation} situation depend on your trade, your market, your current margin structure, and your operational capacity — which is why we run real economic projections during onboarding rather than pitching generic sales claims.</p>
            <p>For {state.name} contractors deciding whether to explore the partnership, the low-commitment path is to apply, go through a 30-minute conversation about your specific situation, and see whether the economics work out. No contract requirement for the conversation, no pressure, and we will tell you honestly if we think the partnership is not a fit for your current operation. Contractors whose economics clearly do not work out with us are better off with alternatives, and we would rather know that early than force a relationship that does not serve both sides.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Day-to-Day Reality of {state.name} Partnership</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The day-to-day operational reality for a {state.name} partner looks meaningfully different from running an independent contracting business. The morning starts with a review of the day&apos;s routed appointments in the tech app — typically three to six jobs depending on trade and job complexity. Appointments are already confirmed with the customer, pricing is already agreed, and the scope is already documented. Your job is execution, not sales or scheduling. For contractors who joined us from lead-marketplace models where the first hour of every morning went to returning lead-platform inquiries, this shift removes a meaningful chunk of unpaid work from the daily routine.</p>
            <p>Midday transitions between jobs in {state.name} are designed for efficiency rather than maximum density. Dispatch builds routes around realistic drive times between appointments rather than optimistic estimates that force rushed travel. Short scheduling buffers handle the normal overruns that happen in real service work. Parts runs are minimized through stocked trucks and pre-scope ordering when necessary. The operational goal is steady productive work throughout the day rather than pressured rushing that produces mistakes.</p>
            <p>Evening close-outs in {state.name} happen through the tech app. Final photos, completion notes, and payment processing all run through the same system that handled the morning dispatch. The close-out is quick — typically 15-30 minutes for a full day of appointments. Once close-out is complete, the work day ends. No evening phone calls chasing payment. No late-night admin work updating customer records. No weekend hours writing invoices. The administrative workload that consumes so much time at independent contracting operations largely disappears under our model.</p>
            <p>Weekly payouts in {state.name} settle on a consistent schedule. Partners see their earned revenue in their bank accounts on the same day each week regardless of which specific customers they served or what time those customers actually paid. The revenue smoothing removes the cash-flow volatility that plagues smaller contractors, especially those dealing with slow-paying customers or seasonal volume swings. For partners who used to spend mental energy on whether specific customers were going to pay on time, this stability is worth real money even before counting the marginal revenue from routed appointments.</p>
            <p>Monthly or quarterly partnership check-ins happen between you and our partnership manager for the market. These conversations cover routing volume trends, quality feedback from customers, operational improvements identified during the period, and strategic questions about expanding or contracting the relationship. Partners who want to scale up get the pathway to do it. Partners who want to stay at current volume keep the current routing. Partners who want to step back during slow seasons or for personal reasons can do so without losing partnership status. The relationship is designed for flexibility rather than rigid commitments.</p>
            <p>The bottom line for {state.name} contractors considering partnership: the downside of applying is a 30-45 minute conversation with our partnership manager. The upside, if the economics and operations match, is a routed-volume pipeline that converts your existing operation into a more profitable, less administratively burdensome business. That is a favorable risk-reward profile, which is why the application form at the bottom of this page is the right next step for contractors in {state.abbreviation} serious about exploring whether this model fits their business.</p>
            <p>For {state.name} contractors with questions that do not fit the application form, email hello@thehomeservicescompany.com or call our partnerships line directly. The partnership team can answer specific questions about your trade, your market, your current volume, or any other operational detail before you commit to the full application process. No obligation to proceed after the conversation — the goal is to give you enough information to make a real decision about whether partnership with us fits your {state.abbreviation} business and your goals for the next several years.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Why Partner With Us in {state.name}</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Booked Jobs, Not Leads", desc: "Customers already agreed to the price. You get dispatched to a scheduled appointment, not a cold lead." },
              { title: "Central Dispatch", desc: "We handle scheduling, reminders, arrival communication, and change management." },
              { title: "Payment Collection", desc: "We invoice and collect. You get paid on a clean, predictable schedule with no customer chase-downs." },
              { title: "Back-Office Support", desc: "Scheduling software, COI management, and a customer service team that answers the phone." },
              { title: "Marketing Engine", desc: `SEO and local presence across all ${state.cities.length} ${state.abbreviation} cities driving the pipeline you plug into.` },
              { title: "Keep Your Brand", desc: "For established businesses, preferred-partner status means we route work your way without absorbing your identity." },
            ].map((b) => (
              <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Trades Open for Partnership in {state.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">{posted}. Partnership openings across every trade in every {state.abbreviation} market we serve.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.slug} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500">Open in {state.cities.length} {state.abbreviation} cities</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">How the {state.name} Partnership Actually Works</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Partnerships in {state.name} function as preferred-vendor relationships rather than employment. If you run a licensed {state.name} contracting business, the partnership adds a steady pipeline of scheduled jobs onto your existing operation without absorbing your brand or forcing you to change how you do the work. Our <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} dispatch</Link> routes booked, pre-scheduled, paid-deposit appointments to you within your trade and your service area. You execute the work, report back through our tech app, and get paid on a predictable weekly or biweekly cycle depending on the partnership tier.</p>
            <p>The economics compare favorably to lead-generation marketplaces and handyman platforms in {state.abbreviation}. Those networks charge you for raw leads you have to close, schedule, collect on, and follow up on yourself. We send you scheduled appointments where the customer has already agreed to the price. No closing process, no quote negotiation, no chasing payment. The margin you keep on each job is higher because the overhead of finding and converting the job is already handled. For {state.abbreviation} contractors running a small crew, this often translates to a meaningful revenue lift within the first quarter of the relationship.</p>
            <p>Credential requirements apply — partners must be licensed in their trade where {state.name} requires it, carry general liability insurance at our coverage minimums, and pass background checks for the technicians you dispatch to our customers. Existing contractors in {state.abbreviation} who already meet these bars get approved within a few business days of submitting the partnership form. Contractors who are close but missing a piece (lapsed insurance, expired license, etc.) get a checklist of what to update and can join once the credentials are current.</p>
            <p>Related opportunities in {state.name} for individual technicians rather than businesses: see <Link href={`/careers/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} careers</Link> for W-2 and 1099 roles across all 40 trades. For specific market information, browse <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold hover:underline">every {state.abbreviation} city we serve</Link>. For the broader partnership overview, see the <Link href="/partnerships" className="text-teal-700 font-semibold hover:underline">partnerships hub</Link>.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Partnership Openings by City</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Pick your city for the local partnership page with trade-specific openings.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {state.cities.map((city) => (
              <Link
                key={city.slug}
                href={`/partnerships/${stateSlug}/${city.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{city.name}</p>
                <p className="mt-0.5 text-xs text-teal-600">Now accepting</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Partnership Standards in {state.name}</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Operational standards for {state.name} partners are the same standards we hold our direct-employed technicians to. Arrive within the scheduled window. Introduce yourself with a photo-ID check. Walk the customer through the scope and confirm the estimate before starting. Execute the work to code and trade craft standards. Leave the space clean. Log photos and notes in the tech app. Close out payment through our system. Stand behind the work if a callback is needed. These are the same standards the customer experiences from every technician under our brand, and partners who consistently meet them get priority routing and higher-value assignments over time.</p>
            <p>Credential standards in {state.abbreviation} are non-negotiable. We verify state-issued trade licenses directly with the licensing authority rather than trusting a copy. We confirm general liability coverage at our minimums (currently $1M per-occurrence / $2M aggregate across most trades) by requesting a current COI directly from your insurance carrier. We verify workers&apos; compensation coverage for any employees you dispatch. These verifications happen at onboarding and again on an annual renewal cycle. Partners whose credentials lapse get flagged in the system and cannot accept new routed work until the gap is closed.</p>
            <p>The job flow for {state.name} partners runs through our tech app. Incoming appointments route to partners based on trade, service area, capacity, and partner tier. You accept or decline within a short window (typically an hour during business hours). Accepted jobs lock onto your schedule with confirmed customer appointment, arrival window, and scope. You execute, log completion, and payment processes automatically through our system. Payouts settle on a predictable weekly or biweekly cycle depending on your partnership tier and {state.abbreviation} banking arrangements.</p>
            <p>Quality feedback from {state.name} customers flows back to partners through structured channels. High-rated work generates positive reviews that strengthen your partner profile and attract more routed volume. Issues get flagged for your review with specific detail about what went wrong and how to prevent recurrence. Repeat issues trigger formal reviews that can lead to reduced routing or, in serious cases, partnership termination. This feedback loop is the core of how we maintain customer-facing quality across a partner network rather than just a direct-employed workforce.</p>
            <p>For contractors comparing our {state.name} partnership against alternatives like lead marketplaces, franchise ownership, or continuing to operate independently, the specific {state.abbreviation} economics depend on your current business structure, volume, and margin profile. Book a partnership conversation through the form on this page and we will run a real economic projection for your specific situation rather than pitching a generic sales line.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 font-heading">Submit a {state.name} Partnership Inquiry</h2>
              <p className="mt-4 text-base text-slate-600">Tell us your trade, your market, and a bit about your business. Goes straight to hello@thehomeservicescompany.com. We reply within 48 hours.</p>
              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <p><strong>Call:</strong> <a href={PHONE_HREF} className="text-teal-700 hover:underline">{PHONE}</a></p>
                <p><strong>Email:</strong> <a href={`mailto:${EMAIL}`} className="text-teal-700 hover:underline">{EMAIL}</a></p>
              </div>
            </div>
            <div>
              <PartnershipForm state={state.name} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
