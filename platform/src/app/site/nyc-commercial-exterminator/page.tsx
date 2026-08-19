import Link from "next/link";
import type { Metadata } from "next";
import {
  getServicesByCategory,
  getNeighborhoodsByRegion,
  getAllServices,
  getAllNeighborhoods,
  getRegions,
} from "@/app/site/nyc-commercial-exterminator/_lib/data";
import {
  PHONE,
  SITE_URL,
  SITE_NAME,
  EMAIL,
  ADDRESS,
  getFAQPageSchema,
} from "@/app/site/nyc-commercial-exterminator/_lib/seo";
import CTAGroup from "@/app/site/nyc-commercial-exterminator/_components/CTAGroup";

export const metadata: Metadata = {
  title:
    "NYC Commercial Exterminator | Commercial Pest Control NYC | $249/hr Fully Inclusive",
  description:
    "NYC's commercial-only pest control & exterminator. $249/hr fully inclusive. Restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant treatment, documentation, all labor + products in the rate. No contracts. Text 212-202-8545.",
  keywords:
    "NYC commercial pest control, commercial exterminator NYC, commercial pest control NYC, restaurant pest control NYC, restaurant exterminator NYC, office pest control NYC, retail pest control NYC, warehouse pest control NYC, hotel pest control NYC, healthcare pest control NYC, property management pest control, commercial bed bug treatment NYC, commercial cockroach extermination NYC, commercial rodent control NYC, DOH compliant pest control NYC",
  openGraph: {
    title: "NYC Commercial Exterminator | Commercial Pest Control NYC | $249/hr Fully Inclusive",
    description:
      "NYC's commercial-only pest control & exterminator. $249/hr fully inclusive. Restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant. 30+ services across 280+ NYC neighborhoods. Text 212-202-8545.",
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
      q: "How much does commercial pest control cost in NYC?",
      a: "We charge $249/hour flat — fully inclusive — for every commercial pest service. That's labor, EPA-registered products, treatment methods, entry-point sealing, written plan, documentation for NYC DOH inspections, and free re-treatment if pests return, all baked into the one hourly rate. No per-room fees, no chemical surcharges, no trip fees, no weekend rates. Most restaurant cockroach jobs take 60-90 minutes ($249-$374 all-in). Office or retail rodent exclusion typically runs 90-120 minutes. You pay only on completion — no deposit, no card on file, no contract. NYC's only fully inclusive hourly commercial exterminator, built so you pay for the time your problem actually takes instead of a bloated flat-rate quote.",
    },
    {
      q: "Do you offer same-day commercial pest control and exterminator service?",
      a: "Yes. We offer same-day and emergency commercial pest control across NYC, NJ, Long Island, and Westchester. Wasp nest at a storefront, rat sighting in a restaurant kitchen pre-service, bed bug call from a hotel housekeeping team, fly outbreak at a food prep facility — our licensed exterminators dispatch fast. Call or text us and we'll get a technician on site as quickly as possible.",
    },
    {
      q: "Are your commercial pest control treatments safe for staff, customers, and pets?",
      a: "Yes. All of our commercial pest control treatments use EPA-approved products with targeted application methods designed to minimize exposure to staff, customers, and any animals on premises. Gel baits and dusts are placed inside cracks, crevices, and wall voids — away from contact areas. Our exterminators provide specific safety instructions tailored to your operation (food service, healthcare, retail, hospitality) before and after every treatment, and can schedule treatments after-hours to avoid disrupting operations.",
    },
    {
      q: "What kinds of commercial properties do you service?",
      a: "We service every commercial property type: restaurants, bars, cafes, food service, ghost kitchens, commissaries, offices, coworking spaces, corporate HQs, retail stores, supermarkets, pharmacies, dispensaries, warehouses, industrial facilities, hotels, motels, short-term rentals, healthcare facilities, medical offices, dental offices, gyms, salons, schools, daycare, and multi-tenant buildings managed by property management. Our licensed commercial exterminators serve all five NYC boroughs, New Jersey, Long Island, and Westchester County.",
    },
    {
      q: "Can you provide documentation for NYC DOH inspections and corporate compliance?",
      a: "Yes. Every commercial treatment includes a detailed service report — pest pressure observed, products used (EPA-reg numbers), areas treated, conducive conditions noted, and remediation steps. We provide pest sighting logs, pesticide application records, and IPM documentation for NYC DOH, USDA, FDA, AIB, and corporate audits. Reports can be emailed same-day and we maintain digital records for your account so you can pull historical documentation any time.",
    },
    {
      q: "Are your exterminators licensed and insured?",
      a: "Every pest control technician holds a NYS DEC Commercial Pesticide Applicator license and is fully insured. Our wildlife control operators carry additional NYS DEC Nuisance Wildlife Control licenses. We maintain full general liability coverage on every job and are happy to provide proof of insurance and W-9 documentation for your AP department on request.",
    },
    {
      q: "What areas does NYC Commercial Exterminator serve?",
      a: `Commercial pest control & exterminator service across ${totalNeighborhoods}+ neighborhoods spanning Manhattan, Brooklyn, Queens, the Bronx, Staten Island, New Jersey, Long Island, and Westchester. If your business is anywhere in the NYC metro area, we've got you covered. Check our service areas page for your specific neighborhood.`,
    },
    {
      q: "How quickly can a commercial exterminator get to my business?",
      a: "For standard commercial accounts, we typically schedule within 24–48 hours and can usually accommodate before-open or after-close windows. For emergency situations — active wasp nests at a storefront entrance, rodent activity discovered before a health inspection, bed bug calls from hospitality — we offer same-day service, often within a few hours. We prioritize businesses where pest activity could halt operations, fail an inspection, or impact customers.",
    },
    {
      q: "Do you offer ongoing commercial pest control maintenance and IPM programs?",
      a: "Yes. We offer monthly, bi-weekly, weekly, and quarterly commercial pest control programs at the same $249/hr fully inclusive rate. Programs include scheduled inspections, preventive treatments, rodent monitoring stations, fly light maintenance, and unlimited callbacks between visits if anything pops up. NYC DOH compliance documentation included for every visit. Programs are customized by vertical (restaurants, food service, retail, offices, warehouses, hotels, healthcare).",
    },
    {
      q: "Do you guarantee your commercial pest control work?",
      a: "Yes. Every commercial treatment is guaranteed. If pests return between scheduled visits or within our guarantee period, our exterminators return and re-treat at no additional charge. Guarantee periods vary by service — general commercial pest control carries a 30-day guarantee, bed bug heat treatment includes a 90-day guarantee. Specifics are explained before any work begins and confirmed in your written service plan.",
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
                NYC&apos;s Commercial-Only Pest Control &amp; Exterminator
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                NYC&apos;s Most Trusted{" "}
                <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent">
                  Commercial Pest Control &amp; Exterminator
                </span>
              </h1>

              {/* Price banner — visually unmissable */}
              <div className="mt-6 rounded-2xl border-2 border-green-500/60 bg-gradient-to-br from-green-950/60 to-emerald-950/40 p-5 shadow-xl shadow-green-900/30">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-5xl font-extrabold leading-none text-green-400 sm:text-6xl">
                    $249<span className="text-2xl font-bold text-green-300 sm:text-3xl">/hr</span>
                  </span>
                  <span className="text-base font-bold uppercase tracking-wider text-white sm:text-lg">
                    flat &middot; fully inclusive
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-100 sm:text-base">
                  Pay only when the job is done. No contracts. No deposits. No catches.
                </p>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  Labor, products, treatment, follow-up &mdash; all in the rate.
                </p>
                <p className="mt-3 border-t border-green-500/30 pt-3 text-sm font-bold uppercase tracking-wider text-green-300">
                  The only NYC pest control service that bills fully inclusive hourly.
                </p>
              </div>

              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Commercial pest control and extermination for{" "}
                <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurants</Link>,{" "}
                offices, retail, warehouses, hotels, healthcare, and property
                management across{" "}
                <Link href="/areas" className="text-green-400 hover:text-green-300">{totalNeighborhoods}+ NYC neighborhoods</Link>.{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">Cockroaches</Link>,{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs</Link>,{" "}
                <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rats</Link>,{" "}
                <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice</Link>,{" "}
                flies, ants, and{" "}
                <Link href="/services" className="text-green-400 hover:text-green-300">{totalServices}+ pest services</Link>.
                NYS DEC licensed exterminators. NYC DOH-compliant documentation
                included. Free on-site inspection off the clock &mdash; the
                hourly meter only starts when you approve the treatment plan.
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
                <div className="mt-2 text-sm font-semibold text-zinc-200">Commercial Jobs Cleared</div>
                <div className="mt-1 text-xs text-zinc-500">NYC restaurants, offices &amp; retail. Yours is next.</div>
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
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Operator Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">One cockroach sighting on the floor during service hours = a documented violation waiting to happen.</strong> NYC DOH inspectors don&apos;t need to find a colony &mdash; live activity in a food prep area is enough. We dispatch same-day for restaurants and food service before the next inspection. Text us a photo and we&apos;ll tell you exactly what you&apos;re dealing with &mdash; free.
          </p>
        </div>
      </div>

      {/* ── ABOUT / INTRO SECTION ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            New York City&apos;s Premier <span className="text-green-500">Commercial Pest Control</span> &amp; Exterminator
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                NYC Commercial Exterminator is a commercial-only pest control company serving the entire New York City metropolitan area. From our headquarters at {ADDRESS.street} in Midtown Manhattan, our licensed exterminators provide commercial pest control to <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurants</Link>, bars, cafes, food service operators, offices, coworking spaces, retail stores, supermarkets, warehouses, industrial facilities, hotels, healthcare facilities, gyms, schools, and property management portfolios across all five NYC boroughs, northern New Jersey, Long Island, and Westchester County. We eliminate every commercial pest that threatens operations &mdash; <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroaches</Link>, <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs</Link>, <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rats</Link>, <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mice</Link>, flies, ants, stored product pests, and more.
              </p>
              <p>
                What sets us apart is a commercial-first approach built around the realities NYC operators actually face: NYC DOH inspections, corporate audits, after-hours service windows, IPM documentation, and pest pressure that never lets up because the city never stops. Every job begins with a comprehensive inspection by a NYS DEC-licensed commercial exterminator who identifies the pest, the source, and the conducive conditions allowing it to persist. We then build a customized treatment plan using EPA-approved products and commercial-grade techniques &mdash; gel bait protocols for <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">restaurant cockroach control</Link>, whole-room heat treatment for <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">hotel bed bug elimination</Link>, exclusion work for <Link href="/rodent-proofing" className="text-green-400 hover:text-green-300">warehouse and retail rodent-proofing</Link>.
              </p>
              <p>
                NYC commercial pest pressure is in a category of its own. Dense restaurant clusters drive constant cockroach migration. The aging building stock provides endless entry points for rodents. Shared loading docks, food deliveries, and mixed-use buildings push pest activity from one tenant to the next. Our commercial pest control approach addresses root cause &mdash; not symptoms &mdash; with treatments designed for active operating environments. Whether you need <Link href="/emergency-pest-control" className="text-green-400 hover:text-green-300">emergency commercial pest control</Link> before a health inspection or a <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">recurring commercial IPM program</Link> with monthly documentation, NYC Commercial Exterminator delivers.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Our commercial pest control catalog spans {totalServices} distinct service types across {Object.keys(servicesByCategory).length} categories. Every service page provides detailed information about the pest, commercial treatment protocols, <Link href="/pricing" className="text-green-400 hover:text-green-300">transparent $249/hr pricing</Link>, and coverage for your specific NYC neighborhood. With {totalNeighborhoods}+ neighborhoods served across {regions.length} regions, we&apos;ve built the most comprehensive commercial pest control coverage network in the NYC metro area.
              </p>
              <p>
                Every exterminator on our team holds active NYS DEC Commercial Pesticide Applicator certification and undergoes ongoing training in commercial IPM, food-safety protocols, and the latest application techniques. We carry full general liability insurance on every job and provide W-9, COI, and pest log documentation for property managers, restaurant groups, hotel chains, corporate facilities teams, and AP departments &mdash; standard, not on request.
              </p>
              <p>
                Thousands of NYC restaurants, offices, retail operators, hotels, and property managers trust NYC Commercial Exterminator. Check our <Link href="/reviews" className="text-green-400 hover:text-green-300">customer reviews</Link> to see why we maintain a 4.9-star rating across thousands of completed commercial jobs. Learn more <Link href="/about" className="text-green-400 hover:text-green-300">about our company</Link> and the Consortium NYC team behind every treatment we perform. Ready to get a commercial pest control quote? <Link href="/schedule-service" className="text-green-400 hover:text-green-300">Request a free quote</Link>, <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">text us</a>, or call <a href={`tel:${phonePlain}`} className="text-green-400 hover:text-green-300">{PHONE}</a>. One flat $249/hour rate. Fully inclusive. No contracts. No deposits. NYC DOH-compliant documentation included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">We&apos;re Not Your Average Commercial Exterminators</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Why NYC Businesses Choose Our <span className="text-green-500">Commercial Pest Control</span> Team
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Choosing the right commercial pest control company in New York City is critical. The wrong exterminator costs you a failed health inspection, an angry tenant, a hospitality review, or worse. Here&apos;s what makes NYC Commercial Exterminator different from every other commercial pest provider in the metro area.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Licensed & Insured Commercial Exterminators",
                desc: "Every technician holds NYS DEC Commercial Pesticide Applicator certification. Full general liability coverage on every commercial job. W-9 and COI documentation provided standard for AP departments, property managers, and corporate facilities teams.",
              },
              {
                title: "Same-Day Commercial Service",
                desc: "Pre-inspection pest activity, rodent sightings during dinner service, bed bug calls from hospitality, fly outbreaks at food prep — we dispatch same-day across all five NYC boroughs, NJ, Long Island, and Westchester. After-hours and before-open windows available.",
              },
              {
                title: "Free Commercial Inspections",
                desc: "Every commercial engagement starts with a thorough walkthrough by a licensed exterminator. We identify pest species, locate the source, assess severity, and build a treatment plan — at no cost. The hourly meter only starts when you approve the plan.",
              },
              {
                title: "DOH-Compliant Documentation",
                desc: "Every commercial visit includes a detailed service report: pest pressure, products used (EPA-reg numbers), areas treated, conducive conditions noted. Documentation for NYC DOH, USDA, FDA, AIB, and corporate audits — emailed same-day, archived to your account.",
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
              <h3 className="text-xl font-semibold text-white">Comprehensive NYC Commercial Pest Control Coverage</h3>
              <p>
                Most commercial pest control companies in NYC either chase national chain accounts and ignore independent operators, or serve a single borough and a handful of pest types. NYC Commercial Exterminator provides {totalServices} commercial pest control services across {totalNeighborhoods}+ neighborhoods in {regions.length} regions. Whether you&apos;re running a <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">restaurant with a cockroach issue in Williamsburg</Link>, a <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">Midtown food service operation with a rodent problem</Link>, a <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">hotel with bed bug complaints on the Upper West Side</Link>, or a <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">Westchester warehouse needing recurring IPM</Link>, we have the expertise, licensing, and equipment.
              </p>
              <p>
                Our coverage extends well beyond the five boroughs. We serve commercial properties across <Link href="/areas#new-jersey" className="text-green-400 hover:text-green-300">northern New Jersey</Link> including Hoboken, Jersey City, Newark, and Montclair. Our <Link href="/areas#long-island" className="text-green-400 hover:text-green-300">Long Island commercial pest control team</Link> covers Nassau and Suffolk County operators from Garden City to the Hamptons. And our <Link href="/areas#westchester" className="text-green-400 hover:text-green-300">Westchester commercial exterminators</Link> serve restaurants, hotels, offices, and property management portfolios in White Plains, Yonkers, New Rochelle, Scarsdale, and surrounding communities.
              </p>
            </div>
            <div className="space-y-4 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">Transparent Pricing &amp; No Hidden Fees</h3>
              <p>
                Commercial pest control pricing should be straightforward and transparent. Before any exterminator begins treatment on your property, you receive a detailed written estimate explaining exactly what we&apos;ll do, which products we&apos;ll use, how many treatments are included, and the total cost. No hidden fees. No surprise charges. No mystery line items at month-end. No pressure to upsell services you don&apos;t need.
              </p>
              <p>
                Our <Link href="/pricing" className="text-green-400 hover:text-green-300">pricing page</Link> explains the whole model: $249/hour flat for every commercial service we offer &mdash; from <Link href="/general-pest-control" className="text-green-400 hover:text-green-300">general commercial pest control</Link> to <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">commercial bed bug heat treatment</Link> and recurring IPM programs. The pest doesn&apos;t change the rate &mdash; only how long the job takes. Same hourly rate for one-off emergency calls and ongoing <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control</Link> accounts. No contracts. No deposits. Pay only on completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRO TIP 2 ── */}
      <div className="border-y border-red-500/10 bg-[#1a0a0a] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">NYC Operator Insider</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">NYC food service operators are legally required to maintain a pest log on premises.</strong> NYC Health Code &sect;81.51 requires every food service establishment to keep current pest control records available for DOH inspectors. We provide digital + printed pest logs with every commercial visit &mdash; pest pressure noted, products used (EPA-reg numbers), areas treated, conducive conditions, and remediation steps. Stays in your binder. Available in your account. Inspector-ready.
          </p>
        </div>
      </div>

      {/* ── ALL SERVICES BY CATEGORY ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">{totalServices} Commercial Services. Zero Pests.</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Our Complete <span className="text-green-500">Commercial Pest Control</span> &amp; Exterminator Services
          </h2>
          <p className="mt-4 max-w-4xl text-zinc-300 leading-7">
            NYC Commercial Exterminator offers {totalServices} commercial pest control and extermination services across {Object.keys(servicesByCategory).length} categories. Every commercial service includes a free walkthrough, upfront $249/hr pricing, EPA-approved treatments, NYC DOH-compliant documentation, and a satisfaction guarantee. Click any service to see detailed information, commercial protocols, and coverage across all {totalNeighborhoods} NYC neighborhoods we serve.
          </p>

          <div className="mt-12 space-y-14">
            {featuredCategories.map(([category, services]) => (
              <div key={category}>
                <h3 className="text-2xl font-bold text-white">{category}</h3>
                <p className="mt-2 text-zinc-400">
                  {category === "Common Pests" &&
                    "The most frequently encountered commercial pest problems across NYC restaurants, offices, retail, hotels, and warehouses. These pests thrive in the urban operating environment and require commercial-grade treatment for complete elimination."}
                  {category === "Rodents" &&
                    "NYC's rodent population is one of the largest in the world — and commercial properties bear the brunt. Commercial rodent control combines trapping, baiting, exterior monitoring stations, and exclusion work to eliminate infestations and protect operations."}
                  {category === "Wood-Destroying Insects" &&
                    "Termites and carpenter ants cause billions in commercial property damage annually. Early detection and professional treatment protect your building's structural integrity and your commercial lease obligations."}
                  {category === "Stinging Insects" &&
                    "Wasps, bees, hornets, and yellow jackets pose serious safety risks at storefront entrances, rooftops, loading docks, and outdoor dining areas. Professional commercial removal is essential for staff and customer safety."}
                  {category === "Wildlife Control" &&
                    "NYC's urban wildlife — raccoons, squirrels, pigeons, and bats — damage commercial roofs, soffits, signage, HVAC, and storefronts. Licensed wildlife control operators handle humane removal and commercial-grade exclusion."}
                  {category === "Specialty Pests" &&
                    "Less common but equally disruptive commercial pests including moths in retail, silverfish in records storage, drain flies in restaurants, and stored product pests in warehouses. Targeted commercial treatment delivers faster results."}
                  {category === "Commercial Services" &&
                    "Our specialty: commercial pest control programs designed for restaurants, food service, retail, offices, hotels, warehouses, healthcare, and property management. NYC DOH-compliant treatments with documentation for every visit."}
                  {category === "General Services" &&
                    "Broad commercial pest control programs for operators dealing with multiple pest types or needing comprehensive monthly coverage. Includes emergency commercial pest control for pre-inspection situations."}
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
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Operator Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Opening a new restaurant, retail location, or office?</strong> Request a pre-opening pest inspection BEFORE you move equipment, inventory, or furniture in. It&apos;s 10x easier (and cheaper) to treat an empty build-out. We offer pre-opening commercial inspections that take about 30 minutes &mdash; completely free. Catch landlord-side rodent issues, drain fly conditions, or carryover infestations from the previous tenant before they&apos;re your problem.
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
                New York City has one of the most challenging pest environments in the United States. The combination of dense population, aging building infrastructure, an enormous food service industry, and a temperate coastal climate creates ideal conditions for virtually every urban pest species. According to the NYC Department of Health, cockroach and rodent complaints tied to restaurants, retail, and commercial buildings have increased significantly in recent years across all five boroughs.
              </p>
              <p>
                <strong className="text-white">Cockroaches</strong> are the most common pest in NYC restaurants, food service, and commercial kitchens. German cockroaches — the smaller, light-brown species — infest kitchens and bathrooms, spreading through shared walls and plumbing in multi-unit buildings. A single female German cockroach can produce 30,000 offspring in a year. American cockroaches, the larger reddish-brown &quot;water bugs,&quot; invade basements, laundry rooms, and utility areas. Professional <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link> using gel baits, IGR treatments, and crack-and-crevice applications is the only reliable way to eliminate established cockroach populations in NYC buildings.
              </p>
              <p>
                <strong className="text-white">Bed bugs</strong> remain one of NYC&apos;s most persistent pest problems. These blood-feeding insects spread through luggage, used furniture, and shared laundry facilities. NYC&apos;s Bed Bug Disclosure Act (Local Law 69) requires building owners to disclose bed bug infestation history to prospective commercial tenants in mixed-use and multi-tenant buildings. Professional <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link> — particularly whole-room heat treatment that raises temperatures above 120°F — is the most effective elimination method. Chemical treatments using residual insecticides can supplement heat treatment for severe infestations.
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
              Each neighborhood we serve presents unique pest control challenges. <Link href="/areas/midtown" className="text-green-400 hover:text-green-300">Midtown Manhattan</Link> high-rises deal with cockroach and rodent issues driven by restaurant density. <Link href="/areas/williamsburg" className="text-green-400 hover:text-green-300">Williamsburg</Link> and <Link href="/areas/bushwick" className="text-green-400 hover:text-green-300">Bushwick</Link> brownstones with ground-floor commercial tenants face bed bug and mouse pressure common in older mixed-use buildings. <Link href="/areas/astoria" className="text-green-400 hover:text-green-300">Astoria</Link> and <Link href="/areas/jackson-heights" className="text-green-400 hover:text-green-300">Jackson Heights</Link> commercial corridors require specialized <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control</Link> to maintain NYC DOH compliance.
            </p>
            <p>
              Suburban communities across <Link href="/areas#long-island" className="text-green-400 hover:text-green-300">Long Island</Link> and <Link href="/areas#westchester" className="text-green-400 hover:text-green-300">Westchester</Link> face different pest pressures — <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite damage</Link> to wood-frame commercial buildings, <Link href="/tick-control" className="text-green-400 hover:text-green-300">tick control</Link> in wooded lots, <Link href="/mosquito-control" className="text-green-400 hover:text-green-300">mosquito control</Link> near standing water, and wildlife intrusions from <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoons</Link> and <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrels</Link>. Our exterminators understand these regional differences and tailor pest control treatments accordingly.
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
            How Our Commercial Pest Control <span className="text-green-500">Process Works</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            No phone trees. No waiting on hold. No &quot;we&apos;ll get back to you in 3-5 business days.&quot; Our process is designed for maximum effectiveness and minimum disruption to operations. Text us, we show up &mdash; on your schedule, including before-open and after-close windows &mdash; pests disappear, documentation lands in your inbox. It really is that simple.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Text Us (Seriously, That's It)",
                desc: "Send us a text. Snap a photo of the problem if you can. We respond in minutes — not hours, not days. We'll ask a few quick questions about your operation, the pest situation, and your scheduling constraints, and you're on the calendar.",
              },
              {
                step: "2",
                title: "We Show Up & Investigate",
                desc: "A licensed commercial exterminator arrives on time, within a 1-hour window — before open, after close, or whenever fits your operation. We inspect the whole site: kitchens, prep areas, back-of-house, dry storage, loading docks, exterior perimeter, HVAC. We find what's hiding and where it's coming from.",
              },
              {
                step: "3",
                title: "You See the Price Before We Start",
                desc: "No surprises. No \"oh by the way\" fees. We show you exactly what we'll do, what products we'll use, how many visits are included, and the total cost. You say yes, we get to work. You say no, you owe us nothing. Fair is fair.",
              },
              {
                step: "4",
                title: "Pests Gone. Docs Filed.",
                desc: "We execute the treatment plan with EPA-approved products and commercial-grade techniques. NYC DOH-compliant documentation hits your inbox same-day. If pests come back during the guarantee period? So do we — at zero additional cost.",
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
              <h3 className="text-xl font-semibold text-white">What to Expect During Your Commercial Pest Control Visit</h3>
              <p>
                Your first commercial pest control visit typically takes 60–120 minutes depending on the size of the operation and the pest pressure. The licensed commercial exterminator will inspect every area of concern &mdash; kitchens, prep areas, dish pits, dry storage, walk-ins, back-of-house, dining rooms, restrooms, mechanical rooms, basements, exterior perimeter, dumpster areas, and loading docks. For <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">hospitality bed bug inspections</Link>, we can deploy K-9 detection teams for faster, more accurate results across rooms.
              </p>
              <p>
                After the inspection, your exterminator will walk you through exactly what they found &mdash; pest species, evidence of activity, entry points, and the conducive conditions feeding the problem. You receive a written treatment plan, cost estimate, and IPM recommendations before any work begins. For many commercial services &mdash; <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">commercial cockroach treatment</Link>, <Link href="/ant-control" className="text-green-400 hover:text-green-300">ant control</Link>, fly remediation &mdash; we can perform the initial treatment during the same visit and have documentation in your inbox before we leave.
              </p>
            </div>
            <div className="space-y-4 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">Built for Commercial Operators &mdash; Not Apartments</h3>
              <p>
                Commercial pest control is fundamentally different from residential pest control. NYC Commercial Exterminator is built around the constraints commercial operators actually face: NYC DOH inspections, corporate IPM standards, third-party audits (AIB, USDA, FDA), food-safety protocols, after-hours service windows, multi-location accounts, vendor onboarding paperwork, and W-9 / COI documentation for AP departments. Our <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control program</Link> is designed specifically for NYC food service operators, with DOH-compliant treatments and inspection-ready documentation provided standard.
              </p>
              <p>
                For property management portfolios, we coordinate building-wide commercial pest control across mixed-use buildings, multi-tenant retail centers, and managed multi-family. Mixed-use buildings, modern high-rises, retail centers, and managed portfolios each present different commercial pest challenges. We work directly with property managers, building owners, and facilities teams to develop building-wide IPM programs that deliver lasting results.
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
          <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Operator Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Never use over-the-counter sprays or bug bombs in a commercial kitchen.</strong> They don&apos;t reach into cracks where pests actually live, they contaminate food-contact surfaces (an automatic DOH violation), they can trigger building fire alarms, and they scatter cockroaches into neighboring tenants. Professional commercial gel bait treatments are 10x more effective and food-service safe when applied by a licensed commercial exterminator.
          </p>
        </div>
      </div>

      {/* ── COMMON PESTS DEEP DIVE ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">NYC&apos;s Most Wanted</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Commercial Pests in NYC: <span className="text-green-500">Identification &amp; Treatment</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            The pest species threatening NYC commercial operations &mdash; what they look like, why they love your kitchen, back-of-house, dry storage, loading dock, or rooftop, and exactly how we eliminate them for good. Inspector-ready documentation included.
          </p>

          <div className="mt-10 space-y-8">
            {[
              {
                name: "Cockroaches",
                slug: "cockroach-extermination",
                content:
                  "German cockroaches are the most common species in NYC restaurants, commercial kitchens, and food service. They're light brown, about 1/2 inch long, and concentrate in kitchens and bathrooms near moisture and food sources. American cockroaches (\"water bugs\") are larger (1-2 inches), reddish-brown, and typically found in basements, boiler rooms, and sewer connections. Both species reproduce rapidly — a single German cockroach egg case contains 30-48 eggs with a 28-day incubation period. Professional cockroach extermination uses a combination of gel baits, dust formulations, IGR (insect growth regulator) treatments, and crack-and-crevice applications. Over-the-counter sprays and foggers are ineffective for established infestations and can actually spread cockroaches to new areas.",
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
            <strong className="text-white">Bed bugs can survive up to 18 months without feeding.</strong> The &quot;vacant&quot; hotel room, AirBnB unit, or office storage room you just turned over? Might not be as empty as you think. If your commercial space accepts used furniture, accepts customer luggage, or has high guest turnover, bed bug introductions are an operational risk. Text us a photo of suspect activity &mdash; we&apos;ll tell you what you&apos;re dealing with.
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
            Every season in NYC brings a different commercial pest crew. Here&apos;s what&apos;s coming for your operation next &mdash; and how to shut it down before it costs you a violation, a guest complaint, or a corporate audit finding.
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
            Year-round pest control maintenance plans are the most effective and cost-efficient approach for NYC properties. Monthly or bi-monthly visits from a licensed exterminator ensure continuous protection against seasonal pest pressures. Our maintenance plans include scheduled inspections, preventive treatments, and unlimited callbacks between visits. <Link href="/pricing" className="text-green-400 hover:text-green-300">View our pest control pricing</Link> for maintenance plan options, or <Link href="/schedule-service" className="text-green-400 hover:text-green-300">request a free quote</Link> tailored to your property.
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
                Pest control in New York State is regulated by the Department of Environmental Conservation (DEC). All commercial pesticide applications must be performed by or under the direct supervision of a NYS DEC-certified Commercial Pesticide Applicator. NYC Commercial Exterminator maintains full DEC certification for all technicians, ensuring every treatment we perform meets state regulatory requirements.
              </p>
              <p>
                <strong className="text-white">NYC Local Law 37</strong> (the Pesticide Use Notification Law) requires pest control operators to provide tenants with written notification at least 48 hours before pesticide applications in mixed-use and multi-tenant buildings. The notice must include the target pest, the pesticide product name and EPA registration number, and any precautions to be taken. Our team handles all notification requirements as part of our service, ensuring full compliance for property managers and landlords.
              </p>
              <p>
                <strong className="text-white">NYC&apos;s Bed Bug Disclosure Act</strong> (Local Law 69 of 2017) requires building owners to disclose bed bug infestation history for the previous year when providing a lease or rental agreement. Professional <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link> with documentation helps building owners and property managers maintain accurate records and demonstrate compliance with this requirement.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                <strong className="text-white">NYC Department of Health</strong> requirements for food service establishments include strict pest control standards. Restaurants, bakeries, cafeterias, and food processing facilities must maintain pest-free conditions and may be required to produce pest control service records during DOH inspections. Our <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control program</Link> provides all necessary documentation and is designed to meet DOH inspection requirements.
              </p>
              <p>
                <strong className="text-white">Integrated Pest Management (IPM)</strong> is required by law in all NYC public housing, schools, and city-owned buildings. IPM emphasizes pest prevention through sanitation, exclusion, and habitat modification, with chemical treatments used only as a targeted last resort. NYC Commercial Exterminator follows IPM principles in all our work — commercial — because it delivers the most effective, safest, and most sustainable pest control results.
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
            <strong className="text-white">Dripping faucet, leaking dish sink, or slow drain? Fix it ASAP.</strong> Cockroaches and many other commercial pests can survive weeks without food but only days without water. That slow leak under the prep sink is basically a pest oasis. Fix leaks, repair pooling drains, and address condensation under walk-in compressors. Cut pest pressure in half overnight &mdash; and remove one of the conducive conditions a DOH inspector will flag.
          </p>
        </div>
      </div>

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Got Questions? We&apos;ve Got Answers.</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Frequently Asked <span className="text-green-500">Commercial Pest Control</span> Questions
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Answers to the most common commercial pest control questions we get from NYC operators &mdash; restaurants, offices, retail, warehouses, hotels, healthcare, and property managers. For more detailed information, visit our full <Link href="/faq" className="text-green-400 hover:text-green-300">FAQ page</Link>.
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
            NYC Commercial Exterminator uses a science-based Integrated Pest Management (IPM) approach combined with the latest pest control technologies and EPA-approved products. Our treatment methods are selected based on the specific pest species, the severity of infestation, the property type, and the safety requirements of your operation.
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
                IPM is not just a buzzword — it&apos;s the foundation of effective, sustainable pest control. Our IPM approach starts with thorough inspection and pest identification, followed by an analysis of the conditions allowing the pest to thrive. We address root causes — sanitation issues, moisture problems, structural entry points, food source access — before applying targeted treatments. This approach delivers longer-lasting results with fewer chemical applications. IPM is required by law in NYC public housing, schools, and city buildings, and we apply these same principles to all commercial pest control work. By combining prevention, monitoring, and targeted treatment, our exterminators achieve pest elimination that lasts — not just temporary knockdown that requires repeated applications.
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
            <strong className="text-white">Your neighboring tenant&apos;s pest problem IS your pest problem.</strong> In mixed-use NYC buildings and multi-tenant retail, pests travel through shared walls, plumbing chases, dropped ceilings, and HVAC. If the restaurant next door has roaches, they&apos;re already in your walls too. The fix: coordinate with building management for whole-building commercial pest control. We handle these conversations &mdash; just connect us with the property manager or building super.
          </p>
        </div>
      </div>

      {/* ── PROPERTY TYPES ── */}
      <section className="bg-[#111111] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">We&apos;ve Seen It All</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Commercial Pest Control for Every <span className="text-green-500">NYC Operator Type</span>
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                type: "Restaurants & Food Service",
                desc: "NYC restaurants operate under strict Department of Health pest control standards. A single pest sighting during a DOH inspection can result in violations, fines, and grade-letter penalties. Our restaurant pest control program provides NYC DOH-compliant treatments on a regular schedule, complete documentation for inspections, and 24/7 emergency response. We service restaurants, bars, cafes, bakeries, ghost kitchens, commissaries, catering kitchens, food trucks, food halls, and every type of food service operation.",
              },
              {
                type: "Offices & Coworking",
                desc: "Class A office buildings, corporate HQs, and coworking spaces require discreet, minimally disruptive pest control that doesn't interfere with operations. Common office pests include cockroaches in pantry areas, mice in mechanical rooms, ants in break rooms, and occasional invaders like stink bugs. Our commercial pest control team works after-hours and on weekends so employees never see us, and tenant pesticide notifications go out before any application.",
              },
              {
                type: "Retail & Storefronts",
                desc: "Retail spaces &mdash; from boutique storefronts to supermarkets, pharmacies, dispensaries, and big-box anchors &mdash; face pest pressure from foot traffic, deliveries, packaging, and adjacent food service. Our commercial retail pest control includes perimeter monitoring, fly remediation, rodent exclusion at loading doors, and discreet treatment windows that protect your customer experience and brand standards.",
              },
              {
                type: "Hotels & Hospitality",
                desc: "Bed bug introductions, fly outbreaks, and rodent activity are existential threats to hospitality reviews. We provide proactive K-9 bed bug inspections, room-by-room heat treatment for confirmed activity, kitchen and back-of-house IPM, exterior rodent monitoring, and discreet after-hours scheduling that protects guest experience. Documentation provided for brand standards (Marriott, Hilton, Hyatt, IHG, Accor) and corporate audits.",
              },
              {
                type: "Warehouses & Industrial",
                desc: "Large commercial and industrial spaces require specialized pest control strategies. Warehouse environments attract rodents, stored product pests, birds, and insects that enter through loading docks and shipping areas. Our industrial commercial pest control programs include tamper-resistant exterior bait stations, bird exclusion systems, dock door treatments, fly light maintenance, and comprehensive monitoring programs that meet USDA, FDA, AIB, and SQF facility requirements.",
              },
              {
                type: "Healthcare, Property Mgmt & More",
                desc: "Medical offices, dental offices, urgent care, dialysis centers, gyms, salons, schools, daycare facilities, and property management portfolios all require commercial pest control tuned to their compliance environment. Property managers get coordinated multi-building IPM programs with consolidated monthly invoicing. Healthcare and education get sensitivity-conscious products and after-hours scheduling. One vendor, every commercial vertical.",
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
                NYC Commercial Exterminator is always looking for talented, motivated individuals to join our growing pest control team. Whether you&apos;re an experienced licensed exterminator or you&apos;re looking to start a career in pest control, we offer competitive pay, comprehensive training, full benefits, and clear career advancement pathways. We have exterminator job openings across all our service areas — from Manhattan to Long Island to Westchester.
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
            In-House Sanitation vs. Hiring a <span className="text-green-500">Commercial Exterminator</span>
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Many NYC commercial operators try in-house sanitation and over-the-counter products before bringing in a licensed commercial exterminator &mdash; and for very low-level pest pressure, basic sanitation is half the battle. Sealing food containers, fixing leaks, tightening trash discipline, and addressing back-of-house clutter all reduce pest pressure. But for any established commercial infestation, in-house treatment isn&apos;t just ineffective &mdash; it&apos;s an inspection risk.
              </p>
              <p>
                Over-the-counter sprays and foggers are repellent products: they push pests away from the sprayed area but don&apos;t eliminate the colony or nest. In a commercial kitchen or mixed-use building, this typically means cockroaches and ants relocate deeper into wall voids or to a neighboring tenant. Foggers (&quot;bug bombs&quot;) are an immediate DOH violation in food service: they contaminate food-contact surfaces and equipment, distribute pests to new areas of the operation, and can trigger fire suppression systems.
              </p>
              <p>
                Licensed commercial exterminators use non-repellent products &mdash; gel baits, transfer-effect formulations, IGRs &mdash; that pests carry back to the colony, creating a cascading kill effect. We also have access to commercial-grade products not available in retail, plus the training to identify species accurately, locate harborage and entry points, and apply treatments with precision. And we document every visit for your inspection-ready pest log.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <h3 className="text-xl font-semibold text-white">When to Call a Commercial Exterminator Immediately</h3>
              <p>
                Call a licensed commercial exterminator the same day if any of these show up at your operation:
              </p>
              <ul className="list-inside list-disc space-y-2 text-sm text-zinc-400">
                <li><strong className="text-zinc-300">Cockroach sightings during service hours</strong> &mdash; cockroaches are nocturnal, so daytime/operating-hour activity = a large population pushed out of harborage. Documented violation if a DOH inspector sees one.</li>
                <li><strong className="text-zinc-300">Bed bug reports from hotel guests, gym members, or office staff</strong> &mdash; bed bugs reproduce rapidly and consumer-grade products are ineffective. Commercial heat treatment is the standard.</li>
                <li><strong className="text-zinc-300">Rodent droppings, gnaw marks, or scratching sounds</strong> &mdash; particularly in food prep, dry storage, or behind equipment. Commercial rodent activity is an automatic DOH critical violation in food service.</li>
                <li><strong className="text-zinc-300">Mud tubes on foundation walls or exterior</strong> &mdash; subterranean <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite activity</Link>, especially threatening for older commercial buildings.</li>
                <li><strong className="text-zinc-300">Wasp or hornet nests at storefronts, dining patios, loading docks, or rooftops</strong> &mdash; staff and customer safety risk.</li>
                <li><strong className="text-zinc-300">Wildlife sounds in ceilings, soffits, HVAC, or rooftop equipment</strong> &mdash; <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">raccoons</Link>, <Link href="/squirrel-removal" className="text-green-400 hover:text-green-300">squirrels</Link>, and <Link href="/bat-removal" className="text-green-400 hover:text-green-300">bats</Link> require licensed commercial wildlife operators.</li>
                <li><strong className="text-zinc-300">Fly outbreak in food service or trash room</strong> &mdash; drain flies and house flies signal sanitation or drain issues that DOH will cite.</li>
                <li><strong className="text-zinc-300">Pre-inspection prep</strong> &mdash; book a commercial walkthrough 48-72 hours before a scheduled DOH, USDA, AIB, or corporate inspection.</li>
              </ul>
              <p>
                Don&apos;t wait for a small pest problem to become a major infestation. The sooner you call a professional exterminator, the faster and more affordable the treatment will be. <Link href="/schedule-service" className="text-green-400 hover:text-green-300">Request a free quote</Link> or <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">text us now</a> to describe your pest situation — we&apos;ll respond fast with a plan.
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
            Contact <span className="text-green-500">NYC Commercial Exterminator</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Ready to get rid of pests for good? Reach out to our pest control team today. We respond to texts and calls quickly — usually within minutes during business hours. You can also <Link href="/schedule-service" className="text-green-400 hover:text-green-300">request a free quote online</Link> any time, day or night.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-5">
              <h3 className="text-sm font-semibold uppercase text-zinc-500">Text Us (Fastest)</h3>
              <a href={`sms:${phonePlain}`} className="mt-2 block text-lg font-bold text-green-500 hover:text-green-400">
                {PHONE}
              </a>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#141414] p-5">
              <h3 className="text-sm font-semibold uppercase text-zinc-500">Call Us</h3>
              <a href={`tel:${phonePlain}`} className="mt-2 block text-lg font-bold text-white hover:text-green-400">
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
            <h3 className="text-xl font-semibold text-white">Why Thousands of NYC Operators Trust NYC Commercial Exterminator</h3>
            <p>
              NYC Commercial Exterminator has built a reputation as one of the most reliable commercial pest control providers in the New York City metropolitan area. Our success is built on a simple formula: hire the best licensed commercial exterminators, invest in ongoing IPM training, use the most effective EPA-approved products, provide transparent $249/hr fully-inclusive pricing with no hidden fees, ship documentation same-day, and stand behind every job with a satisfaction guarantee. We don&apos;t cut corners, we don&apos;t upsell unnecessary services, and we don&apos;t leave until the job is done right.
            </p>
            <p>
              Our commercial pest control team handles everything from single-location <Link href="/ant-control" className="text-green-400 hover:text-green-300">ant treatments</Link> at a Manhattan cafe to building-wide <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach IPM programs</Link> across 50-location restaurant groups. We provide <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control</Link> for some of NYC&apos;s busiest food operators, monthly programs for Class A office buildings, and commercial-grade <Link href="/raccoon-removal" className="text-green-400 hover:text-green-300">wildlife exclusion</Link> for hotel rooftops and <Link href="/pigeon-control" className="text-green-400 hover:text-green-300">pigeon control</Link> on Manhattan signage. No commercial pest problem is too small or too complex for our team.
            </p>
            <p>
              We&apos;re proud to serve commercial operators across our {totalNeighborhoods}+ neighborhood service area. Whether you&apos;re running an <Link href="/areas/upper-east-side" className="text-green-400 hover:text-green-300">Upper East Side</Link> restaurant, a <Link href="/areas/east-new-york" className="text-green-400 hover:text-green-300">East New York</Link> warehouse, a <Link href="/areas/hoboken" className="text-green-400 hover:text-green-300">Hoboken</Link> hospitality property, or a <Link href="/areas/garden-city" className="text-green-400 hover:text-green-300">Garden City</Link> retail center &mdash; same licensed commercial exterminators, same DOH-compliant documentation, same guaranteed results. Read our <Link href="/reviews" className="text-green-400 hover:text-green-300">customer reviews</Link> to see what NYC operators say about working with NYC Commercial Exterminator.
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
              Emergency pest control service is available outside regular hours for urgent situations. Whether it&apos;s an active <Link href="/wasp-removal" className="text-green-400 hover:text-green-300">wasp nest</Link> near your building entrance, a significant <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat infestation</Link> in your restaurant kitchen, a <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug discovery</Link> the night before guests arrive, or any other pest emergency that requires immediate professional attention — our licensed exterminators are on call and ready to respond. Call or text <a href={`tel:${phonePlain}`} className="text-green-400 hover:text-green-300">{PHONE}</a> any time. You can also submit an <Link href="/schedule-service" className="text-green-400 hover:text-green-300">online quote request</Link> and we&apos;ll respond first thing the next business morning.
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
