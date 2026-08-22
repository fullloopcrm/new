import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import {
  getNeighborhoodsByRegion,
  getAllNeighborhoods,
  getAllServices,
  getRegions,
} from "@/app/site/the-baltimore-exterminator/_lib/data";
import Breadcrumbs from "@/app/site/the-baltimore-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-baltimore-exterminator/_components/CTAGroup";
import { SITE_URL, getFAQPageSchema, getBreadcrumbSchema } from "@/app/site/the-baltimore-exterminator/_lib/seo";

export const metadata: Metadata = {
  title: "Pest Control in 280+ Baltimore Neighborhoods | City, County & Beyond",
  description:
    "Find licensed pest control and exterminator services in your Baltimore neighborhood. 280+ service areas across Baltimore City, Baltimore County, and the surrounding suburbs. 30+ services, inspections, same-day appointments. Pricing at $199/hr. Text us.",
  keywords:
    "pest control near me Baltimore, exterminator near me, pest control Baltimore, pest control Baltimore, pest control Baltimore, exterminator Baltimore, pest control Towson, exterminator Catonsville, Dundalk pest control",
  openGraph: {
    title: "Pest Control in 280+ Baltimore Neighborhoods | City, County & Beyond",
    description:
      "Find a licensed exterminator in your neighborhood. 280+ areas, 30+ services, flat-rate pricing at $199/hr. Text us.",
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
      a: `We serve ${totalNeighborhoods}+ neighborhoods across the Baltimore metro area — Baltimore City, Baltimore County, and the surrounding suburbs. Each neighborhood gets access to our full range of ${totalServices}+ pest control services, from cockroach extermination to wildlife removal.`,
    },
    {
      q: "Do you charge extra for areas outside the city?",
      a: "No. Our pricing is the same across all service areas. Whether you need an exterminator in Baltimore City or pest control in Towson, you get the same professional service at the same competitive rates. No travel surcharges, no hidden fees.",
    },
    {
      q: "How quickly can you get to my neighborhood?",
      a: "For standard pest control appointments, we typically schedule within 24-48 hours. For emergencies like active rodent infestations, bed bug outbreaks, or wasp nest removal, we can often respond same-day. Response times vary by neighborhood and availability, but our dispatchers prioritize urgent pest situations.",
    },
    {
      q: "What if my neighborhood isn't listed?",
      a: "We are constantly expanding our pest control coverage across the Baltimore metro area. If you do not see your neighborhood listed, text us — we likely serve your area and can add it to our service map. Our exterminators cover a wider area than what is shown on this page.",
    },
    {
      q: "Do you offer pest control for both residential and commercial properties?",
      a: "Absolutely. Our exterminators handle residential pest control for apartments, co-ops, condos, townhouses, and single-family homes, as well as commercial pest control for restaurants, retail stores, offices, warehouses, and multi-unit residential buildings. We hold all required Maryland commercial pest control licenses.",
    },
    {
      q: "What pests are most common in the Baltimore metro area?",
      a: "The most common pests across the Baltimore metro area include cockroaches (especially German cockroaches in kitchens and bathrooms), rats and mice (particularly in older rowhouses and near restaurants), bed bugs (in multi-unit housing of all kinds), ants, and seasonal pests like wasps and mosquitoes. In suburban areas like Baltimore County and Anne Arundel County, we also see significant termite activity, tick infestations, and wildlife intrusions from raccoons, squirrels, and deer.",
    },
    {
      q: "Are your exterminators licensed in Maryland?",
      a: "Yes. All of our pest control technicians are fully licensed and insured for pest control and extermination work in Maryland. We maintain all required state certifications, and our technicians complete ongoing continuing education to stay current with the latest pest control methods and regulations.",
    },
    {
      q: "Do you offer recurring pest control maintenance plans?",
      a: "Yes, we offer monthly, bi-monthly, and quarterly pest control maintenance plans for both residential and commercial properties across all service areas. Regular pest control maintenance is the most effective way to prevent infestations before they start. Our maintenance plans include scheduled inspections, preventive treatments, and priority emergency service if pests appear between visits.",
    },
    {
      q: "How do I know which pest control service I need?",
      a: "If you are not sure what pest you are dealing with, start with an inspection. Our licensed exterminators will identify the pest, assess the severity of the infestation, and recommend the most effective treatment plan. You can also text us a photo for a quick identification. We never upsell unnecessary services — you only pay for what you actually need.",
    },
    {
      q: "What makes your pest control different from big national chains?",
      a: "We are a local Baltimore pest control company, which means we understand the unique pest pressures of this metro area — from cockroach infestations in downtown high-rises to termite damage in Baltimore County homes to rodent problems in Baltimore rowhouses. Our exterminators live and work in the neighborhoods they serve, giving them firsthand knowledge of local building types, common pest entry points, and the most effective treatment strategies for each area.",
    },
  ];

  const faqSchema = getFAQPageSchema(faqItems);
  const breadcrumbSchema = getBreadcrumbSchema([{ name: "Service Areas", url: "/areas" }]);

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Service Areas", url: "/areas" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
                {totalNeighborhoods} Neighborhoods &middot; 2 Regions &middot; {totalServices} Services
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Pest Control Across{" "}
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  {totalNeighborhoods}+ Baltimore Metro
                </span>{" "}
                Neighborhoods
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Every neighborhood gets access to our full range of{" "}
                <Link href="/services" className="text-green-400 hover:text-green-300">{totalServices}+ pest control services</Link>.
                Licensed exterminators. Same-day service. Inspections.
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

      {/* ── Baltimore METRO PEST CONTROL COVERAGE ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Baltimore Metro <span className="text-green-500">Pest Control Coverage</span>
          </h2>

          <div className="mt-10 space-y-6 text-base leading-7 text-zinc-300">
            <p>
              The Baltimore Exterminator provides comprehensive pest control and extermination services across the entire Baltimore metropolitan area — from the dense rowhouse blocks of{" "}
              <Link href="/areas/fells-point" className="text-green-400 hover:text-green-300">Fells Point</Link> to the tree-lined streets of{" "}
              <Link href="/areas/roland-park" className="text-green-400 hover:text-green-300">Roland Park</Link>, from the harbor-front condos of{" "}
              <Link href="/areas/canton" className="text-green-400 hover:text-green-300">Canton</Link> to the suburban neighborhoods of Baltimore County. Our network of licensed exterminators covers {totalNeighborhoods}+ distinct neighborhoods across the city and county, ensuring that no matter where you live or work in the metro area, professional pest control is just a text away. We built this coverage map because we believe every home and business in the Baltimore metro deserves access to affordable, effective, and reliable pest control services — not just the neighborhoods that happen to be convenient for a technician to reach. Our pest control team is dispatched from multiple staging locations across the city and county, which means faster response times and deeper local knowledge in every area we serve.
            </p>

            <p>
              Why does local pest control coverage matter so much in the Baltimore metro area? Because pest pressure varies dramatically from one neighborhood to the next — and a one-size-fits-all approach simply does not work. A{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link> strategy that works perfectly in a{" "}
              <Link href="/areas/mount-vernon" className="text-green-400 hover:text-green-300">Mount Vernon</Link> high-rise may be completely wrong for a{" "}
              <Link href="/areas/federal-hill" className="text-green-400 hover:text-green-300">Federal Hill</Link> rowhouse. The{" "}
              <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link> techniques our exterminators use in a{" "}
              <Link href="/areas/little-italy" className="text-green-400 hover:text-green-300">Little Italy</Link> restaurant district look nothing like the rodent control approach we take in a{" "}
              <Link href="/areas/towson" className="text-green-400 hover:text-green-300">Towson</Link> residential neighborhood. Building construction types, sanitation infrastructure, landscaping, proximity to water, population density, restaurant concentration, and dozens of other hyper-local factors all influence which pests thrive in a given area and how an exterminator should approach treatment. Our pest control technicians are trained to recognize and adapt to these neighborhood-level differences, which is why our treatments are more effective and longer-lasting than generic pest control services.
            </p>

            <p>
              Each of the two regions we serve — Baltimore City and Baltimore County — presents its own unique set of pest control challenges. Baltimore City&apos;s density and aging rowhouse stock create ideal conditions for{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach infestations</Link> and{" "}
              <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug outbreaks</Link>. The city&apos;s mix of historic rowhouses and modern high-rises means our exterminators encounter everything from{" "}
              <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice in century-old walls</Link> to{" "}
              <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">ant infestations</Link> in ground-floor units. Baltimore County&apos;s suburban communities bring{" "}
              <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite damage</Link>,{" "}
              <Link href="/tick-control" className="text-green-400 hover:text-green-300">tick infestations</Link>, and{" "}
              <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">wildlife intrusions</Link> that are rarely seen in the urban core. Understanding these regional pest patterns is not just academic — it directly determines how effective your exterminator will be. That is why we invest heavily in region-specific training and ensure that every pest control technician working in a given area truly knows the local pest landscape inside and out.
            </p>

            <p>
              Our commitment to comprehensive metro-area pest control coverage also means we can serve clients with properties in multiple locations. If you manage a restaurant portfolio with locations in{" "}
              <Link href="/areas/fells-point" className="text-green-400 hover:text-green-300">Fells Point</Link>,{" "}
              <Link href="/areas/canton" className="text-green-400 hover:text-green-300">Canton</Link>, and{" "}
              <Link href="/areas/highlandtown" className="text-green-400 hover:text-green-300">Highlandtown</Link>, we can handle pest control for all three locations under a single account with consistent service quality and reporting. If you own a rowhouse in{" "}
              <Link href="/areas/bolton-hill" className="text-green-400 hover:text-green-300">Bolton Hill</Link> and a second home in Towson, one call to The Baltimore Exterminator covers both. This kind of multi-location pest control coordination is something the big national chains struggle with — but for a metro-area-focused exterminator like us, it is core to what we do every single day.
            </p>
          </div>
        </div>
      </section>

      {/* ── REGIONS OVERVIEW ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            2 Regions. {totalNeighborhoods} Neighborhoods. <span className="text-green-500">Total Coverage.</span>
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
            Every region in the Baltimore metro area has its own unique pest challenges. Here is what our exterminators encounter most often in each area — and how we address it.
          </p>

          <div className="mt-12 space-y-10">
            {/* Baltimore City */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Baltimore City Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Baltimore City&apos;s dense rowhouse blocks and aging building stock create intense pest pressure. Our city exterminators deal with{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach infestations</Link> on a large scale — German cockroaches thrive in the shared plumbing chases, kitchen walls, and party walls of Baltimore&apos;s rowhouses, apartment buildings, and condos. A single infested unit can spread cockroaches to neighboring units through pipe penetrations and electrical conduits, making professional cockroach extermination essential rather than optional.{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">Rat extermination</Link> is a constant demand across the city — the concentration of restaurants, food service, and alley trash means rats have a reliable food supply. From the restaurant corridors of{" "}
                <Link href="/areas/little-italy" className="text-green-400 hover:text-green-300">Little Italy</Link> to the rowhouses of{" "}
                <Link href="/areas/patterson-park" className="text-green-400 hover:text-green-300">Patterson Park</Link>, our rodent control exterminators perform ongoing rat and mouse exclusion work that keeps these pests out of occupied spaces.{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">Bed bug treatment</Link> rounds out the city&apos;s top pest control needs — tenant turnover, shared laundry facilities, and dense multi-unit housing make Baltimore City one of the more bed-bug-prone areas in the region. Our bed bug exterminators use heat treatment and targeted chemical applications to eliminate infestations quickly and prevent reinfestation.{" "}
                <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">Mouse extermination</Link> is another top request — the city&apos;s historic rowhouses in neighborhoods like{" "}
                <Link href="/areas/federal-hill" className="text-green-400 hover:text-green-300">Federal Hill</Link>,{" "}
                <Link href="/areas/hampden" className="text-green-400 hover:text-green-300">Hampden</Link>, and{" "}
                <Link href="/areas/bolton-hill" className="text-green-400 hover:text-green-300">Bolton Hill</Link>, many built over 100 years ago, are riddled with gaps and deteriorating mortar joints that mice exploit to enter homes. Our technicians combine trapping and baiting with exclusion sealing to deliver lasting mouse control across the city.
              </p>
            </div>

            {/* Baltimore County & Suburbs */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Baltimore County &amp; Suburbs Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Baltimore County and the surrounding suburbs face a different pest profile than the city — while cockroaches and rodents are still present, the dominant concerns in communities like{" "}
                <Link href="/areas/towson" className="text-green-400 hover:text-green-300">Towson</Link>,{" "}
                <Link href="/areas/catonsville" className="text-green-400 hover:text-green-300">Catonsville</Link>, and{" "}
                <Link href="/areas/pikesville" className="text-green-400 hover:text-green-300">Pikesville</Link> are wildlife, termites, and outdoor pests that thrive in a greener, more spacious environment.{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">Termite treatment</Link> is one of our highest-volume services in the county — the abundance of wood-frame single-family homes is vulnerable to subterranean termite damage, especially in areas with moist soil and poor drainage. Our termite exterminators perform thorough inspections and install liquid barrier treatments and bait stations to protect suburban homes from termite destruction.{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">Wildlife removal</Link> is a frequent request from county homeowners dealing with raccoons in attics, squirrels in soffits, and the occasional deer-driven tick concern — our wildlife pest control team uses humane trapping and exclusion to resolve conflicts permanently.{" "}
                <Link href="/tick-control" className="text-green-400 hover:text-green-300">Tick control</Link> is a serious concern in the county&apos;s wooded, suburban neighborhoods like{" "}
                <Link href="/areas/glen-burnie" className="text-green-400 hover:text-green-300">Glen Burnie</Link> and{" "}
                <Link href="/areas/ellicott-city" className="text-green-400 hover:text-green-300">Ellicott City</Link>, where Lyme disease is a real public health concern — our tick exterminators provide seasonal yard treatments and property perimeter management that meaningfully reduce exposure. We also see strong demand for{" "}
                <Link href="/mosquito-control" className="text-green-400 hover:text-green-300">mosquito control</Link> during the warmer months, particularly near the county&apos;s streams, parks, and wetlands.
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
              When it comes to effective pest control and extermination, local knowledge is not a nice-to-have — it is the single biggest factor that separates a successful treatment from a failed one. An exterminator who understands your specific neighborhood knows things that no amount of generic training can replace: which building types dominate the area, where pests typically enter those structures, what food sources and harborage conditions exist nearby, and how seasonal weather patterns affect local pest activity. This is why The Baltimore Exterminator invests so heavily in neighborhood-specific pest control expertise. Our technicians are not just licensed exterminators — they are local experts who understand the pest dynamics of the specific communities they serve, from the rowhome-lined streets of{" "}
              <Link href="/areas/fells-point" className="text-green-400 hover:text-green-300">Fells Point</Link> to the high-rise corridors of{" "}
              <Link href="/areas/downtown" className="text-green-400 hover:text-green-300">Downtown</Link> to the suburban cul-de-sacs of{" "}
              <Link href="/areas/catonsville" className="text-green-400 hover:text-green-300">Catonsville</Link>.
            </p>

            <p>
              Building type is one of the most important variables in pest control, and it varies enormously across the Baltimore metro area. A historic rowhouse in Baltimore City has completely different pest vulnerabilities than a 1970s split-level in Towson or a modern luxury condo in{" "}
              <Link href="/areas/downtown" className="text-green-400 hover:text-green-300">Downtown Baltimore</Link>. Pre-war buildings typically have plaster walls with large void spaces, cast-iron plumbing with gaps around pipe penetrations, and older windows and doors that create entry points for rodents and insects. Postwar suburban homes often have crawl spaces, attached garages, and wood-to-soil contact points that are vulnerable to termites and wildlife. Modern construction is generally tighter but can still have pest issues — especially with ants and cockroaches that exploit utility penetrations and shared mechanical systems. Our exterminators are trained to recognize the pest vulnerabilities specific to each building type and to tailor their treatment approach accordingly. This building-type-aware pest control methodology is one of the key reasons our treatments achieve higher success rates than generic pest control services.
            </p>

            <p>
              Local pest pressure patterns are the other critical factor. Pest activity in the Baltimore metro area follows predictable geographic and seasonal patterns that an experienced local exterminator knows by heart. Rat activity spikes near construction projects and new building sites as displaced rodents seek new harborage. Bed bug reports cluster in certain neighborhoods and building types based on population density and turnover rates. Termite swarms follow soil moisture patterns that vary by geography — the county's wooded suburbs see earlier and heavier swarm activity than the paved urban core. Tick populations are concentrated in wooded and edge habitats that are common in Baltimore County but rare in the dense city. Mosquito breeding peaks near standing water sources — streams and wetlands in the county, storm drains and rowhouse gutters in the city. Understanding these patterns allows our pest control technicians to anticipate problems, recommend preventive measures, and respond faster when infestations do occur. It is this deep local knowledge — combined with professional-grade products, state-of-the-art equipment, and relentless attention to detail — that makes The Baltimore Exterminator the most trusted pest control provider across all {totalNeighborhoods}+ neighborhoods we serve.
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
