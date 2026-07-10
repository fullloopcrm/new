import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/we-pay-you-junk/_data/content";
import { SERVICES } from "@/app/site/we-pay-you-junk/_data/services";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";

export const metadata: Metadata = {
  title: "About We Pay You Junk Removal — The Only Junk Company That Pays You Back",
  description: "We Pay You Junk Removal started with a radical idea: customers deserve a cut when their items have resale value. Starting at $200/hr, dump fees included, 50% Resale Credit (when applicable). 900+ cities, 50 states, 34 services.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">The Only Junk Removal Company That Pays You Back</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            About We Pay You<br /><span className="gradient-text">Junk Removal</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            The junk removal industry has a dirty secret. Every company charges you for the service and keeps 35%+ of your items to resell for profit. We built the only company that shares resale value with customers.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* ===== OUR STORY ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How We Got Here</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Our Story — The Industry&apos;s Dirty Secret</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We spent years inside the junk removal industry before launching We Pay You Junk Removal. What we saw convinced us the entire model was broken. Learn more about our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing</Link>, our <Link href="/services" className="text-teal-700 font-semibold hover:underline">{SERVICES.length} services</Link>, and how we operate across <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT} cities</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Here&apos;s what the junk removal industry doesn&apos;t want you to know: every major company — from the franchises to the local operators — charges you full price to haul your stuff away, then turns around and resells 35% or more of it for pure profit. That vintage dresser, the working appliances, the power tools in the garage — they make money on your items and never share a dime with you. It&apos;s been this way for decades and nobody has challenged it.</p>
            <p>We spent years working in this industry, watching the same thing happen on every job. Crews would load a truck, take it back to the warehouse, sort through everything, and pull out items worth hundreds — sometimes thousands — of dollars. The customer never knew. They&apos;d already paid full price and walked away thinking everything went to the landfill. The resale revenue was pure margin for the company.</p>
            <p>We started asking a simple question: what if we split that value with the customer? The industry said it couldn&apos;t work. Too complicated. Too slow. Customers wouldn&apos;t care. We tested it anyway — first in one city, then five, then twenty. Customers didn&apos;t just care. They were stunned. They had no idea their &quot;junk&quot; had value, and they were thrilled to get credit for it.</p>
            <p>That radical idea became We Pay You Junk Removal. Today we operate in {CITY_COUNT} cities across all {STATE_COUNT} states with 50 offices and growing. We&apos;ve proven what the industry said was impossible: you can run a profitable junk removal company, charge a fair hourly rate with <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">dump fees included</Link>, and still share resale value with your customers. We do it every single day.</p>
          </div>
        </div>
      </section>

      {/* ===== MISSION & VALUES ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What Drives Us</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Our Mission &amp; Values</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Everything we do is guided by five core principles. From <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">estate cleanouts</Link> to <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">furniture removal</Link>, these values show up in every <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">job we book</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p><strong>Mission:</strong> To build the most honest junk removal company in America — one that charges a fair rate, includes dump fees, and shares resale value with the people whose items we haul. We believe your stuff has value and you deserve a cut.</p>
            <p><strong>Transparency:</strong> No hidden fees. No surprise surcharges. No volume-based guessing games. Starting at $200/hr with a 1 hour minimum and dump fees included. You watch the clock. You see every appraisal. You approve every credit. Our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing page</Link> tells you exactly what you&apos;ll pay — and we stick to it.</p>
            <p><strong>Fairness:</strong> The 50% Resale Credit (when applicable) exists because we refuse to profit from your items without sharing the upside. Other companies keep 100% of resale revenue. We split it 50/50 because that&apos;s what&apos;s right. If your credits exceed your bill, we pay you the difference — same day, on the spot.</p>
            <p><strong>Environmental Responsibility:</strong> We divert 60% of what we haul from landfills. Items with value get resold. Items without resale value but in usable condition get donated. Materials like metal, cardboard, and electronics get recycled. Only truly unsalvageable waste goes to the dump — and even then, we pay the dump fees so you don&apos;t have to.</p>
            <p><strong>Respect:</strong> Your home is your space. Our crews show up on time, protect your floors and walls, communicate clearly, and leave the space cleaner than they found it. We treat every job — from a single <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">couch removal</Link> to a full <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial cleanout</Link> — with the same level of care.</p>
          </div>
        </div>
      </section>

      {/* ===== HOW WE'RE DIFFERENT ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Why Customers Choose Us</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How We&apos;re Different</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Six reasons We Pay You Junk Removal is not like any other junk company. See our full <Link href="/services" className="text-teal-700 font-semibold hover:underline">service list</Link>, read our <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link>, or check <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link> for details.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">$200/hr</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Simple Hourly Rate</h3>
              <p className="mt-2 text-sm text-slate-600">Starting at $200/hr with a 1 hour minimum. No volume estimates, no truck-fraction pricing, no hidden fees. Dump fees included — an industry first.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">50%</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Resale Credit</h3>
              <p className="mt-2 text-sm text-slate-600">When your items have resale value, we credit you 50% (when applicable). Appraisals happen on-site, in real time, with your approval on every item.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">You Get Paid</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Credits Can Exceed Your Bill</h3>
              <p className="mt-2 text-sm text-slate-600">If your resale credits add up to more than the cost of the job, we cut you a check or send a digital payment. Same day, on the spot.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">{SERVICES.length}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Specialized Services</h3>
              <p className="mt-2 text-sm text-slate-600">From <Link href="/services/estate-cleanouts" className="text-teal-700 font-semibold hover:underline">estate cleanouts</Link> to <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">furniture removal</Link> to <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial jobs</Link> — we have a crew trained for your exact situation.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">60%</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Diverted From Landfills</h3>
              <p className="mt-2 text-sm text-slate-600">We resell, donate, and recycle 60% of everything we haul. Your items get a second life instead of sitting in a landfill.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">5.0</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Star Rating</h3>
              <p className="mt-2 text-sm text-slate-600">200+ verified reviews and a perfect 5.0 rating. Our customers are consistently surprised by the credit system — and they tell everyone about it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OUR TEAM ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">The People Behind Every Job</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Our Team</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Every crew member is background-checked, fully insured, and trained in our appraisal system. Interested in joining? See our <Link href="/careers" className="text-teal-700 font-semibold hover:underline">careers page</Link> or learn about <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise opportunities</Link>. Questions? <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-700 font-semibold hover:underline">Contact us</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Our crews aren&apos;t just haulers — they&apos;re trained appraisers. Every team member goes through our proprietary valuation training program, learning to identify brands, assess condition, check comparable sales data, and determine fair market value on the spot. This is what makes the 50% Resale Credit (when applicable) possible: our crews know what your items are worth and they can prove it.</p>
            <p>Every crew member passes a comprehensive background check before their first job. They&apos;re insured, bonded, and trained in proper lifting techniques, floor and wall protection, and respectful communication. When our crew walks into your home, you&apos;re getting professionals who treat your space like their own.</p>
            <p>We hire locally in every market we serve. Your crew lives in your city, knows your neighborhood, and understands local resale values. That local knowledge means faster, more accurate appraisals — and bigger credits for you. It also means we&apos;re investing in your community with real jobs and real career paths.</p>
          </div>
        </div>
      </section>

      {/* ===== NATIONWIDE COVERAGE ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Coast to Coast Coverage</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Nationwide Coverage — {CITY_COUNT} Cities, {STATE_COUNT} States, 50 Offices</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We operate in every major metro and hundreds of smaller markets. Find your city on our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations page</Link>, check <Link href="/services" className="text-teal-700 font-semibold hover:underline">available services</Link>, or <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">book a job today</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>We Pay You Junk Removal operates 50 regional offices across all {STATE_COUNT} states, serving {CITY_COUNT} cities and counting. Each office is staffed with local crews who know their market — the resale landscape, the donation partners, the recycling facilities, and the neighborhoods they serve. This isn&apos;t a franchise model with absentee operators. Every office is company-owned and held to the same standards.</p>
            <p>Whether you&apos;re in New York, Los Angeles, Chicago, Houston, Phoenix, or a smaller market, the experience is the same: starting at $200/hr, dump fees included, 50% Resale Credit (when applicable), and a crew that shows up on time and does the job right. Our national scale means we can serve you anywhere — and our local presence means we understand your market.</p>
            <p>Need junk removal in your area? <Link href="/locations" className="text-teal-700 font-semibold hover:underline">Browse all locations</Link> to find your city, or text <a href={SMS_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a> to reach a local coordinator who can get a crew to you — often the same day.</p>
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Ready to See What Your Junk Is Worth?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Starting at $200/hr. Dump fees included. 50% Resale Credit (when applicable). The only junk removal company that pays you back.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
