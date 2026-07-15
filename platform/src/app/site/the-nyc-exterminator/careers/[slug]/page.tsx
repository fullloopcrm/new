import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllNeighborhoods,
  getNeighborhoodBySlug,
  getAllServices,
  getNearbyNeighborhoods,
} from "@/app/site/the-nyc-exterminator/_lib/data";
import { PHONE, SITE_URL, SITE_NAME, EMAIL } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";
import CareersCTA from "@/app/site/the-nyc-exterminator/_components/CareersCTA";
import JobApplicationForm from "@/app/site/the-nyc-exterminator/_components/JobApplicationForm";
import { getJobDates } from "@/app/site/the-nyc-exterminator/_lib/jobDates";

// Regenerate every 7 days so JobPosting `datePosted` stays fresh for Google.
// Google considers postings stale ~180 days after datePosted; 7-day rolling
// refresh keeps every page well within that window automatically.
export const revalidate = 604800;

interface PageProps {
  params: Promise<{ slug: string }>;
}

function parseSlug(slug: string): string | null {
  const suffix = "-exterminator-jobs";
  if (!slug.endsWith(suffix)) return null;
  return slug.slice(0, -suffix.length);
}

export const dynamicParams = true

export async function generateStaticParams() { return [] }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const neighborhoodSlug = parseSlug(slug);
  if (!neighborhoodSlug) return {};

  const neighborhood = getNeighborhoodBySlug(neighborhoodSlug);
  if (!neighborhood) return {};

  const title = `Exterminator Jobs in ${neighborhood.name} | Pest Control Careers | ${SITE_NAME}`;
  const description = `Now hiring exterminators & pest control technicians in ${neighborhood.name}, ${neighborhood.region}. $45K-$95K+ pay, full benefits, paid training, company vehicle. Text us to apply!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/careers/${slug}`,
    },
    alternates: {
      canonical: `${SITE_URL}/careers/${slug}`,
    },
  };
}

export default async function NeighborhoodCareersPage({ params }: PageProps) {
  const { slug } = await params;
  const neighborhoodSlug = parseSlug(slug);
  if (!neighborhoodSlug) notFound();

  const neighborhood = getNeighborhoodBySlug(neighborhoodSlug);
  if (!neighborhood) notFound();

  const nearbyNeighborhoods = getNearbyNeighborhoods(neighborhood, 8);
  const allServices = getAllServices();
  const featuredServices = allServices.slice(0, 8);

  const location =
    neighborhood.name === neighborhood.region
      ? neighborhood.name
      : `${neighborhood.name}, ${neighborhood.region}`;

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Careers", url: "/careers" },
    {
      name: `${neighborhood.name} Exterminator Jobs`,
      url: `/careers/${slug}`,
    },
  ]);

  const { datePosted, validThrough } = getJobDates();
  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `Pest Control Technician — ${neighborhood.name}`,
    description: `Licensed pest control technician / exterminator serving ${location}. Perform residential and commercial pest control throughout ${neighborhood.name} and nearby ${neighborhood.region} neighborhoods — inspections and EPA-approved treatments for cockroaches, bed bugs, mice, rats, ants, and termites common to ${neighborhood.name} properties. Full-time, $45,000–$85,000/yr, benefits, and NYS DEC certification training sponsorship. Join ${SITE_NAME}.`,
    datePosted,
    validThrough,
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: neighborhood.name,
        addressRegion: neighborhood.region === "New Jersey" ? "NJ" : "NY",
        addressCountry: "US",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: 45000,
        maxValue: 85000,
        unitText: "YEAR",
      },
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema).replace(/</g, '\\u003c') }}
      />

      {/* Hero Section */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-zinc-400">
            <Link href="/" className="hover:text-white">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/careers" className="hover:text-white">
              Careers
            </Link>{" "}
            /{" "}
            <span className="text-zinc-200">
              {neighborhood.name} Exterminator Jobs
            </span>
          </nav>

          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Exterminator Jobs in {neighborhood.name}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Pest Control Careers in
              <br />
              <span className="text-[#EFF70A]">{neighborhood.name}.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              {SITE_NAME} is hiring exterminators and pest control professionals
              to serve {neighborhood.name} and the surrounding{" "}
              {neighborhood.region} area. If you are a licensed exterminator, a
              pest control technician looking for your next opportunity, or
              someone ready to start a rewarding career in the pest control
              industry, we have positions available right here in{" "}
              {neighborhood.name}. Our pest control team in {neighborhood.region}{" "}
              handles everything from cockroach extermination and bed bug
              treatments to rodent control, termite inspections, wildlife
              removal, and comprehensive commercial pest management for
              businesses throughout{" "}
              <Link
                href={`/areas/${neighborhood.slug}`}
                className="text-green-400 hover:text-green-300"
              >
                {neighborhood.name}
              </Link>
              .
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              {neighborhood.name} presents unique pest control challenges that
              make it one of the most interesting and rewarding territories
              for an exterminator to work in. The mix of residential buildings,
              commercial properties, restaurants, and retail establishments in{" "}
              {neighborhood.name} means that our pest control technicians gain
              exposure to a wide variety of extermination scenarios every single
              day. From apartment cockroach infestations and bed bug treatments
              in multi-unit buildings to rodent exclusion work for{" "}
              {neighborhood.name} restaurants and commercial pest management
              programs for office buildings, exterminators working in{" "}
              {neighborhood.name} develop a versatile and highly marketable
              skill set in the pest control profession.
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              Join {SITE_NAME} and build your pest control career in one of
              {neighborhood.region}&apos;s most active exterminator service
              areas. We offer competitive pay ranging from $38,000 to $95,000+
              depending on the role, full benefits including health insurance
              and 401(k), paid training and licensing support, a company vehicle
              for field positions, and clear career advancement opportunities.
              Explore our open exterminator positions below and apply today for
              pest control jobs in {neighborhood.name}.
            </p>

            <CareersCTA variant="hero" neighborhood={neighborhood.name} />
          </div>
        </div>
      </section>

      {/* Open Positions in this Neighborhood */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Exterminator Jobs Available in{" "}
            <span className="text-green-500">{neighborhood.name}</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            The following pest control and exterminator positions are currently
            available for candidates who want to work in or near{" "}
            {neighborhood.name}, {neighborhood.region}. All positions include
            paid training, full benefits eligibility, and career advancement
            opportunities at {SITE_NAME}. To apply, email your resume to{" "}
            <a
              href={`mailto:${EMAIL}?subject=Application: Exterminator - ${neighborhood.name}`}
              className="text-green-400 hover:text-green-300"
            >
              {EMAIL}
            </a>{" "}
            or text{" "}
            <a
              href={`sms:${PHONE.replace(/-/g, "")}`}
              className="text-green-400 hover:text-green-300"
            >
              us
            </a>
            .
          </p>

          <div className="mt-10 space-y-8">
            {[
              {
                title: "Lead Exterminator",
                pay: "$65,000 - $95,000/year + bonuses",
                type: "Full-Time",
                desc: `Lead our pest control operations in ${neighborhood.name} and surrounding ${neighborhood.region} neighborhoods. As a Lead Exterminator, you will manage a team of pest control technicians, handle complex extermination jobs including bed bug heat treatments, advanced cockroach infestations, and large-scale rodent exclusion projects, and serve as the senior pest control authority for our ${neighborhood.name} service territory. You will conduct thorough property inspections, develop customized pest management plans for ${neighborhood.name} residential and commercial properties, train junior exterminators, and ensure that every pest control job meets The NYC Exterminator's high standards of quality. This leadership role requires a NYS DEC Commercial Pesticide Applicator license, minimum 3 years of professional exterminator experience, and proven ability to lead pest control teams in the field.`,
              },
              {
                title: "Pest Control Technician",
                pay: "$45,000 - $68,000/year + overtime",
                type: "Full-Time",
                desc: `Perform residential and commercial pest control treatments throughout ${neighborhood.name} and nearby ${neighborhood.region} neighborhoods. As a Pest Control Technician at ${SITE_NAME}, you will conduct pest inspections, apply EPA-approved treatments for cockroaches, bed bugs, mice, rats, ants, termites, and other common pests found in ${neighborhood.name} properties, document your findings and treatments, and educate customers about pest prevention strategies. You will work with cutting-edge extermination equipment and products while building expertise in the specific pest control challenges that ${neighborhood.name} presents. This position is ideal for licensed pest control professionals or motivated individuals willing to obtain their NYS DEC certification with our full support and training sponsorship.`,
              },
              {
                title: "Wildlife Control Specialist",
                pay: "$55,000 - $80,000/year",
                type: "Full-Time",
                desc: `Handle wildlife removal and exclusion for residential and commercial properties in ${neighborhood.name} and across ${neighborhood.region}. As a Wildlife Control Specialist, you will specialize in the humane removal of raccoons, squirrels, opossums, birds, bats, and other urban wildlife that invade ${neighborhood.name} properties. This pest control career path requires expertise in animal behavior, structural exclusion techniques, one-way door installation, habitat modification, and full compliance with NYS DEC wildlife regulations. You will also coordinate with our pest control technicians on integrated projects that involve both wildlife and traditional pest management in ${neighborhood.name}. NYS DEC NWCO license required.`,
              },
              {
                title: "Commercial Account Manager",
                pay: "$60,000 - $90,000/year + commission",
                type: "Full-Time",
                desc: `Build and manage relationships with commercial pest control clients in ${neighborhood.name} and throughout ${neighborhood.region}. You will oversee pest management contracts for ${neighborhood.name} restaurants, retail establishments, office buildings, and property management companies. This role combines sales expertise with deep knowledge of commercial extermination requirements, NYC DOH regulations, and industry-specific pest control protocols. You will conduct facility assessments for ${neighborhood.name} businesses, develop customized pest management proposals, coordinate service schedules with our exterminator teams, and drive revenue growth for our ${neighborhood.region} commercial pest control division. Top performers earn well above the base salary through uncapped commissions.`,
              },
              {
                title: "Customer Service Representative",
                pay: "$38,000 - $52,000/year",
                type: "Full-Time / Part-Time",
                desc: `Serve as the first point of contact for customers in ${neighborhood.name} and across ${neighborhood.region} who are reaching out to The NYC Exterminator for pest control services. You will answer calls and texts, schedule exterminator appointments for ${neighborhood.name} properties, provide information about our pest control services and pricing, handle billing inquiries, and coordinate with our field exterminators to ensure seamless service delivery. Knowledge of ${neighborhood.name} and ${neighborhood.region} geography is a strong plus. This is an excellent entry point into the pest control industry with opportunities to advance into dispatching, operations, or field exterminator roles.`,
              },
            ].map((pos) => (
              <div
                key={pos.title}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-8"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {pos.title} &mdash; {neighborhood.name}
                  </h3>
                  <div className="flex gap-3">
                    <span className="inline-block rounded-full bg-green-600/20 px-3 py-1 text-xs font-semibold text-green-400">
                      {pos.type}
                    </span>
                    <span className="inline-block rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">
                      {pos.pay}
                    </span>
                  </div>
                </div>
                <p className="mt-4 leading-7 text-zinc-300">{pos.desc}</p>
                <div className="mt-5 flex gap-4">
                  <a
                    href={`mailto:${EMAIL}?subject=Application: ${pos.title} - ${neighborhood.name}`}
                    className="inline-flex items-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Apply Now
                  </a>
                  <a
                    href={`sms:${PHONE.replace(/-/g, "")}`}
                    className="inline-flex items-center rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-400 hover:text-white"
                  >
                    Text Us
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CareersCTA variant="mid" neighborhood={neighborhood.name} />

      {/* Why Work as an Exterminator in this Neighborhood */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Work as an Exterminator in{" "}
            <span className="text-green-500">{neighborhood.name}</span>?
          </h2>
          <div className="mt-6 max-w-4xl space-y-4 text-lg leading-8 text-zinc-300">
            <p>
              {neighborhood.name} is one of the most dynamic and rewarding
              service territories for pest control professionals in the{" "}
              {neighborhood.region} area. The combination of diverse property
              types, high population density, active food service and
              hospitality businesses, and the specific building construction
              styles found in {neighborhood.name} creates consistent,
              year-round demand for professional extermination services.
              Exterminators and pest control technicians who work in{" "}
              {neighborhood.name} stay busy throughout the year with a
              compelling mix of residential and commercial pest control jobs.
            </p>
            <p>
              The pest control landscape in {neighborhood.name} includes common
              NYC pest issues like cockroach infestations in apartment buildings,
              bed bug treatments in multi-unit residential properties, mouse and
              rat control for both residential and commercial customers,
              ant and spider treatments for homes and businesses, and wildlife
              removal for properties dealing with raccoons, squirrels, or birds.{" "}
              {neighborhood.name} restaurants, cafes, and food service
              establishments require ongoing commercial pest management programs
              that keep our exterminators engaged with long-term accounts. The
              variety of pest control work available in {neighborhood.name}{" "}
              means that our technicians are never doing the same thing two days
              in a row &mdash; making it one of the most interesting
              territories in our entire service area.
            </p>
            <p>
              Working as an exterminator in {neighborhood.name} with{" "}
              {SITE_NAME} also means being part of a tight-knit{" "}
              {neighborhood.region} pest control team. Our{" "}
              {neighborhood.region} exterminators support each other, share
              knowledge about local pest patterns and building types, and
              collaborate on complex jobs. When you handle a difficult bed bug
              heat treatment in a {neighborhood.name} brownstone or execute a
              comprehensive rodent exclusion program for a {neighborhood.name}{" "}
              restaurant, you have the full support of our team, our training
              resources, and our management behind you. Explore our{" "}
              <Link
                href={`/areas/${neighborhood.slug}`}
                className="text-green-400 hover:text-green-300"
              >
                {neighborhood.name} pest control services
              </Link>{" "}
              to see the full range of extermination work our team handles in
              this neighborhood.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "High Pest Control Demand",
                desc: `${neighborhood.name} has consistent year-round demand for professional extermination services. Cockroach, bed bug, and rodent control requests keep our exterminators busy with a steady flow of pest control jobs in the area.`,
              },
              {
                title: "Diverse Job Experience",
                desc: `Working as an exterminator in ${neighborhood.name} exposes you to residential apartments, commercial kitchens, office buildings, retail spaces, and more. This variety builds a comprehensive pest control skill set that advances your career.`,
              },
              {
                title: "Competitive Territory Pay",
                desc: `Pest control technicians and exterminators serving ${neighborhood.name} earn competitive wages with performance bonuses. The high volume of extermination work in this area means strong overtime opportunities as well.`,
              },
              {
                title: "Strong Team Support",
                desc: `Our ${neighborhood.region} pest control team operates as a cohesive unit. Experienced lead exterminators mentor newer technicians, and our dispatchers ensure efficient routing across ${neighborhood.name} and nearby neighborhoods.`,
              },
              {
                title: "Career Growth Path",
                desc: `Exterminators who excel in ${neighborhood.name} have clear advancement opportunities to lead exterminator, field supervisor, and management roles within The NYC Exterminator's ${neighborhood.region} operation.`,
              },
              {
                title: "Community Impact",
                desc: `As a pest control professional serving ${neighborhood.name}, you make a real difference in the quality of life for residents and business owners. Professional extermination services protect health, property values, and peace of mind.`,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-6"
              >
                <h3 className="font-semibold text-green-400">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pest Control Services We Provide in this Neighborhood */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pest Control Services Our Exterminators Provide in{" "}
            <span className="text-green-500">{neighborhood.name}</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            When you join {SITE_NAME} as an exterminator serving{" "}
            {neighborhood.name}, you will be trained and equipped to deliver
            the full range of pest control services that our customers in{" "}
            {location} depend on. Here are some of the key extermination and
            pest management services our {neighborhood.name} team provides.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featuredServices.map((service) => (
              <Link
                key={service.slug}
                href={`/${service.slug}/${neighborhood.slug}`}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-green-600 hover:text-green-400"
              >
                {service.name} in {neighborhood.name}
              </Link>
            ))}
          </div>

          <p className="mt-8 text-lg text-zinc-300">
            Our exterminators in {neighborhood.name} handle these pest control
            services and many more. From emergency cockroach extermination calls
            to scheduled bed bug heat treatments, rodent exclusion programs,
            termite inspections, ant treatments, and wildlife removal, every
            day brings new challenges and learning opportunities for our pest
            control technicians. View our complete{" "}
            <Link
              href="/services"
              className="text-green-400 hover:text-green-300"
            >
              pest control service directory
            </Link>{" "}
            to see every extermination service we offer, or check our{" "}
            <Link
              href="/pricing"
              className="text-green-400 hover:text-green-300"
            >
              pest control pricing page
            </Link>{" "}
            to understand the value we deliver to {neighborhood.name} customers.
          </p>
        </div>
      </section>

      <CareersCTA variant="mid" neighborhood={neighborhood.name} />

      {/* What to Expect as an Exterminator in this Neighborhood */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What to Expect as an Exterminator in{" "}
            <span className="text-green-500">{neighborhood.name}</span>
          </h2>
          <div className="mt-6 max-w-4xl space-y-4 text-lg leading-8 text-zinc-300">
            <p>
              A typical day for a pest control technician serving{" "}
              {neighborhood.name} starts with reviewing your service route and
              daily schedule at our dispatch center or from your company vehicle.
              Your route will include a mix of pest control jobs across{" "}
              {neighborhood.name} &mdash; from routine maintenance visits for
              ongoing pest management customers to emergency extermination calls
              for acute infestations. You might start your morning with a bed
              bug inspection in a {neighborhood.name} apartment building,
              follow that with a cockroach gel bait treatment in a residential
              unit, then head to a {neighborhood.name} restaurant for a
              commercial rodent control service visit before wrapping up with
              an ant treatment at a local retail space.
            </p>
            <p>
              Throughout the day, you will use professional-grade pest control
              equipment including backpack sprayers, bait application tools,
              crack-and-crevice injection systems, thermal remediation
              equipment for bed bugs, HEPA-filtered vacuums, rodent bait
              stations and snap traps, exclusion materials for sealing entry
              points, and digital documentation tools for recording inspection
              findings and treatment details. Every pest control job in{" "}
              {neighborhood.name} is documented thoroughly, and our exterminators
              take the time to educate customers about pest prevention measures
              specific to their property type and the common pest pressures in
              the {neighborhood.name} area.
            </p>
            <p>
              As a {SITE_NAME} exterminator working in {neighborhood.name}, you
              are backed by a team of experienced professionals who are always
              available to help. Our lead exterminators provide guidance on
              complex pest control situations, our customer service team handles
              scheduling and client communication, and our management team
              ensures that you have the training, equipment, and support you
              need to deliver outstanding extermination results on every job.
              We also provide ongoing training on new pest control products,
              techniques, and industry regulations so that our{" "}
              {neighborhood.name} exterminators stay at the top of their game.
            </p>
            <p>
              Our exterminators in {neighborhood.name} consistently report high
              job satisfaction thanks to the variety of pest control work, the
              supportive team environment, the competitive compensation, and the
              knowledge that they are making a real difference in the lives of{" "}
              {neighborhood.name} residents and business owners. If you want to
              build a career in pest control with a company that values your
              skills and invests in your growth, {SITE_NAME} is the right
              choice. Learn more{" "}
              <Link
                href="/about"
                className="text-green-400 hover:text-green-300"
              >
                about our company
              </Link>{" "}
              and the team you would be joining.
            </p>
          </div>
        </div>
      </section>

      {/* Training and Requirements */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Training & Requirements for {neighborhood.name}{" "}
            <span className="text-green-500">Exterminator Jobs</span>
          </h2>
          <div className="mt-6 max-w-4xl space-y-4 text-lg leading-8 text-zinc-300">
            <p>
              To work as a pest control technician or exterminator in{" "}
              {neighborhood.name} with {SITE_NAME}, you will need a NYS DEC
              Commercial Pesticide Applicator license (Category 7A for general
              pest control, with 7F and Category 8 preferred for fumigation and
              public health work). If you do not yet have your license, we offer
              full licensing support including study materials, practice exams,
              tutoring, and payment of all exam and application fees. Many of
              our best exterminators obtained their certification through our
              training program.
            </p>
            <p>
              For wildlife control specialist positions serving{" "}
              {neighborhood.name}, a NYS DEC Nuisance Wildlife Control Operator
              (NWCO) license is required. Commercial account manager and
              customer service positions do not require a pest control license,
              though familiarity with the extermination industry is a strong
              plus. All new hires at {SITE_NAME} go through our comprehensive
              paid training program regardless of prior experience, covering
              company procedures, pest control protocols, safety standards,
              customer service expectations, and the specific pest challenges
              of each neighborhood in our service territory including{" "}
              {neighborhood.name}.
            </p>
            <p>
              Beyond formal certifications, successful exterminators in{" "}
              {neighborhood.name} are detail-oriented, physically fit (able to
              lift 50+ lbs, work in confined spaces and at heights),
              customer-focused, and committed to doing the job right the first
              time. Bilingual skills (English/Spanish) are highly valued given
              the diverse communities we serve in {neighborhood.region}. A valid
              driver&apos;s license is preferred for most positions, though some
              walking routes in {neighborhood.name} are available for
              technicians without vehicles.
            </p>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Benefits for {neighborhood.name} Exterminators
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  "Competitive salary: $38,000 - $95,000+ depending on role",
                  "Comprehensive health, dental, and vision insurance",
                  "401(k) retirement plan with company match",
                  "Company vehicle and fuel card for field positions",
                  "Paid training, licensing support, and continuing education",
                  "Paid time off and paid holidays",
                  "Performance bonuses and overtime pay",
                  "Company-provided uniforms and equipment",
                  "Career advancement opportunities within the organization",
                ].map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-zinc-400"
                  >
                    <span className="mt-1 text-green-500">&#10003;</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="text-lg font-semibold text-green-400">
                How to Apply for Exterminator Jobs in {neighborhood.name}
              </h3>
              <div className="mt-4 space-y-4 text-sm leading-6 text-zinc-400">
                <p>
                  Applying for pest control jobs in {neighborhood.name} is
                  simple. Send your resume and a brief cover letter to{" "}
                  <a
                    href={`mailto:${EMAIL}?subject=Application: Exterminator - ${neighborhood.name}`}
                    className="text-green-400 hover:text-green-300"
                  >
                    {EMAIL}
                  </a>{" "}
                  with the position title and &ldquo;{neighborhood.name}&rdquo;
                  in the subject line. If you do not have a formal resume, just
                  tell us about your pest control experience, certifications,
                  and why you want to work as an exterminator in{" "}
                  {neighborhood.name}.
                </p>
                <p>
                  Our hiring team will respond within 48 hours to schedule a
                  phone interview. Qualified candidates are then invited for an
                  in-person meeting and brief skills assessment. Successful
                  applicants receive an offer within one week and can begin our
                  paid training program immediately.
                </p>
                <p>
                  You can also text{" "}
                  <a
                    href={`sms:${PHONE.replace(/-/g, "")}`}
                    className="text-green-400 hover:text-green-300"
                  >
                    us
                  </a>{" "}
                  to speak with our hiring team about exterminator positions in{" "}
                  {neighborhood.name} and across {neighborhood.region}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CareersCTA variant="mid" neighborhood={neighborhood.name} />

      {/* Nearby Neighborhood Job Links */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Exterminator Jobs Near{" "}
            <span className="text-green-500">{neighborhood.name}</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            In addition to pest control careers in {neighborhood.name}, we also
            have exterminator job openings in nearby {neighborhood.region}{" "}
            neighborhoods. Browse pest control positions near{" "}
            {neighborhood.name} or explore our{" "}
            <Link
              href="/careers"
              className="text-green-400 hover:text-green-300"
            >
              full careers page
            </Link>{" "}
            to see all available exterminator jobs across the NYC metro area.
          </p>

          {nearbyNeighborhoods.length > 0 && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {nearbyNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/careers/${n.slug}-exterminator-jobs`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-green-600 hover:text-green-400"
                >
                  {n.name} Exterminator Jobs
                </Link>
              ))}
            </div>
          )}

          <div className="mt-12 max-w-4xl space-y-4 text-lg leading-8 text-zinc-300">
            <p>
              Our pest control technicians and exterminators often serve
              multiple neighborhoods within their {neighborhood.region}{" "}
              territory. If you apply for an exterminator position in{" "}
              {neighborhood.name}, you may also have the opportunity to work in
              these nearby areas depending on routing and demand. The ability
              to serve a broader territory increases your hours, earning
              potential, and the diversity of pest control experience you gain
              as part of {SITE_NAME}&apos;s {neighborhood.region} team.
            </p>
            <p>
              Whether you end up primarily serving {neighborhood.name} or
              rotating through multiple {neighborhood.region} neighborhoods,
              you will benefit from the same competitive pay, comprehensive
              benefits, paid training, and career advancement opportunities
              that make {SITE_NAME} the employer of choice for pest control
              professionals in the NYC metro area. Our dispatchers work with
              each exterminator to create efficient routes that maximize
              productivity while minimizing unnecessary travel time &mdash;
              so you spend more time doing the pest control work you were hired
              for and less time sitting in traffic.
            </p>
          </div>
        </div>
      </section>

      {/* Final SEO Content */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Start Your Pest Control Career in{" "}
            <span className="text-green-500">{neighborhood.name}</span> Today
          </h2>
          <div className="mt-6 max-w-4xl space-y-4 text-lg leading-8 text-zinc-300">
            <p>
              {neighborhood.name} is one of {neighborhood.region}&apos;s most
              active markets for pest control and extermination services, and{" "}
              {SITE_NAME} is the leading provider of professional pest
              management in the area. Our exterminators serving{" "}
              {neighborhood.name} enjoy stable, year-round employment with
              competitive compensation, full benefits, and genuine career
              advancement opportunities in the pest control industry.
            </p>
            <p>
              The demand for qualified exterminators and pest control
              technicians in {neighborhood.name} continues to grow as the area
              develops and its residential and commercial property inventory
              expands. Cockroach extermination, bed bug treatment, rodent
              control, termite inspection, ant removal, and wildlife management
              are services that {neighborhood.name} property owners and
              managers rely on year-round, creating consistent work for our
              pest control team. By joining {SITE_NAME} as an exterminator
              serving {neighborhood.name}, you are positioning yourself in one
              of the strongest and most stable job markets in the entire NYC
              pest control industry.
            </p>
            <p>
              Do not wait to take the next step in your pest control career.
              Email your resume to{" "}
              <a
                href={`mailto:${EMAIL}?subject=Application: Exterminator - ${neighborhood.name}`}
                className="text-green-400 hover:text-green-300"
              >
                {EMAIL}
              </a>{" "}
              or text{" "}
              <a
                href={`sms:${PHONE.replace(/-/g, "")}`}
                className="text-green-400 hover:text-green-300"
              >
                us
              </a>{" "}
              today to speak with our hiring team about exterminator jobs in{" "}
              {neighborhood.name}. You can also visit our{" "}
              <Link
                href="/careers"
                className="text-green-400 hover:text-green-300"
              >
                main careers page
              </Link>{" "}
              to see all open positions, learn about our{" "}
              <Link
                href="/services"
                className="text-green-400 hover:text-green-300"
              >
                pest control services
              </Link>
              , read what our{" "}
              <Link
                href="/reviews"
                className="text-green-400 hover:text-green-300"
              >
                customers say about us
              </Link>
              , or explore our{" "}
              <Link
                href="/about"
                className="text-green-400 hover:text-green-300"
              >
                about page
              </Link>{" "}
              to learn more about the company and team behind {SITE_NAME}. Your
              next career as an exterminator in {neighborhood.name} starts here.
            </p>
          </div>
        </div>
      </section>

      {/* ── APPLICATION FORM ── */}
      <section id="apply" className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-green-400/80">
              Apply Now
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Apply for Exterminator Jobs in{" "}
              <span className="text-green-400">{neighborhood.name}</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
              Fill out the form below to apply for a pest control position
              serving {neighborhood.name} and the surrounding {neighborhood.region} area.
              No resume required &mdash; just tell us about yourself.
            </p>
          </div>
          <div className="mt-10 rounded-xl border border-white/[0.06] bg-[#141414] p-6 sm:p-8">
            <JobApplicationForm neighborhood={neighborhood.name} />
          </div>
        </div>
      </section>

      <CareersCTA variant="final" neighborhood={neighborhood.name} />
    </div>
  );
}
