import Link from "next/link";
import { EMAIL, CITY_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title: "Fleet Partner Program — Join the Roadside Helper Network 24/7",
  description:
    "Join The Roadside Helper dispatch network as a fleet partner. For tow operators, mobile mechanics, and independent roadside contractors. Pay-per-call, no membership tier locks, transparent compensation.",
  path: "/franchise",
});

export default function FranchisePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">Fleet Partner Program</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Join the <span className="text-amber-300">Roadside Helper</span> Network</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">For tow operators, mobile mechanics, and independent roadside contractors. Pay-per-call dispatch, transparent compensation, no franchise fees.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">For Roadside Contractors</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Partner With Us</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>The Roadside Helper dispatch network routes calls to qualified local contractors in {CITY_COUNT}+ cities. Unlike auto-club contractor agreements that lock you into low per-call rates and prioritize the club&apos;s economics over yours, our partnership is straightforward: predictable per-call compensation, no membership tier games, no auto-renewing exclusivity contracts.</p>
            <p>Contractors who fit our network: experienced tow operators with their own equipment, mobile mechanics who can handle on-site lockouts and basic roadside repair, independent roadside service providers with proper licensing and insurance. We don&apos;t dispatch to untrained operators or one-vehicle outfits without proper insurance documentation.</p>
            <p>The partnership economics work because we operate the customer-facing brand, dispatch infrastructure, and billing — and you operate the service vehicles and crew. Customers pay us at the flat $149/hr rate; partners receive a transparent split per call. No surprise deductions, no after-the-fact &quot;quality fees,&quot; no automatic renewals.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Partnership Benefits</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What You Get</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Steady Dispatch", desc: "We market the brand, drive the inbound calls, and route work to your service area. You handle the calls; we handle the customers." },
              { title: "Transparent Compensation", desc: "Per-call rates documented upfront. No buried deductions, no quality-fee surprises. Monthly statement with line-item detail." },
              { title: "No Franchise Fees", desc: "No upfront franchise purchase, no monthly royalty floor, no equipment buy-in requirement. You provide the truck and the crew; we provide the customers." },
              { title: "Centralized Billing", desc: "We handle customer billing, payment processing, and collections. You receive direct deposit; we absorb chargebacks and bad-debt risk." },
              { title: "Training & Standards", desc: "Onboarding training on our customer-experience standards. Ongoing performance reviews focused on customer-rated quality, not arbitrary scoring." },
              { title: "Territory Routing", desc: "Calls in your geographic area route to you first when you're available. Multi-partner overflow only when you're at capacity or unavailable." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Partnership Requirements</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Who We Partner With</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our partners share a few traits: they own and operate their own service vehicles (we don&apos;t lease vehicles), they carry their own commercial liability and auto insurance at industry-standard coverage levels, they have background-checked technicians, and they care about customer experience as much as we do.</p>
            <p>Required: at minimum one service vehicle suitable for roadside work (tow truck, service truck, or properly-equipped van), commercial general liability and auto insurance with us listed as additional insured, current state-required licensing for tow operations or roadside service in your jurisdiction, and a clean operating history.</p>
            <p>We do not partner with: brokers who don&apos;t own their vehicles, operators without commercial insurance, anyone with a history of customer-complaint patterns, or contractors who can&apos;t pass our background and licensing verification.</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Interested?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">Email us to request our fleet partner information packet. Include your service area, vehicle types, current insurance limits, and a brief operating history.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={`mailto:${EMAIL}?subject=Fleet Partner Inquiry`}>
              <span className="inline-block rounded-lg bg-amber-400 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-amber-300 font-cta">Email {EMAIL}</span>
            </a>
            <Link href="/contact-the-roadside-helper" className="text-white/80 hover:text-white underline">Or use the contact form</Link>
          </div>
        </div>
      </section>
    </>
  );
}