// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  cities,
  services,
  findCityBySlug,
  findServiceBySlug,
  getCityUrl,
  getCityServiceUrl,
  getServiceUrl,
  getStateUrl,
  getStateSlug,
} from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, localBusinessSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import { getStateInfo } from "@/app/site/debt-service-ratio-loan/_lib/stateData";

interface Props {
  params: Promise<{ state: string; city: string; service: string }>;
}

// Build on-demand with ISR — too many combos (cities × services) for static build
export const dynamicParams = true;
export const revalidate = 86400; // re-generate every 24h

export async function generateStaticParams() {
  return []; // all pages rendered on first request, then cached
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city: citySlug, service: serviceSlug } = await params;
  const city = findCityBySlug(state, citySlug);
  const service = findServiceBySlug(serviceSlug);
  if (!city || !service) return {};

  const stateInfo = getStateInfo(city.stateAbbr);
  const title = `${service.name} in ${city.name}, ${city.stateAbbr} | ${stateInfo.propertyTaxRate} Tax`;
  const description = `${service.name} in ${city.name}, ${city.stateAbbr}. ${service.shortDesc} ${stateInfo.propertyTaxRate} property tax. Rates, requirements, and local lenders.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.debtserviceratioloan.com${getCityServiceUrl(city, service)}`,
    },
  };
}

export default async function CityServicePage({ params }: Props) {
  const { state, city: citySlug, service: serviceSlug } = await params;
  const city = findCityBySlug(state, citySlug);
  const service = findServiceBySlug(serviceSlug);
  if (!city || !service) notFound();

  const stateInfo = getStateInfo(city.stateAbbr);
  const otherServices = services.filter((s) => s.slug !== service.slug).slice(0, 6);
  const pageUrl = `https://www.debtserviceratioloan.com${getCityServiceUrl(city, service)}`;

  const landlordLabel =
    stateInfo.landlordFriendly === "Very"
      ? "Very Landlord-Friendly"
      : stateInfo.landlordFriendly === "Tenant-Friendly"
        ? "Tenant-Friendly"
        : "Moderately Landlord-Friendly";

  const faqItems = [
    {
      question: `What is ${service.name} in ${city.name}, ${city.stateAbbr}?`,
      answer: `${service.description} In ${city.name}, ${city.state}, investors benefit from a ${stateInfo.propertyTaxRate} property tax rate and ${stateInfo.landlordFriendly === "Very" ? "very landlord-friendly" : stateInfo.landlordFriendly === "Tenant-Friendly" ? "tenant-friendly" : "moderate"} rental laws. ${stateInfo.dscrNote}`,
    },
    {
      question: `How do I qualify for ${service.name} in ${city.name}, ${city.stateAbbr}?`,
      answer: `To qualify for ${service.name} in ${city.name}, you typically need a minimum credit score of 620-680, a 20-25% down payment, and a DSCR ratio of 1.0 or higher. No personal income verification is required — the property's rental income is what matters. ${city.state} uses ${stateInfo.foreclosureType.toLowerCase()} foreclosure, which affects lender risk assessment. Use our free DSCR calculator to see if your ${city.name} property qualifies.`,
    },
    {
      question: `What are the rates for ${service.name} in ${city.name}, ${city.stateAbbr}?`,
      answer: `DSCR loan rates in ${city.name}, ${city.stateAbbr} typically range from 7.0% to 8.5% in 2026, depending on your credit score, DSCR ratio, LTV, and loan amount. Properties with a DSCR of 1.25 or higher generally receive the best pricing. ${city.state}'s ${stateInfo.propertyTaxRate} property tax rate factors into your total debt service calculation, directly affecting your DSCR ratio and available rate tiers.`,
    },
    {
      question: `How do I apply for ${service.name} in ${city.name}, ${city.stateAbbr}?`,
      answer: `Applying for ${service.name} in ${city.name} is straightforward: (1) Use our DSCR calculator to estimate your property's ratio, (2) Gather your property details including purchase price, expected rent, taxes, and insurance, (3) Speak with a DSCR loan officer who specializes in ${city.state} investment properties, (4) Submit your application with property appraisal and rent schedule. Most DSCR loans close in 21-30 days. No W-2s or tax returns required.`,
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} in ${city.name}, ${city.stateAbbr}`,
    description: `${service.shortDesc} Available to real estate investors in ${city.name}, ${city.state}.`,
    provider: {
      "@id": "https://www.debtserviceratioloan.com/#organization",
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "State",
        name: city.state,
      },
    },
    serviceType: "Financial Service",
    url: pageUrl,
  };

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `${service.name} in ${city.name}, ${city.stateAbbr}`,
          `${service.shortDesc} Available in ${city.name}, ${city.stateAbbr}.`,
          pageUrl
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Locations", url: "https://www.debtserviceratioloan.com/locations" },
          { name: city.state, url: `https://www.debtserviceratioloan.com${getStateUrl(city.state)}` },
          { name: city.name, url: `https://www.debtserviceratioloan.com${getCityUrl(city)}` },
          { name: service.name, url: pageUrl },
        ])}
      />
      <JsonLd data={serviceSchema} />
      <JsonLd data={faqSchema(faqItems)} />
      <JsonLd data={localBusinessSchema(city.name, city.stateAbbr, city.state, city.region)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href={getStateUrl(city.state)} className="hover:text-white">
              {city.state}
            </Link>
            {" / "}
            <Link href={getCityUrl(city)} className="hover:text-white">
              {city.name}, {city.stateAbbr}
            </Link>
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {service.name} in{" "}
            <span className="text-teal-200">{city.name}, {city.stateAbbr}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {service.tagline}. Local rates, requirements, and lender connections for {city.name} real estate investors.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/calculator">
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                DSCR Calculator
              </span>
            </Link>
            <Link href="/speak-to-a-loan-officer">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Speak to a Loan Officer
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            About {service.name} in {city.name}, {city.state}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {service.description}
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            For investors targeting {city.name}, {city.state}, the local market conditions play a significant role in your DSCR loan qualification.
            {city.state} has a property tax rate of {stateInfo.propertyTaxRate}, which directly impacts your debt service calculation and overall ratio.
            The state is classified as {landlordLabel.toLowerCase()}, meaning {stateInfo.landlordFriendly === "Very"
              ? "eviction processes are straightforward and landlord protections are strong — a major advantage for rental property investors"
              : stateInfo.landlordFriendly === "Tenant-Friendly"
                ? "tenant protections are robust, so investors should factor in longer eviction timelines and additional compliance requirements"
                : "there is a balanced approach to landlord-tenant law, with reasonable protections for both parties"}.
            {" "}{city.state} uses {stateInfo.foreclosureType.toLowerCase()} foreclosure proceedings, which lenders consider when underwriting your loan.
            Regarding insurance, {stateInfo.insuranceNote.charAt(0).toLowerCase() + stateInfo.insuranceNote.slice(1)}{" "}
            Understanding these {city.state}-specific factors is essential for accurately projecting your DSCR ratio on any {city.name} investment property.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {stateInfo.dscrNote}{" "}
            Whether you are purchasing your first investment property or expanding a portfolio in the {city.region} region,{" "}
            <Link href={getServiceUrl(service)} className="font-semibold text-teal-600 hover:text-teal-700 underline">
              {service.name}
            </Link>{" "}
            can help you scale without relying on personal income documentation.{" "}
            <Link href="/dscr-101" className="font-semibold text-teal-600 hover:text-teal-700 underline">
              Learn the fundamentals in our DSCR 101 guide
            </Link>.
          </p>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            {city.state} Investment Property Quick Stats for {city.name} Investors
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Property Tax</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{stateInfo.propertyTaxRate}</p>
              <p className="mt-1 text-xs text-slate-400">State Average</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Income Tax</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{stateInfo.incomeTax}</p>
              <p className="mt-1 text-xs text-slate-400">State Rate</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Landlord Rating</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{stateInfo.landlordFriendly}</p>
              <p className="mt-1 text-xs text-slate-400">Friendliness</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Foreclosure</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{stateInfo.foreclosureType}</p>
              <p className="mt-1 text-xs text-slate-400">Process Type</p>
            </div>
          </div>
        </div>
      </section>

      {/* Whiteboard Tip */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border-l-4 border-teal-500 bg-teal-50 p-6">
            <h3 className="text-lg font-bold text-teal-800 font-heading">
              Insider Tip for {city.name}, {city.stateAbbr} Investors
            </h3>
            <p className="mt-2 text-base leading-relaxed text-teal-900/80">
              {stateInfo.tip}
            </p>
            <p className="mt-3">
              <Link href="/calculator" className="text-sm font-semibold text-teal-700 hover:text-teal-800 underline font-cta">
                Run the numbers with our DSCR Calculator
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Key Features of {service.name} in {city.name}, {city.stateAbbr}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.features.map((feature, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-teal-200/60 bg-white p-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Investors Choose */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why {city.name} Investors Choose {service.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {city.name}, {city.stateAbbr} continues to attract real estate investors looking for strong rental yields and long-term appreciation.
            With {city.state}&apos;s {stateInfo.propertyTaxRate} property tax rate and{" "}
            {stateInfo.incomeTax === "None" ? "no state income tax" : `a ${stateInfo.incomeTax} income tax rate`},
            investors can project expenses with confidence when calculating their DSCR ratio.
            The {city.region} region offers a mix of property types and price points, making it possible to find deals that exceed the 1.25 DSCR threshold preferred by most lenders.
            Here is why {service.name} is the go-to financing option for {city.name} investors:
          </p>
          <ul className="mt-6 space-y-4">
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">1</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">No income documentation required.</strong>{" "}
                Unlike conventional loans, {service.name} qualifies you based on the {city.name} property&apos;s rental income — not your W-2s, tax returns, or employment history.
                This is ideal for self-employed investors and those with complex financial situations.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">2</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">{city.state}&apos;s {landlordLabel.toLowerCase()} environment.</strong>{" "}
                {stateInfo.landlordFriendly === "Very"
                  ? `${city.state} is one of the most landlord-friendly states in the country, with efficient eviction processes and strong property rights that protect your investment.`
                  : stateInfo.landlordFriendly === "Tenant-Friendly"
                    ? `While ${city.state} has stronger tenant protections, well-managed properties in ${city.name} still generate excellent returns. Understanding local regulations is key to maintaining strong DSCR ratios.`
                    : `${city.state} balances landlord and tenant rights, giving ${city.name} investors a predictable legal framework for managing rental properties.`}
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">3</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Favorable tax structure for investors.</strong>{" "}
                {stateInfo.incomeTax === "None"
                  ? `${city.state} has no state income tax, which means more of your rental income stays in your pocket. Combined with a ${stateInfo.propertyTaxRate} property tax rate, ${city.name} properties can deliver exceptional net cash flow.`
                  : `With a ${stateInfo.propertyTaxRate} property tax rate and ${stateInfo.incomeTax} income tax, ${city.name} investors can accurately project their expenses and calculate their DSCR ratio before making an offer.`}
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">4</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Scale your {city.name} portfolio faster.</strong>{" "}
                Because DSCR loans do not count against your personal DTI, you can finance multiple properties in {city.name} and across {city.state} simultaneously.
                Close in an LLC for asset protection and build a portfolio without hitting conventional loan limits.
              </p>
            </li>
          </ul>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/speak-to-a-loan-officer">
              <span className="inline-block rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-teal-700 font-cta">
                Speak to a {city.state} Loan Officer
              </span>
            </Link>
            <Link href="/calculator" className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">
              Calculate Your DSCR Ratio
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About {service.name} in {city.name}, {city.stateAbbr}
          </h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">
                  {faq.question}
                </summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Other Services in this City */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            Other DSCR Loan Services in {city.name}, {city.stateAbbr}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-500">
            Explore additional DSCR loan programs available to {city.name} investors.{" "}
            {stateInfo.landlordFriendly === "Very"
              ? `${city.state}'s landlord-friendly laws make it an excellent state for building a diversified rental portfolio.`
              : `Understanding ${city.state}'s rental regulations helps you choose the right loan product for your investment strategy.`}
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={getCityServiceUrl(city, s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href={getCityUrl(city)} className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">
              All DSCR Services in {city.name}, {city.stateAbbr} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Inner Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            Related DSCR Loan Resources
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/calculator" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60">
              DSCR Calculator
            </Link>
            <Link href="/dscr-101" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60">
              DSCR 101 Guide
            </Link>
            <Link href="/speak-to-a-loan-officer" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60">
              Speak to a Loan Officer
            </Link>
            <Link href={getCityUrl(city)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60">
              DSCR Loans in {city.name}
            </Link>
            <Link href={getStateUrl(city.state)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60">
              DSCR Loans in {city.state}
            </Link>
            <Link href={getServiceUrl(service)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60">
              {service.name} Guide
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Finance Your {city.name} Investment Property?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Calculate your DSCR ratio, explore the full {service.name} guide, or connect with a loan officer who specializes in {city.state} investment properties.
            {stateInfo.incomeTax === "None" ? ` With no state income tax, ${city.state} is one of the best states for rental property investors.` : ""}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/calculator">
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                DSCR Calculator
              </span>
            </Link>
            <Link href={getServiceUrl(service)}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Full {service.name} Guide
              </span>
            </Link>
            <Link href="/speak-to-a-loan-officer">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Speak to a Loan Officer
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
