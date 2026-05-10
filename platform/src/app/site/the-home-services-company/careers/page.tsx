// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL, CITY_COUNT, STATE_COUNT } from "@/app/site//_data/content";

export const metadata: Metadata = {
  title: "Home Services Jobs — Hiring Licensed Techs Nationwide",
  description: `Join Home Services Co. We're hiring licensed technicians across 40 trades — HVAC, plumbing, electrical, painting, cleaning, and more — in ${CITY_COUNT} cities across all ${STATE_COUNT} states.`,
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Join the Team</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Careers at <span className="gradient-text">Home Services Co</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">We&apos;re hiring licensed technicians across 40 home service trades in {CITY_COUNT} cities and all {STATE_COUNT} states. Full-time, part-time, and flexible schedules available.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Jobs Near Me</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">40 Trades. One Company.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We hire licensed and insured technicians across every major home services trade — HVAC, plumbing, electrical, roofing, painting, cleaning, handyman, landscaping, appliance repair, and more. Browse our <Link href="/services" className="text-teal-600 underline">full service list</Link> to find your trade, check our <Link href="/locations" className="text-teal-600 underline">nationwide service areas</Link> to find your market, or <Link href="/book" className="text-teal-600 underline">book a service</Link> to see our customer experience.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Home Services Co is the consolidation play for the fragmented home services industry. Homeowners waste hours vetting one-off contractors for every trade. We solve that with one brand, one phone number, and 40 licensed specialists — dispatched from {CITY_COUNT} cities nationwide.</p>
            <p>For technicians, that means steady lead flow without having to run your own marketing, billing, or customer service. You do the work you&apos;re good at. We handle the pipeline, scheduling, collections, and warranty support. Bring your tools and your license — we bring the jobs.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Competitive Pay", desc: "Competitive hourly or per-job rates based on your trade, with performance bonuses tied to customer ratings." },
              { title: "Tips & Bonuses", desc: "Customers tip our techs directly. Quarterly bonuses for top-rated technicians." },
              { title: "Paid Training", desc: "Paid onboarding on our scheduling system, pricing model, and customer service standards." },
              { title: "Flexible Schedule", desc: "Full-time, part-time, weekends-only, or flexible routes. You pick the load that fits your life." },
              { title: "Growth Path", desc: "Clear advancement from technician to lead tech to market manager. We promote from within." },
              { title: "Benefits", desc: "Health insurance, paid time off, and 401(k) for full-time technicians." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Best Home Services Company to Work For</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Work With Us</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We built a home services company that techs actually want to work for. Read <Link href="/about" className="text-teal-600 underline">about our story</Link>, see our <Link href="/pricing" className="text-teal-600 underline">transparent pricing</Link>, or explore <Link href="/franchise" className="text-teal-600 underline">franchise opportunities</Link> if you want to run your own market.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our pricing is upfront and consistent — every service starts at $99/hour. Customers know what they&apos;re paying before you show up. That means no haggling, no surprises, and more repeat work. You show up, do the job, get paid.</p>
            <p>We handle the marketing, dispatch, payment processing, and customer service. You focus on the craft. Every tech gets a booked route, a branded uniform, insurance coverage, and a team lead they can call when a job gets tricky.</p>
            <p>We&apos;re growing fast — {CITY_COUNT} cities and all {STATE_COUNT} states, adding markets every month. That growth opens up lead tech, market manager, and multi-trade crew lead roles for anyone who wants them.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Job Requirements</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Requirements</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Baseline qualifications apply across every trade. Trade-specific licensing is required for regulated work (HVAC, plumbing, electrical, etc.). Browse <Link href="/services" className="text-teal-600 underline">every home service we offer</Link> to find the trade that matches your skills.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "Valid driver's license and clean driving record",
              "Trade license or certification where required (HVAC, plumbing, electrical, etc.)",
              "Proof of general liability insurance (we help you get covered if needed)",
              "Reliable transportation and basic trade tools",
              "Strong customer service — friendly, professional, on-time",
              "Smartphone with data plan for scheduling and job updates",
              "Pass background check and drug screening",
              "Positive attitude and willingness to learn our system",
            ].map((req) => (
              <div key={req} className="flex items-start gap-3">
                <span className="text-teal-600 mt-0.5">✓</span>
                <span className="text-sm text-slate-700">{req}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Benefits, Pay Structure, and Schedule Flexibility</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Full-time W-2 technicians at Home Services Co receive a full benefits package that matches or exceeds what large service companies typically offer. Medical insurance (multiple plan options with company contribution toward premiums), dental and vision coverage, paid time off that grows with tenure, paid sick leave, company-matched 401(k), short-term and long-term disability coverage, and life insurance. Continuing education funding covers the cost of maintaining trade certifications and acquiring new ones, which is particularly valuable in regulated trades where ongoing credentialing is a real operational expense for independent technicians.</p>
            <p>1099 contractor technicians operate under a different structure. The 1099 pay rate per job is typically higher than the equivalent W-2 hourly rate would produce, with the trade-off that you cover your own health insurance, retirement savings, and self-employment taxes. For technicians who have good health coverage through a spouse&apos;s employer, for retired military or other veterans with VA coverage, or for technicians whose personal financial situation favors the flexibility of 1099 work, this structure often works out better than the W-2 path. For technicians who value the security of employer-provided benefits, the W-2 path makes more sense.</p>
            <p>Schedule flexibility varies by route type and market. Most technicians work four or five day weeks of eight to nine hours per day. Weekend availability earns premium routing for emergency-dispatch roles and is voluntary for standard routes. Evening availability during long summer daylight hours is typically paid at the same rate without overtime premium up to the forty-hour mark. Overtime beyond forty hours follows federal labor law for W-2 employees. For technicians with specific scheduling constraints — single parents, people managing health conditions, students working toward additional certifications — route assignments can be tailored to constraint patterns without loss of total compensation.</p>
            <p>Vacation and time off for W-2 employees starts at fifteen paid days annually and grows to twenty-five days at senior tenure levels. Paid sick leave is separate. Holidays are paid at the same rate as regular work days for technicians scheduled to work, or paid as holiday leave for technicians not scheduled. For 1099 contractors, time off is self-managed; the partnership dispatch accommodates notice-based unavailability without penalty.</p>
            <p>Bonuses run on quarterly and annual cycles tied to customer satisfaction scores, reliability metrics, and trade-specific productivity measures. Top performers in each market earn meaningful bonus compensation on top of base pay. Referral bonuses for technicians who recruit qualified new hires are paid out after the new hire completes ninety days and meets initial performance standards. For technicians who bring in strong hires, the referral bonus compounds into a meaningful additional income stream over time.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Real Technician Stories</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What the Work Actually Looks Like</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The day-to-day reality of working as a technician at Home Services Co is shaped by three things most other home service jobs do not have: a predictable daily route, a clear pricing agreement with the customer before you arrive, and a support infrastructure that handles the non-trade work so you can focus on the trade work. Each of these individually is not unusual, but the combination is.</p>
            <p>Predictable daily routes mean you know in the morning what jobs you have for the day, where they are, and approximately how long each one should take. The route is assembled by dispatch based on real technician capacity, travel time, and job complexity rather than a salesperson cramming appointments into your day to hit a quota. If you finish early, the next job moves up. If you run long, dispatch adjusts downstream. The scheduling is on your side rather than against you.</p>
            <p>Upfront pricing agreements mean the customer has already seen the estimate and agreed to it before you arrive. No sales pressure on the doorstep. No negotiating discounts to close the job. No upselling conversations engineered by the flat-rate pricing book. You show up, confirm the scope, execute, and move on. Technicians who come to us from flat-rate shops consistently say the absence of doorstep-sales pressure is the biggest quality-of-life improvement, even before the pay comparison.</p>
            <p>Support infrastructure covers scheduling, dispatch, customer communication, payment processing, warranty handling, and escalation management. All of this is handled by the central team rather than pushed onto the technician. The practical effect is that an hour of your time produces meaningfully more billable work than the same hour at a small shop where you are also answering the phone, booking your own jobs, and chasing customer payments after the work is done.</p>
            <p>The work is still physical, technical, and customer-facing — there is no way around that part — and good performance still requires the same fundamentals as any home service job: show up on time, do the work correctly, communicate clearly, clean up before leaving. What is different is the operational wrapper around those fundamentals, which makes the work more sustainable over long careers and typically produces higher annualized earnings than the same technical skill applied at a less-organized company.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What the Interview Process Actually Looks Like</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The hiring process at Home Services Co is structured to screen for both technical competence and the customer-facing communication style that makes our operating model work. The first step is a brief phone screen with a recruiter — typically 15-20 minutes — to confirm the basics: trade, licensing status, current market, availability, and general fit with the role. Candidates who pass the phone screen move to a technical interview with a lead technician or trade manager specific to your specialty. The technical interview goes into real trade-specific scenarios and problem-solving rather than generic behavioral questions.</p>
            <p>Credential verification runs in parallel with the interview process. License verification happens directly with the state licensing authority. Insurance verification happens with your carrier. Background checks, driving record pulls, and drug screens use standard consumer reporting agencies. These checks typically complete within 3-5 business days for candidates who have clean records. Candidates with complications in their background get individualized review rather than automatic rejection — many home service technicians have something in their past that is worth discussing, and we evaluate case by case rather than running checkbox disqualification.</p>
            <p>After credential clearance and technical-interview clearance, candidates meet with the market operations manager for the final conversation. This is primarily a fit check on both sides — confirming the candidate understands what the work actually involves in our operating model, confirming the market can support the routes the candidate needs to be successful, and answering any remaining questions the candidate has about compensation, benefits, scheduling, or company culture. Candidates who sign on after this meeting typically start within two weeks pending any final paperwork.</p>
            <p>The first weeks on the job are structured onboarding. You shadow a lead technician for a period before taking independent routes. You work through the technician app tutorials and our operating-standards documentation. You meet dispatch, scheduling, and customer service leadership in your market so you know who to call when specific issues come up. This structured ramp-up is expensive for us to run but it produces technicians who perform at full productivity faster than the industry average, which makes it worth the investment.</p>
            <p>For candidates who are not a fit for the role, we try to be straightforward about it rather than stringing people along. If the trade mix in your market does not match your specialty, or if the scheduling requirements do not match your availability, or if the compensation structure does not work for your situation, we say so directly. Time wasted on bad-fit hiring hurts both sides, and the honest up-front conversation serves candidates better than an optimistic maybe-we-can-make-it-work that ends in a short-lived hire.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Career Path and Growth</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">From Technician to Market Operator</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The promotion track at Home Services Co is deliberately structured so technicians can advance on merit without leaving the trade entirely. The entry role is technician — handling routes in your specific trade. The next step is lead technician, which adds responsibility for new-technician onboarding, quality oversight for your trade in your market, and input into route planning for your geography. Pay lifts accordingly.</p>
            <p>From lead technician, the path branches into two tracks. The operations track leads to market manager — running the full dispatch, scheduling, and customer service operation for a specific city or metro. Market managers coordinate across all 40 trades, manage technician hiring, and own the P&L for the market. The senior technical track leads to trade master — the subject matter expert in a specific trade across multiple markets, responsible for training, technical quality standards, and complex-job escalations. Both tracks lead to senior leadership opportunities over time.</p>
            <p>For technicians interested in business ownership, the <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise program</Link> is the path. Franchise operators run a full market as owners rather than employees — taking on the capital investment and operational responsibility in exchange for the upside of market ownership. We prefer franchise operators who have come up through the technician and market-manager track because they understand the actual operating challenges. The franchise model is not a path to quick riches; it is a path to owning a substantial service business over five to ten years.</p>
            <p>Lateral moves are also common. Technicians who develop an interest in scheduling and dispatch can move into those roles. Technicians who develop an interest in training and onboarding can move into technician recruiting and development. The company is big enough across {CITY_COUNT} cities to offer real variety without requiring a job-hop to a different company to get a change of scenery.</p>
            <p>The promotion criteria are transparent and published internally — no politics, no favoritism, no "wait your turn" culture. Meet the criteria, you move up. Don't meet them, you stay in the current role (which is also a perfectly fine outcome for technicians who love the fieldwork and do not want management responsibility). Growth is available but not mandatory, and the company does not push technicians out of fieldwork into management roles they do not want.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What It&apos;s Like Working Here</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">A Day in the Life</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">From morning dispatch to end-of-day wrap-up, every shift runs on a clear schedule built to keep you busy and customers happy. You&apos;ll handle a booked route of jobs in your trade across our <Link href="/locations" className="text-teal-600 underline">service areas</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>7:00 AM:</strong> Check your route for the day in the tech app. Typically 3-6 jobs depending on trade and job size. Load supplies and head to your first stop.</p>
            <p><strong>8:00 AM - 12:00 PM:</strong> Morning jobs. Arrive on time, introduce yourself, walk the customer through the scope, complete the work, log notes and photos in the tech app, collect payment.</p>
            <p><strong>12:00 - 1:00 PM:</strong> Lunch. Restock supplies and prep for the afternoon route.</p>
            <p><strong>1:00 - 5:00 PM:</strong> Afternoon jobs. Same flow — arrive, scope, execute, log, collect. Bigger jobs (remodels, multi-day scopes) run longer and get scheduled as dedicated blocks.</p>
            <p><strong>5:00 - 6:00 PM:</strong> Close out the day in the app, upload final photos, clean up the truck. Done.</p>
            <p>Most technicians work 8-9 hour days, 4-5 days per week. Overtime and weekend work available and common during peak season.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Technician Economics</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What Our Technicians Actually Earn</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The direct pay structure for technicians varies by trade, market, and whether the role is W-2 or 1099, but the overall economics are transparent. Experienced licensed technicians in regulated trades like <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, and <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link> typically earn a middle-to-upper range for their trade when hourly pay, tips, and quarterly performance bonuses are combined. Unregulated trades like <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link>, <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman services</Link>, and <Link href="/services/landscaping" className="text-teal-700 font-semibold hover:underline">landscaping</Link> have their own competitive pay ranges set by local market rates in each of our {CITY_COUNT} cities.</p>
            <p>Tips are a meaningful component for customer-facing trades because our upfront pricing model means customers walk into the appointment already satisfied with the price. That shifts the tipping psychology — customers who would otherwise feel bled by unexpected charges in flat-rate pricing often tip generously when the invoice matches the estimate. Across the technician population, tips run somewhere in the $50-150 per day range for busy route days, with higher numbers for trades that do a lot of customer-facing interaction.</p>
            <p>Benefits for W-2 full-time technicians include health insurance, paid time off, 401(k) with company match, and continuing education funding to keep trade certifications current. Benefits are not available on the 1099 path, but the 1099 structure typically pays a higher per-job rate to compensate. Either path, we cover the commercial vehicle insurance if you drive a company truck, and we supply the technician app, scheduling infrastructure, and customer service layer so you focus on the work.</p>
            <p>The promotion path is real and not theoretical. Our <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise structure</Link> gives experienced operations managers a path to run a full market. Individual technicians move to lead tech, then market manager, then franchise operator — each step with specific qualification criteria and a promotion-from-within preference. We do not import executives from outside the technician base for market-level roles.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Trades We Hire For</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">All 40 Home Service Trades — Where We&apos;re Hiring</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every trade we operate in is actively hiring in every state. Climate and utility systems — <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link>, <Link href="/services/insulation-services" className="text-teal-700 font-semibold hover:underline">insulation</Link>, <Link href="/services/solar-installation" className="text-teal-700 font-semibold hover:underline">solar</Link>, <Link href="/services/chimney-sweep" className="text-teal-700 font-semibold hover:underline">chimney sweep</Link>, <Link href="/services/air-duct-cleaning" className="text-teal-700 font-semibold hover:underline">air duct cleaning</Link> — require the specific state licenses and trade certifications, and we hire experienced licensed professionals in these trades at competitive market rates.</p>
            <p>Exterior and structural trades — <Link href="/services/roofing" className="text-teal-700 font-semibold hover:underline">roofing</Link>, <Link href="/services/siding-installation" className="text-teal-700 font-semibold hover:underline">siding</Link>, <Link href="/services/fence-installation" className="text-teal-700 font-semibold hover:underline">fence</Link>, <Link href="/services/deck-building" className="text-teal-700 font-semibold hover:underline">deck</Link>, <Link href="/services/concrete-services" className="text-teal-700 font-semibold hover:underline">concrete</Link>, <Link href="/services/masonry" className="text-teal-700 font-semibold hover:underline">masonry</Link>, <Link href="/services/gutter-cleaning" className="text-teal-700 font-semibold hover:underline">gutter cleaning</Link> — are busy year-round in most climates with seasonal peaks that drive strong earning potential. Licensing requirements vary by state; we verify credentials directly with the issuing authority during onboarding.</p>
            <p>Interior finish and remodeling — <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link>, <Link href="/services/flooring-installation" className="text-teal-700 font-semibold hover:underline">flooring</Link>, <Link href="/services/drywall-repair" className="text-teal-700 font-semibold hover:underline">drywall</Link>, <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link>, <Link href="/services/bathroom-remodeling" className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>, <Link href="/services/carpentry" className="text-teal-700 font-semibold hover:underline">carpentry</Link>, <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman services</Link> — get the bulk of recurring residential work. Quality craftsmanship and customer communication are equally important in these trades, and we recognize both in how we assign routes and bonuses.</p>
            <p>Recurring maintenance trades — <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">cleaning</Link>, <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>, <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>, <Link href="/services/pool-services" className="text-teal-700 font-semibold hover:underline">pool services</Link>, <Link href="/services/landscaping" className="text-teal-700 font-semibold hover:underline">landscaping</Link>, <Link href="/services/tree-services" className="text-teal-700 font-semibold hover:underline">tree services</Link> — offer particularly strong economics for technicians who build up recurring routes, because the recurring revenue base stacks up over time. Technicians on recurring routes see higher per-hour productivity once the route is established.</p>
            <p>Specialty and systems trades — <Link href="/services/appliance-repair" className="text-teal-700 font-semibold hover:underline">appliance repair</Link>, <Link href="/services/garage-door-repair" className="text-teal-700 font-semibold hover:underline">garage door</Link>, <Link href="/services/locksmith-services" className="text-teal-700 font-semibold hover:underline">locksmith</Link>, <Link href="/services/home-security-installation" className="text-teal-700 font-semibold hover:underline">security installation</Link>, <Link href="/services/water-damage-restoration" className="text-teal-700 font-semibold hover:underline">water damage restoration</Link> — have their own specialized pay bands based on the technical skill involved. For senior technicians with deep specialty expertise, these roles often include market lead responsibilities.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Apply Today</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Join the Team?</h2>
          <p className="mt-4 text-base text-white/70">Pick your state and city to apply to open technician roles — all 40 trades are hiring in every location we serve. Learn more <Link href="/about" className="text-teal-200 underline">about our company</Link>, browse <Link href="/locations" className="text-teal-200 underline">open locations</Link>, or review the full <Link href="/services" className="text-teal-200 underline">service list</Link>.</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Find your state, click your city, and apply through the form — we respond within 48 hours.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/locations"><span className="inline-block rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-dark font-cta">Find Jobs in Your City</span></Link>
            <a href={PHONE_HREF}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
