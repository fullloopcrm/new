import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allServices, womensCategories, neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getServiceBySlug, getServiceNeighborhoodParams, getNeighborhoodName, getBoroughName, faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const revalidate = 2592000;

/* ── helpers ─────────────────────────────────────────────────────── */

function isWomensService(slug: string): boolean {
  return womensCategories.some((cat) => cat.services.some((s) => s.slug === slug));
}

type Props = { params: Promise<{ slug: string; borough: string; neighborhood: string }> };

/* ── static params ───────────────────────────────────────────────── */

export const dynamicParams = true

export async function generateStaticParams() { return [] }

/* ── metadata ────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, borough, neighborhood } = await params;
  const service = getServiceBySlug(slug);
  const hoodName = getNeighborhoodName(borough, neighborhood);
  const boroName = getBoroughName(borough);
  if (!service || !hoodName || !boroName) return {};

  const title = `Mobile ${service.name} Jobs in ${hoodName}, ${boroName} — $49+/hr`;
  const description = `Now hiring licensed ${service.name.toLowerCase()} professionals in ${hoodName}, ${boroName}. Earn $49+/hour with The NYC Mobile Salon. No booth rental fees, paid via Zelle or Apple Cash within 30 minutes of job completion, insurance included. Apply today.`;

  return {
    title,
    description,
    alternates: { canonical: `https://thenycmobilesalon.com/join/${slug}/${borough}/${neighborhood}` },
    openGraph: { title, description },
  };
}

/* ── page ─────────────────────────────────────────────────────────── */

export default async function JoinServiceNeighborhoodPage({ params }: Props) {
  const { slug, borough, neighborhood } = await params;
  const service = getServiceBySlug(slug);
  const hoodName = getNeighborhoodName(borough, neighborhood);
  const boroName = getBoroughName(borough);

  if (!service || !hoodName || !boroName) notFound();

  const womens = isWomensService(slug);
  const heroGradient = womens
    ? "linear-gradient(135deg, #581C87 0%, #7C3AED 40%, #A78BFA 100%)"
    : "linear-gradient(135deg, #1E1B4B 0%, #4338CA 40%, #818CF8 100%)";

  const boroughHoods = neighborhoods[borough] ?? [];
  const otherHoods = boroughHoods.filter((h) => h.slug !== neighborhood);
  const otherBoroughs = Object.entries(boroughNames).filter(([b]) => b !== borough);

  const mailSubject = encodeURIComponent(`${service.name} Application — ${hoodName}, ${boroName}`);

  /* ── service-specific task descriptions ────────────────────────── */

  const taskMap: Record<string, string[]> = {
    default: [
      `Deliver professional mobile ${service.name.toLowerCase()} services to clients in ${hoodName} and the surrounding ${boroName} neighborhoods`,
      `Arrive on time with your own professional-grade tools, products, and supplies for every ${service.name.toLowerCase()} appointment`,
      `Consult with each client to understand their preferences, lifestyle, and desired outcome before beginning any ${service.name.toLowerCase()} session`,
      `Maintain the highest hygiene and sanitation standards throughout every appointment in accordance with New York State requirements`,
      `Provide aftercare instructions and product recommendations tailored to each client's needs`,
      `Represent The NYC Mobile Salon with professionalism, warmth, and attention to detail at every ${hoodName} appointment`,
    ],
  };

  const tasks = taskMap.default;

  /* ── FAQ data ──────────────────────────────────────────────────── */

  const faqs = [
    {
      q: `How much can I earn doing ${service.name.toLowerCase()} in ${hoodName}?`,
      a: `${service.name} professionals working through The NYC Mobile Salon in ${hoodName}, ${boroName} earn $49 or more per hour. Your actual earnings depend on how many hours you work, your experience level, and the types of appointments you accept. With no booth rental fees, no product charges, and payment sent via Zelle or Apple Cash within 30 minutes of job completion, most professionals keep significantly more than they did at a traditional salon. Tips are 100% yours on top of the hourly rate.`,
    },
    {
      q: `Do I need to live in ${hoodName} to work there?`,
      a: `No, you do not need to live in ${hoodName} to accept ${service.name.toLowerCase()} appointments there. Many of our ${boroName}-based professionals serve multiple neighborhoods across the borough. During onboarding, you select the neighborhoods and boroughs where you are willing to travel. As long as you can arrive on time and provide excellent service, you are welcome to work in ${hoodName} regardless of where you live.`,
    },
    {
      q: `How do I start working as a ${service.name.toLowerCase()} professional in ${hoodName}?`,
      a: `Getting started is simple. Email us at hey@thenycmobilesalon.com with your name, your ${service.name.toLowerCase()} specialty, your availability, and a link to your portfolio or social media. Our team will verify your New York State license, check references, and schedule a brief phone call. Most applicants are approved within one week and begin receiving ${service.name.toLowerCase()} bookings in ${hoodName} shortly after.`,
    },
    {
      q: `What is the demand for ${service.name.toLowerCase()} in ${hoodName}?`,
      a: `Client demand for mobile ${service.name.toLowerCase()} services in ${hoodName}, ${boroName} is consistently strong. ${hoodName} residents value convenience, quality, and professionalism, and they are increasingly choosing mobile beauty services over traditional salons. We receive ${service.name.toLowerCase()} booking requests from ${hoodName} regularly and need qualified, licensed professionals to meet that demand. Joining now means you can start building a loyal client base in one of ${boroName}'s most active neighborhoods.`,
    },
  ];

  /* ── JSON-LD schemas ────────────────────────────────────────────── */

  const jobPostingLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `Mobile ${service.name} Professional — ${hoodName}, ${boroName}`,
    description: `Join The NYC Mobile Salon as a licensed mobile ${service.name.toLowerCase()} professional serving clients in ${hoodName}, ${boroName}. Earn $49+/hour, no booth rental fees, paid via Zelle or Apple Cash within 30 minutes of job completion, liability insurance included.`,
    identifier: {
      "@type": "PropertyValue",
      name: "The NYC Mobile Salon",
      value: `nycms-${slug}-${borough}-${neighborhood}`,
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
        addressLocality: hoodName,
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
    qualifications: "Valid New York State cosmetology, barbering, esthetics, or nail specialty license required",
    jobBenefits: "Flexible schedule, no booth rental fees, liability insurance included, paid via Zelle or Apple Cash within 30 minutes of job completion, bonus programs",
  };

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Join Our Team", url: "/join" },
    { name: `${service.name} Jobs`, url: `/join/${slug}` },
    { name: boroName, url: `/join/${slug}/${borough}` },
    { name: hoodName, url: `/join/${slug}/${borough}/${neighborhood}` },
  ];

  return (
    <>
      {/* ── JSON-LD ──────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jobPostingLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema(breadcrumbs)) }}
      />

      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{ background: heroGradient }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center justify-center gap-1 text-xs text-white/70">
            <Link href="/join" className="hover:text-white transition">Join</Link>
            <span>/</span>
            <Link href={`/join/${slug}`} className="hover:text-white transition">{service.name} Jobs</Link>
            <span>/</span>
            <Link href={`/join/${slug}/${borough}`} className="hover:text-white transition">{boroName}</Link>
            <span>/</span>
            <span className="text-white font-medium">{hoodName}</span>
          </nav>

          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            Now Hiring in {hoodName}
          </span>

          <h1 className="mb-6 font-display text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
            {service.name} Jobs in {hoodName}, {boroName}
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
            Earn $49+/hour as a mobile {service.name.toLowerCase()} professional in {hoodName}. No booth rental fees, no overhead, and clients are already waiting for you. The NYC Mobile Salon is actively hiring licensed pros in {hoodName}, {boroName}.
          </p>

          <Link
            href="/join/application"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold text-purple-600 shadow-lg transition hover:bg-purple-50"
          >
            Apply Now
          </Link>
        </div>
      </section>

      {/* ── 2. Job Description ───────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            The Opportunity
          </h2>
          <h3 className="mb-8 font-display text-3xl font-black tracking-tight md:text-4xl">
            Mobile {service.name} in {hoodName}
          </h3>
          <div className="space-y-5 text-slate-600 leading-relaxed">
            <p>
              {hoodName} is one of {boroName}&rsquo;s most vibrant neighborhoods, and the demand for professional mobile {service.name.toLowerCase()} services here continues to grow. Residents, professionals, and visitors in {hoodName} are choosing convenience over commuting — they want licensed, experienced {service.name.toLowerCase()} specialists who come directly to their home, office, or event venue. That is exactly what The NYC Mobile Salon delivers, and we need talented professionals like you to meet the demand.
            </p>
            <p>
              As a mobile {service.name.toLowerCase()} professional serving {hoodName}, you will build a loyal client base in one of {boroName}&rsquo;s most active service areas. Our platform handles all marketing, booking, payment processing, and customer support so you can focus entirely on your craft. Clients in {hoodName} book {service.name.toLowerCase()} appointments through our platform regularly — from quick touch-ups to full sessions — and we match them with the right professional based on location, availability, and specialty.
            </p>
            <p>
              What makes mobile {service.name.toLowerCase()} so popular in {hoodName}? Convenience is the biggest factor. {hoodName} residents lead busy lives and value professionals who respect their time. Whether you are serving a client in their {hoodName} apartment before a big event, providing {service.name.toLowerCase()} services at a {hoodName} office for a corporate wellness day, or helping a bridal party get ready at a {hoodName} venue, you will be doing meaningful work in a neighborhood that truly appreciates quality beauty services.
            </p>
            <p>
              You will earn $49 or more per hour with no booth rental fees, no product charges, and no hidden deductions. Payment is sent via Zelle or Apple Cash within 30 minutes of job completion, and tips are 100% yours. We also provide comprehensive liability insurance at no cost to you. Whether you want to work full-time in {hoodName} or pick up {service.name.toLowerCase()} appointments here as part of a broader {boroName} schedule, the flexibility is entirely in your hands.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href={`/join/${slug}/${borough}`} className="text-purple-600 underline hover:text-purple-800">
              {service.name} jobs in {boroName}
            </Link>
            <Link href={`/join/${slug}`} className="text-purple-600 underline hover:text-purple-800">
              All {service.name} jobs
            </Link>
            <Link href="/join" className="text-purple-600 underline hover:text-purple-800">
              All open positions
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3. Quick Details ─────────────────────────────────────── */}
      <section className="bg-charcoal px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { value: "$49+", label: "Per Hour" },
            { value: "Instant", label: "Zelle / Apple Cash" },
            { value: "$0", label: "Booth Rental Fees" },
            { value: "NYS", label: "Licensed Required" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-black text-purple-400 md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. What You'll Do ────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            Responsibilities
          </h2>
          <h3 className="mb-8 font-display text-3xl font-black tracking-tight md:text-4xl">
            What You&rsquo;ll Do as a {service.name} Pro in {hoodName}
          </h3>
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li key={task} className="flex gap-3">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                  &#10003;
                </span>
                <p className="text-sm leading-relaxed text-slate-600">{task}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 5. Requirements ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            Requirements
          </h2>
          <h3 className="mb-8 font-display text-3xl font-black tracking-tight md:text-4xl">
            What You Need to Get Started
          </h3>
          <div className="rounded-xl border border-purple-100 bg-white p-8">
            <ul className="space-y-4">
              {[
                {
                  title: "Valid New York State License",
                  detail: `You must hold a current, valid NYS cosmetology, barbering, esthetics, or nail specialty license to perform ${service.name.toLowerCase()} services through our platform. We verify every license before onboarding.`,
                },
                {
                  title: "Own Professional Tools and Kit",
                  detail: `Arrive at every ${service.name.toLowerCase()} appointment in ${hoodName} with your own professional-grade tools, products, and supplies. You know your tools best, and clients expect a polished, professional setup.`,
                },
                {
                  title: "Reliable Transportation",
                  detail: `As a mobile professional serving ${hoodName} and the surrounding ${boroName} neighborhoods, you need reliable transportation to travel between appointments. Punctuality is non-negotiable.`,
                },
                {
                  title: "Professional Attitude",
                  detail: `You represent The NYC Mobile Salon every time you walk through a client's door in ${hoodName}. A polished appearance and warm, respectful attitude are essential.`,
                },
                {
                  title: "2+ Years Experience (Preferred)",
                  detail: `We strongly prefer ${service.name.toLowerCase()} professionals with at least two years of hands-on experience, though we welcome applications from talented pros at all experience levels.`,
                },
              ].map((req) => (
                <li key={req.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
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

      {/* ── 6. Benefits ──────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600 text-center">
            Benefits
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Why {service.name} Pros Choose The NYC Mobile Salon
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "$49+/Hour",
                description: `Earn $49 or more per hour for every ${service.name.toLowerCase()} appointment you complete in ${hoodName}. No hidden fees, no product charges, no booth rent. Tips are 100% yours on top of the hourly rate. Paid via Zelle or Apple Cash within 30 minutes of job completion. Most professionals earn significantly more than they did at a traditional salon.`,
              },
              {
                title: "Total Flexibility",
                description: `You decide when you work in ${hoodName}. Morning, evening, weekdays, weekends — accept only the ${service.name.toLowerCase()} appointments that fit your schedule. No shift assignments, no mandatory hours. Work full-time or pick up extra clients when it suits you.`,
              },
              {
                title: "Clients Provided",
                description: `We invest heavily in marketing, SEO, and partnerships to keep a steady stream of ${service.name.toLowerCase()} clients flowing from ${hoodName} and across ${boroName}. You focus on your craft — we focus on filling your calendar with quality bookings.`,
              },
              {
                title: "Insurance Included",
                description: `Every ${service.name.toLowerCase()} professional on our roster is covered by comprehensive general liability insurance at no cost to you. Focus on delivering great ${service.name.toLowerCase()} service in ${hoodName} without worrying about costly coverage on your own.`,
              },
            ].map((benefit) => (
              <div key={benefit.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <h4 className="mb-3 font-display text-lg font-bold text-slate-800">{benefit.title}</h4>
                <p className="text-sm leading-relaxed text-slate-500">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. How to Apply ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600 text-center">
            Get Started
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            How to Start Working in {hoodName}
          </h3>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                number: "1",
                title: "Email Us",
                description: `Send your name, ${service.name.toLowerCase()} specialty, availability, and a link to your portfolio or social media to hey@thenycmobilesalon.com. Mention that you want to work in ${hoodName}, ${boroName}.`,
              },
              {
                number: "2",
                title: "We Verify",
                description: `Our team verifies your New York State license, checks references, reviews your portfolio, and schedules a brief phone call. Most applicants hear back within 48 hours.`,
              },
              {
                number: "3",
                title: `Start Working in ${hoodName}`,
                description: `Once approved, you begin receiving ${service.name.toLowerCase()} bookings from clients in ${hoodName} and across ${boroName}. Show up, deliver incredible ${service.name.toLowerCase()} service, and get paid weekly.`,
              },
            ].map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-xl font-black text-white">
                  {step.number}
                </div>
                <h4 className="mb-2 font-display text-lg font-bold text-slate-800">{step.title}</h4>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Nearby Neighborhoods ──────────────────────────────── */}
      {otherHoods.length > 0 && (
        <section className="bg-purple-50/50 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600 text-center">
              Nearby Areas
            </h2>
            <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
              {service.name} Jobs in Other {boroName} Neighborhoods
            </h3>
            <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
              In addition to {hoodName}, we are actively hiring {service.name.toLowerCase()} professionals across {boroName}. Choose the neighborhoods that work best for your schedule and location. Many of our pros serve multiple neighborhoods to maximize their bookings.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {otherHoods.map((hood) => (
                <Link
                  key={hood.slug}
                  href={`/join/${slug}/${borough}/${hood.slug}`}
                  className="rounded-full border border-purple-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
                >
                  {hood.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 9. Other Boroughs ────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            Other Boroughs
          </h2>
          <h3 className="mb-8 font-display text-3xl font-black tracking-tight md:text-4xl">
            {service.name} Jobs Across NYC
          </h3>
          <p className="mx-auto mb-8 max-w-2xl text-sm text-slate-600 leading-relaxed">
            We are hiring {service.name.toLowerCase()} professionals in all five boroughs. If you prefer to work outside of {boroName}, or want to expand your service area, explore {service.name.toLowerCase()} opportunities across the city.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {otherBoroughs.map(([bSlug, bName]) => (
              <Link
                key={bSlug}
                href={`/join/${slug}/${bSlug}`}
                className="rounded-full border border-purple-200 bg-purple-50 px-5 py-2 text-sm font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100"
              >
                {service.name} in {bName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. FAQ ──────────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600 text-center">
            FAQ
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            {service.name} Jobs in {hoodName} — Common Questions
          </h3>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h4 className="mb-2 font-display font-bold text-slate-800">{faq.q}</h4>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. CTA ──────────────────────────────────────────────── */}
      <section
        className="px-4 py-24 text-white md:py-32"
        style={{ background: heroGradient }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 font-display text-4xl font-black tracking-tight md:text-5xl">
            Ready to Do {service.name} in {hoodName}?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/90">
            Send us your name, {service.name.toLowerCase()} specialty, availability, and a link to your portfolio. Most applicants hear back within 48 hours and start receiving {hoodName} bookings within a week.
          </p>
          <Link
            href="/join/application"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold text-purple-600 shadow-lg transition hover:bg-purple-50"
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
