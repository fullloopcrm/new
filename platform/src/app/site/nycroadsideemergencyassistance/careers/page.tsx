import type { Metadata } from "next";
import { getPhoto } from "@/app/site/nycroadsideemergencyassistance/_data/photos";
import Image from "next/image";
import Link from "next/link";
import { EMAIL, CITY_COUNT, STATE_COUNT } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { JsonLd, breadcrumbSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Tow Truck Driver Jobs Hiring Now — W-2 Employment, All Boroughs",
  description: "Hiring tow drivers, dispatchers, and heavy-duty operators across all 5 NYC boroughs. W-2 employment, competitive pay, full benefits for full-time. CDL holders welcome.",
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Careers", url: "/careers" },
        ])}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">W-2 Employment — Full Benefits — NYC Only</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading"><span className="gradient-text">NYC Tow Truck Driver Jobs</span> Hiring Now — W-2 Employment, All Boroughs</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Hiring across all {STATE_COUNT} boroughs and {CITY_COUNT}+ neighborhoods. Tow drivers, dispatchers, heavy-duty operators. W-2, not gig. Competitive pay, full benefits for full-time.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Open Roles</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Check positions across our five <Link href="/locations" className="text-teal-600 underline">borough hubs</Link> or apply via our <Link href="/apply-for-towing-job" className="text-teal-600 underline">application page</Link>.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { title: "Light-Duty Tow Driver", desc: "Wheel-lift and flatbed operator. Conventional cars, sedans, compact SUVs, motorcycles. Clean driving record required, tow experience preferred but full training provided." },
              { title: "Heavy-Duty Operator", desc: "CDL required. Heavy wrecker work on Cross Bronx, Deegan, BQE, bridges. Box trucks, sprinters, Class 6–8 vehicles. Premium pay, seasoned team." },
              { title: "Dispatcher", desc: "NYC dispatch — routing trucks in real time, quoting rates, coordinating with fleet accounts, carriers, and property managers. Requires NYC street knowledge and sharp phone skills." },
              { title: "Flatbed Specialist", desc: "AWD, EV, luxury, and low-clearance vehicle specialist. Training on Tesla, Rivian, and other EV-specific procedures. Experience with high-value vehicles a plus." },
              { title: "Road Service Technician", desc: "Roadside specialist — battery replacement, tire changes, lockouts, gas delivery. Quick-response mindset, diagnostic skills, customer-facing role." },
              { title: "Fleet Account Manager", desc: "Commercial sales and account service — DSPs, rideshare operators, body shops, property managers. Existing B2B sales experience required." },
            ].map((role) => (
              <div key={role.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{role.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative mx-auto mb-12 aspect-[16/6] max-w-4xl overflow-hidden rounded-2xl shadow-lg">
            {(() => { const _photo = getPhoto("_careers"); return (<Image src={_photo.url} alt={_photo.alt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" priority={false} />); })()}
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Work Here</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>W-2 employment, not gig.</strong> Proper tax withholding, workers&apos; compensation, and full benefits for full-time roles. No 1099 games, no &quot;independent contractor&quot; runarounds.</p>
            <p><strong>Real training.</strong> Every driver goes through our training program. Safe tie-down procedures, NYC-specific hazards (streetcar tracks, bike-lane curbs, low-clearance garages), AWD and EV handling, lockout techniques that don&apos;t fry airbag modules, and the appraisal / diagnostic skills that separate pros from slim-jim operators.</p>
            <p><strong>Competitive pay.</strong> Hourly plus overtime at time-and-a-half. Performance bonuses on customer ratings and job efficiency. Tips flow directly to drivers. Heavy-duty and specialty work (EV, luxury, long-haul) pay at premium rates.</p>
            <p><strong>Growth path.</strong> Entry-level driver → heavy-duty → specialty (EV, luxury, long-distance) → senior driver → dispatch → operations management. We promote from within. Dispatchers are usually former drivers who know the streets.</p>
            <p><strong>Consistent schedule.</strong> Full-time and part-time available. Pick your shift preferences. Overnight, weekend, and holiday shifts pay the same as daytime (no split wage). Overtime is available and common during winter (battery season) and summer (traffic / overheating season).</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Requirements</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "Valid NY driver&apos;s license (CDL for heavy-duty roles)",
              "Clean driving record (no major violations in 3 years)",
              "Pass background check and pre-employment drug screen",
              "21+ years old",
              "Eligible for US W-2 employment",
              "Willing to work overnight, weekend, and holiday shifts",
              "Physically able to handle tow equipment and lug nuts",
              "Smartphone for dispatch, navigation, and digital paperwork",
              "Customer-facing communication skills (we train the rest)",
              "Ability to work independently once trained",
            ].map((req) => (
              <div key={req} className="flex items-start gap-3">
                <span className="text-teal-600 mt-0.5">✓</span>
                {/* SAFE: static operator-authored literal (colocated array in this file); raw HTML is intentional (HTML entities / inline <a>). Sanitize if ever DB-sourced — audit §2.4b. */}
                <span className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: req }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Apply?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Two ways to apply: our <Link href="/apply-for-towing-job" className="text-teal-200 underline">application form</Link>, or email us directly.
          </p>
          <div className="mt-8">
            <a href={`mailto:${EMAIL}?subject=Driver Application`}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Email {EMAIL}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}