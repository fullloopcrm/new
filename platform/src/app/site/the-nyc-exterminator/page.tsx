import Link from "next/link";
import type { Metadata } from "next";
import {
  getServicesByCategory,
  getNeighborhoodsByRegion,
  getAllServices,
  getAllNeighborhoods,
  getRegions,
} from "@/app/site/the-nyc-exterminator/_lib/data";
import {
  PHONE,
  SITE_URL,
  SITE_NAME,
  EMAIL,
  ADDRESS,
  getFAQPageSchema,
} from "@/app/site/the-nyc-exterminator/_lib/seo";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";

export const metadata: Metadata = {
  title:
    "NYC Pest Control & Exterminator Services | Licensed Exterminators | The NYC Exterminator",
  description:
    "Professional pest control and exterminator services across NYC, NJ, Long Island & Westchester. Pricing starting at $49. Cockroaches, bed bugs, rats, mice, termites & more. Licensed & insured. Same-day service. Text us at 212-202-8545!",
  keywords:
    "NYC pest control, NYC exterminator, pest control NYC, exterminator NYC, bed bug treatment NYC, cockroach extermination NYC, rat exterminator NYC, mouse exterminator, termite treatment, wildlife removal NYC, commercial pest control, residential pest control",
  openGraph: {
    title: "NYC Pest Control & Exterminator Services | The NYC Exterminator",
    description:
      "Professional pest control and exterminator services across the NYC metro area. Pricing starting at $49. 30+ services. 280+ neighborhoods. Text us at 212-202-8545!",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function HomePage() {
  const servicesByCategory = getServicesByCategory();
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const totalServices = getAllServices().length;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalPages = totalServices * totalNeighborhoods;
  const allServices = getAllServices();
  const regions = getRegions();

  const featuredCategories = Object.entries(servicesByCategory);

  const homeFaqs = [
    {
      q: "How much does pest control cost in NYC?",
      a: "Pest control costs in NYC vary depending on the pest type, severity of infestation, and property size. General pest control treatments typically start at $125–$300 for a single visit. Bed bug heat treatment costs $1,000–$1,500 per room. Rodent control and exclusion work ranges from $200–$600. Termite treatment costs $500–$2,500 depending on the scope. We always provide a free inspection and upfront pricing before any work begins — no hidden fees, no surprises.",
    },
    {
      q: "Do you offer same-day pest control and exterminator service?",
      a: "Yes. We offer same-day and emergency pest control service for urgent situations throughout NYC, NJ, Long Island, and Westchester. Whether it's a wasp nest near your front door, a rat sighting in your restaurant kitchen, or a bed bug discovery the night before guests arrive, our licensed exterminators can respond quickly. Text us and we'll dispatch a technician as soon as possible.",
    },
    {
      q: "Are your pest control treatments safe for pets and children?",
      a: "Absolutely. All of our pest control treatments use EPA-approved products with targeted application methods designed to minimize exposure to people and pets. Gel baits are placed inside cracks, crevices, and wall voids — areas away from everyday contact. Our exterminators always provide specific safety instructions tailored to your household before and after every treatment.",
    },
    {
      q: "Do you service apartments, houses, and commercial properties?",
      a: "We provide pest control and exterminator services for every property type — studio apartments, co-ops, condos, townhouses, brownstones, single-family homes, restaurants, offices, retail stores, warehouses, and multi-unit residential buildings. Our licensed exterminators serve all five NYC boroughs, New Jersey, Long Island, and Westchester County.",
    },
    {
      q: "Are your exterminators licensed and insured?",
      a: "Every single one of our pest control technicians holds a NYS DEC Commercial Pesticide Applicator license and is fully insured. Our wildlife control operators carry additional NYS DEC Nuisance Wildlife Control licenses. We maintain full general liability coverage on every job we perform, and we're happy to provide proof of insurance upon request.",
    },
    {
      q: "What areas does The NYC Exterminator serve?",
      a: `We provide pest control and exterminator services across ${totalNeighborhoods}+ neighborhoods spanning Manhattan, Brooklyn, Queens, the Bronx, Staten Island, New Jersey, Long Island, and Westchester. If you're anywhere in the NYC metro area, we've got you covered. Check our service areas page for your specific neighborhood.`,
    },
    {
      q: "How quickly can an exterminator get to my property?",
      a: "For standard appointments, we typically schedule within 24–48 hours. For emergency pest control situations — active wasp nests, large rodent infestations, or bed bug discoveries — we offer same-day service and can often have a licensed exterminator at your door within a few hours. Response times depend on your location and current scheduling, but we always prioritize urgent situations.",
    },
    {
      q: "Do you offer pest control maintenance plans?",
      a: "Yes. We offer monthly, bi-monthly, and quarterly pest control maintenance plans for both residential and commercial properties. Regular maintenance is the most cost-effective way to prevent infestations before they start. Plans include scheduled inspections, preventive treatments, and unlimited callbacks between visits if any pests return. Commercial plans can be customized for NYC DOH compliance.",
    },
    {
      q: "What should I do to prepare for a pest control treatment?",
      a: "Preparation varies by treatment type. For general pest control, we ask that you clear areas under sinks, clean kitchen surfaces, and remove pet food and water dishes. For bed bug treatment, you'll need to launder bedding on high heat and declutter around bed frames. For rodent control, securing food sources is essential. Our team provides detailed preparation instructions specific to your treatment when you book.",
    },
    {
      q: "Do you guarantee your pest control work?",
      a: "Yes. We stand behind every pest control treatment we perform. If pests return between scheduled treatments or within our guarantee period, we come back and re-treat at no additional charge. Our guarantee periods vary by service — general pest control carries a 30-day guarantee, while specialized treatments like bed bug heat treatment include a 90-day guarantee. We'll explain your specific guarantee before any work begins.",
    },
  ];

  const phonePlain = PHONE.replace(/-/g, "");

  return (
    <div className="text-white">
      {/* JSON-LD Schemas (LocalBusiness + WebSite emitted once globally in layout.tsx) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFAQPageSchema(homeFaqs)),
        }}
      />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-[#0A0A0A] pb-20 pt-12">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-green-500/[0.04] blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-green-400/80">
                Licensed &middot; Insured &middot; Same-Day Pest Control
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                NYC&apos;s Most Trusted{" "}
                <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent">
                  Pest Control &amp; Exterminator
                </span>{" "}
                Service
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Professional pest control and extermination services for{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches</Link>,{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs</Link>,{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rats</Link>,{" "}
                <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice</Link>,{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termites</Link>,{" "}
                <Link href="/wasp-removal" className="text-green-400 hover:text-green-300">wasps</Link>,{" "}
                <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">wildlife</Link>,{" "}
                and <Link href="/services" className="text-green-400 hover:text-green-300">{totalServices}+ pest types</Link>{" "}
                across{" "}
                <Link href="/areas" className="text-green-400 hover:text-green-300">{totalNeighborhoods}+ neighborhoods</Link>{" "}
                in NYC, NJ, Long Island &amp; Westchester. Services starting at only <strong className="text-white">$49</strong>. NYS DEC licensed exterminators. Free pest inspections. Same-day pest control service available. Upfront pricing with no hidden fees.
              </p>

              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glow-border rounded-2xl bg-[#141414] px-6 py-8 text-center transition-all duration-300 hover:bg-[#1a1a1a]">
                <div className="text-4xl font-extrabold text-green-400 sm:text-5xl">24/7</div>
                <div className="mt-2 text-sm font-semibold text-zinc-200">We Never Sleep</div>
                <div className="mt-1 text-xs text-zinc-500">Nights, weekends, holidays. We pick up.</div>
              </div>
              <div className="glow-border rounded-2xl bg-[#141414] px-6 py-8 text-center transition-all duration-300 hover:bg-[#1a1a1a]">
                <div className="text-4xl font-extrabold text-white sm:text-5xl">30s</div>
                <div className="mt-2 text-sm font-semibold text-zinc-200">Text &amp; You&apos;re Booked</div>
                <div className="mt-1 text-xs text-zinc-500">Fastest scheduling in NYC. Period.</div>
              </div>
              <div className="glow-border rounded-2xl bg-[#141414] px-6 py-8 text-center transition-all duration-300 hover:bg-[#1a1a1a]">
                <div className="text-4xl font-extrabold text-white sm:text-5xl">4.9<span className="text-2xl text-green-400 sm:text-3xl">&#9733;</span></div>
                <div className="mt-2 text-sm font-semibold text-zinc-200">NYC Loves Us</div>
                <div className="mt-1 text-xs text-zinc-500">2,847+ verified five-star reviews.</div>
              </div>
              <div className="glow-border rounded-2xl bg-[#141414] px-6 py-8 text-center transition-all duration-300 hover:bg-[#1a1a1a]">
                <div className="text-4xl font-extrabold text-[#EFF70A] sm:text-5xl">25K+</div>
                <div className="mt-2 text-sm font-semibold text-zinc-200">Pests Gone for Good</div>
                <div className="mt-1 text-xs text-zinc-500">NYC homes &amp; businesses cleared. Yours is next.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="border-y border-white/[0.06] bg-[#0D0D0D] py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4 text-center text-sm text-zinc-500 sm:px-6 lg:px-8">
          <span><strong className="text-zinc-200">NYS DEC Licensed</strong> Exterminators</span>
          <span className="hidden text-zinc-700 sm:inline">&bull;</span>
          <span><strong className="text-zinc-200">Fully Insured</strong> Pest Control</span>
          <span className="hidden text-zinc-700 sm:inline">&bull;</span>
          <span><strong className="text-zinc-200">Free</strong> Pest Inspections</span>
          <span className="hidden text-zinc-700 sm:inline">&bull;</span>
          <span><strong className="text-zinc-200">Same-Day</strong> Service Available</span>
          <span className="hidden text-zinc-700 sm:inline">&bull;</span>
          <span><strong className="text-zinc-200">Guaranteed</strong> Results</span>
        </div>
      </section>

      {/* ── PRO TIP 1 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Pro Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Saw one cockroach?</strong> There are probably 100 more hiding in your walls. German cockroaches are nocturnal &mdash; if you see them during the day, the infestation is already serious. Don&apos;t waste money on store-bought sprays (they actually make it worse by scattering roaches to new rooms). Text us a photo and we&apos;ll tell you exactly what you&apos;re dealing with &mdash; free.
          </p>
        </div>
      </div>

      {/* ── ABOUT / INTRO SECTION ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            New York City&apos;s Premier <span className="text-green-500">Pest Control</span> &amp; Exterminator Company
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                The NYC Exterminator is a full-service pest control company serving the entire New York City metropolitan area. From our headquarters at {ADDRESS.street} in Midtown Manhattan, our team of licensed exterminators provides comprehensive pest control services to residential and commercial properties across all five NYC boroughs, northern New Jersey, Long Island, and Westchester County. We specialize in eliminating every pest that thrives in the urban environment — from <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches</Link> and <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs</Link> to <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rats</Link>, <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice</Link>, <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termites</Link>, and <Link href="/general-pest-control" className="text-green-400 hover:text-green-300">general household pests</Link>.
              </p>
              <p>
                What sets our pest control company apart is our commitment to thorough, lasting results. Every job begins with a comprehensive inspection conducted by a NYS DEC-licensed exterminator who identifies not just the pest, but the source of the infestation and the conditions allowing it to persist. We then develop a customized treatment plan using EPA-approved products and industry-leading techniques — from targeted gel bait applications for <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach control</Link> to whole-room heat treatment for <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug elimination</Link> to exclusion work for <Link href="/rodent-proofing" className="text-green-400 hover:text-green-300">rodent-proofing</Link>.
              </p>
              <p>
                We understand that pest problems in NYC are uniquely challenging. Dense multi-unit housing means infestations can spread rapidly between apartments. The city&apos;s massive food service industry creates constant pest pressure on restaurants and commercial kitchens. Old building infrastructure provides endless entry points for rodents and insects. That&apos;s why our pest control approach addresses the root cause — not just the symptoms — with treatments designed for the realities of New York City living. Whether you need <Link href="/emergency-pest-control" className="text-green-400 hover:text-green-300">emergency pest control</Link> for an active infestation or a <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control maintenance plan</Link> to keep your business compliant, The NYC Exterminator delivers results you can count on.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Our pest control services span {totalServices} distinct service types across {Object.keys(servicesByCategory).length} categories, covering everything from common household pests to specialized wildlife removal. Each service page on our website provides detailed information about the pest, treatment options, <Link href="/pricing" className="text-green-400 hover:text-green-300">transparent pricing</Link>, and local coverage for your specific neighborhood. With {totalNeighborhoods}+ neighborhoods served across {regions.length} regions, we&apos;ve built the most comprehensive pest control coverage network in the NYC metro area.
              </p>
              <p>
                Every exterminator on our team holds active NYS DEC Commercial Pesticide Applicator certification and undergoes ongoing training in the latest pest control techniques and safety protocols. Our wildlife control specialists carry additional NYS DEC Nuisance Wildlife Control licenses for <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoon removal</Link>, <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrel removal</Link>, <Link href="/pigeon-control" className="text-green-400 hover:text-green-300">pigeon control</Link>, and <Link href="/bat-removal" className="text-green-400 hover:text-green-300">bat removal</Link>. We carry full general liability insurance on every job and are happy to provide documentation for property managers, co-op boards, and commercial tenants.
              </p>
              <p>
                Thousands of NYC property owners, tenants, and business operators trust The NYC Exterminator for reliable pest control. Check our <Link href="/reviews" className="text-green-400 hover:text-green-300">customer reviews</Link> to see why we maintain a 4.9-star rating across thousands of completed pest control jobs. Learn more <Link href="/about" className="text-green-400 hover:text-green-300">about our company</Link>, our commitment to excellence, and the Consortium NYC team behind every pest control treatment we perform. Ready to get started? <Link href="/book-exterminator-today" className="text-green-400 hover:text-green-300">Book online and save $10</Link> — the fastest way to lock in service — or <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">text us at {PHONE}</a>. We respond fast. With pest control pricing starting at just $49, there&apos;s no reason to wait. Don&apos;t let a small pest problem become a major infestation. Contact The NYC Exterminator today and let our licensed exterminators take care of the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">We&apos;re Not Your Average Exterminators</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Why NYC Chooses Our <span className="text-green-500">Pest Control</span> &amp; Exterminator Team
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Choosing the right pest control company in New York City is critical. The wrong exterminator wastes your time and money with ineffective treatments that let infestations grow worse. Here&apos;s what makes The NYC Exterminator different from every other pest control company in the metro area.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Licensed & Insured Exterminators",
                desc: "All pest control technicians hold NYS DEC Commercial Pesticide Applicator licenses. Wildlife operators carry additional DEC Nuisance Wildlife Control certification. Full liability coverage on every single job — residential and commercial.",
              },
              {
                title: "Same-Day Pest Control Service",
                desc: "Emergency pest problems can't wait. Wasp nests, rat infestations, bed bug discoveries — we offer same-day exterminator service for urgent situations across all five NYC boroughs, NJ, Long Island, and Westchester.",
              },
              {
                title: "Free Pest Inspections",
                desc: "Every pest control job starts with a thorough inspection by a licensed exterminator. We identify the pest species, locate the source of the infestation, assess the severity, and develop the most effective treatment plan — at no cost to you.",
              },
              {
                title: "Guaranteed Pest Elimination",
                desc: "We stand behind every pest control treatment. If pests come back between scheduled treatments or within our guarantee period, our exterminators return and re-treat at no additional charge. That's our promise to every customer.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/[0.06] bg-[#141414] p-6">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">Comprehensive NYC Pest Control Coverage</h3>
              <p>
                Most pest control companies in New York City serve a limited area or specialize in only a few pest types. The NYC Exterminator provides {totalServices} different pest control and exterminator services across {totalNeighborhoods}+ neighborhoods in {regions.length} regions. Whether you&apos;re dealing with <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches in a Williamsburg apartment</Link>, <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rats in a Midtown restaurant</Link>, <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs in a Upper West Side co-op</Link>, or <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termites in a Westchester home</Link>, we have the expertise, the licensing, and the equipment to handle it.
              </p>
              <p>
                Our coverage extends well beyond the five boroughs. We serve communities across <Link href="/areas#new-jersey" className="text-green-400 hover:text-green-300">northern New Jersey</Link> including Hoboken, Jersey City, Newark, and Montclair. Our <Link href="/areas#long-island" className="text-green-400 hover:text-green-300">Long Island pest control team</Link> covers Nassau and Suffolk County communities from Garden City to the Hamptons. And our <Link href="/areas#westchester" className="text-green-400 hover:text-green-300">Westchester exterminators</Link> serve White Plains, Yonkers, New Rochelle, Scarsdale, and surrounding communities.
              </p>
            </div>
            <div className="space-y-4 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">Transparent Pricing &amp; No Hidden Fees</h3>
              <p>
                We believe pest control pricing should be straightforward and transparent. Before any exterminator begins treatment on your property, you receive a detailed written estimate that explains exactly what we&apos;ll do, which products we&apos;ll use, how many treatments are included, and the total cost. No hidden fees. No surprise charges. No pressure to upsell services you don&apos;t need.
              </p>
              <p>
                Our <Link href="/pricing" className="text-green-400 hover:text-green-300">pest control pricing page</Link> provides detailed price ranges for every service we offer, from <Link href="/general-pest-control" className="text-green-400 hover:text-green-300">general pest control</Link> starting at $125 to specialized <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug heat treatment</Link> and <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite treatment programs</Link>. We also offer monthly, bi-monthly, and quarterly maintenance plans for <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control</Link> and residential properties that provide the best long-term value and prevention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRO TIP 2 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">NYC Insider</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">NYC landlords are legally required to provide pest control.</strong> Under NYC Housing Maintenance Code, your landlord must keep your apartment pest-free. If they&apos;re dragging their feet, you have rights. We work directly with building management to get the job done &mdash; and we document everything for your records.
          </p>
        </div>
      </div>

      {/* ── ALL SERVICES BY CATEGORY ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">{totalServices} Services. Zero Pests.</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Our Complete <span className="text-green-500">Pest Control</span> &amp; Exterminator Services
          </h2>
          <p className="mt-4 max-w-4xl text-zinc-300 leading-7">
            The NYC Exterminator offers {totalServices} professional pest control and extermination services organized across {Object.keys(servicesByCategory).length} categories. Every service includes a free inspection, upfront pricing, EPA-approved treatments, and a satisfaction guarantee. Click any service below to see detailed information, pricing, FAQs, and coverage across all {totalNeighborhoods} neighborhoods we serve.
          </p>

          <div className="mt-12 space-y-14">
            {featuredCategories.map(([category, services]) => (
              <div key={category}>
                <h3 className="text-2xl font-bold text-white">{category}</h3>
                <p className="mt-2 text-zinc-400">
                  {category === "Common Pests" &&
                    "The most frequently encountered pest problems across NYC apartments, homes, and businesses. These pests thrive in the urban environment and require professional exterminator treatment for complete elimination."}
                  {category === "Rodents" &&
                    "NYC's rodent population is one of the largest in the world. Professional rodent control combines trapping, baiting, and exclusion work to eliminate current infestations and prevent re-entry."}
                  {category === "Wood-Destroying Insects" &&
                    "Termites and carpenter ants cause billions in property damage annually. Early detection and professional treatment protect your property's structural integrity."}
                  {category === "Stinging Insects" &&
                    "Wasps, bees, hornets, and yellow jackets pose serious safety risks, especially near building entrances and outdoor dining areas. Professional removal is essential for safety."}
                  {category === "Wildlife Control" &&
                    "NYC's urban wildlife — raccoons, squirrels, pigeons, and bats — can cause property damage and health hazards. Licensed wildlife control operators handle humane removal and exclusion."}
                  {category === "Specialty Pests" &&
                    "Less common but equally disruptive pests including moths, silverfish, centipedes, drain flies, and pantry pests. Professional identification and targeted treatment delivers faster results."}
                  {category === "Commercial Services" &&
                    "Specialized pest control programs designed for restaurants, food service, retail, offices, and commercial properties. NYC DOH-compliant treatments with documentation for health inspections."}
                  {category === "General Services" &&
                    "Broad pest control programs for properties dealing with multiple pest types or needing comprehensive coverage. Includes emergency pest control for urgent situations."}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/${service.slug}`}
                      className="rounded-xl border border-white/[0.06] bg-[#141414] p-4 transition-colors hover:border-green-500/50"
                    >
                      <h4 className="font-medium text-white">{service.name}</h4>
                      <p className="mt-1 text-xs text-zinc-500">Starting at {service.priceRange}</p>
                      <p className="mt-2 text-xs leading-5 text-zinc-400 line-clamp-2">{service.description}</p>
                      {service.emergencyAvailable && (
                        <span className="mt-2 inline-block rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                          Emergency Available
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/services"
              className="inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
            >
              View all {totalServices} pest control services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRO TIP 3 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Pro Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Moving into a new apartment?</strong> Request a pest inspection BEFORE you move your furniture in. It&apos;s 10x easier (and cheaper) to treat an empty unit. We offer pre-move-in inspections that take about 30 minutes &mdash; and they&apos;re completely free. You&apos;ll thank us later.
          </p>
        </div>
      </div>

      {/* ── MID CTA ── */}
      <CTAGroup variant="mid" />

      {/* ── THE NYC PEST PROBLEM ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Know Your Enemy</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Understanding the <span className="text-green-500">NYC Pest Problem</span>
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                New York City has one of the most challenging pest environments in the United States. The combination of dense population, aging building infrastructure, an enormous food service industry, and a temperate coastal climate creates ideal conditions for virtually every urban pest species. According to the NYC Department of Health, approximately 15% of NYC households report seeing cockroaches in their homes, and rodent complaints have increased significantly in recent years across all five boroughs.
              </p>
              <p>
                <strong className="text-white">Cockroaches</strong> are the most common pest in NYC apartments. German cockroaches — the smaller, light-brown species — infest kitchens and bathrooms, spreading through shared walls and plumbing in multi-unit buildings. A single female German cockroach can produce 30,000 offspring in a year. American cockroaches, the larger reddish-brown &quot;water bugs,&quot; invade basements, laundry rooms, and utility areas. Professional <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link> using gel baits, IGR treatments, and crack-and-crevice applications is the only reliable way to eliminate established cockroach populations in NYC buildings.
              </p>
              <p>
                <strong className="text-white">Bed bugs</strong> remain one of NYC&apos;s most persistent pest problems. These blood-feeding insects spread through luggage, used furniture, and shared laundry facilities. NYC&apos;s Bed Bug Disclosure Act (Local Law 69) requires landlords to disclose bed bug infestation history to prospective tenants. Professional <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link> — particularly whole-room heat treatment that raises temperatures above 120°F — is the most effective elimination method. Chemical treatments using residual insecticides can supplement heat treatment for severe infestations.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                <strong className="text-white">Rats and mice</strong> are an iconic — and serious — NYC pest problem. The city&apos;s rat population is estimated in the millions, with Norway rats dominating at street level and in subway systems. Mayor Adams&apos; &quot;rat czar&quot; initiative and the expansion of containerized trash collection reflect how seriously the city takes rodent control. For individual properties, professional <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link> and <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mouse control</Link> combines strategic baiting, snap trapping, and — most importantly — <Link href="/rodent-proofing" className="text-green-400 hover:text-green-300">rodent exclusion work</Link> to seal entry points and prevent re-infestation.
              </p>
              <p>
                <strong className="text-white">Termites</strong> cause more property damage in the NYC metro area than most people realize. Subterranean termites are the primary species, entering buildings through soil contact with foundations and causing structural damage that can cost thousands to repair. <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">Professional termite treatment</Link> uses liquid barrier treatments and bait station systems to protect properties. Annual termite inspections are recommended for all wood-frame structures, particularly in the outer boroughs, Long Island, Westchester, and New Jersey where soil conditions favor termite activity.
              </p>
              <p>
                <strong className="text-white">Wildlife</strong> in NYC is more diverse than many residents expect. <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">Raccoons</Link> nest in attics and crawl spaces. <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">Squirrels</Link> chew through soffits and fascia to access warm interior spaces. <Link href="/pigeon-control" className="text-green-400 hover:text-green-300">Pigeons</Link> cause extensive property damage with their acidic droppings and nesting materials. <Link href="/bat-removal" className="text-green-400 hover:text-green-300">Bats</Link> — while ecologically beneficial — carry rabies risk and require licensed wildlife control for safe removal. All wildlife control in New York state requires a NYS DEC Nuisance Wildlife Control license, which all our wildlife specialists hold.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRO TIP 4 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Did You Know?</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">A single mouse can squeeze through a hole the size of a dime.</strong> That tiny gap under your radiator pipe? That&apos;s a five-lane highway for mice. Our rodent-proofing team seals every single entry point with steel wool and copper mesh &mdash; materials mice literally cannot chew through. Prevention beats extermination every time.
          </p>
        </div>
      </div>

      {/* ── SERVICE AREAS ── */}
      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">We&apos;re Everywhere You Need Us</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Pest Control &amp; Exterminator Service Across{" "}
            <span className="text-green-500">{totalNeighborhoods}+ Neighborhoods</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            From the southern tip of Manhattan to the northern suburbs of Westchester, from the Jersey City waterfront to the eastern reaches of Long Island — our licensed exterminators provide professional pest control coverage across the entire NYC metropolitan area. Every neighborhood we serve has a dedicated local service page with pest control information specific to that community.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(neighborhoodsByRegion).map(([region, neighborhoods]) => (
              <div key={region} className="rounded-xl border border-white/[0.06] bg-[#141414] p-5">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-lg font-bold text-white hover:text-green-500"
                  >
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
                      href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                      className="rounded bg-zinc-700/50 px-2 py-1 text-xs text-green-500 hover:bg-green-500/20"
                    >
                      +{neighborhoods.length - 5} more
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-5 text-zinc-300 leading-7">
            <p>
              Each neighborhood we serve presents unique pest control challenges. <Link href="/areas/midtown" className="text-green-400 hover:text-green-300">Midtown Manhattan</Link> high-rises deal with cockroach and rodent issues driven by restaurant density. <Link href="/areas/williamsburg" className="text-green-400 hover:text-green-300">Williamsburg</Link> and <Link href="/areas/bushwick" className="text-green-400 hover:text-green-300">Bushwick</Link> brownstones face bed bug and mouse problems common in older multi-unit housing. <Link href="/areas/astoria" className="text-green-400 hover:text-green-300">Astoria</Link> and <Link href="/areas/jackson-heights" className="text-green-400 hover:text-green-300">Jackson Heights</Link> commercial corridors require specialized <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control</Link> to maintain NYC DOH compliance.
            </p>
            <p>
              Suburban communities across <Link href="/areas#long-island" className="text-green-400 hover:text-green-300">Long Island</Link> and <Link href="/areas#westchester" className="text-green-400 hover:text-green-300">Westchester</Link> face different pest pressures — <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite damage</Link> to wood-frame homes, <Link href="/tick-control" className="text-green-400 hover:text-green-300">tick control</Link> in wooded lots, <Link href="/mosquito-control" className="text-green-400 hover:text-green-300">mosquito control</Link> near standing water, and wildlife intrusions from <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoons</Link> and <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrels</Link>. Our exterminators understand these regional differences and tailor pest control treatments accordingly.
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/areas"
              className="inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
            >
              Browse all {totalNeighborhoods}+ service areas &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Ridiculously Simple</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            How Our Pest Control &amp; Exterminator <span className="text-green-500">Process Works</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            No phone trees. No waiting on hold. No &quot;we&apos;ll get back to you in 3-5 business days.&quot; Our process is designed for maximum effectiveness and minimum disruption to your life. Text us, we show up, pests disappear. It really is that simple.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Text Us (Seriously, That's It)",
                desc: "Send us a text. Snap a photo of the problem if you can. We'll respond in minutes — not hours, not days. We'll ask a couple quick questions about your property and the pest situation, and boom, you're on the schedule.",
              },
              {
                step: "2",
                title: "We Show Up & Investigate",
                desc: "A licensed exterminator arrives at your property — on time, within a 1-hour window. We don't just look where you point. We inspect everything: kitchens, bathrooms, basements, walls, entry points. We find what's hiding and where it's coming from.",
              },
              {
                step: "3",
                title: "You See the Price Before We Start",
                desc: "No surprises. No \"oh by the way\" fees. We show you exactly what we'll do, what products we'll use, how many visits are included, and the total cost. You say yes, we get to work. You say no, you owe us nothing. Fair is fair.",
              },
              {
                step: "4",
                title: "Pests Gone. Guaranteed.",
                desc: "We execute the treatment plan with EPA-approved products and proven techniques. If pests come back during the guarantee period? So do we — at zero additional cost. We don't consider the job done until YOU say it's done.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-white/[0.06] bg-[#141414] p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-sm font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">What to Expect During Your Pest Control Visit</h3>
              <p>
                Your first pest control visit typically takes 45–90 minutes depending on the property size and pest type. The exterminator will inspect all areas of concern — kitchens, bathrooms, basements, attics, crawl spaces, exterior perimeters, and any areas where you&apos;ve noticed pest activity. For <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug inspections</Link>, we may use K-9 detection teams for faster, more accurate results.
              </p>
              <p>
                After the inspection, your exterminator will show you exactly what they found — including the pest species, evidence of activity, entry points, and conditions contributing to the problem. You&apos;ll receive a written treatment plan and cost estimate before any work begins. For many common pest control services like <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach treatment</Link>, <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">ant control</Link>, and <Link href="/spider-control" className="text-green-400 hover:text-green-300">spider treatment</Link>, we can often perform the initial treatment during the same visit.
              </p>
            </div>
            <div className="space-y-4 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">Residential vs. Commercial Pest Control</h3>
              <p>
                While the core principles of pest control are the same, <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control</Link> requires specialized knowledge of NYC Department of Health regulations, food safety standards, and business continuity planning. Our <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control program</Link> is designed specifically for NYC food service businesses, providing DOH-compliant treatments with full documentation for health inspections.
              </p>
              <p>
                For residential properties, we tailor our approach to the specific building type. Pre-war walk-ups, modern high-rises, brownstones, townhouses, and single-family homes each present different pest control challenges. Multi-unit buildings often require coordinated treatment across multiple apartments to prevent pests from simply migrating between units. We work with property managers, co-op boards, and landlords to develop building-wide pest control strategies that deliver lasting results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRE-FAQ CTA ── */}
      <CTAGroup variant="preFaq" />

      {/* ── PRO TIP 5 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Pro Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Never use bug bombs (foggers) in a NYC apartment.</strong> They don&apos;t reach into cracks where pests actually live, they contaminate your countertops and dishes, they can set off building fire alarms, and they scatter cockroaches into your neighbors&apos; units. Professional gel bait treatments are 10x more effective and don&apos;t require you to leave your home.
          </p>
        </div>
      </div>

      {/* ── COMMON PESTS DEEP DIVE ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">NYC&apos;s Most Wanted</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Common Pests in NYC: <span className="text-green-500">Identification &amp; Treatment</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Think you know what&apos;s lurking in your walls? Here&apos;s your crash course on NYC&apos;s most common pests &mdash; what they look like, why they love your building, and exactly how we eliminate them for good.
          </p>

          <div className="mt-10 space-y-8">
            {[
              {
                name: "Cockroaches",
                slug: "cockroach-extermination",
                content:
                  "German cockroaches are the most common species in NYC apartments and restaurants. They're light brown, about 1/2 inch long, and concentrate in kitchens and bathrooms near moisture and food sources. American cockroaches (\"water bugs\") are larger (1-2 inches), reddish-brown, and typically found in basements, boiler rooms, and sewer connections. Both species reproduce rapidly — a single German cockroach egg case contains 30-48 eggs with a 28-day incubation period. Professional cockroach extermination uses a combination of gel baits, dust formulations, IGR (insect growth regulator) treatments, and crack-and-crevice applications. Over-the-counter sprays and foggers are ineffective for established infestations and can actually spread cockroaches to new areas.",
              },
              {
                name: "Bed Bugs",
                slug: "bed-bug-treatment",
                content:
                  "Bed bugs are small (4-5mm), flat, reddish-brown insects that feed exclusively on blood. They hide in mattress seams, box springs, headboards, bed frames, and baseboards during the day and emerge at night to feed. Signs of bed bug activity include small bloodstains on sheets, dark fecal spots on mattresses, shed skins, and itchy bite marks in linear patterns. In NYC, bed bugs spread through shared laundry facilities, used furniture, luggage, and building infrastructure. Professional bed bug treatment includes whole-room heat treatment (raising room temperature above 120°F for several hours), targeted chemical applications using residual insecticides, and follow-up inspections to confirm elimination.",
              },
              {
                name: "Rats & Mice",
                slug: "rat-extermination",
                content:
                  "Norway rats are NYC's dominant rat species — large (up to 16 inches including tail), brown or gray, and found at ground level and below. They burrow near foundations, dumpsters, and subway infrastructure. House mice are much smaller (3-4 inches), gray, and commonly found inside buildings at all levels. Both species contaminate food, damage property through gnawing (including electrical wiring, creating fire hazards), and carry disease. Signs include droppings, gnaw marks, grease rub marks along walls, and scratching sounds. Effective rodent control combines snap trapping, tamper-resistant bait stations, and — critically — exclusion work to seal entry points. Mice can squeeze through gaps as small as 1/4 inch, so thorough rodent-proofing is essential.",
              },
              {
                name: "Termites",
                slug: "termite-treatment",
                content:
                  "Eastern subterranean termites are the primary termite species in the NYC metro area. They live in underground colonies and access buildings through soil-to-wood contact, foundation cracks, and mud tubes. Worker termites are small (1/8 inch), pale, and soft-bodied — often mistaken for \"white ants.\" Swarmers (winged reproductives) emerge in spring and are frequently the first visible sign of an infestation. Termite damage is often concealed inside walls and structural members, making professional inspection essential. Treatment options include liquid barrier treatments applied around the foundation perimeter, bait station monitoring systems, and direct wood treatment for active infestations.",
              },
              {
                name: "Ants",
                slug: "ant-extermination",
                content:
                  "Several ant species are common in NYC properties. Pavement ants nest in cracks in concrete and masonry, often entering buildings through foundation joints. Odorous house ants form large colonies inside wall voids and behind baseboards, attracted to sweet foods. Carpenter ants — the largest common species (1/4 to 1/2 inch) — excavate galleries in moist wood, potentially causing structural damage similar to termites. Professional ant control requires species identification to determine the most effective treatment strategy, as different ant species respond to different bait formulations and application methods.",
              },
            ].map((pest) => (
              <div key={pest.slug} className="rounded-xl border border-white/[0.06] bg-[#141414] p-6 lg:p-8">
                <h3 className="text-xl font-bold text-white">
                  <Link href={`/${pest.slug}`} className="hover:text-green-400">
                    {pest.name}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{pest.content}</p>
                <Link
                  href={`/${pest.slug}`}
                  className="mt-4 inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
                >
                  Learn more about {pest.name.toLowerCase()} pest control &rarr;
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/services"
              className="inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
            >
              View all {totalServices} pest control &amp; exterminator services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRO TIP 6 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Did You Know?</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Bed bugs can survive up to 18 months without feeding.</strong> That &quot;empty&quot; apartment you just moved into? It might not be as empty as you think. If you&apos;re buying used furniture in NYC (especially mattresses, couches, and bed frames), inspect every seam and crevice before bringing it inside. Better yet, text us a photo &mdash; we&apos;ll tell you if it&apos;s safe.
          </p>
        </div>
      </div>

      {/* ── SEASONAL PEST GUIDE ── */}
      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Stay One Step Ahead</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Seasonal <span className="text-green-500">Pest Control</span> Guide for NYC
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Every season in NYC brings a different pest crew. Here&apos;s what&apos;s coming for your apartment next &mdash; and how to shut them down before they move in.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                season: "Spring",
                pests: "Termite swarmers, ants, wasps, carpenter bees",
                desc: "Warming temperatures trigger termite swarming season (March–May) and activate ant colonies. Carpenter ants and carpenter bees become active in moist wood structures. Wasp queens begin building new nests. Spring is the critical window for termite inspections and preventive ant treatments.",
              },
              {
                season: "Summer",
                pests: "Cockroaches, mosquitoes, wasps, flies, bed bugs",
                desc: "Peak season for most pests. Cockroach populations explode in warm, humid conditions. Mosquito breeding accelerates near standing water. Wasp and hornet nests reach maximum size. Bed bug activity increases with summer travel. Restaurant pest pressure intensifies with outdoor dining.",
              },
              {
                season: "Fall",
                pests: "Rodents, stink bugs, spiders, wildlife",
                desc: "Cooling temperatures drive rodents and wildlife indoors. Mice and rats seek warmth and food sources inside buildings. Raccoons and squirrels look for winter shelter in attics. Stink bugs aggregate on sunny building exteriors before entering through gaps. Fall is the most important time for rodent exclusion work.",
              },
              {
                season: "Winter",
                pests: "Rodents, cockroaches, bed bugs, pantry pests",
                desc: "Interior pests dominate in winter. Rodent infestations peak as populations that entered in fall establish nests. German cockroaches thrive in heated buildings year-round. Bed bugs remain active regardless of season. Pantry pests infest stored holiday foods. Winter is ideal for comprehensive interior pest control maintenance.",
              },
            ].map((item) => (
              <div key={item.season} className="rounded-xl border border-white/[0.06] bg-[#141414] p-6">
                <h3 className="text-lg font-bold text-green-500">{item.season}</h3>
                <p className="mt-1 text-xs font-medium text-zinc-400">{item.pests}</p>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-zinc-300 leading-7">
            Year-round pest control maintenance plans are the most effective and cost-efficient approach for NYC properties. Monthly or bi-monthly visits from a licensed exterminator ensure continuous protection against seasonal pest pressures. Our maintenance plans include scheduled inspections, preventive treatments, and unlimited callbacks between visits. <Link href="/pricing" className="text-green-400 hover:text-green-300">View our pest control pricing</Link> for maintenance plan options, or <Link href="/quote-request" className="text-green-400 hover:text-green-300">request a free quote</Link> tailored to your property.
          </p>
        </div>
      </section>

      {/* ── PEST CONTROL REGULATIONS ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Know Your Rights</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            NYC Pest Control <span className="text-green-500">Regulations &amp; Compliance</span>
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Pest control in New York State is regulated by the Department of Environmental Conservation (DEC). All commercial pesticide applications must be performed by or under the direct supervision of a NYS DEC-certified Commercial Pesticide Applicator. The NYC Exterminator maintains full DEC certification for all technicians, ensuring every treatment we perform meets state regulatory requirements.
              </p>
              <p>
                <strong className="text-white">NYC Local Law 37</strong> (the Pesticide Use Notification Law) requires pest control operators to provide tenants with written notification at least 48 hours before pesticide applications in residential buildings. The notice must include the target pest, the pesticide product name and EPA registration number, and any precautions to be taken. Our team handles all notification requirements as part of our service, ensuring full compliance for property managers and landlords.
              </p>
              <p>
                <strong className="text-white">NYC&apos;s Bed Bug Disclosure Act</strong> (Local Law 69 of 2017) requires building owners to disclose bed bug infestation history for the previous year when providing a lease or rental agreement. Professional <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link> with documentation helps landlords and property managers maintain accurate records and demonstrate compliance with this requirement.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                <strong className="text-white">NYC Department of Health</strong> requirements for food service establishments include strict pest control standards. Restaurants, bakeries, cafeterias, and food processing facilities must maintain pest-free conditions and may be required to produce pest control service records during DOH inspections. Our <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control program</Link> provides all necessary documentation and is designed to meet DOH inspection requirements.
              </p>
              <p>
                <strong className="text-white">Integrated Pest Management (IPM)</strong> is required by law in all NYC public housing, schools, and city-owned buildings. IPM emphasizes pest prevention through sanitation, exclusion, and habitat modification, with chemical treatments used only as a targeted last resort. The NYC Exterminator follows IPM principles in all our work — residential and commercial — because it delivers the most effective, safest, and most sustainable pest control results.
              </p>
              <p>
                <strong className="text-white">Wildlife control</strong> in New York State requires a separate NYS DEC Nuisance Wildlife Control license. All our wildlife control specialists — handling <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoon removal</Link>, <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrel removal</Link>, <Link href="/bat-removal" className="text-green-400 hover:text-green-300">bat exclusion</Link>, and <Link href="/pigeon-control" className="text-green-400 hover:text-green-300">pigeon control</Link> — hold current Nuisance Wildlife Control licenses and follow all DEC guidelines for humane capture, exclusion, and relocation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BEFORE FAQ ── */}
      <CTAGroup
        variant="preFaq"
        title="Need a Licensed Exterminator? We're Ready."
        subtitle="Text us your pest problem. We'll respond with a plan and pricing — fast. No waiting on hold. No obligation."
      />

      {/* ── PRO TIP 7 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Pro Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Dripping faucet? Fix it ASAP.</strong> Cockroaches and many other pests can survive weeks without food but only days without water. That slow leak under your kitchen sink is basically a pest oasis. Fix leaks, dry up standing water under plant pots, and empty pet water bowls at night. You&apos;ll cut pest pressure in half overnight.
          </p>
        </div>
      </div>

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Got Questions? We&apos;ve Got Answers.</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Frequently Asked <span className="text-green-500">Pest Control</span> Questions
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Get answers to the most common questions about pest control and exterminator services in the NYC metro area. For more detailed information, visit our full <Link href="/faq" className="text-green-400 hover:text-green-300">FAQ page</Link>.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {homeFaqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.06] bg-[#141414] p-6"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-white/[0.06] bg-[#141414] p-6 lg:p-8">
            <h3 className="text-xl font-semibold text-white">Expert Pest Control Advice from Licensed NYC Exterminators</h3>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Our licensed exterminators answer hundreds of pest control questions every week from NYC property owners, tenants, building managers, and business operators. The questions above represent the most common concerns we hear. For detailed information about specific pest types, visit our individual service pages — <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link>, <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link>, <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link>, <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mouse control</Link>, <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite treatment</Link>, and <Link href="/services" className="text-green-400 hover:text-green-300">{totalServices}+ more services</Link> — where each page includes pest-specific FAQs, pricing information, treatment details, and neighborhood coverage maps. You can also visit our complete <Link href="/faq" className="text-green-400 hover:text-green-300">FAQ page</Link> for 40+ additional pest control questions and answers covering everything from preparation instructions to NYC pest control regulations and licensing requirements. Have a question that isn&apos;t answered here? <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">Text us</a> or <Link href="/contact" className="text-green-400 hover:text-green-300">contact us online</Link> — our team is happy to help.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
            >
              View all pest control FAQs &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── IPM & TREATMENT METHODS ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Science, Not Guesswork</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Our <span className="text-green-500">Pest Control Methods</span> &amp; Treatment Approaches
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            The NYC Exterminator uses a science-based Integrated Pest Management (IPM) approach combined with the latest pest control technologies and EPA-approved products. Our treatment methods are selected based on the specific pest species, the severity of infestation, the property type, and the safety requirements of your household or business.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Chemical Pest Control Treatments</h3>
              <p className="text-sm leading-7 text-zinc-400">
                Our licensed exterminators use EPA-registered pesticide products applied with precision techniques that maximize effectiveness while minimizing exposure. <strong className="text-zinc-300">Gel bait applications</strong> are our primary method for <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach control</Link> and <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">ant treatment</Link> — small dots of bait placed inside cracks, crevices, and wall voids where pests harbor. <strong className="text-zinc-300">Residual spray treatments</strong> create barriers that kill pests on contact and continue working for weeks. <strong className="text-zinc-300">Dust formulations</strong> are applied inside wall voids, electrical outlets, and other enclosed spaces where liquid products can&apos;t reach. <strong className="text-zinc-300">IGR (Insect Growth Regulator) treatments</strong> disrupt pest reproductive cycles, preventing immature insects from reaching adulthood and reproducing. All products are applied according to label directions by NYS DEC-certified pesticide applicators.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Heat Treatment &amp; Non-Chemical Methods</h3>
              <p className="text-sm leading-7 text-zinc-400">
                For <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug elimination</Link>, whole-room heat treatment is our preferred method. Specialized heaters raise the room temperature above 120°F and maintain it for several hours, killing bed bugs and eggs in all life stages throughout the entire space — including inside furniture, wall voids, and baseboards. No chemicals required. <strong className="text-zinc-300">Steam treatment</strong> provides targeted high-temperature treatment for mattresses, upholstered furniture, and other surfaces. <strong className="text-zinc-300">Exclusion work</strong> — sealing entry points with copper mesh, steel wool, caulk, and hardware cloth — is the cornerstone of our <Link href="/rodent-proofing" className="text-green-400 hover:text-green-300">rodent-proofing</Link> and <Link href="/general-pest-control" className="text-green-400 hover:text-green-300">general pest prevention</Link> programs. <strong className="text-zinc-300">Trapping</strong> — snap traps, glue monitors, and live traps — provides chemical-free pest removal for rodents and wildlife.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Integrated Pest Management (IPM)</h3>
              <p className="text-sm leading-7 text-zinc-400">
                IPM is not just a buzzword — it&apos;s the foundation of effective, sustainable pest control. Our IPM approach starts with thorough inspection and pest identification, followed by an analysis of the conditions allowing the pest to thrive. We address root causes — sanitation issues, moisture problems, structural entry points, food source access — before applying targeted treatments. This approach delivers longer-lasting results with fewer chemical applications. IPM is required by law in NYC public housing, schools, and city buildings, and we apply these same principles to all residential and commercial pest control work. By combining prevention, monitoring, and targeted treatment, our exterminators achieve pest elimination that lasts — not just temporary knockdown that requires repeated applications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRO TIP 8 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">NYC Insider</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Your neighbor&apos;s pest problem is YOUR pest problem.</strong> In multi-unit NYC buildings, pests travel through shared walls, plumbing, and electrical conduits. If your neighbor has roaches, they&apos;re already in your walls too. The most effective approach? Coordinate with your building management for a whole-building treatment. We handle this all the time &mdash; just tell us your super&apos;s number.
          </p>
        </div>
      </div>

      {/* ── PROPERTY TYPES ── */}
      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">We&apos;ve Seen It All</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Pest Control for Every <span className="text-green-500">NYC Property Type</span>
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                type: "Apartments & Co-ops",
                desc: "NYC apartment pest control requires coordinated treatment strategies that account for shared walls, plumbing, and HVAC systems. Cockroaches, bed bugs, and mice commonly migrate between units through these shared infrastructure pathways. We work with property managers and co-op boards to develop building-wide pest control programs that treat the root cause — not just individual apartments. Our exterminators are experienced with pre-war walk-ups, post-war towers, luxury high-rises, NYCHA housing, and every building type in between.",
              },
              {
                type: "Brownstones & Townhouses",
                desc: "Brooklyn and Manhattan brownstones present unique pest control challenges. Original stone and brick construction with settlement cracks provides entry points for rodents and insects. Basement-level kitchens are particularly vulnerable to cockroach and mouse infestations. Wood structural elements can attract termites and carpenter ants. Our exterminators understand brownstone construction and develop treatment plans that protect these historic properties while eliminating pest problems at the source.",
              },
              {
                type: "Single-Family Homes",
                desc: "Homeowners across the outer boroughs, Long Island, Westchester, and New Jersey deal with a broader range of pest issues including termites, wildlife intrusions, lawn-damaging pests, and seasonal invaders. Our residential pest control programs for single-family homes include comprehensive interior and exterior treatments, perimeter barrier applications, attic and crawl space inspections, and foundation-level termite monitoring. We also provide rodent exclusion and wildlife-proofing services.",
              },
              {
                type: "Restaurants & Food Service",
                desc: "NYC restaurants operate under strict Department of Health pest control standards. A single pest sighting during a DOH inspection can result in violations, fines, and public scoring penalties. Our restaurant pest control program provides NYC DOH-compliant treatments on a regular schedule, complete documentation for inspections, and 24/7 emergency response. We service restaurants, bakeries, catering kitchens, food trucks, grocery stores, and every type of food service operation.",
              },
              {
                type: "Offices & Retail",
                desc: "Commercial office buildings and retail spaces require discreet, minimally disruptive pest control treatments that don't interfere with business operations. Common office pests include cockroaches, mice, and occasional invaders like stink bugs and spiders. Retail spaces — particularly those with food products or storage areas — face additional pest pressures. Our commercial pest control team works after-hours and on weekends to minimize disruption to your business.",
              },
              {
                type: "Warehouses & Industrial",
                desc: "Large commercial and industrial spaces require specialized pest control strategies. Warehouse environments attract rodents, stored product pests, birds, and insects that enter through loading docks and shipping areas. Our industrial pest control programs include tamper-resistant bait stations, bird exclusion systems, dock door treatments, and comprehensive monitoring programs that meet USDA and FDA facility requirements where applicable.",
              },
            ].map((item) => (
              <div key={item.type} className="rounded-xl border border-white/[0.06] bg-[#141414] p-6">
                <h3 className="font-semibold text-white">{item.type}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAREERS CALLOUT ── */}
      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">We&apos;re Hiring</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                Join NYC&apos;s Top <span className="text-green-500">Pest Control</span> Team
              </h2>
              <p className="mt-4 text-zinc-300 leading-7">
                The NYC Exterminator is always looking for talented, motivated individuals to join our growing pest control team. Whether you&apos;re an experienced licensed exterminator or you&apos;re looking to start a career in pest control, we offer competitive pay, comprehensive training, full benefits, and clear career advancement pathways. We have exterminator job openings across all our service areas — from Manhattan to Long Island to Westchester.
              </p>
              <div className="mt-6">
                <Link
                  href="/careers"
                  className="inline-flex items-center rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
                >
                  View Open Positions &rarr;
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                "Competitive Pay $50k–$80k+",
                "Full Health Benefits",
                "Paid Training & Certification",
                "Company Vehicle Provided",
                "Career Advancement",
                "Year-Round Employment",
              ].map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-lg border border-white/[0.06] bg-[#141414] px-4 py-3 text-center text-sm text-zinc-300"
                >
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── DIY VS PROFESSIONAL ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Real Talk</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            DIY Pest Control vs. Hiring a <span className="text-green-500">Professional Exterminator</span>
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Many NYC residents first attempt DIY pest control before calling a professional exterminator — and for minor, isolated pest sightings, basic prevention measures can be helpful. Sealing food containers, fixing leaky faucets, taking out trash regularly, and filling small gaps with caulk are all good practices that reduce pest pressure. Over-the-counter bait stations can handle a small ant trail or a single mouse sighting.
              </p>
              <p>
                However, established infestations in NYC almost always require professional pest control treatment. Here&apos;s why: over-the-counter sprays and foggers are repellent products — they push pests away from the sprayed area but don&apos;t eliminate the colony or nest. In multi-unit NYC buildings, this often means cockroaches and ants simply relocate to neighboring apartments or deeper into wall voids. Foggers (&quot;bug bombs&quot;) are particularly problematic — they contaminate surfaces, trigger fire alarms in apartment buildings, and distribute cockroaches to new areas of the home rather than eliminating them.
              </p>
              <p>
                Professional exterminators use non-repellent products — like gel baits and transfer-effect treatments — that pests carry back to their colony, creating a cascading kill effect that eliminates the entire population. Licensed pest control technicians also have access to professional-grade products not available in retail stores, and more importantly, they have the training and experience to identify pest species accurately, locate nesting sites and entry points, and apply treatments with precision to the exact areas where pests harbor.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">When to Call a Professional Exterminator</h3>
              <p>
                You should call a licensed exterminator immediately if you notice any of these signs in your NYC property:
              </p>
              <ul className="list-inside list-disc space-y-2 text-sm text-zinc-400">
                <li><strong className="text-zinc-300">Multiple cockroach sightings during daytime</strong> — cockroaches are nocturnal, so daytime activity indicates a large population that&apos;s been pushed out of hiding areas due to overcrowding</li>
                <li><strong className="text-zinc-300">Bed bug bites or bloodstains on bedding</strong> — bed bugs reproduce rapidly and DIY products are completely ineffective against established infestations</li>
                <li><strong className="text-zinc-300">Rodent droppings, gnaw marks, or scratching sounds</strong> — mice and rats cause property damage and carry disease; they reproduce quickly and small problems become large ones fast</li>
                <li><strong className="text-zinc-300">Mud tubes on foundation walls</strong> — a clear sign of subterranean <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite activity</Link> requiring immediate professional treatment</li>
                <li><strong className="text-zinc-300">Wasp or hornet nests near doorways or outdoor dining areas</strong> — stinging insect nests should only be removed by professionals to avoid serious injury</li>
                <li><strong className="text-zinc-300">Wildlife sounds in attic or walls</strong> — <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoons</Link>, <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrels</Link>, and <Link href="/bat-removal" className="text-green-400 hover:text-green-300">bats</Link> require licensed wildlife control operators for legal, humane removal</li>
                <li><strong className="text-zinc-300">Recurring pest problems despite DIY efforts</strong> — if pests keep coming back, there&apos;s an underlying issue (entry points, moisture, nesting sites) that only a professional inspection can identify</li>
                <li><strong className="text-zinc-300">Commercial food service establishment</strong> — <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control</Link> requires licensed professionals for NYC DOH compliance</li>
              </ul>
              <p>
                Don&apos;t wait for a small pest problem to become a major infestation. The sooner you call a professional exterminator, the faster and more affordable the treatment will be. <Link href="/quote-request" className="text-green-400 hover:text-green-300">Request a free quote</Link> or <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">text us now</a> to describe your pest situation — we&apos;ll respond fast with a plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRO TIP 9 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Pro Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Take photos before you clean up pest evidence.</strong> Found droppings, dead bugs, or gnaw marks? Snap a photo before you wipe it down. Those clues help our exterminators identify the exact pest species, estimate the severity, and plan the most effective treatment &mdash; all before we even arrive. Text us your photos at {PHONE} for a free assessment.
          </p>
        </div>
      </div>

      {/* ── CONTACT INFO ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Let&apos;s Do This</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Contact <span className="text-green-500">The NYC Exterminator</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Ready to get rid of pests for good? <Link href="/book-exterminator-today" className="text-green-400 hover:text-green-300">Book online and save $10</Link> — it&apos;s the fastest way to lock in service. Prefer to text? We respond within minutes during business hours. You can also <Link href="/quote-request" className="text-green-400 hover:text-green-300">request a free quote online</Link> any time, day or night.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5">
              <h3 className="text-sm font-semibold uppercase text-green-500">Book Online (Save $10)</h3>
              <Link href="/book-exterminator-today" className="mt-2 block text-lg font-bold text-green-400 hover:text-green-300">
                Self-Book &rarr;
              </Link>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-5">
              <h3 className="text-sm font-semibold uppercase text-zinc-500">Text Us (Fastest)</h3>
              <a href={`sms:${phonePlain}`} className="mt-2 block text-lg font-bold text-green-500 hover:text-green-400">
                {PHONE}
              </a>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-5">
              <h3 className="text-sm font-semibold uppercase text-zinc-500">Email</h3>
              <a href={`mailto:${EMAIL}`} className="mt-2 block text-lg font-bold text-white hover:text-green-400">
                {EMAIL}
              </a>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-5">
              <h3 className="text-sm font-semibold uppercase text-zinc-500">Office</h3>
              <p className="mt-2 text-sm text-zinc-300">
                {ADDRESS.street}<br />
                {ADDRESS.city}, {ADDRESS.state} {ADDRESS.zip}
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-5 text-zinc-300 leading-7">
            <h3 className="text-xl font-semibold text-white">Why Thousands of NYC Properties Trust The NYC Exterminator</h3>
            <p>
              Since our founding, The NYC Exterminator has built a reputation as one of the most reliable pest control companies in the New York City metropolitan area. Our success is built on a simple formula: hire the best licensed exterminators, invest in ongoing training, use the most effective products and techniques available, provide transparent pricing with no hidden fees, and stand behind every job with a satisfaction guarantee. We don&apos;t cut corners, we don&apos;t upsell unnecessary services, and we don&apos;t leave until the job is done right.
            </p>
            <p>
              Our pest control team handles everything from single-room <Link href="/ant-extermination" className="text-green-400 hover:text-green-300">ant treatments</Link> in studio apartments to building-wide <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination programs</Link> in 200-unit residential complexes. We provide <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control</Link> for some of NYC&apos;s busiest restaurants, retail stores, and office buildings. Our wildlife control specialists handle <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoon removal</Link> in suburban Westchester attics and <Link href="/pigeon-control" className="text-green-400 hover:text-green-300">pigeon exclusion</Link> on Manhattan high-rises. No pest problem is too small or too complex for our team.
            </p>
            <p>
              We&apos;re proud to serve the diverse communities across our {totalNeighborhoods}+ neighborhood service area. Whether you&apos;re in a <Link href="/areas/upper-east-side" className="text-green-400 hover:text-green-300">Upper East Side</Link> luxury condo, a <Link href="/areas/east-new-york" className="text-green-400 hover:text-green-300">East New York</Link> multi-family home, a <Link href="/areas/hoboken" className="text-green-400 hover:text-green-300">Hoboken</Link> brownstone, or a <Link href="/areas/garden-city" className="text-green-400 hover:text-green-300">Garden City</Link> colonial — we deliver the same professional pest control service, the same licensed expertise, and the same guaranteed results. Read our <Link href="/reviews" className="text-green-400 hover:text-green-300">customer reviews</Link> to see what our clients say about working with The NYC Exterminator.
            </p>
          </div>

          <div className="mt-8 text-zinc-300 leading-7">
            <h3 className="text-xl font-semibold text-white">Hours of Operation</h3>
            <div className="mt-3 grid gap-1 text-sm sm:grid-cols-3">
              <p><strong className="text-white">Monday–Friday:</strong> 7:00 AM – 8:00 PM</p>
              <p><strong className="text-white">Saturday:</strong> 8:00 AM – 6:00 PM</p>
              <p><strong className="text-white">Sunday:</strong> 9:00 AM – 5:00 PM</p>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Emergency pest control service is available outside regular hours for urgent situations. Whether it&apos;s an active <Link href="/wasp-removal" className="text-green-400 hover:text-green-300">wasp nest</Link> near your building entrance, a significant <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat infestation</Link> in your restaurant kitchen, a <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug discovery</Link> the night before guests arrive, or any other pest emergency that requires immediate professional attention — our licensed exterminators are ready to respond. Text <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">{PHONE}</a> any time, or <Link href="/book-exterminator-today" className="text-green-400 hover:text-green-300">book online and save $10</Link>. You can also submit an <Link href="/quote-request" className="text-green-400 hover:text-green-300">online quote request</Link> and we&apos;ll respond first thing the next business morning.
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
