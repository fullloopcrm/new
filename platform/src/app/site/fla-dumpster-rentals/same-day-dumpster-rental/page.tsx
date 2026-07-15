import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import { PHONE, SITE_URL, getFAQPageSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";

export const metadata: Metadata = {
  title:
    "Same-Day Dumpster Rental Florida | Emergency & Rush Delivery | Florida Dumpster Rentals",
  description:
    "Same-day dumpster rental across Florida. Emergency and rush delivery available 7 days a week. 10, 20 & 30 yard roll-off containers with flat-rate pricing. Call or text 954-710-2332 now.",
  openGraph: {
    title:
      "Same-Day Dumpster Rental Florida | Emergency & Rush Delivery | Florida Dumpster Rentals",
    description:
      "Same-day and emergency dumpster delivery across Florida. Call or text before noon for same-day drop-off. Flat-rate pricing, no rush fees.",
    url: `${SITE_URL}/same-day-dumpster-rental`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/same-day-dumpster-rental` },
};

const phonePlain = PHONE.replace(/-/g, "");

const faqs = [
  {
    q: "How do I get same-day dumpster delivery in Florida?",
    a: "Text or call us at 954-710-2332 before noon with your delivery address, preferred dumpster size, and project details. In most Florida markets, we can deliver a dumpster to your location the same day. We keep inventory staged across every major region of the state, which allows us to respond fast even on short notice.",
  },
  {
    q: "Is there an extra charge for same-day delivery?",
    a: "No. Same-day delivery is available at our standard flat-rate pricing. There is no rush fee, no expedited delivery surcharge, and no premium for short-notice orders. You pay the same all-inclusive price whether you book a week in advance or call us at 8 AM for a same-day drop-off.",
  },
  {
    q: "What if I need a dumpster delivered on the weekend?",
    a: "We offer delivery Monday through Saturday in most Florida markets. Saturday delivery is available at standard pricing with no weekend surcharge. Sunday delivery is available in select areas — contact us to confirm availability for your location. For emergencies, we do everything possible to accommodate any day of the week.",
  },
  {
    q: "How quickly can I get a dumpster picked up in an emergency?",
    a: "For emergency pickups, we can typically schedule same-day or next-day removal. If you have a full dumpster that needs to be hauled away urgently — for example, before a property inspection, a closing, or to clear space for emergency repairs — call us and we will prioritize the pickup.",
  },
  {
    q: "Do you offer same-day service in rural areas of Florida?",
    a: "Same-day delivery is available across most of Florida, including many rural areas. However, some remote locations may require next-day scheduling due to hauler distance. When you contact us with your address, we will confirm same-day availability immediately. Next-day delivery is guaranteed statewide for all orders placed by 5 PM.",
  },
  {
    q: "What happens if same-day delivery is not available for my area?",
    a: "If same-day is not available due to inventory or hauler scheduling in your area, we guarantee next-day delivery. We will communicate this immediately when you contact us — no runaround, no false promises. In practice, same-day delivery is available for the vast majority of Florida addresses on most days.",
  },
];

export default function SameDayDumpsterRentalPage() {
  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd([
            {
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Same-Day Dumpster Rental in Florida",
              description:
                "Same-day and emergency dumpster delivery across Florida. 10, 20 & 30 yard roll-off containers with flat-rate pricing and no rush fees.",
              url: `${SITE_URL}/same-day-dumpster-rental`,
              provider: {
                "@type": "Organization",
                name: "Florida Dumpster Rentals",
                url: SITE_URL,
                telephone: PHONE,
              },
              areaServed: {
                "@type": "State",
                name: "Florida",
              },
            },
            getFAQPageSchema(faqs),
          ]),
        }}
      />

      {/* Hero */}
      <section className="bg-stone-950 pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              {
                name: "Same-Day Dumpster Rental",
                url: "/same-day-dumpster-rental",
              },
            ]}
            dark
          />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              Need It Today? We Deliver Today.
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Same-Day Dumpster Rental
              <br />
              <span className="text-orange-500">Across Florida</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              When you need a dumpster now, not next week, we deliver. Text or
              call before noon and we drop off a 10, 20, or 30 yard container
              the same day — at our standard flat-rate price with no rush fees.
              Emergency and short-notice delivery available 7 days a week.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* How Same-Day Works */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How Same-Day Dumpster Delivery Works
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            Same-day delivery is not an upsell or a premium service — it is how
            we operate. We maintain dumpster inventory staged across every major
            Florida region so we can respond to same-day requests as a matter of
            routine, not as a special exception.
          </p>

          <div className="mt-10 space-y-8">
            {[
              {
                step: "1",
                title: "Contact Us Before Noon",
                desc: "Text or call 954-710-2332 with your delivery address, the dumpster size you need, and your project details. For same-day delivery in most Florida markets, contacting us before noon gives us the window to schedule and dispatch. Orders placed after noon receive next-day delivery in most cases.",
              },
              {
                step: "2",
                title: "Get Instant Confirmation",
                desc: "We confirm same-day availability, give you a flat-rate price, and schedule your delivery window. No back-and-forth emails, no waiting for a callback. You know within minutes whether same-day delivery is confirmed for your address.",
              },
              {
                step: "3",
                title: "Dumpster Delivered Same Day",
                desc: "Our hauler delivers the dumpster to your specified location within the confirmed window. You receive a photo confirmation after placement. The dumpster is ready to load immediately upon delivery. Your 7-day rental period starts on delivery day.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-xl font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-stone-300 leading-7">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Availability Hours */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Delivery Hours &amp; Availability
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Our standard delivery windows are Monday through Saturday, 7 AM to
              5 PM. Same-day delivery is available for orders placed before noon
              in most Florida markets. Next-day delivery is guaranteed for all
              orders placed by 5 PM, any day of the week.
            </p>
            <p>
              We deliver across the entire state of Florida — from the Keys to
              the Panhandle, from the Atlantic coast to the Gulf coast, and every
              city, county, and community in between. Our hauler network covers
              every zip code in the state. Some rural or island communities may
              require next-day scheduling rather than same-day, but we
              communicate this immediately when you contact us.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Same-Day Delivery",
                desc: "Orders placed before noon, Monday-Saturday. Available in most Florida metro and suburban areas.",
              },
              {
                title: "Next-Day Delivery",
                desc: "Guaranteed for all orders placed by 5 PM. Available statewide including rural areas.",
              },
              {
                title: "Weekend Delivery",
                desc: "Saturday delivery at standard pricing, no surcharge. Sunday available in select markets.",
              },
              {
                title: "Emergency Delivery",
                desc: "Storm damage, burst pipes, urgent cleanouts. We prioritize emergency requests and work outside standard hours when needed.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-stone-700 bg-stone-800/50 p-6"
              >
                <h3 className="text-lg font-bold text-orange-400">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-300">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Scenarios */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Emergency &amp; Urgent Dumpster Scenarios
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            Life does not always give you advance notice. Here are the most
            common emergency situations where same-day dumpster delivery makes
            the difference between a crisis and a controlled cleanup.
          </p>

          <div className="mt-8 space-y-6">
            {[
              {
                title: "Storm Damage Cleanup",
                desc: "Florida hurricanes, tropical storms, and severe thunderstorms leave behind massive amounts of debris — fallen trees, damaged fencing, broken roofing materials, flooded drywall, and ruined furniture. After a storm, you need debris removed fast so repairs can begin. We ramp up capacity during storm season and prioritize emergency deliveries to storm-affected areas. If you see a storm approaching, booking a dumpster before it hits guarantees you have a container when your neighbors are waiting in a queue.",
              },
              {
                title: "Burst Pipes &amp; Water Damage",
                desc: "A burst pipe or flooding event means ripping out waterlogged drywall, insulation, carpet, and damaged personal property immediately to prevent mold growth. Florida's heat and humidity accelerate mold development, making fast debris removal critical. Same-day dumpster delivery lets you start the remediation process the day the damage occurs rather than waiting days for a container while mold takes hold.",
              },
              {
                title: "Urgent Property Cleanouts",
                desc: "Sometimes you need a property cleaned out on a tight deadline — a foreclosure clearing, a fast closing, a tenant eviction cleanup, or an estate cleanout that has been delayed. When the deadline is measured in days rather than weeks, same-day dumpster delivery gives you the full 7-day rental period starting immediately instead of losing days waiting for a container.",
              },
              {
                title: "Fire Damage Debris Removal",
                desc: "After a fire, damaged materials need to be removed before restoration can begin. Charred building materials, smoke-damaged furnishings, and fire debris all need to go. Insurance adjusters often need the property cleared quickly for assessment. A same-day dumpster lets you begin cleanup immediately while the insurance process unfolds.",
              },
              {
                title: "Construction Schedule Recovery",
                desc: "When a construction project falls behind schedule and debris is piling up on site, you cannot afford to wait for a dumpster delivery next week. Contractors call us for same-day drops when a dumpster fills faster than expected, when a swap is needed immediately, or when a new phase generates unexpected debris. Our priority scheduling for contractor accounts ensures your job site never stalls because of a missing container.",
              },
              {
                title: "Unexpected Demolition Needs",
                desc: "Sometimes a renovation reveals unexpected problems — rotted framing, water damage behind walls, termite damage — that turn a small remodel into a significant demolition. When the scope of your project suddenly doubles, you need a dumpster fast. Same-day delivery lets you keep working instead of pausing the project while you wait for waste removal logistics to catch up.",
              },
            ].map((item) => (
              <div key={item.title} className="border-b border-stone-600 pb-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-stone-300 leading-7">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner
        title="Need a Dumpster Today? We Can Make It Happen."
        subtitle="Text or call right now for same-day delivery. No rush fees, no premium pricing — just fast service at our standard flat rate."
      />

      {/* Coverage Areas */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Same-Day Coverage Across Florida
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              We offer same-day dumpster delivery across the entire state of
              Florida. Our hauler network is strategically distributed so that
              every major metro area, suburban community, and most rural towns
              are within same-day reach. Here are some of the key regions we
              serve with same-day capability:
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "South Florida (Miami, Fort Lauderdale, West Palm Beach)",
              "Tampa Bay (Tampa, St. Petersburg, Clearwater)",
              "Orlando & Central Florida",
              "Jacksonville & Northeast Florida",
              "Southwest Florida (Naples, Fort Myers, Cape Coral)",
              "Space Coast (Melbourne, Cocoa Beach, Titusville)",
              "Treasure Coast (Port St. Lucie, Stuart, Vero Beach)",
              "Gainesville & North Central Florida",
              "Pensacola & The Panhandle",
              "Daytona Beach & Volusia County",
              "Sarasota & Manatee County",
              "Tallahassee & The Big Bend",
            ].map((area) => (
              <div key={area} className="flex items-start gap-2">
                <span className="mt-0.5 text-orange-400">&#10003;</span>
                <span className="text-stone-300 text-sm">{area}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href="/areas"
              className="text-orange-400 hover:underline font-semibold"
            >
              View all Florida service areas &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Why No Rush Fees */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why We Do Not Charge Rush Fees
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Many dumpster companies treat same-day delivery as a premium
              service and charge $50-$150 extra for expedited scheduling. We
              think that is wrong. Fast delivery should be the standard, not an
              upsell.
            </p>
            <p>
              We maintain enough inventory and hauler capacity to offer same-day
              service as part of our normal operations. It is not a special
              favor — it is how we are built. We pre-position containers across
              Florida so that a same-day request is not a logistical scramble
              but a routine dispatch. That infrastructure investment means we
              can offer same-day delivery at the same flat rate as a scheduled
              delivery.
            </p>
            <p>
              When you are dealing with storm damage, a burst pipe, or an
              urgent deadline, the last thing you should worry about is paying
              extra because you need a dumpster today instead of three days
              from now. Same price, same service, faster delivery. That is how
              it should work.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Same-Day Dumpster Rental FAQ
          </h2>
          <div className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-stone-800 pb-6">
                <h3 className="text-lg font-semibold">{faq.q}</h3>
                <p className="mt-2 text-stone-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Related Pages</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                href: "/storm-debris-dumpster-rental",
                label: "Storm Debris Dumpster Rental",
              },
              { href: "/how-it-works", label: "How Dumpster Rental Works" },
              { href: "/areas", label: "Florida Service Areas" },
              { href: "/free-quote", label: "Get a Free Quote" },
              { href: "/pricing", label: "Dumpster Rental Pricing" },
              { href: "/services", label: "All Dumpster Services" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-stone-700 px-4 py-3 text-orange-400 hover:border-orange-600 hover:bg-orange-600/10 font-semibold"
              >
                {link.label} &rarr;
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Book Before the Storm Hits",
            body: "If you see a hurricane or tropical storm heading toward Florida, book your dumpster before it arrives. Post-storm demand spikes 300-500% and availability evaporates within hours. Pre-booking guarantees you have a container ready when the cleanup starts.",
          },
          {
            title: "Text for the Fastest Response",
            body: "Texting is faster than calling for same-day requests. Send us your address, the size you need, and when you want it — we can usually confirm and schedule a same-day delivery in under 5 minutes via text.",
          },
          {
            title: "Clear the Delivery Area Early",
            body: "If you're requesting same-day delivery, make sure the placement area is clear before you contact us. Move cars, trash cans, and obstacles so the driver can drop the dumpster as soon as they arrive. Every minute counts on a same-day turnaround.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
