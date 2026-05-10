// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-home-services-company/_data/content";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";

const LEFT_DATES = ['Jun 14, 2023', 'Jul 22, 2023', 'Jul 25, 2023', 'Aug 01, 2023', 'Aug 05, 2023', 'Aug 28, 2023', 'Sep 02, 2023', 'Oct 21, 2023', 'Nov 09, 2023', 'Nov 11, 2023', 'Nov 26, 2023', 'Dec 07, 2023', 'Dec 09, 2023', 'Dec 16, 2023', 'Dec 27, 2023', 'Dec 27, 2023', 'Jan 15, 2024', 'Feb 11, 2024', 'Mar 12, 2024', 'Apr 14, 2024', 'Apr 22, 2024', 'Jun 28, 2024', 'Jul 12, 2024', 'Aug 14, 2024', 'Aug 21, 2024'];
const RIGHT_DATES = ['Aug 25, 2024', 'Aug 31, 2024', 'Sep 09, 2024', 'Sep 19, 2024', 'Sep 19, 2024', 'Oct 14, 2024', 'Nov 23, 2024', 'Dec 15, 2024', 'Dec 21, 2024', 'Dec 21, 2024', 'Jan 13, 2025', 'Jan 21, 2025', 'Apr 20, 2025', 'Apr 27, 2025', 'May 05, 2025', 'Jun 05, 2025', 'Jun 10, 2025', 'Jul 15, 2025', 'Jul 18, 2025', 'Oct 07, 2025', 'Oct 12, 2025', 'Oct 13, 2025', 'Dec 06, 2025', 'Dec 27, 2025', 'Mar 31, 2026'];

export const metadata: Metadata = {
  title: "Home Services FAQ — Pricing, Availability, Services & More",
  description: "Frequently asked questions about Home Services Co. Upfront pricing starting at $99/hour, 40 home services, licensed and insured, same-day availability in 990 cities.",
  alternates: { canonical: "/faq" },
};

const LEFT_FAQS = [
  { q: "How much does a home service call cost?", a: <>Our rates start at $99/hour across all 40 home services. Parts and materials are itemized up front. For larger projects, we quote complete written scopes rather than strictly hourly. See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">full pricing breakdown</Link>.</> },
  { q: "What services do you offer?", a: <>40 home services — HVAC, plumbing, electrical, painting, flooring, landscaping, cleaning, handyman, remodeling, and more. See our <Link href="/services" className="text-teal-700 font-semibold hover:underline">complete service list</Link>.</> },
  { q: "Are you licensed and insured?", a: <>Yes — every technician holds the licenses their trade requires, and we carry general liability, commercial auto, and workers&apos; compensation insurance in every state. Certificates of insurance available within 24 hours for property managers and commercial clients.</> },
  { q: "Do you offer same-day service?", a: <>Yes. Call before noon and we can typically have a technician at your home the same day in most markets. For emergencies — active leaks, no heat, no AC, lockouts — we guarantee same-day arrival.</> },
  { q: "What does upfront pricing mean?", a: <>Before any technician touches a tool at your home, you see a written estimate. Labor at $99/hour, parts and materials itemized. You approve it, and work begins. The invoice at the end matches the estimate at the start.</> },
  { q: "What happens if the scope changes during the job?", a: <>We stop, explain the change, and get your approval before continuing. No &ldquo;while we were here&rdquo; add-ons billed after the fact.</> },
  { q: "Do you handle HVAC repairs?", a: <>Yes. Our <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC technicians</Link> handle diagnostics, repairs, tune-ups, and replacements across all major system types. Licensed and EPA-certified for refrigerant work.</> },
  { q: "Do you do plumbing?", a: <>Yes. Licensed plumbers for leaks, drains, fixtures, water heaters, and repipes. See our <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing services</Link>.</> },
  { q: "Do you do electrical work?", a: <>Yes. Licensed electricians for outlets, fixtures, panels, EV chargers, and full wiring. Permits pulled when required. See our <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical services</Link>.</> },
  { q: "Do you do painting?", a: <>Yes — interior and exterior painting. Our crews handle prep work thoroughly, which determines whether the paint job lasts 10 years or 18 months. See our <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting services</Link>.</> },
  { q: "Do you do house cleaning?", a: <>Yes. Weekly, biweekly, and monthly recurring cleans, plus one-time deep cleans and move-in/out cleans. See our <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning services</Link>.</> },
  { q: "Do you do handyman work?", a: <>Yes. Small repairs, installs, drywall patches, shelving, fixture swaps, and general home fixes. See our <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman services</Link>.</> },
  { q: "Do you do kitchen and bathroom remodeling?", a: <>Yes. Full and partial kitchen and bath remodels with dedicated project management. Written scopes and milestone schedules. See <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link> and <Link href="/services/bathroom-remodeling" className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>.</> },
  { q: "Do you do roofing work?", a: <>Yes. Repairs, inspections (including insurance documentation), and full replacements. See <Link href="/services/roofing" className="text-teal-700 font-semibold hover:underline">roofing services</Link>.</> },
  { q: "Do you handle appliance repair?", a: <>Yes. Refrigerators, washers, dryers, dishwashers, ovens, and ranges. We give honest repair-versus-replace advice with no commission on either outcome. See <Link href="/services/appliance-repair" className="text-teal-700 font-semibold hover:underline">appliance repair</Link>.</> },
  { q: "Do you do garage door repair?", a: <>Yes. Springs, openers, rollers, panels, and sensors. Same-day emergency service for doors that won&apos;t open or close. See <Link href="/services/garage-door-repair" className="text-teal-700 font-semibold hover:underline">garage door repair</Link>.</> },
  { q: "What areas do you serve?", a: <>990 cities across all 50 states. Find your city on our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations page</Link>.</> },
  { q: "Do you have technicians in my city?", a: <>Probably — we operate in 990 cities. Check our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations page</Link> or call us to confirm coverage.</> },
  { q: "Do you charge extra for stairs?", a: <>No. The starting rate of $99/hour is the same regardless of stairs, access challenges, or property type.</> },
  { q: "Is there a minimum charge?", a: <>Most jobs have a one-hour minimum. After the first hour, billing is in smaller increments. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing details</Link>.</> },
  { q: "Do you charge more on weekends or holidays?", a: <>No. Same starting rate of $99/hour every day of the year — weekdays, weekends, and holidays.</> },
  { q: "How do I book a service?", a: <><Link href="/book" className="text-teal-700 font-semibold hover:underline">Book online</Link>, <a href={SMS_HREF} className="text-teal-700 font-semibold hover:underline">text us</a>, or <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">call {PHONE}</a>. Takes about 2 minutes.</> },
  { q: "How far in advance do I need to book?", a: <>Same-day is available in most markets. We also take bookings up to 4 weeks out. 24–48 hours ahead guarantees your preferred time slot.</> },
  { q: "Do I need to be home?", a: <>For the initial walkthrough and estimate approval — yes. After work begins, you&apos;re welcome to be present, work nearby, or go about your day. We do a walkthrough at the end before we leave.</> },
  { q: "Do you offer 2-hour arrival windows?", a: <>Yes. For scheduled appointments, we offer 2-hour arrival windows so you&apos;re not waiting around all day.</> },
];

const RIGHT_FAQS = [
  { q: "How is Home Services Co different from independent contractors?", a: <>Consolidation. Instead of juggling a dozen specialists, you work with one company across 40 trades. Same pricing model, same standards, same accountability — whether you need a plumber, a painter, or a cleaner.</> },
  { q: "What if I need a service across multiple trades?", a: <>That&apos;s exactly what we&apos;re built for. One account can cover HVAC, plumbing, electrical, cleaning, painting, handyman, landscaping — whatever combination you need. One phone number, one invoice, one standard of service.</> },
  { q: "What if I&apos;m not satisfied with the work?", a: <>One phone call fixes it. We back every job with a satisfaction guarantee. If something isn&apos;t right, we make it right — no arguing, no follow-up calls, no runaround.</> },
  { q: "Do you require contracts?", a: <>No. Every one-time job is standalone. No subscriptions, no recurring charges unless you specifically set up a recurring service account (like weekly cleaning or seasonal lawn care).</> },
  { q: "What payment methods do you accept?", a: <>Credit cards, debit cards, checks, and digital transfers (Venmo, Zelle, CashApp). Payment on completion with a detailed invoice emailed for your records.</> },
  { q: "Do you offer commercial services?", a: <>Yes. Offices, retail, property managers, warehouses, HOAs, and more. See all <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link>.</> },
  { q: "Do you work with property managers?", a: <>Yes. Dedicated accounts, priority scheduling, consistent technicians across units, and consolidated monthly invoicing. See our <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property management services</Link>.</> },
  { q: "Can you clear a property between tenants?", a: <>Yes — combined cleaning, handyman punch list, painting, and any other tenant turnover work. One visit or multi-visit coordination as needed.</> },
  { q: "Do you do pre-listing prep for realtors?", a: <>Yes. Cleaning, painting, handyman repairs, landscaping, and pressure washing — all coordinated through one account. See our <Link href="/who-we-serve/realtors" className="text-teal-700 font-semibold hover:underline">realtor services</Link>.</> },
  { q: "Do you do flooring installation?", a: <>Yes. Hardwood, LVP, laminate, tile, and carpet. Tear-out, subfloor prep, and finish installation. See <Link href="/services/flooring-installation" className="text-teal-700 font-semibold hover:underline">flooring installation</Link>.</> },
  { q: "Do you install home security?", a: <>Yes. Cameras, alarms, smart locks, and doorbell cameras. See <Link href="/services/home-security-installation" className="text-teal-700 font-semibold hover:underline">home security installation</Link>.</> },
  { q: "Do you do landscaping and lawn care?", a: <>Yes. Design, installation, seasonal maintenance, and recurring lawn care. See <Link href="/services/landscaping" className="text-teal-700 font-semibold hover:underline">landscaping</Link> and <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>.</> },
  { q: "Do you handle tree services?", a: <>Yes — trimming, removal, stump grinding. All tree work is done by insured crews. See <Link href="/services/tree-services" className="text-teal-700 font-semibold hover:underline">tree services</Link>.</> },
  { q: "Do you do pool service?", a: <>Yes. Weekly cleaning, equipment repair, and seasonal open/close. See <Link href="/services/pool-services" className="text-teal-700 font-semibold hover:underline">pool services</Link>.</> },
  { q: "Do you do snow removal?", a: <>Yes in applicable markets. Residential driveways, commercial lots, and seasonal contracts. See <Link href="/services/snow-removal" className="text-teal-700 font-semibold hover:underline">snow removal</Link>.</> },
  { q: "Do you do pest control?", a: <>Yes. General pest, termites, bed bugs, rodents, and wildlife. See <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>.</> },
  { q: "Do you do chimney sweep service?", a: <>Yes. Cleaning, inspections, and cap/crown repair with certified sweeps. See <Link href="/services/chimney-sweep" className="text-teal-700 font-semibold hover:underline">chimney sweep</Link>.</> },
  { q: "Do you provide certificates of insurance?", a: <>Yes. COIs available within 24 hours for commercial customers, property managers, and anyone else who needs one for vendor files. Standard practice, no extra charge.</> },
  { q: "Do you offer recurring service accounts?", a: <>Yes. Weekly cleaning, seasonal HVAC maintenance, recurring lawn care, pool service, and more. Recurring accounts get priority scheduling and consistent technicians.</> },
  { q: "What if I need an emergency service after hours?", a: <>Our emergency same-day service covers active leaks, no heat, no AC, lockouts, and other urgent situations. Available evenings, weekends, and holidays at the standard rate plus a clearly disclosed dispatch fee.</> },
  { q: "Are you hiring?", a: <>Yes — in all 50 states. Licensed technicians across every trade. Competitive pay, full benefits for full-time employees, and a clear promotion path. See <Link href="/careers" className="text-teal-700 font-semibold hover:underline">open positions</Link>.</> },
  { q: "Do you offer franchise opportunities?", a: <>Yes. Territory-based franchise opportunities for entrepreneurs who want to bring Home Services Co to their community. See <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise details</Link>.</> },
  { q: "How do I contact you for non-booking questions?", a: <>Use our <Link href="/contact" className="text-teal-700 font-semibold hover:underline">contact form</Link> for general inquiries, partnerships, or media. For booking, use the <Link href="/book" className="text-teal-700 font-semibold hover:underline">booking page</Link>.</> },
  { q: "Why did you consolidate so many services under one company?", a: <>Because vendor sprawl is the default in home services, and it costs customers real time and money. Consolidation enables consistent pricing, consistent standards, and real accountability — see our <Link href="/about" className="text-teal-700 font-semibold hover:underline">about page</Link>.</> },
  { q: "How many services do you offer?", a: <>40 home services. Browse all <Link href="/services" className="text-teal-700 font-semibold hover:underline">40 services</Link>.</> },
];

export default function FAQPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">50 Home Services Questions Answered</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services FAQ — <span className="gradient-text">Everything You Need to Know</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Pricing, services, availability, and how we compare. 50 answers — no dropdowns, no hiding.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Pricing, Availability, and How It Works</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">50 Frequently Asked Questions</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Everything from <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">how pricing works</Link> to <Link href="/services" className="text-teal-700 font-semibold hover:underline">what services we offer</Link> to <Link href="/locations" className="text-teal-700 font-semibold hover:underline">where we operate</Link>. Still have questions? <Link href="/contact" className="text-teal-700 font-semibold hover:underline">Contact us</Link> or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book a service</Link>.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
            <div className="space-y-6">
              {LEFT_FAQS.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                  <p className="mt-1 text-xs text-slate-400">Last updated: {LEFT_DATES[i]}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {RIGHT_FAQS.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                  <p className="mt-1 text-xs text-slate-400">Last updated: {RIGHT_DATES[i]}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Why Home Services Co Works This Way</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Understanding Our Model</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Learn how our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">upfront pricing</Link> and consolidated service model create a better experience for customers across all <Link href="/services" className="text-teal-700 font-semibold hover:underline">40 services</Link>. See our <Link href="/about" className="text-teal-700 font-semibold hover:underline">about page</Link> or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book a service</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The home services industry defaults to vendor sprawl. Most homeowners have a contact list full of specialists — an HVAC guy, a plumber, an electrician, a painter, a handyman, a cleaner, and a dozen others. Every time you need a service, you call around, compare vague quotes, and hope the vendor shows up.</p>
            <p>We built Home Services Co to collapse that contact list. 40 home services under one phone number, starting at $99/hour with upfront pricing on every job. Licensed and insured technicians across every trade. Same-day availability in most markets.</p>
            <p>Consolidation matters because it enables consistency. When every trade operates under the same company, the standards become enforceable — the pricing model, the insurance coverage, the scheduling reliability, the accountability when something goes wrong. A good plumber can&apos;t fix a bad handyman, but a good company can enforce standards across every trade at once.</p>
            <p>That&apos;s the entire pitch. One phone number for every home service need. Starting at $99/hour. Upfront pricing. Licensed and insured across 40 services and 990 cities.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Ready to Book a Home Service?</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Still Have Questions? We Have Answers.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">
            Text, call, or book online. Our team is standing by 7 days a week.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
