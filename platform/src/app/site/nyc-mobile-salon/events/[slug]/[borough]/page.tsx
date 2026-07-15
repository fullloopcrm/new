import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { neighborhoods, allEvents, eventCategories } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getEventBySlug, getBoroughName, getEventBoroughParams, serviceSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { eventContent } from "@/app/site/nyc-mobile-salon/_lib/event-content";

export const revalidate = 2592000;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string; borough: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, borough } = await params;
  const evt = getEventBySlug(slug);
  const boro = getBoroughName(borough);
  if (!evt || !boro) return {};
  const content = eventContent[slug];
  return {
    title: `Mobile ${evt.name} in ${boro}, NYC — Event Beauty at Your Door`,
    description: `Book ${evt.name.toLowerCase()} in ${boro}, New York. ${evt.description}. Licensed professionals come to any ${boro} venue.${content ? ` From ${content.price}.` : ""}`,
    alternates: { canonical: `https://thenycmobilesalon.com/events/${slug}/${borough}` },
  };
}

export default async function EventBoroughPage({ params }: Props) {
  const { slug, borough } = await params;
  const evt = getEventBySlug(slug);
  const boro = getBoroughName(borough);
  const hoods = neighborhoods[borough];
  if (!evt || !boro || !hoods) notFound();

  const content = eventContent[slug];

  /* Find the category this event belongs to */
  const parentCategory = eventCategories.find((c) => c.items.some((i) => i.slug === slug));

  /* Pick 4 other events for the "Other Events" section */
  const otherEvents = allEvents.filter((e) => e.slug !== slug).slice(0, 4);

  /* FAQ entries specific to this event + borough */
  const faqs = [
    {
      q: `How do I book ${evt.name.toLowerCase()} in ${boro}?`,
      a: `Just fill out our free quote form with your date, ${boro} venue or address, and group size. We'll respond within a few hours with availability, pricing, and a custom plan for your event.`,
    },
    {
      q: `How far in advance should I book ${evt.name.toLowerCase()} in ${boro}?`,
      a: `We recommend booking at least 2-4 weeks ahead for most events. For weddings and large groups in ${boro}, 4-8 weeks is ideal. Last-minute bookings are possible based on availability — just ask.`,
    },
    {
      q: `Do you charge extra for travel to ${boro}?`,
      a: `No. Our pricing covers travel to any venue, home, hotel, or office in ${boro}. There are no hidden travel fees for any of the five NYC boroughs.`,
    },
    {
      q: `What if I need to change the date or cancel my ${boro} event booking?`,
      a: `We understand plans change. Reschedules are free with at least 48 hours' notice. Cancellation policies vary by event size — we'll outline everything clearly when you book.`,
    },
  ];

  return (
    <>
      {/* JSON-LD: Service */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        serviceSchema(`${evt.name} in ${boro}`, `${evt.description} — mobile event beauty in ${boro}.`, boro)
      ).replace(/</g, '\\u003c') }} />
      {/* JSON-LD: Breadcrumb */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Events", url: "/events" },
          { name: evt.name, url: `/events/${slug}` },
          { name: boro, url: `/events/${slug}/${borough}` },
        ])
      ).replace(/</g, '\\u003c') }} />
      {/* JSON-LD: FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(faqs)
      ).replace(/</g, '\\u003c') }} />

      {/* ───────────────────── 1. Hero ───────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #D4749B 0%, #E8A0BF 40%, #C9A96E 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href="/events" className="hover:text-white/80">Events</Link>
            <span>/</span>
            <Link href={`/events/${slug}`} className="hover:text-white/80">{evt.name}</Link>
            <span>/</span>
            <span className="text-white/40">{boro}</span>
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            {evt.name} in <span className="italic">{boro}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/80">
            {evt.description} — delivered to any venue in {boro} by licensed, insured professionals.
            {content ? ` From ${content.price}. Groups of ${content.groupSize}.` : ""}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/book" className="btn-rose">Get a Quote for {boro}</Link>
            <Link href="/how-it-works" className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10">
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────── 2. Rich Intro ───────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Mobile {evt.name.toLowerCase()} across {boro}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Planning {evt.name.toLowerCase()} in {boro}? <Link href="/events" className="text-blush underline decoration-blush/30 hover:decoration-blush">The NYC Mobile Salon</Link> sends a team of licensed professionals directly to your hotel, home, office, or event venue anywhere in {boro}. {content?.intro ? content.intro : `${evt.description}. We bring all tools, products, and supplies — you just focus on your event.`}
            </p>
            <p>
              {content?.details
                ? content.details.split(". ").slice(0, 3).join(". ") + "."
                : `Our team handles every detail so you can focus on what matters — your guests, your event, and your experience. Every stylist on our roster is licensed by New York State, fully insured, and experienced in high-pressure event settings where timing and results both matter.`}
            </p>
            <p>
              We serve every neighborhood in {boro} — from {hoods[0].name} to {hoods[hoods.length - 1].name} and everywhere in between. Same pricing, same quality, same convenience. Whether your venue is a private brownstone, a hotel ballroom, a rooftop lounge, or a community center, we arrive fully equipped and ready to work. Check out our <Link href="/pricing" className="text-blush underline decoration-blush/30 hover:decoration-blush">pricing page</Link> for detailed rates.
            </p>
            <p>
              {content?.ideal
                ? content.ideal
                : `Whether you're organizing a small, intimate gathering or a large-scale event with dozens of guests, our mobile team scales to fit your needs. We've handled everything from 2-person sessions to 200-person corporate events across all five NYC boroughs.`}
            </p>
            <p>
              Ready to learn more about how mobile event beauty works? Visit our <Link href="/how-it-works" className="text-blush underline decoration-blush/30 hover:decoration-blush">How It Works</Link> page for a complete walkthrough, or jump straight to the <Link href={`/events/${slug}`} className="text-blush underline decoration-blush/30 hover:decoration-blush">{evt.name} overview</Link> to see everything this service includes across all boroughs.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────── 3. What's Included ───────────────────── */}
      {content?.includes && content.includes.length > 0 && (
        <section className="bg-blush-light px-6 py-16 md:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal">
              What&apos;s included
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {content.includes.map((item, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-white px-5 py-4 shadow-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-blush">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────────────────── 4. Quick Details ───────────────────── */}
      {content && (
        <section className="bg-white px-6 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
              {[
                { label: "Starting Price", value: content.price },
                { label: "Group Size", value: content.groupSize },
                { label: "Coverage", value: `All of ${boro}` },
                { label: "Staff", value: "Licensed & Insured" },
                { label: "Setup", value: "We Bring Everything" },
              ].map((d) => (
                <div key={d.label} className="rounded-xl border border-pink-100 bg-pink-50/40 px-5 py-5 text-center">
                  <p className="font-display text-xl font-bold text-charcoal">{d.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{d.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────── 5. How It Works ───────────────────── */}
      <section className="bg-blush-light px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell Us About Your Event",
                desc: `Fill out our free quote form with your date, ${boro} venue, group size, and which services you need. We respond within a few hours.`,
              },
              {
                step: "2",
                title: "We Plan & Staff",
                desc: `We build a custom plan for your ${evt.name.toLowerCase()} — choosing the right number of stylists, mapping out the timeline, and confirming every detail with you.`,
              },
              {
                step: "3",
                title: "We Show Up & Deliver",
                desc: `Our licensed team arrives at your ${boro} venue fully equipped. We set up, deliver flawless results, and clean up when we're done. You just enjoy.`,
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-300 text-lg font-bold text-white">
                  {s.step}
                </div>
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/how-it-works" className="text-sm font-semibold text-blush underline decoration-blush/30 hover:decoration-blush">
              See the full process on our How It Works page
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────── 6. Neighborhoods ───────────────────── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-8 text-2xl font-medium tracking-tight text-charcoal">
            {evt.name} by neighborhood in {boro}
          </h2>
          <div className="flex flex-wrap gap-2">
            {hoods.map((hood) => (
              <Link
                key={hood.slug}
                href={`/events/${slug}/${borough}/${hood.slug}`}
                className="rounded-full border border-pink-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-blush hover:bg-white hover:text-blush-dark hover:shadow-sm"
              >
                {hood.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── 7. Why Mobile Events in [Borough] ───────────────────── */}
      <section className="bg-blush-light px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Why mobile {evt.name.toLowerCase()} in {boro}?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Zero Venue Stress",
                desc: `No need to coordinate salon trips across ${boro}. Your entire group gets styled in one place — your home, hotel, office, or event venue. We handle all logistics so you can focus on the event itself.`,
              },
              {
                title: "Licensed NYC Professionals",
                desc: `Every stylist and artist on our ${boro} team is licensed by New York State, fully insured, and vetted for quality. You get the same caliber of talent you'd find at a top NYC salon — at your door.`,
              },
              {
                title: "Fully Equipped & On Time",
                desc: `We arrive with professional-grade tools, products, mirrors, lighting, and everything else needed. No makeshift setups, no missing supplies. We show up ready and we leave your space spotless.`,
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-pink-100 bg-white p-8 shadow-sm">
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">{card.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── 8. FAQ ───────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal">
            Frequently asked questions
          </h2>
          <div className="divide-y divide-pink-100">
            {faqs.map((faq, i) => (
              <div key={i} className="py-6">
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{faq.q}</h3>
                <p className="leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── 9. Other Events ───────────────────── */}
      <section className="bg-blush-light px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-8 text-center text-3xl font-medium tracking-tight text-charcoal">
            Other events we cover in {boro}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {otherEvents.map((other) => {
              const otherContent = eventContent[other.slug];
              return (
                <Link
                  key={other.slug}
                  href={`/events/${other.slug}/${borough}`}
                  className="group rounded-2xl border border-pink-100 bg-white p-6 shadow-sm transition-all hover:border-blush hover:shadow-md"
                >
                  <h3 className="font-display mb-2 text-base font-semibold text-charcoal group-hover:text-blush-dark">
                    {other.name}
                  </h3>
                  <p className="mb-3 text-sm leading-relaxed text-gray-500">
                    {other.description}
                  </p>
                  {otherContent && (
                    <p className="text-xs font-semibold text-blush">From {otherContent.price}</p>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link href="/events" className="text-sm font-semibold text-blush underline decoration-blush/30 hover:decoration-blush">
              View all event services
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────── 10. CTA ───────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 text-center" style={{ background: "linear-gradient(135deg, #D4749B 0%, #E8A0BF 40%, #C9A96E 100%)" }}>
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-4xl font-bold text-white md:text-5xl">
            Book {evt.name.toLowerCase()} in <span className="italic">{boro}</span>
          </h2>
          <p className="mx-auto mb-4 max-w-xl text-lg leading-relaxed text-white/80">
            Licensed professionals. Your venue. Your schedule. {content ? `From ${content.price} per person.` : "Custom packages available."} We cover every neighborhood in {boro} with no hidden travel fees.
          </p>
          <p className="mb-8 text-sm text-white/60">
            Typical response time: under 3 hours. No commitment until you approve the plan.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/book" className="btn-rose">Get a Free Quote</Link>
            <Link href="/pricing" className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
