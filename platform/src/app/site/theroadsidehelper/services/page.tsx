// @ts-nocheck
import Link from "next/link";
import Image from "next/image";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { SERVICES, SERVICE_CATEGORIES } from "@/app/site/theroadsidehelper/_data/services";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { SERVICE_PHOTOS } from "@/app/site/theroadsidehelper/_data/photos";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "Roadside Assistance Services Near Me — 12 Services at $149/hr 24/7 | (888) 944-3001",
  description:
    "12 roadside services nationwide at flat $149/hr: jump-starts, flat tire change, lockouts, fuel delivery, towing, winch-outs, motorcycle/RV/diesel. Call (888) 944-3001. No membership.",
  keywords: [
    "roadside services near me",
    "24/7 roadside services",
    "jump start service",
    "flat tire change near me",
    "tow truck near me",
    "fuel delivery near me",
    "car lockout near me",
  ],
  path: "/services",
});

type CategoryKey = keyof typeof SERVICE_CATEGORIES;

const CATEGORY_ORDER: CategoryKey[] = ["emergency", "lockout", "fuel-power", "recovery", "specialty"];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">
            {SERVICES.length} Roadside Services — Nationwide
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Every Roadside Service You Need at $149/hr<br />
            <span className="text-amber-300">One Flat Rate, 24/7</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {SERVICES.length} specialized services. $149/hr flat rate with a 1-hour minimum. No memberships, no surcharges. Same rate overnights, weekends, and holidays.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Intro */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">
            What We Do
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            From Dead Batteries to Winch-Outs — One Call Handles It
          </h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Roadside service should be three things: fast, honest, and predictably priced. We dispatch around the clock, the rate is the same regardless of when you call, and the technician explains everything before they touch your vehicle. If it can&apos;t be fixed on-site, we tow you to a shop that can.</p>
            <p>We&apos;re in <Link href="/locations" className="text-emerald-700 font-semibold hover:underline">{CITY_COUNT}+ cities across {STATE_COUNT} states</Link>, with local technicians who know the area, the highways, and the right shops for follow-up work. Average response time is under 60 minutes in the cities we serve.</p>
          </div>
        </div>
      </section>

      {/* Category sections */}
      {CATEGORY_ORDER.map((cat, idx) => {
        const services = SERVICES.filter((s) => s.category === cat);
        if (services.length === 0) return null;
        const meta = SERVICE_CATEGORIES[cat];
        const bgClass = idx % 2 === 0 ? "bg-section-teal" : "bg-section-white";
        return (
          <section key={cat} className={`${bgClass} py-16`}>
            <div className="mx-auto max-w-5xl px-6">
              <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">{meta.label}</p>
              <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{meta.description}</h2>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => {
                  const photo = SERVICE_PHOTOS[service.slug];
                  return (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md h-full"
                    >
                      {photo && (
                        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                          <Image
                            src={photo.url}
                            alt={photo.alt}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-emerald-700 transition-colors">{service.title}</h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 font-cta">{service.subtitle}</p>
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">{service.description}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {service.ideal.slice(0, 3).map((tag) => (<span key={tag} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">{tag}</span>))}
                        </div>
                        <p className="mt-4 text-sm font-semibold text-emerald-700 group-hover:underline font-cta">Learn more →</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Pricing summary */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">How Pricing Works</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">$149/hr Flat — Same Rate Every Service</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>The rate:</strong> $149 per hour, 1-hour minimum. Same overnight, weekends, and holidays. No after-hours surcharges, no holiday premiums. Tow mileage past 5 miles, fuel-at-pump-price, and replacement parts are billed separately at cost.</p>
            <p><strong>The minimum:</strong> Most roadside jobs are completed inside the first hour. That means the minimum is often the maximum. If your situation is more complex and needs more time, the technician quotes the additional time before continuing.</p>
            <p><strong>No memberships:</strong> Pay only when you actually need help. No annual dues, no contracts, no auto-renewals. <Link href="/book-roadside-help-now" className="text-emerald-700 font-semibold hover:underline">Book when you need us</Link>, pay only for the time we work.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Need Help Right Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Call <a href={PHONE_HREF} className="text-amber-300 hover:underline">{PHONE}</a> for the fastest dispatch. We're picking up 24 hours a day.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}