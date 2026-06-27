// @ts-nocheck
import Link from "next/link";
import { EMAIL, CITY_COUNT, STATE_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "Roadside Technician Jobs Near Me — Hourly + Tips, Paid Training | The Roadside Helper",
  description:
    "Roadside technician jobs in 900+ cities, all 50 states. Jump-starts, tire changes, lockouts, fuel, towing. Hourly base + tips, paid training, benefits. Apply today.",
  path: "/careers",
});

export default function CareersPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">Now Hiring</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Become a <span className="text-amber-300">Roadside Technician</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Hiring in {CITY_COUNT} cities across all {STATE_COUNT} states. Help drivers get back on the road — and get paid for it.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">The Role</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Roadside Technician</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>As a roadside technician, you'll be dispatched to drivers who need help — jump-starts, tire changes, lockouts, fuel delivery, towing, and winch-outs. You'll work from a service vehicle equipped with commercial-grade tools, follow proper safety procedures for highway-side work, and get drivers moving again as fast as possible.</p>
            <p>This is a physical, hands-on job. You'll be lifting, kneeling, working around traffic, dealing with weather, and handling stressful situations professionally. It's also a skilled job — knowing the difference between a one-time battery drain and a failing battery, knowing which lockout tools fit which makes, knowing when a flat tire can be plugged vs. when it needs the spare. We train on all of it.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Competitive Pay", desc: "Hourly base pay plus per-call bonuses for fast completion and 5-star customer ratings." },
              { title: "Tips", desc: "Drivers tip generously when you fix their problem fast and professionally. Average tips add 15-25% to base pay." },
              { title: "Paid Training", desc: "Multi-week paid training: safe roadside procedures, lockout technique, jump-start protocols, customer service." },
              { title: "Flexible Shifts", desc: "Day shifts, night shifts, weekends — choose what fits your schedule. Overnight pays the same flat rate to the customer, but techs get shift differentials." },
              { title: "Advancement", desc: "Clear path from technician to shift lead to operations manager. We promote from within whenever possible." },
              { title: "Benefits", desc: "Health insurance, paid time off, and 401k matching for full-time technicians." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Why Work With Us</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Drivers Like Working Here</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>The roadside industry has a reputation for high turnover and stressful work. We've structured the job to fix the worst parts. Flat-rate billing means you're not chasing volume or pressured to upsell — you fix the problem, document it, and move to the next call. Honest pricing means customers are usually relieved to see us, not braced for a fight.</p>
            <p>You work from a properly-equipped service vehicle (not your own car), the dispatch system gives you full information about each call before you arrive, and the company handles billing — you handle the service work. Real human dispatchers means you're not arguing with an automated system when something unexpected comes up.</p>
            <p>We're growing fast across {STATE_COUNT} states. That growth creates real opportunities — new market launches, new shift lead roles, new operations positions. If you want a roadside job that doesn't burn you out by year two, this is the place.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Requirements</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What You'll Need</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "Valid driver's license and clean 3-year driving record",
              "Ability to lift 50+ lbs repeatedly throughout the day",
              "Reliable transportation to and from dispatch base",
              "Strong customer-service instincts — calm under pressure, clear communicator",
              "Smartphone with data for dispatch app",
              "Pass background check and drug screening",
              "Available for overnight or weekend shifts (premium pay)",
              "Mechanical aptitude or willingness to learn",
            ].map((req) => (
              <div key={req} className="flex items-start gap-3">
                <span className="text-emerald-700 mt-0.5">✓</span>
                <span className="text-sm text-slate-700">{req}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">A Day in the Life</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What Shifts Look Like</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Shift start:</strong> Report to dispatch base or sign in remotely from your service vehicle. Review any active dispatch queue. Confirm equipment inventory on the truck.</p>
            <p><strong>Active dispatch:</strong> Calls route to you based on proximity. Each call comes with full info — customer name, location, vehicle make/model, problem description. You call the customer with your ETA before driving, then head out.</p>
            <p><strong>On scene:</strong> Confirm safety, walk the customer through what you're about to do, perform the service, document the work, collect payment via tablet. Typical call: 30–60 minutes door-to-door including drive time.</p>
            <p><strong>Between calls:</strong> Restock if needed, return to coverage zone, take meal breaks. Most technicians handle 4–8 calls per shift depending on geography and call mix.</p>
            <p><strong>End of shift:</strong> Return to base, sign off, log any equipment that needs replenishing for the next shift. Daily summary auto-generated.</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Apply?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">Email us your name, city, and a brief note about your experience. We'll respond within 48 hours.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={`mailto:${EMAIL}?subject=Roadside Technician Application`}>
              <span className="inline-block rounded-lg bg-amber-400 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-amber-300 font-cta">Email {EMAIL}</span>
            </a>
            <Link href="/apply-to-join-our-team" className="text-white/80 hover:text-white underline">Or use the application form</Link>
          </div>
        </div>
      </section>
    </>
  );
}