import type { Metadata } from "next";
import Link from "next/link";
import { services, getServiceUrl } from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";

export const metadata: Metadata = {
  title: "18 DSCR Loan Programs — Every Service for Investors (2026)",
  description:
    "Browse all 18 DSCR loan services: single-family, multi-family, STR, portfolio, cash-out refi, foreign national, BRRRR, and more. No income verification.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/services" },
};

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
        <div className="text-sm leading-relaxed text-teal-900">
          <span className="font-bold uppercase tracking-wider text-teal-700 text-xs">Whiteboard Tip</span>
          <p className="mt-1">{children}</p>
        </div>
      </div>
    </div>
  );
}

export default function ServicesIndexPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "DSCR Loan Services",
          "All 18 DSCR loan products and programs.",
          "https://www.debtserviceratioloan.com/services"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Services", url: "https://www.debtserviceratioloan.com/services" },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            18 Specialized Loan Programs
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Every <span className="text-teal-200">DSCR Loan Service</span> for Real Estate Investors
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            From <Link href="/services/dscr-loans-single-family" className="text-teal-200 underline underline-offset-2 hover:text-white">single-family rentals</Link> to <Link href="/services/dscr-portfolio-loans" className="text-teal-200 underline underline-offset-2 hover:text-white">blanket portfolio loans</Link> — we cover every DSCR product available in 2026 across <Link href="/locations" className="text-teal-200 underline underline-offset-2 hover:text-white">650+ cities</Link>.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            How to Choose the Right <span className="gradient-text">DSCR Loan Product</span>
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Not all DSCR loans are the same. The right product depends on your property type, investment strategy, and financial situation. A <Link href="/services/dscr-loans-short-term-rentals" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">short-term rental investor in Orlando</Link> needs a different program than a <Link href="/services/dscr-loans-fix-and-rent-brrrr" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">BRRRR investor in Cleveland</Link> or a <Link href="/services/dscr-loans-foreign-nationals" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">foreign national buying in Miami</Link>.
            </p>
            <p>
              Each service page below explains how the program works, who it&apos;s best for, key features, and how to qualify. Not sure where to start? Read our <Link href="/dscr-101" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR 101 guide</Link> or use the <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> to see if your property qualifies.
            </p>
          </div>
          <Tip>Quick decision tree: Buying a long-term rental? &rarr; Single-family or multi-family DSCR. Buying an Airbnb? &rarr; Short-term rental DSCR. Already own and want equity out? &rarr; Cash-out refinance. Buying a fixer to rent? &rarr; Bridge-to-perm or BRRRR. Own 5+ properties? &rarr; Portfolio loan.</Tip>
        </div>
      </section>

      {/* Service Grid */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">All 18 DSCR Loan Services</h2>
          <p className="mt-2 text-base text-slate-600">Click any service for the full guide — requirements, features, tips, and city availability.</p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getServiceUrl(service)}>
                <div className="group h-full rounded-xl border border-teal-200/60 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-lg">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-teal-600 font-cta">
                    {service.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {service.shortDesc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Most Popular */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Most Popular DSCR Services in <span className="gradient-text">2026</span>
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong><Link href="/services/dscr-loans-single-family" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Single-family DSCR loans</Link></strong> remain the most originated DSCR product — they&apos;re simple, widely available, and have the lowest qualification thresholds. Close behind are <strong><Link href="/services/dscr-loans-short-term-rentals" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">short-term rental DSCR loans</Link></strong>, which have exploded as lenders have become more comfortable underwriting Airbnb income using AirDNA projections.
            </p>
            <p>
              The fastest-growing segment? <strong><Link href="/services/dscr-cash-out-refinance" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR cash-out refinances</Link></strong>. Investors who purchased in 2020–2023 are sitting on significant equity and using DSCR refis to pull cash out and acquire more properties — without sharing a single tax return. <strong><Link href="/services/dscr-portfolio-loans" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Portfolio/blanket loans</Link></strong> are also surging as experienced investors consolidate multiple properties into single loans for simplicity.
            </p>
          </div>
          <Tip>If you own property and want to buy more, start with a cash-out refi on your existing rentals. You can pull out 75–80% of the equity with no income docs, then use that cash as a down payment on your next acquisition. This is how portfolio investors scale rapidly.</Tip>
        </div>
      </section>

      {/* Cross-links */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Find DSCR Services in Your City</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every service above is available in all <Link href="/locations" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">650+ cities</Link> we cover. Browse by location to see service-specific guides tailored to your market, or use our tools to get started:
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/locations" className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 font-cta">Browse 650+ Cities</Link>
            <Link href="/calculator" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR Calculator</Link>
            <Link href="/dscr-101" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR 101 Guide</Link>
            <Link href="/speak-to-a-loan-officer" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Speak to a Loan Officer</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Not Sure Which DSCR Service Is Right for You?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Text us your situation and a DSCR specialist will point you to the right program — free, no obligation.
          </p>
          <div className="mt-8">
            <a href="sms:+18553003727" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 font-cta">
              (855) 300-DSCR | Text
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
