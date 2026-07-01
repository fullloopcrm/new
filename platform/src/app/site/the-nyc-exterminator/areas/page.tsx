import Link from "next/link";
import type { Metadata } from "next";
import {
  getNeighborhoodsByRegion,
  getAllNeighborhoods,
  getAllServices,
  getRegions,
} from "@/app/site/the-nyc-exterminator/_lib/data";
import Breadcrumbs from "@/app/site/the-nyc-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";
import { SITE_URL, getFAQPageSchema, getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";

export const metadata: Metadata = {
  title: "Pest Control in 280+ NYC Neighborhoods | All 5 Boroughs, NJ, LI & Westchester",
  description:
    "Find licensed pest control and exterminator services in your NYC neighborhood. 280+ service areas across Manhattan, Brooklyn, Queens, Bronx, Staten Island, New Jersey, Long Island & Westchester. 30+ services, free inspections, same-day appointments. Pricing from $49. Text 212-202-8545.",
  keywords:
    "pest control near me NYC, exterminator near me, pest control Manhattan, pest control Brooklyn, pest control Queens, exterminator Bronx, pest control NJ, Long Island exterminator, Westchester pest control",
  openGraph: {
    title: "Pest Control in 280+ NYC Neighborhoods | All 5 Boroughs, NJ, LI & Westchester",
    description:
      "Find a licensed exterminator in your neighborhood. 280+ areas, 30+ services, pricing from $49. Text 212-202-8545.",
    url: `${SITE_URL}/areas`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/areas`,
  },
};

export default function AreasPage() {
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalServices = getAllServices().length;
  const totalPages = totalServices * totalNeighborhoods;
  const regions = getRegions();

  const faqItems = [
    {
      q: "How many neighborhoods do you serve?",
      a: `We serve ${totalNeighborhoods}+ neighborhoods across 8 regions — Manhattan, Brooklyn, Queens, Bronx, Staten Island, New Jersey, Long Island, and Westchester. Each neighborhood gets access to our full range of ${totalServices}+ pest control services, from cockroach extermination to wildlife removal.`,
    },
    {
      q: "Do you charge extra for outer boroughs or NJ?",
      a: "No. Our pricing is the same across all service areas. Whether you need an exterminator in Manhattan or pest control in Montclair, you get the same professional service at the same competitive rates. No travel surcharges, no hidden fees.",
    },
    {
      q: "How quickly can you get to my neighborhood?",
      a: "For standard pest control appointments, we typically schedule within 24-48 hours. For emergencies like active rodent infestations, bed bug outbreaks, or wasp nest removal, we can often respond same-day. Response times vary by neighborhood and availability, but our dispatchers prioritize urgent pest situations.",
    },
    {
      q: "What if my neighborhood isn't listed?",
      a: "We are constantly expanding our pest control coverage across the NYC metro area. If you do not see your neighborhood listed, text us — we likely serve your area and can add it to our service map. Our exterminators cover a wider area than what is shown on this page.",
    },
    {
      q: "Do you offer pest control for both residential and commercial properties?",
      a: "Absolutely. Our exterminators handle residential pest control for apartments, co-ops, condos, townhouses, and single-family homes, as well as commercial pest control for restaurants, retail stores, offices, warehouses, and multi-unit residential buildings. We hold all required NYC and NJ commercial pest control licenses.",
    },
    {
      q: "What pests are most common in the NYC metro area?",
      a: "The most common pests across the NYC metro area include cockroaches (especially German cockroaches in kitchens and bathrooms), rats and mice (particularly in older buildings and near restaurants), bed bugs (in multi-unit housing of all kinds), ants, and seasonal pests like wasps and mosquitoes. In suburban areas like Long Island and Westchester, we also see significant termite activity, tick infestations, and wildlife intrusions from raccoons, squirrels, and opossums.",
    },
    {
      q: "Are your exterminators licensed in both New York and New Jersey?",
      a: "Yes. All of our pest control technicians are fully licensed and insured for pest control and extermination work in New York State, New Jersey, and Connecticut. We maintain all required DEC and DEP certifications, and our technicians complete ongoing continuing education to stay current with the latest pest control methods and regulations.",
    },
    {
      q: "Do you offer recurring pest control maintenance plans?",
      a: "Yes, we offer monthly, bi-monthly, and quarterly pest control maintenance plans for both residential and commercial properties across all service areas. Regular pest control maintenance is the most effective way to prevent infestations before they start. Our maintenance plans include scheduled inspections, preventive treatments, and priority emergency service if pests appear between visits.",
    },
    {
      q: "How do I know which pest control service I need?",
      a: "If you are not sure what pest you are dealing with, start with a free inspection. Our licensed exterminators will identify the pest, assess the severity of the infestation, and recommend the most effective treatment plan. You can also text us a photo at 212-202-8545 for a quick identification. We never upsell unnecessary services — you only pay for what you actually need.",
    },
    {
      q: "What makes your pest control different from big national chains?",
      a: "We are a local NYC pest control company, which means we understand the unique pest pressures of this metro area — from cockroach infestations in Manhattan high-rises to termite damage in Long Island homes to rodent problems in Brooklyn brownstones. Our exterminators live and work in the neighborhoods they serve, giving them firsthand knowledge of local building types, common pest entry points, and the most effective treatment strategies for each area.",
    },
  ];

  const faqSchema = getFAQPageSchema(faqItems);
  const breadcrumbSchema = getBreadcrumbSchema([{ name: "Service Areas", url: "/areas" }]);

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Service Areas", url: "/areas" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
                {totalNeighborhoods} Neighborhoods &middot; 8 Regions &middot; {totalServices} Services
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Pest Control Across{" "}
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  {totalNeighborhoods}+ NYC Metro
                </span>{" "}
                Neighborhoods
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Every neighborhood gets access to our full range of{" "}
                <Link href="/services" className="text-green-400 hover:text-green-300">{totalServices}+ pest control services</Link>.
                Licensed exterminators. Same-day service. Free inspections.
              </p>

              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-white">{totalNeighborhoods}</div>
                <div className="mt-1 text-xs text-zinc-400">Neighborhoods</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-white">8</div>
                <div className="mt-1 text-xs text-zinc-400">Regions</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">{totalPages.toLocaleString()}+</div>
                <div className="mt-1 text-xs text-zinc-400">Service Pages</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-green-500">{totalServices}</div>
                <div className="mt-1 text-xs text-zinc-400">Pest Services</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NYC METRO PEST CONTROL COVERAGE ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            NYC Metro <span className="text-green-500">Pest Control Coverage</span>
          </h2>

          <div className="mt-10 space-y-6 text-base leading-7 text-zinc-300">
            <p>
              The NYC Exterminator provides comprehensive pest control and extermination services across the entire New York City metropolitan area — from the densest blocks of{" "}
              <Link href="/areas/midtown" className="text-green-400 hover:text-green-300">Midtown Manhattan</Link> to the tree-lined streets of{" "}
              <Link href="/areas/scarsdale" className="text-green-400 hover:text-green-300">Scarsdale</Link>, from the waterfront neighborhoods of{" "}
              <Link href="/areas/hoboken" className="text-green-400 hover:text-green-300">Hoboken</Link> to the beach communities of Long Island. Our network of licensed exterminators covers {totalNeighborhoods}+ distinct neighborhoods across eight major regions, ensuring that no matter where you live or work in the metro area, professional pest control is just a text away. We built this coverage map because we believe every home and business in the NYC metro deserves access to affordable, effective, and reliable pest control services — not just the neighborhoods that happen to be convenient for a technician to reach. Our pest control team is dispatched from multiple staging locations across the five boroughs, New Jersey, Long Island, and Westchester County, which means faster response times and deeper local knowledge in every area we serve.
            </p>

            <p>
              Why does local pest control coverage matter so much in the NYC metro area? Because pest pressure varies dramatically from one neighborhood to the next — and a one-size-fits-all approach simply does not work. A{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link> strategy that works perfectly in a{" "}
              <Link href="/areas/upper-east-side" className="text-green-400 hover:text-green-300">Upper East Side</Link> high-rise may be completely wrong for a{" "}
              <Link href="/areas/park-slope" className="text-green-400 hover:text-green-300">Park Slope</Link> brownstone. The{" "}
              <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link> techniques our exterminators use in a{" "}
              <Link href="/areas/chinatown" className="text-green-400 hover:text-green-300">Chinatown</Link> restaurant district look nothing like the rodent control approach we take in a{" "}
              <Link href="/areas/great-neck" className="text-green-400 hover:text-green-300">Great Neck</Link> residential neighborhood. Building construction types, sanitation infrastructure, landscaping, proximity to water, population density, restaurant concentration, and dozens of other hyper-local factors all influence which pests thrive in a given area and how an exterminator should approach treatment. Our pest control technicians are trained to recognize and adapt to these neighborhood-level differences, which is why our treatments are more effective and longer-lasting than generic pest control services.
            </p>

            <p>
              Each of the eight regions we serve — Manhattan, Brooklyn, Queens, the Bronx, Staten Island, New Jersey, Long Island, and Westchester — presents its own unique set of pest control challenges. Manhattan&apos;s extreme density and aging building stock create ideal conditions for{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach infestations</Link> and{" "}
              <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug outbreaks</Link>. Brooklyn&apos;s mix of historic brownstones and modern high-rises means our exterminators encounter everything from{" "}
              <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice in century-old walls</Link> to{" "}
              <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">ant infestations</Link> in ground-floor units. The suburban regions — Long Island, Westchester, and parts of New Jersey — bring{" "}
              <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite damage</Link>,{" "}
              <Link href="/tick-control" className="text-green-400 hover:text-green-300">tick infestations</Link>, and{" "}
              <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">wildlife intrusions</Link> that are rarely seen in the urban core. Understanding these regional pest patterns is not just academic — it directly determines how effective your exterminator will be. That is why we invest heavily in region-specific training and ensure that every pest control technician working in a given area truly knows the local pest landscape inside and out.
            </p>

            <p>
              Our commitment to comprehensive metro-area pest control coverage also means we can serve clients with properties in multiple locations. If you manage a restaurant portfolio with locations in{" "}
              <Link href="/areas/williamsburg" className="text-green-400 hover:text-green-300">Williamsburg</Link>,{" "}
              <Link href="/areas/astoria" className="text-green-400 hover:text-green-300">Astoria</Link>, and{" "}
              <Link href="/areas/jersey-city" className="text-green-400 hover:text-green-300">Jersey City</Link>, we can handle pest control for all three locations under a single account with consistent service quality and reporting. If you own a brownstone in{" "}
              <Link href="/areas/cobble-hill" className="text-green-400 hover:text-green-300">Cobble Hill</Link> and a vacation home on Long Island, one call to The NYC Exterminator covers both. This kind of multi-location pest control coordination is something the big national chains struggle with — but for a metro-area-focused exterminator like us, it is core to what we do every single day.
            </p>
          </div>
        </div>
      </section>

      {/* ── REGIONS OVERVIEW ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            8 Regions. {totalNeighborhoods} Neighborhoods. <span className="text-green-500">Total Coverage.</span>
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => {
              const neighborhoods = neighborhoodsByRegion[region] || [];
              const regionSlug = region.toLowerCase().replace(/\s+/g, "-");
              return (
                <div key={region} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
                  <div className="flex items-center justify-between">
                    <Link href={`#${regionSlug}`} className="text-lg font-bold text-white hover:text-green-500">
                      {region}
                    </Link>
                    <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-500">
                      {neighborhoods.length}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {neighborhoods.slice(0, 5).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded bg-zinc-700/50 px-2 py-1 text-xs text-zinc-300 hover:bg-green-500/20 hover:text-white"
                      >
                        {n.name}
                      </Link>
                    ))}
                    {neighborhoods.length > 5 && (
                      <Link
                        href={`#${regionSlug}`}
                        className="rounded bg-zinc-700/50 px-2 py-1 text-xs text-green-500 hover:bg-green-500/20"
                      >
                        +{neighborhoods.length - 5} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── REGION-BY-REGION PEST CONTROL GUIDE ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Region-by-Region <span className="text-green-500">Pest Control Guide</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Every region in the NYC metro area has its own unique pest challenges. Here is what our exterminators encounter most often in each area — and how we address it.
          </p>

          <div className="mt-12 space-y-10">
            {/* Manhattan */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Manhattan Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Manhattan is the most densely populated county in the United States, and that density creates intense pest pressure unlike anywhere else in the country. Our Manhattan exterminators deal with{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach infestations</Link> on a massive scale — German cockroaches thrive in the shared plumbing chases, compactor rooms, and kitchen walls of Manhattan&apos;s high-rise apartment buildings, co-ops, and condos. A single infested unit can spread cockroaches to dozens of neighboring apartments through pipe penetrations and electrical conduits, making professional cockroach extermination essential rather than optional.{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">Rat extermination</Link> is another constant demand in Manhattan — the borough&apos;s incredible concentration of restaurants, food carts, and garbage means rats have an almost unlimited food supply. From the restaurant corridors of the{" "}
                <Link href="/areas/east-village" className="text-green-400 hover:text-green-300">East Village</Link> to the commercial kitchens of{" "}
                <Link href="/areas/midtown" className="text-green-400 hover:text-green-300">Midtown</Link>, our rodent control exterminators perform ongoing rat and mouse exclusion work that keeps these pests out of occupied spaces.{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">Bed bug treatment</Link> rounds out Manhattan&apos;s top pest control needs — high tenant turnover, international travel, shared laundry facilities, and dense multi-unit housing make Manhattan one of the most bed-bug-prone areas in the world. Our Manhattan bed bug exterminators use heat treatment and targeted chemical applications to eliminate infestations quickly and prevent reinfestation.
              </p>
            </div>

            {/* Brooklyn */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Brooklyn Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Brooklyn is the most populous borough in New York City, with a wildly diverse housing stock that ranges from 19th-century brownstones and row houses to brand-new luxury high-rises. This variety means our Brooklyn exterminators need to be versatile.{" "}
                <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">Mouse extermination</Link> is one of our most-requested services in Brooklyn — the borough&apos;s iconic brownstones and limestone row houses, many built over 100 years ago, are riddled with gaps, cracks, and deteriorating mortar joints that mice exploit to enter homes. Our pest control technicians in neighborhoods like{" "}
                <Link href="/areas/park-slope" className="text-green-400 hover:text-green-300">Park Slope</Link>,{" "}
                <Link href="/areas/bed-stuy" className="text-green-400 hover:text-green-300">Bed-Stuy</Link>, and{" "}
                <Link href="/areas/crown-heights" className="text-green-400 hover:text-green-300">Crown Heights</Link> combine trapping and baiting with exclusion sealing to deliver lasting mouse control.{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">Bed bug infestations</Link> are also a major concern across Brooklyn, particularly in multi-unit buildings where bed bugs can spread between apartments through shared walls, outlets, and baseboards. Our Brooklyn bed bug exterminators frequently treat entire buildings rather than individual units to ensure complete elimination.{" "}
                <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">Ant extermination</Link> is a seasonal but persistent issue in Brooklyn — carpenter ants can cause structural damage to wood-frame portions of older homes, while pavement ants and odorous house ants invade ground-floor and garden-level apartments throughout the warmer months. Our pest control team uses targeted baiting and perimeter treatments to eliminate ant colonies at the source.
              </p>
            </div>

            {/* Queens */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Queens Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Queens is the largest borough by area and the most ethnically diverse urban area in the world — and its housing stock is just as diverse, ranging from dense apartment blocks in{" "}
                <Link href="/areas/jackson-heights" className="text-green-400 hover:text-green-300">Jackson Heights</Link> and{" "}
                <Link href="/areas/flushing" className="text-green-400 hover:text-green-300">Flushing</Link> to detached single-family homes in{" "}
                <Link href="/areas/bayside" className="text-green-400 hover:text-green-300">Bayside</Link> and{" "}
                <Link href="/areas/douglaston" className="text-green-400 hover:text-green-300">Douglaston</Link>. This range means our Queens pest control technicians handle an unusually broad spectrum of pest problems. In the western, denser parts of Queens, demand for{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link> and{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link> mirrors what we see in Manhattan and Brooklyn — aging multi-unit buildings with shared infrastructure that pests exploit to move between units. Queens also has one of the highest concentrations of restaurants per capita in the city, and our commercial pest control division handles ongoing exterminator contracts for restaurants, bakeries, grocery stores, and food processing facilities across neighborhoods like{" "}
                <Link href="/areas/astoria" className="text-green-400 hover:text-green-300">Astoria</Link>,{" "}
                <Link href="/areas/elmhurst" className="text-green-400 hover:text-green-300">Elmhurst</Link>, and{" "}
                <Link href="/areas/corona" className="text-green-400 hover:text-green-300">Corona</Link>. In eastern Queens, the pest control landscape shifts toward more suburban challenges — homeowners in areas like{" "}
                <Link href="/areas/little-neck" className="text-green-400 hover:text-green-300">Little Neck</Link> and{" "}
                <Link href="/areas/fresh-meadows" className="text-green-400 hover:text-green-300">Fresh Meadows</Link> text us for{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoon removal</Link>,{" "}
                <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrel removal</Link> from attics, and even occasional{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite inspections</Link> for wood-frame homes near wooded areas.
              </p>
            </div>

            {/* Bronx */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Bronx Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                The Bronx presents some of the most challenging pest control conditions in the NYC metro area, largely due to the age and condition of much of the borough&apos;s building stock. Many Bronx apartment buildings were constructed in the early-to-mid 20th century and have infrastructure — plumbing, walls, foundations — that has deteriorated over decades, creating countless entry points and harborage areas for pests. Our Bronx exterminators handle a high volume of{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat and mouse extermination</Link> calls, particularly in neighborhoods with older building stock like{" "}
                <Link href="/areas/fordham" className="text-green-400 hover:text-green-300">Fordham</Link>,{" "}
                <Link href="/areas/morrisania" className="text-green-400 hover:text-green-300">Morrisania</Link>, and{" "}
                <Link href="/areas/highbridge" className="text-green-400 hover:text-green-300">Highbridge</Link>. Rodents exploit gaps around pipes, crumbling foundation walls, and deteriorated door sweeps to access buildings — and once inside, they reproduce rapidly in the void spaces between walls and above drop ceilings.{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">Cockroach infestations</Link> are equally persistent across the Bronx, with German cockroaches dominating in residential kitchens and bathrooms while American cockroaches (water bugs) emerge from sewer connections and basement drains. Our Bronx pest control approach combines aggressive treatment of active infestations with building-wide exclusion and sanitation recommendations to break the cycle of reinfestation. We also work closely with Bronx property managers and building superintendents to implement integrated pest management programs that address pest problems at the building level rather than unit by unit — which is the only way to achieve lasting pest control results in multi-unit Bronx buildings.
              </p>
            </div>

            {/* Staten Island */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Staten Island Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Staten Island is the most suburban of New York City&apos;s five boroughs, and its pest control needs reflect that suburban character. While cockroaches and rodents are still present — especially in the more densely developed northern shore neighborhoods — the dominant pest control concerns on Staten Island are wildlife, termites, and outdoor pests that thrive in the borough&apos;s greener, more spacious environment. Our Staten Island exterminators handle a significant number of{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoon removal</Link> and{" "}
                <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrel removal</Link> calls — these animals take up residence in attics, crawl spaces, and garages of Staten Island&apos;s predominantly wood-frame and vinyl-sided homes. Raccoons in particular can cause serious damage to roofing, insulation, and ductwork, and they create sanitation hazards with their droppings. Our wildlife pest control technicians use humane trapping and exclusion techniques to remove wildlife and seal entry points so they cannot return.{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">Termite treatment</Link> is another critical pest control service on Staten Island — the borough&apos;s large inventory of wood-frame single-family homes is vulnerable to subterranean termite damage, especially in areas with moist soil conditions and poor drainage. Our termite exterminators perform thorough inspections and install liquid barrier treatments and bait stations to protect Staten Island homes from termite destruction. We also see strong demand for{" "}
                <Link href="/mosquito-control" className="text-green-400 hover:text-green-300">mosquito control</Link> during the warmer months, particularly in neighborhoods near the island&apos;s parks, wetlands, and waterways.
              </p>
            </div>

            {/* New Jersey */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">New Jersey Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Our New Jersey pest control coverage spans the communities closest to New York City — from the urban waterfront of{" "}
                <Link href="/areas/jersey-city" className="text-green-400 hover:text-green-300">Jersey City</Link> and{" "}
                <Link href="/areas/hoboken" className="text-green-400 hover:text-green-300">Hoboken</Link> to the leafy suburban streets of{" "}
                <Link href="/areas/montclair" className="text-green-400 hover:text-green-300">Montclair</Link>,{" "}
                <Link href="/areas/ridgewood-nj" className="text-green-400 hover:text-green-300">Ridgewood</Link>, and{" "}
                <Link href="/areas/westfield" className="text-green-400 hover:text-green-300">Westfield</Link>. New Jersey pest control presents a broad mix of urban and suburban challenges.{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">Termite extermination</Link> is one of our highest-volume services in New Jersey — the state&apos;s climate, soil conditions, and prevalence of wood-frame construction make it one of the most termite-prone areas in the Northeast. Our NJ termite exterminators perform pre-sale termite inspections (wood-destroying insect reports), active termite treatments, and preventive termite monitoring for homeowners throughout our New Jersey service area.{" "}
                <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">Ant extermination</Link> — including carpenter ant control — is another major service category in New Jersey, along with lawn and landscape pests that suburban homeowners encounter.{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">Wildlife removal</Link> is a frequent request from New Jersey homeowners dealing with raccoons in attics, squirrels in soffits, and opossums under decks and sheds. In the denser urban NJ communities like Jersey City and Hoboken, our pest control needs more closely mirror Brooklyn and Manhattan — cockroach extermination, rodent control, and bed bug treatment in multi-unit residential buildings and commercial spaces.
              </p>
            </div>

            {/* Long Island */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Long Island Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Long Island — spanning both Nassau and Suffolk counties — is one of the most termite-active regions in New York State, and{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite treatment</Link> is by far our most critical pest control service on the island. Long Island&apos;s sandy soil, moderate moisture levels, and massive inventory of wood-frame homes (many built during the postwar suburban boom of the 1940s through 1960s) create perfect conditions for eastern subterranean termites. Our Long Island termite exterminators treat hundreds of homes each year, using liquid termiticide barriers and advanced bait station systems to protect structures from the devastating damage termites can cause if left unchecked. Many Long Island homeowners first contact us when they discover termite swarmers — the winged reproductive termites that emerge in spring — or when a home inspection reveals termite damage during a real estate transaction.{" "}
                <Link href="/tick-control" className="text-green-400 hover:text-green-300">Tick control</Link> is another essential pest control service on Long Island, where Lyme disease and other tick-borne illnesses are a serious public health concern. Our tick exterminators provide yard treatments, perimeter spraying, and targeted tick management programs that dramatically reduce tick populations on residential properties.{" "}
                <Link href="/mosquito-control" className="text-green-400 hover:text-green-300">Mosquito control</Link> is heavily demanded during Long Island&apos;s humid summer months, especially in communities near the island&apos;s extensive marshlands and waterways. And like Staten Island and Westchester, Long Island homeowners frequently call on our exterminators for{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">wildlife removal</Link> — raccoons, opossums, and squirrels regularly invade attics, garages, and crawl spaces of Long Island homes, and our humane wildlife pest control technicians handle these situations safely and effectively.
              </p>
            </div>

            {/* Westchester */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Westchester Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Westchester County sits at the northern edge of our pest control service area, and its affluent suburban communities face a distinctive set of pest challenges driven by the county&apos;s wooded landscapes, large lots, and mix of historic and modern homes.{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">Termite extermination</Link> is a major concern for Westchester homeowners — the county&apos;s older homes, many with stone foundations and wood-frame construction, are vulnerable to subterranean termite attack, and our Westchester termite exterminators provide comprehensive inspection, treatment, and monitoring services to protect these valuable properties.{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">Wildlife intrusions</Link> are extremely common in Westchester — the county&apos;s proximity to extensive parks and wooded areas means that raccoons, squirrels, skunks, and even deer are constant visitors to residential properties. Our wildlife pest control team handles animal removal from attics, chimneys, and crawl spaces, as well as exclusion work to prevent re-entry.{" "}
                <Link href="/tick-control" className="text-green-400 hover:text-green-300">Tick-borne disease prevention</Link> is arguably the most important pest control service in Westchester County — the area is one of the highest-risk zones for Lyme disease in the entire country, and our tick exterminators provide seasonal yard treatments, deer deterrent programs, and property perimeter management that significantly reduce tick exposure for Westchester families. We also provide{" "}
                <Link href="/mosquito-control" className="text-green-400 hover:text-green-300">mosquito control</Link>,{" "}
                <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">carpenter ant extermination</Link>, and{" "}
                <Link href="/wasp-removal" className="text-green-400 hover:text-green-300">wasp and hornet nest removal</Link> for Westchester homeowners who want to enjoy their outdoor spaces without worrying about stinging insects and disease-carrying pests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MID CTA ── */}
      <CTAGroup variant="mid" />

      {/* ── FULL GRID ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">All {totalNeighborhoods} Neighborhoods</h2>

          {regions.map((region) => {
            const neighborhoods = neighborhoodsByRegion[region] || [];
            if (neighborhoods.length === 0) return null;
            const regionSlug = region.toLowerCase().replace(/\s+/g, "-");
            return (
              <div key={region} id={regionSlug} className="mt-14 first:mt-10">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold">{region}</h3>
                  <span className="text-sm text-zinc-500">{neighborhoods.length} areas</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {neighborhoods.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/areas/${n.slug}`}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-green-500 hover:text-white"
                    >
                      {n.name}
                      <span className="ml-1 text-xs text-zinc-600">({n.type})</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── WHY LOCAL PEST CONTROL MATTERS ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why <span className="text-green-500">Local Pest Control</span> Matters
          </h2>

          <div className="mt-10 space-y-6 text-base leading-7 text-zinc-300">
            <p>
              When it comes to effective pest control and extermination, local knowledge is not a nice-to-have — it is the single biggest factor that separates a successful treatment from a failed one. An exterminator who understands your specific neighborhood knows things that no amount of generic training can replace: which building types dominate the area, where pests typically enter those structures, what food sources and harborage conditions exist nearby, and how seasonal weather patterns affect local pest activity. This is why The NYC Exterminator invests so heavily in neighborhood-specific pest control expertise. Our technicians are not just licensed exterminators — they are local experts who understand the pest dynamics of the specific communities they serve, from the brownstone-lined streets of{" "}
              <Link href="/areas/fort-greene" className="text-green-400 hover:text-green-300">Fort Greene</Link> to the high-rise corridors of{" "}
              <Link href="/areas/midtown" className="text-green-400 hover:text-green-300">Midtown</Link> to the suburban cul-de-sacs of{" "}
              <Link href="/areas/garden-city" className="text-green-400 hover:text-green-300">Garden City</Link>.
            </p>

            <p>
              Building type is one of the most important variables in pest control, and it varies enormously across the NYC metro area. A pre-war co-op building in Manhattan has completely different pest vulnerabilities than a 1950s Cape Cod on Long Island or a modern luxury condo in{" "}
              <Link href="/areas/downtown-brooklyn" className="text-green-400 hover:text-green-300">Downtown Brooklyn</Link>. Pre-war buildings typically have plaster walls with large void spaces, cast-iron plumbing with gaps around pipe penetrations, and older windows and doors that create entry points for rodents and insects. Postwar suburban homes often have crawl spaces, attached garages, and wood-to-soil contact points that are vulnerable to termites and wildlife. Modern construction is generally tighter but can still have pest issues — especially with ants and cockroaches that exploit utility penetrations and shared mechanical systems. Our exterminators are trained to recognize the pest vulnerabilities specific to each building type and to tailor their treatment approach accordingly. This building-type-aware pest control methodology is one of the key reasons our treatments achieve higher success rates than generic pest control services.
            </p>

            <p>
              Local pest pressure patterns are the other critical factor. Pest activity in the NYC metro area follows predictable geographic and seasonal patterns that an experienced local exterminator knows by heart. Rat activity spikes near subway construction projects and new building sites as displaced rodents seek new harborage. Bed bug reports cluster in certain neighborhoods and building types based on population density and turnover rates. Termite swarms follow soil moisture patterns that vary by geography — Long Island and central New Jersey see earlier and heavier swarm activity than inland Westchester communities. Tick populations are concentrated in wooded and edge habitats that are common in Westchester and eastern Long Island but rare in urban Brooklyn. Mosquito breeding peaks near standing water sources — marshlands on Long Island, storm drains in Queens, neglected pools in suburban New Jersey. Understanding these patterns allows our pest control technicians to anticipate problems, recommend preventive measures, and respond faster when infestations do occur. It is this deep local knowledge — combined with professional-grade products, state-of-the-art equipment, and relentless attention to detail — that makes The NYC Exterminator the most trusted pest control provider across all {totalNeighborhoods}+ neighborhoods we serve.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Service Areas — <span className="text-green-500">FAQ</span></h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
