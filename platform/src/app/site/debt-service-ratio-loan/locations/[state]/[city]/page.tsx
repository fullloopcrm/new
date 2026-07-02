// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  cities,
  services,
  findCityBySlug,
  getCityUrl,
  getCityServiceUrl,
  getCitiesByState,
  getStateUrl,
  getStateSlug,
} from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import { getStateInfo } from "@/app/site/debt-service-ratio-loan/_lib/stateData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, localBusinessSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";

interface Props {
  params: Promise<{ state: string; city: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city: citySlug } = await params;
  const city = findCityBySlug(state, citySlug);
  if (!city) return {};
  const info = getStateInfo(city.stateAbbr);

  return {
    title: `DSCR Loans in ${city.name}, ${city.stateAbbr} — Rates & Requirements`,
    description: `DSCR loans in ${city.name}, ${city.stateAbbr}. ${info.propertyTaxRate} property tax. ${info.landlordFriendly} landlord laws. 18 programs, current rates, and lender connections.`,
    alternates: { canonical: `https://www.debtserviceratioloan.com${getCityUrl(city)}` },
  };
}

export default async function CityPage({ params }: Props) {
  const { state, city: citySlug } = await params;
  const city = findCityBySlug(state, citySlug);
  if (!city) notFound();

  const info = getStateInfo(city.stateAbbr);
  const nearbyCities = getCitiesByState(city.stateAbbr)
    .filter((c) => c.slug !== city.slug)
    .slice(0, 12);

  const canonicalUrl = `https://www.debtserviceratioloan.com${getCityUrl(city)}`;
  const taxFloat = parseFloat(info.propertyTaxRate) || 1.0;
  const highTax = taxFloat >= 1.5;
  const lowTax = taxFloat < 0.8;
  const noIncomeTax = info.incomeTax === "None";
  const veryLandlord = info.landlordFriendly === "Very";
  const tenantFriendly = info.landlordFriendly === "Tenant-Friendly";
  const nonJudicial = info.foreclosureType === "Non-Judicial";
  const highInsurance = info.insuranceNote.toLowerCase().includes("high");

  const sfrService = services[0];
  const strService = services.find((s) => s.slug === "dscr-loans-short-term-rentals")!;
  const cashOutService = services.find((s) => s.slug === "dscr-cash-out-refinance")!;
  const multiFamilyService = services.find((s) => s.slug === "dscr-loans-multi-family")!;
  const reqService = services.find((s) => s.slug === "dscr-loan-requirements")!;
  const ratesService = services.find((s) => s.slug === "dscr-loan-rates")!;
  const tipsService = services.find((s) => s.slug === "dscr-loan-tips")!;
  const brrrrService = services.find((s) => s.slug === "dscr-loans-fix-and-rent-brrrr")!;
  const portfolioService = services.find((s) => s.slug === "dscr-portfolio-loans")!;
  const bridgeService = services.find((s) => s.slug === "dscr-bridge-to-perm")!;
  const foreignService = services.find((s) => s.slug === "dscr-loans-foreign-nationals")!;
  const newConstructionService = services.find((s) => s.slug === "dscr-loans-new-construction")!;
  const condoService = services.find((s) => s.slug === "dscr-loans-condos-condotels")!;
  const commercialService = services.find((s) => s.slug === "dscr-loans-commercial")!;

  const cityFaqs = [
    {
      question: `How do I get a DSCR loan in ${city.name}, ${city.stateAbbr}?`,
      answer: `To get a DSCR loan in ${city.name}, start by identifying an investment property where the rental income covers the mortgage payment (principal, interest, taxes, insurance, and HOA — known as PITIA). Use our free DSCR calculator to verify the debt service coverage ratio is 1.0 or higher, then contact a DSCR lender for pre-qualification. No tax returns, W-2s, or income verification needed. Most DSCR loans in ${city.name} close in 14-21 days, significantly faster than conventional investment property mortgages. You can close in your personal name or an LLC for liability protection.`,
    },
    {
      question: `What DSCR ratio do I need for a rental property in ${city.name}, ${city.stateAbbr}?`,
      answer: `Most lenders require a minimum DSCR of 1.0 for ${city.name} properties, meaning the rent must at least cover the total mortgage payment. A DSCR of 1.25 or higher gets you the best rates (typically 7.0-7.5% in 2026). Some lenders in ${city.state} accept sub-1.0 DSCR ratios with compensating factors like 25-35% down payment and 700+ credit scores. ${highTax ? `Note that ${city.state}'s ${info.propertyTaxRate} property tax rate increases your PITIA, making it harder to hit higher DSCR ratios in ${city.name}.` : lowTax ? `${city.state}'s low ${info.propertyTaxRate} property tax rate gives ${city.name} investors a natural advantage in achieving higher DSCR ratios.` : `${city.state}'s ${info.propertyTaxRate} property tax rate is moderate and manageable for most DSCR calculations in ${city.name}.`}`,
    },
    {
      question: `What are ${city.name}, ${city.stateAbbr} property taxes and how do they affect my DSCR?`,
      answer: `${city.state}'s average property tax rate is ${info.propertyTaxRate}. Property taxes are included in the PITIA calculation (the denominator of the DSCR formula), so they directly reduce your DSCR ratio. ${highTax ? `At ${info.propertyTaxRate}, ${city.state}'s taxes are above the national average and significantly impact DSCR ratios in ${city.name}. On a $300,000 property, that's approximately $${Math.round(300000 * taxFloat / 100 / 12)}/month in taxes alone — factor this in carefully when running numbers on ${city.name} investment properties.` : lowTax ? `At ${info.propertyTaxRate}, ${city.state} has below-average property taxes, which gives ${city.name} investors a meaningful DSCR advantage over higher-tax states. This means more of each rent dollar goes toward covering principal, interest, and insurance — boosting your ratio.` : `${city.state}'s ${info.propertyTaxRate} tax rate is close to the national average and manageable for most DSCR deals in ${city.name}.`}`,
    },
    {
      question: `Can I use a DSCR loan for an Airbnb or vacation rental in ${city.name}?`,
      answer: `Yes — DSCR loans are available for short-term rentals (Airbnb, VRBO) in ${city.name}. Lenders typically use AirDNA projections or actual booking history to calculate the DSCR ratio. Short-term rentals often generate higher income than long-term leases, which can result in stronger DSCR ratios. ${info.strClimate} Always check local ${city.name} ordinances for STR permits, licensing requirements, and zoning regulations before purchasing a short-term rental investment property.`,
    },
    {
      question: `Is ${city.name}, ${city.stateAbbr} a good market for DSCR loan investors in 2026?`,
      answer: `${info.dscrNote} ${city.state} is rated "${info.landlordFriendly}" for landlord-friendliness${noIncomeTax ? " and has no state income tax, which improves your net cash flow on rental properties" : ""}. The state uses ${info.foreclosureType.toLowerCase()} foreclosure proceedings${nonJudicial ? ", which is faster and less costly for investors if a tenant situation goes wrong" : ""}. Use our DSCR calculator to run the numbers on specific ${city.name} properties before making offers.`,
    },
    {
      question: `What types of investment properties qualify for DSCR loans in ${city.name}?`,
      answer: `All major property types qualify for DSCR loans in ${city.name}: single-family homes, duplexes, triplexes, quads (2-4 units), condos and condotels, short-term rentals (Airbnb/VRBO), new construction properties, mixed-use buildings with 51%+ residential, and 5+ unit apartment buildings. The property must be investment-only (not your primary residence) and must generate — or be projected to generate — rental income. Each property type has specific DSCR programs tailored to its characteristics.`,
    },
    {
      question: `Can I close a DSCR loan in an LLC in ${city.name}, ${city.stateAbbr}?`,
      answer: `Yes — one of the biggest advantages of DSCR loans over conventional mortgages is the ability to close in an LLC or other business entity. This provides important liability protection for your ${city.name} investment properties, separating your personal assets from your rental portfolio. Unlike conventional mortgages that require personal-name vesting, DSCR loans allow entity vesting from day one. Many ${city.name} investors set up a separate LLC for each property or group of properties as part of their asset protection strategy.`,
    },
    {
      question: `How much down payment do I need for a DSCR loan in ${city.name}?`,
      answer: `Most DSCR loans in ${city.name} require 20-25% down payment. Properties with DSCR below 1.0 may require 25-35% down as a compensating factor. A larger down payment reduces your monthly mortgage, which directly improves your DSCR ratio and qualifies you for better interest rates. Some DSCR programs allow as little as 15% down for properties with strong DSCR ratios (1.25+) and borrowers with 740+ credit scores. Cash-out refinances typically allow up to 75-80% LTV in ${city.name}.`,
    },
  ];

  /* ---------- Structured Data ---------- */
  const localBusiness = localBusinessSchema(city.name, city.stateAbbr, city.state, city.region);

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Get a DSCR Loan in ${city.name}, ${city.state}`,
    description: `Step-by-step guide to obtaining a DSCR loan for investment property in ${city.name}, ${city.stateAbbr}. No income verification required.`,
    totalTime: "P21D",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "Varies by property",
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: `Identify an investment property in ${city.name}`,
        text: `Find a rental property in ${city.name}, ${city.stateAbbr} with strong rent-to-price ratio. Research comparable rents in the area and verify the property is zoned for rental use.`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Calculate the DSCR ratio",
        text: `Use the DSCR calculator to divide the property's expected monthly rental income by the total PITIA (principal, interest, taxes at ${info.propertyTaxRate}, insurance, and HOA). Aim for 1.0 or higher.`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Prepare your down payment and reserves",
        text: "Most DSCR loans require 20-25% down payment and 6+ months of cash reserves. Larger down payments improve your DSCR ratio and secure better rates.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Contact a DSCR lender for pre-qualification",
        text: `Reach out to a DSCR-experienced lender who works in ${city.state}. Provide the property address, expected rent, and purchase price. No tax returns or W-2s needed.`,
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Get an appraisal with rent schedule",
        text: `The lender will order an appraisal with a 1007 rent schedule for your ${city.name} property. This determines the market rent used in the official DSCR calculation.`,
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: `Close and fund your ${city.name} investment property`,
        text: `DSCR loans typically close in 14-21 days. You can close in your personal name or an LLC. ${nonJudicial ? `${city.state} uses non-judicial foreclosure, which is faster if issues arise.` : ""}`,
      },
    ],
  };

  return (
    <>
      {/* Structured Data */}
      <JsonLd
        data={webPageSchema(
          `DSCR Loans in ${city.name}, ${city.stateAbbr} — Investment Property Financing`,
          `Complete DSCR loan guide for ${city.name}, ${city.stateAbbr}. Property tax: ${info.propertyTaxRate}. ${info.landlordFriendly} landlord laws. 18 loan services, current rates, qualification guide, and lender connections.`,
          canonicalUrl
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Locations", url: "https://www.debtserviceratioloan.com/locations" },
          { name: city.state, url: `https://www.debtserviceratioloan.com${getStateUrl(city.state)}` },
          { name: city.name, url: canonicalUrl },
        ])}
      />
      <JsonLd data={faqSchema(cityFaqs)} />
      <JsonLd data={localBusiness} />
      <JsonLd data={howToSchema} />

      {/* ════════════════════════════════════════════════════════════════════
          SECTION A: Hero
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-20 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full border border-teal-300/40 bg-teal-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href={`/locations/${getStateSlug(city.state)}`} className="hover:text-white">
              {city.state}
            </Link>{" "}
            &bull; {city.region} &bull; 18 DSCR Programs &bull; No Income Docs
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            DSCR Loans in <span className="text-teal-200">{city.name}, {city.stateAbbr}</span> &mdash; Investment Property Financing Without Income Verification
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            {city.name}, {city.stateAbbr} real estate investors are using <Link href="/services/dscr-loans" className="text-teal-200 underline underline-offset-2 hover:text-white">DSCR loans</Link> to
            build rental portfolios without showing tax returns, W-2s, or pay stubs. Whether you&apos;re buying your first <Link href={getCityServiceUrl(city, sfrService)} className="text-teal-200 underline underline-offset-2 hover:text-white">single-family rental in {city.name}</Link>,
            scaling with a <Link href={getCityServiceUrl(city, multiFamilyService)} className="text-teal-200 underline underline-offset-2 hover:text-white">multi-family DSCR loan</Link>,
            or tapping equity through a <Link href={getCityServiceUrl(city, cashOutService)} className="text-teal-200 underline underline-offset-2 hover:text-white">DSCR cash-out refinance</Link> &mdash; qualification is based on the property&apos;s rental income, not yours.
            {noIncomeTax ? ` And with ${city.state} charging zero state income tax, your net rental cash flow in ${city.name} goes even further.` : ""}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/calculator" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 font-cta">
              DSCR Calculator
            </Link>
            <a href="sms:+18553003727" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              (855) 300-DSCR | Text Us
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION B: What Is a DSCR Loan in [City], [State]?
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            What Is a DSCR Loan in {city.name}, {city.state}?
          </h2>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            A DSCR loan &mdash; short for <strong>Debt Service Coverage Ratio loan</strong> &mdash; is a type of investment property mortgage that qualifies borrowers based on the rental income the property generates, rather than the borrower&apos;s personal income. For {city.name} real estate investors, this means you can purchase, refinance, or cash out equity from rental properties in {city.stateAbbr} without providing tax returns, W-2 forms, pay stubs, or employment verification of any kind.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The core concept behind a DSCR loan in {city.name} is straightforward: if the property&apos;s rental income covers the mortgage payment, you qualify. The &ldquo;debt service coverage ratio&rdquo; is calculated by dividing the property&apos;s monthly gross rental income by its total monthly debt service, which includes principal, interest, taxes, insurance, and any HOA dues (collectively known as <strong>PITIA</strong>). A DSCR of 1.0 means the rent exactly covers the mortgage. A DSCR of 1.25 means the property generates 25% more income than the mortgage requires &mdash; and that&apos;s the sweet spot most lenders look for in {city.name}.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Why are DSCR loans so popular among {city.name}, {city.stateAbbr} investors? Because traditional mortgage qualification has become increasingly difficult for real estate investors. Self-employed investors, business owners who optimize tax deductions, and portfolio holders with complex returns often show low taxable income on paper &mdash; even when they&apos;re financially strong. DSCR loans eliminate that problem entirely.
            In {city.state}, where the property tax rate averages {info.propertyTaxRate} and landlord laws are rated <strong>{info.landlordFriendly}</strong>, DSCR lending has become the go-to financing vehicle for serious investors.
            {noIncomeTax ? ` The fact that ${city.state} has no state income tax makes ${city.name} even more attractive — every dollar of rental income goes further toward building wealth.` : ""}
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {city.name} investors have access to all <Link href="/services" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">18 DSCR loan programs</Link> we track, including <Link href={getCityServiceUrl(city, sfrService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">single-family rentals</Link>, <Link href={getCityServiceUrl(city, strService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Airbnb and short-term rentals</Link>, <Link href={getCityServiceUrl(city, multiFamilyService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">multi-family properties</Link>, <Link href={getCityServiceUrl(city, brrrrService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">fix-and-rent (BRRRR) deals</Link>, <Link href={getCityServiceUrl(city, commercialService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">commercial properties</Link>, and more. Every program is available in {city.name}, and each one qualifies you based on what the property earns &mdash; not what you report to the IRS. Our <Link href="/dscr-101" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR 101 guide</Link> breaks down the full mechanics if you&apos;re new to the concept.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION C: Quick Stats Grid
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            {city.name}, {city.stateAbbr} DSCR Loan Market Snapshot
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500">
            Key {city.state} data points that directly impact DSCR calculations for {city.name} investment properties.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">{info.propertyTaxRate}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{city.state} Property Tax Rate</p>
              <p className="mt-1 text-[11px] text-slate-400">{highTax ? "Above avg \u2014 impacts DSCR" : lowTax ? "Below avg \u2014 DSCR advantage" : "Near national average"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">{noIncomeTax ? "None" : info.incomeTax}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">State Income Tax</p>
              <p className="mt-1 text-[11px] text-slate-400">{noIncomeTax ? "More cash flow for investors" : "Reduces net rental income"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">{info.landlordFriendly}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Landlord Law Rating</p>
              <p className="mt-1 text-[11px] text-slate-400">{veryLandlord ? "Investor-favorable state" : tenantFriendly ? "Longer eviction timelines" : "Balanced regulations"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">18</p>
              <p className="mt-1 text-xs font-medium text-slate-500">DSCR Services Available</p>
              <p className="mt-1 text-[11px] text-slate-400">All programs active in {city.name}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-lg font-bold text-slate-800 font-heading">{info.foreclosureType}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Foreclosure Process</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-lg font-bold text-slate-800 font-heading">14&ndash;21 Days</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Typical DSCR Close Time</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm col-span-2 sm:col-span-1">
              <p className="text-lg font-bold text-slate-800 font-heading">20&ndash;25%</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Typical Down Payment</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION D: Whiteboard Tip
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 px-6 py-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
              <div className="text-sm leading-relaxed text-teal-900">
                <span className="font-bold uppercase tracking-wider text-teal-700 text-xs">Whiteboard Tip &mdash; {city.state} DSCR Insight</span>
                <p className="mt-2">{info.tip}</p>
                <p className="mt-2">
                  <Link href="/calculator" className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900">Run your {city.name} numbers in the DSCR calculator</Link> &mdash; or check out our <Link href={getCityServiceUrl(city, tipsService)} className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900">DSCR tips for {city.name}</Link> for more strategies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION E: Pros & Cons of DSCR Investing in [City]
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Pros and Cons of DSCR Loan Investing in <span className="gradient-text">{city.name}, {city.stateAbbr}</span>
          </h2>
          <p className="mt-3 text-base text-slate-500">
            Every market has advantages and challenges. Here&apos;s what {city.name} DSCR investors should know based on {city.state}&apos;s tax structure, landlord laws, and insurance environment.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-6">
              <h3 className="text-base font-bold text-green-800 font-heading">Advantages for {city.name} Investors</h3>
              <ul className="mt-3 space-y-2.5">
                {noIncomeTax && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> No state income tax &mdash; more net cash flow on {city.name} rentals</li>}
                {lowTax && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Low property taxes ({info.propertyTaxRate}) directly boost your DSCR ratio</li>}
                {veryLandlord && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Very landlord-friendly laws &mdash; faster evictions, fewer restrictions</li>}
                {nonJudicial && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Non-judicial foreclosure &mdash; faster, less expensive process</li>}
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> All 18 DSCR programs available in {city.name}</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Close in an LLC for asset protection</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> No income verification &mdash; qualify on property cash flow only</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> No limit on number of DSCR loans (unlike conventional 10-property cap)</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Close in 14&ndash;21 days vs. 45&ndash;60 for conventional</li>
              </ul>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
              <h3 className="text-base font-bold text-red-800 font-heading">Watch Out in {city.name}</h3>
              <ul className="mt-3 space-y-2.5">
                {highTax && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> High property taxes ({info.propertyTaxRate}) &mdash; significantly reduces DSCR</li>}
                {tenantFriendly && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> Tenant-friendly laws &mdash; longer, costlier eviction process</li>}
                {highInsurance && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> {info.insuranceNote.split(".")[0]} &mdash; get quotes before running DSCR</li>}
                {info.foreclosureType === "Judicial" && <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> Judicial foreclosure &mdash; slower, more expensive process</li>}
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> DSCR rates run 1&ndash;2% higher than conventional mortgages</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> 20&ndash;25% down payment required (no 3.5% FHA)</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> Prepayment penalties on most DSCR programs (3&ndash;5 year terms)</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> Investment properties only &mdash; no primary residence</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> 6+ months cash reserves typically required</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION F: How to Qualify for a DSCR Loan in [City]
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            How to Qualify for a DSCR Loan in {city.name}, {city.state}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Qualifying for a DSCR loan in {city.name} is fundamentally different from qualifying for a conventional mortgage. There is no debt-to-income (DTI) calculation, no employment verification, and no tax return review. Instead, lenders evaluate five key factors that determine whether your {city.name} investment property generates enough income to service the debt. Here&apos;s what you need to know about <Link href={getCityServiceUrl(city, reqService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan requirements in {city.name}</Link>.
          </p>

          <div className="mt-8 space-y-6">
            {/* Requirement 1 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">1</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">DSCR Ratio of 1.0 or Higher on Your {city.name} Property</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    The most critical requirement. Your {city.name} property&apos;s monthly rental income must equal or exceed the total monthly PITIA payment. With {city.state}&apos;s property tax rate of {info.propertyTaxRate}, you need to factor this into the calculation carefully. Use our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> to verify your ratio before applying. A DSCR of 1.25 or higher unlocks the best rates, while some lenders accept sub-1.0 DSCR with compensating factors (larger down payment, higher credit score).
                  </p>
                </div>
              </div>
            </div>

            {/* Requirement 2 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">2</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">Credit Score of 620+ for {city.name} DSCR Loans</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    While DSCR loans don&apos;t verify income, credit score still matters. Most {city.name} DSCR lenders require a minimum score of 620&ndash;680. A score of 740+ gets you the best rate pricing &mdash; typically saving 0.25&ndash;0.50% on your interest rate. This can mean hundreds of dollars per month on a {city.name} investment property. Your credit score also affects the maximum loan-to-value (LTV) ratio available to you.
                  </p>
                </div>
              </div>
            </div>

            {/* Requirement 3 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">3</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">20&ndash;25% Down Payment for {city.name} Investment Properties</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Standard DSCR loans in {city.name} require 20&ndash;25% down. Some programs allow 15% down for properties with strong DSCR ratios (1.25+) and borrowers with excellent credit (740+). Conversely, sub-1.0 DSCR properties may require 25&ndash;35% down. A larger down payment reduces your monthly mortgage, which directly improves the DSCR ratio &mdash; a strategy that works especially well in {city.state} markets where {highTax ? "high property taxes put pressure on the ratio" : "moderate property costs keep payments manageable"}.
                  </p>
                </div>
              </div>
            </div>

            {/* Requirement 4 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">4</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">6+ Months Cash Reserves After Closing in {city.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    DSCR lenders want to see that you have liquid reserves after the down payment and closing costs are paid. For {city.name} properties, most lenders require 6 months of PITIA payments in reserve. On a higher-priced {city.name} property or a portfolio with multiple DSCR loans, this can increase to 9&ndash;12 months. Reserves can include checking/savings accounts, stocks, bonds, and retirement accounts (counted at 60&ndash;70% of value).
                  </p>
                </div>
              </div>
            </div>

            {/* Requirement 5 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">5</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">Investment Property Classification for {city.name} DSCR Loans</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    The property must be a non-owner-occupied investment property. You cannot use a DSCR loan for your primary residence or a second home in {city.name}. Eligible property types include single-family homes, duplexes, triplexes, quads, condos, condotels, short-term rentals, mixed-use properties, new construction, and 5+ unit apartment buildings. The property must generate &mdash; or be projected to generate &mdash; rental income. Learn more about specific property types in our <Link href={getCityServiceUrl(city, condoService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">condo DSCR guide for {city.name}</Link> or <Link href={getCityServiceUrl(city, newConstructionService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">new construction DSCR financing in {city.name}</Link>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION G: Best DSCR Investment Strategies in [City]
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Best DSCR Investment Strategies in {city.name}, {city.state} for 2026
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {city.name}&apos;s real estate market offers multiple DSCR-friendly investment paths. The best strategy depends on your capital, experience, and goals. Here are four proven approaches that work especially well in {city.state}&apos;s market environment &mdash; with its {info.propertyTaxRate} property tax rate, {info.landlordFriendly.toLowerCase()} landlord laws, and {info.foreclosureType.toLowerCase()} foreclosure process.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Strategy 1 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Buy-and-Hold Single-Family Rentals in {city.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The bread and butter of DSCR investing. Purchase a <Link href={getCityServiceUrl(city, sfrService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">single-family rental in {city.name}</Link> with a DSCR loan, place a long-term tenant, and collect monthly cash flow while the property appreciates. {lowTax ? `${city.state}'s low ${info.propertyTaxRate} property tax rate means more of each rent payment translates to cash flow.` : highTax ? `Factor in ${city.state}'s ${info.propertyTaxRate} property tax rate carefully — it reduces cash flow but may be offset by strong rent growth in ${city.name}.` : `${city.state}'s moderate property taxes keep the numbers workable for most ${city.name} single-family rentals.`} This strategy works best for investors seeking predictable, hands-off income.
              </p>
              <p className="mt-2 text-xs font-semibold text-teal-600">Target DSCR: 1.25+ &bull; Down: 20&ndash;25% &bull; Best for: Beginners</p>
            </div>

            {/* Strategy 2 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Short-Term Rental (Airbnb) DSCR Strategy in {city.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Use a <Link href={getCityServiceUrl(city, strService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">short-term rental DSCR loan in {city.name}</Link> to finance an Airbnb or VRBO property. STR income is often 2&ndash;3x higher than long-term rents, producing much stronger DSCR ratios. {info.strClimate} Lenders use AirDNA projections or actual booking history for qualification. This strategy pairs well with <Link href={getCityServiceUrl(city, condoService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">condo and condotel financing in {city.name}</Link> in resort or tourism markets.
              </p>
              <p className="mt-2 text-xs font-semibold text-teal-600">Target DSCR: 1.5+ &bull; Down: 20&ndash;25% &bull; Best for: Active managers</p>
            </div>

            {/* Strategy 3 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                BRRRR Method With DSCR Refinance in {city.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The <Link href={getCityServiceUrl(city, brrrrService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">BRRRR strategy in {city.name}</Link> (Buy, Rehab, Rent, Refinance, Repeat) uses a hard money or <Link href={getCityServiceUrl(city, bridgeService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">bridge-to-perm loan</Link> for acquisition and rehab, then refinances into a long-term DSCR loan once the property is stabilized. The <Link href={getCityServiceUrl(city, cashOutService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR cash-out refinance</Link> lets you recover your rehab capital and repeat the process. This is the fastest way to scale a portfolio in {city.name}.
              </p>
              <p className="mt-2 text-xs font-semibold text-teal-600">Target DSCR: 1.0+ (post-rehab) &bull; Down: Varies &bull; Best for: Experienced</p>
            </div>

            {/* Strategy 4 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Multi-Family Portfolio Building in {city.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Acquire <Link href={getCityServiceUrl(city, multiFamilyService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">multi-family properties in {city.name}</Link> (duplexes through large apartment buildings) using DSCR loans. Multiple units generate higher combined income, often producing stronger DSCR ratios than single-family homes. Once you own several, consolidate with a <Link href={getCityServiceUrl(city, portfolioService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR portfolio loan in {city.name}</Link> for one payment and potentially better rates. {tenantFriendly ? `In ${city.state}'s tenant-friendly environment, multi-family diversification reduces risk from individual vacancy.` : veryLandlord ? `${city.state}'s landlord-friendly laws make multi-family management more straightforward.` : `Multi-family in ${city.name} provides natural diversification against vacancy risk.`}
              </p>
              <p className="mt-2 text-xs font-semibold text-teal-600">Target DSCR: 1.25+ &bull; Down: 25&ndash;30% &bull; Best for: Scalers</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION H: DSCR Loan Rates in [City], [State] for 2026
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            DSCR Loan Rates in {city.name}, {city.stateAbbr} for 2026
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            DSCR loan rates in {city.name} are influenced by your credit score, DSCR ratio, loan-to-value ratio, and the prepayment penalty structure you choose. Rates are typically 1&ndash;2% higher than conventional investment property mortgages because DSCR loans require no income documentation. Here&apos;s what {city.name}, {city.stateAbbr} investors can expect in 2026 based on current market conditions. For a deeper breakdown, see our <Link href={getCityServiceUrl(city, ratesService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan rates guide for {city.name}</Link>.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-teal-200">
                  <th className="py-3 pr-4 text-left font-semibold text-slate-700">Scenario</th>
                  <th className="py-3 pr-4 text-left font-semibold text-slate-700">DSCR</th>
                  <th className="py-3 pr-4 text-left font-semibold text-slate-700">Credit</th>
                  <th className="py-3 pr-4 text-left font-semibold text-slate-700">LTV</th>
                  <th className="py-3 text-left font-semibold text-slate-700">Est. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 pr-4 text-slate-600">Best-case {city.name} deal</td>
                  <td className="py-3 pr-4 font-semibold text-green-700">1.50+</td>
                  <td className="py-3 pr-4 text-slate-600">760+</td>
                  <td className="py-3 pr-4 text-slate-600">65%</td>
                  <td className="py-3 font-semibold text-teal-700">6.75&ndash;7.25%</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-slate-600">Strong {city.name} rental</td>
                  <td className="py-3 pr-4 font-semibold text-green-700">1.25+</td>
                  <td className="py-3 pr-4 text-slate-600">720+</td>
                  <td className="py-3 pr-4 text-slate-600">75%</td>
                  <td className="py-3 font-semibold text-teal-700">7.25&ndash;7.75%</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-slate-600">Standard {city.name} deal</td>
                  <td className="py-3 pr-4 font-semibold text-yellow-700">1.00&ndash;1.24</td>
                  <td className="py-3 pr-4 text-slate-600">680+</td>
                  <td className="py-3 pr-4 text-slate-600">75&ndash;80%</td>
                  <td className="py-3 font-semibold text-teal-700">7.75&ndash;8.50%</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-slate-600">Sub-1.0 DSCR (no cash flow)</td>
                  <td className="py-3 pr-4 font-semibold text-red-600">0.75&ndash;0.99</td>
                  <td className="py-3 pr-4 text-slate-600">700+</td>
                  <td className="py-3 pr-4 text-slate-600">65&ndash;75%</td>
                  <td className="py-3 font-semibold text-teal-700">8.50&ndash;9.50%</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-slate-600">Interest-only option</td>
                  <td className="py-3 pr-4 font-semibold text-yellow-700">1.00+</td>
                  <td className="py-3 pr-4 text-slate-600">700+</td>
                  <td className="py-3 pr-4 text-slate-600">75%</td>
                  <td className="py-3 font-semibold text-teal-700">+0.25&ndash;0.50%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            * Rates are estimated ranges for {city.name}, {city.stateAbbr} as of March 2026. Actual rates depend on lender, property type, and market conditions. {highInsurance ? `Insurance costs in ${city.state} can be higher than average — factor this into your DSCR calculation.` : ""} {highTax ? `${city.state}'s ${info.propertyTaxRate} property tax rate is factored into PITIA and directly affects DSCR ratios.` : ""} Contact a <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan officer</Link> for a personalized rate quote on your {city.name} investment property.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/calculator" className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 font-cta">Calculate Your {city.name} DSCR</Link>
            <Link href="/speak-to-a-loan-officer" className="rounded-lg border border-teal-300 bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Get a Rate Quote</Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION I: 18 DSCR Services Grid
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            All 18 DSCR Loan Services Available in {city.name}, {city.stateAbbr}
          </h2>
          <p className="mt-3 text-base text-slate-500">
            Every DSCR loan product available to {city.name} real estate investors. Click any service for the complete {city.name}-specific guide with requirements, rates, and strategies tailored to {city.state}&apos;s market.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getCityServiceUrl(city, service)}>
                <div className="group h-full rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-300 hover:shadow-lg">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                    {service.name} in {city.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{service.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION J: City FAQ (details elements)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Frequently Asked Questions About DSCR Loans in <span className="gradient-text">{city.name}, {city.stateAbbr}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-500">
            Answers to the most common DSCR loan questions from {city.name}, {city.stateAbbr} real estate investors.
          </p>
          <div className="mt-8 space-y-3">
            {cityFaqs.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-teal-200/60 bg-white" open={i === 0}>
                <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="pr-4 text-base font-semibold text-slate-800 font-heading">{faq.question}</span>
                  <svg className="h-5 w-5 shrink-0 text-teal-500 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION K: Nearby Cities Grid
      ════════════════════════════════════════════════════════════════════ */}
      {nearbyCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
              DSCR Loans in Other <span className="gradient-text">{city.state}</span> Cities Near {city.name}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-500">
              Explore DSCR loan guides for other {city.state} markets. Each city page includes local rates, requirements, and all 18 DSCR services.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {nearbyCities.map((c) => (
                <Link key={c.slug} href={getCityUrl(c)}>
                  <div className="group rounded-lg border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-600 font-cta">
                      {c.name}, {c.stateAbbr}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">DSCR Loans</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href={`/locations/${getStateSlug(city.state)}`} className="text-sm font-semibold text-teal-600 hover:text-teal-800 font-cta">
                All {city.state} DSCR Loan Cities &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION L: Cross-Links
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            DSCR Loan Resources for {city.name} Investors
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/calculator" className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 font-cta">DSCR Calculator</Link>
            <Link href="/services" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">All 18 Services</Link>
            <Link href="/dscr-101" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR 101 Guide</Link>
            <Link href="/speak-to-a-loan-officer" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Speak to a Loan Officer</Link>
            <Link href={getStateUrl(city.state)} className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">{city.state} DSCR Guide</Link>
            <Link href="/services/dscr-loan-rates" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Current DSCR Rates</Link>
            <Link href="/services/dscr-loan-requirements" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR Requirements</Link>
            <Link href="/services/dscr-vs-conventional-loans" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR vs. Conventional</Link>
            <Link href={getCityServiceUrl(city, foreignService)} className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Foreign National Loans in {city.name}</Link>
            <Link href="/locations" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">All Locations</Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION M: CTA with Text/Phone
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Finance Your Next {city.name} Investment Property?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/80">
            Text or call us with your {city.name}, {city.stateAbbr} deal details &mdash; property address, purchase price, and expected rent. A DSCR specialist will run the numbers with you for free, no obligation. We&apos;ll tell you the estimated DSCR ratio, rate range, and down payment required within minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="sms:+18553003727" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 font-cta">
              (855) 300-DSCR | Text Us
            </a>
            <a href="tel:+18553003727" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              (855) 300-DSCR | Call
            </a>
          </div>
          <p className="mt-6 text-sm text-white/50">
            Or use the <Link href="/calculator" className="text-teal-200 underline underline-offset-2 hover:text-white">DSCR calculator</Link> to run the numbers yourself right now.
          </p>
        </div>
      </section>
    </>
  );
}
