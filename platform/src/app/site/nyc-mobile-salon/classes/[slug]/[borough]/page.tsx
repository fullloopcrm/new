// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { neighborhoods, allClasses } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getClassBySlug, getBoroughName, getClassBoroughParams, serviceSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { classContent } from "@/app/site/nyc-mobile-salon/_lib/class-content";

export const revalidate = 86400;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string; borough: string }> };

function isMensClass(slug: string): boolean {
  return slug === "mens-grooming-101";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, borough } = await params;
  const cls = getClassBySlug(slug);
  const boro = getBoroughName(borough);
  if (!cls || !boro) return {};
  const content = classContent[slug];
  return {
    title: `${cls.name} in ${boro}, NYC — Mobile Beauty Workshop`,
    description: `Book a ${cls.name.toLowerCase()} in ${boro}. ${cls.description}. ${cls.duration}, groups of ${cls.groupSize}.${content ? ` From ${content.price}.` : ""} At your ${boro} location.`,
    alternates: { canonical: `https://thenycmobilesalon.com/classes/${slug}/${borough}` },
  };
}

export default async function ClassBoroughPage({ params }: Props) {
  const { slug, borough } = await params;
  const cls = getClassBySlug(slug);
  const boro = getBoroughName(borough);
  const hoods = neighborhoods[borough];
  if (!cls || !boro || !hoods) notFound();

  const isMens = isMensClass(slug);
  const content = classContent[slug];

  const heroStyle = isMens
    ? { background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }
    : { background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" };

  const otherClasses = allClasses.filter((c) => c.slug !== slug);

  const faqs = [
    {
      q: `How does a ${cls.name.toLowerCase()} work in ${boro}?`,
      a: `We send a licensed instructor directly to your ${boro} location — your home, office, or any private space. They bring all tools and materials. You just show up and learn. The class runs ${cls.duration} and accommodates groups of ${cls.groupSize}.`,
    },
    {
      q: `How much does the ${cls.name.toLowerCase()} cost in ${boro}?`,
      a: content
        ? `The ${cls.name} starts at ${content.price}. Pricing is the same across all five boroughs — ${boro} included. No travel surcharges, no hidden fees.`
        : `Contact us for current pricing on the ${cls.name}. Pricing is consistent across all five boroughs including ${boro}.`,
    },
    {
      q: `What neighborhoods in ${boro} do you serve for this class?`,
      a: `We serve every neighborhood in ${boro} — from ${hoods[0].name} to ${hoods[hoods.length - 1].name} and everywhere between. Same pricing, same quality, no matter where you are in ${boro}.`,
    },
  ];

  return (
    <>
      {/* Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        serviceSchema(`${cls.name} in ${boro}`, `${cls.description} — mobile workshop in ${boro}. ${cls.duration}, groups of ${cls.groupSize}.`, boro)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Classes", url: "/classes" },
          { name: cls.name, url: `/classes/${slug}` },
          { name: boro, url: `/classes/${slug}/${borough}` },
        ])
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(faqs)
      ) }} />

      {/* ─── 1. Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={heroStyle}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href="/classes" className="hover:text-white/80">Classes</Link>
            <span>/</span>
            <Link href={`/classes/${slug}`} className="hover:text-white/80">{cls.name}</Link>
            <span>/</span>
            <span className="text-white/40">{boro}</span>
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            {cls.name} in <span className="italic">{boro}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            {cls.description} — delivered to your {boro} location. {cls.duration}, groups of {cls.groupSize}.
            {content ? ` From ${content.price}.` : ""}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/book" className={isMens ? "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display" : "inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display"}>Book in {boro}</Link>
            <Link href="/pricing" className="inline-block rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white/10 font-display">View Pricing</Link>
          </div>
        </div>
      </section>

      {/* ─── 2. Rich Intro ───────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            {cls.name} across {boro}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Looking for a {cls.name.toLowerCase()} in {boro}? The NYC Mobile Salon sends a licensed instructor directly to your home, office, or any private space in {boro}. {content?.intro ?? cls.description + ". We bring everything you need — tools, products, and expertise — so you can focus entirely on learning."}
            </p>
            <p>
              {content?.details
                ? content.details.split(". ").slice(0, 3).join(". ") + "."
                : `${cls.description}. Our instructors have years of professional experience and tailor every session to the group's skill level. Whether you're a complete beginner or looking to refine techniques you already know, the class meets you where you are.`}
            </p>
            <p>
              {content?.details
                ? content.details.split(". ").slice(3).join(". ")
                : `Every participant receives personalized attention and hands-on practice time. We keep groups small — ${cls.groupSize} people — so you get real feedback and leave with skills you can use immediately.`}
            </p>
            <p>
              {content?.ideal ?? `This class is perfect for friend groups, team outings, birthday celebrations, or anyone in ${boro} who wants to learn new skills in a fun, relaxed setting.`} We serve every corner of {boro}, from {hoods[0].name} to {hoods[hoods.length - 1].name} — same pricing, same quality, no travel fees.
            </p>
            <p>
              Ready to book? Check out our <Link href={`/classes/${slug}`} className={isMens ? "text-sky-600 underline decoration-sky-300 hover:text-sky-700" : "text-purple-600 underline decoration-purple-300 hover:text-purple-700"}>full {cls.name} details</Link>, browse all <Link href="/classes" className={isMens ? "text-sky-600 underline decoration-sky-300 hover:text-sky-700" : "text-purple-600 underline decoration-purple-300 hover:text-purple-700"}>classes and workshops</Link>, or see our <Link href="/pricing" className={isMens ? "text-sky-600 underline decoration-sky-300 hover:text-sky-700" : "text-purple-600 underline decoration-purple-300 hover:text-purple-700"}>pricing page</Link> for group rates and packages. Taking a class in {boro} means learning in the comfort of your own space — no commuting to a studio, no parking, no hassle.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. What's Included ──────────────────────────────────────── */}
      {content?.includes && (
        <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-950" : "bg-purple-50/60"}`}>
          <div className="mx-auto max-w-4xl">
            <h2 className={`font-display mb-10 text-3xl font-medium tracking-tight ${isMens ? "text-white" : "text-charcoal"}`}>
              What&apos;s included
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {content.includes.map((item) => (
                <li key={item} className={`flex items-start gap-3 rounded-xl border p-5 ${isMens ? "border-sky-800/40 bg-sky-950/30" : "border-purple-200 bg-white"}`}>
                  <svg className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isMens ? "text-sky-400" : "text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={`text-base ${isMens ? "text-gray-300" : "text-gray-700"}`}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── 4. Quick Details ────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal">
            Quick details
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Price", value: content?.price ?? "Contact us" },
              { label: "Duration", value: cls.duration },
              { label: "Group Size", value: cls.groupSize },
              { label: "Materials", value: "All included" },
              { label: "Experience", value: "All levels" },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl border p-5 text-center ${isMens ? "border-sky-200 bg-sky-50" : "border-purple-200 bg-purple-50/50"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isMens ? "text-sky-500" : "text-purple-500"}`}>{item.label}</p>
                <p className="mt-2 font-display text-lg font-bold text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. How It Works ─────────────────────────────────────────── */}
      <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-950" : "bg-purple-600"}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-12 text-center text-3xl font-medium tracking-tight text-white md:text-4xl">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Book Your Class",
                desc: `Pick your date, group size, and ${boro} location. We'll confirm your instructor within 24 hours.`,
              },
              {
                step: "2",
                title: "Instructor Arrives",
                desc: `Your licensed instructor shows up at your ${boro} door with all tools, products, and materials — ready to go.`,
              },
              {
                step: "3",
                title: "Learn & Practice",
                desc: `Get hands-on instruction for ${cls.duration}, practice new techniques, and leave with skills you can use every day.`,
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl bg-white/10 p-8 text-center backdrop-blur-sm">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-bold ${isMens ? "bg-sky-500 text-white" : "bg-white text-purple-700"}`}>
                  {item.step}
                </div>
                <h3 className="font-display mb-3 text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/80">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. Neighborhoods ────────────────────────────────────────── */}
      <section className={`px-4 py-16 md:py-20 ${isMens ? "bg-sky-50" : "bg-purple-50/50"}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-3 text-2xl font-medium tracking-tight text-charcoal md:text-3xl">
            {cls.name} by neighborhood in {boro}
          </h2>
          <p className="mb-8 text-gray-500">We travel to every neighborhood below. Same price, no travel fees.</p>
          <div className="flex flex-wrap gap-2">
            {hoods.map((hood) => (
              <Link
                key={hood.slug}
                href={`/classes/${slug}/${borough}/${hood.slug}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-white hover:shadow-sm ${isMens ? "border-sky-200 hover:border-sky-500 hover:text-sky-600" : "border-purple-200 hover:border-purple-500 hover:text-purple-600"}`}
              >
                {hood.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. Why Take a Workshop in [Borough] ─────────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Why take a workshop in {boro}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Zero Commute",
                desc: `Skip the subway, the traffic, and the parking. Your instructor comes directly to your ${boro} home or office — you just open the door.`,
              },
              {
                title: "Your Space, Your Vibe",
                desc: `Learn in a space where you and your group are comfortable. No crowded studios, no strangers — just you, your crew, and a pro instructor in ${boro}.`,
              },
              {
                title: "Same Price, Any Neighborhood",
                desc: `Whether you're in ${hoods[0].name} or ${hoods[Math.floor(hoods.length / 2)].name}, the price is the same. No travel surcharges anywhere in ${boro}.`,
              },
            ].map((card) => (
              <div key={card.title} className={`rounded-2xl border p-8 ${isMens ? "border-sky-200 bg-sky-50/50" : "border-purple-200 bg-purple-50/40"}`}>
                <h3 className="font-display mb-3 text-xl font-semibold text-charcoal">{card.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. FAQ ──────────────────────────────────────────────────── */}
      <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-950" : "bg-purple-50/60"}`}>
        <div className="mx-auto max-w-3xl">
          <h2 className={`font-display mb-10 text-center text-3xl font-medium tracking-tight ${isMens ? "text-white" : "text-charcoal"}`}>
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className={`rounded-2xl border p-6 ${isMens ? "border-sky-800/40 bg-sky-950/30" : "border-purple-200 bg-white"}`}>
                <h3 className={`font-display mb-3 text-lg font-semibold ${isMens ? "text-white" : "text-charcoal"}`}>{faq.q}</h3>
                <p className={`text-sm leading-relaxed ${isMens ? "text-gray-400" : "text-gray-600"}`}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 9. Other Classes ────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-3 text-center text-3xl font-medium tracking-tight text-charcoal">
            Other classes in {boro}
          </h2>
          <p className="mb-10 text-center text-gray-500">Explore more workshops we bring to {boro}.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherClasses.map((other) => {
              const otherContent = classContent[other.slug];
              const otherMens = isMensClass(other.slug);
              return (
                <Link
                  key={other.slug}
                  href={`/classes/${other.slug}/${borough}`}
                  className={`group rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg ${otherMens ? "border-sky-200 hover:border-sky-400" : "border-purple-200 hover:border-purple-400"}`}
                >
                  <h3 className={`font-display mb-2 text-lg font-semibold ${otherMens ? "text-sky-700 group-hover:text-sky-800" : "text-purple-700 group-hover:text-purple-800"}`}>{other.name}</h3>
                  <p className="mb-3 text-sm text-gray-600">{other.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span>{other.duration}</span>
                    <span>Groups of {other.groupSize}</span>
                    {otherContent && <span>From {otherContent.price}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 10. CTA ─────────────────────────────────────────────────── */}
      <section className={`px-4 py-20 text-center md:py-28 ${isMens ? "bg-gray-950" : "bg-purple-600"}`}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Book {cls.name.toLowerCase()} in <span className="italic">{boro}</span>
          </h2>
          <p className="mx-auto mb-4 max-w-xl text-lg text-white/80">
            {cls.duration}. Groups of {cls.groupSize}. All materials included. We come to your {boro} door.
            {content ? ` From ${content.price}.` : ""}
          </p>
          <p className="mx-auto mb-8 max-w-xl text-sm text-white/60">
            No commute. No studio fees. Just a licensed instructor, professional tools, and a great time with your group — anywhere in {boro}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/book" className={`rounded-full px-10 py-4 text-sm font-semibold uppercase tracking-wider shadow-lg transition hover:-translate-y-0.5 font-display inline-block ${isMens ? "bg-sky-500 text-white shadow-sky-500/30 hover:bg-sky-600" : "bg-white text-purple-700 shadow-purple-500/20 hover:bg-purple-50"}`}>Book This Workshop</Link>
            <Link href="/classes" className="inline-block rounded-full border border-white/30 px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white/10 font-display">Browse All Classes</Link>
          </div>
        </div>
      </section>
    </>
  );
}
