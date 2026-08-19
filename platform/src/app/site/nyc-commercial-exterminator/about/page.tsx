import Link from "next/link";
import type { Metadata } from "next";
import { getAllServices, getAllNeighborhoods, getRegions } from "@/app/site/nyc-commercial-exterminator/_lib/data";
import Breadcrumbs from "@/app/site/nyc-commercial-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/nyc-commercial-exterminator/_components/CTAGroup";
import { PHONE, SITE_URL, EMAIL, ADDRESS, getBreadcrumbSchema, getLocalBusinessSchemaGlobal } from "@/app/site/nyc-commercial-exterminator/_lib/seo";

export const metadata: Metadata = {
  title: "About NYC Commercial Exterminator | Commercial Pest Control Company NYC",
  description:
    "NYC's commercial-only pest control & exterminator. $249/hr fully inclusive. Restaurants, offices, retail, warehouses, hotels, healthcare & property management across all 5 NYC boroughs, NJ, Long Island & Westchester. DOH-compliant. Licensed & insured. Text 212-202-8545.",
  keywords:
    "about NYC commercial exterminator, NYC commercial pest control company, licensed commercial exterminator NYC, insured commercial pest control, restaurant pest control NYC, Consortium NYC, commercial IPM NYC",
  openGraph: {
    title: "About NYC Commercial Exterminator | Commercial Pest Control Company NYC",
    description:
      "NYC's commercial-only pest control & exterminator. $249/hr fully inclusive. Restaurants, offices, retail, warehouses, hotels, healthcare & property management. DOH-compliant. Text 212-202-8545.",
    url: `${SITE_URL}/about`,
  },
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  const totalServices = getAllServices().length;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const regions = getRegions();
  const phonePlain = PHONE.replace(/-/g, "");

  const breadcrumbSchema = getBreadcrumbSchema([{ name: "About", url: "/about" }]);
  const localBusinessSchema = getLocalBusinessSchemaGlobal();

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />

      {/* ── Hero Section ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "About", url: "/about" }]} />

          <div className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              About NYC Commercial Exterminator
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              NYC&apos;s Commercial Pests
              <br />
              <span className="text-[#EFF70A]">Don&apos;t Stand a Chance.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              NYC Commercial Exterminator is a{" "}
              <a
                href="https://www.consortiumnyc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                Consortium NYC
              </a>{" "}
              company &mdash; commercial-only pest control built around the
              realities NYC operators actually face: NYC DOH inspections,
              corporate audits, after-hours service windows, and pest pressure
              that never lets up. We provide commercial pest control and
              extermination services across{" "}
              <Link href="/areas" className="text-green-400 hover:text-green-300">
                {totalNeighborhoods}+ neighborhoods
              </Link>{" "}
              in NYC, NJ, Long Island &amp; Westchester.
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              Our licensed commercial exterminators handle everything from{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link>{" "}
              and{" "}
              <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">commercial bed bug treatment</Link>{" "}
              to{" "}
              <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link>,{" "}
              <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mouse extermination</Link>, fly remediation,
              <Link href="/termite-treatment" className="text-green-400 hover:text-green-300"> termite treatment</Link>, and dozens of other commercial pest services.
              Whether you run a restaurant in Manhattan, manage a multi-tenant
              retail center in Brooklyn, operate a warehouse in Queens, or
              oversee a hotel portfolio across the metro &mdash; our commercial
              exterminator team is ready to protect your operation at $249/hour
              flat, fully inclusive.
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              Every NYC commercial operator deserves a vendor that ships
              documentation same-day, dispatches before a health inspection, and
              doesn&apos;t hide behind contracts. That&apos;s why we&apos;ve
              built the most comprehensive commercial pest control network in
              the NYC metro area &mdash; all five boroughs, Northern New Jersey,
              Long Island, and Westchester County. Available seven days a week
              with same-day emergency service for urgent commercial situations.
              When pests threaten your operation, NYC Commercial Exterminator is
              the name to call.
            </p>

            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* ── Our Story ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our <span className="text-green-500">Story</span>
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-lg leading-8 text-zinc-300">
            <p>
              NYC Commercial Exterminator was founded with a focused mission: deliver professional commercial pest control to NYC&apos;s
              restaurant operators, retail chains, hotel groups, office managers, warehouse operations, healthcare facilities, and
              property management companies &mdash; without the contracts, hidden fees, and audit-failing documentation gaps that
              define the rest of the industry. We saw too many commercial operators paying inflated monthly retainers for
              inconsistent service from companies that ghosted them before health inspections. We built our entire model around
              transparent{" "}
              <Link href="/pricing" className="text-green-400 hover:text-green-300">$249/hour flat &mdash; fully inclusive</Link>{" "}
              pricing &mdash; no hidden fees, no bait-and-switch tactics, no unnecessary upselling. From day one, our focus has been
              accessible, accountable commercial pest control: from a single-location cafe to a 50-unit restaurant group.
            </p>
            <p>
              As a{" "}
              <a
                href="https://www.consortiumnyc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                Consortium NYC
              </a>{" "}
              company, NYC Commercial Exterminator benefits from a deep bench of NYC service-industry experience. Consortium NYC has
              spent years building and operating commercial service businesses across the New York metro &mdash; experience that
              informs everything we do, from how we train commercial exterminator technicians to how we structure{" "}
              <Link href="/pricing" className="text-green-400 hover:text-green-300">pricing</Link>, scheduling, and inspection-ready
              reporting. We understand that when a restaurant manager, hotel ops director, or facilities lead calls a commercial
              exterminator, the clock is usually already ticking. That&apos;s why we built our operation around speed, reliability,
              and same-day documentation. Reach out and you speak to a real person, get a straightforward quote, and have a licensed
              commercial pest control technician on site &mdash; usually the same day.
            </p>
            <p>
              What started as a small team serving Manhattan and Brooklyn restaurants and offices has grown into the most
              comprehensive commercial pest control network in the NYC metro area. Today we provide{" "}
              <Link href="/services" className="text-green-400 hover:text-green-300">{totalServices}+ commercial pest control services</Link>{" "}
              across{" "}
              <Link href="/areas" className="text-green-400 hover:text-green-300">{totalNeighborhoods}+ neighborhoods</Link>{" "}
              spanning all five boroughs, Northern New Jersey, Long Island, and Westchester County. We&apos;ve assembled a roster of
              licensed commercial exterminators who specialize in every urban commercial pest scenario &mdash; from cockroaches in
              restaurant kitchens to bed bugs in hospitality, rodents in warehouses and retail, flies at commissaries, and
              commercial-grade IPM programs for property managers. Every team member is NYS DEC certified and carries the
              credentials, insurance, and on-the-ground commercial experience to handle even severe pest pressure.
            </p>
            <p>
              Our growth has been driven entirely by results and reputation. No gimmicks, no high-pressure sales tactics, no
              long-term lock-in contracts. Our{" "}
              <Link href="/reviews" className="text-green-400 hover:text-green-300">customer reviews</Link>{" "}
              reflect the care and professionalism we bring to every commercial job &mdash; whether it&apos;s a routine monthly IPM
              visit to a Class A office or an emergency{" "}
              <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">commercial rat extermination</Link>{" "}
              call at a restaurant 36 hours before a DOH inspection. Word-of-mouth referrals from operators, restaurant groups, and
              property management portfolios remain our single biggest source of new business.
            </p>
            <p>
              Looking ahead, our mission stays the same: be the most trusted, most accountable, and most effective commercial pest
              control provider in the NYC metro area. We&apos;re continually investing in IPM training, application technology, and
              expanded service hours to ensure that no matter where your operation is in the NYC metro region, a licensed commercial
              exterminator from NYC Commercial Exterminator is a text away. If your operation has a pest problem, we want to be the
              first and last commercial exterminator you ever need to call. Reach us anytime at{" "}
              <a href={`tel:${phonePlain}`} className="text-green-400 hover:text-green-300">{PHONE}</a> or{" "}
              <Link href="/schedule-service" className="text-green-400 hover:text-green-300">request a free quote online</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── What Sets Us Apart ── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Sets Us <span className="text-green-500">Apart</span>
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Licensed & Certified", desc: "Every technician holds NYS DEC Commercial Pesticide Applicator licenses. Wildlife operators hold additional DEC Nuisance Wildlife Control licenses." },
              { title: "Full Insurance Coverage", desc: "We carry comprehensive general liability insurance on every job. Your property is protected." },
              { title: "Upfront Pricing", desc: "Free inspections. Written quotes before any work begins. No hidden fees, no surprises, no upselling." },
              { title: "Same-Day Emergency Service", desc: "Pest emergencies don't wait for business hours. We offer same-day and after-hours service for urgent situations." },
              { title: "Guaranteed Results", desc: "We stand behind our work. If pests return between scheduled treatments, we come back at no charge." },
              { title: "EPA-Approved Methods", desc: "We use EPA-approved products with targeted application methods. Safe for staff, customers, sensitive populations, and the environment." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 max-w-4xl space-y-8 text-lg leading-8 text-zinc-300">
            <div>
              <h3 className="mb-3 text-xl font-bold text-green-400">Licensed &amp; Certified Exterminators You Can Trust</h3>
              <p>
                Licensing is not optional in the pest control industry &mdash; it is a legal requirement and a critical safeguard for property
                owners. Every exterminator on our team holds a valid New York State Department of Environmental Conservation (NYS DEC) Commercial
                Pesticide Applicator license, which requires passing rigorous examinations on pesticide safety, application techniques, pest
                biology, and environmental regulations. Our wildlife control specialists carry additional DEC Nuisance Wildlife Control Operator
                permits, authorizing them to handle raccoons, squirrels, opossums, and other wildlife that frequently invade NYC properties.
                We verify every credential before a technician is assigned to a single job, and we maintain up-to-date records of all certifications
                and continuing education credits. When you hire NYC Commercial Exterminator, you are hiring a pest control company that takes licensing
                and professional standards as seriously as you do. You can verify our credentials at any time by contacting us at{" "}
                <a href={`mailto:${EMAIL}`} className="text-green-400 hover:text-green-300">{EMAIL}</a>.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-green-400">Full Insurance Coverage on Every Job</h3>
              <p>
                Pest control work involves chemicals, specialized equipment, and access to every corner of your property. Without proper insurance,
                a single accident could leave you responsible for costly repairs or medical bills. NYC Commercial Exterminator carries comprehensive
                general liability insurance on every job we perform, protecting your property and giving you complete peace of mind. Our insurance
                covers damage to structures, furnishings, and personal property, as well as any injuries that might occur on-site. We also carry
                workers&apos; compensation insurance for all of our pest control technicians. Many landlords, property managers, and{" "}
                <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial property owners</Link>{" "}
                require proof of insurance before allowing an exterminator on their premises &mdash; we provide certificates of insurance promptly
                upon request, often within the same business day.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-green-400">Upfront, Transparent Pest Control Pricing</h3>
              <p>
                One of the most common complaints about pest control companies is surprise charges. A technician shows up, quotes one price, and
                then tacks on fees for &quot;extra treatment areas,&quot; &quot;premium products,&quot; or &quot;follow-up visits&quot; that were
                never discussed. At NYC Commercial Exterminator, we do things differently. Every pest control job begins with a free inspection, during
                which our exterminator assesses the scope of the infestation, identifies the pest species involved, and provides a written quote
                that covers the full cost of treatment. The price you are quoted is the price you pay &mdash; period. We publish our{" "}
                <Link href="/pricing" className="text-green-400 hover:text-green-300">pricing information</Link>{" "}
                openly, with services $249/hour flat — fully inclusive, because we believe informed customers are happy customers. No hidden fees, no
                surprises, no pressure to purchase services you do not need.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-green-400">Same-Day Emergency Exterminator Service</h3>
              <p>
                Pest emergencies do not follow a convenient schedule. A rat sighting in your{" "}
                <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant kitchen</Link>{" "}
                at 6 PM on a Friday, a bed bug discovery the night before guests arrive, a wasp nest blocking your building&apos;s entrance
                &mdash; these situations demand immediate attention. NYC Commercial Exterminator offers same-day and after-hours emergency pest control
                service for exactly these kinds of urgent situations. When you call or text us at{" "}
                <a href={`sms:${phonePlain}`} className="text-green-400 hover:text-green-300">{PHONE}</a>,
                we will dispatch a licensed exterminator to your location as quickly as possible, often within hours of your initial contact.
                Our emergency pest control service is available across all of our{" "}
                <Link href="/areas" className="text-green-400 hover:text-green-300">service areas</Link>,
                including all five NYC boroughs, Northern New Jersey, Long Island, and Westchester.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-green-400">Guaranteed Pest Control Results</h3>
              <p>
                We stand behind every treatment we perform. If pests return between your scheduled pest control treatments, we come back and
                re-treat your property at absolutely no additional charge. Our guarantee reflects our confidence in the quality of our
                extermination work and our commitment to long-term pest elimination rather than quick, temporary fixes. We do not consider a
                job complete until the infestation is fully resolved and you are completely satisfied with the results. This guarantee applies
                to all of our{" "}
                <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control</Link>{" "}
                services, from{" "}
                <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link>{" "}
                and{" "}
                <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link>{" "}
                to{" "}
                <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">termite treatment</Link>{" "}
                and rodent control. Read what our customers say about our results on our{" "}
                <Link href="/reviews" className="text-green-400 hover:text-green-300">reviews page</Link>.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-green-400">EPA-Approved Pest Control Products and Methods</h3>
              <p>
                The safety of your staff, customers, sensitive populations, and the environment is paramount. Every product we use in our pest control treatments is
                EPA-approved and applied according to strict manufacturer guidelines and New York State regulations. We employ targeted
                application methods that deliver maximum effectiveness against pests while minimizing exposure to occupants and non-target
                organisms. Our exterminators are trained in Integrated Pest Management (IPM) principles, which emphasize using the least
                toxic effective treatment for every situation. When chemical treatment is necessary, we use professional-grade products that
                are not available to consumers &mdash; formulations that are more effective at lower concentrations than anything you can buy
                at a hardware store. Learn more about our approach on our{" "}
                <Link href="/services" className="text-green-400 hover:text-green-300">services page</Link>{" "}
                or check our{" "}
                <Link href="/faq" className="text-green-400 hover:text-green-300">FAQ</Link>{" "}
                for answers to common questions about pest control safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Pest Control Team ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our Pest Control <span className="text-green-500">Team</span>
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-lg leading-8 text-zinc-300">
            <p>
              The backbone of NYC Commercial Exterminator is our team of licensed, experienced pest control professionals. Every exterminator
              on our roster has been carefully vetted, trained, and certified to handle the full spectrum of pest challenges that New York
              City properties face. Our hiring process goes beyond simply checking for a valid NYS DEC Commercial Pesticide Applicator license.
              We evaluate each candidate&apos;s field experience, problem-solving ability, customer communication skills, and commitment to
              safety and professionalism. We believe that a great exterminator is not just someone who can apply pesticide &mdash; it is
              someone who can diagnose the root cause of an infestation, develop a targeted treatment plan, communicate clearly with the
              property owner, and follow through until the pest problem is completely resolved.
            </p>
            <p>
              Ongoing training is a cornerstone of our pest control operation. The pest control industry is constantly evolving &mdash; new
              pest species emerge, resistance patterns shift, regulations change, and new treatment technologies become available. Our
              exterminators participate in regular continuing education programs covering advanced IPM techniques, new product formulations,
              safety protocols, and species-specific treatment strategies. We hold monthly team training sessions where our pest control
              technicians share field observations, discuss challenging cases, and learn from each other&apos;s experiences. This culture of
              continuous learning ensures that when a NYC Exterminator technician arrives at your property, they bring the most current
              knowledge and the most effective techniques available in the pest control industry.
            </p>
            <p>
              Our team includes specialists in every major area of pest control. We have dedicated{" "}
              <Link href="/cockroach-extermination" className="text-green-400 hover:text-green-300">cockroach extermination</Link>{" "}
              experts who understand the behavior patterns, harborage preferences, and treatment protocols for German cockroaches, American
              cockroaches, and Oriental cockroaches. Our{" "}
              <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bug treatment</Link>{" "}
              specialists are trained in both chemical and heat treatment methodologies, allowing us to tailor our approach to each unique
              situation. Our rodent control team handles{" "}
              <Link href="/rat-extermination" className="text-green-400 hover:text-green-300">rat extermination</Link>{" "}
              and{" "}
              <Link href="/mouse-extermination" className="text-green-400 hover:text-green-300">mouse extermination</Link>{" "}
              with a focus on exclusion and long-term prevention, not just trapping. And our wildlife specialists hold DEC Nuisance Wildlife
              Control Operator licenses, enabling them to legally and humanely remove raccoons, squirrels, birds, and other wildlife from
              commercial properties throughout the NYC metro area.
            </p>
            <p>
              For our{" "}
              <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control</Link>{" "}
              clients, we assign dedicated commercial account managers who serve as the single point of contact for all pest control needs.
              These managers develop customized pest management programs for each facility, coordinate scheduling to minimize disruption to
              business operations, maintain detailed treatment records for health department inspections, and provide regular reporting on
              pest activity trends. Our{" "}
              <Link href="/restaurant-pest-control" className="text-green-400 hover:text-green-300">restaurant pest control</Link>{" "}
              program, in particular, is designed to meet the stringent requirements of NYC Department of Health inspections, helping restaurant
              owners maintain clean inspection records and protect their reputations. We understand that for commercial clients, pest control
              is not just about comfort &mdash; it is about compliance, liability, and business continuity.
            </p>
            <p>
              We are always looking for talented, motivated individuals to join our growing pest control team. If you are a licensed
              exterminator or pest control technician looking for a rewarding career with a company that values professionalism, training,
              and customer satisfaction, we encourage you to visit our{" "}
              <Link href="/careers" className="text-green-400 hover:text-green-300">careers page</Link>{" "}
              to learn about current opportunities. NYC Commercial Exterminator offers competitive compensation, ongoing professional development,
              and the chance to be part of the most comprehensive pest control network in the New York City metro area.
            </p>
          </div>
        </div>
      </section>

      <CTAGroup variant="mid" />

      {/* ── Our Approach to Pest Control ── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our Approach to <span className="text-green-500">Pest Control</span>
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-lg leading-8 text-zinc-300">
            <p>
              At NYC Commercial Exterminator, we follow an Integrated Pest Management (IPM) methodology that represents the gold standard
              in modern pest control. IPM is a science-based approach that combines biological knowledge, environmental awareness,
              and targeted treatment strategies to achieve lasting pest elimination with minimal environmental impact. Rather than
              simply spraying chemicals and hoping for the best, our exterminators begin every job with a thorough inspection and
              root cause analysis. We identify the pest species, determine how they are entering your property, locate their nesting
              and harborage sites, and assess the environmental conditions that are supporting the infestation. Only after this
              comprehensive assessment do we develop a treatment plan &mdash; and that plan always starts with the least invasive,
              most targeted methods available.
            </p>
            <p>
              Root cause analysis is what separates effective pest control from temporary pest suppression. Many pest control companies
              will treat the visible symptoms of an infestation &mdash; killing the cockroaches you can see, trapping the mice that
              are running across your kitchen floor &mdash; without addressing the underlying conditions that caused the infestation
              in the first place. At NYC Commercial Exterminator, we take a different approach. Our exterminators are trained to identify
              entry points, moisture sources, food attractants, structural vulnerabilities, and sanitation issues that are contributing
              to your pest problem. We then provide detailed recommendations for addressing these root causes, which may include sealing
              cracks and gaps, fixing plumbing leaks, improving waste management practices, or modifying landscaping. By addressing
              the root cause, we help ensure that pests do not simply return after treatment &mdash; a common frustration with
              lower-quality pest control services.
            </p>
            <p>
              When chemical treatment is warranted, we use only EPA-approved products applied with precision and care. Our pest control
              technicians are trained in targeted application methods that deliver the active ingredient directly to pest harborage
              areas and entry points, maximizing effectiveness while minimizing exposure to building occupants and pets. We use
              professional-grade gel baits, crack-and-crevice treatments, micro-encapsulated formulations, and dust applications
              that are far more effective and far safer than the consumer-grade sprays and foggers available at retail stores. For
              certain pest situations, we also offer non-chemical alternatives including heat treatment for{" "}
              <Link href="/bed-bug-treatment" className="text-green-400 hover:text-green-300">bed bugs</Link>,
              exclusion work for rodents and wildlife, and mechanical trapping programs. Our goal is always to use the right tool
              for the job &mdash; not the most expensive one.
            </p>
            <p>
              Every pest control treatment we perform includes a detailed service report that documents our findings, the treatments
              applied, the products used, and our recommendations for preventing future infestations. For{" "}
              <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial clients</Link>,
              these reports serve as essential documentation for health department compliance and audit readiness. For commercial multi-tenant
              customers, they provide a clear record of what was done and what to expect going forward. We also schedule follow-up
              visits as needed to monitor treatment effectiveness and make adjustments to the pest management plan. Our approach
              is not a one-and-done spray treatment &mdash; it is a comprehensive, ongoing pest management program designed to keep
              your property pest-free for the long term. Browse our full range of{" "}
              <Link href="/services" className="text-green-400 hover:text-green-300">pest control services</Link>{" "}
              or visit our{" "}
              <Link href="/faq" className="text-green-400 hover:text-green-300">FAQ page</Link>{" "}
              to learn more about our treatment process.
            </p>
          </div>
        </div>
      </section>

      {/* ── Service Areas ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our <span className="text-green-500">Service Areas</span>
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-lg leading-8 text-zinc-300">
            <p>
              NYC Commercial Exterminator provides professional pest control and extermination services across eight distinct regions
              in the New York City metropolitan area. Our coverage spans all five NYC boroughs &mdash; Manhattan, Brooklyn, Queens,
              the Bronx, and Staten Island &mdash; as well as Northern New Jersey, Long Island, and Westchester County. In total,
              our exterminators serve{" "}
              <Link href="/areas" className="text-green-400 hover:text-green-300">{totalNeighborhoods}+ neighborhoods</Link>,
              making us one of the most geographically comprehensive pest control providers in the region. No matter where your
              property is located within the NYC metro area, a licensed exterminator from NYC Commercial Exterminator can reach you quickly,
              often providing same-day service for emergency pest situations.
            </p>
            <p>
              Each region in our service area presents unique pest control challenges. Manhattan&apos;s dense high-rise environment
              creates ideal conditions for cockroach infestations and rodent activity in shared walls and utility chases. Brooklyn&apos;s
              mix of brownstones, rowhouses, and newer developments requires flexible treatment strategies that account for varying
              construction types and pest entry points. Queens, the most ethnically diverse urban area in the world, demands
              exterminators who can communicate effectively with residents from every background and adapt to the wide range of
              building styles found across the borough. The Bronx presents significant rodent control challenges, particularly in
              older commercial buildings and near parks and waterways. Staten Island&apos;s more suburban character brings wildlife
              concerns &mdash; raccoons, squirrels, and other animals &mdash; alongside the standard urban pest issues.
            </p>
            <p>
              Beyond the five boroughs, our New Jersey pest control team serves communities across Bergen, Hudson, Essex, Passaic,
              and Union counties, providing the same licensed, insured, professional commercial extermination services that NYC operators rely on.
              Our Long Island commercial exterminators cover Nassau and Suffolk counties, where{" "}
              <Link href="/termite-treatment" className="text-green-400 hover:text-green-300">commercial termite treatment</Link>{" "}
              is a particularly important service for operators with wood-frame construction. And our Westchester team brings
              comprehensive commercial pest control to communities from Yonkers to White Plains and beyond, handling restaurant IPM,{" "}
              <Link href="/commercial-pest-control" className="text-green-400 hover:text-green-300">commercial pest control</Link>{" "}
              for offices, warehouses, and retail spaces, hotel hospitality programs, and property management portfolios.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <Link
                key={region}
                href="/areas"
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 text-center font-semibold text-white transition-colors hover:border-green-500 hover:bg-zinc-800"
              >
                {region}
              </Link>
            ))}
          </div>

          <p className="mt-8 text-center text-zinc-400">
            <Link href="/areas" className="text-green-400 hover:text-green-300">
              View all {totalNeighborhoods}+ neighborhoods we serve &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* ── Our Commitment to the Community ── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our Commitment to the <span className="text-green-500">Community</span>
          </h2>

          <div className="mt-8 max-w-4xl space-y-6 text-lg leading-8 text-zinc-300">
            <p>
              New York City is the most diverse city on the planet, and NYC Commercial Exterminator is proud to serve every corner of it.
              From the tight-knit communities of Washington Heights and Astoria to the bustling commercial corridors of Midtown and
              Downtown Brooklyn, our pest control services reach residents and business owners of every background, in every type of
              property, across every neighborhood. We treat every home and every business with the same level of professionalism,
              respect, and care &mdash; whether it is a family-owned bodega, an independent restaurant, a property-managed retail center, or a
              corporate office tower. Every property owner in the NYC metro area deserves professional pest control, and we are
              committed to making that a reality.
            </p>
            <p>
              Affordability is central to our commitment to the community. We know that pest control costs can be a real burden,
              especially for small business owners already dealing with New York&apos;s high cost of doing business. That is why
              we have structured our{" "}
              <Link href="/pricing" className="text-green-400 hover:text-green-300">pricing</Link>{" "}
              to land at $249/hour flat — fully inclusive &mdash; making professional exterminator services accessible to businesses at every
              size and budget. We offer free inspections and free quotes on every job, so you never have to commit to a purchase before
              you know exactly what you are getting. We also offer flexible scheduling, including evenings and weekends, because we
              understand that not every operator can shut down during business hours to wait for an exterminator. Our goal is to remove every barrier
              that might prevent a business from getting the pest control help it needs.
            </p>
            <p>
              Beyond pricing, our commitment to the community shows up in how we conduct ourselves on every job. Our exterminators
              are trained to be courteous, respectful, and minimally disruptive. We wear shoe covers to protect your floors. We move
              furniture carefully and put it back when we are done. We explain everything we are doing and why, so you are never left
              wondering what products were applied at your facility. We clean up after ourselves and leave your property looking better
              than we found it. These may seem like small things, but they add up to an experience that is fundamentally different from
              the impersonal, in-and-out approach that characterizes too many pest control companies in the NYC market.
            </p>
            <p>
              We also believe in educating our community about pest prevention. Through our{" "}
              <Link href="/faq" className="text-green-400 hover:text-green-300">FAQ page</Link>,
              our service consultations, and our follow-up communications, we share practical tips and knowledge that help property
              owners reduce their risk of future infestations. Simple steps like proper food storage, regular cleaning of drain lines,
              sealing gaps around pipes and utility entries, and maintaining clean exterior areas can dramatically reduce pest pressure
              on a property. We believe that an informed community is a healthier community, and we are happy to share our expertise
              with anyone who asks &mdash; whether or not they are a paying customer. If you have questions about pest control, pest
              prevention, or anything related to keeping your NYC property pest-free, do not hesitate to reach out to us at{" "}
              <a href={`tel:${phonePlain}`} className="text-green-400 hover:text-green-300">{PHONE}</a>{" "}
              or{" "}
              <a href={`mailto:${EMAIL}`} className="text-green-400 hover:text-green-300">{EMAIL}</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="bg-[#2A2A2A] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: `${totalServices}+`, label: "Pest Services" },
              { value: `${totalNeighborhoods}+`, label: "Neighborhoods Served" },
              { value: "8", label: "Regions Covered" },
              { value: "24/7", label: "Emergency Service" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-green-500">{stat.value}</p>
                <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
