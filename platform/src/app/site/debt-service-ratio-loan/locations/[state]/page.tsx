// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllStates, getCitiesByStateName, getCityUrl, getStateUrl, getServiceUrl, services } from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import { getStateInfo } from "@/app/site/debt-service-ratio-loan/_lib/stateData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";

interface Props {
  params: Promise<{ state: string }>;
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const cities = getCitiesByStateName(state);
  if (cities.length === 0) return {};

  const stateName = cities[0].state;
  const stateAbbr = cities[0].stateAbbr;
  const info = getStateInfo(stateAbbr);
  return {
    title: `DSCR Loans in ${stateName} — ${cities.length} Cities, Rates & Tips`,
    description: `DSCR loans in ${stateName}. ${info.propertyTaxRate} property tax. ${cities.length} cities with local rates, requirements, and lender connections.`,
    alternates: { canonical: `https://www.debtserviceratioloan.com${getStateUrl(stateName)}` },
  };
}

export default async function StatePage({ params }: Props) {
  const { state } = await params;
  const cities = getCitiesByStateName(state);
  if (cities.length === 0) notFound();

  const stateName = cities[0].state;
  const stateAbbr = cities[0].stateAbbr;
  const sorted = [...cities].sort((a, b) => a.name.localeCompare(b.name));
  const info = getStateInfo(stateAbbr);
  const stateUrl = `https://www.debtserviceratioloan.com${getStateUrl(stateName)}`;

  const taxRate = parseFloat(info.propertyTaxRate);
  const taxRateDecimal = taxRate / 100;
  const sampleHomePrice = taxRate >= 1.5 ? 300000 : taxRate < 0.7 ? 250000 : 275000;
  const annualTax = Math.round(sampleHomePrice * taxRateDecimal);
  const monthlyTax = Math.round(annualTax / 12);

  const strService = services.find((s) => s.slug === "dscr-loans-short-term-rentals")!;
  const multiFamilyService = services.find((s) => s.slug === "dscr-loans-multi-family")!;
  const sfService = services.find((s) => s.slug === "dscr-loans-single-family")!;
  const cashOutService = services.find((s) => s.slug === "dscr-cash-out-refinance")!;
  const brrrrService = services.find((s) => s.slug === "dscr-loans-fix-and-rent-brrrr")!;
  const portfolioService = services.find((s) => s.slug === "dscr-portfolio-loans")!;
  const bridgeService = services.find((s) => s.slug === "dscr-bridge-to-perm")!;
  const foreignService = services.find((s) => s.slug === "dscr-loans-foreign-nationals")!;
  const ratesService = services.find((s) => s.slug === "dscr-loan-rates")!;
  const reqService = services.find((s) => s.slug === "dscr-loan-requirements")!;
  const tipsService = services.find((s) => s.slug === "dscr-loan-tips")!;
  const condoService = services.find((s) => s.slug === "dscr-loans-condos-condotels")!;
  const newConstService = services.find((s) => s.slug === "dscr-loans-new-construction")!;
  const commercialService = services.find((s) => s.slug === "dscr-loans-commercial")!;
  const mixedUseService = services.find((s) => s.slug === "dscr-loans-mixed-use")!;

  const featuredCities = sorted.slice(0, 5);

  const stateFaqs = [
    {
      question: `What is the property tax rate in ${stateName}?`,
      answer: `The average effective property tax rate in ${stateName} is ${info.propertyTaxRate}. Property taxes are included in the PITIA calculation and directly impact your DSCR ratio. ${taxRate >= 1.5 ? `At ${info.propertyTaxRate}, ${stateName} has above-average property taxes which reduce your DSCR.` : taxRate < 0.8 ? `At ${info.propertyTaxRate}, ${stateName} has below-average property taxes which helps boost your DSCR ratio.` : `${stateName}'s property tax rate is moderate compared to the national average.`}`,
    },
    {
      question: `Is ${stateName} landlord-friendly for DSCR investors?`,
      answer: `${stateName} is rated "${info.landlordFriendly}" for landlord-friendliness. ${info.landlordFriendly === "Very" ? `This means faster eviction processes, fewer tenant protections, and a legal environment that favors property owners. This is ideal for DSCR investors.` : info.landlordFriendly === "Tenant-Friendly" ? `This means stronger tenant protections, longer eviction timelines, and more regulations on landlords. DSCR investors should factor in higher vacancy reserves.` : `The laws balance tenant and landlord rights. Standard lease protections apply.`} The foreclosure process in ${stateName} is ${info.foreclosureType.toLowerCase()}.`,
    },
    {
      question: `Can I use a DSCR loan for a short-term rental in ${stateName}?`,
      answer: `Yes, DSCR loans are available for short-term rentals in ${stateName}. ${info.strClimate} Lenders will use either AirDNA projections or your actual booking history to calculate the DSCR for Airbnb and VRBO properties.`,
    },
    {
      question: `What DSCR ratio do I need to qualify in ${stateName}?`,
      answer: `DSCR requirements are the same nationwide — most lenders require a minimum 1.0 DSCR, with 1.25+ getting the best rates. However, your actual DSCR in ${stateName} depends on local rents, property taxes (${info.propertyTaxRate}), and insurance costs. ${info.dscrNote}`,
    },
    {
      question: `How many cities does DebtServiceRatioLoan.com cover in ${stateName}?`,
      answer: `We cover ${cities.length} ${cities.length === 1 ? "city" : "cities"} in ${stateName} with city-specific DSCR loan guides. Each city page includes all 18 DSCR services, local market data, and connections to loan officers who serve that market.`,
    },
    {
      question: `Does ${stateName} have state income tax?`,
      answer: `${info.incomeTax === "None" ? `No — ${stateName} has no state income tax, which is a significant advantage for real estate investors. More of your rental income stays in your pocket.` : `Yes — ${stateName}'s state income tax ranges from ${info.incomeTax}. While this doesn't directly affect DSCR qualification (since DSCR loans don't verify income), it impacts your overall investment returns and after-tax cash flow.`}`,
    },
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: `DebtServiceRatioLoan.com — ${stateName} DSCR Loans`,
    description: `DSCR loan services for real estate investors in ${stateName}. ${info.dscrNote}`,
    url: stateUrl,
    telephone: "+1-855-300-3727",
    areaServed: {
      "@type": "State",
      name: stateName,
    },
    parentOrganization: {
      "@id": "https://www.debtserviceratioloan.com/#organization",
    },
    serviceType: "DSCR Loans",
    priceRange: "$$",
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Get a DSCR Loan in ${stateName}`,
    description: `Step-by-step guide to obtaining a DSCR loan for investment property in ${stateName}. Covers property selection, DSCR calculation, documentation, and closing.`,
    totalTime: "P30D",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "Varies by loan amount",
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: `Identify a ${stateName} Investment Property`,
        text: `Research rental markets across ${stateName}'s ${cities.length} cities. Look for properties where projected rental income exceeds the total monthly debt service (PITIA). Use local rent comps and factor in ${stateName}'s ${info.propertyTaxRate} property tax rate.`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Calculate Your DSCR Ratio",
        text: `Use the DSCR formula: Monthly Rental Income divided by PITIA (Principal + Interest + Taxes + Insurance + Association dues). For ${stateName}, pay special attention to property taxes at ${info.propertyTaxRate} and insurance costs. Target a DSCR of 1.25 or higher for the best rates.`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Prepare Your Down Payment and Reserves",
        text: `Most DSCR lenders require 20-25% down payment and 6-12 months of cash reserves. In ${stateName}, with ${info.propertyTaxRate} property taxes and local insurance rates, calculate your monthly PITIA to determine reserve requirements.`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Get Pre-Qualified with a DSCR Lender",
        text: `Contact a DSCR loan specialist who works in ${stateName}. Unlike conventional loans, DSCR pre-qualification focuses on the property's income potential rather than your personal income or tax returns.`,
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Submit Your Loan Application and Property Documents",
        text: `Provide the purchase contract, rent roll or market rent analysis, insurance quotes for ${stateName}, and entity documents (if closing in an LLC). The lender will order an appraisal with a rent schedule.`,
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: `Close on Your ${stateName} Investment Property`,
        text: `After appraisal and underwriting, proceed to closing. ${stateName} uses ${info.foreclosureType.toLowerCase()} foreclosure, which affects deed type and closing procedures. Most DSCR loans close in 21-30 days.`,
      },
    ],
  };

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `DSCR Loans in ${stateName}`,
          `DSCR loan guides for ${cities.length} cities in ${stateName}. Property tax: ${info.propertyTaxRate}. ${info.landlordFriendly} landlord laws.`,
          stateUrl
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Locations", url: "https://www.debtserviceratioloan.com/locations" },
          { name: stateName, url: stateUrl },
        ])}
      />
      <JsonLd data={faqSchema(stateFaqs)} />
      <JsonLd data={localBusinessSchema} />
      <JsonLd data={howToSchema} />

      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-20 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full border border-teal-300/40 bg-teal-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {cities.length} Cities &bull; 18 DSCR Services &bull; Updated 2026
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            DSCR Loans in <span className="text-teal-200">{stateName}</span> — Complete Investor Guide to Rates, Requirements &amp; {cities.length} Local Markets
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            {stateName} real estate investors use DSCR loans to qualify based on rental property cash flow instead of personal income. With {info.propertyTaxRate} average property taxes, {info.landlordFriendly.toLowerCase()}-level landlord protections, and {info.foreclosureType.toLowerCase()} foreclosure proceedings, {stateName} presents a unique landscape for debt service coverage ratio lending. This guide covers everything you need to know about securing a DSCR loan in {stateName} — from local market dynamics and tax implications to step-by-step application strategies across all {cities.length} cities we serve. Whether you are buying your first {stateName} rental or expanding a multi-property portfolio, our <Link href="/calculator" className="text-teal-200 underline underline-offset-2 hover:text-white">DSCR calculator</Link> and <Link href="/speak-to-a-loan-officer" className="text-teal-200 underline underline-offset-2 hover:text-white">loan officer network</Link> are here to help.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="sms:+18553003727" className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 font-cta">
              (855) 300-DSCR | Text Us
            </a>
            <Link href="/calculator" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Run the Calculator
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPLETE GUIDE INTRO — ~600 words
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            The Complete Guide to <span className="gradient-text">DSCR Loans in {stateName}</span> for Real Estate Investors
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              A Debt Service Coverage Ratio (DSCR) loan is an investment property mortgage where the lender qualifies the borrower based on the property&apos;s rental income rather than personal income, W-2s, or tax returns. The core calculation is simple: divide the property&apos;s gross monthly rental income by the total monthly debt service — that is, Principal, Interest, Taxes, Insurance, and Association dues (PITIA). If the resulting ratio meets or exceeds the lender&apos;s minimum threshold (usually 1.0 to 1.25), the investor can qualify regardless of their personal financial situation. This makes DSCR lending the preferred tool for self-employed investors, LLC-based portfolio builders, and anyone who writes off enough on their tax returns to disqualify them from conventional financing. For a detailed breakdown of how the formula works, visit our <Link href="/dscr-101" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR 101 guide</Link>.
            </p>

            <p>
              So why does {stateName} specifically matter when it comes to DSCR lending? Because the DSCR formula is directly influenced by local, state-level factors. {stateName}&apos;s average effective property tax rate of {info.propertyTaxRate} feeds directly into your PITIA denominator — {taxRate >= 1.5 ? `and at ${info.propertyTaxRate}, ${stateName}'s above-average taxes represent a meaningful headwind that investors must plan around` : taxRate < 0.8 ? `and at ${info.propertyTaxRate}, ${stateName}'s below-average tax burden gives investors a tangible advantage in hitting DSCR thresholds` : `which falls in the moderate range nationally and gives ${stateName} investors a reasonable baseline for DSCR calculations`}. Insurance premiums in {stateName} also vary significantly by region: {info.insuranceNote.toLowerCase()} These costs are baked into the DSCR equation, which means a property with identical rent and purchase price will produce a different DSCR ratio in {stateName} than in a neighboring state — sometimes by 0.2 or more. You can test this yourself with our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">free DSCR calculator</Link>.
            </p>

            <p>
              {stateName}&apos;s legal framework also shapes the investment calculus. The state is rated &ldquo;{info.landlordFriendly}&rdquo; on our landlord-friendliness scale, which considers eviction timelines, tenant protection statutes, security deposit regulations, and lease enforcement standards. {info.landlordFriendly === "Very" ? `For DSCR investors, this is a major plus — faster eviction processes mean shorter vacancy periods, and the legal environment generally favors property owners in disputes.` : info.landlordFriendly === "Tenant-Friendly" ? `DSCR investors operating in ${stateName} need to budget for longer vacancy periods, higher legal costs for evictions, and more complex compliance requirements around tenant rights.` : `This balanced approach means ${stateName} investors face moderate eviction timelines and standard lease enforcement — neither a major advantage nor a significant drag on returns.`} {stateName} uses {info.foreclosureType.toLowerCase()} foreclosure, which {info.foreclosureType === "Non-Judicial" ? "allows lenders to foreclose without court involvement, making the process faster and less costly — a factor that can actually improve the terms lenders offer you" : info.foreclosureType === "Judicial" ? "requires court proceedings for foreclosure, adding time and cost to the process — some lenders factor this into their pricing, resulting in slightly higher rates" : "combines both judicial and non-judicial processes depending on the circumstances, giving some flexibility in how foreclosures are handled"}.
            </p>

            <p>
              Who uses DSCR loans in {stateName}? The borrower profile is diverse: out-of-state investors purchasing {stateName} rental properties remotely, local {stateName} landlords scaling beyond the 10-property conventional loan cap, self-employed entrepreneurs whose tax write-offs tank their qualifying income, <Link href={getServiceUrl(foreignService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">foreign nationals</Link> investing in U.S. real estate, and experienced flippers pivoting to the <Link href={getServiceUrl(brrrrService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">BRRRR strategy</Link> (Buy, Rehab, Rent, Refinance, Repeat). Whether you are purchasing a <Link href={getServiceUrl(sfService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">single-family rental</Link> in {featuredCities.length > 0 ? featuredCities[0].name : "a major metro"}, a <Link href={getServiceUrl(multiFamilyService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">multi-family property</Link> in {featuredCities.length > 1 ? featuredCities[1].name : "a growing suburb"}, or a <Link href={getServiceUrl(strService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">short-term vacation rental</Link> in a {stateName} tourism market, the DSCR loan framework applies the same way — and this guide will walk you through every variable.
            </p>

            <p>
              {info.dscrNote} Below, we break down {stateName}&apos;s property taxes, insurance landscape, landlord-tenant laws, short-term rental climate, and investment strategies — all through the lens of how they affect your DSCR qualification and long-term returns. We also provide a step-by-step walkthrough for getting a DSCR loan in {stateName}, current rate benchmarks, and links to all {cities.length} city-specific guides across the state. Use the <Link href="/services" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">18 DSCR services</Link> we cover to dive deeper into any product type.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          QUICK STATS GRID
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            {stateName} DSCR Loan Quick Facts — Key Numbers Every Investor Should Know
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-600">
            These four data points shape every DSCR calculation for {stateName} investment properties. Plug them into our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> to see exactly how they affect your deal.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">{info.propertyTaxRate}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">Property Tax Rate</p>
              <p className="mt-1 text-xs text-slate-400">{taxRate >= 1.5 ? "Above avg" : taxRate < 0.8 ? "Below avg" : "Moderate"} nationally</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">{info.incomeTax}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">State Income Tax</p>
              <p className="mt-1 text-xs text-slate-400">{info.incomeTax === "None" ? "Major investor advantage" : "Affects after-tax returns"}</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">{info.landlordFriendly}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">Landlord-Friendly</p>
              <p className="mt-1 text-xs text-slate-400">{info.landlordFriendly === "Very" ? "Favors property owners" : info.landlordFriendly === "Tenant-Friendly" ? "Stronger tenant rights" : "Balanced approach"}</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-bold text-teal-600 font-heading">{info.foreclosureType}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">Foreclosure Process</p>
              <p className="mt-1 text-xs text-slate-400">{info.foreclosureType === "Non-Judicial" ? "Faster, lower lender risk" : info.foreclosureType === "Judicial" ? "Court-required, slower" : "Depends on situation"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          MARKET ANALYSIS — ~500 words
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {stateName} DSCR Market Analysis — Real Estate Investment Climate for {new Date().getFullYear()}
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              Understanding {stateName}&apos;s real estate investment climate is critical before committing capital to a DSCR-financed property. The debt service coverage ratio does not exist in a vacuum — it is a product of local rents, state-level taxes, regional insurance markets, and the legal framework governing landlord-tenant relationships. Let us examine what the data tells us about investing in {stateName} right now.
            </p>

            <p>
              {info.dscrNote} This assessment reflects a combination of rent-to-price ratios, tax burden, insurance affordability, and regulatory environment. For investors evaluating {stateName} against other states, these factors should be weighed together — a low property tax rate means nothing if insurance costs are astronomical, and strong rents are less meaningful if tenant-friendly laws create extended vacancy risk. The <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> lets you model all of these variables for any specific {stateName} property.
            </p>

            <p>
              On the short-term rental front, {stateName} presents a distinct picture: {info.strClimate.toLowerCase()} Investors considering Airbnb or VRBO strategies in {stateName} should research city-level STR ordinances carefully, as regulations can vary dramatically even within the same county. Our <Link href={getServiceUrl(strService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">short-term rental DSCR loan guide</Link> covers how lenders evaluate STR income — including the use of AirDNA projections and actual booking history — and how {stateName}&apos;s regulatory environment affects your options.
            </p>

            <p>
              Insurance is another variable that can make or break a {stateName} DSCR deal. {info.insuranceNote} Since insurance is part of the PITIA denominator in the DSCR formula, even a $100/month difference in premiums can shift your ratio by 0.05 to 0.10 — enough to push a borderline deal above or below the lender&apos;s 1.0 threshold. We strongly recommend getting insurance quotes from at least three {stateName} carriers before finalizing your DSCR projections. Factor in any state-specific coverage requirements such as wind, hail, flood, earthquake, or wildfire riders that may apply to your target market within {stateName}.
            </p>

            <p>
              {info.incomeTax === "None" ? `One of ${stateName}'s biggest advantages for real estate investors is the absence of state income tax. While this does not directly affect your DSCR qualification (DSCR loans do not verify personal income), it has a significant impact on your after-tax cash flow and overall return on investment. Every dollar of rental income you collect in ${stateName} avoids the state-level tax bite that investors in high-tax states face.` : `${stateName}'s state income tax (${info.incomeTax}) does not directly affect DSCR qualification since these loans do not verify personal income. However, it materially impacts your after-tax returns. Investors comparing ${stateName} to no-income-tax states like Texas, Florida, or Nevada should factor this into their total cost of ownership analysis.`} For investors comparing {stateName} to other states, browse our <Link href="/locations" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">complete state directory</Link> to see how the numbers stack up side by side.
            </p>
          </div>

          {/* Whiteboard Tip */}
          <div className="mt-8 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
              <div className="text-sm leading-relaxed text-teal-900">
                <span className="font-bold uppercase tracking-wider text-teal-700 text-xs">Whiteboard Tip</span>
                <p className="mt-1">{info.tip}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          GOOD vs BAD
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-14">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Pros and Cons of DSCR Investing in {stateName} — What Works and What to Watch
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Every state has advantages and drawbacks for DSCR investors. Here is an honest breakdown for {stateName} based on current tax rates, landlord laws, insurance costs, and market conditions.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Good */}
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-6">
              <h3 className="text-lg font-bold text-green-800 font-heading">Good for DSCR Investors</h3>
              <ul className="mt-4 space-y-2">
                {info.incomeTax === "None" && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> No state income tax — more rental income stays in your pocket</li>
                )}
                {taxRate < 1.0 && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Low property taxes ({info.propertyTaxRate}) — directly boosts your DSCR ratio</li>
                )}
                {info.landlordFriendly === "Very" && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Very landlord-friendly laws — easier evictions, fewer tenant protections</li>
                )}
                {info.foreclosureType === "Non-Judicial" && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Non-judicial foreclosure — faster process, lower lender risk, potentially better rates</li>
                )}
                {info.strClimate.toLowerCase().includes("strong") && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> Strong short-term rental market for Airbnb and VRBO investors</li>
                )}
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> All <Link href="/services" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">18 DSCR services</Link> available in {stateName}</li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-600 shrink-0">&#10003;</span> {cities.length} cities covered with local DSCR market data</li>
              </ul>
            </div>

            {/* Bad */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
              <h3 className="text-lg font-bold text-red-800 font-heading">Watch Out For</h3>
              <ul className="mt-4 space-y-2">
                {taxRate >= 1.5 && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> High property taxes ({info.propertyTaxRate}) — significantly reduces DSCR</li>
                )}
                {info.landlordFriendly === "Tenant-Friendly" && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> Tenant-friendly laws — longer eviction process, more tenant protections</li>
                )}
                {info.foreclosureType === "Judicial" && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> Judicial foreclosure — slower process, some lenders charge higher rates</li>
                )}
                {info.insuranceNote.toLowerCase().includes("high") && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> High insurance costs — {info.insuranceNote}</li>
                )}
                {info.strClimate.toLowerCase().includes("regulat") && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> STR regulations — {info.strClimate}</li>
                )}
                {info.incomeTax !== "None" && parseFloat(info.incomeTax) > 5 && (
                  <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> State income tax up to {info.incomeTax} — affects your overall returns</li>
                )}
                <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-red-500 shrink-0">&#10007;</span> Always verify local rent comps — state averages can mask city-level variation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PROPERTY TAXES — ~400 words with math example
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            How Property Taxes in {stateName} Affect Your DSCR Loan Qualification
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              Property taxes are one of the four components of PITIA (Principal, Interest, Taxes, Insurance, and Association dues), which forms the denominator of the DSCR formula. In {stateName}, the average effective property tax rate is {info.propertyTaxRate}, and this number has a direct, measurable impact on whether your investment property hits the lender&apos;s DSCR threshold. Higher property taxes increase your monthly PITIA obligation, which lowers your DSCR ratio — even when rents are strong. {taxRate >= 1.5 ? `At ${info.propertyTaxRate}, ${stateName} ranks among the higher property tax states in the nation, which means investors must compensate with either stronger rents, larger down payments, or lower interest rates to achieve passing DSCR ratios.` : taxRate < 0.8 ? `At ${info.propertyTaxRate}, ${stateName} offers a meaningful property tax advantage over the national average of approximately 1.1%, giving investors more room to hit DSCR targets.` : `${stateName}'s ${info.propertyTaxRate} rate is close to the national average, placing it in the middle of the pack among states.`}
            </p>

            <p>
              Let us run a concrete example. Consider a ${sampleHomePrice.toLocaleString()} investment property in {stateName}. At the {info.propertyTaxRate} average effective rate, the annual property tax bill comes to approximately ${annualTax.toLocaleString()}, or ${monthlyTax.toLocaleString()}/month. Now assume a 25% down payment (${Math.round(sampleHomePrice * 0.25).toLocaleString()}), a 7.5% DSCR loan rate on a 30-year term, and $150/month for insurance. The monthly principal and interest on a ${Math.round(sampleHomePrice * 0.75).toLocaleString()} loan at 7.5% is approximately ${Math.round((sampleHomePrice * 0.75) * (0.00625 * Math.pow(1.00625, 360)) / (Math.pow(1.00625, 360) - 1)).toLocaleString()}/month. Add ${monthlyTax.toLocaleString()} in property taxes and $150 in insurance, and your total PITIA is approximately ${(Math.round((sampleHomePrice * 0.75) * (0.00625 * Math.pow(1.00625, 360)) / (Math.pow(1.00625, 360) - 1)) + monthlyTax + 150).toLocaleString()}/month. To hit a 1.0 DSCR, you would need at least ${(Math.round((sampleHomePrice * 0.75) * (0.00625 * Math.pow(1.00625, 360)) / (Math.pow(1.00625, 360) - 1)) + monthlyTax + 150).toLocaleString()}/month in rent. For the preferred 1.25 DSCR, you would need ${Math.round((Math.round((sampleHomePrice * 0.75) * (0.00625 * Math.pow(1.00625, 360)) / (Math.pow(1.00625, 360) - 1)) + monthlyTax + 150) * 1.25).toLocaleString()}/month.
            </p>

            <p>
              Plug your actual {stateName} property into our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> to see the exact numbers. Remember that property tax rates vary within {stateName} — some counties and municipalities may be significantly higher or lower than the {info.propertyTaxRate} state average. Always verify the actual tax bill on the specific property you are evaluating, not just the state-level average. If you are comparing {stateName} to other states, visit our <Link href="/locations" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">full state directory</Link> to see how tax rates differ across the country and how those differences translate into DSCR outcomes.
            </p>
          </div>

          {/* Whiteboard Tip */}
          <div className="mt-8 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
              <div className="text-sm leading-relaxed text-teal-900">
                <span className="font-bold uppercase tracking-wider text-teal-700 text-xs">Whiteboard Tip</span>
                <p className="mt-1">A $100/month difference in property taxes changes your DSCR by about 0.05–0.08 on a typical rental property. In {stateName}, that means even small differences between counties can flip a deal from &ldquo;approved&rdquo; to &ldquo;denied.&rdquo; Always use the actual tax bill, not estimates.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          INSURANCE — ~300 words
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Insurance Costs for {stateName} Investment Properties and How They Impact Your DSCR
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              Insurance is the &ldquo;I&rdquo; in PITIA, and in {stateName}, it deserves serious attention. {info.insuranceNote} Unlike property taxes, which are relatively predictable based on assessed value and millage rates, insurance premiums in {stateName} can vary dramatically depending on the property&apos;s location, age, construction type, and exposure to natural hazards. For DSCR investors, this variability introduces a wildcard into the qualification equation — a property that looks great on paper can fall below the 1.0 DSCR threshold once actual insurance quotes come in.
            </p>

            <p>
              We recommend the following approach for {stateName} investors: before you even make an offer on a property, contact at least three insurance carriers that write investment property policies in {stateName}. Ask specifically about landlord or dwelling fire policies (DP-1 or DP-3), not standard homeowner&apos;s insurance. Factor in any state-specific riders that may be required or advisable for your target area — flood insurance for properties in FEMA-designated flood zones, wind/hail coverage for storm-prone regions, or earthquake insurance where applicable. These additional coverages can add $50 to $300+ per month to your PITIA, and they are non-negotiable from the lender&apos;s perspective.
            </p>

            <p>
              If you are investing in {stateName} remotely from another state, do not assume that insurance costs are similar to what you pay at home. Use our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> with your actual insurance quote to see how it affects your ratio. For more guidance on structuring DSCR deals around insurance costs, read our <Link href={getServiceUrl(tipsService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan tips guide</Link>, which includes strategies for managing high-insurance markets. You can also <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">speak with a loan officer</Link> who works in {stateName} to get lender-specific guidance on acceptable insurance documentation.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          LANDLORD-TENANT LAWS — ~400 words
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {stateName} Landlord-Tenant Laws and What They Mean for DSCR Loan Investors
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="space-y-5 text-base leading-relaxed text-slate-600 lg:col-span-3">
              <p>
                {stateName} is classified as &ldquo;{info.landlordFriendly}&rdquo; on our landlord-friendliness scale, and this rating directly affects how DSCR investors should model vacancy, legal expenses, and cash flow projections. {info.landlordFriendly === "Very" ? `As a very landlord-friendly state, ${stateName} generally provides shorter eviction timelines (often 2-4 weeks for non-payment), fewer restrictions on security deposits, more flexibility in lease terms, and a legal environment that defaults toward property owner rights. For DSCR investors, this translates to lower vacancy risk, faster turnover, and reduced legal overhead — all of which support stronger actual cash flow performance relative to the DSCR ratio calculated at origination.` : info.landlordFriendly === "Tenant-Friendly" ? `As a tenant-friendly state, ${stateName} provides stronger tenant protections including longer eviction timelines (sometimes 60-90+ days), restrictions on security deposit amounts and usage, limits on lease termination, and in some cases rent control or rent stabilization ordinances. For DSCR investors, this means budgeting 1-2 additional months of vacancy per year, setting aside funds for potential legal costs associated with evictions, and being meticulous about tenant screening and lease drafting. Your actual cash flow may trail the DSCR ratio by a wider margin than in landlord-friendly states.` : `With moderate landlord-tenant laws, ${stateName} strikes a balance between property owner rights and tenant protections. Eviction timelines typically fall in the 3-6 week range for non-payment cases, security deposit regulations are standard, and lease enforcement follows conventional norms. DSCR investors in ${stateName} face a predictable legal environment without the extremes seen in very landlord-friendly or heavily tenant-friendly states.`}
              </p>

              <p>
                The foreclosure framework in {stateName} is {info.foreclosureType.toLowerCase()}, which matters because it affects lender risk assessment and, by extension, the terms they offer borrowers. {info.foreclosureType === "Non-Judicial" ? `Non-judicial foreclosure means the lender can execute a foreclosure through a trustee sale without going through the court system. This reduces the lender's risk exposure, which can translate to slightly better rates and more willing lenders for ${stateName} properties.` : info.foreclosureType === "Judicial" ? `Judicial foreclosure requires the lender to file a lawsuit and obtain a court order before foreclosing, which adds months to the timeline and increases costs. Some DSCR lenders factor this additional risk into their pricing for ${stateName} properties, potentially resulting in slightly higher rates or tighter qualification requirements.` : `The combined judicial and non-judicial framework gives lenders flexibility depending on the loan documents and circumstances. This does not significantly impact DSCR loan pricing in ${stateName}.`}
              </p>

              <p>
                When evaluating {stateName} for DSCR investment, look at your target city&apos;s specific regulations as well — many cities have their own landlord licensing requirements, inspection mandates, and lead paint or habitability standards that layer on top of state law. Browse our <Link href={`${getStateUrl(stateName)}`} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">{stateName} city guides</Link> for local-level insights, or <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">speak to a {stateName} loan officer</Link> who understands the local regulatory landscape.
              </p>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 font-heading">{stateName} Landlord Law Snapshot</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Landlord Rating</dt>
                    <dd className="font-semibold text-slate-800">{info.landlordFriendly}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Foreclosure Type</dt>
                    <dd className="font-semibold text-slate-800">{info.foreclosureType}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Income Tax</dt>
                    <dd className="font-semibold text-slate-800">{info.incomeTax}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Property Tax</dt>
                    <dd className="font-semibold text-slate-800">{info.propertyTaxRate}</dd>
                  </div>
                </dl>
                <div className="mt-5">
                  <Link href={getServiceUrl(reqService)} className="block rounded-lg bg-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-teal-700 font-cta">
                    See Full DSCR Requirements
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SHORT-TERM RENTAL — ~400 words
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Short-Term Rental DSCR Loans in {stateName} — Airbnb &amp; VRBO Investment Financing
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              Short-term rental (STR) properties — Airbnbs, VRBOs, and vacation rentals — are among the most profitable DSCR investments because they can generate 1.5 to 3 times the income of a comparable long-term rental. In {stateName}, the STR landscape is shaped by local regulations, tourism patterns, and seasonal demand. {info.strClimate} For investors who understand the regulatory environment and choose the right {stateName} markets, STR DSCR loans can unlock exceptional returns.
            </p>

            <p>
              DSCR lenders evaluate short-term rental income differently than long-term rental income. For existing STR properties with a track record, lenders typically use the trailing 12 months of actual booking revenue (from Airbnb, VRBO, or a property management platform). For new STR acquisitions without history, most lenders accept third-party rental projection reports from platforms like AirDNA, which analyze comparable listings, occupancy rates, and seasonal pricing in the specific {stateName} market. Some lenders use a blend of both methods. The resulting income figure is then divided by the property&apos;s PITIA to calculate the DSCR ratio, just as with a long-term rental. Read the full details in our <Link href={getServiceUrl(strService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">STR DSCR loan guide</Link>.
            </p>

            <p>
              Key considerations for {stateName} STR investors include: licensing and permit requirements (many {stateName} municipalities require an STR license, business tax registration, or both), occupancy tax collection obligations, HOA restrictions (particularly for condos and planned communities), and seasonality. A {stateName} vacation rental that generates $5,000/month in peak season but only $1,500/month in the off-season will have a different annualized DSCR than a property with steady year-round demand. Lenders annualize STR income, so the DSCR reflects the full-year picture — but you as the investor need to ensure you have cash reserves to cover low-income months.
            </p>

            <p>
              If you are considering a short-term rental DSCR loan in {stateName}, start by checking local STR regulations in your target city. Browse our {stateName} city guides below to see which markets have the strongest STR fundamentals. Then use the <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> with your projected STR income to see if the numbers work. For personalized guidance, <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">text or call our loan officer team</Link> at (855) 300-DSCR — they work with {stateName} STR investors daily.
            </p>
          </div>

          {/* Whiteboard Tip */}
          <div className="mt-8 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
              <div className="text-sm leading-relaxed text-teal-900">
                <span className="font-bold uppercase tracking-wider text-teal-700 text-xs">Whiteboard Tip</span>
                <p className="mt-1">When comparing {stateName} STR deals, always calculate DSCR using annualized income (total projected revenue / 12), not peak-month income. Lenders see through inflated projections. AirDNA reports are your best friend here — they give a realistic 12-month picture.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          INVESTMENT STRATEGIES — ~500 words
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Top Investment Strategies for {stateName} DSCR Loan Investors in {new Date().getFullYear()}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The best DSCR strategy for {stateName} depends on your capital, risk tolerance, and target return. Here are five proven approaches that work well with {stateName}&apos;s market fundamentals — each linked to the specific DSCR product that supports it.
          </p>

          <div className="mt-8 space-y-6">
            {/* Strategy 1 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg font-bold text-teal-700">1</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Buy-and-Hold Single-Family Rentals</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    The most straightforward DSCR strategy in {stateName}: purchase a <Link href={getServiceUrl(sfService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">single-family rental</Link> in a market with strong rent-to-price ratios, place a long-term tenant, and hold for cash flow and appreciation. With {stateName}&apos;s {info.propertyTaxRate} property tax rate {taxRate < 1.0 ? "providing a tax-friendly base" : "factored into your PITIA"}, and {info.landlordFriendly.toLowerCase()} landlord laws {info.landlordFriendly === "Very" ? "protecting your interests" : "requiring careful tenant selection"}, this strategy works best in cities with stable employer bases and population growth. Browse our {stateName} city guides below to identify the strongest markets.
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy 2 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg font-bold text-teal-700">2</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">BRRRR Method (Buy, Rehab, Rent, Refinance, Repeat)</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    The <Link href={getServiceUrl(brrrrService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">BRRRR strategy</Link> is powerful in {stateName} because it lets you force equity through renovation, then refinance into a DSCR loan based on the new, higher appraised value and post-rehab rental income. In {stateName}, where {info.foreclosureType.toLowerCase()} foreclosure proceedings {info.foreclosureType === "Non-Judicial" ? "give lenders more confidence" : "are standard"}, lenders are generally willing to offer competitive <Link href={getServiceUrl(cashOutService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">cash-out refinance</Link> terms once the property is stabilized. Pair this with a <Link href={getServiceUrl(bridgeService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">bridge-to-perm loan</Link> for a seamless acquisition-to-hold transition.
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy 3 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg font-bold text-teal-700">3</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Multi-Family Cash Flow Stacking</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    <Link href={getServiceUrl(multiFamilyService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Multi-family DSCR loans</Link> are particularly effective in {stateName} {taxRate >= 1.5 ? `because combining multiple units of rental income helps overcome the state's high ${info.propertyTaxRate} property tax rate — the combined rents from a duplex or fourplex can push your DSCR above thresholds that would be difficult with a single unit` : `because the combined rental income from multiple units creates a stronger DSCR ratio, often exceeding 1.25 even with conservative rent estimates`}. This strategy scales well: once you hit the stride with 2-4 unit properties, you can move into <Link href={getServiceUrl(commercialService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">5+ unit commercial DSCR loans</Link> or consolidate with <Link href={getServiceUrl(portfolioService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">portfolio blanket loans</Link>.
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy 4 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg font-bold text-teal-700">4</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Vacation &amp; Short-Term Rental Play</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {info.strClimate} If {stateName} has viable STR markets, the <Link href={getServiceUrl(strService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">short-term rental DSCR loan</Link> path can generate 1.5-3x the income of a comparable long-term rental. Higher income translates directly to a higher DSCR ratio, better loan terms, and stronger cash flow. Just make sure you verify local STR licensing requirements and use conservative annual income projections rather than peak-month figures. <Link href={getServiceUrl(condoService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Condo and condotel DSCR loans</Link> are also available for resort-style STR investments.
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy 5 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg font-bold text-teal-700">5</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">New Construction Rental Acquisitions</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    <Link href={getServiceUrl(newConstService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">New construction DSCR loans</Link> are growing in popularity across {stateName} because brand-new properties require minimal maintenance reserves, attract premium tenants willing to pay higher rents, and often come with builder incentives that reduce out-of-pocket costs. In {stateName}&apos;s growing markets, new construction can also deliver strong appreciation alongside cash flow — a double benefit that <Link href={getServiceUrl(mixedUseService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">mixed-use</Link> and traditional investors alike are leveraging.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Whiteboard Tip */}
          <div className="mt-8 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
              <div className="text-sm leading-relaxed text-teal-900">
                <span className="font-bold uppercase tracking-wider text-teal-700 text-xs">Whiteboard Tip</span>
                <p className="mt-1">The best {stateName} DSCR investors do not rely on a single strategy. They layer approaches — a core portfolio of stable SFRs for cash flow, a few BRRRR projects for equity creation, and maybe an STR or two for income spikes. Diversifying your {stateName} DSCR portfolio protects against any single market or strategy underperforming.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STEP-BY-STEP HOW TO GET A DSCR LOAN — ~400 words
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Step-by-Step: How to Get a DSCR Loan in {stateName} ({new Date().getFullYear()} Process)
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Getting a DSCR loan in {stateName} follows a straightforward six-step process. Unlike conventional mortgages, there are no tax returns, W-2s, or pay stubs to gather — the focus is entirely on the property&apos;s ability to generate sufficient rental income to cover the debt service. Here is how it works from start to close for {stateName} properties.
          </p>

          <div className="mt-8 space-y-6">
            <div className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white font-heading">1</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Identify a {stateName} Investment Property with Strong Rent-to-Price Ratio</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Research markets across {stateName}&apos;s {cities.length} cities using our city guides below. Look for properties where the expected monthly rent is at least 0.75-1.0% of the purchase price. Factor in {stateName}&apos;s {info.propertyTaxRate} property tax rate from the start — it is part of the DSCR equation. Use online rent estimators, talk to local property managers, and review comparable listings to build your rent projection.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white font-heading">2</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Run Your DSCR Calculation Using Actual {stateName} Costs</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Use our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> with real numbers: the asking price, your expected down payment, estimated interest rate, {stateName} property taxes for the specific parcel, actual insurance quotes from {stateName} carriers, and any HOA or association fees. The calculator will show your DSCR ratio instantly. Aim for 1.25+ for the best <Link href={getServiceUrl(ratesService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan rates</Link>.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white font-heading">3</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Prepare Your Down Payment and Cash Reserves</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Most DSCR lenders require 20-25% down for standard programs. You will also need 6-12 months of cash reserves (PITIA payments sitting in a bank account). For {stateName} properties, calculate your monthly PITIA including the {info.propertyTaxRate} property tax rate and your insurance quote to determine the exact reserve requirement. Review the full <Link href={getServiceUrl(reqService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan requirements</Link> to make sure you are prepared.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white font-heading">4</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Get Pre-Qualified with a DSCR Lender Who Works in {stateName}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Contact a DSCR loan specialist</Link> who is licensed and experienced in {stateName}. Pre-qualification for a DSCR loan is faster than conventional — since there is no income verification, the lender primarily needs your credit score, assets for down payment/reserves, and the property details. A good DSCR lender will also know {stateName}-specific nuances like typical insurance costs and county-level tax variations.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white font-heading">5</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Submit Your Application and Property Documentation</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Your DSCR loan application for a {stateName} property typically includes: the purchase contract, entity documents if closing in an LLC, bank statements showing reserves, and your insurance binder from a {stateName} carrier. The lender will order an appraisal with a rental survey (Form 1007 for single-family or comparable analysis for multi-family) to verify market rents. For STR properties, you may also submit AirDNA reports or actual booking revenue statements.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white font-heading">6</div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Close on Your {stateName} Investment Property</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Once the appraisal confirms value and rents, and underwriting verifies your DSCR meets the lender&apos;s minimum threshold, you proceed to closing. {stateName} uses {info.foreclosureType.toLowerCase()} foreclosure, which affects the type of deed and closing procedures used. Most DSCR loans in {stateName} close in 21-30 business days from application — significantly faster than conventional loans because there is no income verification or DTI underwriting to slow things down.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          RATE TABLE
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Current DSCR Loan Rate Benchmarks for {stateName} Investment Properties
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            DSCR loan rates in {stateName} follow national pricing, adjusted by your specific DSCR ratio, credit score, loan-to-value (LTV), and loan amount. The table below shows approximate rate ranges as of {new Date().getFullYear()}. For a personalized {stateName} rate quote, <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">contact a loan officer</Link> or read our complete <Link href={getServiceUrl(ratesService)} className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan rates guide</Link>.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-teal-200 bg-teal-50/50">
                  <th className="px-4 py-3 font-semibold text-slate-700">DSCR Ratio</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Typical Rate Range</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Credit Score</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Max LTV</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-teal-700">1.50+</td>
                  <td className="px-4 py-3 text-slate-600">6.75% – 7.50%</td>
                  <td className="px-4 py-3 text-slate-600">720+</td>
                  <td className="px-4 py-3 text-slate-600">80%</td>
                  <td className="px-4 py-3 text-slate-500">Best available DSCR pricing</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-teal-700">1.25 – 1.49</td>
                  <td className="px-4 py-3 text-slate-600">7.25% – 8.00%</td>
                  <td className="px-4 py-3 text-slate-600">700+</td>
                  <td className="px-4 py-3 text-slate-600">80%</td>
                  <td className="px-4 py-3 text-slate-500">Strong qualification range</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-teal-700">1.00 – 1.24</td>
                  <td className="px-4 py-3 text-slate-600">7.75% – 8.50%</td>
                  <td className="px-4 py-3 text-slate-600">680+</td>
                  <td className="px-4 py-3 text-slate-600">75%</td>
                  <td className="px-4 py-3 text-slate-500">Standard DSCR qualification</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-teal-700">0.75 – 0.99</td>
                  <td className="px-4 py-3 text-slate-600">8.25% – 9.25%</td>
                  <td className="px-4 py-3 text-slate-600">700+</td>
                  <td className="px-4 py-3 text-slate-600">70-75%</td>
                  <td className="px-4 py-3 text-slate-500">Below break-even, limited lenders</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-teal-700">No Ratio</td>
                  <td className="px-4 py-3 text-slate-600">8.50% – 10.00%</td>
                  <td className="px-4 py-3 text-slate-600">720+</td>
                  <td className="px-4 py-3 text-slate-600">65-70%</td>
                  <td className="px-4 py-3 text-slate-500">Property vacant or no rent history</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Rates are approximate and vary by lender, loan amount, prepayment penalty structure, and market conditions. {stateName}-specific factors like {info.foreclosureType.toLowerCase()} foreclosure and local market conditions may also influence pricing. Rates updated periodically. Not a commitment to lend.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CITY GRID
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            All {cities.length} {stateName} Cities with Comprehensive DSCR Loan Guides
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            We maintain individual DSCR loan guides for {cities.length} cities across {stateName}. Each city page includes all <Link href="/services" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">18 DSCR services</Link> customized for that local market, links to <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">speak with a loan officer</Link> who knows the area, and access to the <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> pre-contextualized for local conditions. Click any city below to see the full guide, or use our <Link href="/locations" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">state directory</Link> to browse other states.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sorted.map((city) => (
              <Link key={city.slug} href={getCityUrl(city)}>
                <div className="group rounded-lg border border-teal-200/60 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-600 font-cta">
                    {city.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SERVICE LINKS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            All 18 DSCR Loan Services Available to {stateName} Investors
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Every DSCR product type below is available for {stateName} investment properties. Click any service to learn how it works, qualification requirements, and current rate information.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getServiceUrl(service)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-600 font-cta">{service.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{service.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Frequently Asked Questions About DSCR Loans in <span className="gradient-text">{stateName}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base text-slate-600">
            The most common questions {stateName} investors ask about DSCR loan qualification, rates, and local market factors. Can&apos;t find your answer? <Link href="/speak-to-a-loan-officer" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">Text us at (855) 300-DSCR</Link>.
          </p>
          <div className="mt-8 space-y-3">
            {stateFaqs.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-slate-200 bg-white" open={i === 0}>
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

      {/* ═══════════════════════════════════════════════════════════════
          CROSS-LINKS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Explore More DSCR Resources</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/calculator" className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 font-cta">DSCR Calculator</Link>
            <Link href="/services" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">All 18 Services</Link>
            <Link href="/dscr-101" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR 101 Guide</Link>
            <Link href="/speak-to-a-loan-officer" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Speak to a Loan Officer</Link>
            <Link href="/locations" className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">All States</Link>
            <Link href={getServiceUrl(ratesService)} className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR Rates</Link>
            <Link href={getServiceUrl(reqService)} className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Requirements</Link>
            <Link href={getServiceUrl(tipsService)} className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">DSCR Tips</Link>
            <Link href={getServiceUrl(strService)} className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">STR Loans</Link>
            <Link href={getServiceUrl(foreignService)} className="rounded-lg border border-teal-300 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">Foreign National</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Finance Your {stateName} Investment Property with a DSCR Loan?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/80">
            Our DSCR loan specialists work with {stateName} investors every day. Text or call us with your deal details — the property address, purchase price, and expected rent — and we will run the DSCR numbers with you for free, no obligation. Whether you are looking at a <Link href={getServiceUrl(sfService)} className="text-teal-200 underline underline-offset-2 hover:text-white">single-family rental</Link>, a <Link href={getServiceUrl(multiFamilyService)} className="text-teal-200 underline underline-offset-2 hover:text-white">multi-family</Link>, or a <Link href={getServiceUrl(strService)} className="text-teal-200 underline underline-offset-2 hover:text-white">short-term rental</Link> in any of {stateName}&apos;s {cities.length} markets, we are here to help.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="sms:+18553003727" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 font-cta">
              (855) 300-DSCR | Text Us
            </a>
            <a href="tel:+18553003727" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call (855) 300-3727
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
