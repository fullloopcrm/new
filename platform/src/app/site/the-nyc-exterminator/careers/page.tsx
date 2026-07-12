import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import { getAllNeighborhoods, getNeighborhoodsByRegion } from "@/app/site/the-nyc-exterminator/_lib/data";
import { PHONE, SITE_URL, SITE_NAME, EMAIL } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";
import CareersCTA from "@/app/site/the-nyc-exterminator/_components/CareersCTA";
import JobApplicationForm from "@/app/site/the-nyc-exterminator/_components/JobApplicationForm";

export const metadata: Metadata = {
  title:
    "Exterminator Jobs NYC | Now Hiring Pest Control Technicians | $45K-$95K+",
  description:
    "Now hiring licensed exterminators, pest control technicians, wildlife control specialists, and commercial account managers across NYC, NJ, Long Island & Westchester. $45K-$95K+ pay, full benefits, paid training, company vehicle. Join NYC's fastest-growing pest control team. Text us to apply.",
  keywords:
    "exterminator jobs NYC, pest control technician jobs, hiring exterminators New York, pest control careers, wildlife control jobs NYC, commercial pest control jobs, exterminator salary NYC",
  openGraph: {
    title:
      "Exterminator Jobs NYC | Now Hiring Pest Control Technicians | $45K-$95K+",
    description:
      "Now hiring pest control pros across NYC. $45K-$95K+ pay, full benefits, paid training, company vehicle. Text us to apply.",
    url: `${SITE_URL}/careers`,
  },
  alternates: {
    canonical: `${SITE_URL}/careers`,
  },
};

const positions = [
  {
    title: "Lead Exterminator",
    slug: "lead-exterminator",
    type: "Full-Time",
    pay: "$65,000 - $95,000/year + bonuses",
    description:
      "As a Lead Exterminator at The NYC Exterminator, you will oversee a team of pest control technicians and manage complex commercial and residential extermination projects across the entire NYC metro area. You will serve as the go-to expert for difficult infestations including bed bugs, cockroaches, termites, and advanced rodent control situations. Lead Exterminators are responsible for conducting thorough property inspections, developing customized pest management plans, training and mentoring junior pest control technicians, and ensuring that every extermination job meets our exacting standards of quality and customer satisfaction. You will coordinate with our dispatchers and commercial account managers to prioritize service routes, handle escalated pest control situations that require expert-level knowledge, and represent The NYC Exterminator as a trusted authority in professional pest management across all five boroughs and surrounding service regions.",
    requirements: [
      "NYS DEC Commercial Pesticide Applicator license (Category 7A required; 7F and 8 strongly preferred)",
      "Minimum 3 years of professional pest control or exterminator experience in NYC or a comparable metro area",
      "Proven leadership experience managing pest control technicians in field settings",
      "Expert knowledge of Integrated Pest Management (IPM) protocols and EPA-approved treatment methods",
      "Valid NYS driver's license with clean driving record",
      "Ability to work in confined spaces, crawl spaces, basements, attics, and on ladders up to 32 feet",
      "Strong customer communication, problem-solving, and documentation skills",
    ],
  },
  {
    title: "Pest Control Technician",
    slug: "pest-control-technician",
    type: "Full-Time",
    pay: "$45,000 - $68,000/year + overtime",
    description:
      "Pest Control Technicians are the backbone of The NYC Exterminator's field operations. In this role, you will perform residential and commercial pest control treatments across NYC, Brooklyn, Queens, the Bronx, Staten Island, New Jersey, Long Island, and Westchester County. Your daily work includes conducting pest inspections, applying EPA-approved treatments for cockroaches, bed bugs, mice, rats, ants, termites, spiders, and other common NYC pests, documenting findings and treatment details, and communicating with customers about prevention strategies. You will be trained in the latest extermination techniques, Integrated Pest Management methods, and safety protocols to deliver lasting results for our residential and commercial pest control customers. This is an outstanding opportunity for someone who wants to build a long-term career in the pest control and extermination industry with one of NYC's fastest-growing pest control companies.",
    requirements: [
      "NYS DEC Pesticide Applicator certification (or willingness to obtain within 90 days of hire with company support)",
      "1+ years of pest control, extermination, or related field experience preferred but not required for strong candidates",
      "Ability to lift 50+ lbs and work in physically demanding environments including hot attics and tight crawl spaces",
      "Comfortable working in NYC apartment buildings, commercial kitchens, basements, crawl spaces, and rooftops",
      "Valid driver's license preferred but not required for NYC-based walking routes",
      "Strong work ethic, attention to detail, and commitment to customer satisfaction",
      "Bilingual (English/Spanish) a significant plus",
    ],
  },
  {
    title: "Wildlife Control Specialist",
    slug: "wildlife-control-specialist",
    type: "Full-Time",
    pay: "$55,000 - $80,000/year",
    description:
      "Our Wildlife Control Specialists handle the unique challenges of urban wildlife management in New York City and the surrounding metro area. You will specialize in the humane removal, exclusion, and prevention of raccoons, squirrels, opossums, birds, bats, groundhogs, and other wildlife species that invade residential and commercial properties throughout our service territory. This pest control career requires deep expertise in animal behavior, structural exclusion techniques, habitat modification, one-way door installation, and full compliance with NYS DEC wildlife regulations. You will also coordinate with our pest control technicians on projects that involve both wildlife and traditional pest issues, such as properties dealing with both raccoons and rodent infestations simultaneously. Wildlife Control Specialists at The NYC Exterminator gain exposure to an extraordinary variety of wildlife scenarios unique to the New York City urban environment.",
    requirements: [
      "NYS DEC Nuisance Wildlife Control Operator (NWCO) license required",
      "NYS DEC Pesticide Applicator license preferred for integrated pest management situations",
      "2+ years of wildlife control, animal control, or related pest management experience",
      "Thorough knowledge of NYC and NYS wildlife regulations, seasons, and humane removal protocols",
      "Experience with structural exclusion work, sealing entry points, and habitat modification",
      "Comfortable working on rooftops, in attics, on elevated structures, and in confined spaces",
      "Valid NYS driver's license with clean driving record required",
    ],
  },
  {
    title: "Commercial Account Manager",
    slug: "commercial-account-manager",
    type: "Full-Time",
    pay: "$60,000 - $90,000/year + commission",
    description:
      "The Commercial Account Manager is responsible for building, maintaining, and expanding relationships with commercial pest control clients across New York City, New Jersey, Long Island, and Westchester. You will manage pest control contracts for restaurants, hotels, office buildings, warehouses, retail stores, healthcare facilities, food processing plants, and property management companies. This role combines consultative sales expertise with deep knowledge of commercial pest control requirements, health department regulations, and industry-specific extermination protocols. You will conduct facility assessments, develop customized pest management proposals, coordinate service schedules with our exterminator teams, ensure client satisfaction and contract renewals, and identify upsell opportunities for additional pest control services. Top-performing Commercial Account Managers at The NYC Exterminator regularly earn well above the base salary range through our generous commission structure.",
    requirements: [
      "3+ years of B2B sales or account management experience, preferably in pest control, facilities management, or property services",
      "Strong understanding of commercial pest control needs, NYC DOH regulations, and industry compliance standards",
      "Proven track record of meeting or exceeding sales targets and maintaining high client retention rates",
      "Excellent presentation, negotiation, and relationship-building skills",
      "Familiarity with NYC's restaurant, hospitality, healthcare, and property management industries",
      "NYS DEC Pesticide Applicator certification a plus (not required but training available)",
      "Proficiency with CRM software, proposal tools, and digital communication platforms",
    ],
  },
  {
    title: "Customer Service Representative",
    slug: "customer-service-representative",
    type: "Full-Time / Part-Time",
    pay: "$38,000 - $52,000/year",
    description:
      "Our Customer Service Representatives are the first point of contact for customers reaching out to The NYC Exterminator for pest control and extermination services. You will answer inbound calls and text messages, schedule pest control appointments across all service areas, provide detailed information about our extermination services and pricing, handle billing inquiries and follow-ups, and coordinate with our field exterminators and dispatchers to ensure seamless service delivery from initial contact through job completion. This is an excellent entry point into the pest control industry with real opportunities to advance into dispatching, operations coordination, inside sales, or even transition to field work as a licensed pest control technician with our full support and training sponsorship. Customer Service Representatives who demonstrate strong performance and initiative at The NYC Exterminator have a clear path to career growth within our organization.",
    requirements: [
      "1+ years of customer service experience (pest control, home services, or property management industry strongly preferred)",
      "Excellent phone manner and written communication skills with a professional, empathetic demeanor",
      "Ability to handle high call volumes while maintaining accuracy and a friendly, patient approach",
      "Basic computer proficiency and experience with scheduling software, CRM platforms, or similar tools",
      "Knowledge of NYC geography, boroughs, and neighborhoods a strong plus",
      "Bilingual (English/Spanish) highly preferred given our diverse customer base",
      "Availability for weekday shifts with some Saturday availability required during peak season",
    ],
  },
];

export default function CareersPage() {
  const allNeighborhoods = getAllNeighborhoods();
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const totalNeighborhoods = allNeighborhoods.length;

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Careers", url: "/careers" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />

      {/* Hero Section */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-zinc-400">
            <Link href="/" className="hover:text-white">
              Home
            </Link>{" "}
            / <span className="text-zinc-200">Careers</span>
          </nav>

          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Pest Control Careers NYC
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Join NYC&apos;s Top
              <br />
              <span className="text-[#EFF70A]">Pest Control Team.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              {SITE_NAME} is hiring licensed exterminators, pest control
              technicians, wildlife control specialists, commercial account
              managers, and customer service professionals across the NYC metro
              area. We serve{" "}
              <Link
                href="/areas"
                className="text-green-400 hover:text-green-300"
              >
                {totalNeighborhoods}+ neighborhoods
              </Link>{" "}
              in New York City, New Jersey, Long Island, and Westchester &mdash;
              and we need talented pest control professionals to help us grow.
              Whether you&apos;re an experienced exterminator looking for your
              next career move or you&apos;re just starting out in the pest
              control industry, we have a place for you on our team.
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              As one of the fastest-growing pest control and extermination
              companies in the NYC metro area, we offer competitive pay ranging
              from $38,000 to $95,000+ depending on the role, full benefits,
              paid training, and real career advancement opportunities. Our
              exterminators handle everything from{" "}
              <Link
                href="/services"
                className="text-green-400 hover:text-green-300"
              >
                cockroach extermination and bed bug treatment
              </Link>{" "}
              to rodent control, termite inspection, and wildlife removal
              &mdash; giving our team members exposure to the full range of pest
              control services that New Yorkers depend on every single day.
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              The pest control industry in New York City offers stability,
              strong earning potential, and a career path that rewards hard work
              and dedication. Pests are a fact of life in the densest urban
              environment in America, and professional exterminators are always
              in demand. At {SITE_NAME}, we are committed to being the employer
              of choice for pest control professionals in the NYC metro area.
              Read on to learn about our open exterminator positions, our
              industry-leading training program, our comprehensive benefits
              package, and how to apply for pest control jobs near you.
            </p>

            <CareersCTA variant="hero" />
          </div>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Work With{" "}
            <span className="text-green-500">{SITE_NAME}?</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Choosing where to build your pest control career matters. At{" "}
            {SITE_NAME}, we invest heavily in our people because we know that
            the best exterminators are the ones who feel valued, supported,
            and equipped to do their best work. Here is what makes us different
            from other pest control employers in New York City and the
            surrounding metro area.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Industry-Leading Training",
                desc: "Every new exterminator and pest control technician receives comprehensive hands-on training in IPM protocols, EPA-approved treatment methods, equipment operation, safety procedures, and customer service excellence. We pair new hires with experienced lead exterminators for field training across diverse NYC pest control scenarios including bed bug heat treatments, cockroach gel bait applications, rodent exclusion work, and termite barrier installations. Our training program is designed to turn good technicians into great exterminators.",
              },
              {
                title: "Competitive Pay & Bonuses",
                desc: "We offer some of the most competitive wages in the NYC pest control industry. Our exterminators earn base salaries ranging from $45,000 to $95,000+ depending on role and experience, plus performance bonuses, overtime pay at time-and-a-half, and employee referral bonuses of $500 or more. Commercial account managers earn uncapped commissions on top of their base salary. We believe that exceptional pest control work deserves exceptional compensation.",
              },
              {
                title: "Career Growth Opportunities",
                desc: "Many of our lead exterminators and operations managers started as entry-level pest control technicians. We promote from within whenever possible and provide clear advancement paths from technician to lead exterminator, field supervisor, branch manager, and regional director. Customer service representatives can advance into dispatching, operations coordination, or transition to field roles with our full licensing support. Your ceiling at The NYC Exterminator is as high as your ambition.",
              },
              {
                title: "Full Benefits Package",
                desc: "Full-time pest control team members receive comprehensive health insurance (medical, dental, and vision), paid time off, paid holidays, 401(k) retirement plan with company match, company-provided uniforms and personal protective equipment, and a company vehicle with fuel card for field positions. We take care of our exterminators and support staff so they can focus on delivering outstanding pest control service to our customers.",
              },
              {
                title: "Cutting-Edge Equipment & Products",
                desc: "Our exterminators work with the latest pest control technology including thermal remediation systems for bed bug treatment, advanced rodent monitoring devices, precision bait application equipment, HEPA-filtered vacuums, and EPA-approved products from leading manufacturers. We invest continuously in the best tools and products available so our pest control technicians can deliver the best results and work efficiently on every extermination job.",
              },
              {
                title: "Supportive Team Culture",
                desc: "We are a team of pest control professionals who genuinely care about doing great work and supporting each other. From our dispatchers and customer service representatives to our field exterminators and management team, everyone at The NYC Exterminator is working toward the same goal: being the most trusted pest control company in the NYC metro area. We have an open-door management policy, experienced techs mentor newer ones, and we celebrate wins together.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
              >
                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-lg text-zinc-300">
            When you join {SITE_NAME}, you are joining a company that is
            committed to professional development, employee satisfaction, and
            delivering exceptional pest control and extermination services to
            every customer we serve across{" "}
            <Link href="/areas" className="text-green-400 hover:text-green-300">
              {totalNeighborhoods}+ neighborhoods
            </Link>
            . We are proud to be one of the most trusted names in{" "}
            <Link
              href="/services"
              className="text-green-400 hover:text-green-300"
            >
              NYC pest control
            </Link>
            , and that reputation starts with the quality and dedication of our
            people. Learn more{" "}
            <Link href="/about" className="text-green-400 hover:text-green-300">
              about our company
            </Link>{" "}
            and the values that drive everything we do.
          </p>
        </div>
      </section>

      <CareersCTA variant="mid" />

      {/* Open Positions */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Open <span className="text-green-500">Exterminator Jobs</span> &
            Pest Control Positions
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            We are actively hiring for the following pest control and
            exterminator positions across our service areas in NYC, NJ, Long
            Island, and Westchester. All positions include paid training, full
            benefits eligibility, and clear career advancement opportunities
            within our growing pest control organization. To apply for any
            position, email your resume to{" "}
            <a
              href={`mailto:${EMAIL}`}
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

          <div className="mt-10 space-y-10">
            {positions.map((pos) => (
              <div
                key={pos.slug}
                id={pos.slug}
                className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-8"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-2xl font-bold text-white">{pos.title}</h3>
                  <div className="flex gap-3">
                    <span className="inline-block rounded-full bg-green-600/20 px-3 py-1 text-xs font-semibold text-green-400">
                      {pos.type}
                    </span>
                    <span className="inline-block rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">
                      {pos.pay}
                    </span>
                  </div>
                </div>
                <p className="mt-4 leading-7 text-zinc-300">
                  {pos.description}
                </p>

                <div className="mt-6">
                  <h4 className="font-semibold text-white">
                    Requirements & Qualifications
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {pos.requirements.map((req, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-zinc-400"
                      >
                        <span className="mt-1 text-green-500">&#10003;</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex gap-4">
                  <a
                    href={`mailto:${EMAIL}?subject=Application: ${pos.title}`}
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

      {/* Training Program */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our Pest Control{" "}
            <span className="text-green-500">Training Program</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            At {SITE_NAME}, we believe that the best exterminators are made
            through rigorous, hands-on training combined with mentorship from
            experienced professionals. That is why we have developed one of the
            most comprehensive pest control training programs in the NYC metro
            area. Whether you are a seasoned exterminator looking to sharpen
            your skills or a newcomer to the pest control industry, our
            training program will equip you with the knowledge, techniques,
            and certifications you need to succeed and advance in your pest
            control career.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Phase 1: Orientation & Classroom Training (Weeks 1-2)
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                New pest control technicians begin with comprehensive classroom
                training covering pest biology and behavior, identification of
                common NYC pests (cockroaches, bed bugs, rats, mice, ants,
                termites, spiders, fleas, ticks, and more), EPA-approved
                treatment methods and product knowledge, safety protocols and
                PPE usage, Integrated Pest Management (IPM) principles, customer
                service standards, and documentation requirements. Our trainers
                are experienced lead exterminators who bring real-world NYC pest
                control scenarios into the classroom, ensuring that every new
                technician understands the unique challenges of urban
                extermination work before they step into the field.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Phase 2: Field Training & Ride-Alongs (Weeks 3-6)
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                During field training, you will work alongside experienced
                exterminators on real pest control jobs across NYC
                neighborhoods. From Manhattan high-rises to Brooklyn
                brownstones, Queens single-family homes to Bronx apartment
                complexes, you will gain hands-on experience treating every
                type of pest infestation you will encounter as a professional
                exterminator. You will practice inspection techniques, treatment
                application, equipment operation, exclusion work, and customer
                communication under the direct guidance of a certified lead
                exterminator who will provide real-time feedback and coaching on
                every job.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Phase 3: Certification & Licensing Support
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                We provide full support for obtaining your NYS DEC Commercial
                Pesticide Applicator license, including comprehensive study
                materials, practice exams, one-on-one tutoring sessions, and
                paid time for exam preparation. For wildlife control
                specialists, we assist with the NWCO licensing process and
                requirements. We cover all exam fees and licensing costs
                because we want every pest control professional on our team to
                be fully certified and confident in their abilities as an
                exterminator. Having a licensed, credentialed team is what sets{" "}
                {SITE_NAME} apart from competitors in the NYC pest control
                market.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <h3 className="text-lg font-semibold text-green-400">
                Phase 4: Ongoing Professional Development
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Pest control is an evolving field, and our exterminators
                receive ongoing training in new treatment technologies, emerging
                pest threats, regulatory changes, advanced extermination
                techniques, and specialized service categories. We host monthly
                training sessions at our NYC office, send team members to
                industry conferences and trade shows, maintain partnerships
                with pest control product manufacturers for product-specific
                training, and provide continuing education credits toward
                license renewals. Continuous learning is what keeps {SITE_NAME}{" "}
                at the forefront of the NYC pest control industry.
              </p>
            </div>
          </div>

          <p className="mt-10 text-lg text-zinc-300">
            Our training program has produced some of the most skilled
            exterminators working in New York City today. Many of our graduates
            have gone on to become lead exterminators, field supervisors, and
            branch managers within our organization. If you are serious about
            building a lasting career in pest control and extermination,{" "}
            {SITE_NAME} is the place to start and the place to stay. Check out
            our{" "}
            <Link href="/about" className="text-green-400 hover:text-green-300">
              about page
            </Link>{" "}
            to learn more about who we are, explore our{" "}
            <Link
              href="/services"
              className="text-green-400 hover:text-green-300"
            >
              pest control services
            </Link>{" "}
            to see the full scope of work our exterminators handle every day,
            or read our{" "}
            <Link
              href="/reviews"
              className="text-green-400 hover:text-green-300"
            >
              customer reviews
            </Link>{" "}
            to understand the standard of excellence our team delivers on every
            extermination job.
          </p>
        </div>
      </section>

      <CareersCTA variant="mid" />

      {/* Benefits & Perks */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Exterminator{" "}
            <span className="text-green-500">Benefits & Perks</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            We know that great pest control professionals have options when it
            comes to choosing an employer. That is why we offer a benefits
            package that goes above and beyond what most pest control companies
            in the NYC area provide. When you work as an exterminator or pest
            control professional at {SITE_NAME}, you get more than just a
            paycheck &mdash; you get a career with real stability, meaningful
            growth potential, and the support you need to thrive both on and
            off the job.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Health, dental, and vision insurance",
              "401(k) retirement plan with company match",
              "Paid time off and paid holidays",
              "Paid training and certification support",
              "Company vehicle and fuel card for field positions",
              "Company-provided uniforms and PPE",
              "Performance bonuses and quarterly incentives",
              "Overtime pay at time-and-a-half",
              "Employee referral bonuses ($500+)",
              "Continuing education and conference allowance",
              "Clear career advancement pathways",
              "Supportive, team-oriented work culture",
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <span className="text-lg text-green-500">&#10003;</span>
                <span className="text-sm font-medium text-zinc-300">
                  {benefit}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-10 text-lg text-zinc-300">
            At {SITE_NAME}, we treat our exterminators, pest control
            technicians, wildlife control specialists, and support staff like
            the skilled professionals they are. Our employee retention rate is
            among the highest in the NYC pest control industry because we
            create an environment where people want to stay, grow, and do their
            best work. Whether you are a pest control technician running daily
            routes across Brooklyn and Queens, a wildlife control specialist
            handling complex removal jobs in Westchester, or a customer service
            representative scheduling appointments for customers across all
            five boroughs, you will receive the same high-quality benefits and
            respect that every member of our team deserves.
          </p>

          <p className="mt-4 text-lg text-zinc-300">
            Want to learn more about what it is like to work with us? Visit
            our{" "}
            <Link href="/about" className="text-green-400 hover:text-green-300">
              about page
            </Link>{" "}
            for more on our company culture and values, read our{" "}
            <Link
              href="/reviews"
              className="text-green-400 hover:text-green-300"
            >
              customer reviews
            </Link>{" "}
            to understand the quality of pest control work our team delivers
            every day, or check out our{" "}
            <Link
              href="/pricing"
              className="text-green-400 hover:text-green-300"
            >
              pricing page
            </Link>{" "}
            and{" "}
            <Link
              href="/services"
              className="text-green-400 hover:text-green-300"
            >
              full service directory
            </Link>{" "}
            to see the scope of extermination and pest management work we
            handle. You can also{" "}
            <Link
              href="/contact"
              className="text-green-400 hover:text-green-300"
            >
              contact us
            </Link>{" "}
            directly with any questions about pest control careers at{" "}
            {SITE_NAME}.
          </p>
        </div>
      </section>

      {/* How to Apply */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How to <span className="text-green-500">Apply</span> for
            Exterminator Jobs
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Applying for exterminator jobs and pest control positions at{" "}
            {SITE_NAME} is straightforward. We want to make it as easy as
            possible for qualified pest control professionals to join our team
            and start building their career.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-2xl font-bold text-green-400">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Submit Your Application
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Email your resume and a brief cover letter to{" "}
                <a
                  href={`mailto:${EMAIL}`}
                  className="text-green-400 hover:text-green-300"
                >
                  {EMAIL}
                </a>
                . Include the position title in the subject line. No formal
                resume? No problem &mdash; just tell us about your pest control
                experience, any exterminator certifications you hold, and why you
                want to join {SITE_NAME}. We review every application we
                receive.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-2xl font-bold text-green-400">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold">Phone Interview</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Our hiring team will contact you within 48 hours for a brief
                phone interview. We will discuss your pest control background,
                availability, preferred service territory, and career goals.
                This is also your chance to ask questions about the role, the
                team, compensation, and what it is like to be an exterminator at{" "}
                {SITE_NAME}.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-2xl font-bold text-green-400">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                In-Person Meeting & Offer
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Qualified candidates are invited for an in-person meeting at our
                NYC office. For experienced exterminators and pest control
                technicians, we may include a brief field assessment to evaluate
                technical skills. Successful candidates receive an offer within
                one week and can begin our paid training program immediately.
              </p>
            </div>
          </div>

          <p className="mt-10 text-center text-lg text-zinc-300">
            Ready to start your pest control career? Email{" "}
            <a
              href={`mailto:${EMAIL}`}
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
            to speak with our hiring team about exterminator jobs and pest
            control career opportunities at {SITE_NAME}.
          </p>
        </div>
      </section>

      <CareersCTA variant="mid" />

      {/* Neighborhood Job Pages Grid */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Exterminator Jobs by{" "}
            <span className="text-green-500">Neighborhood</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            We have pest control and exterminator job openings across the entire
            NYC metro area. Browse exterminator careers by neighborhood to find
            pest control positions near you. Each location page includes
            details about local pest control demand, neighborhood-specific pest
            challenges, available exterminator positions, and information about
            what it is like to work as a pest control professional in that area.
          </p>

          {Object.entries(neighborhoodsByRegion).map(
            ([region, neighborhoods]) => (
              <div key={region} className="mt-10">
                <h3 className="text-xl font-bold text-green-400">
                  {region} Exterminator Jobs
                </h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {neighborhoods.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/careers/${n.slug}-exterminator-jobs`}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-green-600 hover:text-green-400"
                    >
                      {n.name} Exterminator Jobs
                    </Link>
                  ))}
                </div>
              </div>
            )
          )}

          <p className="mt-12 text-lg text-zinc-300">
            Do not see your neighborhood listed? We are always expanding our
            pest control coverage area and hiring exterminators for new
            territories. Contact{" "}
            <a
              href={`mailto:${EMAIL}`}
              className="text-green-400 hover:text-green-300"
            >
              {EMAIL}
            </a>{" "}
            to ask about exterminator job availability in your area. We serve
            over {totalNeighborhoods} neighborhoods across NYC, NJ, Long
            Island, and Westchester, and there may be a pest control position
            opening near you very soon. You can also explore our{" "}
            <Link href="/areas" className="text-green-400 hover:text-green-300">
              full service area directory
            </Link>{" "}
            to see every neighborhood where our exterminators currently operate.
          </p>
        </div>
      </section>

      {/* Final SEO Content Block */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Build Your Career in{" "}
            <span className="text-green-500">NYC Pest Control</span>
          </h2>
          <div className="mt-6 max-w-4xl space-y-4 text-lg leading-8 text-zinc-300">
            <p>
              The pest control industry in New York City is one of the most
              stable, in-demand, and recession-resistant trades in the country.
              With millions of residents, hundreds of thousands of commercial
              properties, a vast restaurant and hospitality sector, and the
              unique pest pressures that come with the densest urban environment
              in America, NYC will always need skilled exterminators and pest
              control professionals. Rats, mice, cockroaches, bed bugs,
              termites, ants, spiders, and urban wildlife are permanent fixtures
              of the New York City landscape, and the demand for professional
              extermination services only continues to grow year over year.
            </p>
            <p>
              At {SITE_NAME}, we are at the center of that demand. Our{" "}
              <Link
                href="/services"
                className="text-green-400 hover:text-green-300"
              >
                pest control services
              </Link>{" "}
              span the full spectrum of residential and commercial
              extermination, from single-unit cockroach treatments and studio
              apartment bed bug heat remediation to building-wide pest
              management programs, restaurant rodent control contracts, and
              commercial warehouse integrated pest management plans. Our
              exterminators work in every type of property across every borough
              and surrounding region &mdash; which means our team members gain
              more diverse, hands-on pest control experience than they would at
              almost any other extermination company in the metro area.
            </p>
            <p>
              The Bureau of Labor Statistics projects continued growth for pest
              control workers nationwide, and the NYC metro area consistently
              ranks among the top markets for exterminator employment and pest
              control career opportunities. Starting salaries for licensed pest
              control technicians in New York City exceed national averages by
              a significant margin, and experienced exterminators with
              specialized certifications and leadership experience can earn
              substantially more. When you factor in the comprehensive benefits,
              paid training, company vehicle, and advancement opportunities we
              offer, a career at {SITE_NAME} is one of the best decisions you
              can make in the pest control profession.
            </p>
            <p>
              We encourage you to explore our open exterminator positions above,
              browse pest control jobs by neighborhood below, and{" "}
              <Link
                href="/contact"
                className="text-green-400 hover:text-green-300"
              >
                reach out to us
              </Link>{" "}
              with any questions about pest control careers at {SITE_NAME}. You
              can also learn more about our{" "}
              <Link
                href="/pricing"
                className="text-green-400 hover:text-green-300"
              >
                pricing approach
              </Link>{" "}
              to understand how we deliver value to customers, read our{" "}
              <Link
                href="/reviews"
                className="text-green-400 hover:text-green-300"
              >
                customer reviews
              </Link>{" "}
              to see the impact our pest control team makes every day, or visit
              our{" "}
              <Link
                href="/about"
                className="text-green-400 hover:text-green-300"
              >
                about page
              </Link>{" "}
              to understand the company, the mission, and the people behind the
              career opportunity. New York City needs great exterminators
              &mdash; and we are looking for you.
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
              Exterminator <span className="text-green-400">Career Application</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
              Fill out the form below to apply for a pest control position with The NYC Exterminator.
              No resume required &mdash; just tell us about yourself and we&apos;ll be in touch within 48 hours.
            </p>
          </div>
          <div className="mt-10 rounded-xl border border-white/[0.06] bg-[#141414] p-6 sm:p-8">
            <JobApplicationForm />
          </div>
        </div>
      </section>

      <CareersCTA variant="final" />
    </div>
  );
}
