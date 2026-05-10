// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL, CITY_COUNT, STATE_COUNT } from "@/app/site/we-pay-you-junk/_data/content";

export const metadata: Metadata = {
  title: "Careers at We Pay You Junk Removal — We're Hiring Nationwide",
  description: "Join the only junk removal company that pays customers. We're hiring crew members, drivers, and team leads in 900+ cities across all 50 states.",
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Join the Team</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Careers at <span className="gradient-text">We Pay You</span> Junk Removal</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">We&apos;re hiring in {CITY_COUNT} cities across all {STATE_COUNT} states. Join the only junk removal company that actually values what customers have.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Crew Member Jobs Near Me</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Junk Removal Crew Member</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Our crew members handle everything from <Link href="/services" className="text-teal-600 underline">full-service junk removal</Link> pickups to on-site item appraisals, working directly with customers at every stop. You&apos;ll train on valuation, safe handling, and our unique pay-back model that sets us apart from every other hauling company. Explore our <Link href="/locations" className="text-teal-600 underline">nationwide service areas</Link> to see where crews are hiring, or <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">book a pickup</Link> to experience the process from the customer side.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>As a We Pay You Junk Removal crew member, you&apos;re not just hauling junk — you&apos;re running a mobile appraisal and removal operation. You&apos;ll work directly with customers, load and transport items, evaluate items for resale value, and deliver an experience that makes people say &quot;I can&apos;t believe a junk removal company just paid me.&quot;</p>
            <p>This is a physical job — you&apos;ll be lifting, carrying, loading, and driving every day. But it&apos;s also a thinking job. You need to spot the difference between a $50 table and a $500 one, know which appliances are worth appraising, and communicate clearly with customers about values and credits. We train you on all of this — no prior appraisal experience needed.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Competitive Pay", desc: "Hourly base pay plus performance bonuses based on customer ratings and job efficiency." },
              { title: "Tips & Bonuses", desc: "Customers love our service and tip generously. Plus quarterly bonuses for top performers." },
              { title: "Full Training", desc: "Multi-week paid training program covering safe handling, appraisal techniques, and customer service." },
              { title: "Flexible Schedule", desc: "Full-time and part-time positions available. Choose your days and shift preferences." },
              { title: "Growth Path", desc: "Clear advancement from crew member to team lead to operations manager. We promote from within." },
              { title: "Benefits", desc: "Health insurance, paid time off, and 401k for full-time crew members." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Best Junk Removal Company to Work For</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Work With Us</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We built a junk removal business where crews actually enjoy the work — because customers leave happy. Learn more <Link href="/about" className="text-teal-600 underline">about our story</Link> and the pay-back model that fuels positive interactions on every job. Check our <Link href="/pricing" className="text-teal-600 underline">transparent pricing</Link> to see how resale value offsets customer costs, or explore <Link href="/franchise" className="text-teal-600 underline">franchise opportunities</Link> if you want to run your own operation.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>We&apos;re not a typical junk removal company, and this isn&apos;t a typical junk removal job. Our crew members are trained appraisers, customer service professionals, and logistics operators rolled into one. You&apos;ll develop real skills in valuation, customer interaction, and operations management — skills that transfer to careers in real estate, sales, logistics, and business ownership.</p>
            <p>The work environment is different too. Because we share resale value with customers, the energy on every job is positive. Customers are happy — they&apos;re getting money back instead of just paying a bill. That positivity makes the day better for our crews. The tips are better, the reviews are better, and the job satisfaction is higher than anywhere else in the industry.</p>
            <p>We&apos;re growing fast. We currently operate in {CITY_COUNT} cities and we&apos;re adding more every week. That growth creates opportunities — new team lead positions, new market launches, new operations roles. If you want to grow with a company that&apos;s changing an industry, this is the place.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Job Requirements and Qualifications</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Requirements</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every crew member needs to meet a few baseline qualifications before hitting the road. We provide full training on our <Link href="/services" className="text-teal-600 underline">junk removal services</Link> and appraisal process, but you&apos;ll need a valid license, the ability to lift heavy items, and a customer-first attitude. Review our <Link href="/services/furniture-removal" className="text-teal-600 underline">furniture removal</Link> and <Link href="/services/appliance-removal" className="text-teal-600 underline">appliance removal</Link> pages to see the types of jobs you&apos;ll handle daily.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "Valid driver's license and clean driving record",
              "Ability to lift 50+ lbs repeatedly throughout the day",
              "Reliable transportation to report to dispatch location",
              "Strong customer service skills — friendly, professional, communicative",
              "Smartphone with data plan for scheduling and appraisal tools",
              "Pass background check and drug screening",
              "Available to work weekends (our busiest days)",
              "Positive attitude and willingness to learn",
            ].map((req) => (
              <div key={req} className="flex items-start gap-3">
                <span className="text-teal-600 mt-0.5">✓</span>
                <span className="text-sm text-slate-700">{req}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What It&apos;s Like Working for a Junk Removal Company</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">A Day in the Life</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">From morning dispatch to end-of-day truck cleanup, every shift follows a structured routine designed to keep jobs efficient and customers happy. You&apos;ll handle a mix of <Link href="/services/estate-cleanout" className="text-teal-600 underline">estate cleanouts</Link>, single-item pickups, and everything in between across our <Link href="/locations" className="text-teal-600 underline">service locations</Link>. Ready to see it firsthand? <Link href="/book-junk-removal-service-today" className="text-teal-600 underline">Book a removal</Link> and watch our crew in action.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>7:00 AM:</strong> Report to dispatch. Check your truck, review the day&apos;s schedule — typically 3-5 jobs depending on size. Load any supplies needed.</p>
            <p><strong>8:00 AM - 12:00 PM:</strong> Morning jobs. Arrive at each customer&apos;s location, do a walkthrough, load items, appraise valuables, present the final invoice. Most morning blocks include 2-3 jobs.</p>
            <p><strong>12:00 - 1:00 PM:</strong> Lunch break. Drop off any resale items at the nearest resale partner location.</p>
            <p><strong>1:00 - 5:00 PM:</strong> Afternoon jobs. Same process — arrive, load, appraise, invoice. Afternoon jobs may include larger projects like estate cleanouts that take 2-3 hours.</p>
            <p><strong>5:00 - 6:00 PM:</strong> Return to dispatch. Unload remaining items for sorting, complete daily paperwork, clean the truck for tomorrow. Day done.</p>
            <p>Most crew members work 8-9 hour days, 4-5 days per week. Overtime is available and common during busy season (March-June).</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Apply for Junk Removal Jobs Today</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Join the Team?</h2>
          <p className="mt-4 text-base text-white/70">Send us your name and city and we&apos;ll match you with the nearest open crew position. Learn more about our <Link href="/about" className="text-teal-200 underline">company mission</Link>, browse open <Link href="/locations" className="text-teal-200 underline">locations</Link>, or check out our <Link href="/services" className="text-teal-200 underline">full service list</Link> to see what you&apos;ll be doing every day.</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Email us your name, city, and a brief note about your experience. We&apos;ll get back to you within 48 hours.</p>
          <div className="mt-8">
            <a href={`mailto:${EMAIL}?subject=Job Application`}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply Now — Email {EMAIL}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
