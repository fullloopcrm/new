// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL, CITY_COUNT, STATE_COUNT } from "@/app/site//_data/content";
import { STATES } from "@/app/site//_data/cities";
import { SERVICES } from "@/app/site//_data/services";
import { getPostedLabel } from "@/app/site/the-home-services-company/_lib/freshness";

export const revalidate = 86400; // regenerate daily so the "Posted" dates stay fresh

export const metadata: Metadata = {
  title: "Contractor Partnerships — Partner With Home Services Co",
  description: `Partner with Home Services Co. Licensed contractors and trade pros in ${CITY_COUNT} cities across ${STATE_COUNT} states get steady lead flow, central dispatch, and back-office support. Partnerships open across all 40 trades.`,
  alternates: { canonical: "/partnerships" },
};

export default function PartnershipsHub() {
  const posted = getPostedLabel("partnerships-hub");

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{posted} — Open in all {STATE_COUNT} states</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Contractor <span className="gradient-text">Partnerships</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Licensed contractors and independent trade professionals: partner with Home Services Co and get a steady pipeline of booked jobs across {CITY_COUNT} cities in all {STATE_COUNT} states.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#states-grid" className="inline-block rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-dark font-cta">Find Partnerships in Your State</a>
            <a href={PHONE_HREF} className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-bold text-teal-700 shadow-md transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</a>
            <a href={SMS_HREF} className="inline-block rounded-lg border border-white px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 font-cta">Text {PHONE}</a>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Two Paths to Partner</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">For Individual Technicians</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">W-2 and 1099 Tech Positions</h3>
              <p className="mt-3 text-base text-slate-700">Licensed techs looking for steady routes, clear pay, and backend support. We handle scheduling, dispatch, marketing, payment collection, and customer service. You handle the trade work.</p>
              <Link href="/careers" className="mt-4 inline-block text-sm font-bold text-teal-700 hover:underline font-cta">See tech roles →</Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">For Contracting Businesses</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 font-heading">Preferred Partner Network</h3>
              <p className="mt-3 text-base text-slate-700">Established contractors and crews become preferred partners for your trade and territory. Work gets routed to you through our dispatch. You keep your business identity — we add the pipeline.</p>
              <a href="#states-grid" className="mt-4 inline-block text-sm font-bold text-teal-700 hover:underline font-cta">Find a partnership near you →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What Partners Get</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Booked Work, Not Leads", desc: "Other networks sell you raw leads you have to close. We send you confirmed, scheduled, paid-deposit jobs." },
              { title: "Central Dispatch", desc: "Our scheduling team books jobs, confirms arrival windows, and handles customer communication end-to-end." },
              { title: "Upfront Pricing Model", desc: "Customers already agreed to the price before you arrive. No haggling, no price-shopping, no race to the bottom." },
              { title: "Payment Processing", desc: "We collect, we pay. You get scheduled payouts on a predictable cadence — no chasing customers for invoices." },
              { title: "Back-Office Support", desc: "Scheduling software, dispatch coordination, COI management, and a customer service team that answers the phone." },
              { title: "Marketing Engine", desc: "SEO, paid search, local directory presence, and review management in 990 cities — driving the pipeline you need." },
            ].map((b) => (
              <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Partnership Openings Across All 40 Trades</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every trade we service has partnership openings. Click through to see city-by-city opportunities.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.slug} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {s.title}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How the Partnership Model Works</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our partnership network covers two distinct populations: individual licensed technicians and established contracting businesses. Each has a different best-fit path into the relationship, and both operate on top of the same central infrastructure — one scheduling system, one customer communication layer, one billing pipeline, one accountability chain. The individual-technician path typically runs through <Link href="/careers" className="text-teal-700 font-semibold hover:underline">W-2 or 1099 roles</Link> where we provide the route, the tools app, the customer service layer, and the payment processing. The contracting-business path runs through the preferred-partner tier, where you keep your company identity and operation and plug into our pipeline as a preferred vendor.</p>
            <p>For individual technicians choosing between employment and preferred-partner, the decision usually comes down to whether you already run a business structure. Licensed technicians without a registered business typically find the employment path easier because we handle the business-ops overhead. Licensed contractors with their own LLC, insurance, and crew usually prefer the preferred-partner path because it preserves their independence while adding a pipeline. Either path produces a real reduction in the marketing, sales, and collections work you would otherwise do yourself.</p>
            <p>Partnership economics compare favorably to the main alternatives. Lead marketplaces like HomeAdvisor, Thumbtack, and Angi charge you for every lead you receive whether you close it or not, and the conversion rates on marketplace leads are typically 10-20% at best. Our model sends you confirmed, pre-paid, pre-scheduled jobs. No quote negotiation. No deposit collection. No chase-downs. The margin per job is higher, and the total throughput per hour of your time is substantially higher because you spend your time doing the work instead of closing the leads.</p>
            <p>Partnership credentials and onboarding are rigorous. We verify licensing directly with the state issuing authority rather than trusting paperwork. We check insurance coverage levels and confirm the policy is active. Background checks and driving record checks apply to every technician who will be dispatched under our brand. These checks are stricter than what most marketplaces or platforms enforce, and they are one of the reasons our customer-facing quality stays consistent. Contractors with good paperwork get approved within a week. Contractors who are close but missing a piece get a checklist and can join once the gap is closed.</p>
            <p>Apply through the form on any <Link href="#states-grid" className="text-teal-700 font-semibold hover:underline">state-specific partnership page</Link> below. For the local version with city-specific trade openings, click through to <Link href="/partnerships" className="text-teal-700 font-semibold hover:underline">your market</Link>. Related reading: <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise opportunities</Link> for entrepreneurs who want to launch a full market rather than join as a partner, and <Link href="/careers" className="text-teal-700 font-semibold hover:underline">career opportunities</Link> for technicians looking for W-2 or 1099 roles on our directly-employed team.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Common Partnership Questions</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Do partners have exclusivity in their market?</strong> At the introductory partner tier, no — multiple partners in the same trade and city share routed volume based on capacity and performance. At the preferred partner tier, partners get priority routing over introductory partners in the same trade and market. At the exclusive territory partner tier, partners hold the exclusive routing right for their trade in their specific geography in exchange for committed volume and quality standards. Tier movement happens through sustained performance over time rather than initial commitment.</p>
            <p><strong>Can partners keep their own direct-customer business alongside partnership work?</strong> Yes. Partnership routing adds volume to your existing operation rather than replacing it. Most partners continue serving their direct customers through their own channels while accepting partnership-routed work to fill capacity. The two streams operate in parallel — partnership work flows through our dispatch and payment systems, direct work continues through your own.</p>
            <p><strong>How does pricing work for partners?</strong> Customers pay the prices our dispatch has already quoted to them before you arrive, at our standard customer-facing rates. You receive the partner share of that revenue on your payout cycle. Partner share varies by trade, market, and partnership tier, with the specifics disclosed clearly during onboarding so you can calculate the economics for your operation before committing.</p>
            <p><strong>What happens when a routed customer has a complaint or warranty issue?</strong> Our central support team fields the initial complaint. If resolution requires a return visit, it routes back to you (or to a different partner if you are unavailable) through normal dispatch. Warranty work is covered under the labor warranty on the original appointment; partners do not lose revenue on warranty callbacks related to their own workmanship. Partners who cause warranty issues at abnormal rates receive feedback and, if the pattern continues, tier reductions or termination.</p>
            <p><strong>Can partners choose which specific appointments to accept?</strong> Yes. Dispatch routes appointments that match your trade, service area, and capacity, and you can accept or decline within the response window. Frequent declines can affect routing volume over time because our system optimizes for partners who provide predictable capacity, but occasional declines for legitimate reasons (capacity overflow, specific scope mismatches) do not penalize your standing.</p>
            <p><strong>What is the commitment to partner?</strong> There is no long-term contract commitment. Partnership status can be paused or ended by either side with standard notice. We do not use long-term exclusive contracts because they tend to benefit whichever party has more leverage at contract time rather than aligning incentives through the relationship. The ongoing relationship depends on continued fit and performance, evaluated regularly, which is how business partnerships should actually work.</p>
            <p><strong>What if my trade is not on the 40-service list?</strong> The 40 services cover the vast majority of residential home service demand, but adjacent specialties sometimes come up. If you operate in a closely related trade that we do not currently list, let us know during the partnership inquiry — we occasionally expand the service menu based on identified market demand and qualified partner supply, and your trade may be next on the expansion list.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Partnership Onboarding Actually Runs</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The onboarding process for a new partner runs in a consistent sequence regardless of trade or market. The first step is the partnership inquiry form — a short document we use to understand your business, your trade, your service area, your current volume, and your operational structure. Most inquiries are reviewed within 24-48 hours during business days. Candidates who match our current partner needs move to a conversation with the partnerships team specific to your state or metro.</p>
            <p>The initial conversation is a structured 30-45 minute call where we walk through both sides of the potential relationship. We cover what your current business looks like, what pipeline volume you could realistically absorb, what pricing structure works for your trade and market, and what credential documentation you will need to provide. You get to ask every question about the partnership model, the routing logic, the payment cadence, the quality standards, the dispute resolution protocols, and anything else that matters for your decision. The conversation is explicitly not a sales pitch — the goal is to establish whether the economics and operations actually match on both sides.</p>
            <p>Credential submission and verification is the next stage for candidates who want to proceed. License verification happens directly with the state issuing authority. Insurance verification happens with your carrier — we need a current COI naming Home Services Co as an additional insured for routed work. Workers compensation verification for any employees you dispatch. Background checks for the individuals who will execute work under our brand. These verifications typically complete within one to two weeks for candidates with current credentials in good order.</p>
            <p>System onboarding runs in parallel with credential verification. You get access to our partner portal, which includes the scheduling interface, the tech app for your crew, the payment processing dashboard, the documentation library, and the contact information for your partnership manager. Training on the systems is self-paced with guided tutorials, and a partnership manager is available for real-time questions during your onboarding period. Most partners complete system training within three to five days of part-time work, depending on familiarity with similar operational software.</p>
            <p>First routed appointments arrive once credentials are verified and system training is complete. Early appointments are typically local, low-complexity scenarios that let your crew get comfortable with our workflow before more complex routing begins. Quality feedback from early customers gets reviewed explicitly so any operational mismatches surface early and can be corrected. Partnership volume ramps up over the first 30-90 days as performance patterns establish. By month four or five, most partners are running at their target routing volume.</p>
            <p>Ongoing partnership operations settle into a stable rhythm after the ramp-up period. Weekly or biweekly payouts arrive on the schedule established during onboarding. Quarterly partner reviews cover performance metrics, routing volume trends, and any operational improvements identified. Annual credential renewals happen through the partner portal with automated reminders before expiration. The partnership manager remains available for any escalations, market changes, or strategic conversations about expanding the relationship.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Partnership Economics — The Real Numbers</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The practical economics of partnering with Home Services Co compare favorably to the main alternatives contractors face when trying to grow a small home services business. The lead-generation model (HomeAdvisor, Thumbtack, Angi, and similar platforms) charges you per lead regardless of whether you close the job. Typical close rates on marketplace leads run between ten and twenty percent. A contractor spending five hundred dollars per month on marketplace leads often books two to four actual jobs from that spend. The remaining leads are wasted cost — contractors bidding against you, customers who never respond, or tire-kickers who were shopping price across a dozen providers simultaneously.</p>
            <p>Our partnership model flips that entirely. We do not sell leads. We send you confirmed, pre-scheduled, deposit-collected appointments. The customer has already seen the price, agreed to it in writing, and paid a booking deposit. Your job on arrival is to execute the work, log the completion, and move on to the next appointment. You do not negotiate price on the doorstep, you do not chase payment after the job, and you do not spend your evenings on phone calls with price-shopping customers. The throughput per hour of your time is substantially higher, which is the single biggest driver of partnership economics working out favorably over time.</p>
            <p>The second major alternative is franchise ownership — operating under a recognized national brand with marketing and operational systems provided. Franchise economics work for the right operators but require significant upfront capital (typical franchise fees in home services range from $30,000 to $150,000+), multi-year contracts, royalty payments on gross revenue (commonly five to ten percent), and required equipment or marketing spend minimums. For established contractors who already have crews and equipment, our preferred-partner tier offers most of the brand and pipeline benefits without the upfront capital outlay or multi-year commitment.</p>
            <p>The third alternative is the status quo — running your own marketing and sales, which means a meaningful share of your time goes into the non-trade work of being self-employed. Phone time, quote time, follow-up time, dispute resolution time, collections time. These non-billable hours add up, and they are hours you could be doing the work you actually get paid for. Contractors moving from the status quo to partnership often report that the biggest benefit is reclaimed time — not the added revenue, but the hours per week that used to go into managing a pipeline that now run through our system.</p>
            <p>Partnership tiers are structured around commitment and volume. Introductory partners get standard dispatch at standard partner rates. Preferred partners who have demonstrated reliability over time get priority routing and better rates. Exclusive territory partners in underserved markets get geographic exclusivity for their trade in exchange for meeting volume and quality commitments. Each tier has specific requirements that are documented at onboarding, and movement between tiers is merit-based rather than tenure-based.</p>
            <p>For contractors evaluating whether the math works for their specific situation, we can run a no-obligation economic projection during the initial partnership conversation. Share your current job volume, trade, city, and typical margin structure, and we will map out what partnership dispatch would likely look like against your existing business. The projection is not a sales pitch — it is a real assessment of whether the relationship makes sense economically for both sides. If the numbers do not work for your situation, we will tell you that and suggest alternatives.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The 40 Trades We Route Partnership Work In</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every trade we operate in nationally is actively routing partnership work to qualified contractors. The highest partnership volume typically concentrates in the trades with the highest consumer demand — <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link>, <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link>, <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman services</Link>, and <Link href="/services/appliance-repair" className="text-teal-700 font-semibold hover:underline">appliance repair</Link>. Contractors in these trades typically see the fastest ramp-up in routed volume once onboarded, because customer demand is already there waiting to be filled.</p>
            <p>Seasonal trades like <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>, <Link href="/services/landscaping" className="text-teal-700 font-semibold hover:underline">landscaping</Link>, <Link href="/services/snow-removal" className="text-teal-700 font-semibold hover:underline">snow removal</Link>, <Link href="/services/pool-services" className="text-teal-700 font-semibold hover:underline">pool services</Link>, <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>, and <Link href="/services/tree-services" className="text-teal-700 font-semibold hover:underline">tree services</Link> have predictable seasonal peaks that we staff partners for in advance. Contractors in seasonal trades can structure partnership relationships that match their operating calendar — full engagement during peak season, reduced engagement in off-season — rather than committing to year-round flat volume.</p>
            <p>Project trades like <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link>, <Link href="/services/bathroom-remodeling" className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>, <Link href="/services/roofing" className="text-teal-700 font-semibold hover:underline">roofing</Link>, <Link href="/services/siding-installation" className="text-teal-700 font-semibold hover:underline">siding</Link>, <Link href="/services/flooring-installation" className="text-teal-700 font-semibold hover:underline">flooring installation</Link>, and <Link href="/services/solar-installation" className="text-teal-700 font-semibold hover:underline">solar installation</Link> tend to be lower volume but higher per-job revenue. Contractors specializing in these trades often run fewer concurrent jobs with longer project timelines, and partnership economics work out through per-project margin rather than high appointment throughput.</p>
            <p>Specialty trades like <Link href="/services/locksmith-services" className="text-teal-700 font-semibold hover:underline">locksmith</Link>, <Link href="/services/garage-door-repair" className="text-teal-700 font-semibold hover:underline">garage door repair</Link>, <Link href="/services/chimney-sweep" className="text-teal-700 font-semibold hover:underline">chimney sweep</Link>, <Link href="/services/water-damage-restoration" className="text-teal-700 font-semibold hover:underline">water damage restoration</Link>, <Link href="/services/home-security-installation" className="text-teal-700 font-semibold hover:underline">home security installation</Link>, and <Link href="/services/moving-services" className="text-teal-700 font-semibold hover:underline">moving services</Link> fill niche roles with consistent year-round demand. Contractors in these trades often become exclusive territory partners for their city because the specialty barrier to entry keeps the partner roster small.</p>
            <p>Every other trade in our 40-service menu — <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link>, <Link href="/services/carpentry" className="text-teal-700 font-semibold hover:underline">carpentry</Link>, <Link href="/services/drywall-repair" className="text-teal-700 font-semibold hover:underline">drywall repair</Link>, <Link href="/services/fence-installation" className="text-teal-700 font-semibold hover:underline">fence installation</Link>, <Link href="/services/deck-building" className="text-teal-700 font-semibold hover:underline">deck building</Link>, <Link href="/services/concrete-services" className="text-teal-700 font-semibold hover:underline">concrete</Link>, <Link href="/services/masonry" className="text-teal-700 font-semibold hover:underline">masonry</Link>, <Link href="/services/insulation-services" className="text-teal-700 font-semibold hover:underline">insulation</Link>, <Link href="/services/air-duct-cleaning" className="text-teal-700 font-semibold hover:underline">air duct cleaning</Link>, <Link href="/services/carpet-cleaning" className="text-teal-700 font-semibold hover:underline">carpet cleaning</Link>, <Link href="/services/window-cleaning" className="text-teal-700 font-semibold hover:underline">window cleaning</Link>, <Link href="/services/pressure-washing" className="text-teal-700 font-semibold hover:underline">pressure washing</Link>, <Link href="/services/gutter-cleaning" className="text-teal-700 font-semibold hover:underline">gutter cleaning</Link>, <Link href="/services/furniture-assembly" className="text-teal-700 font-semibold hover:underline">furniture assembly</Link>, <Link href="/services/junk-removal" className="text-teal-700 font-semibold hover:underline">junk removal</Link>, and <Link href="/services/holiday-light-installation" className="text-teal-700 font-semibold hover:underline">holiday light installation</Link> — is actively accepting qualified partners across our full network of cities.</p>
          </div>
        </div>
      </section>

      <section id="states-grid" className="bg-section-white py-16 scroll-mt-32">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Partner Openings by State</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Pick your state to see {CITY_COUNT} cities with active partnership openings.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {STATES.map((state) => (
              <Link
                key={state.slug}
                href={`/partnerships/${state.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{state.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{state.cities.length} cities</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Talk?</h2>
          <p className="mt-4 text-base text-white/70">Pick your state below, click your city, and submit the partnership form. We reply within 48 hours.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#states-grid" className="inline-block rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-dark font-cta">Find Partnerships in Your State</a>
            <a href={PHONE_HREF} className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-bold text-teal-700 shadow-md transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</a>
          </div>
        </div>
      </section>
    </>
  );
}
