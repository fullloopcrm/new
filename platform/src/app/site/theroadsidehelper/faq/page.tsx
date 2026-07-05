import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF, FAQ } from "@/app/site/theroadsidehelper/_data/content";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { faqSchema, jsonLd } from "@/app/site/theroadsidehelper/_lib/schema";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "Roadside Assistance FAQ — $149/hr Pricing, 24/7 Hours, Service Q&A | (888) 944-3001",
  description:
    "Roadside assistance FAQ: $149/hr flat pricing, 24/7 dispatch, services covered, fleet accounts, vehicle types. Call (888) 944-3001. No memberships, no surcharges.",
  keywords: [
    "roadside assistance FAQ",
    "roadside cost",
    "roadside pricing questions",
    "24/7 roadside hours",
    "roadside service near me",
  ],
  path: "/faq",
});

const LEFT_FAQS = [
  { q: "How much does roadside assistance cost?", a: <>Flat $149 per hour with a 1-hour minimum. Same rate overnights, weekends, and holidays. No after-hours surcharges. Tow mileage past 5 miles, fuel at pump price, and replacement parts are billed separately at cost. See our <Link href="/pricing" className="text-emerald-700 font-semibold hover:underline">pricing page</Link>.</> },
  { q: "How fast can you get to me?", a: <>Average response is under 60 minutes in cities we serve. The dispatcher gives you a real ETA based on the nearest technician&apos;s current location. Highway breakdowns get priority dispatch.</> },
  { q: "Do I need a membership?", a: <>No. Pay-as-you-go. No annual fees, no contracts, no auto-renewals. You owe us nothing unless you actually need help.</> },
  { q: "Are you available 24/7?", a: <>Yes — 24 hours a day, 365 days a year. Same flat rate at every hour. No surcharges for overnights, weekends, or holidays.</> },
  { q: "What if my problem is bigger than expected?", a: <>The technician will quote any additional time before continuing. You&apos;re never billed for time we didn&apos;t quote you for. If we can&apos;t fix it roadside, we tow you to a shop.</> },
  { q: "Are you licensed and insured?", a: <>Fully licensed, bonded, and insured in every state we operate. If your vehicle is damaged during a service call, our liability insurance covers the repair at no cost to you.</> },
  { q: "How do I pay?", a: <>All major credit/debit cards, Apple Pay, Google Pay, Venmo, Zelle, CashApp, or cash. Payment collected on completion. Receipt emailed automatically.</> },
  { q: "Do you provide jump-start service?", a: <>Yes. Commercial-grade jump packs (not consumer cables) that protect modern vehicle electronics. After the jump, we run a quick voltage check to tell you whether the battery will hold a charge. See <Link href="/services/jump-start-service" className="text-emerald-700 font-semibold hover:underline">jump-start details</Link>.</> },
  { q: "Can you change a flat tire on the road?", a: <>Yes. Spare swap or on-site plug-and-inflate for tread punctures. Sidewall damage requires the spare. See <Link href="/services/flat-tire-change" className="text-emerald-700 font-semibold hover:underline">tire service</Link>.</> },
  { q: "What if I'm locked out of my car?", a: <>We use professional wedge-and-rod tools — no slim jims that damage power windows. Most lockouts take 5–15 minutes. See <Link href="/services/car-lockout-service" className="text-emerald-700 font-semibold hover:underline">lockout service</Link>.</> },
  { q: "What if I run out of gas?", a: <>We deliver 2–5 gallons of gasoline or diesel in approved containers. Fuel billed at pump price plus the service rate. See <Link href="/services/fuel-delivery-service" className="text-emerald-700 font-semibold hover:underline">fuel delivery</Link>.</> },
  { q: "Do you tow vehicles?", a: <>Yes. Flatbed for AWD/4WD and low-clearance vehicles, wheel-lift for standard sedans. 5 miles included in the standard rate, additional mileage at local per-mile rate. See <Link href="/services/tow-truck-service" className="text-emerald-700 font-semibold hover:underline">tow service</Link>.</> },
];

const RIGHT_FAQS = [
  { q: "Can you winch out a stuck vehicle?", a: <>Yes — snow, mud, sand, ditches, soft shoulders, snowbanks. Heavy-duty winches with proper rigging. We don&apos;t perform off-road recovery in true off-pavement scenarios. See <Link href="/services/winch-out-recovery" className="text-emerald-700 font-semibold hover:underline">winch-out service</Link>.</> },
  { q: "Can you replace my battery on-site?", a: <>Yes. We carry common Group 24, 35, 48, 65, and 78 batteries. Old battery recycled at no cost. See <Link href="/services/battery-replacement-on-site" className="text-emerald-700 font-semibold hover:underline">on-site battery replacement</Link>.</> },
  { q: "Do you service motorcycles?", a: <>Yes — by motorcycle-trained technicians only, with proper motorcycle tow trailers. Never a standard auto tech. See <Link href="/services/motorcycle-roadside" className="text-emerald-700 font-semibold hover:underline">motorcycle roadside</Link>.</> },
  { q: "Do you service RVs?", a: <>Yes. Class A, B, and C motorhomes and travel trailers. RV-trained techs, RV-sized tire inventory, recovery rigs rated for full-size coaches. See <Link href="/services/rv-roadside-service" className="text-emerald-700 font-semibold hover:underline">RV roadside</Link>.</> },
  { q: "Do you service diesel trucks?", a: <>Yes — light and medium-duty diesel (3/4-ton, 1-ton, work trucks). Diesel-trained techs, hand primers, glow plug testers, DEF on every truck. Heavy-duty Class 7-8 requires a specialist service we don&apos;t directly provide. See <Link href="/services/diesel-truck-roadside" className="text-emerald-700 font-semibold hover:underline">diesel roadside</Link>.</> },
  { q: "My key fob died — can you fix it?", a: <>Yes. We carry common CR2032, CR2025, CR2450 cells and the drivers needed to open most fob shells without breaking the clips. 5-minute job. See <Link href="/services/key-fob-battery" className="text-emerald-700 font-semibold hover:underline">key fob service</Link>.</> },
  { q: "Do you have fleet accounts?", a: <>Yes. Consolidated monthly billing, dedicated dispatch lines, real-time account portal, breakdown reporting. Same $149/hr flat rate per call. See <Link href="/commercial" className="text-emerald-700 font-semibold hover:underline">fleet accounts</Link>.</> },
  { q: "Do you work with rental car companies?", a: <>Yes — Hertz, Enterprise, Avis, Zipcar, Turo, Getaround. Direct rental company coordination on request. Arrival-condition documentation provided to protect renters from disputes.</> },
  { q: "Do you provide certificates of insurance?", a: <>Yes. COIs available on request for fleet customers, dealerships, and commercial accounts within 24 hours. We carry general liability, commercial auto, workers&apos; comp, and professional liability insurance. <Link href="/contact-the-roadside-helper" className="text-emerald-700 font-semibold hover:underline">Request a COI</Link>.</> },
  { q: "How do I book a roadside call?", a: <><a href={PHONE_HREF} className="text-emerald-700 font-semibold hover:underline">Call {PHONE}</a>, <a href={SMS_HREF} className="text-emerald-700 font-semibold hover:underline">text us</a>, or <Link href="/book-roadside-help-now" className="text-emerald-700 font-semibold hover:underline">book online</Link>. Most calls are dispatched within minutes.</> },
  { q: "What if I'm in a dangerous spot on the highway?", a: <>Tell the dispatcher and they prioritize your call. For active-traffic-lane situations, call 911 first — police can shut down a lane or provide a flashing-light buffer that makes the roadside response much safer.</> },
  { q: "What areas do you serve?", a: <>900+ cities across all 50 states. <Link href="/locations" className="text-emerald-700 font-semibold hover:underline">See all locations</Link>.</> },
];

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(FAQ)) }}
      />
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">Frequently Asked Questions</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            24/7 Roadside Assistance FAQ — Pricing, Hours, Services at $149/hr
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Pricing, response times, services, vehicle types, fleet accounts. The questions drivers actually ask.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Common Questions, Direct Answers</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Drivers Ask Us Most</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Still have a question? <Link href="/contact-the-roadside-helper" className="text-emerald-700 font-semibold hover:underline">Send us a message</Link> or call <a href={PHONE_HREF} className="text-emerald-700 font-semibold hover:underline">{PHONE}</a>.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
            <div className="space-y-6">
              {LEFT_FAQS.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              {RIGHT_FAQS.map((faq, i) => (
                <div key={i}>
                  <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Need Help Right Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Flat $149/hr. 24/7 dispatch. Call <a href={PHONE_HREF} className="text-amber-300 hover:underline">{PHONE}</a>.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}