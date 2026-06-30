"use client";

import { motion } from "framer-motion";
import Link from "next/link";

// Full competitor matrix. Full Loop ✅ column = verified (our code). Competitor
// marks are positioning — fact-check named-competitor cells before relying on them.
// Competitor names link out: new tab, nofollow, no SEO bleed. Probook: no URL yet.
type Cell = "y" | "p" | "n" | string;

const COMPETITORS = [
  { name: "ServiceTitan", href: "https://www.servicetitan.com" },
  { name: "Jobber", href: "https://getjobber.com" },
  { name: "Housecall Pro", href: "https://www.housecallpro.com" },
  { name: "Probook", href: null },
] as const;

// [capability, [fullLoop, serviceTitan, jobber, housecall, probook]], bold = differentiator
const ROWS: { cap: string; cells: Cell[]; bold?: boolean }[] = [
  { cap: "Multi-tenant SaaS", cells: ["y", "(enterprise)", "y", "y", "y"] },
  { cap: "Lead capture (web / SMS / email)", cells: ["y", "y", "y", "y", "n"] },
  { cap: "AI conversational agent (text)", cells: ["y", "p", "n", "p", "n"] },
  { cap: "AI voice agent", cells: ["building", "n", "n", "n", "n"] },
  { cap: "Bilingual EN / ES throughout", cells: ["y", "p", "n", "n", "n"] },
  { cap: "Smart scheduling (auto-assign)", cells: ["y", "y", "p", "p", "y"] },
  { cap: "GPS check-in / out", cells: ["y", "y", "p", "p", "n"] },
  { cap: "Stripe Connect payouts", cells: ["y", "y", "p", "p", "n"] },
  { cap: "Auto-payout to cleaner on checkout", cells: ["y", "p", "n", "n", "n"] },
  { cap: "Self-book customer portal", cells: ["y", "p", "y", "y", "n"] },
  { cap: "Overflow waitlist capture", cells: ["y", "n", "n", "n", "n"] },
  { cap: "Multi-address client properties", cells: ["y", "p", "n", "n", "n"] },
  { cap: "Auto-review collection", cells: ["y", "p", "p", "p", "n"] },
  { cap: "Recurring scheduling engine", cells: ["y", "y", "y", "y", "p"] },
  { cap: "Referral engine built-in", cells: ["y", "p", "p", "p", "n"] },
  { cap: "ComHub — unified team inbox + softphone", cells: ["y", "n", "n", "p", "n"] },
  { cap: "Owner ↔ team in-app messaging", cells: ["y", "p", "p", "p", "n"] },
  { cap: "Telegram ops command center", cells: ["y", "n", "n", "n", "n"] },
  { cap: "Organic lead-gen network bundled", cells: ["y", "n", "n", "n", "n"], bold: true },
  { cap: "SEO content / microsite engine (owned)", cells: ["y", "n", "n", "n", "n"], bold: true },
  { cap: "Multi-domain EMD architecture", cells: ["y", "n", "n", "n", "n"], bold: true },
  { cap: "Operator dogfooding (live flagship)", cells: ["y", "n", "n", "n", "p"], bold: true },
  { cap: "One-click tenant deployment", cells: ["y", "n", "n/a", "n/a", "n"], bold: true },
];

function Mark({ v }: { v: Cell }) {
  if (v === "y") return <span className="text-[#1F4D2C] text-lg font-bold" aria-label="yes">&#10003;</span>;
  if (v === "n") return <span className="text-red-500 text-lg font-bold" aria-label="no">&#10005;</span>;
  if (v === "p") return <span className="text-[#9A9A95] text-sm" aria-label="partial">partial</span>;
  return <span className="text-[#9A9A95] text-sm">{v}</span>;
}

export default function Comparison() {
  return (
    <section className="relative py-24 px-6 bg-[#F4F4F1] overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            How Full Loop compares
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            One platform that does what{" "}
            <span className="text-[#1F4D2C]">five tools can&apos;t</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            Operators stitch together software, lead marketplaces, and office labor. Full Loop replaces
            the stack — AI agents, smart scheduling, payments, reviews, and a bundled lead-gen network
            you own. Column by column against{" "}
            <Link href="/full-loop-crm-service-features" className="text-[#1F4D2C] underline underline-offset-2">the alternatives</Link>.
          </p>
        </motion.div>

        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full border-collapse" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th className="text-left font-heading text-slate-900 font-semibold p-3 align-bottom">Capability</th>
                <th className="p-3 text-center align-bottom rounded-t-lg bg-[#1F4D2C]">
                  <span className="font-heading font-bold text-white">Full Loop</span>
                </th>
                {COMPETITORS.map((c) => (
                  <th key={c.name} className="p-3 text-center align-bottom font-heading font-semibold text-[#6F6F6B] whitespace-nowrap">
                    {c.href ? (
                      <a href={c.href} target="_blank" rel="nofollow noopener noreferrer" className="underline underline-offset-2 hover:text-slate-900">
                        {c.name}
                      </a>
                    ) : (
                      c.name
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.cap} className="border-b border-black/10">
                  <td className={`p-3 text-sm md:text-base text-slate-900 ${r.bold ? "font-bold" : ""}`}>{r.cap}</td>
                  <td className="p-3 text-center bg-[#1F4D2C]/[0.06]"><Mark v={r.cells[0]} /></td>
                  {r.cells.slice(1).map((cell, i) => (
                    <td key={i} className="p-3 text-center"><Mark v={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-14"
        >
          <p className="text-xl md:text-2xl text-[#3A3A3A] font-medium mb-8">
            Stop paying for nine subscriptions.{" "}
            <span className="text-[#1F4D2C] font-bold">Run your entire business from one platform you own.</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/waitlist" className="inline-block px-10 py-4 rounded-full bg-[#1F4D2C] text-white font-bold text-lg hover:opacity-90 transition shadow-lg font-cta">
              See Pricing
            </Link>
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="inline-block px-10 py-4 rounded-full bg-white text-[#1F4D2C] font-bold text-lg border-2 border-[#1F4D2C] hover:bg-[#F4F4F1] transition shadow-lg font-cta">
              Why Full Loop?
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
