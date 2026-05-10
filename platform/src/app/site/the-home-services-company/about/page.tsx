// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/the-home-services-company/_data/content";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";

export const metadata: Metadata = {
  title: "About Home Services Co — 40 Home Services, One Phone Number",
  description: "Home Services Co was built to solve vendor sprawl in home services. 40 services starting at $99/hour — licensed, insured, upfront pricing. 990 cities, 50 states.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">40 Home Services Under One Roof</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            About <span className="gradient-text">Home Services Co</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Most homeowners juggle too many vendors across too many trades. We consolidated 40 home services into one reliable company — starting at $99/hour with upfront pricing, licensed and insured technicians, and same-day availability across 990 cities.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* ===== OUR STORY ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Why We Exist</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Problem We Set Out to Solve</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Vendor sprawl is the default in home services, and it costs customers real time and money. Learn about our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">upfront pricing</Link>, our <Link href="/services" className="text-teal-700 font-semibold hover:underline">{SERVICES.length} services</Link>, and how we operate across <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT} cities</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Most homeowners have a contact list full of specialists — an HVAC guy, a plumber, an electrician, a painter, a handyman, a cleaner, and a dozen others. Every time something needs doing, the cycle starts over: call around, compare vague quotes, hope someone shows up, argue about the invoice. The industry has operated this way for decades, and it creates real costs in time, stress, and surprise charges.</p>
            <p>Home Services Co was built to collapse that contact list. We hired licensed technicians across 40 trades — HVAC, plumbing, electrical, painting, flooring, cleaning, handyman, remodeling, and the rest — and put them behind one phone number, one account, and one standard of service. Starting at $99/hour with upfront pricing on every job.</p>
            <p>Consolidation isn&apos;t just a convenience feature. It&apos;s the only way to actually fix vendor sprawl. When every trade operates under the same company, the standards become enforceable — the pricing model, the insurance coverage, the scheduling reliability, the accountability when something goes wrong. A good plumber can&apos;t fix a bad handyman, but a good company can fix the standards across every trade at once.</p>
            <p>Today we operate in {CITY_COUNT} cities across all {STATE_COUNT} states. We&apos;ve proven the model: you can run a home services company with <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">upfront pricing</Link>, licensed and insured technicians across every trade, and one phone number for all of it. And customers who try it once tend to call back for the next 39 services they need.</p>
          </div>
        </div>
      </section>

      {/* ===== VALUES ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What We Stand For</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Our Operating Principles</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Five principles that show up on every job — from <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link> to <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link> to <Link href="/book" className="text-teal-700 font-semibold hover:underline">every appointment we book</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p><strong>Upfront Pricing.</strong> Before any technician touches a tool at your home, you see a written estimate. Starting at $99/hour plus itemized parts and materials. The invoice at the end matches the estimate at the start. No mystery shop fees, no &ldquo;while we were here&rdquo; add-ons.</p>
            <p><strong>Licensed and Insured.</strong> Every technician holds the certifications their trade requires. The company carries general liability, commercial auto, and workers&apos; compensation insurance in every state. Certificates of insurance available within 24 hours.</p>
            <p><strong>Accountability.</strong> There&apos;s a company behind every job — not just a contractor. If something isn&apos;t right, one phone call fixes it. No ghosting, no excuses, no runaround.</p>
            <p><strong>Consistency.</strong> 40 services, one standard. The same pricing model, the same booking process, the same level of professionalism whether we&apos;re changing a light fixture or remodeling your kitchen. Consolidation only works if the standard holds across every trade.</p>
            <p><strong>Responsible Practice.</strong> Proper permits when required. Licensed disposal. Donation and recycling routing for reusable materials. This is how the work should be done — not the fastest, cheapest corner-cutting version of it.</p>
          </div>
        </div>
      </section>

      {/* ===== HOW WE'RE DIFFERENT ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Why Customers Choose Us</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How We&apos;re Different</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Six reasons Home Services Co works differently. See our full <Link href="/services" className="text-teal-700 font-semibold hover:underline">service list</Link>, read our <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link>, or check <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">$99/hr</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Upfront Pricing</h3>
              <p className="mt-2 text-sm text-slate-600">Starting at $99/hour. Written estimates before any work begins. Parts and materials itemized. The invoice matches the estimate.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">{SERVICES.length}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Services Under One Roof</h3>
              <p className="mt-2 text-sm text-slate-600">From <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link> to <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link> to <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial work</Link> — one vendor across every trade.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">Same-Day</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Real Availability</h3>
              <p className="mt-2 text-sm text-slate-600">Call before noon and we can usually get a technician to your door the same day. Weekends and holidays at the same rate.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">Licensed</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">and Insured</h3>
              <p className="mt-2 text-sm text-slate-600">Every technician licensed in their trade. Comprehensive liability coverage. Certificates of insurance within 24 hours.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">990</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Cities Nationwide</h3>
              <p className="mt-2 text-sm text-slate-600">Local technicians across every state, backed by consistent national standards. {CITY_COUNT} cities across {STATE_COUNT} states.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">5.0</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Star Rating</h3>
              <p className="mt-2 text-sm text-slate-600">200+ verified reviews. Customers consistently call back for the next service they need — and refer friends and family.</p>
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
            Every technician is background-checked, licensed in their trade, and fully insured. Interested in joining? See our <Link href="/careers" className="text-teal-700 font-semibold hover:underline">careers page</Link> or learn about <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise opportunities</Link>. Questions? <Link href="/contact" className="text-teal-700 font-semibold hover:underline">Contact us</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Our technicians aren&apos;t generalists pretending to cover every trade. Each person is trained and certified in their specific field — HVAC technicians hold HVAC licenses, electricians hold electrical licenses, plumbers hold plumbing licenses, and so on. When you book a service, you get a specialist in that trade, not a handyman pretending.</p>
            <p>Every technician passes a comprehensive background check before their first job. They&apos;re insured, bonded, and trained in property protection (drop cloths, floor runners, clean-up) and respectful communication. When our technician walks into your home, you&apos;re getting a professional who treats your space with care.</p>
            <p>We hire locally in every market we serve. Your technician lives in your city, knows your neighborhood, and understands local codes and supply houses. Local knowledge means faster scheduling, correct permits, and fewer delays — combined with the consistency of a national company operating behind the scenes.</p>
          </div>
        </div>
      </section>

      {/* ===== NATIONWIDE COVERAGE ===== */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Coast to Coast Coverage</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Nationwide Coverage — {CITY_COUNT} Cities, {STATE_COUNT} States</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            We operate in every major metro and hundreds of smaller markets. Find your city on our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations page</Link>, check <Link href="/services" className="text-teal-700 font-semibold hover:underline">available services</Link>, or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book a job today</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Home Services Co operates across all {STATE_COUNT} states, serving {CITY_COUNT} cities and counting. Each market is staffed with local technicians who know the area — the building codes, the permit processes, the supply houses, and the neighborhoods they serve. This local presence is what makes same-day availability real across every trade.</p>
            <p>Whether you&apos;re in New York, Los Angeles, Chicago, Houston, Phoenix, or a smaller market, the experience is consistent: starting at $99/hour, upfront pricing, licensed and insured technicians, and a company that stands behind the work. National standards, local execution.</p>
            <p>Need a home service in your area? <Link href="/locations" className="text-teal-700 font-semibold hover:underline">Browse all locations</Link> to find your city, or call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a> to speak with a scheduler who can route a technician to you — often the same day.</p>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE DO NOT DO ===== */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Honest About Our Limits</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What We Don&apos;t Do</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every service company is tempted to claim it does everything. We&apos;d rather be straight about where we stop. Read more honest home-services guidance in the <Link href="/blog" className="text-teal-700 font-semibold hover:underline">Know Before You Hire series</Link> or check our <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link>.</p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>We do not take on specialty medical facility work that requires hospital-grade certification we don&apos;t carry. We do not do heavy industrial or hazmat work — if your site needs a commercial hazmat abatement team, we will tell you to hire one. We do not pretend to be a specialty remodeler with a design department; for <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">kitchen</Link> or <Link href="/services/bathroom-remodeling" className="text-teal-700 font-semibold hover:underline">bathroom</Link> projects we partner with specific specialists when the design work exceeds our in-house capacity.</p>
            <p>We do not do unlicensed work in trades where licensing is legally required. If your state requires a specific license for gas line work, electrical panel work, or plumbing behind the wall, our technician either holds that license or we decline the job and refer you to someone who does. We do not shortcut code to keep a job in-house.</p>
            <p>We do not run the &ldquo;$29 special&rdquo; bait-and-switch playbook that has made so much of the industry miserable to deal with. Our published rate is our rate. If you see marketing from anyone (us or competitors) that looks too cheap to be real, read our <Link href="/blog/warning-signs-low-ball-bid" className="text-teal-700 font-semibold hover:underline">low-ball bid guide</Link> and <Link href="/blog/free-estimate-meaning" className="text-teal-700 font-semibold hover:underline">free estimate explainer</Link> before you call.</p>
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">One Phone Number for Every Home Service</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Starting at $99/hour. Upfront pricing. Licensed and insured. 40 services, 990 cities, one company.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
