import Link from "next/link";
import Image from "next/image";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";
import { LongFormSection } from "@/app/site/toll-trucks-near-me/_components/LongFormSection";
import { HOMEPAGE_SECTIONS } from "@/app/site/toll-trucks-near-me/_data/homepage-content";
import {
  PHONE,
  PHONE_HREF,
  SMS_HREF,
  HOURS,
  RATING,
  REVIEW_COUNT,
  CITY_COUNT,
  STATE_COUNT,
  SERVICES,
  PRICING,
  TESTIMONIALS,
  FAQ,
  TOP_CITIES,
} from "@/app/site/toll-trucks-near-me/_data/content";

export default function HomePage() {
  const topServices = SERVICES.slice(0, 9);

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-tow-truck.jpg"
            alt="Tow truck on highway"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-teal-900/80" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">
            24/7 Nationwide Tow Truck Dispatch
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">Toll Trucks Near Me</span>
            <br />
            30-Minute Arrival or $50 Off
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Live dispatchers 24/7. Flat upfront pricing — the number we quote on the phone is the number on your invoice. Light-duty, medium-duty, and heavy-duty towing plus $75 flat roadside assistance. Licensed, insured, equipment-matched the first time.
          </p>

          {/* Trust stat cards */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{HOURS}</p>
              <p className="mt-1 text-sm font-semibold text-amber-300 font-cta">Live Dispatch</p>
              <p className="mt-1 text-xs text-white/50">No IVR, no phone tree</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">30 min</p>
              <p className="mt-1 text-sm font-semibold text-amber-300 font-cta">Priority Arrival</p>
              <p className="mt-1 text-xs text-white/50">Or $50 off your bill</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">From $95</p>
              <p className="mt-1 text-sm font-semibold text-amber-300 font-cta">Light-Duty Tow</p>
              <p className="mt-1 text-xs text-white/50">First 5 miles included</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white font-heading">{CITY_COUNT}</p>
              <p className="mt-1 text-sm font-semibold text-amber-300 font-cta">Cities Covered</p>
              <p className="mt-1 text-xs text-white/50">All {STATE_COUNT} states</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg bg-amber-400 px-8 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-colors hover:bg-amber-300 font-cta">
                Call {PHONE} — 24/7 Dispatch
              </span>
            </a>
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/80 font-cta">
                Text {PHONE}
              </span>
            </a>
            <Link href="/book-tow-truck-now">
              <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/80 font-cta">
                Book a Tow
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── WHAT WE DO ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Tow Truck Service Done Right
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What Is Toll Trucks Near Me?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            A nationwide tow dispatch network built to end the surcharge-stack pricing games the industry is known for. Serving <Link href="/locations" className="text-teal-600 underline">{CITY_COUNT} cities</Link> across all {STATE_COUNT} states with <Link href="/services" className="text-teal-600 underline">{SERVICES.length} dispatch-ready services</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Here is what the tow industry does not want you to learn the hard way: a phone quote of &quot;$85 to hook up&quot; becomes $340 on the invoice after &quot;mileage escalators,&quot; &quot;after-hours premiums,&quot; &quot;dolly fees,&quot; &quot;winch fees,&quot; and &quot;storage holds&quot; are stacked on. Accident-scene tows get routed to whichever yard the officer on duty called first — not YOUR chosen shop. Then your vehicle sits in a predatory storage yard racking up $65/day fees while your insurance adjuster tries to release it.
            </p>
            <p>
              <strong>Toll Trucks Near Me does none of that.</strong> We quote the full price on the phone before any truck rolls — hookup fee plus per-mile, confirmed before dispatch. That price is final on the invoice. No surprises. You pick the destination shop. We tow there.
            </p>
            <p>
              Live dispatchers answer in under 3 rings, 24/7/365. No IVR, no phone tree, no &quot;the next available operator will be with you shortly.&quot; A human takes your call at 2 AM on Tuesday the same way they take it at 10 AM on Monday. You receive a text with your driver&apos;s name, truck number, and live ETA within 60 seconds of hanging up.
            </p>
            <p>
              We dispatch the right truck the first time. Flatbeds for AWD, low-clearance, and electric vehicles. Wheel-lifts for parking decks and tight spaces. Medium-duty for cargo vans and box trucks. Heavy wreckers (50-ton and 75-ton) for semis, buses, and RVs. Motorcycle-rated flatbeds for bikes. No repeat trips because someone guessed wrong.
            </p>
            <p>
              We cover <Link href="/locations" className="text-teal-600 underline">{CITY_COUNT} cities</Link> across all {STATE_COUNT} states. Standard arrival targets under 60 minutes. Emergency Priority dispatch guarantees 30 minutes — or we automatically take $50 off the invoice. See our <Link href="/pricing" className="text-teal-600 underline">pricing</Link>, explore our <Link href="/services" className="text-teal-600 underline">{SERVICES.length} services</Link>, or <Link href="/book-tow-truck-now" className="text-teal-600 underline">book a tow now</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ─── SERVICES GRID ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-700 font-cta">
            {SERVICES.length} Dispatch-Ready Services
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Tow Trucks & Roadside Assistance
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Emergency towing, heavy-duty recovery, specialty transport, roadside assistance. 24/7 live dispatch. Flat upfront pricing.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {topServices.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={`/images/${s.image || "hero-tow-truck"}.jpg`}
                    alt={s.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-300 font-cta">{s.subtitle}</p>
                    <h3 className="text-lg font-bold text-white font-heading">{s.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-slate-600">{s.description}</p>
                  <p className="mt-3 text-sm font-semibold text-teal-700 font-cta group-hover:text-teal-800">
                    Learn more →
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/services">
              <span className="inline-block rounded-lg border-2 border-teal-700 px-8 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
                All {SERVICES.length} Services →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Flat Upfront Pricing
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Know the Price Before the Truck Rolls
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            The quote on the phone is the price on the invoice. No surcharge stack. No storage-yard gotchas.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => (
              <div
                key={key}
                className={`rounded-xl border-2 p-6 ${
                  "popular" in tier && tier.popular
                    ? "border-teal-600 bg-teal-50 shadow-lg"
                    : "border-slate-200 bg-white"
                }`}
              >
                {"popular" in tier && tier.popular && (
                  <p className="mb-3 inline-block rounded-full bg-teal-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white font-cta">
                    Most Popular
                  </p>
                )}
                <h3 className="text-lg font-bold text-slate-900 font-heading">{tier.label}</h3>
                <p className="mt-2">
                  <span className="text-4xl font-bold text-slate-900 font-heading">{tier.price}</span>
                  <span className="ml-1 text-sm text-slate-500 font-cta">{tier.unit}</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-teal-600">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-sm font-semibold text-teal-700 underline font-cta">
              Full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-slate-900 py-16 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image src="/images/emergency-night.jpg" alt="" fill className="object-cover" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">
            How a Tow Call Actually Works
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold font-heading">5 Steps From Call to Drop-Off</h2>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-5">
            {[
              { n: 1, t: "Call", d: "Live dispatcher answers in under 3 rings. No IVR." },
              { n: 2, t: "Quote", d: "Firm upfront price. Hookup plus per-mile, confirmed before dispatch." },
              { n: 3, t: "ETA Text", d: "Driver name, truck number, and live ETA within 60 seconds." },
              { n: 4, t: "Arrival", d: "Equipment-matched truck. Pre-load walk-around. Damage photographed." },
              { n: 5, t: "Drop-Off", d: "YOUR chosen destination. Clean invoice. Direct-bill if you have it." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-2xl font-bold text-slate-900 font-heading">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-bold font-heading">{s.t}</h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LONG-FORM SECTIONS ─── */}
      {HOMEPAGE_SECTIONS.map((section) => (
        <LongFormSection key={section.id} section={section} />
      ))}

      {/* ─── TESTIMONIALS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            {RATING} Stars · {REVIEW_COUNT} Verified Reviews
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What Drivers Say After a Tow
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-0.5 text-amber-400 text-lg">
                  {"★".repeat(t.rating)}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 font-cta">
                  {t.name} <span className="text-slate-500 font-normal">· {t.location}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-700 font-cta">
            Frequently Asked Questions
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Answers for Drivers, Fleets, and First-Time Callers
          </h2>
          <div className="mx-auto mt-10 space-y-4">
            {FAQ.slice(0, 6).map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-slate-900 font-heading">{f.q}</h3>
                    <span className="text-xl text-teal-600 transition-transform group-open:rotate-45">+</span>
                  </div>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/faq" className="text-sm font-semibold text-teal-700 underline font-cta">
              See all FAQs →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TOP CITIES ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Local Coverage Nationwide
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Tow Trucks in {TOP_CITIES.length} Top Cities
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Local dispatchers, local operators, local knowledge of the highways and shops. 24/7/365 in every city we cover.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {TOP_CITIES.map((city) => (
              <Link
                key={city}
                href="/locations"
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-teal-500 hover:text-teal-700 font-cta"
              >
                {city}
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/locations" className="text-sm font-semibold text-teal-700 underline font-cta">
              All {CITY_COUNT} cities →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Need a Tow Right Now?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            24/7 live dispatch. 30-minute arrival option. Flat upfront pricing. Licensed & insured. Call the number — a human answers.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
