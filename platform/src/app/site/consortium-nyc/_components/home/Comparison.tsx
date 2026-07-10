"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type CellRating = "check" | "partial" | "x";

interface ComparisonRow {
  label: string;
  agency: string;
  inHouse: string;
  freelancer: string;
  agencyRating: CellRating;
  inHouseRating: CellRating;
  freelancerRating: CellRating;
}

const rows: ComparisonRow[] = [
  {
    label: "Cost",
    agency: "Predictable monthly investment. No overhead, no benefits, no office space.",
    inHouse: "$150K+ per year for ONE marketer. Add tools, training, management overhead.",
    freelancer: "Cheap upfront, expensive when they ghost you mid-project.",
    agencyRating: "check",
    inHouseRating: "x",
    freelancerRating: "partial",
  },
  {
    label: "Expertise",
    agency: "Full team of specialists: SEO, paid ads, design, dev, content, strategy.",
    inHouse: "One generalist who's decent at some things, great at nothing.",
    freelancer: "One skill set. Need something else? Start another hiring process.",
    agencyRating: "check",
    inHouseRating: "partial",
    freelancerRating: "x",
  },
  {
    label: "Scalability",
    agency: "Scale up or down instantly. Need more? We deploy more. Simple.",
    inHouse: "Want to scale? Post a job, interview for months, onboard for weeks.",
    freelancer: "They're already juggling 8 other clients. You're not the priority.",
    agencyRating: "check",
    inHouseRating: "x",
    freelancerRating: "x",
  },
  {
    label: "Accountability",
    agency: "Monthly reports, KPIs, direct access to your strategist. We answer to you.",
    inHouse: "You're the manager now. Add that to your already full plate.",
    freelancer: "Good luck getting a status update. Or a callback.",
    agencyRating: "check",
    inHouseRating: "partial",
    freelancerRating: "x",
  },
  {
    label: "Speed to Results",
    agency: "Day one execution. Systems, processes, and playbooks already built.",
    inHouse: "3-6 months to hire, onboard, and get up to speed. Maybe.",
    freelancer: "Fast start, slow finish. Deadlines are more like suggestions.",
    agencyRating: "check",
    inHouseRating: "x",
    freelancerRating: "partial",
  },
  {
    label: "Range of Services",
    agency: "SEO, PPC, social, email, web dev, design, content, analytics — all under one roof.",
    inHouse: "Whatever that one person knows how to do. Hope it's enough.",
    freelancer: "One thing. That's it. Need a full strategy? Hire five freelancers.",
    agencyRating: "check",
    inHouseRating: "x",
    freelancerRating: "x",
  },
];

function RatingIcon({ rating }: { rating: CellRating }) {
  if (rating === "check")
    return <span className="text-teal-600 text-xl font-bold">&#10003;</span>;
  if (rating === "partial")
    return <span className="text-yellow-500 text-xl font-bold">~</span>;
  return <span className="text-red-500 text-xl font-bold">&#10005;</span>;
}

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function Comparison() {
  return (
    <section className="relative py-24 px-6 bg-teal-50 overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Company vs In-House vs Freelancer
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Why NYC Businesses Hire a{" "}
            <span className="text-teal-600">Marketing Company Over In-House or Freelancers</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Compare the cost, expertise, and results of hiring a full-service marketing company in New York City versus building an in-house team or relying on freelancers. See why local businesses choose <Link href="/about-marketing-company-consortium-nyc" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">The NYC Marketing Company</Link>.
          </p>
        </motion.div>

        {/* Header row */}
        <div className="grid grid-cols-4 gap-4 mb-2">
          <div />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-t-xl bg-teal-600 p-4 text-center"
          >
            <span className="text-white font-bold text-lg font-heading">
              The NYC Marketing Company
            </span>
          </motion.div>
          <div className="bg-white rounded-t-xl p-4 text-center border border-slate-200">
            <span className="text-slate-400 font-semibold font-heading">In-House Team</span>
          </div>
          <div className="bg-white rounded-t-xl p-4 text-center border border-slate-200">
            <span className="text-slate-400 font-semibold font-heading">Freelancer</span>
          </div>
        </div>

        {/* Data rows */}
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            custom={i}
            variants={rowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-4 gap-4 mb-2"
          >
            <div className="flex items-center p-4">
              <span className="text-slate-900 font-semibold text-sm md:text-base">
                {row.label}
              </span>
            </div>
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
              <div className="flex items-start gap-2">
                <RatingIcon rating={row.agencyRating} />
                <p className="text-slate-700 text-sm leading-relaxed">
                  {row.agency}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-start gap-2">
                <RatingIcon rating={row.inHouseRating} />
                <p className="text-slate-600 text-sm leading-relaxed">
                  {row.inHouse}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-start gap-2">
                <RatingIcon rating={row.freelancerRating} />
                <p className="text-slate-600 text-sm leading-relaxed">
                  {row.freelancer}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-xl md:text-2xl text-slate-600 font-medium mb-8">
            Get agency-level expertise{" "}
            <span className="text-teal-600 font-bold">
              without the agency-level headaches.
            </span>
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition-colors shadow-lg font-cta"
          >
            Get Started Today
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
