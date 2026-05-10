// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/nyc-tow/_data/content";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { FAQ } from "@/app/site/nyc-tow/_data/content";
import { JsonLd, breadcrumbSchema, faqPageSchema } from "@/app/site/nyc-tow/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Tow Truck FAQ — Pricing, AWD, EV, Impound & 30+ More Questions",
  description: "Common questions about NYC towing and roadside service. Pricing, flatbed vs. wheel-lift, AWD and EV procedures, impound recovery, fleet accounts, insurance billing.",
  alternates: { canonical: "/faq" },
};

const LEFT_FAQS = [
  { q: "How fast can you get to me in NYC?", a: <>Typical arrival is 20–40 minutes across all five boroughs. Trucks staged in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Peak rush hour (5–7 PM weekdays) and severe weather can extend that. Dispatch will always give you an honest ETA on the call.</> },
  { q: "How does your pricing work?", a: <>Flat-rate, quoted on the phone before we dispatch. Light-duty tows start at $125 base, flatbed at $175 base. Roadside services (jump, tire, lockout, gas) are $85 flat. See full <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing breakdown</Link>.</> },
  { q: "Do you tow AWD or EV vehicles?", a: <>Yes — on flatbed, always. AWD and 4WD drivetrains get destroyed if dragged on wheels. EVs (Tesla, Rivian, Lucid, Mach-E, etc.) also require flatbed. Tell dispatch the year/make/model and we&apos;ll send the right truck. See our <Link href="/blog/flatbed-vs-wheel-lift-which-does-your-car-need" className="text-teal-700 font-semibold hover:underline">flatbed vs. wheel-lift guide</Link>.</> },
  { q: "What if I just need a jump or a tire change?", a: <>That&apos;s our roadside flat rate — $85 per call. Dispatch routes the nearest truck, typical arrival 20–40 minutes. If the job turns out to need a tow, we credit the roadside fee against the tow. See <Link href="/services/roadside-assistance" className="text-teal-700 font-semibold hover:underline">roadside details</Link>.</> },
  { q: "My car got towed by NYPD. Can you help?", a: <>Yes — we run an <Link href="/services/impound-recovery" className="text-teal-700 font-semibold hover:underline">impound recovery service</Link>. We handle the pound paperwork, pay the release fees (itemized on your invoice), and physically retrieve the vehicle. Saves you a lost day.</> },
  { q: "Do you handle insurance billing?", a: <>Yes, for accident and collision tows we bill your carrier directly in most cases. Every major NYC carrier. You provide carrier name and claim number, we handle the paperwork. See <Link href="/services/accident-recovery" className="text-teal-700 font-semibold hover:underline">accident recovery</Link>.</> },
  { q: "Are you licensed and insured?", a: <>NYC DCWP tow license, commercial auto insurance, garage liability, and on-hook insurance on every truck. COI available within 24 hours for fleet and property-manager accounts.</> },
  { q: "Do you run 24/7?", a: <>Yes — 24 hours a day, 365 days a year. Overnight rates match daytime. Holiday rates match weekdays. Snowstorm operations run as long as roads are safe. See <Link href="/services/emergency-247-towing" className="text-teal-700 font-semibold hover:underline">24/7 emergency service</Link>.</> },
  { q: "How does the flat rate work past the first five miles?", a: <>First five miles included in the base. Light-duty: $4 per mile after five. Flatbed: $5 per mile after five. Quoted on the phone before dispatch — you know the total before we move.</> },
  { q: "Can you tow my motorcycle?", a: <>Yes — flatbed with proper front-wheel chock and frame or peg tie-downs. No handlebar straps. Sport bikes, cruisers, tourers, scooters. See <Link href="/services/motorcycle-towing" className="text-teal-700 font-semibold hover:underline">motorcycle towing</Link>.</> },
  { q: "What about heavy-duty trucks and commercial vehicles?", a: <>Heavy wreckers rated for Class 6–8 vehicles. Box trucks, sprinters, commercial rigs. DOT-compliant recovery, cargo preservation protocols, and the paperwork your logistics dispatcher needs. See <Link href="/services/heavy-duty-towing" className="text-teal-700 font-semibold hover:underline">heavy-duty towing</Link>.</> },
  { q: "Do you remove junk cars?", a: <>Yes — often for cash. Scrap value depends on weight, catalytic converter condition, aluminum wheels, and market pricing. Title transfer handled at pickup. See <Link href="/services/junk-car-removal" className="text-teal-700 font-semibold hover:underline">junk car removal</Link>.</> },
  { q: "Can I book in advance for a scheduled tow?", a: <>Yes. Book 24–48 hours ahead and we&apos;ll hit a 30-minute arrival window. Works for planned moves — car going from home to a shop, fleet relocations, pre-arranged service appointments.</> },
  { q: "What if my car is in a parking garage?", a: <>Tell dispatch the garage name and clearance height if you know it. Many NYC luxury building garages have clearance under 7 feet — we send a wheel-lift truck for those, or pre-position the vehicle to a spot a flatbed can reach. Decision happens on the call.</> },
];

const RIGHT_FAQS = [
  { q: "How are you different from AAA or credit-card roadside?", a: <>National networks subcontract to whoever&apos;s cheapest. In NYC, that means 60–90 minute waits from operators who don&apos;t know the streets. We&apos;re the local licensed operator those networks call when they do the job right. See our <Link href="/blog/roadside-vs-national-network" className="text-teal-700 font-semibold hover:underline">local vs. national comparison</Link>.</> },
  { q: "Do you run fleet accounts?", a: <>Yes — priority dispatch, consistent drivers, net-30 consolidated billing, and COI on file. Works for DSPs, rideshare, delivery, rental, contractor fleets, body shops, and property managers. See <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">fleet accounts</Link>.</> },
  { q: "My tenant / guest keeps parking in our fire lane. Can you tow?", a: <>Yes — we run <Link href="/services/illegally-parked-towing" className="text-teal-700 font-semibold hover:underline">private-property tow accounts</Link> for landlords and property managers. Full NYC DCWP regulatory compliance on signage, photo documentation, and rate caps. Setup is fast.</> },
  { q: "What items / vehicles do you NOT handle?", a: <>Hazmat materials — for those, the shipper must call a licensed hazmat recovery operator. We handle everything else on wheels: cars, motorcycles, trucks, vans, EVs, luxury, classic cars, and commercial vehicles.</> },
  { q: "Can you deliver gas or diesel?", a: <>Yes — 2 gallons standard. Gasoline or diesel. Flat-rate delivery fee plus fuel at cost plus a small handling fee. Enough to get you to a pump. See <Link href="/services/gas-delivery" className="text-teal-700 font-semibold hover:underline">gas delivery</Link>.</> },
  { q: "Will a slim jim fry my airbag?", a: <>On modern cars (built after about 2010): yes, it can. Side-impact airbags in the door modules get destroyed by slim-jim entry. We don&apos;t use slim jims — we use air wedges and long-reach tools. See <Link href="/blog/locked-out-of-your-car-nyc" className="text-teal-700 font-semibold hover:underline">lockout service details</Link>.</> },
  { q: "Do you charge extra overnight or on holidays?", a: <>No. Overnight, weekend, and holiday rates match daytime rates. No surge pricing, no after-hours markup. If anyone quotes you an overnight premium in NYC, that&apos;s a red flag.</> },
  { q: "Can you tow to NJ, CT, or upstate NY?", a: <>Yes — flatbed, flat-rate quoted on destination. Regular runs to NJ, CT, upstate NY, eastern PA, MA, and the Northeast corridor. See <Link href="/services/long-distance-towing" className="text-teal-700 font-semibold hover:underline">long-distance towing</Link>.</> },
  { q: "What about accident / collision tows?", a: <>Full scene management — cleanup, proper loading of damaged vehicles, timestamped photo documentation, direct insurance billing, and drop at your insurance-approved body shop. See <Link href="/services/accident-recovery" className="text-teal-700 font-semibold hover:underline">accident recovery</Link>.</> },
  { q: "Do I have to stay with my car?", a: <>Yes — safer for you and for us. Stay in the vehicle with hazards on. If you must leave briefly (bathroom, shelter), text dispatch so the driver knows to call on arrival. Do not walk a highway shoulder.</> },
  { q: "What if I&apos;m on a bridge or in a tunnel?", a: <>Call 911 first. The bridge or tunnel authority has to manage the scene before any tow operator can safely approach. Once scene is clear, we can execute the tow.</> },
  { q: "What payment methods do you accept?", a: <>All major credit and debit cards, Apple Pay, Google Pay, and cash. Receipts emailed within minutes. For accident tows, direct billing to insurance in most cases.</> },
  { q: "How do I book or call dispatch?", a: <><a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">Call {PHONE}</a>, <a href={SMS_HREF} className="text-teal-700 font-semibold hover:underline">text the same number</a>, or use our <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">request page</Link>. Phone is fastest for immediate service.</> },
  { q: "What if I need to dispute a charge?", a: <>NYC DCWP regulates tow pricing. If your invoice has charges above posted caps or surcharges that shouldn&apos;t exist (NYC surcharge, after-hours markup, same-day storage fee), dispute it directly with us first, then file a 311 complaint if unresolved. We run clean and stand by our invoices.</> },
];

export default function FAQPage() {
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "FAQ", url: "/faq" },
          ]),
          faqPageSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Common Questions About NYC Towing</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">NYC Tow Truck FAQ</span> — Pricing, Procedures &amp; 24/7 Dispatch Answers
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Pricing, AWD and EV procedures, impound recovery, fleet accounts, insurance billing. Honest answers, no dropdowns, no games.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Frequently Asked Questions</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Still have questions? <Link href="/contact-nyc-towing-today" className="text-teal-700 font-semibold hover:underline">Contact us</Link>, call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a>, or use the <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">request page</Link>.
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

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How NYC Towing Should Work</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The NYC tow industry has a reputation problem — bait-and-switch pricing, vehicles hauled to unauthorized yards, storage fees that appear overnight, and operators who don&apos;t know how to handle modern vehicles. Much of that reputation is earned. The industry needs a cleaner default.</p>
            <p>Our model is built for that: flat-rate pricing quoted on the phone before dispatch. NYC DCWP licensed. Commercial auto, garage liability, and on-hook insurance on every truck. W-2 employee drivers, not gig workers. Timestamped photo documentation on every job. Receipts emailed within minutes. Vehicles go where you direct — never to our yard without your explicit okay.</p>
            <p>The result: faster response, honest pricing, and drivers who actually know what a flatbed is for. It&apos;s the way NYC towing should work — and the way it does work when you call a licensed local operator directly instead of a national dispatch network.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Need Dispatch Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">
            Call, text, or request service online. 24/7, any borough.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
