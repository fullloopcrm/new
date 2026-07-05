import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug, getNeighborhoodName, getBoroughName, serviceSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { eventContent } from "@/app/site/nyc-mobile-salon/_lib/event-content";
import { neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";

export const revalidate = 2592000;
export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string; borough: string; neighborhood: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, borough, neighborhood } = await params;
  const evt = getEventBySlug(slug);
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!evt || !hood || !boro) return {};
  const content = eventContent[slug];
  return {
    title: `${evt.name} in ${hood}, ${boro} — Mobile Event Beauty`,
    description: `Book ${evt.name.toLowerCase()} in ${hood}, ${boro}. ${evt.description}. Professional mobile beauty for your event.${content ? ` From ${content.price}.` : ""} The NYC Mobile Salon.`,
    alternates: { canonical: `https://thenycmobilesalon.com/events/${slug}/${borough}/${neighborhood}` },
  };
}

export default async function EventNeighborhoodPage({ params }: Props) {
  const { slug, borough, neighborhood } = await params;
  const evt = getEventBySlug(slug);
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!evt || !hood || !boro) notFound();

  const content = eventContent[slug];

  const faqs = [
    {
      q: `How does ${evt.name.toLowerCase()} work in ${hood}?`,
      a: `We come directly to your location in ${hood}, ${boro}. Our licensed team arrives with all tools, products, and supplies — you just provide the space. We handle setup, service, and cleanup so you can focus on your event.`,
    },
    {
      q: `How far in advance should I book ${evt.name.toLowerCase()} in ${hood}?`,
      a: `We recommend booking at least 2-3 weeks in advance for ${hood}, ${boro} — earlier during peak seasons (spring and fall). Last-minute bookings may be available depending on our schedule, so it never hurts to ask.`,
    },
    {
      q: `What is the cost for ${evt.name.toLowerCase()} in ${hood}, ${boro}?`,
      a: content
        ? `${evt.name} in ${hood} starts at ${content.price}. Final pricing depends on group size, services selected, and any add-ons. Contact us for a custom quote tailored to your event.`
        : `Pricing for ${evt.name.toLowerCase()} in ${hood} depends on group size and services selected. Contact us for a free, no-obligation quote.`,
    },
  ];

  /* Sibling neighborhoods for cross-linking */
  const boroHoods = neighborhoods[borough] ?? [];
  const siblings = boroHoods.filter((n) => n.slug !== neighborhood).slice(0, 4);

  return (
    <>
      {/* ── JSON-LD ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        serviceSchema(`${evt.name} in ${hood}, ${boro}`, `Mobile ${evt.name.toLowerCase()} in ${hood}, ${boro}. ${evt.description}.`, `${hood}, ${boro}`)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Events", url: "/events" },
          { name: evt.name, url: `/events/${slug}` },
          { name: boro, url: `/events/${slug}/${borough}` },
          { name: hood, url: `/events/${slug}/${borough}/${neighborhood}` },
        ])
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #D4749B 0%, #E8A0BF 40%, #C9A96E 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href={`/events/${slug}`} className="hover:text-white/80">{evt.name}</Link>
            <span>/</span>
            <Link href={`/events/${slug}/${borough}`} className="hover:text-white/80">{boro}</Link>
            <span>/</span>
            <span className="text-white/40">{hood}</span>
          </div>
          <h1 className="font-display mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {evt.name} in <span className="italic">{hood}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/80">
            {evt.description} — delivered to your venue in {hood}, {boro}. Licensed, insured, and on your schedule.
            {content ? ` From ${content.price}.` : ""}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/book" className="btn-rose">Get a Quote</Link>
            <Link href="/events" className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
              Browse All Events
            </Link>
          </div>
        </div>
      </section>

      {/* ── Rich Content ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-6 text-2xl font-medium text-charcoal">
            What to expect from {evt.name.toLowerCase()} in {hood}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Our team arrives at your {hood} location with everything needed for {evt.name.toLowerCase()}.{" "}
              {content?.details
                ? content.details.split(". ").slice(0, 2).join(". ") + "."
                : `${evt.description}. We bring all tools, products, and supplies.`}
            </p>
            <p>
              No need to leave {hood} for a salon or event space. We set up at your home, hotel, office, or venue — anywhere with electricity and a bit of space.
              We serve {hood} and all surrounding neighborhoods in {boro}, 7 days a week, including evenings and weekends.
              Whether you&apos;re hosting at a private residence, an Airbnb, a loft, or a dedicated event venue, our mobile setup adapts to your space seamlessly.
            </p>
            {content?.details && (
              <p>
                {content.details.split(". ").slice(2).join(". ")}
              </p>
            )}
            {content?.ideal && (
              <p className="border-l-4 border-blush/40 pl-5 italic text-gray-500">
                {content.ideal}
              </p>
            )}
            <p>
              Every service is performed by licensed, insured professionals who specialize in {evt.name.toLowerCase()}.
              We&apos;ve worked hundreds of events across {boro} — from intimate gatherings in {hood} walk-ups to large-scale celebrations in event halls.
              We understand the rhythm of New York events and plan around your timeline, your photographer, and your guests.
              <Link href={`/events/${slug}`} className="ml-1 font-medium text-blush-dark hover:underline">Learn more about {evt.name.toLowerCase()}</Link> or{" "}
              <Link href={`/locations/${borough}/${neighborhood}`} className="font-medium text-blush-dark hover:underline">see all services in {hood}</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── What's Included ── */}
      {content && (
        <section className="bg-blush-light/40 px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display mb-6 text-xl font-semibold text-charcoal">What&apos;s included</h2>
            <ul className="space-y-3">
              {content.includes.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-gray-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush/20">
                    <svg className="h-3 w-3 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Quick Details ── */}
      <section className="bg-white px-4 py-14 md:py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-blush-dark">{content?.price ?? "Custom"}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">Starting price</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-blush-dark">{content?.groupSize ?? "Flexible"}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">Group size</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-blush-dark">{boro}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">Borough</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-blush-dark">Licensed</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">& fully insured</p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-blush-light/30 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display mb-10 text-2xl font-semibold text-charcoal">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Tell us about your event", desc: `Share your date, location in ${hood}, group size, and which services you need. We'll reply within a few hours with a custom plan.` },
              { step: "2", title: "Lock in your date", desc: "Review your quote, choose your services, and confirm your booking. We handle all the logistics from there." },
              { step: "3", title: "We show up and deliver", desc: `Our licensed team arrives at your ${hood} venue with everything needed. You relax — we take care of the rest.` },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blush/20 font-display text-lg font-bold text-blush-dark">{s.step}</span>
                <h3 className="font-display mb-2 text-base font-semibold text-charcoal">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why This Neighborhood ── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-center text-2xl font-semibold text-charcoal">
            Why {hood} for your event
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-pink-100 bg-blush-light/20 p-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blush/20">
                <svg className="h-5 w-5 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-sm font-semibold text-charcoal">We know {hood}</h3>
              <p className="text-sm text-gray-500">Our team has served dozens of events throughout {hood} and greater {boro}. We know the buildings, the parking, and the quickest routes to your door.</p>
            </div>
            <div className="rounded-xl border border-pink-100 bg-blush-light/20 p-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blush/20">
                <svg className="h-5 w-5 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-sm font-semibold text-charcoal">Always on time</h3>
              <p className="text-sm text-gray-500">Events run on tight schedules. We factor in {boro} traffic and arrive with time to spare — set up happens before your first guest walks in.</p>
            </div>
            <div className="rounded-xl border border-pink-100 bg-blush-light/20 p-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blush/20">
                <svg className="h-5 w-5 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="font-display mb-2 text-sm font-semibold text-charcoal">Licensed & insured</h3>
              <p className="text-sm text-gray-500">Every stylist is NYS-licensed and our business is fully insured. Venues, landlords, and event planners in {hood} can book with confidence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cross-Links ── */}
      <section className="bg-blush-light px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-6 text-xl font-semibold text-charcoal">Explore more</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Link href={`/locations/${borough}/${neighborhood}`} className="card-hover rounded-xl border border-pink-100 bg-white p-5 text-center">
              <p className="text-sm font-semibold text-charcoal">All Services</p>
              <p className="text-xs text-blush-dark">in {hood}</p>
            </Link>
            <Link href="/events" className="card-hover rounded-xl border border-pink-100 bg-white p-5 text-center">
              <p className="text-sm font-semibold text-charcoal">All Events</p>
              <p className="text-xs text-blush-dark">full menu</p>
            </Link>
            <Link href="/classes" className="card-hover rounded-xl border border-pink-100 bg-white p-5 text-center">
              <p className="text-sm font-semibold text-charcoal">Classes</p>
              <p className="text-xs text-blush-dark">learn beauty skills</p>
            </Link>
            <Link href={`/events/${slug}/${borough}`} className="card-hover rounded-xl border border-pink-100 bg-white p-5 text-center">
              <p className="text-sm font-semibold text-charcoal">{evt.name}</p>
              <p className="text-xs text-blush-dark">in all of {boro}</p>
            </Link>
            <Link href={`/locations/${borough}`} className="card-hover rounded-xl border border-pink-100 bg-white p-5 text-center">
              <p className="text-sm font-semibold text-charcoal">All {boro}</p>
              <p className="text-xs text-blush-dark">neighborhoods</p>
            </Link>
            <Link href="/services" className="card-hover rounded-xl border border-pink-100 bg-white p-5 text-center">
              <p className="text-sm font-semibold text-charcoal">Full Menu</p>
              <p className="text-xs text-blush-dark">all services &amp; pricing</p>
            </Link>
          </div>

          {/* Sibling neighborhoods */}
          {siblings.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                {evt.name} nearby in {boro}
              </h3>
              <div className="flex flex-wrap gap-2">
                {siblings.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/events/${slug}/${borough}/${n.slug}`}
                    className="rounded-full border border-pink-200 bg-white px-4 py-1.5 text-xs font-medium text-blush-dark transition hover:bg-blush/10"
                  >
                    {n.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-center text-2xl font-semibold text-charcoal">
            Frequently asked questions
          </h2>
          <dl className="divide-y divide-pink-100">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-5">
                <dt className="font-display text-base font-semibold text-charcoal">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-gray-500">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-blush-light/50 px-4 py-20 text-center md:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-charcoal md:text-4xl">
            Book {evt.name.toLowerCase()} in <span className="italic">{hood}</span>
          </h2>
          <p className="mx-auto mb-4 max-w-lg text-gray-500">
            Your venue. Our team. {content ? `From ${content.price}.` : "Custom packages available."}
            {" "}We handle setup, service, and cleanup — you just enjoy the event.
          </p>
          <p className="mb-8 text-sm text-gray-400">
            No contracts. No hidden fees. Free quotes within 24 hours.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/book" className="btn-rose">Get a Free Quote</Link>
            <Link href="/events" className="text-sm font-medium text-blush-dark hover:underline">
              Browse all events
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
