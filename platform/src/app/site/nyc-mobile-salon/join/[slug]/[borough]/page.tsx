// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allServices, womensCategories, neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getServiceBySlug, getServiceBoroughParams, getBoroughName, faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";

export const revalidate = 2592000;

/* ── helpers ─────────────────────────────────────────────────────── */

const womensServiceSlugs = new Set(
  womensCategories.flatMap((c) => c.services.map((s) => s.slug))
);

function isWomensService(slug: string) {
  return womensServiceSlugs.has(slug);
}

const boroughDescriptions: Record<string, string> = {
  manhattan:
    "Manhattan is the epicenter of fashion, media, and finance. From the Upper East Side to the Financial District, demand for mobile beauty professionals is relentless year-round. Corporate headshot sessions in Midtown, bridal glam in Tribeca, and weekend blowouts in the West Village keep our Manhattan team fully booked.",
  brooklyn:
    "Brooklyn is one of the most diverse and fast-growing boroughs in the city. Neighborhoods like Williamsburg, Park Slope, and DUMBO are filled with busy professionals, young families, and creatives who prefer the convenience of having a licensed beauty pro come to them. From brownstone living rooms in Bed-Stuy to loft apartments in Bushwick, Brooklyn clients are loyal and consistent.",
  queens:
    "Queens is the most ethnically diverse urban area in the world, and that diversity creates incredible demand for beauty professionals who can work with every hair type, skin tone, and cultural tradition. From Astoria to Flushing to Jamaica, Queens clients appreciate mobile beauty services that save them time without sacrificing quality.",
  bronx:
    "The Bronx is a borough on the rise, with growing neighborhoods and a community that deeply values personal grooming and self-care. From Riverdale to Mott Haven, demand for mobile beauty services is climbing as more residents discover the convenience of having a licensed professional come to their home.",
  "staten-island":
    "Staten Island offers a unique market for mobile beauty professionals. With fewer brick-and-mortar salons per capita than any other borough, the demand for mobile services is exceptionally high. Neighborhoods from St. George to Tottenville are underserved, which means less competition and more loyal, repeat clients for our team.",
};

const boroughHighlightNeighborhoods: Record<string, string[]> = {
  manhattan: ["Upper East Side", "Midtown", "SoHo", "Tribeca", "West Village", "Harlem"],
  brooklyn: ["Williamsburg", "Park Slope", "DUMBO", "Crown Heights", "Bed-Stuy", "Fort Greene"],
  queens: ["Astoria", "Long Island City", "Flushing", "Forest Hills", "Jackson Heights", "Bayside"],
  bronx: ["Riverdale", "Fordham", "Pelham Bay", "Mott Haven", "Concourse", "Kingsbridge"],
  "staten-island": ["St. George", "Tottenville", "Great Kills", "New Dorp", "Todt Hill", "West Brighton"],
};

/* ── static params ───────────────────────────────────────────────── */

export const dynamicParams = true

export async function generateStaticParams() { return [] }

/* ── metadata ────────────────────────────────────────────────────── */

type PageProps = { params: Promise<{ slug: string; borough: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, borough } = await params;
  const service = getServiceBySlug(slug);
  const boroughName = getBoroughName(borough);
  if (!service || !boroughName) return {};

  const title = `Mobile ${service.name} Jobs in ${boroughName} — $49+/hr | Join The NYC Mobile Salon`;
  const description = `Now hiring licensed ${service.name.toLowerCase()} professionals in ${boroughName}. Earn $49+/hour, set your own schedule, no booth rental fees, paid via Zelle or Apple Cash within 30 minutes of job completion, insurance included. Apply today.`;

  return {
    title,
    description,
    alternates: { canonical: `https://thenycmobilesalon.com/join/${slug}/${borough}` },
    openGraph: {
      title,
      description,
      url: `https://thenycmobilesalon.com/join/${slug}/${borough}`,
      siteName: "The NYC Mobile Salon",
      type: "website",
    },
  };
}

/* ── page ─────────────────────────────────────────────────────────── */

export default async function JoinServiceBoroughPage({ params }: PageProps) {
  const { slug, borough } = await params;
  const service = getServiceBySlug(slug);
  const boroughName = getBoroughName(borough);
  if (!service || !boroughName) notFound();

  const womens = isWomensService(slug);
  const content = serviceContent[slug];
  const hoods = neighborhoods[borough] ?? [];
  const highlightHoods = boroughHighlightNeighborhoods[borough] ?? [];
  const otherBoroughs = Object.entries(boroughNames).filter(([k]) => k !== borough);

  const heroGradient = womens
    ? "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)"
    : "linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)";

  const accentColor = womens ? "purple" : "slate";
  const accentText = womens ? "text-purple-600" : "text-slate-700";
  const accentBg = womens ? "bg-purple-600" : "bg-slate-800";
  const accentBorder = womens ? "border-purple-100" : "border-slate-200";
  const accentBgLight = womens ? "bg-purple-50/50" : "bg-slate-50";
  const accentBgPill = womens ? "bg-purple-50" : "bg-slate-100";
  const accentHover = womens
    ? "hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
    : "hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800";
  const ctaGradient = womens
    ? "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)"
    : "linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)";

  /* ── what you'll do bullets ── */
  const whatYoullDo = content
    ? content.includes.map((item) => item)
    : [
        `Deliver professional ${service.name.toLowerCase()} services at client homes and venues across ${boroughName}`,
        "Set up your mobile station and provide a full salon-quality experience on location",
        "Consult with each client on their desired look before every appointment",
        "Maintain the highest standards of sanitation and professionalism",
        "Manage your own schedule and accept bookings that fit your availability",
        "Build a loyal base of repeat clients in your preferred neighborhoods",
      ];

  /* ── FAQ ── */
  const faqs = [
    {
      q: `How much can I earn doing ${service.name.toLowerCase()} in ${boroughName}?`,
      a: `Our ${service.name.toLowerCase()} professionals in ${boroughName} earn $49 or more per hour. Depending on how many hours you work per week, that translates to $490 to $1,960 or more per week. There are no booth rental fees, no product charges, and tips are 100% yours on top of your hourly rate. Payment is sent via Zelle or Apple Cash within 30 minutes of job completion.`,
    },
    {
      q: `What neighborhoods in ${boroughName} have the highest demand for ${service.name.toLowerCase()}?`,
      a: `Right now, we are seeing strong demand for ${service.name.toLowerCase()} in ${highlightHoods.slice(0, 4).join(", ")}, and surrounding areas. However, demand shifts seasonally and we are actively growing our client base across all ${boroughName} neighborhoods. The more neighborhoods you are willing to serve, the more bookings you will receive.`,
    },
    {
      q: `Do I need to live in ${boroughName} to work there?`,
      a: `No. You can live anywhere in the New York City area and choose ${boroughName} as part of your service area during onboarding. Many of our professionals serve multiple boroughs. You select the neighborhoods where you are willing to travel, and our platform matches you with nearby clients.`,
    },
    {
      q: `What license do I need to do mobile ${service.name.toLowerCase()} in ${boroughName}?`,
      a: `You must hold a valid New York State cosmetology, barbering, esthetics, or nail specialty license, depending on your service category. We verify every license before onboarding and conduct periodic checks to ensure ongoing compliance. If your license is currently active and in good standing, you are eligible to apply.`,
    },
    {
      q: `How quickly can I start getting bookings in ${boroughName}?`,
      a: `Most professionals begin receiving bookings within their first week after onboarding. The application process typically takes less than one week from initial email to first appointment. We review applications within 48 hours, verify your license, conduct a brief phone interview, and then activate your profile on our platform.`,
    },
  ];

  return (
    <>
      {/* ── JSON-LD ────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: `Mobile ${service.name} Professional — ${boroughName}, NYC`,
            description: `Join The NYC Mobile Salon as a licensed mobile ${service.name.toLowerCase()} professional in ${boroughName}. Earn $49+/hour, set your own schedule, no booth rental fees, paid via Zelle or Apple Cash within 30 minutes of job completion, liability insurance included.`,
            identifier: {
              "@type": "PropertyValue",
              name: "The NYC Mobile Salon",
              value: `nycms-${slug}-${borough}`,
            },
            datePosted: new Date().toISOString().split("T")[0],
            validThrough: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
            employmentType: ["FULL_TIME", "PART_TIME"],
            hiringOrganization: {
              "@type": "Organization",
              name: "The NYC Mobile Salon",
              sameAs: "https://thenycmobilesalon.com",
              logo: "https://thenycmobilesalon.com/logo.png",
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                streetAddress: "150 W 47th St",
                addressLocality: boroughName,
                addressRegion: "NY",
                postalCode: "10036",
                addressCountry: "US",
              },
            },
            applicantLocationRequirements: {
              "@type": "City",
              name: "New York",
            },
            baseSalary: {
              "@type": "MonetaryAmount",
              currency: "USD",
              value: {
                "@type": "QuantitativeValue",
                value: 49,
                minValue: 49,
                maxValue: 100,
                unitText: "HOUR",
              },
            },
            directApply: true,
            experienceRequirements: {
              "@type": "OccupationalExperienceRequirements",
              monthsOfExperience: 24,
            },
            qualifications:
              "Valid New York State cosmetology, barbering, esthetics, or nail specialty license required",
            jobBenefits:
              "Flexible schedule, no booth rental fees, liability insurance included, paid via Zelle or Apple Cash within 30 minutes of job completion, bonus programs, ongoing training",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema(faqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Join Our Team", url: "/join" },
              { name: `${service.name} Jobs`, url: `/join/${slug}` },
              { name: boroughName, url: `/join/${slug}/${borough}` },
            ])
          ),
        }}
      />

      {/* ── 1. Hero ────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{ background: heroGradient }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          {/* breadcrumb */}
          <nav className="mb-6 flex items-center justify-center gap-2 text-sm text-white/70">
            <Link href="/join" className="hover:text-white transition">
              Join
            </Link>
            <span>/</span>
            <Link href={`/join/${slug}`} className="hover:text-white transition">
              {service.name} Jobs
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{boroughName}</span>
          </nav>

          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            Now Hiring in {boroughName}
          </span>

          <h1 className="mb-6 font-display text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
            {service.name} Jobs in&nbsp;{boroughName}
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
            Earn $49+ per hour as a licensed mobile {service.name.toLowerCase()} professional in {boroughName}. Set your own schedule, keep more of what you earn, and build a loyal client base across {hoods.length} neighborhoods. No booth rental fees, ever.
          </p>

          <Link
            href="/join/application"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold shadow-lg transition hover:bg-white/90"
            style={{ color: womens ? "#7C3AED" : "#1E293B" }}
          >
            Apply Now
          </Link>
        </div>
      </section>

      {/* ── 2. Job Description ─────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 text-center text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            The Opportunity
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Mobile {service.name} in {boroughName}
          </h3>

          <div className="space-y-5 text-slate-600 leading-relaxed">
            <p>
              The NYC Mobile Salon is actively hiring licensed {service.name.toLowerCase()} professionals to serve clients across {boroughName}. As a mobile {service.name.toLowerCase()} specialist on our team, you will deliver salon-quality {service.name.toLowerCase()} services directly to clients in their homes, offices, hotels, and event venues throughout the borough. Every appointment you complete earns you $49 or more per hour, with no booth rental fees, no product charges, and no hidden deductions from your paycheck.
            </p>

            <p>
              {boroughDescriptions[borough] ?? `${boroughName} is one of the most dynamic boroughs in New York City, with strong and growing demand for mobile beauty services. Clients across ${boroughName} are looking for licensed professionals who can deliver exceptional ${service.name.toLowerCase()} services without the salon commute.`}
            </p>

            <p>
              {content
                ? `Your expertise in ${service.name.toLowerCase()} is exactly what ${boroughName} clients are looking for. ${content.intro} Whether you are working in ${highlightHoods.slice(0, 3).join(", ")}, or any other neighborhood in the borough, our platform connects you with clients who need your specific skills and are ready to book.`
                : `Whether you are serving clients in ${highlightHoods.slice(0, 3).join(", ")}, or any other ${boroughName} neighborhood, our platform ensures a steady stream of bookings so you can focus on your craft. We handle the marketing, scheduling, payment processing, and customer support — you handle what you do best.`}
            </p>

            <p>
              This is more than a gig — it is a career opportunity. Our top {service.name.toLowerCase()} professionals in {boroughName} earn between $1,000 and $2,000 per week working on their own terms. You choose your hours, your service area, and the types of appointments you want to accept. Whether you want to work full-time or supplement an existing schedule, The NYC Mobile Salon gives you the flexibility and the client volume to make it work. Ready to learn more? Visit our{" "}
              <Link href={`/join/${slug}`} className={`${accentText} underline hover:opacity-80`}>
                {service.name} jobs overview
              </Link>{" "}
              or explore all{" "}
              <Link href="/join" className={`${accentText} underline hover:opacity-80`}>
                open positions
              </Link>{" "}
              across the city.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Quick Stats ─────────────────────────────────────── */}
      <section className="bg-charcoal px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { value: "$49+", label: "Per Hour" },
            { value: "Instant", label: "Zelle / Apple Cash" },
            { value: "$0", label: "Booth Rental Fees" },
            { value: String(hoods.length), label: `Neighborhoods in ${boroughName}` },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`font-display text-3xl font-black md:text-4xl ${womens ? "text-purple-400" : "text-sky-400"}`}>
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. What You'll Do ──────────────────────────────────── */}
      <section className={`${accentBgLight} px-4 py-20`}>
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 text-center text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            Day-to-Day
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            What You&rsquo;ll Do
          </h3>

          <div className={`rounded-xl border ${accentBorder} bg-white p-8`}>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              As a mobile {service.name.toLowerCase()} professional in {boroughName}, your typical day involves traveling to client locations across the borough, setting up your portable station, and delivering the same quality of service you would in a top salon — except you are in the client&rsquo;s home, office, or event venue. Here is what that looks like:
            </p>
            <ul className="space-y-4">
              {whatYoullDo.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${accentBg} text-[10px] font-bold text-white`}>
                    &#10003;
                  </span>
                  <span className="text-sm leading-relaxed text-slate-600">{item}</span>
                </li>
              ))}
              {content && (
                <>
                  <li className="flex gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${accentBg} text-[10px] font-bold text-white`}>
                      &#10003;
                    </span>
                    <span className="text-sm leading-relaxed text-slate-600">
                      Build a loyal client base across {boroughName} neighborhoods
                    </span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 5. Requirements ────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 text-center text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            Qualifications
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Requirements
          </h3>

          <div className={`rounded-xl border ${accentBorder} bg-white p-8`}>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              To join our {service.name.toLowerCase()} team in {boroughName}, you need to meet the following requirements. We verify every credential before onboarding to ensure every client receives the highest standard of service.
            </p>
            <ul className="space-y-4">
              {[
                {
                  title: "Valid New York State License",
                  detail: "You must hold a current, active NYS cosmetology, barbering, esthetics, or nail specialty license appropriate for the services you provide. We verify every license before onboarding.",
                },
                {
                  title: "Own Professional Tools and Products",
                  detail: `You are expected to bring your own professional-grade tools, equipment, and products to every appointment. ${content ? `For ${service.name.toLowerCase()}, this includes everything needed for: ${content.includes.join(", ").toLowerCase()}.` : "This includes all equipment required for your specialty."}`,
                },
                {
                  title: "Reliable Transportation",
                  detail: `As a mobile professional serving ${boroughName}, you need reliable transportation to travel between appointments. Whether you drive, use public transit, or ride-share is up to you — but punctuality is non-negotiable.`,
                },
                {
                  title: "2+ Years of Experience (Preferred)",
                  detail: `We strongly prefer candidates with at least two years of hands-on experience in ${service.name.toLowerCase()}. This ensures you can handle a wide range of client requests confidently and deliver consistent results.`,
                },
                {
                  title: "Smartphone for Booking Management",
                  detail: "All bookings, client communication, and scheduling are managed through our platform. You will need a smartphone with a reliable internet connection to receive and manage appointments.",
                },
              ].map((req) => (
                <li key={req.title} className="flex gap-3">
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${accentBg} text-[10px] font-bold text-white`}>
                    &#10003;
                  </span>
                  <div>
                    <p className="font-display font-bold text-slate-800">{req.title}</p>
                    <p className="text-sm leading-relaxed text-slate-600">{req.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 6. Benefits ────────────────────────────────────────── */}
      <section className={`${accentBgLight} px-4 py-20`}>
        <div className="mx-auto max-w-5xl">
          <h2 className={`mb-2 text-center text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            Benefits
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Why {boroughName} Pros Choose Us
          </h3>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "$49+/Hour Pay",
                description: `Earn $49 or more per hour for every ${service.name.toLowerCase()} appointment in ${boroughName}. No booth rental fees, no product charges, and no hidden deductions. Tips are 100% yours on top of your hourly rate. Paid via Zelle or Apple Cash within 30 minutes of job completion. Our professionals earn significantly more than they did at traditional salons.`,
              },
              {
                title: "Your Schedule",
                description: `You decide when you work in ${boroughName}. Morning, evening, weekdays, weekends — accept only the appointments that fit your life. No shift assignments, no mandatory hours. Whether you want to work five days a week or just weekends, the flexibility is entirely yours.`,
              },
              {
                title: "Steady Clients",
                description: `We invest heavily in marketing and SEO so that a steady stream of ${boroughName} clients looking for ${service.name.toLowerCase()} services are always flowing to our platform. You focus on your craft — we focus on filling your calendar with clients who need exactly what you offer.`,
              },
              {
                title: "Insurance Included",
                description: `Every professional on our roster is covered by comprehensive general liability insurance at no cost to you. Focus entirely on delivering great ${service.name.toLowerCase()} services in ${boroughName} without worrying about costly coverage on your own.`,
              },
            ].map((benefit) => (
              <div key={benefit.title} className={`rounded-xl border ${accentBorder} bg-white p-6`}>
                <h4 className="mb-3 font-display text-lg font-bold text-slate-800">{benefit.title}</h4>
                <p className="text-sm leading-relaxed text-slate-500">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Neighborhoods Hiring ────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className={`mb-2 text-center text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            Service Area
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            {boroughName} Neighborhoods Hiring
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            We are actively hiring {service.name.toLowerCase()} professionals to serve clients in every {boroughName} neighborhood listed below. Click any neighborhood to see the specific opportunity in that area. The more neighborhoods you cover, the more bookings you will receive.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {hoods.map((hood) => (
              <Link
                key={hood.slug}
                href={`/join/${slug}/${borough}/${hood.slug}`}
                className={`rounded-full border ${accentBorder} px-3 py-1.5 text-xs font-medium text-slate-600 transition-all ${accentHover}`}
              >
                {hood.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ─────────────────────────────────────────────── */}
      <section className={`${accentBgLight} px-4 py-20`}>
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 text-center text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            FAQ
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className={`rounded-xl border ${accentBorder} bg-white p-6`}>
                <h4 className="mb-2 font-display font-bold text-slate-800">{faq.q}</h4>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Other Boroughs ──────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 text-center text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            Also Hiring
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            {service.name} Jobs in Other Boroughs
          </h3>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            We are hiring {service.name.toLowerCase()} professionals across all five NYC boroughs. If you are willing to serve clients outside {boroughName}, you can add multiple boroughs to your service area and receive even more bookings.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {otherBoroughs.map(([boroSlug, boroName]) => (
              <Link
                key={boroSlug}
                href={`/join/${slug}/${boroSlug}`}
                className={`rounded-xl border ${accentBorder} bg-white p-5 transition hover:shadow-md`}
              >
                <h4 className="font-display font-bold text-slate-800">
                  {service.name} Jobs in {boroName}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  $49+/hr &middot; {(neighborhoods[boroSlug] ?? []).length} neighborhoods &middot; Apply now
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. CTA ────────────────────────────────────────────── */}
      <section
        className="px-4 py-24 text-white md:py-32"
        style={{ background: ctaGradient }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 font-display text-4xl font-black tracking-tight md:text-5xl">
            Ready to Do {service.name} in&nbsp;{boroughName}?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/90">
            Send us your name, specialty, availability, and a link to your portfolio or social media. We review every application personally and most candidates hear back within 48 hours. Start earning $49+ per hour in {boroughName} with your next email.
          </p>
          <Link
            href="/join/application"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold shadow-lg transition hover:bg-white/90"
            style={{ color: womens ? "#7C3AED" : "#1E293B" }}
          >
            Apply Now
          </Link>
          <p className="mt-6 text-sm text-white/70">
            Questions?{" "}
            <a
              href="mailto:hey@thenycmobilesalon.com"
              className="text-white underline hover:text-white/90"
            >
              hey@thenycmobilesalon.com
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
