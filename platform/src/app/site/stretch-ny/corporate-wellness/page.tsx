import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK, SITE_EMAIL } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "Corporate Stretch Service NYC | Office Wellness Programs",
  description: "Corporate stretch service for NYC offices. On-site employee wellness programs. Reduce injuries, boost productivity. Custom pricing. All 5 boroughs.",
  alternates: { canonical: `${SITE_URL}/corporate-wellness` },
};

const benefits = [
  { title: "Reduce Workplace Injuries", desc: "Regular stretching reduces musculoskeletal injuries by up to 50%. Fewer sick days, fewer workers' comp claims, healthier employees." },
  { title: "Boost Productivity", desc: "Employees who stretch regularly report higher energy levels, better focus, and improved concentration. A stretched team is a productive team." },
  { title: "Improve Morale", desc: "On-site wellness programs show employees you care about their health. It's a powerful retention and recruitment tool in competitive NYC markets." },
  { title: "Reduce Stress", desc: "Professional stretching releases physical tension and triggers relaxation responses. Your team will handle deadlines and pressure with ease." },
  { title: "Better Posture", desc: "Desk workers develop chronic posture issues. Regular stretching corrects imbalances from hours of sitting and screen time." },
  { title: "Zero Disruption", desc: "We come to your office and set up in any available space. Sessions are quick and efficient — employees return to work feeling refreshed, not drained." },
];

const programTypes = [
  {
    name: "Weekly On-Site",
    desc: "Recurring weekly sessions at your office. Therapist arrives, sets up, and provides 15-30 minute stretch sessions for individual employees throughout the day.",
    ideal: "Companies with 20+ employees wanting consistent wellness programming.",
  },
  {
    name: "Monthly Wellness Day",
    desc: "A dedicated wellness day once a month where our team provides stretch sessions for all employees. Combine with lunch-and-learns about ergonomics and self-care.",
    ideal: "Companies wanting regular wellness perks without weekly commitment.",
  },
  {
    name: "Event & Team Building",
    desc: "One-time stretch events for team offsites, company retreats, product launches, or wellness fairs. Interactive, energizing, and memorable.",
    ideal: "Companies hosting events or looking for unique team-building activities.",
  },
  {
    name: "Executive Wellness",
    desc: "Private 60-minute stretch sessions for executives and leadership teams. Scheduled at their convenience in their office or a private conference room.",
    ideal: "C-suite and senior leadership wanting personal wellness support.",
  },
];

export default function CorporateWellnessPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Corporate Wellness Programs", "On-site stretching programs for NYC offices and companies.", `${SITE_URL}/corporate-wellness`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Corporate Wellness", url: `${SITE_URL}/corporate-wellness` },
      ])} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">For NYC Companies</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Corporate Wellness Programs
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Bring professional assisted stretching to your NYC office. Healthier employees, fewer injuries, better productivity.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Office Stretching Works</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            NYC desk workers spend 8+ hours sitting daily. Professional stretching addresses the physical toll of office work before it becomes chronic.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program Types */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Program Options</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Every corporate wellness program is customized to your company&apos;s size, schedule, and goals.
          </p>
          <div className="mt-10 space-y-6">
            {programTypes.map((p) => (
              <div key={p.name} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{p.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
                <p className="mt-3 text-xs font-semibold text-teal-600">Ideal for: {p.ideal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How It Works</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Contact Us", desc: "Tell us about your company, team size, and wellness goals." },
              { step: "2", title: "Custom Plan", desc: "We design a program tailored to your office, budget, and schedule." },
              { step: "3", title: "We Show Up", desc: "Our therapists arrive with all equipment. We set up in any available space." },
              { step: "4", title: "Team Feels Great", desc: "Employees return to work refreshed, focused, and pain-free." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">{s.step}</div>
                <h3 className="mt-3 text-base font-bold text-slate-900 font-heading">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Numbers Speak</h2>
          <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { stat: "50%", label: "Reduction in musculoskeletal complaints" },
              { stat: "32%", label: "Decrease in sick days taken" },
              { stat: "25%", label: "Improvement in reported focus" },
              { stat: "90%", label: "Employee satisfaction with program" },
            ].map((s) => (
              <div key={s.stat} className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
                <p className="text-3xl font-bold text-teal-600">{s.stat}</p>
                <p className="mt-2 text-xs text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Industries We Serve</h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              "Tech & Startups",
              "Finance & Banking",
              "Law Firms",
              "Media & Advertising",
              "Healthcare",
              "Real Estate",
              "Architecture & Design",
              "Hospitality",
            ].map((industry) => (
              <div key={industry} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-sm font-semibold text-slate-700">{industry}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Build a Healthier Team?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Contact us for a custom corporate wellness proposal. We&apos;ll design a program that fits your company&apos;s needs and budget.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={`mailto:${SITE_EMAIL}?subject=Corporate%20Wellness%20Inquiry`} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Email for Corporate Pricing
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">{SITE_EMAIL} | {SITE_PHONE}</p>
        </div>
      </section>
      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">374 Neighborhoods</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">132 Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/services/assisted-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
            <Link href="/locations/manhattan" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Manhattan</Link>
            <Link href="/locations/brooklyn" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Brooklyn</Link>
            <Link href="/locations/queens" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Queens</Link>
          </div>
        </div>
      </section>

    </>
  );
}
