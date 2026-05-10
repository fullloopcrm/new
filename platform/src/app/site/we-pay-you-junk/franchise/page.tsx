// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL, CITY_COUNT, STATE_COUNT } from "@/app/site/we-pay-you-junk/_data/content";

export const metadata: Metadata = {
  title: "Franchise Opportunity — We Pay You Junk Removal",
  description: "Own a We Pay You Junk Removal franchise. The only junk removal model with built-in resale revenue. Low startup costs, nationwide brand, proven system.",
  alternates: { canonical: "/franchise" },
};

export default function FranchisePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Franchise Opportunity</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Own a <span className="gradient-text">We Pay You</span> Junk Removal Franchise</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">The only junk removal franchise with a built-in dual revenue model — hourly service fees plus resale income. Currently in {CITY_COUNT} cities, expanding nationwide.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Franchise With Built-In Resale Revenue</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why This Franchise Is Different</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Our dual revenue model combines <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">hourly service fees</Link> with 50% resale income (when applicable) on valuable items. Explore the full range of <Link href="/services" className="text-teal-700 font-semibold hover:underline">junk removal services</Link> franchise owners deliver, see how our <Link href="/locations" className="text-teal-700 font-semibold hover:underline">nationwide office network</Link> supports every market, and learn more <Link href="/about" className="text-teal-700 font-semibold hover:underline">about our mission</Link>.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Traditional junk removal franchises make money one way: charging customers to haul stuff. We Pay You Junk Removal franchise owners make money two ways: the hourly service fee AND the 50% retained resale value (when applicable) on items worth something. This dual revenue stream means higher per-job revenue, better margins, and a built-in competitive moat that no other franchise can replicate.</p>
            <p>Customers choose us over competitors because we&apos;re the only company that pays them for their valuable items. This drives higher conversion rates, more repeat business, more referrals, and better reviews. Franchise owners benefit from a brand that customers actively prefer — not just tolerate.</p>
            <p>The resale model also creates a sustainability advantage. Because we profit from reselling items rather than dumping them, we divert 60% of collected items from landfills. This environmental story resonates with customers, communities, and municipal governments — opening doors that traditional junk removal franchises can&apos;t access.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Franchise Benefits and Support</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What You Get</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every franchise package includes access to our proven <Link href="/services" className="text-teal-700 font-semibold hover:underline">service offerings</Link>, national brand recognition, and established resale partnerships. We provide the same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing model</Link> customers already trust across <Link href="/locations" className="text-teal-700 font-semibold hover:underline">all 50 states</Link>, plus comprehensive training and territory protection.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Proven Model", desc: "Tested and refined across 900+ cities. Clear operations playbook, pricing model, and customer acquisition strategy." },
              { title: "Dual Revenue", desc: "Hourly service fees plus 50% of resale value (when applicable). Two income streams on every job with valuable items." },
              { title: "National Brand", desc: "Leverage the We Pay You Junk Removal brand, website, SEO, and marketing infrastructure from day one." },
              { title: "Training Program", desc: "Comprehensive owner and crew training covering operations, appraisal, customer service, and business management." },
              { title: "Resale Network", desc: "Plug into our established resale partnerships — furniture dealers, appliance refurbishers, electronics resellers, scrap buyers." },
              { title: "Territory Protection", desc: "Exclusive territory rights. No other We Pay You franchise operates in your market." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Who Should Own a Junk Removal Franchise</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Ideal Franchise Owner</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">No prior junk removal experience is needed. See how our <Link href="/about" className="text-teal-700 font-semibold hover:underline">company values</Link> guide every franchise operation, review <Link href="/careers" className="text-teal-700 font-semibold hover:underline">career opportunities</Link> for crew members, and check our <Link href="/faq" className="text-teal-700 font-semibold hover:underline">FAQ</Link> for answers to common franchise questions.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our best franchise owners share a few traits: they&apos;re hands-on operators who want to build a local business, they understand the value of customer experience, they&apos;re comfortable with physical operations, and they see the opportunity in a business model that&apos;s genuinely different from the competition.</p>
            <p>Prior junk removal experience is not required. We train you on every aspect of the business. What matters is your drive to build something, your commitment to fair dealing, and your ability to lead a small team. Many of our most successful franchise owners came from completely unrelated industries — sales, real estate, military, hospitality, and trades.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Start Your Junk Removal Business Today</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Interested? Let&apos;s Talk.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Email us to request our franchise information packet and schedule a discovery call. You can also <Link href="/contact-we-pay-you-junk-removal-today" className="text-teal-200 font-semibold hover:underline">reach our team online</Link>, browse our <Link href="/services" className="text-teal-200 font-semibold hover:underline">full service menu</Link>, or learn more about the <Link href="/about" className="text-teal-200 font-semibold hover:underline">We Pay You story</Link>.</p>
          <div className="mt-8">
            <a href={`mailto:${EMAIL}?subject=Franchise Inquiry`}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Email {EMAIL}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
