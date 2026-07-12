import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import {
  PHONE,
  SITE_URL,
  getEducationPageSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
} from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getAllServices, getRegions } from "@/app/site/fla-dumpster-rentals/_lib/data";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: `The Complete Guide to Dumpster Rental in Florida | ${PHONE}`,
  description: `Everything you need to know about renting a dumpster in Florida. Sizes, pricing, permits, regulations, weight limits, project tips, and expert advice. Call ${PHONE} for a free quote.`,
  alternates: { canonical: `${SITE_URL}/guide` },
  openGraph: {
    title: `The Complete Guide to Dumpster Rental in Florida | ${PHONE}`,
    description: `The most comprehensive dumpster rental guide in Florida. 10,000+ words of expert advice on sizes, pricing, permits, and project planning.`,
    url: `${SITE_URL}/guide`,
    type: "article",
  },
};

const guideFaqs = [
  { q: "What is a roll-off dumpster and how is it different from a regular dumpster?", a: "A roll-off dumpster is an open-top container that is delivered on a special truck and rolled off onto your property. Unlike front-load dumpsters (the enclosed ones behind businesses with lids), roll-off dumpsters are open on top for easy loading and come in larger sizes suitable for construction, renovation, and cleanout projects. They are temporary — delivered for your project and picked up when you are done." },
  { q: "How far in advance should I book a dumpster in Florida?", a: "For most situations, 1-2 days of advance notice is sufficient. We offer same-day delivery in many Florida metro areas for orders placed before noon. During peak seasons — hurricane aftermath, holiday weekends, and spring renovation season — booking 3-5 days ahead is recommended. Contractor accounts with scheduled projects can book weeks or months in advance." },
  { q: "What happens to the waste after my dumpster is picked up?", a: "Your waste is transported to a licensed disposal facility — either a landfill or a transfer station, depending on your location. Recyclable materials like metal, concrete, and clean wood are separated when possible. Clean yard waste is often sent to composting facilities. Florida has strict environmental regulations governing waste disposal, and all our partner haulers are fully licensed and compliant." },
  { q: "Can I move the dumpster after it has been placed?", a: "No, roll-off dumpsters should not be moved once placed. They are very heavy even when empty, and moving them can damage your driveway or the container. If you need the dumpster repositioned, call us and we will send a truck to move it for you. This is why it is important to confirm the exact placement location before delivery." },
  { q: "What is the difference between a dumpster rental company and a dumpster broker?", a: "A dumpster rental company owns its own trucks and containers. A dumpster broker connects customers with local haulers and negotiates pricing on your behalf. We operate as both — we have direct hauling capacity and we also work with a network of vetted local haulers across Florida. This hybrid model means we can serve every corner of the state while maintaining quality and competitive pricing." },
];

export default function GuidePage() {
  const services = getAllServices();
  const regions = getRegions();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(getEducationPageSchema()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(getFAQPageSchema(guideFaqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            getBreadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Complete Guide", url: "/guide" },
            ])
          ),
        }}
      />

      {/* Hero */}
      <section className="bg-stone-950 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[{ name: "Complete Guide", url: "/guide" }]}
            dark
          />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            The Complete Guide to Dumpster Rental in Florida
          </h1>
          <p className="mt-4 text-lg text-stone-400">
            Everything you need to know about renting a dumpster in the Sunshine
            State — from choosing the right size to understanding Florida-specific
            regulations, permits, pricing, weight limits, and expert tips for
            every type of project. Whether you are a first-time renter or a
            seasoned contractor, this guide has you covered.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Questions? Call{" "}
            <a href={`tel:${phonePlain}`} className="text-orange-400">
              {PHONE}
            </a>{" "}
            or text us anytime.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8">
            <h2 className="text-xl font-bold text-zinc-900">
              Table of Contents
            </h2>
            <nav className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { href: "#what-is-roll-off", label: "What Is a Roll-Off Dumpster?" },
                { href: "#sizes", label: "Dumpster Sizes Explained" },
                { href: "#pricing", label: "Florida Pricing Guide" },
                { href: "#weight", label: "Weight Limits & Overages" },
                { href: "#materials", label: "Accepted & Prohibited Materials" },
                { href: "#permits", label: "Florida Permit Requirements" },
                { href: "#process", label: "The Rental Process Step by Step" },
                { href: "#project-guides", label: "Project-Specific Guides" },
                { href: "#florida-specific", label: "Florida-Specific Considerations" },
                { href: "#choosing-company", label: "Choosing a Dumpster Company" },
                { href: "#environmental", label: "Environmental Responsibility" },
                { href: "#faq", label: "Frequently Asked Questions" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-orange-600 hover:text-orange-800"
                >
                  &rarr; {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <article className="bg-white pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* ===== SECTION: What Is a Roll-Off Dumpster ===== */}
          <section id="what-is-roll-off" className="pt-12">
            <h2 className="text-3xl font-bold text-zinc-900">
              What Is a Roll-Off Dumpster?
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                A roll-off dumpster is a large, open-top waste container that is
                delivered to your location on a specialized truck. The truck uses a
                hydraulic system to literally roll the dumpster off the back of the
                truck and onto the ground — hence the name. When you are done
                filling it, the truck returns, hooks onto the container, and rolls
                it back onto the truck bed for transport to a disposal facility.
              </p>
              <p>
                Roll-off dumpsters are fundamentally different from the enclosed,
                front-load dumpsters you see behind restaurants and businesses.
                Those permanent dumpsters are emptied on a schedule by a garbage
                truck with a front-loading mechanism. Roll-off dumpsters, by
                contrast, are temporary — they are delivered specifically for your
                project, sit on your property for a defined rental period, and are
                removed when the job is done.
              </p>
              <p>
                The open-top design of roll-off dumpsters makes them incredibly
                versatile. You can load them from any side by walking debris up to
                the edge, or use the swing-open door on one end to walk heavy items
                directly into the container without lifting them over the sides.
                This door is particularly useful for loading heavy materials like
                concrete, appliances, and furniture. The open top also means you
                can load bulky, irregularly shaped items like tree branches, old
                fencing, and demolished building materials that would never fit
                through the lid of a traditional dumpster.
              </p>
              <p>
                In Florida, roll-off dumpsters are used for an extraordinary range
                of projects: construction and demolition, home renovations, estate
                cleanouts, roofing replacements, storm debris cleanup, yard waste
                removal, commercial property maintenance, and simple household
                decluttering. They are the workhorse of the waste removal industry,
                and understanding how they work is the first step toward a
                successful rental experience.
              </p>
              <p className="text-sm italic text-stone-500">
                Fun fact: the average Florida homeowner will rent a dumpster 2 to 3
                times during their homeownership. Contractors rent them hundreds of
                times. Either way, it pays to understand how the process works.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Dumpster Sizes ===== */}
          <section id="sizes" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Dumpster Sizes Explained: 10, 20, and 30 Yard Containers
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Dumpster sizes are measured in cubic yards — one cubic yard is a
                space measuring 3 feet long by 3 feet wide by 3 feet tall.
                When we say a dumpster is &quot;20 yards,&quot; we mean it holds 20 cubic
                yards of material. But cubic yard measurements can feel abstract,
                so let us break each size down in terms you can actually picture.
              </p>

              <h3 className="pt-6 text-2xl font-bold text-zinc-900">
                10-Yard Dumpster: The Compact Option
              </h3>
              <p>
                <strong>Dimensions:</strong> Approximately 12 feet long, 8 feet
                wide, and 3.5 feet tall. <strong>Capacity:</strong> 10 cubic
                yards, equivalent to about 4 pickup truck loads.{" "}
                <strong>Weight limit:</strong> Typically 2 tons (4,000 pounds).
              </p>
              <p>
                The 10-yard dumpster is the smallest roll-off container commonly
                available, and it is perfect for projects that are too big for
                your regular trash service but do not require a massive container.
                Think of it as the Goldilocks option for smaller residential
                projects: big enough to be genuinely useful, small enough to fit
                in any standard driveway without dominating your entire front
                yard.
              </p>
              <p>
                In Florida, the 10-yard is most commonly rented for garage
                cleanouts (the average two-car garage cleanout fills about 60 to
                80 percent of a 10-yard), single bathroom remodels, small
                landscaping projects, and general decluttering sessions. It is
                also the go-to choice for apartment and condo cleanouts where
                access space may be limited.
              </p>
              <p>
                One important consideration with the 10-yard: the 2-ton weight
                limit can be reached quickly if you are loading heavy materials.
                A 10-yard dumpster filled with concrete would blow through the
                weight limit long before the container is full. For heavy
                materials, consider sizing up to a 20-yard which offers both more
                volume and a higher weight allowance.
              </p>

              <h3 className="pt-6 text-2xl font-bold text-zinc-900">
                20-Yard Dumpster: The Most Popular Choice
              </h3>
              <p>
                <strong>Dimensions:</strong> Approximately 22 feet long, 8 feet
                wide, and 4.5 feet tall. <strong>Capacity:</strong> 20 cubic
                yards, equivalent to about 8 pickup truck loads.{" "}
                <strong>Weight limit:</strong> Typically 3 to 4 tons (6,000 to
                8,000 pounds).
              </p>
              <p>
                The 20-yard dumpster is by far our most popular size, and for
                good reason — it handles the vast majority of both residential
                and commercial projects without being oversized for smaller jobs.
                If you are not sure which size to choose, the 20-yard is almost
                always the right call. It provides enough capacity for serious
                projects while maintaining a footprint that fits in standard
                residential driveways.
              </p>
              <p>
                In Florida, the 20-yard is the standard choice for kitchen
                remodels, roofing tear-offs on average-sized homes, full house
                decluttering projects, estate cleanouts, medium-scale
                construction projects, and commercial office cleanouts. A full
                kitchen gut-and-remodel — including cabinets, countertops,
                flooring, drywall, and appliances — typically fills 60 to 80
                percent of a 20-yard dumpster, leaving room for the inevitable
                additional debris that every renovation generates.
              </p>
              <p>
                The 3 to 4 ton weight allowance means the 20-yard can handle
                moderately heavy materials without overweight concerns. A mix of
                household debris, construction materials, and a few heavy items
                like countertops and appliances typically stays well within the
                weight limit. For roofing projects, a single layer of asphalt
                shingles from a 2,000 square foot Florida home weighs about 2 to
                3 tons — right at the weight limit, which is why roofing
                contractors sometimes opt for the 30-yard.
              </p>

              <h3 className="pt-6 text-2xl font-bold text-zinc-900">
                30-Yard Dumpster: The Heavy Hitter
              </h3>
              <p>
                <strong>Dimensions:</strong> Approximately 22 feet long, 8 feet
                wide, and 6 feet tall. <strong>Capacity:</strong> 30 cubic
                yards, equivalent to about 12 pickup truck loads.{" "}
                <strong>Weight limit:</strong> Typically 4 to 5 tons (8,000 to
                10,000 pounds).
              </p>
              <p>
                The 30-yard dumpster is the largest standard container available
                and is built for big jobs. Same footprint as the 20-yard but 1.5
                feet taller, the 30-yard provides 50 percent more capacity for
                projects that generate serious volume. In Florida, the 30-yard is
                the standard choice for new construction sites, full structural
                demolitions, whole-house cleanouts of larger homes, commercial
                building cleanouts, and major storm debris cleanup.
              </p>
              <p>
                The higher weight limit of 4 to 5 tons makes the 30-yard better
                suited for projects involving heavy materials — demolition of
                Florida&apos;s common concrete block construction, large roofing
                projects, and mixed heavy debris. For commercial construction
                sites that generate a continuous stream of waste, the 30-yard
                provides enough capacity to go several days between swaps,
                reducing the frequency (and cost) of pickups.
              </p>
              <p>
                One consideration with the 30-yard: at 6 feet tall, the sides
                are too high to easily toss debris over from ground level. You
                will want to use the rear door for loading, or consider having a
                step stool or short ladder available for tossing lighter items
                over the sides. On active construction sites where equipment is
                available for loading, this is not an issue.
              </p>
              <p className="text-sm italic text-stone-500">
                Pro tip: if you are genuinely torn between two sizes, go with the
                larger one. The price difference between a 20-yard and 30-yard is
                typically $100 to $150, but needing a second dumpster because
                you ran out of space costs much more. It is always cheaper to
                have a little extra room than to need a second delivery.
              </p>
            </div>
          </section>

          <CTAGroup variant="inline" />

          {/* ===== SECTION: Pricing ===== */}
          <section id="pricing" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              How Much Does Dumpster Rental Cost in Florida?
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Dumpster rental pricing in Florida is influenced by several
                factors, and understanding them helps you get the best deal and
                avoid surprises. Here is a comprehensive breakdown of what
                drives pricing and what you should expect to pay in 2026.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Factors That Affect Dumpster Rental Pricing
              </h3>
              <p>
                <strong>1. Dumpster size.</strong> This is the biggest pricing
                factor. Larger dumpsters cost more because they hold more waste
                and cost more to transport and dispose of. The price difference
                between sizes is relatively modest — typically $75 to $150 per
                size increment — which is why we often recommend sizing up if
                you are on the fence.
              </p>
              <p>
                <strong>2. Your location in Florida.</strong> Disposal costs
                (landfill tipping fees) vary significantly across Florida
                counties. South Florida counties like Miami-Dade, Broward, and
                Palm Beach tend to have higher tipping fees than rural counties
                in North Florida or the Panhandle. This directly affects your
                rental price. Urban areas also have higher operating costs for
                haulers (fuel, traffic, labor), which gets passed through in
                pricing.
              </p>
              <p>
                <strong>3. Type of debris.</strong> Mixed household and
                construction debris goes to standard landfills at standard
                tipping rates. Heavy materials like concrete, brick, and dirt may
                incur higher disposal fees. Clean yard waste, on the other hand,
                often qualifies for lower disposal rates at composting
                facilities, which can reduce your rental cost. Hazardous
                materials are not accepted and require separate specialized
                disposal.
              </p>
              <p>
                <strong>4. Rental duration.</strong> Standard rental periods of 7
                to 10 days are included in the base price. Extensions beyond the
                standard period incur daily fees, typically $10 to $20 per day
                depending on the size and market. If you know upfront that your
                project will take longer, ask about extended rental pricing — it
                is often cheaper to book a longer period upfront than to extend
                day by day.
              </p>
              <p>
                <strong>5. Seasonal demand.</strong> Pricing is generally stable
                throughout the year, but availability can tighten during peak
                periods — particularly after hurricanes when demand for debris
                removal dumpsters spikes dramatically. During these periods,
                pricing may increase modestly due to elevated demand and
                disposal costs.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                2026 Florida Dumpster Rental Price Ranges
              </h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-left">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="px-6 py-3 text-sm font-semibold text-zinc-900">
                        Size
                      </th>
                      <th className="px-6 py-3 text-sm font-semibold text-zinc-900">
                        Price Range
                      </th>
                      <th className="px-6 py-3 text-sm font-semibold text-zinc-900">
                        Included Period
                      </th>
                      <th className="px-6 py-3 text-sm font-semibold text-zinc-900">
                        Weight Limit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    <tr>
                      <td className="px-6 py-3 font-medium">10 Yard</td>
                      <td className="px-6 py-3 font-semibold text-orange-600">
                        $275 - $350
                      </td>
                      <td className="px-6 py-3 text-zinc-600">7 days</td>
                      <td className="px-6 py-3 text-zinc-600">2 tons</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-medium">20 Yard</td>
                      <td className="px-6 py-3 font-semibold text-orange-600">
                        $350 - $450
                      </td>
                      <td className="px-6 py-3 text-zinc-600">7-10 days</td>
                      <td className="px-6 py-3 text-zinc-600">3-4 tons</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 font-medium">30 Yard</td>
                      <td className="px-6 py-3 font-semibold text-orange-600">
                        $450 - $750
                      </td>
                      <td className="px-6 py-3 text-zinc-600">7-10 days</td>
                      <td className="px-6 py-3 text-zinc-600">4-5 tons</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                What Should Be Included in Your Quote
              </h3>
              <p>
                A reputable dumpster rental company provides all-inclusive,
                flat-rate pricing. Your quote should include: delivery of the
                dumpster to your location, the full rental period, pickup of the
                dumpster when you are done, transport to the disposal facility,
                and disposal fees up to your weight limit. If a company quotes
                you a low base price but then tacks on separate charges for
                delivery, fuel, environmental fees, or disposal, the final cost
                can end up significantly higher than an honest flat-rate quote.
                Always ask: &quot;Does this price include everything?&quot;
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Potential Additional Costs to Be Aware Of
              </h3>
              <p>
                <strong>Overweight fees:</strong> If your dumpster exceeds the
                included weight limit, you will be charged an overweight fee —
                typically $40 to $75 per ton over the limit. This is the most
                common additional charge and it is completely avoidable with
                proper planning. If you know your project involves heavy
                materials, tell your provider upfront so they can set appropriate
                weight expectations.
              </p>
              <p>
                <strong>Extension fees:</strong> Daily charges for keeping the
                dumpster beyond the included rental period. Usually $10 to $20
                per day. If you need extra time, communicate with your provider
                before the rental period expires — they are usually happy to
                extend at the daily rate.
              </p>
              <p>
                <strong>Prohibited items fees:</strong> If prohibited items like
                tires, mattresses (in some jurisdictions), or hazardous materials
                are found in your dumpster, additional disposal fees or fines
                may apply. Avoid this entirely by sticking to accepted materials.
              </p>
              <p>
                <strong>Dry run fees:</strong> If the delivery truck arrives but
                cannot place the dumpster due to blocked access, low-hanging
                wires, or other obstructions, a dry run fee may apply. Prevent
                this by ensuring the delivery area is clear and accessible
                before your scheduled delivery.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Weight Limits ===== */}
          <section id="weight" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Understanding Dumpster Weight Limits
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Weight limits are one of the most misunderstood aspects of
                dumpster rental, and they are particularly important in Florida
                where common building materials like concrete block and stucco
                are heavier than the wood-frame construction typical in other
                states. Understanding weight limits can save you from unexpected
                overweight charges.
              </p>
              <p>
                Every dumpster has two constraints: volume (how much space is
                inside) and weight (how heavy the contents can be). You are
                limited by whichever one you hit first. For lightweight materials
                like household junk, furniture, and general clutter, you will
                fill the volume long before you reach the weight limit. For
                heavy materials like concrete, brick, roofing shingles, and
                dirt, you will hit the weight limit with the dumpster only
                partially full.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Weight Estimates for Common Florida Materials
              </h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-left">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="px-6 py-3 text-sm font-semibold text-zinc-900">
                        Material
                      </th>
                      <th className="px-6 py-3 text-sm font-semibold text-zinc-900">
                        Weight per Cubic Yard
                      </th>
                      <th className="px-6 py-3 text-sm font-semibold text-zinc-900">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    <tr>
                      <td className="px-6 py-3">Household junk (mixed)</td>
                      <td className="px-6 py-3">150-300 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Rarely a weight concern</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3">Wood / lumber</td>
                      <td className="px-6 py-3">300-500 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Heavier when wet</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3">Drywall / sheetrock</td>
                      <td className="px-6 py-3">500-700 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Much heavier when water-damaged</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3">Asphalt shingles</td>
                      <td className="px-6 py-3">750-1,000 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Common weight limit trigger</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3">Concrete / block</td>
                      <td className="px-6 py-3">2,000-2,400 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Extremely heavy — plan carefully</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3">Dirt / soil</td>
                      <td className="px-6 py-3">1,800-2,200 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Even heavier when wet (Florida rain)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3">Yard waste</td>
                      <td className="px-6 py-3">200-500 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Light and bulky</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3">Tile / ceramic</td>
                      <td className="px-6 py-3">1,500-1,800 lbs</td>
                      <td className="px-6 py-3 text-stone-500">Common in Florida bathroom/kitchen demos</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                The math is straightforward: if you have a 20-yard dumpster with
                a 4-ton (8,000 lb) weight limit and you are loading concrete at
                2,200 lbs per cubic yard, you will hit the weight limit after
                loading just 3.6 cubic yards — less than 20 percent of the
                dumpster&apos;s volume. This is why communication with your dumpster
                provider about what you are loading is critical.
              </p>
              <p className="text-sm italic text-stone-500">
                Florida pro tip: water adds weight. If your dumpster sits
                through several afternoon thunderstorms and the contents absorb
                water, the weight increases. Materials like drywall, carpet, and
                cardboard can absorb significant water weight. Use a tarp during
                rainy periods to keep your load dry and your weight in check.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Materials ===== */}
          <section id="materials" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              What Can and Cannot Go in a Dumpster in Florida
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Florida has specific regulations governing what can be disposed
                of in roll-off dumpsters. These rules exist to protect Florida&apos;s
                unique environment — the Everglades, coastal waterways, aquifers,
                and ecosystems that make the state special. Violating disposal
                regulations can result in fines for both the customer and the
                hauler, so it is important to know the rules.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Generally Accepted Materials
              </h3>
              <p>
                The good news is that the vast majority of materials from
                residential, commercial, and construction projects are accepted
                in roll-off dumpsters. This includes: general household junk and
                clutter, furniture of all types, most appliances, clothing and
                textiles, small electronics, mattresses and box springs, drywall
                and sheetrock, wood and lumber (including treated wood in most
                jurisdictions), concrete and masonry, asphalt shingles, tile and
                ceramic, metal and steel, siding and trim, windows and doors,
                carpet and padding, flooring materials, yard waste and vegetation,
                cardboard and paper, and most bathroom and kitchen fixtures.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Prohibited Materials in Florida
              </h3>
              <p>
                The following materials are prohibited from standard roll-off
                dumpsters and require specialized disposal:
              </p>
              <p>
                <strong>Hazardous waste:</strong> This is the big category. It
                includes paint and paint thinners, solvents, pesticides and
                herbicides, automotive fluids (motor oil, brake fluid,
                antifreeze, transmission fluid), household chemicals, pool
                chemicals, adhesives and epoxies, and any material with a
                hazardous material warning label. Florida counties operate
                Household Hazardous Waste (HHW) collection programs — contact
                your county solid waste department for drop-off locations and
                schedules.
              </p>
              <p>
                <strong>Asbestos:</strong> Many Florida buildings constructed
                before 1980 contain asbestos in floor tiles, insulation, pipe
                wrap, popcorn ceilings, and roofing materials. Asbestos requires
                licensed abatement and separate disposal. If you are demolishing
                or renovating a pre-1980 structure, have materials tested before
                loading them into a dumpster. This is not just a regulation — it
                is a serious health concern.
              </p>
              <p>
                <strong>Batteries:</strong> All battery types — car batteries,
                lithium-ion, alkaline, and rechargeable — should be recycled
                through appropriate channels. Many Florida retailers and auto
                parts stores accept batteries for recycling.
              </p>
              <p>
                <strong>Tires:</strong> Florida requires tires to be recycled
                separately. Most tire shops accept old tires for a small fee.
                Tires left in dumpsters collect rainwater and become breeding
                grounds for mosquitoes — a particular concern in Florida where
                mosquito-borne diseases are a public health priority.
              </p>
              <p>
                <strong>Refrigerants:</strong> Refrigerators, air conditioners,
                and freezers contain refrigerant gases that must be properly
                recovered before disposal. A certified technician can remove the
                refrigerant, after which the appliance itself can go in the
                dumpster. Many dumpster rental companies (including us) can
                arrange refrigerant removal.
              </p>
              <p>
                <strong>Medical waste:</strong> Needles, syringes, blood-soaked
                materials, and other medical waste require specialized disposal
                through licensed medical waste services.
              </p>
              <p>
                <strong>Propane tanks and compressed gas cylinders:</strong>
                These pose explosion risks during compaction and transport. Most
                propane tank exchange locations accept empty tanks.
              </p>
            </div>
          </section>

          <CTAGroup variant="mid" />

          {/* ===== SECTION: Permits ===== */}
          <section id="permits" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Dumpster Permit Requirements in Florida
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Florida has no statewide dumpster permit requirement. Permit
                rules are set at the city and county level, which means they
                vary significantly depending on where you live. Here is the
                general framework and what you need to know for different
                situations.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Private Property Placement: No Permit Required
              </h3>
              <p>
                If your dumpster is placed on your own private property —
                your driveway, side yard, parking lot, or any area within your
                property lines — you do not need a permit anywhere in Florida.
                This covers the vast majority of residential dumpster rentals.
                Just make sure the dumpster does not block sidewalks, extend
                into the street, or violate any HOA regulations.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Public Right-of-Way Placement: Permit Usually Required
              </h3>
              <p>
                If the dumpster must be placed on a public street, sidewalk,
                alley, or right-of-way, you will likely need a permit from your
                city or county. This situation arises when there is no driveway
                (common in older Florida neighborhoods and urban areas), when
                the driveway is too narrow or has overhead obstructions, or when
                the project requires dumpster placement closer to the work area
                than the driveway allows.
              </p>
              <p>
                Permit costs across Florida typically range from free (some
                smaller cities) to $200 (major metropolitan areas). Processing
                times range from same-day (walk-in at city hall) to 5 business
                days (online applications in larger jurisdictions). Most permits
                specify the allowed placement duration, required safety measures
                (reflective tape, traffic cones), and hours during which the
                dumpster must not obstruct traffic.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                HOA Considerations
              </h3>
              <p>
                Florida has more homeowners associations than any other state,
                and many of them have specific rules about dumpster placement.
                Common HOA restrictions include: maximum duration the dumpster
                can remain (often 3 to 7 days), required advance notification
                to the HOA board or management company, placement restrictions
                (driveway only, not visible from street), and requirements for
                covering the dumpster with a tarp. Before ordering a dumpster
                in an HOA community, check your CC&Rs or contact your
                management company. Violating HOA rules can result in fines
                that cost more than the dumpster rental itself.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Permit Tips by Major Florida Metro
              </h3>
              <p>
                <strong>Miami-Dade County:</strong> Right-of-way permits required
                for street placement. Apply through Miami-Dade Building
                Department. Cost: $50-$150. Processing: 3-5 business days.
              </p>
              <p>
                <strong>Broward County / Fort Lauderdale:</strong> Each city
                within Broward has its own permit requirements. Fort Lauderdale
                requires a Public Right of Way Permit for street placement.
                Cost: $50-$100. Processing: 2-3 business days.
              </p>
              <p>
                <strong>Tampa / Hillsborough County:</strong> Street placement
                requires a Temporary Use Permit. Contact the Transportation
                Maintenance Division. Cost: $50-$100. Processing: 3-5 business
                days.
              </p>
              <p>
                <strong>Orlando / Orange County:</strong> Right-of-way permit
                required for street placement. Apply through the City&apos;s
                Transportation Engineering Division. Cost varies by duration.
              </p>
              <p>
                <strong>Jacksonville / Duval County:</strong> Right-of-way use
                permits handled through the City of Jacksonville Public Works
                Department. Generally straightforward and affordable.
              </p>
              <p className="text-sm italic text-stone-500">
                Not sure about your city&apos;s requirements? Text or call us at{" "}
                {PHONE} and we will look it up for you. We have delivered
                dumpsters in every corner of Florida and we know the local rules.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Process ===== */}
          <section id="process" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              The Dumpster Rental Process: Step by Step
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Renting a dumpster in Florida is straightforward, but knowing
                what to expect at each step helps the process go smoothly. Here
                is a detailed walkthrough from first contact to final pickup.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Step 1: Contact Us and Describe Your Project
              </h3>
              <p>
                Text or call us at {PHONE} with three pieces of information:
                what type of project you are doing, your delivery address in
                Florida, and when you need the dumpster. That is it. From this
                information we can recommend the right dumpster size, give you
                an accurate quote, and schedule delivery. The average time from
                first contact to confirmed booking is about 30 seconds via text.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Step 2: Receive Your Quote and Confirm
              </h3>
              <p>
                We provide a flat-rate quote that includes delivery, the rental
                period, pickup, and disposal. No hidden fees, no separate line
                items for fuel or environmental charges. We will also let you
                know the weight limit for your specific container and any
                materials to avoid. Reply to confirm and you are booked.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Step 3: Prepare Your Delivery Area
              </h3>
              <p>
                Before the dumpster arrives, make sure the delivery area is
                clear. Move vehicles out of the driveway, clear any items from
                the placement spot, and make sure there are no overhead
                obstructions like low-hanging tree branches, basketball hoops,
                or power lines that could interfere with the delivery truck&apos;s
                hydraulic arm. The delivery area should be on a firm, relatively
                level surface — concrete, asphalt, or compacted ground.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Step 4: Delivery
              </h3>
              <p>
                Our driver will place the dumpster in your specified location.
                You do not need to be home for delivery — just make sure the
                area is accessible and let us know any special instructions
                (gate codes, preferred orientation, plywood placement for
                surface protection). The driver will place the dumpster as
                close to your work area as safely possible.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Step 5: Load the Dumpster
              </h3>
              <p>
                Fill the dumpster at your own pace during the rental period.
                Load materials evenly across the container to distribute weight.
                Break down large items when possible to maximize space. Keep
                debris level with or below the top of the dumpster walls — do
                not stack materials above the sides. Use the rear door for
                heavy items to avoid lifting. If you are working in Florida
                summer heat, load during morning and evening hours and stay
                hydrated.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Step 6: Schedule Pickup
              </h3>
              <p>
                When you are done filling the dumpster — or when your rental
                period is nearing its end — text or call us to schedule pickup.
                In most areas, we can pick up the next business day. You do not
                need to be present for pickup, but make sure there is clear
                access for the truck and no vehicles or obstacles blocking the
                dumpster.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Step 7: Disposal and Invoicing
              </h3>
              <p>
                We transport your dumpster to a licensed disposal facility. Your
                load is weighed, and if it is within the included weight limit,
                you are all set — no additional charges. If the load exceeds the
                weight limit, we will notify you of any overage charges before
                processing. For most projects, the flat-rate quote is the final
                cost.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Project Guides ===== */}
          <section id="project-guides" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Project-Specific Dumpster Rental Guides
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Different projects have different waste profiles. Here are
                detailed recommendations for the most common dumpster rental
                projects in Florida.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Kitchen Remodel
              </h3>
              <p>
                A full kitchen gut-and-remodel generates approximately 8 to 12
                cubic yards of waste: old cabinets (bulky but moderate weight),
                countertops (granite and quartz are heavy), flooring
                (tile is heavy, vinyl is light), drywall, plumbing fixtures,
                appliances, and miscellaneous debris. A 20-yard dumpster is the
                standard choice. Keep the dumpster for the full renovation
                period so you can load debris as you go rather than letting it
                pile up. Total project weight: typically 1.5 to 3 tons.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Roofing Replacement
              </h3>
              <p>
                Roofing waste is heavy relative to its volume. A single-layer
                asphalt shingle tear-off from a 2,000 sq ft Florida home
                generates about 5 to 7 cubic yards of shingle waste weighing 2
                to 3 tons. A 20-yard dumpster provides ample volume, but watch
                the weight limit — especially for tile roofs which are heavier
                than asphalt. For multi-layer tear-offs, larger homes, or
                commercial roofs, size up to a 30-yard. Coordinate delivery for
                the evening before or morning of the roofing day.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Whole-House Cleanout
              </h3>
              <p>
                Whether you are preparing a house for sale, clearing out after
                a move, or handling an estate cleanout, a whole-house cleanout
                generates 15 to 25 cubic yards of mixed household items. A
                20-yard dumpster handles most 2 to 3 bedroom Florida homes. For
                larger homes, homes with extensive accumulation, or properties
                with garage and attic cleanout included, a 30-yard or two
                20-yard loads may be needed. Weight is rarely an issue with
                household items — you will fill the volume first.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Bathroom Renovation
              </h3>
              <p>
                A single bathroom remodel generates 2 to 4 cubic yards of waste:
                old tile (heavy), vanity and cabinets, toilet, bathtub or
                shower surround, drywall, and flooring. A 10-yard dumpster is
                sufficient for most single-bathroom projects. For master
                bathroom renovations or multi-bathroom projects, size up to a
                20-yard. The tile from a Florida bathroom floor and shower can
                weigh 500 to 1,000 pounds alone — factor this into your weight
                estimate.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Storm Debris Cleanup
              </h3>
              <p>
                Hurricane and tropical storm debris is unpredictable in both
                volume and composition. A moderate storm might leave you with a
                few fallen branches and some damaged screening — a 10-yard
                handles it. A major hurricane can destroy roofing, fencing,
                landscaping, pool enclosures, and flood interior contents —
                requiring one or more 30-yard dumpsters. After a significant
                storm, assess the full scope of damage before ordering and
                consider that insurance may cover the cost. Book early — dumpster
                availability disappears fast after major Florida storms.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                New Construction
              </h3>
              <p>
                New construction sites generate waste throughout the building
                process: site clearing debris, concrete and block waste from
                foundation work, framing lumber scraps, drywall cutoffs,
                roofing scrap, trim and finish waste, and packaging materials.
                Most Florida construction sites use 30-yard dumpsters with
                scheduled weekly or bi-weekly swaps. A typical single-family
                home construction generates 15 to 30 cubic yards of waste over
                the course of the build. Contractor accounts with volume
                pricing make ongoing construction waste management affordable.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Florida-Specific ===== */}
          <section id="florida-specific" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Florida-Specific Dumpster Rental Considerations
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Renting a dumpster in Florida is not the same as renting one in
                Ohio or Oregon. The climate, building materials, regulatory
                environment, and weather patterns all create unique
                considerations that Florida customers need to understand.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Hurricane Season Planning
              </h3>
              <p>
                Florida&apos;s hurricane season officially runs from June 1 through
                November 30, with peak activity in August through October. If
                you are planning a major renovation or construction project,
                consider the timing relative to hurricane season. A roof
                tear-off in September means your home is temporarily exposed
                during the most active storm period. More practically, dumpster
                availability can become extremely limited after a major storm
                event — we have seen demand increase 300 to 500 percent in
                affected areas. If a hurricane is approaching, contact us
                immediately to reserve dumpsters for post-storm cleanup. Having
                a confirmed reservation gives you priority when dumpsters
                become available after the storm passes.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Florida Heat and Loading Strategy
              </h3>
              <p>
                Loading a dumpster in Florida summer heat is physically
                demanding work. Heat indices regularly exceed 105 degrees
                from June through September. Smart loading strategy means:
                working during early morning hours (before 10 AM) and evening
                hours (after 5 PM), taking frequent hydration breaks, having a
                second person to help with heavy items, and spreading the work
                across multiple days rather than trying to power through in one
                session. Your 7-day rental period gives you plenty of time to
                work at a safe, comfortable pace. Nobody has ever received an
                award for speed-loading a dumpster.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Afternoon Thunderstorms and Tarps
              </h3>
              <p>
                From May through October, Florida experiences almost daily
                afternoon thunderstorms that can dump 1 to 3 inches of rain in
                30 minutes. Rain adds weight to absorbent materials in your
                dumpster — a dumpster full of drywall and cardboard that sits
                through a week of afternoon storms can gain hundreds of pounds
                of water weight. This can push you over your weight limit and
                increase disposal costs. Solution: keep a tarp over your
                dumpster between loading sessions. It takes 30 seconds to
                pull the tarp on and it can save you $50 to $100 in overage
                charges.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Concrete Block Construction
              </h3>
              <p>
                Many Florida homes and commercial buildings — especially those
                built from the 1950s through 1990s — use concrete block (CMU)
                construction rather than wood framing. This is great for
                hurricane resistance but creates much heavier demolition waste.
                A 10x10-foot section of concrete block wall weighs approximately
                2,500 to 3,000 pounds. If your project involves demolishing
                block walls, factor this into your dumpster size and weight
                limit decisions. You may need a dedicated heavy-load container
                or plan on multiple loads.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Coastal and Island Delivery
              </h3>
              <p>
                Florida&apos;s extensive coastline and barrier islands create
                unique delivery challenges. Bridge weight limits, narrow island
                streets, limited turning radius, and tidal flooding can all
                affect dumpster delivery logistics. If you are located on a
                barrier island or in a coastal area with access limitations,
                let us know when you order so we can arrange appropriate
                equipment and plan the delivery route. We deliver to coastal
                communities throughout Florida including the Keys, barrier
                islands on both coasts, and waterfront properties.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Florida Landfill and Disposal Regulations
              </h3>
              <p>
                Florida regulates solid waste disposal through the Department
                of Environmental Protection (DEP). Each county operates its own
                landfill or contracts with private facilities, and tipping fees
                (the cost to dispose of waste) vary by county. This is why
                dumpster rental pricing varies by location within Florida.
                South Florida counties generally have higher tipping fees ($45
                to $65 per ton) than North Florida and rural counties ($25 to
                $40 per ton). These costs are factored into your flat-rate
                quote so you do not need to worry about them individually.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Choosing a Company ===== */}
          <section id="choosing-company" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              How to Choose a Dumpster Rental Company in Florida
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Not all dumpster rental companies are created equal, and
                choosing the wrong one can mean surprise charges, missed
                deliveries, and frustrating communication. Here is what to look
                for and what to avoid.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                What to Look For
              </h3>
              <p>
                <strong>Transparent, flat-rate pricing.</strong> The quote should
                include delivery, rental period, pickup, and disposal. If a
                company will not give you an all-inclusive number, that is a red
                flag. Ask specifically: &quot;Does this price include everything, or
                are there additional fees?&quot;
              </p>
              <p>
                <strong>Clear weight limits and overage policies.</strong> A
                reputable company tells you upfront what the weight limit is
                and what happens if you exceed it. Avoid companies that are
                vague about weight policies — you do not want to discover the
                rules after you have already loaded the dumpster.
              </p>
              <p>
                <strong>Responsive communication.</strong> If it takes a company
                3 hours to reply to your initial inquiry, imagine how responsive
                they will be when you need a pickup or have an issue. Look for
                companies that communicate quickly via your preferred channel —
                text, phone, or email.
              </p>
              <p>
                <strong>Verified reviews.</strong> Check Google reviews, Better
                Business Bureau ratings, and industry review sites. Look for
                patterns in reviews — consistent praise for reliability and
                pricing is a good sign, while repeated complaints about hidden
                fees or missed pickups are dealbreakers.
              </p>
              <p>
                <strong>Local knowledge.</strong> A company that serves your
                specific area of Florida will know the local landfill options,
                permit requirements, HOA challenges, and delivery logistics.
                This local expertise translates into better service and more
                accurate recommendations.
              </p>

              <h3 className="pt-4 text-xl font-bold text-zinc-900">
                Red Flags to Avoid
              </h3>
              <p>
                Unusually low base prices (they will make it up in hidden fees).
                Vague or missing weight limit information. No physical address
                or verifiable business identity. Requiring full payment before
                delivery with no refund policy. High-pressure sales tactics or
                demanding you book immediately to &quot;hold a price.&quot; Poor or no
                online reviews. Inability to explain exactly what is included in
                the price.
              </p>
            </div>
          </section>

          {/* ===== SECTION: Environmental ===== */}
          <section id="environmental" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Environmental Responsibility and Recycling
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-zinc-700">
              <p>
                Florida&apos;s environment is uniquely sensitive — from the
                Everglades and coral reefs to the aquifer that supplies much of
                the state&apos;s drinking water. Responsible waste disposal is not
                just a regulatory requirement; it is essential to preserving
                the natural beauty and ecological health that define Florida.
              </p>
              <p>
                Modern disposal facilities in Florida incorporate significant
                recycling and material recovery. At transfer stations and
                landfills, materials like metals, clean concrete, cardboard,
                and clean wood are separated for recycling or repurposing.
                Clean concrete is crushed and reused as road base material.
                Metal is recycled through scrap processors. Clean yard waste is
                composted and turned into mulch and soil amendments.
              </p>
              <p>
                As a dumpster rental customer, you can contribute to
                responsible disposal by: keeping prohibited materials out of
                your dumpster (especially hazardous chemicals that can
                contaminate landfills), separating clean yard waste into its
                own load when possible (it goes to composting rather than
                landfill), and letting your dumpster provider know what types
                of materials are in your load so they can route it to the most
                appropriate facility.
              </p>
              <p>
                Before loading items into a dumpster, consider whether they
                could be donated or reused. Furniture, appliances, clothing,
                and building materials in good condition can be donated to
                Habitat for Humanity ReStores, Goodwill, Salvation Army, and
                other organizations. Estate cleanouts in particular often
                contain items that have significant value or usefulness to
                others. Donating before dumpstering is better for the
                environment and can provide a tax deduction.
              </p>
            </div>
          </section>

          <CTAGroup variant="preFaq" />

          {/* ===== SECTION: FAQ ===== */}
          <section id="faq" className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Frequently Asked Questions
            </h2>
            <div className="mt-8 space-y-6">
              {guideFaqs.map((faq) => (
                <div key={faq.q} className="border-b border-zinc-100 pb-6">
                  <h3 className="text-lg font-semibold text-zinc-900">
                    {faq.q}
                  </h3>
                  <p className="mt-2 leading-relaxed text-zinc-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== SECTION: Service Links ===== */}
          <section className="pt-16">
            <h2 className="text-3xl font-bold text-zinc-900">
              Explore Our Dumpster Rental Services
            </h2>
            <p className="mt-3 text-stone-500">
              We offer specialized dumpster rental services for every type of
              project across all of Florida.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {services.map((svc) => (
                <Link
                  key={svc.slug}
                  href={`/${svc.slug}`}
                  className="rounded-lg border border-zinc-200 p-4 hover:border-orange-300"
                >
                  <h3 className="font-semibold text-zinc-900">{svc.name}</h3>
                  <p className="mt-1 text-xs text-stone-500">
                    {svc.priceRange} | {svc.recommendedSize}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* ===== SECTION: Region Links ===== */}
          <section className="pt-12">
            <h2 className="text-2xl font-bold text-zinc-900">
              Dumpster Rental by Florida Region
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {regions.map((r) => (
                <Link
                  key={r}
                  href={`/areas#${r.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-orange-300"
                >
                  {r}
                </Link>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="pt-12 text-center">
            <p className="text-lg text-zinc-700">
              Have questions this guide did not answer? We are happy to help.
            </p>
            <p className="mt-2 text-stone-500">
              Text or call{" "}
              <a
                href={`tel:${phonePlain}`}
                className="font-semibold text-orange-600"
              >
                {PHONE}
              </a>{" "}
              — average response time is under 60 seconds.
            </p>
          </section>
        </div>
      </article>

      <ProTip
        tips={[
          {
            title: "Bookmark This Page",
            body: "This guide has everything you need to know about renting a dumpster in Florida — sizes, pricing, permits, weight limits, project tips. Save it now and come back when your project starts. Future you will thank present you.",
          },
          {
            title: "Screenshot the Weight Table",
            body: "Knowing how much common materials weigh can save you real money. Concrete runs about 150 lbs per cubic foot. Roofing shingles weigh 2-3 tons per 2,000 sq ft roof. Household junk is light but bulky. Matching your materials to the right weight limit prevents overage fees.",
          },
          {
            title: "Call Us If You're Still Confused",
            body: "We wrote 10,000+ words of dumpster rental advice, but sometimes you just need to talk to a human who's done this a thousand times. Call or text us — we genuinely enjoy helping people figure out the right dumpster for their project. Somebody has to love this stuff.",
          },
        ]}
      />

      <CTAGroup variant="final" />
    </>
  );
}
