import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import {
  getNeighborhoodsByRegion,
  getAllNeighborhoods,
  getAllServices,
  getRegions,
} from "@/app/site/the-dc-exterminator/_lib/data";
import Breadcrumbs from "@/app/site/the-dc-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-dc-exterminator/_components/CTAGroup";
import { SITE_URL, getFAQPageSchema, getBreadcrumbSchema } from "@/app/site/the-dc-exterminator/_lib/seo";

export const metadata: Metadata = {
  title: "Pest Control in 280+ DC Neighborhoods | DC, Northern Virginia & Maryland",
  description:
    "Find licensed pest control and exterminator services in your DC neighborhood. 280+ service areas across DC, Northern Virginia & Suburban Maryland. 30+ services, inspections, same-day appointments. Pricing at $199/hr. Text us.",
  keywords:
    "pest control near me DC, exterminator near me, pest control DC, pest control Northern Virginia, pest control Suburban Maryland, exterminator DC, pest control Arlington, Bethesda exterminator, Silver Spring pest control",
  openGraph: {
    title: "Pest Control in 280+ DC Neighborhoods | DC, Northern Virginia & Maryland",
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
      a: `We serve ${totalNeighborhoods}+ neighborhoods across 8 regions — DC, DC, DC, DC, DC, Northern Virginia, and Suburban Maryland. Each neighborhood gets access to our full range of ${totalServices}+ pest control services, from cockroach extermination to wildlife removal.`,
    },
    {
      q: "Do you charge extra for Northern Virginia or Suburban Maryland?",
      a: "No. Our pricing is the same across all service areas. Whether you need an exterminator in DC or pest control in Arlington, you get the same professional service at the same competitive rates. No travel surcharges, no hidden fees.",
    },
    {
      q: "How quickly can you get to my neighborhood?",
      a: "For standard pest control appointments, we typically schedule within 24-48 hours. For emergencies like active rodent infestations, bed bug outbreaks, or wasp nest removal, we can often respond same-day. Response times vary by neighborhood and availability, but our dispatchers prioritize urgent pest situations.",
    },
    {
      q: "What if my neighborhood isn't listed?",
      a: "We are constantly expanding our pest control coverage across the DC metro area. If you do not see your neighborhood listed, text us — we likely serve your area and can add it to our service map. Our exterminators cover a wider area than what is shown on this page.",
    },
    {
      q: "Do you offer pest control for both residential and commercial properties?",
      a: "Absolutely. Our exterminators handle residential pest control for apartments, co-ops, condos, townhouses, and single-family homes, as well as commercial pest control for restaurants, retail stores, offices, warehouses, and multi-unit residential buildings. We hold all required DC, Virginia, and Maryland commercial pest control licenses.",
    },
    {
      q: "What pests are most common in the DC metro area?",
      a: "The most common pests across the DC metro area include cockroaches (especially German cockroaches in kitchens and bathrooms), rats and mice (particularly in older buildings and near restaurants), bed bugs (in multi-unit housing of all kinds), ants, and seasonal pests like wasps and mosquitoes. In suburban areas like Northern Virginia and Suburban Maryland, we also see significant termite activity, tick infestations, and wildlife intrusions from raccoons, squirrels, and opossums.",
    },
    {
      q: "Are your exterminators licensed in DC, Virginia, and Maryland?",
      a: "Yes. All of our pest control technicians are fully licensed and insured for pest control and extermination work across the District, Virginia, and Maryland. We maintain all required DOEE, VDACS, and Maryland Department of Agriculture certifications, and our technicians complete ongoing continuing education to stay current with the latest pest control methods and regulations.",
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
      a: "We are a local DC pest control company, which means we understand the unique pest pressures of this metro area — from cockroach infestations in DC high-rises to termite damage in Suburban Maryland homes to rodent problems in DC rowhouses. Our exterminators live and work in the neighborhoods they serve, giving them firsthand knowledge of local building types, common pest entry points, and the most effective treatment strategies for each area.",
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
                {totalNeighborhoods} Neighborhoods &middot; 8 Regions &middot; {totalServices} Services
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Pest Control Across{" "}
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  {totalNeighborhoods}+ DC Metro
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

      {/* ── DC METRO PEST CONTROL COVERAGE ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            DC Metro <span className="text-green-500">Pest Control Coverage</span>
          </h2>

          <div className="mt-10 space-y-6 text-base leading-7 text-zinc-300">
            <p>
              The DC Exterminator provides comprehensive pest control and extermination services across the entire Washington, D.C. metropolitan area — from the densest blocks of{" "}
              <Link href="/areas/dupont-circle" className="text-green-400 hover:text-green-300">Dupont Circle</Link> to the tree-lined streets of{" "}
              <Link href="/areas/chevy-chase-dc" className="text-green-400 hover:text-green-300">Chevy Chase</Link>, from the waterfront neighborhoods of{" "}
              <Link href="/areas/navy-yard" className="text-green-400 hover:text-green-300">Navy Yard</Link> to the suburban communities of Northern Virginia and Suburban Maryland. Our network of licensed exterminators covers {totalNeighborhoods}+ distinct neighborhoods across three major regions, ensuring that no matter where you live or work in the metro area, professional pest control is just a text away. We built this coverage map because we believe every home and business in the DC metro deserves access to affordable, effective, and reliable pest control services — not just the neighborhoods that happen to be convenient for a technician to reach. Our pest control team is dispatched from multiple staging locations across Washington, D.C., Northern Virginia, and Suburban Maryland, which means faster response times and deeper local knowledge in every area we serve.
            </p>

            <p>
              Why does local pest control coverage matter so much in the DC metro area? Because pest pressure varies dramatically from one neighborhood to the next — and a one-size-fits-all approach simply does not work. A{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link> strategy that works perfectly in a{" "}
              <Link href="/areas/columbia-heights" className="text-green-400 hover:text-green-300">Columbia Heights</Link> high-rise may be completely wrong for a{" "}
              <Link href="/areas/capitol-hill" className="text-green-400 hover:text-green-300">Capitol Hill</Link> rowhouse. The{" "}
              <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link> techniques our exterminators use in a{" "}
              <Link href="/areas/h-street" className="text-green-400 hover:text-green-300">H Street</Link> restaurant district look nothing like the rodent control approach we take in a{" "}
              <Link href="/areas/bethesda" className="text-green-400 hover:text-green-300">Bethesda</Link> residential neighborhood. Building construction types, sanitation infrastructure, landscaping, proximity to water, population density, restaurant concentration, and dozens of other hyper-local factors all influence which pests thrive in a given area and how an exterminator should approach treatment. Our pest control technicians are trained to recognize and adapt to these neighborhood-level differences, which is why our treatments are more effective and longer-lasting than generic pest control services.
            </p>

            <p>
              Each of the three regions we serve — the District, Northern Virginia, and Suburban Maryland — presents its own unique set of pest control challenges. The District&apos;s density and aging building stock create ideal conditions for{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach infestations</Link> and{" "}
              <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug outbreaks</Link>. DC&apos;s mix of historic rowhouses and modern high-rises means our exterminators encounter everything from{" "}
              <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice in century-old walls</Link> to{" "}
              <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">ant infestations</Link> in ground-floor units. The suburban regions — Northern Virginia and Suburban Maryland — bring{" "}
              <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite damage</Link>,{" "}
              <Link href="/tick-control" className="text-green-400 hover:text-green-300">tick infestations</Link>, and{" "}
              <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">wildlife intrusions</Link> that are rarely seen in the urban core. Understanding these regional pest patterns is not just academic — it directly determines how effective your exterminator will be. That is why we invest heavily in region-specific training and ensure that every pest control technician working in a given area truly knows the local pest landscape inside and out.
            </p>

            <p>
              Our commitment to comprehensive metro-area pest control coverage also means we can serve clients with properties in multiple locations. If you manage a restaurant portfolio with locations in{" "}
              <Link href="/areas/shaw" className="text-green-400 hover:text-green-300">Shaw</Link>,{" "}
              <Link href="/areas/adams-morgan" className="text-green-400 hover:text-green-300">Adams Morgan</Link>, and{" "}
              <Link href="/areas/arlington" className="text-green-400 hover:text-green-300">Arlington</Link>, we can handle pest control for all three locations under a single account with consistent service quality and reporting. If you own a rowhouse in{" "}
              <Link href="/areas/petworth" className="text-green-400 hover:text-green-300">Petworth</Link> and a second property in Suburban Maryland, one call to The DC Exterminator covers both. This kind of multi-location pest control coordination is something the big national chains struggle with — but for a metro-area-focused exterminator like us, it is core to what we do every single day.
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
            Every region in the DC metro area has its own unique pest challenges. Here is what our exterminators encounter most often in each area — and how we address it.
          </p>

          <div className="mt-12 space-y-10">
            {/* Washington, D.C. */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Washington, D.C. Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                The District is one of the densest housing markets on the East Coast, and that density creates intense pest pressure. Our DC exterminators deal with{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach infestations</Link> on a large scale — German cockroaches thrive in the shared plumbing chases, compactor rooms, and kitchen walls of DC&apos;s high-rise apartment buildings, co-ops, and condos. A single infested unit can spread cockroaches to dozens of neighboring apartments through pipe penetrations and electrical conduits, making professional cockroach extermination essential rather than optional.{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">Rat extermination</Link> is another constant demand — the concentration of restaurants, food carts, and garbage in commercial corridors means rats have an almost unlimited food supply. From the restaurant corridors of{" "}
                <Link href="/areas/u-street" className="text-green-400 hover:text-green-300">U Street</Link> to the rowhouse blocks of{" "}
                <Link href="/areas/shaw" className="text-green-400 hover:text-green-300">Shaw</Link> and{" "}
                <Link href="/areas/capitol-hill" className="text-green-400 hover:text-green-300">Capitol Hill</Link>, our rodent control exterminators perform ongoing rat and mouse exclusion work that keeps these pests out of occupied spaces.{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">Bed bug treatment</Link> rounds out DC&apos;s top pest control needs — high tenant turnover, international travel, shared laundry facilities, and dense multi-unit housing near{" "}
                <Link href="/areas/foggy-bottom" className="text-green-400 hover:text-green-300">Foggy Bottom</Link> and{" "}
                <Link href="/areas/dupont-circle" className="text-green-400 hover:text-green-300">Dupont Circle</Link> make bed bugs a persistent citywide problem. Our bed bug exterminators use heat treatment and targeted chemical applications to eliminate infestations quickly and prevent reinfestation. DC&apos;s housing stock ranges from 19th-century rowhouses in{" "}
                <Link href="/areas/georgetown" className="text-green-400 hover:text-green-300">Georgetown</Link> to brand-new high-rises near{" "}
                <Link href="/areas/navy-yard" className="text-green-400 hover:text-green-300">Navy Yard</Link>, so our technicians treat everything from century-old mortar joints to modern shared-wall construction.
              </p>
            </div>

            {/* Northern Virginia */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Northern Virginia Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Our Northern Virginia pest control coverage spans the communities closest to the District — from the dense urban corridors of{" "}
                <Link href="/areas/arlington" className="text-green-400 hover:text-green-300">Arlington</Link> and{" "}
                <Link href="/areas/alexandria" className="text-green-400 hover:text-green-300">Alexandria</Link> to the office parks and suburbs of{" "}
                <Link href="/areas/tysons" className="text-green-400 hover:text-green-300">Tysons</Link>,{" "}
                <Link href="/areas/mclean" className="text-green-400 hover:text-green-300">McLean</Link>, and{" "}
                <Link href="/areas/reston" className="text-green-400 hover:text-green-300">Reston</Link>. Northern Virginia pest control presents a broad mix of urban and suburban challenges.{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">Termite extermination</Link> is one of our highest-volume services in the region — Virginia&apos;s climate, clay-heavy soil, and prevalence of wood-frame construction make it one of the most termite-prone areas in the Mid-Atlantic. Our Northern Virginia termite exterminators perform pre-sale termite inspections (wood-destroying insect reports), active termite treatments, and preventive termite monitoring for homeowners throughout the service area.{" "}
                <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">Ant extermination</Link> — including carpenter ant control — is another major service category, along with lawn and landscape pests that suburban homeowners encounter.{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">Wildlife removal</Link> is a frequent request from Northern Virginia homeowners dealing with raccoons in attics, squirrels in soffits, and opossums under decks and sheds. In the denser urban communities like Arlington and Alexandria, our pest control needs more closely mirror the District — cockroach extermination, rodent control, and bed bug treatment in multi-unit residential buildings and commercial spaces.
              </p>
            </div>

            {/* Suburban Maryland */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-green-500">Suburban Maryland Pest Control</h3>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Suburban Maryland — spanning communities from{" "}
                <Link href="/areas/bethesda" className="text-green-400 hover:text-green-300">Bethesda</Link> to{" "}
                <Link href="/areas/silver-spring" className="text-green-400 hover:text-green-300">Silver Spring</Link>,{" "}
                <Link href="/areas/rockville" className="text-green-400 hover:text-green-300">Rockville</Link>, and{" "}
                <Link href="/areas/gaithersburg" className="text-green-400 hover:text-green-300">Gaithersburg</Link> — is one of the more termite-active regions of the DC metro, and{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite treatment</Link> is by far our most requested pest control service in the area. The region&apos;s soil, moisture levels, and inventory of wood-frame homes (many built during the postwar suburban boom of the 1940s through 1960s) create favorable conditions for eastern subterranean termites. Our Maryland termite exterminators treat homes throughout the year, using liquid termiticide barriers and advanced bait station systems to protect structures from the damage termites can cause if left unchecked. Many homeowners first contact us when they discover termite swarmers — the winged reproductive termites that emerge in spring — or when a home inspection reveals termite damage during a real estate transaction.{" "}
                <Link href="/tick-control" className="text-green-400 hover:text-green-300">Tick control</Link> is another essential pest control service in Suburban Maryland, where Lyme disease and other tick-borne illnesses are a serious public health concern. Our tick exterminators provide yard treatments, perimeter spraying, and targeted tick management programs that dramatically reduce tick populations on residential properties.{" "}
                <Link href="/mosquito-control" className="text-green-400 hover:text-green-300">Mosquito control</Link> is heavily demanded during the humid summer months, especially in communities near the region&apos;s parks and waterways. And homeowners frequently call on our exterminators for{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">wildlife removal</Link> — raccoons, opossums, and squirrels regularly invade attics, garages, and crawl spaces, and our humane wildlife pest control technicians handle these situations safely and effectively.
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
              When it comes to effective pest control and extermination, local knowledge is not a nice-to-have — it is the single biggest factor that separates a successful treatment from a failed one. An exterminator who understands your specific neighborhood knows things that no amount of generic training can replace: which building types dominate the area, where pests typically enter those structures, what food sources and harborage conditions exist nearby, and how seasonal weather patterns affect local pest activity. This is why The DC Exterminator invests so heavily in neighborhood-specific pest control expertise. Our technicians are not just licensed exterminators — they are local experts who understand the pest dynamics of the specific communities they serve, from the rowhouse-lined streets of{" "}
              <Link href="/areas/capitol-hill" className="text-green-400 hover:text-green-300">Capitol Hill</Link> to the high-rise corridors of{" "}
              <Link href="/areas/foggy-bottom" className="text-green-400 hover:text-green-300">Foggy Bottom</Link> to the suburban cul-de-sacs of{" "}
              <Link href="/areas/bethesda" className="text-green-400 hover:text-green-300">Bethesda</Link>.
            </p>

            <p>
              Building type is one of the most important variables in pest control, and it varies enormously across the DC metro area. A pre-war apartment building in the District has completely different pest vulnerabilities than a 1950s split-level in Suburban Maryland or a modern luxury condo in{" "}
              <Link href="/areas/navy-yard" className="text-green-400 hover:text-green-300">Navy Yard</Link>. Pre-war buildings typically have plaster walls with large void spaces, cast-iron plumbing with gaps around pipe penetrations, and older windows and doors that create entry points for rodents and insects. Postwar suburban homes often have crawl spaces, attached garages, and wood-to-soil contact points that are vulnerable to termites and wildlife. Modern construction is generally tighter but can still have pest issues — especially with ants and cockroaches that exploit utility penetrations and shared mechanical systems. Our exterminators are trained to recognize the pest vulnerabilities specific to each building type and to tailor their treatment approach accordingly. This building-type-aware pest control methodology is one of the key reasons our treatments achieve higher success rates than generic pest control services.
            </p>

            <p>
              Local pest pressure patterns are the other critical factor. Pest activity in the DC metro area follows predictable geographic and seasonal patterns that an experienced local exterminator knows by heart. Rat activity spikes near Metro construction projects and new building sites as displaced rodents seek new harborage. Bed bug reports cluster in certain neighborhoods and building types based on population density and turnover rates. Termite swarms follow soil moisture patterns that vary by geography — Suburban Maryland and central Northern Virginia see earlier and heavier swarm activity than the denser urban core. Tick populations are concentrated in wooded and edge habitats that are common in outer Northern Virginia and Suburban Maryland but rare in urban DC. Mosquito breeding peaks near standing water sources — wetlands along the Potomac and Anacostia rivers, storm drains in DC, neglected pools in suburban Maryland and Virginia. Understanding these patterns allows our pest control technicians to anticipate problems, recommend preventive measures, and respond faster when infestations do occur. It is this deep local knowledge — combined with professional-grade products, state-of-the-art equipment, and relentless attention to detail — that makes The DC Exterminator the most trusted pest control provider across all {totalNeighborhoods}+ neighborhoods we serve.
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
