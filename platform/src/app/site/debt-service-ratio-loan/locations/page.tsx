// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { getAllStates, getStateUrl, cities } from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import { getStateInfo } from "@/app/site/debt-service-ratio-loan/_lib/stateData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";

export const metadata: Metadata = {
  title: "DSCR Loans by Location — 650+ Cities Across All 50 States",
  description:
    "DSCR loan guides for 650+ cities. Browse by state for local rates, requirements, tax data, and lender connections. 18 loan programs per city.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/locations" },
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

export default function LocationsIndexPage() {
  const states = getAllStates();
  const totalCities = cities.length;

  return (
    <>
      <JsonLd
        data={webPageSchema(
          "DSCR Loans by Location",
          `${totalCities}+ cities across all 50 states.`,
          "https://www.debtserviceratioloan.com/locations"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Locations", url: "https://www.debtserviceratioloan.com/locations" },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Every Major US Market Covered
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            DSCR Loans in <span className="text-teal-200">{totalCities}+ Cities</span> Across the United States
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Browse by state to find city-specific DSCR loan guides with local market data, all <Link href="/services" className="text-teal-200 underline underline-offset-2 hover:text-white">18 DSCR services</Link>, and tips from our team of experienced loan professionals.
          </p>
        </div>
      </section>

      {/* Intro Content */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why Location Matters for <span className="gradient-text">DSCR Loans</span>
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              DSCR loan qualification depends entirely on the property&apos;s rental income vs. the mortgage payment — and both of those numbers are driven by <strong>location</strong>. A $300K property in <Link href="/locations/indiana/indianapolis" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Indianapolis</Link> might rent for $2,200/month (DSCR of 1.30+), while the same $300K in <Link href="/locations/california/san-francisco" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">San Francisco</Link> might only rent for $1,800 (DSCR of 0.85). Same price, completely different outcome.
            </p>
            <p>
              That&apos;s why we built city-specific guides for every major market. Each city page includes all <Link href="/services" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">18 DSCR loan services</Link> available in that market — from <Link href="/services/dscr-loans-single-family" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">single-family rentals</Link> to <Link href="/services/dscr-loans-short-term-rentals" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Airbnb financing</Link> to <Link href="/services/dscr-cash-out-refinance" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">cash-out refinances</Link>. Use our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> to run the numbers on any property before you make an offer.
            </p>
          </div>
          <Tip>The best DSCR markets have high rent-to-price ratios. Sun Belt and Midwest cities consistently deliver 1.25+ DSCRs. Coastal cities look great on paper but often have sub-1.0 DSCRs because prices are so high relative to rents. Know your numbers before you pick your market.</Tip>
        </div>
      </section>

      {/* State Grid */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Browse DSCR Loans by State</h2>
          <p className="mt-2 text-base text-slate-600">Select your state to see all covered cities and available DSCR services.</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((state) => {
              const info = getStateInfo(state.abbr);
              const goods: string[] = [];
              const bads: string[] = [];

              if (info.incomeTax === "None") goods.push("No state income tax");
              if (parseFloat(info.propertyTaxRate) < 0.8) goods.push(`Low property tax (${info.propertyTaxRate})`);
              if (info.landlordFriendly === "Very") goods.push("Landlord-friendly laws");
              if (info.strClimate.toLowerCase().includes("strong")) goods.push("Strong STR market");
              if (info.foreclosureType === "Non-Judicial") goods.push("Non-judicial foreclosure");

              if (parseFloat(info.propertyTaxRate) >= 1.5) bads.push(`High property tax (${info.propertyTaxRate})`);
              if (info.landlordFriendly === "Tenant-Friendly") bads.push("Tenant-friendly laws");
              if (info.insuranceNote.toLowerCase().includes("high")) bads.push("High insurance costs");
              if (info.strClimate.toLowerCase().includes("regulat") || info.strClimate.toLowerCase().includes("ban")) bads.push("STR regulations");

              return (
                <Link key={state.abbr} href={getStateUrl(state.name)}>
                  <div className="group h-full rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                        {state.name}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                        {state.count} {state.count === 1 ? "city" : "cities"}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                      <span>Tax: <strong className="text-slate-700">{info.propertyTaxRate}</strong></span>
                      <span>Income: <strong className="text-slate-700">{info.incomeTax === "None" ? "None" : info.incomeTax}</strong></span>
                    </div>

                    {goods.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {goods.slice(0, 3).map((g) => (
                          <span key={g} className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{g}</span>
                        ))}
                      </div>
                    )}
                    {bads.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {bads.slice(0, 2).map((b) => (
                          <span key={b} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">{b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Markets */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Top DSCR Loan Markets in <span className="gradient-text">2026</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            These are the most active DSCR markets based on loan volume, rental demand, and investor activity. Each city has strong rent-to-price ratios that make DSCR qualification easier.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "Houston, TX", href: "/locations/texas/houston", why: "Massive rental market, no state income tax" },
              { name: "Miami, FL", href: "/locations/florida/miami", why: "STR capital, international investor hub" },
              { name: "Atlanta, GA", href: "/locations/georgia/atlanta", why: "Affordable, high rent growth, strong DSCR ratios" },
              { name: "Dallas, TX", href: "/locations/texas/dallas", why: "Population boom, landlord-friendly laws" },
              { name: "Phoenix, AZ", href: "/locations/arizona/phoenix", why: "Sun Belt growth, strong STR market" },
              { name: "Nashville, TN", href: "/locations/tennessee/nashville", why: "Tourism + long-term rental demand" },
              { name: "Orlando, FL", href: "/locations/florida/orlando", why: "Vacation rental powerhouse" },
              { name: "Charlotte, NC", href: "/locations/north-carolina/charlotte", why: "Banking hub, affordable entry point" },
            ].map((city) => (
              <Link key={city.href} href={city.href}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{city.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{city.why}</p>
                </div>
              </Link>
            ))}
          </div>
          <Tip>Texas and Florida dominate DSCR lending for a reason: no state income tax, landlord-friendly laws, population growth, and strong rent-to-price ratios. If you&apos;re new to DSCR investing, these two states are the easiest place to start.</Tip>
        </div>
      </section>

      {/* Services Cross-link */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            18 DSCR Services Available in <span className="gradient-text">Every City</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every city page includes access to all 18 DSCR loan programs. Whether you&apos;re financing a <Link href="/services/dscr-loans-single-family" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">single-family rental</Link>, a <Link href="/services/dscr-loans-multi-family" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">multi-family property</Link>, or doing a <Link href="/services/dscr-loans-fix-and-rent-brrrr" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">BRRRR refinance</Link> — your city page connects you to the right service with local market context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/services" className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 font-cta">View All 18 Services</Link>
            <Link href="/calculator" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR Calculator</Link>
            <Link href="/speak-to-a-loan-officer" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Speak to a Loan Officer</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Can&apos;t Find Your City?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            DSCR loans are available nationwide. Even if your city isn&apos;t listed, our loan officers can help. Text us and we&apos;ll get you connected.
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
