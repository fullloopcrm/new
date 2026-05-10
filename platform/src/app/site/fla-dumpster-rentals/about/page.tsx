// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, SITE_URL, EMAIL, ADDRESS } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

export const metadata: Metadata = {
  title: "About Florida Dumpster Rentals | Fort Lauderdale, FL",
  description:
    "Florida Dumpster Rentals makes dumpster rental simple and affordable across all of Florida. Based in Fort Lauderdale, serving every city and county in the state. Call 954-710-2332.",
  alternates: { canonical: `${SITE_URL}/about` },
};

const phonePlain = PHONE.replace(/-/g, "");

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                About Us
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Dumpster Rental,{" "}
                <span className="text-orange-400">Done Right.</span>
              </h1>
              <p className="mt-5 text-lg text-stone-400">
                Florida Dumpster Rentals is a Fort Lauderdale-based dumpster rental
                service connecting customers across Florida with reliable, affordable
                roll-off containers. We partner with a statewide network of vetted
                local haulers to deliver 10, 20, and 30 yard dumpsters for every
                project &mdash; from garage cleanouts to large-scale construction.
              </p>
              <p className="mt-4 text-lg text-stone-400">
                One call or text gets you a quote, a delivery date, and a dumpster at
                your door. No runaround, no hidden fees, no hassle.
              </p>
              <CTAGroup variant="hero" />
              <p className="mt-6 text-sm text-stone-500">{ADDRESS}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="text-3xl font-extrabold text-white">67</div>
                <div className="mt-1 text-sm text-stone-400">Counties Served</div>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="text-3xl font-extrabold text-white">3</div>
                <div className="mt-1 text-sm text-stone-400">Dumpster Sizes</div>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="text-3xl font-extrabold text-orange-400">98%</div>
                <div className="mt-1 text-sm text-stone-400">On-Time Delivery</div>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="flex justify-center text-xl text-yellow-400">
                  {"\u2605\u2605\u2605\u2605\u2605"}
                </div>
                <div className="mt-1 text-sm text-stone-400">4.9 / 5 Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">Our Story</h2>
          <div className="mt-6 space-y-5 text-lg text-zinc-600 leading-8">
            <p>
              Florida Dumpster Rentals started with a simple observation: renting a
              dumpster in Florida was harder than it needed to be. Homeowners would
              call three or four companies trying to get a straight answer on
              pricing. Contractors would schedule a delivery and the dumpster would
              not show up on time. Invoices would arrive with fees nobody mentioned
              when the quote was given. The industry had a customer service problem,
              and we saw an opportunity to fix it.
            </p>
            <p>
              We are based in Fort Lauderdale and serve every county in the state
              of Florida. Rather than operating a single fleet out of one yard, we
              built a network of vetted hauler partners across every region — South
              Florida, Central Florida, Tampa Bay, North Florida, Southwest Florida,
              the Space Coast, the Treasure Coast, the Panhandle, the Nature Coast,
              and the Florida Keys. This model lets us offer same-day or next-day
              delivery across the entire state, not just in the metro area around
              our headquarters.
            </p>
            <p>
              Every hauler in our network is licensed, insured, and
              performance-tracked. We monitor on-time delivery rates, customer
              satisfaction scores, response times, and service quality metrics. If
              a hauler falls below our standards, they are removed from the
              network. This accountability loop means that the local driver who
              delivers your dumpster in Pensacola or Key West meets the same
              service standard as the driver who delivers in Fort Lauderdale.
            </p>
            <p>
              Our customers are homeowners tackling their first cleanout,
              experienced contractors managing multiple job sites, property
              managers overseeing dozens of units, real estate investors flipping
              houses, restoration companies cleaning up after storms, and
              businesses relocating or renovating their facilities. We serve all of
              them with the same approach: transparent pricing, reliable delivery,
              and responsive communication. The size of your project does not
              change the level of service you receive.
            </p>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">Our Mission</h2>
          <div className="mt-6 space-y-5 text-lg text-zinc-600 leading-8">
            <p>
              Our mission is simple: make dumpster rental easy and affordable for
              every person and business in Florida. Whether you&apos;re a homeowner
              cleaning out your garage, a contractor managing a job site, or a
              business handling a commercial cleanout &mdash; you deserve fast
              service, fair pricing, and a company that picks up the phone.
            </p>
            <p>
              The dumpster rental industry has a reputation for hidden fees,
              unreliable delivery, and poor communication. We built Florida Dumpster
              Rentals to be the opposite of that. Transparent quotes, on-time
              delivery, and a real person who responds to your texts and calls
              within minutes — not hours, not the next business day.
            </p>
            <p>
              We believe you shouldn&apos;t have to call five companies to get a
              straight answer on pricing. You shouldn&apos;t wonder if the dumpster
              will actually show up on the day you were promised. And you
              definitely shouldn&apos;t get hit with surprise charges after the
              fact. Every price we quote includes delivery, pickup, a 7-day
              rental period, and disposal up to the weight limit. That is the
              entire cost. No fuel surcharge, no environmental fee, no admin
              charge, no pickup fee.
            </p>
          </div>
        </div>
      </section>

      {/* Statewide Coverage */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Statewide Coverage, Local Service
          </h2>
          <p className="mt-3 text-lg text-stone-500">
            Based in Fort Lauderdale, serving all of Florida through our network
            of local hauler partners. We maintain dedicated dumpster inventory in
            every major region to ensure fast delivery regardless of your location.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "South Florida",
                desc: "Miami, Fort Lauderdale, West Palm Beach, Boca Raton, Hollywood, Pompano Beach, and all of Miami-Dade, Broward, and Palm Beach counties. Our home base with the fastest delivery times.",
              },
              {
                title: "Central Florida",
                desc: "Orlando, Tampa, St. Petersburg, Lakeland, Sarasota, Daytona Beach, and the entire I-4 corridor. Our busiest delivery zone outside of South Florida.",
              },
              {
                title: "North Florida",
                desc: "Jacksonville, Tallahassee, Gainesville, St. Augustine, and all of Northeast Florida. Same-day delivery available in the Jacksonville metro area.",
              },
              {
                title: "Southwest Florida",
                desc: "Naples, Fort Myers, Cape Coral, Bonita Springs, and all of Lee, Collier, and Charlotte counties. High demand for hurricane rebuild and renovation projects.",
              },
              {
                title: "Space Coast & Treasure Coast",
                desc: "Melbourne, Cocoa Beach, Vero Beach, Port St. Lucie, Stuart, and the entire eastern coastline from Cape Canaveral to the Palm Beach county line.",
              },
              {
                title: "Florida Keys & Panhandle",
                desc: "Key West, Key Largo, Marathon, Pensacola, Panama City, Destin, and Tallahassee. Yes, we deliver to the Keys and to the far western Panhandle.",
              },
            ].map((area) => (
              <div key={area.title} className="rounded-xl border border-zinc-200 bg-white p-6">
                <h3 className="font-semibold text-zinc-900">{area.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{area.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/areas"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Browse all 400+ service areas &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* How Our Model Works */}
      <section className="bg-stone-950 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">
            How Our Hauler Network Model Works
          </h2>
          <div className="mt-6 space-y-5 text-lg text-stone-300 leading-8">
            <p>
              Most dumpster rental companies operate a single fleet of trucks and
              containers out of one yard. That works fine if you live near their
              yard. But Florida is a big state — over 500 miles from Key West to
              Pensacola. A single-yard company in Miami cannot efficiently serve
              customers in Jacksonville, and vice versa.
            </p>
            <p>
              We solve this with a network model. Instead of owning a single
              fleet, we partner with established, reputable haulers in every
              major market across Florida. When you contact us for a dumpster in
              Tampa, we dispatch a Tampa-based hauler. When you need a container
              in the Keys, a Keys-based hauler handles the delivery. Every
              partner is selected based on equipment quality, insurance
              coverage, reliability track record, and customer service standards.
            </p>
            <p>
              This model gives you three advantages. First, faster delivery —
              because the truck is already in your market, we can offer same-day
              and next-day delivery almost anywhere in Florida. Second, local
              knowledge — our hauler partners know the roads, the landfill
              schedules, the permit requirements, and the placement challenges
              specific to their area. Third, consistent service — because we
              manage the customer relationship and hold every hauler to our
              standards, you get the same experience regardless of which hauler
              handles your delivery.
            </p>
            <p>
              You deal with us — one phone number, one point of contact, one
              invoice. The hauler partner handles the physical delivery and
              pickup. You never have to coordinate between multiple companies or
              wonder who to call if there is an issue. We are your single point
              of accountability from the moment you request a quote until the
              dumpster is picked up and gone.
            </p>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner />

      {/* What Sets Us Apart */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            What Sets Us Apart
          </h2>
          <div className="mt-10 space-y-8">
            {[
              {
                title: "Transparent, All-Inclusive Pricing",
                desc: "The price we quote is the price you pay. Delivery, pickup, rental period, and disposal are all included in one flat rate. The only extra charge is if you exceed the weight limit, and we will tell you before billing anything extra. No fuel surcharge, no environmental fee, no admin charge. We have seen what the hidden-fee approach does to customer trust, and we want no part of it.",
              },
              {
                title: "Same-Day and Next-Day Delivery",
                desc: "Because we work with multiple haulers in every market, we can almost always offer same-day or next-day delivery. Most single-hauler companies cannot match that availability — if their trucks are booked, you wait. Our network approach means there is almost always a hauler with availability in your area, even during peak season.",
              },
              {
                title: "Text-First Communication",
                desc: "We know you are busy. Text us your project details and get a quote back in minutes. Schedule delivery by text. Request pickup by text. Get delivery confirmation photos by text. You can always call if you prefer — but most of our customers love the speed and convenience of texting. No hold music, no phone trees, no waiting.",
              },
              {
                title: "Vetted Hauler Network",
                desc: "Every hauler in our network is licensed, insured, and performance-tracked. We monitor on-time delivery rates, customer satisfaction, response times, and equipment quality. If a hauler does not meet our standards, they are replaced. This accountability system means you get reliable service regardless of which partner handles your delivery.",
              },
              {
                title: "No Long-Term Contracts",
                desc: "Rent a dumpster when you need one. No subscriptions, no commitments, no minimum orders. Contractors who use us regularly get volume pricing, but there is never a lock-in or penalty for not ordering. Your business is earned on every single job, not locked in by a contract.",
              },
              {
                title: "Florida-Specific Expertise",
                desc: "We are not a national franchise operating in Florida — we are a Florida company that lives and breathes this state. We know which counties require permits, which landfills close early on Saturdays, which neighborhoods have narrow driveways, and which areas spike in demand after hurricane season. That local expertise translates into better service for you.",
              },
            ].map((item) => (
              <div key={item.title} className="border-b border-zinc-100 pb-8">
                <h3 className="text-xl font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-3 text-zinc-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">Who We Serve</h2>
          <div className="mt-6 space-y-5 text-lg text-zinc-600 leading-8">
            <p>
              <strong className="text-zinc-900">Homeowners:</strong> You have a
              garage full of stuff, a kitchen that needs gutting, a yard that needs
              clearing, or a house that needs emptying before a move. A dumpster in
              your driveway turns a week of dump runs into a simple weekend
              project. We help thousands of Florida homeowners every year with
              cleanouts, renovations, landscaping, and general decluttering. Most
              homeowners need a 10 or 20 yard dumpster and finish within the
              standard 7-day rental period.
            </p>
            <p>
              <strong className="text-zinc-900">Contractors and Builders:</strong>{" "}
              You need dumpsters on site reliably, on time, and at a competitive
              price. Our contractor program includes volume discounts, priority
              scheduling, NET-30 billing, same-day swap service, and a dedicated
              account manager. Whether you are running one residential renovation
              or managing ten commercial projects simultaneously, we match our
              service to your pace.
            </p>
            <p>
              <strong className="text-zinc-900">Property Managers:</strong> Tenant
              turnovers, unit renovations, common area cleanouts, and emergency
              cleanups all generate waste that exceeds normal trash service. We
              provide fast turnaround for property management companies with
              flexible scheduling and consolidated invoicing across multiple
              properties.
            </p>
            <p>
              <strong className="text-zinc-900">Real Estate Investors:</strong>{" "}
              Flipping houses means demolishing old materials and disposing of
              construction waste on a tight timeline. We understand the urgency of
              investment property timelines and provide same-day delivery to keep
              your renovation crew productive.
            </p>
            <p>
              <strong className="text-zinc-900">Businesses:</strong> Office
              relocations, warehouse cleanouts, retail space renovations,
              restaurant buildouts, and commercial demolition projects all require
              professional waste removal. We handle commercial accounts with proper
              insurance documentation, consolidated billing, and priority service
              scheduling.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-stone-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">By the Numbers</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "400+", label: "Florida Locations Served" },
              { stat: "3", label: "Dumpster Sizes Available" },
              { stat: "98%", label: "On-Time Delivery Rate" },
              { stat: "4.9", label: "Average Customer Rating" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="text-3xl font-extrabold text-orange-400">{item.stat}</div>
                <div className="mt-1 text-sm text-stone-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "We Answer Our Phone. Weird, Right?",
            body: "Most dumpster companies send you to voicemail or make you fill out a form and wait. We actually pick up. Text us, call us — you'll hear back in minutes, not hours. It shouldn't be revolutionary, but apparently it is.",
          },
          {
            title: "Ask About Hidden Fees Before You Book",
            body: "Some companies lure you in with a low base price, then tack on fuel surcharges, environmental fees, delivery fees, and admin charges. Always ask: \"Does this price include everything?\" With us, it does.",
          },
          {
            title: "Local Haulers Beat National Chains",
            body: "A company based in Florida knows which landfills close early, which counties require permits, and how to navigate a narrow Key West side street with a 30-yard container. That local knowledge saves you time, money, and headaches.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
