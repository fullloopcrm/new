// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { womensCategories, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getServiceBySlug, getNeighborhoodName, getBoroughName, serviceSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";

export const revalidate = 2592000;
export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string; borough: string; neighborhood: string }> };

function isWomensService(slug: string): boolean {
  return womensCategories.some((cat) => cat.services.some((s) => s.slug === slug));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, borough, neighborhood } = await params;
  const svc = getServiceBySlug(slug);
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!svc || !hood || !boro) return {};
  const content = serviceContent[slug];
  return {
    title: `${svc.name} in ${hood}, ${boro} — Mobile Service`,
    description: `Book mobile ${svc.name.toLowerCase()} in ${hood}, ${boro}. ${svc.description}. Licensed professionals come to your door.${content ? ` From ${content.price}.` : ""} The NYC Mobile Salon.`,
    alternates: { canonical: `https://thenycmobilesalon.com/services/${slug}/${borough}/${neighborhood}` },
  };
}

export default async function ServiceNeighborhoodPage({ params }: Props) {
  const { slug, borough, neighborhood } = await params;
  const svc = getServiceBySlug(slug);
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!svc || !hood || !boro) notFound();

  const isWomens = isWomensService(slug);
  const content = serviceContent[slug];
  const svcLower = svc.name.toLowerCase();

  /* Nearby neighborhoods — up to 4 siblings from the same borough */
  const boroughHoods = neighborhoods[borough] ?? [];
  const nearby = boroughHoods.filter((h) => h.slug !== neighborhood).slice(0, 4);

  /* FAQ data */
  const faqs: { q: string; a: string }[] = [
    {
      q: `How do I book ${svcLower} in ${hood}?`,
      a: `Booking is simple. Visit our online booking page, select ${svc.name}, choose your date and time, and enter your ${hood} address. A licensed professional will arrive at your door with everything needed for your appointment.`,
    },
    {
      q: `How much does mobile ${svcLower} cost in ${hood}, ${boro}?`,
      a: content
        ? `${svc.name} starts at ${content.price}. Pricing may vary based on add-ons, hair length, or complexity. You will see the full price before confirming your booking.`
        : `Pricing depends on the specifics of your appointment. Visit our pricing page for current rates, or book online to see your total before confirming.`,
    },
    {
      q: `Are your ${svcLower} professionals licensed in New York?`,
      a: `Absolutely. Every professional on our team holds a valid New York State license, carries liability insurance, and has been vetted through our quality review process. Your safety and satisfaction are non-negotiable.`,
    },
  ];

  return (
    <>
      {/* JSON-LD: Service */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        serviceSchema(`${svc.name} in ${hood}, ${boro}`, `Mobile ${svcLower} in ${hood}, ${boro}. ${svc.description}.`, `${hood}, ${boro}`)
      ) }} />
      {/* JSON-LD: Breadcrumb */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Services", url: "/services" },
          { name: svc.name, url: `/services/${slug}` },
          { name: boro, url: `/services/${slug}/${borough}` },
          { name: hood, url: `/services/${slug}/${borough}/${neighborhood}` },
        ])
      ) }} />
      {/* JSON-LD: FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={isWomens ? { background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 100%)" } : { background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href={`/services/${slug}`} className="hover:text-white/80">{svc.name}</Link>
            <span>/</span>
            <Link href={`/services/${slug}/${borough}`} className="hover:text-white/80">{boro}</Link>
            <span>/</span>
            <span className="text-white/40">{hood}</span>
          </div>
          <h1 className="font-display mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {svc.name} in <span className="italic">{hood}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            {svc.description} — delivered to your door in {hood}, {boro}. Licensed, insured, and on your schedule.
            {content ? ` From ${content.price}.` : ""}
          </p>
          <div className="mt-8">
            <Link href="/book" className={isWomens ? "btn-outline-white" : "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display"}>Book Now</Link>
          </div>
        </div>
      </section>

      {/* ── Rich Content ─────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-6 text-2xl font-medium text-charcoal">
            What to expect from {svcLower} in {hood}
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Your licensed {isWomens ? "stylist" : "barber"} arrives at your {hood} location with everything needed for {svcLower}. {content?.details ?? `${svc.description}. We bring all tools, products, and sanitation supplies.`}
            </p>
            <p>
              No commute from {hood} to a salon or barbershop. No parking. No waiting. Just professional results in the comfort of your own space, on your schedule. We serve {hood} and all surrounding neighborhoods in {boro}, 7 days a week.
            </p>
            <p>
              {content?.ideal ?? `Whether you are getting ready for work, a night out, a special event, or simply treating yourself, mobile ${svcLower} in ${hood} lets you skip the trip and get exactly what you need at home, at your office, or at your hotel.`} For full details on what every appointment includes, visit our{" "}
              <Link href={`/services/${slug}`} className={`underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>{svc.name} service page</Link>.
            </p>
            <p>
              We designed our mobile service for the way {hood} residents actually live. Tight schedules, small apartments, long work hours — none of that matters when the salon comes to you. Our{" "}
              <Link href="/how-it-works" className={`underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>how-it-works page</Link>{" "}
              breaks down the full process from booking to appointment, so you know exactly what to expect. And if you are curious about cost, our{" "}
              <Link href="/pricing" className={`underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>pricing page</Link>{" "}
              has transparent rates for every service.
            </p>
            <p>
              Whether you live in a walk-up, a doorman building, or a brownstone, we will make it work. Our {isWomens ? "stylists" : "barbers"} bring a portable setup that fits any space, and clean up is part of the service. We are currently booking {svcLower} across{" "}
              <Link href={`/services/${slug}/${borough}`} className={`underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>all of {boro}</Link>, including {hood} and nearby neighborhoods.
            </p>
          </div>
        </div>
      </section>

      {/* ── What's Included ──────────────────────────────────────────── */}
      {content && (
        <section className={`px-6 py-16 md:py-20 ${isWomens ? "bg-blush-light" : "bg-sky-50"}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display mb-6 text-xl font-semibold text-charcoal">What&apos;s included</h2>
            <ul className="space-y-2">
              {content.includes.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-gray-700">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                    <svg className={`h-3 w-3 ${isWomens ? "text-blush-dark" : "text-sky-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Quick Details ────────────────────────────────────────────── */}
      {content && (
        <section className="border-y border-gray-100 bg-white px-6 py-12">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
            <div className="text-center">
              <p className={`font-display text-2xl font-bold ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>{content.price}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">Starting price</p>
            </div>
            <div className="text-center">
              <p className={`font-display text-2xl font-bold ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>{content.duration}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">Duration</p>
            </div>
            <div className="text-center">
              <p className={`font-display text-2xl font-bold ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>{boro}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">Borough</p>
            </div>
            <div className="text-center">
              <p className={`font-display text-2xl font-bold ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>NYS</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">Licensed &amp; insured</p>
            </div>
          </div>
        </section>
      )}

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-10 text-center text-2xl font-medium text-charcoal">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Book online", desc: `Pick ${svcLower}, choose a date and time, and enter your ${hood} address.` },
              { step: "2", title: "We arrive", desc: `Your licensed ${isWomens ? "stylist" : "barber"} shows up with everything needed — tools, products, and sanitation supplies.` },
              { step: "3", title: "Enjoy", desc: `Sit back and get pampered. We clean up when we are done. You look amazing.` },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-bold text-white ${isWomens ? "bg-blush-dark" : "bg-sky-600"}`}>
                  {s.step}
                </div>
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Mobile in [Hood] ──────────────────────────────────────── */}
      <section className={`px-6 py-16 md:py-20 ${isWomens ? "bg-blush-light" : "bg-sky-50"}`}>
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-10 text-center text-2xl font-medium text-charcoal">
            Why mobile {svcLower} in {hood}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                title: `No commute from ${hood}`,
                desc: `Skip the subway, the walk, and the wait. Your ${isWomens ? "stylist" : "barber"} comes directly to your ${hood} address — apartment, office, or hotel.`,
              },
              {
                title: "Your schedule, your space",
                desc: `Book mornings, evenings, or weekends. We work around your life, not the other way around. Early call time? Late night event? We have got you.`,
              },
              {
                title: "Licensed & insured",
                desc: `Every professional on our team holds a valid New York State license and carries liability insurance. Quality and safety, guaranteed.`,
              },
            ].map((card) => (
              <div key={card.title} className={`rounded-xl border bg-white p-6 ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
                <h3 className="font-display mb-2 text-base font-semibold text-charcoal">{card.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-Links ──────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-6 text-xl font-semibold text-charcoal">Explore more in {hood}</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Link href={`/locations/${borough}/${neighborhood}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <p className="text-sm font-semibold text-charcoal">All Services</p>
              <p className={`text-xs ${isWomens ? "text-gray-400" : "text-sky-500"}`}>in {hood}</p>
            </Link>
            <Link href={`/locations/${borough}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <p className="text-sm font-semibold text-charcoal">All {boro}</p>
              <p className={`text-xs ${isWomens ? "text-gray-400" : "text-sky-500"}`}>neighborhoods</p>
            </Link>
            <Link href="/services" className={`card-hover rounded-xl border bg-white p-5 text-center ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <p className="text-sm font-semibold text-charcoal">Full Menu</p>
              <p className={`text-xs ${isWomens ? "text-gray-400" : "text-sky-500"}`}>all services</p>
            </Link>
            <Link href={`/events/${borough}/${neighborhood}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <p className="text-sm font-semibold text-charcoal">Events</p>
              <p className={`text-xs ${isWomens ? "text-gray-400" : "text-sky-500"}`}>in {hood}</p>
            </Link>
            <Link href={`/classes/${borough}/${neighborhood}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <p className="text-sm font-semibold text-charcoal">Classes</p>
              <p className={`text-xs ${isWomens ? "text-gray-400" : "text-sky-500"}`}>in {hood}</p>
            </Link>
            <Link href={`/services/${slug}/${borough}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <p className="text-sm font-semibold text-charcoal">{svc.name}</p>
              <p className={`text-xs ${isWomens ? "text-gray-400" : "text-sky-500"}`}>in all of {boro}</p>
            </Link>
          </div>

          {/* Nearby neighborhoods */}
          {nearby.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display mb-4 text-base font-semibold text-charcoal">
                {svc.name} in nearby {boro} neighborhoods
              </h3>
              <div className="flex flex-wrap gap-2">
                {nearby.map((n) => (
                  <Link key={n.slug} href={`/services/${slug}/${borough}/${n.slug}`} className={`rounded-full border px-4 py-1.5 text-sm transition hover:-translate-y-0.5 ${isWomens ? "border-pink-200 text-blush-dark hover:bg-blush-light" : "border-sky-200 text-sky-600 hover:bg-sky-50"}`}>
                    {n.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className={`px-6 py-16 md:py-20 ${isWomens ? "bg-blush-light" : "bg-sky-50"}`}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-2xl font-medium text-charcoal">
            Frequently asked questions about {svcLower} in {hood}
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-display mb-2 text-base font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20 text-center md:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-charcoal md:text-4xl">
            Book {svc.name} in <span className="italic">{hood}</span>
          </h2>
          <p className="mb-3 text-lg text-gray-500">
            Your spot. Our pro. {content ? `From ${content.price}.` : "Let\u2019s go."}
          </p>
          <p className="mb-8 text-sm text-gray-400">
            Licensed professionals serving {hood} and all of {boro}, 7 days a week. Same-week availability.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/book" className={isWomens ? "btn-rose" : "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display"}>
              Book Your Appointment
            </Link>
            <Link href="/pricing" className={`inline-block rounded-full border px-9 py-3.5 text-sm font-semibold uppercase tracking-wider transition hover:-translate-y-0.5 font-display ${isWomens ? "border-blush-dark text-blush-dark hover:bg-blush-light" : "border-sky-500 text-sky-600 hover:bg-sky-50"}`}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
