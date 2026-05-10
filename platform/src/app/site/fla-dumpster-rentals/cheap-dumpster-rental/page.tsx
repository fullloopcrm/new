// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import { PHONE, SITE_URL, getFAQPageSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";

export const metadata: Metadata = {
  title:
    "Affordable Dumpster Rental in Florida | Flat-Rate Pricing From $275 | Florida Dumpster Rentals",
  description:
    "Affordable dumpster rental across Florida starting at $275. Flat-rate pricing includes delivery, pickup & 7-day rental. No hidden fees. The best value in FL dumpster service. Call 954-710-2332.",
  openGraph: {
    title:
      "Affordable Dumpster Rental in Florida | Flat-Rate Pricing From $275 | Florida Dumpster Rentals",
    description:
      "Best-value dumpster rental in Florida. Flat-rate pricing from $275 with delivery, pickup & disposal included. No hidden fees, no surprises.",
    url: `${SITE_URL}/cheap-dumpster-rental`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/cheap-dumpster-rental` },
};

const phonePlain = PHONE.replace(/-/g, "");

const faqs = [
  {
    q: "What is the cheapest dumpster I can rent in Florida?",
    a: "Our 10-yard dumpster starts at $275 and includes delivery, pickup, a 7-day rental period, and disposal up to 2 tons. It holds about 4 pickup truck loads and is ideal for garage cleanouts, small renovations, and decluttering projects. This is the most affordable option available from any reputable dumpster company in Florida.",
  },
  {
    q: "Why is flat-rate pricing cheaper than hourly junk removal?",
    a: "With a dumpster rental, you pay one price for the container, the rental period, and disposal — regardless of how long it takes you to fill it. Junk removal services charge by the truck load or by the hour, and a typical renovation cleanout requires multiple trips at $300-$500 each. A $350 dumpster rental often replaces $800-$1,500 in junk removal fees for the same amount of debris.",
  },
  {
    q: "Are there any hidden fees I should watch out for?",
    a: "Not with us. Our price includes delivery, pickup, a 7-day rental, and disposal up to the weight limit. The only additional charges are weight overages if your load exceeds the limit, daily extensions if you keep the dumpster past 7 days, and prohibited materials fees if you dispose of items that require special handling. We disclose all of this before you book.",
  },
  {
    q: "How do I avoid overage charges?",
    a: "Choose the right size dumpster for your project — we help with this when you get your quote. Be mindful of heavy materials like concrete, brick, tile, and roofing shingles, as these reach the weight limit much faster than lighter debris. Cover your dumpster with a tarp during rain to prevent water weight accumulation. And when in doubt, size up — the cost difference is less than an overage fee.",
  },
  {
    q: "Is it cheaper to rent a dumpster or make multiple dump runs?",
    a: "For most projects, a dumpster is significantly cheaper. A single dump run costs $30-$75 in landfill fees plus your time, gas, and vehicle wear. Most renovation or cleanout projects require 4-12 trips. At $50 per trip, that is $200-$600 in fees alone — not counting the hours of your time. A 20-yard dumpster at $350 handles all of it in one rental.",
  },
  {
    q: "Do you offer contractor or volume discounts?",
    a: "Yes. Contractors, property managers, and repeat customers qualify for volume discounts of 15-25% off standard rates. The more dumpsters you rent, the lower your per-unit cost. We also offer NET-30 billing for qualified contractor accounts. Call 954-710-2332 to set up an account.",
  },
];

export default function CheapDumpsterRentalPage() {
  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Affordable Dumpster Rental in Florida",
              description:
                "Flat-rate dumpster rental across Florida starting at $275. All-inclusive pricing with delivery, pickup, and disposal included.",
              url: `${SITE_URL}/cheap-dumpster-rental`,
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
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Dumpster Rental Options",
                itemListElement: [
                  {
                    "@type": "Offer",
                    name: "10 Yard Dumpster",
                    price: "275",
                    priceCurrency: "USD",
                  },
                  {
                    "@type": "Offer",
                    name: "20 Yard Dumpster",
                    price: "350",
                    priceCurrency: "USD",
                  },
                  {
                    "@type": "Offer",
                    name: "30 Yard Dumpster",
                    price: "450",
                    priceCurrency: "USD",
                  },
                ],
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
                name: "Affordable Dumpster Rental",
                url: "/cheap-dumpster-rental",
              },
            ]}
            dark
          />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              Best Value in Florida
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Affordable Dumpster Rental
              <br />
              <span className="text-orange-500">
                Flat-Rate Pricing From $275
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              The best dumpster rental value in Florida is not the cheapest
              advertised price — it is the lowest total cost with no surprises.
              Our flat-rate pricing includes delivery, pickup, a 7-day rental,
              and disposal. One price, everything included, no hidden fees.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* Price Comparison Table */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Transparent Pricing — Every Size, Everything Included
          </h2>
          <p className="mt-4 text-lg text-stone-300">
            Here is exactly what each dumpster size costs and exactly what is
            included. No asterisks, no fine print, no &ldquo;call for
            pricing&rdquo; games.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-600">
                  <th className="pb-3 pr-6 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    Feature
                  </th>
                  <th className="pb-3 pr-6 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    10 Yard
                  </th>
                  <th className="pb-3 pr-6 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    20 Yard
                  </th>
                  <th className="pb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    30 Yard
                  </th>
                </tr>
              </thead>
              <tbody className="text-stone-300">
                {[
                  ["Starting Price", "$275", "$350", "$450"],
                  ["Capacity", "~4 truck loads", "~8 truck loads", "~12 truck loads"],
                  ["Weight Limit", "2 tons (4,000 lbs)", "3 tons (6,000 lbs)", "4 tons (8,000 lbs)"],
                  ["Rental Period", "7 days", "7 days", "7 days"],
                  ["Delivery", "Included", "Included", "Included"],
                  ["Pickup", "Included", "Included", "Included"],
                  ["Disposal", "Included", "Included", "Included"],
                  ["Extension Rate", "$15/day", "$20/day", "$25/day"],
                ].map(([feature, small, medium, large]) => (
                  <tr key={feature} className="border-b border-stone-700">
                    <td className="py-3 pr-6 font-semibold text-white">
                      {feature}
                    </td>
                    <td className="py-3 pr-6">{small}</td>
                    <td className="py-3 pr-6">{medium}</td>
                    <td className="py-3">{large}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-4">
            <Link
              href="/pricing"
              className="text-orange-400 hover:underline font-semibold"
            >
              Full pricing breakdown &rarr;
            </Link>
            <Link
              href="/dumpster-sizes"
              className="text-orange-400 hover:underline font-semibold"
            >
              Detailed size guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Hidden Fee Warning */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Hidden Fee Problem in Dumpster Rental
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              The dumpster rental industry has a transparency problem. Many
              companies advertise artificially low base prices — sometimes as
              low as $199 — then add fees after you have already committed.
              By the time the invoice arrives, the &ldquo;cheap&rdquo; rental
              costs 40-60% more than the advertised price.
            </p>
            <p>
              Here are the most common hidden fees to watch out for when
              comparing dumpster rental companies in Florida:
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {[
              {
                fee: "Fuel Surcharge",
                desc: "A $25-$75 charge for diesel fuel, added to every delivery and pickup. Some companies charge it twice — once for delivery, once for pickup.",
              },
              {
                fee: "Environmental / Disposal Fee",
                desc: "A $30-$100 charge for landfill disposal that is not included in the base price. The base price only covers the dumpster rental itself — not actually disposing of your debris.",
              },
              {
                fee: "Delivery Fee",
                desc: "A $50-$150 charge for delivering the dumpster to your location. Yes, delivery of the dumpster is sometimes listed as an extra on top of the rental price.",
              },
              {
                fee: "Admin / Processing Fee",
                desc: "A $15-$30 fee for processing your order. Some companies charge this per transaction on top of the rental cost.",
              },
              {
                fee: "Pickup Fee",
                desc: "A separate charge for picking up the full dumpster. Combined with the delivery fee, this means you are paying extra for the two most fundamental parts of the service.",
              },
              {
                fee: "Overweight Charges Without Warning",
                desc: "Many companies do not communicate weight overages before billing. You find out about the extra $150 charge when the invoice hits your email — with no opportunity to dispute it.",
              },
            ].map((item) => (
              <div
                key={item.fee}
                className="rounded-lg border border-red-900/50 bg-red-950/20 p-4"
              >
                <h3 className="font-semibold text-red-400">{item.fee}</h3>
                <p className="mt-1 text-sm text-stone-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-orange-800 bg-orange-950/30 p-6">
            <h3 className="text-xl font-bold text-orange-400">
              Our Pricing: Zero Hidden Fees
            </h3>
            <p className="mt-2 text-stone-300 leading-7">
              With Florida Dumpster Rentals, your quoted price includes delivery,
              pickup, a 7-day rental period, and disposal up to the weight
              limit. No fuel surcharge. No environmental fee. No delivery fee.
              No admin fee. No pickup fee. The price we quote is the price on
              your invoice. We have built our entire business around this
              principle because we believe transparent pricing is not a
              feature — it is a basic expectation.
            </p>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner
        title="Get the Best Value on Your Dumpster Rental"
        subtitle="Flat-rate pricing with everything included. Text or call for an instant quote — no obligation, no hidden fees."
      />

      {/* Why Flat-Rate Beats Junk Removal */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why a Dumpster Rental Is More Affordable Than Junk Removal
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Many homeowners default to hiring a junk removal service without
              realizing that a dumpster rental is almost always the better value
              for medium and large projects. The math is straightforward:
            </p>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="pb-3 pr-6 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    Comparison
                  </th>
                  <th className="pb-3 pr-6 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    Dumpster Rental
                  </th>
                  <th className="pb-3 text-sm font-semibold uppercase tracking-wider text-orange-400">
                    Junk Removal Service
                  </th>
                </tr>
              </thead>
              <tbody className="text-stone-300">
                {[
                  ["Small Cleanout (1-2 rooms)", "$275 (10 yard)", "$300-$500 (1-2 loads)"],
                  ["Kitchen Renovation", "$350 (20 yard)", "$600-$1,000 (2-3 loads)"],
                  ["Whole-House Cleanout", "$350-$450", "$1,200-$2,500 (4-8 loads)"],
                  ["Roof Tear-Off", "$350 (20 yard)", "$800-$1,500 (heavy loads)"],
                  ["Construction Debris", "$450 (30 yard)", "$1,500-$3,000 (multiple loads)"],
                  ["Loading", "You load at your pace", "They load (you pay for their time)"],
                  ["Time Frame", "7 days included", "Must be present during pickup"],
                  ["Scheduling", "Your schedule", "Their schedule"],
                ].map(([label, dumpster, junk]) => (
                  <tr key={label} className="border-b border-stone-800">
                    <td className="py-3 pr-6 font-semibold text-white">
                      {label}
                    </td>
                    <td className="py-3 pr-6 text-orange-400">{dumpster}</td>
                    <td className="py-3">{junk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-stone-300 leading-7">
            The only scenario where junk removal is the better value is for very
            small jobs — a single couch, a few bags of trash, one
            appliance — where a full dumpster would be overkill. For anything
            larger than a single truckload, the dumpster wins on cost, convenience,
            and flexibility.{" "}
            <Link
              href="/junk-removal-vs-dumpster-rental"
              className="text-orange-400 hover:underline"
            >
              Read our full comparison
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Tips to Save Money */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            7 Ways to Save Money on Your Dumpster Rental
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                title: "1. Choose the Right Size",
                desc: "The biggest mistake people make is renting a dumpster that is too small and needing a second one. The price difference between a 20-yard and a 30-yard is about $100 — but a second rental is $350 or more. When in doubt, go one size up. Text us a photo of your project and we will recommend the perfect size.",
              },
              {
                title: "2. Keep Heavy Materials Separate",
                desc: "Concrete, brick, tile, and roofing shingles are extremely heavy. Mixing them with lighter debris can push you over the weight limit and trigger overage charges. If your project involves both heavy and light materials, consider a dedicated load for heavy items and a separate load for everything else.",
              },
              {
                title: "3. Cover Your Dumpster During Rain",
                desc: "Florida rain can add hundreds of pounds of water weight to absorbent materials like drywall, cardboard, and insulation. A $10 tarp thrown over the dumpster between loading sessions can save you $50-$100 in weight overages. This is especially important during summer afternoon thunderstorm season.",
              },
              {
                title: "4. Break Down Large Items",
                desc: "Disassemble furniture, flatten cardboard boxes, and cut long boards to fit flat. Everything that lies flat instead of sticking up creates more usable space. Efficient loading means you fit more debris in one rental instead of needing two.",
              },
              {
                title: "5. Load Smart — Heavy on Bottom, Light on Top",
                desc: "Place heavy items on the bottom and work from back to front. Use the rear swing door for walk-in loading of heavy items. Fill gaps with smaller items. Smart loading maximizes capacity and keeps the load within weight limits.",
              },
              {
                title: "6. Finish Within 7 Days",
                desc: "Your rental includes a full 7-day period. Plan your project to complete loading within that window and you avoid daily extension charges. If you know you need more time, let us know upfront — we can arrange multi-week rates that are more economical than daily extensions.",
              },
              {
                title: "7. Ask About Contractor or Volume Pricing",
                desc: "If you rent dumpsters regularly — whether you are a contractor, property manager, or a homeowner with multiple projects — ask about our volume discounts. Savings of 15-25% add up quickly across multiple rentals.",
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

      {/* Dump Runs Comparison */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Dumpster Rental vs. DIY Dump Runs
          </h2>
          <div className="mt-6 space-y-4 text-stone-300 leading-7">
            <p>
              Some people consider renting a pickup truck or using their own
              vehicle to haul debris to the landfill themselves. While this
              might seem cheaper on the surface, the actual cost adds up fast
              when you factor in landfill fees, gas, time, and vehicle wear.
            </p>
            <p>
              A typical renovation project generates 4-12 truckloads of debris.
              Each trip to the landfill costs $30-$75 in dump fees, plus an hour
              of round-trip driving time. At 8 trips and $50 per trip, you are
              looking at $400 in fees and 8 hours of your day — more than the
              cost of a 20-yard dumpster that sits in your driveway for a full
              week while you load at your own pace.
            </p>
            <p>
              The math gets even worse if you are renting a truck to make those
              runs. Truck rental plus fuel plus dump fees plus your time can
              easily exceed $600-$800 for a project that a single $350 dumpster
              handles with zero effort on your part beyond loading.
            </p>
            <p>
              The dumpster is not just more affordable — it is also more
              convenient. You load on your schedule over 7 days. You do not need
              to make repeated trips. You do not need to deal with landfill
              hours, scales, and paperwork. You do not need to worry about
              debris flying out of your truck bed on the highway. Load it, call
              us, and we take care of the rest.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Affordable Dumpster Rental FAQ
          </h2>
          <div className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-stone-600 pb-6">
                <h3 className="text-lg font-semibold">{faq.q}</h3>
                <p className="mt-2 text-stone-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Explore More</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { href: "/pricing", label: "Full Pricing Details" },
              { href: "/dumpster-sizes", label: "Dumpster Size Guide" },
              { href: "/free-quote", label: "Get a Free Quote" },
              { href: "/services", label: "All Dumpster Services" },
              {
                href: "/junk-removal-vs-dumpster-rental",
                label: "Junk Removal vs. Dumpster Rental",
              },
              { href: "/contractor-program", label: "Contractor Program" },
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
            title: "The Cheapest Option Is the Right Size",
            body: "A too-small dumpster that needs to be swapped costs way more than getting the right size upfront. Text us a photo of your project and we'll recommend the most cost-effective option. Getting it right the first time is always the best deal.",
          },
          {
            title: "Tarp It Between Sessions",
            body: "Florida's afternoon storms can add hundreds of pounds of water to your dumpster. Throw a tarp over it when you're not loading. A $10 tarp from Home Depot can save you $100 in overage fees. That's the best ROI you'll get all week.",
          },
          {
            title: "Compare Total Cost, Not Base Price",
            body: "When shopping dumpster companies, ask one question: 'What is my total, out-the-door cost including delivery, pickup, rental, and disposal?' Any company that can't give you a single all-inclusive number is hiding fees. We always can.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
