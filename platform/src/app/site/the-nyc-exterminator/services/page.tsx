import Link from "next/link";
import type { Metadata } from "next";
import {
  getServicesByCategory,
  getAllServices,
  getAllNeighborhoods,
  getCategories,
  categoryToSlug,
} from "@/app/site/the-nyc-exterminator/_lib/data";
import Breadcrumbs from "@/app/site/the-nyc-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";
import { SITE_URL, PHONE, getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";

export const metadata: Metadata = {
  title: "30+ NYC Pest Control & Exterminator Services | Browse All Treatments",
  description:
    "Browse all 30+ professional pest control and exterminator services from The NYC Exterminator. Cockroach extermination, bed bug treatment, rat control, mouse removal, termite treatment, wildlife removal, commercial pest control & more. Licensed & insured across NYC, NJ, LI & Westchester. Pricing from $49. Text 212-202-8545.",
  keywords:
    "NYC pest control services, exterminator services NYC, cockroach extermination, bed bug treatment, rat exterminator, mouse exterminator, termite treatment, wildlife removal, commercial pest control, residential pest control NYC",
  openGraph: {
    title: "30+ NYC Pest Control & Exterminator Services | Browse All Treatments",
    description:
      "30+ professional pest control services. Cockroaches, bed bugs, rats, mice, termites, wildlife & more. Pricing from $49. Text 212-202-8545.",
    url: `${SITE_URL}/services`,
  },
  alternates: {
    canonical: `${SITE_URL}/services`,
  },
};

/* Category descriptions used before each service grid block */
const categoryDescriptions: Record<string, string> = {
  "Crawling Insects":
    "Crawling insects are the most common pest control problem across New York City apartments, brownstones, and commercial buildings. From German cockroaches infesting restaurant kitchens to silverfish eating through stored documents in basement offices, crawling insects reproduce rapidly and require professional exterminator techniques to fully eliminate. Our licensed pest control technicians use targeted baiting systems, residual treatments, and integrated pest management protocols to eradicate crawling insect infestations at every life stage.",
  "Flying Insects":
    "Flying insects present unique pest control challenges in the NYC metro area, especially during warmer months when open windows and rooftop dining invite mosquitoes, flies, and wasps into living and working spaces. Professional exterminator services for flying insects go far beyond store-bought sprays. Our pest control team deploys UV light traps, larvicide treatments, and exclusion netting to protect your property from flying insect populations year-round.",
  "Rodents":
    "New York City is one of the most rodent-dense cities in the world, and professional rodent exterminator services are essential for both residential and commercial properties. Rats and mice carry diseases, contaminate food supplies, and cause structural damage by gnawing through wiring and insulation. Our rodent pest control programs include comprehensive exclusion work, tamper-resistant bait stations, and ongoing monitoring to keep your property permanently rodent-free.",
  "Bed Bugs":
    "Bed bug infestations are a citywide epidemic in New York, affecting luxury condos and public housing alike. These parasitic insects are nearly impossible to eliminate without professional pest control intervention. Our bed bug exterminator services include canine detection, heat treatments, and chemical protocols that target every hiding spot. We guarantee complete bed bug elimination with follow-up inspections included in every treatment plan.",
  "Wildlife":
    "Urban wildlife removal requires specialized pest control expertise that goes beyond standard exterminator services. Raccoons, squirrels, pigeons, and other wildlife commonly invade NYC attics, rooftops, and commercial spaces. Our wildlife pest control technicians are licensed by the New York State DEC and use humane trapping, exclusion barriers, and habitat modification to resolve wildlife conflicts permanently.",
  "Wood-Destroying":
    "Wood-destroying pests like termites and carpenter ants cause billions of dollars in property damage across the United States each year, and NYC buildings are not immune. Professional pest control inspections can catch wood-destroying insect activity before it compromises structural integrity. Our exterminator team uses Sentricon baiting systems, liquid termiticide barriers, and targeted foam treatments to protect your investment.",
  "Occasional Invaders":
    "Occasional invaders like stink bugs, centipedes, earwigs, and pill bugs may not pose the same health risks as cockroaches or rodents, but they signal moisture problems and entry points that need professional pest control attention. Our exterminator services for occasional invaders include thorough perimeter treatments, crack-and-crevice sealing, and moisture remediation recommendations to keep these nuisance pests outside where they belong.",
  "Stinging Insects":
    "Stinging insects like wasps, hornets, and yellow jackets are more than a nuisance in New York City — they are a genuine safety hazard, especially for people with allergies. Professional pest control removal of stinging insect nests is critical because DIY attempts frequently result in painful stings and incomplete removal. Our exterminator technicians safely remove active nests from eaves, attics, wall voids, and outdoor structures with same-day service available.",
};

export default function ServicesPage() {
  const servicesByCategory = getServicesByCategory();
  const totalServices = getAllServices().length;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const categories = getCategories();

  const breadcrumbSchema = getBreadcrumbSchema([{ name: "Services", url: "/services" }]);

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Services", url: "/services" }]} />

          <div className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              {totalServices} Services &middot; {totalNeighborhoods}+ Neighborhoods
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              All{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                Pest Control
              </span>{" "}
              Services
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              The NYC Exterminator offers {totalServices} professional pest control services covering every type
              of infestation you might encounter in the New York City metro area. From cockroach extermination
              in Manhattan apartments to rat control in Brooklyn restaurants, our licensed and insured
              pest control technicians deliver results you can count on. Every service includes a free
              on-site inspection, transparent upfront pricing starting at just $49, and our satisfaction
              guarantee. Text us at{" "}
              <a href={`sms:${PHONE}`} className="font-semibold text-green-400 hover:underline">{PHONE}</a>{" "}
              to schedule your pest control appointment today.
            </p>
            <p className="mt-4 text-base leading-7 text-zinc-400">
              Whether you are dealing with a single mouse sighting in your studio apartment, a full-blown
              bed bug infestation across an entire floor of a co-op building, or a commercial kitchen
              that failed its DOH inspection due to cockroach activity, our exterminator team has the
              training, equipment, and experience to solve the problem fast. We serve all five boroughs
              plus parts of Long Island, Westchester, and New Jersey — covering{" "}
              <Link href="/areas" className="text-green-400 hover:underline">{totalNeighborhoods}+ neighborhoods</Link>{" "}
              with same-day and next-day availability on most pest control services. Check our{" "}
              <Link href="/pricing" className="text-green-400 hover:underline">pricing page</Link>{" "}
              for detailed cost breakdowns, or{" "}
              <Link href="/quote-request" className="text-green-400 hover:underline">request a free quote</Link>{" "}
              online right now.
            </p>

            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* ── WHY PROFESSIONAL PEST CONTROL MATTERS ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why Professional{" "}
            <span className="text-green-400">Pest Control</span>{" "}
            Matters in NYC
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-zinc-300 leading-7">
            <p>
              New York City presents a unique set of pest control challenges that no other American city
              can match. With over 8.3 million residents packed into 302 square miles, the density of
              housing stock, the age of building infrastructure, and the sheer volume of food service
              establishments create a perfect storm for pest infestations of every kind. The city&rsquo;s
              extensive subway system, interconnected building walls, shared plumbing stacks, and
              compactor-fed trash rooms give pests highways of access that simply do not exist in
              suburban environments. This is why professional exterminator services are not a luxury
              in NYC — they are a necessity.
            </p>

            <p>
              Many New Yorkers initially attempt DIY pest control using over-the-counter sprays, traps,
              and baits purchased from hardware stores. While these products can occasionally knock down
              visible pest activity, they almost never address the root cause of an infestation. A can
              of Raid will kill the cockroach you see on your kitchen counter, but it will not eliminate
              the hundreds of cockroaches living inside your wall voids, behind your refrigerator motor,
              and underneath your dishwasher. Store-bought mouse traps may catch one or two rodents, but
              they do nothing to seal the entry points that allow new mice to enter your apartment every
              single night. Professional pest control technicians understand pest biology, behavior
              patterns, and habitat preferences at a level that allows them to deliver complete
              elimination rather than temporary relief. Our{" "}
              <Link href="/faq" className="text-green-400 hover:underline">FAQ page</Link>{" "}
              addresses the most common questions about why professional treatment outperforms DIY
              approaches every time.
            </p>

            <p>
              Beyond the effectiveness gap between DIY and professional pest control, there are serious
              health and safety considerations that make hiring a licensed exterminator the responsible
              choice. Improper application of pesticides in enclosed apartment spaces can expose residents,
              children, and pets to harmful chemicals. Misidentification of pests leads to incorrect
              treatment protocols that waste time and money while the infestation worsens. Bed bugs
              mistaken for carpet beetles, Norway rats confused with roof rats, German cockroaches
              treated as American cockroaches — each misidentification leads to a fundamentally different
              and ultimately failed treatment approach. Our pest control professionals hold New York State
              DEC Category 7A commercial applicator licenses and complete ongoing continuing education
              every year to stay current with the latest integrated pest management techniques and
              product innovations. When you hire The NYC Exterminator, you are getting science-backed
              pest control delivered by trained professionals who take your family&rsquo;s health as
              seriously as you do. Read what our customers have to say on our{" "}
              <Link href="/reviews" className="text-green-400 hover:underline">reviews page</Link>.
            </p>

            <p>
              The financial argument for professional pest control is equally compelling. A cockroach
              infestation left untreated for months will spread to neighboring units, triggering
              management complaints and potential lease violations. A rodent problem in a restaurant
              kitchen will result in DOH violations, fines starting at $300 per violation, and potential
              closure. Termite damage discovered late can cost tens of thousands of dollars in structural
              repairs. Bed bug infestations that spread to multiple rooms require exponentially more
              expensive treatment than a single-room problem caught early. In every scenario, the cost
              of professional pest control intervention is a fraction of the cost of delayed action.
              Visit our{" "}
              <Link href="/pricing" className="text-green-400 hover:underline">pricing page</Link>{" "}
              to see our transparent, competitive rates for every service we offer.
            </p>
          </div>
        </div>
      </section>

      {/* ── SERVICES BY CATEGORY ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Browse All{" "}
            <span className="text-green-400">Exterminator</span>{" "}
            Services by Category
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400 leading-7">
            We organize our {totalServices} pest control services into clear categories so you can
            quickly find the exterminator service that matches your situation. Click any service below
            to learn about our treatment process, pricing, and what to expect. Not sure which service
            you need? Text us at{" "}
            <a href={`sms:${PHONE}`} className="text-green-400 hover:underline">{PHONE}</a>{" "}
            and we will identify the right pest control solution for you over text — or{" "}
            <Link href="/quote-request" className="text-green-400 hover:underline">request a free quote</Link>{" "}
            online.
          </p>

          {categories.map((category) => {
            const services = servicesByCategory[category] || [];
            if (services.length === 0) return null;
            const catSlug = categoryToSlug(category);
            return (
              <div key={category} id={catSlug} className="mt-14 first:mt-0">
                <h3 className="text-2xl font-bold">{category}</h3>
                {categoryDescriptions[category] && (
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
                    {categoryDescriptions[category]}
                  </p>
                )}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/${service.slug}`}
                      className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-green-500/50"
                    >
                      <h4 className="font-semibold text-white">{service.name}</h4>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {service.description}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-sm font-medium text-green-400">
                          {service.priceRange}
                        </span>
                        {service.emergencyAvailable && (
                          <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                            Emergency
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── MID-PAGE CTA ── */}
      <section className="bg-[#2A2A2A] py-4">
        <CTAGroup variant="hero" />
      </section>

      {/* ── OUR PEST CONTROL PROCESS ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Our{" "}
            <span className="text-green-400">Pest Control</span>{" "}
            Process
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400 leading-7">
            Every pest control service from The NYC Exterminator follows a proven, systematic process
            that ensures complete elimination and long-term prevention. Whether we are treating a
            studio apartment for bed bugs or deploying a commercial rodent management program for
            a 50,000-square-foot warehouse, our approach is built on the same core principles.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 font-bold">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold">Free Inspection</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Every pest control engagement begins with a thorough on-site inspection. Our licensed
                exterminator technicians examine your property from top to bottom, identifying pest
                species, locating nesting sites and entry points, assessing the severity of the
                infestation, and documenting conditions that contributed to the problem. This
                inspection is always free and comes with zero obligation. We believe you deserve to
                understand exactly what you are dealing with before you spend a dollar on treatment.
                Our inspectors use professional-grade tools including moisture meters, fiber optic
                scopes, and in some cases canine detection teams for bed bug inspections.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 font-bold">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold">Custom Treatment Plan</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Based on inspection findings, we develop a customized pest control treatment plan
                tailored to your specific situation. No two infestations are identical, and cookie-cutter
                exterminator approaches lead to incomplete results. Your treatment plan will specify
                the exact products and methods we will use, the number of treatment visits required,
                preparation instructions for residents or staff, and a clear timeline for expected
                results. We explain everything in plain language and answer every question before
                work begins. You will receive upfront pricing with no hidden fees — see our{" "}
                <Link href="/pricing" className="text-green-400 hover:underline">pricing page</Link>{" "}
                for typical cost ranges across all pest control services.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 font-bold">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold">Professional Treatment</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Our pest control technicians execute the treatment plan using professional-grade
                products and equipment that are not available to consumers. Depending on the pest
                species and infestation severity, treatment may include gel baiting systems, residual
                liquid applications, dust formulations injected into wall voids, heat treatment
                equipment capable of raising room temperatures above 130 degrees Fahrenheit, exclusion
                materials to seal entry points, and mechanical trapping programs. Every product we
                use is EPA-registered and applied according to label directions by licensed
                applicators. We take every precaution to protect residents, pets, and the environment
                while delivering maximum exterminator effectiveness.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 font-bold">
                4
              </div>
              <h3 className="mt-4 text-lg font-semibold">Follow-Up &amp; Prevention</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Pest control does not end with the initial treatment. Most infestations require at
                least one follow-up visit to verify elimination, treat any residual activity, and
                reinforce preventive measures. Our exterminator team schedules follow-up appointments
                at intervals appropriate to the pest species — typically 2 weeks for cockroaches,
                10-14 days for bed bugs, and weekly for active rodent programs. We also provide
                detailed prevention recommendations specific to your property, including sanitation
                improvements, structural repairs, and ongoing monitoring strategies. Many of our
                clients choose our monthly or quarterly pest control maintenance plans for year-round
                protection. Have questions about the process? Visit our{" "}
                <Link href="/faq" className="text-green-400 hover:underline">FAQ page</Link>{" "}
                for detailed answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESIDENTIAL VS COMMERCIAL ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Residential vs. Commercial{" "}
            <span className="text-green-400">Pest Control</span>
          </h2>

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold text-green-400">Residential Pest Control</h3>
              <div className="mt-4 space-y-4 text-zinc-300 leading-7">
                <p>
                  Residential pest control in New York City requires an approach that prioritizes
                  safety, discretion, and minimal disruption to your daily life. Whether you live
                  in a pre-war co-op on the Upper West Side, a modern high-rise condo in Long Island
                  City, a brownstone in Park Slope, or a single-family home in Staten Island, our
                  residential exterminator services are designed to fit your living situation. We
                  understand that your home is your sanctuary, and the presence of pests creates
                  stress that goes beyond the physical problem. That is why our pest control
                  technicians arrive in unmarked vehicles, work efficiently and cleanly, and
                  communicate clearly about what to expect during and after treatment.
                </p>
                <p>
                  Our residential pest control services cover every common NYC household pest including{" "}
                  <Link href="/cockroach-exterminator-nyc" className="text-green-400 hover:underline">cockroaches</Link>,{" "}
                  <Link href="/bed-bug-exterminator-nyc" className="text-green-400 hover:underline">bed bugs</Link>,{" "}
                  <Link href="/mice-exterminator-nyc" className="text-green-400 hover:underline">mice</Link>,{" "}
                  <Link href="/rat-exterminator-nyc" className="text-green-400 hover:underline">rats</Link>,{" "}
                  <Link href="/ant-exterminator-nyc" className="text-green-400 hover:underline">ants</Link>,{" "}
                  and dozens more. We work with tenants, homeowners, property managers, and building
                  superintendents to coordinate treatment across units when necessary. Multi-unit
                  buildings often require coordinated pest control efforts to prevent pests from
                  simply migrating from treated units to untreated ones — we manage this process
                  from start to finish. Pricing for residential pest control starts at just $49 for
                  single-service treatments, with discounted rates available for monthly and quarterly
                  maintenance plans. See full details on our{" "}
                  <Link href="/pricing" className="text-green-400 hover:underline">pricing page</Link>.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-green-400">Commercial Pest Control</h3>
              <div className="mt-4 space-y-4 text-zinc-300 leading-7">
                <p>
                  Commercial pest control demands a fundamentally different approach than residential
                  service. Businesses face regulatory scrutiny, customer perception risks, and
                  operational disruptions that residential clients do not. A single pest sighting in
                  a restaurant dining room can trigger negative online reviews that cost thousands
                  of dollars in lost revenue. A rodent problem in a retail store can lead to product
                  contamination and liability claims. A cockroach infestation in an office building
                  can trigger employee complaints and HR investigations. The stakes are higher, the
                  timelines are tighter, and the consequences of failure are more severe. Our{" "}
                  <Link href="/commercial-pest-control" className="text-green-400 hover:underline">commercial pest control program</Link>{" "}
                  is built to meet these demands.
                </p>
                <p>
                  We provide specialized pest control and exterminator services for restaurants, bars,
                  hotels, retail stores, warehouses, office buildings, schools, hospitals, and
                  property management companies. Our{" "}
                  <Link href="/restaurant-pest-control" className="text-green-400 hover:underline">restaurant pest control program</Link>{" "}
                  is specifically designed to meet NYC Department of Health requirements, with
                  documentation and service reports that satisfy inspection requirements. Commercial
                  pest control clients receive a dedicated account manager, flexible scheduling
                  including nights and weekends to minimize business disruption, and detailed service
                  reports after every visit. We offer monthly, bi-weekly, and weekly service
                  frequencies depending on the nature of your business and the level of pest pressure
                  in your area. Text us at{" "}
                  <a href={`sms:${PHONE}`} className="text-green-400 hover:underline">{PHONE}</a>{" "}
                  for a free commercial pest control consultation and site assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EMERGENCY PEST CONTROL ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Emergency{" "}
            <span className="text-green-400">Pest Control</span>{" "}
            — Available 24/7
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-zinc-300 leading-7">
            <p>
              Some pest control situations cannot wait until Monday morning. A wasp nest discovered
              above your front door when you have guests arriving in two hours. A rat that entered
              your apartment through a toilet drain at midnight. A massive cockroach emergence in
              your restaurant kitchen during Saturday dinner service. Bed bugs discovered in a hotel
              room while a guest is checking in. These are the emergencies that our 24/7{" "}
              <Link href="/emergency-pest-control" className="text-green-400 hover:underline">emergency pest control service</Link>{" "}
              exists to handle. When you need an exterminator right now, The NYC Exterminator answers
              the phone — day or night, weekdays, weekends, and holidays.
            </p>

            <p>
              Our emergency pest control response team is stationed across all five boroughs with
              fully stocked service vehicles ready to deploy on short notice. In most cases, we can
              have a licensed exterminator at your location within 2 to 4 hours of your call. Emergency
              services are available for all pest types, with the most common emergency calls involving
              rodent intrusions, stinging insect nests in high-traffic areas, severe cockroach
              infestations in food service establishments, and bed bug discoveries in hospitality
              settings. Emergency pest control pricing is transparent and quoted over the phone before
              we dispatch — no surprise fees, no pressure, just fast professional exterminator service
              when you need it most. Text{" "}
              <a href={`sms:${PHONE}`} className="font-semibold text-green-400 hover:underline">{PHONE}</a>{" "}
              for immediate emergency pest control assistance, or visit our{" "}
              <Link href="/emergency-pest-control" className="text-green-400 hover:underline">emergency pest control page</Link>{" "}
              for more details on our rapid response capabilities.
            </p>

            <p>
              We understand that pest emergencies are stressful. That is why our emergency exterminator
              dispatchers are trained to provide immediate guidance over the phone while our technician
              is en route. We will tell you what to do (and what not to do) to contain the situation,
              protect yourself and your family, and preserve evidence that helps our pest control
              technician resolve the problem faster once on-site. Emergency service is available
              across all{" "}
              <Link href="/areas" className="text-green-400 hover:underline">{totalNeighborhoods}+ neighborhoods</Link>{" "}
              we serve.
            </p>
          </div>
        </div>
      </section>

      {/* ── SERVICE AREAS COVERAGE ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pest Control{" "}
            <span className="text-green-400">Service Areas</span>
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-zinc-300 leading-7">
            <p>
              The NYC Exterminator provides professional pest control and exterminator services across
              the entire New York City metro area. Our coverage spans {totalNeighborhoods}+ individual
              neighborhoods organized across 8 service regions including Manhattan, Brooklyn, Queens,
              The Bronx, Staten Island, Long Island, Westchester, and Northern New Jersey. No matter
              where your property is located, we have pest control technicians who know your neighborhood,
              understand the local building stock, and are familiar with the specific pest pressures
              common to your area.
            </p>

            <p>
              Different neighborhoods face different pest control challenges. Older pre-war buildings
              in Upper Manhattan and the South Bronx tend to have more severe cockroach and mouse
              infestations due to aging infrastructure and shared wall voids. Waterfront neighborhoods
              in Red Hook, Greenpoint, and the Rockaways experience elevated rodent pressure from
              proximity to shipping and industrial activity. Brownstone-heavy neighborhoods like
              Bedford-Stuyvesant, Crown Heights, and Harlem frequently deal with carpenter ant and
              termite activity in their century-old wooden structural elements. New construction in
              areas like Hudson Yards, Williamsburg, and Downtown Brooklyn attracts pests through
              construction disturbance that displaces existing colonies. Our pest control professionals
              understand these neighborhood-level patterns and tailor their exterminator approach
              accordingly.
            </p>

            <p>
              Explore our complete service area coverage on the{" "}
              <Link href="/areas" className="text-green-400 hover:underline">areas page</Link>,
              where you can find your specific neighborhood and see the pest control services
              available in your location. Every neighborhood page includes local pest control
              insights, common infestations for that area, and direct booking links. If you are
              unsure whether we cover your area, text us at{" "}
              <a href={`sms:${PHONE}`} className="text-green-400 hover:underline">{PHONE}</a>{" "}
              — chances are excellent that we do. We are continuously expanding our pest control
              service footprint to ensure that every New Yorker has access to professional
              exterminator services when they need them.
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
