// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, SITE_URL } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

export const metadata: Metadata = {
  title: "Dumpster Sizes: 10, 20 & 30 Yard Roll-Off Containers | Florida Dumpster Rentals",
  description:
    "Compare 10, 20 & 30 yard dumpster sizes. Dimensions, weight limits, capacity, pricing & best uses. Find the right roll-off container for your project. Call 954-710-2332.",
  alternates: { canonical: `${SITE_URL}/dumpster-sizes` },
};

const phonePlain = PHONE.replace(/-/g, "");

const sizes = [
  {
    yard: 10,
    dimensions: "12' L x 8' W x 3.5' H",
    weightLimit: "2 tons (4,000 lbs)",
    truckLoads: "4 pickup truck loads",
    price: "$275",
    bestFor: [
      "Small garage or basement cleanouts",
      "Single-room remodels (bathroom, kitchen)",
      "Small landscaping projects",
      "Deck removal (small deck)",
      "Estate cleanouts (1-2 rooms)",
      "Pre-move decluttering",
      "Shed demolition",
    ],
    whatFits: [
      "Old furniture, mattresses, boxes",
      "Small appliances and fixtures",
      "Light demolition debris",
      "Yard waste and brush",
      "About 50-60 33-gallon trash bags",
      "One room's worth of carpet and pad",
      "A single bathroom's tile and fixtures",
    ],
    idealFor: "Homeowners tackling a weekend cleanout or small remodel. Perfect when you need more capacity than a truck but don't need a full-size container. The smallest driveway footprint of our three sizes.",
  },
  {
    yard: 20,
    dimensions: "22' L x 8' W x 4.5' H",
    weightLimit: "3 tons (6,000 lbs)",
    truckLoads: "8 pickup truck loads",
    price: "$350",
    popular: true,
    bestFor: [
      "Full kitchen or bathroom renovations",
      "Roofing tear-offs (up to 30 squares)",
      "Large cleanouts (whole house, office)",
      "Deck or fence removal",
      "Flooring replacement projects",
      "Estate cleanouts (3-4 bedroom home)",
      "Medium construction projects",
    ],
    whatFits: [
      "Construction and renovation debris",
      "Roofing shingles and underlayment",
      "Carpet, tile, hardwood flooring",
      "Drywall, framing lumber, siding",
      "About 100-120 33-gallon trash bags",
      "A full kitchen's cabinets and countertops",
      "Multiple rooms of furniture",
    ],
    idealFor: "Our most popular size. Fits most renovation, roofing, and cleanout projects. Big enough for serious work without taking up your entire driveway. The best value for medium to large residential projects.",
  },
  {
    yard: 30,
    dimensions: "22' L x 8' W x 6' H",
    weightLimit: "4 tons (8,000 lbs)",
    truckLoads: "12 pickup truck loads",
    price: "$450",
    bestFor: [
      "New construction sites",
      "Full home demolition or gut renovation",
      "Large commercial cleanouts",
      "Whole-house renovations",
      "Storm damage cleanup",
      "Warehouse and industrial cleanouts",
      "Multi-room remodels",
    ],
    whatFits: [
      "Heavy construction debris",
      "Concrete, brick, and block (within weight limit)",
      "Large volumes of mixed debris",
      "Commercial and industrial waste",
      "About 150-180 33-gallon trash bags",
      "An entire house worth of contents",
      "Multiple phases of construction waste",
    ],
    idealFor: "Contractors, builders, and large-scale projects. When you need maximum capacity for demolition, new construction, or major commercial work. Same footprint as the 20 yard but 33% taller.",
  },
];

export default function DumpsterSizesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Size Guide
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Dumpster Sizes &amp; Pricing
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-stone-400">
            We offer 10, 20, and 30 yard roll-off dumpsters for every project
            size across all of Florida. Choosing the right dumpster size is the
            single most important decision in your rental — it determines your
            cost, whether you will need a second haul, and how efficiently your
            project runs. This guide breaks down every detail of each size so
            you can order with confidence.
          </p>
          <CTAGroup variant="hero" />
        </div>
      </section>

      {/* Understanding Dumpster Sizes */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Understanding Roll-Off Dumpster Sizes
          </h2>
          <div className="mt-6 space-y-4 leading-7 text-stone-300">
            <p>
              Roll-off dumpster sizes are measured in cubic yards — the total
              volume of debris the container can hold. A &quot;10 yard dumpster&quot;
              holds 10 cubic yards of material, a &quot;20 yard&quot; holds 20 cubic
              yards, and a &quot;30 yard&quot; holds 30 cubic yards. But volume is only
              half the equation. Every dumpster also has a weight limit that
              determines how heavy the load can be, regardless of how full the
              container is.
            </p>
            <p>
              This distinction matters because different materials have
              drastically different densities. You could fill a 10 yard
              dumpster to the brim with old clothes, cardboard, and plastic
              bins and come in at 800 pounds — well under the 2-ton limit. Or
              you could fill the same dumpster halfway with concrete rubble and
              blow past 4,000 pounds. When we recommend a dumpster size, we
              consider both the volume of debris your project will generate and
              the weight of the materials involved. Getting this right saves
              you money and prevents project delays.
            </p>
            <p>
              All three of our dumpster sizes are &quot;roll-off&quot; containers. This
              means they are delivered on a specialized truck that rolls the
              container off the back and onto your driveway, parking lot, or
              job site. The delivery process takes about 10 minutes and
              requires approximately 60 feet of straight-line clearance for
              the truck and 23 feet of vertical clearance for overhead lines
              and trees. You do not need to be present for delivery — just
              make sure the placement area is clear.
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Size Cards */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Detailed Size Specifications
          </h2>
          <div className="mt-10 space-y-16">
            {sizes.map((s) => (
              <div
                key={s.yard}
                id={`${s.yard}-yard`}
                className={`rounded-2xl border p-8 sm:p-10 ${
                  s.popular
                    ? "border-orange-600 shadow-lg shadow-orange-100"
                    : "border-zinc-200"
                }`}
              >
                {s.popular && (
                  <span className="mb-4 inline-block rounded-full bg-orange-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <div className="grid gap-8 lg:grid-cols-2">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-orange-600">{s.yard}</span>
                      <span className="text-xl font-medium text-stone-500">Yard Dumpster</span>
                    </div>
                    <p className="mt-4 text-zinc-600">{s.idealFor}</p>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-zinc-50 p-4">
                        <p className="text-xs font-semibold uppercase text-stone-500">Dimensions</p>
                        <p className="mt-1 font-semibold text-zinc-900">{s.dimensions}</p>
                      </div>
                      <div className="rounded-lg bg-zinc-50 p-4">
                        <p className="text-xs font-semibold uppercase text-stone-500">Weight Limit</p>
                        <p className="mt-1 font-semibold text-zinc-900">{s.weightLimit}</p>
                      </div>
                      <div className="rounded-lg bg-zinc-50 p-4">
                        <p className="text-xs font-semibold uppercase text-stone-500">Capacity</p>
                        <p className="mt-1 font-semibold text-zinc-900">{s.truckLoads}</p>
                      </div>
                      <div className="rounded-lg bg-zinc-50 p-4">
                        <p className="text-xs font-semibold uppercase text-stone-500">Starting At</p>
                        <p className="mt-1 font-semibold text-orange-600">{s.price}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <a
                        href={`sms:${phonePlain}?body=I'm interested in a ${s.yard} yard dumpster`}
                        className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
                      >
                        Text for a {s.yard} Yard Quote
                      </a>
                      <Link
                        href="/schedule-dumpster-rental-form"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-500"
                      >
                        Book Online
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <h3 className="font-semibold text-zinc-900">Best For</h3>
                      <ul className="mt-3 space-y-2">
                        {s.bestFor.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-zinc-600">
                            <span className="mt-0.5 text-orange-600">&#10003;</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900">What Fits</h3>
                      <ul className="mt-3 space-y-2">
                        {s.whatFits.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-zinc-600">
                            <span className="mt-0.5 text-orange-600">&#10003;</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* In-Depth Size Guides */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            In-Depth Size Guide for Each Dumpster
          </h2>

          <div className="mt-10 space-y-10">
            <div>
              <h3 className="text-xl font-semibold text-orange-500">
                10 Yard Dumpster — The Compact Workhorse
              </h3>
              <div className="mt-4 space-y-3 leading-7 text-stone-300">
                <p>
                  The 10 yard dumpster is the smallest roll-off container we
                  offer, but do not let the size fool you — it handles the
                  majority of residential cleanout and small renovation
                  projects. At 12 feet long and 8 feet wide, it takes up less
                  driveway space than a standard parking spot. The 3.5-foot
                  height makes it easy to load by hand without needing to
                  lift heavy items above shoulder height, which is a
                  significant advantage for homeowners who are loading the
                  dumpster themselves without a crew.
                </p>
                <p>
                  The 10 yard holds approximately 4 pickup truck loads of
                  debris, or 50-60 standard 33-gallon trash bags. In
                  practical terms, this is enough for a full garage cleanout
                  (tools, old furniture, storage boxes, broken equipment),
                  a single bathroom renovation (tub, toilet, vanity, tile,
                  drywall), a small deck teardown (up to 150 sq ft), or a
                  moderate yard cleanup (branches, brush, old mulch, dead
                  shrubs). If your project is confined to one room or one
                  area of your property, the 10 yard is almost always
                  sufficient.
                </p>
                <p>
                  The 2-ton (4,000 lb) weight limit is generous for
                  household materials. Old furniture, clothing, cardboard,
                  kitchen items, and general junk weigh surprisingly little
                  relative to volume. You would need to pack the entire 10
                  yards with dense material like concrete or ceramic tile to
                  approach the limit. For typical cleanout debris, you will
                  use all the space before you approach the weight cap.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-orange-500">
                20 Yard Dumpster — The All-Purpose Favorite
              </h3>
              <div className="mt-4 space-y-3 leading-7 text-stone-300">
                <p>
                  The 20 yard dumpster is our most-ordered size by a wide
                  margin, and for good reason: it hits the sweet spot
                  between capacity, cost, and driveway footprint. At 22
                  feet long, 8 feet wide, and 4.5 feet high, it holds
                  double the volume of a 10 yard but only costs $75 more.
                  That makes the 20 yard the best value in our lineup and
                  the default recommendation for any project we are not
                  100% sure a 10 yard can handle.
                </p>
                <p>
                  The 20 yard accommodates approximately 8 pickup truck
                  loads — enough for a full kitchen renovation (cabinets,
                  countertops, backsplash, flooring, drywall, fixtures), a
                  residential roof tear-off (up to 25-30 squares of
                  asphalt shingles), a 3-4 bedroom estate cleanout, a
                  large deck or fence removal, or the demolition phase of
                  a multi-room renovation. For roofing contractors, the 20
                  yard is the standard order for single-layer residential
                  re-roofing.
                </p>
                <p>
                  The 3-ton (6,000 lb) weight limit handles most
                  residential renovation debris comfortably. A typical
                  kitchen gut produces 2,000-3,500 lbs. A single-layer
                  shingle tear-off on a 2,000 sq ft home runs 4,000-6,000
                  lbs. Mixed renovation debris — drywall, lumber, flooring,
                  fixtures — averages 400-800 lbs per cubic yard, meaning a
                  full 20 yards of mixed materials weighs 4,000-8,000 lbs.
                  For light to medium-weight debris, you will fill the
                  volume before hitting the weight limit. For heavy
                  materials, the weight limit becomes the constraint.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-orange-500">
                30 Yard Dumpster — Maximum Capacity
              </h3>
              <div className="mt-4 space-y-3 leading-7 text-stone-300">
                <p>
                  The 30 yard dumpster is our largest container, built for
                  projects that generate serious volume. It shares the same
                  22-foot by 8-foot footprint as the 20 yard but stands 6
                  feet tall — 33% more height and 50% more total volume.
                  This extra capacity is the difference between needing one
                  haul and needing two on large projects, which translates
                  directly to cost savings of $350-$450 per avoided
                  additional load.
                </p>
                <p>
                  The 30 yard holds approximately 12 pickup truck loads
                  and is the go-to choice for new construction sites,
                  whole-house gut renovations, full interior demolition
                  projects, large commercial cleanouts, storm damage
                  cleanup, and warehouse cleanouts. Contractors running
                  multi-week projects often set up 30 yard rotation — when
                  one fills up, we swap it for an empty within hours so the
                  crew never stops working.
                </p>
                <p>
                  The 4-ton (8,000 lb) weight limit accommodates the high
                  volume of materials these large projects generate. A
                  whole-house interior gut — all walls, floors, ceilings,
                  cabinets, and fixtures — produces 4,000-7,000 lbs
                  depending on house size and materials. New construction
                  waste across multiple phases runs 3,000-5,000 lbs per
                  fill. The 6-foot height means the sides are above most
                  people&apos;s head height — use the rear swing door for
                  walk-in loading of heavy items rather than trying to
                  lift them over the top.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-zinc-900">
            Side-by-Side Comparison
          </h2>
          <p className="mt-3 text-center text-stone-500">
            Quick reference to compare all three dumpster sizes at a glance.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-300">
                  <th className="py-3 pr-4 font-semibold text-zinc-900">Feature</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900">10 Yard</th>
                  <th className="px-4 py-3 font-semibold text-orange-600">20 Yard</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900">30 Yard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Dimensions</td>
                  <td className="px-4 py-3 text-zinc-600">12&apos; x 8&apos; x 3.5&apos;</td>
                  <td className="px-4 py-3 text-zinc-600">22&apos; x 8&apos; x 4.5&apos;</td>
                  <td className="px-4 py-3 text-zinc-600">22&apos; x 8&apos; x 6&apos;</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Volume</td>
                  <td className="px-4 py-3 text-zinc-600">10 cubic yards</td>
                  <td className="px-4 py-3 text-zinc-600">20 cubic yards</td>
                  <td className="px-4 py-3 text-zinc-600">30 cubic yards</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Weight Limit</td>
                  <td className="px-4 py-3 text-zinc-600">2 tons (4,000 lbs)</td>
                  <td className="px-4 py-3 text-zinc-600">3 tons (6,000 lbs)</td>
                  <td className="px-4 py-3 text-zinc-600">4 tons (8,000 lbs)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Truck Loads</td>
                  <td className="px-4 py-3 text-zinc-600">4 loads</td>
                  <td className="px-4 py-3 text-zinc-600">8 loads</td>
                  <td className="px-4 py-3 text-zinc-600">12 loads</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Starting Price</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">$275</td>
                  <td className="px-4 py-3 font-semibold text-orange-600">$350</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">$450</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Price per Cubic Yard</td>
                  <td className="px-4 py-3 text-zinc-600">$27.50/yd</td>
                  <td className="px-4 py-3 font-semibold text-orange-600">$17.50/yd</td>
                  <td className="px-4 py-3 text-zinc-600">$15.00/yd</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Ideal For</td>
                  <td className="px-4 py-3 text-zinc-600">Small cleanouts, minor remodels</td>
                  <td className="px-4 py-3 text-zinc-600">Renovations, roofing, large cleanouts</td>
                  <td className="px-4 py-3 text-zinc-600">Construction, demolition, commercial</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Driveway Footprint</td>
                  <td className="px-4 py-3 text-zinc-600">Small &mdash; fits most driveways</td>
                  <td className="px-4 py-3 text-zinc-600">Medium &mdash; standard parking spot</td>
                  <td className="px-4 py-3 text-zinc-600">Medium &mdash; same as 20 yd, taller</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Trash Bags</td>
                  <td className="px-4 py-3 text-zinc-600">~50-60 bags</td>
                  <td className="px-4 py-3 text-zinc-600">~100-120 bags</td>
                  <td className="px-4 py-3 text-zinc-600">~150-180 bags</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-zinc-700">Extra Day Rate</td>
                  <td className="px-4 py-3 text-zinc-600">$15/day</td>
                  <td className="px-4 py-3 text-zinc-600">$20/day</td>
                  <td className="px-4 py-3 text-zinc-600">$25/day</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner
        title="Not Sure Which Size? We'll Help."
        subtitle="Text us your project details and we'll recommend the perfect dumpster size. No obligation, no pressure."
      />

      {/* Which Size Do I Need? */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Which Size Do I Need? Project-by-Project Guide
          </h2>
          <p className="mt-3 text-lg text-stone-500">
            Use this detailed guide to find the right dumpster for your specific project type.
          </p>

          <div className="mt-10 space-y-6">
            {[
              {
                project: "Garage or Attic Cleanout",
                recommended: "10 Yard",
                reason: "A single-room cleanout typically generates 3-4 truck loads of debris — old tools, furniture, boxes, seasonal items, and general junk. The 10 yard handles this with room to spare. You would need to be cleaning out a very large, very full garage to need a 20 yard.",
              },
              {
                project: "Kitchen or Bathroom Remodel",
                recommended: "20 Yard",
                reason: "Cabinets, countertops, tile, drywall, fixtures, and flooring add up fast. A full kitchen renovation generates 5-7 truck loads and 2,000-3,500 lbs of debris. The 20 yard gives you the volume and weight capacity for a complete tear-out and rebuild. A single bathroom fits in a 10 yard; multiple bathrooms need a 20.",
              },
              {
                project: "Roofing Project",
                recommended: "20 Yard",
                reason: "A 20 yard handles up to 25-30 squares of single-layer asphalt shingles within the 3-ton weight limit. For larger roofs over 2,500 sq ft, multi-layer tear-offs, or tile roofing, step up to a 30 yard. Weight is the limiting factor for roofing — shingles are heavy.",
              },
              {
                project: "Whole-House Cleanout or Estate Cleanout",
                recommended: "20 or 30 Yard",
                reason: "For a full house of furniture, appliances, clothing, kitchen items, and accumulated belongings, a 20 yard works for 2-3 bedroom homes. Larger homes, hoarding situations, or houses with decades of accumulation need a 30 yard or multiple loads.",
              },
              {
                project: "New Construction",
                recommended: "30 Yard",
                reason: "Construction generates high volumes of mixed debris across every build phase. Lumber cutoffs, drywall scraps, packaging, concrete waste, and finishing materials fill containers fast. The 30 yard maximizes capacity and minimizes rotation frequency.",
              },
              {
                project: "Landscaping / Yard Cleanup",
                recommended: "10 or 20 Yard",
                reason: "Yard waste is bulky but usually light — branches, brush, sod, old mulch, and dead plants fill space without adding much weight. A 10 yard handles basic cleanup and small tree removal. Large-scale landscaping with multiple trees or major clearing needs a 20 yard. Dirt and soil are heavy — if you are removing significant soil, mention it when ordering.",
              },
              {
                project: "Deck or Fence Removal",
                recommended: "20 Yard",
                reason: "A standard residential deck (200-400 sq ft) or 100-200 linear feet of fence produces 4-8 truck loads of lumber, posts, concrete footings, and hardware. The 20 yard fits most deck and fence removals. Very large multi-level decks may need a 30 yard.",
              },
              {
                project: "Flooring Removal",
                recommended: "10 or 20 Yard",
                reason: "Carpet and pad are light and compress easily — an entire house worth fits in a 10 yard by weight. Tile, hardwood, and vinyl are denser. A single-floor home's tile removal (1,000-1,500 sq ft) fits in a 10 yard. Larger homes or multi-floor removal needs a 20 yard. Tile with thick mortar beds is heavy — factor weight.",
              },
            ].map((item) => (
              <div key={item.project} className="rounded-xl border border-zinc-200 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900">{item.project}</h3>
                  <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                    {item.recommended}
                  </span>
                </div>
                <p className="mt-2 text-zinc-600">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sizing Mistakes */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Common Dumpster Sizing Mistakes (and How to Avoid Them)
          </h2>
          <div className="mt-6 space-y-4 leading-7 text-stone-300">
            <p>
              <strong className="text-white">Mistake #1: Ordering too small to save money.</strong>{" "}
              The difference between a 10 yard ($275) and a 20 yard ($350) is
              $75. The cost of ordering a second dumpster when the first one
              fills up is $275-$450. This is the most common and most expensive
              mistake homeowners make. When we recommend sizing up, it is not to
              charge you more — it is to save you from a much larger expense.
            </p>
            <p>
              <strong className="text-white">Mistake #2: Ignoring weight for heavy materials.</strong>{" "}
              A 10 yard dumpster half-filled with concrete rubble can weigh more
              than a 20 yard packed with furniture. Concrete, tile, brick, dirt,
              and roofing shingles are density outliers that blow past weight
              limits before you fill the volume. Always tell us what materials
              you are disposing of so we can size for weight, not just space.
            </p>
            <p>
              <strong className="text-white">Mistake #3: Not considering project phases.</strong>{" "}
              Renovation projects have a demolition phase (heavy, bulky debris)
              and a construction phase (packaging, cutoffs, lighter materials).
              Some customers order one dumpster for the whole project and run
              out of space mid-build. A better approach is to time your dumpster
              for the demolition phase, haul it when demo is done, and order a
              second one for the build phase if needed.
            </p>
            <p>
              <strong className="text-white">Mistake #4: Not measuring driveway clearance.</strong>{" "}
              A 20 or 30 yard dumpster is 22 feet long. If your driveway is 18
              feet from the street to the garage, the container will extend into
              the sidewalk or street — which may require a permit. Measure your
              placement area before ordering and let us know if clearance is
              tight. We can advise on the best setup for your specific property.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Dumpster Size FAQs
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                q: "What happens if I go over the weight limit?",
                a: "If your dumpster exceeds the weight limit, an overage fee of $40-$60 per additional ton applies. We weigh every load at the landfill and will let you know if there is an overage before charging anything extra. Most residential projects stay well within the weight limit.",
              },
              {
                q: "Can I mix different types of debris in one dumpster?",
                a: "Yes. You can mix most household and construction debris in one container — furniture, drywall, lumber, tile, carpet, appliances, and general junk can all go in together. The main exception is very heavy materials like concrete or dirt, which are better separated into a dedicated load to avoid weight overages.",
              },
              {
                q: "What if I order the wrong size?",
                a: "If your dumpster fills up before your project is done, we can swap it for an empty one or deliver a second container. If you realize before delivery that you need a different size, just call and we will adjust the order at no charge. It is always better to size up if you are on the fence.",
              },
              {
                q: "How high can I fill the dumpster?",
                a: "Debris must not extend above the top edge of the dumpster walls. This is a legal requirement for safe transport — overfilled containers cannot be hauled on public roads. We will not be able to pick up an overfilled dumpster until the excess is removed. Load level and you will be fine.",
              },
              {
                q: "Do you have dumpsters larger than 30 yards?",
                a: "For most residential and commercial projects, 30 yards is the maximum roll-off container size available in Florida. For very large projects, we arrange multiple 30 yard containers on site simultaneously or schedule frequent rotation so your crew always has an empty container available.",
              },
              {
                q: "What is the difference between a roll-off dumpster and a front-load dumpster?",
                a: "Roll-off dumpsters are the open-top containers delivered on a specialized truck and rolled off onto your driveway or job site. They are designed for project-based waste — renovations, cleanouts, construction, and demolition. Front-load dumpsters are the smaller, lidded containers you see behind restaurants and retail stores for ongoing commercial trash service. We provide roll-off dumpsters for project-based needs.",
              },
              {
                q: "Can I place the dumpster on the street instead of my driveway?",
                a: "Yes, but street placement usually requires a permit from your local municipality. Permit costs are typically $25-$150 and processing takes 1-3 business days. We know the permit rules for every area we serve and can guide you through the process. Driveway placement on your own property generally requires no permit.",
              },
              {
                q: "How do I know if a 20 or 30 yard will fit on my property?",
                a: "Both sizes have the same 22-foot by 8-foot footprint — the 30 yard is just taller (6 feet vs 4.5 feet). If you can fit a 20 yard, you can fit a 30 yard. The main concern is length: you need at least 22 feet of space, plus clearance for the delivery truck to back in. Measure your driveway and check for overhead obstructions.",
              },
            ].map((faq) => (
              <div key={faq.q} className="border-b border-zinc-200 pb-6">
                <h3 className="text-lg font-semibold text-zinc-900">{faq.q}</h3>
                <p className="mt-2 text-zinc-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "When in Doubt, Go One Size Up",
            body: "Upgrading from a 10 to a 20 yard costs $75 more. Ordering a second dumpster because the first one filled up costs $275+. We see it all the time — people underestimate how much stuff they have. Trust us, go bigger.",
          },
          {
            title: "Measure Your Driveway First",
            body: "A 20 or 30 yard dumpster is 22 feet long and 8 feet wide. A 10 yard is 12 feet long. Make sure your placement spot can handle it — and check for low-hanging branches, power lines, and overhead clearance for the delivery truck (23 feet vertical).",
          },
          {
            title: "Tell Us What You're Tossing",
            body: "\"I need a dumpster\" is a great start, but \"I'm tearing out a tile bathroom and ripping up carpet in three rooms\" lets us recommend the perfect size. The more detail you give us, the better we can dial in the right container for your project.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
