// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "About Stretch NYC | NYC's #1 Mobile Stretch Service",
  description: "About Stretch NYC — NYC's premier mobile stretch service. Certified therapists, $99/hr, 10% off weekly. Serving all 5 boroughs 7AM-10PM. Learn our story.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={webPageSchema("About Stretch NYC", "Learn about NYC's premier mobile assisted stretching service.", `${SITE_URL}/about`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "About", url: `${SITE_URL}/about` },
      ])} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">About Us</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            About Stretch NYC
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            New York City&apos;s premier mobile assisted stretching service. We bring professional flexibility and rehabilitation therapy directly to you.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Our Story</h2>
          <div className="mt-8 space-y-6 text-base text-slate-600 leading-relaxed">
            <p>
              Stretch NYC was founded with a simple mission: make professional assisted stretching accessible to every New Yorker. We saw a city full of people dealing with chronic pain, stiffness, and limited mobility from the demands of NYC life — long subway commutes, hours at desks, intense workouts, and the general wear and tear of living in the fastest city in the world.
            </p>
            <p>
              Traditional stretching studios require you to travel across town, wait for appointments, and work around their schedule. We flipped that model. Our certified stretch therapists come directly to your home, office, hotel room, or any location across all five boroughs. We bring professional-grade equipment and transform any space into a therapy environment.
            </p>
            <p>
              What started as a small operation serving Manhattan has grown into NYC&apos;s most trusted mobile stretching service, with certified therapists covering Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Every session is personalized to your body, your goals, and your schedule.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Our Mission</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            To help every New Yorker move better, feel better, and live without pain — by bringing world-class assisted stretching directly to their door.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600">100%</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Mobile</h3>
              <p className="mt-2 text-sm text-slate-600">We come to you. No commute, no hassle. Your home, office, hotel, or park — we bring everything.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600">5.0</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Star Rated</h3>
              <p className="mt-2 text-sm text-slate-600">Perfect 5-star rating from 31+ reviews. Our clients love the results they get from every session.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600">7-10PM</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Daily Hours</h3>
              <p className="mt-2 text-sm text-slate-600">Open 7AM to 10PM, seven days a week. Early morning, lunch break, or evening — we fit your schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Our Team</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Every Stretch NYC therapist is certified, experienced, and passionate about helping people move better.
          </p>
          <div className="mt-10 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Certified Stretch Therapists</h3>
              <p className="mt-2 text-sm text-slate-600">
                All therapists hold certifications in assisted stretching, PNF techniques, and myofascial release. Many have backgrounds in sports medicine, physical therapy, and rehabilitation. Every therapist undergoes rigorous training before joining our team.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Professional Standards</h3>
              <p className="mt-2 text-sm text-slate-600">
                Our therapists maintain the highest professional standards. They arrive on time, bring all necessary equipment, conduct thorough assessments, and tailor every session to your specific needs. Professionalism, hygiene, and client comfort are non-negotiable.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Ongoing Education</h3>
              <p className="mt-2 text-sm text-slate-600">
                Our team stays current with the latest stretching techniques, sports science research, and rehabilitation methods. Continuous education ensures you receive the most effective, evidence-based treatment available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Where We Serve</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Stretch NYC provides mobile assisted stretching across all five boroughs of New York City.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"].map((borough) => (
              <Link key={borough} href={`/locations/${borough.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="rounded-xl border border-teal-200/60 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-base font-bold text-teal-700 font-heading">{borough}</h3>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-teal-200/60 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900 font-heading">We Also Come To:</h3>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm text-slate-600">
              <li>Your home or apartment</li>
              <li>Your office or coworking space</li>
              <li>Hotels and Airbnbs</li>
              <li>NYC parks and outdoor spaces</li>
              <li>Gyms and fitness studios</li>
              <li>Corporate offices and events</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Experience Our Assisted Stretch Service?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Book your first mobile assisted stretch service session today. $99/hr for professional stretching at your location. 10% off weekly.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/services" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">374 Neighborhoods</Link>
            <Link href="/parks" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">132 Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Discounts</Link>
            <Link href="/locations/manhattan" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Manhattan</Link>
            <Link href="/locations/brooklyn" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Brooklyn</Link>
            <Link href="/locations/queens" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Queens</Link>
            <Link href="/locations/bronx" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Bronx</Link>
            <Link href="/locations/staten-island" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Staten Island</Link>
            <Link href="/services/assisted-stretch-service-in-nyc" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Assisted Stretching</Link>
            <Link href="/services/pnf-stretch-service-in-nyc" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">PNF Stretching</Link>
            <Link href="/services/myofascial-release-stretch-service-in-nyc" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Myofascial Release</Link>
            <Link href="/services/recovery-stretch-service-in-nyc" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Recovery Stretching</Link>
            <Link href="/services/gentle-stretch-service-in-nyc" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Senior Stretch</Link>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Text {SITE_PHONE} — Book Now
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
