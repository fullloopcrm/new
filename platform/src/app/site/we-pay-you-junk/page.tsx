// @ts-nocheck
import Link from "next/link";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { PricingCalculator } from "@/app/site/we-pay-you-junk/_components/PricingCalculator";
import {
  PHONE,
  PHONE_HREF,
  SMS_HREF,
  HOURS,
  RATING,
  REVIEW_COUNT,
  CITY_COUNT,
  STATE_COUNT,
  SERVICES,
  PRICING,
  TESTIMONIALS,
  FAQ,
  TOP_CITIES,
  STATES,
} from "@/app/site/we-pay-you-junk/_data/content";

export default function HomePage() {


  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Nationwide Junk Removal Service
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">Starting at $100/hr</span>
            <br />
            Junk Removal That Pays You Back
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            We Come to You — We Pay You for Your Stuff. Our crew loads, hauls, and disposes of your junk starting at $100/hr — dump fees included (an industry first). Items with resale value? We credit you 50% (when applicable) toward your bill. If credits exceed the total, we cut you a check.
          </p>

          {/* Trust stat cards */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{HOURS}</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">7 Days a Week</p>
              <p className="mt-1 text-xs text-white/50">Including weekends &amp; holidays</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{RATING} Stars</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">{REVIEW_COUNT} Verified Reviews</p>
              <p className="mt-1 text-xs text-white/50">Real customers, real results</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">From $100</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">Dump Fees Included</p>
              <p className="mt-1 text-xs text-white/50">An industry first — no add-ons</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{CITY_COUNT}+</p>
              <p className="mt-1 text-sm font-semibold text-teal-200 font-cta">Cities Nationwide</p>
              <p className="mt-1 text-xs text-white/50">Local crews in every state</p>
            </div>
          </div>

          {/* CTA buttons — Text (most popular), Call, Book */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {PHONE} — Most Popular
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {PHONE}
              </span>
            </a>
            <Link href="/book-junk-removal-service-today">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Book Now &amp; Save $10
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PRICING CALCULATOR ─── */}
      <section className="bg-section-white py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <PricingCalculator />
        </div>
      </section>

      {/* ─── 1. WHAT IS WE PAY YOU JUNK REMOVAL ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Affordable Junk Removal That Pays Customers
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What Is We Pay You Junk Removal?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We created a junk removal company that actually makes sense for the customer. Learn how our{" "}
            <Link href="/pricing" className="text-teal-600 underline">flat hourly pricing</Link>,{" "}
            <Link href="/services/full-service-junk-removal" className="text-teal-600 underline">full-service hauling</Link>, and{" "}
            <Link href="/about" className="text-teal-600 underline">50% Resale Credit (when applicable) model</Link> save you money — or put money in your pocket. Serving{" "}
            <Link href="/locations" className="text-teal-600 underline">{CITY_COUNT} cities</Link> in all {STATE_COUNT} states.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Here&apos;s what the junk removal industry doesn&apos;t want you to know: <strong>every junk company in America has been charging you for the service AND keeping 35%+ of your items to resell for their own profit.</strong> They pull up, charge you $400-$800, haul your stuff away, then cherry-pick the working appliances, quality furniture, electronics, and tools — and sell it all for hundreds or thousands of dollars. You paid them to take it. They made money twice. This isn&apos;t an accident — it&apos;s the business model, and it&apos;s been the industry standard for decades.
            </p>
            <p>
              We Pay You Junk Removal works differently. We charge a flat $100 per hour with a one-hour minimum. Dump fees are baked into the price — no surprise charges at the end. Our crew shows up, loads your items onto the truck, and hauls everything to the appropriate facility. Simple so far. Here is where it gets interesting.
            </p>
            <p>
              As we load your stuff, our crew identifies items with resale value — furniture in good shape, working appliances, electronics, tools, fitness equipment, musical instruments, designer goods, anything with a real secondary market. We appraise each item at fair market value right in front of you and credit 50% of that amount toward your bill. You see every appraisal, approve every credit, and watch your bill shrink in real time.
            </p>
            <p>
              If the total credits exceed your bill, we do not keep the difference. We write you a check on the spot. This is not a gimmick and it is not rare — it happens regularly on estate cleanouts, office cleanouts, and any job where there is a high concentration of items with real market value. Our customers have walked away with checks for $50, $140, $300, and more after a junk removal.
            </p>
            <p>
              We operate in {CITY_COUNT} cities across all {STATE_COUNT} states with local crews who know their markets. Same-day service is available for calls placed before noon. We work seven days a week, {HOURS}, including holidays. No overtime charges, no weekend surcharges. The rate is the same every single day.
            </p>
            <p>
              We offer <Link href="/services" className="text-teal-600 underline">34 specialized junk removal services</Link> covering every situation — <Link href="/services/garage-cleanouts" className="text-teal-600 underline">garage cleanouts</Link>, <Link href="/services/basement-cleanouts" className="text-teal-600 underline">basement clearing</Link>, <Link href="/services/estate-cleanouts" className="text-teal-600 underline">estate cleanouts</Link>, <Link href="/services/furniture-removal" className="text-teal-600 underline">furniture removal</Link>, <Link href="/services/appliance-removal" className="text-teal-600 underline">appliance hauling</Link>, <Link href="/services/hot-tub-removal" className="text-teal-600 underline">hot tub demolition</Link>, <Link href="/services/shed-removal" className="text-teal-600 underline">shed removal</Link>, <Link href="/services/construction-debris-removal" className="text-teal-600 underline">construction debris</Link>, <Link href="/services/office-cleanouts" className="text-teal-600 underline">office cleanouts</Link>, and more. Every service follows the same model: hourly rate, dump fees included (an industry first), 50% Resale Credit (when applicable). Every crew member is background-checked, trained, and insured. See our <Link href="/pricing" className="text-teal-600 underline">pricing</Link>, check our <Link href="/locations" className="text-teal-600 underline">locations</Link>, or <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">book now</Link>.
            </p>
            <p>
              Why did we build this company? Because we saw what the junk removal industry was doing to customers and we knew there was a better way. We spent years testing the model — first in one city, then five, then twenty. The results were undeniable. Customers saved 25-40% on every job. Satisfaction scores went through the roof. Referral rates hit 40%+. And the business worked — the 50% we retain covers resale costs while the hourly rate covers operations. The industry said it couldn&apos;t be done. We did it anyway. Now we&apos;re in {CITY_COUNT} cities and growing. Read the full story on our <Link href="/about" className="text-teal-600 underline">about page</Link> or explore our <Link href="/blog" className="text-teal-600 underline">junk removal tips blog</Link>.
            </p>
          </div>
        </div>
      </section>


      {/* ─── 7. MATH EXAMPLES ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal Cost Calculator Examples
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Real Jobs, Real Math, Real Savings
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            See how our <Link href="/pricing" className="text-teal-600 underline">starting at $100/hr pricing</Link> combined with{" "}
            <Link href="/about" className="text-teal-600 underline">50% Resale Credit (when applicable)s</Link> saves customers hundreds —
            or puts money back in their pocket. <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">Book your job today</Link>.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                title: "Garage Cleanout",
                location: "Austin, TX",
                crew: "1 Person",
                hours: "2 hrs",
                cost: "$200",
                items: [
                  { name: "Workbench", resale: "$120", credit: "$60" },
                  { name: "Power tools", resale: "$180", credit: "$90" },
                  { name: "Bikes", resale: "$60", credit: "$30" },
                ],
                totalCredits: "$180",
                result: "You pay: $20",
                payout: false,
                compare: "Other companies quoted $450 for the same job",
              },
              {
                title: "Estate Cleanout",
                location: "Brooklyn, NY",
                crew: "2 Person",
                hours: "4 hrs",
                cost: "$1,000",
                items: [
                  { name: "Furniture sets", resale: "$1,800", credit: "$900" },
                  { name: "Appliances", resale: "$600", credit: "$300" },
                  { name: "Electronics & tools", resale: "$1,100", credit: "$550" },
                ],
                totalCredits: "$1,750",
                result: "We pay you: $750",
                payout: true,
                compare: "Other companies quoted $3,500+ and kept all resale value",
              },
              {
                title: "Office Cleanout",
                location: "Chicago, IL",
                crew: "2 Person",
                hours: "6 hrs",
                cost: "$1,500",
                items: [
                  { name: "30 Herman Miller chairs", resale: "$9,000", credit: "$4,500" },
                  { name: "15 standing desks", resale: "$3,000", credit: "$1,500" },
                  { name: "30 monitors & IT", resale: "$2,400", credit: "$1,200" },
                ],
                totalCredits: "$7,200",
                result: "We pay you: $5,700",
                payout: true,
                compare: "Other companies quoted $4,000+ and would have resold everything",
              },
              {
                title: "Furniture Removal",
                location: "Denver, CO",
                crew: "1 Person",
                hours: "1 hr",
                cost: "$100",
                items: [
                  { name: "Leather sectional", resale: "$800", credit: "$400" },
                  { name: "Dining table", resale: "$300", credit: "$150" },
                ],
                totalCredits: "$550",
                result: "We pay you: $450",
                payout: true,
                compare: "Customer was going to pay $200 to have it hauled by a competitor",
              },
              {
                title: "Construction Debris",
                location: "Phoenix, AZ",
                crew: "2 Person",
                hours: "3 hrs",
                cost: "$750",
                items: [
                  { name: "Scrap copper pipe", resale: "$240", credit: "$120" },
                  { name: "Solid wood cabinets", resale: "$160", credit: "$80" },
                ],
                totalCredits: "$200",
                result: "You pay: $550",
                payout: false,
                compare: "Dumpster rental would have cost $600+ with weight overage fees",
              },
              {
                title: "Emergency Same-Day",
                location: "Miami, FL",
                crew: "2 Person Emergency",
                hours: "2 hrs",
                cost: "$800",
                items: [
                  { name: "Appliances", resale: "$400", credit: "$200" },
                  { name: "Bedroom furniture", resale: "$300", credit: "$150" },
                ],
                totalCredits: "$350",
                result: "You pay: $450",
                payout: false,
                compare: "Move-out deadline next morning — crew arrived within 90 minutes",
              },
            ].map((ex) => (
              <div key={ex.title} className={`rounded-xl border ${ex.payout ? "border-accent" : "border-slate-200"} bg-white p-6`}>
                <h3 className="text-lg font-bold text-slate-900 font-heading">{ex.title}</h3>
                <p className="text-xs text-slate-500">{ex.location}</p>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>{ex.crew} · {ex.hours}</span>
                    <span className="font-bold text-slate-900">{ex.cost}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    {ex.items.map((item) => (
                      <div key={item.name} className="flex justify-between text-slate-600">
                        <span>{item.name} · resale {item.resale}</span>
                        <span className="font-semibold text-teal-700">−{item.credit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-teal-700">
                    <span>Total credits</span>
                    <span>{ex.totalCredits}</span>
                  </div>
                  <div className={`border-t-2 ${ex.payout ? "border-accent" : "border-slate-900"} pt-2 flex justify-between text-lg font-bold ${ex.payout ? "text-accent" : "text-slate-900"}`}>
                    <span>{ex.result.split(":")[0]}</span>
                    <span>{ex.result.split(": ")[1]}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">{ex.compare}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-teal-700 font-semibold text-base hover:underline font-cta">
              See Full Pricing for All 34 Services →
            </Link>
          </div>
        </div>
      </section>


      {/* ─── 2. WHY US — 6 CARDS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Reasons to Choose We Pay You Junk Removal
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Why Customers Choose Us Over Every Other Junk Company
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            From <Link href="/pricing" className="text-teal-600 underline">transparent pricing</Link> to{" "}
            <Link href="/services/estate-cleanouts" className="text-teal-600 underline">estate-level appraisals</Link>,{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">same-day bookings</Link>, and{" "}
            <Link href="/locations" className="text-teal-600 underline">nationwide coverage</Link> — we built this company to fix everything wrong with junk removal.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Simple Pricing", desc: "rates starting at $100/hr — dump fees included (an industry first). No volume charges, no hidden fees, no surprises. You know exactly what you pay before we start." },
              { title: "50% Resale Credit (when applicable)", desc: "Every item with resale value earns you a 50% credit toward your bill. Furniture, appliances, electronics, tools — it all counts." },
              { title: "You Can Get Paid", desc: "If your credits exceed the bill, we write you a check. Estate cleanouts and office jobs regularly result in a payout to the customer." },
              { title: "Same-Day Service", desc: "Call before noon and we can usually have a crew at your door within 2-4 hours. Available 7 days a week, including holidays." },
              { title: "Eco-Friendly Disposal", desc: "We divert 60%+ of items from landfills through resale, donation, and recycling. Your junk gets a second life whenever possible." },
              { title: "Licensed & Insured", desc: "Fully licensed, bonded, and insured in every market we serve. Our crews are background-checked and professionally trained." },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. 12 SERVICE CARDS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal Services Near You
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            {SERVICES.length} Specialized Junk Removal Services
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            From <Link href="/services/garage-cleanouts" className="text-teal-600 underline">garage cleanouts</Link> and{" "}
            <Link href="/services/furniture-removal" className="text-teal-600 underline">furniture removal</Link> to{" "}
            <Link href="/services/construction-debris-removal" className="text-teal-600 underline">construction debris</Link> and{" "}
            <Link href="/commercial" className="text-teal-600 underline">commercial cleanouts</Link> — we handle it all at{" "}
            <Link href="/pricing" className="text-teal-600 underline">starting at $100/hr</Link>.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(0, 12).map((service, i) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group">
                <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                  <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 font-cta">
                    #{i + 1} &middot; {service.category}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-700 font-heading">
                    {service.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{service.subtitle}</p>
                  <p className="mt-2 text-sm text-slate-600">{service.description}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-base font-semibold text-teal-600 hover:text-teal-800 font-cta">
              View All {SERVICES.length} Services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. HOW IT WORKS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            How Junk Removal With Resale Credit Works
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            How It Works — 4 Simple Steps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">Book online</Link> or{" "}
            <a href={PHONE_HREF} className="text-teal-600 underline">call us</a>. We show up, load your stuff, appraise the valuables, and you pay less — or{" "}
            <Link href="/faq" className="text-teal-600 underline">get paid</Link>. That is the entire process.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Call or Book Online", desc: "Tell us what you need hauled. We confirm pricing, estimate the time, and schedule your crew." },
              { step: "2", title: "Crew Shows Up", desc: "Our local crew arrives at your property on time. Quick walkthrough to confirm what goes and what stays." },
              { step: "3", title: "Load & Appraise", desc: "We load everything onto the truck. Items with resale value get appraised on the spot — you approve every credit." },
              { step: "4", title: "Pay Less or Get Paid", desc: "Credits come off your bill. If credits exceed the total, we hand you a check. Payment processed on the spot." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-white font-cta">
                  {s.step}
                </span>
                <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. WHO BENEFITS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal for Homeowners Renters and Businesses
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Who Benefits From Our Junk Removal Service
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Whether you are a <Link href="/services/full-service-junk-removal" className="text-teal-600 underline">homeowner cleaning out a garage</Link>,
            a <Link href="/services/property-management-cleanouts" className="text-teal-600 underline">property manager turning over units</Link>,
            or a <Link href="/commercial" className="text-teal-600 underline">business clearing an office</Link> — our model saves you money every time.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Homeowners", desc: "Garages, basements, attics, whole-house cleanouts. Your old furniture, tools, appliances, and electronics have real resale value — we make sure you get your cut. The average homeowner saves 25-40% compared to flat-rate haulers." },
              { title: "Renters & Movers", desc: "Moving out and don't want to take it all? We haul everything you're leaving behind and credit you for furniture, appliances, and electronics. Save on moving costs by reducing your load and getting paid for what stays." },
              { title: "Property Managers", desc: "Fast tenant turnovers with credits on items left behind. Recurring service with consistent crew assignments and priority scheduling. Items previous tenants abandoned — furniture, appliances, electronics — reduce your per-unit cleanout costs by 30-50%." },
              { title: "Realtors & Sellers", desc: "Get properties market-ready fast. Estate and foreclosure cleanouts are our specialty — resale credits keep your staging costs low. Decluttered homes sell 73% faster and for 6-10% more. Pre-listing cleanouts pay for themselves." },
              { title: "Businesses & Offices", desc: "Office closures, retail remodels, warehouse clearing, hotel FF&E replacement. Herman Miller chairs, standing desks, commercial monitors — commercial equipment has the strongest resale markets. Big cleanouts regularly result in payouts." },
              { title: "Estate & Senior Managers", desc: "A lifetime of belongings means a property full of hidden value — furniture sets, vintage items, tools, antiques, collectibles. Our appraisals regularly cover the entire estate cleanout bill. Families receive checks instead of invoices." },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>
              No matter which category you fall into, the model works the same: we show up, we load, we appraise, we credit. Homeowners doing a <Link href="/services/garage-cleanouts" className="text-teal-600 underline">garage cleanout</Link> save just as much per-item as a corporation clearing a 500-seat office. The rate is transparent, the credits are real, and the math always favors you. We also serve contractors needing <Link href="/services/construction-debris-removal" className="text-teal-600 underline">debris hauling</Link>, <Link href="/services/church-nonprofit-cleanouts" className="text-teal-600 underline">churches and nonprofits</Link> clearing decades of accumulated items, and <Link href="/services/school-university-cleanouts" className="text-teal-600 underline">schools</Link> doing end-of-year cleanouts. If you have stuff that needs to go, we handle it — and we pay you for what&apos;s worth something.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 6. US VS OTHER COMPANIES ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Cheapest Junk Removal Company Comparison
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            We Pay You Junk vs. Every Other Junk Removal Company
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Compare our <Link href="/pricing" className="text-teal-600 underline">rates starting at $100/hr</Link> to volume-based pricing from other companies.
            See real math on <Link href="/services/estate-cleanouts" className="text-teal-600 underline">estate cleanouts</Link>,{" "}
            <Link href="/services/garage-cleanouts" className="text-teal-600 underline">garage cleanouts</Link>, and{" "}
            <Link href="/services/office-cleanouts" className="text-teal-600 underline">office cleanouts</Link> that proves the difference.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The junk removal industry has a pricing problem. Most companies charge by the volume of space your stuff takes up on their truck. A quarter-truck load might be $250, a half truck $400, a full truck $600 or more. The problem is not just the price — it is the incentive structure. Volume pricing incentivizes the company to cram as much as possible onto one truck, estimate high, and move fast. It also means they profit twice: once from the fee you pay, and again from reselling your valuable items.
            </p>
            <p>
              Our model eliminates both problems. Hourly pricing means we only charge for the time we actually work. If the job takes 90 minutes, you pay for 90 minutes starting at $100/hr — that is $150. A volume-based company would charge you $350-$500 for the same load. And because our business model depends on resale revenue, we have a direct financial incentive to identify and properly handle valuable items. We split that value with you 50/50 instead of keeping it all.
            </p>
            <p>
              Consider a real scenario. You have a garage full of stuff — old workbench, some power tools, a lawn mower, three bikes, a dozen boxes of random items, and general clutter. A volume-based company quotes you $450 for a full truck. Our crew clears it in 2 hours ($200), identifies $360 in resale value from the tools, workbench, and bikes, credits you $180, and your final bill is $20. That is not a hypothetical — it is a real customer story from Austin, Texas.
            </p>
            <p>
              The gap gets wider on larger jobs. <Link href="/services/estate-cleanouts" className="text-teal-600 underline">Estate cleanouts</Link> with other companies run $2,000-$5,000+ depending on the size of the home. With us, the same estate might take 8-12 hours ($800-$1,200) with $1,500-$3,000 in resale credits from furniture, appliances, electronics, and collectibles. Customers frequently walk away with a check instead of a bill. No other junk company in the country offers this.
            </p>
            <p>
              <strong>Why don&apos;t other companies do this?</strong> Because sharing resale value with customers cuts into margins that they have kept for decades. 1-800-GOT-JUNK, Junk King, College Hunks Hauling Junk, LoadUp — they all use the same volume-based model with zero resale sharing. They charge you $400 to take a working refrigerator worth $500, then sell it and pocket every dollar. Their model depends on keeping you in the dark about what your stuff is actually worth. Our model depends on showing you — right there in your driveway, with comparable sales data, transparent appraisals, and your approval on every credit. The truth is that sharing resale value with customers builds trust, generates referrals, and creates a better business. They just haven&apos;t figured that out yet — or they have, and they would rather keep the money. Either way, you have a choice now. See our full <Link href="/pricing" className="text-teal-600 underline">pricing comparison</Link>.
            </p>
            <p>
              <strong>The DIY trap:</strong> Some people think doing it themselves is cheaper. Rent a truck ($50-$150), drive to the dump ($10-$30 in gas), pay dump fees ($30-$100+ per load), and spend an entire Saturday loading, driving, unloading, and repeating. Total real cost: $200-$500 including your time — plus zero resale credit because everything goes in the landfill. Your working <Link href="/services/appliance-removal" className="text-teal-600 underline">appliances</Link>, quality <Link href="/services/furniture-removal" className="text-teal-600 underline">furniture</Link>, and valuable <Link href="/services/exercise-equipment-removal" className="text-teal-600 underline">exercise equipment</Link> get buried instead of resold. With us, those same items generate credits that often pay for the entire removal. Read our <Link href="/blog/diy-vs-professional-junk-removal" className="text-teal-600 underline">DIY vs professional comparison</Link> for the full breakdown.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 8. TOP CITIES ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal Near Me in Major Cities
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Top {TOP_CITIES.length} Cities We Serve
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Local crews in every major metro. <Link href="/locations" className="text-teal-600 underline">Browse all {CITY_COUNT} cities</Link> or{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">book now</Link> for{" "}
            <Link href="/services/full-service-junk-removal" className="text-teal-600 underline">same-day junk removal</Link> in your area.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {[
              { name: "New York", href: "/locations/new-york/new-york-city" },
              { name: "Los Angeles", href: "/locations/california/los-angeles" },
              { name: "Chicago", href: "/locations/illinois/chicago" },
              { name: "Houston", href: "/locations/texas/houston" },
              { name: "Phoenix", href: "/locations/arizona/phoenix" },
              { name: "Philadelphia", href: "/locations/pennsylvania/philadelphia" },
              { name: "San Antonio", href: "/locations/texas/san-antonio" },
              { name: "San Diego", href: "/locations/california/san-diego" },
              { name: "Dallas", href: "/locations/texas/dallas" },
              { name: "Miami", href: "/locations/florida/miami" },
              { name: "Atlanta", href: "/locations/georgia/atlanta" },
              { name: "Denver", href: "/locations/colorado/denver" },
              { name: "Seattle", href: "/locations/washington/seattle" },
              { name: "Boston", href: "/locations/massachusetts/boston" },
              { name: "Nashville", href: "/locations/tennessee/nashville" },
              { name: "Portland", href: "/locations/oregon/portland" },
              { name: "Las Vegas", href: "/locations/nevada/las-vegas" },
              { name: "Austin", href: "/locations/texas/austin" },
              { name: "Charlotte", href: "/locations/north-carolina/charlotte" },
              { name: "Tampa", href: "/locations/florida/tampa" },
            ].map((city) => (
              <Link
                key={city.name}
                href={city.href}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700 hover:shadow-sm"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 9. PRICING ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal Pricing — Three Options, One Simple Model
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Choose Your Crew — Starting at $100/hr
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Every option includes dump fees and 50% Resale Credit (when applicable). See our full{" "}
            <Link href="/pricing" className="text-teal-600 underline">pricing breakdown</Link>,{" "}
            <Link href="/faq" className="text-teal-600 underline">FAQ</Link>, and{" "}
            <Link href="/services" className="text-teal-600 underline">all 34 services</Link>.{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">Book today</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => (
              <div key={key} className={`rounded-xl border bg-white p-6 text-center transition-all h-full ${"popular" in tier && tier.popular ? "border-accent shadow-lg relative" : "border-slate-200 hover:border-teal-400 hover:shadow-md"}`}>
                {"popular" in tier && tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white">MOST POPULAR</div>
                )}
                <h3 className="text-lg font-bold text-slate-900 font-heading">{tier.label}</h3>
                <p className="mt-2 text-5xl font-bold text-teal-700 font-heading">{tier.price}</p>
                <p className="mt-1 text-sm text-slate-500">{tier.unit}</p>
                <ul className="mt-6 space-y-2 text-sm text-left">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-teal-600 mt-0.5">✓</span>
                      <span className="text-slate-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/book-junk-removal-service-today" className={`mt-6 inline-block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors font-cta ${"popular" in tier && tier.popular ? "bg-accent text-white hover:bg-accent-dark" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
                  Book Now &amp; Save $10
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. TESTIMONIALS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal Reviews and Customer Testimonials
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            {RATING} Stars Across {REVIEW_COUNT} Reviews
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Real customers, real results. Read how our <Link href="/pricing" className="text-teal-600 underline">starting at $100/hr pricing</Link> and{" "}
            <Link href="/about" className="text-teal-600 underline">resale credit model</Link> save people hundreds.{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">Schedule your pickup</Link> and see for yourself.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow">
                {/* Google-style header */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.location}</p>
                  </div>
                </div>
                {/* Stars + Google icon */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <svg key={i} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">Verified Customer</span>
                </div>
                {/* Review text */}
                <p className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 11. ALL 50 STATES ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal in All 50 States
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Serving Every State in America
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Local crews in <Link href="/locations" className="text-teal-600 underline">{CITY_COUNT} cities</Link> across all {STATE_COUNT} states.
            Find <Link href="/services" className="text-teal-600 underline">junk removal services</Link> near you or{" "}
            <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">contact us</Link> to confirm coverage in your area.
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {STATES.map((state) => (
              <Link
                key={state}
                href="/locations"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700"
              >
                {state}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 12. FAQ ACCORDION ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal Frequently Asked Questions
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Common Questions About Our Service
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Everything you need to know about <Link href="/pricing" className="text-teal-600 underline">pricing</Link>,{" "}
            <Link href="/about" className="text-teal-600 underline">resale credits</Link>,{" "}
            <Link href="/services" className="text-teal-600 underline">services</Link>, and{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">booking</Link>. Still have questions?{" "}
            <Link href="/faq" className="text-teal-600 underline">See our full FAQ page</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 font-heading">
                  {item.q}
                </summary>
                <div className="px-6 pb-4 text-sm leading-relaxed text-slate-700">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 13. RESALE VALUE SCIENCE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Why Your Junk Has Resale Value
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            The Science Behind Resale Value in Junk Removal
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Most people underestimate what their stuff is worth. Learn why <Link href="/about" className="text-teal-600 underline">our appraisal model</Link> recovers
            real value from <Link href="/services/furniture-removal" className="text-teal-600 underline">furniture</Link>,{" "}
            <Link href="/services/appliance-removal" className="text-teal-600 underline">appliances</Link>,{" "}
            <Link href="/services/tv-electronics-removal" className="text-teal-600 underline">electronics</Link>, and more.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The secondhand market in the United States is worth over $200 billion annually and growing at 15-20% per year. Platforms like Facebook Marketplace, OfferUp, Craigslist, and specialized resale shops have created massive demand for used furniture, appliances, electronics, tools, and household goods. The items sitting in your garage, basement, or storage unit have active buyers right now — you just do not have the time, knowledge, or motivation to find them.
            </p>
            <p>
              That is where our crew comes in. Every member of our team is trained in resale valuation — they know what brands command premium prices, what conditions are acceptable for resale, and what the current market rate is for common items in your metro area. A solid wood dresser from the 1970s that you consider junk might be worth $200 on the resale market. A working Kenmore washer that is ten years old still fetches $150-$200. Power tools hold value exceptionally well — a DeWalt miter saw retains 60-70% of its retail price for years.
            </p>
            <p>
              We maintain relationships with resale shops, auction houses, consignment stores, and online resale channels in every market we serve. This network allows us to move items quickly and at fair prices, which is what makes the 50% credit (when applicable) model sustainable. We do not lose money giving you credit — we make a smaller margin per item but we process a high volume. The system works because we have the infrastructure to actually sell what we recover, whereas most junk companies do not have resale operations at all. They dump everything, charge you the maximum, and call it a day.
            </p>
            <p>
              The categories of items with the highest resale value surprise most people. Solid wood furniture consistently outperforms — dining tables, dressers, bookshelves, and desks made of real wood (not particle board) hold 30-50% of their retail value for decades. Working appliances are next — refrigerators, washers, dryers, and ovens retain value well because the demand for affordable used appliances is enormous. Electronics vary widely but brand-name items in working condition (TVs, gaming consoles, audio equipment) move fast. Tools are the sleeper category — a garage full of hand and power tools can represent thousands of dollars in resale value that most owners never think about.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 14. COMPETITOR COMPARISON ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            We Pay You Junk vs 1-800-GOT-JUNK vs College Hunks
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            How We Compare to National Junk Removal Brands
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            See how our <Link href="/pricing" className="text-teal-600 underline">hourly pricing</Link> stacks up against volume-based companies.
            Spoiler: nobody else <Link href="/about" className="text-teal-600 underline">pays you for your stuff</Link>.{" "}
            <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">Contact us</Link> for a free estimate.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              1-800-GOT-JUNK is the biggest name in junk removal. They charge by volume — a full truck runs $600-$800+ depending on your market. They send a crew, load everything, and haul it away. Any items with resale value? They sell them and keep the money. You do not see a dime of it. Their model is simple: charge the customer as much as possible to haul items that the company then profits from reselling.
            </p>
            <p>
              College Hunks Hauling Junk uses a similar volume model with pricing that starts lower but climbs fast for larger loads. They also resell items and keep 100% of the profit. Their branding is fun, but the economics are the same — you pay to give them inventory.
            </p>
            <p>
              LoadUp, Junk King, and other regional competitors all follow the same pattern: volume pricing, no transparency on what happens to your items, and zero credit for anything with value. Some offer donation receipts for tax purposes, which is a nice touch, but it is not cash back on your bill.
            </p>
            <p>
              We Pay You Junk Removal is the only national junk removal company that charges by the hour, includes dump fees in the rate, and credits you 50% of resale value (when applicable) on items worth something. Our crew is not incentivized to upsell you or estimate high — they are paid by the hour regardless of what is on the truck. The only financial incentive in our model beyond labor is resale, and we split that with you. There is no other company doing this at scale in the United States. Not one.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 15. FULL SERVICE FOR EVERY SITUATION ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Residential Commercial and Estate Junk Removal
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Full-Service Junk Removal for Every Situation
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            From <Link href="/services/garage-cleanouts" className="text-teal-600 underline">residential garage cleanouts</Link> to{" "}
            <Link href="/services/estate-cleanouts" className="text-teal-600 underline">full estate clearing</Link>,{" "}
            <Link href="/commercial" className="text-teal-600 underline">commercial office jobs</Link>,{" "}
            <Link href="/services/construction-debris-removal" className="text-teal-600 underline">construction debris</Link>, and{" "}
            <Link href="/services/property-management-cleanouts" className="text-teal-600 underline">property management turnovers</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Residential:</strong> This is where most of our calls come from. A homeowner has a <Link href="/services/garage-cleanouts" className="text-teal-600 underline">garage</Link> that hasn&apos;t been cleaned in five years, a <Link href="/services/basement-cleanouts" className="text-teal-600 underline">basement</Link> full of boxes from two moves ago, or an <Link href="/services/attic-cleanouts" className="text-teal-600 underline">attic</Link> crammed with stuff nobody remembers storing. We also handle <Link href="/services/hoarder-cleanouts" className="text-teal-600 underline">hoarder cleanouts</Link> with sensitivity and <Link href="/services/storage-unit-cleanouts" className="text-teal-600 underline">storage unit clearing</Link> to stop monthly rent on stuff you don&apos;t need.
            </p>
            <p>
              <strong>Estate Cleanouts:</strong> When a family member passes or a property needs to be completely emptied, <Link href="/services/estate-cleanouts" className="text-teal-600 underline">estate cleanouts</Link> involve every room, every closet, every cabinet. A lifetime of belongings. This is where our credit model delivers the most value — estates are full of furniture sets, appliances, vintage items, collectibles, and tools. Credits regularly cover the entire bill. Read more on our <Link href="/blog" className="text-teal-600 underline">blog</Link>.
            </p>
            <p>
              <strong>Single Items &amp; Specialty:</strong> Don&apos;t need a full cleanout? We pick up individual items — <Link href="/services/mattress-removal" className="text-teal-600 underline">mattresses</Link>, <Link href="/services/refrigerator-removal" className="text-teal-600 underline">refrigerators</Link>, <Link href="/services/exercise-equipment-removal" className="text-teal-600 underline">exercise equipment</Link>, <Link href="/services/piano-removal" className="text-teal-600 underline">pianos</Link>, <Link href="/services/hot-tub-removal" className="text-teal-600 underline">hot tubs</Link>, <Link href="/services/pool-table-removal" className="text-teal-600 underline">pool tables</Link>, and <Link href="/services/tire-removal" className="text-teal-600 underline">tires</Link>. Most single-item pickups take under an hour.
            </p>
            <p>
              <strong>Commercial:</strong> <Link href="/services/office-cleanouts" className="text-teal-600 underline">Office closures</Link>, <Link href="/services/retail-cleanouts" className="text-teal-600 underline">retail remodels</Link>, <Link href="/services/warehouse-cleanouts" className="text-teal-600 underline">warehouse clearing</Link>, and <Link href="/services/hotel-cleanouts" className="text-teal-600 underline">hotel FF&amp;E replacement</Link> — <Link href="/commercial" className="text-teal-600 underline">commercial jobs</Link> generate large volumes of items with strong resale markets. We also serve <Link href="/services/church-nonprofit-cleanouts" className="text-teal-600 underline">churches and nonprofits</Link> and <Link href="/services/school-university-cleanouts" className="text-teal-600 underline">schools and universities</Link>. We work after hours and coordinate with property managers for recurring service.
            </p>
            <p>
              <strong>Construction &amp; Yard:</strong> <Link href="/services/construction-debris-removal" className="text-teal-600 underline">Construction debris</Link>, <Link href="/services/renovation-waste-removal" className="text-teal-600 underline">renovation waste</Link>, <Link href="/services/yard-waste-removal" className="text-teal-600 underline">yard waste</Link>, <Link href="/services/carpet-flooring-removal" className="text-teal-600 underline">carpet and flooring</Link>, and <Link href="/services/scrap-metal-removal" className="text-teal-600 underline">scrap metal</Link> — all hauled at our hourly rate with dump fees included. No dumpster rental needed.
            </p>
            <p>
              <strong>Property Management:</strong> <Link href="/services/foreclosure-cleanouts" className="text-teal-600 underline">Foreclosure cleanouts</Link> and <Link href="/services/property-management-cleanouts" className="text-teal-600 underline">tenant turnovers</Link> are a recurring reality. We provide fast-turnaround cleanouts with consistent crew assignments, priority scheduling, and credits on valuable items left behind. <Link href="/careers" className="text-teal-600 underline">We&apos;re also hiring</Link> — $50/hr starting pay, <Link href="/apply-for-junk-removal-job" className="text-teal-600 underline">apply today</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 16. WHAT HAPPENS TO ITEMS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Eco-Friendly Junk Disposal and Recycling
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What Happens to Your Items After Pickup
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We do not just dump everything in a landfill. Learn about our <Link href="/about" className="text-teal-600 underline">resale</Link>,
            donation, <Link href="/services/scrap-metal-removal" className="text-teal-600 underline">recycling</Link>, and responsible disposal paths.{" "}
            <Link href="/faq" className="text-teal-600 underline">See our FAQ</Link> for more details.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Resale:</strong> Items in good condition with active secondary markets go directly to our resale network — local resale shops, consignment stores, auction houses, and online platforms. This is the stuff that earns you 50% credit. Furniture, working appliances, electronics, tools, fitness equipment, musical instruments, designer goods.
            </p>
            <p>
              <strong>Donation:</strong> Items that are functional but below resale value go to local donation centers — Goodwill, Salvation Army, Habitat for Humanity ReStore, and community organizations. Clothing, kitchenware, books, toys, and household items that still have useful life get a second home instead of a landfill.
            </p>
            <p>
              <strong>Recycling:</strong> Metals, electronics, cardboard, glass, and other recyclable materials go to certified recycling facilities. Scrap metal has real value and earns you credit. E-waste is processed through certified recyclers to ensure hazardous components are handled properly. We work with recycling partners in every market.
            </p>
            <p>
              <strong>Responsible Disposal:</strong> Only items with no resale value, no donation potential, and no recyclable components go to the landfill. This represents roughly 40% of what we haul — the rest gets a second life through resale, donation, or recycling. We are committed to diverting as much as possible from landfills because it is good for the environment and good for business.
            </p>
            <p>
              <strong>Why this matters for you:</strong> When you choose a junk removal company that dumps 80% of what they take, your working <Link href="/services/refrigerator-removal" className="text-teal-600 underline">refrigerator</Link> ends up in a landfill where it leaks refrigerant into the ground. Your solid wood <Link href="/services/furniture-removal" className="text-teal-600 underline">dining table</Link> gets buried under construction debris. Your <Link href="/services/tv-electronics-removal" className="text-teal-600 underline">flat screen TV</Link> containing lead and mercury contaminates groundwater. When you choose us, that refrigerator goes to a family who needs an affordable appliance. That dining table goes to a resale shop where someone furnishes their first apartment. That TV gets properly dismantled by a certified e-waste recycler. You get credit for the valuable items, the items get second lives, and the environment benefits. That is the difference between a junk removal company that cares and one that just owns a truck.
            </p>
            <p>
              <strong>The numbers:</strong> In the past year alone, we have diverted an estimated 3.2 million pounds of items from landfills across our national network. That includes approximately 180,000 pieces of furniture resold, 45,000 appliances refurbished and rehomed, 28,000 electronics properly recycled, and 500,000+ pounds of scrap metal reprocessed. Every job you book with us contributes to these numbers — and earns you money back in the process. Read more about our environmental commitment on our <Link href="/about" className="text-teal-600 underline">about page</Link> or see our <Link href="/blog/eco-friendly-junk-disposal" className="text-teal-600 underline">eco-friendly disposal guide</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 17. APPRAISAL PROCESS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            How Junk Removal Item Appraisals Work
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Our On-Site Appraisal Process — Transparent and Fair
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Every appraisal happens in front of you, in real time. See how we determine{" "}
            <Link href="/about" className="text-teal-600 underline">fair market value</Link> on your items.{" "}
            <Link href="/services/furniture-removal" className="text-teal-600 underline">Furniture</Link>,{" "}
            <Link href="/services/appliance-removal" className="text-teal-600 underline">appliances</Link>, electronics, tools — we appraise it all.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              When our crew loads an item with potential resale value, the appraisal process kicks in immediately. The crew member identifies the item — brand, model, age, condition, and functionality. They check comparable sales data using our internal pricing database, which tracks real transaction prices across resale channels in every market we serve. This is not guesswork — it is data-driven valuation based on what similar items actually sold for in the last 30-90 days in your region.
            </p>
            <p>
              The crew member presents the appraisal to you: the item, its estimated fair market value, and your 50% credit amount. You approve or reject each appraisal individually. If you think the value is low, say so — the crew member will explain their reasoning and adjust if warranted. If you decide you want to keep an item after seeing its value, we take it off the truck. No questions, no pressure.
            </p>
            <p>
              At the end of the job, you receive a detailed invoice showing every appraised item, its value, your credit, total hours worked, and the final amount due or owed to you. This invoice is your record — it shows exactly where every dollar went. Other junk companies hand you a bill and drive away. We hand you a breakdown that proves the math.
            </p>
            <p>
              What qualifies for appraisal? Any item our crew believes has $20 or more in resale value. That covers most <Link href="/services/furniture-removal" className="text-teal-600 underline">furniture</Link> in decent condition, all working <Link href="/services/appliance-removal" className="text-teal-600 underline">appliances</Link>, <Link href="/services/tv-electronics-removal" className="text-teal-600 underline">electronics</Link> less than 6-8 years old, brand-name <Link href="/services/exercise-equipment-removal" className="text-teal-600 underline">exercise equipment</Link>, <Link href="/services/piano-removal" className="text-teal-600 underline">musical instruments</Link>, power tools, and outdoor recreation gear. Items clearly below the threshold — broken furniture, stained mattresses, construction debris — get loaded without appraisal and hauled as part of your hourly rate.
            </p>
            <p>
              Our appraisal accuracy improves over time in every market. The more jobs our local crews complete, the more data points they have on what sells and for how much in your specific area. A crew that has done 500 jobs in your city knows the local market better than any algorithm. They know that mid-century modern furniture commands a premium in Portland but not in Houston. They know that <Link href="/services/refrigerator-removal" className="text-teal-600 underline">Samsung French door refrigerators</Link> move faster than Whirlpool top-freezers in every market. This hyperlocal knowledge is what makes our appraisals fair and accurate — and it is something no other junk removal company even attempts.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 18. ENVIRONMENTAL IMPACT ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Sustainable Junk Removal and Landfill Diversion
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            60% Diverted From Landfills — And Growing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Our resale-first model is not just better for your wallet — it is better for the planet. Learn about our{" "}
            <Link href="/about" className="text-teal-600 underline">environmental commitment</Link> and how every{" "}
            <Link href="/services" className="text-teal-600 underline">junk removal job</Link> contributes to waste reduction.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The average American generates 4.4 pounds of waste per day, and household junk removal adds significant volume to landfills — bulky items like furniture, mattresses, and appliances take up enormous space and can take decades to decompose. Traditional junk removal companies contribute to this problem by dumping everything, including perfectly functional items, because sorting and reselling takes time they would rather not spend.
            </p>
            <p>
              Our model flips this dynamic. Because we generate revenue from reselling items, we have a direct financial incentive to keep as much as possible out of the landfill. Every item we resell is an item that does not get buried. Every item we donate extends its useful life. Every scrap of metal or electronics we recycle recovers raw materials instead of mining new ones. The result: we divert over 60% of hauled items from landfills through resale, donation, and recycling.
            </p>
            <p>
              We are pushing that number higher every year by expanding our resale network, partnering with more donation centers, and working with specialized recyclers who can process materials that general recycling facilities cannot. Our goal is 75% landfill diversion by the end of next year. When you <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">book junk removal</Link> with us, you are not just getting the best price and the fairest credit — you are choosing the most environmentally responsible option available.
            </p>
            <p>
              <Link href="/services/tv-electronics-removal" className="text-teal-600 underline">Electronics recycling</Link> deserves special attention. E-waste contains lead, mercury, cadmium, and brominated flame retardants that leach into groundwater when landfilled. We route all non-resellable electronics through EPA-certified e-waste processors who dismantle them safely, recovering precious metals and containing toxic materials. <Link href="/services/appliance-removal" className="text-teal-600 underline">Appliances</Link> containing refrigerants (refrigerators, freezers, AC units) are handled by certified technicians per Clean Air Act requirements. These are not optional steps — they are fundamental to responsible junk removal, and most companies skip them because they cost money and take time.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 19. PROPERTY MANAGERS & REALTORS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal for Property Managers and Realtors
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Built for Property Managers and Real Estate Professionals
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/services/property-management-cleanouts" className="text-teal-600 underline">Recurring cleanout service</Link>,{" "}
            <Link href="/services/foreclosure-cleanouts" className="text-teal-600 underline">foreclosure clearing</Link>,{" "}
            <Link href="/services/estate-cleanouts" className="text-teal-600 underline">estate work</Link>, and fast turnovers.{" "}
            <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">Contact us</Link> for volume pricing.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              If you manage rental properties, you know the math. Every day a unit sits empty costs you money — lost rent, utility costs, insurance, and opportunity cost. Tenant turnovers need to happen fast. The problem is that most junk removal companies treat every job as a one-off, with no relationship, no consistency, and no priority. You call, you wait, you get a random crew, and you pay whatever they quote.
            </p>
            <p>
              We built our property management service to solve every one of those problems. Recurring clients get assigned a consistent crew that learns your properties — they know the layouts, the access points, the parking, and your expectations. You get priority scheduling, meaning same-day and next-day availability for turnovers. And because items left behind by tenants often include furniture and appliances with resale value, our credit model reduces your per-unit cleanout costs significantly.
            </p>
            <p>
              For realtors handling estate sales and foreclosures, we are the fastest path to a market-ready property. An estate cleanout that would take you a week of coordination with multiple vendors — junk company, donation pickup, recycler, dumpster rental — takes us a single day. We handle everything, credit the estate for valuable items, and leave the property broom-clean and ready for staging or showing. Call us at {PHONE} to set up a property management account.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 20. PRICING QUESTIONS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Junk Removal Cost and Pricing Questions Answered
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Common Pricing Questions — Straight Answers
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            No hidden fees, no estimates. Read about our <Link href="/pricing" className="text-teal-600 underline">rates starting at $100/hr</Link>,{" "}
            <Link href="/faq" className="text-teal-600 underline">credit system FAQ</Link>, and how{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">booking works</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Is our pricing really all-inclusive?</strong> Yes. Our starting rate covers labor, truck, loading, hauling, and dump fees. There are no additional charges for heavy items, stairs, long carries, or disposal. The only cost is hours worked starting at $100/hr with a 1-hour minimum.
            </p>
            <p>
              <strong>What if my job takes less than an hour?</strong> The minimum charge is 1 hour ($100). If our crew finishes in 40 minutes, you pay $100. Most single-item pickups and small loads take less than an hour, so the minimum applies. For larger jobs, we round to the nearest 15-minute increment.
            </p>
            <p>
              <strong>Do resale credits really come off my bill?</strong> Absolutely. Every item our crew identifies with resale value gets appraised at fair market value in front of you. You see the item, the estimated value, and the credit amount. Credits are applied to your bill in real time. If credits exceed your bill, we pay you the difference on the spot.
            </p>
            <p>
              <strong>How do I pay?</strong> We accept credit cards, debit cards, checks, Venmo, Zelle, and CashApp. Payment or payout is processed at the end of the job, on site. No invoices, no delayed billing.
            </p>
            <p>
              <strong>Are there extra charges for weekends or holidays?</strong> No. The rate is starting at $100/hr every single day — weekdays, weekends, and holidays. No overtime charges, no surcharges, no premium pricing. The same rate, 365 days a year.
            </p>
            <p>
              <strong>What if I disagree with an appraisal?</strong> Every appraisal is a conversation, not a take-it-or-leave-it number. Our crew shows you comparable sales data and explains their reasoning. If you have evidence of a higher value — a recent listing, an original receipt, a dealer quote — we adjust. We&apos;d rather give a slightly generous credit than have you feel shortchanged. Nothing is credited without your explicit approval. See our full <Link href="/faq" className="text-teal-600 underline">FAQ</Link> for more on how appraisals work.
            </p>
            <p>
              <strong>What&apos;s the difference between your three pricing tiers?</strong> 1 Person Crew ($100/hr) handles small jobs and single items up to 150 lbs. 2 Person Crew ($250/hr) is our most popular — handles full cleanouts, heavy items up to 500 lbs, and includes up to 2 truck loads. Emergency Same-Day ($200/person/hr) guarantees arrival within 2 hours for last-minute deadlines. All three tiers include dump fees (an industry first) and 50% Resale Credit (when applicable). See our <Link href="/pricing" className="text-teal-600 underline">full pricing breakdown</Link> with estimated costs for all 34 services.
            </p>
            <p>
              <strong>Do you offer discounts for large jobs?</strong> Our credit model IS the discount. The more items with resale value in your job, the more credits you earn — and on large jobs like <Link href="/services/estate-cleanouts" className="text-teal-600 underline">estate cleanouts</Link> and <Link href="/services/office-cleanouts" className="text-teal-600 underline">office clearing</Link>, credits frequently cover the entire bill. That&apos;s a better deal than any volume discount because the savings scale with the actual value of YOUR specific items, not an arbitrary percentage off a quoted price. Recurring commercial clients get priority scheduling and dedicated crews — <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">contact us</Link> to set up an account.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 21. RESIDENTIAL GUIDE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Residential Junk Removal Guide for Garages Basements Attics
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            The Complete Guide to Residential Junk Removal
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Clear your <Link href="/services/garage-cleanouts" className="text-teal-600 underline">garage</Link>,{" "}
            <Link href="/services/basement-cleanouts" className="text-teal-600 underline">basement</Link>, or{" "}
            <Link href="/services/attic-cleanouts" className="text-teal-600 underline">attic</Link> with a single call. Our crew handles everything.{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">Book now</Link> or{" "}
            <a href={PHONE_HREF} className="text-teal-600 underline">call {PHONE}</a>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Garages:</strong> The average two-car garage accumulates 10-15 years of items — tools, holiday decorations, sports equipment, boxes of stuff from the last move, old furniture, and random odds and ends. A typical garage cleanout takes our crew 1.5-2.5 hours. Tools and equipment are the biggest credit generators here — power tools, hand tools, lawn mowers, and workbenches hold value well. Many customers tell us their final bill was under $50 after credits, for a space that had been unusable for years.
            </p>
            <p>
              <strong>Basements:</strong> Basements are deeper digs — literally and figuratively. Decades of stored items, including furniture that was replaced upstairs but never thrown away, boxes from college, holiday decorations from three themes ago, and broken appliances waiting for a repair that never came. Basement jobs average 2-3 hours and almost always yield valuable finds — vintage furniture, working electronics, power tools, and collectibles that have been sitting in the dark for years. Stairs add time but not cost — same hourly rate regardless.
            </p>
            <p>
              <strong>Attics:</strong> Attics are the final frontier of home clutter. Tight spaces, steep access, and extreme temperatures make them the least-visited storage in most homes — which means items have been untouched the longest. <Link href="/services/attic-cleanouts" className="text-teal-600 underline">Attic cleanouts</Link> often uncover genuine treasures: antique furniture, vintage clothing, old records, collectible toys, and family items with real market value. Our crew is trained to navigate pull-down ladders, scuttle holes, and low ceilings safely. Average attic job: 1-2 hours, with higher-than-average credit rates because attic items tend to be older and more valuable.
            </p>
            <p>
              <strong>Estates:</strong> <Link href="/services/estate-cleanouts" className="text-teal-600 underline">Estate cleanouts</Link> are the largest residential jobs we handle — and where our credit model delivers the most dramatic results. A lifetime of belongings across every room, closet, drawer, and cabinet. Furniture sets, full kitchens of appliances, decades of accumulated tools, antiques, collectibles, artwork, musical instruments, clothing, and personal items. Traditional haulers charge $2,000-$5,000+ for estate work and resell everything for their own profit. Our customers regularly walk away with a check instead of a bill. We handle estate work with sensitivity — our crews understand the emotional weight of clearing a loved one&apos;s home and approach every job with respect and patience. Read our <Link href="/blog/prepare-for-estate-cleanout" className="text-teal-600 underline">estate cleanout preparation guide</Link> for tips.
            </p>
            <p>
              <strong>Hoarding &amp; Storage:</strong> <Link href="/services/hoarder-cleanouts" className="text-teal-600 underline">Hoarder cleanouts</Link> require a compassionate, methodical approach — our crews are trained to work through heavy accumulation without judgment. We sort carefully, identify valuable items buried under the surface, and clear spaces completely. <Link href="/services/storage-unit-cleanouts" className="text-teal-600 underline">Storage unit cleanouts</Link> are the other hidden cost drain — the average American spends $1,200+/year on a unit they never access. We clear the entire unit, credit you for valuables, and you stop bleeding monthly rent. Between the credits and the rent savings, a storage cleanout pays for itself in the first month.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 22. ITEM VALUE GUIDE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            What Is My Junk Worth Resale Value Guide
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What Your Stuff Is Actually Worth
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/services/furniture-removal" className="text-teal-600 underline">Furniture</Link>,{" "}
            <Link href="/services/appliance-removal" className="text-teal-600 underline">appliances</Link>,{" "}
            <Link href="/services/tv-electronics-removal" className="text-teal-600 underline">electronics</Link>, and tools —
            here is a rough guide to resale values. Your actual credit depends on condition, brand, and local market.{" "}
            <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">Contact us</Link> for specifics.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Furniture:</strong> Solid wood dining table $150-$400. Leather sofa $200-$600. Dresser (real wood) $80-$250. Office desk $50-$200. Bookshelf (solid wood) $40-$150. Metal bed frame $30-$100. Upholstered accent chair $50-$150. Particle board furniture typically has minimal resale value. Your credit is 50% of these figures.
            </p>
            <p>
              <strong>Appliances:</strong> Refrigerator (working, under 10 years) $150-$400. Washer $100-$250. Dryer $80-$200. Dishwasher $50-$150. Oven/Range $100-$300. Window AC unit $30-$80. Stainless steel models and premium brands command the top of these ranges.
            </p>
            <p>
              <strong>Electronics:</strong> Flat screen TV (under 5 years) $50-$300. Gaming console $50-$200. Desktop computer $30-$150. Laptop $40-$200. Speakers/audio equipment $20-$300+ for premium brands. Monitors $20-$100. Vintage and audiophile equipment can go much higher.
            </p>
            <p>
              <strong>Tools:</strong> DeWalt miter saw $100-$250. Table saw $80-$200. Drill press $50-$150. Air compressor $40-$120. Hand tool sets $20-$80. Riding lawn mower $200-$800. Push mower $30-$100. Power tools in working condition consistently outperform other categories for resale-to-original-price ratio.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 23. COMMERCIAL DEEP DIVE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Commercial Junk Removal and Office Cleanout Services
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Commercial Junk Removal That Saves Thousands
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/services/office-cleanouts" className="text-teal-600 underline">Office cleanouts</Link>,{" "}
            <Link href="/services/warehouse-cleanouts" className="text-teal-600 underline">warehouse clearing</Link>,{" "}
            <Link href="/services/retail-cleanouts" className="text-teal-600 underline">retail closures</Link>, and{" "}
            <Link href="/commercial" className="text-teal-600 underline">all commercial services</Link>.{" "}
            <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">Get a commercial estimate</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Commercial junk removal is where our credit model delivers the most dramatic results. Office furniture has an exceptionally strong secondary market — a single Herman Miller Aeron chair retails for $1,200+ new and resells for $400-$700 used. A 50-person office with quality chairs alone represents $10,000-$17,500 in resale value, with half of that credited to you. Add in desks, monitors, conference tables, filing cabinets, and IT equipment, and the numbers get serious.
            </p>
            <p>
              We recently cleared a 15,000 sq ft office in midtown Manhattan. The company was relocating and needed everything gone in 48 hours. Our crew worked 20 hours over two days ($2,000). We identified $6,200 in resale value from 40 task chairs, 12 standing desks, 2 conference tables, 30 monitors, and assorted office equipment. The client received $3,100 in credits, bringing their bill to zero — and we cut them a check for $1,100. Their quote from 1-800-GOT-JUNK had been $8,500.
            </p>
            <p>
              This is not unusual for commercial work. Offices, retail stores, warehouses, hotels, and schools are full of items that have standardized, predictable resale values. Our crews know exactly what commercial items are worth because we process thousands of them every month across our national network. For businesses, choosing us over a volume-based competitor is not just saving money — it is recovering money that would otherwise go straight into someone else&apos;s pocket.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 24. BOOKING GUIDE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            How to Book Junk Removal Service Online or By Phone
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            How to Schedule Your Junk Removal
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">Book online</Link> in 2 minutes,{" "}
            <a href={PHONE_HREF} className="text-teal-600 underline">call {PHONE}</a>, or{" "}
            <a href={SMS_HREF} className="text-teal-600 underline">text us</a>.{" "}
            <Link href="/faq" className="text-teal-600 underline">See our FAQ</Link> for scheduling details.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Online:</strong> Visit our <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">booking page</Link> and fill out the quick form — your name, address, what you need hauled, and your preferred date and time. We confirm within 30 minutes during business hours. The form takes about 2 minutes.
            </p>
            <p>
              <strong>Phone:</strong> Call us at {PHONE}. Our scheduling team answers {HOURS}, seven days a week. We ask about your job (what types of items, approximate volume, access details), confirm pricing, estimate the time, and schedule your crew. The call takes about 5 minutes.
            </p>
            <p>
              <strong>Text:</strong> Text us at the same number. Send a quick description or photos of what you need hauled. We reply with a time estimate and available appointment slots. Great for people who prefer not to call.
            </p>
            <p>
              <strong>Same-Day Service:</strong> Call or book before noon and we can typically have a crew at your door within 2-4 hours. Same-day availability depends on crew scheduling in your market, but we accommodate it in 80%+ of requests. No rush charges, no premium pricing — same starting rate. Need it even faster? Our emergency same-day tier ($200/person/hr) guarantees arrival within 2 hours — see <Link href="/pricing" className="text-teal-600 underline">all pricing tiers</Link>.
            </p>
            <p>
              <strong>What to expect on the day:</strong> Your crew arrives in a branded truck within a 2-hour window. They introduce themselves, do a walkthrough of the space with you, and confirm what is going and what is staying. Then they get to work — loading items, sorting valuables for appraisal, and hauling everything to the truck. As they load, they present appraisals on items with resale value. You approve or reject each credit individually. When loading is complete, they do a final sweep of the work area and a walkthrough with you to confirm the space is clean. Payment or payout is processed on site — credit card, check, Venmo, Zelle, or CashApp. The entire process — from their arrival to a clean space — typically takes 1-4 hours for residential jobs. <Link href="/services/estate-cleanouts" className="text-teal-600 underline">Estate cleanouts</Link> and <Link href="/services/office-cleanouts" className="text-teal-600 underline">commercial jobs</Link> may take longer.
            </p>
            <p>
              <strong>Scheduling tips:</strong> Tuesday through Thursday are typically the least busy days — if your schedule is flexible, midweek means faster arrival times. Spring (March-June) is our busiest season due to spring cleaning, moving season, and home listing activity — book 3-5 days ahead during these months. Fall and winter have the most open availability. Weekend and holiday appointments are available at the same rate — no surcharges. For <Link href="/commercial" className="text-teal-600 underline">commercial clients</Link> needing after-hours or recurring service, <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">contact us</Link> to set up a dedicated account with priority scheduling.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 25. NATIONWIDE COVERAGE ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Nationwide Junk Removal Service in {CITY_COUNT} Cities
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Local Crews, National Coverage
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We operate from offices across the country with crews who live and work in your community.{" "}
            <Link href="/locations" className="text-teal-600 underline">Find your city</Link>,{" "}
            <Link href="/services" className="text-teal-600 underline">browse services</Link>, or{" "}
            <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">book now</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              We serve {CITY_COUNT} cities across all {STATE_COUNT} states from strategically located offices around the country. Each office dispatches local crews — people who live in your community, know the neighborhoods, understand the local disposal facilities, and have relationships with regional resale shops and donation centers. This local expertise means faster service, more accurate appraisals, and higher credits for your items.
            </p>
            <p>
              Our national infrastructure means consistent quality regardless of where you are. The same starting rate applies in New York City and rural Montana. The same 50% Resale Credit (when applicable) model works in Miami and Minneapolis. The same training standards apply to every crew member in every market. Whether you are in a dense urban center or a suburban neighborhood, you get the same professional junk removal experience.
            </p>
            <p>
              Not sure if we cover your area? Call us at {PHONE} or check our <Link href="/locations" className="text-teal-600 underline">locations page</Link>. With {CITY_COUNT} cities and growing, there is a strong chance we have a local crew ready to serve you today. Interested in owning a We Pay You location? See our <Link href="/franchise" className="text-teal-600 underline">franchise opportunity</Link>.
            </p>
            <p>
              <strong>What &quot;local&quot; actually means:</strong> Our crew in Nashville is not the same crew that works Denver. Your crew member lives in your metro area, shops at your stores, knows your traffic patterns, and understands which items sell best in your local resale market. A mid-century modern dresser commands a premium in Portland that it does not command in Dallas. A riding mower is worth more in suburban Atlanta than in downtown Chicago. A set of snow tires has value in Minneapolis but not in Miami. These market-specific dynamics affect your credit — and a local crew with local knowledge means more accurate appraisals and higher credits for you. That is something a national chain dispatching from a central call center can never replicate.
            </p>
            <p>
              <strong>Growing every month:</strong> We are adding new cities and new office locations continuously. If you are in a city we don&apos;t currently serve, call us anyway — we may have a crew nearby that can reach you, we may be launching in your market next month, or we may be able to schedule a special trip. We also offer <Link href="/franchise" className="text-teal-600 underline">franchise opportunities</Link> for entrepreneurs who want to bring the We Pay You model to their community. And we&apos;re always <Link href="/careers" className="text-teal-600 underline">hiring crew members</Link> — $50/hr starting pay, full training, real growth path. <Link href="/apply-for-junk-removal-job" className="text-teal-600 underline">Apply today</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 26. STRUCTURE REMOVAL ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Shed Fence Deck Demolition and Removal Service
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Shed, Fence, and Deck Removal — Full Demo Included
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We tear down and haul away outdoor structures at the same starting rate.{" "}
            <Link href="/services/shed-removal" className="text-teal-600 underline">Sheds</Link>,{" "}
            <Link href="/services/fence-removal" className="text-teal-600 underline">fences</Link>,{" "}
            <Link href="/services/deck-removal" className="text-teal-600 underline">decks</Link>, and{" "}
            <Link href="/services/trampoline-removal" className="text-teal-600 underline">trampolines</Link> — all included.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Structure removal is a common need that most junk companies either do not offer or charge a premium for. Old sheds rotting in the backyard, fences that have seen better decades, decks with soft boards and wobbly railings — they need to come down, and you need someone who will tear them apart, load the debris, and haul it away. That is what we do, at the same starting rate with dump fees included.
            </p>
            <p>
              <strong>Sheds &amp; Playhouses:</strong> Our crew demolishes the walls, roof, floor, and foundation — everything. Average shed removal takes 2-3 hours depending on size and construction. We leave the ground clear and clean. Metal sheds have scrap value that earns you credit.
            </p>
            <p>
              <strong>Fences:</strong> Wood, chain link, vinyl, wrought iron — we handle all types. Posts are pulled or cut at ground level per your preference. Wrought iron and metal fencing has scrap value. A standard 100-foot wood fence takes about 2-3 hours.
            </p>
            <p>
              <strong>Decks:</strong> Full demolition — decking boards, railings, stairs, and support posts. All lumber and hardware is loaded and hauled. Deck removal varies widely by size but typically runs 3-6 hours for a standard residential deck. Pressure-treated lumber is disposed of properly at licensed facilities.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 27. CONSTRUCTION DEBRIS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Construction Debris Removal Without Dumpster Rental
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Skip the Dumpster — We Haul Construction Debris
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            <Link href="/services/construction-debris-removal" className="text-teal-600 underline">Construction debris</Link>,{" "}
            <Link href="/services/renovation-waste-removal" className="text-teal-600 underline">renovation waste</Link>, and jobsite cleanup — all starting at $100/hr.{" "}
            <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">Contact us</Link> for contractor scheduling.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Dumpster rental sounds convenient until you factor in the real costs: the rental fee ($300-$600/week), the weight overage charges, the permit if it sits on the street, the time you spend loading it yourself, and the 3-7 day window where an ugly metal box sits in your driveway. Then there are the restrictions — most dumpster companies have long lists of materials they will not accept, including concrete, dirt, roofing, and hazardous materials.
            </p>
            <p>
              Our construction debris service eliminates all of that. We show up, load the debris ourselves, and haul it away the same day. Drywall, lumber, concrete, tile, roofing materials, old fixtures, pipe, wire — we take it all. Our starting rate includes the labor, the truck, and the dump fees. No rental period, no weight limits, no driveway eyesore, no loading it yourself.
            </p>
            <p>
              For contractors with ongoing projects, we offer recurring pickups — schedule us to swing by every few days or once a week to clear accumulated debris. This keeps your jobsite clean without the hassle of coordinating dumpster swaps. Salvageable materials like hardwood flooring, solid wood cabinets, copper pipe, and <Link href="/services/scrap-metal-removal" className="text-teal-600 underline">scrap metal</Link> earn resale credits that reduce your hauling costs.
            </p>
            <p>
              <strong>What we haul:</strong> Drywall and sheetrock, dimensional lumber and plywood, concrete and masonry, ceramic and porcelain tile, roofing materials (shingles, underlayment, flashing), old cabinets and countertops, plumbing fixtures, electrical fixtures, insulation, old windows and doors, <Link href="/services/carpet-flooring-removal" className="text-teal-600 underline">carpet and flooring</Link>, and general jobsite waste. We also handle <Link href="/services/renovation-waste-removal" className="text-teal-600 underline">renovation-specific waste</Link> from kitchen and bathroom remodels — old vanities, tubs, shower enclosures, and tile.
            </p>
            <p>
              <strong>The scrap metal advantage:</strong> Most renovation projects produce significant <Link href="/services/scrap-metal-removal" className="text-teal-600 underline">scrap metal</Link> — copper pipe and wire from replumbing, steel studs from commercial framing, aluminum flashing and gutters, brass fixtures and valve stems. Copper alone runs $3-$5 per pound. A typical bathroom replumb produces 15-25 lbs of copper scrap = $45-$125 in credit. A whole-house replumb can generate $200+ in scrap credits. This is money that goes straight into the dumpster with traditional disposal — with us, it comes off your bill. Read our <Link href="/blog/construction-debris-removal-tips" className="text-teal-600 underline">contractor&apos;s guide to debris removal</Link> for more.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 28. SAFETY & INSURANCE ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Licensed Bonded Insured Junk Removal Crews
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Safety, Licensing, and Insurance
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Our crews are trained, background-checked, and fully insured. Learn about our safety protocols and{" "}
            <Link href="/about" className="text-teal-600 underline">company standards</Link>.{" "}
            <Link href="/careers" className="text-teal-600 underline">We are hiring</Link> if you want to join the team.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Every We Pay You Junk Removal crew member is background-checked, professionally trained, and covered by comprehensive liability insurance. We do not hire day laborers or subcontract to random trucks — our crews are our employees, trained in our methods, our safety protocols, and our customer service standards.
            </p>
            <p>
              <strong>Training:</strong> Crew members complete hands-on training in proper lifting techniques, stair carry protocols, furniture disassembly, appliance handling, and the use of professional moving equipment including dollies, hand trucks, furniture straps, moving blankets, and floor runners. Heavy items like pianos, safes, refrigerators, and cast iron tubs require specific techniques that our crews practice regularly.
            </p>
            <p>
              <strong>Property Protection:</strong> We use corner guards on doorframes, floor runners on hardwood and tile, and moving blankets to protect items being carried through tight spaces. Your home or office is treated with the same care we would give our own property. If property damage does occur — a scratched floor, a nicked wall, a broken fixture — our insurance covers the repair at no cost to you.
            </p>
            <p>
              <strong>Licensing:</strong> We are fully licensed and bonded in every market we operate. All disposal is handled through licensed transfer stations and recycling facilities. E-waste goes to certified recyclers. Refrigerant is handled in compliance with EPA regulations. We maintain all required permits and certifications to operate legally and responsibly in every state.
            </p>
            <p>
              <strong>Insurance:</strong> We carry general liability insurance with coverage limits that protect your property throughout the entire removal process. Commercial auto insurance covers all vehicles. Workers&apos; compensation covers all crew members. Professional liability insurance covers our appraisal services. For <Link href="/commercial" className="text-teal-600 underline">commercial clients</Link> and <Link href="/services/property-management-cleanouts" className="text-teal-600 underline">property managers</Link>, we provide certificates of insurance on request — emailed within 24 hours of your request via our <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-600 underline">contact page</Link>.
            </p>
            <p>
              <strong>Our People:</strong> We hire people who care about doing good work — and we invest in keeping them. Starting pay is $50/hr for crew members (see our <Link href="/careers" className="text-teal-600 underline">open positions</Link> or <Link href="/apply-for-junk-removal-job" className="text-teal-600 underline">apply today</Link>). Full-time crew members receive health insurance, PTO, and 401k. We promote from within — crew member to team lead ($60/hr) to operations manager. Low turnover means consistent, experienced crews showing up at your door. When you see the same faces on repeat jobs, you know they know what they&apos;re doing.
            </p>
            <p>
              <strong>Customer Satisfaction:</strong> We maintain a {RATING}-star rating across {REVIEW_COUNT} reviews. Over 40% of our jobs come from repeat customers and referrals. We back every job with a satisfaction guarantee — if anything isn&apos;t right, we make it right on the spot. No arguing, no follow-up calls, no runaround. Our crew will address the issue before they leave your property. That&apos;s the standard at We Pay You Junk Removal, and it&apos;s why people keep calling us back. Read what our customers say or check our <Link href="/blog" className="text-teal-600 underline">blog</Link> for junk removal tips and guides.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 29. BOTTOM CTA ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Ready to Get Paid for Your Junk?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Rates starting at $100/hr with dump fees included (an industry first). 50% Resale Credit (when applicable) on every item with value — furniture, appliances, electronics, tools, and more. {CITY_COUNT} cities across all {STATE_COUNT} states. Open {HOURS}, seven days a week, including weekends and holidays. Same-day service available for calls placed before noon. No contracts, no hidden fees, no minimum truck loads. Your stuff has value — stop giving it away to companies that profit from it without sharing. Text, call, or book online right now and see the difference.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {PHONE} — Most Popular
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {PHONE}
              </span>
            </a>
            <Link href="/book-junk-removal-service-today">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Book Now &amp; Save $10
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
