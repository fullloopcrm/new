"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { services, cities, getCityUrl, homeFAQs } from "@/app/site/debt-service-ratio-loan/_lib/siteData";

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

const featuredCities = [
  "houston", "miami", "atlanta", "dallas", "phoenix", "orlando",
  "nashville", "charlotte", "tampa", "las-vegas", "austin", "denver",
  "san-antonio", "jacksonville", "indianapolis", "columbus-oh",
  "raleigh", "san-diego", "chicago", "seattle",
];

const reviews = [
  { name: "Marcus T.", location: "Houston, TX", rating: 5, text: "Closed on my 7th rental property using a DSCR loan through a lender I found here. The calculator helped me see exactly where I stood before I even applied. Closed in 18 days.", property: "Single-Family Rental" },
  { name: "Jennifer K.", location: "Miami, FL", rating: 5, text: "As a self-employed investor, conventional loans were a nightmare with my write-offs. DSCR lending changed everything — they only cared about the rent covering the mortgage. This site explained the process better than any loan officer I spoke with.", property: "Duplex" },
  { name: "David R.", location: "Atlanta, GA", rating: 5, text: "Used the DSCR calculator to analyze 12 properties before pulling the trigger on a duplex in Atlanta. The city-specific guide had exactly the local market insight I needed. My DSCR came in at 1.31 and I got a 7.25% rate.", property: "Duplex" },
  { name: "Sarah M.", location: "Phoenix, AZ", rating: 5, text: "Foreign national from Canada. Was told by two banks I couldn't get a US mortgage. Found the foreign nationals DSCR page here, learned about the program, and closed on a vacation rental in Scottsdale within 30 days. 30% down, no SSN needed.", property: "Short-Term Rental" },
  { name: "Chris & Tanya P.", location: "Nashville, TN", rating: 5, text: "We own 14 rental properties now — all financed with DSCR loans. When we hit the conventional 10-property limit, DSCR was the only option. No property count cap, close in our LLC. The portfolio loan info on this site helped us consolidate 6 properties into one blanket loan.", property: "Portfolio (14 units)" },
  { name: "Robert L.", location: "Orlando, FL", rating: 5, text: "BRRRR investor here. Buy distressed, rehab, rent, then refinance with a DSCR loan to pull my cash back out. This site's guide on the fix-and-rent strategy is the best I've found online. Clear, practical, no fluff. My last refi appraised $80K above purchase+rehab cost.", property: "Fix & Rent (BRRRR)" },
  { name: "Angela W.", location: "Dallas, TX", rating: 5, text: "Bought a condo in a non-warrantable building that conventional lenders wouldn't touch. The condos & condotels page here explained exactly what to look for. Found a lender through the Dallas city page and closed with a 1.18 DSCR. Game changer.", property: "Non-Warrantable Condo" },
  { name: "James H.", location: "Denver, CO", rating: 5, text: "Interest-only DSCR loan on a new construction rental. My DSCR went from 1.05 to 1.42 just by choosing IO payments. That one tip from the calculator page saved me about $400/month and put me in a much better rate tier. Now cash flowing $600/month.", property: "New Construction" },
];

export default function HomeClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [visibleReviews, setVisibleReviews] = useState(4);

  const topCities = featuredCities
    .map((slug) => cities.find((c) => c.slug === slug))
    .filter(Boolean) as typeof cities;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-blob animation-delay-2000" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta"
          >
            The #1 Resource for DSCR Loans in the USA &bull; 650+ Cities &bull; 18 Loan Programs
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl font-heading"
          >
            Investment Property Loans Based on{" "}
            <span className="text-teal-200">Rental Income</span>, Not Your W-2
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80"
          >
            DSCR loans let real estate investors qualify without tax returns, pay stubs, or employment verification. If the property&apos;s rent covers the mortgage, you qualify. We cover every DSCR loan product across <Link href="/locations" className="text-teal-200 underline underline-offset-2 hover:text-white">650+ cities nationwide</Link> — from <Link href="/services/dscr-loans-short-term-rentals" className="text-teal-200 underline underline-offset-2 hover:text-white">Airbnb financing</Link> to <Link href="/services/dscr-portfolio-loans" className="text-teal-200 underline underline-offset-2 hover:text-white">portfolio blanket loans</Link>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/calculator">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                DSCR Calculator
              </motion.span>
            </Link>
            <Link href="/services">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Explore 18 Services
              </motion.span>
            </Link>
            <a href="sms:+18553003727">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                (855) 300-DSCR | Text
              </motion.span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50"
          >
            <span>&#9733;&#9733;&#9733;&#9733;&#9733; 4.9/5 from 312 investors</span>
            <span>&bull;</span>
            <span>6 offices nationwide</span>
            <span>&bull;</span>
            <span>Updated for 2026</span>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHO BUILT THIS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 border-b border-slate-200 py-14">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-600 font-cta">Who We Are</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
              Built by a Consortium of <span className="gradient-text">DSCR Loan Professionals</span>
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600">
              DebtServiceRatioLoan.com was created by a consortium of loan officers, mortgage brokers, real estate attorneys, and investment advisors who have collectively spent <strong>over 100 years</strong> originating, underwriting, and closing DSCR loans. We&apos;ve funded thousands of investment properties across all 50 states — from single-family rentals in the Midwest to Airbnb portfolios in Florida to 50-unit apartment buildings in Texas.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
              This isn&apos;t a blog written by freelancers who Googled &quot;DSCR loan.&quot; Every guide, every calculator formula, every tip on this site comes from professionals who have sat across the table from investors, structured deals, solved underwriting problems, and closed loans. We built this resource because we were tired of seeing outdated, inaccurate, and surface-level DSCR content online — and we knew investors deserved better.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "100+", label: "Combined Years of DSCR Experience" },
              { value: "5,000+", label: "DSCR Loans Closed" },
              { value: "$2B+", label: "Total Loan Volume Funded" },
              { value: "50", label: "States Covered" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-teal-600 font-heading">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/speak-to-a-loan-officer" className="text-sm font-semibold text-teal-600 hover:text-teal-800 font-cta">
              Talk to Our Team &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHAT IS A DSCR LOAN — DEEP EXPLAINER (~1,500 words)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              What Is a <span className="gradient-text">DSCR Loan</span>?
            </h2>
          </motion.div>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              A <strong>DSCR loan</strong> (Debt Service Coverage Ratio loan) is a type of mortgage designed specifically for real estate investors. Unlike conventional mortgages that qualify you based on personal income — your W-2s, tax returns, and debt-to-income ratio — a DSCR loan qualifies you based on one simple question: <em>does the property&apos;s rental income cover the mortgage payment?</em>
            </p>
            <p>
              The answer to that question is expressed as a ratio. If a rental property generates $2,500/month in rent and the total mortgage payment (principal, interest, taxes, insurance, and HOA) is $2,000/month, the DSCR is 1.25. That means the property earns 25% more than it costs to carry — and that&apos;s enough to qualify for a <Link href="/services/dscr-loans" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan</Link> with most lenders.
            </p>
            <p>
              This model is transformative for investors who are self-employed, have complex tax situations, write off significant expenses (reducing their taxable income), or simply own too many properties for conventional financing. A W-2 employee with a $100,000 salary and a self-employed investor who nets $500,000 but reports $60,000 after deductions can look very different on paper — but with DSCR lending, neither person&apos;s income matters. Only the property matters.
            </p>

            <Tip>Your DSCR ratio is calculated on the property, not on you. That means two investors buying the exact same property get the exact same DSCR — regardless of whether one makes $50K and the other makes $500K. The property is the borrower.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">How DSCR Differs from Conventional Investment Loans</h3>
            <p>
              With a <Link href="/services/dscr-vs-conventional-loans" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">conventional investment property mortgage</Link>, you submit 2 years of tax returns, recent pay stubs, a full accounting of every debt you carry, and your lender calculates a debt-to-income (DTI) ratio. If your DTI exceeds 45–50%, you&apos;re denied — even if the property itself is a cash-flow monster. Conventional loans also cap you at 10 financed properties and require personal-name vesting (no LLCs).
            </p>
            <p>
              DSCR loans flip the entire model. No income docs. No DTI calculation. No property count limit. Close in an LLC. The property is the borrower, not you. This is why DSCR lending has exploded in popularity — according to industry data, DSCR loans now represent over 30% of all non-QM (non-qualified mortgage) originations in the United States.
            </p>

            <Tip>Conventional lenders cap you at 10 financed properties. DSCR has no limit. We&apos;ve worked with investors holding 40+ doors — all DSCR financed. Once you hit property #11, DSCR is your only game in town.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">The DSCR Formula</h3>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
              <p className="text-2xl font-bold text-slate-900 font-mono">
                DSCR = Monthly Gross Rental Income &divide; Monthly PITIA
              </p>
              <p className="mt-3 text-sm text-slate-500">
                PITIA = Principal + Interest + Taxes + Insurance + Association (HOA) dues
              </p>
            </div>
            <p>
              Use our free <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> to run the numbers on any property in seconds. It shows your ratio, estimated rate tier, and cash flow — plus actionable tips to improve your DSCR if you&apos;re close to a threshold.
            </p>

            <Tip>Run the numbers BEFORE you make an offer. A property that looks great on Zillow might have a 0.85 DSCR once you factor in taxes, insurance, and HOA. Our calculator takes 30 seconds and could save you months of headache.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">Who Uses DSCR Loans?</h3>
            <p>
              DSCR loans are used by a wide spectrum of real estate investors:
            </p>
            <ul className="ml-6 space-y-2 list-disc">
              <li><strong>Self-employed investors</strong> whose tax returns don&apos;t reflect their actual earning power due to write-offs and depreciation.</li>
              <li><strong>Portfolio investors</strong> who&apos;ve maxed out conventional financing at 10 properties and need a <Link href="/services/dscr-portfolio-loans" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">portfolio loan</Link> solution to keep scaling.</li>
              <li><strong>Airbnb and VRBO operators</strong> financing <Link href="/services/dscr-loans-short-term-rentals" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">short-term rental properties</Link> using projected or actual booking income.</li>
              <li><strong>BRRRR strategy investors</strong> who buy, rehab, rent, then <Link href="/services/dscr-loans-fix-and-rent-brrrr" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">refinance with a DSCR loan</Link> to pull cash out and repeat.</li>
              <li><strong>Foreign nationals</strong> investing in US real estate through <Link href="/services/dscr-loans-foreign-nationals" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">foreign national DSCR programs</Link> that don&apos;t require a Social Security number.</li>
              <li><strong>LLC investors</strong> who want liability protection by <Link href="/services/dscr-loans" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">vesting properties in a business entity</Link> rather than their personal name.</li>
              <li><strong>Retirees and passive investors</strong> who may not show traditional employment income but hold significant real estate portfolios.</li>
            </ul>

            <Tip>The #1 investor we see using DSCR? Self-employed business owners who write off everything. On paper they show $60K income. In reality they net $300K+. Conventional lenders see the tax return and say no. DSCR lenders never even ask.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">What Types of Properties Qualify?</h3>
            <p>
              DSCR loans are available for virtually every type of investment property:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-4">
              {[
                { label: "Single-Family Rentals", href: "/services/dscr-loans-single-family" },
                { label: "Multi-Family (2–4 units)", href: "/services/dscr-loans-multi-family" },
                { label: "Short-Term Rentals (Airbnb)", href: "/services/dscr-loans-short-term-rentals" },
                { label: "Condos & Condotels", href: "/services/dscr-loans-condos-condotels" },
                { label: "New Construction", href: "/services/dscr-loans-new-construction" },
                { label: "Mixed-Use Properties", href: "/services/dscr-loans-mixed-use" },
                { label: "Commercial (5+ units)", href: "/services/dscr-loans-commercial" },
                { label: "Fix & Rent (BRRRR)", href: "/services/dscr-loans-fix-and-rent-brrrr" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-teal-300 hover:text-teal-600">
                  <span className="text-teal-500">&rarr;</span> {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUICK STATS BAR
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-teal-600 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: "650+", label: "Cities Covered" },
              { value: "18", label: "Loan Programs" },
              { value: "4.9/5", label: "Investor Rating" },
              { value: "6", label: "US Offices" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-white font-heading">{stat.value}</p>
                <p className="mt-1 text-sm text-teal-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ALL 18 SERVICES
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              <span className="gradient-text">18 DSCR Loan Services</span> for Every Investment Strategy
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              From <Link href="/services/dscr-loans-single-family" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">single-family rentals</Link> to <Link href="/services/dscr-portfolio-loans" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">blanket portfolio loans</Link>, we cover every DSCR product available in 2026.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <motion.div key={service.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link href={`/services/${service.slug}`}>
                  <div className="group h-full rounded-xl border border-teal-200/60 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-lg">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{service.name}</h3>
                    <p className="mt-1 text-xs font-medium text-teal-600 font-cta">{service.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">{service.shortDesc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <Tip>Not sure which DSCR product fits? Start with the basics: buying a long-term rental? Single-family DSCR. Buying an Airbnb? Short-term rental DSCR. Already own and want cash out? Cash-out refi. Buying a fixer? Bridge-to-perm or BRRRR. It&apos;s that simple.</Tip>
          </div>

          <div className="mt-6 text-center">
            <Link href="/services" className="text-sm font-semibold text-teal-600 hover:text-teal-800 font-cta">View All Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          REQUIREMENTS SNAPSHOT (~800 words)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            DSCR Loan <span className="gradient-text">Requirements</span> at a Glance
          </h2>
          <p className="mt-4 text-base text-slate-600">
            DSCR loans have fewer requirements than conventional mortgages, but you still need to meet key thresholds. Here&apos;s what lenders look for in 2026. For the full breakdown, read our <Link href="/services/dscr-loan-requirements" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">complete DSCR requirements guide</Link>.
          </p>

          <Tip>Here&apos;s the cheat code: the difference between a 1.24 and a 1.25 DSCR can save you 0.25–0.50% on your rate. That&apos;s $50–$100/month on a typical loan. If you&apos;re close to a threshold, even a small rent increase or choosing interest-only can push you over.</Tip>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { title: "DSCR Ratio: 1.0+ (ideally 1.25+)", desc: "The property's rent must at least cover the mortgage (PITIA). A ratio of 1.25 or higher unlocks the best rates. Some lenders accept sub-1.0 DSCR with compensating factors — see our rate tiers on the calculator page." },
              { title: "Credit Score: 620–680 Minimum", desc: "Most DSCR lenders want a 680+ FICO for the best terms. Programs exist down to 620, but expect higher rates and larger down payment requirements. A 740+ score puts you in the best pricing tier regardless of DSCR ratio." },
              { title: "Down Payment: 20–25%", desc: "Standard DSCR loans require 20–25% down. Sub-1.0 DSCR programs may require 25–35%. A larger down payment directly improves your DSCR by reducing the mortgage, and also gets you a better interest rate." },
              { title: "Cash Reserves: 6–12 Months", desc: "Lenders want to see 6–12 months of mortgage payments in liquid reserves after closing. This protects against vacancy and ensures you can cover the payment even if the property is temporarily unrented." },
              { title: "Property: Investment Only", desc: "DSCR loans are only available for investment properties — no primary residences or second homes. The property must generate (or be expected to generate) rental income. Single-family, multi-family, condos, and short-term rentals all qualify." },
              { title: "Entity: Personal or LLC", desc: "One of the biggest advantages — DSCR loans allow vesting in an LLC, corporation, or trust. This provides liability protection that conventional mortgages don't offer, since conventional loans require personal-name vesting." },
            ].map((req) => (
              <div key={req.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{req.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{req.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW THE PROCESS WORKS (6 steps)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            How to Get a DSCR Loan — <span className="gradient-text">Step by Step</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            From finding a property to closing day, here&apos;s exactly how the DSCR loan process works. Most investors close in 14–21 days.
          </p>

          <div className="mt-12 space-y-8">
            {[
              { step: "01", title: "Find a Cash-Flowing Property", desc: "Identify an investment property where the expected rent exceeds the estimated mortgage payment. Use our DSCR calculator to model different scenarios — purchase price, down payment, interest rate — and target a DSCR of 1.25+ for the best terms. Browse city-specific guides in our locations section for local market insights.", links: [{ label: "DSCR Calculator", href: "/calculator" }, { label: "Browse Locations", href: "/locations" }] },
              { step: "02", title: "Calculate Your DSCR Ratio", desc: "Before you apply, know your numbers. The DSCR is simply the monthly rent divided by the total PITIA (principal, interest, taxes, insurance, HOA). A 1.25 DSCR is the sweet spot — it means the property generates 25% more income than the mortgage costs. Below 1.0 means negative cash flow, which limits your options.", links: [{ label: "Calculator", href: "/calculator" }, { label: "DSCR Requirements", href: "/services/dscr-loan-requirements" }] },
              { step: "03", title: "Prepare Your Documentation", desc: "DSCR loans require significantly less paperwork than conventional loans. You'll need: credit report authorization, 2–3 months of bank statements (to verify reserves), the property address and purchase contract, and entity documents if closing in an LLC. That's it — no tax returns, no W-2s, no pay stubs, no employer verification.", links: [] },
              { step: "04", title: "Apply with a DSCR Lender", desc: "Submit your application to a lender who specializes in DSCR loans. Not all lenders offer them — you need a non-QM lender experienced with investor loans. The application process is streamlined and can often be completed online in under 30 minutes.", links: [{ label: "Contact Us", href: "/contact" }] },
              { step: "05", title: "Appraisal & Rent Verification", desc: "The lender orders a property appraisal that includes a 1007 Rent Schedule — this verifies both the property value and the market rent. For short-term rentals, the lender may also pull AirDNA data or request your booking history. This is the most critical step because the appraised rent directly determines your DSCR.", links: [{ label: "STR Programs", href: "/services/dscr-loans-short-term-rentals" }] },
              { step: "06", title: "Close & Start Cash Flowing", desc: "Once underwriting approves the file, you close — typically in 14–21 days from application. You can close in your personal name or an LLC. There's no DTI calculation, no income verification, and no property count limit. Fund your investment and start building wealth through rental income.", links: [{ label: "All Services", href: "/services" }] },
            ].map((item) => (
              <motion.div key={item.step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white font-mono">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                  {item.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.links.map((link) => (
                        <Link key={link.href} href={link.href} className="text-xs font-semibold text-teal-600 hover:text-teal-800 font-cta">{link.label} &rarr;</Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>Most DSCR loans close in 14–21 days. Conventional investment loans take 30–45. If you&apos;re competing against other buyers, tell the seller you can close in 3 weeks with a non-QM lender — that&apos;s a real advantage in hot markets.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          RATES OVERVIEW (~600 words)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            DSCR Loan <span className="gradient-text">Rates</span> in 2026
          </h2>
          <p className="mt-4 text-base text-slate-600">
            DSCR loan rates in 2026 have stabilized after the volatility of 2023–2024. Here&apos;s what investors are seeing across different DSCR tiers and product types. For the full analysis, visit our <Link href="/services/dscr-loan-rates" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR loan rates guide</Link>.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">DSCR Tier</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">30yr Fixed</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">5/1 ARM</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Interest Only</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: "1.25+ DSCR", fixed: "7.0% – 7.5%", arm: "6.5% – 7.0%", io: "7.25% – 7.75%" },
                  { tier: "1.00 – 1.24", fixed: "7.5% – 8.0%", arm: "7.0% – 7.5%", io: "7.75% – 8.25%" },
                  { tier: "0.75 – 0.99", fixed: "8.0% – 9.0%", arm: "7.5% – 8.5%", io: "8.5% – 9.5%" },
                ].map((row, i) => (
                  <tr key={row.tier} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{row.tier}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.fixed}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.arm}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.io}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Tip>Rates not what you hoped? Here&apos;s the move: take the higher rate with a 3-year prepay penalty, then refinance when rates drop. You keep the property cash flowing now and capture better terms later. Don&apos;t wait for &quot;perfect&quot; rates — they don&apos;t exist.</Tip>

          <p className="mt-6 text-sm text-slate-500">
            <strong>What drives your rate:</strong> Your DSCR ratio is the biggest factor, followed by credit score, LTV (down payment size), property type, and prepayment penalty structure. A borrower with a 1.30 DSCR, 750 credit score, 25% down, and a 5-year prepay can expect rates at the low end of the ranges above. Use our <Link href="/calculator" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR calculator</Link> to see where you stand.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            <strong>Interest-only tip:</strong> Choosing <Link href="/services/dscr-loan-tips" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">interest-only payments</Link> can boost your DSCR by 0.15–0.25 by eliminating the principal portion. This is a common strategy for investors who prioritize cash flow over equity paydown. The rate is slightly higher, but the monthly payment is significantly lower.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          INVESTOR REVIEWS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            What Investors Are <span className="gradient-text">Saying</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-500">
            Real results from real estate investors who used DSCR loans to build their portfolios.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {reviews.slice(0, visibleReviews).map((review, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <div className="flex items-center gap-1 text-yellow-500">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <span key={j}>&#9733;</span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 italic">&ldquo;{review.text}&rdquo;</p>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{review.name}</p>
                    <p className="text-xs text-slate-500">{review.location}</p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">{review.property}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {visibleReviews < reviews.length && (
            <div className="mt-8 text-center">
              <button onClick={() => setVisibleReviews(reviews.length)} className="text-sm font-semibold text-teal-600 hover:text-teal-800 font-cta">
                Show All Reviews &darr;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Review tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>The investors who close fastest are the ones who know their DSCR before they make an offer. Run the calculator on every property you analyze. It takes 30 seconds and eliminates 80% of the guesswork.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUICK TIPS (~800 words)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            10 Expert <span className="gradient-text">DSCR Loan Tips</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Insider strategies from investors and loan officers. For the complete playbook, visit our <Link href="/services/dscr-loan-tips" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">full DSCR tips guide</Link>.
          </p>

          <div className="mt-10 space-y-6">
            {[
              { num: "1", title: "Get the appraisal rent schedule right", tip: "The 1007 rent schedule from the appraisal determines your DSCR. Before ordering the appraisal, prepare a list of 3–5 comparable rentals in the area showing rents at or above your target. Share this with your lender — appraisers often welcome comparable data." },
              { num: "2", title: "Use interest-only to boost your DSCR by 0.15–0.25", tip: "Eliminating the principal portion of your payment can push you from a 1.05 to a 1.25 DSCR — that's a full rate tier improvement. The monthly savings can be $300–$500 on a typical investment property." },
              { num: "3", title: "Shop at least 3 DSCR lenders", tip: "DSCR rates vary significantly between lenders — we've seen 0.5–1.0% spread on the same deal. Unlike conventional mortgages with standardized pricing, DSCR lenders price their own risk. Three quotes minimum." },
              { num: "4", title: "Choose your prepayment penalty wisely", tip: "A 5-year prepay saves you 0.25–0.50% on rate vs. a 3-year, and 0.75–1.0% vs. no prepay. If you plan to hold 5+ years, the 5-year prepay is free money. If you might refi or sell within 3 years, pay the premium for flexibility." },
              { num: "5", title: "Close in an LLC from day one", tip: "Unlike conventional loans, DSCR loans let you vest in an LLC at closing. Don't close in your personal name and transfer later — that can trigger the due-on-sale clause and create unnecessary title complications." },
              { num: "6", title: "Build reserves before applying", tip: "Most DSCR lenders require 6 months of PITIA in liquid reserves. If you're short, move funds 60+ days before applying so they're \"seasoned\" in your bank account. Gift funds from family members are typically not accepted for reserves." },
              { num: "7", title: "Consider a larger down payment for marginal deals", tip: "Going from 20% to 25% down on a $400K property saves roughly $150–$200/month on PITIA and can boost DSCR by 0.10–0.15. It also drops your LTV from 80% to 75%, which alone can improve your rate by 0.25%." },
              { num: "8", title: "For STRs, get your AirDNA report first", tip: "If you're buying a short-term rental, pull the AirDNA revenue estimate before making an offer. This is exactly what the lender will use. If the projected income doesn't support a 1.0+ DSCR at your purchase price, renegotiate or walk away." },
              { num: "9", title: "Use a bridge-to-perm for value-add deals", tip: "If you're buying a property that needs rehab before it can be rented, a bridge-to-perm DSCR loan covers the acquisition and renovation, then automatically converts to a permanent 30-year DSCR loan once stabilized. One closing, two phases." },
              { num: "10", title: "Stack the BRRRR with DSCR refinancing", tip: "Buy distressed with cash or hard money, rehab, rent, then refinance with a DSCR cash-out refi. The new appraised value (post-rehab) is what matters — your DSCR is calculated on the new rent vs. the new mortgage. Pull your capital out and repeat." },
            ].map((tip) => (
              <div key={tip.num} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-700 font-mono">
                  {tip.num}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{tip.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{tip.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CITIES PREVIEW
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              DSCR Loans in <span className="gradient-text">650+ Cities</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              City-specific guides with local market insights, rental data, and all 18 DSCR services available in each market.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {topCities.map((city, i) => (
              <motion.div key={city.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link href={getCityUrl(city)}>
                  <div className="group rounded-lg border border-teal-200/60 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-600 font-cta">{city.name}</p>
                    <p className="text-xs text-slate-400">{city.stateAbbr}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/locations">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-teal-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                View All 650+ Cities
              </motion.span>
            </Link>
          </div>
        </div>
      </section>

      {/* Cities tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>Markets with high rents relative to property prices = higher DSCR ratios. Think Midwest cities like Indianapolis, Memphis, and Cleveland. Coastal cities like San Francisco and NYC have great appreciation but terrible DSCRs because prices are sky-high vs. rents. Know your market.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          DSCR vs CONVENTIONAL COMPARISON (~600 words)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            DSCR Loans vs. <span className="gradient-text">Conventional Mortgages</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Both finance investment properties, but they work fundamentally differently. Here&apos;s the side-by-side. For the full analysis, read our <Link href="/services/dscr-vs-conventional-loans" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">DSCR vs. conventional comparison</Link>.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Feature</th>
                  <th className="px-5 py-3.5 font-semibold text-teal-700 font-heading">DSCR Loan</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 font-heading">Conventional</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { f: "Income Verification", d: "None required", c: "Full docs (W-2, tax returns)" },
                  { f: "DTI Ratio", d: "No DTI calculation", c: "Max 45–50%" },
                  { f: "Down Payment", d: "20–25%", c: "15–25%" },
                  { f: "Interest Rates", d: "7.0–8.5%", c: "6.0–7.0%" },
                  { f: "Property Limit", d: "Unlimited", c: "10 properties max" },
                  { f: "LLC Vesting", d: "Yes", c: "No — personal name only" },
                  { f: "Closing Speed", d: "14–21 days", c: "30–45 days" },
                  { f: "Self-Employed Friendly", d: "Very — no income docs", c: "Difficult" },
                ].map((row, i) => (
                  <tr key={row.f} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.f}</td>
                    <td className="px-5 py-3 text-slate-600">{row.d}</td>
                    <td className="px-5 py-3 text-slate-600">{row.c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Tip>Here&apos;s what nobody tells you: many investors use BOTH. Conventional for the first 10 properties (lower rates), then switch to DSCR for properties 11+. Use each tool where it&apos;s strongest. There&apos;s no rule that says you have to pick one.</Tip>

          <p className="mt-6 text-sm text-slate-500">
            <strong>When to choose DSCR:</strong> You&apos;re self-employed, own 10+ properties, want LLC protection, need fast closing, or simply don&apos;t want to share your personal financials. <strong>When to choose conventional:</strong> You want the lowest possible rate, have strong W-2 income, own fewer than 10 properties, and don&apos;t need LLC vesting.
          </p>
        </div>
      </section>

      {/* Pre-FAQ tip */}
      <section className="bg-section-teal py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>If a lender tells you DSCR loans are &quot;hard money&quot; — run. DSCR loans are 30-year fixed rate mortgages with normal amortization. They&apos;re non-QM (non-qualified mortgage), which just means they don&apos;t follow Fannie/Freddie guidelines. That&apos;s it. They&apos;re real mortgages, not bridge loans.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-slate-500">
            Answers to the most common DSCR loan questions. For more, visit our <Link href="/faq" className="text-teal-600 underline underline-offset-2 hover:text-teal-800">full FAQ page</Link>.
          </p>

          <div className="mt-12 space-y-3">
            {homeFAQs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-teal-300">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                  <span className="pr-4 text-base font-semibold text-slate-800 font-heading">{faq.question}</span>
                  <svg className={`h-5 w-5 shrink-0 text-teal-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          OFFICES
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            6 Offices <span className="gradient-text">Nationwide</span>
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3">
            {[
              { city: "New York", addr: "477 Madison Ave", csz: "New York, NY 10022", href: "/locations/new-york/new-york-city" },
              { city: "Miami Gardens", addr: "5901 NW 183rd St", csz: "Miami Gardens, FL 33015", href: "/locations/florida/miami" },
              { city: "New Orleans", addr: "1100 Poydras St Building", csz: "New Orleans, LA 70163", href: "/locations/louisiana/new-orleans" },
              { city: "Houston", addr: "7457 Harwin Dr", csz: "Houston, TX 77036", href: "/locations/texas/houston" },
              { city: "Los Angeles", addr: "801 S Figueroa St", csz: "Los Angeles, CA 90017", href: "/locations/california/los-angeles" },
              { city: "Portland", addr: "254 Commercial St", csz: "Portland, ME 04101", href: "/locations/maine/portland-me" },
            ].map((office) => (
              <Link key={office.city} href={office.href}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{office.city}</h3>
                  <p className="mt-1 text-sm text-slate-500">{office.addr}</p>
                  <p className="text-sm text-slate-500">{office.csz}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final tip */}
      <section className="bg-section-teal py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>The best DSCR deal you&apos;ll ever get is the one you actually close. Analysis paralysis kills more investment careers than bad deals. If the DSCR is 1.0+, the numbers work, and the market is solid — pull the trigger. You can always refinance later when rates improve.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl animate-blob" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Start Building Your Portfolio Today
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Calculate your DSCR, explore your city, or call our team to discuss your next investment property.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/calculator">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                DSCR Calculator
              </motion.span>
            </Link>
            <Link href="/locations">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Explore 650+ Cities
              </motion.span>
            </Link>
            <a href="sms:+18553003727">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                (855) 300-DSCR | Text
              </motion.span>
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
