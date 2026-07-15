import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import { getAllServices, getServicesByCategory } from "@/app/site/the-nyc-exterminator/_lib/data";
import { PHONE, SITE_URL, SITE_NAME, EMAIL, ADDRESS } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getFAQPageSchema, getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";

export const metadata: Metadata = {
  title:
    "Pest Control Pricing NYC | Exterminator Costs from $49 | No Hidden Fees",
  description:
    "See transparent pest control pricing and exterminator rates for NYC, NJ, Long Island & Westchester. Cockroach extermination from $150, bed bug treatment from $300, rat control from $200. Self-book online & save $10. Free inspections, upfront written quotes, no hidden fees. Licensed & insured.",
  keywords:
    "pest control pricing NYC, exterminator cost NYC, how much does exterminator cost, bed bug treatment cost NYC, cockroach extermination price, rat exterminator cost, termite treatment pricing, commercial pest control pricing",
  openGraph: {
    title: "Pest Control Pricing NYC | Exterminator Costs from $49 | No Hidden Fees",
    description:
      "Transparent pest control pricing for NYC. Cockroach treatment from $150, bed bugs from $300, rats from $200. Self-book online & save $10. Free inspections, no hidden fees.",
    url: `${SITE_URL}/pricing`,
  },
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
};

const pricingFaqs = [
  {
    q: "How much does pest control cost in NYC?",
    a: "Pest control costs in New York City vary depending on the type of pest, severity of the infestation, property size, and treatment method selected. General pest control starts at $125 for a single treatment visit. Cockroach extermination typically ranges from $150 to $400 per treatment. Bed bug treatment ranges from $300 to $1,500 per room depending on whether you choose chemical treatment or heat treatment. Rat extermination costs between $200 and $600. Termite treatment, which requires more specialized methods and materials, ranges from $800 to $3,000. Every pest control engagement at The NYC Exterminator begins with a free inspection and a written quote, so you always know exactly what you will pay before any work begins.",
  },
  {
    q: "Do you charge for pest inspections?",
    a: "No. Every pest control engagement starts with a completely free, no-obligation inspection. Our licensed exterminator will visit your property, identify the pest species present, assess the severity of the infestation, locate entry points and breeding sites, and provide you with a detailed written quote. There is never a charge for this initial inspection, whether you are a residential homeowner, a renter, a commercial property owner, or a restaurant operator. We believe the inspection is the foundation of effective pest control, and charging for it would discourage people from getting the help they need early, before the problem gets worse and more expensive to treat.",
  },
  {
    q: "Are there hidden fees or extra charges after the initial quote?",
    a: "Absolutely not. The NYC Exterminator operates on a fully transparent pricing model. The written quote you receive after your free inspection is the exact price you will pay. We do not add fuel surcharges, equipment rental fees, product upcharges, or surprise add-ons after the fact. If the scope of work needs to change during the treatment process, for example if we discover a more extensive infestation than initially assessed, we will discuss it with you, explain the additional work required, and get your written approval before proceeding with any changes to the original quote.",
  },
  {
    q: "Is a monthly pest control maintenance plan worth the cost?",
    a: "For the vast majority of NYC properties, a monthly or quarterly pest control maintenance plan is significantly more cost-effective than calling an exterminator reactively each time a pest problem arises. Consider the math: a single cockroach extermination treatment costs $150 to $400, and most infestations require two to three treatments for full elimination, totaling $300 to $1,200 for one episode. A monthly maintenance plan at $50 to $125 per month provides year-round comprehensive pest coverage, including cockroaches, ants, spiders, and rodent monitoring, and prevents infestations before they start. Buildings with ongoing pest pressure, restaurants that need DOH compliance documentation, and commercial properties all benefit substantially from maintenance plans.",
  },
  {
    q: "How much does emergency pest control cost in NYC?",
    a: "Emergency pest control services range from $200 to $500 depending on the pest type, urgency, and timing. Same-day service during business hours adds approximately $50 to the standard treatment rate. After-hours evening service adds about $100. Weekend and holiday emergency calls add approximately $150. However, customers on monthly or quarterly maintenance plans receive emergency callbacks at no additional surcharge. Emergency pest control service is available for situations requiring immediate attention, such as active rodent sightings in food service establishments, severe bed bug discoveries in hotels, wasp or hornet nests near building entrances, and wildlife intrusions into occupied spaces.",
  },
  {
    q: "Do you offer discounts for multi-unit buildings?",
    a: "Yes. We offer significant volume discounts for multi-unit residential buildings, co-ops, condominiums, and commercial properties with multiple locations. Treating an entire building is more effective than treating individual units in isolation, because pests migrate through shared walls, plumbing, and electrical chases. Our building-wide treatment programs are priced per unit at rates substantially below individual apartment treatment costs. We also offer dedicated account management for large buildings and property management companies. Contact us or request a quote online for custom multi-unit pest control pricing.",
  },
  {
    q: "What payment methods do you accept for pest control services?",
    a: "We accept all major credit cards including Visa, Mastercard, American Express, and Discover, as well as debit cards, personal and business checks, and bank transfers. For commercial pest control accounts and maintenance plan customers, we offer monthly invoicing with net-30 payment terms. Payment for one-time pest control treatments is due upon completion of service unless alternative arrangements have been made in advance. We do not require deposits or prepayment for standard residential exterminator services.",
  },
  {
    q: "Does homeowner's insurance cover pest control costs?",
    a: "In most cases, standard homeowner's insurance policies do not cover pest control or extermination costs, because pest infestations are generally classified as a maintenance issue rather than sudden damage. However, some commercial insurance policies include coverage for pest-related structural damage, particularly from termites and wood-destroying insects. In NYC rental apartments, landlords are legally required to provide and pay for pest control under the NYC Housing Maintenance Code. If you are a renter dealing with a pest problem, your landlord is typically responsible for the cost of extermination. The NYC Exterminator can provide documentation to support insurance claims or landlord reimbursement requests.",
  },
  {
    q: "What is included in the price of a pest control treatment?",
    a: "Every pest control treatment from The NYC Exterminator includes a comprehensive package: a thorough property inspection to identify pest species and entry points, a customized treatment plan using EPA-approved products, the complete treatment application performed by a licensed exterminator, at least one follow-up inspection within two to four weeks to verify results, re-treatment at no additional charge if needed, detailed prevention recommendations, and our satisfaction guarantee. If pests return between scheduled treatments, we come back and treat again at no extra cost. When comparing exterminator pricing, make sure you are comparing total packages, not just the headline number.",
  },
  {
    q: "How does commercial pest control pricing differ from residential?",
    a: "Commercial pest control pricing is structured differently from residential in several important ways. Commercial pricing is typically based on square footage, industry type, required service frequency, and documentation needs. A small retail space or office under 2,000 square feet might pay $150 to $300 per month. Restaurants and food service businesses require more intensive and frequent service, ranging from $200 to $600 per month, and must include DOH-compliant documentation. Large commercial spaces, warehouses, and hospitality properties can range from $400 to $2,000 per month depending on their size and complexity. Commercial pest control plans include service reports, bait station mapping, pesticide usage logs, and all documentation required for health department inspections. Residential pricing is simpler, based primarily on unit size and pest type.",
  },
];

export default function PricingPage() {
  const allServices = getAllServices();
  const servicesByCategory = getServicesByCategory();
  const phonePlain = PHONE.replace(/-/g, "");

  const breadcrumbItems = [{ name: "Pricing", url: "/pricing" }];

  return (
    <div>
      {/* JSON-LD: FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(getFAQPageSchema(pricingFaqs)),
        }}
      />
      {/* JSON-LD: Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            getBreadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Pricing", url: "/pricing" },
            ])
          ),
        }}
      />

      {/* ───────────────── HERO ───────────────── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-zinc-400">
              <li>
                <Link href="/" className="hover:text-green-400">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-zinc-200">Pricing</li>
            </ol>
          </nav>

          <div className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Pest Control &amp; Exterminator Pricing
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Transparent Pest Control
              <br />
              <span className="text-green-400">
                Pricing. No Hidden Fees.
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              At{" "}
              <Link
                href="/about"
                className="text-green-400 hover:text-green-300"
              >
                {SITE_NAME}
              </Link>
              , we believe every homeowner and business owner in New York City
              deserves to know exactly what pest control costs before a single
              treatment is applied. Our exterminator pricing model is built on
              radical transparency: every engagement starts with a{" "}
              <strong className="text-white">free property inspection</strong>,
              followed by a{" "}
              <strong className="text-white">detailed written quote</strong>{" "}
              that covers every aspect of your treatment plan. There are no
              hidden fees, no bait-and-switch tactics, and no surprise charges
              after the work is done. Whether you need{" "}
              <Link
                href="/cockroach-extermination"
                className="text-green-400 hover:text-green-300"
              >
                cockroach extermination
              </Link>
              ,{" "}
              <Link
                href="/bed-bug-treatment"
                className="text-green-400 hover:text-green-300"
              >
                bed bug treatment
              </Link>
              ,{" "}
              <Link
                href="/rat-extermination"
                className="text-green-400 hover:text-green-300"
              >
                rat extermination
              </Link>
              , or{" "}
              <Link
                href="/general-pest-control"
                className="text-green-400 hover:text-green-300"
              >
                general pest control
              </Link>
              , you will always know the full cost upfront. We have built our
              reputation on honest exterminator rates and lasting results across{" "}
              <Link
                href="/areas"
                className="text-green-400 hover:text-green-300"
              >
                NYC, NJ, Long Island &amp; Westchester
              </Link>
              , and our pricing reflects that commitment.
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              Our pest control pricing page provides comprehensive information
              about what you can expect to pay for every type of exterminator
              service we offer. We publish these ranges because we believe
              informed customers make better decisions, and because we are
              confident that our pricing delivers the best value in the NYC metro
              area when you consider what is included: licensed technicians,
              EPA-approved products, follow-up visits, and a satisfaction
              guarantee. Browse our{" "}
              <Link
                href="/services"
                className="text-green-400 hover:text-green-300"
              >
                full service menu
              </Link>{" "}
              for detailed information about each pest control treatment, or
              text{" "}
              <a
                href={`sms:${phonePlain}`}
                className="text-green-400 hover:text-green-300 font-semibold"
              >
                us
              </a>{" "}
              to schedule your free inspection today.
            </p>

            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* ───────────────── PRICING PHILOSOPHY ───────────────── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our Pest Control{" "}
            <span className="text-green-500">Pricing Philosophy</span>
          </h2>
          <div className="mt-6 max-w-4xl space-y-5 text-zinc-300 leading-7">
            <p>
              The pest control industry has earned a reputation for opaque
              pricing, and frankly, many exterminator companies deserve that
              criticism. Too many pest control providers advertise
              artificially low starting prices to get through the door, only
              to pile on hidden charges once the technician arrives at your
              property. We have heard the stories from our own customers who
              tried other exterminators before finding{" "}
              <Link
                href="/about"
                className="text-green-400 hover:text-green-300"
              >
                The NYC Exterminator
              </Link>
              : a &quot;$99 cockroach treatment&quot; that balloons to $400
              once the technician adds on &quot;necessary&quot; product
              upgrades, or a pest control quote that conveniently does not
              mention the three follow-up visits that are actually required
              for the treatment to work. That is not how we operate, and it
              never will be.
            </p>
            <p>
              Our pest control pricing model is built on three foundational
              principles that guide every customer interaction, from the
              initial phone call to the final follow-up inspection. These
              principles are not marketing slogans; they are the operational
              standards that every member of our exterminator team follows on
              every single job, whether it is a $125{" "}
              <Link
                href="/general-pest-control"
                className="text-green-400 hover:text-green-300"
              >
                general pest control
              </Link>{" "}
              visit to a studio apartment or a $3,000{" "}
              <Link
                href="/termite-treatment"
                className="text-green-400 hover:text-green-300"
              >
                termite treatment
              </Link>{" "}
              on a brownstone foundation.
            </p>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Free Inspections, Always",
                desc: `Every pest control engagement at ${SITE_NAME} starts with a completely free, no-obligation property inspection. Our licensed exterminator arrives at your property and conducts a thorough assessment: identifying the pest species present, evaluating infestation severity, mapping entry points and harborage areas, and assessing environmental conditions that contribute to the problem. This is not a five-minute walk-through with a flashlight. Our inspections are comprehensive, covering kitchens, bathrooms, basements, attics, crawl spaces, utility areas, and exterior perimeters. For bed bug and termite concerns, we may deploy specialized detection equipment or K-9 teams. Only after this detailed assessment do we provide you with a quote. You will never pay for an inspection or consultation at The NYC Exterminator, regardless of whether you proceed with treatment.`,
              },
              {
                title: "Upfront Written Quotes",
                desc: "After your free inspection, you receive a detailed written quote that itemizes every aspect of the proposed treatment plan. You will see exactly what is included: the specific pest control methods and products we will use, the number of treatment visits required, the follow-up inspection schedule, any preparation you need to do before treatment, and the total cost of the engagement. The price on that quote is the price you pay. We do not add fuel surcharges, equipment fees, product upcharges, or hidden administrative costs. If the scope of work changes during treatment, we discuss it with you, explain why, and get your written approval before proceeding with any modifications to the original quote.",
              },
              {
                title: "Results-Backed Guarantee",
                desc: "Our pest control pricing includes a satisfaction guarantee that we take extremely seriously. If pests return between your scheduled treatments, we come back and re-treat your property at absolutely no additional charge. This is not a marketing gimmick or a promise with fine-print exceptions. It is our standard operating procedure on every residential and commercial pest control engagement. We stand behind every dollar you spend with us because our business depends on delivering lasting results, not on collecting fees for repeated ineffective treatments. Check our customer reviews to see how this guarantee works in practice across hundreds of NYC properties.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
              >
                <h3 className="text-lg font-semibold text-green-400">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-4xl text-zinc-300 leading-7">
            We understand that pest control is often an unexpected expense for
            NYC homeowners and businesses. Nobody budgets for a{" "}
            <Link
              href="/bed-bug-treatment"
              className="text-green-400 hover:text-green-300"
            >
              bed bug infestation
            </Link>{" "}
            or a{" "}
            <Link
              href="/rat-extermination"
              className="text-green-400 hover:text-green-300"
            >
              rat problem
            </Link>{" "}
            in their annual expenses. That is why we also offer flexible payment
            options and{" "}
            <Link
              href="/quote-request"
              className="text-green-400 hover:text-green-300"
            >
              monthly maintenance plans
            </Link>{" "}
            that spread the cost over time while actually reducing your overall
            pest control spend. Whether you are dealing with a one-time{" "}
            <Link
              href="/cockroach-extermination"
              className="text-green-400 hover:text-green-300"
            >
              cockroach infestation
            </Link>
            , need{" "}
            <Link
              href="/mouse-extermination"
              className="text-green-400 hover:text-green-300"
            >
              mouse extermination
            </Link>{" "}
            in your brownstone, or require ongoing{" "}
            <Link
              href="/commercial-pest-control"
              className="text-green-400 hover:text-green-300"
            >
              commercial pest management
            </Link>
            , our exterminator pricing is designed to be fair, competitive, and
            completely transparent.
          </p>
        </div>
      </section>

      {/* ───────────────── DETAILED SERVICE PRICING BY CATEGORY ───────────────── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pest Control &amp; Exterminator{" "}
            <span className="text-green-500">Price Ranges by Service</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Below you will find our current pest control and exterminator pricing
            ranges for the entire NYC metro area, including Manhattan, Brooklyn,
            Queens, the Bronx, Staten Island, Northern New Jersey, Long Island,
            and Westchester County. These ranges represent typical pricing for
            residential and commercial properties. Your actual cost depends on
            property size, infestation severity, treatment method, and the number
            of visits required. Every price includes our free inspection,
            customized treatment plan, follow-up visit, and satisfaction
            guarantee.{" "}
            <Link
              href="/services"
              className="text-green-400 hover:text-green-300"
            >
              View all of our pest control services
            </Link>{" "}
            for detailed information about each treatment type, or{" "}
            <Link
              href="/quote-request"
              className="text-green-400 hover:text-green-300"
            >
              request a free quote
            </Link>{" "}
            for pricing specific to your property and situation.
          </p>

          <div className="mt-12 space-y-14">
            {Object.entries(servicesByCategory).map(
              ([category, services]) => (
                <div key={category}>
                  <h3 className="mb-2 text-2xl font-bold text-green-400 border-b border-zinc-700 pb-3">
                    {category}
                  </h3>
                  <p className="mb-6 text-sm text-zinc-400">
                    {category === "Common Pests" &&
                      "The most frequently encountered pest control needs across NYC apartments, homes, and businesses. These pests thrive in the city's dense urban environment and require professional exterminator treatment for lasting elimination."}
                    {category === "Rodents" &&
                      "Rodent extermination and control services for rats, mice, and preventive rodent proofing. NYC's rodent population is one of the largest in the world, making professional exterminator intervention essential for effective control."}
                    {category === "Wood-Destroying Insects" &&
                      "Specialized pest control for termites and carpenter ants that can cause significant structural damage to NYC brownstones, townhouses, and commercial buildings if left untreated."}
                    {category === "Stinging Insects" &&
                      "Safe removal of wasps, bees, hornets, and yellow jackets from residential and commercial properties. Many of these pest control situations qualify for emergency exterminator service."}
                    {category === "Wildlife Control" &&
                      "Humane wildlife removal and exclusion for raccoons, squirrels, pigeons, and bats. Wildlife pest control requires specialized trapping, exclusion, and cleanup methods performed by licensed operators."}
                    {category === "Specialty Pests" &&
                      "Targeted pest control for less common but still problematic pests including moths, silverfish, centipedes, drain flies, and pantry pests. Professional exterminator treatment ensures complete elimination."}
                    {category === "Commercial Services" &&
                      "Comprehensive commercial pest control and restaurant pest management programs designed for NYC businesses. Includes DOH-compliant documentation and flexible scheduling around business operations."}
                    {category === "General Services" &&
                      "Broad-spectrum pest control and emergency exterminator services for residential and commercial properties across the NYC metro area."}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                      <Link
                        key={service.slug}
                        href={`/${service.slug}`}
                        className="group rounded-lg border border-zinc-700 bg-zinc-800/40 p-5 transition-colors hover:border-green-600 hover:bg-zinc-800"
                      >
                        <h4 className="font-semibold text-white group-hover:text-green-400">
                          {service.name}
                        </h4>
                        <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                          {service.description}
                        </p>
                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-lg font-bold text-green-500">
                            {service.priceRange}
                          </span>
                          {service.emergencyAvailable && (
                            <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs text-green-400">
                              Emergency Available
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          <p className="mt-12 text-sm text-zinc-500 max-w-3xl">
            * All prices are estimates based on typical pest control jobs in the
            NYC metro area. Actual exterminator costs depend on property size,
            infestation severity, access conditions, treatment method selected,
            and the number of follow-up visits required. Contact us for a{" "}
            <Link
              href="/quote-request"
              className="text-green-400 hover:text-green-300"
            >
              free custom pest control quote
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ───────────────── MID CTA ───────────────── */}
      <CTAGroup variant="mid" />

      {/* ───────────────── WHAT AFFECTS PRICING ───────────────── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Affects Your{" "}
            <span className="text-green-500">
              Pest Control &amp; Exterminator Cost
            </span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Understanding the factors that influence pest control pricing helps
            you anticipate costs, ask the right questions, and make informed
            decisions when choosing an exterminator. NYC pest control costs are
            not arbitrary. They are determined by a combination of measurable
            factors that our licensed technicians assess during your free
            inspection. Here are the primary variables that determine what you
            will pay for exterminator service in the New York City metro area:
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Pest Type & Species",
                desc: `Different pests require entirely different treatment methods, products, and expertise levels, which directly impacts pest control pricing. General pest control for common invaders like ants and spiders costs less than specialized treatments for more resilient pests. Cockroach extermination and rat extermination fall in the mid-range because they require targeted products and multiple-visit treatment protocols. Bed bug treatment is more expensive due to the intensive heat or chemical methods required for complete elimination. Termite treatment commands premium pricing because of the specialized equipment, products, and structural expertise involved. Wildlife removal for raccoons, bats, and squirrels often costs the most due to trapping, exclusion work, and hazardous cleanup requirements.`,
              },
              {
                title: "Infestation Severity",
                desc: "The severity of your pest problem is one of the biggest factors in exterminator pricing. A minor ant problem spotted early and addressed quickly can often be resolved in a single pest control visit for $125 to $200. A severe cockroach infestation that has been building for months in a multi-unit building may require three to four treatments over six to eight weeks, with total costs reaching $800 or more. Bed bug infestations that have spread to multiple rooms are significantly more expensive to treat than a single-room problem caught early. The lesson is clear: the sooner you call an exterminator, the less your pest control treatment will cost. Early intervention is always more affordable than dealing with an entrenched, established infestation.",
              },
              {
                title: "Property Size & Type",
                desc: `Property size and type directly impact pest control pricing because larger properties require more product, more time, and more thorough inspection. A studio apartment in Manhattan requires significantly less treatment than a four-bedroom townhouse in Brooklyn or a three-story brownstone in Park Slope. Commercial spaces are typically priced by square footage rather than room count. Multi-unit buildings receive per-unit pricing that is generally lower than treating individual apartments separately, because building-wide treatment is more efficient and more effective at preventing pest migration between units. Your property type, whether it is an apartment, condo, co-op, townhouse, single-family home, restaurant, office, retail space, or warehouse, directly influences the exterminator pricing structure.`,
              },
              {
                title: "Treatment Method Selected",
                desc: `The treatment method chosen for your pest control problem affects pricing significantly. Chemical treatments using gel baits, sprays, and residual products are generally less expensive than heat treatments, fumigation, or mechanical exclusion methods. For example, bed bug chemical treatment starts at $300 to $600 per room, while bed bug heat treatment costs $1,000 to $1,500 per room but achieves complete elimination in a single day. Integrated Pest Management (IPM) approaches, which combine chemical treatments with mechanical exclusion, habitat modification, and sanitation improvements, may cost more upfront but reduce long-term pest control spending by addressing root causes rather than merely treating symptoms. Our exterminator will recommend the most effective and cost-efficient method for your specific situation.`,
              },
              {
                title: "Number of Follow-Up Treatments",
                desc: "Some pest problems are resolved in a single exterminator visit. Others, such as cockroach extermination in a building with ongoing pest pressure from neighboring units, or bed bug elimination in a multi-room setting, require multiple treatment visits to achieve complete elimination. Our pest control pricing always includes the expected number of treatments needed for your specific situation, so you know the full cost upfront rather than being surprised by additional visits and their associated charges. This is a critical distinction from competitors who quote only the first-visit price and then charge separately for each follow-up. When comparing exterminator quotes, always ask whether follow-up visits are included.",
              },
              {
                title: "Location & Property Access",
                desc: `Properties within our core pest control service area across the five NYC boroughs typically receive standard pricing. Service in outer areas of New Jersey, Long Island, and Westchester may include a modest travel fee for one-time exterminator visits, though this fee is waived for all maintenance plan customers. Access conditions can also affect pricing: high-rise buildings that require specialized equipment or extended setup time, properties with limited access points that complicate treatment, and crawl spaces or confined areas that require additional safety measures may factor into the final pest control quote. Our free inspection accounts for all of these variables so you receive an accurate price.`,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
              >
                <h3 className="font-semibold text-green-400">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-4xl text-zinc-300 leading-7">
            The best way to get an accurate pest control price for your specific
            situation is to{" "}
            <Link
              href="/quote-request"
              className="text-green-400 hover:text-green-300"
            >
              request a free inspection
            </Link>
            . Our licensed exterminator will assess all of these factors on-site
            and provide you with a detailed written quote before any work begins.
            There is never any obligation, and pest control inspections are
            always free of charge. You can also text{" "}
            <a
              href={`sms:${phonePlain}`}
              className="text-green-400 hover:text-green-300 font-semibold"
            >
              us
            </a>{" "}
            to discuss your situation and get a preliminary estimate over the
            phone, or visit our{" "}
            <Link
              href="/faq"
              className="text-green-400 hover:text-green-300"
            >
              FAQ page
            </Link>{" "}
            for answers to common pest control questions.
          </p>
        </div>
      </section>

      {/* ───────────────── COMMERCIAL VS RESIDENTIAL ───────────────── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Commercial vs. Residential{" "}
            <span className="text-green-500">
              Pest Control &amp; Exterminator Pricing
            </span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Pest control pricing differs significantly between residential and
            commercial properties, and understanding these differences is
            essential for budgeting accurately and choosing the right level of
            exterminator service for your situation. The NYC Exterminator serves
            both residential homeowners and{" "}
            <Link
              href="/commercial-pest-control"
              className="text-green-400 hover:text-green-300"
            >
              commercial pest control
            </Link>{" "}
            clients across the entire NYC metro area, including all five
            boroughs, Northern New Jersey, Long Island, and Westchester County.
            Our team has extensive experience with the unique pest control
            challenges that each property type presents.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* Residential */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-8">
              <h3 className="text-2xl font-bold text-white">
                Residential Pest Control Pricing
              </h3>
              <p className="mt-2 font-semibold text-green-400">
                Starting at $125 per treatment
              </p>
              <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-300">
                <p>
                  Residential pest control pricing is based on the type of pest,
                  the size of your home or apartment, and the severity of the
                  infestation. Most residential exterminator visits in New York
                  City cost between $125 and $600 for a single treatment. More
                  complex problems like{" "}
                  <Link
                    href="/bed-bug-treatment"
                    className="text-green-400 hover:text-green-300"
                  >
                    bed bug heat treatment
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/termite-treatment"
                    className="text-green-400 hover:text-green-300"
                  >
                    termite treatment
                  </Link>{" "}
                  can range from $800 to $3,000 depending on the scope of work
                  required.
                </p>
                <p>
                  NYC apartments, brownstones, townhouses, and single-family
                  homes each present unique pest control challenges that affect
                  exterminator pricing. High-rise apartments frequently have
                  pests migrating from neighboring units through shared walls,
                  plumbing chases, and electrical conduits. Brownstones and
                  townhouses often have basement and garden-level entry points
                  that require{" "}
                  <Link
                    href="/rodent-proofing"
                    className="text-green-400 hover:text-green-300"
                  >
                    rodent proofing
                  </Link>{" "}
                  and exclusion work. Our residential exterminator pricing
                  accounts for all of these property-specific factors.
                </p>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>Studio/1BR apartment: $125-$300 per treatment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>2-3BR apartment/condo: $200-$500 per treatment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>Townhouse/brownstone: $300-$800 per treatment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>Single-family home: $250-$600 per treatment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>
                    Multi-unit building (per unit): $100-$250 per treatment
                  </span>
                </li>
              </ul>
            </div>

            {/* Commercial */}
            <div className="rounded-xl border border-green-700 bg-zinc-800/50 p-8">
              <h3 className="text-2xl font-bold text-white">
                Commercial Pest Control Pricing
              </h3>
              <p className="mt-2 font-semibold text-green-400">
                Starting at $150/month
              </p>
              <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-300">
                <p>
                  Commercial pest control pricing is structured differently than
                  residential. Most commercial clients operate on monthly or
                  quarterly{" "}
                  <Link
                    href="/commercial-pest-control"
                    className="text-green-400 hover:text-green-300"
                  >
                    maintenance plans
                  </Link>{" "}
                  because consistent pest management is essential for business
                  operations, health code compliance, customer confidence, and
                  reputation protection. Commercial exterminator pricing is based
                  on square footage, industry type, and required service
                  frequency.
                </p>
                <p>
                  <Link
                    href="/restaurant-pest-control"
                    className="text-green-400 hover:text-green-300"
                  >
                    Restaurant pest control
                  </Link>{" "}
                  and food service businesses have the most stringent
                  requirements and typically need weekly or bi-weekly exterminator
                  service to maintain NYC Department of Health compliance. Retail
                  spaces, offices, medical facilities, and warehouses can often
                  maintain pest-free conditions with monthly or quarterly pest
                  control treatments.
                </p>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>
                    Small retail/office (&lt;2,000 sq ft): $150-$300/month
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>Restaurant/food service: $200-$600/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>
                    Large commercial (2,000-10,000 sq ft): $300-$800/month
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>Warehouse/industrial: $400-$1,500/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-500">&#10003;</span>
                  <span>Hotel/hospitality: $500-$2,000/month</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 max-w-4xl space-y-4 text-zinc-300 leading-7">
            <p>
              Not sure whether you need residential or commercial pest control
              service? The key difference is not just property type, but the
              level of documentation, regulatory compliance, and ongoing
              monitoring required. Commercial pest control plans include detailed
              service reports, bait station mapping, pesticide usage logs, and
              comprehensive documentation that satisfies NYC Department of Health
              inspections. Residential exterminator services focus more on
              immediate elimination, follow-up verification, and preventive
              measures to keep pests from returning.
            </p>
            <p>
              For property managers overseeing both residential and commercial
              spaces, we offer bundled pest control pricing that covers all your
              properties under a single account. This simplifies billing, ensures
              consistent service standards across your portfolio, and typically
              reduces your overall pest management costs by 15 to 25 percent
              compared to treating each property separately. Text{" "}
              <a
                href={`sms:${phonePlain}`}
                className="text-green-400 hover:text-green-300"
              >
                us
              </a>{" "}
              or email{" "}
              <a
                href={`mailto:${EMAIL}`}
                className="text-green-400 hover:text-green-300"
              >
                {EMAIL}
              </a>{" "}
              to discuss multi-property exterminator pricing options.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── MAINTENANCE PLANS ───────────────── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pest Control Maintenance Plan{" "}
            <span className="text-green-500">Pricing</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            The most cost-effective approach to pest control is consistent
            prevention, not reactive treatment. Our exterminator maintenance
            plans provide regular pest monitoring and treatment at a fixed
            monthly or quarterly rate, eliminating surprise exterminator bills
            and keeping your property pest-free year-round. Maintenance plans are
            available for both residential and commercial properties across our
            entire{" "}
            <Link
              href="/areas"
              className="text-green-400 hover:text-green-300"
            >
              service area
            </Link>
            , and they represent the best value we offer for ongoing pest
            control.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {/* Quarterly */}
            <div className="flex flex-col rounded-xl border border-zinc-700 bg-zinc-800/50 p-8">
              <h3 className="text-xl font-bold text-white">Quarterly Plan</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Best for low-risk residential properties
              </p>
              <p className="mt-4 text-3xl font-extrabold text-green-500">
                $75-$150
                <span className="text-lg font-normal text-zinc-400">
                  /quarter
                </span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>4 pest control treatments per year</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Seasonal pest prevention</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Interior &amp; exterior perimeter treatment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>
                    Common pest coverage (roaches, ants, spiders)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Between-visit satisfaction guarantee</span>
                </li>
              </ul>
              <Link
                href="/quote-request"
                className="mt-8 block rounded-lg bg-zinc-700 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-600"
              >
                Get Quarterly Quote
              </Link>
            </div>

            {/* Monthly */}
            <div className="relative flex flex-col rounded-xl border-2 border-green-600 bg-zinc-800/50 p-8">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-1 text-xs font-bold text-white">
                Most Popular
              </span>
              <h3 className="text-xl font-bold text-white">Monthly Plan</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Ideal for most NYC apartments &amp; homes
              </p>
              <p className="mt-4 text-3xl font-extrabold text-green-500">
                $50-$125
                <span className="text-lg font-normal text-zinc-400">
                  /month
                </span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>12 exterminator treatments per year</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Comprehensive pest coverage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Interior, exterior &amp; common areas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>
                    All common pests +{" "}
                    <Link
                      href="/rat-extermination"
                      className="text-green-400 hover:text-green-300"
                    >
                      rodent monitoring
                    </Link>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Priority scheduling &amp; guarantee</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>10% off additional pest control services</span>
                </li>
              </ul>
              <Link
                href="/quote-request"
                className="mt-8 block rounded-lg bg-green-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-green-700"
              >
                Get Monthly Quote
              </Link>
            </div>

            {/* Commercial */}
            <div className="flex flex-col rounded-xl border border-zinc-700 bg-zinc-800/50 p-8">
              <h3 className="text-xl font-bold text-white">Commercial Plan</h3>
              <p className="mt-1 text-sm text-zinc-400">
                For restaurants, offices &amp; retail
              </p>
              <p className="mt-4 text-3xl font-extrabold text-green-500">
                $150-$600
                <span className="text-lg font-normal text-zinc-400">
                  /month
                </span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Weekly, bi-weekly, or monthly visits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>DOH-compliant documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>All pest types covered</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>After-hours scheduling available</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">&#10003;</span>
                  <span>Emergency exterminator callback included</span>
                </li>
              </ul>
              <Link
                href="/quote-request"
                className="mt-8 block rounded-lg bg-zinc-700 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-600"
              >
                Get Commercial Quote
              </Link>
            </div>
          </div>

          <div className="mt-10 max-w-4xl space-y-4 text-zinc-300 leading-7">
            <p>
              Pest control maintenance plans save NYC property owners an average
              of 30 to 50 percent compared to calling an exterminator reactively
              each time a pest problem surfaces. Consider the math: a single{" "}
              <Link
                href="/cockroach-extermination"
                className="text-green-400 hover:text-green-300"
              >
                cockroach extermination
              </Link>{" "}
              treatment costs $150 to $400, and most infestations require two to
              three treatments for complete elimination, totaling $300 to $1,200
              for a single episode. A monthly pest control maintenance plan at
              $75 per month, or $900 per year, covers all your pest management
              needs year-round, including cockroaches, ants, spiders, and{" "}
              <Link
                href="/mouse-extermination"
                className="text-green-400 hover:text-green-300"
              >
                mouse monitoring
              </Link>
              , and prevents infestations before they have a chance to establish
              themselves.
            </p>
            <p>
              For{" "}
              <Link
                href="/restaurant-pest-control"
                className="text-green-400 hover:text-green-300"
              >
                restaurants and food service businesses
              </Link>
              , maintenance plans are not merely cost-effective; they are
              operationally essential. The NYC Department of Health requires
              documentation of regular pest management activities as part of
              routine health inspections. Our commercial pest control plans
              include all required documentation: service reports, bait station
              maps, pesticide usage logs, and detailed treatment records that
              satisfy DOH inspectors. A single DOH violation for pest activity
              can result in thousands of dollars in fines, temporary closure, and
              lasting damage to your restaurant&apos;s reputation. Our monthly
              exterminator plan is your insurance against that risk.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── WHAT'S INCLUDED ───────────────── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What&apos;s Included in{" "}
            <span className="text-green-500">
              Every Pest Control Treatment
            </span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            When you hire an exterminator, you want to know exactly what you are
            getting for your money. At The NYC Exterminator, every pest control
            treatment includes a comprehensive package of services designed to
            eliminate your pest problem completely and prevent it from coming
            back. Here is what is included in every single treatment, regardless
            of pest type, property size, or whether you are a residential
            homeowner or commercial client:
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {[
              {
                title: "1. Thorough Property Inspection",
                desc: "Before any pest control treatment begins, our licensed exterminator conducts a complete and detailed inspection of your property. We identify the pest species present, locate nests, harborage areas, and breeding sites, map all entry points, and assess the overall severity of the infestation. This is not a quick walk-through. We inspect kitchens, bathrooms, bedrooms, basements, attics, crawl spaces, utility closets, laundry areas, and exterior perimeters. For bed bug and termite inspections, we deploy specialized detection equipment or certified K-9 detection teams. The inspection is always free, thorough, and forms the foundation of your customized treatment plan.",
              },
              {
                title: "2. Customized Treatment Plan",
                desc: "Based on our inspection findings, we develop a pest control treatment plan tailored specifically to your property and your pest problem. We do not use a one-size-fits-all approach because pest control does not work that way. A cockroach infestation in a restaurant kitchen requires fundamentally different methods, products, and scheduling than a mouse problem in a brownstone basement or a bed bug issue in a hotel suite. Your treatment plan outlines the specific products and methods we will use, the number of exterminator visits required, the expected timeline for visible results, and the total cost of the engagement.",
              },
              {
                title: "3. Professional Treatment Application",
                desc: "Our licensed pest control technicians apply EPA-approved products using targeted methods that maximize effectiveness while minimizing exposure to your family, pets, employees, and the environment. We follow Integrated Pest Management (IPM) principles, combining chemical treatments with mechanical exclusion, sanitation recommendations, and habitat modification for long-lasting results. Every exterminator on our team holds NYS DEC Commercial Pesticide Applicator certifications, and wildlife control operators hold additional DEC Nuisance Wildlife Control licenses. You are getting trained, certified professionals on every job.",
              },
              {
                title: "4. Follow-Up Inspection & Re-Treatment",
                desc: "Every pest control treatment includes at least one follow-up visit within two to four weeks to verify results and re-treat if necessary. Many pest problems, especially cockroach extermination and bed bug treatment, require multiple visits to achieve complete elimination due to egg hatching cycles and pest biology. Our follow-up visits are included in the quoted price. There are no surprise charges for additional visits that are part of the treatment protocol. If pests return between scheduled treatments, we come back and re-treat at no additional charge under our satisfaction guarantee.",
              },
              {
                title: "5. Prevention Recommendations",
                desc: "Eliminating an existing pest infestation is only half the job. Preventing the pests from returning is equally important, and often more important for long-term cost savings. Our exterminator provides detailed, property-specific recommendations for preventing future pest problems. This includes identifying and sealing entry points, addressing moisture issues that attract pests, improving sanitation practices, recommending structural repairs, and suggesting environmental modifications. For commercial clients, we provide written prevention documentation for health inspection compliance.",
              },
              {
                title: "6. Satisfaction Guarantee",
                desc: "If pests return between your scheduled treatments, we come back and re-treat your property at absolutely no additional cost. This guarantee applies to all residential and commercial pest control services, from general pest control to specialized bed bug and termite treatments. We are confident in our work because we use proven methods, quality products, and follow up until the job is done right. Visit our reviews page to see why hundreds of NYC property owners trust The NYC Exterminator with their pest problems.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
              >
                <h3 className="font-semibold text-green-400">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-4xl text-zinc-300 leading-7">
            This comprehensive approach to pest control is why our customers
            consistently leave{" "}
            <Link
              href="/reviews"
              className="text-green-400 hover:text-green-300"
            >
              5-star reviews
            </Link>{" "}
            and refer us to their neighbors, friends, and colleagues. When you
            compare our exterminator pricing to competitors, make sure you are
            comparing the complete package. A lower quoted price that does not
            include follow-up visits, does not come with a satisfaction
            guarantee, or uses unlicensed technicians is not actually cheaper.
            It is a recipe for spending more money down the line when the pests
            inevitably return and you need to hire a real pest control
            professional to do the job correctly. Our all-inclusive pricing means
            the price you see is the total cost of solving your pest problem,
            period.
          </p>
        </div>
      </section>

      {/* ───────────────── EMERGENCY PRICING ───────────────── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Emergency Exterminator{" "}
            <span className="text-green-500">Pricing in NYC</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Some pest control situations simply cannot wait for a scheduled
            appointment. When you discover{" "}
            <Link
              href="/rat-extermination"
              className="text-green-400 hover:text-green-300"
            >
              rats in your restaurant kitchen
            </Link>{" "}
            at 10 PM on a Friday, find a{" "}
            <Link
              href="/bed-bug-treatment"
              className="text-green-400 hover:text-green-300"
            >
              bed bug infestation
            </Link>{" "}
            in your hotel with guests checking in tomorrow, or have a{" "}
            <Link
              href="/wasp-removal"
              className="text-green-400 hover:text-green-300"
            >
              wasp nest
            </Link>{" "}
            directly above your building&apos;s main entrance, you need an
            exterminator now, not next Tuesday. That is why The NYC Exterminator
            offers{" "}
            <Link
              href="/emergency-pest-control"
              className="text-green-400 hover:text-green-300"
            >
              emergency pest control service
            </Link>{" "}
            with same-day and after-hours availability across our entire service
            area.
          </p>

          <div className="mt-10 max-w-3xl rounded-xl border border-zinc-700 bg-zinc-800/50 p-8">
            <h3 className="text-xl font-bold text-green-400">
              Emergency Pest Control Service Pricing
            </h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
                <span className="text-zinc-300">
                  Standard emergency surcharge
                </span>
                <span className="font-semibold text-green-500">$50-$150</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
                <span className="text-zinc-300">
                  Same-day pest control (business hours)
                </span>
                <span className="font-semibold text-green-500">
                  Standard rate + $50
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
                <span className="text-zinc-300">
                  After-hours exterminator service (evenings)
                </span>
                <span className="font-semibold text-green-500">
                  Standard rate + $100
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
                <span className="text-zinc-300">
                  Weekend &amp; holiday emergency
                </span>
                <span className="font-semibold text-green-500">
                  Standard rate + $150
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">
                  Maintenance plan members
                </span>
                <span className="font-semibold text-green-500">
                  No surcharge
                </span>
              </div>
            </div>
            <p className="mt-6 text-sm leading-6 text-zinc-400">
              Maintenance plan members receive emergency pest control callbacks
              at no additional surcharge, making monthly and quarterly plans an
              even stronger value. Emergency response times are typically 2 to 4
              hours within Manhattan and 3 to 6 hours across our full{" "}
              <Link
                href="/areas"
                className="text-green-400 hover:text-green-300"
              >
                service area
              </Link>{" "}
              in NYC, NJ, Long Island, and Westchester.
            </p>
          </div>

          <div className="mt-10 max-w-4xl space-y-4 text-zinc-300 leading-7">
            <p>
              Our emergency exterminator service covers all pest types, but the
              most common emergency pest control calls we receive include: active
              rodent sightings in food service establishments requiring immediate{" "}
              <Link
                href="/rat-extermination"
                className="text-green-400 hover:text-green-300"
              >
                rat extermination
              </Link>
              , severe{" "}
              <Link
                href="/cockroach-extermination"
                className="text-green-400 hover:text-green-300"
              >
                cockroach infestations
              </Link>{" "}
              discovered during move-in inspections, bed bug discoveries in
              hotels and Airbnb units before guest arrivals, stinging insect
              nests near building entrances requiring{" "}
              <Link
                href="/hornet-removal"
                className="text-green-400 hover:text-green-300"
              >
                hornet removal
              </Link>{" "}
              or{" "}
              <Link
                href="/yellow-jacket-removal"
                className="text-green-400 hover:text-green-300"
              >
                yellow jacket removal
              </Link>
              , and wildlife intrusions including{" "}
              <Link
                href="/raccoon-removal"
                className="text-green-400 hover:text-green-300"
              >
                raccoons
              </Link>
              ,{" "}
              <Link
                href="/bat-removal"
                className="text-green-400 hover:text-green-300"
              >
                bats
              </Link>
              , and{" "}
              <Link
                href="/squirrel-removal"
                className="text-green-400 hover:text-green-300"
              >
                squirrels
              </Link>{" "}
              in occupied living spaces.
            </p>
            <p>
              To request emergency pest control service, text{" "}
              <a
                href={`sms:${phonePlain}`}
                className="font-semibold text-green-400 hover:text-green-300"
              >
                us
              </a>
              . Texting receives the fastest response for emergency
              exterminator situations. You can also self-book online
              or{" "}
              <Link
                href="/quote-request"
                className="text-green-400 hover:text-green-300"
              >
                submit a quote request online
              </Link>
              , but calling is recommended for true emergencies that require
              same-day attention from a licensed pest control professional.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── PAYMENT & FINANCING ───────────────── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Payment Options &amp;{" "}
            <span className="text-green-500">Financing</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            We believe that effective pest control should be accessible to every
            NYC property owner, which is why we offer a variety of payment
            options and flexible billing arrangements. Pest infestations are
            rarely planned expenses, and we do not want the cost of exterminator
            service to prevent you from getting the treatment your property
            needs.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="font-semibold text-green-400">
                Accepted Payment Methods
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                We accept all major credit cards including Visa, Mastercard,
                American Express, and Discover, as well as debit cards, personal
                and business checks, and bank transfers. Payment for one-time
                pest control treatments is due upon completion of service. There
                are no deposits or prepayment required for standard residential
                exterminator visits.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="font-semibold text-green-400">
                Commercial Invoicing
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                For commercial pest control accounts and maintenance plan
                customers, we offer monthly invoicing with net-30 payment terms.
                This is standard for our{" "}
                <Link
                  href="/commercial-pest-control"
                  className="text-green-400 hover:text-green-300"
                >
                  commercial pest control
                </Link>{" "}
                and{" "}
                <Link
                  href="/restaurant-pest-control"
                  className="text-green-400 hover:text-green-300"
                >
                  restaurant pest control
                </Link>{" "}
                clients. Property management companies managing multiple
                locations receive consolidated billing under a single account.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="font-semibold text-green-400">
                Landlord &amp; Insurance Billing
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                In NYC, landlords are legally required to provide pest control
                for rental tenants under the Housing Maintenance Code. We can
                bill your landlord or property management company directly for
                exterminator services. We also provide detailed documentation to
                support insurance claims for pest-related damage, particularly
                for{" "}
                <Link
                  href="/termite-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  termite damage
                </Link>{" "}
                and other structural pest issues.
              </p>
            </div>
          </div>

          <p className="mt-10 max-w-4xl text-zinc-300 leading-7">
            For larger pest control projects such as whole-building treatments,
            extensive{" "}
            <Link
              href="/rodent-proofing"
              className="text-green-400 hover:text-green-300"
            >
              rodent proofing
            </Link>
            , or comprehensive{" "}
            <Link
              href="/termite-treatment"
              className="text-green-400 hover:text-green-300"
            >
              termite treatment
            </Link>
            , we can arrange phased payment schedules that align with the
            treatment timeline. This allows you to spread the cost of more
            extensive exterminator work over the duration of the project rather
            than paying the full amount upfront. Text{" "}
            <a
              href={`sms:${phonePlain}`}
              className="text-green-400 hover:text-green-300"
            >
              us
            </a>{" "}
            or visit our{" "}
            <Link
              href="/contact"
              className="text-green-400 hover:text-green-300"
            >
              contact page
            </Link>{" "}
            to discuss payment arrangements for your specific pest control
            situation.
          </p>
        </div>
      </section>

      {/* ───────────────── WHY OUR PRICING IS DIFFERENT ───────────────── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Our Pest Control Pricing Is{" "}
            <span className="text-green-500">
              Different from Other Exterminators
            </span>
          </h2>
          <div className="mt-6 max-w-4xl space-y-5 text-zinc-300 leading-7">
            <p>
              Choosing a pest control company based solely on the lowest quoted
              price is a mistake we see NYC property owners make repeatedly, and
              it almost always ends up costing them more in the long run. The
              cheapest exterminator in the market often cuts corners in ways that
              are not immediately obvious: using inferior or diluted products
              that provide temporary relief but do not eliminate the infestation,
              skipping follow-up treatments that are essential for complete
              elimination, employing unlicensed or undertrained technicians who
              do not know how to properly identify and treat different pest
              species, or operating without adequate insurance coverage that
              protects your property.
            </p>
            <p>
              When the pests inevitably return after a cut-rate treatment, you
              end up paying twice: once for the ineffective treatment and again
              to hire a legitimate pest control company to do the job correctly.
              We hear this story from new customers every single week. The NYC
              Exterminator is not the cheapest option in the market, and we are
              not the most expensive either. We offer the best value, which means
              you receive premium-quality pest control at competitive prices,
              with lasting results backed by a real, enforceable satisfaction
              guarantee. Here is what makes our exterminator pricing the smartest
              investment for your money:
            </p>
            <ul className="space-y-3 pl-4">
              <li className="flex items-start gap-3">
                <span className="mt-1 font-bold text-green-500">1.</span>
                <span>
                  <strong className="text-white">
                    Licensed, Certified Technicians:
                  </strong>{" "}
                  Every exterminator on our team holds NYS DEC Commercial
                  Pesticide Applicator certifications. Wildlife operators hold
                  additional DEC Nuisance Wildlife Control licenses. You are
                  getting trained, tested, and certified professionals, not day
                  laborers with a spray can and a business card. Our technicians
                  undergo regular continuing education to stay current with the
                  latest pest control methods and products.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 font-bold text-green-500">2.</span>
                <span>
                  <strong className="text-white">
                    Comprehensive Insurance:
                  </strong>{" "}
                  We carry full general liability insurance on every job, which
                  protects your property in the unlikely event that something
                  goes wrong during treatment. Many budget exterminators operate
                  without adequate insurance, which means if they damage your
                  property during pest control treatment, you have no recourse.
                  Our insurance coverage gives you peace of mind.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 font-bold text-green-500">3.</span>
                <span>
                  <strong className="text-white">
                    Follow-Up Visits Included:
                  </strong>{" "}
                  Our pest control pricing includes all follow-up visits that are
                  part of your treatment plan. Competitors who quote a lower
                  initial price often charge separately for each subsequent
                  visit, making their actual total cost significantly higher than
                  ours. Always ask whether follow-up visits are included when
                  comparing exterminator quotes.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 font-bold text-green-500">4.</span>
                <span>
                  <strong className="text-white">
                    Real Satisfaction Guarantee:
                  </strong>{" "}
                  If pests return between scheduled treatments, we come back and
                  re-treat at no additional charge. This is not a fine-print
                  promise with dozens of exclusions. It is a straightforward
                  commitment that we honor on every job. Check our{" "}
                  <Link
                    href="/reviews"
                    className="text-green-400 hover:text-green-300"
                  >
                    customer reviews
                  </Link>{" "}
                  to see this guarantee in action across hundreds of NYC
                  properties.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 font-bold text-green-500">5.</span>
                <span>
                  <strong className="text-white">
                    EPA-Approved, Family-Safe Products:
                  </strong>{" "}
                  We use only EPA-approved products and scientifically validated
                  treatment methods that are effective against pests while
                  remaining safe for your family, pets, employees, and the
                  environment. Cheaper alternatives may use off-brand, improperly
                  diluted, or incorrectly applied products that pose health risks
                  and deliver inferior pest control results.
                </span>
              </li>
            </ul>
            <p>
              When you factor in follow-up visits, guarantee coverage, licensed
              technicians, proper insurance, and safe EPA-approved products, our
              pest control pricing delivers substantially more value per dollar
              than budget alternatives. We encourage you to compare not just the
              headline price, but the total package and long-term outcome, when
              choosing an exterminator in NYC. Visit our{" "}
              <Link
                href="/about"
                className="text-green-400 hover:text-green-300"
              >
                about page
              </Link>{" "}
              to learn more about our company, our team, and our approach to pest
              control, or check our{" "}
              <Link
                href="/reviews"
                className="text-green-400 hover:text-green-300"
              >
                reviews page
              </Link>{" "}
              to hear directly from hundreds of satisfied customers across the
              NYC metro area.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── PRE-FAQ CTA ───────────────── */}
      <CTAGroup variant="preFaq" />

      {/* ───────────────── FAQ ───────────────── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pest Control &amp; Exterminator Pricing{" "}
            <span className="text-green-500">Frequently Asked Questions</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            We know that pest control costs are a common concern for NYC
            homeowners, renters, landlords, and business owners. Below are
            detailed answers to the questions we hear most often about
            exterminator pricing, payment options, what is included in our
            treatments, and how to get the most value from your pest control
            investment. If you have a question that is not answered here, visit
            our{" "}
            <Link
              href="/faq"
              className="text-green-400 hover:text-green-300"
            >
              comprehensive FAQ page
            </Link>{" "}
            or{" "}
            <Link
              href="/contact"
              className="text-green-400 hover:text-green-300"
            >
              contact us directly
            </Link>
            .
          </p>

          <div className="mt-10 max-w-4xl space-y-6">
            {pricingFaqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
              >
                <h3 className="text-lg font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-4xl text-zinc-300 leading-7">
            Have a question about pest control pricing that is not covered above?
            We are always happy to discuss your specific situation and provide a
            free, no-obligation exterminator quote. Text{" "}
            <a
              href={`sms:${phonePlain}`}
              className="font-semibold text-green-400 hover:text-green-300"
            >
              us
            </a>
            , email{" "}
            <a
              href={`mailto:${EMAIL}`}
              className="text-green-400 hover:text-green-300"
            >
              {EMAIL}
            </a>
            , or{" "}
            <Link
              href="/contact"
              className="text-green-400 hover:text-green-300"
            >
              visit our contact page
            </Link>{" "}
            to reach our team. We serve{" "}
            <Link
              href="/areas"
              className="text-green-400 hover:text-green-300"
            >
              all five NYC boroughs, Northern New Jersey, Long Island, and
              Westchester County
            </Link>{" "}
            with professional pest control and exterminator services for every
            type of pest problem.
          </p>
        </div>
      </section>

      {/* ───────────────── FINAL CTA ───────────────── */}
      <CTAGroup variant="final" />
    </div>
  );
}
