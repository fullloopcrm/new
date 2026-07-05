import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

export const metadata: Metadata = {
  title: "Dumpster Rental Pricing Florida | Florida Dumpster Rentals",
  description:
    "Transparent dumpster rental pricing in Florida. 10, 20 & 30 yard roll-off containers starting at $275. Delivery, pickup & 7-day rental included. Call 954-710-2332.",
  openGraph: {
    title: "Dumpster Rental Pricing Florida | Florida Dumpster Rentals",
    description:
      "Transparent dumpster rental pricing. 10, 20 & 30 yard roll-off dumpsters starting at $275. Free delivery, pickup & 7-day rental included.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/pricing` },
};

const faqs = [
  {
    q: "What is the cheapest dumpster I can rent in Florida?",
    a: "Our 10 yard dumpster starts at $275 and is perfect for small cleanouts, garage declutters, and single-room renovations. It includes delivery, pickup, and a 7-day rental period. This is our most affordable option and handles about 4 pickup truck loads of debris.",
  },
  {
    q: "Are there any hidden fees with your dumpster rentals?",
    a: "No. Your quoted price includes delivery, pickup, a 7-day rental period, and disposal up to the weight limit for your dumpster size. The only additional charges are for exceeding the weight limit, keeping the dumpster past 7 days, or disposing of prohibited materials. We quote you one price and that is what you pay.",
  },
  {
    q: "How long can I keep the dumpster?",
    a: "Every rental includes a standard 7-day rental period. Need it longer? Extra days are $15/day for 10 yard, $20/day for 20 yard, and $25/day for 30 yard dumpsters. Most customers finish within the included 7 days, but there is no penalty for extending — just let us know.",
  },
  {
    q: "Do you offer same-day dumpster delivery in Florida?",
    a: "Yes, same-day delivery is available in most Florida service areas when you call or text before noon. Next-day delivery is guaranteed for all orders placed by 5 PM. We maintain inventory staged across every major Florida region to ensure fast turnaround.",
  },
  {
    q: "What happens if I go over the weight limit?",
    a: "Overage fees are $40-$60 per additional ton depending on your dumpster size and location. We communicate any overage charges before billing — no surprises. Most residential projects stay well within the included weight allowance. If you are working with heavy materials like concrete, tile, or roofing shingles, tell us upfront and we will help you avoid overages.",
  },
  {
    q: "Do you offer discounts for contractors?",
    a: "Yes. We offer volume pricing for contractors, property managers, and repeat customers. If you need regular dumpster service, multiple containers on the same job, or ongoing service across several projects, call us at 954-710-2332 for contractor rates. We also offer NET-30 billing for established accounts.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards, debit cards, and cash. Payment is due at the time of delivery. Contractors with established accounts can arrange NET-30 billing. We do not charge a deposit — you pay the flat rate at delivery and that covers everything.",
  },
  {
    q: "Can I change my dumpster size after ordering?",
    a: "Yes. If you realize you need a bigger or smaller dumpster before delivery, call us and we will adjust the order at no charge. If you have already received a dumpster and need to swap, we can arrange a same-day or next-day exchange. We would rather you have the right size than pay for a dumpster that does not fit your project.",
  },
  {
    q: "How does dumpster rental pricing work compared to junk removal services?",
    a: "Dumpster rental is almost always more cost-effective than junk removal for medium to large projects. With a dumpster, you load at your own pace over 7 days and pay one flat rate. Junk removal services charge by volume or weight per trip and require you to be present during loading. A $350 dumpster rental replaces what might cost $800-$1,500 in junk removal service for the same amount of debris.",
  },
  {
    q: "Is it cheaper to rent a dumpster or make multiple dump runs?",
    a: "For most projects, a dumpster is significantly cheaper. A single dump run in Florida costs $30-$75 in landfill fees plus your time, gas, and vehicle wear. Most renovation or cleanout projects require 4-12 trips. At $50 average per trip, that is $200-$600 in dump fees alone — not counting the 8-24 hours of your time. A 20 yard dumpster at $350 handles all of it in one shot.",
  },
];

const phonePlain = PHONE.replace(/-/g, "");

export default function PricingPage() {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="bg-stone-950 pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Pricing", url: "/pricing" }]} />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              Simple, Transparent Pricing
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Dumpster Rental Pricing
              <br />
              <span className="text-orange-500">No Hidden Fees. Ever.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              Every price includes delivery, pickup, a 7-day rental period, and
              disposal up to the weight limit. Pick your size, schedule your
              drop-off, and we handle the rest. Flat-rate pricing across all of
              Florida with no fuel surcharges, no environmental fees, and no
              surprise charges on your invoice.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* How Our Pricing Works */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How Our Dumpster Rental Pricing Works
          </h2>
          <div className="mt-6 space-y-4 leading-7 text-stone-300">
            <p>
              Dumpster rental pricing in Florida varies wildly between companies.
              Some advertise a low base price and then pile on fees at delivery or
              pickup — fuel surcharges, environmental fees, administrative charges,
              and gate fees that double the original quote. Others use bait-and-switch
              tactics: a low price on the phone, a higher price on the invoice, and
              a &quot;well, the weight was over&quot; excuse to justify the difference.
            </p>
            <p>
              We built our pricing model to be the opposite of all that. Every
              dumpster rental includes four things in one flat rate: delivery to
              your location, pickup when you are done, a 7-day rental period, and
              disposal at the landfill up to the included weight limit. There is no
              separate delivery fee. There is no fuel surcharge. There is no
              environmental fee. There is no pickup charge. There is no
              administrative fee. The price we quote you over the phone, by text,
              or through our online booking form is the price that appears on your
              invoice. Period.
            </p>
            <p>
              This approach works for us because it works for our customers. When
              people know exactly what they are paying upfront, they order with
              confidence, they refer their friends, and they come back for their
              next project. Transparent pricing is not just a marketing claim — it
              is the foundation of how we have built a repeat-customer business
              across every region of Florida.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Choose Your Dumpster Size
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-stone-400">
            All prices include delivery, pickup, 7-day rental, and disposal up
            to the listed weight limit. No hidden fees, no surprises.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* 10 Yard */}
            <div className="rounded-2xl border border-stone-700 bg-stone-950 p-8">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                  10 Yard
                </p>
                <p className="mt-4 text-5xl font-extrabold text-white">
                  $275
                </p>
                <p className="mt-1 text-sm text-stone-500">starting price</p>
              </div>
              <ul className="mt-8 space-y-3">
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  10 cubic yards capacity
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Fits 3-4 pickup truck loads
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Up to 2 tons included
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  7-day rental included
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Free delivery &amp; pickup
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Dimensions: 12&apos; x 8&apos; x 3.5&apos;
                </li>
              </ul>
              <p className="mt-6 text-xs text-stone-500">
                Best for: garage cleanouts, small renovations, yard debris,
                single-room remodels, pre-move decluttering
              </p>
              <a
                href={`sms:${phonePlain}`}
                className="mt-6 block w-full rounded-lg bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-700"
              >
                Text for 10 Yard Quote
              </a>
              <a
                href={`tel:${phonePlain}`}
                className="mt-3 block w-full rounded-lg border border-stone-600 py-3 text-center text-sm font-semibold text-white hover:border-stone-400"
              >
                Call {PHONE}
              </a>
            </div>

            {/* 20 Yard */}
            <div className="relative rounded-2xl border-2 border-orange-600 bg-stone-950 p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-4 py-1 text-xs font-bold text-white">
                Most Popular
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                  20 Yard
                </p>
                <p className="mt-4 text-5xl font-extrabold text-white">
                  $350
                </p>
                <p className="mt-1 text-sm text-stone-500">starting price</p>
              </div>
              <ul className="mt-8 space-y-3">
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  20 cubic yards capacity
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Fits 6-8 pickup truck loads
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Up to 3 tons included
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  7-day rental included
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Free delivery &amp; pickup
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Dimensions: 22&apos; x 8&apos; x 4.5&apos;
                </li>
              </ul>
              <p className="mt-6 text-xs text-stone-500">
                Best for: kitchen/bath remodels, roof tear-offs, estate
                cleanouts, construction debris, flooring removal
              </p>
              <a
                href={`sms:${phonePlain}`}
                className="mt-6 block w-full rounded-lg bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-700"
              >
                Text for 20 Yard Quote
              </a>
              <a
                href={`tel:${phonePlain}`}
                className="mt-3 block w-full rounded-lg border border-stone-600 py-3 text-center text-sm font-semibold text-white hover:border-stone-400"
              >
                Call {PHONE}
              </a>
            </div>

            {/* 30 Yard */}
            <div className="rounded-2xl border border-stone-700 bg-stone-950 p-8">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                  30 Yard
                </p>
                <p className="mt-4 text-5xl font-extrabold text-white">
                  $450
                </p>
                <p className="mt-1 text-sm text-stone-500">starting price</p>
              </div>
              <ul className="mt-8 space-y-3">
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  30 cubic yards capacity
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Fits 9-12 pickup truck loads
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Up to 4 tons included
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  7-day rental included
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Free delivery &amp; pickup
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Dimensions: 22&apos; x 8&apos; x 6&apos;
                </li>
              </ul>
              <p className="mt-6 text-xs text-stone-500">
                Best for: large renovations, new construction, commercial
                cleanouts, demolition, storm damage
              </p>
              <a
                href={`sms:${phonePlain}`}
                className="mt-6 block w-full rounded-lg bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-700"
              >
                Text for 30 Yard Quote
              </a>
              <a
                href={`tel:${phonePlain}`}
                className="mt-3 block w-full rounded-lg border border-stone-600 py-3 text-center text-sm font-semibold text-white hover:border-stone-400"
              >
                Call {PHONE}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-stone-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What&apos;s Included in{" "}
            <span className="text-orange-500">Every Rental</span>
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Free Delivery",
                detail:
                  "We deliver to your driveway, job site, or parking lot anywhere in Florida. Same-day delivery available when you order before noon. Our drivers place the dumpster exactly where you want it — no guesswork.",
              },
              {
                title: "Free Pickup",
                detail:
                  "When you are done loading, text or call us and we pick it up within 24 hours. No scheduling hassle, no waiting around. We send a photo confirmation after pickup so you have a record.",
              },
              {
                title: "7-Day Rental Period",
                detail:
                  "A full week to fill your dumpster at your own pace. No rush, no pressure. If you finish early, we grab it sooner. If you need more time, daily extensions are available at $15-$25 per day.",
              },
              {
                title: "Disposal Included",
                detail:
                  "Disposal up to the weight limit is included in your flat rate. We handle everything — hauling to the landfill or recycling facility, weighing, dumping, and any facility fees. No surprise disposal charges.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-stone-800 bg-stone-900/50 p-6"
              >
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Pricing Breakdown */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Detailed Pricing Breakdown by Dumpster Size
          </h2>
          <div className="mt-8 space-y-10">
            <div>
              <h3 className="text-xl font-semibold text-orange-500">
                10 Yard Dumpster — Starting at $275
              </h3>
              <p className="mt-3 leading-7 text-stone-300">
                The 10 yard dumpster is our most affordable option and the right
                choice for small to medium projects that generate more waste than
                your regular trash pickup can handle but do not require a large
                container. At 12 feet long, 8 feet wide, and 3.5 feet high, it
                fits comfortably on virtually any driveway in Florida — including
                narrow single-car driveways common in older neighborhoods across
                Miami, Tampa, Orlando, and Jacksonville.
              </p>
              <p className="mt-3 leading-7 text-stone-300">
                The $275 starting price includes everything: delivery, a 7-day
                rental period, pickup, and disposal up to 2 tons (4,000 pounds).
                Two tons is more than enough for most household cleanouts. To put
                it in perspective, a standard 3-bedroom home&apos;s worth of old
                furniture — couches, tables, dressers, mattresses, boxes of junk
                — typically weighs 1,200-1,800 pounds. You would have to pack
                the dumpster with dense materials like concrete or tile to
                approach the 2-ton limit with a 10 yard.
              </p>
              <p className="mt-3 leading-7 text-stone-300">
                The 10 yard is ideal for garage cleanouts, attic purges, single
                bathroom renovations, small landscaping projects, shed
                demolitions, pre-move decluttering, and general household junk
                removal. If your project is contained to one or two rooms and
                does not involve heavy construction demolition, the 10 yard is
                almost certainly the right choice — and it saves you $75-$175
                compared to ordering a larger container you do not need.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-orange-500">
                20 Yard Dumpster — Starting at $350
              </h3>
              <p className="mt-3 leading-7 text-stone-300">
                The 20 yard dumpster is our most popular size and the
                all-purpose workhorse of dumpster rental. At 22 feet long, 8
                feet wide, and 4.5 feet high, it holds approximately 8 pickup
                truck loads of debris — enough for kitchen renovations, bathroom
                remodels, roofing tear-offs, full estate cleanouts, flooring
                replacement projects, deck removals, and medium-sized
                construction jobs. If you are unsure which size to order, the 20
                yard is the safe bet.
              </p>
              <p className="mt-3 leading-7 text-stone-300">
                The $350 starting price includes delivery, a 7-day rental
                period, pickup, and disposal up to 3 tons (6,000 pounds). Three
                tons handles the debris from most residential renovation
                projects. A full kitchen gut — cabinets, countertops, backsplash
                tile, flooring, drywall, and fixtures — typically generates
                2,000-3,500 pounds of debris. A single-layer asphalt shingle
                roof tear-off on a 2,000 square foot home produces 4,000-6,000
                pounds. The 20 yard&apos;s 3-ton limit covers both scenarios
                comfortably.
              </p>
              <p className="mt-3 leading-7 text-stone-300">
                For roofing contractors, the 20 yard is the standard order for
                residential re-roofing. For general contractors, it handles the
                demolition phase of most renovation projects. For homeowners
                tackling a major cleanout or remodel, it provides enough
                capacity to avoid the expense of ordering a second container.
                The price difference between a 10 yard and 20 yard is only $75 —
                but the capacity difference is double. When in doubt, size up to
                the 20 yard.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-orange-500">
                30 Yard Dumpster — Starting at $450
              </h3>
              <p className="mt-3 leading-7 text-stone-300">
                The 30 yard dumpster is our largest container, designed for
                serious projects that generate high volumes of debris. At 22
                feet long, 8 feet wide, and 6 feet high, it holds approximately
                12 pickup truck loads — three times the capacity of a 10 yard
                and 50% more than a 20 yard. This is the container contractors
                order for new construction sites, full-home demolition projects,
                large commercial cleanouts, and whole-house renovation gut jobs.
              </p>
              <p className="mt-3 leading-7 text-stone-300">
                The $450 starting price includes delivery, a 7-day rental
                period, pickup, and disposal up to 4 tons (8,000 pounds). Four
                tons accommodates the debris from most large residential and
                commercial projects. A whole-house interior gut — all walls,
                ceilings, floors, cabinets, fixtures, and trim — generates
                4,000-7,000 pounds depending on the home size and materials. New
                construction waste from framing through finishing on a
                single-family home runs 3,000-5,000 pounds per phase.
              </p>
              <p className="mt-3 leading-7 text-stone-300">
                For large projects that generate more debris than a single 30
                yard can hold, we offer rotation service: when one dumpster
                fills up, we swap it for an empty one — typically within hours of
                your call. This keeps your job site clean and your crew
                productive without waiting for waste removal. Many contractors
                run continuous 30 yard rotation throughout multi-week
                construction and demolition projects. We also accommodate
                multiple dumpsters simultaneously on large commercial sites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Costs */}
      <section className="bg-stone-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Additional Costs to Know About
          </h2>
          <p className="mt-3 max-w-3xl text-stone-400">
            We believe in full transparency. Here are the only situations where
            additional charges may apply — and we always communicate these
            upfront so there are no surprises.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
              <h3 className="font-semibold text-white">Weight Overage</h3>
              <p className="mt-1 text-2xl font-bold text-orange-500">
                $40-$60<span className="text-sm font-normal text-stone-500">/ton over</span>
              </p>
              <p className="mt-2 text-sm text-stone-400">
                If your load exceeds the included weight limit, overage is
                charged per additional ton. We weigh every load at the landfill
                and communicate any overage before billing. Most residential
                jobs stay well within limits — overages are most common with
                concrete, tile, dirt, and roofing shingles.
              </p>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
              <h3 className="font-semibold text-white">Extra Rental Days</h3>
              <p className="mt-1 text-2xl font-bold text-orange-500">
                $15-$25<span className="text-sm font-normal text-stone-500">/day</span>
              </p>
              <p className="mt-2 text-sm text-stone-400">
                Need it longer than 7 days? $15/day for 10 yd, $20/day for 20
                yd, $25/day for 30 yd. Just text or call before day 7 to
                extend. Many customers extend by a few days for larger
                projects — it is a fraction of the cost of ordering a new
                dumpster.
              </p>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
              <h3 className="font-semibold text-white">Prohibited Materials</h3>
              <p className="mt-1 text-2xl font-bold text-orange-500">Varies</p>
              <p className="mt-2 text-sm text-stone-400">
                Hazardous materials, tires (more than 4), batteries, liquid
                paint, chemicals, and appliances with freon require special
                disposal. If prohibited items are found in your dumpster, the
                landfill charges a contamination fee that gets passed to you.
                Ask us first if you are unsure about any item.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing by Project Type */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Dumpster Rental Cost by Project Type
          </h2>
          <p className="mt-3 text-stone-400">
            Here is what most customers pay for common Florida projects, including
            our recommended dumpster size and why.
          </p>
          <div className="mt-8 space-y-6">
            {[
              {
                project: "Garage or Attic Cleanout",
                size: "10 Yard",
                cost: "$275",
                detail: "A single-room cleanout generates 2-4 truck loads of old furniture, boxes, tools, holiday decorations, and general junk. The 10 yard handles this with room to spare. Unless you have decades of accumulation in a large space, you rarely need bigger.",
              },
              {
                project: "Kitchen Renovation",
                size: "20 Yard",
                cost: "$350",
                detail: "Kitchen guts generate cabinets, countertops, tile backsplash, flooring, drywall, plumbing fixtures, and old appliances. The total volume is typically 5-7 truck loads. The 20 yard fits this perfectly and keeps weight well within the 3-ton limit for standard materials.",
              },
              {
                project: "Bathroom Remodel",
                size: "10 or 20 Yard",
                cost: "$275-$350",
                detail: "A single bathroom remodel fits in a 10 yard — you are removing a tub, toilet, vanity, tile, and drywall. If you are renovating multiple bathrooms or a master suite with separate shower, tub, and double vanity, step up to a 20 yard.",
              },
              {
                project: "Roof Tear-Off",
                size: "20 Yard",
                cost: "$350",
                detail: "Roofing is sized by weight, not volume. A 2,000 sq ft single-layer asphalt shingle roof produces 4,000-6,000 lbs of debris. The 20 yard at 3 tons handles most residential roofs. For multi-layer tear-offs or homes over 2,500 sq ft, go 30 yard or order two containers.",
              },
              {
                project: "Estate Cleanout",
                size: "20 or 30 Yard",
                cost: "$350-$450",
                detail: "A full house of furniture, clothing, kitchen items, personal belongings, and accumulated stuff fills 6-12 truck loads depending on the home size. A 3-bedroom home usually fits in a 20 yard. A 4+ bedroom home or hoarder situation needs a 30 yard.",
              },
              {
                project: "New Construction",
                size: "30 Yard",
                cost: "$450",
                detail: "Construction sites generate continuous waste across every phase — lumber cutoffs, drywall scraps, packaging, concrete waste, roofing debris, and finishing materials. The 30 yard maximizes capacity and minimizes swap frequency. Most builders run 30 yard rotation throughout the project.",
              },
              {
                project: "Storm Damage Cleanup",
                size: "20 or 30 Yard",
                cost: "$350-$450",
                detail: "Hurricane and storm debris includes a chaotic mix of tree branches, roofing, siding, fencing, damaged furniture, soaked drywall, and waterlogged belongings. Volume is high but weight varies. For most residential storm cleanup, a 30 yard is the right call.",
              },
              {
                project: "Landscaping Project",
                size: "10 or 20 Yard",
                cost: "$275-$350",
                detail: "Yard waste is bulky but light — tree branches, brush, sod, and mulch fill space fast without adding much weight. A 10 yard handles basic cleanup. Large-scale landscaping with tree removal needs a 20 yard. Dirt and soil are heavy — mention it when ordering.",
              },
            ].map((item) => (
              <div key={item.project} className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-white">{item.project}</h3>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-orange-600/30 bg-orange-600/10 px-3 py-1 text-sm font-semibold text-orange-400">
                      {item.size}
                    </span>
                    <span className="text-lg font-bold text-white">{item.cost}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTAGroup variant="mid" />

      {/* Weight Limits Explained */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Understanding Weight Limits and Overage Fees
          </h2>
          <div className="mt-6 space-y-4 leading-7 text-stone-300">
            <p>
              Every dumpster rental includes a weight limit: 2 tons for the 10
              yard, 3 tons for the 20 yard, and 4 tons for the 30 yard. These
              limits are based on what the landfill charges per ton for
              disposal. The included weight is factored into your flat-rate
              price. If your load exceeds the limit, the per-ton overage fee
              covers the additional disposal cost at the landfill.
            </p>
            <p>
              For most residential projects — cleanouts, renovations, yard
              cleanup, furniture disposal — you will come in well under the
              weight limit. Household items and general construction debris are
              relatively light for their volume. A 20 yard dumpster packed to
              the brim with furniture, drywall, lumber, and general junk
              typically weighs 2,000-4,000 pounds — well within the 3-ton
              (6,000 lb) limit.
            </p>
            <p>
              The materials that push you over the weight limit are the dense
              ones: concrete (150 lbs per cubic foot), brick and block (120 lbs
              per cubic foot), ceramic tile with mortar (100-120 lbs per cubic
              foot), natural stone (170 lbs per cubic foot), dirt and soil (100
              lbs per cubic foot), and roofing shingles (70-100 lbs per bundle).
              If your project involves significant quantities of these
              materials, tell us when you book. We will recommend a container
              size that gives you enough weight capacity, or we will suggest
              separating heavy materials into a dedicated load to avoid
              overages.
            </p>
            <p>
              Here is a practical example: you are renovating a bathroom that
              has a cast-iron bathtub (300 lbs), ceramic tile on the floor and
              walls (500 lbs), a concrete shower pan (200 lbs), drywall (200
              lbs), a vanity (100 lbs), and miscellaneous debris (200 lbs).
              Total: about 1,500 lbs. A 10 yard dumpster at 2 tons (4,000 lbs)
              handles that easily. But if you add a concrete patio demolition
              from the same house — 2,000-4,000 lbs of concrete — you are now
              at 3,500-5,500 lbs and might exceed the 10 yard&apos;s 2-ton limit.
              This is where sizing up to a 20 yard or separating the loads
              makes financial sense.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-stone-800 bg-stone-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">Common Material Weights</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { material: "Household furniture", weight: "300-500 lbs/cubic yard" },
                { material: "Drywall", weight: "500-700 lbs/cubic yard" },
                { material: "Lumber & framing", weight: "300-500 lbs/cubic yard" },
                { material: "Asphalt shingles", weight: "700-1,000 lbs/cubic yard" },
                { material: "Concrete & masonry", weight: "2,000-2,500 lbs/cubic yard" },
                { material: "Ceramic tile", weight: "1,200-1,800 lbs/cubic yard" },
                { material: "Carpet & pad", weight: "200-400 lbs/cubic yard" },
                { material: "Yard waste", weight: "200-400 lbs/cubic yard" },
                { material: "Mixed renovation debris", weight: "400-800 lbs/cubic yard" },
              ].map((item) => (
                <div key={item.material} className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">{item.material}</span>
                  <span className="font-semibold text-white">{item.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dumpster Rental vs Alternatives */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Dumpster Rental vs. Other Disposal Options
          </h2>
          <div className="mt-6 space-y-4 leading-7 text-stone-300">
            <p>
              When you have a large amount of debris to dispose of, you
              generally have three options: rent a dumpster, hire a junk removal
              service, or haul it to the dump yourself. Each has its place, but
              for most renovation, construction, and cleanout projects, dumpster
              rental is the most cost-effective choice by a wide margin.
            </p>
            <p>
              <strong className="text-white">Dumpster rental vs. junk removal:</strong>{" "}
              Junk removal services send a crew to physically load your debris
              onto their truck. This is convenient if you cannot do the loading
              yourself — but it comes at a premium. Most junk removal companies
              charge $300-$800 for a partial truck load and $500-$1,500 for a
              full load. A 20 yard dumpster rental at $350 holds the equivalent
              of 2-3 full junk removal truck loads. If your project generates
              more than a few hundred pounds of debris, dumpster rental wins on
              price every time. The trade-off is that you do the loading — but
              you do it on your own schedule over 7 days.
            </p>
            <p>
              <strong className="text-white">Dumpster rental vs. DIY dump runs:</strong>{" "}
              Hauling debris to the landfill yourself is the cheapest option per
              trip — most Florida landfills charge $30-$75 per load depending on
              weight and county. But the hidden cost is your time. Each round
              trip to the dump takes 1-2 hours including loading your truck or
              trailer, driving, waiting in line, unloading, and driving back. A
              typical renovation generates 4-8 truck loads. At an average of 90
              minutes per trip, that is 6-12 hours of your time — an entire day
              or two of labor. Factor in gas, vehicle wear, and your hourly
              value, and the $350 dumpster rental is almost always the smarter
              move.
            </p>
            <p>
              <strong className="text-white">Dumpster rental vs. curbside pickup:</strong>{" "}
              Some Florida municipalities offer bulk pickup for large items, but
              the limitations make it impractical for most projects. Pickup is
              usually limited to once per month, items must be placed curbside
              by a specific date, and construction debris is typically excluded.
              A dumpster rental gives you 7 days to load at your own pace with
              no restrictions on volume or timing.
            </p>
          </div>
        </div>
      </section>

      {/* Volume / Contractor Pricing */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                Contractor &amp; Volume Pricing
              </p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Regular Service? We Have Rates for That.
              </h2>
              <p className="mt-4 text-lg text-stone-300">
                Contractors, property managers, and businesses that need regular
                dumpster service get preferred pricing. The more you rent, the
                more you save. Our contractor program is designed for
                professionals who need reliable, fast dumpster service without
                the hassle of quoting every single job.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  15-25% discount on standard rates for volume accounts
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Multiple dumpsters on the same job site simultaneously
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Priority scheduling and same-day swaps when containers fill up
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  NET-30 billing with monthly consolidated invoicing
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Dedicated account manager who knows your projects
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-orange-400">&#10003;</span>
                  Insurance certificates provided on request
                </li>
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`tel:${phonePlain}`}
                  className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  Call for Contractor Rates: {PHONE}
                </a>
                <Link
                  href="/schedule-dumpster-rental-form"
                  className="inline-flex items-center justify-center rounded-lg border border-stone-600 px-6 py-3 text-sm font-semibold text-white hover:border-stone-400"
                >
                  Book Online
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 text-center">
                <p className="text-3xl font-extrabold text-orange-500">10+</p>
                <p className="mt-1 text-xs text-stone-400">
                  Rentals/mo for best rates
                </p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 text-center">
                <p className="text-3xl font-extrabold text-white">3</p>
                <p className="mt-1 text-xs text-stone-400">Dumpster sizes available</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 text-center">
                <p className="text-3xl font-extrabold text-white">Same Day</p>
                <p className="mt-1 text-xs text-stone-400">Swap-outs available</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 text-center">
                <p className="text-3xl font-extrabold text-orange-500">Net 30</p>
                <p className="mt-1 text-xs text-stone-400">Billing available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tips */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How to Get the Best Price on Your Dumpster Rental
          </h2>
          <div className="mt-6 space-y-4 leading-7 text-stone-300">
            <p>
              Getting the best price on a dumpster rental is not about finding
              the cheapest quote — it is about avoiding unnecessary costs and
              making sure you are paying for the right service the first time.
              Here are practical tips that have saved our customers hundreds of
              dollars on their projects.
            </p>
            <p>
              <strong className="text-white">Order the right size the first time.</strong>{" "}
              The most expensive mistake in dumpster rental is ordering too
              small. If your 10 yard fills up halfway through your project, you
              have two options: pay for a swap (essentially a second rental) or
              rent a second dumpster. Either way, you are paying $275-$450 more
              than if you had ordered a 20 yard for $75 more in the first place.
              When we recommend sizing up, it is not because we want to charge
              you more — it is because we know a second haul costs dramatically
              more than the $75 difference between sizes.
            </p>
            <p>
              <strong className="text-white">Separate heavy materials from light ones.</strong>{" "}
              If your project involves both heavy materials (concrete, tile,
              brick) and light materials (furniture, drywall, wood), consider
              loading them separately. A dumpster full of mixed debris with a
              concrete slab at the bottom might exceed the weight limit, while
              two properly sorted loads come in under. We can advise on the
              best strategy for your specific project.
            </p>
            <p>
              <strong className="text-white">Break down large items.</strong>{" "}
              Disassemble furniture, flatten boxes, cut long boards, and break
              apart large items before loading. This maximizes the usable
              space in your dumpster, which means you might fit everything in a
              smaller (cheaper) container. A well-loaded 10 yard dumpster holds
              significantly more than a poorly loaded one.
            </p>
            <p>
              <strong className="text-white">Plan your rental period.</strong>{" "}
              Time your delivery to coincide with the start of demolition or
              cleanup, not before. Every day the dumpster sits empty on your
              driveway is a wasted rental day. If your contractor is starting
              demo on Wednesday, schedule delivery for Wednesday morning — not
              the previous Monday. Conversely, finish loading and call for
              pickup promptly. Our standard 7-day period is generous, but daily
              extension fees add up if you are not actively using the container.
            </p>
            <p>
              <strong className="text-white">Ask about items before throwing them in.</strong>{" "}
              Certain items cost extra to dispose of if they end up in a general
              debris dumpster. Tires, appliances with refrigerant, electronics,
              and mattresses may carry additional disposal fees at the landfill.
              Donating usable items or recycling metals can reduce what goes in
              the dumpster and keep you within your weight limit.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Dumpster Rental Pricing FAQ
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-stone-700 bg-stone-800/50 p-6"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <ProTip
        tips={[
          {
            title: "The Cheapest Quote Isn't Always the Best Deal",
            body: "A $199 dumpster rental sounds great until you get hit with a $75 fuel surcharge, a $50 environmental fee, and a $40 admin charge. Always compare the total, all-inclusive price. Ours includes delivery, pickup, rental period, and disposal — no surprises.",
          },
          {
            title: "Right-Size Your Dumpster and Save",
            body: "Ordering too small means paying for a second haul. Ordering too big means paying for space you don't use. Tell us what you're tossing and we'll recommend the exact right size — it's what we do hundreds of times a week.",
          },
          {
            title: "Ask About Weight Limits Upfront",
            body: "Concrete, dirt, tile, and roofing shingles are deceptively heavy. A small pile of concrete can blow past your weight limit and trigger overage fees. If your project involves heavy materials, mention it when you call so we can set you up right.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
