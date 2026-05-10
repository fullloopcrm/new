// @ts-nocheck
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Props {
  faqs: { question: string; answer: string }[];
}

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

function ChapterNav() {
  const chapters = [
    { id: "what-is-dscr", label: "1. What Is a DSCR Loan?" },
    { id: "the-formula", label: "2. The Formula" },
    { id: "who-is-it-for", label: "3. Who It's For" },
    { id: "who-is-it-not-for", label: "4. Who It's NOT For" },
    { id: "requirements", label: "5. Requirements" },
    { id: "step-by-step", label: "6. Step-by-Step Process" },
    { id: "property-types", label: "7. Property Types" },
    { id: "real-examples", label: "8. Real Examples" },
    { id: "common-mistakes", label: "9. Common Mistakes" },
    { id: "pros-and-cons", label: "10. Pros & Cons" },
    { id: "faq", label: "11. FAQ" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-bold text-slate-900 font-heading">What You&apos;ll Learn</h2>
      <nav className="mt-4 space-y-1">
        {chapters.map((ch) => (
          <a key={ch.id} href={`#${ch.id}`} className="block rounded-lg px-3 py-2 text-sm text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-900 font-cta">
            {ch.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

export default function DSCR101Client({ faqs }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-blob" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            The Complete Beginner&apos;s Guide
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            DSCR <span className="text-teal-200">101</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Everything you need to know about DSCR loans — in plain English. No jargon, no fluff, no sales pitch. Just the facts so you can decide if this is the right tool for you.
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
            {/* Main Content */}
            <div className="space-y-16">

              {/* Chapter 1 */}
              <div id="what-is-dscr">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">1. What Is a DSCR Loan?</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    A DSCR loan is a mortgage for investment properties that qualifies you based on one thing: <strong>does the property&apos;s rental income cover the mortgage payment?</strong>
                  </p>
                  <p>
                    That&apos;s it. No W-2s. No tax returns. No pay stubs. No employment verification. No debt-to-income ratio. The property qualifies itself.
                  </p>
                  <p>
                    DSCR stands for <strong>Debt Service Coverage Ratio</strong>. It&apos;s a number that tells the lender how much income the property produces relative to its mortgage cost. A DSCR of 1.0 means the rent exactly covers the mortgage. A 1.25 means the property earns 25% more than the mortgage costs.
                  </p>
                  <p>
                    DSCR loans are part of the &quot;non-QM&quot; (non-qualified mortgage) market, which simply means they don&apos;t follow the standard Fannie Mae/Freddie Mac guidelines. They&apos;re not hard money loans, not bridge loans, and not temporary financing. They&apos;re real 30-year fixed-rate mortgages — just with different qualification rules.
                  </p>
                  <Tip>Think of it this way: a conventional loan asks &quot;Can YOU afford this payment?&quot; A DSCR loan asks &quot;Can THE PROPERTY afford this payment?&quot; Totally different question, totally different qualification.</Tip>
                </div>
              </div>

              {/* Chapter 2 */}
              <div id="the-formula">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">2. The Formula</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
                    <p className="text-xl font-bold text-slate-900 font-mono">DSCR = Monthly Rent &divide; Monthly PITIA</p>
                  </div>
                  <p><strong>PITIA</strong> stands for:</p>
                  <ul className="ml-6 space-y-1 list-disc">
                    <li><strong>P</strong>rincipal — the portion of your payment that reduces the loan balance</li>
                    <li><strong>I</strong>nterest — the cost of borrowing the money</li>
                    <li><strong>T</strong>axes — monthly property taxes (annual amount &divide; 12)</li>
                    <li><strong>I</strong>nsurance — homeowner&apos;s/hazard insurance premium</li>
                    <li><strong>A</strong>ssociation — HOA or condo dues, if applicable</li>
                  </ul>
                  <p>
                    <strong>Example:</strong> A property rents for $2,500/month. The total PITIA is $2,000/month. DSCR = $2,500 &divide; $2,000 = <strong>1.25</strong>. That means the property generates 25% more income than the mortgage requires.
                  </p>
                  <Tip>The two biggest levers on your DSCR: (1) the rent amount and (2) the down payment size. Higher rent = higher DSCR. Bigger down payment = smaller mortgage = higher DSCR. If you&apos;re at a 1.05, going from 20% to 25% down might push you to 1.20+.</Tip>
                  <p>
                    Use our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">free DSCR calculator</Link> to run the numbers on any property instantly.
                  </p>
                </div>
              </div>

              {/* Chapter 3 */}
              <div id="who-is-it-for">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">3. Who DSCR Loans Are For</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>DSCR loans are ideal for:</p>
                  <div className="space-y-4">
                    {[
                      { who: "Self-employed investors", why: "Your tax returns show low income because of business write-offs, depreciation, and deductions. Conventional lenders see a $60K AGI and say no. DSCR lenders never look at your tax returns." },
                      { who: "Portfolio builders (10+ properties)", why: "Conventional mortgages cap you at 10 financed properties. After that, DSCR is the only 30-year fixed option. There's no property count limit." },
                      { who: "Airbnb / VRBO operators", why: "Short-term rental income is hard to document for conventional lenders. DSCR lenders accept AirDNA projections and actual booking history to qualify." },
                      { who: "BRRRR strategy investors", why: "Buy distressed, rehab, rent, then refinance with a DSCR cash-out loan. Pull your capital back out and repeat. DSCR is the refinance vehicle for the BRRRR model." },
                      { who: "Foreign nationals", why: "Non-US citizens can buy US investment property with DSCR loans. No SSN required with select lenders. Passport, US bank account, and 25-30% down is typically all you need." },
                      { who: "LLC investors", why: "DSCR loans let you close in an LLC or corporate entity — providing liability protection that conventional loans simply don't allow." },
                      { who: "Retirees with rental income", why: "You may not have traditional employment income, but your properties cash flow. DSCR doesn't care about employment — just the property." },
                      { who: "Investors in a hurry", why: "DSCR loans close in 14-21 days vs. 30-45 for conventional. Less paperwork = faster underwriting = faster closing." },
                    ].map((item) => (
                      <div key={item.who} className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-bold text-slate-900 font-heading">{item.who}</h4>
                        <p className="mt-1 text-sm text-slate-500">{item.why}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>If you fall into ANY of these categories, DSCR is probably your best option. The only real tradeoff is a slightly higher interest rate vs. conventional — and for most investors, the flexibility and speed more than make up for it.</Tip>
                </div>
              </div>

              {/* Chapter 4 */}
              <div id="who-is-it-not-for">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">4. Who DSCR Loans Are NOT For</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>Let&apos;s be honest — DSCR loans aren&apos;t for everyone. Here&apos;s when they don&apos;t make sense:</p>
                  <div className="space-y-4">
                    {[
                      { who: "Primary residence buyers", why: "DSCR loans are investment-only. If you're buying a home to live in, you need a conventional, FHA, or VA loan. No exceptions." },
                      { who: "Second home / vacation home for personal use", why: "If the property won't generate rental income, there's no DSCR to calculate. The property must be an income-producing investment." },
                      { who: "W-2 employees with <10 properties who want the lowest rate", why: "If you have strong W-2 income, good DTI, and fewer than 10 properties, a conventional investment loan will give you a lower rate (typically 1-2% less). DSCR is the premium you pay for flexibility." },
                      { who: "Properties with terrible DSCR ratios", why: "If the rent doesn't come close to covering the mortgage (DSCR below 0.75), even sub-1.0 DSCR programs won't help. The property simply doesn't cash flow enough. Either renegotiate the price, increase the down payment, or find a better deal." },
                      { who: "Investors with credit scores below 620", why: "Most DSCR lenders have a 620 minimum. Below that, you may need to explore hard money, private lending, or credit repair before applying." },
                      { who: "Fix-and-flip only (no rental)", why: "If you're buying to renovate and sell (not rent), you need a fix-and-flip bridge loan, not a DSCR loan. DSCR requires rental income. However, if you're doing BRRRR (rehab then RENT), the DSCR loan is for the refinance stage." },
                    ].map((item) => (
                      <div key={item.who} className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                        <h4 className="text-sm font-bold text-slate-900 font-heading">{item.who}</h4>
                        <p className="mt-1 text-sm text-slate-500">{item.why}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>Here&apos;s the honest truth: if you have a W-2 job, 750 credit, and own less than 10 properties, use conventional for the lower rate. Save DSCR for when you hit property #11 or when your tax situation makes conventional qualification difficult.</Tip>
                </div>
              </div>

              {/* Chapter 5 */}
              <div id="requirements">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">5. DSCR Loan Requirements</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>Here&apos;s exactly what you need to qualify:</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="bg-slate-50">
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Requirement</th>
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Standard</th>
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Best Pricing</th>
                      </tr></thead>
                      <tbody>
                        {[
                          { req: "DSCR Ratio", std: "1.0 minimum", best: "1.25+" },
                          { req: "Credit Score", std: "620–680", best: "740+" },
                          { req: "Down Payment", std: "20–25%", best: "25%+" },
                          { req: "Cash Reserves", std: "6 months PITIA", best: "12 months" },
                          { req: "Property Type", std: "Investment only", best: "SFR or 2-4 unit" },
                          { req: "Loan Amount", std: "$100K–$2M", best: "$150K–$1M" },
                          { req: "Prepay Penalty", std: "3-year", best: "5-year (lower rate)" },
                        ].map((row, i) => (
                          <tr key={row.req} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-5 py-3 font-medium text-slate-900">{row.req}</td>
                            <td className="px-5 py-3 text-slate-600">{row.std}</td>
                            <td className="px-5 py-3 text-teal-700 font-semibold">{row.best}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>For the full breakdown, read our <Link href="/services/dscr-loan-requirements" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">complete requirements guide</Link>.</p>
                  <Tip>The biggest surprise for new investors: you do NOT need rental history or landlord experience. First-time investors qualify the same as someone with 50 doors. The property qualifies, not your resume.</Tip>
                </div>
              </div>

              {/* Chapter 6 */}
              <div id="step-by-step">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">6. The Step-by-Step Process</h2>
                <div className="mt-8 space-y-6">
                  {[
                    { n: "1", title: "Find your property", detail: "Search for investment properties where the expected rent covers the mortgage. Use our DSCR calculator before making any offer." },
                    { n: "2", title: "Run the DSCR calculation", detail: "Monthly rent ÷ monthly PITIA = your DSCR. You want 1.0+ to qualify and 1.25+ for the best rates." },
                    { n: "3", title: "Get pre-qualified", detail: "Contact a DSCR lender for a pre-qualification. This is a soft credit pull — no commitment. You'll get a rate estimate and loan amount." },
                    { n: "4", title: "Make your offer & go under contract", detail: "Submit your offer with a pre-qualification letter. DSCR pre-quals carry weight — sellers know you can close fast." },
                    { n: "5", title: "Submit your application", detail: "You'll provide: credit authorization, 2-3 months bank statements, purchase contract, entity docs (if LLC). That's the entire paperwork list." },
                    { n: "6", title: "Appraisal & rent verification", detail: "The lender orders an appraisal with a 1007 rent schedule. This verifies property value AND market rent. The appraised rent determines your official DSCR." },
                    { n: "7", title: "Underwriting review", detail: "Underwriting reviews the file — typically 5-7 business days. No income verification, so this is faster than conventional." },
                    { n: "8", title: "Clear to close", detail: "Once approved, you'll sign closing docs. Most DSCR loans close in 14-21 days from application." },
                    { n: "9", title: "Fund & start cash flowing", detail: "The loan funds, the property is yours (or your LLC's), and rental income starts flowing. Welcome to DSCR lending." },
                  ].map((step) => (
                    <div key={step.n} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white font-mono">{step.n}</div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 font-heading">{step.title}</h4>
                        <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Tip>The #1 thing that delays DSCR closings? The appraisal. Schedule it ASAP after going under contract. If the appraised rent comes in low, you may need to renegotiate the price or increase your down payment.</Tip>
              </div>

              {/* Chapter 7 */}
              <div id="property-types">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">7. What Property Types Qualify?</h2>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { type: "Single-Family Homes", status: "yes", note: "The most common DSCR property. Houses, townhomes, PUDs.", href: "/services/dscr-loans-single-family" },
                    { type: "Duplexes / Triplexes / Quads", status: "yes", note: "2-4 units with combined rent for DSCR calculation.", href: "/services/dscr-loans-multi-family" },
                    { type: "Condos (Warrantable)", status: "yes", note: "Standard condos with healthy HOA financials.", href: "/services/dscr-loans-condos-condotels" },
                    { type: "Condos (Non-Warrantable)", status: "yes", note: "Available but at higher rates. HOA review required.", href: "/services/dscr-loans-condos-condotels" },
                    { type: "Condotels", status: "yes", note: "Condo-hotel hybrids. Select lenders only.", href: "/services/dscr-loans-condos-condotels" },
                    { type: "Short-Term Rentals", status: "yes", note: "Airbnb/VRBO. Uses AirDNA or booking history.", href: "/services/dscr-loans-short-term-rentals" },
                    { type: "5+ Unit Apartments", status: "yes", note: "Commercial DSCR programs. Uses NOI calculation.", href: "/services/dscr-loans-commercial" },
                    { type: "Mixed-Use", status: "yes", note: "Must be 51%+ residential. Select lenders.", href: "/services/dscr-loans-mixed-use" },
                    { type: "New Construction", status: "yes", note: "Projected rents from appraisal used.", href: "/services/dscr-loans-new-construction" },
                    { type: "Primary Residence", status: "no", note: "Never. DSCR is investment-only.", href: "" },
                    { type: "Vacant Land", status: "no", note: "No structure = no rental income = no DSCR.", href: "" },
                    { type: "Fix-and-Flip (no rental)", status: "no", note: "Use a bridge loan instead. DSCR requires rent.", href: "" },
                  ].map((item) => (
                    <div key={item.type} className={`rounded-lg border p-4 ${item.status === "yes" ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                      <div className="flex items-center gap-2">
                        <span className={item.status === "yes" ? "text-green-600" : "text-red-500"}>{item.status === "yes" ? "&#10003;" : "&#10007;"}</span>
                        {item.href ? (
                          <Link href={item.href} className="text-sm font-bold text-slate-900 hover:text-teal-600">{item.type}</Link>
                        ) : (
                          <span className="text-sm font-bold text-slate-900">{item.type}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chapter 8 */}
              <div id="real-examples">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">8. Real-World Examples</h2>
                <div className="mt-6 space-y-6">
                  {[
                    { title: "Single-Family Rental in Indianapolis", price: "$220,000", down: "25% ($55,000)", loan: "$165,000", rate: "7.25%", pi: "$1,126", taxes: "$183", ins: "$95", hoa: "$0", pitia: "$1,404", rent: "$1,800", dscr: "1.28", verdict: "Strong — best rate tier", color: "border-green-200 bg-green-50/30" },
                    { title: "Airbnb in Gatlinburg, TN", price: "$425,000", down: "25% ($106,250)", loan: "$318,750", rate: "7.50%", pi: "$2,230", taxes: "$208", ins: "$175", hoa: "$0", pitia: "$2,613", rent: "$3,800 (AirDNA projected)", dscr: "1.45", verdict: "Excellent — premium cash flow", color: "border-green-200 bg-green-50/30" },
                    { title: "Duplex in Cleveland, OH", price: "$180,000", down: "20% ($36,000)", loan: "$144,000", rate: "7.50%", pi: "$1,007", taxes: "$225", ins: "$110", hoa: "$0", pitia: "$1,342", rent: "$1,350 (both units)", dscr: "1.01", verdict: "Break-even — qualifies, higher rate", color: "border-yellow-200 bg-yellow-50/30" },
                  ].map((ex) => (
                    <div key={ex.title} className={`rounded-xl border p-6 ${ex.color}`}>
                      <h4 className="text-base font-bold text-slate-900 font-heading">{ex.title}</h4>
                      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <span className="text-slate-500">Purchase Price:</span><span className="font-semibold text-slate-900">{ex.price}</span>
                        <span className="text-slate-500">Down Payment:</span><span className="font-semibold text-slate-900">{ex.down}</span>
                        <span className="text-slate-500">Loan Amount:</span><span className="font-semibold text-slate-900">{ex.loan}</span>
                        <span className="text-slate-500">Rate:</span><span className="font-semibold text-slate-900">{ex.rate}</span>
                        <span className="text-slate-500">Monthly P&I:</span><span className="font-semibold text-slate-900">{ex.pi}</span>
                        <span className="text-slate-500">Taxes + Ins + HOA:</span><span className="font-semibold text-slate-900">${(parseInt(ex.taxes.replace("$", "")) + parseInt(ex.ins.replace("$", "")) + parseInt(ex.hoa.replace("$", ""))).toLocaleString()}/mo</span>
                        <span className="text-slate-500">Total PITIA:</span><span className="font-bold text-slate-900">{ex.pitia}</span>
                        <span className="text-slate-500">Monthly Rent:</span><span className="font-bold text-slate-900">{ex.rent}</span>
                      </div>
                      <div className="mt-4 rounded-lg bg-white/80 p-3 text-center">
                        <span className="text-lg font-bold text-teal-700 font-mono">DSCR = {ex.dscr}</span>
                        <span className="ml-3 text-sm text-slate-600">— {ex.verdict}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Tip>Notice how the Indianapolis SFR and the Gatlinburg Airbnb both have great DSCRs but for different reasons? The SFR wins on low price-to-rent ratio. The Airbnb wins on high STR income. Both strategies work — pick the one that fits your market and management style.</Tip>
              </div>

              {/* Chapter 9 */}
              <div id="common-mistakes">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">9. Common Mistakes to Avoid</h2>
                <div className="mt-6 space-y-4">
                  {[
                    { mistake: "Not running the DSCR before making an offer", fix: "Always calculate DSCR first. A property that looks great on Zillow might have a 0.85 DSCR once you factor in taxes, insurance, and HOA." },
                    { mistake: "Forgetting HOA and flood insurance in the calculation", fix: "PITIA includes ALL housing costs — not just P&I. A $300/month HOA can tank your DSCR." },
                    { mistake: "Assuming the appraised rent will match the listing rent", fix: "Appraisers do their own rent comps. The appraised rent could be higher or lower. Prepare comp data in advance." },
                    { mistake: "Choosing no-prepay to save money upfront", fix: "A no-prepay option costs 0.75-1.0% in rate. On a $250K loan, that's $150-200/month FOREVER. If you're holding 3+ years, a prepay penalty pays for itself." },
                    { mistake: "Not shopping multiple DSCR lenders", fix: "We've seen 0.75% rate spread on the same deal between lenders. Always get 3+ quotes." },
                    { mistake: "Closing in personal name then transferring to LLC", fix: "Close in the LLC from day one. Post-closing transfers can trigger due-on-sale clauses and create title issues." },
                    { mistake: "Insufficient reserves at closing", fix: "Move funds 60+ days before applying so they're seasoned. Reserves that appear suddenly raise red flags." },
                  ].map((item, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
                      <h4 className="text-sm font-bold text-red-700">&#10007; {item.mistake}</h4>
                      <p className="mt-2 text-sm text-slate-500"><span className="font-semibold text-green-700">&#10003; Fix:</span> {item.fix}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chapter 10 */}
              <div id="pros-and-cons">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">10. Pros & Cons — The Honest Summary</h2>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border border-green-200 bg-green-50/50 p-6">
                    <h3 className="text-base font-bold text-green-800 font-heading">Pros</h3>
                    <ul className="mt-4 space-y-2">
                      {[
                        "No income verification — ever",
                        "No DTI calculation",
                        "No property count limit",
                        "Close in LLC for liability protection",
                        "Fast closing (14-21 days)",
                        "Self-employed investor friendly",
                        "Foreign nationals eligible",
                        "30-year fixed rate available",
                        "Interest-only options",
                        "Cash-out refinance available",
                      ].map((pro) => (
                        <li key={pro} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-green-600 shrink-0">&#10003;</span> {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
                    <h3 className="text-base font-bold text-red-800 font-heading">Cons</h3>
                    <ul className="mt-4 space-y-2">
                      {[
                        "Higher interest rates (1-2% above conventional)",
                        "Larger down payment (20-25% vs. 15%)",
                        "Prepayment penalties are common",
                        "Investment property only (no primary residence)",
                        "Property must generate rental income",
                        "6-12 month reserve requirement",
                        "Not available in all states for all property types",
                        "Fewer lenders = less competition = higher costs",
                      ].map((con) => (
                        <li key={con} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-red-500 shrink-0">&#10007;</span> {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Tip>The rate premium is the cost of flexibility. For most serious investors, the ability to scale without income docs, close in an LLC, and avoid property count limits is worth every basis point.</Tip>
              </div>

              {/* Chapter 11 — FAQ */}
              <div id="faq">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">11. Frequently Asked Questions</h2>
                <div className="mt-8 space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-teal-300">
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                        <span className="pr-4 text-sm font-semibold text-slate-800 font-heading">{faq.question}</span>
                        <svg className={`h-4 w-4 shrink-0 text-teal-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {openFaq === i && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar — sticky chapter nav */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <ChapterNav />
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 text-center">
                  <p className="text-sm font-bold text-teal-800">Ready to talk?</p>
                  <Link href="/speak-to-a-loan-officer" className="mt-3 block rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 font-cta">
                    Speak to a Loan Officer
                  </Link>
                  <a href="sms:+18553003727" className="mt-2 block text-sm font-semibold text-teal-700 hover:text-teal-900">(855) 300-DSCR | Text</a>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                  <Link href="/calculator" className="block rounded-lg bg-white border border-teal-300 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 font-cta">
                    DSCR Calculator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">Now You Know DSCR</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            You&apos;ve got the knowledge. Now run the numbers, find your city, and talk to someone who can make it happen.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/calculator">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 font-cta">
                DSCR Calculator
              </motion.span>
            </Link>
            <Link href="/speak-to-a-loan-officer">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
                Speak to a Loan Officer
              </motion.span>
            </Link>
            <Link href="/locations">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
                Find Your City
              </motion.span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
