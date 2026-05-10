// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getClassBySlug, getNeighborhoodName, getBoroughName, serviceSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { classContent } from "@/app/site/nyc-mobile-salon/_lib/class-content";

export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string; borough: string; neighborhood: string }> };

function isMensClass(slug: string): boolean {
  return slug === "mens-grooming-101";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, borough, neighborhood } = await params;
  const cls = getClassBySlug(slug);
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!cls || !hood || !boro) return {};
  const content = classContent[slug];
  return {
    title: `${cls.name} in ${hood}, ${boro} — Mobile Workshop`,
    description: `Book a ${cls.name.toLowerCase()} in ${hood}, ${boro}. ${cls.description}. ${cls.duration}, groups of ${cls.groupSize}.${content ? ` From ${content.price}.` : ""} The NYC Mobile Salon.`,
    alternates: { canonical: `https://thenycmobilesalon.com/classes/${slug}/${borough}/${neighborhood}` },
  };
}

export default async function ClassNeighborhoodPage({ params }: Props) {
  const { slug, borough, neighborhood } = await params;
  const cls = getClassBySlug(slug);
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!cls || !hood || !boro) notFound();

  const isMens = isMensClass(slug);
  const content = classContent[slug];

  const heroStyle = isMens
    ? { background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }
    : { background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" };

  const accentBg = isMens ? "bg-sky-100" : "bg-purple-100";
  const accentText = isMens ? "text-sky-600" : "text-purple-600";
  const accentBorder = isMens ? "border-sky-100" : "border-purple-100";
  const accentSubtext = isMens ? "text-sky-500" : "text-purple-600";
  const sectionBg = isMens ? "bg-sky-50" : "bg-purple-50/50";

  // Nearby neighborhoods for contextual linking
  const boroughHoods = neighborhoods[borough] ?? [];
  const nearby = boroughHoods.filter((h) => h.slug !== neighborhood).slice(0, 4);

  const faqs = [
    {
      q: `How does the ${cls.name.toLowerCase()} work in ${hood}?`,
      a: `We bring the entire workshop to your location in ${hood}, ${boro}. Our licensed instructor arrives with all tools, materials, and supplies. You just need a space with seating for your group — your living room, office, rooftop, or any indoor space works. The class runs ${cls.duration} and accommodates groups of ${cls.groupSize}.`,
    },
    {
      q: `How much does the ${cls.name.toLowerCase()} cost in ${hood}?`,
      a: content
        ? `Pricing starts from ${content.price} for the ${cls.name.toLowerCase()}. Final pricing depends on group size and any add-ons. We offer the same rates across all NYC neighborhoods including ${hood}. Contact us for a custom quote.`
        : `Pricing depends on group size and any customizations. We offer the same competitive rates across all NYC neighborhoods including ${hood}. Contact us for a detailed quote.`,
    },
    {
      q: `Do I need to provide anything for the class in ${hood}?`,
      a: `No — we bring everything. All tools, products, practice materials, and handouts are included. You just need a space in ${hood} with enough seating for your group (${cls.groupSize} people) and access to a power outlet. We handle the rest.`,
    },
  ];

  return (
    <>
      {/* JSON-LD: Service */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        serviceSchema(`${cls.name} in ${hood}, ${boro}`, `${cls.description} — mobile workshop in ${hood}, ${boro}. ${cls.duration}, groups of ${cls.groupSize}.`, `${hood}, ${boro}`)
      ) }} />
      {/* JSON-LD: Breadcrumb */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Classes", url: "/classes" },
          { name: cls.name, url: `/classes/${slug}` },
          { name: boro, url: `/classes/${slug}/${borough}` },
          { name: hood, url: `/classes/${slug}/${borough}/${neighborhood}` },
        ])
      ) }} />
      {/* JSON-LD: FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(faqs)
      ) }} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={heroStyle}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href="/classes" className="hover:text-white/80">Classes</Link>
            <span>/</span>
            <Link href={`/classes/${slug}`} className="hover:text-white/80">{cls.name}</Link>
            <span>/</span>
            <Link href={`/classes/${slug}/${borough}`} className="hover:text-white/80">{boro}</Link>
            <span>/</span>
            <span className="text-white/40">{hood}</span>
          </div>
          <h1 className="font-display mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {cls.name} in <span className="italic">{hood}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/80">
            {cls.description} — at your location in {hood}, {boro}. {cls.duration}, groups of {cls.groupSize}.
            {content ? ` From ${content.price}.` : ""}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/book" className={isMens ? "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display" : "inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display"}>Book Now</Link>
            <Link href={`/classes/${slug}`} className="inline-block rounded-full border border-white/30 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:border-white/60 hover:bg-white/10 font-display">Learn More</Link>
          </div>
        </div>
      </section>

      {/* ── Rich Content ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-6 text-2xl font-medium text-charcoal">
            What to expect from {cls.name.toLowerCase()} in {hood}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Our licensed instructor arrives at your {hood} location with everything needed for {cls.name.toLowerCase()}. {content?.details ? content.details.split(". ").slice(0, 2).join(". ") + "." : `${cls.description}. We bring all tools, products, and materials so you can focus on learning.`}
            </p>
            <p>
              No need to commute from {hood} to a studio or classroom. We set up in your home, office, or any space with room for your group of {cls.groupSize}. Whether you&apos;re hosting in a {hood} apartment, a rooftop lounge, or a coworking space, we adapt the workshop to your setting and make it feel seamless.
            </p>
            <p>
              {content?.details ? content.details.split(". ").slice(2, 5).join(". ") + "." : `Every participant gets hands-on practice with professional-grade tools and personalized feedback from our instructor. You'll leave with real skills you can use immediately.`}
            </p>
            <p>
              {content?.ideal ?? `This class is perfect for groups of friends, team-building events, birthday celebrations, bridal parties, and anyone in ${hood} looking to learn something new.`} Whether you&apos;re a complete beginner or looking to sharpen existing skills, the workshop meets you where you are.
            </p>
            <p>
              We serve {hood} and all surrounding neighborhoods in {boro}, 7 days a week including evenings and weekends. Explore all our <Link href="/classes" className={`underline decoration-1 underline-offset-2 ${accentText} hover:opacity-80`}>classes and workshops</Link>, browse the full <Link href={`/classes/${slug}`} className={`underline decoration-1 underline-offset-2 ${accentText} hover:opacity-80`}>{cls.name} page</Link>, or see what else we offer in <Link href={`/classes/${slug}/${borough}`} className={`underline decoration-1 underline-offset-2 ${accentText} hover:opacity-80`}>{boro}</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── What's Included ── */}
      {content && (
        <section className={`px-6 py-16 md:py-20 ${sectionBg}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display mb-6 text-2xl font-medium text-charcoal">What&apos;s included</h2>
            <ul className="space-y-3">
              {content.includes.map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${accentBg}`}>
                    <svg className={`h-3.5 w-3.5 ${accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Quick Details ── */}
      <section className="bg-white px-4 py-14 md:py-18">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-center text-2xl font-medium text-charcoal">Quick details</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { label: "Price", value: content?.price ?? "Contact us" },
              { label: "Duration", value: cls.duration },
              { label: "Group Size", value: cls.groupSize },
              { label: "Materials", value: "All included" },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border ${accentBorder} bg-white p-5 text-center shadow-sm`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${accentSubtext}`}>{item.label}</p>
                <p className="mt-1 font-display text-lg font-bold text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className={`px-4 py-16 md:py-20 ${sectionBg}`}>
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-10 text-center text-2xl font-medium text-charcoal">How it works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "1", title: "Book your class", desc: `Pick a date, time, and location in ${hood}. Tell us your group size and any special requests. We handle everything else.` },
              { step: "2", title: "We come to you", desc: `Your instructor arrives in ${hood} with all tools, materials, and supplies. We set up in your space and get everything ready.` },
              { step: "3", title: "Learn and enjoy", desc: `Hands-on instruction for ${cls.duration}. Every participant practices with real tools and gets personalized feedback. Leave with new skills.` },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-bold text-white ${isMens ? "bg-sky-500" : "bg-purple-600"}`}>
                  {item.step}
                </div>
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Take a Class in [Hood] ── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-10 text-center text-2xl font-medium text-charcoal">
            Why take a class in {hood}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "Zero commute", desc: `Skip the subway and stay in ${hood}. We bring the entire workshop to your door — no travel, no parking, no hassle.` },
              { title: "Your space, your vibe", desc: `Host in your ${hood} apartment, office, or any space you love. It's more relaxed, more private, and way more fun than a generic classroom.` },
              { title: "Flexible scheduling", desc: `We book 7 days a week, mornings through evenings, across all of ${boro}. Pick the time that works for your group.` },
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl border ${accentBorder} p-6 shadow-sm`}>
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-Links ── */}
      <section className={`px-4 py-16 md:py-20 ${sectionBg}`}>
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-6 text-xl font-semibold text-charcoal">Explore more</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Link href={`/locations/${borough}/${neighborhood}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${accentBorder}`}>
              <p className="text-sm font-semibold text-charcoal">All Services</p>
              <p className={`text-xs ${accentSubtext}`}>in {hood}</p>
            </Link>
            <Link href="/classes" className={`card-hover rounded-xl border bg-white p-5 text-center ${accentBorder}`}>
              <p className="text-sm font-semibold text-charcoal">All Classes</p>
              <p className={`text-xs ${accentSubtext}`}>full catalog</p>
            </Link>
            <Link href="/events" className={`card-hover rounded-xl border bg-white p-5 text-center ${accentBorder}`}>
              <p className="text-sm font-semibold text-charcoal">Events</p>
              <p className={`text-xs ${accentSubtext}`}>parties &amp; group bookings</p>
            </Link>
            <Link href={`/classes/${slug}/${borough}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${accentBorder}`}>
              <p className="text-sm font-semibold text-charcoal">{cls.name}</p>
              <p className={`text-xs ${accentSubtext}`}>in {boro}</p>
            </Link>
            <Link href={`/locations/${borough}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${accentBorder}`}>
              <p className="text-sm font-semibold text-charcoal">{boro}</p>
              <p className={`text-xs ${accentSubtext}`}>all neighborhoods</p>
            </Link>
            <Link href="/services" className={`card-hover rounded-xl border bg-white p-5 text-center ${accentBorder}`}>
              <p className="text-sm font-semibold text-charcoal">Full Menu</p>
              <p className={`text-xs ${accentSubtext}`}>all services</p>
            </Link>
          </div>

          {/* Nearby neighborhoods */}
          {nearby.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-charcoal">Also available nearby in {boro}:</p>
              <div className="flex flex-wrap gap-2">
                {nearby.map((h) => (
                  <Link key={h.slug} href={`/classes/${slug}/${borough}/${h.slug}`} className={`rounded-full border ${accentBorder} bg-white px-4 py-1.5 text-xs font-medium text-gray-700 transition hover:shadow-sm`}>
                    {h.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-2xl font-medium text-charcoal">
            Frequently asked questions
          </h2>
          <div className="divide-y divide-gray-200">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-charcoal">
                  {faq.q}
                  <span className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${accentBg} transition group-open:rotate-45`}>
                    <svg className={`h-3.5 w-3.5 ${accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-20 text-center" style={heroStyle}>
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-3xl font-bold text-white md:text-4xl">
            Ready to book {cls.name.toLowerCase()} in <span className="italic">{hood}</span>?
          </h2>
          <p className="mb-4 text-lg text-white/80">
            {cls.duration}. Groups of {cls.groupSize}. All materials included. We come to you.
            {content ? ` From ${content.price}.` : ""}
          </p>
          <p className="mb-8 text-sm text-white/60">
            Available 7 days a week across {hood} and all of {boro}. Book your date before it fills up.
          </p>
          <Link href="/book" className={`rounded-full px-10 py-4 text-sm font-semibold uppercase tracking-wider shadow-lg transition hover:-translate-y-0.5 font-display inline-block ${isMens ? "bg-sky-500 text-white shadow-sky-500/30 hover:bg-sky-600" : "bg-white text-purple-700 shadow-purple-500/20 hover:bg-purple-50"}`}>Book This Workshop</Link>
        </div>
      </section>
    </>
  );
}
