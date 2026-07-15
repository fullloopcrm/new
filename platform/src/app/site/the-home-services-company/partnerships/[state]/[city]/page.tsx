import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, EMAIL } from "@/app/site/the-home-services-company/_data/content";
import { STATES, getStateBySlug } from "@/app/site/the-home-services-company/_data/cities";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { PartnershipForm } from "@/app/site/the-home-services-company/_components/PartnershipForm";
import { getPostedLabel, getDatePostedISO, getValidThroughISO } from "@/app/site/the-home-services-company/_lib/freshness";

export const revalidate = 2592000;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const state = getStateBySlug(stateSlug);
  const city = state?.cities.find((c) => c.slug === citySlug);
  if (!state || !city) return {};
  return {
    title: `Contractor Partnerships in ${city.name}, ${state.abbreviation} — Partner With Home Services Co`,
    description: `Licensed contractors in ${city.name}, ${state.abbreviation}: partner with Home Services Co and get routed jobs across all 40 home service trades. Steady work, central dispatch, payment processing.`,
    alternates: { canonical: `/partnerships/${stateSlug}/${citySlug}` },
  };
}

export default async function CityPartnershipsPage({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state: stateSlug, city: citySlug } = await params;
  const state = getStateBySlug(stateSlug);
  const city = state?.cities.find((c) => c.slug === citySlug);
  if (!state || !city) notFound();

  const seed = `partnerships-${state.slug}-${city.slug}`;
  const posted = getPostedLabel(seed);
  const datePostedISO = getDatePostedISO(seed);
  const validThroughISO = getValidThroughISO(seed);

  const jobPostings = SERVICES.map((s) => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `${s.title} Contractor Partnership — ${city.name}, ${state.abbreviation}`,
    description: `Preferred contractor partnership for ${s.title.toLowerCase()} in ${city.name}, ${state.abbreviation}. Licensed and insured contractors get routed jobs, central dispatch, and payment processing.`,
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
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jp) }}
        />
      ))}

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{posted} — Now accepting in {city.name}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Contractor Partnerships in <span className="gradient-text">{city.name}, {state.abbreviation}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Licensed contractors in {city.name}: partner with Home Services Co and get a steady pipeline of booked jobs across all 40 trades.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Why Partner With Us in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            Traditional lead-generation networks sell you unconfirmed leads you have to chase, close, schedule, and collect on yourself. We do it differently. Our dispatch routes pre-scheduled jobs to you at an agreed rate, handles all customer communication, collects payment, and pays you on a predictable cadence. Your time goes into the work — not into chasing leads, arguing about pricing, or waiting on late payments. Browse our <Link href="/services" className="text-teal-700 hover:underline font-semibold">40-service menu</Link>, see how our <Link href="/pricing" className="text-teal-700 hover:underline font-semibold">pricing works</Link>, or review <Link href="/faq" className="text-teal-700 hover:underline font-semibold">common partner questions</Link>.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Local Work, Central Support", desc: `We dispatch work within ${city.name} and adjacent ${state.abbreviation} markets. You stay close to home.` },
              { title: "Real Job Volume", desc: `Every trade we list has ongoing demand across ${state.cities.length} cities in ${state.abbreviation} — not occasional spot work.` },
              { title: "Licensed and Insured Only", desc: "We only route to verified partners. No race to the bottom with unlicensed operators." },
              { title: "Upfront Pricing", desc: "Customers already agreed to the price before you're dispatched. No haggling on arrival." },
              { title: "Fast Payout", desc: "Predictable payment cycle — typically weekly or biweekly depending on partnership tier." },
              { title: "Low Admin Overhead", desc: "Scheduling, CRM, COI tracking, and customer service handled centrally. You focus on the trade." },
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
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">All 40 Trades Open in {city.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">{posted}. Partnership openings across every trade. Apply to the one you specialize in — we route only the work you are licensed and equipped to handle.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-teal-400 hover:shadow-md transition-all"
              >
                <p className="text-sm font-semibold text-slate-900">{s.title} — {city.name}</p>
                <p className="text-xs text-slate-500">{posted} &bull; Licensed and insured required</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">The Local {city.name} Contractor Ecosystem</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The contracting ecosystem in {city.name}, {state.abbreviation} includes a broad mix of small trade businesses, independent contractors, franchise operators, and private-equity-owned roll-ups. Each of these has a place in the market, and each has trade-offs that matter for {city.name} customers deciding where to spend their money. Small trade businesses often deliver excellent service when you have a personal relationship with the owner-operator, but quality varies unpredictably when the shop scales up. Independent contractors are the most common source of home service work across {city.name}, and quality across the independent-contractor population ranges from exceptional to genuinely problematic.</p>
            <p>Franchise operators bring brand consistency and operational reliability to {city.name}, but the flat-rate pricing models most franchises use produce inflated per-job costs compared to honest hourly billing. Private-equity-owned roll-ups often operate under a familiar local shop name with centralized sales scripts and aggressive upsell training layered in — customers who used the original shop for years sometimes notice a change after the acquisition. Lead-generation marketplaces connect {city.name} customers to contractors who pay the most for leads, not the best contractors, and customer information is typically resold to multiple vendors.</p>
            <p>Our {city.name} partnership program occupies a distinct niche in this ecosystem. We consolidate marketing, scheduling, and customer service under a single brand while keeping partner contractors as independent businesses with their own operations and crews. This hybrid approach gives partners the pipeline benefits of a national brand without the capital commitment of a franchise and without absorbing their local business identity. For established {city.name} contractors whose operations are already running well but who want to add stable routed volume, this structure tends to fit better than any of the alternatives.</p>
            <p>The specific {city.name} market characteristics that matter for partnership success include the local housing stock, the permitting jurisdictions, the supply house landscape, seasonal demand patterns, and the competitive landscape from other home service providers. Our dispatch understands these local characteristics because we have been operating in {state.abbreviation} long enough to have built the institutional knowledge. For contractors considering whether partnership is right for their {city.name} operation, our partnership manager can walk through the local context during the initial conversation.</p>
            <p>Partner success metrics in {city.name} focus on customer satisfaction scores, on-time arrival rates, scope-change communication quality, and job completion documentation. Partners who consistently meet these metrics earn priority routing, premium trades, and eventually exclusive territory consideration. Partners who struggle on these metrics receive specific feedback and improvement plans rather than immediate termination — we would rather develop a good-fit partner through feedback than churn through candidates, but consistent failure on quality standards does eventually end the partnership.</p>
            <p>For {city.name} contractors ready to explore partnership, the path forward is straightforward. Submit the partnership inquiry form, have a 30-45 minute conversation with our {state.name} partnership manager, provide credential documentation, and if the economics and operations match on both sides, begin onboarding. The initial onboarding conversation is genuinely a fit check rather than a sales pitch — we turn away candidates whose economics do not work, because trying to force a bad-fit partnership hurts both sides over time.</p>
            <p>For {city.name} contractors comparing us against the main alternatives in the local market — lead marketplaces that sell raw leads, franchise networks that lock you into long-term contracts, private-equity buyers offering acquisition deals, or continuing to run your operation independently — the honest comparison depends on your specific trade, current volume, and operational capacity. Our partnership manager can walk through a real economic projection for your situation rather than a generic pitch. If the numbers show us as the wrong fit for your business, we will say so and suggest what would actually work better, including alternatives we do not directly offer.</p>
            <p>The {city.name} partnership relationship can scale in several directions as performance demonstrates value. Partners who start with small routed volume can grow into preferred-partner tier with higher-priority routing. Partners in underserved trades can move toward exclusive territory partner status for their trade in {city.name}. Partners with multi-trade crews can take on cross-trade dispatching. Partners with strong operational capability can eventually move toward full franchise operator roles. Each of these scaling paths is merit-based and gets discussed during the quarterly partnership check-ins rather than determined up-front.</p>
            <p>For {city.name} contractors weighing the investment of time required to complete the partnership application and onboarding, the realistic timeline from first inquiry to active routed work is about two to three weeks for candidates whose credentials are current. Most of that time is credential verification rather than our internal review speed. Contractors whose credentials have any gaps — expired insurance, lapsed trade licenses, unrenewed workers comp — will need to close the gap before onboarding can complete. We can point you at the specific path to close credential gaps during the onboarding conversation so the timeline is predictable even when some work is needed up front.</p>
            <p>The partnership application form on this page captures what we need to start the conversation. For {city.name} contractors who prefer to talk first before filling out the form, email hello@thehomeservicescompany.com or call the number above and ask for partnerships. The partnership manager for {city.name} will walk through your specific questions and, if the fit looks right, guide you to the formal application step.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">How the {city.name} Partnership Works in Practice</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>If you run a licensed contracting business in {city.name}, the partnership is structured to plug directly into your existing operation without absorbing your brand. We send scheduled, pre-paid, fully-quoted appointments to your dispatch. You execute the work under your own company name. Payment runs through our system and settles to you on a predictable cycle. Customers experience the service under our brand, which is how we keep the customer relationship clean and accountable, and you keep running your {city.name} business the way you run it — with the benefit of a steady lead stream that does not require you to pay per click or per quote.</p>
            <p>For an independent {city.name} technician without a business structure, the path is typically through <Link href={`/careers/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">W-2 or 1099 technician roles in {city.name}</Link> rather than the preferred-partner tier. We hire licensed technicians directly, handle the dispatch and payment infrastructure, and give you a route of booked jobs in your trade. The economics differ (salaried or per-job pay vs. keeping the full margin on partner-routed work) but the entry requirements are lighter since we absorb the business-ops overhead.</p>
            <p>Credential requirements in {city.name} are specific to the trade. HVAC requires state HVAC license plus EPA 608 certification. Plumbing requires a state plumbing license in jurisdictions that require one. Electrical requires journeyman or master electrical licensing. Roofing, pest control, tree services, and other specialty trades each carry their own {state.abbreviation} certification rules. We verify your credentials directly with the licensing authority during onboarding rather than taking paperwork at face value. Background checks, driving record checks, and insurance verification round out the screen.</p>
            <p>The application form on this page is the fastest path. Fill it out with your trade, your {city.name} service area, your current crew size, and a brief description of the work you do. It goes to our partnerships team at hello@thehomeservicescompany.com. Initial response within 48 hours, full onboarding usually completed within a week for candidates who already have their credentials in order. If you have questions before applying, call {PHONE} and ask for partnerships. For broader context, see the <Link href={`/partnerships/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} partnerships page</Link> and the <Link href="/partnerships" className="text-teal-700 font-semibold hover:underline">national partnerships hub</Link>.</p>
            <p>Related local pages for {city.name}: the <Link href={`/locations/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name} services hub</Link> shows every trade we book in your city, and our <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link> page covers the account structure for <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property managers</Link>, <Link href="/who-we-serve/businesses" className="text-teal-700 font-semibold hover:underline">businesses</Link>, and multi-property operators who often become consistent work sources for our preferred {city.name} partners.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Everyday Operations for a {city.name} Partner</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The daily operational rhythm for a {city.name} preferred partner is structured around the tech app and the dispatch-routed appointment queue. Partners start their day by reviewing the day&apos;s routed appointments — typically three to six jobs depending on trade and job size — and confirming readiness. Supplies and parts needed for the day are flagged in advance through the pre-appointment scope review, so there are rarely last-minute supply-run scrambles. The scheduling assumes realistic drive times between {city.name} job sites rather than optimistic travel estimates that force partners to rush.</p>
            <p>During the day, each appointment follows the same flow: arrive within the scheduled window, introduce yourself to the customer, walk through the scope, confirm the estimate, execute the work, log photos and completion notes in the tech app, collect payment through our system. Scope changes mid-job trigger an in-app alert to the customer with the revised estimate; work continues only after the customer approves. Partners who consistently execute this flow cleanly get the highest-rated partner status in their {city.name} market and the priority routing that comes with it.</p>
            <p>At the end of the day, partners close out routes in the app and upload any remaining photos or notes. Payouts settle automatically on the partnership-tier cadence. The administrative overhead of running your own {city.name} business — invoicing, payment processing, collection follow-ups, customer complaint handling — largely disappears for partner-routed work because our central team handles those functions. Partners who keep their own direct-customer work outside the partnership still run their own admin for that work; the partnership dispatch adds volume without adding admin burden on top of your existing operation.</p>
            <p>Credential compliance runs on an annual cycle in {city.name}. License renewals, insurance renewals, workers comp renewals, and background check updates are tracked in the partner portal with automated reminders before expiration. Partners whose credentials lapse get flagged immediately and cannot accept new routed work until the gap is closed — but the system is designed to prevent lapses from happening in the first place through renewal reminders and submission paths inside the partner portal.</p>
            <p>For {city.name} partners interested in scaling their partnership — adding trades, adding technicians, adding service-area geography — those conversations happen through the dedicated partnership manager for the market. Growth in the partnership is merit-based; partners with consistent quality scores and reliable volume earn expanded routing over time. For new partners entering the program, the typical ramp-up period is three to six months before the routed volume stabilizes at a predictable level.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 font-heading">Submit a {city.name} Partnership Inquiry</h2>
              <p className="mt-4 text-base text-slate-600">Tell us about your trade, your business, and your market. Goes straight to hello@thehomeservicescompany.com. We respond within 48 hours.</p>
              <div className="mt-6 space-y-3 text-sm text-slate-600">
                <p><strong>Call:</strong> <a href={PHONE_HREF} className="text-teal-700 hover:underline">{PHONE}</a></p>
                <p><strong>Email:</strong> <a href={`mailto:${EMAIL}`} className="text-teal-700 hover:underline">{EMAIL}</a></p>
                <p><strong>Related:</strong> <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 hover:underline">{city.name} service page</Link> · <Link href={`/careers/${stateSlug}/${citySlug}`} className="text-teal-700 hover:underline">{city.name} careers</Link> · <Link href={`/partnerships/${stateSlug}`} className="text-teal-700 hover:underline">{state.name} partnerships</Link></p>
              </div>
            </div>
            <div>
              <PartnershipForm city={city.name} state={state.name} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
