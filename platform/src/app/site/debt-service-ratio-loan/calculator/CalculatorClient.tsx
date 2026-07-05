"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Props {
  faqs: { question: string; answer: string }[];
}

export default function CalculatorClient({ faqs }: Props) {
  const [rent, setRent] = useState(2500);
  const [mortgage, setMortgage] = useState(1400);
  const [taxes, setTaxes] = useState(250);
  const [insurance, setInsurance] = useState(125);
  const [hoa, setHoa] = useState(0);
  const [flood, setFlood] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const pitia = mortgage + taxes + insurance + hoa + flood;
  const dscr = pitia > 0 ? rent / pitia : 0;
  const monthlyCashFlow = rent - pitia;
  const annualCashFlow = monthlyCashFlow * 12;

  const getColor = () => {
    if (dscr >= 1.25) return "text-green-600";
    if (dscr >= 1.0) return "text-yellow-600";
    if (dscr >= 0.75) return "text-orange-500";
    return "text-red-600";
  };

  const getBgColor = () => {
    if (dscr >= 1.25) return "bg-green-50 border-green-200";
    if (dscr >= 1.0) return "bg-yellow-50 border-yellow-200";
    if (dscr >= 0.75) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  const getVerdict = () => {
    if (dscr >= 1.5) return { label: "Excellent", detail: "Qualifies with all lenders at the best available rates. Strong cash flow property." };
    if (dscr >= 1.25) return { label: "Strong", detail: "Qualifies with most lenders at competitive rates. This is the sweet spot most investors target." };
    if (dscr >= 1.1) return { label: "Good", detail: "Qualifies with most lenders. Rates may be slightly higher than the 1.25+ tier." };
    if (dscr >= 1.0) return { label: "Break-Even", detail: "Rent exactly covers the mortgage. Most lenders approve but rates will be higher." };
    if (dscr >= 0.75) return { label: "Below Break-Even", detail: "Property is cash-flow negative. Select lenders approve with 25-35% down and 700+ credit." };
    return { label: "Does Not Qualify", detail: "DSCR is too low for most programs. Consider a larger down payment or different property." };
  };

  const getRateEstimate = () => {
    if (dscr >= 1.25) return "7.0% – 7.75%";
    if (dscr >= 1.0) return "7.5% – 8.25%";
    if (dscr >= 0.75) return "8.0% – 9.0%";
    return "N/A";
  };

  const getDownPaymentEstimate = () => {
    if (dscr >= 1.25) return "20% minimum";
    if (dscr >= 1.0) return "20–25%";
    if (dscr >= 0.75) return "25–35%";
    return "30%+ required";
  };

  const verdict = getVerdict();

  const dollarInput = (label: string, value: number, setter: (v: number) => void, hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => setter(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Free Tool &bull; Updated for 2026
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            DSCR <span className="text-teal-200">Calculator</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Calculate your property&apos;s debt service coverage ratio in seconds. See if you qualify, estimate your rate tier, and get actionable tips to improve your DSCR.
          </motion.p>
        </div>
      </section>

      {/* Calculator */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
            {/* Inputs */}
            <div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 font-heading">Property Income</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the monthly rental income from the property.</p>
                <div className="mt-6">
                  {dollarInput("Monthly Rental Income", rent, setRent, "Use market rent from appraisal or actual lease amount")}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 font-heading">Monthly Debt Service (PITIA)</h2>
                <p className="mt-1 text-sm text-slate-500">Enter each component of the monthly mortgage payment.</p>
                <div className="mt-6 space-y-5">
                  {dollarInput("Mortgage Payment (P&I)", mortgage, setMortgage, "Principal + interest portion only")}
                  {dollarInput("Property Taxes", taxes, setTaxes, "Monthly amount (annual ÷ 12)")}
                  {dollarInput("Homeowner's Insurance", insurance, setInsurance, "Monthly premium")}
                  {dollarInput("HOA Dues", hoa, setHoa, "Leave $0 if no HOA")}
                  {dollarInput("Flood Insurance", flood, setFlood, "Required in flood zones — leave $0 if not applicable")}
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div>
              <div className="sticky top-28 space-y-6">
                {/* Main DSCR Result */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                  <h2 className="text-lg font-bold text-slate-900 font-heading">Your DSCR Ratio</h2>

                  <div className={`mt-4 rounded-xl border p-6 text-center ${getBgColor()}`}>
                    <p className={`text-5xl font-bold font-heading ${getColor()}`}>
                      {dscr.toFixed(2)}
                    </p>
                    <p className={`mt-1 text-sm font-semibold ${getColor()}`}>{verdict.label}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{verdict.detail}</p>

                  {/* Breakdown */}
                  <div className="mt-6 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly Rent</span>
                      <span className="font-semibold text-slate-900">${rent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly PITIA</span>
                      <span className="font-semibold text-slate-900">${pitia.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly Cash Flow</span>
                      <span className={`font-bold ${monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {monthlyCashFlow >= 0 ? "+" : ""}${monthlyCashFlow.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Annual Cash Flow</span>
                      <span className={`font-bold ${annualCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {annualCashFlow >= 0 ? "+" : ""}${annualCashFlow.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rate & Down Payment Estimate */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Estimated Loan Terms</h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Rate Estimate (2026)</span>
                      <span className="font-semibold text-teal-700">{getRateEstimate()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Down Payment</span>
                      <span className="font-semibold text-teal-700">{getDownPaymentEstimate()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Min Credit Score</span>
                      <span className="font-semibold text-teal-700">{dscr >= 1.0 ? "620–680" : "700+"}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">
                    Estimates based on typical 2026 DSCR lender pricing. Actual terms vary by lender, credit, and LTV.
                  </p>
                </div>

                {/* Formula Box */}
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Formula</p>
                  <p className="mt-2 text-sm font-mono text-teal-900">
                    DSCR = Rent &divide; PITIA
                  </p>
                  <p className="mt-1 text-sm font-mono text-teal-900">
                    DSCR = ${rent.toLocaleString()} &divide; ${pitia.toLocaleString()} = {dscr.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DSCR Tiers Explanation */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Understanding DSCR Ratio Tiers
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Your DSCR ratio directly impacts the interest rate, down payment, and loan terms you&apos;ll receive. Here&apos;s how lenders view each tier:
          </p>

          <div className="mt-10 space-y-4">
            {[
              { range: "1.50+", label: "Excellent", color: "bg-green-100 text-green-800 border-green-300", rate: "6.75% – 7.25%", down: "20%", desc: "Premium cash-flow property. Access to the lowest DSCR rates and most favorable terms. Some lenders offer reduced pricing at this tier." },
              { range: "1.25 – 1.49", label: "Strong", color: "bg-green-50 text-green-700 border-green-200", rate: "7.0% – 7.75%", down: "20%", desc: "The most common target for investors. Property generates 25%+ more income than the mortgage requires. Qualifies with virtually all DSCR lenders." },
              { range: "1.10 – 1.24", label: "Good", color: "bg-yellow-50 text-yellow-700 border-yellow-200", rate: "7.25% – 8.0%", down: "20–25%", desc: "Solid qualification. Most lenders approve at this level with standard terms. Slight rate premium over the 1.25+ tier." },
              { range: "1.00 – 1.09", label: "Break-Even", color: "bg-yellow-100 text-yellow-800 border-yellow-300", rate: "7.5% – 8.5%", down: "25%", desc: "Rent covers the mortgage but leaves little margin. Most lenders still approve but may require higher down payment or reserves." },
              { range: "0.75 – 0.99", label: "Below 1.0", color: "bg-orange-50 text-orange-700 border-orange-200", rate: "8.0% – 9.5%", down: "25–35%", desc: "Property is cash-flow negative — rent doesn't cover the mortgage. Select lenders have sub-1.0 programs requiring 700+ credit, higher reserves, and larger down payments." },
              { range: "Below 0.75", label: "Does Not Qualify", color: "bg-red-50 text-red-700 border-red-200", rate: "N/A", down: "N/A", desc: "Too low for DSCR financing. Consider increasing the down payment to reduce the mortgage, finding a higher-rent property, or using a different loan program." },
            ].map((tier) => (
              <div key={tier.range} className={`rounded-xl border p-5 ${tier.color}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold font-mono whitespace-nowrap">{tier.range}</span>
                    <span className="rounded-full bg-white/60 px-3 py-0.5 text-xs font-semibold">{tier.label}</span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <span>Rate: <strong>{tier.rate}</strong></span>
                    <span>Down: <strong>{tier.down}</strong></span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed opacity-80">{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips to Improve DSCR */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            7 Ways to Improve Your DSCR Ratio
          </h2>
          <p className="mt-3 text-base text-slate-600">
            If your DSCR is close to a threshold (especially 1.0 or 1.25), small changes can push you into a better rate tier and save thousands over the life of the loan.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                num: "1",
                title: "Increase the Down Payment",
                detail: "A larger down payment reduces the loan amount, which lowers the P&I portion of PITIA. Going from 20% to 25% down on a $400K property reduces monthly P&I by roughly $150–$200, which can boost your DSCR by 0.10–0.15.",
              },
              {
                num: "2",
                title: "Choose Interest-Only Payments",
                detail: "Interest-only DSCR loans eliminate the principal portion of your payment for 5–10 years. This can reduce your monthly PITIA by 20–30%, significantly boosting your DSCR. The tradeoff: you don't build equity through amortization.",
              },
              {
                num: "3",
                title: "Raise Rents Before Applying",
                detail: "If your current rents are below market, raise them before the appraisal. Lenders use the lesser of actual rent or market rent from the appraisal. Having a signed lease at market rate strengthens your application.",
              },
              {
                num: "4",
                title: "Shop Insurance Aggressively",
                detail: "Insurance is a direct input to PITIA. Getting quotes from 3–5 carriers can save $50–$100/month. Consider higher deductibles if your reserves are strong. Every dollar saved on insurance directly improves your DSCR.",
              },
              {
                num: "5",
                title: "Appeal Property Taxes",
                detail: "If the property was recently reassessed at a high value, file a tax appeal. Reducing your annual tax bill by even $600 saves $50/month on PITIA and improves your DSCR. This is especially impactful in high-tax states.",
              },
              {
                num: "6",
                title: "Avoid Properties with High HOA",
                detail: "HOA dues are included in the DSCR calculation and cannot be negotiated down. A $300/month HOA on a condo can drop your DSCR by 0.15–0.20 compared to a single-family with no HOA. Factor this in during your property search.",
              },
              {
                num: "7",
                title: "Use a Rate Buydown",
                detail: "Paying discount points upfront to buy down the interest rate reduces your monthly P&I payment. A 1-point buydown (1% of loan amount) typically reduces the rate by 0.25%, which can improve DSCR by 0.03–0.05. Do the math on break-even.",
              },
            ].map((tip) => (
              <div key={tip.num} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white font-mono">
                  {tip.num}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{tip.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2026 Market Trends */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            DSCR Loan Market Trends — 2026
          </h2>
          <p className="mt-3 text-base text-slate-600">
            What investors need to know about the current DSCR lending environment.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Rates Stabilizing in the 7s",
                body: "After peaking in late 2024, DSCR loan rates have settled into the 7.0%–8.5% range for most borrowers in 2026. Investors with strong DSCR ratios (1.25+) and high credit scores (740+) are seeing rates in the low 7s. ARM products offer rates 0.5–0.75% lower than 30-year fixed.",
              },
              {
                title: "Sub-1.0 DSCR Programs Expanding",
                body: "More lenders are offering programs for properties with DSCR below 1.0, recognizing that appreciation markets like Austin, Phoenix, and Miami attract investors willing to accept negative cash flow for long-term gains. Expect 25–35% down and 700+ credit requirements.",
              },
              {
                title: "STR Income Acceptance Growing",
                body: "Short-term rental DSCR loans have matured significantly. Most lenders now accept AirDNA projections, actual booking history, or a hybrid approach. Some even allow projected STR income for properties not yet listed, making it easier to finance new Airbnb acquisitions.",
              },
              {
                title: "Prepayment Penalty Flexibility",
                body: "The standard 5-year prepay penalty is giving way to more flexible options. 3-year and even 1-year prepay structures are widely available, usually at a 0.25–0.50% rate premium. No-prepay options exist but add 0.75–1.0% to the rate.",
              },
              {
                title: "Portfolio Lending Boom",
                body: "Blanket DSCR loans covering 2–20+ properties under one mortgage are increasingly popular. These portfolio products aggregate DSCR across all properties, so a strong-performing rental can offset a break-even one. Ideal for scaling quickly.",
              },
              {
                title: "Foreign National Programs Stable",
                body: "International investors continue to have access to US DSCR financing. Programs for foreign nationals typically require 30% down, a US bank account, and passport documentation. No SSN required with select lenders. ITIN programs offer additional flexibility.",
              },
            ].map((trend) => (
              <div key={trend.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{trend.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{trend.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How DSCR Calculation Works - Deep Dive */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            How the DSCR Calculation Works — In Detail
          </h2>

          <div className="mt-8 space-y-6 text-base leading-relaxed text-slate-600">
            <p>
              The debt service coverage ratio is the single most important number in a DSCR loan application. It tells the lender whether the property generates enough income to cover its own mortgage payment — and by how much.
            </p>

            <h3 className="text-xl font-bold text-slate-900 font-heading pt-4">The Formula</h3>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
              <p className="text-2xl font-bold text-slate-900 font-mono">
                DSCR = Monthly Gross Rental Income &divide; Monthly PITIA
              </p>
            </div>

            <h3 className="text-xl font-bold text-slate-900 font-heading pt-4">What&apos;s Included in PITIA</h3>
            <p>
              PITIA stands for Principal, Interest, Taxes, Insurance, and Association dues. This is the total monthly cost of carrying the mortgage:
            </p>
            <ul className="ml-6 space-y-2 list-disc">
              <li><strong>Principal & Interest (P&I):</strong> The core mortgage payment. On a $320,000 loan at 7.5% for 30 years, this is approximately $2,237/month.</li>
              <li><strong>Property Taxes:</strong> Annual property taxes divided by 12. Varies dramatically by location — Texas and New Jersey are high (2–3% of value), while Hawaii and Alabama are low (0.3–0.5%).</li>
              <li><strong>Homeowner&apos;s Insurance:</strong> Monthly hazard insurance premium. Typically $100–$300/month depending on property value, location, and coverage level.</li>
              <li><strong>HOA Dues:</strong> Condo or planned community association fees, if applicable. Can range from $50 to $500+/month and directly reduce DSCR.</li>
              <li><strong>Flood Insurance:</strong> Required in FEMA-designated flood zones. Can add $100–$400/month and significantly impact DSCR in coastal markets.</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 font-heading pt-4">How Rental Income Is Determined</h3>
            <p>
              For <strong>long-term rentals</strong>, lenders use the lower of: (a) the market rent from the appraiser&apos;s 1007 Rent Schedule, or (b) the actual lease amount. If the property is vacant, only market rent from the appraisal is used.
            </p>
            <p>
              For <strong>short-term rentals</strong> (Airbnb, VRBO), lenders may use: (a) AirDNA market projections, (b) actual trailing 12-month booking revenue, (c) a 1007 rent schedule as a floor with STR income as a ceiling, or (d) the lesser of projected and actual. Each lender&apos;s approach varies — ask upfront.
            </p>

            <h3 className="text-xl font-bold text-slate-900 font-heading pt-4">Worked Example</h3>
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-6 space-y-3">
              <p className="font-semibold text-teal-900">Single-Family Rental in Atlanta, GA</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-teal-700">Purchase Price:</span><span className="font-semibold text-teal-900">$350,000</span>
                <span className="text-teal-700">Loan Amount (75% LTV):</span><span className="font-semibold text-teal-900">$262,500</span>
                <span className="text-teal-700">Rate:</span><span className="font-semibold text-teal-900">7.25% (30yr fixed)</span>
                <span className="text-teal-700">Monthly P&I:</span><span className="font-semibold text-teal-900">$1,790</span>
                <span className="text-teal-700">Property Taxes:</span><span className="font-semibold text-teal-900">$292/mo</span>
                <span className="text-teal-700">Insurance:</span><span className="font-semibold text-teal-900">$150/mo</span>
                <span className="text-teal-700">HOA:</span><span className="font-semibold text-teal-900">$0</span>
                <span className="text-teal-700">Total PITIA:</span><span className="font-bold text-teal-900">$2,232/mo</span>
                <span className="text-teal-700">Market Rent:</span><span className="font-bold text-teal-900">$2,800/mo</span>
              </div>
              <div className="pt-2 border-t border-teal-200">
                <p className="text-base font-bold text-teal-900 font-mono">DSCR = $2,800 &divide; $2,232 = 1.25</p>
                <p className="text-sm text-teal-700 mt-1">Result: Strong qualification at the 1.25 threshold — eligible for competitive rates.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            DSCR Calculator FAQ
          </h2>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-teal-200/60 bg-white transition-colors hover:border-teal-300">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="pr-4 text-base font-semibold text-slate-800 font-heading">{faq.question}</span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-teal-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-links */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            Continue Your Research
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "All DSCR Services", desc: "18 specialized loan programs", href: "/services" },
              { title: "Browse 650+ Cities", desc: "Local rates and lender connections", href: "/locations" },
              { title: "DSCR Loan Guide", desc: "The complete investor's guide", href: "/services/dscr-loans" },
              { title: "Short-Term Rentals", desc: "Airbnb & VRBO DSCR financing", href: "/services/dscr-loans-short-term-rentals" },
              { title: "Cash-Out Refinance", desc: "Pull equity without income docs", href: "/services/dscr-cash-out-refinance" },
              { title: "BRRRR Strategy", desc: "Fix, rent, refinance, repeat", href: "/services/dscr-loans-fix-and-rent-brrrr" },
              { title: "Multi-Family", desc: "2-4 unit and 5+ unit programs", href: "/services/dscr-loans-multi-family" },
              { title: "Foreign Nationals", desc: "US property loans for non-citizens", href: "/services/dscr-loans-foreign-nationals" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="group h-full rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Get Pre-Qualified?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Call us to discuss your DSCR loan options with an experienced advisor.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="sms:+18553003727">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta"
              >
                (855) 300-DSCR (3727) | Text
              </motion.span>
            </a>
            <Link href="/contact">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
              >
                Contact Us
              </motion.span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
