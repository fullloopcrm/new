import Link from "next/link";
import Logo from "@/app/site/stretch-service/_components/Logo";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK, SITE_EMAIL } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-service/_lib/schema";

export const metadata: Metadata = {
  title: "Stretch Service Jobs NYC | $50/hr | Join Our Team",
  description: "Join the Stretch Service team. Hiring mobile stretch therapists nationwide. $50/hr part-time, flexible hours, fast payment. Apply today.",
  alternates: { canonical: `${SITE_URL}/careers` },
};

const requirements = [
  "Certification in assisted stretching, PNF, or related modality",
  "Experience with hands-on bodywork (massage therapy, physical therapy, or sports training)",
  "Strong knowledge of anatomy and human movement",
  "Excellent communication and client interaction skills",
  "Reliable, punctual, and professional",
  "Able to transport equipment to client locations nationwide",
  "Passion for health, wellness, and helping people",
  "Legal authorization to work in the United States",
];

const perks = [
  { title: "$50/Hour Pay", desc: "Competitive hourly rate with no cap on sessions. The more you work, the more you earn." },
  { title: "Flexible Schedule", desc: "Choose your own hours. Work mornings, evenings, or weekends — whatever fits your life." },
  { title: "Equipment Provided", desc: "We supply professional massage tables, mats, straps, and all necessary tools." },
  { title: "Growing Client Base", desc: "We handle all marketing and booking. You focus on doing what you love — stretching clients." },
  { title: "All Five Boroughs", desc: "Work in any NYC borough. Choose areas convenient to you. No long commutes required." },
  { title: "Training & Support", desc: "Ongoing training in advanced techniques. Join a team of professionals who support each other." },
];

export default function CareersPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Careers at Stretch Service", "Join Stretch Service as a certified stretch therapist. $50/hr, flexible schedule.", `${SITE_URL}/careers`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Careers", url: `${SITE_URL}/careers` },
      ])} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Join Our Team</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Careers at Stretch Service
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            We&apos;re hiring certified stretch therapists. Earn $50/hour with flexible part-time scheduling across New York City.
          </p>
        </div>
      </section>

      {/* Open Position */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Now Hiring</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Mobile Stretch Therapist</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">$50/hour</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Part-Time / Flexible</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">All NYC Boroughs</span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Stretch Service is looking for certified stretch therapists to join our growing team of mobile wellness professionals. You&apos;ll travel to clients nationwide — homes, offices, hotels, and outdoor locations — providing personalized assisted stretching sessions. This is a flexible, part-time position ideal for therapists who want to earn great pay on their own schedule.
            </p>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Work With Stretch Service</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk) => (
              <div key={perk.title} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">{perk.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Requirements</h2>
          <div className="mt-10 space-y-3">
            {requirements.map((req) => (
              <div key={req} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                <p className="text-sm text-slate-700">{req}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What a Typical Day Looks Like */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">A Day in the Life</h2>
          <div className="mt-10 space-y-6">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Morning Session — Upper West Side</h3>
              <p className="mt-2 text-sm text-slate-600">
                9:00 AM start at a client&apos;s apartment. Set up your portable table, perform a mobility assessment, and deliver a 60-minute session focused on lower back and hip relief.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Midday Session — Midtown Office</h3>
              <p className="mt-2 text-sm text-slate-600">
                12:00 PM at a corporate client&apos;s office. Quick setup in a conference room. Focus on neck, shoulders, and upper back — the classic desk worker problem areas.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Evening Session — Brooklyn Heights</h3>
              <p className="mt-2 text-sm text-slate-600">
                6:00 PM at a runner&apos;s home after their evening jog. Focus on hamstrings, quads, and calves with PNF techniques for maximum recovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Join the Team?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Send us your resume and a brief introduction. Tell us about your experience with assisted stretching and why you want to join Stretch Service.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={`mailto:${SITE_EMAIL}?subject=Stretch%20Therapist%20Application`} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Email Your Application
            </a>
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Text {SITE_PHONE}
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">Send to: {SITE_EMAIL}</p>
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
            <Link href="/services/assisted-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
            <Link href="/locations/manhattan" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Manhattan</Link>
            <Link href="/locations/brooklyn" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Brooklyn</Link>
            <Link href="/locations/queens" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Queens</Link>
          </div>
        </div>
      </section>

    </>
  );
}
