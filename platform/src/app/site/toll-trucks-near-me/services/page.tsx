// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/toll-trucks-near-me/_data/content";
import { SERVICES, SERVICE_CATEGORIES } from "@/app/site/toll-trucks-near-me/_data/services";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";

export const metadata: Metadata = {
  title: `Tow Truck Services — ${SERVICES.length} Dispatch-Ready Services Nationwide`,
  description: `${SERVICES.length} tow truck and roadside assistance services. Emergency towing, heavy-duty recovery, specialty transport, and $75 flat roadside assists. 24/7 dispatch. Flat upfront pricing.`,
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const categories = Object.entries(SERVICE_CATEGORIES) as [
    keyof typeof SERVICE_CATEGORIES,
    (typeof SERVICE_CATEGORIES)[keyof typeof SERVICE_CATEGORIES]
  ][];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0">
          <Image src="/images/flatbed-tow.jpg" alt="Flatbed tow truck" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-teal-900/80" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">
            {SERVICES.length} Dispatch-Ready Service Types
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Every Tow & Roadside Service<br />
            <span className="gradient-text">Under One Dispatch Number</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Emergency towing, heavy-duty recovery, specialty transport, commercial fleet service, and $75 flat roadside assistance. 24/7 live dispatch. Equipment-matched trucks the first time.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Intro */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            One Dispatch, Every Truck Class
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            How Our Services Work — Flat Upfront Pricing, Equipment-Matched Dispatch
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            When you call, you&apos;re talking to a live dispatcher — not an IVR. Every service below is available 24/7/365 with the same upfront pricing model. See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing page</Link> for the full rate card.
          </p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>The tow industry&apos;s reputation for bait-and-switch pricing is earned. A phone quote of &quot;$85 to hook up&quot; becomes $340 on the invoice after &quot;mileage escalators,&quot; &quot;after-hours premiums,&quot; &quot;dolly fees,&quot; and &quot;storage holds&quot; stack on. We refuse to play that game. We quote the full price on the phone — hookup plus per-mile — and that price is final on the invoice.</p>
            <p>Equipment-matched dispatch means we send the right truck the first time. Flatbeds for AWD, luxury, low-clearance, and EVs. Wheel-lifts for parking decks and tight spaces. Medium-duty for cargo vans and box trucks. Heavy wreckers (50-ton and 75-ton) for semis, buses, RVs. Motorcycle-rated flatbeds for bikes. No repeat trips because a generic dispatcher guessed wrong about what you drive.</p>
            <p>Live 24/7 dispatch in <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT}+ cities across {STATE_COUNT} states</Link>. Standard arrival under 60 minutes. Emergency Priority guarantees 30 minutes or we take $50 off automatically.</p>
          </div>
        </div>
      </section>

      {/* Categorized services */}
      {categories.map(([key, cat], idx) => {
        const filtered = SERVICES.filter((s) => s.category === key);
        if (filtered.length === 0) return null;
        const bg = idx % 2 === 0 ? "bg-section-teal" : "bg-section-white";
        return (
          <section key={key} className={`${bg} py-16`}>
            <div className="mx-auto max-w-5xl px-6">
              <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
                {cat.description}
              </p>
              <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
                {cat.label}
              </h2>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-teal-400 hover:shadow-md h-full flex flex-col"
                  >
                    {service.image && (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={`/images/${service.image}.jpg`}
                          alt={service.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">
                        {service.title}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                      <p className="mt-3 text-sm text-slate-600 flex-1">{service.description}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {service.ideal.map((tag) => (
                          <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">
                        Learn More →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Pricing summary */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Flat Upfront Pricing for Every Service
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            The Quote on the Phone Is the Price on the Invoice
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Towing:</strong> Light-duty $95 hookup + $3.50/mi (first 5 miles included). Medium-duty $150 + $5/mi. Heavy-duty $350 + $7/mi. All miles quoted upfront based on your destination — not estimated at the scene.</p>
            <p><strong>Roadside assistance:</strong> $75 flat for jump-starts, tire changes, lockouts, fuel delivery, and mobile battery testing. Most roadside calls resolve in under 20 minutes on-scene without needing a tow.</p>
            <p><strong>Emergency Priority:</strong> +$50 for 30-minute arrival guarantee. If we&apos;re late, we automatically take $50 off the invoice — making Priority effectively free when we miss.</p>
            <p><strong>Direct-bill:</strong> AAA, Geico, State Farm, Progressive, Allstate, USAA, and most third-party networks (Agero, Allied, Urgently) bill directly. Show the driver your card; you pay nothing at the scene.</p>
            <p><strong>No contracts:</strong> Every call is standalone. No subscriptions. No minimums beyond the standard hookup fee. <Link href="/book-tow-truck-now" className="text-teal-700 font-semibold hover:underline">Book when you need us</Link>, get a firm quote, and get dispatched.</p>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            Why Drivers Choose Us Over the Random Google-Search Operator
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Toll Trucks Near Me vs. Predatory Tow Operators
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>A random tow truck off a Google search is a coin flip — some operators are fine, and many are running the bait-and-switch playbook: low phone quote, stacked surcharges at the scene, destination-control to their partner yard, and $65/day storage fees while your insurance adjuster tries to release your vehicle.</p>
            <p>Our operation is structured to eliminate every one of those failure modes. Firm phone quote. Equipment-matched dispatch. Destination of YOUR choice. No storage traps. Live dispatchers you can actually call back when you need to.</p>
            <p>That applies across all {SERVICES.length} of our services. <Link href="/services/emergency-towing" className="text-teal-700 font-semibold hover:underline">Emergency towing</Link>, <Link href="/services/accident-recovery" className="text-teal-700 font-semibold hover:underline">accident recovery</Link>, <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">flatbed towing</Link>, and the full roadside assistance lineup — same pricing model, same equipment-matched dispatch, same 24/7 availability.</p>
          </div>
        </div>
      </section>

      {/* Nationwide */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            All {SERVICES.length} Services Available in {CITY_COUNT}+ Cities
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Nationwide Tow Dispatch — Every Service in Every City We Cover
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            All {SERVICES.length} services available in every one of our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT}+ cities across {STATE_COUNT} states</Link>. Same pricing, same 24/7 dispatch, same equipment-matched fleet. <Link href="/book-tow-truck-now" className="text-teal-700 font-semibold hover:underline">Book now</Link> or call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a>.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Dispatch Any of Our {SERVICES.length} Services — 24/7 Nationwide
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Flat upfront pricing. 30-minute arrival option. Equipment-matched dispatch. Same rate card every day of the year.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
