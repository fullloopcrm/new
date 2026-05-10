// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { services, clientTypes, boroughs, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "Stretch Therapist Jobs NYC | $50/hr | Stretch NYC",
  description:
    "Stretch service therapist jobs across all 5 NYC boroughs. $50/hr, flexible schedule 7AM-10PM, fast payment. Join the Stretch NYC team. Apply at stretchjobs.com.",
  alternates: { canonical: `${SITE_URL}/jobs` },
};

const requirements = [
  "Experienced in assisted stretching, PNF, massage therapy, or related bodywork",
  "Carry your own mat to every session",
  "Must be located in or able to travel to NYC",
  "Punctual — clients expect you on time, every time",
  "Positive attitude and genuine passion for helping people move better",
  "Strong knowledge of anatomy and human movement",
  "Excellent communication and client interaction skills",
  "Legal authorization to work in the United States",
];

const perks = [
  {
    title: "Starting $50/Hour",
    desc: "Competitive hourly rate with no cap on sessions. The more you work, the more you earn.",
  },
  {
    title: "Fast Payment",
    desc: "Get paid within 30 minutes of completing your session. No waiting for bi-weekly paychecks.",
  },
  {
    title: "Established Client Base",
    desc: "We already have clients booked and waiting. No need to build your own book of business.",
  },
  {
    title: "Flexible Schedule",
    desc: "Choose your own hours between 7AM and 10PM, 7 days a week. Work when it fits your life.",
  },
  {
    title: "We Handle Everything Else",
    desc: "Marketing, sales, scheduling, payment processing — we handle it all so you can focus on stretching.",
  },
  {
    title: "All Five Boroughs",
    desc: "Work in any NYC borough. Choose areas convenient to you. No long commutes required.",
  },
];

const dayInTheLife = [
  {
    title: "Morning Session — Upper West Side",
    time: "9:00 AM",
    desc: "Arrive at a client's apartment on the Upper West Side. Roll out your mat, perform a quick mobility assessment, and deliver a 60-minute assisted stretching session focused on lower back and hip relief. Client is a desk worker who sits 10 hours a day.",
  },
  {
    title: "Midday Session — Midtown Office",
    time: "12:00 PM",
    desc: "Head to a corporate client's office in Midtown. Quick setup in a conference room. Focus on neck, shoulders, and upper back — the classic desk worker problem areas. You're in and out in 70 minutes.",
  },
  {
    title: "Afternoon Session — Williamsburg",
    time: "3:00 PM",
    desc: "A runner in Williamsburg booked a recovery stretching session after their morning marathon training. PNF techniques on hamstrings, quads, and calves. They can barely touch their toes when you arrive — they're reaching past them when you leave.",
  },
  {
    title: "Evening Session — Financial District Hotel",
    time: "6:30 PM",
    desc: "A tourist at a FiDi hotel has been walking 25,000 steps a day exploring NYC. Full-body passive stretching session focused on legs, back, and shoulders. They tip you $40 because they can finally walk without limping.",
  },
];

export default function JobsPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Jobs at Stretch NYC — Hiring Stretch Therapists",
          "We're hiring mobile stretch therapists across NYC. $50/hr, flexible schedule, fast payment.",
          `${SITE_URL}/jobs`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Now Hiring &mdash; Mobile Stretch Therapists | $50/hr | All 5 Boroughs
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service Jobs — <span className="text-teal-200">$50/hr NYC</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Join NYC&apos;s fastest-growing mobile stretch service team. Part-time, flexible scheduling 7AM-10PM. Fast payment within 30 minutes. Established client base. We handle marketing, sales, and scheduling.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://stretchjobs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta"
            >
              Apply at stretchjobs.com
            </a>
            <a
              href="mailto:jobs@stretchny.com?subject=Stretch%20Therapist%20Application"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
            >
              Email jobs@stretchny.com
            </a>
          </div>
        </div>
      </section>

      {/* Open Position Summary */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">
              Open Position
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">
              Part-Time Mobile Stretch Therapist
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                Starting $50/hr
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                Part-Time / Flexible
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                7AM - 10PM Daily
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                All 5 NYC Boroughs
              </span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                Paid Within 30 Min
              </span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We&apos;re looking for experienced stretch therapists to join our
              growing team of mobile wellness professionals. You&apos;ll travel
              to clients across NYC — homes, offices, hotels, parks, and outdoor
              locations — providing personalized assisted stretching sessions.
              Bring your own mat, bring your best energy, and we handle
              everything else.
            </p>
          </div>
        </div>
      </section>

      {/* Browse by Borough */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Jobs by Borough
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We&apos;re hiring stretchologists in every NYC borough. Pick your
            preferred area and see open positions near you.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {boroughs.map((b) => (
              <Link
                key={b.slug}
                href={`/jobs/${b.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  {b.shortName}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  View stretch therapist positions across {b.name}{" "}
                  neighborhoods.
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">
                  View {b.name} Jobs &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Service Type */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Jobs by Service Specialty
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We need therapists skilled in every stretch modality. Find the
            specialty that matches your expertise.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/jobs/service/${s.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {s.shortDesc}
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">
                  View Specialist Jobs &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Client Specialty */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Jobs by Client Specialty
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Different clients need different expertise. Find positions focused on
            the populations you love working with.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {clientTypes.map((ct) => (
              <Link
                key={ct.slug}
                href={`/jobs/specialty/${ct.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md"
              >
                <span className="text-2xl">{ct.emoji}</span>
                <h3 className="mt-2 text-base font-bold text-slate-900 font-heading">
                  {ct.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                  {ct.shortDesc}
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">
                  View Jobs &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Why Work With Stretch NYC
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk) => (
              <div
                key={perk.title}
                className="rounded-xl border border-teal-200/60 bg-white p-6"
              >
                <h3 className="text-lg font-bold text-teal-700 font-heading">
                  {perk.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Requirements
          </h2>
          <div className="mt-10 space-y-3">
            {requirements.map((req) => (
              <div
                key={req}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <span className="mt-0.5 text-teal-600 font-bold">
                  &#10003;
                </span>
                <p className="text-sm text-slate-700">{req}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A Day in the Life */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            A Day in the Life
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Here&apos;s what a typical day looks like as a Stretch NYC
            stretchologist.
          </p>
          <div className="mt-10 space-y-6">
            {dayInTheLife.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-teal-200/60 bg-white p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                    {item.time}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">
            Ready to Become a Stretchologist?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Apply today and start earning $50/hour with the most flexible
            schedule in wellness. We pay within 30 minutes, handle all
            marketing and scheduling, and have clients ready for you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://stretchjobs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta"
            >
              Apply at stretchjobs.com
            </a>
            <a
              href="mailto:jobs@stretchny.com?subject=Stretch%20Therapist%20Application"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
            >
              Email jobs@stretchny.com
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">
            Or call/text us at{" "}
            <a href={SITE_SMS_LINK} className="underline hover:text-white">
              {SITE_PHONE}
            </a>
          </p>
        </div>
      </section>
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Locations</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/contact" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Contact</Link>
          </div>
        </div>
      </section>

    </>
  );
}
